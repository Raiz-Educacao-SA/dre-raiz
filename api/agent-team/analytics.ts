import { supabaseAdmin } from './_lib/supabaseAdmin';
import type { FinancialSummary, ConsolidationOutput } from '../../types/agentTeam';

// --------------------------------------------
// Response types
// --------------------------------------------

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

// --------------------------------------------
// Handler
// --------------------------------------------

export async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseAdmin();

    // 1. Buscar últimos 50 runs completed
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

    // 2. Buscar consolidation steps para esses runs
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

    // Map run_id → consolidation output
    const consolidationMap = new Map<string, ConsolidationOutput>();
    for (const step of consolidationSteps || []) {
      if (step.output_data) {
        consolidationMap.set(step.run_id, step.output_data as ConsolidationOutput);
      }
    }

    // 3. Montar trend
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

    // 4. Calcular médias
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

export default handler;
