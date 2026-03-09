/**
 * Gerador de PPT: Cultura de Resultados — Raiz Educação
 * Treinamento completo para toda a empresa
 *
 * Uso: node scripts/generate-cultura-resultados-ppt.mjs
 */

import pptxgen from 'pptxgenjs';

// ═══════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════
const C = {
  primary:    '1B3A5C',   // Azul escuro institucional
  secondary:  '1B75BB',   // Azul médio
  accent:     'F44C00',   // Laranja Raiz
  green:      '16A34A',   // Verde resultado positivo
  red:        'DC2626',   // Vermelho alerta
  yellow:     'F59E0B',   // Amarelo atenção
  dark:       '0F172A',   // Quase preto
  gray:       '64748B',   // Cinza texto
  lightGray:  'F1F5F9',   // Background claro
  white:      'FFFFFF',
  black:      '000000',
};

const FONT = {
  title:    { fontFace: 'Calibri', fontSize: 28, bold: true, color: C.white },
  h1:       { fontFace: 'Calibri', fontSize: 24, bold: true, color: C.dark },
  h2:       { fontFace: 'Calibri', fontSize: 20, bold: true, color: C.primary },
  h3:       { fontFace: 'Calibri', fontSize: 16, bold: true, color: C.primary },
  body:     { fontFace: 'Calibri', fontSize: 13, color: C.dark },
  bodyS:    { fontFace: 'Calibri', fontSize: 11, color: C.gray },
  caption:  { fontFace: 'Calibri', fontSize: 9,  color: C.gray },
  number:   { fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent },
  kpi:      { fontFace: 'Calibri', fontSize: 14, bold: true, color: C.white },
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function addHeaderBar(slide, text, opts = {}) {
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.85, fill: { color: opts.color || C.primary } });
  slide.addText(text, { x: 0.5, y: 0.12, w: 9, h: 0.6, ...FONT.title, fontSize: opts.fontSize || 22 });
  // Accent bar
  slide.addShape('rect', { x: 0, y: 0.85, w: '100%', h: 0.06, fill: { color: C.accent } });
}

function addFooter(slide, pageNum, total) {
  slide.addText(`Raiz Educação S.A. — Cultura de Resultados`, {
    x: 0.3, y: 5.2, w: 6, h: 0.3, ...FONT.caption, color: C.gray
  });
  slide.addText(`${pageNum}/${total}`, {
    x: 9, y: 5.2, w: 0.7, h: 0.3, ...FONT.caption, color: C.gray, align: 'right'
  });
}

function addBullets(slide, items, x, y, w, opts = {}) {
  const textItems = items.map(item => {
    if (typeof item === 'string') {
      return { text: item, options: { ...FONT.body, fontSize: opts.fontSize || 13, bullet: { code: '25CF', color: C.accent }, paraSpaceAfter: 8, indentLevel: opts.indent || 0 } };
    }
    return item;
  });
  slide.addText(textItems, { x, y, w, h: opts.h || 3.5, valign: 'top' });
}

function addIconBox(slide, x, y, w, h, icon, title, desc, color) {
  slide.addShape('roundedRect', { x, y, w, h, fill: { color }, rectRadius: 0.1 });
  slide.addText(icon, { x, y: y + 0.08, w, h: 0.5, align: 'center', fontSize: 22 });
  slide.addText(title, { x: x + 0.1, y: y + 0.55, w: w - 0.2, h: 0.35, ...FONT.kpi, fontSize: 11, align: 'center' });
  if (desc) {
    slide.addText(desc, { x: x + 0.08, y: y + 0.85, w: w - 0.16, h: 0.6, ...FONT.caption, color: C.white, align: 'center', fontSize: 8 });
  }
}

function addNumberHighlight(slide, x, y, number, label, color) {
  slide.addText(number, { x, y, w: 2, h: 0.6, fontFace: 'Calibri', fontSize: 32, bold: true, color: color || C.accent, align: 'center' });
  slide.addText(label, { x, y: y + 0.55, w: 2, h: 0.35, ...FONT.bodyS, align: 'center' });
}

function addScreenPlaceholder(slide, x, y, w, h, label) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.lightGray }, line: { color: 'CBD5E1', width: 1, dashType: 'dash' } });
  slide.addText(`📷 ${label}`, { x, y, w, h, align: 'center', valign: 'middle', ...FONT.bodyS, color: C.gray, fontSize: 10 });
}

function addTable(slide, headers, rows, x, y, w) {
  const tableRows = [
    headers.map(h => ({ text: h, options: { bold: true, fontSize: 10, color: C.white, fill: { color: C.primary }, align: 'center', border: { type: 'solid', color: C.primary, pt: 0.5 } } })),
    ...rows.map((row, i) => row.map(cell => ({
      text: cell,
      options: { fontSize: 9, color: C.dark, fill: { color: i % 2 === 0 ? C.white : C.lightGray }, align: 'center', border: { type: 'solid', color: 'E2E8F0', pt: 0.5 } }
    })))
  ];
  slide.addTable(tableRows, { x, y, w, colW: Array(headers.length).fill(w / headers.length), rowH: 0.32, autoPage: false });
}

// ═══════════════════════════════════════════
// SLIDES
// ═══════════════════════════════════════════

const TOTAL_SLIDES = 32;

function buildSlides(pptx) {
  const slides = [];

  // ─────────────────────────────────────────
  // SLIDE 1: CAPA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.primary };
    // Gradient effect via overlapping shapes
    s.addShape('rect', { x: 0, y: 3.8, w: '100%', h: 1.7, fill: { color: C.dark }, transparency: 50 });
    s.addShape('rect', { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: C.accent } });

    s.addText('CULTURA DE\nRESULTADOS', { x: 0.8, y: 0.8, w: 8, h: 2, fontFace: 'Calibri', fontSize: 44, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Transformando números em decisões', { x: 0.8, y: 2.6, w: 8, h: 0.5, fontFace: 'Calibri', fontSize: 20, color: C.accent, italic: true });
    s.addShape('rect', { x: 0.8, y: 3.2, w: 2, h: 0.04, fill: { color: C.accent } });

    s.addText('Raiz Educação S.A.', { x: 0.8, y: 3.9, w: 5, h: 0.4, fontFace: 'Calibri', fontSize: 16, color: C.white });
    s.addText('Treinamento Institucional — 2026', { x: 0.8, y: 4.3, w: 5, h: 0.35, fontFace: 'Calibri', fontSize: 13, color: C.white, transparency: 30 });
    s.addText('Plataforma DRE RAIZ', { x: 0.8, y: 4.7, w: 5, h: 0.35, fontFace: 'Calibri', fontSize: 11, color: C.accent });
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 2: AGENDA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'AGENDA');

    const items = [
      ['01', 'O que é Cultura de Resultados?', 'Definição, por que importa, e o que muda na prática'],
      ['02', 'Os 5 Pilares', 'Transparência, Responsabilização, Planejamento, Monitoramento, Inteligência'],
      ['03', 'A Jornada do Número', 'Do lançamento à decisão executiva — passo a passo'],
      ['04', 'Nossa Ferramenta: DRE RAIZ', 'Tour pelas funcionalidades e como cada área usa'],
      ['05', 'Papéis e Responsabilidades', 'O que muda para cada perfil na organização'],
      ['06', 'Governança e Compliance', 'Aprovações, auditoria, rastreabilidade'],
      ['07', 'IA a Serviço dos Resultados', 'Análises, forecasts, agentes inteligentes'],
      ['08', 'Gaps e Próximos Passos', 'O que falta e para onde vamos'],
    ];

    items.forEach((item, i) => {
      const yBase = 1.15 + (i * 0.48);
      s.addText(item[0], { x: 0.5, y: yBase, w: 0.5, h: 0.4, fontFace: 'Calibri', fontSize: 16, bold: true, color: C.accent, align: 'center' });
      s.addText(item[1], { x: 1.1, y: yBase, w: 3.5, h: 0.22, fontFace: 'Calibri', fontSize: 13, bold: true, color: C.dark });
      s.addText(item[2], { x: 1.1, y: yBase + 0.2, w: 8, h: 0.22, fontFace: 'Calibri', fontSize: 10, color: C.gray });
    });

    addFooter(s, 2, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 3: SEÇÃO DIVISÓRIA — O QUE É CULTURA DE RESULTADOS
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('01', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('O QUE É CULTURA\nDE RESULTADOS?', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Não é só olhar números.\nÉ criar um sistema onde cada decisão\ntem base, rastreabilidade e dono.', {
      x: 0.5, y: 2.6, w: 8, h: 1.5, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 3, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 4: DEFINIÇÃO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'DEFINIÇÃO: CULTURA DE RESULTADOS');

    s.addText('"Cultura de Resultados é o conjunto de comportamentos, processos e ferramentas que garantem que toda a organização fale a mesma língua numérica — e que cada número tenha um dono, uma explicação e um plano de ação."', {
      x: 0.5, y: 1.2, w: 9, h: 1.2, fontFace: 'Calibri', fontSize: 14, color: C.primary, italic: true, align: 'center', lineSpacingMultiple: 1.4,
      shape: 'roundedRect', fill: { color: 'EFF6FF' }, rectRadius: 0.1
    });

    s.addText('O que NÃO é:', { x: 0.5, y: 2.7, w: 4, h: 0.35, ...FONT.h3, color: C.red });
    addBullets(s, [
      'Apenas planilhas de Excel circulando por e-mail',
      'Cobrar resultados sem dar visibilidade dos dados',
      'Reportar números sem contexto ou explicação',
      'Decisões baseadas em "feeling" ou achismo',
    ], 0.5, 3.05, 4.2, { fontSize: 11 });

    s.addText('O que É:', { x: 5.2, y: 2.7, w: 4, h: 0.35, ...FONT.h3, color: C.green });
    addBullets(s, [
      'Um sistema único e confiável de dados (single source of truth)',
      'Cada desvio identificado, justificado e com responsável',
      'Decisões baseadas em dados + inteligência artificial',
      'Transparência total: do lançamento ao resultado final',
    ], 5.2, 3.05, 4.5, { fontSize: 11 });

    addFooter(s, 4, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 5: POR QUE IMPORTA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'POR QUE CULTURA DE RESULTADOS IMPORTA?');

    // Numbers row
    addNumberHighlight(s, 0.3, 1.2, '73%', 'das empresas com cultura\ndata-driven superam peers', C.accent);
    addNumberHighlight(s, 2.6, 1.2, '5x', 'mais rápidas\nem tomar decisões\ncorretivas', C.secondary);
    addNumberHighlight(s, 4.9, 1.2, '40%', 'menos retrabalho\ncom fonte única\nde verdade', C.green);
    addNumberHighlight(s, 7.2, 1.2, '2.5x', 'maior probabilidade\nde atingir metas\norçamentárias', C.primary);

    s.addShape('rect', { x: 0.5, y: 2.8, w: 9, h: 0.02, fill: { color: 'E2E8F0' } });

    s.addText('Para a Raiz Educação, isso significa:', { x: 0.5, y: 3.0, w: 9, h: 0.4, ...FONT.h2 });
    addBullets(s, [
      'Todas as marcas (CGS, QI, SAP, Eleva, etc.) com a mesma régua de análise',
      'Gestores sabem onde estão os desvios ANTES da reunião mensal',
      'IA sintetiza análises que levariam horas em minutos',
      'Histórico completo: cada lançamento rastreável (quem, quando, por quê)',
    ], 0.5, 3.4, 9, { fontSize: 12 });

    addFooter(s, 5, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 6: SEÇÃO — OS 5 PILARES
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('02', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('OS 5 PILARES DA\nCULTURA DE RESULTADOS', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Cada pilar é sustentado por funcionalidades\nreais da plataforma DRE RAIZ', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });

    // 5 icon boxes
    const pillars = [
      ['🔍', 'TRANSPARÊNCIA', C.secondary],
      ['👤', 'RESPONSABILIZAÇÃO', C.accent],
      ['📊', 'PLANEJAMENTO', '2563EB'],
      ['📡', 'MONITORAMENTO', C.green],
      ['🤖', 'INTELIGÊNCIA', '7C3AED'],
    ];
    pillars.forEach((p, i) => {
      const x = 0.35 + i * 1.9;
      s.addShape('roundedRect', { x, y: 3.8, w: 1.7, h: 1.1, fill: { color: p[2] }, rectRadius: 0.08 });
      s.addText(p[0], { x, y: 3.82, w: 1.7, h: 0.45, align: 'center', fontSize: 20 });
      s.addText(p[1], { x, y: 4.25, w: 1.7, h: 0.55, align: 'center', fontFace: 'Calibri', fontSize: 9, bold: true, color: C.white });
    });

    addFooter(s, 6, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 7: PILAR 1 — TRANSPARÊNCIA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PILAR 1: TRANSPARÊNCIA', { color: C.secondary });

    s.addText('Todos veem os mesmos números, com a mesma metodologia, em tempo real.', {
      x: 0.5, y: 1.1, w: 9, h: 0.4, ...FONT.body, italic: true, color: C.secondary
    });

    s.addText('Como funciona no DRE RAIZ:', { x: 0.5, y: 1.6, w: 4, h: 0.35, ...FONT.h3 });
    addBullets(s, [
      'DRE Gerencial: visão consolidada Real vs Orçado vs Ano Anterior',
      '3 modos de visualização: Consolidado, Cenário, Mês',
      'Drill-down: tag0 → tag01 → tag02 → tag03 (projeto)',
      'Filtros compartilhados: marcas, filiais, centros de custo',
      'Ctrl+Clique para somar valores interativamente',
      'Export Excel fiel à tela (não é planilha separada)',
    ], 0.5, 1.95, 4.5, { fontSize: 11 });

    // Screenshot placeholder
    addScreenPlaceholder(s, 5.2, 1.6, 4.5, 3.2, 'Print: DRE Gerencial\n(SomaTagsView — modo Cenário)\nMostrando Real vs Orçado\ncom drill-down em tag01');

    addFooter(s, 7, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 8: TRANSPARÊNCIA — DRILL-DOWN
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'TRANSPARÊNCIA: DO MACRO AO MICRO', { color: C.secondary });

    // Flow diagram
    const levels = [
      ['DRE\n(tag0)', 'Receita, Custos,\nSG&A, EBITDA', C.primary],
      ['Centro de Custo\n(tag01)', 'Mensalidades,\nMatrícula, Taxas', C.secondary],
      ['Segmento\n(tag02)', 'Graduação,\nPós, EAD', '3B82F6'],
      ['Projeto\n(tag03)', 'Campanha X,\nEvento Y', '60A5FA'],
      ['Lançamento\n(transação)', 'NF 12345,\nR$ 15.200,00', C.accent],
    ];

    levels.forEach((lvl, i) => {
      const x = 0.2 + i * 1.92;
      s.addShape('roundedRect', { x, y: 1.3, w: 1.75, h: 1.5, fill: { color: lvl[2] }, rectRadius: 0.08 });
      s.addText(lvl[0], { x, y: 1.35, w: 1.75, h: 0.65, align: 'center', fontFace: 'Calibri', fontSize: 10, bold: true, color: C.white });
      s.addText(lvl[1], { x, y: 2.0, w: 1.75, h: 0.7, align: 'center', fontFace: 'Calibri', fontSize: 9, color: C.white, transparency: 15 });
      if (i < 4) {
        s.addText('→', { x: x + 1.72, y: 1.7, w: 0.25, h: 0.4, fontFace: 'Calibri', fontSize: 18, bold: true, color: C.gray, align: 'center' });
      }
    });

    s.addText('Duplo clique em qualquer linha da DRE → abre Lançamentos com filtros pré-aplicados', {
      x: 0.5, y: 3.0, w: 9, h: 0.4, ...FONT.body, color: C.accent, bold: true, align: 'center'
    });

    addScreenPlaceholder(s, 0.5, 3.5, 4.2, 1.5, 'Print: DRE Gerencial\ndrill-down aberto (tag01 expandido)');
    addScreenPlaceholder(s, 5, 3.5, 4.7, 1.5, 'Print: Lançamentos (TransactionsView)\nfiltros pré-aplicados via drill-down');

    addFooter(s, 8, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 9: PILAR 2 — RESPONSABILIZAÇÃO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PILAR 2: RESPONSABILIZAÇÃO', { color: C.accent });

    s.addText('Cada mudança tem um dono. Cada desvio tem uma justificativa. Cada aprovação tem um registro.', {
      x: 0.5, y: 1.1, w: 9, h: 0.4, ...FONT.body, italic: true, color: C.accent
    });

    // Two columns
    s.addText('Fila de Aprovação', { x: 0.5, y: 1.7, w: 4.3, h: 0.3, ...FONT.h3, color: C.accent });
    addBullets(s, [
      'Toda edição de lançamento gera solicitação',
      'Regra de 2 pessoas: quem pede ≠ quem aprova',
      'Visualização antes/depois (De → Para)',
      'Justificativa obrigatória para rateios',
      'Histórico completo: quem, quando, o quê',
      'Badge de pendentes na sidebar (alerta visual)',
    ], 0.5, 2.05, 4.3, { fontSize: 11 });

    s.addText('Justificativas de Desvio', { x: 5.3, y: 1.7, w: 4.3, h: 0.3, ...FONT.h3, color: C.accent });
    addBullets(s, [
      '"Gerar Desvios" = foto da DRE naquele momento',
      'Pacoteiros justificam suas linhas (tag02/tag03)',
      'IA sintetiza cascata: tag03→tag02→tag01→tag0',
      'Notificação por email aos responsáveis',
      'Status: Pendente → Justificado → Aprovado',
      'Versionamento: cada geração cria nova versão',
    ], 5.3, 2.05, 4.4, { fontSize: 11 });

    addScreenPlaceholder(s, 0.5, 4.0, 4.3, 1.0, 'Print: ManualChangesView\n(Fila de Aprovação com De→Para)');
    addScreenPlaceholder(s, 5.3, 4.0, 4.4, 1.0, 'Print: VarianceJustificationsView\n(Tabela hierárquica de desvios)');

    addFooter(s, 9, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 10: RESPONSABILIZAÇÃO — FLUXO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'FLUXO DE GOVERNANÇA', { color: C.accent });

    // Timeline flow
    const steps = [
      ['1', 'Operacional\nedita lançamento', 'TransactionsView\n(edição inline)', C.secondary],
      ['2', 'Sistema registra\nsolicitação', 'manual_changes\n(automático)', C.gray],
      ['3', 'Aprovador\nrevisa De→Para', 'ManualChangesView\n(aprovação)', C.accent],
      ['4', 'Aplica ou\nrejeita', 'Auditoria\ncompleta', C.green],
    ];

    steps.forEach((step, i) => {
      const x = 0.3 + i * 2.4;
      s.addShape('ellipse', { x: x + 0.7, y: 1.2, w: 0.7, h: 0.7, fill: { color: step[3] } });
      s.addText(step[0], { x: x + 0.7, y: 1.25, w: 0.7, h: 0.6, align: 'center', fontFace: 'Calibri', fontSize: 20, bold: true, color: C.white });
      s.addText(step[1], { x, y: 2.0, w: 2.1, h: 0.5, align: 'center', fontFace: 'Calibri', fontSize: 11, bold: true, color: C.dark });
      s.addText(step[2], { x, y: 2.5, w: 2.1, h: 0.5, align: 'center', fontFace: 'Calibri', fontSize: 9, color: C.gray });
      if (i < 3) {
        s.addText('→', { x: x + 2.05, y: 1.3, w: 0.4, h: 0.5, fontFace: 'Calibri', fontSize: 24, color: C.gray, align: 'center' });
      }
    });

    s.addShape('rect', { x: 0.5, y: 3.2, w: 9, h: 0.02, fill: { color: 'E2E8F0' } });

    s.addText('Processo Mensal de Desvios:', { x: 0.5, y: 3.4, w: 9, h: 0.35, ...FONT.h3, color: C.accent });

    const monthly = [
      ['1', 'DRE Gerencial\n(dia a dia)', 'Análises, ajustes\ne lançamentos', C.secondary],
      ['2', 'Data de Corte\n(FP&A)', '"Gerar Desvios"\n= SNAPSHOT', C.accent],
      ['3', 'Pacoteiros\n(prazo X dias)', 'Justificam\ntag02/tag03', '2563EB'],
      ['4', 'PPT Automático\n(1 clique)', 'DRE + Justificativas\n→ Apresentação', C.green],
    ];

    monthly.forEach((step, i) => {
      const x = 0.3 + i * 2.4;
      s.addShape('roundedRect', { x, y: 3.85, w: 2.1, h: 1.2, fill: { color: step[3] }, rectRadius: 0.08 });
      s.addText(`Passo ${step[0]}`, { x, y: 3.88, w: 2.1, h: 0.22, align: 'center', fontFace: 'Calibri', fontSize: 8, bold: true, color: C.white, transparency: 30 });
      s.addText(step[1], { x, y: 4.08, w: 2.1, h: 0.45, align: 'center', fontFace: 'Calibri', fontSize: 10, bold: true, color: C.white });
      s.addText(step[2], { x, y: 4.5, w: 2.1, h: 0.45, align: 'center', fontFace: 'Calibri', fontSize: 9, color: C.white, transparency: 15 });
    });

    addFooter(s, 10, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 11: PILAR 3 — PLANEJAMENTO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PILAR 3: PLANEJAMENTO', { color: '2563EB' });

    s.addText('Não basta olhar para trás. É preciso projetar o futuro e corrigir a rota ANTES do fechamento.', {
      x: 0.5, y: 1.1, w: 9, h: 0.4, ...FONT.body, italic: true, color: '2563EB'
    });

    s.addText('Real vs Orçado vs Ano Anterior', { x: 0.5, y: 1.7, w: 4.3, h: 0.3, ...FONT.h3, color: '2563EB' });
    addBullets(s, [
      'DRE Gerencial modo "Cenário": 3 cenários lado a lado',
      'Delta absoluto (R$) e percentual (%) em cada linha',
      'Cores: verde = favorável, vermelho = desfavorável',
      'Mesma metodologia para todas as marcas',
    ], 0.5, 2.05, 4.3, { fontSize: 11 });

    s.addText('Forecast de Fechamento', { x: 5.3, y: 1.7, w: 4.3, h: 0.3, ...FONT.h3, color: '2563EB' });
    addBullets(s, [
      '3 métodos: Run Rate, Budget Adjusted, Linear Trend',
      'Intervalo de confiança (95%) com bandas visuais',
      'Projeção por tag0 e tag01 (centro de custo)',
      'Gráfico: Real (barras) + Forecast (linha)',
    ], 5.3, 2.05, 4.4, { fontSize: 11 });

    addScreenPlaceholder(s, 0.5, 3.7, 4.3, 1.3, 'Print: DRE Gerencial\nmodo Cenário\n(Real vs Orçado vs A-1)');
    addScreenPlaceholder(s, 5.3, 3.7, 4.4, 1.3, 'Print: ForecastingView\n(gráfico com bandas de confiança)');

    addFooter(s, 11, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 12: PILAR 4 — MONITORAMENTO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PILAR 4: MONITORAMENTO EM TEMPO REAL', { color: C.green });

    s.addText('Dashboards executivos que mostram a saúde financeira em um relance.', {
      x: 0.5, y: 1.1, w: 9, h: 0.4, ...FONT.body, italic: true, color: C.green
    });

    s.addText('Cockpit Financeiro (Dashboard)', { x: 0.5, y: 1.7, w: 9, h: 0.3, ...FONT.h3, color: C.green });

    // 5 zones
    const zones = [
      ['Zona A', 'Health Cards', '4 KPIs: Receita, EBITDA, Margem%, Alunos', C.green],
      ['Zona B', 'Anomalias', 'Desvios >5% destacados automaticamente', C.yellow],
      ['Zona C', 'KPIs Operacionais', '13 indicadores: Hero + Operacionais + Consumo', C.secondary],
      ['Zona D', 'Performance Filiais', 'Ranking + gráfico ECharts por filial', C.primary],
      ['Zona E', 'Resumo IA', 'Narrativa executiva gerada por Claude', '7C3AED'],
    ];

    zones.forEach((z, i) => {
      const x = 0.2 + i * 1.92;
      s.addShape('roundedRect', { x, y: 2.15, w: 1.78, h: 1.3, fill: { color: z[3] }, rectRadius: 0.08 });
      s.addText(z[0], { x, y: 2.18, w: 1.78, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 9, bold: true, color: C.white, transparency: 30 });
      s.addText(z[1], { x, y: 2.4, w: 1.78, h: 0.35, align: 'center', fontFace: 'Calibri', fontSize: 11, bold: true, color: C.white });
      s.addText(z[2], { x: x + 0.08, y: 2.75, w: 1.62, h: 0.6, align: 'center', fontFace: 'Calibri', fontSize: 8, color: C.white, transparency: 15 });
    });

    s.addText('Semáforo: 🟢 ≤5%  |  🟡 5-15%  |  🔴 >15%  (custos invertidos)', {
      x: 0.5, y: 3.6, w: 9, h: 0.35, ...FONT.body, align: 'center', color: C.gray
    });

    addScreenPlaceholder(s, 0.5, 4.0, 9, 1.0, 'Print: Cockpit Financeiro (CockpitDashboard) — visão completa com Health Cards + Anomalias');

    addFooter(s, 12, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 13: MONITORAMENTO — CEO DASHBOARD
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'VISÃO CEO: PAINEL EXECUTIVO', { color: C.green });

    s.addText('5 abas estratégicas para decisões de alto nível:', { x: 0.5, y: 1.1, w: 9, h: 0.35, ...FONT.body, italic: true, color: C.green });

    const tabs = [
      ['📊', 'Dashboard', 'Score financeiro, KPIs,\ntrend 6 meses, benchmark,\nriscos e ações', C.primary],
      ['🏢', 'Portfolio', 'Ranking de marcas,\nrisco por marca, HHI,\nalocação de capital', C.secondary],
      ['🔬', 'Simulação', 'Até 6 cenários,\n7 alavancas (preço,\nvolume, custos...)', '2563EB'],
      ['⚡', 'Decisões', 'Recomendações IA,\ntradeoffs, quick wins,\nações a evitar', C.accent],
      ['🛡️', 'Stress Test', '5 cenários de estresse\npor marca, impacto\nno EBITDA', C.red],
    ];

    tabs.forEach((tab, i) => {
      const x = 0.15 + i * 1.96;
      s.addShape('roundedRect', { x, y: 1.55, w: 1.82, h: 2.0, fill: { color: tab[3] }, rectRadius: 0.08 });
      s.addText(tab[0], { x, y: 1.6, w: 1.82, h: 0.4, align: 'center', fontSize: 18 });
      s.addText(tab[1], { x, y: 1.95, w: 1.82, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 12, bold: true, color: C.white });
      s.addText(tab[2], { x: x + 0.08, y: 2.3, w: 1.66, h: 1.1, align: 'center', fontFace: 'Calibri', fontSize: 9, color: C.white, transparency: 15, lineSpacingMultiple: 1.2 });
    });

    addScreenPlaceholder(s, 0.5, 3.8, 4.3, 1.2, 'Print: CEO Dashboard\n(aba Portfolio — ranking de marcas)');
    addScreenPlaceholder(s, 5.2, 3.8, 4.5, 1.2, 'Print: CEO Dashboard\n(aba Simulação — cenários what-if)');

    addFooter(s, 13, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 14: PILAR 5 — INTELIGÊNCIA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PILAR 5: INTELIGÊNCIA ARTIFICIAL', { color: '7C3AED' });

    s.addText('IA não substitui o gestor. IA amplifica a capacidade de análise e síntese.', {
      x: 0.5, y: 1.1, w: 9, h: 0.4, ...FONT.body, italic: true, color: '7C3AED'
    });

    s.addText('3 Camadas de IA no DRE RAIZ:', { x: 0.5, y: 1.6, w: 9, h: 0.3, ...FONT.h3, color: '7C3AED' });

    // Layer 1
    s.addShape('roundedRect', { x: 0.5, y: 2.0, w: 2.8, h: 2.3, fill: { color: 'F5F3FF' }, line: { color: '7C3AED', width: 1 }, rectRadius: 0.08 });
    s.addText('Camada 1', { x: 0.5, y: 2.05, w: 2.8, h: 0.25, align: 'center', fontFace: 'Calibri', fontSize: 9, color: '7C3AED' });
    s.addText('Narrativa Automática', { x: 0.6, y: 2.28, w: 2.6, h: 0.3, fontFace: 'Calibri', fontSize: 12, bold: true, color: '7C3AED', align: 'center' });
    addBullets(s, [
      'Análise DRE em prosa',
      'Síntese de desvios (cascata)',
      'Resumo executivo no dashboard',
    ], 0.6, 2.6, 2.6, { fontSize: 9, h: 1.5 });

    // Layer 2
    s.addShape('roundedRect', { x: 3.6, y: 2.0, w: 2.8, h: 2.3, fill: { color: 'F5F3FF' }, line: { color: '7C3AED', width: 1 }, rectRadius: 0.08 });
    s.addText('Camada 2', { x: 3.6, y: 2.05, w: 2.8, h: 0.25, align: 'center', fontFace: 'Calibri', fontSize: 9, color: '7C3AED' });
    s.addText('Forecast & Projeção', { x: 3.7, y: 2.28, w: 2.6, h: 0.3, fontFace: 'Calibri', fontSize: 12, bold: true, color: '7C3AED', align: 'center' });
    addBullets(s, [
      '3 métodos de projeção',
      'Intervalos de confiança',
      'Detecção de anomalias',
    ], 3.7, 2.6, 2.6, { fontSize: 9, h: 1.5 });

    // Layer 3
    s.addShape('roundedRect', { x: 6.7, y: 2.0, w: 3, h: 2.3, fill: { color: 'F5F3FF' }, line: { color: '7C3AED', width: 1 }, rectRadius: 0.08 });
    s.addText('Camada 3', { x: 6.7, y: 2.05, w: 3, h: 0.25, align: 'center', fontFace: 'Calibri', fontSize: 9, color: '7C3AED' });
    s.addText('Equipe Alpha (7 Agentes)', { x: 6.8, y: 2.28, w: 2.8, h: 0.3, fontFace: 'Calibri', fontSize: 12, bold: true, color: '7C3AED', align: 'center' });
    addBullets(s, [
      'Alex: Planejador Estratégico',
      'Bruna: Qualidade de Dados',
      'Carlos: Performance Analyst',
      'Denilson: Otimização',
      'Edmundo: Forecast Adaptativo',
      'Falcão: Risco Estratégico',
      'Executivo: Revisão Final',
    ], 6.8, 2.6, 2.8, { fontSize: 8, h: 1.5 });

    s.addText('Pipeline: DADO → LEITURA → EXPLICAÇÃO → PLANO → PROJEÇÃO → RISCO → NARRATIVA → REVISÃO', {
      x: 0.5, y: 4.5, w: 9, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 10, bold: true, color: '7C3AED',
      shape: 'roundedRect', fill: { color: 'F5F3FF' }, rectRadius: 0.06
    });

    addFooter(s, 14, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 15: SEÇÃO — JORNADA DO NÚMERO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('03', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('A JORNADA\nDO NÚMERO', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Do lançamento bancário à decisão executiva\n— cada etapa dentro do sistema', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 15, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 16: JORNADA — VISÃO GERAL
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'JORNADA DO NÚMERO: VISÃO GERAL');

    const journey = [
      { step: '1', title: 'ORIGEM', desc: 'Conciliação bancária\n+ importação manual', icon: '📥', color: C.secondary, view: 'AdminPanel' },
      { step: '2', title: 'CLASSIFICAÇÃO', desc: 'Conta contábil → tags\n(trigger automático)', icon: '🏷️', color: '3B82F6', view: 'Triggers SQL' },
      { step: '3', title: 'ENRIQUECIMENTO', desc: 'Nome filial, tag0,\nrecorrência, PDD', icon: '⚙️', color: '2563EB', view: 'Automações' },
      { step: '4', title: 'CONSOLIDAÇÃO', desc: 'DRE Gerencial:\nReal vs Orçado vs A-1', icon: '📊', color: C.primary, view: 'SomaTagsView' },
      { step: '5', title: 'ANÁLISE', desc: 'Desvios, forecast,\nIA narrativa', icon: '🔍', color: '7C3AED', view: 'AnalysisView' },
      { step: '6', title: 'DECISÃO', desc: 'Dashboard, simulação,\nstress test', icon: '⚡', color: C.accent, view: 'ExecutiveDashboard' },
      { step: '7', title: 'COMUNICAÇÃO', desc: 'PPT automático,\nExcel, PDF', icon: '📋', color: C.green, view: 'Export Services' },
    ];

    journey.forEach((j, i) => {
      const x = 0.05 + i * 1.4;
      s.addShape('roundedRect', { x, y: 1.2, w: 1.3, h: 2.3, fill: { color: j.color }, rectRadius: 0.08 });
      s.addText(j.icon, { x, y: 1.22, w: 1.3, h: 0.35, align: 'center', fontSize: 16 });
      s.addText(`Passo ${j.step}`, { x, y: 1.55, w: 1.3, h: 0.2, align: 'center', fontFace: 'Calibri', fontSize: 8, color: C.white, transparency: 40 });
      s.addText(j.title, { x, y: 1.72, w: 1.3, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 10, bold: true, color: C.white });
      s.addText(j.desc, { x: x + 0.05, y: 2.05, w: 1.2, h: 0.8, align: 'center', fontFace: 'Calibri', fontSize: 8, color: C.white, transparency: 15, lineSpacingMultiple: 1.2 });
      s.addText(j.view, { x, y: 2.95, w: 1.3, h: 0.4, align: 'center', fontFace: 'Calibri', fontSize: 7, color: C.white, transparency: 40, italic: true });
    });

    s.addText('Cada passo é rastreável. Nenhum dado "aparece do nada" — tudo tem origem, classificação e trilha de auditoria.', {
      x: 0.5, y: 3.7, w: 9, h: 0.5, align: 'center', fontFace: 'Calibri', fontSize: 12, bold: true, color: C.primary,
      shape: 'roundedRect', fill: { color: 'EFF6FF' }, rectRadius: 0.06
    });

    addScreenPlaceholder(s, 0.5, 4.3, 9, 0.8, 'Print: Sidebar completa do DRE RAIZ mostrando todas as guias de navegação');

    addFooter(s, 16, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 17: SEÇÃO — TOUR PELA FERRAMENTA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('04', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('TOUR: DRE RAIZ\nNA PRÁTICA', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Funcionalidades reais, telas reais,\nimpacto real no dia a dia', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 17, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 18: DRE GERENCIAL FULL
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'DRE GERENCIAL — CORAÇÃO DO SISTEMA');

    addScreenPlaceholder(s, 0.3, 1.1, 5.8, 3.5, 'Print GRANDE: DRE Gerencial (SomaTagsView)\n\nMostrar:\n• Modo Cenário (Real vs Orçado vs A-1)\n• Drill-down aberto em algum tag0\n• Filtros ativos no topo (marcas, filiais)\n• Cores de delta (verde/vermelho)\n• CalcRows (Margem, EBITDA)');

    s.addText('Funcionalidades-chave:', { x: 6.3, y: 1.1, w: 3.5, h: 0.3, ...FONT.h3 });
    addBullets(s, [
      '3 modos: Consolidado, Cenário, Mês',
      '6 filtros cascata (marca → filial)',
      'Drill-down tag0→tag01→tag02→tag03',
      'Duplo clique → Lançamentos',
      'Ctrl+Clique → somatório flutuante',
      'Excel fiel à tela',
      'Fullscreen para apresentações',
      'Colunas reordenáveis (drag)',
      'CalcRows: Margem e EBITDA',
      'Permissões por centro de custo',
    ], 6.3, 1.45, 3.5, { fontSize: 10, h: 3.5 });

    addFooter(s, 18, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 19: LANÇAMENTOS FULL
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'LANÇAMENTOS — NÍVEL TRANSACIONAL');

    addScreenPlaceholder(s, 0.3, 1.1, 5.8, 3.5, 'Print GRANDE: TransactionsView\n\nMostrar:\n• 14 filtros no topo\n• Tabela com colunas visíveis\n• Badges de status (Normal, Pendente, Manual)\n• Edição inline (modal aberto)\n• Seleção múltipla (checkbox)\n• Densidade compact');

    s.addText('Funcionalidades-chave:', { x: 6.3, y: 1.1, w: 3.5, h: 0.3, ...FONT.h3 });
    addBullets(s, [
      '14 filtros combinados',
      'Busca sob demanda (não carrega tudo)',
      '3 densidades: Comfort, Compact, Ultra',
      'Colunas configuráveis (toggle + drag)',
      'Edição inline com fila de aprovação',
      'Edição em massa (bulk)',
      'Rateio de transação (split)',
      'Export Excel/CSV formatado',
      'Realtime sync (Supabase)',
      'Status: Normal, Pendente, Ajustado, Manual',
    ], 6.3, 1.45, 3.5, { fontSize: 10, h: 3.5 });

    addFooter(s, 19, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 20: VARIÂNCIA E JUSTIFICATIVAS
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'DESVIOS E JUSTIFICATIVAS');

    addScreenPlaceholder(s, 0.3, 1.1, 5.8, 2.0, 'Print: VarianceJustificationsView\n(Tabela hierárquica: tag0 → tag01 → tag02 → marca)');

    addScreenPlaceholder(s, 0.3, 3.3, 5.8, 1.7, 'Print: Painel YTD colapsável\n+ Síntese IA de justificativas');

    s.addText('Processo:', { x: 6.3, y: 1.1, w: 3.5, h: 0.3, ...FONT.h3, color: C.accent });
    addBullets(s, [
      '"Gerar Desvios" = snapshot da DRE',
      'Hierarquia: tag0 → tag01 → tag02 → marca',
      'Pacoteiros justificam folhas (tag02/03)',
      'IA sintetiza cascata automática',
      'Notificação email (Resend)',
      'Versionamento: cada geração nova versão',
      'Status: Pendente → Justificado → Aprovado',
      'PPT automático com justificativas',
      'YTD: visão acumulada Jan→mês',
      'Snapshot imutável por versão',
    ], 6.3, 1.45, 3.5, { fontSize: 10, h: 3.5 });

    addFooter(s, 20, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 21: ADMIN E IMPORTAÇÃO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'ADMINISTRAÇÃO E CONFIGURAÇÃO');

    const tabs = [
      ['📥', 'Importação', 'Upload XLSX, preview,\nbatch processing,\nduplicatas via chave_id'],
      ['👤', 'Usuários', 'Roles (admin/manager/\nviewer), permissões\npor marca/filial/tag'],
      ['🔄', 'Recorrência', 'Upload Excel de\nrecorrentes, batch\nupdate, log terminal'],
      ['💰', 'PDD', 'Share % por marca,\ncontas base, cálculo\nautomático pg_cron'],
      ['📋', 'Tributos', 'PIS/COFINS, ISS,\nPAA por marca/filial,\nimportação batch'],
      ['📦', 'Banco', 'Export 24 colunas,\nfiltros por período,\nExcel + CSV'],
      ['📅', 'Cronograma', 'Calendário mensal,\ntarefas + reuniões,\ncolorido por área'],
      ['✉️', 'SMTP', 'AWS SES config,\nemail notifications,\nteste de envio'],
    ];

    tabs.forEach((tab, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 0.3 + col * 2.4;
      const y = 1.1 + row * 1.95;
      s.addShape('roundedRect', { x, y, w: 2.2, h: 1.75, fill: { color: C.lightGray }, line: { color: 'CBD5E1', width: 0.5 }, rectRadius: 0.08 });
      s.addText(tab[0], { x, y: y + 0.05, w: 2.2, h: 0.35, align: 'center', fontSize: 16 });
      s.addText(tab[1], { x, y: y + 0.38, w: 2.2, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 11, bold: true, color: C.primary });
      s.addText(tab[2], { x: x + 0.1, y: y + 0.7, w: 2, h: 0.9, align: 'center', fontFace: 'Calibri', fontSize: 8, color: C.gray, lineSpacingMultiple: 1.3 });
    });

    addFooter(s, 21, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 22: SEÇÃO — PAPÉIS
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('05', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('PAPÉIS E\nRESPONSABILIDADES', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('O que muda para cada perfil\ncom a Cultura de Resultados', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 22, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 23: PERFIL — OPERACIONAL
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PERFIL: TIME OPERACIONAL');

    s.addText('Quem: Analistas, assistentes, área operacional de cada marca/filial', {
      x: 0.5, y: 1.1, w: 9, h: 0.35, ...FONT.body, italic: true, color: C.gray
    });

    addTable(s,
      ['O que faz', 'Onde faz', 'Antes', 'Depois (DRE RAIZ)'],
      [
        ['Lançar transações', 'Importação / Admin', 'Excel → email → aguardar', 'Upload direto + validação'],
        ['Classificar contas', 'Automático (trigger)', 'Manual em planilha', 'Tag01/02/03 automáticos'],
        ['Solicitar ajustes', 'TransactionsView', 'WhatsApp para gestor', 'Fila de aprovação formal'],
        ['Justificar desvios', 'Justificativas', 'Reunião sem preparação', 'Justifica online + IA sintetiza'],
        ['Consultar dados', 'DRE Gerencial', 'Esperar relatório de FP&A', 'Self-service com filtros'],
      ],
      0.3, 1.6, 9.4
    );

    s.addText('💡 Ganho principal: Autonomia com governança. O operacional não depende mais de intermediários para ver seus números.', {
      x: 0.5, y: 4.0, w: 9, h: 0.5, fontFace: 'Calibri', fontSize: 11, bold: true, color: C.primary,
      shape: 'roundedRect', fill: { color: 'EFF6FF' }, rectRadius: 0.06
    });

    addFooter(s, 23, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 24: PERFIL — GESTOR
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PERFIL: GESTORES E GERENTES');

    s.addText('Quem: Gerentes de área, coordenadores, gestores de marca/filial', {
      x: 0.5, y: 1.1, w: 9, h: 0.35, ...FONT.body, italic: true, color: C.gray
    });

    addTable(s,
      ['O que faz', 'Onde faz', 'Antes', 'Depois (DRE RAIZ)'],
      [
        ['Aprovar ajustes', 'Aprovações', 'Via email sem contexto', 'De→Para visual + justificativa'],
        ['Analisar performance', 'Dashboard', 'Planilha mensal estática', 'KPIs em tempo real + anomalias'],
        ['Comparar cenários', 'DRE Cenário', 'Cruzar 3 planilhas', '3 cenários lado a lado + delta'],
        ['Gerar relatórios', 'Exports', 'Montar PPT manualmente', 'PPT automático com 1 clique'],
        ['Projetar fechamento', 'Forecast', 'Feeling + calculadora', '3 métodos + intervalo confiança'],
      ],
      0.3, 1.6, 9.4
    );

    s.addText('💡 Ganho principal: Decisões mais rápidas e informadas. O gestor vê desvios, aprova mudanças e gera apresentações sem depender de FP&A.', {
      x: 0.5, y: 4.0, w: 9, h: 0.5, fontFace: 'Calibri', fontSize: 11, bold: true, color: C.primary,
      shape: 'roundedRect', fill: { color: 'EFF6FF' }, rectRadius: 0.06
    });

    addFooter(s, 24, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 25: PERFIL — C-SUITE
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'PERFIL: C-SUITE / DIRETORIA');

    s.addText('Quem: CEO, CFO, VP, Diretores', {
      x: 0.5, y: 1.1, w: 9, h: 0.35, ...FONT.body, italic: true, color: C.gray
    });

    addTable(s,
      ['O que faz', 'Onde faz', 'Antes', 'Depois (DRE RAIZ)'],
      [
        ['Visão consolidada', 'CEO Dashboard', 'Esperar email do CFO', 'Score + KPIs em tempo real'],
        ['Análise de portfolio', 'Portfolio', 'Reunião 1h por marca', 'Ranking + risco por marca'],
        ['Simular cenários', 'Simulação', 'Planilha one-off', '6 cenários × 7 alavancas'],
        ['Tomar decisões', 'Decisões', 'Intuição + experiência', 'Recomendações IA + tradeoffs'],
        ['Stress test', 'Stress Test', 'Nunca feito', '5 cenários por marca, impacto EBITDA'],
      ],
      0.3, 1.6, 9.4
    );

    s.addText('💡 Ganho principal: Visibilidade total sem depender de intermediários. O CEO tem visão de portfolio, stress test e simulação na ponta dos dedos.', {
      x: 0.5, y: 4.0, w: 9, h: 0.5, fontFace: 'Calibri', fontSize: 11, bold: true, color: C.primary,
      shape: 'roundedRect', fill: { color: 'EFF6FF' }, rectRadius: 0.06
    });

    addFooter(s, 25, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 26: SEÇÃO — GOVERNANÇA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('06', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('GOVERNANÇA E\nCOMPLIANCE', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('Rastreabilidade, auditoria e controles\nque garantem a integridade dos dados', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 26, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 27: CONTROLES DE GOVERNANÇA
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'CONTROLES IMPLEMENTADOS');

    const controls = [
      ['🔐', 'Autenticação', 'Google SSO via Firebase\n→ Supabase JWT\n→ RLS por email', C.primary],
      ['👥', 'Permissões', '5 roles: admin, manager,\napprover, viewer, pending\n+ tag01/marca/filial', C.secondary],
      ['✅', 'Aprovação', 'Regra 2 pessoas:\nquem solicita ≠\nquem aprova', C.accent],
      ['📝', 'Auditoria', 'manual_changes: quem,\nquando, o quê, antes,\ndepois, justificativa', C.green],
      ['🔒', 'RLS', 'Row-Level Security:\ncada query filtrada\npor auth.email()', '7C3AED'],
      ['📸', 'Snapshot', 'Desvios imutáveis:\nversão + snapshot_at\n= foto do momento', C.red],
    ];

    controls.forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.3 + col * 3.2;
      const y = 1.1 + row * 2.1;
      s.addShape('roundedRect', { x, y, w: 3, h: 1.9, fill: { color: c[3] }, rectRadius: 0.08 });
      s.addText(c[0], { x, y: y + 0.05, w: 3, h: 0.35, align: 'center', fontSize: 16 });
      s.addText(c[1], { x, y: y + 0.35, w: 3, h: 0.3, align: 'center', fontFace: 'Calibri', fontSize: 13, bold: true, color: C.white });
      s.addText(c[2], { x: x + 0.15, y: y + 0.7, w: 2.7, h: 1.1, align: 'center', fontFace: 'Calibri', fontSize: 10, color: C.white, transparency: 15, lineSpacingMultiple: 1.3 });
    });

    addFooter(s, 27, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 28: SEÇÃO — GAPS
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 2.2, w: '100%', h: 0.06, fill: { color: C.accent } });
    s.addText('08', { x: 0.5, y: 0.5, w: 1, h: 0.6, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.accent });
    s.addText('GAPS E\nPRÓXIMOS PASSOS', { x: 0.5, y: 1.1, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 36, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
    s.addText('O que a ferramenta ainda pode evoluir\npara fortalecer a cultura de resultados', {
      x: 0.5, y: 2.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 16, color: C.white, italic: true, transparency: 20, lineSpacingMultiple: 1.3
    });
    addFooter(s, 28, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 29: GAPS IDENTIFICADOS
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'GAPS E OPORTUNIDADES DE MELHORIA');

    s.addText('Funcionalidades sugeridas para fortalecer a cultura:', { x: 0.5, y: 1.1, w: 9, h: 0.3, ...FONT.body, italic: true });

    const gaps = [
      ['🎯', 'Metas por Centro de Custo', 'Hoje: orçado é a referência. Falta: metas intermediárias (trimestrais, por gestor) com acompanhamento e responsável.', 'ALTO', C.red],
      ['📊', 'Indicadores Não-Financeiros', 'Hoje: apenas financeiro. Falta: Alunos matriculados, NPS, evasão, ticket médio por filial — integrar no dashboard.', 'ALTO', C.red],
      ['🔔', 'Alertas Proativos', 'Hoje: anomalias no dashboard (reativo). Falta: alertas push/email quando desvio excede threshold (ex: custo >10% do orçado).', 'MÉDIO', C.yellow],
      ['📈', 'OKRs Integrados', 'Hoje: sem framework de OKR. Falta: definir objetivos → key results → vincular a tag01/tag02 → dashboard de progresso.', 'MÉDIO', C.yellow],
      ['🤝', 'Workflow de Aprovação Orçamentária', 'Hoje: orçado é carregado sem aprovação formal. Falta: fluxo de revisão/aprovação do orçamento antes de virar referência.', 'MÉDIO', C.yellow],
      ['📱', 'App Mobile / PWA', 'Hoje: apenas web desktop. Falta: versão mobile para consulta rápida de KPIs e aprovações em trânsito.', 'BAIXO', '3B82F6'],
    ];

    gaps.forEach((gap, i) => {
      const y = 1.5 + i * 0.6;
      s.addText(gap[0], { x: 0.3, y, w: 0.4, h: 0.5, fontSize: 14, align: 'center' });
      s.addText(gap[1], { x: 0.75, y, w: 2.5, h: 0.25, fontFace: 'Calibri', fontSize: 11, bold: true, color: C.dark });
      s.addText(gap[2], { x: 0.75, y: y + 0.22, w: 7.5, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: C.gray });
      s.addShape('roundedRect', { x: 8.7, y: y + 0.05, w: 0.9, h: 0.35, fill: { color: gap[4] }, rectRadius: 0.04 });
      s.addText(gap[3], { x: 8.7, y: y + 0.05, w: 0.9, h: 0.35, align: 'center', fontFace: 'Calibri', fontSize: 8, bold: true, color: C.white });
    });

    addFooter(s, 29, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 30: ROADMAP
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.white };
    addHeaderBar(s, 'ROADMAP DE EVOLUÇÃO');

    const phases = [
      { title: 'FASE 1\n(Atual)', period: 'Jan-Mar 2026', items: ['DRE Gerencial 3 cenários', 'Dashboard + CEO Dashboard', 'Aprovações + Justificativas', 'Forecast + IA Narrativa', 'Equipe Alpha (7 agentes)', 'PPT automático'], color: C.green, status: '✅ CONCLUÍDO' },
      { title: 'FASE 2\n(Q2 2026)', period: 'Abr-Jun 2026', items: ['Metas por centro de custo', 'Alertas proativos (email/push)', 'Indicadores não-financeiros', 'OKRs integrados', 'Workflow orçamento', 'App mobile (PWA)'], color: C.secondary, status: '🔜 PLANEJADO' },
      { title: 'FASE 3\n(S2 2026)', period: 'Jul-Dez 2026', items: ['Integração ERP (SAP/TOTVS)', 'BI avançado (cross-filters)', 'Planejamento de cenários LT', 'Machine Learning preditivo', 'Benchmark setorial externo', 'Gamificação de resultados'], color: C.primary, status: '📋 VISÃO' },
    ];

    phases.forEach((phase, i) => {
      const x = 0.2 + i * 3.3;
      s.addShape('roundedRect', { x, y: 1.1, w: 3.1, h: 4.0, fill: { color: C.lightGray }, line: { color: phase.color, width: 2 }, rectRadius: 0.1 });
      s.addShape('rect', { x, y: 1.1, w: 3.1, h: 0.8, fill: { color: phase.color }, rectRadius: 0 });
      s.addText(phase.title, { x, y: 1.1, w: 3.1, h: 0.55, align: 'center', fontFace: 'Calibri', fontSize: 13, bold: true, color: C.white, lineSpacingMultiple: 0.9 });
      s.addText(phase.period, { x, y: 1.6, w: 3.1, h: 0.25, align: 'center', fontFace: 'Calibri', fontSize: 9, color: C.white, transparency: 20 });

      phase.items.forEach((item, j) => {
        s.addText(`• ${item}`, { x: x + 0.2, y: 2.05 + j * 0.35, w: 2.7, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: C.dark });
      });

      s.addText(phase.status, { x, y: 4.65, w: 3.1, h: 0.35, align: 'center', fontFace: 'Calibri', fontSize: 10, bold: true, color: phase.color });
    });

    addFooter(s, 30, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 31: MENSAGEM CHAVE
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.primary };
    s.addShape('rect', { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: C.accent } });

    s.addText('"Cultura de Resultados não é\num projeto de tecnologia.\nÉ uma mudança de comportamento\nque a tecnologia viabiliza."', {
      x: 0.8, y: 0.8, w: 8.5, h: 2.5, fontFace: 'Calibri', fontSize: 26, color: C.white, italic: true, lineSpacingMultiple: 1.3
    });

    s.addShape('rect', { x: 0.8, y: 3.4, w: 3, h: 0.04, fill: { color: C.accent } });

    s.addText('O DRE RAIZ é a ferramenta.\nA cultura somos nós.', {
      x: 0.8, y: 3.6, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 18, color: C.accent, bold: true, lineSpacingMultiple: 1.3
    });

    s.addText('Cada número tem:\n✓ Uma origem rastreável\n✓ Uma classificação padronizada\n✓ Um responsável\n✓ Uma justificativa quando desvia\n✓ Uma projeção de futuro\n✓ Uma decisão informada', {
      x: 0.8, y: 4.3, w: 8, h: 1.2, fontFace: 'Calibri', fontSize: 11, color: C.white, transparency: 15, lineSpacingMultiple: 1.2
    });

    addFooter(s, 31, TOTAL_SLIDES);
    slides.push(s);
  })();

  // ─────────────────────────────────────────
  // SLIDE 32: ENCERRAMENTO
  // ─────────────────────────────────────────
  (() => {
    const s = pptx.addSlide();
    s.background = { color: C.dark };
    s.addShape('rect', { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: C.accent } });
    s.addShape('rect', { x: 0, y: 3.5, w: '100%', h: 2, fill: { color: C.primary }, transparency: 50 });

    s.addText('OBRIGADO', { x: 0.8, y: 1.0, w: 8, h: 1, fontFace: 'Calibri', fontSize: 48, bold: true, color: C.white });
    s.addText('Vamos construir juntos a\nCultura de Resultados da Raiz Educação', {
      x: 0.8, y: 2.0, w: 8, h: 0.8, fontFace: 'Calibri', fontSize: 18, color: C.accent, lineSpacingMultiple: 1.3
    });

    s.addShape('rect', { x: 0.8, y: 3.0, w: 2, h: 0.04, fill: { color: C.accent } });

    s.addText('Plataforma DRE RAIZ', { x: 0.8, y: 3.7, w: 4, h: 0.35, fontFace: 'Calibri', fontSize: 14, color: C.white, bold: true });
    s.addText('https://dre-raiz.vercel.app', { x: 0.8, y: 4.05, w: 4, h: 0.3, fontFace: 'Calibri', fontSize: 12, color: C.accent });
    s.addText('Raiz Educação S.A. — 2026', { x: 0.8, y: 4.5, w: 4, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: C.white, transparency: 40 });

    s.addText('Dúvidas?\nAcesse a plataforma e explore!\nCada tela tem ajuda contextual.', {
      x: 5.5, y: 3.7, w: 4, h: 1.2, fontFace: 'Calibri', fontSize: 12, color: C.white, transparency: 20, align: 'right', lineSpacingMultiple: 1.3
    });

    slides.push(s);
  })();

  return slides;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  console.log('🎯 Gerando apresentação: Cultura de Resultados...');

  const pptx = new pptxgen();
  pptx.author = 'Raiz Educação S.A.';
  pptx.company = 'Raiz Educação S.A.';
  pptx.title = 'Cultura de Resultados — Treinamento Institucional';
  pptx.subject = 'Treinamento sobre Cultura de Resultados usando a plataforma DRE RAIZ';
  pptx.layout = 'LAYOUT_16x9';

  const slides = buildSlides(pptx);

  const outputPath = 'Cultura_de_Resultados_Raiz_Educacao.pptx';
  await pptx.writeFile({ fileName: outputPath });

  console.log(`✅ Apresentação gerada com sucesso!`);
  console.log(`📁 Arquivo: ${outputPath}`);
  console.log(`📊 Total de slides: ${slides.length}`);
  console.log('');
  console.log('📸 IMPORTANTE: Adicione prints reais nas áreas marcadas com "📷 Print:"');
  console.log('   Slides que precisam de screenshots:');
  console.log('   • Slide 7: DRE Gerencial (modo Cenário)');
  console.log('   • Slide 8: DRE drill-down + TransactionsView');
  console.log('   • Slide 9: ManualChangesView + VarianceJustificationsView');
  console.log('   • Slide 11: DRE Cenário + ForecastingView');
  console.log('   • Slide 12: Cockpit Dashboard');
  console.log('   • Slide 13: CEO Dashboard (Portfolio + Simulação)');
  console.log('   • Slide 16: Sidebar completa');
  console.log('   • Slide 18: DRE Gerencial (tela cheia)');
  console.log('   • Slide 19: TransactionsView (tela cheia)');
  console.log('   • Slide 20: VarianceJustificationsView (2 prints)');
}

main().catch(console.error);
