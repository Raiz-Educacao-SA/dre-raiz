import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';
import { normalizeFinancialInputs, applyDeltas, deriveMetrics, safePct } from '../../core/financialModel';
import { calculateScore } from '../../core/scoreModel';
import type { ScoreInputs, FinancialDeltas } from '../../core/decisionTypes';

// --------------------------------------------
// Handler (adaptador — toda lógica no core)
// --------------------------------------------

export async function handler(req: { method: string; body: {
  revenue_delta?: number; cv_delta?: number; cf_delta?: number; sga_delta?: number;
} }, res: {
  status: (code: number) => { json: (data: unknown) => void };
}) {
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

    // Build core inputs
    const financials = normalizeFinancialInputs(summary);
    const scoreInputs: ScoreInputs = {
      confidence: consolidation?.confidence_level ?? 0,
      margin_real: summary.margem_contribuicao.pct_real,
      margin_orcado: safePct(summary.margem_contribuicao.orcado, summary.receita.orcado),
      ebitda_real: summary.ebitda.real,
      ebitda_a1: summary.ebitda.a1,
      high_priority_count: (consolidation?.final_recommendations || [])
        .filter((r) => r.priority === 'high').length,
      conflicts_count: (consolidation?.cross_agent_conflicts || []).length,
    };

    // Before
    const metricsBefore = deriveMetrics(financials);
    const scoreBefore = calculateScore(scoreInputs);

    // After (apply deltas via core)
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

export default handler;
