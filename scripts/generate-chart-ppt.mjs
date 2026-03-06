/**
 * Script standalone para gerar PPT com graficos nativos do pptxgenjs
 * Usa os mesmos dados do AnalysisPack (mock) para testar qualidade dos graficos
 *
 * Executar: node scripts/generate-chart-ppt.mjs
 * Output:   output/Analise-Financeira-Charts-Test.pptx
 */
import pptxgen from "pptxgenjs";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "..", "output");
mkdirSync(OUTPUT_DIR, { recursive: true });

// ============================================================
// PALETA DE CORES
// ============================================================
const C = {
  primary: "1B75BB",
  accent: "F44C00",
  teal: "7AC5BF",
  dark: "1F2937",
  medium: "6B7280",
  light: "F3F4F6",
  white: "FFFFFF",
  success: "10B981",
  danger: "EF4444",
  warning: "F59E0B",
};

const CHART_COLORS = [
  "1B75BB", "F44C00", "7AC5BF", "F59E0B", "8B5CF6",
  "EC4899", "10B981", "6366F1", "EF4444", "14B8A6",
];

// ============================================================
// DADOS (mesmo mockAnalysisPack)
// ============================================================
const META = {
  org_name: "RAIZ EDUCACAO",
  period_label: "Janeiro/2026",
  scope_label: "Consolidado - Todas as Marcas",
  generated_at: "30 de janeiro de 2026",
};

const EXECUTIVE_SUMMARY = {
  headline: "Performance financeira solida com oportunidades de otimizacao de custos operacionais",
  bullets: [
    "Receita acima do planejado em R$ 2.3M (3.2%), demonstrando forte captacao de alunos",
    "EBITDA de R$ 18.5M representa margem de 25.3%, superando o target de 22%",
    "Custos variaveis sob controle, com destaque para reducao de 8% em material didatico",
    "Inadimplencia em 4.2%, dentro do patamar aceitavel para o setor educacional",
  ],
  risks: [
    "Despesas com energia eletrica 15% acima do orcado devido ao aumento tarifario",
    "Turnover de professores aumentou para 12%, impactando qualidade e custos de treinamento",
    "Investimento em infraestrutura tecnologica atrasado, pode comprometer diferenciacao competitiva",
  ],
  opportunities: [
    "Renegociacao de contratos de fornecedores pode gerar economia anual de R$ 800K",
    "Expansao de turmas noturnas tem demanda reprimida e pode adicionar R$ 1.2M em receita",
    "Digitalizacao de processos administrativos pode reduzir custos SG&A em ate 10%",
  ],
};

const ACTIONS = [
  { owner: "CFO", action: "Iniciar processo de RFP para renegociacao de contratos de energia e limpeza", eta: "15/Fev/2026", impact: "Reducao de R$ 650K/ano em custos fixos" },
  { owner: "RH", action: "Implementar programa de retencao de talentos com foco em professores-chave", eta: "28/Fev/2026", impact: "Reducao de turnover para 8% e economia de R$ 200K" },
  { owner: "Operacoes", action: "Viabilizar abertura de 3 turmas noturnas piloto nas unidades de maior demanda", eta: "01/Mar/2026", impact: "Receita adicional de R$ 400K no Q2/2026" },
  { owner: "TI", action: "Acelerar projeto de automacao de processos administrativos (RPA)", eta: "31/Mar/2026", impact: "Reducao de 15 FTEs e economia de R$ 900K/ano" },
];

const KPIS = [
  { name: "Receita Total", actual: 74.5, plan: 72.2, prior: 73.2, unit: "R$ M" },
  { name: "EBITDA", actual: 18.5, plan: 16.3, prior: 17.8, unit: "R$ M" },
  { name: "Margem Liquida", actual: 25.3, plan: 22.0, prior: 24.3, unit: "%" },
  { name: "Custo por Aluno", actual: 4850, plan: 4950, prior: 4920, unit: "R$" },
];

// Datasets
const R12_MONTHS = ["Fev/25","Mar/25","Abr/25","Mai/25","Jun/25","Jul/25","Ago/25","Set/25","Out/25","Nov/25","Dez/25","Jan/26"];
const R12_RECEITA = [68.2, 69.5, 70.1, 71.8, 72.5, 73.2, 73.8, 74.1, 74.5, 73.9, 73.2, 74.5];
const R12_EBITDA  = [15.2, 15.8, 16.1, 16.9, 17.2, 17.5, 17.8, 18.0, 18.2, 18.1, 17.8, 18.5];

const WATERFALL_STEPS = [
  { label: "EBITDA Orcado", value: 16.3, type: "start" },
  { label: "Var. Receita", value: 2.3, type: "step" },
  { label: "Custos Variaveis", value: 0.8, type: "step" },
  { label: "Custos Fixos", value: -1.1, type: "step" },
  { label: "SG&A", value: 0.2, type: "step" },
  { label: "EBITDA Real", value: 18.5, type: "end" },
];

const PARETO_ITEMS = [
  { name: "Energia Eletrica", value: 450 },
  { name: "Material Didatico", value: -320 },
  { name: "Pessoal Temporario", value: 280 },
  { name: "Manutencao Predial", value: 180 },
  { name: "Limpeza e Conserv.", value: 150 },
  { name: "Seguranca", value: 120 },
  { name: "Tecnologia", value: -95 },
  { name: "Marketing", value: 85 },
  { name: "Alimentacao", value: 75 },
  { name: "Transporte", value: -60 },
];

const HEATMAP_DATA = {
  marcas: ["Marca A", "Marca B", "Marca C", "Marca D", "Marca E"],
  categorias: ["Receita", "Custos Var.", "Custos Fixos", "SG&A", "EBITDA"],
  values: [
    [3.2, 2.8, 3.5, 2.1, 4.2],
    [-2.1, -1.5, -3.2, -2.8, -1.2],
    [8.5, 12.2, 15.1, 9.8, 7.5],
    [-1.2, 0.5, -0.8, 1.2, -2.1],
    [5.2, 4.8, 6.5, 3.9, 7.2],
  ],
};

const DRIVERS_TABLE = {
  columns: ["Indicador", "Real", "Plano", "Var %", "Ano Ant.", "YoY %"],
  rows: [
    ["Alunos Ativos", "11.450", "11.200", "+2,2%", "10.980", "+4,3%"],
    ["Receita/Aluno", "R$ 6.500", "R$ 6.450", "+0,8%", "R$ 6.420", "+1,2%"],
    ["Custo/Aluno", "R$ 4.850", "R$ 4.950", "-2,0%", "R$ 4.920", "-1,4%"],
    ["Margem/Aluno", "R$ 1.650", "R$ 1.500", "+10,0%", "R$ 1.500", "+10,0%"],
    ["Inadimplencia", "4,2%", "4,0%", "+5,0%", "3,9%", "+7,7%"],
    ["Ticket Medio", "R$ 685", "R$ 680", "+0,7%", "R$ 675", "+1,5%"],
  ],
};

// ============================================================
// HELPERS
// ============================================================
function addHeader(slide, pptx, title, subtitle, num) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: C.accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.15, w: 13.33, h: 0.7, fill: { color: C.primary } });
  slide.addText(title, { x: 0.5, y: 0.22, w: 11.0, h: 0.5, fontSize: 24, bold: true, color: C.white, fontFace: "Arial" });
  if (num) slide.addText(`${num}`, { x: 12.0, y: 0.28, w: 0.8, h: 0.4, fontSize: 18, color: C.white, fontFace: "Arial", align: "center" });
  if (subtitle) slide.addText(subtitle, { x: 0.7, y: 1.0, w: 11.9, h: 0.3, fontSize: 12, color: C.medium, fontFace: "Arial", italic: true });
}

function addFooter(slide, pptx) {
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 6.9, w: 12.33, h: 0.02, fill: { color: C.light } });
  slide.addText(`${META.org_name}  |  ${META.period_label}  |  ${META.scope_label}`, { x: 0.5, y: 7.0, w: 10.0, h: 0.3, fontSize: 9, color: C.medium, fontFace: "Arial" });
  slide.addText("DRE RAIZ", { x: 11.5, y: 7.0, w: 1.5, h: 0.3, fontSize: 9, color: C.primary, fontFace: "Arial", align: "right", bold: true });
}

function fmtBRL(v) {
  return `R$ ${v.toFixed(1)}M`;
}

// ============================================================
// SLIDE 1: CAPA
// ============================================================
function slideCapa(pptx) {
  const s = pptx.addSlide();
  s.background = { color: C.primary };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.4, fill: { color: C.accent } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: C.teal } });
  s.addText("Analise Financeira", { x: 1, y: 2.0, w: 11.33, h: 1.0, fontSize: 56, bold: true, color: C.white, align: "center", fontFace: "Arial" });
  s.addText(META.org_name, { x: 1, y: 3.2, w: 11.33, h: 0.6, fontSize: 32, color: C.white, align: "center", fontFace: "Arial" });
  s.addText(META.period_label, { x: 1, y: 4.0, w: 11.33, h: 0.5, fontSize: 24, color: C.light, align: "center", fontFace: "Arial" });
  s.addText(META.scope_label, { x: 1, y: 4.6, w: 11.33, h: 0.4, fontSize: 18, color: C.light, align: "center", fontFace: "Arial" });
  s.addText(`Gerado em ${META.generated_at}`, { x: 1, y: 6.2, w: 11.33, h: 0.3, fontSize: 12, color: C.light, align: "center", fontFace: "Arial", italic: true });
  s.addText("Powered by IA  |  DRE RAIZ", { x: 1, y: 6.6, w: 11.33, h: 0.3, fontSize: 10, color: C.light, align: "center", fontFace: "Arial" });
}

// ============================================================
// SLIDE 2: SUMARIO EXECUTIVO
// ============================================================
function slideSumario(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Sumario Executivo", "Principais destaques do periodo", 2);

  // Headline
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.5, w: 12.33, h: 0.8, fill: { color: C.light } });
  s.addText(EXECUTIVE_SUMMARY.headline, { x: 0.7, y: 1.6, w: 11.9, h: 0.6, fontSize: 16, bold: true, color: C.accent, fontFace: "Arial" });

  // Destaques (esquerda)
  s.addText("Destaques Positivos", { x: 0.7, y: 2.5, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: C.success, fontFace: "Arial" });
  s.addText(EXECUTIVE_SUMMARY.bullets.map(b => `  ${b}`).join("\n"), { x: 0.7, y: 3.0, w: 5.5, h: 2.0, fontSize: 10, color: C.dark, fontFace: "Arial", valign: "top", bullet: true });

  // Riscos (direita)
  s.addText("Riscos e Atencoes", { x: 6.8, y: 2.5, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: C.danger, fontFace: "Arial" });
  s.addText(EXECUTIVE_SUMMARY.risks.map(r => `  ${r}`).join("\n"), { x: 6.8, y: 3.0, w: 5.5, h: 2.0, fontSize: 10, color: C.dark, fontFace: "Arial", valign: "top", bullet: true });

  // Oportunidades (abaixo)
  s.addText("Oportunidades", { x: 0.7, y: 5.2, w: 11.9, h: 0.4, fontSize: 14, bold: true, color: C.primary, fontFace: "Arial" });
  s.addText(EXECUTIVE_SUMMARY.opportunities.map(o => `  ${o}`).join("\n"), { x: 0.7, y: 5.7, w: 11.9, h: 1.0, fontSize: 10, color: C.dark, fontFace: "Arial", valign: "top", bullet: true });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 3: KPIs — 2 graficos com escalas proprias + analise IA
// ============================================================
function slideKPIs(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Visao Geral - Performance Financeira", "Janeiro/2026 - Consolidado", 3);

  // ---- GRAFICO ESQUERDO: Receita e EBITDA (R$ M) — mesma escala ----
  const finLabels = ["Receita Total", "EBITDA"];
  const finChartData = [
    { name: "Real",         labels: finLabels, values: [74.5, 18.5] },
    { name: "Plano",        labels: finLabels, values: [72.2, 16.3] },
    { name: "Ano Anterior", labels: finLabels, values: [73.2, 17.8] },
  ];

  s.addChart(pptx.charts.BAR, finChartData, {
    x: 0.4, y: 1.3, w: 6.2, h: 3.2,
    showTitle: true,
    title: "Receita e EBITDA (R$ M)",
    titleFontSize: 11,
    titleColor: C.dark,
    barGrouping: "clustered",
    barGapWidthPct: 60,
    chartColors: [C.primary, C.medium, C.teal],
    showValue: true,
    valueFontSize: 9,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 8,
    valAxisMinVal: 0,
    valAxisMaxVal: 80,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 9,
  });

  // ---- GRAFICO DIREITO: Margem (%) e Custo/Aluno (R$) — escalas separadas ----
  // Margem em %
  const margLabels = ["Margem Liquida (%)"];
  const margChartData = [
    { name: "Real",         labels: margLabels, values: [25.3] },
    { name: "Plano",        labels: margLabels, values: [22.0] },
    { name: "Ano Anterior", labels: margLabels, values: [24.3] },
  ];

  s.addChart(pptx.charts.BAR, margChartData, {
    x: 6.8, y: 1.3, w: 3.0, h: 3.2,
    showTitle: true,
    title: "Margem (%)",
    titleFontSize: 11,
    titleColor: C.dark,
    barGrouping: "clustered",
    barGapWidthPct: 50,
    chartColors: [C.primary, C.medium, C.teal],
    showValue: true,
    valueFontSize: 9,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 8,
    valAxisMinVal: 0,
    valAxisMaxVal: 30,
    showLegend: false,
  });

  // Custo por Aluno (R$)
  const custoLabels = ["Custo/Aluno (R$)"];
  const custoChartData = [
    { name: "Real",         labels: custoLabels, values: [4850] },
    { name: "Plano",        labels: custoLabels, values: [4950] },
    { name: "Ano Anterior", labels: custoLabels, values: [4920] },
  ];

  s.addChart(pptx.charts.BAR, custoChartData, {
    x: 10.0, y: 1.3, w: 3.0, h: 3.2,
    showTitle: true,
    title: "Custo/Aluno (R$)",
    titleFontSize: 11,
    titleColor: C.dark,
    barGrouping: "clustered",
    barGapWidthPct: 50,
    chartColors: [C.primary, C.medium, C.teal],
    showValue: true,
    valueFontSize: 9,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 8,
    valAxisMinVal: 4700,
    valAxisMaxVal: 5000,
    showLegend: false,
  });

  // ---- ANALISE IA (parte inferior) ----
  s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.7, w: 12.33, h: 2.1, fill: { color: "F0F9FF" }, line: { color: C.primary, width: 1 }, rectRadius: 0.1 });
  s.addText("Analise IA - Sintese Executiva", { x: 0.7, y: 4.8, w: 6.0, h: 0.35, fontSize: 13, bold: true, color: C.primary, fontFace: "Arial" });
  s.addText("Powered by Claude AI", { x: 10.0, y: 4.8, w: 2.6, h: 0.35, fontSize: 8, color: C.medium, fontFace: "Arial", align: "right", italic: true });

  const aiAnalysis = [
    "Receita superou plano em R$ 2.3M (+3.2%), impulsionada por captacao acima da meta (+180 matriculas). EBITDA de R$ 18.5M com margem de 25.3% supera o target de 22% — melhor resultado dos ultimos 6 meses.",
    "Ponto de atencao: custos fixos pressionaram R$ 1.1M acima do orcado, concentrados em energia eletrica (+18% tarifario). Recomenda-se RFP urgente para renegociacao.",
    "Custo por aluno de R$ 4.850 esta 2% abaixo do plano e do benchmark setorial — eficiencia operacional confirmada. Oportunidade: expansao de turmas noturnas pode adicionar R$ 1.2M/sem.",
  ];
  s.addText(aiAnalysis.map(a => `  ${a}`).join("\n"), {
    x: 0.7, y: 5.2, w: 11.9, h: 1.5, fontSize: 9.5, color: C.dark, fontFace: "Arial", valign: "top", bullet: true, lineSpacingMultiple: 1.15,
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 4: GRAFICO DE LINHAS - Evolucao Receita e EBITDA (R12M)
// ============================================================
function slideLinhas(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Analise de Receita", "Comparativo Real vs Planejado", 4);

  // Bullets
  s.addText("Drivers de Performance", { x: 0.7, y: 1.4, w: 11.9, h: 0.3, fontSize: 14, bold: true, color: C.primary, fontFace: "Arial" });
  const drivers = [
    "Mensalidades: R$ 68.5M (101.2% do plano) - crescimento organico forte",
    "Matriculas: R$ 4.2M (98.5% do plano) - campanha de captacao efetiva",
    "Servicos extras: R$ 1.8M (105% do plano) - adesao acima do esperado",
  ];
  s.addText(drivers.map(d => `  ${d}`).join("\n"), { x: 0.9, y: 1.8, w: 11.5, h: 0.9, fontSize: 10, color: C.dark, fontFace: "Arial", bullet: true });

  // Line chart
  const lineData = [
    { name: "Receita (R$ M)", labels: R12_MONTHS, values: R12_RECEITA },
    { name: "EBITDA (R$ M)", labels: R12_MONTHS, values: R12_EBITDA },
  ];

  s.addChart(pptx.charts.LINE, lineData, {
    x: 0.5, y: 2.9, w: 12.3, h: 3.8,
    showTitle: true,
    title: "Evolucao de Receita e EBITDA - Rolling 12 Meses (R$ M)",
    titleFontSize: 12,
    titleColor: C.dark,
    chartColors: [C.primary, C.accent],
    lineSmooth: true,
    lineSize: 3,
    showMarker: true,
    markerSize: 6,
    showValue: false,
    catAxisLabelFontSize: 8,
    catAxisLabelRotate: 45,
    valAxisLabelFontSize: 9,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 10,
    valAxisMinVal: 10,
  });

  // Nota
  s.addText("Receita apresenta tendencia de crescimento consistente nos ultimos 12 meses", {
    x: 0.7, y: 6.75, w: 11.9, h: 0.2, fontSize: 9, color: C.medium, fontFace: "Arial", italic: true
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 5: WATERFALL - Ponte de EBITDA vs Orcamento
// ============================================================
function slideWaterfall(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Analise de EBITDA", "Ponte vs Orcamento YTD", 5);

  // Waterfall simulado com barras empilhadas (stacked)
  // Tecnica: barra invisivel (base) + barra visivel (step)
  const labels = WATERFALL_STEPS.map(st => st.label);
  let runningTotal = 0;
  const invisBase = [];
  const posValues = [];
  const negValues = [];

  for (const step of WATERFALL_STEPS) {
    if (step.type === "start") {
      invisBase.push(0);
      posValues.push(step.value);
      negValues.push(0);
      runningTotal = step.value;
    } else if (step.type === "end") {
      invisBase.push(0);
      posValues.push(step.value);
      negValues.push(0);
    } else {
      if (step.value >= 0) {
        invisBase.push(runningTotal);
        posValues.push(step.value);
        negValues.push(0);
        runningTotal += step.value;
      } else {
        runningTotal += step.value;
        invisBase.push(runningTotal);
        posValues.push(0);
        negValues.push(Math.abs(step.value));
      }
    }
  }

  const chartData = [
    { name: "Base", labels, values: invisBase },
    { name: "Positivo", labels, values: posValues },
    { name: "Negativo", labels, values: negValues },
  ];

  s.addChart(pptx.charts.BAR, chartData, {
    x: 0.5, y: 1.4, w: 12.3, h: 3.5,
    showTitle: true,
    title: "Ponte de EBITDA: Orcado -> Real (R$ M)",
    titleFontSize: 12,
    titleColor: C.dark,
    barGrouping: "stacked",
    chartColors: [C.white, C.success, C.danger], // base branca (simula transparente)
    showValue: true,
    valueFontSize: 9,
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
    showLegend: false,
    barGapWidthPct: 60,
  });

  // Explicacao
  const bullets = [
    "Variacao positiva de receita adicionou R$ 2.3M ao EBITDA",
    "Custos variaveis ficaram R$ 800K abaixo do orcado",
    "Custos fixos pressionaram resultado em R$ 1.1M (principalmente energia)",
    "SG&A dentro do esperado com pequena economia de R$ 200K",
  ];
  s.addText(bullets.map(b => `  ${b}`).join("\n"), {
    x: 0.7, y: 5.1, w: 11.9, h: 1.4, fontSize: 10, color: C.dark, fontFace: "Arial", bullet: true
  });

  s.addText("EBITDA superou orcamento principalmente por ganho de receita e eficiencia em custos variaveis", {
    x: 0.7, y: 6.6, w: 11.9, h: 0.2, fontSize: 9, color: C.medium, fontFace: "Arial", italic: true
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 6: PARETO - Principais Variacoes de Custo
// ============================================================
function slidePareto(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Analise de Custos", "Principais Variacoes (Pareto)", 6);

  // Ordenar por valor absoluto desc
  const sorted = [...PARETO_ITEMS].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const labels = sorted.map(i => i.name);
  const values = sorted.map(i => i.value);

  // Calcular acumulado %
  const totalAbs = sorted.reduce((s, i) => s + Math.abs(i.value), 0);
  let acc = 0;
  const cumPct = sorted.map(i => {
    acc += Math.abs(i.value);
    return Math.round((acc / totalAbs) * 100);
  });

  // Barras de variacao
  const barData = [{ name: "Variacao (R$ K)", labels, values }];

  s.addChart(pptx.charts.BAR, barData, {
    x: 0.5, y: 1.4, w: 12.3, h: 3.0,
    showTitle: true,
    title: "Variacoes de Custo vs Orcamento (R$ mil)",
    titleFontSize: 12,
    titleColor: C.dark,
    chartColors: [C.accent],
    showValue: true,
    valueFontSize: 8,
    catAxisLabelFontSize: 8,
    catAxisLabelRotate: 30,
    valAxisLabelFontSize: 8,
    showLegend: false,
    barGapWidthPct: 50,
  });

  // Callout: Top 3
  s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 4.6, w: 11.9, h: 1.6, fill: { color: "DBEAFE" }, line: { color: C.primary, width: 2 }, rectRadius: 0.1 });
  s.addText("Top 3 Variacoes Explicam 78% do Total", { x: 0.9, y: 4.7, w: 11.5, h: 0.35, fontSize: 13, bold: true, color: C.primary, fontFace: "Arial" });
  const top3 = [
    "Energia Eletrica: +R$ 450K (aumento tarifario de 18% nao previsto)",
    "Material Didatico: -R$ 320K (renegociacao de fornecedor bem-sucedida)",
    "Pessoal Temporario: +R$ 280K (cobertura de licencas e afastamentos)",
  ];
  s.addText(top3.map(t => `  ${t}`).join("\n"), { x: 0.9, y: 5.1, w: 11.5, h: 1.0, fontSize: 10, color: C.dark, fontFace: "Arial", bullet: true });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 7: PIE CHART - Composicao de Custos
// ============================================================
function slidePie(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Composicao de Custos", "Distribuicao por Categoria", 7);

  const pieData = [
    { name: "Categoria", labels: ["Folha Docente", "Folha Admin.", "Energia", "Material", "Manutencao", "TI", "Marketing", "Outros"],
      values: [41.2, 12.5, 1.7, 3.8, 2.1, 1.9, 1.5, 5.3] },
  ];

  s.addChart(pptx.charts.PIE, pieData, {
    x: 0.5, y: 1.4, w: 6.0, h: 5.0,
    showTitle: true,
    title: "Custos por Categoria (R$ M)",
    titleFontSize: 12,
    titleColor: C.dark,
    chartColors: CHART_COLORS,
    showPercent: true,
    showValue: false,
    showLegend: true,
    legendPos: "r",
    legendFontSize: 10,
    dataLabelFontSize: 9,
    dataLabelColor: C.white,
  });

  // Donut: margem por marca (lado direito)
  const donutData = [
    { name: "Marca", labels: ["Marca A", "Marca B", "Marca C", "Marca D", "Marca E"],
      values: [28.5, 22.1, 19.8, 17.3, 12.3] },
  ];

  s.addChart(pptx.charts.DOUGHNUT, donutData, {
    x: 6.8, y: 1.4, w: 6.0, h: 5.0,
    showTitle: true,
    title: "Margem por Marca (%)",
    titleFontSize: 12,
    titleColor: C.dark,
    chartColors: [C.primary, C.accent, C.teal, C.warning, "8B5CF6"],
    showPercent: true,
    showLegend: true,
    legendPos: "r",
    legendFontSize: 10,
    dataLabelFontSize: 9,
    dataLabelColor: C.dark,
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 8: HEATMAP (simulado com tabela colorida)
// ============================================================
function slideHeatmap(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Analise por Marca e Categoria", "Mapa de Calor de Variacoes (%)", 8);

  // Heatmap como tabela com cores
  const { marcas, categorias, values } = HEATMAP_DATA;

  // Header row
  const headerRow = [
    { text: "", options: { fill: { color: C.primary }, color: C.white, fontSize: 10, bold: true, fontFace: "Arial" } },
    ...marcas.map(m => ({ text: m, options: { fill: { color: C.primary }, color: C.white, fontSize: 10, bold: true, fontFace: "Arial", align: "center" } })),
  ];

  const rows = [headerRow];
  for (let r = 0; r < categorias.length; r++) {
    const row = [
      { text: categorias[r], options: { fill: { color: C.light }, fontSize: 10, bold: true, color: C.dark, fontFace: "Arial" } },
    ];
    for (let c = 0; c < marcas.length; c++) {
      const v = values[r][c];
      let bgColor;
      if (v > 10) bgColor = "DC2626";      // vermelho forte
      else if (v > 5) bgColor = "EF4444";   // vermelho
      else if (v > 2) bgColor = "FCA5A5";   // vermelho claro
      else if (v > 0) bgColor = "FEE2E2";   // rosa
      else if (v > -2) bgColor = "DCFCE7";  // verde claro
      else if (v > -5) bgColor = "86EFAC";  // verde
      else bgColor = "22C55E";               // verde forte

      const textColor = (v > 10 || v < -5) ? C.white : C.dark;
      row.push({
        text: `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
        options: { fill: { color: bgColor }, color: textColor, fontSize: 11, fontFace: "Arial", align: "center", bold: true },
      });
    }
    rows.push(row);
  }

  s.addTable(rows, {
    x: 1.0, y: 1.5, w: 11.3,
    colW: [2.0, 1.86, 1.86, 1.86, 1.86, 1.86],
    rowH: 0.65,
    border: { type: "solid", pt: 1, color: C.white },
    margin: [5, 5, 5, 5],
  });

  // Legenda
  s.addText("Cores quentes (vermelho) = acima do orcado  |  Cores frias (verde) = abaixo do orcado (economia)", {
    x: 1.0, y: 5.5, w: 11.3, h: 0.3, fontSize: 9, color: C.medium, fontFace: "Arial", italic: true, align: "center"
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 9: AREA CHART - Evolucao Acumulada
// ============================================================
function slideArea(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Evolucao Acumulada", "Receita vs EBITDA - Area Chart", 9);

  const areaData = [
    { name: "Receita Acumulada (R$ M)", labels: R12_MONTHS, values: R12_RECEITA.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, []) },
    { name: "EBITDA Acumulado (R$ M)", labels: R12_MONTHS, values: R12_EBITDA.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc; }, []) },
  ];

  s.addChart(pptx.charts.AREA, areaData, {
    x: 0.5, y: 1.4, w: 12.3, h: 5.2,
    showTitle: true,
    title: "Evolucao Acumulada R12M (R$ M)",
    titleFontSize: 12,
    titleColor: C.dark,
    chartColors: [C.primary, C.teal],
    opacity: 40,
    lineSmooth: true,
    showValue: false,
    catAxisLabelFontSize: 8,
    catAxisLabelRotate: 45,
    valAxisLabelFontSize: 9,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 10,
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 10: STACKED BAR - Composicao por Marca
// ============================================================
function slideStackedBar(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Composicao por Marca", "Receita por Segmento - Barras Empilhadas", 10);

  const stackData = [
    { name: "Mensalidades", labels: ["Marca A", "Marca B", "Marca C", "Marca D", "Marca E"], values: [22.5, 18.2, 14.8, 11.5, 7.5] },
    { name: "Matriculas", labels: ["Marca A", "Marca B", "Marca C", "Marca D", "Marca E"], values: [3.2, 2.8, 2.1, 1.6, 0.9] },
    { name: "Servicos Extras", labels: ["Marca A", "Marca B", "Marca C", "Marca D", "Marca E"], values: [1.5, 1.2, 0.8, 0.5, 0.3] },
  ];

  s.addChart(pptx.charts.BAR, stackData, {
    x: 0.5, y: 1.4, w: 12.3, h: 5.2,
    showTitle: true,
    title: "Receita por Marca e Segmento (R$ M)",
    titleFontSize: 12,
    titleColor: C.dark,
    barGrouping: "stacked",
    chartColors: [C.primary, C.accent, C.teal],
    showValue: true,
    valueFontSize: 8,
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 9,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 10,
    barGapWidthPct: 60,
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 11: TABELA - Drivers Operacionais
// ============================================================
function slideTabela(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Drivers Operacionais", "Indicadores por Aluno", 11);

  // Header row
  const headerRow = DRIVERS_TABLE.columns.map(col => ({
    text: col,
    options: { fill: { color: C.primary }, color: C.white, fontSize: 10, bold: true, fontFace: "Arial", align: "center" },
  }));

  const dataRows = DRIVERS_TABLE.rows.map((row, i) =>
    row.map((cell, j) => ({
      text: String(cell),
      options: {
        fill: { color: i % 2 === 0 ? C.light : C.white },
        fontSize: 10,
        color: j >= 3 && String(cell).startsWith("+") ? C.success : j >= 3 && String(cell).startsWith("-") ? C.danger : C.dark,
        fontFace: "Arial",
        align: j === 0 ? "left" : "center",
        bold: j === 0,
      },
    }))
  );

  s.addTable([headerRow, ...dataRows], {
    x: 0.8, y: 1.5, w: 11.7,
    colW: [2.5, 1.7, 1.7, 1.5, 1.7, 1.5],
    rowH: 0.55,
    border: { type: "solid", pt: 1, color: "E5E7EB" },
    margin: [5, 8, 5, 8],
  });

  // Insights
  const insights = [
    "Custo por aluno de R$ 4.850 esta 2% abaixo do benchmark do setor",
    "Receita por aluno de R$ 6.500 mantem-se estavel vs ano anterior",
    "Oportunidade de expandir servicos extras para aumentar ticket medio",
  ];
  s.addText(insights.map(i => `  ${i}`).join("\n"), {
    x: 0.8, y: 5.3, w: 11.7, h: 1.2, fontSize: 10, color: C.dark, fontFace: "Arial", bullet: true
  });

  addFooter(s, pptx);
}

// ============================================================
// SLIDE 12: PLANO DE ACAO
// ============================================================
function slideAcoes(pptx) {
  const s = pptx.addSlide();
  addHeader(s, pptx, "Plano de Acao", "Proximos passos recomendados", 12);

  let y = 1.5;
  ACTIONS.forEach((act, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 12.33, h: 1.1, fill: { color: i % 2 === 0 ? C.light : C.white }, line: { color: C.primary, width: 1 }, rectRadius: 0.05 });

    // Numero
    s.addShape(pptx.ShapeType.rect, { x: 0.7, y: y + 0.2, w: 0.55, h: 0.55, fill: { color: C.primary }, rectRadius: 0.28 });
    s.addText(`${i + 1}`, { x: 0.7, y: y + 0.2, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: C.white, fontFace: "Arial", align: "center", valign: "middle" });

    // Acao
    s.addText(act.action, { x: 1.5, y: y + 0.12, w: 7.0, h: 0.4, fontSize: 11, bold: true, color: C.dark, fontFace: "Arial" });
    s.addText(`${act.owner}  |  ${act.eta}`, { x: 1.5, y: y + 0.55, w: 7.0, h: 0.3, fontSize: 9, color: C.medium, fontFace: "Arial" });

    // Impacto
    s.addText(act.impact, { x: 8.8, y: y + 0.3, w: 3.7, h: 0.4, fontSize: 10, color: C.accent, fontFace: "Arial", align: "right", bold: true });

    y += 1.25;
  });

  addFooter(s, pptx);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("Gerando PPT com graficos nativos...\n");

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DRE RAIZ - Chart Blueprint Test";
  pptx.title = "Analise Financeira - RAIZ EDUCACAO";
  pptx.subject = "Teste de qualidade de graficos";

  // Gerar todos os slides
  slideCapa(pptx);         // 1  - Capa
  slideSumario(pptx);      // 2  - Sumario Executivo
  slideKPIs(pptx);         // 3  - KPIs + Barras Agrupadas
  slideLinhas(pptx);       // 4  - Line Chart (Receita + EBITDA R12)
  slideWaterfall(pptx);    // 5  - Waterfall (Ponte EBITDA)
  slidePareto(pptx);       // 6  - Pareto (Variacoes de Custo)
  slidePie(pptx);          // 7  - Pie + Donut
  slideHeatmap(pptx);      // 8  - Heatmap (Tabela colorida)
  slideArea(pptx);         // 9  - Area Chart (Acumulado)
  slideStackedBar(pptx);   // 10 - Stacked Bar (Composicao)
  slideTabela(pptx);       // 11 - Tabela de Drivers
  slideAcoes(pptx);        // 12 - Plano de Acao

  const filePath = resolve(OUTPUT_DIR, "Analise-Financeira-Charts-Test.pptx");

  // pptxgenjs no Node gera um Buffer com writeFile quando path e string
  // Mas writeFile no Node espera um path, vamos usar write() que retorna o buffer
  const buf = await pptx.write({ outputType: "nodebuffer" });

  const { writeFileSync } = await import("fs");
  writeFileSync(filePath, buf);

  console.log(`PPT gerado com sucesso!`);
  console.log(`Arquivo: ${filePath}`);
  console.log(`\n12 slides gerados:`);
  console.log(`  1. Capa`);
  console.log(`  2. Sumario Executivo`);
  console.log(`  3. KPIs + Barras Agrupadas (grouped bar)`);
  console.log(`  4. Evolucao Receita/EBITDA (line chart)`);
  console.log(`  5. Ponte EBITDA (waterfall/stacked bar)`);
  console.log(`  6. Variacoes de Custo (pareto/bar)`);
  console.log(`  7. Composicao de Custos (pie + donut)`);
  console.log(`  8. Mapa de Calor (heatmap/tabela)`);
  console.log(`  9. Evolucao Acumulada (area chart)`);
  console.log(` 10. Composicao por Marca (stacked bar)`);
  console.log(` 11. Drivers Operacionais (tabela)`);
  console.log(` 12. Plano de Acao`);
  console.log(`\nTipos de grafico testados: LINE, BAR (clustered), BAR (stacked/waterfall), PIE, DOUGHNUT, AREA, HEATMAP (tabela), TABLE`);
}

main().catch(err => { console.error("Erro:", err); process.exit(1); });
