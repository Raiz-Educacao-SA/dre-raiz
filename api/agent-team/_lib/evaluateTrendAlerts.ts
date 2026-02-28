import { supabaseAdmin } from './supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../../types/agentTeam';
import { safePct } from '../../../core/financialModel';
import { calculateScore, evaluateTrendAlertRules } from '../../../core/scoreModel';
import type { ScoreInputs, TrendSeries } from '../../../core/decisionTypes';

// --------------------------------------------
// Main (adaptador — regras de tendência no core)
// --------------------------------------------

export async function evaluateTrendAlerts(runId: string): Promise<void> {
  const sb = supabaseAdmin();

  const { data: runs, error: runsError } = await sb
    .from('agent_runs')
    .select('id, completed_at, financial_summary')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (runsError || !runs || runs.length < 3) return;

  const runIds = runs.map((r: { id: string }) => r.id);

  const { data: consolidationSteps, error: stepsError } = await sb
    .from('agent_steps')
    .select('run_id, output_data')
    .in('run_id', runIds)
    .eq('step_type', 'consolidate')
    .eq('status', 'completed');

  if (stepsError) return;

  const consolidationMap = new Map<string, ConsolidationOutput>();
  for (const step of consolidationSteps || []) {
    if (step.output_data) {
      consolidationMap.set(step.run_id, step.output_data as ConsolidationOutput);
    }
  }

  const sorted = [...runs].reverse();

  // Build trend series via core
  const trendSeries: TrendSeries = {
    scores: [],
    margins: [],
    confidences: [],
    high_priority_counts: [],
  };

  for (const run of sorted) {
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

    trendSeries.scores.push(calculateScore(scoreInputs));
    trendSeries.margins.push(scoreInputs.margin_real);
    trendSeries.confidences.push(scoreInputs.confidence);
    trendSeries.high_priority_counts.push(scoreInputs.high_priority_count);
  }

  // Evaluate via core
  const alertDecisions = evaluateTrendAlertRules(trendSeries);

  if (alertDecisions.length === 0) return;

  const rows = alertDecisions.map((a) => ({
    run_id: runId,
    alert_type: a.alert_type,
    severity: a.severity,
    message: a.message,
    metric_value: a.metric_value,
    threshold_value: a.threshold_value,
  }));

  const { error: insertError } = await sb
    .from('agent_alerts')
    .insert(rows);

  if (insertError) {
    // Non-blocking — log suppressed in production
  }
}
