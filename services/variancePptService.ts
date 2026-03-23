// ─── Variance PPT — PPTX Rendering Service ───────────────────────
import PptxGenJS from 'pptxgenjs';
import {
  VARIANCE_COLORS,
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
  VariancePptMarcaEntry,
} from './variancePptTypes';

// ─── Layout Constants ─────────────────────────────────────────────
const SLIDE_W  = 13.33;   // LAYOUT_WIDE width (inches)
const SLIDE_H  = 7.5;     // LAYOUT_WIDE height (inches)
const HEADER_H = 0.65;    // top header bar
const FOOTER_Y = 7.05;    // footer starts here
const FOOTER_H = 0.45;    // footer height → ends exactly at 7.5
const CONTENT_Y = 0.85;   // content starts here (header + 0.2 gap)
const CONTENT_B = 6.98;   // content bottom (footer_y − 0.07 safety gap)
const ML = 0.30;          // margin left
const MR = 0.33;          // margin right → content ends at 13.00
const CW = SLIDE_W - ML - MR; // 12.70 — usable content width

const FONT = 'Calibri';
const C = VARIANCE_COLORS;

// ─── Formatting Helpers ───────────────────────────────────────────

function fmtK(v: number): string {
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return 'N/D';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function deltaColor(v: number | null, invert: boolean): string {
  if (v === null || v === undefined || v === 0) return C.mutedText;
  const favorable = invert ? v <= 0 : v >= 0;
  return favorable ? C.deltaPositivo : C.deltaNegativo;
}

function statusDot(status: string): string {
  if (status === 'approved')  return C.approved;
  if (status === 'justified') return C.justified;
  if (status === 'rejected')  return C.rejected;
  if (status === 'notified')  return '3B82F6';
  return C.pending;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ─── Shared Slide Helpers ─────────────────────────────────────────

/**
 * Top header bar present on every content slide.
 * Full-width navy bar with title (left), unit badge, and month badge (right).
 * Thin accent underline connects header to content area.
 */
function addHeaderBar(
  slide: PptxGenJS.Slide,
  title: string,
  monthShort: string,
  color?: string,
) {
  // Main header background
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: SLIDE_W, h: HEADER_H,
    fill: { color: color || C.headerBg },
  });

  // Thin accent underline (separates header from content)
  slide.addShape('rect' as any, {
    x: 0, y: HEADER_H, w: SLIDE_W, h: 0.03,
    fill: { color: C.accent },
  });

  // Slide title — left aligned, plenty of room before badges
  slide.addText(title, {
    x: ML, y: 0.10, w: 8.8, h: 0.46,
    fontSize: 15, fontFace: FONT, bold: true,
    color: C.white,
  });

  // "UNIDADE: MILHARES (R$)" badge
  slide.addShape('roundRect' as any, {
    x: 9.20, y: 0.13, w: 2.50, h: 0.38,
    fill: { color: '2D3748' }, rectRadius: 0.05,
  });
  slide.addText('UNIDADE: MILHARES (R$)', {
    x: 9.20, y: 0.13, w: 2.50, h: 0.38,
    fontSize: 8, fontFace: FONT, bold: true,
    color: C.mutedText, align: 'center',
  });

  // Month badge — right-aligned, ends at 13.00
  slide.addShape('roundRect' as any, {
    x: 11.95, y: 0.13, w: 1.05, h: 0.38,
    fill: { color: C.accent }, rectRadius: 0.05,
  });
  slide.addText(monthShort, {
    x: 11.95, y: 0.13, w: 1.05, h: 0.38,
    fontSize: 10, fontFace: FONT, bold: true,
    color: C.white, align: 'center',
  });
}

/**
 * Consistent footer bar on every content slide.
 * Dark navy strip with company name (left) and date (right).
 */
function addFooterBar(slide: PptxGenJS.Slide) {
  slide.addShape('rect' as any, {
    x: 0, y: FOOTER_Y, w: SLIDE_W, h: FOOTER_H,
    fill: { color: C.headerBg },
  });
  slide.addText('DRE Raiz — Plataforma Financeira', {
    x: ML, y: FOOTER_Y + 0.10, w: 6, h: 0.25,
    fontSize: 6.5, fontFace: FONT,
    color: '4A5568',
  });
  slide.addText(new Date().toLocaleDateString('pt-BR'), {
    x: SLIDE_W - 3 - MR, y: FOOTER_Y + 0.10, w: 3, h: 0.25,
    fontSize: 6.5, fontFace: FONT,
    color: '4A5568', align: 'right',
  });
}

/**
 * KPI card: rounded white card with color top strip, large value, small label.
 * All text is safely padded inside the card boundaries.
 */
function addKpiCard(
  slide: PptxGenJS.Slide,
  label: string,
  value: string,
  color: string,
  x: number, y: number, w: number, h: number,
) {
  // Card background
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: C.white },
    shadow: { type: 'outer', blur: 5, offset: 2, color: '00000018' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });
  // Top color accent strip
  slide.addShape('roundRect' as any, {
    x: x + 0.05, y: y + 0.05, w: w - 0.10, h: 0.06,
    fill: { color }, rectRadius: 0.03,
  });
  // Value — large text, reduced font to prevent overflow
  slide.addText(value, {
    x: x + 0.08, y: y + 0.14, w: w - 0.16, h: 0.40,
    fontSize: 15, fontFace: FONT, bold: true,
    color, align: 'center',
  });
  // Label — small caption
  slide.addText(label, {
    x: x + 0.08, y: y + 0.54, w: w - 0.16, h: 0.20,
    fontSize: 7.5, fontFace: FONT, bold: true,
    color: C.mutedText, align: 'center',
  });
}

/**
 * Dark insights box with "SÍNTESE IA" header and body text.
 * Used on section slides and the summary slide.
 */
function addInsightsBox(
  slide: PptxGenJS.Slide,
  text: string,
  x: number, y: number, w: number, h: number,
) {
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: C.headerBg },
    rectRadius: 0.08,
  });
  // "SÍNTESE IA" label row
  slide.addShape('roundRect' as any, {
    x: x + 0.12, y: y + 0.10, w: 1.30, h: 0.24,
    fill: { color: C.accent }, rectRadius: 0.04,
  });
  slide.addText('SÍNTESE IA', {
    x: x + 0.12, y: y + 0.10, w: 1.30, h: 0.24,
    fontSize: 8, fontFace: FONT, bold: true,
    color: C.white, align: 'center',
  });
  // Body text
  slide.addText(text || 'Síntese pendente', {
    x: x + 0.15, y: y + 0.42, w: w - 0.30, h: h - 0.55,
    fontSize: 7.5, fontFace: FONT,
    color: text ? 'D1D5DB' : '6B728060',
    lineSpacingMultiple: 1.4,
    valign: 'top',
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════

function addCoverSlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();

  // ── Full dark background ─────────────────────────────────────────
  (slide as any).background = { color: C.headerBg };

  // ── Top accent strip (full width) ───────────────────────────────
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: SLIDE_W, h: 0.14,
    fill: { color: C.accent },
  });

  // ── Left vertical accent bar ────────────────────────────────────
  slide.addShape('rect' as any, {
    x: 0, y: 0.14, w: 0.14, h: SLIDE_H - 0.14,
    fill: { color: C.accent },
  });

  // ── Right decorative panel ──────────────────────────────────────
  // Large circle behind — subtle dark tone on dark bg
  slide.addShape('ellipse' as any, {
    x: 8.2, y: 0.8, w: 5.5, h: 5.5,
    fill: { color: '243347' },
  });
  // Inner accent circle
  slide.addShape('ellipse' as any, {
    x: 9.4, y: 2.0, w: 3.2, h: 3.2,
    fill: { color: '1E2D40' },
  });
  // Vertical colored bars — staggered heights, flush to right
  slide.addShape('roundRect' as any, {
    x: 9.80, y: 2.8, w: 0.45, h: 3.5,
    fill: { color: C.accent }, rectRadius: 0.06,
  });
  slide.addShape('roundRect' as any, {
    x: 10.45, y: 3.3, w: 0.45, h: 3.0,
    fill: { color: C.teal }, rectRadius: 0.06,
  });
  slide.addShape('roundRect' as any, {
    x: 11.10, y: 3.8, w: 0.45, h: 2.5,
    fill: { color: C.justified }, rectRadius: 0.06,
  });
  slide.addShape('roundRect' as any, {
    x: 11.75, y: 4.3, w: 0.45, h: 2.0,
    fill: { color: C.pending }, rectRadius: 0.06,
  });

  // ── Logo ────────────────────────────────────────────────────────
  slide.addText('RAIZ', {
    x: 0.55, y: 0.32, w: 4.5, h: 0.65,
    fontSize: 34, fontFace: FONT, bold: true,
    color: C.white,
  });
  slide.addText('EDUCAÇÃO S.A.', {
    x: 0.55, y: 0.94, w: 4.5, h: 0.30,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.teal, charSpacing: 3.5,
  });

  // ── Main title ──────────────────────────────────────────────────
  slide.addText('Book de Resultados', {
    x: 0.55, y: 1.90, w: 8.5, h: 0.80,
    fontSize: 36, fontFace: FONT, bold: true,
    color: C.white,
  });
  slide.addText('DRE Gerencial', {
    x: 0.55, y: 2.72, w: 7.0, h: 0.55,
    fontSize: 26, fontFace: FONT,
    color: C.teal,
  });

  // ── Divider ─────────────────────────────────────────────────────
  slide.addShape('rect' as any, {
    x: 0.55, y: 3.47, w: 5.0, h: 0.05,
    fill: { color: C.accent },
  });

  // ── Period + entity ─────────────────────────────────────────────
  slide.addText(data.monthLabel, {
    x: 0.55, y: 3.72, w: 7.0, h: 0.50,
    fontSize: 22, fontFace: FONT,
    color: C.white,
  });
  slide.addText(data.marca || 'Consolidado', {
    x: 0.55, y: 4.25, w: 7.0, h: 0.35,
    fontSize: 14, fontFace: FONT,
    color: C.mutedText,
  });

  // ── Badges row ──────────────────────────────────────────────────
  const BY = 4.95;
  const BH = 0.40;

  // Version
  slide.addShape('roundRect' as any, {
    x: 0.55, y: BY, w: 1.55, h: BH,
    fill: { color: C.justified }, rectRadius: 0.06,
  });
  slide.addText(`Versão ${data.version}`, {
    x: 0.55, y: BY, w: 1.55, h: BH,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.white, align: 'center',
  });

  // Snapshot date
  if (data.snapshotAt) {
    const snapDate = new Date(data.snapshotAt);
    const snapLabel = `Foto ${snapDate.toLocaleDateString('pt-BR')} ${snapDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    slide.addShape('roundRect' as any, {
      x: 2.25, y: BY, w: 2.60, h: BH,
      fill: { color: '2D3748' }, rectRadius: 0.06,
    });
    slide.addText(snapLabel, {
      x: 2.25, y: BY, w: 2.60, h: BH,
      fontSize: 8, fontFace: FONT, bold: true,
      color: C.white, align: 'center',
    });
  }

  // Coverage %
  const cvgX = data.snapshotAt ? 5.10 : 2.25;
  const cvgColor = data.stats.coveragePct >= 80 ? C.approved : C.pending;
  slide.addShape('roundRect' as any, {
    x: cvgX, y: BY, w: 2.80, h: BH,
    fill: { color: cvgColor }, rectRadius: 0.06,
  });
  slide.addText(`${data.stats.coveragePct}% das contas justificadas`, {
    x: cvgX, y: BY, w: 2.80, h: BH,
    fontSize: 8, fontFace: FONT, bold: true,
    color: C.white, align: 'center',
  });

  // ── Bottom accent bar ────────────────────────────────────────────
  slide.addShape('rect' as any, {
    x: 0, y: SLIDE_H - 0.14, w: SLIDE_W, h: 0.14,
    fill: { color: C.accent },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2 — DRE OVERVIEW
// ═══════════════════════════════════════════════════════════════════

function addOverviewSlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();
  addHeaderBar(slide, 'DRE — VISÃO GERAL (SNAPSHOT)', data.monthShort);
  addFooterBar(slide);

  const a1Label = String(data.a1Year);

  // ── Left panel: DRE condensed table (0.30 → 7.60, w=7.30) ────────
  const mkHdr = (text: string, align: 'left' | 'right' = 'right') => ({
    text,
    options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align },
  });

  const headerRow = [
    mkHdr('DESCRIÇÃO', 'left'),
    mkHdr(`REAL ${data.year}`),
    mkHdr('ORÇADO'),
    mkHdr('Δ% Orç'),
    mkHdr(a1Label),
    mkHdr(`Δ% ${a1Label}`),
  ];

  const CALC_STYLES = {
    margem:      { bg: 'FEF3C7', text: '92400E' },
    ebitdaSr:    { bg: 'E5E7EB', text: '1F2937' },
    ebitdaTotal: { bg: '374151', text: C.white   },
  };

  const margemCalc     = data.calcRows.find(c => c.label === 'MARGEM DE CONTRIBUIÇÃO');
  const ebitdaSrCalc   = data.calcRows.find(c => c.label === 'EBITDA (S/ RATEIO RAIZ CSC)');
  const ebitdaTotalCalc = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  const rows: any[][] = [headerRow];

  for (const section of data.sections) {
    const { node, invertDelta } = section;
    const dOrc = deltaColor(node.orcVarPct, invertDelta);
    const dA1  = deltaColor(node.a1VarPct,  invertDelta);
    rows.push([
      { text: section.tag0, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white } } },
      { text: fmtK(node.real),       options: { bold: true, fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtK(node.orcCompare), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtPct(node.orcVarPct),options: { bold: true, fontSize: 7, fontFace: FONT, color: dOrc,       fill: { color: C.white }, align: 'right' } },
      { text: fmtK(node.a1Compare),  options: { bold: true, fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtPct(node.a1VarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dA1,        fill: { color: C.white }, align: 'right' } },
    ]);

    if (section.tag0.startsWith('03.') && margemCalc) {
      addCalcRowToTable(rows, margemCalc, CALC_STYLES.margem.bg, CALC_STYLES.margem.text);
    }
    if (section.tag0.startsWith('04.') && ebitdaSrCalc) {
      addCalcRowToTable(rows, ebitdaSrCalc, CALC_STYLES.ebitdaSr.bg, CALC_STYLES.ebitdaSr.text);
    }
  }

  if (ebitdaTotalCalc) {
    addCalcRowToTable(rows, ebitdaTotalCalc, CALC_STYLES.ebitdaTotal.bg, CALC_STYLES.ebitdaTotal.text);
  }

  // Table: left panel, columns sum to 7.30
  // colW: 2.10 + 1.05 + 1.05 + 1.00 + 1.05 + 1.05 = 7.30
  const TABLE_W = 7.30;
  const TABLE_H = 5.60;
  const rowH = Math.min(0.30, TABLE_H / rows.length);

  slide.addTable(rows, {
    x: ML, y: CONTENT_Y, w: TABLE_W, h: TABLE_H,
    colW: [2.10, 1.05, 1.05, 1.00, 1.05, 1.05],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });

  // ── Right panel: KPI cards + coverage (7.80 → 13.00, w=5.20) ─────
  const RX  = 7.80;   // right panel start x
  const RW  = 5.20;   // right panel width (ends at 13.00)
  const CW2 = (RW - 0.10) / 2; // each card width = 2.55

  // Row 1 KPI cards (y=1.00)
  const ebitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL');
  addKpiCard(slide, 'EBITDA TOTAL',
    ebitda ? `R$ ${fmtK(ebitda.real)} mil` : 'N/D',
    C.consolidado, RX, 1.00, CW2, 0.85);
  addKpiCard(slide, 'VS ORÇADO',
    ebitda ? fmtPct(ebitda.deltaOrcPct) : 'N/D',
    ebitda?.deltaOrcPct != null ? deltaColor(ebitda.deltaOrcPct, false) : C.mutedText,
    RX + CW2 + 0.10, 1.00, CW2, 0.85);

  // Row 2 KPI cards (y=2.10)
  addKpiCard(slide, `VS ${a1Label}`,
    ebitda ? fmtPct(ebitda.deltaA1Pct) : 'N/D',
    ebitda?.deltaA1Pct != null ? deltaColor(ebitda.deltaA1Pct, false) : C.mutedText,
    RX, 2.10, CW2, 0.85);
  addKpiCard(slide, 'COBERTURA JUSTIF.',
    `${data.stats.coveragePct}%`,
    data.stats.coveragePct >= 80 ? C.approved : C.pending,
    RX + CW2 + 0.10, 2.10, CW2, 0.85);

  // Coverage progress box (y=3.10)
  const BOX_Y = 3.15;
  const BOX_H = 1.30;
  slide.addShape('roundRect' as any, {
    x: RX, y: BOX_Y, w: RW, h: BOX_H,
    fill: { color: 'F9FAFB' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });
  slide.addText('Progresso de Justificativas', {
    x: RX + 0.15, y: BOX_Y + 0.08, w: RW - 0.30, h: 0.22,
    fontSize: 8, fontFace: FONT, bold: true, color: C.headerBg,
  });

  const { stats } = data;
  const statusItems = [
    { label: 'Aprovados',   count: stats.approved,  color: C.approved  },
    { label: 'Justificados',count: stats.justified, color: C.justified },
    { label: 'Pendentes',   count: stats.pending,   color: C.pending   },
    { label: 'Rejeitados',  count: stats.rejected,  color: C.rejected  },
    { label: 'Notificados', count: stats.notified,  color: '3B82F6'    },
  ];

  statusItems.forEach((item, idx) => {
    const ix = RX + 0.15 + idx * (RW - 0.30) / 5;
    slide.addShape('rect' as any, {
      x: ix, y: BOX_Y + 0.40, w: 0.13, h: 0.13,
      fill: { color: item.color },
    });
    slide.addText(`${item.label}: ${item.count}`, {
      x: ix + 0.17, y: BOX_Y + 0.37, w: 0.85, h: 0.18,
      fontSize: 6, fontFace: FONT, color: C.darkText,
    });
  });

  slide.addText(`Total: ${stats.totalLeaves} contas analisadas`, {
    x: RX + 0.15, y: BOX_Y + 0.68, w: RW - 0.30, h: 0.18,
    fontSize: 7, fontFace: FONT, bold: true, color: C.mutedText,
  });

  // Executive summary box — uses remaining space down to footer
  if (data.executiveSummary) {
    const SUMM_Y = BOX_Y + BOX_H + 0.15;
    const SUMM_H = CONTENT_B - SUMM_Y;
    if (SUMM_H > 0.6) {
      addInsightsBox(slide, data.executiveSummary, RX, SUMM_Y, RW, SUMM_H);
    }
  }
}

function addCalcRowToTable(rows: any[][], calc: VariancePptCalcRow, bgColor: string, textColor: string = C.white) {
  const dOrc = calc.deltaOrcPct != null && calc.deltaOrcPct >= 0 ? C.deltaPositivo : C.deltaNegativo;
  const dA1  = calc.deltaA1Pct  != null && calc.deltaA1Pct  >= 0 ? C.deltaPositivo : C.deltaNegativo;
  rows.push([
    { text: calc.label,             options: { bold: true, fontSize: 7, fontFace: FONT, color: textColor, fill: { color: bgColor } } },
    { text: fmtK(calc.real),        options: { bold: true, fontSize: 7, fontFace: FONT, color: textColor, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.orcado),      options: { bold: true, fontSize: 7, fontFace: FONT, color: textColor, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaOrcPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dOrc, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.a1),          options: { bold: true, fontSize: 7, fontFace: FONT, color: textColor, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaA1Pct),options: { bold: true, fontSize: 7, fontFace: FONT, color: dA1, fill: { color: bgColor }, align: 'right' } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════
// SLIDES 3-N — SECTION SLIDES (1 per tag0)
// ═══════════════════════════════════════════════════════════════════

function addSectionSlide(pptx: PptxGenJS, section: VariancePptSection, data: VariancePptData) {
  if (section.tag01Nodes.length === 0) return;

  const slide = pptx.addSlide();
  addHeaderBar(slide, section.tag0.toUpperCase(), data.monthShort, section.sectionColor);
  addFooterBar(slide);

  const a1Label = String(data.a1Year);

  // ── Table: full width, columns sum precisely to 12.70 ─────────────
  // colW: 3.80 + 1.80 + 1.80 + 1.50 + 1.80 + 2.00 = 12.70
  const mkHdr = (text: string, align: 'left' | 'right' = 'right') => ({
    text,
    options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align },
  });

  const headerRow = [
    mkHdr('DESCRIÇÃO', 'left'),
    mkHdr(`REAL ${data.year}`),
    mkHdr('ORÇADO'),
    mkHdr('Δ% Orç'),
    mkHdr(a1Label),
    mkHdr(`Δ% ${a1Label}`),
  ];

  const rows: any[][] = [headerRow];

  const sortedTag01 = section.tag0.startsWith('01.')
    ? [...section.tag01Nodes].sort((a, b) => b.real - a.real)
    : section.tag01Nodes;

  for (const node of sortedTag01) {
    const dOrc = deltaColor(node.orcVarPct, section.invertDelta);
    const dA1  = deltaColor(node.a1VarPct,  section.invertDelta);
    rows.push([
      { text: `↳ ${node.label}`, options: { fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'left' } },
      { text: fmtK(node.real),        options: { fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtK(node.orcCompare),  options: { fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtPct(node.orcVarPct), options: { fontSize: 7, fontFace: FONT, color: dOrc,       fill: { color: C.white }, align: 'right' } },
      { text: fmtK(node.a1Compare),   options: { fontSize: 7, fontFace: FONT, color: C.darkText, fill: { color: C.white }, align: 'right' } },
      { text: fmtPct(node.a1VarPct),  options: { fontSize: 7, fontFace: FONT, color: dA1,        fill: { color: C.white }, align: 'right' } },
    ]);
  }

  // Total row
  const { node } = section;
  const tOrc = deltaColor(node.orcVarPct, section.invertDelta);
  const tA1  = deltaColor(node.a1VarPct,  section.invertDelta);
  rows.push([
    { text: 'TOTAL', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor } } },
    { text: fmtK(node.real),        options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
    { text: fmtK(node.orcCompare),  options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
    { text: fmtPct(node.orcVarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
    { text: fmtK(node.a1Compare),   options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
    { text: fmtPct(node.a1VarPct),  options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
  ]);

  // Table height: dynamic, capped at 3.0
  const MAX_TABLE_H = 3.00;
  const rowH = Math.min(0.27, MAX_TABLE_H / rows.length);
  const actualTableH = rowH * rows.length;

  slide.addTable(rows, {
    x: ML, y: CONTENT_Y, w: CW, h: actualTableH,
    colW: [3.80, 1.80, 1.80, 1.50, 1.80, 2.00],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });

  // ── Bottom area: AI insights (left 55%) + drivers (right 45%) ─────
  // bottomY calculated from actual table height, but never starts too high
  const BOTTOM_Y = Math.max(CONTENT_Y + actualTableH + 0.18, 3.80);
  const BOTTOM_H = CONTENT_B - BOTTOM_Y; // never exceeds footer

  if (BOTTOM_H < 0.4) return; // no room — skip bottom section

  const AI_W      = 6.90;  // left AI box width
  const DRIVER_X  = ML + AI_W + 0.20;
  const DRIVER_W  = SLIDE_W - MR - DRIVER_X; // = 13.00 − 7.40 = 5.60

  // AI Summary box
  const insightText = node.enrichedInsight || node.orcAiSummary || '';
  addInsightsBox(slide, insightText, ML, BOTTOM_Y, AI_W, BOTTOM_H);

  // Right: enriched drivers OR top deviations
  const hasDrivers = node.enrichedDrivers && node.enrichedDrivers.length > 0;

  if (hasDrivers) {
    // Enriched drivers mode
    slide.addText('DRIVERS PRINCIPAIS', {
      x: DRIVER_X, y: BOTTOM_Y, w: DRIVER_W, h: 0.26,
      fontSize: 9, fontFace: FONT, bold: true, color: C.accent,
    });

    const drivers = node.enrichedDrivers!;
    const AVAIL   = BOTTOM_H - 0.32;
    const SLOT    = Math.min(0.88, AVAIL / drivers.length);
    const CARD_H  = SLOT - 0.06;

    drivers.forEach((driver, idx) => {
      const cy = BOTTOM_Y + 0.30 + idx * SLOT;
      if (cy + CARD_H > CONTENT_B) return; // guard: don't exceed footer

      slide.addShape('roundRect' as any, {
        x: DRIVER_X, y: cy, w: DRIVER_W, h: CARD_H,
        fill: { color: C.white },
        line: { color: 'E5E7EB', width: 0.5 },
        rectRadius: 0.06,
      });
      slide.addShape('rect' as any, {
        x: DRIVER_X, y: cy, w: 0.06, h: CARD_H,
        fill: { color: C.accent },
      });
      slide.addText(driver, {
        x: DRIVER_X + 0.14, y: cy + 0.07, w: DRIVER_W - 0.22, h: CARD_H - 0.14,
        fontSize: 7.5, fontFace: FONT, color: C.darkText,
        lineSpacingMultiple: 1.3, valign: 'middle',
      });
    });

  } else {
    // Fallback: top 3 desvios
    slide.addText('TOP DESVIOS', {
      x: DRIVER_X, y: BOTTOM_Y, w: DRIVER_W, h: 0.26,
      fontSize: 9, fontFace: FONT, bold: true, color: C.headerBg,
    });

    const top3 = [...section.tag01Nodes]
      .sort((a, b) => Math.abs(b.orcVarPct || 0) - Math.abs(a.orcVarPct || 0))
      .slice(0, 3);

    const AVAIL   = BOTTOM_H - 0.32;
    const SLOT    = Math.min(1.20, AVAIL / 3);
    const CARD_H  = SLOT - 0.06;

    top3.forEach((n, idx) => {
      const cy = BOTTOM_Y + 0.30 + idx * SLOT;
      if (cy + CARD_H > CONTENT_B) return; // guard

      const borderColor = deltaColor(n.orcVarPct, section.invertDelta);

      slide.addShape('roundRect' as any, {
        x: DRIVER_X, y: cy, w: DRIVER_W, h: CARD_H,
        fill: { color: C.white },
        line: { color: 'E5E7EB', width: 0.5 },
        rectRadius: 0.06,
      });
      slide.addShape('rect' as any, {
        x: DRIVER_X, y: cy, w: 0.06, h: CARD_H,
        fill: { color: borderColor },
      });
      slide.addText(truncate(n.label, 30), {
        x: DRIVER_X + 0.14, y: cy + 0.06, w: DRIVER_W - 1.60, h: 0.22,
        fontSize: 8, fontFace: FONT, bold: true, color: C.headerBg,
      });
      slide.addText(`Δ Orç: ${fmtPct(n.orcVarPct)}`, {
        x: DRIVER_X + DRIVER_W - 1.50, y: cy + 0.06, w: 1.44, h: 0.22,
        fontSize: 7.5, fontFace: FONT, bold: true, color: borderColor, align: 'right',
      });

      const justText  = n.orcAiSummary || n.orcJustification || 'Sem justificativa';
      const stColor   = statusDot(n.orcStatus);

      slide.addShape('rect' as any, {
        x: DRIVER_X + 0.14, y: cy + 0.32, w: 0.10, h: 0.10,
        fill: { color: stColor },
      });
      slide.addText(truncate(justText, 90), {
        x: DRIVER_X + 0.28, y: cy + 0.29, w: DRIVER_W - 0.36, h: CARD_H - 0.37,
        fontSize: 6.5, fontFace: FONT, color: C.mutedText,
        lineSpacingMultiple: 1.3, valign: 'top',
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL SLIDES (1 per tag0 — tag01 + tag02 + tag03 hierarchy)
// ═══════════════════════════════════════════════════════════════════

function addDetailSlide(pptx: PptxGenJS, section: VariancePptSection, data: VariancePptData) {
  type DetailRow = {
    depth: number;
    label: string;
    real: number;
    orc: number;
    varPct: number | null;
    justText: string;
    status: string;
  };

  const allRows: DetailRow[] = [];

  for (const t01 of section.tag01Nodes) {
    allRows.push({
      depth: 0, label: t01.label,
      real: t01.real, orc: t01.orcCompare, varPct: t01.orcVarPct,
      justText: t01.orcAiSummary || '', status: t01.orcStatus,
    });
    for (const t02 of t01.children) {
      allRows.push({
        depth: 1, label: t02.label,
        real: t02.real, orc: t02.orcCompare, varPct: t02.orcVarPct,
        justText: t02.orcAiSummary || '', status: t02.orcStatus,
      });
      for (const marca of t02.children) {
        allRows.push({
          depth: 2, label: marca.label,
          real: marca.real, orc: marca.orcCompare, varPct: marca.orcVarPct,
          justText: marca.orcJustification || marca.orcAiSummary || '', status: marca.orcStatus,
        });
      }
    }
  }

  if (allRows.length === 0) return;

  const MAX_ROWS  = 20;
  const truncated = allRows.length > MAX_ROWS;
  const display   = truncated ? allRows.slice(0, MAX_ROWS) : allRows;
  const remaining = allRows.length - MAX_ROWS;

  const slide = pptx.addSlide();
  addHeaderBar(slide, `${section.label.toUpperCase()} — DETALHAMENTO`, data.monthShort, section.sectionColor);
  addFooterBar(slide);

  // ── Table header ─────────────────────────────────────────────────
  const mkHdr = (text: string, align: 'left' | 'right' = 'right') => ({
    text,
    options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align },
  });

  const headerRow = [
    mkHdr('CONTA', 'left'),
    mkHdr('REAL'),
    mkHdr('ORC'),
    mkHdr('Δ%'),
    mkHdr('JUSTIFICATIVA / SÍNTESE', 'left'),
  ];

  const tableRows: any[][] = [headerRow];

  for (const row of display) {
    const indent   = row.depth === 0 ? '' : row.depth === 1 ? '↳ ' : '    ↳ ';
    const isBold   = row.depth === 0;
    const fontSize = row.depth === 0 ? 7 : row.depth === 1 ? 6.5 : 6;
    const textClr  = row.depth === 2 ? 'EA580C' : C.darkText;
    const dColor   = deltaColor(row.varPct, section.invertDelta);

    tableRows.push([
      { text: `${indent}${truncate(row.label, 45)}`,
        options: { bold: isBold, fontSize, fontFace: FONT, color: textClr, fill: { color: C.white }, align: 'left' } },
      { text: fmtK(row.real),
        options: { bold: isBold, fontSize, fontFace: FONT, color: textClr, fill: { color: C.white }, align: 'right' } },
      { text: fmtK(row.orc),
        options: { bold: isBold, fontSize, fontFace: FONT, color: textClr, fill: { color: C.white }, align: 'right' } },
      { text: fmtPct(row.varPct),
        options: { bold: isBold, fontSize, fontFace: FONT, color: dColor,  fill: { color: C.white }, align: 'right' } },
      { text: `● ${truncate(row.justText, 75)}`,
        options: { fontSize: 6, fontFace: FONT,
          color: row.justText ? C.darkText : C.mutedText,
          fill: { color: C.white }, align: 'left' } },
    ]);
  }

  if (truncated) {
    tableRows.push([
      { text: `…e mais ${remaining} linhas`, options: { italic: true, fontSize: 6, fontFace: FONT, color: C.mutedText, align: 'left' } },
      { text: '', options: {} },
      { text: '', options: {} },
      { text: '', options: {} },
      { text: '', options: {} },
    ]);
  }

  // Table fits between header and footer: h = CONTENT_B - CONTENT_Y = 6.13
  const TABLE_H = CONTENT_B - CONTENT_Y - 0.05;
  const rowH    = Math.min(0.30, TABLE_H / tableRows.length);

  // colW: 3.10 + 1.30 + 1.30 + 1.00 + 6.00 = 12.70
  slide.addTable(tableRows, {
    x: ML, y: CONTENT_Y, w: CW, h: TABLE_H,
    colW: [3.10, 1.30, 1.30, 1.00, 6.00],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });
}

// ═══════════════════════════════════════════════════════════════════
// PER-TAG01 DETAIL SLIDES (1+ slides per tag01, showing marca breakdown
// + AI insights + justificativas; overflow to a complementary slide)
// ═══════════════════════════════════════════════════════════════════

function addTag01DetailSlides(
  pptx: PptxGenJS,
  section: VariancePptSection,
  t01: VariancePptNode,
  data: VariancePptData,
) {
  const a1Label = String(data.a1Year);
  const TITLE   = `${section.label.toUpperCase()} — ${t01.label.toUpperCase()}`;

  // ── Types ──────────────────────────────────────────────────────────
  type TRow = {
    depth: number;      // -1=total, 0=tag02, 1=marca
    label: string;
    real: number;
    orc: number;
    orcPct: number | null;
    a1: number;
    a1Pct: number | null;
  };
  type JustCard = {
    label: string;
    varPct: number | null;
    status: string;
    justText: string;
    owner: string | null;
  };

  // ── Build table rows: TOTAL + tag02 + marca ───────────────────────
  const allRows: TRow[] = [];

  allRows.push({
    depth: -1, label: t01.label,
    real: t01.real, orc: t01.orcCompare, orcPct: t01.orcVarPct,
    a1: t01.a1Compare, a1Pct: t01.a1VarPct,
  });

  for (const t02 of t01.children) {
    allRows.push({
      depth: 0, label: t02.label,
      real: t02.real, orc: t02.orcCompare, orcPct: t02.orcVarPct,
      a1: t02.a1Compare, a1Pct: t02.a1VarPct,
    });
    for (const marca of t02.children) {
      allRows.push({
        depth: 1, label: marca.label,
        real: marca.real, orc: marca.orcCompare, orcPct: marca.orcVarPct,
        a1: marca.a1Compare, a1Pct: marca.a1VarPct,
      });
    }
  }

  // ── Build justification cards (tag02 level only) ─────────────────
  // depth=2 = tag02, depth=3 = marca breakdown.
  // Justificativas são gravadas no nível tag02 no snapshot; os nós de marca
  // (depth=3) herdam o mesmo texto, então coletar depth>=2 duplica os cards.
  // Coletamos apenas depth===2 (tag02) para exibir um card por subconta.
  const allCards: JustCard[] = [];
  const collectJust = (node: VariancePptNode) => {
    const text = node.orcJustification || node.orcAiSummary;
    if (text && node.depth === 2) {
      allCards.push({
        label: node.label,
        varPct: node.orcVarPct,
        status: node.orcStatus,
        justText: text,
        owner: node.ownerName,
      });
    }
    for (const child of node.children) collectJust(child);
  };
  collectJust(t01);

  // ── Split into slide batches ───────────────────────────────────────
  const MAX_DATA_ROWS   = 13;  // data rows per slide (excludes header + total)
  const MAX_CARDS_S1    = 4;   // justification cards on slide 1

  const dataRows     = allRows.slice(1);                           // remove total row
  const s1DataRows   = dataRows.slice(0, MAX_DATA_ROWS);
  const s2DataRows   = dataRows.slice(MAX_DATA_ROWS);
  const cards1       = allCards.slice(0, MAX_CARDS_S1);
  const cards2       = allCards.slice(MAX_CARDS_S1);

  // ── Helper: table header row ──────────────────────────────────────
  const mkHdr = (text: string, align: 'left' | 'right' = 'right') => ({
    text,
    options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align },
  });

  // ── Helper: build a pptxgenjs table data array from TRow[] ────────
  function buildTableData(rows: TRow[], showTotalRow: boolean, hasOverflow: boolean): any[][] {
    const hdr = [
      mkHdr('DESCRIÇÃO / MARCA', 'left'),
      mkHdr(`REAL ${data.year}`),
      mkHdr('ORÇADO'),
      mkHdr('Δ% Orç'),
      mkHdr(a1Label),
      mkHdr(`Δ% ${a1Label}`),
    ];
    const tableData: any[][] = [hdr];

    if (showTotalRow) {
      const tot = allRows[0];
      tableData.push([
        { text: truncate(tot.label, 45), options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'left' } },
        { text: fmtK(tot.real),         options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
        { text: fmtK(tot.orc),          options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
        { text: fmtPct(tot.orcPct),     options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
        { text: fmtK(tot.a1),           options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
        { text: fmtPct(tot.a1Pct),      options: { bold: true, fontSize: 7.5, fontFace: FONT, color: C.white, fill: { color: section.sectionColor }, align: 'right' } },
      ]);
    }

    for (const row of rows) {
      const isT02   = row.depth === 0;
      const isMarca = row.depth === 1;
      const bg      = isT02 ? 'F3F4F6' : C.white;
      const bold    = isT02;
      const fs      = isMarca ? 6.5 : 7;
      const indent  = isMarca ? '    ↳ ' : '';
      const dOrc    = deltaColor(row.orcPct, section.invertDelta);
      const dA1     = deltaColor(row.a1Pct,  section.invertDelta);

      tableData.push([
        { text: `${indent}${truncate(row.label, isMarca ? 35 : 42)}`,
          options: { bold, fontSize: fs, fontFace: FONT, color: C.darkText, fill: { color: bg }, align: 'left' } },
        { text: fmtK(row.real),        options: { bold, fontSize: fs, fontFace: FONT, color: C.darkText, fill: { color: bg }, align: 'right' } },
        { text: fmtK(row.orc),         options: { bold, fontSize: fs, fontFace: FONT, color: C.darkText, fill: { color: bg }, align: 'right' } },
        { text: fmtPct(row.orcPct),    options: { bold, fontSize: fs, fontFace: FONT, color: dOrc,       fill: { color: bg }, align: 'right' } },
        { text: fmtK(row.a1),          options: { bold, fontSize: fs, fontFace: FONT, color: C.darkText, fill: { color: bg }, align: 'right' } },
        { text: fmtPct(row.a1Pct),     options: { bold, fontSize: fs, fontFace: FONT, color: dA1,        fill: { color: bg }, align: 'right' } },
      ]);
    }

    if (hasOverflow) {
      tableData.push([
        { text: `… e mais ${s2DataRows.length} linha(s) no próximo slide`,
          options: { italic: true, fontSize: 6, fontFace: FONT, color: C.mutedText, align: 'left' } },
        { text: '', options: {} }, { text: '', options: {} },
        { text: '', options: {} }, { text: '', options: {} }, { text: '', options: {} },
      ]);
    }
    return tableData;
  }

  // ── Helper: render justification cards (single column) ────────────
  function renderCards(
    slide: PptxGenJS.Slide,
    cards: JustCard[],
    startX: number, startY: number, cardW: number, availH: number,
    titleText: string,
  ) {
    if (cards.length === 0) {
      slide.addShape('roundRect' as any, {
        x: startX, y: startY + 0.28, w: cardW, h: 0.50,
        fill: { color: 'F9FAFB' }, line: { color: 'E5E7EB', width: 0.5 }, rectRadius: 0.06,
      });
      slide.addText('Sem justificativas registradas', {
        x: startX, y: startY + 0.28, w: cardW, h: 0.50,
        fontSize: 8, fontFace: FONT, italic: true, color: C.mutedText,
        align: 'center', valign: 'middle',
      });
      return;
    }

    slide.addText(titleText, {
      x: startX, y: startY, w: cardW, h: 0.26,
      fontSize: 9, fontFace: FONT, bold: true, color: section.sectionColor,
    });

    const SLOT   = Math.min(0.74, (availH - 0.30) / cards.length);
    const CARD_H = SLOT - 0.06;

    cards.forEach((card, idx) => {
      const cy = startY + 0.28 + idx * SLOT;
      if (cy + CARD_H > CONTENT_B) return; // guard

      const dColor = deltaColor(card.varPct, section.invertDelta);
      const sColor = statusDot(card.status);

      // Card background
      slide.addShape('roundRect' as any, {
        x: startX, y: cy, w: cardW, h: CARD_H,
        fill: { color: C.white }, line: { color: 'E5E7EB', width: 0.5 }, rectRadius: 0.06,
      });
      // Left accent bar (delta color)
      slide.addShape('rect' as any, {
        x: startX, y: cy, w: 0.06, h: CARD_H,
        fill: { color: dColor },
      });
      // Label
      slide.addText(truncate(card.label, 28), {
        x: startX + 0.13, y: cy + 0.05, w: cardW - 1.60, h: 0.20,
        fontSize: 7.5, fontFace: FONT, bold: true, color: C.darkText,
      });
      // Delta %
      slide.addText(fmtPct(card.varPct), {
        x: startX + cardW - 1.54, y: cy + 0.05, w: 1.48, h: 0.20,
        fontSize: 8, fontFace: FONT, bold: true, color: dColor, align: 'right',
      });
      // Status dot
      slide.addShape('rect' as any, {
        x: startX + 0.13, y: cy + 0.28, w: 0.10, h: 0.10,
        fill: { color: sColor },
      });
      // Owner name
      if (card.owner) {
        slide.addText(card.owner, {
          x: startX + 0.27, y: cy + 0.25, w: cardW - 0.35, h: 0.16,
          fontSize: 6, fontFace: FONT, italic: true, color: C.mutedText,
        });
      }
      // Justification text
      slide.addText(truncate(card.justText, 130), {
        x: startX + 0.13, y: cy + 0.44, w: cardW - 0.21, h: CARD_H - 0.51,
        fontSize: 6.5, fontFace: FONT, color: C.darkText,
        lineSpacingMultiple: 1.3, valign: 'top',
      });
    });
  }

  // ════════════════════════════════════════════════════════════════
  // SLIDE 1
  // ════════════════════════════════════════════════════════════════
  {
    const slide = pptx.addSlide();
    addHeaderBar(slide, TITLE, data.monthShort, section.sectionColor);
    addFooterBar(slide);

    const tableData = buildTableData(s1DataRows, true, s2DataRows.length > 0);
    const TABLE_H   = 3.20;
    const rowH      = Math.min(0.27, TABLE_H / tableData.length);
    const actualTH  = rowH * tableData.length;

    // colW: 3.80 + 1.80 + 1.80 + 1.50 + 1.80 + 2.00 = 12.70
    slide.addTable(tableData, {
      x: ML, y: CONTENT_Y, w: CW, h: actualTH,
      colW: [3.80, 1.80, 1.80, 1.50, 1.80, 2.00],
      border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
      autoPage: false,
      rowH,
    });

    // Bottom area: AI box (left 55%) + justification cards (right 45%)
    const BOT_Y = Math.max(CONTENT_Y + actualTH + 0.18, 4.10);
    const BOT_H = CONTENT_B - BOT_Y;

    if (BOT_H > 0.6) {
      const AI_W     = 6.90;
      const CARD_X   = ML + AI_W + 0.20;   // 7.40
      const CARD_W   = SLIDE_W - MR - CARD_X; // 5.60

      // AI insights box
      const insightText = t01.enrichedInsight || t01.orcAiSummary || '';
      addInsightsBox(slide, insightText, ML, BOT_Y, AI_W, BOT_H);

      // Justification cards
      renderCards(slide, cards1, CARD_X, BOT_Y, CARD_W, BOT_H, 'JUSTIFICATIVAS');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SLIDE 2 — complementary (only if overflow)
  // ════════════════════════════════════════════════════════════════
  if (s2DataRows.length === 0 && cards2.length === 0) return;

  {
    const slide = pptx.addSlide();
    addHeaderBar(slide, `${TITLE} — COMPLEMENTO`, data.monthShort, section.sectionColor);
    addFooterBar(slide);

    let currentY = CONTENT_Y;

    // Overflow table rows (if any)
    if (s2DataRows.length > 0) {
      const tData2  = buildTableData(s2DataRows, false, false);
      const TH2     = Math.min(2.80, tData2.length * 0.28);
      const rH2     = TH2 / tData2.length;

      slide.addTable(tData2, {
        x: ML, y: currentY, w: CW, h: TH2,
        colW: [3.80, 1.80, 1.80, 1.50, 1.80, 2.00],
        border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
        autoPage: false,
        rowH: rH2,
      });
      currentY += TH2 + 0.20;
    }

    // Remaining justification cards — 2-column grid
    if (cards2.length > 0) {
      const COL_W   = (CW - 0.20) / 2; // 6.25 each
      const AVAIL_H = CONTENT_B - currentY - 0.30;
      const maxRows = Math.max(1, Math.floor(AVAIL_H / 0.76));
      const SLOT    = AVAIL_H / Math.min(Math.ceil(cards2.length / 2), maxRows);
      const CARD_H  = Math.min(0.72, SLOT - 0.06);

      slide.addText('JUSTIFICATIVAS (CONTINUAÇÃO)', {
        x: ML, y: currentY, w: CW, h: 0.26,
        fontSize: 9, fontFace: FONT, bold: true, color: section.sectionColor,
      });
      currentY += 0.30;

      cards2.slice(0, maxRows * 2).forEach((card, idx) => {
        const col    = idx % 2;
        const row    = Math.floor(idx / 2);
        const cx     = ML + col * (COL_W + 0.20);
        const cy     = currentY + row * (CARD_H + 0.06);

        if (cy + CARD_H > CONTENT_B) return;

        const dColor = deltaColor(card.varPct, section.invertDelta);
        const sColor = statusDot(card.status);

        slide.addShape('roundRect' as any, {
          x: cx, y: cy, w: COL_W, h: CARD_H,
          fill: { color: C.white }, line: { color: 'E5E7EB', width: 0.5 }, rectRadius: 0.06,
        });
        slide.addShape('rect' as any, {
          x: cx, y: cy, w: 0.06, h: CARD_H,
          fill: { color: dColor },
        });
        slide.addText(truncate(card.label, 26), {
          x: cx + 0.13, y: cy + 0.05, w: COL_W - 1.54, h: 0.20,
          fontSize: 7.5, fontFace: FONT, bold: true, color: C.darkText,
        });
        slide.addText(fmtPct(card.varPct), {
          x: cx + COL_W - 1.44, y: cy + 0.05, w: 1.38, h: 0.20,
          fontSize: 8, fontFace: FONT, bold: true, color: dColor, align: 'right',
        });
        slide.addShape('rect' as any, {
          x: cx + 0.13, y: cy + 0.28, w: 0.10, h: 0.10,
          fill: { color: sColor },
        });
        if (card.owner) {
          slide.addText(card.owner, {
            x: cx + 0.27, y: cy + 0.25, w: COL_W - 0.35, h: 0.16,
            fontSize: 6, fontFace: FONT, italic: true, color: C.mutedText,
          });
        }
        slide.addText(truncate(card.justText, 110), {
          x: cx + 0.13, y: cy + 0.44, w: COL_W - 0.21, h: CARD_H - 0.51,
          fontSize: 6.5, fontFace: FONT, color: C.darkText,
          lineSpacingMultiple: 1.3, valign: 'top',
        });
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARCA BREAKDOWN SLIDES (1 per tag0 — clustered bar chart)
// ═══════════════════════════════════════════════════════════════════

function addMarcaSlide(
  pptx: PptxGenJS,
  section: VariancePptSection,
  data: VariancePptData,
  entries: VariancePptMarcaEntry[],
) {
  if (entries.length === 0) return;

  const slide = pptx.addSlide();
  addHeaderBar(slide, `${section.label.toUpperCase()} — BREAKDOWN POR MARCA`, data.monthShort, section.sectionColor);
  addFooterBar(slide);

  // Filter out RZ (CSC — no revenue, pure rateio)
  const filtered  = entries.filter(e => e.marca !== 'RZ');
  const totalReal = filtered.reduce((s, e) => s + e.real, 0);
  const totalOrc  = filtered.reduce((s, e) => s + e.orcado, 0);

  const labels = filtered.map(e => e.marca);
  const realK  = filtered.map(e => Math.round(e.real   / 1000));
  const orcK   = filtered.map(e => Math.round(e.orcado / 1000));
  const a1K    = filtered.map(e => Math.round(e.a1     / 1000));

  // ── Chart: left 72% ───────────────────────────────────────────────
  const CHART_W = 9.40;
  slide.addChart('bar' as any, [
    { name: 'Real',    labels, values: realK },
    { name: 'Orçado',  labels, values: orcK  },
    { name: `${data.a1Year}`, labels, values: a1K },
  ], {
    x: ML, y: CONTENT_Y, w: CHART_W, h: 5.10,
    barGrouping: 'clustered',
    chartColors: [section.sectionColor, C.orcado, C.teal],
    showValue: true,
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 7,
    dataLabelColor: C.darkText,
    catAxisLabelColor: C.mutedText,
    catAxisLabelFontSize: 9,
    valAxisLabelColor: C.mutedText,
    valAxisLabelFontSize: 7,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 9,
  });

  // ── KPI cards: right panel (x=9.90 → 13.00, w=3.10) ─────────────
  const KX  = 9.90;
  const KW  = 3.10;   // ends at 13.00 ✓
  const KH  = 0.88;   // card height

  const deltaAbs  = totalReal - totalOrc;
  const deltaPct  = totalOrc !== 0
    ? Math.round(((totalReal - totalOrc) / Math.abs(totalOrc)) * 1000) / 10
    : null;
  const favorable = section.invertDelta
    ? (deltaPct !== null && deltaPct <= 0)
    : (deltaPct !== null && deltaPct >= 0);

  addKpiCard(slide, 'TOTAL REAL',
    `R$ ${fmtK(totalReal)} mil`,
    section.sectionColor, KX, CONTENT_Y + 0.15, KW, KH);

  addKpiCard(slide, 'TOTAL ORÇADO',
    `R$ ${fmtK(totalOrc)} mil`,
    C.orcado, KX, CONTENT_Y + 0.15 + KH + 0.12, KW, KH);

  addKpiCard(slide,
    deltaAbs >= 0 ? 'ECONOMIA' : 'DESVIO',
    `${fmtPct(deltaPct)}  (${fmtK(Math.abs(deltaAbs))} mil)`,
    favorable ? C.deltaPositivo : C.deltaNegativo,
    KX, CONTENT_Y + 0.15 + (KH + 0.12) * 2, KW, KH);
}

// ═══════════════════════════════════════════════════════════════════
// FINAL SLIDE — RESUMO DE COBERTURA
// ═══════════════════════════════════════════════════════════════════

function addSummarySlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();
  addHeaderBar(slide, 'RESUMO — COBERTURA DE JUSTIFICATIVAS', data.monthShort);
  addFooterBar(slide);

  const { stats } = data;

  // ── LEFT PANEL: Coverage metrics (x=0.30, w=5.80) ─────────────────
  const LP_X = ML;
  const LP_W = 5.80;

  // Large % number
  slide.addText(`${stats.coveragePct}%`, {
    x: LP_X, y: 1.10, w: LP_W, h: 1.40,
    fontSize: 72, fontFace: FONT, bold: true,
    color: stats.coveragePct >= 80 ? C.approved
         : stats.coveragePct >= 50 ? C.pending
         : C.rejected,
    align: 'center',
  });
  slide.addText('Cobertura de Justificativas', {
    x: LP_X, y: 2.55, w: LP_W, h: 0.32,
    fontSize: 13, fontFace: FONT, color: C.headerBg, align: 'center',
  });

  // Segmented progress bar
  const BAR_Y = 3.10;
  const BAR_W = LP_W;
  const total = stats.totalLeaves || 1;

  const segments = [
    { count: stats.approved,               color: C.approved,  label: 'Aprovados'   },
    { count: stats.justified,              color: C.justified, label: 'Justificados' },
    { count: stats.pending + stats.notified, color: C.pending, label: 'Pendentes'   },
    { count: stats.rejected,               color: C.rejected,  label: 'Rejeitados'  },
  ];

  // Bar background track
  slide.addShape('roundRect' as any, {
    x: LP_X, y: BAR_Y, w: BAR_W, h: 0.30,
    fill: { color: 'E5E7EB' }, rectRadius: 0.04,
  });
  let barX = LP_X;
  for (const seg of segments) {
    const segW = (seg.count / total) * BAR_W;
    if (segW > 0.02) {
      slide.addShape('rect' as any, {
        x: barX, y: BAR_Y, w: segW, h: 0.30,
        fill: { color: seg.color },
      });
      barX += segW;
    }
  }

  // Legend
  segments.forEach((seg, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const lx2 = LP_X + col * (LP_W / 2);
    const ly  = BAR_Y + 0.40 + row * 0.24;

    slide.addShape('rect' as any, {
      x: lx2, y: ly + 0.03, w: 0.12, h: 0.12,
      fill: { color: seg.color },
    });
    slide.addText(`${seg.label}: ${seg.count}`, {
      x: lx2 + 0.16, y: ly, w: (LP_W / 2) - 0.20, h: 0.18,
      fontSize: 7, fontFace: FONT, color: C.darkText,
    });
  });

  slide.addText(`Total: ${stats.totalLeaves} contas  |  Versão ${data.version}`, {
    x: LP_X, y: BAR_Y + 1.02, w: LP_W, h: 0.20,
    fontSize: 7, fontFace: FONT, bold: true, color: C.mutedText, align: 'center',
  });

  // ── RIGHT PANEL: Top unjustified (x=6.40, w=6.60) ─────────────────
  // Right panel ends at 13.00 ✓
  const RP_X  = 6.40;
  const RP_W  = 13.00 - RP_X; // 6.60

  slide.addText('TOP DESVIOS NÃO JUSTIFICADOS', {
    x: RP_X, y: 1.00, w: RP_W, h: 0.30,
    fontSize: 10, fontFace: FONT, bold: true, color: C.rejected,
  });

  // Collect unjustified leaves
  const unjustified: { label: string; tag0: string; varPct: number; invert: boolean }[] = [];
  for (const section of data.sections) {
    const collectLeaves = (node: VariancePptNode) => {
      if (node.children.length === 0 && node.depth >= 1) {
        if (node.orcStatus !== 'approved' && node.orcStatus !== 'justified') {
          unjustified.push({
            label: node.label,
            tag0: section.tag0.slice(0, 3),
            varPct: node.orcVarPct || 0,
            invert: section.invertDelta,
          });
        }
      }
      for (const child of node.children) collectLeaves(child);
    };
    for (const t01 of section.tag01Nodes) collectLeaves(t01);
  }

  unjustified.sort((a, b) => Math.abs(b.varPct) - Math.abs(a.varPct));

  // Max 7 items, each 0.50h slot — last item ends at 1.40 + 7×0.50 = 4.90 ✓ (safe before closing at 5.10)
  const MAX_ITEMS = 7;
  const ITEM_SLOT = 0.50;
  const ITEM_H    = 0.44;
  const topUnjust = unjustified.slice(0, MAX_ITEMS);

  topUnjust.forEach((item, idx) => {
    const iy = 1.45 + idx * ITEM_SLOT;
    if (iy + ITEM_H > 5.05) return; // guard

    const dColor = deltaColor(item.varPct, item.invert);

    slide.addShape('roundRect' as any, {
      x: RP_X, y: iy, w: RP_W, h: ITEM_H,
      fill: { color: C.white },
      line: { color: 'E5E7EB', width: 0.5 },
      rectRadius: 0.05,
    });
    slide.addShape('rect' as any, {
      x: RP_X, y: iy, w: 0.05, h: ITEM_H,
      fill: { color: C.rejected },
    });
    slide.addText(`${item.tag0}  ${truncate(item.label, 38)}`, {
      x: RP_X + 0.12, y: iy + 0.04, w: RP_W - 1.70, h: 0.20,
      fontSize: 7, fontFace: FONT, bold: true, color: C.darkText,
    });
    slide.addText(fmtPct(item.varPct), {
      x: RP_X + RP_W - 1.60, y: iy + 0.04, w: 1.55, h: 0.20,
      fontSize: 8, fontFace: FONT, bold: true, color: dColor, align: 'right',
    });
    slide.addText('Sem justificativa', {
      x: RP_X + 0.12, y: iy + 0.24, w: RP_W - 0.20, h: 0.16,
      fontSize: 6, fontFace: FONT, italic: true, color: C.mutedText,
    });
  });

  if (unjustified.length === 0) {
    slide.addText('Todas as contas estão justificadas!', {
      x: RP_X, y: 2.20, w: RP_W, h: 0.50,
      fontSize: 12, fontFace: FONT, bold: true, color: C.approved, align: 'center',
    });
  }

  // ── BOTTOM FULL-WIDTH: Closing AI summary ─────────────────────────
  // Starts at 5.10, ends at CONTENT_B (6.98) — 1.88h available
  if (data.closingSummary) {
    const SUMM_Y = 5.12;
    const SUMM_H = CONTENT_B - SUMM_Y; // ~1.86
    addInsightsBox(slide, data.closingSummary, ML, SUMM_Y, CW, SUMM_H);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Generate Variance PPT
// ═══════════════════════════════════════════════════════════════════

export async function generateVariancePpt(data: VariancePptData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout  = 'LAYOUT_WIDE';
  pptx.author  = 'DRE Raiz — Plataforma Financeira';
  pptx.company = 'Raiz Educação S.A.';
  pptx.title   = `Justificativas de Desvios — ${data.monthLabel}`;

  addCoverSlide(pptx, data);
  addOverviewSlide(pptx, data);

  for (const section of data.sections) {
    addSectionSlide(pptx, section, data);

    if (section.tag0.startsWith('01.')) {
      // RECEITA LÍQUIDA: one detail slide per tag01 (marca + AI + justificativas)
      for (const t01 of section.tag01Nodes) {
        addTag01DetailSlides(pptx, section, t01, data);
      }
    } else if (section.tag01Nodes.length > 0) {
      // Other sections: keep existing detail slide (unchanged)
      addDetailSlide(pptx, section, data);
    }

    const marcaEntries = data.marcaBreakdowns?.[section.tag0];
    if (marcaEntries && marcaEntries.length > 0) {
      addMarcaSlide(pptx, section, data, marcaEntries);
    }
  }

  addSummarySlide(pptx, data);

  const marcaSuffix = data.marca ? `_${data.marca}` : '';
  const filename = `Justificativas_Desvios_${data.monthShort.replace('/', '_')}${marcaSuffix}.pptx`;
  await pptx.writeFile({ fileName: filename });
}
