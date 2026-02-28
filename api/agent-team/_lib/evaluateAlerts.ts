import { supabaseAdmin } from './supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../../types/agentTeam';
import { safePct } from '../../../core/financialModel';
import { calculateScore, evaluateAlertRules } from '../../../core/scoreModel';
import { logInfo, logError, logWarning } from '../../../core/logger';
import type { ScoreInputs } from '../../../core/decisionTypes';

const CTX = 'evaluateAlerts';

// --------------------------------------------
// Main (adaptador — regras de alerta no core)
// --------------------------------------------

export async function evaluateAlerts(runId: string): Promise<void> {
  const sb = supabaseAdmin();

  const { data: run, error: runError } = await sb
    .from('agent_runs')
    .select('id, financial_summary')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    logWarning(CTX, 'Run não encontrado para avaliação de alertas', { runId, error: runError?.message });
    return;
  }

  const { data: consolidationStep } = await sb
    .from('agent_steps')
    .select('output_data')
    .eq('run_id', runId)
    .eq('step_type', 'consolidate')
    .eq('status', 'completed')
    .limit(1)
    .single();

  const consolidation = (consolidationStep?.output_data ?? null) as ConsolidationOutput | null;
  const summary = run.financial_summary as FinancialSummary | null;

  // Build ScoreInputs
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

  // Evaluate via core
  const healthScore = calculateScore(scoreInputs);
  const alertDecisions = evaluateAlertRules(scoreInputs, healthScore);

  if (alertDecisions.length === 0) {
    logInfo(CTX, 'Nenhum alerta gerado', { runId, healthScore });
    return;
  }

  // Map to DB rows
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
    logError(CTX, 'Erro ao inserir alertas', { runId, error: insertError.message, alertsCount: rows.length });
    return;
  }

  logInfo(CTX, 'Alertas avaliados e inseridos', {
    runId,
    healthScore,
    alertsCount: alertDecisions.length,
    severities: alertDecisions.map((a) => a.severity),
  });
}
