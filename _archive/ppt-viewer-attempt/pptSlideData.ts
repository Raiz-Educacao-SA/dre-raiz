/**
 * pptSlideData.ts
 * Camada de dados para o visualizador de slides na tela.
 * Faz o fetch e agrega os dados; retorna PptSlideData[] sem depender de pptxgenjs.
 */
import { getSomaTags, getVarianceJustifications, SomaTagsRow, VarianceJustification } from './supabaseService';

// ─── Parâmetros ───────────────────────────────────────────────────────────────
export interface PptSlideParams {
  yearMonth: string;
  marcas?: string[];
  recurring?: string;
  withJustificativas?: boolean;
  withDeepDive?: boolean;
  onProgress?: (msg: string, pct: number) => void;
}

// ─── Cores exportadas ─────────────────────────────────────────────────────────
export const SC = {
  navy:      '#0F1C2E',
  navyLight: '#1A2E45',
  blue:      '#1A6DB5',
  green:     '#10B981',
  red:       '#EF4444',
  amber:     '#F59E0B',
  gray:      '#6B7280',
  grayLight: '#F3F4F6',
  white:     '#FFFFFF',
  receita:   '#1A6DB5',
  custos:    '#EF4444',
  sga:       '#8B5CF6',
  rateio:    '#0E7C7B',
  ebitda:    '#10B981',
} as const;

// ─── Seções DRE ───────────────────────────────────────────────────────────────
export const DRE_SECTIONS = [
  { prefix: '01.', label: 'RECEITA LÍQUIDA',  color: SC.receita, invertDelta: false },
  { prefix: '02.', label: 'CUSTOS VARIÁVEIS', color: SC.custos,  invertDelta: true  },
  { prefix: '03.', label: 'CUSTOS FIXOS',      color: SC.custos,  invertDelta: true  },
  { prefix: '04.', label: 'DESPESAS SG&A',     color: SC.sga,     invertDelta: true  },
  { prefix: '06.', label: 'RATEIO RAIZ',       color: SC.rateio,  invertDelta: true  },
] as const;

export type DreSectionDef = typeof DRE_SECTIONS[number];

// ─── Tipos de agregação ───────────────────────────────────────────────────────
export interface Tag01Agg {
  tag01: string;
  real: number;
  orcado: number;
  a1: number;
}

export interface SectionAgg {
  real: number;
  orcado: number;
  a1: number;
  tag01Items: Tag01Agg[];
}

// ─── Helpers exportados ───────────────────────────────────────────────────────
export function aggregateSection(rows: SomaTagsRow[], prefix: string): SectionAgg {
  const sectionRows = rows.filter(r => r.tag0.startsWith(prefix));
  const tag01s = [...new Set(sectionRows.map(r => r.tag01))].sort();
  const getVal = (tag01: string | null, scenario: string) =>
    sectionRows
      .filter(r => (tag01 === null || r.tag01 === tag01) && r.scenario === scenario)
      .reduce((s, r) => s + (r.total || 0), 0);
  return {
    real:   getVal(null, 'Real'),
    orcado: getVal(null, 'Orçado'),
    a1:     getVal(null, 'A-1'),
    tag01Items: tag01s.map(t => ({
      tag01: t,
      real:   getVal(t, 'Real'),
      orcado: getVal(t, 'Orçado'),
      a1:     getVal(t, 'A-1'),
    })),
  };
}

export function pctDiff(real: number, compare: number): number {
  if (!compare) return 0;
  return ((real - compare) / Math.abs(compare)) * 100;
}

export function fmtBRL(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$\u00a0${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `R$\u00a0${Math.round(v / 1000).toLocaleString('pt-BR')}k`;
  return `R$\u00a0${v.toFixed(0)}`;
}

export function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${months[parseInt(m, 10) - 1]}/${y}`;
}

export function deltaSign(delta: number, invertDelta: boolean): 'pos' | 'neg' | 'neutral' {
  if (delta === 0) return 'neutral';
  const good = invertDelta ? delta < 0 : delta > 0;
  return good ? 'pos' : 'neg';
}

export function semaforo(real: number, orcado: number, invertDelta: boolean): '🟢' | '🟡' | '🔴' | '⚪' {
  if (!orcado) return '⚪';
  const p = pctDiff(real, orcado);
  const bad  = invertDelta ? p > 15  : p < -15;
  const warn = invertDelta ? (p > 5 && p <= 15) : (p < -5 && p >= -15);
  if (bad)  return '🔴';
  if (warn) return '🟡';
  return '🟢';
}

// ─── Tipos de slide ───────────────────────────────────────────────────────────

export interface CoverSlide {
  type: 'cover';
  yearMonth: string;
  monthLabelStr: string;
  marcas: string[];
}

export interface MensagemExecutivaSlide {
  type: 'mensagem_executiva';
  monthLabelStr: string;
  receita: number; receitaOrc: number;
  ebitda: number;  ebitdaOrc: number;
  ebitdaTotal: number;
  margemPct: number;
  topDesvio: { label: string; dp: number } | null;
  scr: { situacao: string; complicacao: string; resolucao: string };
}

export interface PortfolioSemaforoSlide {
  type: 'portfolio_semaforo';
  monthLabelStr: string;
  marcaStats: Array<{
    marca: string;
    ebitdaReal: number; ebitdaOrc: number;
    receitaReal: number;
    margemPct: number;
    deltaOrcPct: number;
    sem: '🟢' | '🟡' | '🔴' | '⚪';
  }>;
}

export interface SectionDividerSlide {
  type: 'section_divider';
  title: string;
  subtitle: string;
  color: string;
}

export interface DreTableRow {
  kind: 'section' | 'tag01' | 'calc';
  label: string;
  color?: string;
  real: number; orcado: number; a1: number;
  dOrcPct: number; dA1Pct: number;
  invertDelta: boolean;
}

export interface DreTableSlide {
  type: 'dre_table';
  title: string;
  subtitle: string;
  rows: DreTableRow[];
}

export interface EbitdaBridgeSlide {
  type: 'ebitda_bridge';
  bridges: Array<{ label: string; val: number; isDelta: boolean; invertDelta: boolean }>;
  ebitdaOrc: number;
  ebitdaReal: number;
}

export interface DesvioItem {
  tag0: string; tag01: string;
  real: number; orcado: number;
  deltaPct: number; invertDelta: boolean;
}

export interface TopDesviosSlide {
  type: 'top_desvios';
  title: string;
  items: DesvioItem[];
}

export interface SectionOverviewSlide {
  type: 'section_overview';
  secLabel: string; secColor: string; invertDelta: boolean;
  real: number; orcado: number; a1: number;
  dOrcPct: number; dA1Pct: number;
  justCount: number;
  bluf: string; blufGood: boolean;
  top5: Array<{ tag01: string; real: number; orcado: number }>;
}

export interface Tag01DetailSlide {
  type: 'tag01_detail';
  secLabel: string; secColor: string; invertDelta: boolean;
  items: Array<{
    tag01: string;
    real: number; orcado: number; a1: number;
    dOrc: number; dOrcPct: number;
    dA1: number;  dA1Pct: number;
  }>;
}

export interface JustificativasSlide {
  type: 'justificativas';
  secLabel: string; secColor: string;
  justs: VarianceJustification[];
}

export interface EbitdaConsolidadoSlide {
  type: 'ebitda_consolidado';
  mc: number; mcOrc: number; mcA1: number;
  ebitda: number; ebitdaOrc: number; ebitdaA1: number;
  ebitdaTotal: number; ebitdaTotalOrc: number; ebitdaTotalA1: number;
  margemMC: number; margemEbitda: number;
  receita: number;
}

export interface EbitdaPorMarcaSlide {
  type: 'ebitda_por_marca';
  marcaData: Array<{ marca: string; ebitdaReal: number; ebitdaOrc: number; margemPct: number }>;
}

export interface AlertasSlide {
  type: 'alertas';
  alerts: Array<{ sec: string; tag01: string; real: number; orc: number; deltaPct: number }>;
}

export interface DecisoesSlide {
  type: 'decisoes';
  items: Array<{ tag01: string; deltaPct: number }>;
}

export interface MarcaDeepDiveSlide {
  type: 'marca_deep_dive';
  marca: string;
  monthLabelStr: string;
  secoes: Array<{ label: string; color: string; real: number; orcado: number; dOrcPct: number; invertDelta: boolean }>;
  topDesvios: DesvioItem[];
}

export interface EncerramentoSlide {
  type: 'encerramento';
  monthLabelStr: string;
}

export type PptSlideData =
  | CoverSlide
  | MensagemExecutivaSlide
  | PortfolioSemaforoSlide
  | SectionDividerSlide
  | DreTableSlide
  | EbitdaBridgeSlide
  | TopDesviosSlide
  | SectionOverviewSlide
  | Tag01DetailSlide
  | JustificativasSlide
  | EbitdaConsolidadoSlide
  | EbitdaPorMarcaSlide
  | AlertasSlide
  | DecisoesSlide
  | MarcaDeepDiveSlide
  | EncerramentoSlide;

// ─── Builders por tipo ────────────────────────────────────────────────────────

function buildDreTableSlide(rows: SomaTagsRow[], title: string, subtitle: string): DreTableSlide {
  const tableRows: DreTableRow[] = [];

  for (const sec of DRE_SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    tableRows.push({
      kind: 'section', label: sec.label, color: sec.color,
      real: agg.real, orcado: agg.orcado, a1: agg.a1,
      dOrcPct: pctDiff(agg.real, agg.orcado),
      dA1Pct:  pctDiff(agg.real, agg.a1),
      invertDelta: sec.invertDelta,
    });
    for (const item of agg.tag01Items) {
      tableRows.push({
        kind: 'tag01', label: item.tag01,
        real: item.real, orcado: item.orcado, a1: item.a1,
        dOrcPct: pctDiff(item.real, item.orcado),
        dA1Pct:  pctDiff(item.real, item.a1),
        invertDelta: sec.invertDelta,
      });
    }
  }

  // Calc rows
  const s01 = aggregateSection(rows, '01.'); const s02 = aggregateSection(rows, '02.');
  const s03 = aggregateSection(rows, '03.'); const s04 = aggregateSection(rows, '04.');
  const s06 = aggregateSection(rows, '06.');
  const mcR  = s01.real + s02.real,   mcO  = s01.orcado + s02.orcado, mcA  = s01.a1 + s02.a1;
  const ebR  = mcR + s03.real + s04.real,  ebO  = mcO + s03.orcado + s04.orcado, ebA  = mcA + s03.a1 + s04.a1;
  const ebtR = ebR + s06.real, ebtO = ebO + s06.orcado, ebtA = ebA + s06.a1;

  const calcRow = (label: string, r: number, o: number, a: number, color: string): DreTableRow => ({
    kind: 'calc', label, color,
    real: r, orcado: o, a1: a,
    dOrcPct: pctDiff(r, o), dA1Pct: pctDiff(r, a),
    invertDelta: false,
  });

  tableRows.push(calcRow('MARGEM DE CONTRIBUIÇÃO', mcR, mcO, mcA, '#1D4ED8'));
  tableRows.push(calcRow('EBITDA', ebR, ebO, ebA, SC.ebitda));
  tableRows.push(calcRow('EBITDA TOTAL (c/ Rateio)', ebtR, ebtO, ebtA, '#065F46'));

  return { type: 'dre_table', title, subtitle, rows: tableRows };
}

function buildTopDesvios(rows: SomaTagsRow[], title: string): TopDesviosSlide {
  const items: DesvioItem[] = [];
  for (const sec of DRE_SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      items.push({ tag0: sec.label, tag01: item.tag01, real: item.real, orcado: item.orcado,
        deltaPct: pctDiff(item.real, item.orcado), invertDelta: sec.invertDelta });
    }
  }
  items.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return { type: 'top_desvios', title, items: items.slice(0, 15) };
}

function buildEbitdaBridge(rows: SomaTagsRow[]): EbitdaBridgeSlide {
  const s01 = aggregateSection(rows, '01.'); const s02 = aggregateSection(rows, '02.');
  const s03 = aggregateSection(rows, '03.'); const s04 = aggregateSection(rows, '04.');
  const ebOrc  = s01.orcado + s02.orcado + s03.orcado + s04.orcado;
  const ebReal = s01.real   + s02.real   + s03.real   + s04.real;
  return {
    type: 'ebitda_bridge',
    ebitdaOrc: ebOrc, ebitdaReal: ebReal,
    bridges: [
      { label: 'EBITDA Orçado', val: ebOrc,                          isDelta: false, invertDelta: false },
      { label: 'Δ Receita',      val: s01.real - s01.orcado,           isDelta: true,  invertDelta: false },
      { label: 'Δ Custos Var.',  val: s02.real - s02.orcado,           isDelta: true,  invertDelta: true  },
      { label: 'Δ Custos Fixos', val: s03.real - s03.orcado,           isDelta: true,  invertDelta: true  },
      { label: 'Δ SG&A',         val: s04.real - s04.orcado,           isDelta: true,  invertDelta: true  },
      { label: 'EBITDA Real',    val: ebReal,                          isDelta: false, invertDelta: false },
    ],
  };
}

function buildSectionOverview(sec: DreSectionDef, agg: SectionAgg, justCount: number): SectionOverviewSlide {
  const dOrcPct = pctDiff(agg.real, agg.orcado);
  const dA1Pct  = pctDiff(agg.real, agg.a1);
  const good = sec.invertDelta ? dOrcPct < 0 : dOrcPct > 0;
  const bluf = good
    ? `✅ FAVORÁVEL: ${sec.label} ${fmtPct(Math.abs(dOrcPct))} abaixo do orçado — economia de ${fmtBRL(Math.abs(agg.real - agg.orcado))}.`
    : `⚠️ ATENÇÃO: ${sec.label} ${fmtPct(Math.abs(dOrcPct))} acima do orçado — excedente de ${fmtBRL(Math.abs(agg.real - agg.orcado))}.`;
  const top5 = [...agg.tag01Items]
    .sort((a, b) => Math.abs(b.real - b.orcado) - Math.abs(a.real - a.orcado))
    .slice(0, 5);
  return {
    type: 'section_overview',
    secLabel: sec.label, secColor: sec.color, invertDelta: sec.invertDelta,
    real: agg.real, orcado: agg.orcado, a1: agg.a1,
    dOrcPct, dA1Pct, justCount, bluf, blufGood: good, top5,
  };
}

function buildTag01Detail(sec: DreSectionDef, agg: SectionAgg): Tag01DetailSlide {
  return {
    type: 'tag01_detail',
    secLabel: sec.label, secColor: sec.color, invertDelta: sec.invertDelta,
    items: agg.tag01Items.map(item => ({
      tag01: item.tag01,
      real: item.real, orcado: item.orcado, a1: item.a1,
      dOrc: item.real - item.orcado, dOrcPct: pctDiff(item.real, item.orcado),
      dA1:  item.real - item.a1,     dA1Pct:  pctDiff(item.real, item.a1),
    })),
  };
}

function buildMensagemExecutiva(rows: SomaTagsRow[], monthLabelStr: string): MensagemExecutivaSlide {
  const s01 = aggregateSection(rows, '01.'); const s02 = aggregateSection(rows, '02.');
  const s03 = aggregateSection(rows, '03.'); const s04 = aggregateSection(rows, '04.');
  const s06 = aggregateSection(rows, '06.');
  const mc     = s01.real + s02.real;
  const ebitda = mc + s03.real + s04.real;
  const ebitdaOrc = s01.orcado + s02.orcado + s03.orcado + s04.orcado;
  const ebitdaTotal = ebitda + s06.real;
  const margemPct = s01.real > 0 ? (ebitda / s01.real) * 100 : 0;
  const ebitdaDelta = pctDiff(ebitda, ebitdaOrc);

  const topDev = DRE_SECTIONS.flatMap(sec => {
    const agg = aggregateSection(rows, sec.prefix);
    return agg.tag01Items.map(t => ({ label: t.tag01, dp: pctDiff(t.real, t.orcado), inv: sec.invertDelta }));
  }).sort((a, b) => {
    const badA = a.inv ? (a.dp > 0 ? a.dp : 0) : (a.dp < 0 ? -a.dp : 0);
    const badB = b.inv ? (b.dp > 0 ? b.dp : 0) : (b.dp < 0 ? -b.dp : 0);
    return badB - badA;
  })[0] ?? null;

  return {
    type: 'mensagem_executiva',
    monthLabelStr,
    receita: s01.real, receitaOrc: s01.orcado,
    ebitda, ebitdaOrc, ebitdaTotal, margemPct,
    topDesvio: topDev ? { label: topDev.label, dp: topDev.dp } : null,
    scr: {
      situacao: `Em ${monthLabelStr}, Raiz Educação registrou Receita de ${fmtBRL(s01.real)} (${fmtPct(pctDiff(s01.real, s01.orcado))} vs Orçado). EBITDA de ${fmtBRL(ebitda)}, margem ${margemPct.toFixed(1)}%.`,
      complicacao: ebitdaDelta < -5
        ? `EBITDA com desvio de ${fmtPct(ebitdaDelta)} vs Orçado (${fmtBRL(ebitda - ebitdaOrc)}). ${topDev ? `Principal pressão: ${topDev.label} (${fmtPct(topDev.dp)}).` : ''} Requer atenção.`
        : `Performance geral dentro do esperado. EBITDA desvio de ${fmtPct(ebitdaDelta)} vs Orçado. ${topDev ? `Ponto de atenção: ${topDev.label} (${fmtPct(topDev.dp)}).` : ''}`,
      resolucao: 'Plano de ação focado nos desvios identificados. Acompanhamento semanal dos itens críticos. Justificativas das áreas registradas na plataforma.',
    },
  };
}

function buildEbitdaConsolidado(rows: SomaTagsRow[]): EbitdaConsolidadoSlide {
  const s01 = aggregateSection(rows, '01.'); const s02 = aggregateSection(rows, '02.');
  const s03 = aggregateSection(rows, '03.'); const s04 = aggregateSection(rows, '04.');
  const s06 = aggregateSection(rows, '06.');
  const mcR = s01.real + s02.real, mcO = s01.orcado + s02.orcado, mcA = s01.a1 + s02.a1;
  const ebR = mcR + s03.real + s04.real, ebO = mcO + s03.orcado + s04.orcado, ebA = mcA + s03.a1 + s04.a1;
  return {
    type: 'ebitda_consolidado',
    receita: s01.real,
    mc: mcR, mcOrc: mcO, mcA1: mcA,
    ebitda: ebR, ebitdaOrc: ebO, ebitdaA1: ebA,
    ebitdaTotal: ebR + s06.real, ebitdaTotalOrc: ebO + s06.orcado, ebitdaTotalA1: ebA + s06.a1,
    margemMC: s01.real > 0 ? (mcR / s01.real) * 100 : 0,
    margemEbitda: s01.real > 0 ? (ebR / s01.real) * 100 : 0,
  };
}

function buildAlertas(rows: SomaTagsRow[]): AlertasSlide {
  const alerts: AlertasSlide['alerts'] = [];
  for (const sec of DRE_SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      const dp = pctDiff(item.real, item.orcado);
      const isBad = sec.invertDelta ? dp > 15 : dp < -15;
      if (isBad) alerts.push({ sec: sec.label, tag01: item.tag01, real: item.real, orc: item.orcado, deltaPct: dp });
    }
  }
  alerts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return { type: 'alertas', alerts: alerts.slice(0, 15) };
}

function buildDecisoes(rows: SomaTagsRow[]): DecisoesSlide {
  const items: DecisoesSlide['items'] = [];
  for (const sec of DRE_SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      const dp = pctDiff(item.real, item.orcado);
      const isBad = sec.invertDelta ? dp > 10 : dp < -10;
      if (isBad) items.push({ tag01: item.tag01, deltaPct: dp });
    }
  }
  items.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return { type: 'decisoes', items: items.slice(0, 8) };
}

// ─── Função principal ─────────────────────────────────────────────────────────
export async function buildPptSlideData(params: PptSlideParams): Promise<PptSlideData[]> {
  const {
    yearMonth, marcas = [], recurring,
    withJustificativas = true, withDeepDive = false,
    onProgress,
  } = params;

  const prog = (msg: string, pct: number) => onProgress?.(msg, pct);
  const ml = monthLabel(yearMonth);
  const slides: PptSlideData[] = [];

  // Fetch consolidado
  prog('Buscando dados da DRE Consolidada...', 5);
  const marcaFilter = marcas.length > 0 ? marcas : undefined;
  const rows = await getSomaTags(yearMonth, yearMonth, marcaFilter, undefined, undefined, undefined, recurring);

  // Fetch justificativas
  prog('Buscando justificativas...', 15);
  let justs: VarianceJustification[] = [];
  if (withJustificativas) {
    try { justs = await getVarianceJustifications({ year_month: yearMonth }); }
    catch { justs = []; }
  }

  // ── ACT 1 — Abertura ──────────────────────────────────────────────────────
  prog('ACT 1 — Abertura...', 20);
  slides.push({ type: 'cover', yearMonth, monthLabelStr: ml, marcas });
  slides.push(buildMensagemExecutiva(rows, ml));

  // Portfolio semáforo (só se houver marcas)
  prog('Buscando semáforo por marca...', 25);
  if (marcas.length > 0) {
    const marcaStats: PortfolioSemaforoSlide['marcaStats'] = [];
    for (const m of marcas) {
      const mRows = await getSomaTags(yearMonth, yearMonth, [m]);
      const r01 = aggregateSection(mRows, '01.'); const r02 = aggregateSection(mRows, '02.');
      const r03 = aggregateSection(mRows, '03.'); const r04 = aggregateSection(mRows, '04.');
      const eR = r01.real + r02.real + r03.real + r04.real;
      const eO = r01.orcado + r02.orcado + r03.orcado + r04.orcado;
      const margem = r01.real > 0 ? (eR / r01.real) * 100 : 0;
      marcaStats.push({ marca: m, ebitdaReal: eR, ebitdaOrc: eO, receitaReal: r01.real,
        margemPct: margem, deltaOrcPct: pctDiff(eR, eO), sem: semaforo(eR, eO, true) });
    }
    marcaStats.sort((a, b) => b.margemPct - a.margemPct);
    slides.push({ type: 'portfolio_semaforo', monthLabelStr: ml, marcaStats });
  }

  // ── ACT 2 — DRE Consolidada ───────────────────────────────────────────────
  prog('ACT 2 — DRE Consolidada...', 30);
  slides.push({ type: 'section_divider', title: 'DRE CONSOLIDADA',
    subtitle: 'Visão completa — Real vs Orçado vs A-1', color: SC.blue });
  slides.push(buildDreTableSlide(rows, 'DRE Gerencial Consolidada',
    `${ml} — Real | Orçado | A-1`));
  slides.push(buildEbitdaBridge(rows));
  slides.push(buildTopDesvios(rows, 'Top Desvios — Consolidado'));

  // ── ACT 3 — Por Seção ─────────────────────────────────────────────────────
  prog('ACT 3 — Análise por Seção...', 40);
  for (const sec of DRE_SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    const secJusts = justs.filter(j => j.tag0.startsWith(sec.prefix));
    slides.push({ type: 'section_divider', title: sec.label,
      subtitle: `Análise detalhada — ${ml}`, color: sec.color });
    slides.push(buildSectionOverview(sec, agg, secJusts.length));
    slides.push(buildTag01Detail(sec, agg));
    if (withJustificativas && secJusts.length > 0) {
      slides.push({ type: 'justificativas', secLabel: sec.label, secColor: sec.color, justs: secJusts });
    }
    prog(`Seção ${sec.label}...`, 40 + DRE_SECTIONS.indexOf(sec) * 5);
  }

  // ── ACT 4 — MC & EBITDA ───────────────────────────────────────────────────
  prog('ACT 4 — MC & EBITDA...', 65);
  slides.push({ type: 'section_divider', title: 'MARGEM & EBITDA',
    subtitle: 'Análise de rentabilidade e margens', color: SC.ebitda });
  slides.push(buildEbitdaConsolidado(rows));

  // EBITDA por marca
  if (marcas.length > 0) {
    const marcaData: EbitdaPorMarcaSlide['marcaData'] = [];
    for (const m of marcas) {
      const mRows = await getSomaTags(yearMonth, yearMonth, [m]);
      const r01 = aggregateSection(mRows, '01.'); const r02 = aggregateSection(mRows, '02.');
      const r03 = aggregateSection(mRows, '03.'); const r04 = aggregateSection(mRows, '04.');
      const eR = r01.real + r02.real + r03.real + r04.real;
      const eO = r01.orcado + r02.orcado + r03.orcado + r04.orcado;
      marcaData.push({ marca: m, ebitdaReal: eR, ebitdaOrc: eO, margemPct: r01.real > 0 ? (eR / r01.real) * 100 : 0 });
    }
    marcaData.sort((a, b) => b.margemPct - a.margemPct);
    slides.push({ type: 'ebitda_por_marca', marcaData });
  }

  // ── ACT 5 — Deep Dive por Marca ───────────────────────────────────────────
  if (withDeepDive && marcas.length > 0) {
    prog('ACT 5 — Deep Dive por Marca...', 75);
    slides.push({ type: 'section_divider', title: 'DEEP DIVE POR MARCA',
      subtitle: 'Performance individual por marca', color: SC.sga });
    for (const m of marcas) {
      prog(`  → ${m}...`, 75 + (marcas.indexOf(m) / marcas.length) * 12);
      const mRows = await getSomaTags(yearMonth, yearMonth, [m]);
      const secoes = DRE_SECTIONS.map(sec => {
        const agg = aggregateSection(mRows, sec.prefix);
        return { label: sec.label, color: sec.color, invertDelta: sec.invertDelta,
          real: agg.real, orcado: agg.orcado, dOrcPct: pctDiff(agg.real, agg.orcado) };
      });
      const mDesvios: DesvioItem[] = [];
      for (const sec of DRE_SECTIONS) {
        const agg = aggregateSection(mRows, sec.prefix);
        for (const item of agg.tag01Items) {
          if (!item.orcado) continue;
          mDesvios.push({ tag0: sec.label, tag01: item.tag01, real: item.real, orcado: item.orcado,
            deltaPct: pctDiff(item.real, item.orcado), invertDelta: sec.invertDelta });
        }
      }
      mDesvios.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
      slides.push({ type: 'marca_deep_dive', marca: m, monthLabelStr: ml, secoes, topDesvios: mDesvios.slice(0, 8) });
    }
  }

  // ── ACT 6 — Encerramento ──────────────────────────────────────────────────
  prog('ACT 6 — Encerramento...', 90);
  slides.push({ type: 'section_divider', title: 'ENCERRAMENTO',
    subtitle: 'Alertas, decisões e próximos passos', color: SC.navy });
  slides.push(buildAlertas(rows));
  slides.push(buildDecisoes(rows));
  slides.push({ type: 'encerramento', monthLabelStr: ml });

  prog(`✅ ${slides.length} slides prontos`, 100);
  return slides;
}
