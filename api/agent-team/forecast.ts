import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';
import { safePct } from '../../core/financialModel';
import { calculateScore } from '../../core/scoreModel';
import { computeForecast } from '../../core/forecastModel';
import type { ScoreInputs, TimeSeriesPoint } from '../../core/decisionTypes';

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

    // 1. Buscar últimos 5 runs completed
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

    // 2. Buscar consolidation steps
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

    // 3. Ordenar cronologicamente (antigo → recente)
    const sorted = [...runs].reverse();

    // 4. Construir série temporal via core
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

    // 5. Computar forecast via core
    const result = computeForecast(series);

    return res.status(200).json(result);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({ error: 'Erro interno', message: msg });
  }
}

export default handler;
