/**
 * PROPOSTA DE NOVA APRESENTAÇÃO EXECUTIVA — DRE Raiz Educação
 *
 * Storytelling baseado em:
 * - Pirâmide McKinsey (BLUF: conclusão antes do dado)
 * - SCR Framework (Situação → Complicação → Resolução)
 * - Ghost Deck: cada título É a mensagem, não um rótulo
 * - Sequência: Visão Geral → Evidências → Marca Foco → Ação
 *
 * Dados: fictícios representativos para fins de proposta visual
 * Execução: node scripts/gerar_ppt_proposta.cjs
 */

const PptxGenJS = require('../node_modules/pptxgenjs');

// ─── PALETA ────────────────────────────────────────────────────────────────
const C = {
  navy:       '0F1C2E',
  navyMid:    '1A2E4A',
  navyLight:  '243B55',
  blue:       '1A6DB5',
  blueLight:  '2E8ECC',
  teal:       '0E7C7B',
  gold:       'D4A017',
  goldLight:  'F0C040',
  green:      '10B981',
  greenPale:  'D1FAE5',
  red:        'EF4444',
  redPale:    'FEE2E2',
  amber:      'F59E0B',
  amberPale:  'FEF3C7',
  gray50:     'F8FAFC',
  gray100:    'F1F5F9',
  gray200:    'E2E8F0',
  gray400:    '94A3B8',
  gray600:    '475569',
  gray800:    '1E293B',
  white:      'FFFFFF',
  // Marcas
  marcaA:     '1A6DB5',  // azul
  marcaB:     'EF4444',  // vermelho
  marcaC:     '10B981',  // verde
  marcaD:     '8B5CF6',  // roxo
  marcaE:     'F59E0B',  // âmbar
  rz:         '94A3B8',  // cinza (CSC)
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const W = 13.33, H = 7.5;

function headerBar(slide, title, subtitle, accentColor = C.blue) {
  // Barra superior escura
  slide.addShape('rect', { x: 0, y: 0, w: W, h: 1.1, fill: { color: C.navy }, line: { none: true } });
  // Barra de acento colorida
  slide.addShape('rect', { x: 0, y: 0, w: 0.22, h: 1.1, fill: { color: accentColor }, line: { none: true } });
  // Título
  slide.addText(title, {
    x: 0.38, y: 0.12, w: W - 2.5, h: 0.55,
    fontSize: 20, bold: true, color: C.white, fontFace: 'Calibri',
    valign: 'middle',
  });
  // Subtítulo / breadcrumb
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.38, y: 0.67, w: W - 2.5, h: 0.3,
      fontSize: 10, color: C.gray400, fontFace: 'Calibri', italic: true,
    });
  }
}

function footerBar(slide, pageNum, total) {
  slide.addShape('rect', { x: 0, y: H - 0.32, w: W, h: 0.32, fill: { color: C.navy }, line: { none: true } });
  slide.addText('Raiz Educação S.A.  |  DRE Gerencial  |  Confidencial', {
    x: 0.25, y: H - 0.30, w: W - 1.5, h: 0.26,
    fontSize: 7.5, color: C.gray400, fontFace: 'Calibri',
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: W - 1.0, y: H - 0.30, w: 0.75, h: 0.26,
    fontSize: 7.5, color: C.gray400, fontFace: 'Calibri', align: 'right',
  });
}

function badge(slide, text, x, y, w, h, bgColor, textColor = C.white, fontSize = 8.5) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.08, fill: { color: bgColor }, line: { none: true } });
  slide.addText(text, {
    x, y, w, h, fontSize, bold: true, color: textColor, fontFace: 'Calibri',
    align: 'center', valign: 'middle',
  });
}

function kpiCard(slide, x, y, w, h, label, value, delta, deltaLabel, status) {
  const borderColor = status === 'green' ? C.green : status === 'red' ? C.red : C.amber;
  const deltaColor  = status === 'green' ? C.green : status === 'red' ? C.red : C.amber;
  const arrow       = status === 'green' ? '▲' : status === 'red' ? '▼' : '▶';

  slide.addShape('rect', { x, y, w, h, fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
  slide.addShape('rect', { x, y, w, h: 0.04, fill: { color: borderColor }, line: { none: true } });

  slide.addText(label.toUpperCase(), {
    x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.22,
    fontSize: 7, bold: true, color: C.gray400, fontFace: 'Calibri', charSpacing: 0.5,
  });
  slide.addText(value, {
    x: x + 0.12, y: y + 0.3, w: w - 0.24, h: 0.52,
    fontSize: 22, bold: true, color: C.gray800, fontFace: 'Calibri',
  });
  slide.addText(`${arrow}  ${delta}  ${deltaLabel}`, {
    x: x + 0.12, y: y + 0.82, w: w - 0.24, h: 0.22,
    fontSize: 8.5, color: deltaColor, fontFace: 'Calibri', bold: true,
  });
}

function semaforoRow(slide, x, y, marca, ebitda, receita, margem, alunos, statusGeral) {
  const colors = { '🟢': C.green, '🟡': C.amber, '🔴': C.red, '🔷': C.blue };
  const fills  = { '🟢': C.greenPale, '🟡': C.amberPale, '🔴': C.redPale, '🔷': 'EFF6FF' };

  slide.addShape('rect', { x, y, w: 9.8, h: 0.44,
    fill: { color: fills[statusGeral] || C.gray100 }, line: { color: C.gray200, pt: 0.5 } });

  slide.addText(marca, { x: x + 0.15, y, w: 2.0, h: 0.44,
    fontSize: 10, bold: true, color: C.gray800, fontFace: 'Calibri', valign: 'middle' });

  const items = [ebitda, receita, margem, alunos];
  const cols  = [2.2, 3.9, 5.6, 7.3];
  items.forEach((val, i) => {
    const isNeg = String(val).includes('-') || String(val).includes('▼');
    slide.addText(val, { x: x + cols[i], y, w: 1.5, h: 0.44,
      fontSize: 9.5, bold: false, color: isNeg ? C.red : C.green,
      fontFace: 'Calibri', valign: 'middle', align: 'center' });
  });

  const dot = statusGeral === '🔷' ? '◆ CSC' : statusGeral;
  slide.addText(dot, { x: x + 9.0, y, w: 0.6, h: 0.44,
    fontSize: 13, fontFace: 'Calibri', valign: 'middle', align: 'center' });
}

function dreTableRow(slide, x, y, w, cols, isHeader = false, isCalc = false, isTotal = false) {
  const bg = isHeader ? C.navy : isCalc ? '1E3A5F' : isTotal ? C.navyLight : (y % 0.85 < 0.43 ? C.gray50 : C.white);
  const fg = isHeader || isCalc || isTotal ? C.white : C.gray800;
  const fs = isHeader ? 8 : isCalc ? 9.5 : isTotal ? 9.5 : 9;
  const bld = isHeader || isCalc || isTotal;

  slide.addShape('rect', { x, y, w, h: 0.34, fill: { color: bg }, line: { color: C.gray200, pt: 0.3 } });
  const widths = [3.2, 1.5, 1.5, 1.2, 1.5, 1.2];
  let cx = x + 0.1;
  cols.forEach((txt, i) => {
    const align = i === 0 ? 'left' : 'right';
    const color = (!isHeader && !isCalc && !isTotal && i > 0)
      ? (String(txt).includes('-') || String(txt).startsWith('(') ? C.red : (String(txt).includes('+') || String(txt).startsWith('▲') ? C.green : fg))
      : fg;
    slide.addText(String(txt), { x: cx, y: y + 0.04, w: widths[i] - 0.1, h: 0.26,
      fontSize: fs, bold: bld, color, fontFace: 'Calibri', align, valign: 'middle' });
    cx += widths[i];
  });
}

function waterfallBar(slide, x, y, barW, baseY, value, scaleH, color, label, valLabel) {
  const barH = Math.abs(value) * scaleH;
  const barY = value >= 0 ? baseY - barH : baseY;
  slide.addShape('rect', { x, y: barY, w: barW, h: barH,
    fill: { color }, line: { color: C.white, pt: 0.5 } });
  // Label embaixo
  slide.addText(label, { x: x - 0.1, y: baseY + 0.06, w: barW + 0.2, h: 0.22,
    fontSize: 7.5, color: C.gray600, fontFace: 'Calibri', align: 'center', bold: true });
  // Valor em cima/baixo
  const valY = value >= 0 ? barY - 0.26 : barY + barH + 0.04;
  slide.addText(valLabel, { x: x - 0.1, y: valY, w: barW + 0.2, h: 0.22,
    fontSize: 8, color: color === C.gray400 ? C.gray600 : color,
    fontFace: 'Calibri', align: 'center', bold: true });
}

// ─── GERAR PPT ───────────────────────────────────────────────────────────────
async function gerarProposta() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_CUSTOM', width: W, height: H });
  pptx.layout  = 'LAYOUT_CUSTOM';

  const TOTAL_SLIDES = 11;
  let n = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 1 — CAPA
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    // Fundo gradiente simulado
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { none: true } });
    slide.addShape('rect', { x: 0, y: 0, w: 0.55, h: H, fill: { color: C.blue }, line: { none: true } });
    slide.addShape('rect', { x: W * 0.45, y: 0, w: W * 0.55, h: H,
      fill: { color: C.navyMid }, line: { none: true } });

    // Logo / marca
    slide.addText('RAIZ', {
      x: 0.9, y: 1.6, w: 5, h: 1.2,
      fontSize: 60, bold: true, color: C.white, fontFace: 'Calibri',
    });
    slide.addText('EDUCAÇÃO', {
      x: 0.9, y: 2.7, w: 5, h: 0.6,
      fontSize: 26, bold: false, color: C.blueLight, fontFace: 'Calibri', charSpacing: 8,
    });

    // Linha separadora
    slide.addShape('rect', { x: 0.9, y: 3.5, w: 5.5, h: 0.04, fill: { color: C.blue }, line: { none: true } });

    slide.addText('DRE GERENCIAL — FEVEREIRO 2026', {
      x: 0.9, y: 3.7, w: 8, h: 0.5,
      fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri',
    });
    slide.addText('Análise Executiva de Resultados  |  Consolidado + 5 Marcas', {
      x: 0.9, y: 4.25, w: 8, h: 0.38,
      fontSize: 12, color: C.gray400, fontFace: 'Calibri', italic: true,
    });

    // Badges
    badge(slide, 'CONSOLIDADO', 0.9, 5.1, 1.5, 0.35, C.blue);
    badge(slide, '5 MARCAS', 2.5, 5.1, 1.2, 0.35, C.teal);
    badge(slide, 'FEV / 2026', 3.85, 5.1, 1.1, 0.35, C.gold, C.navy);

    // Detalhe geométrico decorativo
    slide.addShape('rect', { x: W * 0.62, y: 1.5, w: 4.2, h: 3.8,
      fill: { color: C.navyLight }, line: { color: C.blue, pt: 1 } });
    slide.addText('PROPOSTA\nDE\nESTRUTURA', {
      x: W * 0.63, y: 1.9, w: 4.0, h: 3.0,
      fontSize: 28, bold: true, color: '1A3A5C', fontFace: 'Calibri',
      align: 'center', valign: 'middle',
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 2 — MENSAGEM EXECUTIVA (BLUF)
  // "EBITDA -32% vs orçado: custo, não receita, é o problema — 3 decisões hoje"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'EBITDA -32% vs orçado: custo fixo é o problema central — 3 decisões necessárias hoje',
      'Mensagem Executiva  |  SCR: Situação → Complicação → Resolução',
      C.red
    );

    // ── SITUAÇÃO
    slide.addShape('rect', { x: 0.35, y: 1.3, w: 3.9, h: 2.5,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addShape('rect', { x: 0.35, y: 1.3, w: 3.9, h: 0.05, fill: { color: C.blue }, line: { none: true } });
    slide.addText('SITUAÇÃO', {
      x: 0.5, y: 1.38, w: 3.6, h: 0.3,
      fontSize: 8, bold: true, color: C.blue, fontFace: 'Calibri', charSpacing: 1.5,
    });
    slide.addText(
      'Raiz opera 5 marcas com meta de EBITDA consolidado de R$2,8M/mês. ' +
      'Fevereiro é historicamente o mês mais fraco do calendário escolar — ' +
      'menor receita recorrente, início de semestre.',
      { x: 0.5, y: 1.72, w: 3.65, h: 1.9, fontSize: 10.5, color: C.gray600,
        fontFace: 'Calibri', valign: 'top' }
    );

    // ── COMPLICAÇÃO
    slide.addShape('rect', { x: 4.5, y: 1.3, w: 3.9, h: 2.5,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addShape('rect', { x: 4.5, y: 1.3, w: 3.9, h: 0.05, fill: { color: C.red }, line: { none: true } });
    slide.addText('COMPLICAÇÃO', {
      x: 4.65, y: 1.38, w: 3.6, h: 0.3,
      fontSize: 8, bold: true, color: C.red, fontFace: 'Calibri', charSpacing: 1.5,
    });
    slide.addText(
      'EBITDA de fevereiro: R$1,9M — R$900k abaixo do orçado (-32%). ' +
      'O desvio NÃO é sazonal: receita ficou +2% vs orçado. ' +
      'Custo fixo superou o plano em 18%, concentrado em folha (+R$280k) ' +
      'e facilities (+R$180k) de 3 filiais específicas.',
      { x: 4.65, y: 1.72, w: 3.65, h: 1.9, fontSize: 10.5, color: C.gray600,
        fontFace: 'Calibri', valign: 'top' }
    );

    // ── RESOLUÇÃO
    slide.addShape('rect', { x: 8.65, y: 1.3, w: 4.33, h: 2.5,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addShape('rect', { x: 8.65, y: 1.3, w: 4.33, h: 0.05, fill: { color: C.green }, line: { none: true } });
    slide.addText('RESOLUÇÃO', {
      x: 8.8, y: 1.38, w: 4.0, h: 0.3,
      fontSize: 8, bold: true, color: C.green, fontFace: 'Calibri', charSpacing: 1.5,
    });
    [
      { i: 1, txt: 'Congelar contratações em SP2 e RJ3 até atingir 320 alunos consolidados' },
      { i: 2, txt: 'Renegociar contrato de facilities SP2 — reajuste não previsto no orçamento' },
      { i: 3, txt: 'Revisar meta de matrículas RJ3 para março: 35 novas ou reduzir estrutura' },
    ].forEach((item, idx) => {
      badge(slide, String(item.i), 8.8, 1.78 + idx * 0.62, 0.28, 0.28, C.green);
      slide.addText(item.txt, {
        x: 9.18, y: 1.78 + idx * 0.62, w: 3.65, h: 0.28,
        fontSize: 9.5, color: C.gray700, fontFace: 'Calibri', valign: 'middle',
      });
    });
    slide.addText('→ Impacto estimado: R$600k de EBITDA recuperável em Q2', {
      x: 8.8, y: 3.45, w: 4.0, h: 0.28,
      fontSize: 9, color: C.green, fontFace: 'Calibri', bold: true,
    });

    // ── KPIs resumo
    kpiCard(slide, 0.35, 4.0, 2.8, 1.2, 'EBITDA Real',     'R$ 1,9M',  '-R$900k', 'vs Orçado',  'red');
    kpiCard(slide, 3.4,  4.0, 2.8, 1.2, 'Receita Líquida', 'R$ 8,2M',  '+2%',     'vs Orçado',  'green');
    kpiCard(slide, 6.45, 4.0, 2.8, 1.2, 'Margem EBITDA',   '18%',      '-6pp',    'vs Orçado',  'red');
    kpiCard(slide, 9.5,  4.0, 3.48, 1.2, 'Alunos Ativos',  '4.820',   '-1%',     'vs Fev/2025','amber');

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 3 — SEMÁFORO DO PORTFÓLIO
  // "Portfolio dividido: 3 marcas entregam, 2 drenam resultado consolidado"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Portfolio dividido: 3 marcas entregam, Marca B drena resultado — intervenção necessária',
      'Visão de Portfolio  |  Semáforo de Saúde por Marca',
      C.gold
    );

    // Colunas header
    const hdrY = 1.3;
    slide.addShape('rect', { x: 1.5, y: hdrY, w: 9.8, h: 0.36,
      fill: { color: C.navy }, line: { none: true } });
    ['MARCA / UNIDADE', 'EBITDA Real', 'Receita vs Orc', 'Margem %', 'Alunos vs A-1', 'STATUS'].forEach((h, i) => {
      const xs = [0.1, 1.65, 3.35, 5.05, 6.75, 8.45];
      slide.addText(h, { x: 1.5 + xs[i], y: hdrY + 0.06, w: 1.7, h: 0.24,
        fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', align: i === 0 ? 'left' : 'center' });
    });

    const marcas = [
      { nome: 'Marca C  (Premium)',    ebitda: 'R$820k', rec: '+5% ▲', marg: '28%', alunos: '+8% ▲', st: '🟢' },
      { nome: 'Marca A  (Expansão)',   ebitda: 'R$680k', rec: '+2% ▲', marg: '22%', alunos: '+3% ▲', st: '🟢' },
      { nome: 'Marca D  (Regional)',   ebitda: 'R$420k', rec: '+1% ▲', marg: '18%', alunos:  '0% →', st: '🟢' },
      { nome: 'Marca E  (Crescimento)',ebitda: 'R$150k', rec: '+3% ▲', marg:  '8%', alunos: '-2% ▼', st: '🟡' },
      { nome: 'Marca B  (Atenção)',    ebitda: '-R$170k',rec: '-1% ▼', marg: '-4%', alunos:'-12% ▼', st: '🔴' },
      { nome: 'RZ  (CSC / Rateio)',    ebitda:   '—',    rec:    '—',  marg:   '—', alunos:    '—',  st: '🔷' },
    ];
    marcas.forEach((m, i) => {
      semaforoRow(slide, 1.5, hdrY + 0.36 + i * 0.46, m.nome, m.ebitda, m.rec, m.marg, m.alunos, m.st);
    });

    // Legenda
    slide.addText('Legenda:', { x: 1.5, y: 4.5, w: 1.0, h: 0.28, fontSize: 8.5, bold: true, color: C.gray600, fontFace: 'Calibri' });
    [['🟢 Dentro do plano (desvio ≤5%)', C.green], ['🟡 Atenção (5-15%)', C.amber], ['🔴 Ação imediata (>15%)', C.red], ['🔷 CSC / sem meta de margem', C.blue]]
      .forEach(([txt, col], i) => {
        slide.addText(txt, { x: 2.7 + i * 2.6, y: 4.5, w: 2.5, h: 0.28,
          fontSize: 8.5, color: col, fontFace: 'Calibri', bold: i === 2 });
      });

    // Insight box
    slide.addShape('rect', { x: 1.5, y: 4.95, w: 11.3, h: 1.25,
      fill: { color: C.redPale }, line: { color: C.red, pt: 1 } });
    slide.addText('⚠  ALERTA EXECUTIVO', {
      x: 1.7, y: 5.05, w: 4, h: 0.3, fontSize: 9, bold: true, color: C.red, fontFace: 'Calibri',
    });
    slide.addText(
      'Marca B apresenta EBITDA negativo pelo 3º mês consecutivo. Padrão diferente de jan-fev/2025 (desvio era -R$40k). ' +
      'Volume de alunos caiu 12% vs A-1 enquanto custo fixo permanece alto — estrutura incompatível com volume atual. ' +
      'Ver análise detalhada no Slide 8.',
      { x: 1.7, y: 5.35, w: 10.9, h: 0.78, fontSize: 9.5, color: C.gray800, fontFace: 'Calibri' }
    );

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 4 — DRE CONSOLIDADO (tabela fonte da verdade)
  // "DRE Consolidado: receita saudável, custo fixo fora do plano — margem caiu 6pp"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'DRE Consolidado: receita saudável (+2%), custo fixo fora do plano (+18%) — margem caiu de 24% para 18%',
      'Demonstração de Resultado  |  Consolidado Holding  |  Fevereiro 2026',
      C.blue
    );

    // Badges de contexto
    badge(slide, 'R$ em Milhares', 10.5, 1.2, 1.6, 0.3, C.gray200, C.gray600, 8);
    badge(slide, '5 Marcas + CSC', 8.75, 1.2, 1.6, 0.3, C.navyMid, C.white, 8);

    const tX = 0.35, tY = 1.65, tW = 12.6;
    dreTableRow(slide, tX, tY, tW,
      ['DESCRIÇÃO', 'REAL (R$)', 'ORÇADO (R$)', 'Δ vs Orc', 'A-1 (R$)', 'Δ vs A-1'],
      true);

    const rows = [
      { cols: ['01.  RECEITA LÍQUIDA', '8.200', '8.040', '+2,0%', '7.850', '+4,5%'], isCalc: false, isTotal: true  },
      { cols: ['  01.01  Receita Educação', '7.680', '7.520', '+2,1%', '7.300', '+5,2%'], isCalc: false, isTotal: false },
      { cols: ['  01.02  Outras Receitas', '520', '520', '0,0%', '550', '-5,5%'], isCalc: false, isTotal: false },
      { cols: ['02.  CUSTOS VARIÁVEIS', '-3.120', '-3.060', '-2,0%', '-2.980', '-4,7%'], isCalc: false, isTotal: true },
      { cols: ['  02.01  Pessoal Pedagógico', '-2.460', '-2.400', '-2,5%', '-2.340', '-5,1%'], isCalc: false, isTotal: false },
      { cols: ['  02.02  Material Didático', '-660', '-660', '0,0%', '-640', '-3,1%'], isCalc: false, isTotal: false },
      { cols: ['MARGEM DE CONTRIBUIÇÃO', '5.080', '4.980', '+2,0%', '4.870', '+4,3%'], isCalc: true,  isTotal: false },
      { cols: ['03.  CUSTOS FIXOS', '-2.140', '-1.820', '-17,6%', '-1.690', '-26,6%'], isCalc: false, isTotal: true },
      { cols: ['  03.01  Folha Adm / Operacional', '-1.380', '-1.100', '-25,5%', '-1.060', '-30,2%'], isCalc: false, isTotal: false },
      { cols: ['  03.02  Facilities / Aluguel', '-490', '-460', '-6,5%', '-430', '-14,0%'], isCalc: false, isTotal: false },
      { cols: ['  03.03  TI e Infraestrutura', '-270', '-260', '-3,8%', '-200', '-35,0%'], isCalc: false, isTotal: false },
      { cols: ['04.  SG&A', '-440', '-420', '-4,8%', '-390', '-12,8%'], isCalc: false, isTotal: true },
      { cols: ['06.  RATEIO RAIZ (CSC)', '-600', '-580', '-3,4%', '-560', '-7,1%'], isCalc: false, isTotal: true },
      { cols: ['EBITDA CONSOLIDADO', '1.900', '2.800', '-32,1%', '2.230', '-14,8%'], isCalc: true,  isTotal: false },
    ];

    rows.forEach((row, i) => {
      dreTableRow(slide, tX, tY + 0.34 + i * 0.34, tW, row.cols, false, row.isCalc, row.isTotal);
    });

    // Margem % highlight
    slide.addShape('rect', { x: 0.35, y: tY + 0.34 * 15, w: 12.6, h: 0.36,
      fill: { color: C.navyMid }, line: { none: true } });
    slide.addText('Margem EBITDA %', { x: 0.5, y: tY + 0.34 * 15 + 0.06, w: 3.1, h: 0.24,
      fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri' });
    [['18,0%', ''], ['24,0%', ''], ['-6,0 pp', ''], ['22,3%', ''], ['-4,3 pp', '']].forEach((v, i) => {
      const xs = [3.4, 4.9, 6.3, 7.85, 9.25];
      slide.addText(v[0], { x: xs[i], y: tY + 0.34 * 15 + 0.06, w: 1.4, h: 0.24,
        fontSize: 9, bold: true, color: v[0].includes('-') ? C.red : C.goldLight,
        fontFace: 'Calibri', align: 'right' });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 5 — WATERFALL EBITDA (bridge orçado → real)
  // "Folha de pagamento responde por 55% do desvio de EBITDA — concentrada em SP2 e RJ3"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Folha de pagamento responde por 55% do desvio de EBITDA — concentrada em 3 filiais (SP2, RJ3, MG4)',
      'EBITDA Bridge  |  Orçado → Real  |  Fevereiro 2026',
      C.red
    );

    // Eixo e área
    const chartX = 0.8, chartY = 1.35, chartW = 11.6, chartH = 4.5;
    const baseY = chartY + chartH - 0.5;
    const scaleH = 0.0014;
    const barW   = 1.0;

    slide.addShape('rect', { x: chartX, y: chartY, w: chartW, h: chartH,
      fill: { color: C.white }, line: { color: C.gray200, pt: 0.5 } });

    // Linha de zero
    slide.addShape('rect', { x: chartX, y: baseY, w: chartW, h: 0.02,
      fill: { color: C.gray400 }, line: { none: true } });

    // Linha de eixo Y labels
    [0, 500, 1000, 1500, 2000, 2500].forEach(v => {
      const ly = baseY - v * scaleH;
      slide.addShape('rect', { x: chartX, y: ly, w: chartW, h: 0.005, fill: { color: C.gray200 }, line: { none: true } });
      slide.addText(`${v}`, { x: chartX - 0.6, y: ly - 0.12, w: 0.55, h: 0.24,
        fontSize: 7.5, color: C.gray400, fontFace: 'Calibri', align: 'right' });
    });

    // Barras waterfall
    const bars = [
      { label: 'Orçado',   val: 2800, color: C.gray400,  valLabel: 'R$2.800' },
      { label: 'Receita',  val:   164, color: C.green,    valLabel: '+R$164'  },
      { label: 'Custo Var',val:   -60, color: C.red,      valLabel: '-R$60'   },
      { label: 'Folha',    val:  -280, color: C.red,      valLabel: '-R$280'  },
      { label: 'Facilities',val: -180, color: C.red,      valLabel: '-R$180'  },
      { label: 'TI/Outros',val:  -100, color: C.amber,    valLabel: '-R$100'  },
      { label: 'Rateio',   val:  -144, color: C.amber,    valLabel: '-R$144'  },
      { label: 'REAL',     val: 1900,  color: C.navyMid,  valLabel: 'R$1.900' },
    ];

    // Calcular posições cumulativas para waterfall
    let cum = 0;
    bars.forEach((bar, i) => {
      const bx = chartX + 0.5 + i * 1.38;
      if (i === 0 || i === bars.length - 1) {
        // Barra total (sólida da base)
        const bH = bar.val * scaleH;
        slide.addShape('rect', { x: bx, y: baseY - bH, w: barW, h: bH,
          fill: { color: bar.color }, line: { color: C.white, pt: 0.5 } });
        slide.addText(bar.label, { x: bx - 0.1, y: baseY + 0.06, w: barW + 0.2, h: 0.22,
          fontSize: 7.5, color: C.gray600, fontFace: 'Calibri', align: 'center', bold: true });
        slide.addText(bar.valLabel, { x: bx - 0.1, y: baseY - bH - 0.26, w: barW + 0.2, h: 0.22,
          fontSize: 8.5, color: i === bars.length - 1 ? C.navyMid : C.gray600,
          fontFace: 'Calibri', align: 'center', bold: true });
        if (i === 0) cum = bar.val;
      } else {
        const barStart = cum;
        cum += bar.val;
        const bH = Math.abs(bar.val) * scaleH;
        const bY = bar.val >= 0 ? baseY - (barStart + bar.val) * scaleH : baseY - barStart * scaleH;
        slide.addShape('rect', { x: bx, y: bY, w: barW, h: bH,
          fill: { color: bar.color }, line: { color: C.white, pt: 0.5 } });
        slide.addText(bar.label, { x: bx - 0.1, y: baseY + 0.06, w: barW + 0.2, h: 0.22,
          fontSize: 7.5, color: C.gray600, fontFace: 'Calibri', align: 'center', bold: true });
        const valY = bar.val >= 0 ? bY - 0.26 : bY + bH + 0.04;
        slide.addText(bar.valLabel, { x: bx - 0.1, y: valY, w: barW + 0.2, h: 0.22,
          fontSize: 8, color: bar.color === C.red ? C.red : bar.color === C.green ? C.green : C.amber,
          fontFace: 'Calibri', align: 'center', bold: true });
      }
    });

    // Callout no bar "Folha"
    slide.addShape('rect', { x: 5.0, y: 1.5, w: 3.5, h: 0.65,
      fill: { color: C.redPale }, line: { color: C.red, pt: 1 } });
    slide.addText('55% do desvio total\nConcentrado em SP2 (+R$160k) e RJ3 (+R$120k)', {
      x: 5.1, y: 1.55, w: 3.3, h: 0.55,
      fontSize: 8.5, color: C.red, fontFace: 'Calibri', valign: 'middle',
    });

    // Legenda
    [['■ Favorável vs Orçado', C.green], ['■ Desfavorável vs Orçado', C.red], ['■ Impacto parcial', C.amber], ['■ Total', C.gray400]]
      .forEach(([txt, col], i) => {
        slide.addText(txt, { x: 0.8 + i * 3.0, y: H - 0.55, w: 2.8, h: 0.22,
          fontSize: 8, color: col, fontFace: 'Calibri', bold: true });
      });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 6 — RECEITA: análise volume × ticket × mix
  // "Receita em linha com o orçado, mas volume de alunos cai em Marca B — risco de retenção"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Receita em linha com o orçado (+2%), mas mix piora: ticket sobe, volume cai — risco de retenção',
      'Análise de Receita  |  Decomposição Volume × Ticket × Mix por Marca',
      C.blue
    );

    // ── DECOMPOSIÇÃO RECEITA (esquerda)
    slide.addShape('rect', { x: 0.35, y: 1.3, w: 4.8, h: 4.8,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('DECOMPOSIÇÃO DA RECEITA', {
      x: 0.5, y: 1.4, w: 4.5, h: 0.28,
      fontSize: 8.5, bold: true, color: C.blue, fontFace: 'Calibri', charSpacing: 1,
    });

    const decompRows = [
      ['Volume de Alunos',    '-3%',   '-3%',    'red'],
      ['Ticket Médio',        '+5%',   '+5%',    'green'],
      ['Receita Bruta',       '+2%',   '+2%',    'green'],
      ['Deduções / Bolsas',   '-1%',   '-1%',    'green'],
      ['RECEITA LÍQUIDA',     '+2%',   '+2%',    'green'],
    ];
    slide.addShape('rect', { x: 0.5, y: 1.72, w: 4.5, h: 0.3, fill: { color: C.navy }, line: { none: true } });
    ['COMPONENTE', 'VS ORÇADO', 'VS A-1'].forEach((h, i) => {
      slide.addText(h, { x: [0.55, 2.7, 3.85][i], y: 1.72, w: [2.1, 1.1, 1.1][i], h: 0.3,
        fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle' });
    });
    decompRows.forEach((row, i) => {
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      const isTot = i === decompRows.length - 1;
      slide.addShape('rect', { x: 0.5, y: 2.02 + i * 0.38, w: 4.5, h: 0.38,
        fill: { color: isTot ? C.navyMid : bg }, line: { color: C.gray200, pt: 0.3 } });
      slide.addText(row[0], { x: 0.6, y: 2.02 + i * 0.38, w: 2.1, h: 0.38,
        fontSize: 9.5, bold: isTot, color: isTot ? C.white : C.gray800, fontFace: 'Calibri', valign: 'middle' });
      [row[1], row[2]].forEach((v, j) => {
        const col = isTot ? C.goldLight : (v.includes('-') ? C.red : C.green);
        slide.addText(v, { x: [2.7, 3.85][j], y: 2.02 + i * 0.38, w: 1.1, h: 0.38,
          fontSize: 9.5, bold: isTot, color: col, fontFace: 'Calibri', valign: 'middle', align: 'center' });
      });
    });

    // Insight receita
    slide.addShape('rect', { x: 0.5, y: 3.95, w: 4.5, h: 1.0,
      fill: { color: C.amberPale }, line: { color: C.amber, pt: 1 } });
    slide.addText('⚠  ATENÇÃO: Volume vs Ticket', {
      x: 0.65, y: 4.05, w: 4.2, h: 0.26, fontSize: 8.5, bold: true, color: C.amber, fontFace: 'Calibri',
    });
    slide.addText('Ticket médio sobe por mix (marcas premium têm mais peso), mas volume total de alunos cai -3%. Indica possível evasão ou dificuldade de conversão de novos alunos — monitorar março.',
      { x: 0.65, y: 4.32, w: 4.2, h: 0.56, fontSize: 8.5, color: C.gray700, fontFace: 'Calibri' });

    // ── RECEITA POR MARCA (direita) — barras horizontais
    slide.addShape('rect', { x: 5.5, y: 1.3, w: 7.48, h: 4.8,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('RECEITA POR MARCA — Variação vs Orçado', {
      x: 5.65, y: 1.4, w: 7.0, h: 0.28,
      fontSize: 8.5, bold: true, color: C.blue, fontFace: 'Calibri', charSpacing: 1,
    });

    const marcaRec = [
      { nome: 'Marca C', val: 5, receita: 'R$2,4M', color: C.green },
      { nome: 'Marca E', val: 3, receita: 'R$0,9M', color: C.green },
      { nome: 'Marca A', val: 2, receita: 'R$2,6M', color: C.green },
      { nome: 'Marca D', val: 1, receita: 'R$1,7M', color: C.green },
      { nome: 'Marca B', val: -1, receita: 'R$0,6M', color: C.red   },
    ];

    const barBaseX = 8.2;
    slide.addShape('rect', { x: barBaseX, y: 1.75, w: 0.02, h: 4.1,
      fill: { color: C.gray400 }, line: { none: true } });
    slide.addText('0%', { x: barBaseX - 0.2, y: 1.65, w: 0.4, h: 0.24,
      fontSize: 7, color: C.gray400, fontFace: 'Calibri', align: 'center' });

    marcaRec.forEach((m, i) => {
      const by = 2.0 + i * 0.7;
      const bw = Math.abs(m.val) * 0.2;
      const bx = m.val >= 0 ? barBaseX : barBaseX - bw;
      slide.addText(m.nome, { x: 5.65, y: by + 0.12, w: 2.4, h: 0.32,
        fontSize: 10, color: C.gray800, fontFace: 'Calibri', bold: true });
      slide.addShape('rect', { x: bx, y: by + 0.1, w: bw, h: 0.32,
        fill: { color: m.color }, line: { none: true } });
      slide.addText(`${m.val > 0 ? '+' : ''}${m.val}%  ${m.receita}`, {
        x: m.val >= 0 ? barBaseX + bw + 0.1 : barBaseX - bw - 1.4,
        y: by + 0.1, w: 1.4, h: 0.32, fontSize: 9, color: m.color, fontFace: 'Calibri', bold: true,
      });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 7 — CUSTO FIXO: análise vertical + por alavanca
  // "Custo fixo cresceu desacoplado da receita — custo/aluno sobe 16%, estrutura não escala"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Custo fixo 18% acima do orçado: folha e facilities concentram 78% do desvio de R$460k',
      'Análise de Custos  |  Custo Fixo e Análise Vertical  |  Fevereiro 2026',
      C.red
    );

    // ── Tabela custo fixo
    const tX = 0.35, tY = 1.3, tW = 6.2;
    slide.addShape('rect', { x: tX, y: tY, w: tW, h: 0.32,
      fill: { color: C.navy }, line: { none: true } });
    ['CUSTO FIXO', 'REAL', 'ORÇADO', 'DESVIO', '% RECEITA'].forEach((h, i) => {
      const xs = [0.1, 1.8, 2.85, 3.9, 5.05];
      const ws = [1.65, 0.95, 0.95, 0.95, 1.0];
      slide.addText(h, { x: tX + xs[i], y: tY + 0.04, w: ws[i], h: 0.24,
        fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', align: i === 0 ? 'left' : 'center' });
    });
    const custos = [
      ['Folha Adm/Operacional', '1.380', '1.100', '-R$280k ❌', '16,8%'],
      ['Facilities / Aluguel',  '490',   '460',   '-R$30k ⚠',  '6,0%'],
      ['TI e Infraestrutura',   '270',   '260',   '-R$10k ⚠',  '3,3%'],
      ['Outros Fixos',          '120',   '120',   'em linha ✓', '1,5%'],
    ];
    custos.forEach((row, i) => {
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      slide.addShape('rect', { x: tX, y: tY + 0.32 + i * 0.38, w: tW, h: 0.38,
        fill: { color: bg }, line: { color: C.gray200, pt: 0.3 } });
      const xs = [0.1, 1.8, 2.85, 3.9, 5.05], ws = [1.65, 0.95, 0.95, 0.95, 1.0];
      row.forEach((v, j) => {
        const col = j >= 3 && v.includes('❌') ? C.red
                  : j >= 3 && v.includes('⚠') ? C.amber
                  : j >= 3 && v.includes('✓') ? C.green : C.gray800;
        slide.addText(v, { x: tX + xs[j], y: tY + 0.32 + i * 0.38 + 0.06, w: ws[j], h: 0.26,
          fontSize: 9, color: col, fontFace: 'Calibri', align: j === 0 ? 'left' : 'center', bold: col !== C.gray800 });
      });
    });
    // Total
    slide.addShape('rect', { x: tX, y: tY + 0.32 + 4 * 0.38, w: tW, h: 0.38,
      fill: { color: C.navyMid }, line: { none: true } });
    [['TOTAL CUSTO FIXO', '2.260', '1.940', '-R$320k', '27,6%']].forEach(row => {
      const xs = [0.1, 1.8, 2.85, 3.9, 5.05], ws = [1.65, 0.95, 0.95, 0.95, 1.0];
      row.forEach((v, j) => {
        slide.addText(v, { x: tX + xs[j], y: tY + 0.32 + 4 * 0.38 + 0.06, w: ws[j], h: 0.26,
          fontSize: 9.5, bold: true, color: j === 3 ? C.red : C.white, fontFace: 'Calibri',
          align: j === 0 ? 'left' : 'center' });
      });
    });

    // Análise vertical
    slide.addShape('rect', { x: tX, y: tY + 0.32 + 5.3 * 0.38, w: tW, h: 0.38,
      fill: { color: C.gray100 }, line: { color: C.gray200, pt: 0.5 } });
    slide.addText('Custo Fixo como % da Receita: 27,6% Real vs 24,1% Orçado → +3,5pp', {
      x: tX + 0.1, y: tY + 0.32 + 5.3 * 0.38 + 0.06, w: tW - 0.2, h: 0.26,
      fontSize: 8.5, color: C.red, fontFace: 'Calibri', bold: true,
    });

    // ── Análise vertical visual (direita)
    slide.addShape('rect', { x: 6.9, y: 1.3, w: 6.08, h: 5.8,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('ANÁLISE DE ALAVANCAS E CONTEXTO', {
      x: 7.05, y: 1.4, w: 5.8, h: 0.28,
      fontSize: 8.5, bold: true, color: C.red, fontFace: 'Calibri', charSpacing: 1,
    });

    const alavancas = [
      {
        titulo: '💰  Folha: +R$280k  (63% do desvio)',
        cor: C.red,
        txt: '3 contratações antecipadas para expansão RJ3 (2 coord. pedagógicos) e SP2 (1 supervisor). ' +
             'Decisão tomada em jan/26 como aposta no crescimento de Q2. ' +
             'Break-even: 40 novas matrículas em RJ3 (atual: 285, meta: 325 em mar).',
      },
      {
        titulo: '🏢  Facilities: +R$30k  (7% do desvio)',
        cor: C.amber,
        txt: 'Contrato de aluguel SP2 renovou com reajuste de IGPM (+6,7%) não previsto no orçamento anual. ' +
             'CFO e COO a negociar renegociação retroativa — deadline: 15/março.',
      },
      {
        titulo: '💡  TI: +R$10k  (2% do desvio)',
        cor: C.amber,
        txt: 'Setup de infraestrutura para nova turma RJ3. Custo único — não recorrente.',
      },
    ];

    alavancas.forEach((al, i) => {
      slide.addShape('rect', { x: 7.05, y: 1.8 + i * 1.72, w: 5.7, h: 1.55,
        fill: { color: C.gray50 }, line: { color: al.cor, pt: 1 } });
      slide.addText(al.titulo, { x: 7.2, y: 1.88 + i * 1.72, w: 5.4, h: 0.3,
        fontSize: 9.5, bold: true, color: al.cor, fontFace: 'Calibri' });
      slide.addText(al.txt, { x: 7.2, y: 2.2 + i * 1.72, w: 5.4, h: 1.0,
        fontSize: 9, color: C.gray700, fontFace: 'Calibri' });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 8 — MARCA B: deep dive
  // "Marca B: 3° mês consecutivo com EBITDA negativo — custo fixo incompatível com volume"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Marca B: 3° mês consecutivo com EBITDA negativo — custo fixo incompatível com volume atual',
      'Deep Dive  |  Marca B  |  Decisão estrutural necessária',
      C.red
    );

    badge(slide, '⚠ ATENÇÃO', W - 1.9, 0.22, 1.5, 0.35, C.red);

    // DRE sintética Marca B
    slide.addShape('rect', { x: 0.35, y: 1.3, w: 4.9, h: 4.6,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('DRE SINTÉTICA — MARCA B', {
      x: 0.5, y: 1.38, w: 4.6, h: 0.28,
      fontSize: 8.5, bold: true, color: C.red, fontFace: 'Calibri', charSpacing: 1,
    });
    slide.addShape('rect', { x: 0.5, y: 1.7, w: 4.6, h: 0.3,
      fill: { color: C.navy }, line: { none: true } });
    ['LINHA', 'REAL', 'ORC', 'Δ'].forEach((h, i) => {
      slide.addText(h, { x: [0.55, 2.5, 3.4, 4.3][i], y: 1.7, w: [1.9, 0.85, 0.85, 0.75][i], h: 0.3,
        fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle' });
    });
    const bRows = [
      ['Receita Líquida', '620', '625', '-1%',  false, false],
      ['Custos Variáveis','-290','-280','-4%',   false, false],
      ['Margem Contr.',   '330', '345', '-4%',   true,  false],
      ['Custo Fixo',      '-460','-310','-48%',  false, false],
      ['SG&A + Rateio',   '-40', '-35', '-14%',  false, false],
      ['EBITDA',          '-170','  0', '-170',  true,  true],
    ];
    bRows.forEach((row, i) => {
      const bg  = row[4] ? C.navyMid : i % 2 === 0 ? C.gray50 : C.white;
      const fgT = row[4] ? C.white : C.gray800;
      slide.addShape('rect', { x: 0.5, y: 2.0 + i * 0.42, w: 4.6, h: 0.42,
        fill: { color: bg }, line: { color: C.gray200, pt: 0.3 } });
      [row[0], row[1], row[2], row[3]].forEach((v, j) => {
        const isBad = (j === 3 && (v.includes('-') || v.includes('neg')));
        const c = row[4] ? (j === 3 ? (row[5] ? C.red : C.goldLight) : C.white)
                         : isBad ? C.red : j > 0 ? C.gray700 : fgT;
        slide.addText(v, { x: [0.55, 2.5, 3.4, 4.3][j], y: 2.0 + i * 0.42 + 0.08, w: [1.9, 0.85, 0.85, 0.75][j], h: 0.26,
          fontSize: j === 0 ? 9 : 9.5, bold: row[4], color: c, fontFace: 'Calibri', align: j === 0 ? 'left' : 'right' });
      });
    });

    // Evolução EBITDA 3 meses
    slide.addShape('rect', { x: 0.5, y: 4.55, w: 4.6, h: 1.15,
      fill: { color: C.redPale }, line: { color: C.red, pt: 1 } });
    slide.addText('Histórico EBITDA Marca B:', {
      x: 0.65, y: 4.62, w: 4.3, h: 0.26, fontSize: 8.5, bold: true, color: C.red, fontFace: 'Calibri',
    });
    slide.addText('Dez/25: -R$50k  |  Jan/26: -R$95k  |  Fev/26: -R$170k\n→ Tendência de piora acelerada — não é sazonalidade', {
      x: 0.65, y: 4.9, w: 4.3, h: 0.7, fontSize: 9, color: C.gray800, fontFace: 'Calibri',
    });

    // Diagnóstico (direita)
    slide.addShape('rect', { x: 5.6, y: 1.3, w: 7.38, h: 5.4,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('DIAGNÓSTICO E OPÇÕES', {
      x: 5.75, y: 1.38, w: 7.0, h: 0.28,
      fontSize: 8.5, bold: true, color: C.red, fontFace: 'Calibri', charSpacing: 1,
    });

    const opcoes = [
      {
        label: 'CAUSA RAIZ',
        cor: C.red,
        txt: 'Volume de alunos caiu 12% (de 520 para 458). Custo fixo permanece calibrado para 520 alunos. ' +
             'Custo/aluno passou de R$596 → R$1.004 — inviável economicamente.',
      },
      {
        label: 'OPÇÃO A — Escalar volume (aposta)',
        cor: C.blue,
        txt: 'Meta: trazer 70 novos alunos até maio. Requer campanha comercial focada, desconto pontual para conversão. ' +
             'Risco: campanha pode não performar no prazo. Tempo: 2-3 meses. Impacto: break-even em maio.',
      },
      {
        label: 'OPÇÃO B — Reduzir estrutura (seguro)',
        cor: C.amber,
        txt: 'Desligar 2 colaboradores (folha -R$180k/mês), renegociar aluguel. ' +
             'EBITDA volta a zero em 30 dias. Risco: prejudicar capacidade de crescimento futuro.',
      },
      {
        label: 'DECISÃO NECESSÁRIA HOJE',
        cor: C.green,
        txt: 'Definir entre Opção A ou B até 10/03. Ambas são viáveis — não decidir é a pior opção. ' +
             'Sem decisão, Marca B sangra mais R$170k em março.',
      },
    ];

    opcoes.forEach((op, i) => {
      slide.addShape('rect', { x: 5.75, y: 1.8 + i * 1.18, w: 7.0, h: 1.06,
        fill: { color: C.gray50 }, line: { color: op.cor, pt: 1 } });
      slide.addText(op.label, { x: 5.9, y: 1.88 + i * 1.18, w: 6.7, h: 0.26,
        fontSize: 8.5, bold: true, color: op.cor, fontFace: 'Calibri' });
      slide.addText(op.txt, { x: 5.9, y: 2.16 + i * 1.18, w: 6.7, h: 0.6,
        fontSize: 9, color: C.gray700, fontFace: 'Calibri' });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 9 — PROJEÇÃO: meta anual em perspectiva
  // "Meta anual alcançável se custo ceder — 2 cenários para o semestre"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.gray50 }, line: { none: true } });
    headerBar(slide,
      'Meta anual ainda alcançável — mas exige recuperação em março: 2 cenários para o semestre',
      'Projeção e Perspectiva  |  EBITDA YTD e Forecast Semestral',
      C.teal
    );

    // Tabela de cenários
    slide.addShape('rect', { x: 0.35, y: 1.3, w: 12.6, h: 0.35,
      fill: { color: C.navy }, line: { none: true } });
    ['MÊS', 'META ANUAL (Orc)', 'CENÁRIO BASE (Atual)', 'CENÁRIO OTIMISTA (Com Ações)', 'GAP para Meta'].forEach((h, i) => {
      const xs = [0.1, 1.5, 3.5, 5.9, 9.6];
      const ws = [1.35, 1.9, 2.3, 3.6, 2.9];
      slide.addText(h, { x: 0.35 + xs[i], y: 1.34, w: ws[i], h: 0.27,
        fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle', align: i === 0 ? 'left' : 'center' });
    });

    const meses = [
      ['Janeiro',   '2.800', '2.650', '2.650',  '-R$150k',  'green'],
      ['Fevereiro', '2.800', '1.900', '1.900',  '-R$900k',  'red'  ],
      ['Março',     '2.800', '2.200', '2.700',  '-R$100k',  'amber'],
      ['Abril',     '3.000', '2.600', '3.000',  'em linha', 'green'],
      ['Maio',      '3.000', '2.700', '3.100',  '+R$100k',  'green'],
      ['Junho',     '2.800', '2.500', '2.900',  '+R$100k',  'green'],
    ];
    meses.forEach((row, i) => {
      const bg = i % 2 === 0 ? C.gray50 : C.white;
      slide.addShape('rect', { x: 0.35, y: 1.65 + i * 0.42, w: 12.6, h: 0.42,
        fill: { color: bg }, line: { color: C.gray200, pt: 0.3 } });
      const xs = [0.1, 1.5, 3.5, 5.9, 9.6], ws = [1.35, 1.9, 2.3, 3.6, 2.9];
      const gapCol = row[5] === 'red' ? C.red : row[5] === 'green' ? C.green : C.amber;
      [row[0], `R$${row[1]}k`, `R$${row[2]}k`, `R$${row[3]}k`, row[4]].forEach((v, j) => {
        const col = j === 4 ? gapCol : j === 2 && row[5] === 'red' ? C.red : C.gray800;
        slide.addText(v, { x: 0.35 + xs[j], y: 1.65 + i * 0.42 + 0.08, w: ws[j], h: 0.26,
          fontSize: 9.5, color: col, fontFace: 'Calibri', align: j === 0 ? 'left' : 'center',
          bold: j === 4 });
      });
    });

    // Totais
    slide.addShape('rect', { x: 0.35, y: 1.65 + 6 * 0.42, w: 12.6, h: 0.42,
      fill: { color: C.navyMid }, line: { none: true } });
    [['1° SEMESTRE', 'R$17.200k', 'R$14.550k', 'R$16.250k', '-R$950k']].forEach(row => {
      const xs = [0.1, 1.5, 3.5, 5.9, 9.6], ws = [1.35, 1.9, 2.3, 3.6, 2.9];
      row.forEach((v, j) => {
        const col = j === 4 ? C.red : j === 3 ? C.goldLight : C.white;
        slide.addText(v, { x: 0.35 + xs[j], y: 1.65 + 6 * 0.42 + 0.08, w: ws[j], h: 0.26,
          fontSize: 9.5, bold: true, color: col, fontFace: 'Calibri', align: j === 0 ? 'left' : 'center' });
      });
    });

    // Insight box
    slide.addShape('rect', { x: 0.35, y: 4.75, w: 12.6, h: 1.85,
      fill: { color: C.white }, line: { color: C.gray200, pt: 1 } });
    slide.addText('O QUE PRECISA ACONTECER EM MARÇO PARA RECUPERAR O SEMESTRE:', {
      x: 0.55, y: 4.85, w: 12.0, h: 0.28,
      fontSize: 9, bold: true, color: C.navy, fontFace: 'Calibri', charSpacing: 0.5,
    });
    [
      { cor: C.blue,  txt: 'Custo fixo deve ceder R$400k vs fevereiro (execução das 3 ações do slide anterior)' },
      { cor: C.green, txt: '35 novas matrículas em RJ3 (campanha comercial já ativada)' },
      { cor: C.amber, txt: 'Facilities SP2 renegociado antes do fechamento de março' },
    ].forEach((item, i) => {
      badge(slide, '→', 0.55, 5.18 + i * 0.38, 0.28, 0.28, item.cor);
      slide.addText(item.txt, { x: 0.92, y: 5.18 + i * 0.38, w: 11.8, h: 0.28,
        fontSize: 10, color: C.gray700, fontFace: 'Calibri', valign: 'middle' });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 10 — DECISÕES E AÇÕES
  // "3 decisões hoje = R$600k de EBITDA recuperável em Q2"
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { none: true } });
    slide.addShape('rect', { x: 0, y: 0, w: 0.35, h: H, fill: { color: C.green }, line: { none: true } });

    slide.addText('3 DECISÕES HOJE', {
      x: 0.7, y: 0.55, w: 9, h: 0.7,
      fontSize: 32, bold: true, color: C.white, fontFace: 'Calibri',
    });
    slide.addText('= R$600k de EBITDA recuperável em Q2', {
      x: 0.7, y: 1.22, w: 9, h: 0.42,
      fontSize: 18, color: C.goldLight, fontFace: 'Calibri',
    });
    slide.addShape('rect', { x: 0.7, y: 1.72, w: 11.8, h: 0.03,
      fill: { color: C.navyLight }, line: { none: true } });

    const decisoes = [
      {
        num: '1',
        titulo: 'Congelar contratações — SP2 e RJ3',
        resp: 'Dir. SP2 + Dir. RJ3 + CHRO',
        prazo: 'Hoje',
        impacto: '+R$240k/mês',
        cor: C.green,
        obs: 'Vigente até atingir 320 alunos consolidados. Revisão: 01/abril.',
      },
      {
        num: '2',
        titulo: 'Renegociar contrato facilities SP2',
        resp: 'CFO + COO',
        prazo: '15/março',
        impacto: '+R$180k',
        cor: C.blue,
        obs: 'Retroativo a fevereiro. Cláusula de reajuste não havia sido prevista no orçamento.',
      },
      {
        num: '3',
        titulo: 'Decidir futuro estrutural da Marca B',
        resp: 'CEO + Diretor Marca B',
        prazo: '10/março',
        impacto: 'Evitar -R$170k/mês',
        cor: C.red,
        obs: 'Opção A (escalar volume) ou Opção B (reduzir estrutura). Ver análise no Slide 8.',
      },
    ];

    decisoes.forEach((dec, i) => {
      const dy = 2.0 + i * 1.65;
      slide.addShape('rect', { x: 0.7, y: dy, w: 12.2, h: 1.45,
        fill: { color: C.navyMid }, line: { color: dec.cor, pt: 2 } });
      slide.addShape('rect', { x: 0.7, y: dy, w: 0.55, h: 1.45, fill: { color: dec.cor }, line: { none: true } });
      slide.addText(dec.num, { x: 0.7, y: dy + 0.35, w: 0.55, h: 0.5,
        fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri', align: 'center' });
      slide.addText(dec.titulo, { x: 1.4, y: dy + 0.12, w: 7.5, h: 0.38,
        fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri' });
      slide.addText(dec.obs, { x: 1.4, y: dy + 0.52, w: 7.5, h: 0.38,
        fontSize: 9.5, color: C.gray400, fontFace: 'Calibri', italic: true });
      // Tags
      [dec.resp, dec.prazo, dec.impacto].forEach((tag, j) => {
        const bColors = [C.navyLight, C.navyLight, dec.cor];
        const txColors = [C.gray400, C.gray400, dec.cor === C.red ? C.red : C.goldLight];
        const icons = ['👤 ', '📅 ', '💰 '];
        slide.addText(icons[j] + tag, { x: 1.4 + j * 3.7, y: dy + 0.95, w: 3.5, h: 0.38,
          fontSize: 9, color: txColors[j], fontFace: 'Calibri', bold: j === 2 });
      });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SLIDE 11 — ENCERRAMENTO + PROPOSTA DE ADAPTAÇÃO
  // ════════════════════════════════════════════════════════════════════════════
  n++;
  {
    const slide = pptx.addSlide();
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { none: true } });
    slide.addShape('rect', { x: 0, y: 0, w: W, h: 0.06, fill: { color: C.gold }, line: { none: true } });

    slide.addText('PRÓXIMA REUNIÃO', {
      x: 1.0, y: 0.8, w: 8, h: 0.55,
      fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri',
    });
    slide.addText('03 de abril de 2026  |  DRE Gerencial — Março 2026', {
      x: 1.0, y: 1.4, w: 10, h: 0.38,
      fontSize: 14, color: C.gray400, fontFace: 'Calibri',
    });
    slide.addShape('rect', { x: 1.0, y: 1.9, w: 11.3, h: 0.03, fill: { color: C.navyLight }, line: { none: true } });

    // Estrutura proposta para próxima apresentação
    slide.addText('COMO ESTA APRESENTAÇÃO SERIA GERADA PELO SISTEMA:', {
      x: 1.0, y: 2.15, w: 11.3, h: 0.32,
      fontSize: 9, bold: true, color: C.gold, fontFace: 'Calibri', charSpacing: 1,
    });

    const items = [
      ['SLIDE 1', 'Capa + contexto do mês', C.gray400],
      ['SLIDE 2', 'Mensagem Executiva (SCR) — gerada por IA com dados reais', C.blueLight],
      ['SLIDE 3', 'Semáforo do Portfolio — dinâmico, ordenado por EBITDA%', C.gold],
      ['SLIDE 4', 'DRE Consolidado — tabela formatada com cores condicionais', C.gray400],
      ['SLIDE 5', 'Waterfall EBITDA Bridge — calculado automaticamente dos desvios', C.red],
      ['SLIDE 6', 'Análise de Receita — volume × ticket × mix por marca', C.gray400],
      ['SLIDE 7', 'Análise de Custo — alavancas + análise vertical automática', C.gray400],
      ['SLIDE 8', 'Deep Dive — marca com maior desvio negativo (auto-selecionada)', C.red],
      ['SLIDE 9', 'Projeção — cenários calculados a partir da tendência atual', C.gray400],
      ['SLIDE 10', 'Decisões — geradas por IA a partir dos desvios identificados', C.green],
    ];

    items.forEach((item, i) => {
      const col = i % 2 === 0 ? C.navyMid : C.navyLight;
      slide.addShape('rect', { x: 1.0, y: 2.55 + i * 0.38, w: 11.3, h: 0.38,
        fill: { color: col }, line: { none: true } });
      badge(slide, item[0], 1.05, 2.58 + i * 0.38, 0.9, 0.3, item[2], C.navy, 7.5);
      slide.addText(item[1], { x: 2.05, y: 2.58 + i * 0.38, w: 10.1, h: 0.3,
        fontSize: 9.5, color: C.white, fontFace: 'Calibri', valign: 'middle' });
    });

    footerBar(slide, n, TOTAL_SLIDES);
  }

  // ── Salvar
  const outPath = 'output/PROPOSTA_PPT_DRE_Raiz_Educacao.pptx';
  await pptx.writeFile({ fileName: outPath });
  console.log(`\n✅  Proposta salva em: ${outPath}`);
  console.log('   Abra o arquivo para revisar os 11 slides da proposta.\n');
}

gerarProposta().catch(err => {
  console.error('❌ Erro:', err.message || err);
  process.exit(1);
});
