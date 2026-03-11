import type { AnalysisContext } from "../../types";
import type { VarianceJustification } from "../../services/supabaseService";

/**
 * Constrói AnalysisContext a partir dos dados de variance_justifications (snapshot).
 * Usa a mesma "foto" que os pacoteiros justificam — AI e humanos na mesma base.
 *
 * Hierarquia no snapshot:
 *   depth-0: tag0 (sem tag01/tag02/marca) → consolidado
 *   depth-1: tag0 + tag01 (sem tag02/marca) → consolidado
 *   depth-2: tag0 + tag01 + tag02 (sem marca) → consolidado
 *   depth-3: tag0 + tag01 + tag02 + marca → por marca
 *
 * Quando filtrado por marca:
 *   depth-0/1/2 NÃO têm marca → valores consolidados (todas as marcas)
 *   depth-3 TEM marca → valores da marca específica
 *   → Devemos agregar depth-3 items por tag0 para obter DRE da marca
 */
export function buildContextFromSnapshot(
  items: VarianceJustification[],
  params?: { org_name?: string; year_month?: string; marca?: string },
): AnalysisContext {
  const prefix = (tag0: string) => (tag0 || '').slice(0, 3);

  // Separar por comparison_type (usar TODOS os items, não filtrar por marca ainda)
  const allOrcItems = items.filter(i => i.comparison_type === 'orcado');
  const allA1Items = items.filter(i => i.comparison_type === 'a1');

  // ── Construir prefixMap com a estratégia correta ──
  const prefixMap = new Map<string, { real: number; orc: number; a1: number }>();

  if (params?.marca) {
    // ═══ MODO MARCA ═══
    // Agregar a partir dos items que TÊM a marca (depth-3: tag0+tag01+tag02+marca)
    // Estes são os únicos com valores específicos da marca

    // Orçado
    const marcaOrc = allOrcItems.filter(i => i.marca === params.marca);
    // Usar os items de menor granularidade disponível para evitar double-counting:
    // Se tem items depth-3 (com tag02 + marca), usar esses
    // Se não, tentar depth-2 (tag01 + marca), etc.
    const leafOrc = marcaOrc.filter(i => i.tag02); // depth-2/3 items (mais granular)
    const useLeafOrc = leafOrc.length > 0 ? leafOrc : marcaOrc.filter(i => i.tag01);
    // Deduplicate: usar items mais profundos para evitar double-counting
    // Agregar os leaf items por tag0 prefix
    for (const i of useLeafOrc) {
      const p = prefix(i.tag0);
      if (!p.match(/^\d{2}\./)) continue;
      const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
      existing.real += i.real_value || 0;
      existing.orc += i.compare_value || 0;
      prefixMap.set(p, existing);
    }

    // A-1
    const marcaA1 = allA1Items.filter(i => i.marca === params.marca);
    const leafA1 = marcaA1.filter(i => i.tag02);
    const useLeafA1 = leafA1.length > 0 ? leafA1 : marcaA1.filter(i => i.tag01);
    for (const i of useLeafA1) {
      const p = prefix(i.tag0);
      if (!p.match(/^\d{2}\./)) continue;
      const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
      if (existing.real === 0) existing.real = i.real_value || 0;
      existing.a1 += i.compare_value || 0;
      prefixMap.set(p, existing);
    }

    // Se ainda zerado (marca não encontrada nos items), fallback: usar consolidado
    const hasMarcaData = Array.from(prefixMap.values()).some(v => v.real !== 0 || v.orc !== 0);
    if (!hasMarcaData) {
      // Fallback para items consolidados (sem marca) — melhor que nada
      aggregateConsolidated(allOrcItems, allA1Items, prefixMap, prefix);
    }
  } else {
    // ═══ MODO CONSOLIDADO ═══
    aggregateConsolidated(allOrcItems, allA1Items, prefixMap, prefix);
  }

  const gp = (p: string) => prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
  const r01 = gp('01.'), r02 = gp('02.'), r03 = gp('03.'), r04 = gp('04.'), r05 = gp('05.');

  const realRevenue = r01.real;
  const orcRevenue = r01.orc;
  const a1Revenue = r01.a1;

  const realEbitdaTotal = r01.real + r02.real + r03.real + r04.real + r05.real;
  const orcEbitdaTotal = r01.orc + r02.orc + r03.orc + r04.orc + r05.orc;
  const a1EbitdaTotal = r01.a1 + r02.a1 + r03.a1 + r04.a1 + r05.a1;

  const marginReal = realRevenue !== 0 ? realEbitdaTotal / realRevenue : 0;
  const marginOrc = orcRevenue !== 0 ? orcEbitdaTotal / orcRevenue : 0;
  const marginA1 = a1Revenue !== 0 ? a1EbitdaTotal / a1Revenue : 0;

  const delta = (actual: number, ref: number) =>
    ref !== 0 ? ((actual - ref) / Math.abs(ref)) * 100 : null;

  // ── KPIs ──
  const kpis = [
    {
      code: 'REVENUE', name: 'Receita Líquida', unit: 'currency' as const,
      actual: realRevenue, plan: orcRevenue, prior: a1Revenue,
      delta_vs_plan: delta(realRevenue, orcRevenue),
      delta_vs_prior: delta(realRevenue, a1Revenue),
    },
    {
      code: 'EBITDA', name: 'EBITDA Total', unit: 'currency' as const,
      actual: realEbitdaTotal, plan: orcEbitdaTotal, prior: a1EbitdaTotal,
      delta_vs_plan: delta(realEbitdaTotal, orcEbitdaTotal),
      delta_vs_prior: delta(realEbitdaTotal, a1EbitdaTotal),
    },
    {
      code: 'MARGIN', name: 'Margem EBITDA', unit: 'percent' as const,
      actual: marginReal, plan: marginOrc, prior: marginA1,
      delta_vs_plan: marginReal - marginOrc,
      delta_vs_prior: marginReal - marginA1,
    },
    {
      code: 'OPEX', name: 'SG&A', unit: 'currency' as const,
      actual: r04.real, plan: r04.orc, prior: r04.a1,
      delta_vs_plan: delta(r04.real, r04.orc),
      delta_vs_prior: delta(r04.real, r04.a1),
    },
    {
      code: 'VAR_COSTS', name: 'Custos Variáveis', unit: 'currency' as const,
      actual: r02.real, plan: r02.orc, prior: r02.a1,
      delta_vs_plan: delta(r02.real, r02.orc),
      delta_vs_prior: delta(r02.real, r02.a1),
    },
  ];

  // ── Waterfall: EBITDA Bridge (Real vs Orçado) ──
  const revenueGap = r01.real - r01.orc;
  const varCostGap = Math.abs(r02.real) - Math.abs(r02.orc);
  const fixCostGap = Math.abs(r03.real) - Math.abs(r03.orc);
  const sgaGap = Math.abs(r04.real) - Math.abs(r04.orc);
  const rateioGap = Math.abs(r05.real) - Math.abs(r05.orc);

  const ebitda_bridge_vs_plan_ytd = {
    start_label: 'EBITDA Orçado',
    end_label: 'EBITDA Real',
    start_value: orcEbitdaTotal,
    end_value: realEbitdaTotal,
    steps: [
      { label: 'Δ Receita', value: revenueGap },
      { label: 'Δ Custos Variáveis', value: -varCostGap },
      { label: 'Δ Custos Fixos', value: -fixCostGap },
      { label: 'Δ SG&A', value: -sgaGap },
      { label: 'Δ Rateio', value: -rateioGap },
    ],
  };

  // ── Pareto: Top variações por tag01 ──
  // Quando por marca, usar items da marca; quando consolidado, usar items sem tag02
  const paretoSource = params?.marca
    ? allOrcItems.filter(i => i.marca === params.marca && i.tag01)
    : allOrcItems.filter(i => i.tag01 && !i.tag02 && !i.tag03);

  const paretoItems = paretoSource
    .map(i => ({ name: `${i.tag0} > ${i.tag01}`, value: i.variance_abs || 0 }))
    .filter(i => Math.abs(i.value) > 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);

  const pareto_cost_variance_ytd = { items: paretoItems };

  // ── Heatmap: Variação % por tag0 prefix ──
  const prefixes = ['01.', '02.', '03.', '04.', '05.'];
  const heatmapValues: Array<[number, number, number]> = [];
  prefixes.forEach((p, yIdx) => {
    const d = prefixMap.get(p);
    const varPct = d && d.orc !== 0 ? ((d.real - d.orc) / Math.abs(d.orc)) * 100 : 0;
    heatmapValues.push([0, yIdx, Math.round(varPct * 10) / 10]);
  });

  const PREFIX_LABELS: Record<string, string> = {
    '01.': 'Receita Líquida', '02.': 'Custos Variáveis', '03.': 'Custos Fixos',
    '04.': 'SG&A', '05.': 'Rateio Raiz',
  };

  const heatmap_variance = {
    x: [params?.marca || 'Consolidado'],
    y: prefixes.map(p => PREFIX_LABELS[p] || p),
    values: heatmapValues,
    unit: 'percent' as const,
  };

  // ── Drivers Table ──
  const fmtVar = (r: number, c: number) => c !== 0 ? `${((r - c) / Math.abs(c) * 100).toFixed(1)}%` : '—';
  const mReal = realRevenue !== 0 ? (realEbitdaTotal / realRevenue * 100).toFixed(1) + '%' : '0%';
  const mOrc = orcRevenue !== 0 ? (orcEbitdaTotal / orcRevenue * 100).toFixed(1) + '%' : '0%';
  const mA1 = a1Revenue !== 0 ? (a1EbitdaTotal / a1Revenue * 100).toFixed(1) + '%' : '0%';

  const drivers_table = {
    columns: ['Indicador', 'Real', 'Orçado', 'Var vs Orç', 'A-1', 'Var vs A-1'],
    rows: [
      ['Receita Líquida', r01.real, r01.orc, fmtVar(r01.real, r01.orc), r01.a1, fmtVar(r01.real, r01.a1)],
      ['Custos Variáveis', r02.real, r02.orc, fmtVar(r02.real, r02.orc), r02.a1, fmtVar(r02.real, r02.a1)],
      ['Custos Fixos', r03.real, r03.orc, fmtVar(r03.real, r03.orc), r03.a1, fmtVar(r03.real, r03.a1)],
      ['SG&A', r04.real, r04.orc, fmtVar(r04.real, r04.orc), r04.a1, fmtVar(r04.real, r04.a1)],
      ['EBITDA Total', realEbitdaTotal, orcEbitdaTotal, fmtVar(realEbitdaTotal, orcEbitdaTotal), a1EbitdaTotal, fmtVar(realEbitdaTotal, a1EbitdaTotal)],
      ['Margem EBITDA %', mReal, mOrc, '—', mA1, '—'],
    ],
  };

  // ── Justificativas dos responsáveis ──
  const justSource = params?.marca
    ? allOrcItems.filter(i => (i.marca === params.marca || !i.marca) && i.justification && i.justification.trim().length > 0)
    : allOrcItems.filter(i => i.justification && i.justification.trim().length > 0);

  const justifications = justSource.map(i => ({
    conta: [i.tag0, i.tag01, i.tag02].filter(Boolean).join(' > '),
    variacao: i.variance_abs,
    variacao_pct: i.variance_pct,
    justificativa: i.justification,
    plano_acao: i.action_plan || undefined,
    responsavel: i.owner_name || i.owner_email || undefined,
  }));

  // ── Montar período e escopo ──
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const ym = params?.year_month || items[0]?.year_month || '';
  const [y, m] = ym.split('-').map(Number);
  const period_label = y && m ? `${monthNames[m - 1]}/${y}` : ym;

  const scope_label = params?.marca ? `Marca: ${params.marca}` : 'Consolidado';

  return {
    org_name: params?.org_name || 'RAIZ EDUCAÇÃO',
    currency: 'BRL',
    period_label,
    scope_label,
    kpis,
    datasets: {
      r12: { x: [period_label], series: [] },
      ebitda_bridge_vs_plan_ytd,
      pareto_cost_variance_ytd,
      heatmap_variance,
      drivers_table,
      justifications,
    },
    analysis_rules: {
      prefer_pareto: true,
      highlight_threshold_currency: 100000,
      highlight_threshold_percent: 0.03,
    },
  };
}

/**
 * Agrega items consolidados (sem marca) — modo padrão.
 * Depth-0 (sem tag01) primeiro, fallback para depth-1 (com tag01 sem tag02).
 */
function aggregateConsolidated(
  orcItems: VarianceJustification[],
  a1Items: VarianceJustification[],
  prefixMap: Map<string, { real: number; orc: number; a1: number }>,
  prefix: (tag0: string) => string,
) {
  // Depth-0: sem tag01
  const depth0Orc = orcItems.filter(i => !i.tag01 && !i.tag02 && !i.tag03);
  for (const i of depth0Orc) {
    const p = prefix(i.tag0);
    if (!p.match(/^\d{2}\./)) continue;
    const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
    existing.real += i.real_value || 0;
    existing.orc += i.compare_value || 0;
    prefixMap.set(p, existing);
  }

  // Fallback depth-1 se depth-0 vazio
  const hasData = Array.from(prefixMap.values()).some(v => v.real !== 0 || v.orc !== 0);
  if (!hasData) {
    const depth1Orc = orcItems.filter(i => i.tag01 && !i.tag02 && !i.tag03);
    for (const i of depth1Orc) {
      const p = prefix(i.tag0);
      if (!p.match(/^\d{2}\./)) continue;
      const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
      existing.real += i.real_value || 0;
      existing.orc += i.compare_value || 0;
      prefixMap.set(p, existing);
    }
  }

  // A-1 depth-0
  const depth0A1 = a1Items.filter(i => !i.tag01 && !i.tag02 && !i.tag03);
  for (const i of depth0A1) {
    const p = prefix(i.tag0);
    if (!p.match(/^\d{2}\./)) continue;
    const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
    if (existing.real === 0) existing.real = i.real_value || 0;
    existing.a1 += i.compare_value || 0;
    prefixMap.set(p, existing);
  }

  // Fallback A-1 depth-1
  const hasA1 = Array.from(prefixMap.values()).some(v => v.a1 !== 0);
  if (!hasA1) {
    const depth1A1 = a1Items.filter(i => i.tag01 && !i.tag02 && !i.tag03);
    for (const i of depth1A1) {
      const p = prefix(i.tag0);
      if (!p.match(/^\d{2}\./)) continue;
      const existing = prefixMap.get(p) || { real: 0, orc: 0, a1: 0 };
      if (existing.real === 0) existing.real = i.real_value || 0;
      existing.a1 += i.compare_value || 0;
      prefixMap.set(p, existing);
    }
  }
}
