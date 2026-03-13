/**
 * Script para gerar PPT do Guia de Análise Financeira
 * Executar: npx tsx docs/generate-guia-ppt.ts
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

const addFooter = (slide: PptxGenJS.Slide, num: number, total: number) => {
  slide.addText(`Raiz Educação — Planejamento Financeiro`, { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri' });
  slide.addText(`${num}/${total}`, { x: 12.0, y: 7.0, w: 1, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri', align: 'right' });
};

const TOTAL_SLIDES = 14;

// ════════════════════════════════════════════════════════════════
// SLIDE 1: CAPA
// ════════════════════════════════════════════════════════════════
const s1 = pptx.addSlide();
s1.background = { fill: DARK };
// Barra laranja superior
s1.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
// Título
s1.addText('Guia de Análise Financeira', { x: 1, y: 2.0, w: 11.33, h: 1.2, fontSize: 42, fontFace: 'Calibri', bold: true, color: WHITE });
s1.addText('Sistema de Corte DRE, Justificativas de Desvios\ne Apresentação Executiva', { x: 1, y: 3.3, w: 11.33, h: 0.9, fontSize: 20, fontFace: 'Calibri', color: 'CBD5E1' });
// Linha divisória
s1.addShape(pptx.shapes.RECTANGLE, { x: 1, y: 4.5, w: 3, h: 0.04, fill: { color: ORANGE } });
// Rodapé
s1.addText('Planejamento Financeiro — Raiz Educação S.A.', { x: 1, y: 5.2, w: 6, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: '94A3B8' });
s1.addText('Versão 1.0 — Março 2026', { x: 1, y: 5.6, w: 6, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: '64748B' });
// Barra laranja inferior
s1.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: ORANGE } });

// ════════════════════════════════════════════════════════════════
// SLIDE 2: AGENDA
// ════════════════════════════════════════════════════════════════
const s2 = pptx.addSlide();
s2.background = { fill: WHITE };
s2.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s2.addText('Agenda', { x: 0.8, y: 0.4, w: 12, h: 0.7, fontSize: 32, fontFace: 'Calibri', bold: true, color: DARK });
s2.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.1, w: 2, h: 0.04, fill: { color: ORANGE } });

const agenda = [
  { num: '01', title: 'Visão Geral do Processo', desc: 'O que é, por que existe, fluxo mensal' },
  { num: '02', title: 'Corte DRE — Foto do Mês', desc: 'Como a foto é gerada e o que ela representa' },
  { num: '03', title: 'Justificativas de Desvios', desc: 'Regra dos 5%, como preencher, exemplos' },
  { num: '04', title: 'Plano de Ação (5W1H)', desc: 'Metodologia, campos obrigatórios, revisão' },
  { num: '05', title: 'Fluxo de Aprovação', desc: 'Status, prazos e responsabilidades' },
  { num: '06', title: 'Sumário Executivo & Slides', desc: 'Geração automática com IA para reuniões' },
];

agenda.forEach((item, i) => {
  const y = 1.6 + i * 0.85;
  s2.addText(item.num, { x: 0.8, y, w: 0.7, h: 0.6, fontSize: 22, fontFace: 'Calibri', bold: true, color: ORANGE, valign: 'middle' });
  s2.addText(item.title, { x: 1.6, y, w: 5, h: 0.35, fontSize: 16, fontFace: 'Calibri', bold: true, color: DARK });
  s2.addText(item.desc, { x: 1.6, y: y + 0.32, w: 8, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: GRAY });
});
addFooter(s2, 2, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 3: VISÃO GERAL
// ════════════════════════════════════════════════════════════════
const s3 = pptx.addSlide();
s3.background = { fill: LIGHT_BG };
s3.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s3.addText('Visão Geral do Processo', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

s3.addText('O que é a Análise Financeira?', { x: 0.8, y: 1.2, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: ORANGE });
s3.addText(
  'É o processo mensal onde o Planejamento Financeiro congela os resultados da DRE ("Foto") e os responsáveis de cada pacote justificam os desvios encontrados, propondo planos de ação concretos.',
  { x: 0.8, y: 1.65, w: 5.5, h: 1.0, fontSize: 12, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 }
);

s3.addText('Objetivo', { x: 0.8, y: 2.8, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: ORANGE });
s3.addText(
  '• Garantir rastreabilidade de todo desvio relevante\n• Documentar causas e ações corretivas\n• Alimentar automaticamente a apresentação executiva\n• Criar histórico para melhoria contínua',
  { x: 0.8, y: 3.2, w: 5.5, h: 1.2, fontSize: 12, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);

// Fluxo visual (lado direito)
s3.addText('Fluxo Mensal', { x: 7.2, y: 1.2, w: 5, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: ORANGE });
const steps = [
  { label: '1. DRE Gerencial', desc: 'Lançamentos e ajustes diários', color: BLUE },
  { label: '2. Foto / Corte', desc: 'PlanFin congela valores do mês', color: ORANGE },
  { label: '3. Justificativas', desc: 'Pacoteiros justificam desvios >5%', color: PURPLE },
  { label: '4. Revisão', desc: 'PlanFin aprova ou rejeita', color: AMBER },
  { label: '5. Apresentação', desc: 'PPT automático para reunião', color: GREEN },
];
steps.forEach((step, i) => {
  const y = 1.7 + i * 0.95;
  s3.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.2, y, w: 5.3, h: 0.75, fill: { color: WHITE }, shadow: { type: 'outer', blur: 4, offset: 2, color: 'C0C0C0' }, rectRadius: 0.1 });
  s3.addShape(pptx.shapes.RECTANGLE, { x: 7.2, y, w: 0.08, h: 0.75, fill: { color: step.color }, rectRadius: 0 });
  s3.addText(step.label, { x: 7.5, y, w: 4.5, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK });
  s3.addText(step.desc, { x: 7.5, y: y + 0.35, w: 4.5, h: 0.35, fontSize: 10, fontFace: 'Calibri', color: GRAY });
  if (i < steps.length - 1) {
    s3.addText('▼', { x: 9.5, y: y + 0.7, w: 0.5, h: 0.3, fontSize: 12, color: 'CBD5E1', align: 'center' });
  }
});
addFooter(s3, 3, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 4: NAVEGAÇÃO — ABAS DA ANÁLISE FINANCEIRA
// ════════════════════════════════════════════════════════════════
const s4 = pptx.addSlide();
s4.background = { fill: WHITE };
s4.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s4.addText('Navegação — 5 Abas', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });
s4.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.0, w: 2, h: 0.04, fill: { color: ORANGE } });

const tabs = [
  { name: 'Corte DRE (Justificativas)', desc: 'Tabela de desvios congelados para justificativa e plano de ação. Aba principal do processo.', icon: '📋', access: 'Todos', color: ORANGE },
  { name: 'Agentes Financeiros', desc: 'Análise automatizada por equipe de agentes de IA especializados.', icon: '🤖', access: 'Admin', color: PURPLE },
  { name: 'Sumário Executivo', desc: 'Resumo narrativo gerado por IA a partir do snapshot do mês.', icon: '📄', access: 'Todos', color: BLUE },
  { name: 'Plano de Ação', desc: 'Consolidação de todos os planos 5W1H para acompanhamento e revisão.', icon: '✅', access: 'Todos', color: GREEN },
  { name: 'Slides de Análise', desc: 'PPT executivo automático com dados, justificativas e insights IA.', icon: '📊', access: 'Todos', color: AMBER },
];

tabs.forEach((tab, i) => {
  const y = 1.4 + i * 1.1;
  s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.9, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
  s4.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.08, h: 0.9, fill: { color: tab.color } });
  s4.addText(tab.icon, { x: 1.1, y, w: 0.6, h: 0.9, fontSize: 24, valign: 'middle', align: 'center' });
  s4.addText(tab.name, { x: 1.8, y: y + 0.05, w: 6, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: DARK });
  s4.addText(tab.desc, { x: 1.8, y: y + 0.45, w: 8, h: 0.35, fontSize: 11, fontFace: 'Calibri', color: GRAY });
  s4.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 10.8, y: y + 0.2, w: 1.3, h: 0.45, fill: { color: tab.access === 'Admin' ? PURPLE : GREEN }, rectRadius: 0.2 });
  s4.addText(tab.access, { x: 10.8, y: y + 0.2, w: 1.3, h: 0.45, fontSize: 10, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
});
addFooter(s4, 4, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 5: CORTE DRE — COMO A FOTO É GERADA
// ════════════════════════════════════════════════════════════════
const s5 = pptx.addSlide();
s5.background = { fill: WHITE };
s5.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s5.addText('Corte DRE — Como a Foto é Gerada', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

// Passos
const fotoSteps = [
  { num: '1', text: 'Na DRE Gerencial, selecione exatamente 1 mês no filtro' },
  { num: '2', text: 'Clique no botão "Foto" (📸) — disponível apenas para Admin/PlanFin' },
  { num: '3', text: 'O sistema grava um snapshot isolado daquele mês (nunca YTD)' },
  { num: '4', text: 'Os valores ficam congelados — referência oficial para justificativas' },
];
fotoSteps.forEach((step, i) => {
  const y = 1.3 + i * 0.65;
  s5.addShape(pptx.shapes.OVAL, { x: 1, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: ORANGE } });
  s5.addText(step.num, { x: 1, y: y + 0.05, w: 0.4, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s5.addText(step.text, { x: 1.6, y, w: 10, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: DARK, valign: 'middle' });
});

// Box: regra importante
s5.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 4.0, w: 11.73, h: 1.4, fill: { color: 'FFF7ED' }, line: { color: ORANGE, width: 1.5 }, rectRadius: 0.15 });
s5.addText('Regras Importantes', { x: 1.2, y: 4.1, w: 5, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: ORANGE });
s5.addText(
  '• Cada mês tem sua própria foto — Jan grava só Jan, Fev grava só Fev\n' +
  '• O painel "Consolidado YTD" (parte inferior) soma automaticamente os meses com foto\n' +
  '• A foto pode ser re-gerada (nova versão), preservando justificativas já escritas\n' +
  '• Valores do snapshot são a referência oficial — não mudam após geração',
  { x: 1.2, y: 4.5, w: 10.5, h: 0.85, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);

// Hierarquia
s5.addText('Hierarquia da Tabela de Desvios', { x: 0.8, y: 5.6, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: DARK });
const hierarquia = [
  ['Tag0', '01. RECEITA LÍQUIDA', 'Grupo principal DRE', DARK],
  ['Tag01', 'Folha (Funcionários)', 'Centro de custo', BLUE],
  ['Tag02', 'Ensino Fundamental', 'Segmento — NÍVEL DE JUSTIFICATIVA', PURPLE],
  ['Marca', 'AP, CLV, GEU, GT...', 'Unidade de negócio', ORANGE],
];
const tblRows: PptxGenJS.TableRow[] = hierarquia.map(([nivel, exemplo, desc, color]) => [
  { text: nivel, options: { fontSize: 11, bold: true, color: color as string, fontFace: 'Calibri' } },
  { text: exemplo, options: { fontSize: 11, color: DARK, fontFace: 'Calibri' } },
  { text: desc, options: { fontSize: 10, color: GRAY, fontFace: 'Calibri' } },
]);
s5.addTable(tblRows, { x: 0.8, y: 6.0, w: 11.73, colW: [1.5, 3.5, 6.73], rowH: 0.3, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } });
addFooter(s5, 5, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 6: REGRA DE OBRIGATORIEDADE — 5%
// ════════════════════════════════════════════════════════════════
const s6 = pptx.addSlide();
s6.background = { fill: WHITE };
s6.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s6.addText('Regra de Obrigatoriedade — Threshold 5%', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

// Cards obrigatório vs opcional
// Obrigatório
s6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 1.3, w: 5.7, h: 2.5, fill: { color: 'FEF2F2' }, line: { color: RED, width: 1.5, dashType: 'solid' }, rectRadius: 0.15 });
s6.addText('OBRIGATÓRIO', { x: 1.2, y: 1.4, w: 4, h: 0.45, fontSize: 18, fontFace: 'Calibri', bold: true, color: RED });
s6.addText('Desvio > +5% ou < -5%', { x: 1.2, y: 1.85, w: 4, h: 0.35, fontSize: 14, fontFace: 'Calibri', color: DARK });
s6.addText(
  '• Justificativa textual obrigatória (mín. 20 caracteres)\n' +
  '• Plano de Ação 5W1H obrigatório para desvios negativos\n' +
  '• Itens aparecem com badge vermelho "Obrigatória"\n' +
  '• Contados no alerta de pendências do topo',
  { x: 1.2, y: 2.3, w: 4.8, h: 1.2, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.5 }
);

// Opcional
s6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.83, y: 1.3, w: 5.7, h: 2.5, fill: { color: 'F0FDF4' }, line: { color: GREEN, width: 1.5 }, rectRadius: 0.15 });
s6.addText('OPCIONAL', { x: 7.23, y: 1.4, w: 4, h: 0.45, fontSize: 18, fontFace: 'Calibri', bold: true, color: GREEN });
s6.addText('Desvio entre -5% e +5%', { x: 7.23, y: 1.85, w: 4, h: 0.35, fontSize: 14, fontFace: 'Calibri', color: DARK });
s6.addText(
  '• Justificativa pode ser preenchida, mas não é exigida\n' +
  '• Plano de Ação opcional\n' +
  '• Incentivamos o preenchimento para completude\n' +
  '• Não bloqueia aprovação do mês',
  { x: 7.23, y: 2.3, w: 4.8, h: 1.2, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.5 }
);

// Nível de cobrança
s6.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 4.2, w: 11.73, h: 1.0, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s6.addText('Nível de Cobrança Atual:', { x: 1.2, y: 4.3, w: 3, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: BLUE });
s6.addText('Tag02 + Marca — As justificativas são exigidas no nível de segmento (Tag02) por marca. Níveis superiores (Tag01 e Tag0) são sintetizados automaticamente pela IA.', { x: 1.2, y: 4.65, w: 10.5, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: DARK });

// Exemplo visual
s6.addText('Exemplo Prático:', { x: 0.8, y: 5.5, w: 5, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK });
const exRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Conta', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri' } },
    { text: 'Real', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'right' } },
    { text: 'Orçado', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'right' } },
    { text: 'Δ%', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'right' } },
    { text: 'Obrigatório?', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'Folha (Funcionários) — AP', options: { fontSize: 10, fontFace: 'Calibri' } },
    { text: '-1.250.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '-1.100.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '+13,6%', options: { fontSize: 10, color: RED, bold: true, fontFace: 'Calibri', align: 'right' } },
    { text: 'SIM ●', options: { fontSize: 10, color: RED, bold: true, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'Material Didático — CLV', options: { fontSize: 10, fontFace: 'Calibri' } },
    { text: '-320.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '-310.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '+3,2%', options: { fontSize: 10, color: GREEN, fontFace: 'Calibri', align: 'right' } },
    { text: 'NÃO (< 5%)', options: { fontSize: 10, color: GREEN, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'Receita Matrícula — GT', options: { fontSize: 10, fontFace: 'Calibri' } },
    { text: '2.800.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '3.100.000', options: { fontSize: 10, fontFace: 'Calibri', align: 'right' } },
    { text: '-9,7%', options: { fontSize: 10, color: RED, bold: true, fontFace: 'Calibri', align: 'right' } },
    { text: 'SIM ●', options: { fontSize: 10, color: RED, bold: true, fontFace: 'Calibri', align: 'center' } },
  ],
];
s6.addTable(exRows, { x: 0.8, y: 5.9, w: 11.73, colW: [3.5, 2, 2, 1.5, 2.73], rowH: 0.35, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } });
addFooter(s6, 6, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 7: COMO JUSTIFICAR — FORMULÁRIO
// ════════════════════════════════════════════════════════════════
const s7 = pptx.addSlide();
s7.background = { fill: LIGHT_BG };
s7.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s7.addText('Como Justificar um Desvio', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

// Passo a passo
s7.addText(
  '1. Na tabela de desvios, localize o item atribuído a você (filtre por "Pendente")\n' +
  '2. Clique no botão de ação (ícone de lápis) na linha do desvio\n' +
  '3. Preencha a justificativa textual (mínimo 20 caracteres)\n' +
  '4. Se desvio negativo: preencha o Plano de Ação 5W1H\n' +
  '5. Clique em "Salvar" — status muda para "Justificado"',
  { x: 0.8, y: 1.1, w: 6, h: 1.8, fontSize: 12, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.6 }
);

// Dica IA
s7.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.3, y: 1.1, w: 5.23, h: 1.2, fill: { color: 'F5F3FF' }, line: { color: PURPLE, width: 1 }, rectRadius: 0.1 });
s7.addText('💡 Dica: Use a IA!', { x: 7.6, y: 1.2, w: 4, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: PURPLE });
s7.addText('O botão "Melhorar com IA" refina seu texto e pode gerar automaticamente o plano 5W1H com base no contexto do desvio.', { x: 7.6, y: 1.55, w: 4.6, h: 0.6, fontSize: 10, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 });

// Exemplos
s7.addText('Exemplos de Boas Justificativas', { x: 0.8, y: 3.2, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: GREEN });

const goodExamples: PptxGenJS.TableRow[] = [
  [
    { text: 'Conta', options: { fontSize: 9, bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri' } },
    { text: 'Desvio', options: { fontSize: 9, bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri', align: 'center' } },
    { text: 'Justificativa', options: { fontSize: 9, bold: true, color: WHITE, fill: { color: GREEN }, fontFace: 'Calibri' } },
  ],
  [
    { text: 'Folha (Funcionários)', options: { fontSize: 9, fontFace: 'Calibri' } },
    { text: '+12%', options: { fontSize: 9, fontFace: 'Calibri', align: 'center', color: RED } },
    { text: 'Contratação não prevista de 3 professores para turma extra aberta em Fev/26 devido à demanda acima do esperado no Ensino Fundamental. Impacto de R$ 45k/mês.', options: { fontSize: 9, fontFace: 'Calibri' } },
  ],
  [
    { text: 'Material Didático', options: { fontSize: 9, fontFace: 'Calibri' } },
    { text: '-8%', options: { fontSize: 9, fontFace: 'Calibri', align: 'center', color: GREEN } },
    { text: 'Renegociação com fornecedor XYZ resultou em desconto de 15% no lote de apostilas do 1º semestre. Economia de R$ 32k.', options: { fontSize: 9, fontFace: 'Calibri' } },
  ],
  [
    { text: 'Receita Líquida', options: { fontSize: 9, fontFace: 'Calibri' } },
    { text: '-6%', options: { fontSize: 9, fontFace: 'Calibri', align: 'center', color: RED } },
    { text: 'Inadimplência acima do esperado na marca GT (3,2% vs 1,8% orçado). 47 alunos com mensalidade em atraso > 60 dias.', options: { fontSize: 9, fontFace: 'Calibri' } },
  ],
];
s7.addTable(goodExamples, { x: 0.8, y: 3.6, w: 11.73, colW: [2.5, 1, 8.23], rowH: 0.5, border: { type: 'solid', pt: 0.5, color: 'E2E8F0' } });

s7.addText('Evite:', { x: 0.8, y: 5.7, w: 2, h: 0.35, fontSize: 14, fontFace: 'Calibri', bold: true, color: RED });
s7.addText(
  '✗ "Custo acima do orçado" (repete o número, não explica)     ' +
  '✗ "Variação normal" (toda variação tem causa)     ' +
  '✗ "Vou verificar" (não é justificativa)',
  { x: 0.8, y: 6.05, w: 11.73, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: RED, lineSpacingMultiple: 1.3 }
);
addFooter(s7, 7, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 8: PLANO DE AÇÃO — 5W1H
// ════════════════════════════════════════════════════════════════
const s8 = pptx.addSlide();
s8.background = { fill: WHITE };
s8.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s8.addText('Plano de Ação — Metodologia 5W1H', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });
s8.addText('Obrigatório para desvios negativos (custo acima ou receita abaixo do orçado)', { x: 0.8, y: 0.95, w: 10, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: GRAY, italic: true });

const w1hFields = [
  { label: 'What (O que)', desc: 'Descreva a ação corretiva a ser implementada', req: 'Obrigatório', example: 'Renegociar contrato de energia e implementar programa de eficiência energética', color: ORANGE },
  { label: 'Why (Por que)', desc: 'Qual o objetivo da ação?', req: 'Obrigatório', example: 'Reduzir custo de energia em 15% até Jun/26, alinhando ao orçamento', color: ORANGE },
  { label: 'How (Como)', desc: 'Passos de execução detalhados', req: 'Opcional', example: '1) Cotar 3 fornecedores; 2) Instalar sensores; 3) Revisar horários AC', color: BLUE },
  { label: 'Who (Quem)', desc: 'Responsável pela execução', req: 'Obrigatório', example: 'Maria Silva — Gerente de Facilities', color: ORANGE },
  { label: 'When (Quando)', desc: 'Prazo para conclusão (default: +30 dias)', req: 'Obrigatório', example: '30/04/2026', color: ORANGE },
  { label: 'Impacto Esperado', desc: 'Resultado financeiro esperado', req: 'Opcional', example: 'Redução de R$ 18k/mês a partir de Mai/26', color: BLUE },
];

w1hFields.forEach((f, i) => {
  const y = 1.5 + i * 0.9;
  s8.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.75, fill: { color: LIGHT_BG }, rectRadius: 0.08 });
  s8.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y, w: 0.06, h: 0.75, fill: { color: f.color } });
  s8.addText(f.label, { x: 1.1, y: y + 0.02, w: 2.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', bold: true, color: DARK });
  s8.addText(f.req, { x: 3.5, y: y + 0.05, w: 1.2, h: 0.25, fontSize: 8, fontFace: 'Calibri', bold: true, color: f.req === 'Obrigatório' ? RED : BLUE });
  s8.addText(f.desc, { x: 1.1, y: y + 0.35, w: 4, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: GRAY });
  s8.addText(`Ex: "${f.example}"`, { x: 5.5, y: y + 0.1, w: 6.5, h: 0.55, fontSize: 10, fontFace: 'Calibri', color: '475569', italic: true, valign: 'middle' });
});
addFooter(s8, 8, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 9: PLANO DE AÇÃO — METODOLOGIA DE REVISÃO
// ════════════════════════════════════════════════════════════════
const s9 = pptx.addSlide();
s9.background = { fill: LIGHT_BG };
s9.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s9.addText('Plano de Ação — Revisão e Acompanhamento', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

// Fluxo de revisão
const reviewSteps = [
  { num: '1', title: 'Submissão', desc: 'Pacoteiro cria justificativa + plano de ação', actor: 'Pacoteiro' },
  { num: '2', title: 'Revisão pelo PlanFin', desc: 'PlanFin avalia pertinência, clareza e viabilidade do plano', actor: 'PlanFin' },
  { num: '3', title: 'Aprovação ou Rejeição', desc: 'Se aprovado: segue para acompanhamento. Se rejeitado: pacoteiro ajusta e resubmete.', actor: 'PlanFin' },
  { num: '4', title: 'Acompanhamento Mensal', desc: 'Na reunião de resultado, planos "Em andamento" e "Atrasados" são discutidos', actor: 'Todos' },
  { num: '5', title: 'Conclusão', desc: 'Responsável atualiza status para "Concluído" e registra resultado efetivo', actor: 'Pacoteiro' },
];
reviewSteps.forEach((step, i) => {
  const y = 1.2 + i * 0.9;
  s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 8, h: 0.7, fill: { color: WHITE }, rectRadius: 0.08, shadow: { type: 'outer', blur: 3, offset: 1, color: 'E8E8E8' } });
  s9.addShape(pptx.shapes.OVAL, { x: 1.0, y: y + 0.12, w: 0.4, h: 0.4, fill: { color: ORANGE } });
  s9.addText(step.num, { x: 1.0, y: y + 0.12, w: 0.4, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
  s9.addText(step.title, { x: 1.6, y: y + 0.02, w: 5, h: 0.3, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK });
  s9.addText(step.desc, { x: 1.6, y: y + 0.32, w: 6.5, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: GRAY });
  s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7.3, y: y + 0.15, w: 1.2, h: 0.35, fill: { color: step.actor === 'PlanFin' ? BLUE : step.actor === 'Todos' ? PURPLE : GREEN }, rectRadius: 0.15 });
  s9.addText(step.actor, { x: 7.3, y: y + 0.15, w: 1.2, h: 0.35, fontSize: 9, fontFace: 'Calibri', bold: true, color: WHITE, align: 'center', valign: 'middle' });
});

// Status do plano
s9.addText('Status do Plano de Ação', { x: 9.3, y: 1.2, w: 3.5, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: DARK });
const statuses = [
  { label: 'Aberto', color: AMBER, desc: 'Recém criado' },
  { label: 'Em andamento', color: BLUE, desc: 'Sendo executado' },
  { label: 'Concluído', color: GREEN, desc: 'Ação finalizada' },
  { label: 'Atrasado', color: RED, desc: 'Passou do prazo' },
  { label: 'Cancelado', color: GRAY, desc: 'Descontinuado' },
];
statuses.forEach((s, i) => {
  const y = 1.8 + i * 0.55;
  s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 9.3, y, w: 3.5, h: 0.4, fill: { color: WHITE }, rectRadius: 0.08 });
  s9.addShape(pptx.shapes.OVAL, { x: 9.5, y: y + 0.1, w: 0.2, h: 0.2, fill: { color: s.color } });
  s9.addText(s.label, { x: 9.9, y, w: 1.5, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: DARK, valign: 'middle' });
  s9.addText(s.desc, { x: 11.3, y, w: 1.3, h: 0.4, fontSize: 9, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// Box importante
s9.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.0, w: 11.73, h: 0.8, fill: { color: 'FFF7ED' }, line: { color: ORANGE, width: 1 }, rectRadius: 0.1 });
s9.addText(
  'O Plano de Ação será avaliado e discutido com o Planejamento Financeiro para aprovação e acompanhamento. O objetivo é garantir que as ações propostas sejam viáveis, mensuráveis e com prazo definido. Planos aprovados são monitorados mensalmente.',
  { x: 1.2, y: 6.1, w: 10.5, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 }
);
addFooter(s9, 9, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 10: FLUXO DE STATUS — JUSTIFICATIVAS
// ════════════════════════════════════════════════════════════════
const s10 = pptx.addSlide();
s10.background = { fill: WHITE };
s10.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s10.addText('Fluxo de Status — Justificativas', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

// Status boxes with flow
const flowStatuses = [
  { label: 'PENDENTE', color: AMBER, desc: 'Aguardando justificativa do pacoteiro', x: 0.8 },
  { label: 'NOTIFICADO', color: BLUE, desc: 'Email enviado ao responsável', x: 3.3 },
  { label: 'JUSTIFICADO', color: PURPLE, desc: 'Pacoteiro preencheu justificativa', x: 5.8 },
  { label: 'APROVADO', color: GREEN, desc: 'PlanFin aprovou', x: 8.8 },
];
flowStatuses.forEach((st, i) => {
  s10.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: st.x, y: 1.5, w: 2.2, h: 1.2, fill: { color: LIGHT_BG }, line: { color: st.color, width: 2 }, rectRadius: 0.15 });
  s10.addText(st.label, { x: st.x, y: 1.6, w: 2.2, h: 0.45, fontSize: 13, fontFace: 'Calibri', bold: true, color: st.color, align: 'center' });
  s10.addText(st.desc, { x: st.x + 0.1, y: 2.0, w: 2.0, h: 0.5, fontSize: 9, fontFace: 'Calibri', color: GRAY, align: 'center' });
  if (i < flowStatuses.length - 1) {
    s10.addText('→', { x: st.x + 2.2, y: 1.8, w: 0.8, h: 0.5, fontSize: 24, color: 'CBD5E1', align: 'center', valign: 'middle' });
  }
});
// Rejeitado (branch)
s10.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 8.8, y: 3.2, w: 2.2, h: 1.0, fill: { color: 'FEF2F2' }, line: { color: RED, width: 2 }, rectRadius: 0.15 });
s10.addText('REJEITADO', { x: 8.8, y: 3.3, w: 2.2, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: RED, align: 'center' });
s10.addText('PlanFin informa motivo\nPacoteiro pode resubmeter', { x: 8.9, y: 3.65, w: 2.0, h: 0.45, fontSize: 9, fontFace: 'Calibri', color: GRAY, align: 'center' });
s10.addText('↓', { x: 9.5, y: 2.7, w: 0.5, h: 0.5, fontSize: 20, color: RED, align: 'center' });

// Síntese IA
s10.addText('Síntese Automática por IA', { x: 0.8, y: 4.5, w: 6, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: PURPLE });
s10.addText(
  'Quando TODAS as justificativas de nível Tag02+Marca de um Tag01 estão preenchidas,\n' +
  'o sistema gera automaticamente uma síntese consolidada usando IA (Claude Haiku):\n\n' +
  '  Tag02+Marca (pacoteiro escreve)  →  Tag01 (IA sintetiza)  →  Tag0 (IA sintetiza)\n\n' +
  'A síntese é usada automaticamente nos Slides de Análise e no PPT Executivo.',
  { x: 0.8, y: 4.9, w: 11, h: 1.6, fontSize: 12, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.4 }
);
addFooter(s10, 10, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 11: SUMÁRIO EXECUTIVO
// ════════════════════════════════════════════════════════════════
const s11 = pptx.addSlide();
s11.background = { fill: LIGHT_BG };
s11.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s11.addText('Sumário Executivo — Gerado por IA', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

s11.addText(
  'O Sumário Executivo é um resumo narrativo completo gerado por Inteligência Artificial que analisa todo o contexto dos dados financeiros do snapshot selecionado.',
  { x: 0.8, y: 1.2, w: 11, h: 0.6, fontSize: 13, fontFace: 'Calibri', color: DARK, lineSpacingMultiple: 1.3 }
);

s11.addText('O que ele analisa:', { x: 0.8, y: 2.0, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const summaryPoints = [
  'Panorama geral do resultado do mês',
  'Principais desvios positivos e negativos com contexto',
  'Comparação vs Orçado e vs Ano Anterior',
  'Riscos e oportunidades identificados',
  'Recomendações de ação baseadas nos dados',
];
summaryPoints.forEach((p, i) => {
  s11.addText(`●  ${p}`, { x: 1.0, y: 2.4 + i * 0.4, w: 5.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});

s11.addText('Como usar:', { x: 7, y: 2.0, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: ORANGE });
const howSteps = [
  '1. Selecione o mês nos filtros do topo',
  '2. Opcionalmente selecione uma marca',
  '3. Clique em "Gerar Sumário Executivo"',
  '4. O sistema analisa os dados e gera o resumo',
  '5. Clique em "Regerar" para atualizar se necessário',
];
howSteps.forEach((h, i) => {
  s11.addText(h, { x: 7.2, y: 2.4 + i * 0.4, w: 5.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});

s11.addText('Quem deve usar:', { x: 0.8, y: 4.8, w: 5, h: 0.4, fontSize: 15, fontFace: 'Calibri', bold: true, color: DARK });
const users = [
  { who: 'PlanFin', why: 'Preparar narrativa para reunião de resultados' },
  { who: 'Gestores', why: 'Visão rápida do mês sem navegar toda a DRE' },
  { who: 'Diretoria', why: 'Briefing executivo antes da reunião' },
];
users.forEach((u, i) => {
  s11.addText(`${u.who}:`, { x: 1.0, y: 5.2 + i * 0.4, w: 1.5, h: 0.35, fontSize: 12, fontFace: 'Calibri', bold: true, color: ORANGE });
  s11.addText(u.why, { x: 2.5, y: 5.2 + i * 0.4, w: 8, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: DARK });
});
addFooter(s11, 11, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 12: SLIDES DE ANÁLISE (PPT AUTOMÁTICO)
// ════════════════════════════════════════════════════════════════
const s12 = pptx.addSlide();
s12.background = { fill: WHITE };
s12.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s12.addText('Slides de Análise — PPT Automático', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });
s12.addText('Gera automaticamente a apresentação executiva no padrão PlanFin', { x: 0.8, y: 0.95, w: 10, h: 0.3, fontSize: 12, fontFace: 'Calibri', color: GRAY, italic: true });

const slideTypes = [
  { name: 'Capa', desc: 'Logo, mês, marca, versão da foto', icon: '🎯' },
  { name: 'Visão Geral DRE', desc: 'Tabela condensada Tag0 + KPIs (EBITDA, Margem, Cobertura)', icon: '📊' },
  { name: 'Seção por Tag0', desc: 'Tabela Tag01 + Síntese IA + Top 3 Desvios com justificativas', icon: '📋' },
  { name: 'Detalhamento', desc: 'Hierarquia Tag01 > Tag02 > Marca com valores e justificativas', icon: '🔍' },
  { name: 'Breakdown por Marca', desc: 'Gráfico de barras Real vs Orçado vs A-1 por marca', icon: '📈' },
  { name: 'Cobertura Final', desc: '% cobertura + Top desvios não justificados', icon: '✅' },
];

slideTypes.forEach((st, i) => {
  const y = 1.4 + i * 0.85;
  s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 11.73, h: 0.7, fill: { color: LIGHT_BG }, rectRadius: 0.08 });
  s12.addText(st.icon, { x: 1.0, y, w: 0.5, h: 0.7, fontSize: 18, valign: 'middle', align: 'center' });
  s12.addText(st.name, { x: 1.6, y, w: 3, h: 0.7, fontSize: 13, fontFace: 'Calibri', bold: true, color: DARK, valign: 'middle' });
  s12.addText(st.desc, { x: 4.8, y, w: 7, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// Integração automática
s12.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.0, w: 11.73, h: 1.0, fill: { color: 'EEF2FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s12.addText('Integração Automática', { x: 1.2, y: 6.05, w: 5, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: BLUE });
s12.addText(
  'Justificativas dos pacoteiros → slides de detalhamento  |  Sínteses IA → slides de seção  |  Planos de Ação → referenciados nos desvios  |  Dados da Foto → valores congelados garantem consistência',
  { x: 1.2, y: 6.4, w: 10.5, h: 0.5, fontSize: 10, fontFace: 'Calibri', color: DARK }
);
addFooter(s12, 12, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 13: CRONOGRAMA MENSAL
// ════════════════════════════════════════════════════════════════
const s13 = pptx.addSlide();
s13.background = { fill: LIGHT_BG };
s13.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s13.addText('Cronograma Mensal Sugerido', { x: 0.8, y: 0.3, w: 12, h: 0.7, fontSize: 28, fontFace: 'Calibri', bold: true, color: DARK });

const cronRows: PptxGenJS.TableRow[] = [
  [
    { text: 'Dia', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
    { text: 'Atividade', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri' } },
    { text: 'Responsável', options: { fontSize: 11, bold: true, color: WHITE, fill: { color: DARK }, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+1', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Conferência final dos lançamentos do mês', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Pacoteiros', options: { fontSize: 11, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+2', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Geração da Foto na DRE Gerencial', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+2', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Notificação automática aos pacoteiros (email)', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'Automático', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', color: PURPLE } },
  ],
  [
    { text: 'D+2 a D+7', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Preenchimento de justificativas + planos de ação', options: { fontSize: 11, fontFace: 'Calibri', bold: true } },
    { text: 'Pacoteiros', options: { fontSize: 11, fontFace: 'Calibri', align: 'center' } },
  ],
  [
    { text: 'D+8 a D+9', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Revisão e aprovação das justificativas', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin / Gestores', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+10', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Geração do PPT Executivo automático', options: { fontSize: 11, fontFace: 'Calibri' } },
    { text: 'PlanFin', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: BLUE } },
  ],
  [
    { text: 'D+10 a D+12', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: ORANGE } },
    { text: 'Reunião de Resultado', options: { fontSize: 11, fontFace: 'Calibri', bold: true } },
    { text: 'Diretoria + Gestores', options: { fontSize: 11, fontFace: 'Calibri', align: 'center', bold: true, color: RED } },
  ],
];
s13.addTable(cronRows, {
  x: 0.8, y: 1.3, w: 11.73,
  colW: [2, 7, 2.73],
  rowH: 0.55,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  autoPage: false,
});
addFooter(s13, 13, TOTAL_SLIDES);

// ════════════════════════════════════════════════════════════════
// SLIDE 14: ENCERRAMENTO
// ════════════════════════════════════════════════════════════════
const s14 = pptx.addSlide();
s14.background = { fill: DARK };
s14.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ORANGE } });
s14.addText('Dúvidas?', { x: 1, y: 2.0, w: 11.33, h: 1.0, fontSize: 42, fontFace: 'Calibri', bold: true, color: WHITE });
s14.addShape(pptx.shapes.RECTANGLE, { x: 1, y: 3.2, w: 3, h: 0.04, fill: { color: ORANGE } });
s14.addText(
  'Processo:   Planejamento Financeiro\n' +
  'Sistema:     dre-raiz.vercel.app\n' +
  'Suporte:     Canal interno de TI',
  { x: 1, y: 3.6, w: 6, h: 1.2, fontSize: 16, fontFace: 'Calibri', color: '94A3B8', lineSpacingMultiple: 1.6 }
);
s14.addText('Raiz Educação S.A. — Março 2026', { x: 1, y: 5.5, w: 6, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: '64748B' });
s14.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 7.42, w: 13.33, h: 0.08, fill: { color: ORANGE } });

// ════════════════════════════════════════════════════════════════
// SALVAR
// ════════════════════════════════════════════════════════════════
const outputPath = 'docs/Guia_Analise_Financeira_Raiz.pptx';
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log(`✅ PPT gerado: ${outputPath}`);
}).catch((err: any) => {
  console.error('❌ Erro ao gerar PPT:', err);
});
