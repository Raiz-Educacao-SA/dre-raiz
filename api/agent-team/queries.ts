import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import type { FinancialSummary, ConsolidationOutput, ListRunsResponse } from '../../types/agentTeam';
import { safePct } from '../../core/financialModel';
import { calculateScore, classifyScore, evaluateScore } from '../../core/scoreModel';
import { computeForecast } from '../../core/forecastModel';
import type { ScoreInputs, TimeSeriesPoint } from '../../core/decisionTypes';

// ════════════════════════════════════════════════
// ACTION: analytics
// ════════════════════════════════════════════════

interface TrendPoint {
  date: string;
  confidence: number;
  ebitda: number;
  margin_pct: number;
  high_priority_count: number;
  conflicts_count: number;
}

interface AnalyticsResponse {
  trend: TrendPoint[];
  averages: {
    avg_confidence: number;
    avg_margin: number;
    avg_ebitda: number;
  };
}

async function handleAnalytics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    const { data: runs, error: runsError } = await sb
      .from('agent_runs')
      .select('id, started_at, completed_at, consolidated_summary, financial_summary')
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(50);

    if (runsError) {
      console.error('❌ analytics runsError:', runsError);
      return res.status(500).json({ error: 'Erro ao buscar runs' });
    }

    if (!runs || runs.length === 0) {
      const empty: AnalyticsResponse = {
        trend: [],
        averages: { avg_confidence: 0, avg_margin: 0, avg_ebitda: 0 },
      };
      return res.status(200).json(empty);
    }

    const runIds = runs.map((r: any) => r.id);

    const { data: consolidationSteps, error: stepsError } = await sb
      .from('agent_steps')
      .select('run_id, output_data')
      .in('run_id', runIds)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed');

    if (stepsError) {
      console.error('❌ analytics stepsError:', stepsError);
    }

    const consolidationMap = new Map<string, ConsolidationOutput>();
    for (const step of consolidationSteps || []) {
      if (step.output_data) {
        consolidationMap.set(step.run_id, step.output_data as ConsolidationOutput);
      }
    }

    const trend: TrendPoint[] = [];

    for (const run of runs as any[]) {
      const summary = run.financial_summary as FinancialSummary | null;
      const consolidation = consolidationMap.get(run.id);

      const confidence = consolidation?.confidence_level ?? 0;
      const ebitda = summary?.ebitda?.real ?? 0;
      const marginPct = summary?.margem_contribuicao?.pct_real ?? 0;

      const recommendations = consolidation?.final_recommendations || [];
      const highPriorityCount = recommendations.filter(
        (r) => r.priority === 'high'
      ).length;

      const conflictsCount = (consolidation?.cross_agent_conflicts || []).length;

      trend.push({
        date: run.started_at,
        confidence: Math.round(confidence),
        ebitda: Math.round(ebitda * 100) / 100,
        margin_pct: Math.round(marginPct * 100) / 100,
        high_priority_count: highPriorityCount,
        conflicts_count: conflictsCount,
      });
    }

    const count = trend.length;
    const sumConfidence = trend.reduce((s, t) => s + t.confidence, 0);
    const sumMargin = trend.reduce((s, t) => s + t.margin_pct, 0);
    const sumEbitda = trend.reduce((s, t) => s + t.ebitda, 0);

    const response: AnalyticsResponse = {
      trend,
      averages: {
        avg_confidence: Math.round((sumConfidence / count) * 10) / 10,
        avg_margin: Math.round((sumMargin / count) * 100) / 100,
        avg_ebitda: Math.round((sumEbitda / count) * 100) / 100,
      },
    };

    return res.status(200).json(response);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ analytics erro:', msg);
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: brand-health-score
// ════════════════════════════════════════════════

async function handleBrandHealthScore(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, filter_context')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (runError || !run) {
      return res.status(200).json({ brands: [] });
    }

    const ctx = run.filter_context as Record<string, unknown> | null;
    const year = (ctx?.year as string) || new Date().getFullYear().toString();
    const monthFrom = `${year}-01`;
    const monthTo = `${year}-12`;

    const { data: filterOptions, error: filterError } = await sb.rpc('get_dre_filter_options', {
      p_month_from: monthFrom,
      p_month_to: monthTo,
    });

    if (filterError || !filterOptions || filterOptions.length === 0) {
      return res.status(200).json({ brands: [] });
    }

    const marcas: string[] = filterOptions[0]?.marcas || [];
    if (marcas.length === 0) {
      return res.status(200).json({ brands: [] });
    }

    const brands: {
      brand: string; score: number; classification: string;
      margin_real: number; margin_orcado: number; ebitda_real: number;
    }[] = [];

    for (const marca of marcas) {
      const { data: rows, error: rowsError } = await sb.rpc('get_soma_tags', {
        p_month_from: monthFrom,
        p_month_to: monthTo,
        p_marcas: [marca],
        p_nome_filiais: null,
        p_tags02: null,
        p_tags01: null,
        p_recurring: null,
        p_tags03: null,
      });

      if (rowsError || !rows || rows.length === 0) {
        brands.push({
          brand: marca, score: 0, classification: 'Crítico',
          margin_real: 0, margin_orcado: 0, ebitda_real: 0,
        });
        continue;
      }

      const summary = buildFinancialSummary(rows);
      const marginReal = summary.margem_contribuicao.pct_real;
      const marginOrcado = safePct(summary.margem_contribuicao.orcado, summary.receita.orcado);

      const scoreInputs: ScoreInputs = {
        confidence: 100,
        margin_real: marginReal,
        margin_orcado: marginOrcado,
        ebitda_real: summary.ebitda.real,
        ebitda_a1: summary.ebitda.a1,
        high_priority_count: 0,
        conflicts_count: 0,
      };

      const score = calculateScore(scoreInputs);

      brands.push({
        brand: marca,
        score,
        classification: classifyScore(score),
        margin_real: Math.round(marginReal * 100) / 100,
        margin_orcado: Math.round(marginOrcado * 100) / 100,
        ebitda_real: Math.round(summary.ebitda.real * 100) / 100,
      });
    }

    brands.sort((a, b) => b.score - a.score);
    return res.status(200).json({ brands });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: health-score
// ════════════════════════════════════════════════

async function handleHealthScore(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    const { data: run, error: runError } = await sb
      .from('agent_runs')
      .select('id, consolidated_summary, financial_summary')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (runError || !run) {
      const emptyInputs: ScoreInputs = {
        confidence: 0, margin_real: 0, margin_orcado: 0,
        ebitda_real: 0, ebitda_a1: 0,
        high_priority_count: 0, conflicts_count: 0,
      };
      const result = evaluateScore(emptyInputs);
      return res.status(200).json({
        score: result.score,
        classification: result.classification,
        breakdown: emptyInputs,
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

    const confidence = consolidation?.confidence_level ?? 0;
    const marginReal = summary?.margem_contribuicao?.pct_real ?? 0;
    const marginOrcado = summary
      ? safePct(summary.margem_contribuicao.orcado, summary.receita.orcado)
      : 0;
    const ebitdaReal = summary?.ebitda?.real ?? 0;
    const ebitdaA1 = summary?.ebitda?.a1 ?? 0;

    const recommendations = consolidation?.final_recommendations || [];
    const highPriorityCount = recommendations.filter(
      (r) => r.priority === 'high'
    ).length;
    const conflictsCount = (consolidation?.cross_agent_conflicts || []).length;

    const scoreInputs: ScoreInputs = {
      confidence,
      margin_real: marginReal,
      margin_orcado: marginOrcado,
      ebitda_real: ebitdaReal,
      ebitda_a1: ebitdaA1,
      high_priority_count: highPriorityCount,
      conflicts_count: conflictsCount,
    };

    const result = evaluateScore(scoreInputs);

    return res.status(200).json({
      score: result.score,
      classification: result.classification,
      breakdown: {
        confidence: Math.round(confidence),
        margin_real: Math.round(marginReal * 100) / 100,
        margin_orcado: Math.round(marginOrcado * 100) / 100,
        ebitda_real: Math.round(ebitdaReal * 100) / 100,
        ebitda_a1: Math.round(ebitdaA1 * 100) / 100,
        high_priority_count: highPriorityCount,
        conflicts_count: conflictsCount,
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: forecast
// ════════════════════════════════════════════════

async function handleForecast(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    const { data: runs, error: runsError } = await sb
      .from('agent_runs')
      .select('id, completed_at, financial_summary')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5);

    if (runsError || !runs || runs.length === 0) {
      return res.status(200).json({
        forecast: { score: [0, 0, 0], margin: [0, 0, 0], ebitda: [0, 0, 0] },
        slope: { score: 0, margin: 0, ebitda: 0 },
        risk_assessment: 'Dados insuficientes',
      });
    }

    const runIds = runs.map((r: { id: string }) => r.id);

    const { data: consolidationSteps } = await sb
      .from('agent_steps')
      .select('run_id, output_data')
      .in('run_id', runIds)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed');

    const consolidationMap = new Map<string, ConsolidationOutput>();
    for (const step of consolidationSteps || []) {
      if (step.output_data) {
        consolidationMap.set(step.run_id, step.output_data as ConsolidationOutput);
      }
    }

    const sorted = [...runs].reverse();

    const series: TimeSeriesPoint[] = sorted.map((run) => {
      const summary = run.financial_summary as FinancialSummary | null;
      const consolidation = consolidationMap.get(run.id) ?? null;

      const scoreInputs: ScoreInputs = {
        confidence: consolidation?.confidence_level ?? 0,
        margin_real: summary?.margem_contribuicao?.pct_real ?? 0,
        margin_orcado: summary
          ? safePct(summary.margem_contribuicao.orcado, summary.receita.orcado)
          : 0,
        ebitda_real: summary?.ebitda?.real ?? 0,
        ebitda_a1: summary?.ebitda?.a1 ?? 0,
        high_priority_count: (consolidation?.final_recommendations || [])
          .filter((r) => r.priority === 'high').length,
        conflicts_count: (consolidation?.cross_agent_conflicts || []).length,
      };

      return {
        score: calculateScore(scoreInputs),
        margin: scoreInputs.margin_real,
        ebitda: scoreInputs.ebitda_real,
      };
    });

    const result = computeForecast(series);

    return res.status(200).json(result);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// ════════════════════════════════════════════════
// ACTION: runs
// ════════════════════════════════════════════════

async function handleRuns(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    const rawLimit = parseInt(req.query?.limit as string, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 20;

    const { data: runs, error } = await sb
      .from('agent_runs')
      .select('id, team_id, objective, status, started_by, started_by_name, started_at, completed_at, consolidated_summary')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao listar runs:', error);
      return res.status(500).json({ error: 'Erro ao listar runs' });
    }

    const response: ListRunsResponse = { runs: runs || [] };
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ runs erro:', error);
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
}

// ════════════════════════════════════════════════
// Router
// ════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    case 'analytics': return handleAnalytics(req, res);
    case 'brand-health-score': return handleBrandHealthScore(req, res);
    case 'health-score': return handleHealthScore(req, res);
    case 'forecast': return handleForecast(req, res);
    case 'runs': return handleRuns(req, res);
    default: return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
