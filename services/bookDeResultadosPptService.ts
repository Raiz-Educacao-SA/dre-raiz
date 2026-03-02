// ─── Book de Resultados — PPTX Rendering Service ─────────────────
import PptxGenJS from 'pptxgenjs';
import {
  BookDeResultadosData, BookSectionData, BookFullDREData, BookDREGroup,
  BookCalcRow, BookKPI, PerformanceBlock, BOOK_COLORS,
} from './bookDeResultadosTypes';

// ─── Constants ────────────────────────────────────────────────────
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const FONT = 'Calibri';

// ─── Formatting Helpers ──────────────────────────────────────────

function fmtK(v: number): string {
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

function fmtPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function deltaColor(v: number, invert: boolean): string {
  const favorable = invert ? v <= 0 : v >= 0;
  return favorable ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo;
}

// ─── Header Bar (shared across slide types) ──────────────────────

function addHeaderBar(
  slide: PptxGenJS.Slide,
  title: string,
  monthShort: string,
  iconText?: string,
) {
  // Dark header background
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: SLIDE_W, h: 0.65,
    fill: { color: BOOK_COLORS.headerBg },
  });

  // Icon + Title
  const prefix = iconText ? `${iconText}  ` : '';
  slide.addText(`${prefix}${title}`, {
    x: 0.4, y: 0.1, w: 7, h: 0.45,
    fontSize: 16, fontFace: FONT, bold: true,
    color: BOOK_COLORS.white,
  });

  // "UNIDADE: MILHARES (R$)" badge
  slide.addShape('roundRect' as any, {
    x: 8.5, y: 0.13, w: 2.2, h: 0.38,
    fill: { color: '2D3748' }, rectRadius: 0.05,
  });
  slide.addText('UNIDADE: MILHARES (R$)', {
    x: 8.5, y: 0.13, w: 2.2, h: 0.38,
    fontSize: 8, fontFace: FONT, bold: true,
    color: BOOK_COLORS.mutedText, align: 'center',
  });

  // Month badge
  slide.addShape('roundRect' as any, {
    x: 11.0, y: 0.13, w: 1.2, h: 0.38,
    fill: { color: BOOK_COLORS.accent }, rectRadius: 0.05,
  });
  slide.addText(monthShort, {
    x: 11.0, y: 0.13, w: 1.2, h: 0.38,
    fontSize: 9, fontFace: FONT, bold: true,
    color: BOOK_COLORS.white, align: 'center',
  });
}

// ─── Financial Table ─────────────────────────────────────────────

function buildTableRows(group: BookDREGroup, invert: boolean): any[][] {
  // Header row
  const headerRow = [
    { text: 'DESCRIÇÃO', options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'left' } },
    { text: 'REAL', options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'ORÇADO', options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'DELTA Orç', options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: (new Date().getFullYear() - 1).toString(), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: `DELTA ${(new Date().getFullYear() - 1).toString().slice(2)}`, options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
  ];

  const rows: any[][] = [headerRow];

  // Data rows
  for (const item of group.items) {
    const dOrcColor = deltaColor(item.deltaOrc, invert);
    const dA1Color  = deltaColor(item.deltaA1, invert);
    rows.push([
      { text: item.tag01, options: { fontSize: 7, fontFace: FONT, color: BOOK_COLORS.darkText, align: 'left' } },
      { text: fmtK(item.real), options: { fontSize: 7, fontFace: FONT, color: BOOK_COLORS.darkText, align: 'right' } },
      { text: fmtK(item.orcado), options: { fontSize: 7, fontFace: FONT, color: BOOK_COLORS.mutedText, align: 'right' } },
      { text: `${fmtK(item.deltaOrc)} (${fmtPct(item.deltaOrcPct)})`, options: { fontSize: 7, fontFace: FONT, color: dOrcColor, align: 'right' } },
      { text: fmtK(item.a1), options: { fontSize: 7, fontFace: FONT, color: BOOK_COLORS.mutedText, align: 'right' } },
      { text: `${fmtK(item.deltaA1)} (${fmtPct(item.deltaA1Pct)})`, options: { fontSize: 7, fontFace: FONT, color: dA1Color, align: 'right' } },
    ]);
  }

  // Total row
  const tOrcColor = deltaColor(group.deltaOrc, invert);
  const tA1Color  = deltaColor(group.deltaA1, invert);
  rows.push([
    { text: 'TOTAL', options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '374151' } } },
    { text: fmtK(group.totalReal), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '374151' }, align: 'right' } },
    { text: fmtK(group.totalOrcado), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '374151' }, align: 'right' } },
    { text: `${fmtK(group.deltaOrc)} (${fmtPct(group.deltaOrcPct)})`, options: { bold: true, fontSize: 7, fontFace: FONT, color: tOrcColor, fill: { color: '374151' }, align: 'right' } },
    { text: fmtK(group.totalA1), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '374151' }, align: 'right' } },
    { text: `${fmtK(group.deltaA1)} (${fmtPct(group.deltaA1Pct)})`, options: { bold: true, fontSize: 7, fontFace: FONT, color: tA1Color, fill: { color: '374151' }, align: 'right' } },
  ]);

  return rows;
}

function addFinancialTable(slide: PptxGenJS.Slide, group: BookDREGroup, x: number, y: number, w: number, h: number, invert: boolean) {
  const rows = buildTableRows(group, invert);
  slide.addTable(rows, {
    x, y, w, h,
    colW: [w * 0.30, w * 0.14, w * 0.14, w * 0.14, w * 0.14, w * 0.14],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH: 0.25,
  });
}

// ─── Full DRE Table (for slide type 4) ───────────────────────────

function buildFullDRETableRows(groups: BookDREGroup[], calcRows: BookCalcRow[]): any[][] {
  const headerRow = [
    { text: 'DESCRIÇÃO', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg } } },
    { text: 'REAL', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'ORÇADO', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'Δ Orç', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'A-1', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
    { text: 'Δ A-1', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: BOOK_COLORS.headerBg }, align: 'right' } },
  ];

  const rows: any[][] = [headerRow];
  const margemCalc = calcRows.find(c => c.label === 'MARGEM DE CONTRIBUIÇÃO');
  const ebitdaCalc = calcRows.find(c => c.label === 'EBITDA');

  for (const group of groups) {
    const isExpense = group.tag0.startsWith('02.') || group.tag0.startsWith('03.') || group.tag0.startsWith('04.');
    const inv = isExpense;

    // Group header row
    const dOrcColor = deltaColor(group.deltaOrc, inv);
    const dA1Color  = deltaColor(group.deltaA1, inv);
    rows.push([
      { text: group.tag0, options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '4B5563' } } },
      { text: fmtK(group.totalReal), options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtK(group.totalOrcado), options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtPct(group.deltaOrcPct), options: { bold: true, fontSize: 6.5, fontFace: FONT, color: dOrcColor, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtK(group.totalA1), options: { bold: true, fontSize: 6.5, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtPct(group.deltaA1Pct), options: { bold: true, fontSize: 6.5, fontFace: FONT, color: dA1Color, fill: { color: '4B5563' }, align: 'right' } },
    ]);

    // Insert MARGEM after 03. group
    if (group.tag0.startsWith('03.') && margemCalc) {
      addCalcRowToTable(rows, margemCalc, BOOK_COLORS.accent);
    }
  }

  // EBITDA at the end
  if (ebitdaCalc) {
    addCalcRowToTable(rows, ebitdaCalc, BOOK_COLORS.headerBg);
  }

  return rows;
}

function addCalcRowToTable(rows: any[][], calc: BookCalcRow, bgColor: string) {
  const dOrcColor = calc.deltaOrcPct >= 0 ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo;
  const dA1Color  = calc.deltaA1Pct >= 0 ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo;
  rows.push([
    { text: calc.label, options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: bgColor } } },
    { text: fmtK(calc.real), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.orcado), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaOrcPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dOrcColor, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.a1), options: { bold: true, fontSize: 7, fontFace: FONT, color: BOOK_COLORS.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaA1Pct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dA1Color, fill: { color: bgColor }, align: 'right' } },
  ]);
}

// ─── Grouped Bar Chart ───────────────────────────────────────────

function addGroupedBarChart(
  slide: PptxGenJS.Slide,
  labels: string[],
  realValues: number[],
  orcadoValues: number[],
  x: number, y: number, w: number, h: number,
  sectionColor: string,
) {
  // Convert values to thousands
  const realK = realValues.map(v => Math.round(v / 1000));
  const orcK  = orcadoValues.map(v => Math.round(v / 1000));

  slide.addChart('bar' as any, [
    { name: 'Real',   labels, values: realK },
    { name: 'Orçado', labels, values: orcK },
  ], {
    x, y, w, h,
    barGrouping: 'clustered',
    chartColors: [sectionColor, BOOK_COLORS.orcado],
    showValue: true,
    dataLabelPosition: 'outEnd',
    dataLabelFontSize: 7,
    dataLabelColor: BOOK_COLORS.darkText,
    catAxisLabelFontSize: 7,
    valAxisLabelFontSize: 7,
    catAxisOrientation: 'minMax',
    valAxisOrientation: 'minMax',
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 7,
    showTitle: false,
  } as any);
}

// ─── KPI Card ────────────────────────────────────────────────────

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
    fill: { color: BOOK_COLORS.white },
    shadow: { type: 'outer', blur: 4, offset: 2, color: '00000020' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });

  // Color accent bar at top
  slide.addShape('rect' as any, {
    x: x + 0.05, y: y + 0.05, w: w - 0.1, h: 0.04,
    fill: { color },
  });

  // Value
  slide.addText(value, {
    x, y: y + 0.12, w, h: 0.35,
    fontSize: 18, fontFace: FONT, bold: true,
    color, align: 'center',
  });

  // Label
  slide.addText(label, {
    x, y: y + 0.45, w, h: 0.25,
    fontSize: 7, fontFace: FONT, bold: true,
    color: BOOK_COLORS.mutedText, align: 'center',
  });
}

// ─── Insights Box ────────────────────────────────────────────────

function addInsightsBox(
  slide: PptxGenJS.Slide,
  insights: string[],
  x: number, y: number, w: number, h: number,
) {
  // Dark background
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: BOOK_COLORS.headerBg },
    rectRadius: 0.08,
  });

  // Title
  slide.addText('💡  INSIGHTS', {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true,
    color: BOOK_COLORS.accent,
  });

  // Bullets
  const bulletText = insights.map(i => `•  ${i}`).join('\n');
  slide.addText(bulletText, {
    x: x + 0.15, y: y + 0.35, w: w - 0.3, h: h - 0.5,
    fontSize: 7.5, fontFace: FONT,
    color: 'D1D5DB',
    lineSpacingMultiple: 1.4,
    valign: 'top',
  });
}

// ─── Analysis Panel (Full DRE slide type) ────────────────────────

function addAnalysisPanel(
  slide: PptxGenJS.Slide,
  blocks: PerformanceBlock[],
  x: number, y: number, w: number, h: number,
) {
  // Panel background
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: 'F9FAFB' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });

  // Title
  slide.addText('📋  Análise de Performance', {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.3,
    fontSize: 10, fontFace: FONT, bold: true,
    color: BOOK_COLORS.headerBg,
  });

  // Blocks
  const blockH = Math.min(0.85, (h - 0.55) / blocks.length);
  blocks.forEach((block, idx) => {
    const by = y + 0.45 + idx * blockH;

    // Left border accent
    slide.addShape('rect' as any, {
      x: x + 0.15, y: by, w: 0.04, h: blockH - 0.08,
      fill: { color: block.color },
    });

    // Block title
    slide.addText(`${block.icon}  ${block.title}`, {
      x: x + 0.28, y: by, w: w - 0.5, h: 0.2,
      fontSize: 8, fontFace: FONT, bold: true,
      color: BOOK_COLORS.headerBg,
    });

    // Block text
    slide.addText(block.text, {
      x: x + 0.28, y: by + 0.2, w: w - 0.5, h: blockH - 0.3,
      fontSize: 7, fontFace: FONT,
      color: BOOK_COLORS.mutedText,
      lineSpacingMultiple: 1.3,
      valign: 'top',
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE TYPE 1: COVER
// ═══════════════════════════════════════════════════════════════════

function addCoverSlide(pptx: PptxGenJS, data: BookDeResultadosData) {
  const slide = pptx.addSlide();

  // Decorative bars top-right
  slide.addShape('rect' as any, { x: 10.8, y: 0.3, w: 0.15, h: 1.2, fill: { color: BOOK_COLORS.accent } });
  slide.addShape('rect' as any, { x: 11.1, y: 0.5, w: 0.15, h: 1.0, fill: { color: BOOK_COLORS.teal } });
  slide.addShape('rect' as any, { x: 11.4, y: 0.7, w: 0.15, h: 0.8, fill: { color: '8B5CF6' } }); // purple

  // "RAIZ" logo text
  slide.addText('RAIZ', {
    x: 0.5, y: 0.4, w: 3, h: 0.5,
    fontSize: 28, fontFace: FONT, bold: true,
    color: BOOK_COLORS.accent,
  });

  // "FINANCEIRO" subtitle
  slide.addText('FINANCEIRO', {
    x: 0.5, y: 0.85, w: 3, h: 0.3,
    fontSize: 11, fontFace: FONT, bold: true,
    color: BOOK_COLORS.mutedText,
    charSpacing: 4,
  });

  // Main title
  slide.addText('Book de Resultados\nCSC - DRE', {
    x: 0.5, y: 2.5, w: 8, h: 1.5,
    fontSize: 36, fontFace: FONT, bold: true,
    color: BOOK_COLORS.accent,
    lineSpacingMultiple: 1.2,
  });

  // Teal divider bar
  slide.addShape('rect' as any, {
    x: 0.5, y: 4.2, w: 4, h: 0.06,
    fill: { color: BOOK_COLORS.teal },
  });

  // Month/Year
  slide.addText(data.monthLabel, {
    x: 0.5, y: 4.5, w: 5, h: 0.5,
    fontSize: 18, fontFace: FONT,
    color: BOOK_COLORS.headerBg,
  });

  // Bottom accent bar
  slide.addShape('rect' as any, {
    x: 0, y: 7.2, w: SLIDE_W, h: 0.3,
    fill: { color: BOOK_COLORS.accent },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE TYPE 2: SECTION ANALYSIS (4 quadrants)
// ═══════════════════════════════════════════════════════════════════

function addSectionAnalysisSlide(pptx: PptxGenJS, section: BookSectionData, data: BookDeResultadosData) {
  const slide = pptx.addSlide();
  const { config, consolidated, kpis, insights } = section;

  // Header
  addHeaderBar(slide, config.label.toUpperCase(), data.monthShort, '📊');

  // Top-Left: Financial Table (55% width)
  addFinancialTable(slide, consolidated, 0.3, 0.85, 7.0, 3.2, config.invertDelta);

  // Top-Right: Grouped Bar Chart (45% width)
  if (consolidated.items.length > 0) {
    const labels = consolidated.items.map(i => i.tag01.length > 20 ? i.tag01.slice(0, 18) + '…' : i.tag01);
    const reals = consolidated.items.map(i => i.real);
    const orcados = consolidated.items.map(i => i.orcado);
    addGroupedBarChart(slide, labels, reals, orcados, 7.5, 0.85, 5.5, 3.2, config.color);
  }

  // Bottom-Left: Insights box
  addInsightsBox(slide, insights, 0.3, 4.3, 7.0, 2.8);

  // Bottom-Right: KPI cards
  kpis.forEach((kpi, idx) => {
    addKpiCard(slide, kpi.label, kpi.value, kpi.color, 7.8 + idx * 2.6, 4.6, 2.3, 0.8);
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE TYPE 3: BRAND COMPARISON
// ═══════════════════════════════════════════════════════════════════

function addBrandComparisonSlide(pptx: PptxGenJS, section: BookSectionData, data: BookDeResultadosData) {
  const slide = pptx.addSlide();
  const { config, brands, consolidated } = section;

  // Header
  addHeaderBar(slide, `${config.label.toUpperCase()} — POR MARCA`, data.monthShort, '🏢');

  if (brands.length === 0) return;

  // Center: Grouped bar chart with all brands
  const labels = brands.map(b => b.marca);
  const reals  = brands.map(b => b.group.totalReal);
  const orcados = brands.map(b => b.group.totalOrcado);
  addGroupedBarChart(slide, labels, reals, orcados, 0.5, 0.85, 12.3, 3.8, config.color);

  // Bottom: 4 KPI cards
  const totalReal   = consolidated.totalReal;
  const totalOrcado = consolidated.totalOrcado;
  const variacao    = consolidated.deltaOrcPct;
  const aderencia   = totalOrcado !== 0 ? (totalReal / totalOrcado * 100) : 0;

  const bottomKpis: BookKPI[] = [
    { label: 'TOTAL REAL',    value: `R$ ${fmtK(totalReal)} mil`, color: config.color },
    { label: 'TOTAL ORÇADO',  value: `R$ ${fmtK(totalOrcado)} mil`, color: BOOK_COLORS.orcado },
    { label: 'VARIAÇÃO',      value: fmtPct(variacao), color: deltaColor(variacao, config.invertDelta) },
    { label: 'ADERÊNCIA',     value: `${aderencia.toFixed(1)}%`, color: Math.abs(aderencia - 100) <= 5 ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo },
  ];

  bottomKpis.forEach((kpi, idx) => {
    addKpiCard(slide, kpi.label, kpi.value, kpi.color, 0.5 + idx * 3.15, 5.0, 2.8, 0.9);
  });

  // Analysis cards for notable brands
  const sorted = [...brands].sort((a, b) => {
    const da = Math.abs(a.group.deltaOrcPct);
    const db = Math.abs(b.group.deltaOrcPct);
    return db - da;
  });

  const notable = sorted.slice(0, 3);
  notable.forEach((brand, idx) => {
    const favorable = config.invertDelta ? brand.group.deltaOrc <= 0 : brand.group.deltaOrc >= 0;
    const borderColor = favorable ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo;
    const bx = 0.5 + idx * 4.2;
    const by = 6.15;

    // Card with colored left border
    slide.addShape('roundRect' as any, {
      x: bx, y: by, w: 3.9, h: 0.95,
      fill: { color: BOOK_COLORS.white },
      line: { color: 'E5E7EB', width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addShape('rect' as any, {
      x: bx, y: by, w: 0.06, h: 0.95,
      fill: { color: borderColor },
    });
    slide.addText(brand.marca, {
      x: bx + 0.15, y: by + 0.05, w: 3.6, h: 0.25,
      fontSize: 8, fontFace: FONT, bold: true, color: BOOK_COLORS.headerBg,
    });
    slide.addText(`Real: R$ ${fmtK(brand.group.totalReal)} mil  |  Δ Orç: ${fmtPct(brand.group.deltaOrcPct)}`, {
      x: bx + 0.15, y: by + 0.3, w: 3.6, h: 0.2,
      fontSize: 7, fontFace: FONT, color: BOOK_COLORS.mutedText,
    });
    slide.addText(favorable ? '▲ Favorável' : '▼ Desfavorável', {
      x: bx + 0.15, y: by + 0.55, w: 3.6, h: 0.2,
      fontSize: 7, fontFace: FONT, bold: true, color: borderColor,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE TYPE 4: FULL DRE (per brand or consolidated)
// ═══════════════════════════════════════════════════════════════════

function addFullDRESlide(pptx: PptxGenJS, dreData: BookFullDREData, data: BookDeResultadosData) {
  const slide = pptx.addSlide();
  const { entityName, groups, calcRows, statusBadge, performanceAnalysis, ebitdaKpis } = dreData;

  // Header with entity name + badges
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: SLIDE_W, h: 0.65,
    fill: { color: BOOK_COLORS.headerBg },
  });

  slide.addText(entityName, {
    x: 0.4, y: 0.1, w: 5, h: 0.45,
    fontSize: 16, fontFace: FONT, bold: true,
    color: BOOK_COLORS.white,
  });

  // Month badge
  slide.addShape('roundRect' as any, {
    x: 6, y: 0.15, w: 1.2, h: 0.35,
    fill: { color: BOOK_COLORS.accent }, rectRadius: 0.05,
  });
  slide.addText(data.monthShort, {
    x: 6, y: 0.15, w: 1.2, h: 0.35,
    fontSize: 8, fontFace: FONT, bold: true,
    color: BOOK_COLORS.white, align: 'center',
  });

  // Status badge
  slide.addShape('roundRect' as any, {
    x: 7.4, y: 0.15, w: 1.6, h: 0.35,
    fill: { color: statusBadge.color }, rectRadius: 0.05,
  });
  slide.addText(statusBadge.text, {
    x: 7.4, y: 0.15, w: 1.6, h: 0.35,
    fontSize: 8, fontFace: FONT, bold: true,
    color: BOOK_COLORS.white, align: 'center',
  });

  // Left (55%): Full DRE table
  const tableRows = buildFullDRETableRows(groups, calcRows);
  const rowH = Math.min(0.3, 5.8 / tableRows.length);
  slide.addTable(tableRows, {
    x: 0.3, y: 0.85, w: 7.0, h: 5.8,
    colW: [2.1, 1.0, 1.0, 0.95, 1.0, 0.95],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });

  // Right (45%): Analysis panel
  addAnalysisPanel(slide, performanceAnalysis, 7.6, 0.85, 5.4, 4.2);

  // Bottom-Right: EBITDA KPI cards
  ebitdaKpis.forEach((kpi, idx) => {
    addKpiCard(slide, kpi.label, kpi.value, kpi.color, 7.8 + idx * 2.6, 5.3, 2.3, 0.8);
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Generate Book de Resultados
// ═══════════════════════════════════════════════════════════════════

export async function generateBookDeResultados(data: BookDeResultadosData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'DRE Raiz — Plataforma Financeira';
  pptx.title = `Book de Resultados — ${data.monthLabel}`;

  // Slide 1: Cover
  addCoverSlide(pptx, data);

  // Slides 2-9: Section Analysis + Brand Comparison (4 sections × 2 slides)
  for (const section of data.sections) {
    addSectionAnalysisSlide(pptx, section, data);
    addBrandComparisonSlide(pptx, section, data);
  }

  // Slide 10: CSC DRE
  addFullDRESlide(pptx, data.cscDRE, data);

  // Slide 11: Consolidated DRE
  addFullDRESlide(pptx, data.consolidatedDRE, data);

  // Slide 12: EBITDA by brand (reuse brand comparison for EBITDA)
  addEbitdaBrandSlide(pptx, data);

  // Slides 13-22: Individual brand DREs
  for (const brandDRE of data.brandDREs) {
    addFullDRESlide(pptx, brandDRE, data);
  }

  // Download
  const filename = `Book_Resultados_${data.monthShort.replace('/', '_')}.pptx`;
  await pptx.writeFile({ fileName: filename });
}

// ─── EBITDA Brand Comparison Slide ───────────────────────────────

function addEbitdaBrandSlide(pptx: PptxGenJS, data: BookDeResultadosData) {
  const slide = pptx.addSlide();

  // Header
  addHeaderBar(slide, 'EBITDA — PERFORMANCE POR MARCA', data.monthShort, '🏆');

  if (data.brandDREs.length === 0) return;

  // Bar chart: EBITDA Real vs Orçado per brand
  const labels = data.brandDREs.map(b => b.entityName);
  const ebitdaCalc = (dre: BookFullDREData) => dre.calcRows.find(c => c.label === 'EBITDA');
  const reals  = data.brandDREs.map(b => ebitdaCalc(b)?.real || 0);
  const orcados = data.brandDREs.map(b => ebitdaCalc(b)?.orcado || 0);

  addGroupedBarChart(slide, labels, reals, orcados, 0.5, 0.85, 12.3, 3.5, BOOK_COLORS.consolidado);

  // Consolidated EBITDA KPIs
  const consEbitda = data.consolidatedDRE.calcRows.find(c => c.label === 'EBITDA');
  if (consEbitda) {
    const kpis: BookKPI[] = [
      { label: 'EBITDA CONSOLIDADO', value: `R$ ${fmtK(consEbitda.real)} mil`, color: BOOK_COLORS.consolidado },
      { label: 'VS ORÇADO', value: fmtPct(consEbitda.deltaOrcPct), color: consEbitda.deltaOrcPct >= 0 ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo },
      { label: 'VS ANO ANTERIOR', value: fmtPct(consEbitda.deltaA1Pct), color: consEbitda.deltaA1Pct >= 0 ? BOOK_COLORS.deltaPositivo : BOOK_COLORS.deltaNegativo },
    ];
    kpis.forEach((kpi, idx) => {
      addKpiCard(slide, kpi.label, kpi.value, kpi.color, 0.5 + idx * 4.2, 4.6, 3.8, 0.9);
    });
  }

  // Top 3 and Bottom 3 brands
  const ranked = data.brandDREs
    .map(b => ({ name: b.entityName, ebitda: ebitdaCalc(b), badge: b.statusBadge }))
    .filter(b => b.ebitda)
    .sort((a, b) => (b.ebitda!.deltaOrcPct) - (a.ebitda!.deltaOrcPct));

  const topBrands = ranked.slice(0, 3);
  const bottomBrands = ranked.slice(-3).reverse();

  // Top performers
  slide.addText('🟢 Top Performers', {
    x: 0.5, y: 5.7, w: 6, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true, color: BOOK_COLORS.deltaPositivo,
  });
  topBrands.forEach((b, idx) => {
    slide.addText(`${b.name}: EBITDA ${fmtPct(b.ebitda!.deltaOrcPct)} vs orçado`, {
      x: 0.7, y: 6.0 + idx * 0.22, w: 5.5, h: 0.2,
      fontSize: 7, fontFace: FONT, color: BOOK_COLORS.darkText,
    });
  });

  // Bottom performers
  slide.addText('🔴 Atenção', {
    x: 7, y: 5.7, w: 6, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true, color: BOOK_COLORS.deltaNegativo,
  });
  bottomBrands.forEach((b, idx) => {
    slide.addText(`${b.name}: EBITDA ${fmtPct(b.ebitda!.deltaOrcPct)} vs orçado`, {
      x: 7.2, y: 6.0 + idx * 0.22, w: 5.5, h: 0.2,
      fontSize: 7, fontFace: FONT, color: BOOK_COLORS.darkText,
    });
  });
}
