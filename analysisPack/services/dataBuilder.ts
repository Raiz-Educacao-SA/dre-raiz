import type { KPI, DatasetRegistry } from "../../types";
import type { SomaTagsRow } from "../../services/supabaseService";

// ── DRE prefixes ──
const PREFIX_LABELS: Record<string, string> = {
  '01.': 'Receita Líquida',
  '02.': 'Custos Variáveis',
  '03.': 'Custos Fixos',
  '04.': 'SG&A',
  '05.': 'Rateio Raiz',
};

/** Aggregate rows by tag0 prefix (first 3 chars) */
function sumByPrefix(rows: SomaTagsRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const prefix = (r.tag0 || '').slice(0, 3);
    if (!prefix.match(/^\d{2}\./)) continue;
    map.set(prefix, (map.get(prefix) || 0) + Number(r.total || 0));
  }
  return map;
}

/** Aggregate rows by month + tag0 prefix */
function sumByMonthPrefix(rows: SomaTagsRow[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const prefix = (r.tag0 || '').slice(0, 3);
    if (!prefix.match(/^\d{2}\./)) continue;
    if (!map.has(r.month)) map.set(r.month, new Map());
    const m = map.get(r.month)!;
    m.set(prefix, (m.get(prefix) || 0) + Number(r.total || 0));
  }
  return map;
}

/** Helper: get prefix value or 0 */
const gp = (map: Map<string, number>, p: string) => map.get(p) || 0;

/** Calculate totals from prefix map */
function calcTotals(prefixMap: Map<string, number>) {
  const revenue = gp(prefixMap, '01.');
  const varCosts = gp(prefixMap, '02.');
  const fixCosts = gp(prefixMap, '03.');
  const sga = gp(prefixMap, '04.');
  const rateio = gp(prefixMap, '05.');
  const totalCosts = Math.abs(varCosts) + Math.abs(fixCosts) + Math.abs(sga) + Math.abs(rateio);
  const margem = revenue + varCosts + fixCosts; // varCosts/fixCosts are negative
  const ebitda = margem + sga;
  const ebitdaTotal = ebitda + rateio;
  return { revenue, varCosts, fixCosts, sga, rateio, totalCosts, margem, ebitda, ebitdaTotal };
}

/**
 * Constrói datasets a partir de dados reais de get_soma_tags
 */
export function buildDatasets(
  realRows: SomaTagsRow[],
  orcadoRows: SomaTagsRow[],
  a1Rows: SomaTagsRow[],
): DatasetRegistry {
  const realByMonth = sumByMonthPrefix(realRows);
  const orcByMonth = sumByMonthPrefix(orcadoRows);

  const realTotals = sumByPrefix(realRows);
  const orcTotals = sumByPrefix(orcadoRows);
  const a1Totals = sumByPrefix(a1Rows);

  const realCalc = calcTotals(realTotals);
  const orcCalc = calcTotals(orcTotals);

  // ── 1. R12 — Monthly revenue, EBITDA, costs (Real + Orçado) ──
  const allMonths = [...new Set([...realByMonth.keys(), ...orcByMonth.keys()])].sort().slice(-12);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const r12 = {
    x: allMonths.map(m => {
      const [year, month] = m.split('-');
      return `${monthNames[parseInt(month) - 1]}/${year.substring(2)}`;
    }),
    series: [
      {
        key: 'revenue_real',
        name: 'Receita Real',
        unit: 'currency' as const,
        data: allMonths.map(m => gp(realByMonth.get(m) || new Map(), '01.')),
      },
      {
        key: 'revenue_orcado',
        name: 'Receita Orçado',
        unit: 'currency' as const,
        data: allMonths.map(m => gp(orcByMonth.get(m) || new Map(), '01.')),
      },
      {
        key: 'ebitda_real',
        name: 'EBITDA Real',
        unit: 'currency' as const,
        data: allMonths.map(m => {
          const pm = realByMonth.get(m) || new Map();
          const { ebitdaTotal } = calcTotals(pm);
          return ebitdaTotal;
        }),
      },
      {
        key: 'ebitda_orcado',
        name: 'EBITDA Orçado',
        unit: 'currency' as const,
        data: allMonths.map(m => {
          const pm = orcByMonth.get(m) || new Map();
          const { ebitdaTotal } = calcTotals(pm);
          return ebitdaTotal;
        }),
      },
    ],
  };

  // ── 2. EBITDA Bridge (waterfall) — Real vs Orçado ──
  const revenueGap = realCalc.revenue - orcCalc.revenue;
  const varCostGap = Math.abs(realCalc.varCosts) - Math.abs(orcCalc.varCosts);
  const fixCostGap = Math.abs(realCalc.fixCosts) - Math.abs(orcCalc.fixCosts);
  const sgaGap = Math.abs(realCalc.sga) - Math.abs(orcCalc.sga);
  const rateioGap = Math.abs(realCalc.rateio) - Math.abs(orcCalc.rateio);

  const ebitda_bridge_vs_plan_ytd = {
    start_label: 'EBITDA Orçado',
    end_label: 'EBITDA Real',
    start_value: orcCalc.ebitdaTotal,
    end_value: realCalc.ebitdaTotal,
    steps: [
      { label: 'Δ Receita', value: revenueGap },
      { label: 'Δ Custos Variáveis', value: -varCostGap },
      { label: 'Δ Custos Fixos', value: -fixCostGap },
      { label: 'Δ SG&A', value: -sgaGap },
      { label: 'Δ Rateio', value: -rateioGap },
    ],
  };

  // ── 3. Pareto — Top variações por tag01 (Real vs Orçado) ──
  const tag01Real = new Map<string, number>();
  const tag01Orc = new Map<string, number>();
  for (const r of realRows) {
    if (!r.tag01) continue;
    tag01Real.set(r.tag01, (tag01Real.get(r.tag01) || 0) + Number(r.total || 0));
  }
  for (const r of orcadoRows) {
    if (!r.tag01) continue;
    tag01Orc.set(r.tag01, (tag01Orc.get(r.tag01) || 0) + Number(r.total || 0));
  }
  const allTag01s = new Set([...tag01Real.keys(), ...tag01Orc.keys()]);
  const paretoItems = [...allTag01s]
    .map(tag01 => ({
      name: tag01,
      value: (tag01Real.get(tag01) || 0) - (tag01Orc.get(tag01) || 0),
    }))
    .filter(i => Math.abs(i.value) > 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 10);

  const pareto_cost_variance_ytd = { items: paretoItems };

  // ── 4. Heatmap — Variação % por tag0 prefix (Real vs Orçado) ──
  const prefixes = ['01.', '02.', '03.', '04.', '05.'];
  const heatmapValues: Array<[number, number, number]> = [];
  prefixes.forEach((prefix, yIdx) => {
    const real = gp(realTotals, prefix);
    const orc = gp(orcTotals, prefix);
    const varPct = orc !== 0 ? ((real - orc) / Math.abs(orc)) * 100 : 0;
    heatmapValues.push([0, yIdx, Math.round(varPct * 10) / 10]);
  });

  const heatmap_variance = {
    x: ['Consolidado'],
    y: prefixes.map(p => PREFIX_LABELS[p] || p),
    values: heatmapValues,
    unit: 'percent' as const,
  };

  // ── 5. Drivers Table — Real, Orçado, A-1 ──
  const a1Calc = calcTotals(a1Totals);
  const fmtVar = (r: number, c: number) => c !== 0 ? `${((r - c) / Math.abs(c) * 100).toFixed(1)}%` : '—';
  const marginReal = realCalc.revenue !== 0 ? (realCalc.ebitdaTotal / realCalc.revenue * 100).toFixed(1) + '%' : '0%';
  const marginOrc = orcCalc.revenue !== 0 ? (orcCalc.ebitdaTotal / orcCalc.revenue * 100).toFixed(1) + '%' : '0%';
  const marginA1 = a1Calc.revenue !== 0 ? (a1Calc.ebitdaTotal / a1Calc.revenue * 100).toFixed(1) + '%' : '0%';

  const drivers_table = {
    columns: ['Indicador', 'Real', 'Orçado', 'Var vs Orç', 'A-1', 'Var vs A-1'],
    rows: [
      ['Receita Líquida', realCalc.revenue, orcCalc.revenue, fmtVar(realCalc.revenue, orcCalc.revenue), a1Calc.revenue, fmtVar(realCalc.revenue, a1Calc.revenue)],
      ['Custos Variáveis', realCalc.varCosts, orcCalc.varCosts, fmtVar(realCalc.varCosts, orcCalc.varCosts), a1Calc.varCosts, fmtVar(realCalc.varCosts, a1Calc.varCosts)],
      ['Custos Fixos', realCalc.fixCosts, orcCalc.fixCosts, fmtVar(realCalc.fixCosts, orcCalc.fixCosts), a1Calc.fixCosts, fmtVar(realCalc.fixCosts, a1Calc.fixCosts)],
      ['SG&A', realCalc.sga, orcCalc.sga, fmtVar(realCalc.sga, orcCalc.sga), a1Calc.sga, fmtVar(realCalc.sga, a1Calc.sga)],
      ['EBITDA Total', realCalc.ebitdaTotal, orcCalc.ebitdaTotal, fmtVar(realCalc.ebitdaTotal, orcCalc.ebitdaTotal), a1Calc.ebitdaTotal, fmtVar(realCalc.ebitdaTotal, a1Calc.ebitdaTotal)],
      ['Margem EBITDA %', marginReal, marginOrc, '—', marginA1, '—'],
    ],
  };

  return {
    r12,
    ebitda_bridge_vs_plan_ytd,
    pareto_cost_variance_ytd,
    heatmap_variance,
    drivers_table,
  };
}

/**
 * Constrói lista de KPIs formatados a partir de dados reais
 */
export function buildKPIs(
  realRows: SomaTagsRow[],
  orcadoRows: SomaTagsRow[],
  a1Rows: SomaTagsRow[],
): KPI[] {
  const realCalc = calcTotals(sumByPrefix(realRows));
  const orcCalc = calcTotals(sumByPrefix(orcadoRows));
  const a1Calc = calcTotals(sumByPrefix(a1Rows));

  const delta = (actual: number, ref: number) =>
    ref !== 0 ? ((actual - ref) / Math.abs(ref)) * 100 : null;

  const marginReal = realCalc.revenue !== 0 ? realCalc.ebitdaTotal / realCalc.revenue : 0;
  const marginOrc = orcCalc.revenue !== 0 ? orcCalc.ebitdaTotal / orcCalc.revenue : 0;
  const marginA1 = a1Calc.revenue !== 0 ? a1Calc.ebitdaTotal / a1Calc.revenue : 0;

  return [
    {
      code: 'REVENUE',
      name: 'Receita Líquida',
      unit: 'currency',
      actual: realCalc.revenue,
      plan: orcCalc.revenue,
      prior: a1Calc.revenue,
      delta_vs_plan: delta(realCalc.revenue, orcCalc.revenue),
      delta_vs_prior: delta(realCalc.revenue, a1Calc.revenue),
    },
    {
      code: 'EBITDA',
      name: 'EBITDA Total',
      unit: 'currency',
      actual: realCalc.ebitdaTotal,
      plan: orcCalc.ebitdaTotal,
      prior: a1Calc.ebitdaTotal,
      delta_vs_plan: delta(realCalc.ebitdaTotal, orcCalc.ebitdaTotal),
      delta_vs_prior: delta(realCalc.ebitdaTotal, a1Calc.ebitdaTotal),
    },
    {
      code: 'MARGIN',
      name: 'Margem EBITDA',
      unit: 'percent',
      actual: marginReal,
      plan: marginOrc,
      prior: marginA1,
      delta_vs_plan: marginReal - marginOrc,
      delta_vs_prior: marginReal - marginA1,
    },
    {
      code: 'OPEX',
      name: 'SG&A',
      unit: 'currency',
      actual: realCalc.sga,
      plan: orcCalc.sga,
      prior: a1Calc.sga,
      delta_vs_plan: delta(realCalc.sga, orcCalc.sga),
      delta_vs_prior: delta(realCalc.sga, a1Calc.sga),
    },
    {
      code: 'VAR_COSTS',
      name: 'Custos Variáveis',
      unit: 'currency',
      actual: realCalc.varCosts,
      plan: orcCalc.varCosts,
      prior: a1Calc.varCosts,
      delta_vs_plan: delta(realCalc.varCosts, orcCalc.varCosts),
      delta_vs_prior: delta(realCalc.varCosts, a1Calc.varCosts),
    },
  ];
}
