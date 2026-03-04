// ─── Variance PPT — Data Transformation Service ──────────────────
// Pure function: VarianceJustification[] → VariancePptData (zero RPCs)

import type { VarianceJustification } from './supabaseService';
import {
  BOOK_COLORS,
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
  VariancePptStats,
} from './variancePptTypes';

// ── Month helpers ────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTH_SHORT = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
];

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

// ── Section config ───────────────────────────────────────────────

const SECTION_CONFIG: Record<string, { color: string; invertDelta: boolean }> = {
  '01.': { color: BOOK_COLORS.receitas, invertDelta: false },
  '02.': { color: BOOK_COLORS.custos, invertDelta: true },
  '03.': { color: BOOK_COLORS.custos, invertDelta: true },
  '04.': { color: BOOK_COLORS.sga, invertDelta: true },
  '05.': { color: BOOK_COLORS.custos, invertDelta: true },
};

function getSectionConfig(tag0: string) {
  const prefix = tag0.slice(0, 3);
  return SECTION_CONFIG[prefix] || { color: BOOK_COLORS.mutedText, invertDelta: false };
}

// ── Aggregation ──────────────────────────────────────────────────

function computeVarPct(real: number, compare: number): number | null {
  if (compare === 0) return null;
  return Math.round(((real - compare) / Math.abs(compare)) * 1000) / 10;
}

// ── Main ─────────────────────────────────────────────────────────

export function prepareVariancePptData(
  items: VarianceJustification[],
  yearMonth: string,
  filterMarca: string | null,
): VariancePptData {
  const { year, month } = parseYearMonth(yearMonth);
  const a1Year = year - 1;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const monthShort = `${MONTH_SHORT[month - 1]}/${String(year).slice(2)}`;

  // Index items by path
  const pathKey = (i: VarianceJustification) =>
    `${i.tag0}|${i.tag01 || ''}|${i.tag02 || ''}|${i.tag03 || ''}`;

  const orcMap = new Map<string, VarianceJustification>();
  const a1Map = new Map<string, VarianceJustification>();
  for (const item of items) {
    const pk = pathKey(item);
    if (item.comparison_type === 'orcado') orcMap.set(pk, item);
    else if (item.comparison_type === 'a1') a1Map.set(pk, item);
  }

  // Build node from direct DB rows or aggregated children
  function buildNode(
    depth: number,
    label: string,
    tag0: string,
    tag01: string,
    tag02: string | null,
    tag03: string | null,
    allItems: VarianceJustification[],
    children: VariancePptNode[],
  ): VariancePptNode {
    const pk = `${tag0}|${tag01 || ''}|${tag02 || ''}|${tag03 || ''}`;
    const orcDirect = orcMap.get(pk) || null;
    const a1Direct = a1Map.get(pk) || null;

    // Aggregate from children if no direct row
    const aggOrc = allItems.filter(i => i.comparison_type === 'orcado');
    const aggA1 = allItems.filter(i => i.comparison_type === 'a1');

    const realVal = orcDirect
      ? Number(orcDirect.real_value)
      : a1Direct
      ? Number(a1Direct.real_value)
      : aggOrc.length > 0
      ? aggOrc.reduce((s, i) => s + Number(i.real_value), 0)
      : aggA1.reduce((s, i) => s + Number(i.real_value), 0);

    const orcCompare = orcDirect
      ? Number(orcDirect.compare_value)
      : aggOrc.reduce((s, i) => s + Number(i.compare_value), 0);

    const a1Compare = a1Direct
      ? Number(a1Direct.compare_value)
      : aggA1.reduce((s, i) => s + Number(i.compare_value), 0);

    return {
      depth,
      label,
      tag0,
      tag01,
      tag02,
      tag03,
      real: realVal,
      orcCompare,
      orcVarPct: orcDirect ? orcDirect.variance_pct : computeVarPct(realVal, orcCompare),
      orcAiSummary: orcDirect?.ai_summary || null,
      a1Compare,
      a1VarPct: a1Direct ? a1Direct.variance_pct : computeVarPct(realVal, a1Compare),
      a1AiSummary: a1Direct?.ai_summary || null,
      orcJustification: orcDirect?.justification || null,
      a1Justification: a1Direct?.justification || null,
      orcStatus: orcDirect?.status || '',
      a1Status: a1Direct?.status || '',
      ownerName: orcDirect?.owner_name || a1Direct?.owner_name || null,
      enrichedInsight: null,
      enrichedDrivers: null,
      children,
    };
  }

  // Collect unique tag0 values and build sections (excluding calc rows)
  const CALC_TAG0S = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
  const tag0Set = [...new Set(items.map(i => i.tag0))].filter(t => !CALC_TAG0S.has(t)).sort();
  const sections: VariancePptSection[] = [];

  for (const tag0 of tag0Set) {
    const tag0Items = items.filter(i => i.tag0 === tag0);
    const tag01Set = [...new Set(tag0Items.filter(i => i.tag01).map(i => i.tag01))].sort();
    const { color, invertDelta } = getSectionConfig(tag0);

    const tag01Nodes: VariancePptNode[] = [];

    for (const tag01 of tag01Set) {
      if (!tag01) continue;
      const tag01Items = tag0Items.filter(i => i.tag01 === tag01);
      const tag02Set = [...new Set(tag01Items.filter(i => i.tag02).map(i => i.tag02!))].sort();

      const tag02Children: VariancePptNode[] = [];
      for (const tag02 of tag02Set) {
        const tag02Items = tag01Items.filter(i => i.tag02 === tag02);
        // tag02 = folha (sem tag03)
        tag02Children.push(buildNode(2, tag02, tag0, tag01, tag02, null, tag02Items, []));
      }

      tag01Nodes.push(buildNode(1, tag01, tag0, tag01, null, null, tag01Items, tag02Children));
    }

    const tag0Node = buildNode(0, tag0, tag0, '', null, null, tag0Items, tag01Nodes);

    // Clean label: remove numeric prefix (e.g. "01. RECEITA LÍQUIDA" → "RECEITA LÍQUIDA")
    const cleanLabel = tag0.replace(/^\d+\.\s*/, '');

    sections.push({
      tag0,
      label: cleanLabel,
      invertDelta,
      sectionColor: color,
      node: tag0Node,
      tag01Nodes,
    });
  }

  // Calc rows: prefer DB-stored MARGEM/EBITDA items, fallback to computed
  const calcRows = computeCalcRows(sections, items, orcMap, a1Map);

  // Stats: count leaves (tag02) from the original items (excluding calc rows)
  const leaves = items.filter(i => i.tag02 !== null && !CALC_TAG0S.has(i.tag0));
  const stats = computeStats(leaves);

  // Version + snapshotAt
  const version = items.length > 0 ? Math.max(...items.map(i => i.version || 1)) : 0;
  const currentVersionItems = items.filter(i => i.version === version && i.snapshot_at);
  const snapshotAt = currentVersionItems.length > 0
    ? currentVersionItems.reduce((latest, i) => (i.snapshot_at! > latest ? i.snapshot_at! : latest), currentVersionItems[0].snapshot_at!)
    : null;

  return {
    monthLabel,
    monthShort,
    year,
    a1Year,
    marca: filterMarca,
    version,
    snapshotAt,
    sections,
    calcRows,
    stats,
    executiveSummary: null,
    closingSummary: null,
  };
}

// ── Calc rows ────────────────────────────────────────────────────

function computeCalcRows(
  sections: VariancePptSection[],
  items: VarianceJustification[],
  orcMap: Map<string, VarianceJustification>,
  a1Map: Map<string, VarianceJustification>,
): VariancePptCalcRow[] {
  // Try to read from DB-stored calc rows first
  const margemOrc = orcMap.get('MARGEM DE CONTRIBUIÇÃO|||');
  const margemA1 = a1Map.get('MARGEM DE CONTRIBUIÇÃO|||');
  const ebitdaSrOrc = orcMap.get('EBITDA (S/ RATEIO RAIZ CSC)|||');
  const ebitdaSrA1 = a1Map.get('EBITDA (S/ RATEIO RAIZ CSC)|||');
  const ebitdaTotalOrc = orcMap.get('EBITDA TOTAL|||');
  const ebitdaTotalA1 = a1Map.get('EBITDA TOTAL|||');

  if (margemOrc || ebitdaSrOrc || ebitdaTotalOrc) {
    // Use DB values
    const rows: VariancePptCalcRow[] = [];
    if (margemOrc || margemA1) {
      const real = margemOrc ? Number(margemOrc.real_value) : margemA1 ? Number(margemA1.real_value) : 0;
      rows.push({
        label: 'MARGEM DE CONTRIBUIÇÃO',
        real,
        orcado: margemOrc ? Number(margemOrc.compare_value) : 0,
        a1: margemA1 ? Number(margemA1.compare_value) : 0,
        deltaOrcPct: margemOrc?.variance_pct ?? null,
        deltaA1Pct: margemA1?.variance_pct ?? null,
      });
    }
    if (ebitdaSrOrc || ebitdaSrA1) {
      const real = ebitdaSrOrc ? Number(ebitdaSrOrc.real_value) : ebitdaSrA1 ? Number(ebitdaSrA1.real_value) : 0;
      rows.push({
        label: 'EBITDA (S/ RATEIO RAIZ CSC)',
        real,
        orcado: ebitdaSrOrc ? Number(ebitdaSrOrc.compare_value) : 0,
        a1: ebitdaSrA1 ? Number(ebitdaSrA1.compare_value) : 0,
        deltaOrcPct: ebitdaSrOrc?.variance_pct ?? null,
        deltaA1Pct: ebitdaSrA1?.variance_pct ?? null,
      });
    }
    if (ebitdaTotalOrc || ebitdaTotalA1) {
      const real = ebitdaTotalOrc ? Number(ebitdaTotalOrc.real_value) : ebitdaTotalA1 ? Number(ebitdaTotalA1.real_value) : 0;
      rows.push({
        label: 'EBITDA TOTAL',
        real,
        orcado: ebitdaTotalOrc ? Number(ebitdaTotalOrc.compare_value) : 0,
        a1: ebitdaTotalA1 ? Number(ebitdaTotalA1.compare_value) : 0,
        deltaOrcPct: ebitdaTotalOrc?.variance_pct ?? null,
        deltaA1Pct: ebitdaTotalA1?.variance_pct ?? null,
      });
    }
    return rows;
  }

  // Fallback: compute from sections
  const findSection = (prefix: string) => sections.find(s => s.tag0.startsWith(prefix));
  const s01 = findSection('01.');
  const s02 = findSection('02.');
  const s03 = findSection('03.');
  const s04 = findSection('04.');
  const s05 = findSection('05.');

  const realMargem = (s01?.node.real || 0) + (s02?.node.real || 0) + (s03?.node.real || 0);
  const orcMargem = (s01?.node.orcCompare || 0) + (s02?.node.orcCompare || 0) + (s03?.node.orcCompare || 0);
  const a1Margem = (s01?.node.a1Compare || 0) + (s02?.node.a1Compare || 0) + (s03?.node.a1Compare || 0);

  const realEbitdaSr = realMargem + (s04?.node.real || 0);
  const orcEbitdaSr = orcMargem + (s04?.node.orcCompare || 0);
  const a1EbitdaSr = a1Margem + (s04?.node.a1Compare || 0);

  const realEbitdaTotal = realEbitdaSr + (s05?.node.real || 0);
  const orcEbitdaTotal = orcEbitdaSr + (s05?.node.orcCompare || 0);
  const a1EbitdaTotal = a1EbitdaSr + (s05?.node.a1Compare || 0);

  return [
    {
      label: 'MARGEM DE CONTRIBUIÇÃO',
      real: realMargem,
      orcado: orcMargem,
      a1: a1Margem,
      deltaOrcPct: computeVarPct(realMargem, orcMargem),
      deltaA1Pct: computeVarPct(realMargem, a1Margem),
    },
    {
      label: 'EBITDA (S/ RATEIO RAIZ CSC)',
      real: realEbitdaSr,
      orcado: orcEbitdaSr,
      a1: a1EbitdaSr,
      deltaOrcPct: computeVarPct(realEbitdaSr, orcEbitdaSr),
      deltaA1Pct: computeVarPct(realEbitdaSr, a1EbitdaSr),
    },
    {
      label: 'EBITDA TOTAL',
      real: realEbitdaTotal,
      orcado: orcEbitdaTotal,
      a1: a1EbitdaTotal,
      deltaOrcPct: computeVarPct(realEbitdaTotal, orcEbitdaTotal),
      deltaA1Pct: computeVarPct(realEbitdaTotal, a1EbitdaTotal),
    },
  ];
}

// ── Stats ────────────────────────────────────────────────────────

function computeStats(leaves: VarianceJustification[]): VariancePptStats {
  const totalLeaves = leaves.length;
  const justified = leaves.filter(i => i.status === 'justified').length;
  const approved = leaves.filter(i => i.status === 'approved').length;
  const pending = leaves.filter(i => i.status === 'pending').length;
  const rejected = leaves.filter(i => i.status === 'rejected').length;
  const notified = leaves.filter(i => i.status === 'notified').length;
  const coveragePct = totalLeaves > 0 ? Math.round(((justified + approved) / totalLeaves) * 100) : 0;

  return { totalLeaves, justified, approved, pending, rejected, notified, coveragePct };
}
