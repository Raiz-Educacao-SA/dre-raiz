import { supabaseAdmin } from './_lib/supabaseAdmin';
import { recordAuditEntryAsync } from './_lib/auditTrail';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';
import { normalizeFinancialInputs, safePct } from '../../core/financialModel';
import { runOptimization } from '../../core/optimizationEngine';
import type { ScoreInputs, CutCandidate, OptimizationInput } from '../../core/decisionTypes';

// --------------------------------------------
// Handler (adaptador — toda lógica no core)
// --------------------------------------------

export async function handler(req: { method: string; body: { target_score?: number; target_ebitda?: number } }, res: {
  status: (code: number) => { json: (data: unknown) => void };
}) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { target_score, target_ebitda } = req.body;

    if (!target_score && !target_ebitda) {
      return res.status(400).json({ error: 'Informe target_score ou target_ebitda' });
    }

    const sb = supabaseAdmin();

    // 1. Buscar último run completed
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

    // 2. Buscar consolidation step
    const { data: consolidationStep } = await sb
      .from('agent_steps')
      .select('output_data')
      .eq('run_id', run.id)
      .eq('step_type', 'consolidate')
      .eq('status', 'completed')
      .limit(1)
      .single();

    const consolidation = (consolidationStep?.output_data ?? null) as ConsolidationOutput | null;

    // 3. Montar inputs para o core
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

    // 4. Construir candidatos de corte
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

    // 5. Executar otimização via core
    const config: OptimizationInput = {
      current_financials: financials,
      current_score_inputs: scoreInputs,
      target_score,
      target_ebitda,
      candidates,
    };

    const result = runOptimization(config);

    // 6. Registrar audit trail (optimization)
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
      performed_by: (req as any).body?.performedBy || 'api',
      justification: `Plano de otimização: target_score=${target_score || 'N/A'}, target_ebitda=${target_ebitda || 'N/A'}`,
    });

    // 7. Resposta (manter backward compatibility)
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

export default handler;
