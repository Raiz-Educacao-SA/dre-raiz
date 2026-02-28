import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import type { FinancialSummary } from '../../types/agentTeam';
import type { ScoreInputs, TimeSeriesPoint, CutCandidate, OptimizationInput } from '../../core/decisionTypes';
import {
  runAnalysis,
  forecast as runForecast,
  optimize,
  deriveMetrics,
  normalizeFinancialInputs,
  safePct,
} from '../../core/DecisionEngine';
import { buildExecutiveSummary } from '../../executive/executiveSummaryBuilder';

// --------------------------------------------
// Types
// --------------------------------------------

interface MonthlyRow {
  tag0: string;
  scenario: string;
  month: string;
  total: number;
}

// --------------------------------------------
// Handler
// --------------------------------------------

export async function handler(req: { method: string }, res: {
  status: (code: number) => { json: (data: unknown) => void };
}) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();
    const year = new Date().getUTCFullYear().toString();

    // 1. Buscar DRE snapshot (ano corrente, completo)
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

    // 2. Build financial summary (pre-aggregation)
    const financialSummary = buildFinancialSummary(dreSnapshot);

    // 3. Converter para inputs do DecisionEngine
    const financials = normalizeFinancialInputs({
      receita_real: financialSummary.receita.real,
      receita_orcado: financialSummary.receita.orcado,
      custos_variaveis_real: financialSummary.custos_variaveis.real,
      custos_variaveis_orcado: financialSummary.custos_variaveis.orcado,
      custos_fixos_real: financialSummary.custos_fixos.real,
      custos_fixos_orcado: financialSummary.custos_fixos.orcado,
      sga_real: financialSummary.sga.real,
      sga_orcado: financialSummary.sga.orcado,
      rateio_real: financialSummary.rateio.real,
      rateio_orcado: financialSummary.rateio.orcado,
    });

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

    // 4. DecisionEngine — análise completa
    const analysis = runAnalysis(scoreInputs, financials);

    // 5. Forecast — montar série temporal dos últimos meses
    const timeSeries = buildTimeSeriesFromSnapshot(dreSnapshot as MonthlyRow[]);
    const forecastResult = timeSeries.length >= 3 ? runForecast(timeSeries) : null;

    // 6. Optimization — candidatos a corte
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

    // 7. Executive Summary — consolidação via builder puro
    const summary = buildExecutiveSummary({
      scoreResult: analysis.score,
      metrics: analysis.metrics,
      forecastResult,
      optimizationResult,
      alerts: analysis.alerts,
    });

    // 8. Trend últimos 6 meses
    const trend = buildTrend(financialSummary);

    return res.status(200).json({
      summary,
      financial_summary: financialSummary,
      score: analysis.score,
      forecast: forecastResult,
      optimization: optimizationResult,
      alerts: analysis.alerts,
      trend_last_6_months: trend,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

// --------------------------------------------
// Helpers — data extraction (não math nova)
// --------------------------------------------

/**
 * Monta série temporal a partir do snapshot mensal.
 * Agrupa por mês, calcula score/margin/ebitda de cada mês.
 * Usa MESMOS cálculos que DecisionEngine (safePct, deriveMetrics).
 */
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

  // Buscar orçado para margem comparativa
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
    // Score simplificado por mês: base 100 - penalidades proporcionais
    const marginGap = Math.max(0, safePct(data.receita_orc, data.receita_orc) - margin);
    const score = Math.max(0, Math.min(100, 100 - marginGap * 0.5));

    return { score, margin, ebitda };
  });
}

/**
 * Extrai candidatos a corte do financial summary.
 * Sem nova lógica — lê top5_variacoes (já calculadas pelo buildFinancialSummary).
 */
function buildCutCandidates(summary: FinancialSummary): CutCandidate[] {
  return summary.top5_variacoes
    .filter((v) => v.delta_pct > 0) // custos acima do orçado
    .map((v) => ({
      area: v.tag01,
      gap: v.real - v.orcado,
      volume: Math.abs(v.real),
    }));
}

/**
 * Monta trend dos últimos meses a partir de tendencia_mensal.
 * Dado já calculado pelo buildFinancialSummary.
 */
function buildTrend(summary: FinancialSummary): { mes: string; receita: number; ebitda: number }[] {
  return summary.tendencia_mensal.slice(-6);
}

export default handler;
