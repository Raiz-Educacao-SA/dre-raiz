/**
 * Gera PDF do Guia de Análise Financeira
 * Requer pdfmake v0.2: npm install pdfmake@0.2.18 --no-save
 * Executar: node docs/_generate-guia-pdf.mjs
 * Depois restaurar: npm install pdfmake@0.3.3 --no-save
 */
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');

// Extract embedded fonts to temp files for PdfPrinter
const tmp = tmpdir();
for (const [name, b64] of Object.entries(vfsFonts)) {
  if (name.endsWith('.ttf')) writeFileSync(join(tmp, name), Buffer.from(b64, 'base64'));
}
const printer = new PdfPrinter({
  Roboto: {
    normal: join(tmp, 'Roboto-Regular.ttf'),
    bold: join(tmp, 'Roboto-Medium.ttf'),
    italics: join(tmp, 'Roboto-Italic.ttf'),
    bolditalics: join(tmp, 'Roboto-MediumItalic.ttf'),
  },
});

const ORANGE = '#F44C00';
const DARK = '#1E293B';
const GRAY = '#64748B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const AMBER = '#D97706';
const LIGHT_BG = '#F8FAFC';

const hr = () => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E2E8F0' }], margin: [0, 8, 0, 8] });
const hrOrange = () => ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 3, lineColor: ORANGE }], margin: [0, 4, 0, 12] });

const dd = {
  pageSize: 'A4',
  pageMargins: [50, 60, 50, 50],

  header: (currentPage, pageCount) => {
    if (currentPage === 1) return null;
    return {
      columns: [
        { text: 'Guia de Análise Financeira — Raiz Educação', fontSize: 8, color: GRAY, margin: [50, 20, 0, 0] },
        { text: `${currentPage}/${pageCount}`, fontSize: 8, color: GRAY, alignment: 'right', margin: [0, 20, 50, 0] },
      ],
    };
  },

  footer: (currentPage) => {
    if (currentPage === 1) return null;
    return {
      text: 'Planejamento Financeiro — Raiz Educação S.A. — Março 2026',
      fontSize: 7, color: '#94A3B8', alignment: 'center', margin: [0, 0, 0, 0],
    };
  },

  content: [
    // ═══════════════ CAPA ═══════════════
    { text: '', margin: [0, 100, 0, 0] },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 4, r: 0, color: ORANGE }] },
    { text: 'Guia de Análise Financeira', fontSize: 36, bold: true, color: DARK, margin: [0, 30, 0, 0] },
    { text: 'Sistema de Corte DRE, Justificativas de Desvios\ne Apresentação Executiva', fontSize: 16, color: GRAY, margin: [0, 10, 0, 30] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 3, lineColor: ORANGE }], margin: [0, 0, 0, 20] },
    { text: 'Planejamento Financeiro — Raiz Educação S.A.', fontSize: 14, color: GRAY },
    { text: 'Versão 1.0 — Março 2026', fontSize: 12, color: '#94A3B8', margin: [0, 5, 0, 0] },
    { text: '', pageBreak: 'after' },

    // ═══════════════ SUMÁRIO ═══════════════
    { text: 'Sumário', fontSize: 24, bold: true, color: DARK },
    hrOrange(),
    {
      ol: [
        { text: [{ text: 'Visão Geral do Processo', bold: true }, ' — O que é, fluxo mensal'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Corte DRE — Foto do Mês', bold: true }, ' — Como a foto é gerada'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Justificativas de Desvios', bold: true }, ' — Regra dos 5%, exemplos'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Plano de Ação (5W1H)', bold: true }, ' — Metodologia, revisão'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Fluxo de Aprovação', bold: true }, ' — Status e responsabilidades'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Sumário Executivo', bold: true }, ' — Resumo por IA'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Plano de Ação Consolidado', bold: true }, ' — Acompanhamento'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Slides de Análise', bold: true }, ' — PPT automático'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Cronograma Mensal', bold: true }, ' — Sugestão de datas'], margin: [0, 0, 0, 6] },
      ],
      fontSize: 12, color: DARK, margin: [0, 0, 0, 0],
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 1. VISÃO GERAL ═══════════════
    { text: '1. Visão Geral do Processo', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    { text: 'O que é a Análise Financeira?', fontSize: 14, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
    { text: 'É o processo mensal onde o Planejamento Financeiro congela os resultados da DRE ("Foto") e os responsáveis de cada pacote (pacoteiros) justificam os desvios encontrados, propondo planos de ação concretos.', fontSize: 11, color: DARK, margin: [0, 0, 0, 12], lineHeight: 1.4 },

    { text: 'Objetivo', fontSize: 14, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
    {
      ul: [
        'Garantir rastreabilidade de todo desvio relevante',
        'Documentar causas e ações corretivas',
        'Alimentar automaticamente a apresentação executiva',
        'Criar histórico para melhoria contínua',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 16],
    },

    { text: 'Fluxo Mensal', fontSize: 14, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
    {
      table: {
        widths: [30, '*'],
        body: [
          [{ text: '1', bold: true, color: 'white', fillColor: BLUE, alignment: 'center', fontSize: 11 }, { text: [{ text: 'DRE Gerencial — ', bold: true }, 'Lançamentos e ajustes diários pelos responsáveis'], fontSize: 11 }],
          [{ text: '2', bold: true, color: 'white', fillColor: ORANGE, alignment: 'center', fontSize: 11 }, { text: [{ text: 'Foto / Corte — ', bold: true }, 'PlanFin congela os valores do mês (snapshot imutável)'], fontSize: 11 }],
          [{ text: '3', bold: true, color: 'white', fillColor: PURPLE, alignment: 'center', fontSize: 11 }, { text: [{ text: 'Justificativas — ', bold: true }, 'Pacoteiros justificam desvios >5% + plano de ação'], fontSize: 11 }],
          [{ text: '4', bold: true, color: 'white', fillColor: AMBER, alignment: 'center', fontSize: 11 }, { text: [{ text: 'Revisão — ', bold: true }, 'PlanFin aprova ou rejeita (com motivo)'], fontSize: 11 }],
          [{ text: '5', bold: true, color: 'white', fillColor: GREEN, alignment: 'center', fontSize: 11 }, { text: [{ text: 'Apresentação — ', bold: true }, 'PPT automático gerado para reunião de resultado'], fontSize: 11 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E2E8F0', paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 8, paddingRight: () => 8 },
      margin: [0, 0, 0, 16],
    },

    // ═══════════════ NAVEGAÇÃO ═══════════════
    { text: 'Abas da Análise Financeira', fontSize: 14, bold: true, color: ORANGE, margin: [0, 8, 0, 8] },
    {
      table: {
        widths: [140, '*', 55],
        body: [
          [{ text: 'Aba', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Descrição', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Acesso', bold: true, color: 'white', fillColor: DARK, fontSize: 10, alignment: 'center' }],
          [{ text: 'Corte DRE (Justificativas)', bold: true, fontSize: 10 }, { text: 'Tabela de desvios congelados para justificativa e plano de ação', fontSize: 10 }, { text: 'Todos', fontSize: 10, alignment: 'center' }],
          [{ text: 'Sumário Executivo', bold: true, fontSize: 10 }, { text: 'Resumo narrativo gerado por IA a partir do snapshot', fontSize: 10 }, { text: 'Todos', fontSize: 10, alignment: 'center' }],
          [{ text: 'Plano de Ação', bold: true, fontSize: 10 }, { text: 'Consolidação de todos os planos 5W1H para acompanhamento', fontSize: 10 }, { text: 'Todos', fontSize: 10, alignment: 'center' }],
          [{ text: 'Slides de Análise', bold: true, fontSize: 10 }, { text: 'PPT executivo automático com dados, justificativas e IA', fontSize: 10 }, { text: 'Todos', fontSize: 10, alignment: 'center' }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 2. CORTE DRE ═══════════════
    { text: '2. Corte DRE — Como a Foto é Gerada', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    { text: 'Passo a passo (PlanFin):', fontSize: 12, bold: true, color: DARK, margin: [0, 0, 0, 6] },
    {
      ol: [
        'Na DRE Gerencial, selecione exatamente 1 mês no filtro.',
        'Clique no botão "Foto" (icone de câmera) — disponível apenas para Admin/PlanFin.',
        'O sistema grava um snapshot isolado daquele mês (nunca YTD).',
        'Os valores ficam congelados — referência oficial para justificativas.',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 12],
    },

    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Regras Importantes', fontSize: 12, bold: true, color: ORANGE, margin: [0, 0, 0, 4] },
            { ul: [
              'Cada mês tem sua própria foto — Jan grava só Jan, Fev grava só Fev.',
              'O painel "Consolidado YTD" (parte inferior) soma automaticamente os meses com foto.',
              'A foto pode ser re-gerada (nova versão v2, v3...), preservando justificativas já escritas.',
              'Valores do snapshot são a referência oficial — não mudam após geração da versão.',
            ], fontSize: 10, color: DARK, lineHeight: 1.3 },
          ],
          margin: [8, 8, 8, 8],
        }]],
      },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => ORANGE, vLineColor: () => ORANGE },
      margin: [0, 0, 0, 16],
    },

    { text: 'Hierarquia da Tabela de Desvios', fontSize: 12, bold: true, color: DARK, margin: [0, 0, 0, 6] },
    {
      table: {
        widths: [55, 130, '*'],
        body: [
          [{ text: 'Nível', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Exemplo', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Descrição', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }],
          [{ text: 'Tag0', bold: true, fontSize: 10, color: DARK }, { text: '01. RECEITA LÍQUIDA', fontSize: 10 }, { text: 'Grupo principal DRE', fontSize: 10 }],
          [{ text: 'Tag01', bold: true, fontSize: 10, color: BLUE }, { text: 'Folha (Funcionários)', fontSize: 10 }, { text: 'Centro de custo', fontSize: 10 }],
          [{ text: 'Tag02', bold: true, fontSize: 10, color: PURPLE }, { text: 'Ensino Fundamental', fontSize: 10 }, { text: 'Segmento — NÍVEL DE JUSTIFICATIVA', fontSize: 10, bold: true }],
          [{ text: 'Marca', bold: true, fontSize: 10, color: ORANGE }, { text: 'AP, CLV, GEU, GT...', fontSize: 10 }, { text: 'Unidade de negócio', fontSize: 10 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 6, paddingRight: () => 6 },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 3. REGRA 5% ═══════════════
    { text: '3. Regra de Obrigatoriedade — Threshold 5%', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    {
      columns: [
        {
          width: '48%',
          stack: [
            { text: 'OBRIGATÓRIO', fontSize: 16, bold: true, color: RED, margin: [0, 0, 0, 4] },
            { text: 'Desvio > +5% ou < -5%', fontSize: 12, color: DARK, margin: [0, 0, 0, 8] },
            { ul: [
              'Justificativa textual obrigatória (mín. 20 caracteres)',
              'Plano de Ação 5W1H obrigatório para desvios negativos',
              'Itens aparecem com badge vermelho "Obrigatória"',
              'Contados no alerta de pendências do topo',
            ], fontSize: 10, color: DARK, lineHeight: 1.4 },
          ],
        },
        { width: '4%', text: '' },
        {
          width: '48%',
          stack: [
            { text: 'OPCIONAL', fontSize: 16, bold: true, color: GREEN, margin: [0, 0, 0, 4] },
            { text: 'Desvio entre -5% e +5%', fontSize: 12, color: DARK, margin: [0, 0, 0, 8] },
            { ul: [
              'Justificativa pode ser preenchida, mas não é exigida',
              'Plano de Ação opcional',
              'Incentivamos o preenchimento para completude',
              'Não bloqueia aprovação do mês',
            ], fontSize: 10, color: DARK, lineHeight: 1.4 },
          ],
        },
      ],
      margin: [0, 0, 0, 16],
    },

    {
      table: {
        widths: ['*'],
        body: [[{
          text: [
            { text: 'Nível de Cobrança Atual: ', bold: true, color: BLUE },
            'Tag02 + Marca — As justificativas são exigidas no nível de segmento (Tag02) por marca. Níveis superiores (Tag01 e Tag0) são sintetizados automaticamente pela IA.',
          ],
          fontSize: 10, margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => BLUE, vLineColor: () => BLUE },
      margin: [0, 0, 0, 16],
    },

    { text: 'Exemplo Prático:', fontSize: 12, bold: true, color: DARK, margin: [0, 0, 0, 6] },
    {
      table: {
        widths: [160, 70, 70, 50, 80],
        body: [
          [{ text: 'Conta', bold: true, color: 'white', fillColor: DARK, fontSize: 9 }, { text: 'Real', bold: true, color: 'white', fillColor: DARK, fontSize: 9, alignment: 'right' }, { text: 'Orçado', bold: true, color: 'white', fillColor: DARK, fontSize: 9, alignment: 'right' }, { text: 'Δ%', bold: true, color: 'white', fillColor: DARK, fontSize: 9, alignment: 'right' }, { text: 'Obrigatório?', bold: true, color: 'white', fillColor: DARK, fontSize: 9, alignment: 'center' }],
          [{ text: 'Folha (Funcionários) — AP', fontSize: 9 }, { text: '-1.250.000', fontSize: 9, alignment: 'right' }, { text: '-1.100.000', fontSize: 9, alignment: 'right' }, { text: '+13,6%', fontSize: 9, alignment: 'right', color: RED, bold: true }, { text: 'SIM', fontSize: 9, alignment: 'center', color: RED, bold: true }],
          [{ text: 'Material Didático — CLV', fontSize: 9 }, { text: '-320.000', fontSize: 9, alignment: 'right' }, { text: '-310.000', fontSize: 9, alignment: 'right' }, { text: '+3,2%', fontSize: 9, alignment: 'right', color: GREEN }, { text: 'NÃO (< 5%)', fontSize: 9, alignment: 'center', color: GREEN }],
          [{ text: 'Receita Matrícula — GT', fontSize: 9 }, { text: '2.800.000', fontSize: 9, alignment: 'right' }, { text: '3.100.000', fontSize: 9, alignment: 'right' }, { text: '-9,7%', fontSize: 9, alignment: 'right', color: RED, bold: true }, { text: 'SIM', fontSize: 9, alignment: 'center', color: RED, bold: true }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 5, paddingRight: () => 5 },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 4. COMO JUSTIFICAR ═══════════════
    { text: '4. Como Justificar um Desvio', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    {
      ol: [
        'Na tabela de desvios, localize o item atribuído a você (filtre por "Pendente").',
        'Clique no botão de ação (ícone de lápis) na linha do desvio.',
        'Preencha a justificativa textual (mínimo 20 caracteres).',
        'Se desvio negativo: preencha o Plano de Ação 5W1H.',
        'Clique em "Salvar" — status muda para "Justificado".',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 12],
    },

    { text: 'Exemplos de Boas Justificativas', fontSize: 14, bold: true, color: GREEN, margin: [0, 0, 0, 8] },
    {
      table: {
        widths: [100, 40, '*'],
        body: [
          [{ text: 'Conta', bold: true, color: 'white', fillColor: GREEN, fontSize: 9 }, { text: 'Desvio', bold: true, color: 'white', fillColor: GREEN, fontSize: 9, alignment: 'center' }, { text: 'Justificativa', bold: true, color: 'white', fillColor: GREEN, fontSize: 9 }],
          [{ text: 'Folha (Funcionários)', fontSize: 9 }, { text: '+12%', fontSize: 9, alignment: 'center', color: RED }, { text: 'Contratação não prevista de 3 professores para turma extra aberta em Fev/26 devido à demanda acima do esperado no Ensino Fundamental. Impacto de R$ 45k/mês.', fontSize: 9 }],
          [{ text: 'Material Didático', fontSize: 9 }, { text: '-8%', fontSize: 9, alignment: 'center', color: GREEN }, { text: 'Renegociação com fornecedor XYZ resultou em desconto de 15% no lote de apostilas do 1º semestre. Economia de R$ 32k.', fontSize: 9 }],
          [{ text: 'Receita Líquida', fontSize: 9 }, { text: '-6%', fontSize: 9, alignment: 'center', color: RED }, { text: 'Inadimplência acima do esperado na marca GT (3,2% vs 1,8% orçado). 47 alunos com mensalidade em atraso > 60 dias.', fontSize: 9 }],
          [{ text: 'Energia Elétrica', fontSize: 9 }, { text: '+22%', fontSize: 9, alignment: 'center', color: RED }, { text: 'Reajuste tarifário da concessionária (bandeira vermelha) + expansão da infraestrutura predial com 2 novos labs climatizados.', fontSize: 9 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 4, paddingBottom: () => 4, paddingLeft: () => 5, paddingRight: () => 5 },
      margin: [0, 0, 0, 12],
    },

    { text: 'Evite:', fontSize: 12, bold: true, color: RED, margin: [0, 0, 0, 6] },
    {
      ul: [
        { text: [{ text: '"Custo acima do orçado"', bold: true }, ' — Apenas repete o número, não explica a causa'] },
        { text: [{ text: '"Variação normal"', bold: true }, ' — Toda variação tem causa, não existe "normal"'] },
        { text: [{ text: '"Vou verificar"', bold: true }, ' — Não é justificativa, é promessa'] },
      ],
      fontSize: 10, color: DARK, margin: [0, 0, 0, 8],
    },

    {
      table: {
        widths: ['*'],
        body: [[{
          text: [
            { text: 'Dica: ', bold: true, color: PURPLE },
            'O botão "Melhorar com IA" refina seu texto e pode gerar automaticamente o plano 5W1H com base no contexto do desvio.',
          ],
          fontSize: 10, margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => PURPLE, vLineColor: () => PURPLE },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 5. PLANO DE AÇÃO 5W1H ═══════════════
    { text: '5. Plano de Ação — Metodologia 5W1H Simplificado', fontSize: 22, bold: true, color: DARK },
    hrOrange(),
    { text: 'Obrigatório para desvios negativos (custo acima ou receita abaixo do orçado).', fontSize: 11, color: GRAY, italic: true, margin: [0, 0, 0, 12] },

    {
      table: {
        widths: [90, 55, '*'],
        body: [
          [{ text: 'Campo', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Obrigatório?', bold: true, color: 'white', fillColor: DARK, fontSize: 10, alignment: 'center' }, { text: 'Descrição e Exemplo', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }],
          [{ text: 'What\n(O que)', bold: true, fontSize: 10 }, { text: 'Sim', fontSize: 10, color: RED, bold: true, alignment: 'center' }, { text: 'Ação corretiva.\nEx: "Renegociar contrato de energia e implementar programa de eficiência energética"', fontSize: 9 }],
          [{ text: 'Why\n(Por que)', bold: true, fontSize: 10 }, { text: 'Sim', fontSize: 10, color: RED, bold: true, alignment: 'center' }, { text: 'Objetivo da ação.\nEx: "Reduzir custo de energia em 15% até Jun/26, alinhando ao orçamento"', fontSize: 9 }],
          [{ text: 'How\n(Como)', bold: true, fontSize: 10 }, { text: 'Não', fontSize: 10, color: BLUE, alignment: 'center' }, { text: 'Passos de execução.\nEx: "1) Cotar 3 fornecedores; 2) Instalar sensores; 3) Revisar horários AC"', fontSize: 9 }],
          [{ text: 'Who\n(Quem)', bold: true, fontSize: 10 }, { text: 'Sim', fontSize: 10, color: RED, bold: true, alignment: 'center' }, { text: 'Responsável pela execução.\nEx: "Maria Silva — Gerente de Facilities"', fontSize: 9 }],
          [{ text: 'When\n(Quando)', bold: true, fontSize: 10 }, { text: 'Sim', fontSize: 10, color: RED, bold: true, alignment: 'center' }, { text: 'Prazo para conclusão (default: +30 dias).\nEx: "30/04/2026"', fontSize: 9 }],
          [{ text: 'Impacto\nEsperado', bold: true, fontSize: 10 }, { text: 'Não', fontSize: 10, color: BLUE, alignment: 'center' }, { text: 'Resultado financeiro esperado.\nEx: "Redução de R$ 18k/mês a partir de Mai/26"', fontSize: 9 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
      margin: [0, 0, 0, 16],
    },

    { text: 'Revisão e Acompanhamento', fontSize: 14, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
    {
      ol: [
        { text: [{ text: 'Submissão: ', bold: true }, 'Pacoteiro cria justificativa + plano de ação.'] },
        { text: [{ text: 'Revisão: ', bold: true }, 'PlanFin avalia pertinência, clareza e viabilidade do plano.'] },
        { text: [{ text: 'Aprovação/Rejeição: ', bold: true }, 'Se aprovado: segue para acompanhamento. Se rejeitado: pacoteiro ajusta e resubmete.'] },
        { text: [{ text: 'Acompanhamento mensal: ', bold: true }, 'Na reunião de resultado, planos "Em andamento" e "Atrasados" são discutidos.'] },
        { text: [{ text: 'Conclusão: ', bold: true }, 'Responsável atualiza status para "Concluído" e registra resultado efetivo.'] },
      ],
      fontSize: 10, color: DARK, margin: [0, 0, 0, 12], lineHeight: 1.4,
    },

    {
      table: {
        widths: ['*'],
        body: [[{
          text: 'O Plano de Ação será avaliado e discutido com o Planejamento Financeiro para aprovação e acompanhamento. O objetivo é garantir que as ações propostas sejam viáveis, mensuráveis e com prazo definido. Planos aprovados são monitorados mensalmente.',
          fontSize: 10, color: DARK, margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => ORANGE, vLineColor: () => ORANGE },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 6. FLUXO DE STATUS ═══════════════
    { text: '6. Fluxo de Status — Justificativas', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    {
      table: {
        widths: [90, 65, '*'],
        body: [
          [{ text: 'Status', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Cor', bold: true, color: 'white', fillColor: DARK, fontSize: 10, alignment: 'center' }, { text: 'Significado', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }],
          [{ text: 'Pendente', bold: true, fontSize: 10 }, { text: 'Amarelo', fontSize: 10, color: AMBER, alignment: 'center' }, { text: 'Aguardando justificativa do pacoteiro', fontSize: 10 }],
          [{ text: 'Notificado', bold: true, fontSize: 10 }, { text: 'Azul', fontSize: 10, color: BLUE, alignment: 'center' }, { text: 'Email enviado ao responsável', fontSize: 10 }],
          [{ text: 'Justificado', bold: true, fontSize: 10 }, { text: 'Roxo', fontSize: 10, color: PURPLE, alignment: 'center' }, { text: 'Pacoteiro preencheu justificativa + plano', fontSize: 10 }],
          [{ text: 'Aprovado', bold: true, fontSize: 10 }, { text: 'Verde', fontSize: 10, color: GREEN, alignment: 'center' }, { text: 'PlanFin/Gestor aprovou', fontSize: 10 }],
          [{ text: 'Rejeitado', bold: true, fontSize: 10 }, { text: 'Vermelho', fontSize: 10, color: RED, alignment: 'center' }, { text: 'PlanFin/Gestor rejeitou (motivo informado). Pacoteiro pode resubmeter.', fontSize: 10 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
      margin: [0, 0, 0, 16],
    },

    { text: 'Síntese Automática por IA', fontSize: 14, bold: true, color: PURPLE, margin: [0, 0, 0, 8] },
    { text: 'Quando TODAS as justificativas de nível Tag02+Marca de um Tag01 estão preenchidas, o sistema gera automaticamente uma síntese consolidada usando IA:', fontSize: 11, color: DARK, margin: [0, 0, 0, 8], lineHeight: 1.3 },
    { text: 'Tag02+Marca (pacoteiro escreve)  →  Tag01 (IA sintetiza)  →  Tag0 (IA sintetiza)', fontSize: 12, bold: true, color: PURPLE, alignment: 'center', margin: [0, 0, 0, 8] },
    { text: 'A síntese é usada automaticamente nos Slides de Análise e no PPT Executivo.', fontSize: 11, color: DARK, margin: [0, 0, 0, 0] },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 7. SUMÁRIO EXECUTIVO ═══════════════
    { text: '7. Sumário Executivo — Gerado por IA', fontSize: 22, bold: true, color: DARK },
    hrOrange(),
    { text: 'O Sumário Executivo é um resumo narrativo completo gerado por Inteligência Artificial que analisa todo o contexto dos dados financeiros do snapshot selecionado.', fontSize: 11, color: DARK, margin: [0, 0, 0, 12], lineHeight: 1.3 },

    {
      columns: [
        {
          width: '48%',
          stack: [
            { text: 'O que ele analisa:', fontSize: 12, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
            { ul: [
              'Panorama geral do resultado do mês',
              'Principais desvios positivos e negativos',
              'Comparação vs Orçado e vs Ano Anterior',
              'Riscos e oportunidades identificados',
              'Recomendações de ação baseadas nos dados',
            ], fontSize: 10, color: DARK, lineHeight: 1.3 },
          ],
        },
        { width: '4%', text: '' },
        {
          width: '48%',
          stack: [
            { text: 'Como usar:', fontSize: 12, bold: true, color: ORANGE, margin: [0, 0, 0, 6] },
            { ol: [
              'Selecione o mês nos filtros do topo',
              'Opcionalmente selecione uma marca',
              'Clique em "Gerar Sumário Executivo"',
              'O sistema analisa os dados e gera o resumo',
              'Clique em "Regerar" para atualizar',
            ], fontSize: 10, color: DARK, lineHeight: 1.3 },
          ],
        },
      ],
      margin: [0, 0, 0, 16],
    },

    // ═══════════════ 8. PLANO DE AÇÃO CONSOLIDADO ═══════════════
    { text: '8. Plano de Ação — Visão Consolidada', fontSize: 22, bold: true, color: DARK, margin: [0, 16, 0, 0] },
    hrOrange(),
    { text: 'Consolida todos os planos de ação criados nas justificativas em uma visão única de acompanhamento.', fontSize: 11, color: DARK, margin: [0, 0, 0, 8] },
    { ul: [
      'Filtro por status: Aberto, Em andamento, Concluído, Atrasado, Cancelado',
      'Busca por ação, objetivo ou responsável',
      'KPIs no topo: Total, Aberto, Em andamento, Atrasado, Taxa de conclusão',
      'Detalhe expandido com 5W1H completo + contexto financeiro',
      'Exportação para Excel',
    ], fontSize: 10, color: DARK, margin: [0, 0, 0, 0], lineHeight: 1.3 },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 9. SLIDES DE ANÁLISE ═══════════════
    { text: '9. Slides de Análise — PPT Automático', fontSize: 22, bold: true, color: DARK },
    hrOrange(),
    { text: 'Gera automaticamente a apresentação executiva no padrão PlanFin, integrando dados, justificativas e análises de IA.', fontSize: 11, color: DARK, margin: [0, 0, 0, 12] },

    {
      table: {
        widths: [120, '*'],
        body: [
          [{ text: 'Slide', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Conteúdo', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }],
          [{ text: 'Capa', bold: true, fontSize: 10 }, { text: 'Logo, título, mês, marca, versão da foto', fontSize: 10 }],
          [{ text: 'Visão Geral DRE', bold: true, fontSize: 10 }, { text: 'Tabela condensada Tag0 + KPIs (EBITDA, Margem, Cobertura)', fontSize: 10 }],
          [{ text: 'Seção por Tag0', bold: true, fontSize: 10 }, { text: 'Tabela Tag01 + Síntese IA + Top 3 Desvios com justificativas', fontSize: 10 }],
          [{ text: 'Detalhamento', bold: true, fontSize: 10 }, { text: 'Hierarquia Tag01 > Tag02 > Marca com valores e justificativas', fontSize: 10 }],
          [{ text: 'Breakdown por Marca', bold: true, fontSize: 10 }, { text: 'Gráfico de barras Real vs Orçado vs A-1 por marca', fontSize: 10 }],
          [{ text: 'Cobertura Final', bold: true, fontSize: 10 }, { text: '% de cobertura + Top desvios não justificados', fontSize: 10 }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
      margin: [0, 0, 0, 16],
    },

    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Integração Automática', fontSize: 11, bold: true, color: BLUE, margin: [0, 0, 0, 4] },
            { ul: [
              'Justificativas dos pacoteiros aparecem nos slides de detalhamento',
              'Sínteses IA aparecem nos slides de seção (Tag0)',
              'Planos de Ação são referenciados nos slides de desvio',
              'Dados da Foto garantem consistência com a tabela de justificativas',
            ], fontSize: 10, color: DARK },
          ],
          margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => BLUE, vLineColor: () => BLUE },
    },
    { text: '', pageBreak: 'after' },

    // ═══════════════ 10. CRONOGRAMA ═══════════════
    { text: '10. Cronograma Mensal Sugerido', fontSize: 22, bold: true, color: DARK },
    hrOrange(),

    {
      table: {
        widths: [70, '*', 100],
        body: [
          [{ text: 'Dia', bold: true, color: 'white', fillColor: DARK, fontSize: 10, alignment: 'center' }, { text: 'Atividade', bold: true, color: 'white', fillColor: DARK, fontSize: 10 }, { text: 'Responsável', bold: true, color: 'white', fillColor: DARK, fontSize: 10, alignment: 'center' }],
          [{ text: 'D+1', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Conferência final dos lançamentos do mês', fontSize: 10 }, { text: 'Pacoteiros', fontSize: 10, alignment: 'center' }],
          [{ text: 'D+2', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Geração da Foto na DRE Gerencial', fontSize: 10 }, { text: 'PlanFin', fontSize: 10, alignment: 'center', bold: true, color: BLUE }],
          [{ text: 'D+2', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Notificação automática aos pacoteiros (email)', fontSize: 10 }, { text: 'Automático', fontSize: 10, alignment: 'center', color: PURPLE }],
          [{ text: 'D+2 a D+7', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Preenchimento de justificativas + planos de ação', fontSize: 10, bold: true }, { text: 'Pacoteiros', fontSize: 10, alignment: 'center' }],
          [{ text: 'D+8 a D+9', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Revisão e aprovação das justificativas', fontSize: 10 }, { text: 'PlanFin / Gestores', fontSize: 10, alignment: 'center', bold: true, color: BLUE }],
          [{ text: 'D+10', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Geração do PPT Executivo automático', fontSize: 10 }, { text: 'PlanFin', fontSize: 10, alignment: 'center', bold: true, color: BLUE }],
          [{ text: 'D+10 a D+12', bold: true, fontSize: 10, color: ORANGE, alignment: 'center' }, { text: 'Reunião de Resultado', fontSize: 10, bold: true }, { text: 'Diretoria + Gestores', fontSize: 10, alignment: 'center', bold: true, color: RED }],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0', paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 6, paddingRight: () => 6 },
      margin: [0, 0, 0, 24],
    },

    // ═══════════════ FAQ ═══════════════
    { text: 'Perguntas Frequentes', fontSize: 18, bold: true, color: DARK, margin: [0, 0, 0, 8] },
    hr(),

    { text: 'Sou pacoteiro e não vejo meus desvios. O que fazer?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Verifique se o mês correto está selecionado. Se persistir, entre em contato com o PlanFin para ajustar suas permissões de acesso.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 8] },

    { text: 'Posso editar uma justificativa já aprovada?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Não. Após aprovação, somente o administrador pode reabrir. Solicite ao PlanFin.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 8] },

    { text: 'O que acontece se eu não justificar dentro do prazo?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Os itens pendentes são destacados na reunião de resultados e no PPT como "Sem justificativa". O PlanFin fará follow-up.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 8] },

    { text: 'A foto pode ser retirada novamente?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Sim. A nova versão atualiza valores mas preserva justificativas existentes.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 8] },

    { text: 'Preciso preencher plano de ação para desvios positivos?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Para desvios positivos, o plano é opcional. Mas a justificativa textual é obrigatória se >5%.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 16] },

    hr(),
    { text: 'Planejamento Financeiro — Raiz Educação S.A. — Versão 1.0 — Março 2026', fontSize: 9, color: '#94A3B8', alignment: 'center' },
  ],

  defaultStyle: {
    font: 'Roboto',
  },
};

// Generate PDF via PdfPrinter stream
const pdfDoc = printer.createPdfKitDocument(dd);
const chunks = [];
await new Promise((resolve, reject) => {
  pdfDoc.on('data', (c) => chunks.push(c));
  pdfDoc.on('end', () => {
    const buf = Buffer.concat(chunks);
    writeFileSync('docs/Guia_Analise_Financeira_Raiz.pdf', buf);
    console.log('✅ PDF gerado: docs/Guia_Analise_Financeira_Raiz.pdf (' + Math.round(buf.length / 1024) + ' KB)');
    resolve();
  });
  pdfDoc.on('error', reject);
  pdfDoc.end();
});
