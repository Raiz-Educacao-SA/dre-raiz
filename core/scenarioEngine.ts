// ============================================
// Core Scenario Engine — Strategic Simulation Lab
// Funcoes puras — zero side effects, zero I/O
// Simulacoes NAO alteram dados reais
// Todos os cenarios sao isolados
// ============================================

import type {
  FinancialInputs,
  ScoreInputs,
  ScoreResult,
  ForecastResult,
  OptimizationResult,
  TimeSeriesPoint,
  CutCandidate,
} from './decisionTypes';
import { calculateEbitda, calculateMargin, calculateMarginAbsolute } from './financialModel';
import { evaluateScore } from './scoreModel';
import { computeForecast } from './forecastModel';
import { runOptimization } from './optimizationEngine';

// --------------------------------------------
// Types
// --------------------------------------------

/** Configuracao de um cenario de simulacao */
export interface ScenarioConfig {
  /** Nome do cenario (ex: "Otimista", "Conservador") */
  name: string;
  /** Descricao opcional */
  description?: string;

  // --- Alavancas de receita ---
  /** Variacao de receita em % (ex: 10 = +10%, -5 = -5%) */
  revenue_variation_pct?: number;
  /**
   * Variacao de ticket medio em %.
   * Quando definido junto com student_count_variation_pct,
   * os efeitos sao multiplicativos (receita = ticket * alunos).
   * Se revenue_variation_pct tambem for definido, ticket/alunos tem prioridade.
   */
  ticket_variation_pct?: number;
  /** Variacao de numero de alunos em % */
  student_count_variation_pct?: number;

  // --- Alavancas de custo ---
  /** Variacao de custos variaveis em % */
  variable_cost_variation_pct?: number;
  /** Variacao de custos fixos em % */
  fixed_cost_variation_pct?: number;
  /** Variacao de SG&A em % */
  sga_variation_pct?: number;

  // --- Alavancas especiais ---
  /** Investimento adicional (valor positivo = custo adicionado ao SGA) */
  additional_investment?: number;
  /** Reducao de bolsa/desconto (% de economia na receita) */
  scholarship_reduction_pct?: number;
  /** Target score para otimizacao (default: 85) */
  target_score?: number;
}

/** Dados base para simulacao */
export interface SimulationBaseData {
  /** Financials atuais (cenario real) */
  financials: FinancialInputs;
  /** Score inputs atuais */
  score_inputs: ScoreInputs;
  /** Serie historica (para forecast) */
  historical_series: TimeSeriesPoint[];
  /** Candidatos a corte (para optimization) */
  cut_candidates: CutCandidate[];
}

/** Resumo financeiro do cenario simulado */
export interface SimulatedFinancialSummary {
  receita: number;
  custos_variaveis: number;
  custos_fixos: number;
  sga: number;
  rateio: number;
  margem_contribuicao: number;
  margem_contribuicao_pct: number;
  ebitda: number;
  ebitda_pct: number;
}

/** Delta entre cenario simulado e base */
export interface ScenarioDelta {
  receita_delta: number;
  receita_delta_pct: number;
  custos_variaveis_delta: number;
  custos_fixos_delta: number;
  sga_delta: number;
  margem_delta: number;
  margem_delta_pp: number;
  ebitda_delta: number;
  ebitda_delta_pct: number;
  score_delta: number;
}

/** Resultado completo de uma simulacao */
export interface ScenarioSimulationResult {
  /** Configuracao do cenario */
  config: ScenarioConfig;
  /** Resumo financeiro simulado */
  financial_summary: SimulatedFinancialSummary;
  /** Score simulado */
  score: ScoreResult;
  /** Forecast simulado (baseado no cenario) */
  forecast: ForecastResult;
  /** Optimization simulada */
  optimization: OptimizationResult;
  /** Delta vs base real */
  delta_vs_base: ScenarioDelta;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Aplica variacao percentual a um valor. Ex: applyPctChange(100, 10) → 110 */
function applyPctChange(value: number, pctChange: number | undefined): number {
  if (pctChange === undefined || pctChange === 0) return value;
  return round2(value * (1 + pctChange / 100));
}

/** Divisao segura */
function safeDiv(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return num / den;
}

// --------------------------------------------
// Revenue Simulation
// --------------------------------------------

/**
 * Calcula a receita simulada considerando as alavancas de receita.
 *
 * Prioridade das alavancas:
 * 1. Se ticket_variation_pct ou student_count_variation_pct definidos:
 *    receita = base * ticketFactor * studentFactor
 *    (revenue_variation_pct e ignorado — granular substitui generico)
 * 2. Senao se revenue_variation_pct definido:
 *    receita = base * (1 + revenue_variation_pct/100)
 * 3. scholarship_reduction_pct: adicao direta (% da base)
 *
 * Ticket e student_count sao multiplicativos entre si.
 */
export function simulateRevenue(
  baseRevenue: number,
  config: ScenarioConfig,
): number {
  let revenue = baseRevenue;

  const hasTicketOrStudent =
    config.ticket_variation_pct !== undefined ||
    config.student_count_variation_pct !== undefined;

  if (hasTicketOrStudent) {
    // Ticket x alunos tem prioridade (mais granular substitui generico)
    const ticketFactor = 1 + (config.ticket_variation_pct ?? 0) / 100;
    const studentFactor = 1 + (config.student_count_variation_pct ?? 0) / 100;
    revenue = round2(baseRevenue * ticketFactor * studentFactor);
  } else if (config.revenue_variation_pct !== undefined) {
    // Variacao direta da receita
    revenue = applyPctChange(revenue, config.revenue_variation_pct);
  }

  // Reducao de bolsa = adicao direta a receita (% da receita base)
  if (config.scholarship_reduction_pct !== undefined && config.scholarship_reduction_pct !== 0) {
    revenue = round2(revenue + Math.abs(baseRevenue) * (config.scholarship_reduction_pct / 100));
  }

  return revenue;
}

// --------------------------------------------
// Apply Scenario to Financials
// --------------------------------------------

/**
 * Aplica a configuracao do cenario sobre os financials base.
 * Retorna NOVOS FinancialInputs — base NUNCA e mutado.
 *
 * Custos sao negativos no modelo DRE:
 * - Uma "reducao de custo" (ex: -10%) torna o custo MENOS negativo
 * - Uma "aumento de custo" (ex: +10%) torna o custo MAIS negativo
 *
 * Para custos, applyPctChange funciona corretamente:
 * - custo = -1000, variacao = -10% → -1000 * 0.9 = -900 (menos negativo = economia)
 * - custo = -1000, variacao = +10% → -1000 * 1.1 = -1100 (mais negativo = mais custo)
 */
export function applyScenarioToFinancials(
  base: FinancialInputs,
  config: ScenarioConfig,
): FinancialInputs {
  const newReceita = simulateRevenue(base.receita_real, config);
  const newCV = applyPctChange(base.custos_variaveis_real, config.variable_cost_variation_pct);
  const newCF = applyPctChange(base.custos_fixos_real, config.fixed_cost_variation_pct);

  let newSGA = applyPctChange(base.sga_real, config.sga_variation_pct);

  // Investimento adicional entra como custo no SGA (valor positivo = custo)
  if (config.additional_investment !== undefined && config.additional_investment !== 0) {
    newSGA = round2(newSGA - Math.abs(config.additional_investment));
  }

  return {
    receita_real: newReceita,
    receita_orcado: base.receita_orcado,
    custos_variaveis_real: newCV,
    custos_variaveis_orcado: base.custos_variaveis_orcado,
    custos_fixos_real: newCF,
    custos_fixos_orcado: base.custos_fixos_orcado,
    sga_real: newSGA,
    sga_orcado: base.sga_orcado,
    rateio_real: base.rateio_real,
    rateio_orcado: base.rateio_orcado,
  };
}

// --------------------------------------------
// Build Simulated Financial Summary
// --------------------------------------------

/**
 * Constroi resumo financeiro a partir de FinancialInputs simulados.
 */
export function buildSimulatedSummary(inputs: FinancialInputs): SimulatedFinancialSummary {
  const margem = calculateMarginAbsolute(inputs.receita_real, inputs.custos_variaveis_real);
  const margemPct = calculateMargin(inputs.receita_real, inputs.custos_variaveis_real);
  const ebitda = calculateEbitda(inputs);
  const ebitdaPct = round2(safeDiv(ebitda, Math.abs(inputs.receita_real)) * 100);

  return {
    receita: inputs.receita_real,
    custos_variaveis: inputs.custos_variaveis_real,
    custos_fixos: inputs.custos_fixos_real,
    sga: inputs.sga_real,
    rateio: inputs.rateio_real,
    margem_contribuicao: margem,
    margem_contribuicao_pct: margemPct,
    ebitda,
    ebitda_pct: ebitdaPct,
  };
}

// --------------------------------------------
// Build Score Inputs for Scenario
// --------------------------------------------

/**
 * Constroi ScoreInputs para o cenario simulado.
 * Usa os financials simulados + score_inputs base para campos
 * que nao mudam com a simulacao (confidence, priorities, conflicts).
 */
export function buildScenarioScoreInputs(
  simulatedFinancials: FinancialInputs,
  baseScoreInputs: ScoreInputs,
): ScoreInputs {
  const margin = calculateMargin(
    simulatedFinancials.receita_real,
    simulatedFinancials.custos_variaveis_real,
  );
  const marginOrcado = calculateMargin(
    simulatedFinancials.receita_orcado,
    simulatedFinancials.custos_variaveis_orcado,
  );
  const ebitda = calculateEbitda(simulatedFinancials);

  return {
    confidence: baseScoreInputs.confidence,
    margin_real: margin,
    margin_orcado: marginOrcado,
    ebitda_real: ebitda,
    ebitda_a1: baseScoreInputs.ebitda_a1,
    high_priority_count: baseScoreInputs.high_priority_count,
    conflicts_count: baseScoreInputs.conflicts_count,
  };
}

// --------------------------------------------
// Build Historical Series for Scenario Forecast
// --------------------------------------------

/**
 * Constroi serie historica ajustada para o cenario.
 * Adiciona o ponto simulado como ultimo ponto da serie.
 */
export function buildScenarioSeries(
  historicalSeries: TimeSeriesPoint[],
  simulatedScore: number,
  simulatedMargin: number,
  simulatedEbitda: number,
): TimeSeriesPoint[] {
  const base = historicalSeries.map(p => ({ ...p }));
  base.push({
    score: simulatedScore,
    margin: simulatedMargin,
    ebitda: simulatedEbitda,
  });
  return base;
}

// --------------------------------------------
// Calculate Delta
// --------------------------------------------

/**
 * Calcula deltas entre cenario simulado e base real.
 */
export function calculateScenarioDelta(
  baseFinancials: FinancialInputs,
  simulatedSummary: SimulatedFinancialSummary,
  baseScore: number,
  simulatedScore: number,
): ScenarioDelta {
  const baseMargin = calculateMargin(baseFinancials.receita_real, baseFinancials.custos_variaveis_real);
  const baseEbitda = calculateEbitda(baseFinancials);

  return {
    receita_delta: round2(simulatedSummary.receita - baseFinancials.receita_real),
    receita_delta_pct: round2(
      safeDiv(simulatedSummary.receita - baseFinancials.receita_real, Math.abs(baseFinancials.receita_real)) * 100,
    ),
    custos_variaveis_delta: round2(simulatedSummary.custos_variaveis - baseFinancials.custos_variaveis_real),
    custos_fixos_delta: round2(simulatedSummary.custos_fixos - baseFinancials.custos_fixos_real),
    sga_delta: round2(simulatedSummary.sga - baseFinancials.sga_real),
    margem_delta: round2(simulatedSummary.margem_contribuicao - calculateMarginAbsolute(baseFinancials.receita_real, baseFinancials.custos_variaveis_real)),
    margem_delta_pp: round2(simulatedSummary.margem_contribuicao_pct - baseMargin),
    ebitda_delta: round2(simulatedSummary.ebitda - baseEbitda),
    ebitda_delta_pct: round2(
      safeDiv(simulatedSummary.ebitda - baseEbitda, Math.abs(baseEbitda)) * 100,
    ),
    score_delta: round2(simulatedScore - baseScore),
  };
}

// --------------------------------------------
// Main: Run Scenario Simulation
// --------------------------------------------

/**
 * Executa simulacao completa de um cenario estrategico.
 *
 * Funcao pura. NAO muta baseData.
 * Retorna resultado isolado com:
 * - new_financial_summary: resumo financeiro simulado
 * - new_score: health score simulado
 * - new_forecast: projecao baseada no cenario
 * - new_optimization_result: oportunidades de otimizacao
 * - delta_vs_base: diferencas vs cenario real
 *
 * @param baseData - Dados reais atuais (read-only)
 * @param config - Configuracao do cenario (alavancas)
 */
export function runScenarioSimulation(
  baseData: SimulationBaseData,
  config: ScenarioConfig,
): ScenarioSimulationResult {
  // 1. Aplica cenario nos financials (cria NOVOS objetos)
  const simulatedFinancials = applyScenarioToFinancials(
    baseData.financials,
    config,
  );

  // 2. Constroi resumo financeiro
  const financialSummary = buildSimulatedSummary(simulatedFinancials);

  // 3. Calcula score simulado
  const scenarioScoreInputs = buildScenarioScoreInputs(
    simulatedFinancials,
    baseData.score_inputs,
  );
  const scoreResult = evaluateScore(scenarioScoreInputs);

  // 4. Constroi serie para forecast
  const forecastSeries = buildScenarioSeries(
    baseData.historical_series,
    scoreResult.score,
    financialSummary.margem_contribuicao_pct,
    financialSummary.ebitda,
  );
  const forecastResult = computeForecast(forecastSeries);

  // 5. Otimizacao com os novos financials
  const optimizationResult = runOptimization({
    current_financials: simulatedFinancials,
    current_score_inputs: scenarioScoreInputs,
    candidates: baseData.cut_candidates.map(c => ({ ...c })),
    target_score: config.target_score ?? 85,
  });

  // 6. Calcula deltas vs base
  const baseScore = evaluateScore(baseData.score_inputs).score;
  const delta = calculateScenarioDelta(
    baseData.financials,
    financialSummary,
    baseScore,
    scoreResult.score,
  );

  return {
    config: { ...config },
    financial_summary: financialSummary,
    score: scoreResult,
    forecast: forecastResult,
    optimization: optimizationResult,
    delta_vs_base: delta,
  };
}

// --------------------------------------------
// Batch: Run Multiple Scenarios
// --------------------------------------------

/**
 * Executa multiplos cenarios sobre a mesma base.
 * Cada cenario e isolado — sem contaminacao cruzada.
 */
export function runMultipleScenarios(
  baseData: SimulationBaseData,
  configs: ScenarioConfig[],
): ScenarioSimulationResult[] {
  return configs.map(config => runScenarioSimulation(baseData, config));
}

// --------------------------------------------
// Preset Scenarios (convenience)
// --------------------------------------------

/** Cenario otimista: +10% receita, -5% CV, -3% SGA */
export const PRESET_OPTIMISTIC = {
  name: 'Otimista',
  description: 'Crescimento de receita com reducao moderada de custos',
  revenue_variation_pct: 10,
  variable_cost_variation_pct: -5,
  sga_variation_pct: -3,
} as const satisfies ScenarioConfig;

/** Cenario conservador: +3% receita, custos estaveis */
export const PRESET_CONSERVATIVE = {
  name: 'Conservador',
  description: 'Crescimento organico minimo, custos estaveis',
  revenue_variation_pct: 3,
} as const satisfies ScenarioConfig;

/** Cenario pessimista: -10% receita, +5% custos fixos */
export const PRESET_PESSIMISTIC = {
  name: 'Pessimista',
  description: 'Queda de receita com aumento de custos fixos',
  revenue_variation_pct: -10,
  fixed_cost_variation_pct: 5,
} as const satisfies ScenarioConfig;

/** Cenario de investimento: +15% receita, investimento de 500K */
export const PRESET_INVESTMENT = {
  name: 'Investimento',
  description: 'Aposta em crescimento com investimento significativo',
  revenue_variation_pct: 15,
  additional_investment: 500000,
} as const satisfies ScenarioConfig;

/** Cenario de eficiencia: receita estavel, -10% CV, -8% CF, -5% SGA */
export const PRESET_EFFICIENCY = {
  name: 'Eficiencia Operacional',
  description: 'Foco em reducao de custos sem alterar receita',
  variable_cost_variation_pct: -10,
  fixed_cost_variation_pct: -8,
  sga_variation_pct: -5,
} as const satisfies ScenarioConfig;

// --------------------------------------------
// Macro Scenario Presets
// Traduzem condicoes macroeconomicas em variações de ScenarioConfig
// Cada preset simula o impacto provável de um cenário macro
// nos financials da empresa
// --------------------------------------------

/** Recessao Leve: PIB ~0%, inflacao moderada, demanda cai */
export const PRESET_MACRO_MILD_RECESSION = {
  name: 'Recessão Leve',
  description: 'PIB estagnado, demanda educacional cai levemente, custos sobem com inflação',
  revenue_variation_pct: -5,
  variable_cost_variation_pct: 3,
  fixed_cost_variation_pct: 2,
  sga_variation_pct: 1,
} as const satisfies ScenarioConfig;

/** Recessao Forte: PIB negativo, desemprego alto, inadimplencia sobe */
export const PRESET_MACRO_SEVERE_RECESSION = {
  name: 'Recessão Forte',
  description: 'PIB em contração, desemprego elevado, queda forte de demanda e inadimplência alta',
  revenue_variation_pct: -15,
  variable_cost_variation_pct: 5,
  fixed_cost_variation_pct: 4,
  sga_variation_pct: 3,
  student_count_variation_pct: -10,
} as const satisfies ScenarioConfig;

/** Crescimento Acelerado: PIB alto, setor aquecido, demanda cresce */
export const PRESET_MACRO_ACCELERATED_GROWTH = {
  name: 'Crescimento Acelerado',
  description: 'PIB acima de 4%, setor educacional aquecido, demanda e ticket crescem',
  revenue_variation_pct: 12,
  student_count_variation_pct: 8,
  variable_cost_variation_pct: 2,
  fixed_cost_variation_pct: 1,
} as const satisfies ScenarioConfig;

/** Inflacao Alta: IPCA acima de 8%, pressao generalizada nos custos */
export const PRESET_MACRO_HIGH_INFLATION = {
  name: 'Inflação Alta',
  description: 'IPCA acima de 8%, pressão forte nos custos, receita não acompanha',
  revenue_variation_pct: 2,
  variable_cost_variation_pct: 8,
  fixed_cost_variation_pct: 5,
  sga_variation_pct: 4,
} as const satisfies ScenarioConfig;

/** Juros Elevados: SELIC acima de 14%, custo financeiro alto, investimento cai */
export const PRESET_MACRO_HIGH_INTEREST = {
  name: 'Juros Elevados',
  description: 'SELIC elevada, custo financeiro sobe, famílias reduzem gastos com educação',
  revenue_variation_pct: -3,
  student_count_variation_pct: -5,
  sga_variation_pct: 2,
} as const satisfies ScenarioConfig;

/** Cenario Estagflacao: inflacao alta + recessao (pior cenario) */
export const PRESET_MACRO_STAGFLATION = {
  name: 'Estagflação',
  description: 'Inflação alta com recessão simultânea — pior cenário macro',
  revenue_variation_pct: -10,
  variable_cost_variation_pct: 8,
  fixed_cost_variation_pct: 6,
  sga_variation_pct: 4,
  student_count_variation_pct: -8,
} as const satisfies ScenarioConfig;
