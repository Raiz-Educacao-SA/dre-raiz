import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';
import { safePct } from '../../core/financialModel';
import { evaluateScore } from '../../core/scoreModel';
import type { ScoreInputs } from '../../core/decisionTypes';

// --------------------------------------------
// Handler (adaptador — toda lógica no core)
// --------------------------------------------

export async function handler(req: { method: string }, res: {
  status: (code: number) => { json: (data: unknown) => void };
}) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    // 1. Buscar último run completed
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

    // 2. Buscar consolidation step deste run
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

    // 3. Montar ScoreInputs
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

    // 4. Calcular via core
    const result = evaluateScore(scoreInputs);

    // 5. Resposta
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

export default handler;
