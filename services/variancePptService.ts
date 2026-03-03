// ─── Variance PPT — PPTX Rendering Service ───────────────────────
import PptxGenJS from 'pptxgenjs';
import {
  VARIANCE_COLORS,
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
} from './variancePptTypes';

// ─── Constants ────────────────────────────────────────────────────
const SLIDE_W = 13.33;
const FONT = 'Calibri';
const C = VARIANCE_COLORS;

// ─── Formatting Helpers ──────────────────────────────────────────

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
  if (status === 'approved') return C.approved;
  if (status === 'justified') return C.justified;
  if (status === 'rejected') return C.rejected;
  if (status === 'notified') return '3B82F6'; // blue-500
  return C.pending; // pending or empty
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// ─── Slide Helpers ───────────────────────────────────────────────

function addHeaderBar(
  slide: PptxGenJS.Slide,
  title: string,
  monthShort: string,
  color?: string,
) {
  // Dark header background
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: SLIDE_W, h: 0.65,
    fill: { color: color || C.headerBg },
  });

  slide.addText(title, {
    x: 0.4, y: 0.1, w: 8, h: 0.45,
    fontSize: 16, fontFace: FONT, bold: true,
    color: C.white,
  });

  // "UNIDADE: MILHARES (R$)" badge
  slide.addShape('roundRect' as any, {
    x: 8.5, y: 0.13, w: 2.2, h: 0.38,
    fill: { color: '2D3748' }, rectRadius: 0.05,
  });
  slide.addText('UNIDADE: MILHARES (R$)', {
    x: 8.5, y: 0.13, w: 2.2, h: 0.38,
    fontSize: 8, fontFace: FONT, bold: true,
    color: C.mutedText, align: 'center',
  });

  // Month badge
  slide.addShape('roundRect' as any, {
    x: 11.0, y: 0.13, w: 1.2, h: 0.38,
    fill: { color: C.accent }, rectRadius: 0.05,
  });
  slide.addText(monthShort, {
    x: 11.0, y: 0.13, w: 1.2, h: 0.38,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.white, align: 'center',
  });
}

function addKpiCard(
  slide: PptxGenJS.Slide,
  label: string,
  value: string,
  color: string,
  x: number, y: number, w: number, h: number,
) {
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: C.white },
    shadow: { type: 'outer', blur: 4, offset: 2, color: '00000020' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });
  slide.addShape('rect' as any, {
    x: x + 0.05, y: y + 0.05, w: w - 0.1, h: 0.04,
    fill: { color },
  });
  slide.addText(value, {
    x, y: y + 0.12, w, h: 0.35,
    fontSize: 18, fontFace: FONT, bold: true,
    color, align: 'center',
  });
  slide.addText(label, {
    x, y: y + 0.45, w, h: 0.25,
    fontSize: 7, fontFace: FONT, bold: true,
    color: C.mutedText, align: 'center',
  });
}

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
  slide.addText('SÍNTESE IA', {
    x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.accent,
  });
  slide.addText(text || 'Síntese pendente', {
    x: x + 0.15, y: y + 0.35, w: w - 0.3, h: h - 0.5,
    fontSize: 7.5, fontFace: FONT,
    color: text ? 'D1D5DB' : '6B728080',
    lineSpacingMultiple: 1.4,
    valign: 'top',
  });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1: COVER
// ═══════════════════════════════════════════════════════════════════

function addCoverSlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();

  // Decorative bars
  slide.addShape('rect' as any, { x: 10.8, y: 0.3, w: 0.15, h: 1.2, fill: { color: C.accent } });
  slide.addShape('rect' as any, { x: 11.1, y: 0.5, w: 0.15, h: 1.0, fill: { color: C.teal } });
  slide.addShape('rect' as any, { x: 11.4, y: 0.7, w: 0.15, h: 0.8, fill: { color: C.justified } });

  // Logo
  slide.addText('RAIZ', {
    x: 0.5, y: 0.4, w: 3, h: 0.5,
    fontSize: 28, fontFace: FONT, bold: true, color: C.accent,
  });
  slide.addText('FINANCEIRO', {
    x: 0.5, y: 0.85, w: 3, h: 0.3,
    fontSize: 11, fontFace: FONT, bold: true, color: C.mutedText, charSpacing: 4,
  });

  // Title
  slide.addText('Justificativas de Desvios\nDRE Gerencial', {
    x: 0.5, y: 2.5, w: 8, h: 1.5,
    fontSize: 36, fontFace: FONT, bold: true, color: C.accent, lineSpacingMultiple: 1.2,
  });

  // Divider
  slide.addShape('rect' as any, { x: 0.5, y: 4.2, w: 4, h: 0.06, fill: { color: C.teal } });

  // Metadata
  slide.addText(data.monthLabel, {
    x: 0.5, y: 4.5, w: 5, h: 0.4,
    fontSize: 18, fontFace: FONT, color: C.headerBg,
  });

  const entityLabel = data.marca || 'Consolidado';
  slide.addText(entityLabel, {
    x: 0.5, y: 4.9, w: 5, h: 0.3,
    fontSize: 14, fontFace: FONT, color: C.mutedText,
  });

  // Version + Snapshot badges
  const badgeY = 5.5;
  slide.addShape('roundRect' as any, {
    x: 0.5, y: badgeY, w: 1.6, h: 0.35,
    fill: { color: C.justified }, rectRadius: 0.05,
  });
  slide.addText(`Versão ${data.version}`, {
    x: 0.5, y: badgeY, w: 1.6, h: 0.35,
    fontSize: 9, fontFace: FONT, bold: true, color: C.white, align: 'center',
  });

  if (data.snapshotAt) {
    const snapDate = new Date(data.snapshotAt);
    const snapLabel = `Foto ${snapDate.toLocaleDateString('pt-BR')} ${snapDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    slide.addShape('roundRect' as any, {
      x: 2.3, y: badgeY, w: 2.4, h: 0.35,
      fill: { color: '4B5563' }, rectRadius: 0.05,
    });
    slide.addText(snapLabel, {
      x: 2.3, y: badgeY, w: 2.4, h: 0.35,
      fontSize: 8, fontFace: FONT, bold: true, color: C.white, align: 'center',
    });
  }

  // Coverage badge
  slide.addShape('roundRect' as any, {
    x: 5.0, y: badgeY, w: 2.6, h: 0.35,
    fill: { color: data.stats.coveragePct >= 80 ? C.approved : C.pending }, rectRadius: 0.05,
  });
  slide.addText(`${data.stats.coveragePct}% das contas justificadas`, {
    x: 5.0, y: badgeY, w: 2.6, h: 0.35,
    fontSize: 8, fontFace: FONT, bold: true, color: C.white, align: 'center',
  });

  // Bottom accent bar
  slide.addShape('rect' as any, { x: 0, y: 7.2, w: SLIDE_W, h: 0.3, fill: { color: C.accent } });
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2: DRE OVERVIEW
// ═══════════════════════════════════════════════════════════════════

function addOverviewSlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();
  addHeaderBar(slide, 'DRE — VISÃO GERAL (SNAPSHOT)', data.monthShort);

  const a1Label = String(data.a1Year);

  // Left: DRE condensed table (55%)
  const headerRow = [
    { text: 'DESCRIÇÃO', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'left' as const } },
    { text: `REAL ${data.year}`, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'ORÇADO', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'Δ% Orç', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: a1Label, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: `Δ% ${a1Label}`, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
  ];

  const rows: any[][] = [headerRow];

  const margemCalc = data.calcRows.find(c => c.label === 'MARGEM DE CONTRIBUIÇÃO');
  const ebitdaCalc = data.calcRows.find(c => c.label === 'EBITDA');

  for (const section of data.sections) {
    const { node, invertDelta } = section;
    const dOrcColor = deltaColor(node.orcVarPct, invertDelta);
    const dA1Color = deltaColor(node.a1VarPct, invertDelta);

    rows.push([
      { text: section.tag0, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '4B5563' } } },
      { text: fmtK(node.real), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtK(node.orcCompare), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtPct(node.orcVarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dOrcColor, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtK(node.a1Compare), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '4B5563' }, align: 'right' } },
      { text: fmtPct(node.a1VarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dA1Color, fill: { color: '4B5563' }, align: 'right' } },
    ]);

    // Insert MARGEM after 03.
    if (section.tag0.startsWith('03.') && margemCalc) {
      addCalcRowToTable(rows, margemCalc, C.accent);
    }
  }

  // EBITDA at end
  if (ebitdaCalc) {
    addCalcRowToTable(rows, ebitdaCalc, C.headerBg);
  }

  const rowH = Math.min(0.3, 5.5 / rows.length);
  slide.addTable(rows, {
    x: 0.3, y: 0.85, w: 7.0, h: 5.5,
    colW: [2.1, 1.0, 1.0, 0.95, 1.0, 0.95],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });

  // Right: KPI cards (45%)
  const ebitda = data.calcRows.find(c => c.label === 'EBITDA');
  const ebitdaReal = ebitda ? `R$ ${fmtK(ebitda.real)} mil` : 'N/D';
  const ebitdaVsOrc = ebitda ? fmtPct(ebitda.deltaOrcPct) : 'N/D';
  const ebitdaVsA1 = ebitda ? fmtPct(ebitda.deltaA1Pct) : 'N/D';
  const ebitdaOrcColor = ebitda?.deltaOrcPct != null ? deltaColor(ebitda.deltaOrcPct, false) : C.mutedText;
  const ebitdaA1Color = ebitda?.deltaA1Pct != null ? deltaColor(ebitda.deltaA1Pct, false) : C.mutedText;

  addKpiCard(slide, 'EBITDA', ebitdaReal, C.consolidado, 7.8, 1.0, 2.3, 0.85);
  addKpiCard(slide, 'VS ORÇADO', ebitdaVsOrc, ebitdaOrcColor, 10.4, 1.0, 2.3, 0.85);
  addKpiCard(slide, `VS ${a1Label}`, ebitdaVsA1, ebitdaA1Color, 7.8, 2.1, 2.3, 0.85);
  addKpiCard(slide, 'COBERTURA JUSTIF.', `${data.stats.coveragePct}%`, data.stats.coveragePct >= 80 ? C.approved : C.pending, 10.4, 2.1, 2.3, 0.85);

  // Coverage progress bar (textual)
  const barY = 3.3;
  slide.addShape('roundRect' as any, {
    x: 7.8, y: barY, w: 4.9, h: 1.2,
    fill: { color: 'F9FAFB' },
    rectRadius: 0.08,
    line: { color: 'E5E7EB', width: 0.5 },
  });
  slide.addText('Progresso de Justificativas', {
    x: 8.0, y: barY + 0.08, w: 4.5, h: 0.2,
    fontSize: 8, fontFace: FONT, bold: true, color: C.headerBg,
  });

  const { stats } = data;
  const statusItems = [
    { label: 'Aprovados', count: stats.approved, color: C.approved },
    { label: 'Justificados', count: stats.justified, color: C.justified },
    { label: 'Pendentes', count: stats.pending, color: C.pending },
    { label: 'Rejeitados', count: stats.rejected, color: C.rejected },
    { label: 'Notificados', count: stats.notified, color: '3B82F6' },
  ];

  statusItems.forEach((item, idx) => {
    const ix = 8.0 + idx * 0.95;
    slide.addShape('rect' as any, {
      x: ix, y: barY + 0.35, w: 0.12, h: 0.12,
      fill: { color: item.color },
    });
    slide.addText(`${item.label}: ${item.count}`, {
      x: ix + 0.16, y: barY + 0.32, w: 0.8, h: 0.18,
      fontSize: 6, fontFace: FONT, color: C.darkText,
    });
  });

  // Total
  slide.addText(`Total: ${stats.totalLeaves} contas`, {
    x: 8.0, y: barY + 0.6, w: 4.5, h: 0.18,
    fontSize: 7, fontFace: FONT, bold: true, color: C.mutedText,
  });
}

function addCalcRowToTable(rows: any[][], calc: VariancePptCalcRow, bgColor: string) {
  const dOrcColor = calc.deltaOrcPct != null && calc.deltaOrcPct >= 0 ? C.deltaPositivo : C.deltaNegativo;
  const dA1Color = calc.deltaA1Pct != null && calc.deltaA1Pct >= 0 ? C.deltaPositivo : C.deltaNegativo;
  rows.push([
    { text: calc.label, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: bgColor } } },
    { text: fmtK(calc.real), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.orcado), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaOrcPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dOrcColor, fill: { color: bgColor }, align: 'right' } },
    { text: fmtK(calc.a1), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: bgColor }, align: 'right' } },
    { text: fmtPct(calc.deltaA1Pct), options: { bold: true, fontSize: 7, fontFace: FONT, color: dA1Color, fill: { color: bgColor }, align: 'right' } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════
// SLIDES 3-N: SECTION SLIDES (1 per tag0)
// ═══════════════════════════════════════════════════════════════════

function addSectionSlide(pptx: PptxGenJS, section: VariancePptSection, data: VariancePptData) {
  if (section.tag01Nodes.length === 0) return;

  const slide = pptx.addSlide();
  addHeaderBar(slide, section.tag0.toUpperCase(), data.monthShort, section.sectionColor);

  // Top: tag01 financial table
  const a1Label = String(data.a1Year);
  const headerRow = [
    { text: 'DESCRIÇÃO', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'left' as const } },
    { text: `REAL ${data.year}`, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'ORÇADO', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'Δ% Orç', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: a1Label, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: `Δ% ${a1Label}`, options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
  ];

  const rows: any[][] = [headerRow];

  for (const node of section.tag01Nodes) {
    const dOrcColor = deltaColor(node.orcVarPct, section.invertDelta);
    const dA1Color = deltaColor(node.a1VarPct, section.invertDelta);
    rows.push([
      { text: node.label, options: { fontSize: 7, fontFace: FONT, color: C.darkText, align: 'left' } },
      { text: fmtK(node.real), options: { fontSize: 7, fontFace: FONT, color: C.darkText, align: 'right' } },
      { text: fmtK(node.orcCompare), options: { fontSize: 7, fontFace: FONT, color: C.mutedText, align: 'right' } },
      { text: fmtPct(node.orcVarPct), options: { fontSize: 7, fontFace: FONT, color: dOrcColor, align: 'right' } },
      { text: fmtK(node.a1Compare), options: { fontSize: 7, fontFace: FONT, color: C.mutedText, align: 'right' } },
      { text: fmtPct(node.a1VarPct), options: { fontSize: 7, fontFace: FONT, color: dA1Color, align: 'right' } },
    ]);
  }

  // Total row
  const { node } = section;
  const tOrcColor = deltaColor(node.orcVarPct, section.invertDelta);
  const tA1Color = deltaColor(node.a1VarPct, section.invertDelta);
  rows.push([
    { text: 'TOTAL', options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '374151' } } },
    { text: fmtK(node.real), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '374151' }, align: 'right' } },
    { text: fmtK(node.orcCompare), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '374151' }, align: 'right' } },
    { text: fmtPct(node.orcVarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: tOrcColor, fill: { color: '374151' }, align: 'right' } },
    { text: fmtK(node.a1Compare), options: { bold: true, fontSize: 7, fontFace: FONT, color: C.white, fill: { color: '374151' }, align: 'right' } },
    { text: fmtPct(node.a1VarPct), options: { bold: true, fontSize: 7, fontFace: FONT, color: tA1Color, fill: { color: '374151' }, align: 'right' } },
  ]);

  const maxTableH = 3.0;
  const rowH = Math.min(0.25, maxTableH / rows.length);
  slide.addTable(rows, {
    x: 0.3, y: 0.85, w: 12.7, h: maxTableH,
    colW: [3.5, 1.8, 1.8, 1.5, 1.8, 1.5],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });

  // Bottom-left (55%): AI Summary box
  const bottomY = 0.85 + Math.min(maxTableH, rows.length * rowH) + 0.2;
  const bottomH = 7.1 - bottomY;

  addInsightsBox(slide, node.orcAiSummary || '', 0.3, bottomY, 7.0, bottomH);

  // Bottom-right (45%): Top 3 desvios with justification
  const top3 = [...section.tag01Nodes]
    .sort((a, b) => Math.abs(b.orcVarPct || 0) - Math.abs(a.orcVarPct || 0))
    .slice(0, 3);

  slide.addText('TOP DESVIOS', {
    x: 7.6, y: bottomY, w: 5.4, h: 0.25,
    fontSize: 9, fontFace: FONT, bold: true, color: C.headerBg,
  });

  const cardH = Math.min(1.2, (bottomH - 0.35) / 3);
  top3.forEach((n, idx) => {
    const cy = bottomY + 0.3 + idx * cardH;
    const borderColor = deltaColor(n.orcVarPct, section.invertDelta);

    slide.addShape('roundRect' as any, {
      x: 7.6, y: cy, w: 5.4, h: cardH - 0.08,
      fill: { color: C.white },
      line: { color: 'E5E7EB', width: 0.5 },
      rectRadius: 0.06,
    });
    // Colored left border
    slide.addShape('rect' as any, {
      x: 7.6, y: cy, w: 0.06, h: cardH - 0.08,
      fill: { color: borderColor },
    });

    slide.addText(n.label, {
      x: 7.8, y: cy + 0.04, w: 3.5, h: 0.2,
      fontSize: 8, fontFace: FONT, bold: true, color: C.headerBg,
    });

    slide.addText(`Δ Orç: ${fmtPct(n.orcVarPct)}`, {
      x: 11.3, y: cy + 0.04, w: 1.5, h: 0.2,
      fontSize: 7, fontFace: FONT, bold: true, color: borderColor, align: 'right',
    });

    // Status dot + justification/summary preview
    const justText = n.orcAiSummary || n.orcJustification || 'Sem justificativa';
    const stColor = statusDot(n.orcStatus);

    slide.addShape('rect' as any, {
      x: 7.8, y: cy + 0.3, w: 0.1, h: 0.1,
      fill: { color: stColor },
    });
    slide.addText(truncate(justText, 80), {
      x: 7.98, y: cy + 0.26, w: 4.8, h: cardH - 0.4,
      fontSize: 6.5, fontFace: FONT, color: C.mutedText,
      lineSpacingMultiple: 1.3, valign: 'top',
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL SLIDES (1 per tag0 with tag01+tag02+tag03 hierarchy)
// ═══════════════════════════════════════════════════════════════════

function addDetailSlide(pptx: PptxGenJS, section: VariancePptSection, data: VariancePptData) {
  // Collect all hierarchy rows
  type DetailRow = { depth: number; label: string; real: number; orc: number; varPct: number | null; justText: string; status: string };
  const allRows: DetailRow[] = [];

  for (const t01 of section.tag01Nodes) {
    allRows.push({
      depth: 0,
      label: t01.label,
      real: t01.real,
      orc: t01.orcCompare,
      varPct: t01.orcVarPct,
      justText: t01.orcAiSummary || '',
      status: t01.orcStatus,
    });

    for (const t02 of t01.children) {
      allRows.push({
        depth: 1,
        label: t02.label,
        real: t02.real,
        orc: t02.orcCompare,
        varPct: t02.orcVarPct,
        justText: t02.orcAiSummary || '',
        status: t02.orcStatus,
      });

      for (const t03 of t02.children) {
        allRows.push({
          depth: 2,
          label: t03.label,
          real: t03.real,
          orc: t03.orcCompare,
          varPct: t03.orcVarPct,
          justText: t03.orcJustification || t03.orcAiSummary || '',
          status: t03.orcStatus,
        });
      }
    }
  }

  if (allRows.length === 0) return;

  const MAX_ROWS = 18;
  const truncated = allRows.length > MAX_ROWS;
  const displayRows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;
  const remaining = allRows.length - MAX_ROWS;

  const slide = pptx.addSlide();
  addHeaderBar(slide, `${section.label.toUpperCase()} — DETALHAMENTO`, data.monthShort, section.sectionColor);

  // Table header
  const headerRow = [
    { text: 'CONTA', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'left' as const } },
    { text: 'REAL', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'ORC', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'Δ%', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'right' as const } },
    { text: 'JUSTIFICATIVA / SÍNTESE', options: { bold: true, fontSize: 6.5, fontFace: FONT, color: C.white, fill: { color: C.headerBg }, align: 'left' as const } },
  ];

  const tableRows: any[][] = [headerRow];

  for (const row of displayRows) {
    const indent = row.depth === 0 ? '' : row.depth === 1 ? '  ' : '    ';
    const isBold = row.depth === 0;
    const fontSize = row.depth === 0 ? 7 : row.depth === 1 ? 6.5 : 6;
    const textColor = row.depth === 0 ? C.darkText : row.depth === 1 ? C.darkText : C.mutedText;
    const dColor = deltaColor(row.varPct, section.invertDelta);
    const stDot = row.status ? `●  ` : '';

    tableRows.push([
      { text: `${indent}${row.label}`, options: { bold: isBold, fontSize, fontFace: FONT, color: textColor, align: 'left' } },
      { text: fmtK(row.real), options: { bold: isBold, fontSize, fontFace: FONT, color: textColor, align: 'right' } },
      { text: fmtK(row.orc), options: { bold: isBold, fontSize, fontFace: FONT, color: C.mutedText, align: 'right' } },
      { text: fmtPct(row.varPct), options: { bold: isBold, fontSize, fontFace: FONT, color: dColor, align: 'right' } },
      { text: `${stDot}${truncate(row.justText, 60)}`, options: { fontSize: 6, fontFace: FONT, color: row.justText ? C.darkText : C.mutedText, align: 'left' } },
    ]);
  }

  if (truncated) {
    tableRows.push([
      { text: `...e mais ${remaining} linhas`, options: { italic: true, fontSize: 6, fontFace: FONT, color: C.mutedText, align: 'left' } },
      { text: '', options: {} },
      { text: '', options: {} },
      { text: '', options: {} },
      { text: '', options: {} },
    ]);
  }

  const rowH = Math.min(0.3, 5.8 / tableRows.length);
  slide.addTable(tableRows, {
    x: 0.3, y: 0.85, w: 12.7, h: 5.8,
    colW: [3.0, 1.3, 1.3, 1.0, 6.1],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
    rowH,
  });
}

// ═══════════════════════════════════════════════════════════════════
// FINAL SLIDE: RESUMO
// ═══════════════════════════════════════════════════════════════════

function addSummarySlide(pptx: PptxGenJS, data: VariancePptData) {
  const slide = pptx.addSlide();
  addHeaderBar(slide, 'RESUMO — COBERTURA DE JUSTIFICATIVAS', data.monthShort);

  const { stats } = data;

  // Left: Coverage metrics
  slide.addText(`${stats.coveragePct}%`, {
    x: 0.5, y: 1.2, w: 5, h: 1.5,
    fontSize: 72, fontFace: FONT, bold: true,
    color: stats.coveragePct >= 80 ? C.approved : stats.coveragePct >= 50 ? C.pending : C.rejected,
  });
  slide.addText('Cobertura de Justificativas', {
    x: 0.5, y: 2.7, w: 5, h: 0.3,
    fontSize: 14, fontFace: FONT, color: C.headerBg,
  });

  // Segmented bar (status breakdown)
  const barY = 3.3;
  const barW = 5.5;
  const totalForBar = stats.totalLeaves || 1;
  const segments = [
    { count: stats.approved, color: C.approved, label: 'Aprovados' },
    { count: stats.justified, color: C.justified, label: 'Justificados' },
    { count: stats.pending + stats.notified, color: C.pending, label: 'Pendentes' },
    { count: stats.rejected, color: C.rejected, label: 'Rejeitados' },
  ];

  let barX = 0.5;
  for (const seg of segments) {
    const segW = (seg.count / totalForBar) * barW;
    if (segW > 0.01) {
      slide.addShape('rect' as any, {
        x: barX, y: barY, w: segW, h: 0.35,
        fill: { color: seg.color },
      });
      barX += segW;
    }
  }

  // Legend below bar
  segments.forEach((seg, idx) => {
    const lx = 0.5 + idx * 1.5;
    slide.addShape('rect' as any, {
      x: lx, y: barY + 0.5, w: 0.12, h: 0.12,
      fill: { color: seg.color },
    });
    slide.addText(`${seg.label}: ${seg.count}`, {
      x: lx + 0.16, y: barY + 0.47, w: 1.3, h: 0.18,
      fontSize: 7, fontFace: FONT, color: C.darkText,
    });
  });

  slide.addText(`Total: ${stats.totalLeaves} contas  |  Versão ${data.version}`, {
    x: 0.5, y: barY + 0.8, w: 5, h: 0.2,
    fontSize: 7, fontFace: FONT, bold: true, color: C.mutedText,
  });

  // Right: Top desvios não justificados
  slide.addText('TOP DESVIOS NÃO JUSTIFICADOS', {
    x: 7, y: 1.0, w: 5.8, h: 0.3,
    fontSize: 11, fontFace: FONT, bold: true, color: C.rejected,
  });

  // Collect unjustified leaves across all sections
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
  const topUnjust = unjustified.slice(0, 8);

  topUnjust.forEach((item, idx) => {
    const iy = 1.5 + idx * 0.55;
    const dColor = deltaColor(item.varPct, item.invert);

    slide.addShape('roundRect' as any, {
      x: 7, y: iy, w: 5.8, h: 0.45,
      fill: { color: C.white },
      line: { color: 'E5E7EB', width: 0.5 },
      rectRadius: 0.05,
    });
    slide.addShape('rect' as any, {
      x: 7, y: iy, w: 0.05, h: 0.45,
      fill: { color: C.rejected },
    });
    slide.addText(`${item.tag0}  ${truncate(item.label, 35)}`, {
      x: 7.15, y: iy + 0.02, w: 4.0, h: 0.2,
      fontSize: 7, fontFace: FONT, bold: true, color: C.darkText,
    });
    slide.addText(fmtPct(item.varPct), {
      x: 11.3, y: iy + 0.02, w: 1.3, h: 0.2,
      fontSize: 8, fontFace: FONT, bold: true, color: dColor, align: 'right',
    });
    slide.addText('Sem justificativa', {
      x: 7.15, y: iy + 0.22, w: 4.0, h: 0.18,
      fontSize: 6, fontFace: FONT, italic: true, color: C.mutedText,
    });
  });

  if (unjustified.length === 0) {
    slide.addText('Todas as contas estão justificadas!', {
      x: 7, y: 2.0, w: 5.8, h: 0.5,
      fontSize: 12, fontFace: FONT, bold: true, color: C.approved,
    });
  }

  // Footer
  slide.addShape('rect' as any, {
    x: 0, y: 7.05, w: SLIDE_W, h: 0.45,
    fill: { color: C.headerBg },
  });
  slide.addText('Gerado automaticamente — DRE Raiz', {
    x: 0.4, y: 7.08, w: 6, h: 0.35,
    fontSize: 7, fontFace: FONT, color: C.mutedText,
  });
  slide.addText(new Date().toLocaleDateString('pt-BR'), {
    x: 10, y: 7.08, w: 3, h: 0.35,
    fontSize: 7, fontFace: FONT, color: C.mutedText, align: 'right',
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN: Generate Variance PPT
// ═══════════════════════════════════════════════════════════════════

export async function generateVariancePpt(data: VariancePptData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'DRE Raiz — Plataforma Financeira';
  pptx.title = `Justificativas de Desvios — ${data.monthLabel}`;

  // Slide 1: Cover
  addCoverSlide(pptx, data);

  // Slide 2: DRE Overview
  addOverviewSlide(pptx, data);

  // Slides 3-N: Section slides (1 per tag0 with data)
  for (const section of data.sections) {
    addSectionSlide(pptx, section, data);
  }

  // Slides N+1 to N+K: Detail slides (1 per tag0 with hierarchy)
  for (const section of data.sections) {
    if (section.tag01Nodes.length > 0) {
      addDetailSlide(pptx, section, data);
    }
  }

  // Final slide: Summary
  addSummarySlide(pptx, data);

  // Download
  const marcaSuffix = data.marca ? `_${data.marca}` : '';
  const filename = `Justificativas_Desvios_${data.monthShort.replace('/', '_')}${marcaSuffix}.pptx`;
  await pptx.writeFile({ fileName: filename });
}
