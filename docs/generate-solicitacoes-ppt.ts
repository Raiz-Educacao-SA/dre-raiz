/**
 * Script para gerar PPT do módulo Solicitações de Análise
 * Executar: npx tsx docs/generate-solicitacoes-ppt.ts
 */
import PptxGenJSModule from 'pptxgenjs';
const PptxGenJS = (PptxGenJSModule as any).default || PptxGenJSModule;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in

// ── Cores ──
const BLUE = '1B75BB';
const DARK = '152E55';
const GRAY = '64748B';
const WHITE = 'FFFFFF';
const LIGHT_BG = 'F8FAFC';
const GREEN = '10B981';
const RED = 'EF4444';
const AMBER = 'F59E0B';
const PURPLE = '8B5CF6';
const EMERALD = '059669';

const addFooter = (slide: any, num: number, total: number) => {
  slide.addText('Raiz Educação — Planejamento Financeiro', { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri' });
  slide.addText(`${num}/${total}`, { x: 12.0, y: 7.0, w: 1, h: 0.3, fontSize: 8, color: GRAY, fontFace: 'Calibri', align: 'right' });
};

const TOTAL_SLIDES = 12;

// ════════════════════════════════════════════════════════════════
// SLIDE 1: CAPA
// ════════════════════════════════════════════════════════════════
const s1 = pptx.addSlide();
s1.background = { fill: DARK };
// Barra azul superior
s1.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: BLUE } });
// Barra azul inferior
s1.addShape('rect' as any, { x: 0, y: 7.35, w: 13.33, h: 0.15, fill: { color: BLUE } });

s1.addText('SOLICITAÇÕES DE ANÁLISE', {
  x: 1, y: 2.0, w: 11, h: 1.2,
  fontSize: 40, fontFace: 'Calibri', color: WHITE, bold: true,
  align: 'center', letterSpacing: 3,
});
s1.addText('Sistema de Q&A para DRE Gerencial', {
  x: 1, y: 3.3, w: 11, h: 0.6,
  fontSize: 18, fontFace: 'Calibri', color: BLUE, align: 'center',
});
s1.addShape('rect' as any, { x: 5.5, y: 4.2, w: 2.3, h: 0.04, fill: { color: BLUE } });
s1.addText('DRE RAIZ — RAIZ EDUCAÇÃO', {
  x: 1, y: 4.8, w: 11, h: 0.5,
  fontSize: 14, fontFace: 'Calibri', color: GRAY, align: 'center',
});
s1.addText('Março 2026', {
  x: 1, y: 5.4, w: 11, h: 0.4,
  fontSize: 12, fontFace: 'Calibri', color: GRAY, align: 'center',
});

// ════════════════════════════════════════════════════════════════
// SLIDE 2: O QUE É
// ════════════════════════════════════════════════════════════════
const s2 = pptx.addSlide();
s2.background = { fill: WHITE };
addFooter(s2, 2, TOTAL_SLIDES);

s2.addText('O que é?', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s2.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

s2.addText('Um sistema de tickets interno integrado à DRE Gerencial que permite:', {
  x: 0.5, y: 1.3, w: 12, h: 0.5,
  fontSize: 14, fontFace: 'Calibri', color: GRAY,
});

const features = [
  ['💬', 'Solicitar esclarecimentos', 'Qualquer usuário pode abrir uma solicitação sobre valores da DRE'],
  ['👤', 'Atribuir responsável', 'Direcionar a dúvida para a pessoa certa responder'],
  ['⏱️', 'Controle de SLA', 'Prazos automáticos com indicadores visuais (Normal: 48h / Urgente: 24h)'],
  ['📧', 'Notificações por email', 'Email automático a cada ação com link direto para a solicitação'],
  ['💬', 'Chat em thread', 'Conversa estruturada entre solicitante e responsável até a resolução'],
  ['✅', 'Fluxo de aprovação', 'Aprovar, devolver ou replicar até o consenso'],
];

features.forEach(([icon, title, desc], idx) => {
  const y = 2.0 + idx * 0.8;
  s2.addShape('roundRect' as any, { x: 0.5, y, w: 12.3, h: 0.7, fill: { color: idx % 2 === 0 ? LIGHT_BG : WHITE }, rectRadius: 0.1 });
  s2.addText(icon, { x: 0.7, y, w: 0.5, h: 0.7, fontSize: 18, align: 'center', valign: 'middle' });
  s2.addText(title, { x: 1.3, y, w: 3.5, h: 0.7, fontSize: 13, fontFace: 'Calibri', color: DARK, bold: true, valign: 'middle' });
  s2.addText(desc, { x: 4.8, y, w: 7.8, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 3: FLUXO DE STATUS
// ════════════════════════════════════════════════════════════════
const s3 = pptx.addSlide();
s3.background = { fill: WHITE };
addFooter(s3, 3, TOTAL_SLIDES);

s3.addText('Fluxo de Status', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s3.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

// Flow boxes
const flowBoxes = [
  { label: 'Pendente', color: AMBER, x: 0.8, y: 2.0 },
  { label: 'Respondida', color: BLUE, x: 3.3, y: 2.0 },
  { label: 'Aprovada', color: EMERALD, x: 5.8, y: 1.3 },
  { label: 'Devolvida', color: RED, x: 5.8, y: 2.7 },
  { label: 'Reaberta', color: PURPLE, x: 8.3, y: 2.7 },
];

flowBoxes.forEach(box => {
  s3.addShape('roundRect' as any, {
    x: box.x, y: box.y, w: 2.0, h: 0.8,
    fill: { color: box.color }, rectRadius: 0.15,
  });
  s3.addText(box.label, {
    x: box.x, y: box.y, w: 2.0, h: 0.8,
    fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true,
    align: 'center', valign: 'middle',
  });
});

// Arrows (text-based)
s3.addText('→', { x: 2.8, y: 2.0, w: 0.5, h: 0.8, fontSize: 24, color: GRAY, align: 'center', valign: 'middle' });
s3.addText('↗', { x: 5.3, y: 1.3, w: 0.5, h: 0.8, fontSize: 24, color: EMERALD, align: 'center', valign: 'middle' });
s3.addText('↘', { x: 5.3, y: 2.7, w: 0.5, h: 0.8, fontSize: 24, color: RED, align: 'center', valign: 'middle' });
s3.addText('→', { x: 7.8, y: 2.7, w: 0.5, h: 0.8, fontSize: 24, color: GRAY, align: 'center', valign: 'middle' });

// Return arrow text
s3.addText('↩ volta para Respondida', {
  x: 8.5, y: 3.6, w: 3.5, h: 0.4,
  fontSize: 10, fontFace: 'Calibri', color: PURPLE, italic: true,
});

// Legend
const legendItems = [
  { label: 'Responsável responde', y: 4.5, color: BLUE },
  { label: 'Solicitante aprova', y: 4.9, color: EMERALD },
  { label: 'Solicitante devolve com motivo', y: 5.3, color: RED },
  { label: 'Solicitante envia réplica', y: 5.7, color: PURPLE },
];
legendItems.forEach(item => {
  s3.addShape('rect' as any, { x: 0.8, y: item.y + 0.1, w: 0.3, h: 0.2, fill: { color: item.color }, rectRadius: 0.05 });
  s3.addText(item.label, { x: 1.3, y: item.y, w: 5, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: GRAY });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 4: COMO CRIAR
// ════════════════════════════════════════════════════════════════
const s4 = pptx.addSlide();
s4.background = { fill: WHITE };
addFooter(s4, 4, TOTAL_SLIDES);

s4.addText('Como Criar uma Solicitação', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s4.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

const steps = [
  { num: '1', title: 'Abra a DRE Gerencial', desc: 'Aplique os filtros desejados (ano, meses, marcas, filiais, tags)' },
  { num: '2', title: 'Clique em "Solicitar Análise"', desc: 'O botão fica no painel de Solicitações, na parte inferior da DRE' },
  { num: '3', title: 'Preencha o formulário', desc: 'Assunto, descrição da dúvida, selecione o responsável e a prioridade' },
  { num: '4', title: 'Envie', desc: 'O sistema captura os filtros DRE, calcula o SLA e notifica o responsável por email' },
];

steps.forEach((step, idx) => {
  const y = 1.4 + idx * 1.3;
  // Number circle
  s4.addShape('ellipse' as any, { x: 0.8, y: y + 0.1, w: 0.6, h: 0.6, fill: { color: BLUE } });
  s4.addText(step.num, { x: 0.8, y: y + 0.1, w: 0.6, h: 0.6, fontSize: 18, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
  // Content
  s4.addText(step.title, { x: 1.7, y, w: 10, h: 0.4, fontSize: 15, fontFace: 'Calibri', color: DARK, bold: true });
  s4.addText(step.desc, { x: 1.7, y: y + 0.4, w: 10, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: GRAY });
});

// Info box
s4.addShape('roundRect' as any, { x: 0.5, y: 6.0, w: 12.3, h: 0.7, fill: { color: 'EFF6FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.1 });
s4.addText('💡 O contexto DRE (filtros) é capturado automaticamente. O responsável poderá restaurar os mesmos filtros ao analisar.', {
  x: 0.8, y: 6.0, w: 11.7, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: BLUE, valign: 'middle',
});

// ════════════════════════════════════════════════════════════════
// SLIDE 5: COMO RESPONDER
// ════════════════════════════════════════════════════════════════
const s5 = pptx.addSlide();
s5.background = { fill: WHITE };
addFooter(s5, 5, TOTAL_SLIDES);

s5.addText('Como Responder', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s5.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

// Two columns
// Left: Responsável
s5.addShape('roundRect' as any, { x: 0.5, y: 1.3, w: 6, h: 5.2, fill: { color: 'FFF7ED' }, line: { color: AMBER, width: 1 }, rectRadius: 0.15 });
s5.addText('🔶  Como Responsável', { x: 0.8, y: 1.5, w: 5.4, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: AMBER, bold: true });

const respSteps = [
  'Você recebe email + badge laranja no Sidebar',
  'Abra a guia "Solicitações" ou clique no badge',
  'Veja a dúvida no painel lateral de chat',
  'Clique "Aplicar filtros" para ver a DRE no mesmo contexto',
  'Digite sua análise e envie',
  'Status muda para "Respondida" automaticamente',
];
respSteps.forEach((text, idx) => {
  s5.addText(`${idx + 1}.  ${text}`, {
    x: 1.0, y: 2.2 + idx * 0.6, w: 5.2, h: 0.5,
    fontSize: 11, fontFace: 'Calibri', color: DARK,
  });
});

// Right: Solicitante
s5.addShape('roundRect' as any, { x: 6.8, y: 1.3, w: 6, h: 5.2, fill: { color: 'ECFDF5' }, line: { color: GREEN, width: 1 }, rectRadius: 0.15 });
s5.addText('🟢  Como Solicitante', { x: 7.1, y: 1.5, w: 5.4, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: EMERALD, bold: true });

const solSteps = [
  'Você recebe email + badge verde no Sidebar',
  'Abra a solicitação para ver a resposta',
  'Avalie a resposta recebida',
  '✅ Aprovar — encerra a solicitação',
  '❌ Devolver — escreva o motivo e devolva',
  '💬 Mensagem — complemente o chat livremente',
];
solSteps.forEach((text, idx) => {
  s5.addText(`${idx + 1}.  ${text}`, {
    x: 7.3, y: 2.2 + idx * 0.6, w: 5.2, h: 0.5,
    fontSize: 11, fontFace: 'Calibri', color: DARK,
  });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 6: GUIA SOLICITAÇÕES (INBOX)
// ════════════════════════════════════════════════════════════════
const s6 = pptx.addSlide();
s6.background = { fill: WHITE };
addFooter(s6, 6, TOTAL_SLIDES);

s6.addText('Guia "Solicitações" — Seu Inbox', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s6.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

s6.addText('Uma visão completa tipo "caixa de email" para gerenciar alto volume de solicitações:', {
  x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: 13, fontFace: 'Calibri', color: GRAY,
});

const inboxFeatures = [
  { icon: '📥', title: 'Aba Recebidas', desc: 'Solicitações onde você é o responsável. Badge laranja com total de ações pendentes.', color: AMBER },
  { icon: '📤', title: 'Aba Enviadas', desc: 'Solicitações que você criou. Badge verde com total de respondidas aguardando sua revisão.', color: GREEN },
  { icon: '🔍', title: 'Busca', desc: 'Busque por assunto, pergunta ou nome do participante em tempo real.', color: BLUE },
  { icon: '🏷️', title: 'Filtros por Status', desc: 'Pills clicáveis: Pendente, Respondida, Devolvida, Aprovada, etc. Com contagem.', color: PURPLE },
  { icon: '↕️', title: 'Ordenação', desc: 'Clique nos cabeçalhos da tabela para ordenar por Data, Status, Prioridade ou SLA.', color: DARK },
  { icon: '⚡', title: 'Tempo Real', desc: 'Badges e lista atualizam automaticamente quando algo muda (Supabase Realtime).', color: EMERALD },
];

inboxFeatures.forEach((feat, idx) => {
  const y = 1.9 + idx * 0.8;
  s6.addShape('roundRect' as any, { x: 0.5, y, w: 12.3, h: 0.7, fill: { color: idx % 2 === 0 ? LIGHT_BG : WHITE }, rectRadius: 0.1 });
  s6.addText(feat.icon, { x: 0.7, y, w: 0.5, h: 0.7, fontSize: 18, align: 'center', valign: 'middle' });
  s6.addText(feat.title, { x: 1.3, y, w: 2.5, h: 0.7, fontSize: 13, fontFace: 'Calibri', color: feat.color, bold: true, valign: 'middle' });
  s6.addText(feat.desc, { x: 3.8, y, w: 8.8, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 7: BADGES E NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════════
const s7 = pptx.addSlide();
s7.background = { fill: WHITE };
addFooter(s7, 7, TOTAL_SLIDES);

s7.addText('Badges e Notificações', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s7.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

// Badge examples
s7.addText('Badges no Sidebar', { x: 0.5, y: 1.3, w: 6, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: DARK, bold: true });

s7.addShape('roundRect' as any, { x: 0.5, y: 1.9, w: 5.5, h: 0.7, fill: { color: 'FEF3C7' }, line: { color: AMBER, width: 1 }, rectRadius: 0.1 });
s7.addText('🟠  Badge Laranja — "Para responder"', { x: 0.8, y: 1.9, w: 5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: AMBER, bold: true });
s7.addText('Solicitações onde você é responsável e precisa agir', { x: 0.8, y: 2.25, w: 5, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: GRAY });

s7.addShape('roundRect' as any, { x: 0.5, y: 2.8, w: 5.5, h: 0.7, fill: { color: 'ECFDF5' }, line: { color: GREEN, width: 1 }, rectRadius: 0.1 });
s7.addText('🟢  Badge Verde — "Respondida"', { x: 0.8, y: 2.8, w: 5, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: EMERALD, bold: true });
s7.addText('Solicitações que você criou e receberam resposta', { x: 0.8, y: 3.15, w: 5, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: GRAY });

// Email notifications
s7.addText('Notificações por Email', { x: 7, y: 1.3, w: 6, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: DARK, bold: true });

const emailTypes = [
  { action: 'Nova solicitação', dest: 'Responsável', color: BLUE },
  { action: 'Resposta enviada', dest: 'Solicitante', color: GREEN },
  { action: 'Aprovação', dest: 'Responsável', color: EMERALD },
  { action: 'Devolução', dest: 'Responsável', color: RED },
  { action: 'Réplica', dest: 'Responsável', color: PURPLE },
];

const emailRows: any[][] = [
  [
    { text: 'Ação', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Destinatário', options: { fontSize: 10, bold: true, color: WHITE, fill: { color: DARK } } },
  ],
  ...emailTypes.map(et => [
    { text: et.action, options: { fontSize: 10, color: DARK } },
    { text: et.dest, options: { fontSize: 10, color: GRAY } },
  ]),
];

s7.addTable(emailRows, {
  x: 7, y: 1.9, w: 5.5,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  colW: [3.0, 2.5],
  rowH: 0.35,
});

// Atualização em tempo real
s7.addShape('roundRect' as any, { x: 0.5, y: 4.0, w: 12.3, h: 1.2, fill: { color: 'EFF6FF' }, line: { color: BLUE, width: 1 }, rectRadius: 0.15 });
s7.addText('⚡ Atualização em Tempo Real', { x: 0.8, y: 4.1, w: 11.7, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: BLUE, bold: true });
s7.addText('Os badges e listas atualizam automaticamente via Supabase Realtime.\nQuando alguém responde, aprova ou devolve uma solicitação, os contadores se ajustam sem recarregar a página.', {
  x: 0.8, y: 4.5, w: 11.7, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: GRAY,
});

// ════════════════════════════════════════════════════════════════
// SLIDE 8: SLA
// ════════════════════════════════════════════════════════════════
const s8 = pptx.addSlide();
s8.background = { fill: WHITE };
addFooter(s8, 8, TOTAL_SLIDES);

s8.addText('SLA — Prazos e Controle', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s8.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

// SLA Table
const slaRows: any[][] = [
  [
    { text: 'Prioridade', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Prazo', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Lembrete', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Indicador', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
  ],
  [
    { text: 'Normal', options: { fontSize: 12, color: BLUE, bold: true } },
    { text: '48 horas', options: { fontSize: 12, color: DARK } },
    { text: '24h antes', options: { fontSize: 12, color: GRAY } },
    { text: '🔵', options: { fontSize: 14 } },
  ],
  [
    { text: '⚡ Urgente', options: { fontSize: 12, color: RED, bold: true } },
    { text: '24 horas', options: { fontSize: 12, color: DARK } },
    { text: '6h antes', options: { fontSize: 12, color: GRAY } },
    { text: '🔴', options: { fontSize: 14 } },
  ],
];

s8.addTable(slaRows, {
  x: 0.5, y: 1.3, w: 12.3,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  colW: [3, 3, 3, 3.3],
  rowH: 0.5,
});

// Visual indicators
s8.addText('Indicadores Visuais na Tabela', { x: 0.5, y: 3.0, w: 12, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: DARK, bold: true });

const indicators = [
  { color: GREEN, label: 'Dentro do prazo', desc: 'Mais de 6 horas restantes' },
  { color: AMBER, label: 'Próximo do vencimento', desc: 'Menos de 6 horas restantes' },
  { color: RED, label: 'Prazo expirado', desc: 'SLA ultrapassado — ação urgente necessária' },
];

indicators.forEach((ind, idx) => {
  const y = 3.6 + idx * 0.7;
  s8.addShape('roundRect' as any, { x: 0.5, y, w: 0.4, h: 0.5, fill: { color: ind.color }, rectRadius: 0.08 });
  s8.addText(ind.label, { x: 1.1, y, w: 4, h: 0.5, fontSize: 13, fontFace: 'Calibri', color: DARK, bold: true, valign: 'middle' });
  s8.addText(ind.desc, { x: 5.1, y, w: 7.5, h: 0.5, fontSize: 11, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
});

// Admin note
s8.addShape('roundRect' as any, { x: 0.5, y: 5.8, w: 12.3, h: 0.7, fill: { color: 'F5F3FF' }, line: { color: PURPLE, width: 1 }, rectRadius: 0.1 });
s8.addText('🔧 Admin: Os prazos e lembretes são configuráveis na aba Admin → Solicitações → Configuração de SLA', {
  x: 0.8, y: 5.8, w: 11.7, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: PURPLE, valign: 'middle',
});

// ════════════════════════════════════════════════════════════════
// SLIDE 9: PERMISSÕES
// ════════════════════════════════════════════════════════════════
const s9 = pptx.addSlide();
s9.background = { fill: WHITE };
addFooter(s9, 9, TOTAL_SLIDES);

s9.addText('Permissões e Segurança', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s9.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

const permRows: any[][] = [
  [
    { text: 'Papel', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Criar', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Responder', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Aprovar/Devolver', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Ver Todas', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
    { text: 'Config SLA', options: { fontSize: 12, bold: true, color: WHITE, fill: { color: DARK } } },
  ],
  [
    { text: 'Viewer', options: { fontSize: 11, color: DARK } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '❌', options: { fontSize: 14 } },
    { text: '❌', options: { fontSize: 14 } },
  ],
  [
    { text: 'Approver', options: { fontSize: 11, color: DARK } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '❌', options: { fontSize: 14 } },
    { text: '❌', options: { fontSize: 14 } },
  ],
  [
    { text: 'Manager', options: { fontSize: 11, color: BLUE, bold: true } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '❌', options: { fontSize: 14 } },
  ],
  [
    { text: 'Admin', options: { fontSize: 11, color: PURPLE, bold: true } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
    { text: '✅', options: { fontSize: 14 } },
  ],
];

s9.addTable(permRows, {
  x: 0.5, y: 1.3, w: 12.3,
  border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
  colW: [2.5, 2, 2, 2, 2, 1.8],
  rowH: 0.5,
});

s9.addShape('roundRect' as any, { x: 0.5, y: 4.5, w: 12.3, h: 1.0, fill: { color: 'FEF2F2' }, line: { color: RED, width: 1 }, rectRadius: 0.1 });
s9.addText('🔒 Segurança a nível de banco de dados (RLS)', { x: 0.8, y: 4.6, w: 11.7, h: 0.4, fontSize: 13, fontFace: 'Calibri', color: RED, bold: true });
s9.addText('Mesmo via API direta, cada usuário só consegue acessar solicitações onde é participante. Admin/Manager veem tudo.', {
  x: 0.8, y: 5.0, w: 11.7, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: GRAY,
});

// ════════════════════════════════════════════════════════════════
// SLIDE 10: ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════════
const s10 = pptx.addSlide();
s10.background = { fill: WHITE };
addFooter(s10, 10, TOTAL_SLIDES);

s10.addText('Painel Admin — Visão Gerencial', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s10.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

s10.addText('Acessível via Admin → aba "Solicitações"', {
  x: 0.5, y: 1.2, w: 12, h: 0.4, fontSize: 13, fontFace: 'Calibri', color: GRAY,
});

const adminFeatures = [
  { title: 'Cards de Status', desc: '7 cards com contagem por status: Total, Pendentes, Respondidas, Aprovadas, Devolvidas, Reabertas, Expiradas', icon: '📊' },
  { title: 'Configuração de SLA', desc: 'Editar prazos (horas) e lembretes para prioridade Normal e Urgente. Salvar em tempo real.', icon: '⚙️' },
  { title: 'Tabela Completa', desc: 'Todas as solicitações de todos os usuários com filtros por status, prioridade e indicador SLA.', icon: '📋' },
  { title: 'Detalhes', desc: 'Clique em qualquer solicitação para abrir o painel lateral com thread completa.', icon: '💬' },
];

adminFeatures.forEach((feat, idx) => {
  const y = 1.8 + idx * 1.2;
  s10.addShape('roundRect' as any, { x: 0.5, y, w: 12.3, h: 1.0, fill: { color: idx % 2 === 0 ? LIGHT_BG : WHITE }, line: { color: 'E2E8F0', width: 0.5 }, rectRadius: 0.1 });
  s10.addText(feat.icon, { x: 0.8, y, w: 0.6, h: 1.0, fontSize: 22, align: 'center', valign: 'middle' });
  s10.addText(feat.title, { x: 1.5, y: y + 0.1, w: 10.5, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: DARK, bold: true });
  s10.addText(feat.desc, { x: 1.5, y: y + 0.5, w: 10.5, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: GRAY });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 11: CASO DE USO
// ════════════════════════════════════════════════════════════════
const s11 = pptx.addSlide();
s11.background = { fill: WHITE };
addFooter(s11, 11, TOTAL_SLIDES);

s11.addText('Exemplo Prático', {
  x: 0.5, y: 0.3, w: 12, h: 0.7,
  fontSize: 28, fontFace: 'Calibri', color: DARK, bold: true,
});
s11.addShape('rect' as any, { x: 0.5, y: 1.0, w: 1.5, h: 0.05, fill: { color: BLUE } });

const scenario = [
  { who: 'Maria (FP&A)', action: 'Analisa a DRE de Março e nota que a receita da marca Rede caiu 15%', bg: 'EFF6FF', color: BLUE },
  { who: 'Maria', action: 'Clica "Solicitar Análise" → Assunto: "Queda de receita Rede Mar/26" → Responsável: João (Controller)', bg: 'EFF6FF', color: BLUE },
  { who: 'João', action: 'Recebe email e badge laranja. Abre a solicitação, aplica os filtros e investiga.', bg: 'FFF7ED', color: AMBER },
  { who: 'João', action: 'Responde: "A queda é por cancelamento de 3 contratos grandes. Detalhes: ..."', bg: 'FFF7ED', color: AMBER },
  { who: 'Maria', action: 'Recebe badge verde. Revisa a resposta. Quer mais detalhes → Devolve com: "Quais contratos?"', bg: 'EFF6FF', color: BLUE },
  { who: 'João', action: 'Recebe novamente. Complementa: "Contratos X, Y e Z. Valores: ..."', bg: 'FFF7ED', color: AMBER },
  { who: 'Maria', action: 'Satisfeita com a explicação → Aprova ✅. Solicitação encerrada.', bg: 'ECFDF5', color: EMERALD },
];

scenario.forEach((step, idx) => {
  const y = 1.3 + idx * 0.8;
  s11.addShape('roundRect' as any, { x: 0.5, y, w: 12.3, h: 0.7, fill: { color: step.bg }, rectRadius: 0.08 });
  s11.addText(step.who, { x: 0.8, y, w: 2.5, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: step.color, bold: true, valign: 'middle' });
  s11.addText(step.action, { x: 3.3, y, w: 9.2, h: 0.7, fontSize: 11, fontFace: 'Calibri', color: DARK, valign: 'middle' });
});

// ════════════════════════════════════════════════════════════════
// SLIDE 12: ENCERRAMENTO
// ════════════════════════════════════════════════════════════════
const s12 = pptx.addSlide();
s12.background = { fill: DARK };
s12.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: BLUE } });
s12.addShape('rect' as any, { x: 0, y: 7.35, w: 13.33, h: 0.15, fill: { color: BLUE } });

s12.addText('Solicitações de Análise', {
  x: 1, y: 2.0, w: 11, h: 0.8,
  fontSize: 32, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center',
});
s12.addText('Transparência • Rastreabilidade • Agilidade', {
  x: 1, y: 3.0, w: 11, h: 0.6,
  fontSize: 18, fontFace: 'Calibri', color: BLUE, align: 'center',
});
s12.addShape('rect' as any, { x: 5.5, y: 3.9, w: 2.3, h: 0.04, fill: { color: BLUE } });

const benefits = [
  'Elimina dúvidas por email/WhatsApp sem rastreamento',
  'Garante que cada pergunta tenha um responsável e um prazo',
  'Mantém histórico completo de todas as interações',
  'Integrado ao contexto da DRE — filtros capturados automaticamente',
];

benefits.forEach((text, idx) => {
  s12.addText(`✓  ${text}`, {
    x: 2.5, y: 4.3 + idx * 0.5, w: 8.5, h: 0.4,
    fontSize: 13, fontFace: 'Calibri', color: 'CBD5E1', align: 'left',
  });
});

s12.addText('DRE RAIZ — RAIZ EDUCAÇÃO', {
  x: 1, y: 6.5, w: 11, h: 0.4,
  fontSize: 11, fontFace: 'Calibri', color: GRAY, align: 'center',
});

// ════════════════════════════════════════════════════════════════
// GERAR ARQUIVO
// ════════════════════════════════════════════════════════════════
const outPath = 'docs/Solicitacoes_Analise_DRE_Raiz.pptx';
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`✅ PPT gerado: ${outPath}`);
}).catch((err: any) => {
  console.error('❌ Erro ao gerar PPT:', err);
});
