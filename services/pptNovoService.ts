/**
 * pptNovoService.ts
 * Geração de PPT Executivo — DRE Raiz
 * ~70 slides com storytelling SCR + Pirâmide McKinsey
 */

import PptxGenJS from 'pptxgenjs';
import { getSomaTags, getVarianceJustifications, SomaTagsRow, VarianceJustification } from './supabaseService';

// ─── Parâmetros públicos ───────────────────────────────────────────────────────
export interface PptNovoParams {
  yearMonth: string;           // 'YYYY-MM'
  marcas?: string[];           // [] = all brands (consolidado)
  filiais?: string[];
  recurring?: string;
  withJustificativas?: boolean;
  withDeepDive?: boolean;      // per-brand deep dives (~+20 slides)
  onProgress?: (msg: string, pct: number) => void;
}

// ─── Cores & constantes ────────────────────────────────────────────────────────
const C = {
  navy:      '0F1C2E',
  navyLight: '1A2E45',
  blue:      '1A6DB5',
  green:     '10B981',
  red:       'EF4444',
  amber:     'F59E0B',
  gray:      '6B7280',
  grayLight: 'F3F4F6',
  white:     'FFFFFF',
  black:     '111827',
  receita:   '1A6DB5',
  custos:    'EF4444',
  sga:       '8B5CF6',
  rateio:    '0E7C7B',
  ebitda:    '10B981',
} as const;

const SECTIONS = [
  { prefix: '01.', label: 'RECEITA LÍQUIDA',    color: C.receita, invertDelta: false },
  { prefix: '02.', label: 'CUSTOS VARIÁVEIS',   color: C.custos,  invertDelta: true  },
  { prefix: '03.', label: 'CUSTOS FIXOS',        color: C.custos,  invertDelta: true  },
  { prefix: '04.', label: 'DESPESAS SG&A',       color: C.sga,     invertDelta: true  },
  { prefix: '06.', label: 'RATEIO RAIZ',         color: C.rateio,  invertDelta: true  },
] as const;

const W = 13.33;
const H = 7.5;

// ─── Utilitários ───────────────────────────────────────────────────────────────
const fmtK = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

const deltaColor = (delta: number, invertDelta: boolean): string => {
  if (invertDelta) return delta <= 0 ? C.green : C.red;
  return delta >= 0 ? C.green : C.red;
};

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
};

// ─── Aggregators ──────────────────────────────────────────────────────────────
interface SectionAgg {
  real: number;
  orcado: number;
  a1: number;
  tag01Items: Tag01Agg[];
}

interface Tag01Agg {
  tag01: string;
  real: number;
  orcado: number;
  a1: number;
}

function aggregateSection(rows: SomaTagsRow[], prefix: string): SectionAgg {
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

function pct(real: number, compare: number): number {
  if (!compare) return 0;
  return ((real - compare) / Math.abs(compare)) * 100;
}

// ─── Slide helpers ────────────────────────────────────────────────────────────
function addBg(slide: PptxGenJS.Slide, color: string) {
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: W, h: H,
    fill: { color },
    line: { color, width: 0 },
  });
}

function addRect(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  color: string, options?: Partial<PptxGenJS.ShapeProps>
) {
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x, y, w, h,
    fill: { color },
    line: { color, width: 0 },
    ...options,
  });
}

function addTitle(slide: PptxGenJS.Slide, text: string, opts?: Partial<PptxGenJS.TextPropsOptions>) {
  slide.addText(text, {
    x: 0.4, y: 0.15, w: W - 0.8, h: 0.5,
    fontSize: 18, bold: true, color: C.navy,
    ...opts,
  });
}

function addSubtitle(slide: PptxGenJS.Slide, text: string, y = 0.65) {
  slide.addText(text, {
    x: 0.4, y, w: W - 0.8, h: 0.3,
    fontSize: 10, color: C.gray, italic: true,
  });
}

function addKpiCard(
  slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  label: string, value: string, delta?: string, deltaGood?: boolean
) {
  addRect(slide, x, y, w, h, C.grayLight);
  slide.addText(label, { x, y: y + 0.08, w, h: 0.2, fontSize: 7, color: C.gray, align: 'center' });
  slide.addText(value, { x, y: y + 0.25, w, h: 0.35, fontSize: 13, bold: true, color: C.navy, align: 'center' });
  if (delta) {
    const dc = deltaGood ? C.green : C.red;
    slide.addText(delta, { x, y: y + 0.58, w, h: 0.2, fontSize: 8, bold: true, color: dc, align: 'center' });
  }
}

function semaforo(real: number, orcado: number, invertDelta: boolean): string {
  if (!orcado) return '⚪';
  const p = pct(real, orcado);
  const bad = invertDelta ? p > 15 : p < -15;
  const warn = invertDelta ? (p > 5 && p <= 15) : (p < -5 && p >= -15);
  if (bad) return '🔴';
  if (warn) return '🟡';
  return '🟢';
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function addSectionDivider(pptx: PptxGenJS, title: string, subtitle: string, accentColor: string) {
  const slide = pptx.addSlide();
  addBg(slide, C.navy);
  addRect(slide, 0, 0, 0.12, H, accentColor);
  addRect(slide, 0.12, 3.0, W - 0.12, 0.06, accentColor);
  slide.addText(title, {
    x: 0.5, y: 2.5, w: W - 1, h: 0.9,
    fontSize: 36, bold: true, color: C.white,
  });
  slide.addText(subtitle, {
    x: 0.5, y: 3.2, w: W - 1, h: 0.4,
    fontSize: 14, color: accentColor, italic: true,
  });
}

// ─── DRE Table slide ──────────────────────────────────────────────────────────
function buildDreTableRows(rows: SomaTagsRow[]): PptxGenJS.TableRow[] {
  const header: PptxGenJS.TableRow = [
    { text: 'DESCRIÇÃO',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7 } },
    { text: 'REAL',         options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'ORÇADO',       options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ% Orc',       options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'A-1',          options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ% A-1',       options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
  ];

  const dataRows: PptxGenJS.TableRow[] = [];

  for (const sec of SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    const dOrc = pct(agg.real, agg.orcado);
    const dA1  = pct(agg.real, agg.a1);
    const dcOrc = deltaColor(dOrc, sec.invertDelta);
    const dcA1  = deltaColor(dA1,  sec.invertDelta);

    // Section header row
    dataRows.push([
      { text: sec.label, options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7 } },
      { text: fmtK(agg.real),   options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
      { text: fmtK(agg.orcado), options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
      { text: fmtPct(dOrc),     options: { bold: true, fill: { color: sec.color }, color: dcOrc === C.green ? '00FF88' : 'FFB3B3', fontSize: 7, align: 'right' } },
      { text: fmtK(agg.a1),     options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
      { text: fmtPct(dA1),      options: { bold: true, fill: { color: sec.color }, color: dcOrc === C.green ? '00FF88' : 'FFB3B3', fontSize: 7, align: 'right' } },
    ]);

    for (const item of agg.tag01Items) {
      const iOrc = pct(item.real, item.orcado);
      const iA1  = pct(item.real, item.a1);
      const icOrc = deltaColor(iOrc, sec.invertDelta);
      const icA1  = deltaColor(iA1,  sec.invertDelta);
      const bg = C.white;
      dataRows.push([
        { text: `  ${item.tag01}`, options: { fill: { color: bg }, color: C.black, fontSize: 6.5 } },
        { text: fmtK(item.real),   options: { fill: { color: bg }, color: C.black, fontSize: 6.5, align: 'right' } },
        { text: fmtK(item.orcado), options: { fill: { color: bg }, color: C.black, fontSize: 6.5, align: 'right' } },
        { text: fmtPct(iOrc),      options: { fill: { color: bg }, color: icOrc,   fontSize: 6.5, align: 'right', bold: true } },
        { text: fmtK(item.a1),     options: { fill: { color: bg }, color: C.black, fontSize: 6.5, align: 'right' } },
        { text: fmtPct(iA1),       options: { fill: { color: bg }, color: icA1,    fontSize: 6.5, align: 'right', bold: true } },
      ]);
    }
  }

  // Calc rows
  const sec01 = aggregateSection(rows, '01.');
  const sec02 = aggregateSection(rows, '02.');
  const sec03 = aggregateSection(rows, '03.');
  const sec04 = aggregateSection(rows, '04.');
  const sec06 = aggregateSection(rows, '06.');

  const mcReal   = sec01.real   + sec02.real;
  const mcOrc    = sec01.orcado + sec02.orcado;
  const mcA1     = sec01.a1     + sec02.a1;
  const ebitReal = mcReal   + sec03.real   + sec04.real;
  const ebitOrc  = mcOrc    + sec03.orcado + sec04.orcado;
  const ebitA1   = mcA1     + sec03.a1     + sec04.a1;
  const ebitTotReal = ebitReal + sec06.real;
  const ebitTotOrc  = ebitOrc  + sec06.orcado;
  const ebitTotA1   = ebitA1   + sec06.a1;

  const calcRowStyle = (color: string) => ({
    bold: true, fill: { color }, color: C.white, fontSize: 7,
  });

  const addCalcRow = (label: string, real: number, orc: number, a1v: number, color: string): PptxGenJS.TableRow => {
    const dOrc = pct(real, orc);
    const dA1 = pct(real, a1v);
    return [
      { text: label,        options: calcRowStyle(color) },
      { text: fmtK(real),   options: { ...calcRowStyle(color), align: 'right' } },
      { text: fmtK(orc),    options: { ...calcRowStyle(color), align: 'right' } },
      { text: fmtPct(dOrc), options: { ...calcRowStyle(color), align: 'right' } },
      { text: fmtK(a1v),    options: { ...calcRowStyle(color), align: 'right' } },
      { text: fmtPct(dA1),  options: { ...calcRowStyle(color), align: 'right' } },
    ];
  };

  dataRows.push(addCalcRow('MARGEM DE CONTRIBUIÇÃO', mcReal, mcOrc, mcA1, '1D4ED8'));
  dataRows.push(addCalcRow('EBITDA',                 ebitReal, ebitOrc, ebitA1, C.ebitda));
  dataRows.push(addCalcRow('EBITDA TOTAL (c/ Rateio)', ebitTotReal, ebitTotOrc, ebitTotA1, '065F46'));

  return [header, ...dataRows];
}

function addDreTable(
  pptx: PptxGenJS,
  rows: SomaTagsRow[],
  title: string,
  subtitle: string
) {
  const allRows = buildDreTableRows(rows);
  const CHUNK = 25;

  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = i === 0 ? allRows.slice(0, CHUNK) : [allRows[0], ...allRows.slice(i, i + CHUNK)];
    const slide = pptx.addSlide();
    addTitle(slide, title + (i > 0 ? ' (cont.)' : ''));
    addSubtitle(slide, subtitle);
    slide.addTable(chunk, {
      x: 0.3, y: 0.9, w: W - 0.6, h: H - 1.0,
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      colW: [3.8, 1.5, 1.5, 1.1, 1.5, 1.1],
      rowH: 0.22,
    });
  }
}

// ─── Top Desvios slide ────────────────────────────────────────────────────────
function addTopDesvios(pptx: PptxGenJS, rows: SomaTagsRow[], title: string) {
  interface DesvioItem { tag0: string; tag01: string; real: number; orcado: number; deltaPct: number; invertDelta: boolean }
  const items: DesvioItem[] = [];

  for (const sec of SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      items.push({
        tag0: sec.label, tag01: item.tag01,
        real: item.real, orcado: item.orcado,
        deltaPct: pct(item.real, item.orcado),
        invertDelta: sec.invertDelta,
      });
    }
  }

  items.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const top = items.slice(0, 15);

  const header: PptxGenJS.TableRow = [
    { text: 'GRUPO',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7 } },
    { text: 'ITEM',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7 } },
    { text: 'REAL',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'ORÇADO',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ%',      options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'STATUS',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 7, align: 'center' } },
  ];

  const dataRows: PptxGenJS.TableRow[] = top.map((item, idx) => {
    const dc = deltaColor(item.deltaPct, item.invertDelta);
    const good = dc === C.green;
    return [
      { text: item.tag0,           options: { fontSize: 6.5, color: C.gray, fill: { color: idx % 2 === 0 ? C.white : C.grayLight } } },
      { text: item.tag01,          options: { fontSize: 6.5, color: C.black, fill: { color: idx % 2 === 0 ? C.white : C.grayLight } } },
      { text: fmtK(item.real),     options: { fontSize: 6.5, color: C.black, fill: { color: idx % 2 === 0 ? C.white : C.grayLight }, align: 'right' } },
      { text: fmtK(item.orcado),   options: { fontSize: 6.5, color: C.black, fill: { color: idx % 2 === 0 ? C.white : C.grayLight }, align: 'right' } },
      { text: fmtPct(item.deltaPct), options: { fontSize: 7, bold: true, color: dc, fill: { color: idx % 2 === 0 ? C.white : C.grayLight }, align: 'right' } },
      { text: good ? '✅ Favorável' : '⚠️ Atenção',
        options: { fontSize: 6.5, color: good ? C.green : C.red, fill: { color: idx % 2 === 0 ? C.white : C.grayLight }, align: 'center' } },
    ];
  });

  const slide = pptx.addSlide();
  addTitle(slide, title);
  addSubtitle(slide, 'Top 15 desvios por tag01 — ordenado por magnitude do desvio vs Orçado');
  slide.addTable([header, ...dataRows], {
    x: 0.3, y: 0.9, w: W - 0.6, h: H - 1.1,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [2.5, 3.5, 1.5, 1.5, 1.0, 1.5],
    rowH: 0.24,
  });
}

// ─── EBITDA Bridge ────────────────────────────────────────────────────────────
function addEbitdaBridge(pptx: PptxGenJS, rows: SomaTagsRow[]) {
  const slide = pptx.addSlide();
  addTitle(slide, 'EBITDA Bridge — Orçado → Real');
  addSubtitle(slide, 'Contribuição de cada grupo para o desvio de EBITDA');

  const sec01 = aggregateSection(rows, '01.');
  const sec02 = aggregateSection(rows, '02.');
  const sec03 = aggregateSection(rows, '03.');
  const sec04 = aggregateSection(rows, '04.');
  const sec06 = aggregateSection(rows, '06.');

  const ebitdaOrc = sec01.orcado + sec02.orcado + sec03.orcado + sec04.orcado;
  const ebitdaReal = sec01.real  + sec02.real  + sec03.real  + sec04.real;

  const bridges = [
    { label: 'EBITDA Orçado',   val: ebitdaOrc,             delta: false },
    { label: 'Δ Receita',        val: sec01.real - sec01.orcado,  delta: true, inv: false },
    { label: 'Δ Custos Var.',     val: sec02.real - sec02.orcado,  delta: true, inv: true  },
    { label: 'Δ Custos Fixos',   val: sec03.real - sec03.orcado,  delta: true, inv: true  },
    { label: 'Δ SG&A',           val: sec04.real - sec04.orcado,  delta: true, inv: true  },
    { label: 'EBITDA Real',      val: ebitdaReal,             delta: false },
  ];

  const barAreaX = 0.5;
  const barAreaW = W - 1.0;
  const barAreaY = 1.1;
  const barAreaH = H - 1.8;
  const barCount = bridges.length;
  const barW = (barAreaW / barCount) * 0.7;
  const gap   = (barAreaW / barCount) * 0.3;

  const allVals = bridges.map(b => b.val);
  const maxAbs = Math.max(...allVals.map(Math.abs)) * 1.2 || 1;

  bridges.forEach((b, i) => {
    const x = barAreaX + i * (barAreaW / barCount) + gap / 2;
    const ratio = b.val / maxAbs;
    const isNeg = b.val < 0;
    const barH = Math.abs(ratio) * (barAreaH * 0.7);
    const midY = barAreaY + barAreaH * 0.5;
    const y = isNeg ? midY : midY - barH;
    const color = b.delta
      ? (b.val > 0 === !b.inv ? C.green : C.red)
      : C.blue;

    addRect(slide, x, y, barW, Math.max(barH, 0.05), color);
    slide.addText(b.label, {
      x: x - 0.1, y: barAreaY + barAreaH + 0.05, w: barW + 0.2, h: 0.3,
      fontSize: 6, color: C.gray, align: 'center', wrap: true,
    });
    slide.addText(fmtK(b.val), {
      x: x - 0.1, y: isNeg ? y + barH + 0.02 : y - 0.22, w: barW + 0.2, h: 0.2,
      fontSize: 7, bold: true, color: color, align: 'center',
    });
  });

  // Zero line
  const midY = barAreaY + barAreaH * 0.5;
  addRect(slide, barAreaX, midY, barAreaW, 0.015, C.navy);
}

// ─── Section Overview ─────────────────────────────────────────────────────────
function addSectionOverview(
  pptx: PptxGenJS,
  sec: typeof SECTIONS[number],
  agg: SectionAgg,
  justCount: number
) {
  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.1, H, sec.color);
  addTitle(slide, sec.label + ' — Visão Geral', { x: 0.3 });

  const dOrc = pct(agg.real, agg.orcado);
  const dA1  = pct(agg.real, agg.a1);
  const dcOrc = deltaColor(dOrc, sec.invertDelta);
  const dcA1  = deltaColor(dA1,  sec.invertDelta);

  addKpiCard(slide, 0.3, 0.8, 2.5, 1.0, 'REAL', fmtK(agg.real));
  addKpiCard(slide, 2.9, 0.8, 2.5, 1.0, 'vs ORÇADO', fmtPct(dOrc), fmtPct(dOrc), dcOrc === C.green);
  addKpiCard(slide, 5.5, 0.8, 2.5, 1.0, 'vs A-1', fmtPct(dA1), fmtPct(dA1), dcA1 === C.green);
  addKpiCard(slide, 8.1, 0.8, 2.5, 1.0, 'JUSTIFICATIVAS', `${justCount}`);

  const semaf = semaforo(agg.real, agg.orcado, sec.invertDelta);
  slide.addText(`STATUS: ${semaf}`, {
    x: 10.7, y: 0.8, w: 2.3, h: 1.0,
    fontSize: 14, bold: true, color: C.navy, align: 'center', valign: 'middle',
  });

  // Insights box
  addRect(slide, 0.3, 2.0, W - 0.6, 1.4, C.navyLight);
  const goodBad = (sec.invertDelta ? dOrc < 0 : dOrc > 0);
  const bluf = goodBad
    ? `✅ FAVORÁVEL: ${sec.label} está ${fmtPct(Math.abs(dOrc))} abaixo do orçado — economia de ${fmtK(Math.abs(agg.real - agg.orcado))}.`
    : `⚠️ ATENÇÃO: ${sec.label} está ${fmtPct(Math.abs(dOrc))} acima do orçado — excedente de ${fmtK(Math.abs(agg.real - agg.orcado))}.`;
  slide.addText(bluf, {
    x: 0.5, y: 2.05, w: W - 0.9, h: 0.5,
    fontSize: 9, bold: true, color: C.white,
  });
  slide.addText(
    `• Real: ${fmtK(agg.real)} | Orçado: ${fmtK(agg.orcado)} | A-1: ${fmtK(agg.a1)}\n` +
    `• Desvio vs Orç: ${fmtK(agg.real - agg.orcado)} (${fmtPct(dOrc)}) | Desvio vs A-1: ${fmtK(agg.real - agg.a1)} (${fmtPct(dA1)})`,
    { x: 0.5, y: 2.55, w: W - 0.9, h: 0.75, fontSize: 8, color: 'CCDDFF' }
  );

  // Mini bar chart — tag01 real vs orcado
  const top5 = [...agg.tag01Items]
    .sort((a, b) => Math.abs(b.real - b.orcado) - Math.abs(a.real - a.orcado))
    .slice(0, 5);

  const chartX = 0.3;
  const chartY = 3.55;
  const chartH = H - chartY - 0.2;
  const maxVal = Math.max(...top5.map(t => Math.max(Math.abs(t.real), Math.abs(t.orcado)))) || 1;
  const bw = (W - 0.8) / (top5.length * 2 + top5.length - 1);

  top5.forEach((item, i) => {
    const bx = chartX + i * (bw * 3);
    const rH = (Math.abs(item.real) / maxVal) * chartH;
    const oH = (Math.abs(item.orcado) / maxVal) * chartH;

    addRect(slide, bx, chartY + chartH - rH, bw, rH, sec.color);
    addRect(slide, bx + bw + 0.05, chartY + chartH - oH, bw, oH, 'AAAAAA');

    slide.addText(item.tag01.substring(0, 16), {
      x: bx - 0.1, y: chartY + chartH + 0.05, w: bw * 2.2, h: 0.25,
      fontSize: 5.5, color: C.gray, align: 'center', wrap: true,
    });
  });

  if (top5.length > 0) {
    slide.addText('■ Real  ■ Orçado', { x: W - 2.0, y: 3.5, w: 1.8, h: 0.2, fontSize: 6.5, color: C.gray });
  }
}

// ─── Tag01 Detail Table ───────────────────────────────────────────────────────
function addTag01Detail(pptx: PptxGenJS, sec: typeof SECTIONS[number], agg: SectionAgg) {
  const CHUNK = 18;
  const items = agg.tag01Items;

  const header: PptxGenJS.TableRow = [
    { text: 'DESCRIÇÃO',  options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7 } },
    { text: 'REAL',       options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'ORÇADO',     options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ vs Orc',   options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ%',         options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'A-1',        options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ vs A-1',   options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
    { text: 'Δ% A-1',     options: { bold: true, fill: { color: sec.color }, color: C.white, fontSize: 7, align: 'right' } },
  ];

  const buildRow = (item: Tag01Agg, idx: number): PptxGenJS.TableRow => {
    const dOrc    = item.real - item.orcado;
    const dOrcPct = pct(item.real, item.orcado);
    const dA1     = item.real - item.a1;
    const dA1Pct  = pct(item.real, item.a1);
    const dcOrc = deltaColor(dOrcPct, sec.invertDelta);
    const dcA1  = deltaColor(dA1Pct,  sec.invertDelta);
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    return [
      { text: item.tag01,          options: { fontSize: 6.5, color: C.black, fill: { color: bg } } },
      { text: fmtK(item.real),     options: { fontSize: 6.5, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtK(item.orcado),   options: { fontSize: 6.5, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtK(dOrc),          options: { fontSize: 6.5, color: dcOrc, fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtPct(dOrcPct),     options: { fontSize: 6.5, color: dcOrc, fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtK(item.a1),       options: { fontSize: 6.5, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtK(dA1),           options: { fontSize: 6.5, color: dcA1, fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtPct(dA1Pct),      options: { fontSize: 6.5, color: dcA1, fill: { color: bg }, align: 'right', bold: true } },
    ];
  };

  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const slide = pptx.addSlide();
    addRect(slide, 0, 0, 0.08, H, sec.color);
    addTitle(slide, `${sec.label} — Detalhamento por Tag01${i > 0 ? ' (cont.)' : ''}`, { x: 0.3 });
    slide.addTable([header, ...chunk.map(buildRow)], {
      x: 0.3, y: 0.9, w: W - 0.6, h: H - 1.1,
      border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
      colW: [3.2, 1.3, 1.3, 1.1, 0.9, 1.3, 1.1, 0.9],
      rowH: 0.25,
    });
  }
}

// ─── Justificativas slides ────────────────────────────────────────────────────
function addJustificativasSlides(
  pptx: PptxGenJS,
  sectionLabel: string,
  sectionColor: string,
  justs: VarianceJustification[]
) {
  if (justs.length === 0) return;

  const PERSLIDE = 4;
  for (let i = 0; i < justs.length; i += PERSLIDE) {
    const chunk = justs.slice(i, i + PERSLIDE);
    const slide = pptx.addSlide();
    addRect(slide, 0, 0, 0.08, H, sectionColor);
    addTitle(slide, `${sectionLabel} — Justificativas${i > 0 ? ' (cont.)' : ''}`, { x: 0.3 });
    addSubtitle(slide, 'Desvios justificados pelas áreas responsáveis');

    const cardH = (H - 1.2) / Math.min(chunk.length, PERSLIDE) - 0.05;
    chunk.forEach((j, idx) => {
      const cy = 0.9 + idx * (cardH + 0.05);
      addRect(slide, 0.3, cy, W - 0.6, cardH, C.grayLight);
      addRect(slide, 0.3, cy, 0.06, cardH, sectionColor);

      const statusColor = j.status === 'approved' ? C.green
        : j.status === 'rejected' ? C.red
        : j.status === 'justified' ? C.blue : C.amber;

      slide.addText(`${j.tag01}${j.tag02 ? ' › ' + j.tag02 : ''}${j.marca ? '  [' + j.marca + ']' : ''}`, {
        x: 0.45, y: cy + 0.04, w: W - 2.0, h: 0.18, fontSize: 7.5, bold: true, color: C.navy,
      });
      slide.addText(j.status.toUpperCase(), {
        x: W - 1.9, y: cy + 0.04, w: 1.5, h: 0.18, fontSize: 6.5, bold: true, color: statusColor, align: 'right',
      });

      const dPct = j.variance_pct != null ? fmtPct(j.variance_pct) : '—';
      slide.addText(
        `Real: ${fmtK(j.real_value)}  |  Ref: ${fmtK(j.compare_value)}  |  Desvio: ${dPct}  |  Resp.: ${j.owner_name || '—'}`,
        { x: 0.45, y: cy + 0.22, w: W - 0.8, h: 0.16, fontSize: 6.5, color: C.gray }
      );

      const justText = j.justification || '(sem justificativa)';
      slide.addText(justText, {
        x: 0.45, y: cy + 0.38, w: W - 0.8, h: cardH - 0.58, fontSize: 6.5, color: C.black,
        wrap: true, valign: 'top',
      });

      if (j.ai_summary) {
        const summaryY = cy + cardH - 0.22;
        slide.addText(`💡 IA: ${j.ai_summary.substring(0, 180)}`, {
          x: 0.45, y: summaryY, w: W - 0.8, h: 0.2, fontSize: 5.5, color: C.blue, italic: true,
        });
      }
    });
  }
}

// ─── Portfolio Semáforo ───────────────────────────────────────────────────────
async function addPortfolioSemaforo(
  pptx: PptxGenJS,
  yearMonth: string,
  marcas: string[]
) {
  const slide = pptx.addSlide();
  addTitle(slide, 'Semáforo do Portfolio — Visão por Marca');
  addSubtitle(slide, 'Performance relativa vs orçado — ordenado por EBITDA%');

  const header: PptxGenJS.TableRow = [
    { text: 'MARCA',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'EBITDA R$', options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'vs Orc%',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Receita R$', options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Margem%',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'STATUS',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'center' } },
  ];

  interface BrandRow { marca: string; ebitdaReal: number; ebitdaOrc: number; receitaReal: number; margem: number }
  const brandRows: BrandRow[] = [];

  const listToFetch = marcas.length > 0 ? marcas : [];

  if (listToFetch.length > 0) {
    for (const m of listToFetch) {
      const mRows = await getSomaTags(yearMonth, yearMonth, [m]);
      const r01 = aggregateSection(mRows, '01.');
      const r02 = aggregateSection(mRows, '02.');
      const r03 = aggregateSection(mRows, '03.');
      const r04 = aggregateSection(mRows, '04.');
      const eReal = r01.real + r02.real + r03.real + r04.real;
      const eOrc  = r01.orcado + r02.orcado + r03.orcado + r04.orcado;
      const margem = r01.real > 0 ? (eReal / r01.real) * 100 : 0;
      brandRows.push({ marca: m, ebitdaReal: eReal, ebitdaOrc: eOrc, receitaReal: r01.real, margem });
    }
  }

  brandRows.sort((a, b) => b.margem - a.margem);

  const dataRows: PptxGenJS.TableRow[] = brandRows.map((b, idx) => {
    const dPct = pct(b.ebitdaReal, b.ebitdaOrc);
    const sem = semaforo(b.ebitdaReal, b.ebitdaOrc, true);
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    return [
      { text: b.marca,             options: { fontSize: 8, color: C.black, fill: { color: bg }, bold: true } },
      { text: fmtK(b.ebitdaReal),  options: { fontSize: 8, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtPct(dPct),        options: { fontSize: 8, color: deltaColor(dPct, true), fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtK(b.receitaReal), options: { fontSize: 8, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtPct(b.margem),    options: { fontSize: 8, color: b.margem >= 0 ? C.green : C.red, fill: { color: bg }, align: 'right', bold: true } },
      { text: sem,                 options: { fontSize: 10, fill: { color: bg }, align: 'center' } },
    ];
  });

  if (dataRows.length === 0) {
    slide.addText('Dados de marcas não disponíveis (consolidado selecionado)', {
      x: 1, y: 3, w: W - 2, h: 0.5, fontSize: 10, color: C.gray, align: 'center',
    });
    return;
  }

  slide.addTable([header, ...dataRows], {
    x: 1.0, y: 0.9, w: W - 2.0, h: H - 1.2,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [2.5, 1.8, 1.3, 1.8, 1.3, 1.3],
    rowH: 0.32,
  });
}

// ─── MC & EBITDA slides ───────────────────────────────────────────────────────
function addMCSlide(pptx: PptxGenJS, rows: SomaTagsRow[]) {
  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.08, H, C.ebitda);
  addTitle(slide, 'MARGEM DE CONTRIBUIÇÃO — MC = Receita + Custos Variáveis', { x: 0.3 });

  const sec01 = aggregateSection(rows, '01.');
  const sec02 = aggregateSection(rows, '02.');

  const mcReal = sec01.real + sec02.real;
  const mcOrc  = sec01.orcado + sec02.orcado;
  const mcA1   = sec01.a1 + sec02.a1;
  const mcPct  = sec01.real > 0 ? (mcReal / sec01.real) * 100 : 0;

  addKpiCard(slide, 0.5, 0.9, 2.5, 1.0, 'RECEITA REAL', fmtK(sec01.real));
  addKpiCard(slide, 3.1, 0.9, 2.5, 1.0, 'CUSTOS VAR. REAL', fmtK(sec02.real));
  addKpiCard(slide, 5.7, 0.9, 2.5, 1.0, 'MARGEM CONTRIB.', fmtK(mcReal));
  addKpiCard(slide, 8.3, 0.9, 2.5, 1.0, 'MARGEM %', `${mcPct.toFixed(1)}%`);

  const header: PptxGenJS.TableRow = [
    { text: 'LINHA',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'REAL',     options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'ORÇADO',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Δ%',       options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'A-1',      options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Δ% A-1',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
  ];

  const mkRow = (label: string, real: number, orc: number, a1v: number, inv: boolean, bold = false): PptxGenJS.TableRow => {
    const dOrc = pct(real, orc);
    const dA1  = pct(real, a1v);
    const bg = bold ? C.navyLight : C.white;
    const fg = bold ? C.white : C.black;
    return [
      { text: label,       options: { fontSize: 8, color: fg, fill: { color: bg }, bold } },
      { text: fmtK(real),  options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold } },
      { text: fmtK(orc),   options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold } },
      { text: fmtPct(dOrc), options: { fontSize: 8, color: deltaColor(dOrc, inv), fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtK(a1v),   options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold } },
      { text: fmtPct(dA1),  options: { fontSize: 8, color: deltaColor(dA1,  inv), fill: { color: bg }, align: 'right', bold: true } },
    ];
  };

  slide.addTable([
    header,
    mkRow('Receita Líquida',          sec01.real,  sec01.orcado,  sec01.a1,  false),
    mkRow('(−) Custos Variáveis',     sec02.real,  sec02.orcado,  sec02.a1,  true),
    mkRow('= MARGEM DE CONTRIBUIÇÃO', mcReal,      mcOrc,         mcA1,      false, true),
  ], {
    x: 1.5, y: 2.1, w: W - 3.0, h: 1.4,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [3.2, 1.5, 1.5, 1.0, 1.5, 1.0],
    rowH: 0.3,
  });

  // MC visual bar
  const barY = 3.8;
  const totalBar = W - 2.0;
  const recProp = Math.abs(sec01.real) / (Math.abs(sec01.real) + 0.01);
  const cosVar = Math.abs(sec02.real);
  const cosVarProp = cosVar / (Math.abs(sec01.real) + 0.01);
  const mcProp = Math.max(0, mcReal / (Math.abs(sec01.real) + 0.01));

  addRect(slide, 1.0, barY, totalBar * Math.min(recProp, 1), 0.5, C.blue);
  if (cosVarProp > 0 && cosVarProp <= 1) {
    addRect(slide, 1.0, barY + 0.6, totalBar * Math.min(cosVarProp, 1), 0.5, C.red);
  }
  if (mcProp > 0 && mcProp <= 1) {
    addRect(slide, 1.0, barY + 1.2, totalBar * Math.min(mcProp, 1), 0.5, C.ebitda);
  }

  slide.addText('Receita Líquida', { x: 1.0, y: barY + 0.52, w: 3, h: 0.18, fontSize: 6.5, color: C.blue });
  slide.addText('Custos Variáveis', { x: 1.0, y: barY + 1.12, w: 3, h: 0.18, fontSize: 6.5, color: C.red });
  slide.addText('Margem de Contribuição', { x: 1.0, y: barY + 1.72, w: 3, h: 0.18, fontSize: 6.5, color: C.ebitda });
}

function addEbitdaConsolidado(pptx: PptxGenJS, rows: SomaTagsRow[]) {
  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.08, H, C.ebitda);
  addTitle(slide, 'EBITDA Consolidado', { x: 0.3 });

  const sec01 = aggregateSection(rows, '01.');
  const sec02 = aggregateSection(rows, '02.');
  const sec03 = aggregateSection(rows, '03.');
  const sec04 = aggregateSection(rows, '04.');
  const sec06 = aggregateSection(rows, '06.');

  const mc     = { r: sec01.real + sec02.real, o: sec01.orcado + sec02.orcado, a: sec01.a1 + sec02.a1 };
  const ebitda = { r: mc.r + sec03.real + sec04.real, o: mc.o + sec03.orcado + sec04.orcado, a: mc.a + sec03.a1 + sec04.a1 };
  const ebitdaT = { r: ebitda.r + sec06.real, o: ebitda.o + sec06.orcado, a: ebitda.a + sec06.a1 };

  const margemPct = sec01.real > 0 ? (ebitda.r / sec01.real) * 100 : 0;
  const margemTotPct = sec01.real > 0 ? (ebitdaT.r / sec01.real) * 100 : 0;

  addKpiCard(slide, 0.3, 0.9, 2.8, 1.0, 'EBITDA REAL', fmtK(ebitda.r));
  addKpiCard(slide, 3.2, 0.9, 2.8, 1.0, 'EBITDA (c/ Rateio)', fmtK(ebitdaT.r));
  addKpiCard(slide, 6.1, 0.9, 2.8, 1.0, 'MARGEM %', `${margemPct.toFixed(1)}%`);
  addKpiCard(slide, 9.0, 0.9, 2.8, 1.0, 'MARGEM % (c/ Rateio)', `${margemTotPct.toFixed(1)}%`);

  const header: PptxGenJS.TableRow = [
    { text: 'LINHA',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'REAL',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'ORÇADO',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Δ%',      options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'A-1',     options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Δ% A-1',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
  ];

  const mkRow = (label: string, real: number, orc: number, a1v: number, inv: boolean, highlight = false): PptxGenJS.TableRow => {
    const dOrc = pct(real, orc);
    const dA1  = pct(real, a1v);
    const bg = highlight ? C.ebitda : C.white;
    const fg = highlight ? C.white : C.black;
    return [
      { text: label,       options: { fontSize: 7.5, color: fg, fill: { color: bg }, bold: highlight } },
      { text: fmtK(real),  options: { fontSize: 7.5, color: fg, fill: { color: bg }, align: 'right', bold: highlight } },
      { text: fmtK(orc),   options: { fontSize: 7.5, color: fg, fill: { color: bg }, align: 'right', bold: highlight } },
      { text: fmtPct(dOrc), options: { fontSize: 7.5, color: deltaColor(dOrc, inv), fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtK(a1v),   options: { fontSize: 7.5, color: fg, fill: { color: bg }, align: 'right', bold: highlight } },
      { text: fmtPct(dA1),  options: { fontSize: 7.5, color: deltaColor(dA1, inv), fill: { color: bg }, align: 'right', bold: true } },
    ];
  };

  slide.addTable([
    header,
    mkRow('Receita Líquida',      sec01.real,  sec01.orcado,  sec01.a1,  false),
    mkRow('Custos Variáveis',     sec02.real,  sec02.orcado,  sec02.a1,  true),
    mkRow('Margem de Contribuição', mc.r, mc.o, mc.a, false),
    mkRow('Custos Fixos',         sec03.real,  sec03.orcado,  sec03.a1,  true),
    mkRow('Despesas SG&A',        sec04.real,  sec04.orcado,  sec04.a1,  true),
    mkRow('EBITDA',               ebitda.r, ebitda.o, ebitda.a, false, true),
    mkRow('Rateio Raiz',          sec06.real,  sec06.orcado,  sec06.a1,  true),
    mkRow('EBITDA TOTAL (c/ Rateio)', ebitdaT.r, ebitdaT.o, ebitdaT.a, false, true),
  ], {
    x: 0.8, y: 2.1, w: W - 1.6, h: 3.8,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [3.5, 1.5, 1.5, 1.0, 1.5, 1.0],
    rowH: 0.35,
  });
}

// ─── Per-Marca Deep Dive ──────────────────────────────────────────────────────
async function addMarcaDeepDive(
  pptx: PptxGenJS,
  marca: string,
  yearMonth: string,
  justs: VarianceJustification[]
) {
  // Divider
  const div = pptx.addSlide();
  addBg(div, C.navyLight);
  addRect(div, 0, 0, 0.12, H, C.blue);
  div.addText(marca, { x: 0.5, y: 2.8, w: W - 1, h: 1.0, fontSize: 40, bold: true, color: C.white });
  div.addText('ANÁLISE DETALHADA', { x: 0.5, y: 3.85, w: W - 1, h: 0.4, fontSize: 14, color: C.blue, italic: true });

  const mRows = await getSomaTags(yearMonth, yearMonth, [marca]);

  // Sintética DRE
  const slide2 = pptx.addSlide();
  addRect(slide2, 0, 0, 0.08, H, C.blue);
  addTitle(slide2, `${marca} — DRE Sintética`, { x: 0.3 });

  const sec01 = aggregateSection(mRows, '01.');
  const sec02 = aggregateSection(mRows, '02.');
  const sec03 = aggregateSection(mRows, '03.');
  const sec04 = aggregateSection(mRows, '04.');
  const sec06 = aggregateSection(mRows, '06.');
  const mc     = { r: sec01.real + sec02.real, o: sec01.orcado + sec02.orcado, a: sec01.a1 + sec02.a1 };
  const ebitda = { r: mc.r + sec03.real + sec04.real, o: mc.o + sec03.orcado + sec04.orcado, a: mc.a + sec03.a1 + sec04.a1 };

  const margemPct = sec01.real > 0 ? (ebitda.r / sec01.real) * 100 : 0;
  addKpiCard(slide2, 0.3, 0.9, 2.5, 1.0, 'RECEITA', fmtK(sec01.real));
  addKpiCard(slide2, 2.9, 0.9, 2.5, 1.0, 'EBITDA', fmtK(ebitda.r));
  addKpiCard(slide2, 5.5, 0.9, 2.5, 1.0, 'MARGEM %', `${margemPct.toFixed(1)}%`);
  addKpiCard(slide2, 8.1, 0.9, 2.5, 1.0, 'STATUS', semaforo(ebitda.r, ebitda.o, true), undefined, undefined);

  const header2: PptxGenJS.TableRow = [
    { text: 'LINHA',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'REAL',   options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'ORÇADO', options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'Δ%',     options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
    { text: 'A-1',    options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8, align: 'right' } },
  ];

  const mkR = (label: string, real: number, orc: number, a1v: number, inv: boolean, hi = false): PptxGenJS.TableRow => {
    const d = pct(real, orc);
    const bg = hi ? C.ebitda : C.white;
    const fg = hi ? C.white : C.black;
    return [
      { text: label, options: { fontSize: 8, color: fg, fill: { color: bg }, bold: hi } },
      { text: fmtK(real), options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold: hi } },
      { text: fmtK(orc),  options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold: hi } },
      { text: fmtPct(d),  options: { fontSize: 8, color: deltaColor(d, inv), fill: { color: bg }, align: 'right', bold: true } },
      { text: fmtK(a1v),  options: { fontSize: 8, color: fg, fill: { color: bg }, align: 'right', bold: hi } },
    ];
  };

  slide2.addTable([
    header2,
    mkR('Receita Líquida',      sec01.real, sec01.orcado, sec01.a1, false),
    mkR('Custos Variáveis',     sec02.real, sec02.orcado, sec02.a1, true),
    mkR('Margem de Contribuição', mc.r, mc.o, mc.a, false),
    mkR('Custos Fixos',         sec03.real, sec03.orcado, sec03.a1, true),
    mkR('Despesas SG&A',        sec04.real, sec04.orcado, sec04.a1, true),
    mkR('EBITDA',               ebitda.r, ebitda.o, ebitda.a, false, true),
    mkR('Rateio Raiz',          sec06.real, sec06.orcado, sec06.a1, true),
  ], {
    x: 0.8, y: 2.1, w: W - 1.6, h: 3.5,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [3.5, 2.0, 2.0, 1.3, 2.0],
    rowH: 0.4,
  });

  // Desvios por marca
  addTopDesvios(pptx, mRows, `${marca} — Top Desvios por Tag01`);

  // Justificativas da marca
  const marcaJusts = justs.filter(j => j.marca === marca);
  if (marcaJusts.length > 0) {
    addJustificativasSlides(pptx, marca, C.blue, marcaJusts);
  }
}

// ─── Alertas & Encerramento ───────────────────────────────────────────────────
function addAlertasSlide(pptx: PptxGenJS, rows: SomaTagsRow[]) {
  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.08, H, C.red);
  addTitle(slide, 'Síntese de Alertas — Itens Críticos', { x: 0.3 });
  addSubtitle(slide, 'Desvios desfavoráveis acima de 15% vs Orçado');

  const alerts: { sec: string; tag01: string; real: number; orc: number; deltaPct: number }[] = [];
  for (const sec of SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      const dp = pct(item.real, item.orcado);
      const isBad = sec.invertDelta ? dp > 15 : dp < -15;
      if (isBad) alerts.push({ sec: sec.label, tag01: item.tag01, real: item.real, orc: item.orcado, deltaPct: dp });
    }
  }

  alerts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  if (alerts.length === 0) {
    slide.addText('✅ Nenhum alerta crítico identificado! Todos os itens dentro dos limites aceitáveis.', {
      x: 1, y: 3, w: W - 2, h: 0.5, fontSize: 11, color: C.green, align: 'center', bold: true,
    });
    return;
  }

  const header: PptxGenJS.TableRow = [
    { text: 'GRUPO',  options: { bold: true, fill: { color: C.red }, color: C.white, fontSize: 7.5 } },
    { text: 'ITEM',   options: { bold: true, fill: { color: C.red }, color: C.white, fontSize: 7.5 } },
    { text: 'REAL',   options: { bold: true, fill: { color: C.red }, color: C.white, fontSize: 7.5, align: 'right' } },
    { text: 'ORC.',   options: { bold: true, fill: { color: C.red }, color: C.white, fontSize: 7.5, align: 'right' } },
    { text: 'Δ%',     options: { bold: true, fill: { color: C.red }, color: C.white, fontSize: 7.5, align: 'right' } },
  ];

  const rows2 = alerts.slice(0, 15).map((a, i): PptxGenJS.TableRow => {
    const bg = i % 2 === 0 ? 'FEF2F2' : C.white;
    return [
      { text: a.sec,           options: { fontSize: 7, color: C.gray, fill: { color: bg } } },
      { text: a.tag01,         options: { fontSize: 7, color: C.black, fill: { color: bg }, bold: true } },
      { text: fmtK(a.real),    options: { fontSize: 7, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtK(a.orc),     options: { fontSize: 7, color: C.black, fill: { color: bg }, align: 'right' } },
      { text: fmtPct(a.deltaPct), options: { fontSize: 7, color: C.red, fill: { color: bg }, align: 'right', bold: true } },
    ];
  });

  slide.addTable([header, ...rows2], {
    x: 0.5, y: 0.9, w: W - 1.0, h: H - 1.1,
    border: { type: 'solid', color: 'FECACA', pt: 0.5 },
    colW: [2.8, 4.0, 1.5, 1.5, 1.2],
    rowH: 0.26,
  });
}

function addDecisoesSlide(pptx: PptxGenJS, rows: SomaTagsRow[]) {
  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.08, H, C.blue);
  addTitle(slide, 'Decisões e Próximas Ações', { x: 0.3 });

  const alerts: { tag01: string; deltaPct: number }[] = [];
  for (const sec of SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    for (const item of agg.tag01Items) {
      if (!item.orcado) continue;
      const dp = pct(item.real, item.orcado);
      const isBad = sec.invertDelta ? dp > 10 : dp < -10;
      if (isBad) alerts.push({ tag01: item.tag01, deltaPct: dp });
    }
  }

  alerts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  const header: PptxGenJS.TableRow = [
    { text: 'ITEM / CONTEXTO',  options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'AÇÃO RECOMENDADA', options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'RESPONSÁVEL',      options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'PRAZO',            options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
    { text: 'IMPACTO',          options: { bold: true, fill: { color: C.navy }, color: C.white, fontSize: 8 } },
  ];

  const top5 = alerts.slice(0, 8);
  const dataRows: PptxGenJS.TableRow[] = top5.length > 0
    ? top5.map((a, i): PptxGenJS.TableRow => {
        const bg = i % 2 === 0 ? C.white : C.grayLight;
        return [
          { text: a.tag01, options: { fontSize: 7, color: C.black, fill: { color: bg }, bold: true } },
          { text: 'Revisar budget e plano de ação', options: { fontSize: 7, color: C.gray, fill: { color: bg } } },
          { text: 'A definir', options: { fontSize: 7, color: C.gray, fill: { color: bg }, align: 'center' } },
          { text: '15 dias',   options: { fontSize: 7, color: C.gray, fill: { color: bg }, align: 'center' } },
          { text: fmtPct(a.deltaPct), options: { fontSize: 7, color: C.red, fill: { color: bg }, align: 'center', bold: true } },
        ];
      })
    : [[
        { text: 'Sem itens críticos', options: { fontSize: 8, color: C.green, fill: { color: C.white } } },
        { text: '—', options: { fontSize: 8, color: C.gray, fill: { color: C.white } } },
        { text: '—', options: { fontSize: 8, color: C.gray, fill: { color: C.white } } },
        { text: '—', options: { fontSize: 8, color: C.gray, fill: { color: C.white } } },
        { text: '—', options: { fontSize: 8, color: C.gray, fill: { color: C.white } } },
      ]];

  slide.addTable([header, ...dataRows], {
    x: 0.3, y: 0.9, w: W - 0.6, h: H - 1.2,
    border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
    colW: [3.0, 3.5, 2.0, 1.3, 1.3],
    rowH: 0.32,
  });
}

function addEncerramentoSlide(pptx: PptxGenJS, yearMonth: string) {
  const slide = pptx.addSlide();
  addBg(slide, C.navy);
  addRect(slide, 0, 0, 0.12, H, C.blue);

  slide.addText('FIM DA APRESENTAÇÃO', {
    x: 0.5, y: 1.5, w: W - 1, h: 0.8, fontSize: 30, bold: true, color: C.white,
  });
  slide.addText(`DRE Raiz Educação S.A. — ${monthLabel(yearMonth)}`, {
    x: 0.5, y: 2.4, w: W - 1, h: 0.35, fontSize: 12, color: C.blue, italic: true,
  });

  const estrutura = [
    'ACT 1 — Abertura: Capa, Mensagem Executiva, Semáforo Portfolio',
    'ACT 2 — DRE Consolidada: Visão completa Real vs Orçado vs A-1',
    'ACT 3 — Por Seção: Receita, Custos Variáveis, Custos Fixos, SG&A, Rateio',
    'ACT 4 — MC & EBITDA: Análise de margens e rentabilidade',
    'ACT 5 — Deep Dive por Marca (quando selecionado)',
    'ACT 6 — Encerramento: Alertas, Decisões, Próximos Passos',
  ];
  slide.addText('Estrutura desta apresentação:', {
    x: 0.5, y: 3.1, w: W - 1, h: 0.3, fontSize: 10, bold: true, color: C.white,
  });
  estrutura.forEach((line, i) => {
    slide.addText(`• ${line}`, {
      x: 0.6, y: 3.45 + i * 0.28, w: W - 1.2, h: 0.26, fontSize: 8, color: 'AABBCC',
    });
  });

  slide.addText('Gerado automaticamente — DRE Raiz Plataforma Financeira', {
    x: 0.5, y: H - 0.4, w: W - 1, h: 0.25, fontSize: 7, color: C.gray, align: 'center',
  });
}

// ─── Mensagem Executiva (SCR) ─────────────────────────────────────────────────
function addMensagemExecutiva(pptx: PptxGenJS, rows: SomaTagsRow[], yearMonth: string) {
  const slide = pptx.addSlide();
  addTitle(slide, `Mensagem Executiva — ${monthLabel(yearMonth)}`);
  addSubtitle(slide, 'Framework SCR: Situação → Complicação → Resolução');

  const sec01 = aggregateSection(rows, '01.');
  const sec02 = aggregateSection(rows, '02.');
  const sec03 = aggregateSection(rows, '03.');
  const sec04 = aggregateSection(rows, '04.');
  const sec06 = aggregateSection(rows, '06.');
  const mc = sec01.real + sec02.real;
  const ebitda = mc + sec03.real + sec04.real;
  const ebitdaT = ebitda + sec06.real;
  const ebitdaOrc = sec01.orcado + sec02.orcado + sec03.orcado + sec04.orcado;
  const margemPct = sec01.real > 0 ? (ebitda / sec01.real) * 100 : 0;
  const ebitdaDeltaPct = pct(ebitda, ebitdaOrc);
  const topDev = SECTIONS.flatMap(s => {
    const agg = aggregateSection(rows, s.prefix);
    return agg.tag01Items.map(t => ({ label: t.tag01, dp: pct(t.real, t.orcado), inv: s.invertDelta }));
  }).sort((a, b) => {
    const badA = a.inv ? (a.dp > 0 ? a.dp : 0) : (a.dp < 0 ? -a.dp : 0);
    const badB = b.inv ? (b.dp > 0 ? b.dp : 0) : (b.dp < 0 ? -b.dp : 0);
    return badB - badA;
  })[0];

  const colW = (W - 0.8) / 3;
  const colY = 1.1;
  const colH = H - 2.4;

  const scr = [
    {
      title: '🔵 SITUAÇÃO',
      color: C.blue,
      text: `Em ${monthLabel(yearMonth)}, a Raiz Educação registrou Receita Líquida de ${fmtK(sec01.real)} (${fmtPct(pct(sec01.real, sec01.orcado))} vs Orçado). EBITDA de ${fmtK(ebitda)}, com margem de ${margemPct.toFixed(1)}%.`,
    },
    {
      title: '🔴 COMPLICAÇÃO',
      color: C.red,
      text: ebitdaDeltaPct < -5
        ? `EBITDA apresentou desvio de ${fmtPct(ebitdaDeltaPct)} vs Orçado (${fmtK(ebitda - ebitdaOrc)}). ${topDev ? `Principal pressão: ${topDev.label} com desvio de ${fmtPct(topDev.dp)}.` : ''} Requer atenção imediata.`
        : `Desempenho geral dentro do esperado. EBITDA apresentou desvio de ${fmtPct(ebitdaDeltaPct)} vs Orçado. ${topDev ? `Ponto de atenção: ${topDev.label} (${fmtPct(topDev.dp)}).` : ''}`,
    },
    {
      title: '🟢 RESOLUÇÃO',
      color: C.green,
      text: `Plano de ação focado nos desvios identificados. Acompanhamento semanal dos itens críticos. Justificativas das áreas registradas na plataforma para suporte à decisão gerencial.`,
    },
  ];

  scr.forEach((col, i) => {
    const cx = 0.4 + i * (colW + 0.06);
    addRect(slide, cx, colY, colW, 0.4, col.color);
    slide.addText(col.title, { x: cx, y: colY, w: colW, h: 0.4, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle' });
    addRect(slide, cx, colY + 0.4, colW, colH, C.grayLight);
    slide.addText(col.text, { x: cx + 0.08, y: colY + 0.5, w: colW - 0.16, h: colH - 0.2, fontSize: 8.5, color: C.black, wrap: true });
  });

  // KPIs bottom
  const kpiY = H - 1.2;
  addKpiCard(slide, 0.4,  kpiY, 2.5, 0.9, 'EBITDA REAL', fmtK(ebitdaT), fmtPct(ebitdaDeltaPct), ebitdaDeltaPct >= 0);
  addKpiCard(slide, 3.0,  kpiY, 2.5, 0.9, 'RECEITA REAL', fmtK(sec01.real), fmtPct(pct(sec01.real, sec01.orcado)), pct(sec01.real, sec01.orcado) >= 0);
  addKpiCard(slide, 5.6,  kpiY, 2.5, 0.9, 'MARGEM %', `${margemPct.toFixed(1)}%`);
  addKpiCard(slide, 8.2,  kpiY, 2.5, 0.9, 'TOP DESVIO', topDev ? topDev.label.substring(0, 14) : '—', topDev ? fmtPct(topDev.dp) : undefined, false);
}

// ─── CAPA ────────────────────────────────────────────────────────────────────
function addCapa(pptx: PptxGenJS, yearMonth: string, marcas: string[]) {
  const slide = pptx.addSlide();
  addBg(slide, C.navy);
  addRect(slide, 0, 0, W, 0.12, C.blue);
  addRect(slide, 0, H - 0.12, W, 0.12, C.blue);
  addRect(slide, 0, 0, 0.12, H, C.blue);

  slide.addText('DRE RAIZ EDUCAÇÃO', {
    x: 0.3, y: 1.2, w: W - 0.6, h: 1.0, fontSize: 42, bold: true, color: C.white,
  });
  slide.addText('DEMONSTRAÇÃO DE RESULTADO DO EXERCÍCIO', {
    x: 0.3, y: 2.3, w: W - 0.6, h: 0.4, fontSize: 13, color: C.blue, italic: true,
  });
  slide.addText(monthLabel(yearMonth), {
    x: 0.3, y: 2.85, w: W - 0.6, h: 0.6, fontSize: 28, bold: true, color: C.white,
  });

  slide.addText('CONFIDENCIAL — USO INTERNO', {
    x: 0.3, y: H - 0.8, w: W - 0.6, h: 0.3, fontSize: 8, color: C.gray, align: 'center',
  });

  if (marcas.length > 0) {
    const badgeW = 1.5;
    marcas.slice(0, 6).forEach((m, i) => {
      const bx = 0.3 + i * (badgeW + 0.15);
      addRect(slide, bx, 4.0, badgeW, 0.35, C.navyLight);
      slide.addText(m, { x: bx, y: 4.0, w: badgeW, h: 0.35, fontSize: 8, bold: true, color: C.white, align: 'center', valign: 'middle' });
    });
  } else {
    addRect(slide, 0.3, 4.0, 3.0, 0.35, C.navyLight);
    slide.addText('CONSOLIDADO — TODAS AS MARCAS', { x: 0.3, y: 4.0, w: 3.0, h: 0.35, fontSize: 8, bold: true, color: C.white, align: 'center', valign: 'middle' });
  }
}

// ─── EBITDA por Marca (barras horizontais) ────────────────────────────────────
async function addEbitdaPorMarca(pptx: PptxGenJS, yearMonth: string, marcas: string[]) {
  if (marcas.length === 0) return;

  const slide = pptx.addSlide();
  addRect(slide, 0, 0, 0.08, H, C.ebitda);
  addTitle(slide, 'EBITDA por Marca — Comparação', { x: 0.3 });
  addSubtitle(slide, 'Ordenado por EBITDA% (melhor → pior)');

  interface MarcaData { marca: string; ebitdaReal: number; ebitdaOrc: number; margemPct: number }
  const marcaData: MarcaData[] = [];

  for (const m of marcas) {
    const mRows = await getSomaTags(yearMonth, yearMonth, [m]);
    const r01 = aggregateSection(mRows, '01.');
    const r02 = aggregateSection(mRows, '02.');
    const r03 = aggregateSection(mRows, '03.');
    const r04 = aggregateSection(mRows, '04.');
    const eR = r01.real + r02.real + r03.real + r04.real;
    const eO = r01.orcado + r02.orcado + r03.orcado + r04.orcado;
    const mg = r01.real > 0 ? (eR / r01.real) * 100 : 0;
    marcaData.push({ marca: m, ebitdaReal: eR, ebitdaOrc: eO, margemPct: mg });
  }

  marcaData.sort((a, b) => b.margemPct - a.margemPct);

  const chartX = 3.0;
  const chartW = W - 3.5;
  const chartY = 0.9;
  const barH   = Math.min((H - 1.4) / marcaData.length - 0.1, 0.45);
  const maxAbs = Math.max(...marcaData.map(m => Math.abs(m.ebitdaReal))) || 1;

  marcaData.forEach((m, i) => {
    const by = chartY + i * (barH + 0.15);
    const ratio = Math.abs(m.ebitdaReal) / maxAbs;
    const barW = ratio * chartW;
    const color = m.ebitdaReal >= 0 ? C.ebitda : C.red;

    slide.addText(m.marca, { x: 0.3, y: by, w: 2.6, h: barH, fontSize: 8, color: C.black, align: 'right', valign: 'middle', bold: true });
    addRect(slide, chartX, by, Math.max(barW, 0.05), barH, color);
    slide.addText(`${fmtK(m.ebitdaReal)} | ${m.margemPct.toFixed(1)}%`, {
      x: chartX + barW + 0.1, y: by, w: 2.5, h: barH, fontSize: 7.5, color: color, bold: true, valign: 'middle',
    });
  });
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────
export async function generateNovoPpt(params: PptNovoParams): Promise<void> {
  const {
    yearMonth,
    marcas = [],
    recurring,
    withJustificativas = true,
    withDeepDive = false,
    onProgress,
  } = params;

  const progress = (msg: string, pct: number) => onProgress?.(msg, pct);

  progress('Iniciando geração do PPT...', 0);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ─── Fetch data ──────────────────────────────────────────────────────────────
  progress('Buscando dados da DRE Consolidada...', 5);
  const marcaFilter = marcas.length > 0 ? marcas : undefined;
  const rows = await getSomaTags(yearMonth, yearMonth, marcaFilter, undefined, undefined, undefined, recurring);

  progress('Buscando justificativas de desvios...', 15);
  let justs: VarianceJustification[] = [];
  if (withJustificativas) {
    try {
      justs = await getVarianceJustifications({ year_month: yearMonth });
    } catch (e) {
      console.warn('getVarianceJustifications failed, skipping:', e);
      justs = [];
    }
  }

  // ─── ACT 1 — ABERTURA ────────────────────────────────────────────────────────
  progress('ACT 1 — Abertura...', 20);

  // S1: Capa
  addCapa(pptx, yearMonth, marcas);

  // S2: Mensagem Executiva
  addMensagemExecutiva(pptx, rows, yearMonth);

  // S3: Semáforo Portfolio
  progress('Buscando semáforo por marca...', 25);
  await addPortfolioSemaforo(pptx, yearMonth, marcas);

  // ─── ACT 2 — DRE CONSOLIDADA ──────────────────────────────────────────────────
  progress('ACT 2 — DRE Consolidada...', 30);

  addSectionDivider(pptx, 'DRE CONSOLIDADA', 'Visão completa — Real vs Orçado vs A-1', C.blue);
  addDreTable(pptx, rows, 'DRE Gerencial Consolidada', `${monthLabel(yearMonth)} — Comparativo Real | Orçado | A-1`);
  addEbitdaBridge(pptx, rows);
  addTopDesvios(pptx, rows, 'Top Desvios — Consolidado');

  // ─── ACT 3 — POR SEÇÃO ────────────────────────────────────────────────────────
  progress('ACT 3 — Análise por Seção...', 40);

  for (const sec of SECTIONS) {
    const agg = aggregateSection(rows, sec.prefix);
    const secJusts = justs.filter(j => j.tag0.startsWith(sec.prefix));

    addSectionDivider(pptx, sec.label, `Análise detalhada — ${monthLabel(yearMonth)}`, sec.color);
    addSectionOverview(pptx, sec, agg, secJusts.length);
    addTag01Detail(pptx, sec, agg);

    if (withJustificativas && secJusts.length > 0) {
      addJustificativasSlides(pptx, sec.label, sec.color, secJusts);
    }

    progress(`Seção ${sec.label} concluída`, 40 + SECTIONS.indexOf(sec) * 5);
  }

  // ─── ACT 4 — MC & EBITDA ─────────────────────────────────────────────────────
  progress('ACT 4 — MC & EBITDA...', 65);

  addSectionDivider(pptx, 'MARGEM & EBITDA', 'Análise de rentabilidade e margens', C.ebitda);
  addMCSlide(pptx, rows);
  addEbitdaConsolidado(pptx, rows);
  await addEbitdaPorMarca(pptx, yearMonth, marcas);

  // ─── ACT 5 — DEEP DIVE POR MARCA ──────────────────────────────────────────────
  if (withDeepDive && marcas.length > 0) {
    progress('ACT 5 — Deep Dive por Marca...', 75);
    addSectionDivider(pptx, 'DEEP DIVE POR MARCA', 'Análise individual de performance', C.sga);
    for (const m of marcas) {
      progress(`  → ${m}...`, 75 + (marcas.indexOf(m) / marcas.length) * 15);
      await addMarcaDeepDive(pptx, m, yearMonth, justs);
    }
  }

  // ─── ACT 6 — ENCERRAMENTO ────────────────────────────────────────────────────
  progress('ACT 6 — Encerramento...', 90);

  addSectionDivider(pptx, 'ENCERRAMENTO', 'Alertas, decisões e próximos passos', C.navy);
  addAlertasSlide(pptx, rows);
  addDecisoesSlide(pptx, rows);
  addEncerramentoSlide(pptx, yearMonth);

  // ─── Salvar ───────────────────────────────────────────────────────────────────
  progress('Gerando arquivo...', 95);
  const outputName = `DRE_Gerencial_${yearMonth}_${Date.now()}.pptx`;
  await pptx.writeFile({ fileName: outputName });

  progress(`✅ PPT gerado: ${outputName}`, 100);
}
