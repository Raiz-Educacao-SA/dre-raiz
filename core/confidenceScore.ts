// ============================================
// Core Confidence Score — Adaptive Intelligence
// Funções puras — zero side effects, zero I/O
// Calcula nível de confiança (0-100) nas decisões
// ============================================

import type { ForecastErrorResult, ScoreStabilityResult } from './feedbackEngine';
import type { CalibrationResult } from './modelCalibration';

// --------------------------------------------
// Types
// --------------------------------------------

/** Inputs para cálculo do nível de confiança */
export interface ConfidenceInputs {
  /** Tamanho da amostra de feedback (total de entries processados) */
  sample_size: number;
  /** Resultado da análise de erro de forecast (pode ser null se sem dados) */
  forecast_error: ForecastErrorResult | null;
  /** Resultado da análise de estabilidade do score (pode ser null se sem dados) */
  score_stability: ScoreStabilityResult | null;
  /** Resultado da última calibração (pode ser null se nunca calibrado) */
  last_calibration: CalibrationResult | null;
  /** Número de períodos consecutivos com dados completos */
  consecutive_periods_with_data: number;
  /** Idade dos dados mais recentes em dias (0 = hoje) */
  data_freshness_days: number;
}

/** Breakdown detalhado do confidence score */
export interface ConfidenceBreakdown {
  base: 100;
  penalty_sample_size: number;
  penalty_forecast_error: number;
  penalty_score_volatility: number;
  penalty_calibration_quality: number;
  penalty_data_freshness: number;
  bonus_consistency: number;
  final_score: number;
}

/** Classificação do nível de confiança */
export type ConfidenceLevel = 'very_high' | 'high' | 'moderate' | 'low' | 'insufficient';

/** Resultado completo do cálculo de confiança */
export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  breakdown: ConfidenceBreakdown;
  recommendation: string;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --------------------------------------------
// Confidence Score Calculation
// --------------------------------------------

/**
 * Calcula o nível de confiança (0–100) nas decisões do motor.
 *
 * Começa em 100 e aplica penalidades:
 * - sample_size < 12 → penalidade proporcional (máx -30)
 * - MAPE alto → penalidade proporcional (máx -25)
 * - Score volátil → penalidade por CV (máx -15)
 * - Calibração com muitos ajustes significativos → penalidade (máx -10)
 * - Dados antigos (>30 dias) → penalidade por idade (máx -15)
 *
 * Bônus:
 * - Períodos consecutivos com dados completos → bônus (máx +5)
 *
 * Retorna score clamped entre 0 e 100.
 */
export function calculateConfidenceLevel(inputs: ConfidenceInputs): ConfidenceResult {
  let penaltySampleSize = 0;
  let penaltyForecastError = 0;
  let penaltyScoreVolatility = 0;
  let penaltyCalibrationAge = 0;
  let penaltyDataFreshness = 0;
  let bonusConsistency = 0;

  // 1. Sample size penalty: 0 samples = -30, 12+ samples = 0
  if (inputs.sample_size < 12) {
    const ratio = inputs.sample_size / 12;
    penaltySampleSize = round2((1 - ratio) * 30);
  }

  // 2. Forecast error penalty: MAPE-based
  if (inputs.forecast_error) {
    const mape = inputs.forecast_error.mape;
    if (mape > 5) {
      // Linear scale: MAPE 5% = 0 penalty, MAPE 30% = -25 (1:1 ratio, clamped)
      penaltyForecastError = round2(clamp(mape - 5, 0, 25));
    }
    // Extra penalty for systematic deviation
    if (inputs.forecast_error.systematic_deviation) {
      penaltyForecastError = round2(Math.min(penaltyForecastError + 5, 25));
    }
  }

  // 3. Score volatility penalty: CV-based
  if (inputs.score_stability) {
    const cv = inputs.score_stability.cv;
    if (cv > 5) {
      // Linear scale: CV 5% = 0, CV 20% = -15 (1:1 ratio, clamped)
      penaltyScoreVolatility = round2(clamp(cv - 5, 0, 15));
    }
  }

  // 4. Calibration quality penalty
  if (inputs.last_calibration) {
    const sigCount = inputs.last_calibration.adjustments
      .filter(a => a.magnitude === 'significant').length;
    const totalAdj = inputs.last_calibration.total_adjustments;

    // Many significant adjustments = low confidence in current params
    if (sigCount >= 2) {
      penaltyCalibrationAge = 10;
    } else if (totalAdj >= 4) {
      penaltyCalibrationAge = 6;
    } else if (totalAdj >= 2) {
      penaltyCalibrationAge = 3;
    }
  } else {
    // Never calibrated = moderate penalty
    penaltyCalibrationAge = 5;
  }

  // 5. Data freshness penalty: 0 days = 0, 60+ days = -15
  if (inputs.data_freshness_days > 7) {
    penaltyDataFreshness = round2(
      clamp((inputs.data_freshness_days - 7) * (15 / 53), 0, 15),
    );
  }

  // 6. Consistency bonus: consecutive periods with data
  if (inputs.consecutive_periods_with_data >= 6) {
    bonusConsistency = 5;
  } else if (inputs.consecutive_periods_with_data >= 3) {
    bonusConsistency = 3;
  }

  // Calculate final score
  const totalPenalty =
    penaltySampleSize +
    penaltyForecastError +
    penaltyScoreVolatility +
    penaltyCalibrationAge +
    penaltyDataFreshness;

  const rawScore = 100 - totalPenalty + bonusConsistency;
  const finalScore = clamp(Math.round(rawScore), 0, 100);

  const breakdown: ConfidenceBreakdown = {
    base: 100,
    penalty_sample_size: penaltySampleSize,
    penalty_forecast_error: penaltyForecastError,
    penalty_score_volatility: penaltyScoreVolatility,
    penalty_calibration_quality: penaltyCalibrationAge,
    penalty_data_freshness: penaltyDataFreshness,
    bonus_consistency: bonusConsistency,
    final_score: finalScore,
  };

  const level = classifyConfidence(finalScore);
  const recommendation = generateRecommendation(level, breakdown);

  return {
    score: finalScore,
    level,
    breakdown,
    recommendation,
  };
}

// --------------------------------------------
// Classification
// --------------------------------------------

/**
 * Classifica o nível de confiança em faixas:
 * >= 85 → very_high
 * 70–84 → high
 * 55–69 → moderate
 * 40–54 → low
 * < 40 → insufficient
 */
export function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= 85) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 55) return 'moderate';
  if (score >= 40) return 'low';
  return 'insufficient';
}

// --------------------------------------------
// Recommendation
// --------------------------------------------

/**
 * Gera recomendação textual baseada no nível e breakdown.
 * Identifica o maior fator de penalidade e sugere ação.
 */
export function generateRecommendation(
  level: ConfidenceLevel,
  breakdown: ConfidenceBreakdown,
): string {
  if (level === 'very_high') {
    return 'Confiança muito alta. Decisões do motor podem ser aplicadas com segurança.';
  }

  // Find largest penalty
  const penalties = [
    { name: 'amostra insuficiente', value: breakdown.penalty_sample_size },
    { name: 'erro de previsão elevado', value: breakdown.penalty_forecast_error },
    { name: 'volatilidade do score', value: breakdown.penalty_score_volatility },
    { name: 'qualidade da calibração', value: breakdown.penalty_calibration_quality },
    { name: 'dados desatualizados', value: breakdown.penalty_data_freshness },
  ];

  // Sort descending by penalty value
  const sorted = [...penalties].sort((a, b) => b.value - a.value);
  const top = sorted[0];

  if (level === 'insufficient') {
    return `Confiança insuficiente para decisões automáticas. Principal fator: ${top.name} (-${top.value}pts). Recomendado: coletar mais dados antes de agir.`;
  }

  if (level === 'low') {
    return `Confiança baixa. Principal fator: ${top.name} (-${top.value}pts). Decisões devem ser revisadas manualmente antes da aplicação.`;
  }

  if (level === 'moderate') {
    return `Confiança moderada. Principal fator: ${top.name} (-${top.value}pts). Decisões podem ser aplicadas com supervisão.`;
  }

  // high
  return `Confiança alta. Menor fator: ${top.name} (-${top.value}pts). Decisões podem ser aplicadas com revisão periódica.`;
}

// --------------------------------------------
// Quick Confidence (convenience)
// --------------------------------------------

/**
 * Cálculo rápido de confiança para casos sem feedback detalhado.
 * Usa apenas sample_size e data_freshness_days.
 * Útil para exibir uma estimativa antes de ter feedback completo.
 */
export function quickConfidence(
  sampleSize: number,
  dataFreshnessDays: number,
): { score: number; level: ConfidenceLevel } {
  const result = calculateConfidenceLevel({
    sample_size: sampleSize,
    forecast_error: null,
    score_stability: null,
    last_calibration: null,
    consecutive_periods_with_data: Math.min(sampleSize, 12),
    data_freshness_days: dataFreshnessDays,
  });
  return { score: result.score, level: result.level };
}
