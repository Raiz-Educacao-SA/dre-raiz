/**
 * Gera PDF do Manual do Usuário — DRE Raiz
 * Requer pdfmake v0.2: npm install pdfmake@0.2.18 --no-save
 * Executar: node docs/_generate-manual-pdf.mjs
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
const sectionTitle = (text) => ({ text, fontSize: 22, bold: true, color: DARK });
const subTitle = (text, color = ORANGE) => ({ text, fontSize: 14, bold: true, color, margin: [0, 8, 0, 6] });
const bodyText = (text) => ({ text, fontSize: 11, color: DARK, lineHeight: 1.4, margin: [0, 0, 0, 10] });
const pageBreak = () => ({ text: '', pageBreak: 'after' });

const tblLayout = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5,
  hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0',
  paddingTop: () => 5, paddingBottom: () => 5,
  paddingLeft: () => 6, paddingRight: () => 6,
};
const darkHeader = (text, opts = {}) => ({ text, bold: true, color: 'white', fillColor: DARK, fontSize: 10, ...opts });
const cell = (text, opts = {}) => ({ text, fontSize: 10, ...opts });

const infoBox = (text, borderColor = ORANGE) => ({
  table: { widths: ['*'], body: [[{ text, fontSize: 10, color: DARK, margin: [8, 6, 8, 6], lineHeight: 1.3 }]] },
  layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => borderColor, vLineColor: () => borderColor },
  margin: [0, 0, 0, 12],
});

const dd = {
  pageSize: 'A4',
  pageMargins: [50, 60, 50, 50],

  header: (currentPage, pageCount) => {
    if (currentPage === 1) return null;
    return {
      columns: [
        { text: 'DRE Raiz — Manual do Usuário', fontSize: 8, color: GRAY, margin: [50, 20, 0, 0] },
        { text: `${currentPage}/${pageCount}`, fontSize: 8, color: GRAY, alignment: 'right', margin: [0, 20, 50, 0] },
      ],
    };
  },

  footer: (currentPage) => {
    if (currentPage === 1) return null;
    return {
      text: 'Planejamento Financeiro — Raiz Educação S.A. — Março 2026',
      fontSize: 7, color: '#94A3B8', alignment: 'center',
    };
  },

  content: [
    // ═══════════════ CAPA ═══════════════
    { text: '', margin: [0, 80, 0, 0] },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 5, r: 0, color: ORANGE }] },
    { text: 'DRE Raiz', fontSize: 42, bold: true, color: DARK, margin: [0, 30, 0, 0] },
    { text: 'Manual do Usuário', fontSize: 28, color: ORANGE, margin: [0, 5, 0, 10] },
    { text: 'Plataforma de Gestão Financeira\nRaiz Educação S.A.', fontSize: 16, color: GRAY, margin: [0, 10, 0, 30] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 3, lineColor: ORANGE }], margin: [0, 0, 0, 20] },
    { text: 'Planejamento Financeiro', fontSize: 14, color: DARK },
    { text: 'Versão 1.0 — Março 2026', fontSize: 12, color: '#94A3B8', margin: [0, 5, 0, 0] },
    pageBreak(),

    // ═══════════════ SUMÁRIO ═══════════════
    { text: 'Sumário', fontSize: 24, bold: true, color: DARK },
    hrOrange(),
    {
      ol: [
        { text: [{ text: 'O que é a DRE Raiz', bold: true }, ' — Visão geral e benefícios'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Acesso e Navegação', bold: true }, ' — Login e menu lateral'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'DRE Gerencial', bold: true }, ' — Modos, filtros, drill-down'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Lançamentos', bold: true }, ' — Transações e edição em massa'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Aprovações', bold: true }, ' — Fila de alterações'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Análise Financeira', bold: true }, ' — Corte DRE, justificativas, plano de ação, slides'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Cronograma Mensal', bold: true }, ' — Sugestão de datas'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Dicas Rápidas', bold: true }, ' — Atalhos e truques'], margin: [0, 0, 0, 6] },
        { text: [{ text: 'Perguntas Frequentes', bold: true }, ' — FAQ'], margin: [0, 0, 0, 6] },
      ],
      fontSize: 12, color: DARK,
    },
    pageBreak(),

    // ═══════════════ 1. O QUE É ═══════════════
    sectionTitle('1. O que é a DRE Raiz?'),
    hrOrange(),
    bodyText('A DRE Raiz é a plataforma de gestão financeira da Raiz Educação que centraliza todo o processo de análise do Demonstrativo de Resultado do Exercício (DRE). Ela substitui o fluxo manual anterior (Alteryx → Excel → PPT) por um ambiente digital integrado, com dados em tempo real, inteligência artificial e geração automática de relatórios.'),

    subTitle('O que a plataforma faz:'),
    {
      ul: [
        [{ text: 'Consolida ', bold: true }, 'todos os dados financeiros das marcas e filiais em um único lugar'],
        [{ text: 'Compara ', bold: true }, 'resultados reais com orçamento e ano anterior automaticamente'],
        [{ text: 'Identifica ', bold: true }, 'desvios relevantes e cobra justificativas dos responsáveis'],
        [{ text: 'Gera ', bold: true }, 'apresentações executivas automaticamente com dados, justificativas e análises de IA'],
        [{ text: 'Projeta ', bold: true }, 'resultados futuros com 3 métodos de forecasting'],
        [{ text: 'Analisa ', bold: true }, 'performance por marca, filial e centro de custo'],
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 12], lineHeight: 1.3,
    },

    subTitle('Principais benefícios:'),
    {
      ul: [
        'Dados sempre atualizados (não depende de extrações manuais)',
        'Rastreabilidade completa de justificativas e planos de ação',
        'Redução drástica do tempo de preparação de relatórios',
        'Histórico preservado para comparação entre períodos',
        'Permissões por usuário — cada um vê o que lhe compete',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 16], lineHeight: 1.3,
    },
    pageBreak(),

    // ═══════════════ 2. ACESSO E NAVEGAÇÃO ═══════════════
    sectionTitle('2. Acesso e Navegação'),
    hrOrange(),
    bodyText('Acesse pelo navegador (Chrome recomendado). O login é feito com sua conta Google corporativa da Raiz Educação.'),

    subTitle('Menu Lateral (Sidebar)'),
    {
      table: {
        widths: [120, '*', 70],
        body: [
          [darkHeader('Guia'), darkHeader('O que faz'), darkHeader('Acesso', { alignment: 'center' })],
          [cell('DRE Gerencial', { bold: true }), cell('Demonstrativo de resultado com filtros, drill-down e exportação'), cell('Todos', { alignment: 'center' })],
          [cell('Lançamentos', { bold: true }), cell('Transações individuais, busca avançada, edição em massa'), cell('Todos', { alignment: 'center' })],
          [cell('Aprovações', { bold: true }), cell('Fila de aprovação de alterações solicitadas'), cell('Admin/Gestor', { alignment: 'center' })],
          [cell('Análise Financeira', { bold: true }), cell('Corte DRE, justificativas, plano de ação, slides automáticos'), cell('Todos', { alignment: 'center' })],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 12],
    },
    infoBox([{ text: 'Nota: ', bold: true, color: BLUE }, 'Você verá apenas as guias compatíveis com seu perfil de acesso.'], BLUE),
    pageBreak(),

    // ═══════════════ 3. DRE GERENCIAL ═══════════════
    sectionTitle('3. DRE Gerencial — Sua Visão Principal'),
    hrOrange(),
    bodyText('A DRE Gerencial é a tela principal da plataforma. Aqui você visualiza o demonstrativo de resultado completo com comparações automáticas.'),

    subTitle('3 Modos de Visualização'),
    {
      table: {
        widths: [90, '*'],
        body: [
          [darkHeader('Modo'), darkHeader('O que mostra')],
          [cell('Consolidado', { bold: true, color: BLUE }), cell('Período selecionado: Real | Orçado | Δ R$ | Δ % | Ano Anterior | Δ R$ | Δ %')],
          [cell('Cenário', { bold: true, color: PURPLE }), cell('Meses lado a lado, separados por cenário (Real, Orçado, A-1)')],
          [cell('Mês', { bold: true, color: ORANGE }), cell('Meses lado a lado, cada um com Real | Orçado | A-1 juntos')],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 12],
    },

    subTitle('Filtros Disponíveis'),
    {
      columns: [
        {
          width: '48%',
          ul: ['Marca (multi-seleção)', 'Filial (cascata da Marca)', 'Tag01 (centro de custo)', 'Tag02 (segmento)'],
          fontSize: 10, color: DARK, lineHeight: 1.3,
        },
        { width: '4%', text: '' },
        {
          width: '48%',
          ul: ['Tag03 (projeto)', 'Mês (período)', 'Recorrência (Sim/Não/Todos)'],
          fontSize: 10, color: DARK, lineHeight: 1.3,
        },
      ],
      margin: [0, 0, 0, 12],
    },

    subTitle('Hierarquia da DRE'),
    {
      table: {
        widths: [160, '*'],
        body: [
          [darkHeader('Tag0'), darkHeader('Grupo DRE')],
          [cell('01. RECEITA LÍQUIDA'), cell('Todas as receitas')],
          [cell('02. CUSTOS VARIÁVEIS'), cell('Custos proporcionais à operação')],
          [cell('03. CUSTOS FIXOS'), cell('Custos estruturais')],
          [cell('04. DESPESAS SG&A'), cell('Despesas gerais e administrativas')],
          [cell('06. RATEIO RAIZ'), cell('Rateio do CSC (Centro de Serviços Compartilhados)')],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 8],
    },
    bodyText('Linhas calculadas: MARGEM DE CONTRIBUIÇÃO (Receita + Custos Variáveis) e EBITDA (Margem + Fixos + Rateio).'),

    subTitle('Ações Disponíveis'),
    {
      table: {
        widths: [130, '*'],
        body: [
          [darkHeader('Ação'), darkHeader('Como fazer')],
          [cell('Drill-down', { bold: true }), cell('Duplo clique em qualquer linha Tag01 → abre transações detalhadas')],
          [cell('Exportar Excel', { bold: true }), cell('Botão de download → planilha fiel à visualização atual')],
          [cell('Tela cheia', { bold: true }), cell('Botão maximizar no canto da tabela')],
          [cell('Copiar valor', { bold: true }), cell('Ctrl+Clique no valor numérico → copia para área de transferência')],
          [cell('Limpar filtros', { bold: true }), cell('Botão "Limpar" → reseta todos os filtros')],
        ],
      },
      layout: tblLayout,
    },
    pageBreak(),

    // ═══════════════ 4. LANÇAMENTOS ═══════════════
    sectionTitle('4. Lançamentos — Transações Individuais'),
    hrOrange(),
    bodyText('Consulte e edite transações individuais do sistema financeiro. São 14 filtros disponíveis com paginação de 1.000 registros por página.'),

    subTitle('Como funciona'),
    {
      ol: [
        'Aplique os filtros desejados',
        'Clique em "Buscar Dados" para carregar os resultados',
        'Navegue entre páginas com os botões Anterior / Próxima',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 8],
    },
    infoBox([{ text: 'Dica: ', bold: true, color: PURPLE }, 'Ao fazer drill-down da DRE Gerencial, os filtros são aplicados automaticamente e a busca é executada.'], PURPLE),

    subTitle('Edição em Massa'),
    {
      ol: [
        'Selecione as transações desejadas (checkbox)',
        'Escolha o campo a alterar (Data, Filial, Conta, Recorrência)',
        'Informe o novo valor + escreva uma justificativa',
        'Envie para aprovação → a alteração será revisada na guia Aprovações',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 8],
    },

    subTitle('Personalização'),
    {
      ul: [
        [{ text: 'Colunas: ', bold: true }, 'Mostre ou oculte conforme necessidade (salvo automaticamente)'],
        [{ text: 'Densidade: ', bold: true }, '3 opções — Confortável / Compacto / Ultra'],
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 8],
    },
    pageBreak(),

    // ═══════════════ 5. APROVAÇÕES ═══════════════
    sectionTitle('5. Aprovações — Fila de Alterações'),
    hrOrange(),
    bodyText('Alterações solicitadas na guia Lançamentos aparecem aqui para revisão antes de serem aplicadas.'),

    {
      table: {
        widths: [80, 65, '*'],
        body: [
          [darkHeader('Status'), darkHeader('Cor', { alignment: 'center' }), darkHeader('Significado')],
          [cell('Pendente', { bold: true }), cell('Amarelo', { color: AMBER, alignment: 'center' }), cell('Aguardando revisão')],
          [cell('Aplicado', { bold: true }), cell('Verde', { color: GREEN, alignment: 'center' }), cell('Aprovado e aplicado nas transações')],
          [cell('Rejeitado', { bold: true }), cell('Vermelho', { color: RED, alignment: 'center' }), cell('Rejeitado com motivo informado')],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 12],
    },

    subTitle('Como aprovar'),
    {
      ol: [
        'Clique na alteração para ver o modal de detalhes (antes vs depois)',
        'Revise a justificativa e os valores',
        'Clique em Aprovar ou Rejeitar',
        'Para múltiplas: selecione várias e use "Aprovar Selecionadas"',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 8],
    },
    pageBreak(),

    // ═══════════════ 6. ANÁLISE FINANCEIRA ═══════════════
    sectionTitle('6. Análise Financeira — Processo Mensal'),
    hrOrange(),
    bodyText('A guia mais importante do processo mensal. Possui 4 abas integradas que estruturam todo o ciclo de análise de desvios.'),

    // --- 6.1 Corte DRE ---
    subTitle('Aba 1: Corte DRE — Foto e Justificativas', BLUE),

    { text: 'O que é a "Foto"?', fontSize: 12, bold: true, color: DARK, margin: [0, 4, 0, 4] },
    bodyText('É um snapshot (congelamento) dos valores da DRE em um determinado momento. Após tirada a foto, os valores ficam fixos como referência oficial.'),

    infoBox([
      { text: 'Regras: ', bold: true, color: ORANGE },
      'Cada mês tem foto independente (Jan=Jan, Fev=Fev). O painel YTD soma meses com foto. A foto pode ser re-gerada, preservando justificativas existentes. Somente Admin/PlanFin gera a foto.',
    ]),

    { text: 'Regra dos 5%', fontSize: 12, bold: true, color: DARK, margin: [0, 4, 0, 6] },
    {
      columns: [
        {
          width: '48%',
          stack: [
            { text: 'OBRIGATÓRIO', fontSize: 14, bold: true, color: RED, margin: [0, 0, 0, 4] },
            { text: 'Desvio > +5% ou < -5%', fontSize: 11, color: DARK, margin: [0, 0, 0, 6] },
            { ul: [
              'Justificativa textual obrigatória (mín. 20 caracteres)',
              'Plano de Ação 5W1H obrigatório para desvios negativos',
            ], fontSize: 10, color: DARK, lineHeight: 1.3 },
          ],
        },
        { width: '4%', text: '' },
        {
          width: '48%',
          stack: [
            { text: 'OPCIONAL', fontSize: 14, bold: true, color: GREEN, margin: [0, 0, 0, 4] },
            { text: 'Desvio entre -5% e +5%', fontSize: 11, color: DARK, margin: [0, 0, 0, 6] },
            { ul: [
              'Justificativa pode ser preenchida, mas não é exigida',
              'Plano de Ação opcional',
            ], fontSize: 10, color: DARK, lineHeight: 1.3 },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },

    { text: 'Como justificar', fontSize: 12, bold: true, color: DARK, margin: [0, 4, 0, 6] },
    {
      ol: [
        'Localize seu item (filtre por "Pendente")',
        'Clique no ícone de lápis na linha do desvio',
        'Escreva a justificativa explicando a causa do desvio',
        'Se desvio negativo: preencha o Plano de Ação 5W1H',
        'Clique em "Salvar"',
      ],
      fontSize: 11, color: DARK, margin: [0, 0, 0, 8],
    },

    { text: 'Exemplos de Boas Justificativas', fontSize: 12, bold: true, color: GREEN, margin: [0, 4, 0, 6] },
    {
      table: {
        widths: [90, 35, '*'],
        body: [
          [darkHeader('Conta', { fillColor: GREEN }), darkHeader('Δ%', { fillColor: GREEN, alignment: 'center' }), darkHeader('Justificativa', { fillColor: GREEN })],
          [cell('Folha'), cell('+12%', { color: RED, alignment: 'center' }), cell('Contratação de 3 professores para turma extra em Fev/26. Impacto R$ 45k/mês.', { fontSize: 9 })],
          [cell('Material Didático'), cell('-8%', { color: GREEN, alignment: 'center' }), cell('Renegociação com fornecedor XYZ: desconto de 15% no lote de apostilas. Economia R$ 32k.', { fontSize: 9 })],
          [cell('Receita Líquida'), cell('-6%', { color: RED, alignment: 'center' }), cell('Inadimplência acima do esperado na marca GT (3,2% vs 1,8% orçado). 47 alunos em atraso >60d.', { fontSize: 9 })],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 8],
    },

    { text: 'Evite:', fontSize: 11, bold: true, color: RED, margin: [0, 4, 0, 4] },
    {
      ul: [
        [{ text: '"Custo acima do orçado" ', bold: true }, '— repete o número, não explica'],
        [{ text: '"Variação normal" ', bold: true }, '— toda variação tem causa'],
        [{ text: '"Vou verificar" ', bold: true }, '— não é justificativa'],
      ],
      fontSize: 10, color: DARK, margin: [0, 0, 0, 8],
    },

    infoBox([{ text: 'Dica: ', bold: true, color: PURPLE }, 'O botão "Melhorar com IA" refina seu texto automaticamente e pode gerar o plano 5W1H.'], PURPLE),

    { text: 'Fluxo de Status', fontSize: 12, bold: true, color: DARK, margin: [0, 8, 0, 6] },
    {
      table: {
        widths: [80, 55, '*'],
        body: [
          [darkHeader('Status'), darkHeader('Cor', { alignment: 'center' }), darkHeader('Significado')],
          [cell('Pendente', { bold: true }), cell('Amarelo', { color: AMBER, alignment: 'center' }), cell('Aguardando justificativa')],
          [cell('Notificado', { bold: true }), cell('Azul', { color: BLUE, alignment: 'center' }), cell('Email enviado ao responsável')],
          [cell('Justificado', { bold: true }), cell('Roxo', { color: PURPLE, alignment: 'center' }), cell('Pacoteiro preencheu')],
          [cell('Aprovado', { bold: true }), cell('Verde', { color: GREEN, alignment: 'center' }), cell('PlanFin/Gestor aprovou')],
          [cell('Rejeitado', { bold: true }), cell('Vermelho', { color: RED, alignment: 'center' }), cell('Rejeitado (motivo informado)')],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 8],
    },

    { text: 'Síntese IA:', fontSize: 11, bold: true, color: PURPLE, margin: [0, 4, 0, 4] },
    { text: 'Tag02+Marca (pacoteiro escreve) → Tag01 (IA sintetiza) → Tag0 (IA sintetiza)', fontSize: 11, bold: true, color: PURPLE, alignment: 'center', margin: [0, 0, 0, 8] },
    pageBreak(),

    // --- 6.2 Plano 5W1H ---
    subTitle('Aba 3: Plano de Ação — 5W1H Simplificado', BLUE),
    {
      table: {
        widths: [75, 50, '*'],
        body: [
          [darkHeader('Campo'), darkHeader('Obrigatório?', { alignment: 'center' }), darkHeader('Descrição e Exemplo')],
          [cell('What\n(O que)', { bold: true }), cell('Sim', { color: RED, bold: true, alignment: 'center' }), cell('Ação corretiva. Ex: "Renegociar contrato de energia"', { fontSize: 9 })],
          [cell('Why\n(Por que)', { bold: true }), cell('Sim', { color: RED, bold: true, alignment: 'center' }), cell('Objetivo. Ex: "Reduzir custo em 15% até Jun/26"', { fontSize: 9 })],
          [cell('How\n(Como)', { bold: true }), cell('Não', { color: BLUE, alignment: 'center' }), cell('Passos. Ex: "1) Cotar 3 fornecedores; 2) Instalar sensores"', { fontSize: 9 })],
          [cell('Who\n(Quem)', { bold: true }), cell('Sim', { color: RED, bold: true, alignment: 'center' }), cell('Responsável. Ex: "Maria Silva — Gerente de Facilities"', { fontSize: 9 })],
          [cell('When\n(Quando)', { bold: true }), cell('Sim', { color: RED, bold: true, alignment: 'center' }), cell('Prazo (default +30 dias). Ex: "30/04/2026"', { fontSize: 9 })],
          [cell('Impacto\nEsperado', { bold: true }), cell('Não', { color: BLUE, alignment: 'center' }), cell('Resultado financeiro. Ex: "Redução de R$ 18k/mês"', { fontSize: 9 })],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 12],
    },

    infoBox('O Plano de Ação será avaliado pelo Planejamento Financeiro para aprovação e acompanhamento mensal. Planos aprovados são monitorados nas reuniões de resultado.'),

    // --- 6.3 Sumário + Slides ---
    subTitle('Aba 2: Sumário Executivo — IA', BLUE),
    bodyText('Resumo narrativo completo gerado por Inteligência Artificial. Analisa panorama geral, desvios, riscos, oportunidades e recomendações. Clique "Gerar Sumário" para criar.'),

    subTitle('Aba 4: Slides de Análise — PPT Automático', BLUE),
    bodyText('Gera apresentação executiva automaticamente integrando: DRE snapshot + justificativas dos pacoteiros + síntese IA. Slides: Capa, Visão Geral, Seção por Tag0, Detalhamento, Breakdown por Marca, Cobertura Final. Pronto para reunião de resultados.'),
    pageBreak(),

    // ═══════════════ 7. CRONOGRAMA ═══════════════
    sectionTitle('7. Cronograma Mensal Sugerido'),
    hrOrange(),
    {
      table: {
        widths: [65, '*', 95],
        body: [
          [darkHeader('Dia', { alignment: 'center' }), darkHeader('Atividade'), darkHeader('Responsável', { alignment: 'center' })],
          [cell('D+1', { bold: true, color: ORANGE, alignment: 'center' }), cell('Conferência final dos lançamentos do mês'), cell('Pacoteiros', { alignment: 'center' })],
          [cell('D+2', { bold: true, color: ORANGE, alignment: 'center' }), cell('Geração da Foto na DRE Gerencial'), cell('PlanFin', { alignment: 'center', bold: true, color: BLUE })],
          [cell('D+2', { bold: true, color: ORANGE, alignment: 'center' }), cell('Notificação automática aos pacoteiros (email)'), cell('Automático', { alignment: 'center', color: PURPLE })],
          [cell('D+2 a D+7', { bold: true, color: ORANGE, alignment: 'center' }), cell('Preenchimento de justificativas + planos de ação', { bold: true }), cell('Pacoteiros', { alignment: 'center' })],
          [cell('D+8 a D+9', { bold: true, color: ORANGE, alignment: 'center' }), cell('Revisão e aprovação das justificativas'), cell('PlanFin / Gestores', { alignment: 'center', color: BLUE })],
          [cell('D+10', { bold: true, color: ORANGE, alignment: 'center' }), cell('Geração do PPT Executivo automático'), cell('PlanFin', { alignment: 'center', color: BLUE })],
          [cell('D+10 a D+12', { bold: true, color: ORANGE, alignment: 'center' }), cell('Reunião de Resultado', { bold: true }), cell('Diretoria', { alignment: 'center', bold: true, color: RED })],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 24],
    },

    // ═══════════════ 8. DICAS RÁPIDAS ═══════════════
    sectionTitle('8. Dicas Rápidas'),
    hrOrange(),
    {
      table: {
        widths: [160, '*'],
        body: [
          [darkHeader('Ação'), darkHeader('Como fazer')],
          [cell('Copiar valor numérico', { bold: true }), cell('Ctrl+Clique no valor')],
          [cell('Drill-down para transações', { bold: true }), cell('Duplo clique em linha da DRE')],
          [cell('Melhorar justificativa', { bold: true }), cell('Botão "Melhorar com IA" no modal')],
          [cell('Configurar colunas', { bold: true }), cell('Ícone de colunas (configuração salva automaticamente)')],
          [cell('Exportar para Excel', { bold: true }), cell('Botão de download na barra superior')],
          [cell('Filtro em cascata', { bold: true }), cell('Selecione Marca → Filiais filtram automaticamente')],
          [cell('Voltar para DRE', { bold: true }), cell('Botão "Voltar para DRE" nos Lançamentos')],
          [cell('Tela cheia', { bold: true }), cell('Botão maximizar no canto da tabela')],
        ],
      },
      layout: tblLayout,
      margin: [0, 0, 0, 16],
    },
    pageBreak(),

    // ═══════════════ 9. FAQ ═══════════════
    sectionTitle('9. Perguntas Frequentes'),
    hrOrange(),

    { text: 'Sou pacoteiro e não vejo meus desvios. O que fazer?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Verifique se o mês correto está selecionado. Se persistir, entre em contato com o PlanFin para ajustar suas permissões.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'Posso editar uma justificativa já aprovada?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Não. Após aprovação, somente o administrador pode reabrir. Solicite ao PlanFin.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'O que acontece se eu não justificar dentro do prazo?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Os itens pendentes são destacados na reunião de resultados e no PPT como "Sem justificativa". O PlanFin fará follow-up.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'A foto pode ser retirada novamente?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Sim. A nova versão atualiza valores mas preserva justificativas existentes.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'Preciso preencher plano de ação para desvios positivos?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'O plano é opcional para desvios positivos. Mas a justificativa textual é obrigatória se >5%.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'Meus dados sumiram / não consigo ver uma marca.', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'Verifique suas permissões com o PlanFin. Cada usuário vê apenas marcas e filiais atribuídas ao seu perfil.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 10] },

    { text: 'Como sei se minha justificativa foi aprovada?', fontSize: 11, bold: true, color: DARK, margin: [0, 4, 0, 2] },
    { text: 'O status muda de "Justificado" (roxo) para "Aprovado" (verde) na tabela de desvios.', fontSize: 10, color: GRAY, margin: [0, 0, 0, 16] },

    hr(),

    // ═══════════════ 10. SUPORTE ═══════════════
    { text: 'Suporte', fontSize: 18, bold: true, color: DARK, margin: [0, 8, 0, 8] },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Dúvidas, dificuldades ou sugestões?', fontSize: 14, bold: true, color: ORANGE, margin: [0, 0, 0, 8] },
            { text: 'Direcionem ao Planejamento Financeiro — estamos 100% disponíveis para ajudar, tirar dúvidas e ouvir sugestões de melhoria para a plataforma.', fontSize: 11, color: DARK, margin: [0, 0, 0, 8], lineHeight: 1.3 },
            { text: 'A ferramenta está em evolução contínua. Seu uso e feedback são fundamentais para as melhorias.', fontSize: 11, color: GRAY, italic: true },
          ],
          margin: [12, 10, 12, 10],
        }]],
      },
      layout: { hLineWidth: () => 2, vLineWidth: () => 2, hLineColor: () => ORANGE, vLineColor: () => ORANGE },
    },

    { text: '', margin: [0, 20, 0, 0] },
    hr(),
    { text: 'Planejamento Financeiro — Raiz Educação S.A. — Manual do Usuário v1.0 — Março 2026', fontSize: 9, color: '#94A3B8', alignment: 'center' },
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
    writeFileSync('docs/DRE_Raiz_Manual_Usuario.pdf', buf);
    console.log('✅ PDF gerado: docs/DRE_Raiz_Manual_Usuario.pdf (' + Math.round(buf.length / 1024) + ' KB)');
    resolve();
  });
  pdfDoc.on('error', reject);
  pdfDoc.end();
});
