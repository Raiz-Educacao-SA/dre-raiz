// ============================================
// Decision Engine — Facade Central
// Unifica todas as operações do core em uma API coesa
// Zero I/O — funções puras compostas
// ============================================

import type {
  ScoreInputs,
  ScoreResult,
  FinancialInputs,
  FinancialDeltas,
  FinancialMetrics,
  TimeSeriesPoint,
  ForecastResult,
  AlertDecision,
  TrendSeries,
  OptimizationInput,
  OptimizationResult,
  MultiObjectiveInput,
  MultiObjectiveResult,
  ModelConfig,
  ScoreConfig,
  AlertConfig,
  OptimizationConfig,
  DecisionModelRow,
} from './decisionTypes';

import {
  normalizeFinancialInputs,
  applyDeltas,
  deriveMetrics,
  safePct,
} from './financialModel';

import {
  evaluateScore,
  evaluateScoreWithConfig,
  evaluateAlertRules,
  evaluateAlertRulesWithConfig,
  evaluateTrendAlertRules,
  parseModelConfig,
  DEFAULT_SCORE_CONFIG,
  DEFAULT_ALERT_CONFIG,
} from './scoreModel';

import { computeForecast } from './forecastModel';

import {
  runOptimization,
  runOptimizationWithConfig,
  runMultiObjectiveOptimization,
  DEFAULT_OPTIMIZATION_CONFIG,
} from './optimizationEngine';

// --------------------------------------------
// Full Analysis (Score + Alerts + Metrics)
// --------------------------------------------

/** Resultado completo de uma análise */
export interface FullAnalysisResult {
  score: ScoreResult;
  metrics: FinancialMetrics;
  alerts: AlertDecision[];
}

/**
 * Executa análise completa: score + métricas + alertas.
 * Usa configuração default (hardcoded).
 */
export function runAnalysis(
  scoreInputs: ScoreInputs,
  financials: FinancialInputs,
): FullAnalysisResult {
  const score = evaluateScore(scoreInputs);
  const metrics = deriveMetrics(financials);
  const alerts = evaluateAlertRules(scoreInputs, score.score);

  return { score, metrics, alerts };
}

/**
 * Executa análise completa com configuração dinâmica.
 */
export function runAnalysisWithConfig(
  scoreInputs: ScoreInputs,
  financials: FinancialInputs,
  config: ModelConfig,
): FullAnalysisResult {
  const score = evaluateScoreWithConfig(scoreInputs, config.score);
  const metrics = deriveMetrics(financials);
  const alerts = evaluateAlertRulesWithConfig(scoreInputs, score.score, config.alert);

  return { score, metrics, alerts };
}

// --------------------------------------------
// Simulation
// --------------------------------------------

/** Resultado de uma simulação */
export interface SimulationResult {
  before: { ebitda: number; margin: number; score: number };
  after: { ebitda: number; margin: number; score: number };
  delta: { ebitda_change: number; margin_change: number; score_change: number };
}

/**
 * Simula impacto de deltas financeiros.
 */
export function simulate(
  financials: FinancialInputs,
  scoreInputs: ScoreInputs,
  deltas: FinancialDeltas,
): SimulationResult {
  const metricsBefore = deriveMetrics(financials);
  const scoreBefore = evaluateScore(scoreInputs);

  const adjusted = applyDeltas(financials, deltas);
  const metricsAfter = deriveMetrics(adjusted);
  const scoreAfter = evaluateScore({
    ...scoreInputs,
    margin_real: metricsAfter.margin,
    ebitda_real: metricsAfter.ebitda,
  });

  return {
    before: {
      ebitda: metricsBefore.ebitda,
      margin: metricsBefore.margin,
      score: scoreBefore.score,
    },
    after: {
      ebitda: metricsAfter.ebitda,
      margin: metricsAfter.margin,
      score: scoreAfter.score,
    },
    delta: {
      ebitda_change: round2(metricsAfter.ebitda - metricsBefore.ebitda),
      margin_change: round2(metricsAfter.margin - metricsBefore.margin),
      score_change: scoreAfter.score - scoreBefore.score,
    },
  };
}

// --------------------------------------------
// Forecast
// --------------------------------------------

/**
 * Executa forecast a partir de série temporal.
 */
export function forecast(series: TimeSeriesPoint[]): ForecastResult {
  return computeForecast(series);
}

// --------------------------------------------
// Optimization
// --------------------------------------------

/**
 * Executa otimização simples (single-objective: maximize score).
 */
export function optimize(input: OptimizationInput): OptimizationResult {
  return runOptimization(input);
}

/**
 * Executa otimização com configuração dinâmica.
 */
export function optimizeWithConfig(
  input: OptimizationInput,
  config: OptimizationConfig,
): OptimizationResult {
  return runOptimizationWithConfig(input, config);
}

/**
 * Executa otimização multi-objetivo com constraints.
 */
export function optimizeMultiObjective(
  input: MultiObjectiveInput,
  config?: OptimizationConfig,
): MultiObjectiveResult {
  return runMultiObjectiveOptimization(input, config ?? DEFAULT_OPTIMIZATION_CONFIG);
}

// --------------------------------------------
// Trend Alerts
// --------------------------------------------

/**
 * Avalia alertas de tendência a partir de séries históricas.
 */
export function detectTrends(series: TrendSeries): AlertDecision[] {
  return evaluateTrendAlertRules(series);
}

// --------------------------------------------
// Config
// --------------------------------------------

/**
 * Converte registro do banco (decision_models) em ModelConfig.
 */
export function loadConfig(row: DecisionModelRow): ModelConfig {
  return parseModelConfig(row);
}

/**
 * Retorna configuração default completa.
 */
export function getDefaultConfig(): ModelConfig {
  return {
    score: DEFAULT_SCORE_CONFIG,
    alert: DEFAULT_ALERT_CONFIG,
    optimization: DEFAULT_OPTIMIZATION_CONFIG,
  };
}

// --------------------------------------------
// Utilities (re-exports for convenience)
// --------------------------------------------

export {
  normalizeFinancialInputs,
  applyDeltas,
  deriveMetrics,
  safePct,
} from './financialModel';

export {
  evaluateScore,
  evaluateScoreWithConfig,
  calculateScore,
  classifyScore,
  classifyScoreWithConfig,
} from './scoreModel';

export { computeForecast } from './forecastModel';

export {
  runOptimization,
  runMultiObjectiveOptimization,
} from './optimizationEngine';

// --------------------------------------------
// Helper
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
