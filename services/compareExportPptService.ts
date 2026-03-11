/**
 * Compare Export PPT Service
 * Gera apresentação PowerPoint comparando 2 análises da Equipe Alpha
 */

import pptxgen from 'pptxgenjs';
import type { AgentRun, AgentStep, FinancialSummary } from '../types/agentTeam';

// ============================================
// TYPES
// ============================================

export interface CompareExportData {
  runA: AgentRun;
  runB: AgentRun;
  stepsA: AgentStep[];
  stepsB: AgentStep[];
}

// ============================================
// CONSTANTS
// ============================================

const C = {
  // Brand
  primary: '1B2A4A',
  indigo: '6366F1',
  purple: '8B5CF6',
  // Semantic
  green: '059669',
  red: 'DC2626',
  amber: 'D97706',
  // Neutral
  dark: '111827',
  gray: '6B7280',
  grayLight: '9CA3AF',
  grayBg: 'F3F4F6',
  white: 'FFFFFF',
  // Agent colors
  alex: '8B5CF6',
  carlos: '3B82F6',
  denilson: '10B981',
  edmundo: '6366F1',
} as const;

const AGENT_LABELS: Record<string, string> = {
  alex: 'Alex — Supervisor Estratégico',
  carlos: 'Carlos — Performance Financeira',
  denilson: 'Denilson — Otimização',
  edmundo: 'Edmundo — Forecast & Tendências',
};

// ============================================
// HELPERS
// ============================================

function fmtBRL(v: number | undefined | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtPct(v: number | undefined | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function fmtDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function duration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function totalTokens(steps: AgentStep[]): number {
  return steps.reduce((s, st) => s + (st.tokens_input || 0) + (st.tokens_output || 0), 0);
}

function extractFilterLabel(run: AgentRun): string {
  if (!run.filter_context) return 'Sem filtros';
  const fc = run.filter_context as Record<string, unknown>;
  const parts: string[] = [];
  if (fc.marcas && Array.isArray(fc.marcas) && fc.marcas.length) parts.push(`Marca: ${(fc.marcas as string[]).join(', ')}`);
  if (fc.filiais && Array.isArray(fc.filiais) && fc.filiais.length) parts.push(`Filial: ${(fc.filiais as string[]).join(', ')}`);
  if (fc.months && Array.isArray(fc.months) && fc.months.length) parts.push(`Meses: ${(fc.months as string[]).join(', ')}`);
  if (fc.tags01 && Array.isArray(fc.tags01) && fc.tags01.length) parts.push(`Tag01: ${(fc.tags01 as string[]).join(', ')}`);
  return parts.length > 0 ? parts.join(' | ') : 'Sem filtros';
}

function extractSummary(step: AgentStep | undefined): string {
  if (!step?.output_data) return '';
  const out = step.output_data as Record<string, unknown>;
  for (const key of ['resumo_executivo', 'resumo_projecao', 'executive_summary', 'plan_summary', 'summary', 'recado_final', 'recado_estrategico']) {
    if (typeof out[key] === 'string' && out[key]) return out[key] as string;
  }
  for (const val of Object.values(out)) {
    if (val && typeof val === 'object' && 'resumo' in (val as Record<string, unknown>)) {
      return (val as Record<string, unknown>).resumo as string;
    }
  }
  return '';
}

function wrapText(text: string, maxChars: number): string {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}

// ============================================
// SLIDE BUILDERS
// ============================================

function addFooter(slide: pptxgen.Slide, slideNum: number, totalSlides: number) {
  slide.addText(`RAIZ Educação — Comparação de Análises  |  ${slideNum}/${totalSlides}`, {
    x: 0.3, y: 7.0, w: 9.4, h: 0.3,
    fontSize: 7, color: C.grayLight, fontFace: 'Segoe UI',
  });
}

function addSlideTitle(slide: pptxgen.Slide, title: string, subtitle?: string) {
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.4,
    fontSize: 16, bold: true, color: C.dark, fontFace: 'Segoe UI',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.7, w: 9, h: 0.25,
      fontSize: 9, color: C.grayLight, fontFace: 'Segoe UI',
    });
  }
}

// ============================================
// SLIDE 1: CAPA
// ============================================

function slideCover(pptx: pptxgen, data: CompareExportData, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: C.primary };

  // Brand accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: C.indigo } });

  // Title
  slide.addText('Comparação de Análises', {
    x: 0.6, y: 1.5, w: 8.8, h: 0.7,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Segoe UI',
  });
  slide.addText('Equipe Alpha — Análise Financeira Automatizada', {
    x: 0.6, y: 2.2, w: 8.8, h: 0.4,
    fontSize: 14, color: C.grayLight, fontFace: 'Segoe UI',
  });

  // Divider line
  slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 2.85, w: 3, h: 0.03, fill: { color: C.indigo } });

  // Run A info
  slide.addText([
    { text: 'A  ', options: { bold: true, color: C.indigo, fontSize: 12 } },
    { text: wrapText(data.runA.objective, 80), options: { color: C.white, fontSize: 11 } },
  ], { x: 0.6, y: 3.3, w: 8.8, h: 0.35, fontFace: 'Segoe UI' });
  slide.addText(`${fmtDateTime(data.runA.started_at)}  •  ${duration(data.runA.started_at, data.runA.completed_at)}  •  ${data.runA.started_by_name || '—'}`, {
    x: 0.9, y: 3.65, w: 8.5, h: 0.25, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI',
  });
  slide.addText(extractFilterLabel(data.runA), {
    x: 0.9, y: 3.88, w: 8.5, h: 0.2, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI', italic: true,
  });

  // Run B info
  slide.addText([
    { text: 'B  ', options: { bold: true, color: C.purple, fontSize: 12 } },
    { text: wrapText(data.runB.objective, 80), options: { color: C.white, fontSize: 11 } },
  ], { x: 0.6, y: 4.4, w: 8.8, h: 0.35, fontFace: 'Segoe UI' });
  slide.addText(`${fmtDateTime(data.runB.started_at)}  •  ${duration(data.runB.started_at, data.runB.completed_at)}  •  ${data.runB.started_by_name || '—'}`, {
    x: 0.9, y: 4.75, w: 8.5, h: 0.25, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI',
  });
  slide.addText(extractFilterLabel(data.runB), {
    x: 0.9, y: 4.98, w: 8.5, h: 0.2, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI', italic: true,
  });

  // Date
  slide.addText(`Gerado em ${fmtDateTime(new Date().toISOString())}`, {
    x: 0.6, y: 6.6, w: 8.8, h: 0.3, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI',
  });
}

// ============================================
// SLIDE 2: KPIs FINANCEIROS — TABELA COMPARATIVA
// ============================================

function slideKPIs(pptx: pptxgen, data: CompareExportData, slideNum: number, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addSlideTitle(slide, 'KPIs Financeiros — Comparação', 'Valores reais e orçados lado a lado');
  addFooter(slide, slideNum, totalSlides);

  const fsA = data.runA.financial_summary as FinancialSummary | null;
  const fsB = data.runB.financial_summary as FinancialSummary | null;

  if (!fsA || !fsB) {
    slide.addText('Dados financeiros não disponíveis para uma ou ambas análises', {
      x: 1, y: 3, w: 8, h: 0.5, fontSize: 12, color: C.gray, fontFace: 'Segoe UI', italic: true, align: 'center',
    });
    return;
  }

  const rows: { label: string; valA: number; valB: number; orcA: number; orcB: number; bold?: boolean }[] = [
    { label: 'Receita Líquida', valA: fsA.receita.real, valB: fsB.receita.real, orcA: fsA.receita.orcado, orcB: fsB.receita.orcado },
    { label: 'Custos Variáveis', valA: fsA.custos_variaveis.real, valB: fsB.custos_variaveis.real, orcA: fsA.custos_variaveis.orcado, orcB: fsB.custos_variaveis.orcado },
    { label: 'Custos Fixos', valA: fsA.custos_fixos.real, valB: fsB.custos_fixos.real, orcA: fsA.custos_fixos.orcado, orcB: fsB.custos_fixos.orcado },
    { label: 'SG&A', valA: fsA.sga.real, valB: fsB.sga.real, orcA: fsA.sga.orcado, orcB: fsB.sga.orcado },
    { label: 'Rateio Raiz', valA: fsA.rateio.real, valB: fsB.rateio.real, orcA: fsA.rateio.orcado, orcB: fsB.rateio.orcado },
    { label: 'Margem Contribuição', valA: fsA.margem_contribuicao.real, valB: fsB.margem_contribuicao.real, orcA: fsA.margem_contribuicao.orcado, orcB: fsB.margem_contribuicao.orcado, bold: true },
    { label: 'EBITDA', valA: fsA.ebitda.real, valB: fsB.ebitda.real, orcA: fsA.ebitda.orcado, orcB: fsB.ebitda.orcado, bold: true },
  ];

  // Table header
  const headerRow: pptxgen.TableCell[] = [
    { text: 'Linha DRE', options: { bold: true, fontSize: 9, color: C.white, fill: { color: C.primary }, align: 'left', fontFace: 'Segoe UI' } },
    { text: 'A Real', options: { bold: true, fontSize: 9, color: C.white, fill: { color: C.indigo }, align: 'right', fontFace: 'Segoe UI' } },
    { text: 'B Real', options: { bold: true, fontSize: 9, color: C.white, fill: { color: C.purple }, align: 'right', fontFace: 'Segoe UI' } },
    { text: 'Δ A→B', options: { bold: true, fontSize: 9, color: C.white, fill: { color: C.dark }, align: 'right', fontFace: 'Segoe UI' } },
    { text: 'A Orçado', options: { bold: true, fontSize: 9, color: C.white, fill: { color: '4F46E5' }, align: 'right', fontFace: 'Segoe UI' } },
    { text: 'B Orçado', options: { bold: true, fontSize: 9, color: C.white, fill: { color: '7C3AED' }, align: 'right', fontFace: 'Segoe UI' } },
  ];

  const tableRows: pptxgen.TableCell[][] = [headerRow];
  rows.forEach((row, i) => {
    const delta = row.valA ? ((row.valB - row.valA) / Math.abs(row.valA)) * 100 : 0;
    const deltaColor = delta >= 0 ? C.green : C.red;
    const bg = row.bold ? C.grayBg : (i % 2 === 0 ? C.white : 'FAFAFA');
    const opts = { fontSize: 9, fontFace: 'Segoe UI', fill: { color: bg }, bold: !!row.bold };

    tableRows.push([
      { text: row.label, options: { ...opts, align: 'left' as const, color: C.dark } },
      { text: fmtBRL(row.valA), options: { ...opts, align: 'right' as const, color: C.indigo } },
      { text: fmtBRL(row.valB), options: { ...opts, align: 'right' as const, color: C.purple } },
      { text: fmtPct(delta), options: { ...opts, align: 'right' as const, color: deltaColor } },
      { text: fmtBRL(row.orcA), options: { ...opts, align: 'right' as const, color: C.gray } },
      { text: fmtBRL(row.orcB), options: { ...opts, align: 'right' as const, color: C.gray } },
    ]);
  });

  slide.addTable(tableRows, {
    x: 0.4, y: 1.1, w: 9.2,
    colW: [2.0, 1.5, 1.5, 1.2, 1.5, 1.5],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' },
    rowH: 0.35,
  });

  // Margin + Health cards
  const yCards = 4.0;
  [
    { label: 'A', fs: fsA, color: C.indigo, x: 0.4 },
    { label: 'B', fs: fsB, color: C.purple, x: 5.1 },
  ].forEach(item => {
    // Card bg
    slide.addShape(pptx.ShapeType.roundRect, {
      x: item.x, y: yCards, w: 4.5, h: 2.6,
      fill: { color: C.grayBg }, rectRadius: 0.1,
      line: { color: item.color, width: 1.5 },
    });

    slide.addText(`Análise ${item.label}`, {
      x: item.x + 0.2, y: yCards + 0.1, w: 4, h: 0.3,
      fontSize: 10, bold: true, color: item.color, fontFace: 'Segoe UI',
    });

    const healthColor = item.fs.margem_contribuicao.health === 'healthy' ? C.green :
      item.fs.margem_contribuicao.health === 'attention' ? C.amber : C.red;
    const healthLabel = item.fs.margem_contribuicao.health === 'healthy' ? '● Saudável' :
      item.fs.margem_contribuicao.health === 'attention' ? '● Atenção' : '● Crítico';

    const metrics = [
      `Margem Real: ${item.fs.margem_contribuicao.pct_real?.toFixed(1)}%`,
      `Margem Orç: ${item.fs.margem_contribuicao.pct_orcado?.toFixed(1)}%`,
      `EBITDA %: ${item.fs.ebitda.pct_real?.toFixed(1)}%`,
      `Gap Receita: ${fmtPct(item.fs.receita.gap_pct)}`,
    ];

    metrics.forEach((m, i) => {
      slide.addText(m, {
        x: item.x + 0.2, y: yCards + 0.45 + i * 0.25, w: 4, h: 0.25,
        fontSize: 9, color: C.dark, fontFace: 'Segoe UI',
      });
    });

    slide.addText(healthLabel, {
      x: item.x + 0.2, y: yCards + 1.55, w: 4, h: 0.25,
      fontSize: 10, bold: true, color: healthColor, fontFace: 'Segoe UI',
    });

    // Top variações
    if (item.fs.top5_variacoes && item.fs.top5_variacoes.length > 0) {
      slide.addText('Top Variações:', {
        x: item.x + 0.2, y: yCards + 1.85, w: 4, h: 0.2,
        fontSize: 8, bold: true, color: C.gray, fontFace: 'Segoe UI',
      });
      item.fs.top5_variacoes.slice(0, 3).forEach((v, i) => {
        const vColor = v.delta_pct >= 0 ? C.green : C.red;
        slide.addText(`${wrapText(v.tag01, 30)}  ${fmtPct(v.delta_pct)}`, {
          x: item.x + 0.3, y: yCards + 2.05 + i * 0.18, w: 3.8, h: 0.18,
          fontSize: 7.5, color: vColor, fontFace: 'Segoe UI',
        });
      });
    }
  });
}

// ============================================
// SLIDE 3: TENDÊNCIA MENSAL
// ============================================

function slideTrend(pptx: pptxgen, data: CompareExportData, slideNum: number, totalSlides: number) {
  const fsA = data.runA.financial_summary as FinancialSummary | null;
  const fsB = data.runB.financial_summary as FinancialSummary | null;
  if (!fsA?.tendencia_mensal?.length || !fsB?.tendencia_mensal?.length) return;

  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addSlideTitle(slide, 'Tendência Mensal — Receita & EBITDA', 'Evolução mês a mês para ambas análises');
  addFooter(slide, slideNum, totalSlides);

  // Revenue table
  slide.addText('Receita', { x: 0.4, y: 1.1, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.dark, fontFace: 'Segoe UI' });

  const revHeader: pptxgen.TableCell[] = [
    { text: 'Mês', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.primary }, fontFace: 'Segoe UI', align: 'left' } },
    { text: 'A', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.indigo }, fontFace: 'Segoe UI', align: 'right' } },
    { text: 'B', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.purple }, fontFace: 'Segoe UI', align: 'right' } },
    { text: 'Δ', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.dark }, fontFace: 'Segoe UI', align: 'right' } },
  ];

  const revRows: pptxgen.TableCell[][] = [revHeader];
  fsA.tendencia_mensal.forEach((mA, i) => {
    const mB = fsB.tendencia_mensal?.[i];
    const delta = mA.receita ? ((((mB?.receita || 0) - mA.receita) / Math.abs(mA.receita)) * 100) : 0;
    const bg = i % 2 === 0 ? C.white : 'FAFAFA';
    revRows.push([
      { text: mA.mes, options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'left', color: C.dark } },
      { text: fmtBRL(mA.receita), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.indigo } },
      { text: mB ? fmtBRL(mB.receita) : '—', options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.purple } },
      { text: fmtPct(delta), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: delta >= 0 ? C.green : C.red } },
    ]);
  });

  slide.addTable(revRows, {
    x: 0.4, y: 1.45, w: 4.3, colW: [0.8, 1.2, 1.2, 1.1],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' }, rowH: 0.28,
  });

  // EBITDA table
  slide.addText('EBITDA', { x: 5.3, y: 1.1, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.dark, fontFace: 'Segoe UI' });

  const ebitdaHeader: pptxgen.TableCell[] = [
    { text: 'Mês', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.primary }, fontFace: 'Segoe UI', align: 'left' } },
    { text: 'A', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.indigo }, fontFace: 'Segoe UI', align: 'right' } },
    { text: 'B', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.purple }, fontFace: 'Segoe UI', align: 'right' } },
    { text: 'Δ', options: { bold: true, fontSize: 8, color: C.white, fill: { color: C.dark }, fontFace: 'Segoe UI', align: 'right' } },
  ];

  const ebitdaRows: pptxgen.TableCell[][] = [ebitdaHeader];
  fsA.tendencia_mensal.forEach((mA, i) => {
    const mB = fsB.tendencia_mensal?.[i];
    const delta = mA.ebitda ? ((((mB?.ebitda || 0) - mA.ebitda) / Math.abs(mA.ebitda)) * 100) : 0;
    const bg = i % 2 === 0 ? C.white : 'FAFAFA';
    ebitdaRows.push([
      { text: mA.mes, options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'left', color: C.dark } },
      { text: fmtBRL(mA.ebitda), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.indigo } },
      { text: mB ? fmtBRL(mB.ebitda) : '—', options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.purple } },
      { text: fmtPct(delta), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: delta >= 0 ? C.green : C.red } },
    ]);
  });

  slide.addTable(ebitdaRows, {
    x: 5.3, y: 1.45, w: 4.3, colW: [0.8, 1.2, 1.2, 1.1],
    border: { type: 'solid', pt: 0.5, color: 'E5E7EB' }, rowH: 0.28,
  });
}

// ============================================
// SLIDE 4: TOP RECEITAS & CUSTOS
// ============================================

function slideTopTags(pptx: pptxgen, data: CompareExportData, slideNum: number, totalSlides: number) {
  const fsA = data.runA.financial_summary as FinancialSummary | null;
  const fsB = data.runB.financial_summary as FinancialSummary | null;
  if (!fsA && !fsB) return;

  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  addSlideTitle(slide, 'Top Centros de Custo — Receita & Custo', 'Maiores contribuições por tag01');
  addFooter(slide, slideNum, totalSlides);

  // Left: Receita
  slide.addText('Top Receita', { x: 0.4, y: 1.1, w: 4.3, h: 0.3, fontSize: 11, bold: true, color: C.green, fontFace: 'Segoe UI' });

  [{ label: 'A', fs: fsA, color: C.indigo, y: 1.5 }, { label: 'B', fs: fsB, color: C.purple, y: 3.3 }].forEach(item => {
    if (!item.fs?.top5_tags01_receita?.length) return;
    slide.addText(`Análise ${item.label}`, {
      x: 0.5, y: item.y, w: 4, h: 0.25, fontSize: 9, bold: true, color: item.color, fontFace: 'Segoe UI',
    });
    const tblRows: pptxgen.TableCell[][] = [];
    item.fs.top5_tags01_receita.slice(0, 5).forEach((t, i) => {
      const bg = i % 2 === 0 ? C.white : 'FAFAFA';
      tblRows.push([
        { text: wrapText(t.tag01, 35), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'left', color: C.dark } },
        { text: fmtBRL(t.total), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.green, bold: true } },
      ]);
    });
    slide.addTable(tblRows, {
      x: 0.5, y: item.y + 0.28, w: 4.1, colW: [2.8, 1.3],
      border: { type: 'solid', pt: 0.5, color: 'E5E7EB' }, rowH: 0.25,
    });
  });

  // Right: Custo
  slide.addText('Top Custo', { x: 5.3, y: 1.1, w: 4.3, h: 0.3, fontSize: 11, bold: true, color: C.red, fontFace: 'Segoe UI' });

  [{ label: 'A', fs: fsA, color: C.indigo, y: 1.5 }, { label: 'B', fs: fsB, color: C.purple, y: 3.3 }].forEach(item => {
    if (!item.fs?.top5_tags01_custo?.length) return;
    slide.addText(`Análise ${item.label}`, {
      x: 5.4, y: item.y, w: 4, h: 0.25, fontSize: 9, bold: true, color: item.color, fontFace: 'Segoe UI',
    });
    const tblRows: pptxgen.TableCell[][] = [];
    item.fs.top5_tags01_custo.slice(0, 5).forEach((t, i) => {
      const bg = i % 2 === 0 ? C.white : 'FAFAFA';
      tblRows.push([
        { text: wrapText(t.tag01, 35), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'left', color: C.dark } },
        { text: fmtBRL(t.total), options: { fontSize: 8, fontFace: 'Segoe UI', fill: { color: bg }, align: 'right', color: C.red, bold: true } },
      ]);
    });
    slide.addTable(tblRows, {
      x: 5.4, y: item.y + 0.28, w: 4.1, colW: [2.8, 1.3],
      border: { type: 'solid', pt: 0.5, color: 'E5E7EB' }, rowH: 0.25,
    });
  });
}

// ============================================
// SLIDES 5-8: POR AGENTE
// ============================================

function slideAgent(
  pptx: pptxgen,
  agentCode: string,
  data: CompareExportData,
  slideNum: number,
  totalSlides: number,
) {
  const stepA = data.stepsA.find(s => s.agent_code === agentCode && s.step_type !== 'consolidate');
  const stepB = data.stepsB.find(s => s.agent_code === agentCode && s.step_type !== 'consolidate');
  if (!stepA && !stepB) return;

  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  const agentColor = C[agentCode as keyof typeof C] || C.gray;

  // Agent header bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: agentColor } });
  slide.addText(AGENT_LABELS[agentCode] || agentCode, {
    x: 0.4, y: 0.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI',
  });

  // Tokens info
  const tokA = stepA ? (stepA.tokens_input + stepA.tokens_output).toLocaleString('pt-BR') : '—';
  const tokB = stepB ? (stepB.tokens_input + stepB.tokens_output).toLocaleString('pt-BR') : '—';
  slide.addText(`A: ${tokA} tokens  •  ${stepA?.status || '—'}     |     B: ${tokB} tokens  •  ${stepB?.status || '—'}`, {
    x: 0.4, y: 0.65, w: 9.2, h: 0.25, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI',
  });

  addFooter(slide, slideNum, totalSlides);

  // Side by side content
  const summaryA = extractSummary(stepA);
  const summaryB = extractSummary(stepB);

  [
    { label: 'A', summary: summaryA, step: stepA, color: C.indigo, x: 0.3 },
    { label: 'B', summary: summaryB, step: stepB, color: C.purple, x: 5.15 },
  ].forEach(item => {
    // Card bg
    slide.addShape(pptx.ShapeType.roundRect, {
      x: item.x, y: 1.05, w: 4.7, h: 5.6,
      fill: { color: C.grayBg }, rectRadius: 0.08,
      line: { color: item.color, width: 1 },
    });

    // Label badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: item.x + 0.15, y: 1.15, w: 0.35, h: 0.3,
      fill: { color: item.color }, rectRadius: 0.05,
    });
    slide.addText(item.label, {
      x: item.x + 0.15, y: 1.15, w: 0.35, h: 0.3,
      fontSize: 10, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center', valign: 'middle',
    });

    // Status
    if (item.step) {
      const statusColor = item.step.status === 'completed' ? C.green : item.step.status === 'failed' ? C.red : C.gray;
      const statusText = item.step.status === 'completed' ? '✓ Concluído' : item.step.status === 'failed' ? '✗ Falhou' : item.step.status;
      slide.addText(statusText, {
        x: item.x + 0.6, y: 1.18, w: 2, h: 0.25, fontSize: 9, bold: true, color: statusColor, fontFace: 'Segoe UI',
      });
    }

    // Error message
    if (item.step?.error_message) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: item.x + 0.15, y: 1.55, w: 4.4, h: 0.4,
        fill: { color: 'FEE2E2' }, rectRadius: 0.05,
      });
      slide.addText(wrapText(item.step.error_message, 120), {
        x: item.x + 0.25, y: 1.55, w: 4.2, h: 0.4,
        fontSize: 7.5, color: C.red, fontFace: 'Segoe UI',
      });
    }

    // Summary content
    const contentY = item.step?.error_message ? 2.05 : 1.55;
    if (item.summary) {
      slide.addText(wrapText(item.summary, 1200), {
        x: item.x + 0.2, y: contentY, w: 4.3, h: 5.6 - (contentY - 1.05),
        fontSize: 8, color: C.dark, fontFace: 'Segoe UI', valign: 'top',
        lineSpacingMultiple: 1.15, shrinkText: true,
      });
    } else {
      slide.addText('Agente não executou nesta análise', {
        x: item.x + 0.2, y: 3, w: 4.3, h: 0.5,
        fontSize: 9, color: C.grayLight, fontFace: 'Segoe UI', italic: true, align: 'center',
      });
    }
  });
}

// ============================================
// SLIDE: CONSOLIDAÇÃO ALEX
// ============================================

function slideConsolidation(pptx: pptxgen, data: CompareExportData, slideNum: number, totalSlides: number) {
  const consA = data.stepsA.find(s => s.agent_code === 'alex' && s.step_type === 'consolidate');
  const consB = data.stepsB.find(s => s.agent_code === 'alex' && s.step_type === 'consolidate');
  if (!consA && !consB) return;

  const slide = pptx.addSlide();
  slide.background = { color: C.white };

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: C.alex } });
  slide.addText('Alex — Consolidação Final', {
    x: 0.4, y: 0.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI',
  });
  addFooter(slide, slideNum, totalSlides);

  [
    { label: 'A', step: consA, color: C.indigo, x: 0.3 },
    { label: 'B', step: consB, color: C.purple, x: 5.15 },
  ].forEach(item => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: item.x, y: 0.8, w: 4.7, h: 5.8,
      fill: { color: C.grayBg }, rectRadius: 0.08,
      line: { color: item.color, width: 1 },
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: item.x + 0.15, y: 0.9, w: 0.35, h: 0.3,
      fill: { color: item.color }, rectRadius: 0.05,
    });
    slide.addText(item.label, {
      x: item.x + 0.15, y: 0.9, w: 0.35, h: 0.3,
      fontSize: 10, bold: true, color: C.white, fontFace: 'Segoe UI', align: 'center', valign: 'middle',
    });

    const summary = extractSummary(item.step);
    if (summary) {
      slide.addText(wrapText(summary, 1500), {
        x: item.x + 0.2, y: 1.3, w: 4.3, h: 5.1,
        fontSize: 8, color: C.dark, fontFace: 'Segoe UI', valign: 'top',
        lineSpacingMultiple: 1.15, shrinkText: true,
      });
    } else {
      slide.addText(item.step ? 'Sem output' : 'Não executou', {
        x: item.x + 0.2, y: 3, w: 4.3, h: 0.5,
        fontSize: 9, color: C.grayLight, fontFace: 'Segoe UI', italic: true, align: 'center',
      });
    }
  });
}

// ============================================
// SLIDE: RESUMO CONSOLIDADO (consolidated_summary)
// ============================================

function slideSummary(pptx: pptxgen, data: CompareExportData, slideNum: number, totalSlides: number) {
  // Can span 2 slides if text is long
  [data.runA, data.runB].forEach((run, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: C.white };
    const color = idx === 0 ? C.indigo : C.purple;
    const label = idx === 0 ? 'A' : 'B';

    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.55, fill: { color } });
    slide.addText(`Resumo Consolidado — Análise ${label}`, {
      x: 0.4, y: 0.08, w: 8, h: 0.4, fontSize: 14, bold: true, color: C.white, fontFace: 'Segoe UI',
    });
    slide.addText(`${wrapText(run.objective, 70)}  •  ${fmtDate(run.started_at)}  •  ${run.started_by_name || '—'}`, {
      x: 0.4, y: 0.6, w: 9.2, h: 0.25, fontSize: 8, color: C.grayLight, fontFace: 'Segoe UI',
    });

    addFooter(slide, slideNum + idx, totalSlides);

    if (run.consolidated_summary) {
      slide.addText(wrapText(run.consolidated_summary, 3000), {
        x: 0.4, y: 1.0, w: 9.2, h: 5.8,
        fontSize: 9, color: C.dark, fontFace: 'Segoe UI', valign: 'top',
        lineSpacingMultiple: 1.2, shrinkText: true,
      });
    } else {
      slide.addText('Sem resumo consolidado disponível', {
        x: 1, y: 3, w: 8, h: 0.5,
        fontSize: 12, color: C.grayLight, fontFace: 'Segoe UI', italic: true, align: 'center',
      });
    }
  });
}

// ============================================
// MAIN EXPORT
// ============================================

export async function exportComparePPT(data: CompareExportData): Promise<void> {
  const pptx = new pptxgen();
  pptx.author = 'RAIZ Educação';
  pptx.company = 'Raiz Educação S.A.';
  pptx.title = 'Comparação de Análises — Equipe Alpha';
  pptx.subject = 'Gerado pelo Sistema DRE RAIZ';
  pptx.layout = 'LAYOUT_16x9';

  // Count slides for footer numbering
  const agentCodes = ['alex', 'carlos', 'denilson', 'edmundo'];
  const hasAgentSlide = agentCodes.map(code =>
    data.stepsA.some(s => s.agent_code === code && s.step_type !== 'consolidate') ||
    data.stepsB.some(s => s.agent_code === code && s.step_type !== 'consolidate')
  );
  const hasConsolidation = data.stepsA.some(s => s.step_type === 'consolidate') || data.stepsB.some(s => s.step_type === 'consolidate');
  const fsA = data.runA.financial_summary as FinancialSummary | null;
  const fsB = data.runB.financial_summary as FinancialSummary | null;
  const hasTrend = !!(fsA?.tendencia_mensal?.length && fsB?.tendencia_mensal?.length);
  const hasTopTags = !!(fsA || fsB);

  let totalSlides = 1; // cover
  totalSlides += 1; // KPIs
  if (hasTrend) totalSlides += 1;
  if (hasTopTags) totalSlides += 1;
  totalSlides += hasAgentSlide.filter(Boolean).length;
  if (hasConsolidation) totalSlides += 1;
  totalSlides += 2; // summary A + B

  let slideNum = 1;

  // 1. Cover
  slideCover(pptx, data, totalSlides);
  slideNum++;

  // 2. KPIs
  slideKPIs(pptx, data, slideNum, totalSlides);
  slideNum++;

  // 3. Trend (optional)
  if (hasTrend) {
    slideTrend(pptx, data, slideNum, totalSlides);
    slideNum++;
  }

  // 4. Top Tags (optional)
  if (hasTopTags) {
    slideTopTags(pptx, data, slideNum, totalSlides);
    slideNum++;
  }

  // 5-8. Agent slides
  agentCodes.forEach((code, i) => {
    if (hasAgentSlide[i]) {
      slideAgent(pptx, code, data, slideNum, totalSlides);
      slideNum++;
    }
  });

  // 9. Consolidation
  if (hasConsolidation) {
    slideConsolidation(pptx, data, slideNum, totalSlides);
    slideNum++;
  }

  // 10-11. Summary A + B
  slideSummary(pptx, data, slideNum, totalSlides);

  // Generate file
  const dateStr = new Date().toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `comparacao-analises-${dateStr}.pptx` });
}
