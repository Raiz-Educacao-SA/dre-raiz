// ─── Book de Resultados — Data Service ────────────────────────────
// Usa getSomaTags (RPC leve, ~20s timeout) em vez de getDRESummary (timeout frequente)
import { getSomaTags, SomaTagsRow, getDREFilterOptions } from './supabaseService';
import {
  BookDeResultadosData, BookGenerationInput, BookDREGroup, BookDRELineItem,
  BookSectionData, BookFullDREData, BookCalcRow, BookBrandData,
  DRE_SECTIONS, DRESectionConfig, BookKPI,
} from './bookDeResultadosTypes';
import { generateSectionInsights, generatePerformanceAnalysis, computeStatusBadge, computeEbitdaKpis } from './bookDeResultadosInsightsService';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

// ─── Helpers ──────────────────────────────────────────────────────

function calcDelta(real: number, base: number): number { return real - base; }
function calcDeltaPct(real: number, base: number): number {
  if (base === 0) return 0;
  return ((real - base) / Math.abs(base)) * 100;
}

function buildLineItem(tag01: string, real: number, orcado: number, a1: number): BookDRELineItem {
  return {
    tag01, real, orcado, a1,
    deltaOrc: calcDelta(real, orcado),
    deltaA1: calcDelta(real, a1),
    deltaOrcPct: calcDeltaPct(real, orcado),
    deltaA1Pct: calcDeltaPct(real, a1),
  };
}

function buildGroup(tag0: string, items: BookDRELineItem[]): BookDREGroup {
  const totalReal   = items.reduce((s, i) => s + i.real, 0);
  const totalOrcado = items.reduce((s, i) => s + i.orcado, 0);
  const totalA1     = items.reduce((s, i) => s + i.a1, 0);
  return {
    tag0,
    label: tag0.replace(/^\d+\.\s*/, ''),
    items,
    totalReal, totalOrcado, totalA1,
    deltaOrc: calcDelta(totalReal, totalOrcado),
    deltaA1: calcDelta(totalReal, totalA1),
    deltaOrcPct: calcDeltaPct(totalReal, totalOrcado),
    deltaA1Pct: calcDeltaPct(totalReal, totalA1),
  };
}

function buildCalcRow(label: string, groups: BookDREGroup[], prefixes: string[]): BookCalcRow {
  const matching = groups.filter(g => prefixes.some(p => g.tag0.startsWith(p)));
  const real   = matching.reduce((s, g) => s + g.totalReal, 0);
  const orcado = matching.reduce((s, g) => s + g.totalOrcado, 0);
  const a1     = matching.reduce((s, g) => s + g.totalA1, 0);
  return {
    label, real, orcado, a1,
    deltaOrc: calcDelta(real, orcado),
    deltaA1: calcDelta(real, a1),
    deltaOrcPct: calcDeltaPct(real, orcado),
    deltaA1Pct: calcDeltaPct(real, a1),
  };
}

// ─── Aggregation from SomaTagsRow ────────────────────────────────

interface AggEntry {
  real: number;
  orcado: number;
  a1: number;
}

function aggregateSomaTagsRows(rows: SomaTagsRow[]): Map<string, AggEntry> {
  const map = new Map<string, AggEntry>();
  for (const r of rows) {
    const key = `${r.tag0}||${r.tag01}`;
    let e = map.get(key);
    if (!e) { e = { real: 0, orcado: 0, a1: 0 }; map.set(key, e); }
    const v = r.total || 0;
    if (r.scenario === 'Real')   e.real   += v;
    if (r.scenario === 'Orçado') e.orcado += v;
    if (r.scenario === 'A-1')    e.a1     += v;
  }
  return map;
}

function mapToGroups(agg: Map<string, AggEntry>): BookDREGroup[] {
  const tag0Map = new Map<string, BookDRELineItem[]>();
  for (const [key, entry] of agg) {
    const [tag0, tag01] = key.split('||');
    if (!tag0Map.has(tag0)) tag0Map.set(tag0, []);
    tag0Map.get(tag0)!.push(buildLineItem(tag01, entry.real, entry.orcado, entry.a1));
  }

  const groups: BookDREGroup[] = [];
  const sortedTag0s = [...tag0Map.keys()].sort();
  for (const tag0 of sortedTag0s) {
    const items = tag0Map.get(tag0)!.sort((a, b) => a.tag01.localeCompare(b.tag01));
    groups.push(buildGroup(tag0, items));
  }
  return groups;
}

function buildFullDRE(entityName: string, groups: BookDREGroup[]): BookFullDREData {
  const calcRows: BookCalcRow[] = [
    buildCalcRow('MARGEM DE CONTRIBUIÇÃO', groups, ['01.', '02.', '03.']),
    buildCalcRow('EBITDA', groups, ['01.', '02.', '03.', '04.']),
  ];

  const ebitda = calcRows.find(c => c.label === 'EBITDA')!;
  const statusBadge = computeStatusBadge(ebitda.real, ebitda.orcado);
  const performanceAnalysis = generatePerformanceAnalysis(groups, calcRows);
  const ebitdaKpis = computeEbitdaKpis(ebitda);

  return { entityName, groups, calcRows, statusBadge, performanceAnalysis, ebitdaKpis };
}

function buildSectionData(config: DRESectionConfig, consolidatedGroups: BookDREGroup[], brandDataList: BookBrandData[]): BookSectionData {
  const consGroup = consolidatedGroups.find(g => g.tag0.startsWith(config.tag0Prefix));
  const consolidated = consGroup || buildGroup(config.tag0Prefix, []);

  const brands = brandDataList.map(bd => {
    const g = bd.groups.find(g => g.tag0.startsWith(config.tag0Prefix));
    return { marca: bd.marca, group: g || buildGroup(config.tag0Prefix, []) };
  }).filter(b => b.group.items.length > 0 || b.group.totalReal !== 0);

  const kpis = buildSectionKpis(consolidated, config);
  const insights = generateSectionInsights(consolidated, config);

  return { config, consolidated, brands, kpis, insights };
}

function buildSectionKpis(group: BookDREGroup, config: DRESectionConfig): BookKPI[] {
  const yoy = group.deltaA1Pct;
  const aderencia = group.totalOrcado !== 0
    ? (group.totalReal / group.totalOrcado) * 100
    : 0;

  const yoyColor = config.invertDelta
    ? (yoy <= 0 ? '10B981' : 'EF4444')
    : (yoy >= 0 ? '10B981' : 'EF4444');

  const aderColor = Math.abs(aderencia - 100) <= 5 ? '10B981' : 'EF4444';

  return [
    { label: 'CRESCIMENTO YOY', value: `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`, color: yoyColor },
    { label: 'REALIZAÇÃO ORÇ.', value: `${aderencia.toFixed(1)}%`, color: aderColor },
  ];
}

// ─── Main Entry Point ─────────────────────────────────────────────

export async function prepareBookDeResultadosData(input: BookGenerationInput): Promise<BookDeResultadosData> {
  const monthIdx = parseInt(input.month, 10) - 1;
  const monthLabel = `${MONTH_NAMES[monthIdx]} ${input.year}`;
  const monthShort = `${MONTH_SHORT[monthIdx]}/${input.year.slice(2)}`;
  const yearMonth = `${input.year}-${input.month.padStart(2, '0')}`;

  // 1. Buscar dados consolidados + lista de marcas em paralelo
  const [consolidatedRows, filterOpts] = await Promise.all([
    getSomaTags(yearMonth, yearMonth, input.marcas?.length ? input.marcas : undefined,
      undefined, undefined, undefined, input.recurring ?? undefined),
    getDREFilterOptions({ monthFrom: yearMonth, monthTo: yearMonth }),
  ]);

  if (!consolidatedRows.length) {
    throw new Error(`Nenhum dado encontrado para ${monthLabel}. Verifique os filtros.`);
  }

  // 2. Determinar marcas disponíveis
  const availableBrands = (filterOpts.marcas || []).sort();
  // Se o input filtra marcas, usar apenas essas
  const targetBrands = input.marcas?.length
    ? availableBrands.filter(m => input.marcas!.includes(m))
    : availableBrands;

  // 3. Consolidado: agregar
  const consAgg = aggregateSomaTagsRows(consolidatedRows);
  const consolidatedGroups = mapToGroups(consAgg);

  // 4. Por marca: buscar em paralelo (getSomaTags com filtro de marca)
  const brandResults = await Promise.all(
    targetBrands.map(async (marca) => {
      const rows = await getSomaTags(yearMonth, yearMonth, [marca],
        undefined, undefined, undefined, input.recurring ?? undefined);
      return { marca, rows };
    })
  );

  const brandDataList: BookBrandData[] = brandResults
    .filter(br => br.rows.length > 0)
    .map(br => {
      const agg = aggregateSomaTagsRows(br.rows);
      const groups = mapToGroups(agg);
      return { marca: br.marca, groups };
    });

  // 5. Build sections (receitas, custos_var, custos_fix, sga)
  const sections = DRE_SECTIONS.map(config => buildSectionData(config, consolidatedGroups, brandDataList));

  // 6. Build full DREs
  const cscDRE = buildFullDRE('CSC', consolidatedGroups);
  const consolidatedDRE = buildFullDRE('CONSOLIDADO', consolidatedGroups);
  const brandDREs = brandDataList.map(bd => buildFullDRE(bd.marca, bd.groups));

  return {
    monthLabel,
    monthShort,
    year: input.year,
    sections,
    cscDRE,
    consolidatedDRE,
    brandDREs,
    allBrands: targetBrands,
  };
}
