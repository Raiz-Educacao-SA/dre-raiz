// ============================================
// Core Score Model
// Funções puras — zero side effects, zero I/O
// ============================================

import type {
  ScoreInputs,
  ScoreBreakdown,
  ScoreClassification,
  ScoreResult,
  AlertDecision,
  AlertConfig,
  TrendSeries,
  ScoreConfig,
  ModelConfig,
  DecisionModelRow,
} from './decisionTypes';
import { isDecreasingTrend, isIncreasingTrend } from './forecastModel';

// --------------------------------------------
// Default Configs (hardcoded fallback)
// --------------------------------------------

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  base_score: 100,
  penalty_confidence_threshold: 80,
  penalty_confidence_factor: 0.5,
  penalty_margin_factor: 2,
  penalty_ebitda_fixed: 5,
  penalty_high_priority_threshold: 3,
  penalty_high_priority_fixed: 5,
  penalty_conflicts_fixed: 3,
  classification_healthy: 85,
  classification_attention: 70,
};

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  score_critical: 70,
  margin_gap: 2,
  high_priority_threshold: 3,
  conflicts_threshold: 2,
};

/**
 * Converte um registro da tabela decision_models em ModelConfig.
 * Função pura — zero I/O.
 */
export function parseModelConfig(row: DecisionModelRow): ModelConfig {
  return {
    score: {
      base_score: row.base_score,
      penalty_confidence_threshold: row.penalty_confidence_threshold,
      penalty_confidence_factor: row.penalty_confidence_factor,
      penalty_margin_factor: row.penalty_margin_factor,
      penalty_ebitda_fixed: row.penalty_ebitda_fixed,
      penalty_high_priority_threshold: row.penalty_high_priority_threshold,
      penalty_high_priority_fixed: row.penalty_high_priority_fixed,
      penalty_conflicts_fixed: row.penalty_conflicts_fixed,
      classification_healthy: row.classification_healthy,
      classification_attention: row.classification_attention,
    },
    alert: {
      score_critical: row.alert_score_critical,
      margin_gap: row.alert_margin_gap,
      high_priority_threshold: row.alert_high_priority_threshold,
      conflicts_threshold: row.alert_conflicts_threshold,
    },
    optimization: {
      fractions: row.optimization_fractions,
      max_cut_pct: row.optimization_max_cut_pct,
    },
  };
}

// --------------------------------------------
// Score Calculation
// --------------------------------------------

/**
 * Calcula o Financial Health Score (0–100).
 *
 * Regras de penalidade:
 * - confidence < 80 → (80 - confidence) * 0.5
 * - margin_real < margin_orcado → diff * 2
 * - ebitda_real < ebitda_a1 → 5
 * - high_priority_count > 3 → 5
 * - conflicts_count > 0 → 3
 */
export function calculateScore(inputs: ScoreInputs): number {
  const breakdown = calculateScoreBreakdown(inputs);
  return breakdown.final_score;
}

// --------------------------------------------
// Score Breakdown
// --------------------------------------------

/**
 * Calcula o score com breakdown detalhado de cada penalidade.
 */
export function calculateScoreBreakdown(inputs: ScoreInputs): ScoreBreakdown {
  let penaltyConfidence = 0;
  let penaltyMargin = 0;
  let penaltyEbitda = 0;
  let penaltyHighPriority = 0;
  let penaltyConflicts = 0;

  if (inputs.confidence < 80) {
    penaltyConfidence = (80 - inputs.confidence) * 0.5;
  }

  if (inputs.margin_real < inputs.margin_orcado) {
    penaltyMargin = (inputs.margin_orcado - inputs.margin_real) * 2;
  }

  if (inputs.ebitda_real < inputs.ebitda_a1) {
    penaltyEbitda = 5;
  }

  if (inputs.high_priority_count > 3) {
    penaltyHighPriority = 5;
  }

  if (inputs.conflicts_count > 0) {
    penaltyConflicts = 3;
  }

  const totalPenalty =
    penaltyConfidence +
    penaltyMargin +
    penaltyEbitda +
    penaltyHighPriority +
    penaltyConflicts;

  const finalScore = Math.max(0, Math.round(100 - totalPenalty));

  return {
    base: 100,
    penalty_confidence: penaltyConfidence,
    penalty_margin: penaltyMargin,
    penalty_ebitda: penaltyEbitda,
    penalty_high_priority: penaltyHighPriority,
    penalty_conflicts: penaltyConflicts,
    final_score: finalScore,
  };
}

// --------------------------------------------
// Classification
// --------------------------------------------

/**
 * Classifica o score em faixas:
 * >= 85 → "Saudável"
 * 70–84 → "Atenção"
 * < 70 → "Crítico"
 */
export function classifyScore(score: number): ScoreClassification {
  if (score >= 85) return 'Saudável';
  if (score >= 70) return 'Atenção';
  return 'Crítico';
}

// --------------------------------------------
// Full Result (convenience)
// --------------------------------------------

/**
 * Calcula score + classificação + breakdown completo.
 */
export function evaluateScore(inputs: ScoreInputs): ScoreResult {
  const breakdown = calculateScoreBreakdown(inputs);
  return {
    score: breakdown.final_score,
    classification: classifyScore(breakdown.final_score),
    breakdown,
  };
}

// --------------------------------------------
// Config-Aware Score (dynamic model)
// --------------------------------------------

/**
 * Calcula score usando configuração dinâmica do modelo.
 * Mesma lógica de calculateScoreBreakdown, mas com thresholds/fatores configuráveis.
 */
export function calculateScoreWithConfig(
  inputs: ScoreInputs,
  config: ScoreConfig,
): ScoreBreakdown {
  let penaltyConfidence = 0;
  let penaltyMargin = 0;
  let penaltyEbitda = 0;
  let penaltyHighPriority = 0;
  let penaltyConflicts = 0;

  if (inputs.confidence < config.penalty_confidence_threshold) {
    penaltyConfidence =
      (config.penalty_confidence_threshold - inputs.confidence) *
      config.penalty_confidence_factor;
  }

  if (inputs.margin_real < inputs.margin_orcado) {
    penaltyMargin =
      (inputs.margin_orcado - inputs.margin_real) *
      config.penalty_margin_factor;
  }

  if (inputs.ebitda_real < inputs.ebitda_a1) {
    penaltyEbitda = config.penalty_ebitda_fixed;
  }

  if (inputs.high_priority_count > config.penalty_high_priority_threshold) {
    penaltyHighPriority = config.penalty_high_priority_fixed;
  }

  if (inputs.conflicts_count > 0) {
    penaltyConflicts = config.penalty_conflicts_fixed;
  }

  const totalPenalty =
    penaltyConfidence +
    penaltyMargin +
    penaltyEbitda +
    penaltyHighPriority +
    penaltyConflicts;

  const finalScore = Math.max(0, Math.round(config.base_score - totalPenalty));

  return {
    base: 100,
    penalty_confidence: penaltyConfidence,
    penalty_margin: penaltyMargin,
    penalty_ebitda: penaltyEbitda,
    penalty_high_priority: penaltyHighPriority,
    penalty_conflicts: penaltyConflicts,
    final_score: finalScore,
  };
}

/**
 * Classifica score usando thresholds dinâmicos.
 */
export function classifyScoreWithConfig(
  score: number,
  config: ScoreConfig,
): ScoreClassification {
  if (score >= config.classification_healthy) return 'Saudável';
  if (score >= config.classification_attention) return 'Atenção';
  return 'Crítico';
}

/**
 * Avalia score completo com configuração dinâmica.
 */
export function evaluateScoreWithConfig(
  inputs: ScoreInputs,
  config: ScoreConfig,
): ScoreResult {
  const breakdown = calculateScoreWithConfig(inputs, config);
  return {
    score: breakdown.final_score,
    classification: classifyScoreWithConfig(breakdown.final_score, config),
    breakdown,
  };
}

// --------------------------------------------
// Alert Evaluation (pure)
// --------------------------------------------

/**
 * Avalia regras de alerta instantâneo.
 * Retorna lista de alertas (pode ser vazia).
 */
export function evaluateAlertRules(
  inputs: ScoreInputs,
  healthScore: number,
): AlertDecision[] {
  const alerts: AlertDecision[] = [];

  if (healthScore < 70) {
    alerts.push({
      alert_type: 'HEALTH_SCORE_CRITICAL',
      severity: 'high',
      message: `Health Score crítico: ${healthScore}/100`,
      metric_value: healthScore,
      threshold_value: 70,
    });
  }

  if (inputs.margin_real < inputs.margin_orcado - 2) {
    alerts.push({
      alert_type: 'LOW_MARGIN',
      severity: 'medium',
      message: `Margem real (${inputs.margin_real.toFixed(1)}%) abaixo do orçado (${inputs.margin_orcado.toFixed(1)}%) em mais de 2pp`,
      metric_value: inputs.margin_real,
      threshold_value: inputs.margin_orcado - 2,
    });
  }

  if (inputs.ebitda_real < inputs.ebitda_a1) {
    alerts.push({
      alert_type: 'EBITDA_DROP',
      severity: 'medium',
      message: `EBITDA real abaixo do A-1`,
      metric_value: inputs.ebitda_real,
      threshold_value: inputs.ebitda_a1,
    });
  }

  if (inputs.high_priority_count > 3) {
    alerts.push({
      alert_type: 'TOO_MANY_HIGH_PRIORITY',
      severity: 'medium',
      message: `${inputs.high_priority_count} recomendações de alta prioridade identificadas`,
      metric_value: inputs.high_priority_count,
      threshold_value: 3,
    });
  }

  if (inputs.conflicts_count > 2) {
    alerts.push({
      alert_type: 'AGENT_CONFLICTS',
      severity: 'low',
      message: `${inputs.conflicts_count} conflitos entre agentes detectados`,
      metric_value: inputs.conflicts_count,
      threshold_value: 2,
    });
  }

  return alerts;
}

/**
 * Avalia regras de alerta com thresholds dinâmicos.
 */
export function evaluateAlertRulesWithConfig(
  inputs: ScoreInputs,
  healthScore: number,
  config: AlertConfig,
): AlertDecision[] {
  const alerts: AlertDecision[] = [];

  if (healthScore < config.score_critical) {
    alerts.push({
      alert_type: 'HEALTH_SCORE_CRITICAL',
      severity: 'high',
      message: `Health Score crítico: ${healthScore}/100`,
      metric_value: healthScore,
      threshold_value: config.score_critical,
    });
  }

  if (inputs.margin_real < inputs.margin_orcado - config.margin_gap) {
    alerts.push({
      alert_type: 'LOW_MARGIN',
      severity: 'medium',
      message: `Margem real (${inputs.margin_real.toFixed(1)}%) abaixo do orçado (${inputs.margin_orcado.toFixed(1)}%) em mais de ${config.margin_gap}pp`,
      metric_value: inputs.margin_real,
      threshold_value: inputs.margin_orcado - config.margin_gap,
    });
  }

  if (inputs.ebitda_real < inputs.ebitda_a1) {
    alerts.push({
      alert_type: 'EBITDA_DROP',
      severity: 'medium',
      message: `EBITDA real abaixo do A-1`,
      metric_value: inputs.ebitda_real,
      threshold_value: inputs.ebitda_a1,
    });
  }

  if (inputs.high_priority_count > config.high_priority_threshold) {
    alerts.push({
      alert_type: 'TOO_MANY_HIGH_PRIORITY',
      severity: 'medium',
      message: `${inputs.high_priority_count} recomendações de alta prioridade identificadas`,
      metric_value: inputs.high_priority_count,
      threshold_value: config.high_priority_threshold,
    });
  }

  if (inputs.conflicts_count > config.conflicts_threshold) {
    alerts.push({
      alert_type: 'AGENT_CONFLICTS',
      severity: 'low',
      message: `${inputs.conflicts_count} conflitos entre agentes detectados`,
      metric_value: inputs.conflicts_count,
      threshold_value: config.conflicts_threshold,
    });
  }

  return alerts;
}

/**
 * Avalia alertas de tendência a partir de séries históricas.
 */
export function evaluateTrendAlertRules(series: TrendSeries): AlertDecision[] {
  const alerts: AlertDecision[] = [];
  const { scores, margins, confidences, high_priority_counts } = series;

  if (isDecreasingTrend(scores)) {
    alerts.push({
      alert_type: 'TREND_SCORE_DOWN',
      severity: 'high',
      message: `Health Score em queda por 3 runs consecutivos (último: ${scores[scores.length - 1]}/100)`,
      metric_value: scores[scores.length - 1],
      threshold_value: scores[scores.length - 3],
    });
  }

  if (isDecreasingTrend(margins)) {
    alerts.push({
      alert_type: 'TREND_MARGIN_DOWN',
      severity: 'medium',
      message: `Margem real em queda por 3 runs consecutivos`,
      metric_value: margins[margins.length - 1],
      threshold_value: margins[margins.length - 3],
    });
  }

  if (isDecreasingTrend(confidences)) {
    alerts.push({
      alert_type: 'TREND_CONFIDENCE_DOWN',
      severity: 'low',
      message: `Confiança em queda por 3 runs consecutivos`,
      metric_value: confidences[confidences.length - 1],
      threshold_value: confidences[confidences.length - 3],
    });
  }

  if (isIncreasingTrend(high_priority_counts)) {
    alerts.push({
      alert_type: 'TREND_RISK_INCREASING',
      severity: 'medium',
      message: `Recomendações high priority aumentando por 3 runs consecutivos`,
      metric_value: high_priority_counts[high_priority_counts.length - 1],
      threshold_value: high_priority_counts[high_priority_counts.length - 3],
    });
  }

  return alerts;
}
