import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';
import type { ScoreInputs, TimeSeriesPoint, CutCandidate, OptimizationInput, FinancialDeltas } from '../../core/decisionTypes';
import {
  runAnalysis,
  forecast as runForecast,
  optimize,
  deriveMetrics,
  normalizeFinancialInputs,
  safePct,
} from '../../core/DecisionEngine';
import { applyDeltas, normalizeFinancialInputs as normalizeFromFinancialModel, safePct as safePctFromFinancialModel } from '../../core/financialModel';
import { calculateScore } from '../../core/scoreModel';
import { runOptimization } from '../../core/optimizationEngine';
import { buildExecutiveSummary } from '../../executive/executiveSummaryBuilder';
import { compareWithBenchmark } from '../../core/benchmarkEngine';
import type { BenchmarkData, CompanyMetrics, BenchmarkComparison } from '../../core/benchmarkEngine';
import { applyMacroImpact, calculateMacroRiskIndex, buildMacroSnapshot } from '../../core/macroImpactEngine';
import type { MacroRiskIndex, MacroImpactResult, MacroAssumptions, MacroMaturityReport } from '../../core/macroTypes';
import { DEFAULT_MACRO_ASSUMPTIONS } from '../../core/macroTypes';
import { generateMacroMaturityReport } from '../../core/macroMaturityEngine';

// ════════════════════════════════════════════════
// ACTION: executive-dashboard
// ════════════════════════════════════════════════

interface MonthlyRow {
  tag0: string;
  scenario: string;
  month: string;
  total: number;
}

function buildTimeSeriesFromSnapshot(rows: MonthlyRow[]): TimeSeriesPoint[] {
  const months = new Map<string, { receita: number; cv: number; cf: number; rateio: number; receita_orc: number }>();

  for (const row of rows) {
    if (row.scenario !== 'Real') continue;

    const m = row.month;
    if (!months.has(m)) {
      months.set(m, { receita: 0, cv: 0, cf: 0, rateio: 0, receita_orc: 0 });
    }
    const entry = months.get(m)!;

    if (row.tag0?.startsWith('01.')) entry.receita += row.total;
    else if (row.tag0?.startsWith('02.')) entry.cv += row.total;
    else if (row.tag0?.startsWith('03.')) entry.cf += row.total;
    else if (row.tag0?.startsWith('06.')) entry.rateio += row.total;
  }

  for (const row of rows) {
    if (row.scenario !== 'Orçado') continue;
    const m = row.month;
    if (!months.has(m)) continue;
    const entry = months.get(m)!;
    if (row.tag0?.startsWith('01.')) entry.receita_orc += row.total;
  }

  const sortedMonths = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return sortedMonths.map(([, data]) => {
    const margin = safePct(data.receita + data.cv, data.receita);
    const ebitda = data.receita + data.cv + data.cf + data.rateio;
    const marginGap = Math.max(0, safePct(data.receita_orc, data.receita_orc) - margin);
    const score = Math.max(0, Math.min(100, 100 - marginGap * 0.5));

    return { score, margin, ebitda };
  });
}

function buildCutCandidates(summary: FinancialSummary): CutCandidate[] {
  return summary.top5_variacoes
    .filter((v) => v.delta_pct > 0)
    .map((v) => ({
      area: v.tag01,
      gap: v.real - v.orcado,
      volume: Math.abs(v.real),
    }));
}

function buildTrend(summary: FinancialSummary): { mes: string; receita: number; ebitda: number }[] {
  return summary.tendencia_mensal.slice(-6);
}

async function fetchAndCompareBenchmark(
  sb: ReturnType<typeof supabaseAdmin>,
  financialSummary: FinancialSummary,
  currentScore: number,
): Promise<BenchmarkComparison | null> {
  const { data: rows, error } = await sb
    .from('benchmark_aggregates')
    .select('*')
    .eq('industry_segment', 'educacao')
    .eq('revenue_range', 'medium')
    .order('reference_period', { ascending: false })
    .limit(1);

  if (error || !rows || rows.length === 0) return null;

  const benchmarkRow = rows[0] as BenchmarkData;

  const growthYoY = financialSummary.receita.a1 !== 0
    ? ((financialSummary.receita.real - financialSummary.receita.a1) / Math.abs(financialSummary.receita.a1)) * 100
    : 0;

  const companyMetrics: CompanyMetrics = {
    margin: financialSummary.margem_contribuicao.pct_real,
    ebitda: financialSummary.ebitda.real,
    score: currentScore,
    growth: Math.round(growthYoY * 100) / 100,
  };

  return compareWithBenchmark(companyMetrics, benchmarkRow);
}

async function fetchAndCalculateMacro(
  sb: ReturnType<typeof supabaseAdmin>,
  financials: ReturnType<typeof normalizeFinancialInputs>,
): Promise<{ risk: MacroRiskIndex | null; impact: MacroImpactResult | null; maturity: MacroMaturityReport | null }> {
  const { data: indicators, error: indError } = await sb
    .from('macro_indicators')
    .select('indicator_type, value, period, is_projection')
    .order('period', { ascending: false })
    .limit(50);

  let assumptions: MacroAssumptions = DEFAULT_MACRO_ASSUMPTIONS;
  let hasCustomAssumptions = false;
  const { data: assumptionRows } = await sb
    .from('macro_assumptions')
    .select('*')
    .eq('organization_id', 'raiz')
    .limit(1);

  if (assumptionRows && assumptionRows.length > 0) {
    const row = assumptionRows[0];
    assumptions = {
      inflation_sensitivity: row.inflation_sensitivity ?? DEFAULT_MACRO_ASSUMPTIONS.inflation_sensitivity,
      revenue_elasticity: row.revenue_elasticity ?? DEFAULT_MACRO_ASSUMPTIONS.revenue_elasticity,
      cost_elasticity: row.cost_elasticity ?? DEFAULT_MACRO_ASSUMPTIONS.cost_elasticity,
      interest_sensitivity: row.interest_sensitivity ?? DEFAULT_MACRO_ASSUMPTIONS.interest_sensitivity,
      unemployment_sensitivity: row.unemployment_sensitivity ?? DEFAULT_MACRO_ASSUMPTIONS.unemployment_sensitivity,
    };
    hasCustomAssumptions = true;
  }

  const maturity = generateMacroMaturityReport(financials, assumptions, hasCustomAssumptions);

  if (indError || !indicators || indicators.length === 0) {
    return { risk: null, impact: null, maturity };
  }

  const year = new Date().getUTCFullYear().toString();
  const macroSnapshot = buildMacroSnapshot(indicators, year);

  const risk = calculateMacroRiskIndex(macroSnapshot);

  const impact = applyMacroImpact(financials, macroSnapshot, assumptions);

  return { risk, impact, maturity };
}

async function handleExecutiveDashboard(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();
    const year = new Date().getUTCFullYear().toString();

    const { data: dreSnapshot, error: dreError } = await sb.rpc('get_soma_tags', {
      p_month_from: `${year}-01`,
      p_month_to: `${year}-12`,
      p_marcas: null,
      p_nome_filiais: null,
      p_tags02: null,
      p_tags01: null,
      p_recurring: null,
      p_tags03: null,
    });

    if (dreError || !dreSnapshot || dreSnapshot.length === 0) {
      return res.status(200).json({
        summary: null,
        financial_summary: null,
        score: null,
        forecast: null,
        optimization: null,
        alerts: [],
        trend_last_6_months: [],
        error: 'Sem dados DRE disponíveis',
      });
    }

    const financialSummary = buildFinancialSummary(dreSnapshot);

    const financials = normalizeFinancialInputs(financialSummary);

    const metrics = deriveMetrics(financials);

    const scoreInputs: ScoreInputs = {
      confidence: 80,
      margin_real: metrics.margin,
      margin_orcado: safePct(
        financialSummary.margem_contribuicao.orcado,
        financialSummary.receita.orcado,
      ),
      ebitda_real: metrics.ebitda,
      ebitda_a1: financialSummary.ebitda.a1,
      high_priority_count: 0,
      conflicts_count: 0,
    };

    const analysis = runAnalysis(scoreInputs, financials);

    const timeSeries = buildTimeSeriesFromSnapshot(dreSnapshot as MonthlyRow[]);
    const forecastResult = timeSeries.length >= 3 ? runForecast(timeSeries) : null;

    const candidates = buildCutCandidates(financialSummary);
    let optimizationResult = null;
    if (candidates.length > 0 && analysis.score.score < 85) {
      const optInput: OptimizationInput = {
        current_financials: financials,
        current_score_inputs: scoreInputs,
        target_score: 85,
        candidates,
      };
      optimizationResult = optimize(optInput);
    }

    const summary = buildExecutiveSummary({
      scoreResult: analysis.score,
      metrics: analysis.metrics,
      forecastResult,
      optimizationResult,
      alerts: analysis.alerts,
    });

    const trend = buildTrend(financialSummary);

    let benchmark: BenchmarkComparison | null = null;
    try {
      benchmark = await fetchAndCompareBenchmark(
        sb,
        financialSummary,
        analysis.score.score,
      );
    } catch {
      // Benchmark é opcional — não bloqueia o dashboard
    }

    let macroRisk: MacroRiskIndex | null = null;
    let macroImpact: MacroImpactResult | null = null;
    let macroMaturity: MacroMaturityReport | null = null;
    try {
      const macroResult = await fetchAndCalculateMacro(sb, financials);
      macroRisk = macroResult.risk;
      macroImpact = macroResult.impact;
      macroMaturity = macroResult.maturity;
    } catch {
      // Macro é opcional — não bloqueia o dashboard
    }

    return res.status(200).json({
      summary,
      financial_summary: financialSummary,
      score: analysis.score,
      forecast: forecastResult,
      optimization: optimizationResult,
      alerts: analysis.alerts,
      trend_last_6_months: trend,
      benchmark,
      macro_risk: macroRisk,
      macro_impact: macroImpact,
      macro_maturity: macroMaturity,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: generate-cut-plan
// ════════════════════════════════════════════════

async function handleGenerateCutPlan(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { target_score, target_ebitda } = req.body;

    if (!target_score && !target_ebitda) {
      return res.status(400).json({ error: 'Informe target_score ou target_ebitda' });
    }

    const sb = supabaseAdmin();

    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, financial_summary')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (runError || !run) {
      return res.status(200).json({
        gap: 0, proposed_actions: [], projected_score_after_plan: 0,
      });
    }

    const summary = run.financial_summary as FinancialSummary | null;
    if (!summary) {
      return res.status(200).json({
        gap: 0, proposed_actions: [], projected_score_after_plan: 0,
      });
    }

    const { data: consolidationStep } = await sb
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', run.id)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .limit(1)
      .single();

    const consolidation = (consolidationStep?.output_data ?? null) as ConsolidationOutput | null;

    const financials = normalizeFromFinancialModel(summary);

    const scoreInputs: ScoreInputs = {
      confidence: consolidation?.confidence_level ?? 0,
      margin_real: summary.margem_contribuicao.pct_real,
      margin_orcado: safePctFromFinancialModel(summary.margem_contribuicao.orcado, summary.receita.orcado),
      ebitda_real: summary.ebitda.real,
      ebitda_a1: summary.ebitda.a1,
      high_priority_count: (consolidation?.final_recommendations || [])
        .filter((r) => r.priority === 'high').length,
      conflicts_count: (consolidation?.cross_agent_conflicts || []).length,
    };

    const candidates: CutCandidate[] = [];

    for (const v of summary.top5_variacoes) {
      const gapValue = v.real - v.orcado;
      if (gapValue < 0) {
        candidates.push({
          area: v.tag01,
          gap: Math.abs(gapValue),
          volume: Math.abs(v.real),
        });
      }
    }

    const existingAreas = new Set(candidates.map((c) => c.area));
    for (const c of summary.top5_tags01_custo) {
      if (!existingAreas.has(c.tag01)) {
        candidates.push({
          area: c.tag01,
          gap: 0,
          volume: Math.abs(c.total),
        });
      }
    }

    const config: OptimizationInput = {
      current_financials: financials,
      current_score_inputs: scoreInputs,
      target_score,
      target_ebitda,
      candidates,
    };

    const result = runOptimization(config);

    recordAuditEntryAsync({
      run_id: run.id,
      action_type: 'optimization',
      input_snapshot: {
        target_score: target_score || null,
        target_ebitda: target_ebitda || null,
        candidates_count: candidates.length,
        current_ebitda: summary.ebitda.real,
        current_margin_pct: summary.margem_contribuicao.pct_real,
      },
      output_snapshot: {
        gap: result.gap,
        proposed_actions_count: result.proposed_actions.length,
        projected_score: result.projected_score,
      },
      performed_by: req.body?.performedBy || 'api',
      justification: `Plano de otimização: target_score=${target_score || 'N/A'}, target_ebitda=${target_ebitda || 'N/A'}`,
    });

    return res.status(200).json({
      gap: result.gap,
      proposed_actions: result.proposed_actions,
      projected_score_after_plan: result.projected_score,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: simulate-impact
// ════════════════════════════════════════════════

async function handleSimulateImpact(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const deltas: FinancialDeltas = {
      revenue_delta: req.body.revenue_delta ?? 0,
      cv_delta: req.body.cv_delta ?? 0,
      cf_delta: req.body.cf_delta ?? 0,
      sga_delta: req.body.sga_delta ?? 0,
    };

    const sb = supabaseAdmin();

    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, financial_summary')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (runError || !run) {
      return res.status(200).json({
        before: { ebitda: 0, margin: 0, score: 0 },
        after: { ebitda: 0, margin: 0, score: 0 },
        delta: { ebitda_change: 0, margin_change: 0, score_change: 0 },
      });
    }

    const { data: consolidationStep } = await sb
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', run.id)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .limit(1)
      .single();

    const consolidation = (consolidationStep?.output_data ?? null) as ConsolidationOutput | null;
    const summary = run.financial_summary as FinancialSummary | null;

    if (!summary) {
      return res.status(200).json({
        before: { ebitda: 0, margin: 0, score: 0 },
        after: { ebitda: 0, margin: 0, score: 0 },
        delta: { ebitda_change: 0, margin_change: 0, score_change: 0 },
      });
    }

    const financials = normalizeFromFinancialModel(summary);
    const scoreInputs: ScoreInputs = {
      confidence: consolidation?.confidence_level ?? 0,
      margin_real: summary.margem_contribuicao.pct_real,
      margin_orcado: safePctFromFinancialModel(summary.margem_contribuicao.orcado, summary.receita.orcado),
      ebitda_real: summary.ebitda.real,
      ebitda_a1: summary.ebitda.a1,
      high_priority_count: (consolidation?.final_recommendations || [])
        .filter((r) => r.priority === 'high').length,
      conflicts_count: (consolidation?.cross_agent_conflicts || []).length,
    };

    const metricsBefore = deriveMetrics(financials);
    const scoreBefore = calculateScore(scoreInputs);

    const adjusted = applyDeltas(financials, deltas);
    const metricsAfter = deriveMetrics(adjusted);
    const scoreAfter = calculateScore({
      ...scoreInputs,
      margin_real: metricsAfter.margin,
      ebitda_real: metricsAfter.ebitda,
    });

    return res.status(200).json({
      before: { ebitda: metricsBefore.ebitda, margin: metricsBefore.margin, score: scoreBefore },
      after: { ebitda: metricsAfter.ebitda, margin: metricsAfter.margin, score: scoreAfter },
      delta: {
        ebitda_change: Math.round((metricsAfter.ebitda - metricsBefore.ebitda) * 100) / 100,
        margin_change: Math.round((metricsAfter.margin - metricsBefore.margin) * 100) / 100,
        score_change: scoreAfter - scoreBefore,
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: cron-run
// ════════════════════════════════════════════════

interface CronScheduleRow {
  id: string;
  team_id: string;
  name: string;
  objective_template: string;
  filter_context: Record<string, unknown> | null;
  created_by: string | null;
}

async function handleCronRun(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('⚠️ CRON_SECRET não configurado');
    return res.status(500).json({ error: 'CRON_SECRET não configurado' });
  }

  const headerSecret = req.headers['x-cron-secret'] as string | undefined;
  if (headerSecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = supabaseAdmin();
  let executed = 0;
  const errors: string[] = [];

  try {
    const { data: schedules, error: schedError } = await sb
      .from('agent_schedules')
      .select('id, team_id, name, objective_template, filter_context, created_by')
      .eq('is_active', true);

    if (schedError) {
      console.error('❌ Erro ao buscar schedules:', schedError);
      return res.status(500).json({ error: 'Erro ao buscar schedules' });
    }

    if (!schedules || schedules.length === 0) {
      return res.status(200).json({ executed: 0, message: 'Nenhum schedule ativo' });
    }

    for (const schedule of schedules as CronScheduleRow[]) {
      try {
        const year = new Date().getFullYear().toString();
        const monthFrom = `${year}-01`;
        const monthTo = `${year}-12`;

        const { data: dreSnapshot, error: dreError } = await sb.rpc('get_soma_tags', {
          p_month_from: monthFrom,
          p_month_to: monthTo,
          p_marcas: null,
          p_nome_filiais: null,
          p_tags02: null,
          p_tags01: null,
          p_recurring: null,
          p_tags03: null,
        });

        if (dreError || !dreSnapshot || dreSnapshot.length === 0) {
          const msg = `Schedule "${schedule.name}": DRE snapshot vazio ou erro — ${dreError?.message || 'sem dados'}`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        const objective = schedule.objective_template
          .replace('{{year}}', year)
          .replace('{{month_from}}', monthFrom)
          .replace('{{month_to}}', monthTo);

        const { data: teamAgents, error: taError } = await sb
          .from('team_agents')
          .select('step_order, step_type, agents!inner(code)')
          .eq('team_id', schedule.team_id)
          .eq('is_active', true)
          .order('step_order', { ascending: true });

        if (taError || !teamAgents || teamAgents.length === 0) {
          const msg = `Schedule "${schedule.name}": time sem agentes ativos`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        const { data: run, error: runError } = await sb
          .from('agent_runs')
          .insert({
            team_id: schedule.team_id,
            objective,
            status: 'running',
            dre_data_snapshot: dreSnapshot,
            filter_context: schedule.filter_context || { year, months_range: `Jan-Dez ${year}` },
            started_by: schedule.created_by || 'cron',
            started_by_name: `Cron: ${schedule.name}`,
          })
          .select('id')
          .single();

        if (runError || !run) {
          const msg = `Schedule "${schedule.name}": erro ao criar run — ${runError?.message}`;
          console.error('⚠️', msg);
          errors.push(msg);
          continue;
        }

        const steps = teamAgents.map((ta: any) => ({
          run_id: run.id,
          agent_code: ta.agents.code,
          step_type: ta.step_type,
          step_order: ta.step_order,
          status: 'pending',
          review_status: 'pending',
        }));

        const { error: stepsError } = await sb
          .from('agent_steps')
          .insert(steps);

        if (stepsError) {
          const msg = `Schedule "${schedule.name}": erro ao criar steps — ${stepsError.message}`;
          console.error('⚠️', msg);
          await sb.from('agent_runs').delete().eq('id', run.id);
          errors.push(msg);
          continue;
        }

        const financialSummary = buildFinancialSummary(dreSnapshot);

        await sb
          .from('agent_runs')
          .update({ financial_summary: financialSummary })
          .eq('id', run.id);

        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3002';

        fetch(`${baseUrl}/api/agent-team/pipeline-router?action=process-next-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: run.id }),
        }).catch((err) => {
          console.error(`⚠️ Fire-and-forget para schedule "${schedule.name}" falhou:`, err.message);
        });

        executed++;
        console.log(`✅ Cron schedule "${schedule.name}" → runId=${run.id}`);

      } catch (scheduleErr: unknown) {
        const msg = scheduleErr instanceof Error ? scheduleErr.message : 'Erro desconhecido';
        console.error(`⚠️ Schedule "${schedule.name}" falhou:`, msg);
        errors.push(`${schedule.name}: ${msg}`);
      }
    }

    return res.status(200).json({
      executed,
      total: schedules.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ cron-run erro:', msg);
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// Router
// ════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'executive-dashboard': return handleExecutiveDashboard(req, res);
    case 'generate-cut-plan': return handleGenerateCutPlan(req, res);
    case 'simulate-impact': return handleSimulateImpact(req, res);
    case 'cron-run': return handleCronRun(req, res);
    default: return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
