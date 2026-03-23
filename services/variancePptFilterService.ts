// ─── Variance PPT — Slide Filter Service ────────────────────────────
// Pure functions: apply per-slide view filters to VariancePptData nodes.
// Zero re-fetch — all filtering happens in-memory from pre-loaded data.

import type {
  VariancePptSection,
  VariancePptNode,
  VariancePptMarcaEntry,
  VariancePptData,
  VariancePptCalcRow,
} from './variancePptTypes';

// ── Types ────────────────────────────────────────────────────────────

export type SlideViewFilters = {
  tag01s?: string[];    // sub-contas (tag01) to show in SectionSlide
  tag02s?: string[];    // sub-contas (tag02) to show in Tag01DetailSlide
  marcas?: string[];    // marcas to include (recalculates aggregated totals)
  statuses?: string[];  // justification statuses for T01JustificativasSlide
};

export type FilterGroup = {
  id: keyof SlideViewFilters;
  label: string;
  options: string[];
};

// ── Helpers ──────────────────────────────────────────────────────────

export function isFiltersEmpty(f: SlideViewFilters): boolean {
  return !f.tag01s?.length && !f.tag02s?.length && !f.marcas?.length && !f.statuses?.length;
}

function computeVarPct(real: number, compare: number): number | null {
  if (compare === 0) return null;
  return Math.round(((real - compare) / Math.abs(compare)) * 1000) / 10;
}

// ── Section filter ───────────────────────────────────────────────────

/** Filter tag02 children of a node by selected marcas, recalculating totals */
function filterNodeByMarcas(
  node: VariancePptNode,
  marcaSet: Set<string>,
): VariancePptNode | null {
  // No depth-3 children: check single-marca field set by data service
  if (node.children.length === 0 || node.children[0]?.depth !== 3) {
    if (node.marca !== null) {
      // Single-marca node: include only if its marca is selected
      return marcaSet.has(node.marca) ? node : null;
    }
    return node; // Unknown marca → pass through
  }

  const kept = node.children.filter(m => marcaSet.has(m.label));
  if (kept.length === 0) return null;
  if (kept.length === node.children.length) return node;

  const real = kept.reduce((s, m) => s + m.real, 0);
  const orc  = kept.reduce((s, m) => s + m.orcCompare, 0);
  const a1   = kept.reduce((s, m) => s + m.a1Compare, 0);
  return {
    ...node,
    children: kept,
    real, orcCompare: orc, a1Compare: a1,
    orcVarPct: computeVarPct(real, orc),
    a1VarPct: computeVarPct(real, a1),
  };
}

/**
 * Filter a VariancePptSection by tag01s and/or marcas.
 * Recalculates all aggregated totals bottom-up so charts & tables stay consistent.
 */
export function filterSection(
  section: VariancePptSection,
  filters: SlideViewFilters,
): VariancePptSection {
  if (isFiltersEmpty(filters)) return section;

  let tag01Nodes = section.tag01Nodes;

  // 1. Filter tag01s
  if (filters.tag01s && filters.tag01s.length > 0) {
    const set = new Set(filters.tag01s);
    tag01Nodes = tag01Nodes.filter(n => set.has(n.label));
  }

  // 2. Filter marcas within each tag01 → recalculate tag02 & tag01 totals
  if (filters.marcas && filters.marcas.length > 0) {
    const marcaSet = new Set(filters.marcas);
    tag01Nodes = tag01Nodes.map(t01 => {
      if (t01.children.length === 0) return t01;

      const newChildren: VariancePptNode[] = [];
      for (const t02 of t01.children) {
        const f = filterNodeByMarcas(t02, marcaSet);
        if (f) newChildren.push(f);
      }
      // Use reference equality: if every child is the same object, nothing changed
      if (newChildren.every((c, i) => c === t01.children[i])) return t01;

      const real = newChildren.reduce((s, c) => s + c.real, 0);
      const orc  = newChildren.reduce((s, c) => s + c.orcCompare, 0);
      const a1   = newChildren.reduce((s, c) => s + c.a1Compare, 0);
      return {
        ...t01,
        children: newChildren,
        real, orcCompare: orc, a1Compare: a1,
        orcVarPct: computeVarPct(real, orc),
        a1VarPct: computeVarPct(real, a1),
      };
    });
  }

  // 3. Recalculate section totals
  if (tag01Nodes === section.tag01Nodes) return section;

  const real = tag01Nodes.reduce((s, n) => s + n.real, 0);
  const orc  = tag01Nodes.reduce((s, n) => s + n.orcCompare, 0);
  const a1   = tag01Nodes.reduce((s, n) => s + n.a1Compare, 0);
  const node = {
    ...section.node,
    real, orcCompare: orc, a1Compare: a1,
    orcVarPct: computeVarPct(real, orc),
    a1VarPct: computeVarPct(real, a1),
  };
  return { ...section, tag01Nodes, node };
}

// ── Marca entries filter ─────────────────────────────────────────────

/** Filter VariancePptMarcaEntry[] by selected marcas */
export function filterMarcaEntries(
  entries: VariancePptMarcaEntry[],
  filters: SlideViewFilters,
): VariancePptMarcaEntry[] {
  if (!filters.marcas?.length) return entries;
  const set = new Set(filters.marcas);
  return entries.filter(e => set.has(e.marca));
}

// ── Extract available options from data ──────────────────────────────

/** Extract unique marca labels (depth=3 children) from a section */
export function extractSectionMarcas(section: VariancePptSection): string[] {
  const set = new Set<string>();
  for (const t01 of section.tag01Nodes) {
    for (const t02 of t01.children) {
      for (const marca of t02.children) {
        if (marca.label) set.add(marca.label);
      }
    }
  }
  return [...set].sort();
}

/** Extract unique marca labels from a VariancePptNode's tag02 children */
export function extractNodeMarcas(node: VariancePptNode): string[] {
  const set = new Set<string>();
  for (const t02 of node.children) {
    for (const marca of t02.children) {
      if (marca.label) set.add(marca.label);
    }
  }
  return [...set].sort();
}

// ── Proportional section filter (no depth-3 children) ────────────────

/**
 * Filter a section by marca using marcaBreakdowns when depth=3 node children
 * are absent. Scales all node values proportionally based on the selected
 * marcas' share of the section total.
 */
export function filterSectionByMarcaBreakdowns(
  section: VariancePptSection,
  filters: SlideViewFilters,
  breakdowns: VariancePptMarcaEntry[],
): VariancePptSection {
  if (!filters.marcas?.length || breakdowns.length === 0) return section;

  const marcaSet  = new Set(filters.marcas);
  const selected  = breakdowns.filter(e => marcaSet.has(e.marca));
  if (selected.length === 0 || selected.length === breakdowns.length) return section;

  const totReal = breakdowns.reduce((s, e) => s + e.real,   0);
  const totOrc  = breakdowns.reduce((s, e) => s + e.orcado, 0);
  const totA1   = breakdowns.reduce((s, e) => s + e.a1,     0);

  const selReal = selected.reduce((s, e) => s + e.real,   0);
  const selOrc  = selected.reduce((s, e) => s + e.orcado, 0);
  const selA1   = selected.reduce((s, e) => s + e.a1,     0);

  const rReal = totReal !== 0 ? selReal / totReal : 0;
  const rOrc  = totOrc  !== 0 ? selOrc  / totOrc  : 0;
  const rA1   = totA1   !== 0 ? selA1   / totA1   : 0;

  const scaleNode = (node: VariancePptNode): VariancePptNode => {
    const real = node.real        * rReal;
    const orc  = node.orcCompare  * rOrc;
    const a1   = node.a1Compare   * rA1;
    return {
      ...node,
      real, orcCompare: orc, a1Compare: a1,
      orcVarPct: computeVarPct(real, orc),
      a1VarPct:  computeVarPct(real, a1),
      children: node.children.map(scaleNode),
    };
  };

  const tag01Nodes = section.tag01Nodes.map(scaleNode);
  const sReal = tag01Nodes.reduce((s, n) => s + n.real,       0);
  const sOrc  = tag01Nodes.reduce((s, n) => s + n.orcCompare, 0);
  const sA1   = tag01Nodes.reduce((s, n) => s + n.a1Compare,  0);

  return {
    ...section,
    tag01Nodes,
    node: {
      ...section.node,
      real: sReal, orcCompare: sOrc, a1Compare: sA1,
      orcVarPct: computeVarPct(sReal, sOrc),
      a1VarPct:  computeVarPct(sReal, sA1),
    },
  };
}

// ── Full VariancePptData filter (for global slides) ───────────────────

/**
 * Filter an entire VariancePptData by sections (via tag01s) and/or marcas.
 * Used by global slides (Overview, Performance, Analytics, Summary) so a
 * single filtered `data` prop is passed without modifying each component.
 *
 * - tag01s → treated as section (tag0) names to include
 * - marcas  → proportional scaling per section (depth-3 or marcaBreakdowns)
 * - calcRows are zeroed when sections are partially filtered (they become invalid)
 * - calcRows scale proportionally for marca-only filters
 */
export function filterVariancePptData(
  data: VariancePptData,
  filters: SlideViewFilters,
): VariancePptData {
  if (isFiltersEmpty(filters)) return data;

  let sections = data.sections;
  let calcRows = data.calcRows;
  let marcaBreakdowns = data.marcaBreakdowns;

  // 1. Filter sections by tag0 (stored in tag01s by convention for global slides)
  const sectionFiltered = !!(filters.tag01s?.length);
  if (sectionFiltered) {
    const allowed = new Set(filters.tag01s);
    sections = sections.filter(s => allowed.has(s.tag0));
    calcRows = []; // MARGEM/EBITDA invalid when only some sections shown
  }

  // 2. Marca filter
  if (filters.marcas?.length) {
    const marcaSet = new Set(filters.marcas);

    sections = sections.map(s => {
      const breakdowns = (marcaBreakdowns ?? data.marcaBreakdowns)?.[s.tag0] ?? [];
      return extractSectionMarcas(s).length > 0
        ? filterSection(s, { marcas: filters.marcas })
        : filterSectionByMarcaBreakdowns(s, { marcas: filters.marcas }, breakdowns);
    });

    // Recompute calcRows directly from filtered section totals (handles marca filter correctly)
    if (!sectionFiltered && calcRows.length > 0) {
      const findS = (prefix: string) => sections.find(s => s.tag0.startsWith(prefix));
      const s01 = findS('01.'), s02 = findS('02.'), s03 = findS('03.');
      const s04 = findS('04.'), s05 = findS('05.') ?? findS('06.');

      const realM = (s01?.node.real || 0) + (s02?.node.real || 0) + (s03?.node.real || 0);
      const orcM  = (s01?.node.orcCompare || 0) + (s02?.node.orcCompare || 0) + (s03?.node.orcCompare || 0);
      const a1M   = (s01?.node.a1Compare || 0) + (s02?.node.a1Compare || 0) + (s03?.node.a1Compare || 0);

      const realE = realM + (s04?.node.real || 0);
      const orcE  = orcM  + (s04?.node.orcCompare || 0);
      const a1E   = a1M   + (s04?.node.a1Compare || 0);

      const realET = realE + (s05?.node.real || 0);
      const orcET  = orcE  + (s05?.node.orcCompare || 0);
      const a1ET   = a1E   + (s05?.node.a1Compare || 0);

      calcRows = calcRows.map((c): VariancePptCalcRow => {
        if (c.label === 'MARGEM DE CONTRIBUIÇÃO')
          return { ...c, real: realM, orcado: orcM, a1: a1M, deltaOrcPct: computeVarPct(realM, orcM), deltaA1Pct: computeVarPct(realM, a1M) };
        if (c.label === 'EBITDA (S/ RATEIO RAIZ CSC)')
          return { ...c, real: realE, orcado: orcE, a1: a1E, deltaOrcPct: computeVarPct(realE, orcE), deltaA1Pct: computeVarPct(realE, a1E) };
        if (c.label === 'EBITDA TOTAL')
          return { ...c, real: realET, orcado: orcET, a1: a1ET, deltaOrcPct: computeVarPct(realET, orcET), deltaA1Pct: computeVarPct(realET, a1ET) };
        return c;
      });
    }

    // Filter marcaBreakdowns
    if (data.marcaBreakdowns) {
      const filtered: typeof data.marcaBreakdowns = {};
      for (const [key, entries] of Object.entries(data.marcaBreakdowns)) {
        filtered[key] = entries.filter(e => marcaSet.has(e.marca));
      }
      marcaBreakdowns = filtered;
    }
  }

  if (sections === data.sections && calcRows === data.calcRows) return data;
  return { ...data, sections, calcRows, marcaBreakdowns: marcaBreakdowns ?? data.marcaBreakdowns };
}
