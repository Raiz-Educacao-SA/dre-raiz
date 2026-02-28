import { supabaseAdmin } from './_lib/supabaseAdmin';
import { buildFinancialSummary } from './_lib/buildFinancialSummary';
import { safePct } from '../../core/financialModel';
import { calculateScore, classifyScore } from '../../core/scoreModel';
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

      // Per-brand score: no confidence/conflicts (global data)
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

export default handler;
