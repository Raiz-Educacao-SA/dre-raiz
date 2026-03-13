/**
 * Script para gerar PPT de Onboarding — Manual de Uso DRE Raiz
 * Executar: npx tsx docs/generate-onboarding-ppt.ts
 */
import PptxGenJSModule from 'pptxgenjs';
const PptxGenJS = (PptxGenJSModule as any).default || PptxGenJSModule;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in

// ── Cores ──
const ORANGE = 'F44C00';
const DARK = '1E293B';
const GRAY = '64748B';
const WHITE = 'FFFFFF';
const LIGHT_BG = 'F8FAFC';
const GREEN = '16A34A';
const RED = 'DC2626';
const BLUE = '2563EB';
const PURPLE = '7C3AED';
const AMBER = 'D97706';

const TOTAL_SLIDES = 17;

const addFooter = (slide: PptxGenJS.Slide, num: number, total: number) => {
  slide.addText('Raiz Educacao — Planejamento Financeiro', { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri' });
  slide.addText(`${num}/${total}`, { x: 12.0, y: 7.0, w: 1, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri', align: 'right' });
};

/** Helper: standard slide header (orange bar + title + underline) */
const addSlideHeader = (slide: PptxGenJS.Slide, title: string, opts?: { bg?: string; subtitle?: string }) => {
  slide.background = { fill: opts?.bg || WHITE };
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
  slide.addText(title, { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.0, w: 2, h: 0.04, fill: { color: ORANGE } });
  if (opts?.subtitle) {
    slide.addText(opts.subtitle, { x: 0.8, y: 1.05, w: 10, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: GRAY, italic: true });
  }
};

/** Helper: bullet list on a slide */
const addBulletList = (slide: PptxGenJS.Slide, items: string[], opts: { x: number; y: number; w: number; fontSize?: number; lineSpacing?: number }) => {
  const text = items.map(i => `•  ${i}`).join('\n');
  slide.addText(text, {
    x: opts.x, y: opts.y, w: opts.w, h: items.length * 0.42,
    fontSize: opts.fontSize || 12, fontFace: 'Calibri', color: DARK,
    lineSpacingMultiple: opts.lineSpacing || 1.5,
  });
};

// ════════════════════════════════════════════════════════════════
// SLIDE 1: CAPA
// ════════════════════════════════════════════════════════════════
const s1 = pptx.addSlide();
s1.background = { fill: DARK };
s1.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s1.addText('DRE Raiz', { x: 1, y: 1.8, w: 11.33, h: 1.0, fontSize: 48, fontFace: 'Calibri', bold: true, color: WHITE });
s1.addText('Plataforma de Gestao Financeira', { x: 1, y: 2.8, w: 11.33, h: 0.7, fontSize: 24, fontFace: 'Calibri', color: 'CBD5E1' });
s1.addShape(pptx.shapes.RECTANGLE, { x: 1, y: 3.7, w: 3, h: 0.04, fill: { color: ORANGE } });
s1.addText('Manual de Uso e Guia do Usuario', { x: 1, y: 4.1, w: 8, h: 0.5, fontSize: 18, fontFace: 'Calibri', color: '94A3B8' });
s1.addText('Planejamento Financeiro — Raiz Educacao S.A. — Marco 2026', { x: 1, y: 5.5, w: 8, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: '64748B' });
s1.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: ORANGE } });

// ════════════════════════════════════════════════════════════════
// SLIDE 2: BEM-VINDO
// ════════════════════════════════════════════════════════════════
const s2 = pptx.addSlide();
addSlideHeader(s2, 'Bem-vindo a DRE Raiz', { bg: LIGHT_BG });

s2.addText('O que e a DRE Raiz?', { x: 0.8, y: 1.3, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: ORANGE });
s2.addText(
  'A plataforma DRE Raiz centraliza toda a gestao financeira da Raiz Educacao, substituindo o processo manual anterior (Alteryx -> Excel -> PPT) por uma solucao integrada, em tempo real e com inteligencia artificial.',
  { x: 0.8, y: 1.75, w: 11, h: 0.8, fontSize: 13, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);

const beneficios = [
  { icon: '01', title: 'Acesso via navegador', desc: 'Sem instalacao — qualquer dispositivo com internet', color: BLUE },
  { icon: '02', title: 'Dados em tempo real', desc: 'Integrado ao Supabase — atualizacao instantanea', color: GREEN },
  { icon: '03', title: 'IA integrada', desc: 'Sinteses, sumarios e melhorias automaticas com Claude', color: PURPLE },
  { icon: '04', title: 'Rastreabilidade total', desc: 'Cada alteracao e justificada, versionada e aprovada', color: ORANGE },
];

beneficios.forEach((b, i) => {
  const y = 2.8 + i * 1.0;
  s2.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.8, fill: { color: WHITE }, shadow: { type: 'outer', blur: 4, offset: 2, color: 'C0C0C0' }, rectRadius: 0.1 });
  s2.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.08, h: 0.8, fill: { color: b.color } });
  s2.addText(b.icon, { x: 1.1, y, w: 0.6, h: 0.8, fontSize: 20, fontFace: 'Calibri', bold: true, color: b.color, valign: 'middle', align: 'center' });
  s2.addText(b.title, { x: 1.8, y: y + 0.05, w: 5, h: 0.35, fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK });
  s2.addText(b.desc, { x: 1.8, y: y + 0.4, w: 9, h: 0.3, fontSize: 11, fontFace: 'Calibri', color: GRAY });
});

addFooter(s2, 2, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 3: MENU PRINCIPAL (Navegacao)
// ════════════════════════════════════════════════════════════════
const s3 = pptx.addSlide();
addSlideHeader(s3, 'Navegacao — Menu Lateral');

const menuItems = [
  { name: 'DRE Gerencial', desc: 'Demonstrativo de resultado, filtros, drill-down, exportacao', access: 'Todos', color: ORANGE },
  { name: 'Lancamentos', desc: 'Transacoes individuais, busca, edicao em massa', access: 'Todos', color: BLUE },
  { name: 'Aprovacoes', desc: 'Fila de aprovacao de alteracoes (admin/gestor)', access: 'Admin', color: PURPLE },
  { name: 'Analise Financeira', desc: 'Corte DRE, justificativas, plano de acao, slides', access: 'Todos', color: GREEN },
];

menuItems.forEach((item, i) => {
  const y = 1.25 + i * 0.72;
  s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.6, fill: { color: LIGHT_BG }, rectRadius: 0.08 });
  s3.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.6, fill: { color: item.color } });
  s3.addText(item.name, { x: 1.1, y, w: 2.8, h: 0.6, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK, valign: 'middle' });
  s3.addText(item.desc, { x: 4.0, y, w: 6.5, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
  // Access badge
  s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 11.0, y: y + 0.12, w: 1.2, h: 0.35, fill: { color: item.access === 'Admin' ? PURPLE : GREEN }, rectRadius: 0.15 });
  s3.addText(item.access, { x: 11.0, y: y + 0.12, w: 1.2, h: 0.35, fontSize: 9, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
});

addFooter(s3, 3, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 4: DRE GERENCIAL (Visao Geral)
// ════════════════════════════════════════════════════════════════
const s4 = pptx.addSlide();
addSlideHeader(s4, 'DRE Gerencial — Sua Visao Principal', { bg: LIGHT_BG });

// Left column
s4.addText('Filtros Disponiveis', { x: 0.8, y: 1.3, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const filtros = ['Marca', 'Filial (cascata da Marca)', 'Tag01 (centro de custo)', 'Tag02 (segmento)', 'Tag03 (projeto)', 'Mes / Periodo', 'Recorrencia'];
filtros.forEach((f, i) => {
  s4.addText(`•  ${f}`, { x: 1.0, y: 1.75 + i * 0.35, w: 5, h: 0.3, fontSize: 11, fontFace: 'Calibri', color: DARK });
});

// Right column
s4.addText('Funcionalidades', { x: 7.0, y: 1.3, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const funcionalidades = [
  { text: '3 modos de visualizacao', desc: 'Consolidado | Cenario | Mes' },
  { text: 'Drill-down', desc: 'Duplo clique em qualquer linha' },
  { text: 'Exportacao Excel', desc: 'Fiel a tela, formatado' },
  { text: 'Hierarquia DRE', desc: 'Tag0 (secao) -> Tag01 (centro de custo)' },
  { text: 'Linhas calculadas', desc: 'Margem de Contribuicao, EBITDA' },
];
funcionalidades.forEach((f, i) => {
  const y = 1.75 + i * 0.65;
  s4.addText(f.text, { x: 7.2, y, w: 5, h: 0.3, fontSize: 12, fontFace: 'Calibri', bold: true, color: DARK });
  s4.addText(f.desc, { x: 7.2, y: y + 0.28, w: 5, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: GRAY });
});

// Hierarquia DRE visual
s4.addText('Estrutura da DRE', { x: 0.8, y: 4.8, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: DARK });
const dreGroups = [
  { prefix: '01.', name: 'RECEITA LIQUIDA', color: GREEN },
  { prefix: '02.', name: 'CUSTOS VARIAVEIS', color: RED },
  { prefix: '03.', name: 'CUSTOS FIXOS', color: RED },
  { prefix: '04.', name: 'DESPESAS SG&A', color: AMBER },
  { prefix: '06.', name: 'RATEIO RAIZ', color: PURPLE },
];
dreGroups.forEach((g, i) => {
  const x = 0.8 + i * 2.45;
  s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 5.3, w: 2.3, h: 0.7, fill: { color: WHITE }, line: { color: g.color, width: 1.5 }, rectRadius: 0.1 });
  s4.addText(g.prefix, { x, y: 5.3, w: 2.3, h: 0.35, fontSize: 10, fontFace: 'Calibri', bold: true, color: g.color, align: 'center' });
  s4.addText(g.name, { x, y: 5.6, w: 2.3, h: 0.35, fontSize: 9, fontFace: 'Calibri', color: DARK, align: 'center' });
});

// Calculated rows
s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.2, w: 5.5, h: 0.55, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.08 });
s4.addText('MARGEM DE CONTRIBUICAO = Receita + Custos Variaveis', { x: 1.0, y: 6.2, w: 5.2, h: 0.55, fontSize: 10, fontFace: 'Calibri', bold: true, color: BLUE, valign: 'middle' });

s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.6, y: 6.2, w: 5.93, h: 0.55, fill: { color: 'F0FDF4' }, line: { color: GREEN, width: 1 }, rectRadius: 0.08 });
s4.addText('EBITDA = Margem + Custos Fixos + SG&A + Rateio', { x: 6.8, y: 6.2, w: 5.5, h: 0.55, fontSize: 10, fontFace: 'Calibri', bold: true, color: GREEN, valign: 'middle' });

addFooter(s4, 4, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 5: DRE GERENCIAL (3 Modos de Visualizacao)
// ════════════════════════════════════════════════════════════════
const s5 = pptx.addSlide();
addSlideHeader(s5, '3 Modos de Visualizacao');

const modos = [
  {
    name: 'Consolidado',
    color: ORANGE,
    desc: 'Visao padrao para analise mensal',
    details: [
      'Colunas: Real | Orcado | A-1',
      'Delta R$ e Delta % vs Orcado',
      'Delta R$ e Delta % vs A-1',
      'Ideal para: analise de desvios',
    ],
  },
  {
    name: 'Cenario',
    color: BLUE,
    desc: 'Meses lado a lado por cenario',
    details: [
      'Cada mes como coluna separada',
      'Agrupado por cenario (Real/Orcado/A-1)',
      'Facilita comparacao temporal',
      'Ideal para: evolucao mensal',
    ],
  },
  {
    name: 'Mes',
    color: PURPLE,
    desc: 'Cada mes com seus 3 cenarios',
    details: [
      'Mes a mes lado a lado',
      'Cada um com Real | Orcado | A-1',
      'Visao completa por periodo',
      'Ideal para: analise detalhada',
    ],
  },
];

modos.forEach((modo, i) => {
  const x = 0.8 + i * 4.1;
  s5.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.3, w: 3.8, h: 5.2, fill: { color: LIGHT_BG }, line: { color: modo.color, width: 2 }, rectRadius: 0.15 });
  // Header bar
  s5.addShape(pptx.shapes.RECTANGLE, { x: x + 0.01, y: 1.31, w: 3.78, h: 0.7, fill: { color: modo.color }, rectRadius: 0 });
  s5.addText(modo.name, { x, y: 1.35, w: 3.8, h: 0.65, fontSize: 20, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  // Description
  s5.addText(modo.desc, { x: x + 0.2, y: 2.2, w: 3.4, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: DARK, align: 'center' });
  // Details
  modo.details.forEach((d, j) => {
    const isLast = j === modo.details.length - 1;
    s5.addText(`•  ${d}`, {
      x: x + 0.3, y: 2.8 + j * 0.5, w: 3.2, h: 0.4,
      fontSize: 11, fontFace: 'Calibri', color: isLast ? modo.color : DARK,
      bold: isLast,
    });
  });
});

addFooter(s5, 5, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 6: LANCAMENTOS
// ════════════════════════════════════════════════════════════════
const s6 = pptx.addSlide();
addSlideHeader(s6, 'Lancamentos — Transacoes Individuais', { bg: LIGHT_BG });

s6.addText('14 filtros disponiveis', { x: 0.8, y: 1.3, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
s6.addText(
  'Cenario, Data, Marca, Filial, Tag01, Tag02, Tag03, Fornecedor, Conta Contabil, Tipo, Recorrencia, Valor, Descricao, Chave ID',
  { x: 0.8, y: 1.75, w: 5.5, h: 0.8, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 }
);

// Feature cards
const lancFeatures = [
  { title: 'Busca Sob Demanda', desc: 'Tabela vazia ao abrir — clique "Buscar Dados" para carregar. Evita carga desnecessaria.', color: BLUE },
  { title: 'Edicao em Massa', desc: 'Selecione transacoes -> altere campo -> justifique -> envie para fila de aprovacao.', color: ORANGE },
  { title: 'Densidade Ajustavel', desc: '3 niveis: Confortavel | Compacto | Ultra. Ajuste ao seu gosto.', color: GREEN },
  { title: 'Colunas Configuraveis', desc: 'Show/hide por coluna. Configuracao salva automaticamente no navegador.', color: PURPLE },
  { title: 'Drill-down da DRE', desc: 'Ao clicar na DRE, abre Lancamentos com filtros pre-aplicados automaticamente.', color: AMBER },
];

lancFeatures.forEach((f, i) => {
  const y = 2.8 + i * 0.85;
  s6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.7, fill: { color: WHITE }, rectRadius: 0.08 });
  s6.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.7, fill: { color: f.color } });
  s6.addText(f.title, { x: 1.1, y: y + 0.02, w: 3, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK });
  s6.addText(f.desc, { x: 4.2, y, w: 7.8, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

addFooter(s6, 6, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 7: APROVACOES
// ════════════════════════════════════════════════════════════════
const s7 = pptx.addSlide();
addSlideHeader(s7, 'Aprovacoes — Fila de Alteracoes');

s7.addText(
  'Toda alteracao solicitada por usuarios passa por uma fila de aprovacao antes de ser aplicada ao banco de dados.',
  { x: 0.8, y: 1.2, w: 11, h: 0.5, fontSize: 13, fontFace: 'Calibri', color: DARK }
);

s7.addText('Tipos de Alteracao', { x: 0.8, y: 1.9, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });

const tipos = ['Conta contabil', 'Data', 'Rateio', 'Exclusao', 'Marca', 'Filial', 'Multi-campo'];
tipos.forEach((t, i) => {
  const col = i < 4 ? 0 : 1;
  const row = i < 4 ? i : i - 4;
  s7.addText(`•  ${t}`, { x: 1.0 + col * 3, y: 2.35 + row * 0.35, w: 2.8, h: 0.3, fontSize: 11, fontFace: 'Calibri', color: DARK });
});

// Flow
s7.addText('Fluxo de Aprovacao', { x: 0.8, y: 3.8, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: DARK });

const approvalFlow = [
  { label: 'Solicitado', color: AMBER, desc: 'Usuario submete' },
  { label: 'Em Revisao', color: BLUE, desc: 'Admin analisa' },
  { label: 'Aplicado', color: GREEN, desc: 'Alteracao efetivada' },
];
approvalFlow.forEach((st, i) => {
  const x = 0.8 + i * 3.5;
  s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 4.3, w: 2.8, h: 1.0, fill: { color: LIGHT_BG }, line: { color: st.color, width: 2 }, rectRadius: 0.12 });
  s7.addText(st.label, { x, y: 4.35, w: 2.8, h: 0.45, fontSize: 14, fontFace: 'Calibri', bold: true, color: st.color, align: 'center' });
  s7.addText(st.desc, { x, y: 4.8, w: 2.8, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: GRAY, align: 'center' });
  if (i < approvalFlow.length - 1) {
    s7.addText('-->', { x: x + 2.8, y: 4.5, w: 0.7, h: 0.5, fontSize: 18, color: 'CBD5E1', align: 'center', valign: 'middle' });
  }
});

// Rejeitado branch
s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 4.3, y: 5.6, w: 2.8, h: 0.8, fill: { color: 'FEF2F2' }, line: { color: RED, width: 2 }, rectRadius: 0.12 });
s7.addText('Rejeitado', { x: 4.3, y: 5.65, w: 2.8, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: RED, align: 'center' });
s7.addText('Usuario pode ajustar e resubmeter', { x: 4.3, y: 6.0, w: 2.8, h: 0.3, fontSize: 9, fontFace: 'Calibri', color: GRAY, align: 'center' });

// Info box
s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.5, y: 4.3, w: 5.03, h: 2.1, fill: { color: 'FFF7ED' }, line: { color: ORANGE, width: 1 }, rectRadius: 0.1 });
s7.addText('Detalhes do Modal', { x: 7.8, y: 4.4, w: 4, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: ORANGE });
s7.addText(
  '• Antes vs Depois (comparacao visual)\n• Justificativa do solicitante\n• Nome e data da solicitacao\n• Aprovacao individual ou em massa\n• Historico completo de acoes',
  { x: 7.8, y: 4.8, w: 4.5, h: 1.4, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);

addFooter(s7, 7, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 8: ANALISE FINANCEIRA (Visao Geral)
// ════════════════════════════════════════════════════════════════
const s8 = pptx.addSlide();
addSlideHeader(s8, 'Analise Financeira — Processo Mensal', { bg: LIGHT_BG });

s8.addText(
  'A Analise Financeira integra 4 abas em um fluxo completo — do snapshot ao PPT executivo.',
  { x: 0.8, y: 1.2, w: 11, h: 0.5, fontSize: 13, fontFace: 'Calibri', color: DARK }
);

const abas = [
  { num: '1', name: 'Corte DRE (Justificativas)', desc: 'Snapshot imutavel do mes + justificativas obrigatorias de desvios > 5%. Ponto de partida do processo.', color: ORANGE },
  { num: '2', name: 'Sumario Executivo', desc: 'Resumo narrativo completo gerado por IA. Analisa panorama, desvios, riscos e oportunidades.', color: BLUE },
  { num: '3', name: 'Plano de Acao', desc: 'Consolidacao 5W1H de todos os planos corretivos. Acompanhamento e revisao.', color: GREEN },
  { num: '4', name: 'Slides de Analise', desc: 'PPT automatico para reuniao de resultados. Integra dados, justificativas e sintese IA.', color: PURPLE },
];

abas.forEach((aba, i) => {
  const y = 2.0 + i * 1.2;
  s8.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 1.0, fill: { color: WHITE }, shadow: { type: 'outer', blur: 4, offset: 2, color: 'C0C0C0' }, rectRadius: 0.12 });
  s8.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.08, h: 1.0, fill: { color: aba.color } });
  s8.addShape(pptx.shapes.OVAL, { x: 1.1, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: aba.color } });
  s8.addText(aba.num, { x: 1.1, y: y + 0.25, w: 0.5, h: 0.5, fontSize: 18, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s8.addText(aba.name, { x: 1.9, y: y + 0.08, w: 8, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: DARK });
  s8.addText(aba.desc, { x: 1.9, y: y + 0.5, w: 9.5, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: GRAY });
});

// Flow arrows
s8.addText('Fluxo:  Foto --> Justificativas --> Sumario IA --> PPT Executivo', {
  x: 0.8, y: 6.4, w: 11.73, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: ORANGE, align: 'center',
});

addFooter(s8, 8, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 9: CORTE DRE (Justificativas)
// ════════════════════════════════════════════════════════════════
const s9 = pptx.addSlide();
addSlideHeader(s9, 'Corte DRE — Foto e Justificativas');

// Steps
const fotoSteps = [
  { num: '1', text: 'PlanFin gera a "Foto" do mes (snapshot imutavel)' },
  { num: '2', text: 'Cada mes tem foto independente (Jan=Jan, Fev=Fev)' },
  { num: '3', text: 'Desvios >5% exigem justificativa obrigatoria' },
  { num: '4', text: 'Pacoteiros justificam no nivel Tag02+Marca' },
  { num: '5', text: 'IA sintetiza automaticamente: Tag02 -> Tag01 -> Tag0' },
];
fotoSteps.forEach((step, i) => {
  const y = 1.3 + i * 0.6;
  s9.addShape(pptx.shapes.OVAL, { x: 1, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: ORANGE } });
  s9.addText(step.num, { x: 1, y: y + 0.05, w: 0.4, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s9.addText(step.text, { x: 1.6, y, w: 5.5, h: 0.5, fontSize: 12, fontFace: 'Calibri', color: DARK, valign: 'middle' });
});

// Hierarquia
s9.addText('Hierarquia de Desvios', { x: 7.2, y: 1.3, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });

const hierarquia = [
  { nivel: 'Tag0', ex: '01. RECEITA LIQUIDA', desc: 'Grupo principal DRE', color: DARK },
  { nivel: 'Tag01', ex: 'Folha (Funcionarios)', desc: 'Centro de custo', color: BLUE },
  { nivel: 'Tag02', ex: 'Ensino Fundamental', desc: 'Segmento - JUSTIFICATIVA', color: PURPLE },
  { nivel: 'Marca', ex: 'AP, CLV, GEU, GT...', desc: 'Unidade de negocio', color: ORANGE },
];

hierarquia.forEach((h, i) => {
  const y = 1.9 + i * 0.7;
  s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.2, y, w: 5.33, h: 0.55, fill: { color: LIGHT_BG }, rectRadius: 0.08 });
  s9.addShape(pptx.shapes.RECTANGLE, { x: 7.2, y, w: 0.06, h: 0.55, fill: { color: h.color } });
  s9.addText(h.nivel, { x: 7.5, y, w: 1.0, h: 0.55, fontSize: 11, fontFace: 'Calibri', bold: true, color: h.color, valign: 'middle' });
  s9.addText(h.ex, { x: 8.5, y, w: 2.2, h: 0.55, fontSize: 10, fontFace: 'Calibri', color: DARK, valign: 'middle' });
  s9.addText(h.desc, { x: 10.7, y, w: 1.7, h: 0.55, fontSize: 9, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
  if (i < hierarquia.length - 1) {
    s9.addText('|', { x: 9.6, y: y + 0.45, w: 0.3, h: 0.3, fontSize: 12, color: 'CBD5E1', align: 'center' });
  }
});

// Important rule box
s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 4.8, w: 11.73, h: 1.8, fill: { color: 'FFF7ED' }, line: { color: ORANGE, width: 1.5 }, rectRadius: 0.15 });
s9.addText('Regras do Snapshot', { x: 1.2, y: 4.9, w: 5, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: ORANGE });
s9.addText(
  '• Valores do snapshot sao a referencia oficial — imutaveis apos geracao\n' +
  '• A foto pode ser re-gerada (nova versao), mas preserva justificativas existentes\n' +
  '• O painel YTD soma automaticamente os meses com foto\n' +
  '• Fontes: get_soma_tags (tag0/tag01) e get_variance_snapshot (tag02/marca)\n' +
  '• NUNCA usa dre_agg — sempre tabelas-fonte para garantir fidelidade',
  { x: 1.2, y: 5.3, w: 10.5, h: 1.2, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);

addFooter(s9, 9, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 10: JUSTIFICATIVAS (Como Preencher)
// ════════════════════════════════════════════════════════════════
const s10 = pptx.addSlide();
addSlideHeader(s10, 'Como Justificar um Desvio', { bg: LIGHT_BG });

// Steps
const justSteps = [
  'Localize seu item (filtre por "Pendente")',
  'Clique no icone de lapis na linha do desvio',
  'Escreva a justificativa (min. 20 caracteres)',
  'Se desvio negativo: preencha o Plano de Acao 5W1H',
  'Clique em "Salvar"',
];
justSteps.forEach((step, i) => {
  const y = 1.3 + i * 0.55;
  s10.addShape(pptx.shapes.OVAL, { x: 0.9, y: y + 0.05, w: 0.35, h: 0.35, fill: { color: ORANGE } });
  s10.addText(`${i + 1}`, { x: 0.9, y: y + 0.05, w: 0.35, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s10.addText(step, { x: 1.5, y, w: 10, h: 0.45, fontSize: 12, fontFace: 'Calibri', color: DARK, valign: 'middle' });
});

// Good examples
s10.addText('BOAS justificativas:', { x: 0.8, y: 4.2, w: 6, h: 0.35, fontSize: 14, fontFace: 'Calibri', bold: true, color: GREEN });

const goodRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Exemplo', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri' } },
  ],
  [
    { text: '"Contratacao de 3 professores para turma extra em Fev/26. Impacto R$ 45k/mes"', options: { fontSize: 10, fontFace: 'Calibri', color: DARK } },
  ],
  [
    { text: '"Renegociacao com fornecedor XYZ: desconto 15%. Economia R$ 32k"', options: { fontSize: 10, fontFace: 'Calibri', color: DARK } },
  ],
];
s10.addTable(goodRows, { x: 0.8, y: 4.55, w: 11.73, colW: [11.73], rowH: 0.35, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } });

// Bad examples
s10.addText('EVITE:', { x: 0.8, y: 5.7, w: 6, h: 0.35, fontSize: 14, fontFace: 'Calibri', bold: true, color: RED });

const badRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Exemplo Ruim', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: RED }, fontFace: 'Calibri' } },
    { text: 'Por que e ruim', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: RED }, fontFace: 'Calibri' } },
  ],
  [
    { text: '"Custo acima do orcado"', options: { fontSize: 10, fontFace: 'Calibri', color: RED } },
    { text: 'Repete o numero — nao explica a causa', options: { fontSize: 10, fontFace: 'Calibri', color: GRAY } },
  ],
  [
    { text: '"Variacao normal"', options: { fontSize: 10, fontFace: 'Calibri', color: RED } },
    { text: 'Toda variacao tem causa — nao existe "normal"', options: { fontSize: 10, fontFace: 'Calibri', color: GRAY } },
  ],
];
s10.addTable(badRows, { x: 0.8, y: 6.05, w: 11.73, colW: [5, 6.73], rowH: 0.3, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } });

addFooter(s10, 10, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 11: PLANO DE ACAO 5W1H
// ════════════════════════════════════════════════════════════════
const s11 = pptx.addSlide();
addSlideHeader(s11, 'Plano de Acao — 5W1H Simplificado');
s11.addText('Obrigatorio para desvios negativos (custo acima ou receita abaixo do orcado)', { x: 0.8, y: 1.05, w: 10, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: GRAY, italic: true });

const w1hRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Campo', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri' } },
    { text: 'Descricao', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri' } },
    { text: 'Obrigatorio?', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'What (O que)', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: ORANGE } },
    { text: 'Acao corretiva a ser implementada', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'SIM', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: RED, align: 'center' } },
  ],
  [
    { text: 'Why (Por que)', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: ORANGE } },
    { text: 'Objetivo da acao', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'SIM', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: RED, align: 'center' } },
  ],
  [
    { text: 'How (Como)', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: BLUE } },
    { text: 'Passos de execucao detalhados', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Opcional', options: { fontSize: 11, fontFace: 'Calibri', color: BLUE, align: 'center' } },
  ],
  [
    { text: 'Who (Quem)', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: ORANGE } },
    { text: 'Responsavel pela execucao', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'SIM', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: RED, align: 'center' } },
  ],
  [
    { text: 'When (Quando)', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: ORANGE } },
    { text: 'Prazo para conclusao (+30 dias default)', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'SIM', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: RED, align: 'center' } },
  ],
  [
    { text: 'Impacto', options: { fontSize: 11, fontFace: 'Calibri', bold: true, color: BLUE } },
    { text: 'Resultado financeiro esperado', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Opcional', options: { fontSize: 11, fontFace: 'Calibri', color: BLUE, align: 'center' } },
  ],
];

s11.addTable(w1hRows, {
  x: 0.8, y: 1.6, w: 11.73,
  colW: [3, 6.5, 2.23],
  rowH: 0.55,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  autoPage: false,
});

// Example box
s11.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 5.6, w: 11.73, h: 1.2, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s11.addText('Exemplo Completo', { x: 1.2, y: 5.65, w: 5, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: BLUE });
s11.addText(
  'What: Renegociar contrato de energia  |  Why: Reduzir custo em 15%  |  Who: Maria Silva (Facilities)  |  When: 30/04/2026  |  Impacto: -R$ 18k/mes',
  { x: 1.2, y: 6.05, w: 10.5, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 }
);

addFooter(s11, 11, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 12: FLUXO DE STATUS
// ════════════════════════════════════════════════════════════════
const s12 = pptx.addSlide();
addSlideHeader(s12, 'Fluxo de Aprovacao', { bg: LIGHT_BG });

const flowStatuses = [
  { label: 'PENDENTE', color: AMBER, desc: 'Aguardando justificativa\ndo pacoteiro', x: 0.5 },
  { label: 'NOTIFICADO', color: BLUE, desc: 'Email enviado ao\nresponsavel', x: 3.2 },
  { label: 'JUSTIFICADO', color: PURPLE, desc: 'Pacoteiro preencheu\njustificativa', x: 5.9 },
  { label: 'APROVADO', color: GREEN, desc: 'PlanFin aprovou\na justificativa', x: 8.6 },
];

flowStatuses.forEach((st, i) => {
  s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: st.x, y: 1.5, w: 2.4, h: 1.5, fill: { color: WHITE }, line: { color: st.color, width: 2.5 }, rectRadius: 0.15 });
  s12.addShape(pptx.shapes.OVAL, { x: st.x + 0.85, y: 1.65, w: 0.7, h: 0.7, fill: { color: st.color } });
  s12.addText(st.label.charAt(0), { x: st.x + 0.85, y: 1.65, w: 0.7, h: 0.7, fontSize: 22, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s12.addText(st.label, { x: st.x, y: 2.4, w: 2.4, h: 0.3, fontSize: 12, fontFace: 'Calibri', bold: true, color: st.color, align: 'center' });
  s12.addText(st.desc, { x: st.x + 0.1, y: 2.65, w: 2.2, h: 0.35, fontSize: 9, fontFace: 'Calibri', color: GRAY, align: 'center' });
  if (i < flowStatuses.length - 1) {
    s12.addText('-->', { x: st.x + 2.4, y: 1.9, w: 0.8, h: 0.5, fontSize: 20, color: 'CBD5E1', align: 'center', valign: 'middle' });
  }
});

// Rejeitado
s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 11.3, y: 1.5, w: 1.8, h: 1.5, fill: { color: 'FEF2F2' }, line: { color: RED, width: 2.5 }, rectRadius: 0.15 });
s12.addShape(pptx.shapes.OVAL, { x: 11.85, y: 1.65, w: 0.7, h: 0.7, fill: { color: RED } });
s12.addText('R', { x: 11.85, y: 1.65, w: 0.7, h: 0.7, fontSize: 22, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
s12.addText('REJEITADO', { x: 11.3, y: 2.4, w: 1.8, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: RED, align: 'center' });
s12.addText('Volta ao\npacoteiro', { x: 11.3, y: 2.65, w: 1.8, h: 0.35, fontSize: 9, fontFace: 'Calibri', color: GRAY, align: 'center' });

// Explanation
s12.addText('Como funciona a cascata IA?', { x: 0.8, y: 3.5, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: PURPLE });
s12.addText(
  'Quando todas as justificativas de nivel Tag02+Marca estao preenchidas, a IA (Claude Haiku) gera automaticamente uma sintese consolidada nos niveis superiores:',
  { x: 0.8, y: 3.95, w: 11, h: 0.5, fontSize: 12, fontFace: 'Calibri', color: DARK }
);

const cascadeSteps = [
  { label: 'Tag02+Marca', desc: 'Pacoteiro escreve', color: PURPLE },
  { label: 'Tag01', desc: 'IA sintetiza', color: BLUE },
  { label: 'Tag0', desc: 'IA sintetiza', color: DARK },
];
cascadeSteps.forEach((cs, i) => {
  const x = 1.5 + i * 3.8;
  s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 4.7, w: 3.0, h: 0.8, fill: { color: WHITE }, line: { color: cs.color, width: 1.5 }, rectRadius: 0.1 });
  s12.addText(cs.label, { x, y: 4.72, w: 3.0, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: cs.color, align: 'center' });
  s12.addText(cs.desc, { x, y: 5.1, w: 3.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: GRAY, align: 'center' });
  if (i < cascadeSteps.length - 1) {
    s12.addText('-->', { x: x + 3.0, y: 4.85, w: 0.8, h: 0.5, fontSize: 18, color: 'CBD5E1', align: 'center', valign: 'middle' });
  }
});

// Info box
s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 5.8, w: 11.73, h: 0.9, fill: { color: 'F5F3FF' }, line: { color: PURPLE, width: 1 }, rectRadius: 0.1 });
s12.addText(
  'A sintese IA e usada automaticamente nos Slides de Analise e no PPT Executivo. Nenhuma acao adicional necessaria.',
  { x: 1.2, y: 5.9, w: 10.5, h: 0.7, fontSize: 12, fontFace: 'Calibri', color: DARK, valign: 'middle' }
);

addFooter(s12, 12, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 13: SUMARIO EXECUTIVO
// ════════════════════════════════════════════════════════════════
const s13 = pptx.addSlide();
addSlideHeader(s13, 'Sumario Executivo — IA');

s13.addText(
  'Resumo narrativo completo gerado automaticamente por Inteligencia Artificial a partir dos dados do snapshot.',
  { x: 0.8, y: 1.2, w: 11, h: 0.5, fontSize: 13, fontFace: 'Calibri', color: DARK }
);

s13.addText('O que analisa:', { x: 0.8, y: 1.9, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const analyzes = [
  'Panorama geral do resultado do mes',
  'Principais desvios positivos e negativos',
  'Comparacao: Real vs Orcado, Real vs Ano Anterior',
  'Riscos e oportunidades identificados',
  'Recomendacoes baseadas nos dados',
];
analyzes.forEach((a, i) => {
  s13.addText(`•  ${a}`, { x: 1.0, y: 2.3 + i * 0.4, w: 5.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});

s13.addText('Como usar:', { x: 7, y: 1.9, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const howTo = [
  '1. Selecione o mes nos filtros do topo',
  '2. Opcionalmente selecione uma marca',
  '3. Clique em "Gerar Sumario Executivo"',
  '4. Aguarde a analise (IA processa os dados)',
  '5. Clique em "Regerar" para atualizar',
];
howTo.forEach((h, i) => {
  s13.addText(h, { x: 7.2, y: 2.3 + i * 0.4, w: 5.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});

// Users box
s13.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 4.8, w: 11.73, h: 1.8, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s13.addText('Quem deve usar:', { x: 1.2, y: 4.9, w: 5, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: BLUE });
const usersList = [
  { who: 'PlanFin', why: 'Preparar narrativa para reuniao de resultados' },
  { who: 'Gestores', why: 'Visao rapida do mes sem navegar toda a DRE' },
  { who: 'Diretoria', why: 'Briefing executivo antes da reuniao' },
];
usersList.forEach((u, i) => {
  s13.addText(`${u.who}:`, { x: 1.4, y: 5.35 + i * 0.4, w: 1.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', bold: true, color: ORANGE });
  s13.addText(u.why, { x: 2.9, y: 5.35 + i * 0.4, w: 8, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});

addFooter(s13, 13, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 14: SLIDES PPT AUTOMATICO
// ════════════════════════════════════════════════════════════════
const s14 = pptx.addSlide();
addSlideHeader(s14, 'Slides — PPT Executivo Automatico', { bg: LIGHT_BG });

s14.addText('Gerado automaticamente a partir dos dados e justificativas — pronto para reuniao de resultados.', {
  x: 0.8, y: 1.2, w: 11, h: 0.4, fontSize: 13, fontFace: 'Calibri', color: DARK,
});

const pptSlides = [
  { name: 'Capa', desc: 'Mes, marca, versao da foto', color: DARK },
  { name: 'Visao Geral DRE', desc: 'Tabela condensada Tag0 + KPIs', color: ORANGE },
  { name: 'Secao por Tag0', desc: 'Tag01 + Sintese IA + Top 3 Desvios', color: BLUE },
  { name: 'Detalhamento', desc: 'Tag01 > Tag02 > Marca com justificativas', color: PURPLE },
  { name: 'Breakdown por Marca', desc: 'Grafico Real vs Orcado vs A-1', color: GREEN },
  { name: 'Cobertura Final', desc: '% cobertura + top desvios pendentes', color: AMBER },
];

pptSlides.forEach((sl, i) => {
  const y = 1.8 + i * 0.75;
  s14.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.6, fill: { color: WHITE }, rectRadius: 0.08 });
  s14.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.6, fill: { color: sl.color } });
  s14.addText(`${i + 1}.`, { x: 1.1, y, w: 0.5, h: 0.6, fontSize: 14, fontFace: 'Calibri', bold: true, color: sl.color, valign: 'middle', align: 'center' });
  s14.addText(sl.name, { x: 1.7, y, w: 3.5, h: 0.6, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK, valign: 'middle' });
  s14.addText(sl.desc, { x: 5.3, y, w: 6.5, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// Integration box
s14.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.1, w: 11.73, h: 0.7, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s14.addText(
  'Integracao automatica:  Justificativas dos pacoteiros + Sinteses IA + Planos de Acao + Dados da Foto = PPT pronto para download em .pptx',
  { x: 1.2, y: 6.15, w: 10.5, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: DARK, valign: 'middle' }
);

addFooter(s14, 14, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 15: DICAS RAPIDAS (was 18)
// ════════════════════════════════════════════════════════════════
const s15 = pptx.addSlide();
addSlideHeader(s15, 'Dicas Rapidas', { bg: LIGHT_BG });

const dicas = [
  { tip: 'Ctrl+Clique em valor numerico', result: 'Copia para clipboard', color: BLUE },
  { tip: 'Duplo clique em linha DRE', result: 'Drill-down para transacoes', color: ORANGE },
  { tip: 'Botao "Melhorar com IA"', result: 'Refina justificativas automaticamente', color: PURPLE },
  { tip: 'Colunas configuraveis', result: 'Show/hide, lembradas pelo sistema', color: GREEN },
  { tip: 'Filtros em cascata', result: 'Marca -> Filial automatico', color: AMBER },
  { tip: 'Excel exportado', result: 'Fiel a visualizacao atual da tela', color: BLUE },
  { tip: 'Densidade da tabela', result: '3 niveis: Confortavel | Compacto | Ultra', color: PURPLE },
  { tip: 'Busca sob demanda', result: 'Lancamentos so carrega ao clicar "Buscar"', color: GREEN },
];

dicas.forEach((d, i) => {
  const y = 1.3 + i * 0.7;
  s15.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.55, fill: { color: WHITE }, rectRadius: 0.08 });
  s15.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.55, fill: { color: d.color } });
  s15.addText(d.tip, { x: 1.1, y, w: 4.5, h: 0.55, fontSize: 12, fontFace: 'Calibri', bold: true, color: DARK, valign: 'middle' });
  s15.addText(d.result, { x: 5.8, y, w: 6.2, h: 0.55, fontSize: 12, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

addFooter(s15, 15, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 16: CRONOGRAMA MENSAL
// ════════════════════════════════════════════════════════════════
const s16 = pptx.addSlide();
addSlideHeader(s16, 'Cronograma Mensal Sugerido');

const cronRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Dia', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
    { text: 'Atividade', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri' } },
    { text: 'Responsavel', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+1', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Conferencia final dos lancamentos', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Pacoteiros', options: { fontSize: 11, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+2', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Geracao da Foto na DRE Gerencial', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+2', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Notificacao automatica aos pacoteiros', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Automatico', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', color: PURPLE } },
  ],
  [
    { text: 'D+2 a D+7', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Preenchimento de justificativas + planos de acao', options: { fontSize: 11, fontFace: 'Calibri', bold: true } },
    { text: 'Pacoteiros', options: { fontSize: 11, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+8 a D+9', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Revisao e aprovacao', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin / Gestores', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+10', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Geracao do PPT Executivo', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+10 a D+12', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Reuniao de Resultado', options: { fontSize: 11, fontFace: 'Calibri', bold: true } },
    { text: 'Diretoria + Gestores', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: RED } },
  ],
];

s16.addTable(cronRows, {
  x: 0.8, y: 1.3, w: 11.73,
  colW: [2, 7, 2.73],
  rowH: 0.6,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  autoPage: false,
});

// Note
s16.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.3, w: 11.73, h: 0.5, fill: { color: 'FFF7ED' }, line: { color: ORANGE, width: 1 }, rectRadius: 0.08 });
s16.addText('D+1 = primeiro dia util apos o fechamento contabil do mes. Cronograma sugerido, pode variar por marca.', {
  x: 1.2, y: 6.3, w: 10.5, h: 0.5, fontSize: 11, fontFace: 'Calibri', color: DARK, valign: 'middle',
});

addFooter(s16, 16, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 17: ENCERRAMENTO
// ════════════════════════════════════════════════════════════════
const s17 = pptx.addSlide();
s17.background = { fill: DARK };
s17.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });

s17.addText('Estamos Juntos!', { x: 1, y: 1.5, w: 11.33, h: 1.0, fontSize: 42, fontFace: 'Calibri', bold: true, color: WHITE });
s17.addShape(pptx.shapes.RECTANGLE, { x: 1, y: 2.7, w: 3, h: 0.04, fill: { color: ORANGE } });

const encerramento = [
  'A ferramenta evoluiu rapido — colocamos no ar antes do treinamento formal',
  'Treinamento completo no proximo mes para todos os pacoteiros',
  'O uso e participacao de todos ajuda nas melhorias',
  'Duvidas? -> Planejamento Financeiro, 100% disponivel',
  'Sugestoes sao sempre bem-vindas!',
];
encerramento.forEach((e, i) => {
  s17.addText(`•  ${e}`, { x: 1.2, y: 3.1 + i * 0.5, w: 10, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: 'CBD5E1' });
});

s17.addText('Planejamento Financeiro — Raiz Educacao S.A.', { x: 1, y: 6.0, w: 8, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: '94A3B8' });
s17.addText('Marco 2026', { x: 1, y: 6.4, w: 4, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: '64748B' });
s17.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: ORANGE } });

// ════════════════════════════════════════════════════════════════
// SALVAR
// ════════════════════════════════════════════════════════════════
const outputPath = 'docs/DRE_Raiz_Manual_Usuario.pptx';
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log(`PPT gerado: ${outputPath}`);
}).catch((err: any) => {
  console.error('Erro ao gerar PPT:', err);
});
