// ============================================
// Core Model Calibration — Adaptive Intelligence
// Funções puras — zero side effects, zero I/O
// Ajusta pesos do modelo com base em feedback
// Heurísticas determinísticas, sem ML externo
// ============================================

import type { ScoreConfig, AlertConfig, ModelConfig } from './decisionTypes';
import type { FeedbackAnalysis } from './feedbackEngine';

// --------------------------------------------
// Types
// --------------------------------------------

/** Ajuste individual proposto para um parâmetro */
export interface CalibrationAdjustment {
  parameter: string;
  old_value: number;
  new_value: number;
  reason: string;
  magnitude: 'minor' | 'moderate' | 'significant';
}

/** Resultado completo da calibração */
export interface CalibrationResult {
  adjustments: CalibrationAdjustment[];
  new_config: ModelConfig;
  calibration_summary: string;
  total_adjustments: number;
  confidence_in_calibration: 'high' | 'medium' | 'low';
}

/** Limites de segurança para evitar calibração extrema */
export interface CalibrationBounds {
  min_penalty_factor: number;
  max_penalty_factor: number;
  min_threshold: number;
  max_threshold: number;
  max_adjustment_pct: number; // % máximo de mudança por ciclo
}

// --------------------------------------------
// Default Bounds
// --------------------------------------------

export const DEFAULT_CALIBRATION_BOUNDS: CalibrationBounds = {
  min_penalty_factor: 0.1,
  max_penalty_factor: 5.0,
  min_threshold: 50,
  max_threshold: 95,
  max_adjustment_pct: 20, // máximo 20% de mudança por ciclo
};

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Clamp valor entre min e max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Aplica ajuste percentual limitado ao valor original.
 * Nunca ultrapassa max_adjustment_pct do valor original.
 */
function boundedAdjust(
  original: number,
  target: number,
  maxPct: number,
): number {
  if (!isFinite(original) || !isFinite(target)) return isFinite(original) ? original : 0;
  if (original === 0) return target;
  const maxDelta = Math.abs(original) * (maxPct / 100);
  const delta = target - original;
  const clampedDelta = clamp(delta, -maxDelta, maxDelta);
  return round2(original + clampedDelta);
}

// --------------------------------------------
// Score Config Calibration
// --------------------------------------------

/**
 * Ajusta ScoreConfig com base na análise de feedback.
 *
 * Regras heurísticas:
 * 1. Se MAPE alto + tendência otimista → aumenta penalty_margin_factor
 * 2. Se MAPE alto + tendência pessimista → reduz penalty_margin_factor
 *    (tendência neutral com MAPE alto é ignorada — sem sinal direcional)
 * 3. Se score instável (alta volatilidade) → reduz penalty factors (suaviza)
 * 4. Se score em declínio → aumenta classificação healthy/attention thresholds
 * 5. Se desvio sistemático → ajusta penalty_confidence_factor
 * 6. Se otimização superestima → aumenta penalty_ebitda_fixed
 */
export function calibrateScoreConfig(
  currentConfig: ScoreConfig,
  feedback: FeedbackAnalysis,
  bounds: CalibrationBounds = DEFAULT_CALIBRATION_BOUNDS,
): { config: ScoreConfig; adjustments: CalibrationAdjustment[] } {
  const adjustments: CalibrationAdjustment[] = [];
  const cfg = { ...currentConfig };

  const forecast = feedback.forecast;
  const optimization = feedback.optimization;
  const stability = feedback.score_stability;

  // Rule 1 & 2: Forecast error adjusts margin penalty (neutral tendency is skipped)
  if (forecast && forecast.mape > 10 && forecast.sample_size >= 3 &&
      forecast.error_tendency !== 'neutral') {
    const direction = forecast.error_tendency === 'optimistic' ? 1 : -1;
    const intensity = forecast.mape > 20 ? 0.3 : 0.15;
    const targetFactor = cfg.penalty_margin_factor + (direction * intensity * cfg.penalty_margin_factor);
    const newFactor = boundedAdjust(
      cfg.penalty_margin_factor,
      targetFactor,
      bounds.max_adjustment_pct,
    );
    const clamped = clamp(newFactor, bounds.min_penalty_factor, bounds.max_penalty_factor);

    if (clamped !== cfg.penalty_margin_factor) {
      adjustments.push({
        parameter: 'penalty_margin_factor',
        old_value: cfg.penalty_margin_factor,
        new_value: clamped,
        reason: `Forecast MAPE=${forecast.mape}%, tendência ${forecast.error_tendency}`,
        magnitude: Math.abs(clamped - cfg.penalty_margin_factor) > 0.5 ? 'significant' : 'moderate',
      });
      cfg.penalty_margin_factor = clamped;
    }
  }

  // Track which params were already adjusted by Rule 1/2
  const alreadyAdjusted = new Set(adjustments.map(a => a.parameter));

  // Rule 3: High volatility → reduce penalty factors to smooth score
  // Skips penalty_margin_factor if already adjusted by Rule 1/2 (avoids conflict)
  if (stability && stability.volatility === 'high' && stability.sample_size >= 4) {
    const smoothFactor = 0.9; // Reduz 10%
    const allParams: Array<{ key: keyof ScoreConfig; label: string }> = [
      { key: 'penalty_confidence_factor', label: 'penalty_confidence_factor' },
      { key: 'penalty_margin_factor', label: 'penalty_margin_factor' },
    ];
    const params = allParams.filter(p => !alreadyAdjusted.has(p.label));

    for (const { key, label } of params) {
      const oldVal = cfg[key] as number;
      const target = oldVal * smoothFactor;
      const newVal = clamp(
        boundedAdjust(oldVal, target, bounds.max_adjustment_pct),
        bounds.min_penalty_factor,
        bounds.max_penalty_factor,
      );
      if (newVal !== oldVal) {
        adjustments.push({
          parameter: label,
          old_value: oldVal,
          new_value: newVal,
          reason: `Score volatility alta (CV=${stability.cv}%) — suavizando penalidades`,
          magnitude: 'minor',
        });
        (cfg as Record<string, number>)[key] = newVal;
      }
    }
  }

  // Rule 4: Declining score → raise classification thresholds
  if (stability && stability.trend_direction === 'declining' && stability.sample_size >= 4) {
    const raiseBy = 2; // +2 pontos nos thresholds
    const newHealthy = clamp(
      cfg.classification_healthy + raiseBy,
      bounds.min_threshold,
      bounds.max_threshold,
    );
    const attentionMax = Math.max(bounds.min_threshold, newHealthy - 5);
    const newAttention = clamp(
      cfg.classification_attention + raiseBy,
      bounds.min_threshold,
      attentionMax, // attention deve ser pelo menos 5 pontos abaixo de healthy
    );

    if (newHealthy !== cfg.classification_healthy) {
      adjustments.push({
        parameter: 'classification_healthy',
        old_value: cfg.classification_healthy,
        new_value: newHealthy,
        reason: `Score em declínio (trend_diff < -2) — elevando threshold de saudável`,
        magnitude: 'moderate',
      });
      cfg.classification_healthy = newHealthy;
    }
    if (newAttention !== cfg.classification_attention) {
      adjustments.push({
        parameter: 'classification_attention',
        old_value: cfg.classification_attention,
        new_value: newAttention,
        reason: `Score em declínio — elevando threshold de atenção`,
        magnitude: 'moderate',
      });
      cfg.classification_attention = newAttention;
    }
  }

  // Rule 5: Systematic deviation → adjust confidence factor
  if (forecast && forecast.systematic_deviation && forecast.sample_size >= 5) {
    const adjustDir = forecast.bias > 0 ? 1.15 : 0.85; // Otimista → mais severo
    const target = cfg.penalty_confidence_factor * adjustDir;
    const newVal = clamp(
      boundedAdjust(cfg.penalty_confidence_factor, target, bounds.max_adjustment_pct),
      bounds.min_penalty_factor,
      bounds.max_penalty_factor,
    );

    if (newVal !== cfg.penalty_confidence_factor) {
      adjustments.push({
        parameter: 'penalty_confidence_factor',
        old_value: cfg.penalty_confidence_factor,
        new_value: newVal,
        reason: `Desvio sistemático detectado (bias=${forecast.bias}) — ajustando fator de confiança`,
        magnitude: 'moderate',
      });
      cfg.penalty_confidence_factor = newVal;
    }
  }

  // Rule 6: Optimization overestimates → increase EBITDA penalty (clamped to bounds)
  if (optimization && optimization.accuracy_pct < 70 && optimization.sample_size >= 3) {
    const increase = optimization.accuracy_pct < 50 ? 2 : 1;
    const newEbitdaPenalty = clamp(
      round2(cfg.penalty_ebitda_fixed + increase),
      bounds.min_penalty_factor,
      bounds.max_penalty_factor * 5, // Fixed penalties use wider range (up to 25)
    );

    if (newEbitdaPenalty !== cfg.penalty_ebitda_fixed) {
      adjustments.push({
        parameter: 'penalty_ebitda_fixed',
        old_value: cfg.penalty_ebitda_fixed,
        new_value: newEbitdaPenalty,
        reason: `Otimização com acurácia baixa (${optimization.accuracy_pct}%) — aumentando penalidade EBITDA`,
        magnitude: increase >= 2 ? 'significant' : 'moderate',
      });
      cfg.penalty_ebitda_fixed = newEbitdaPenalty;
    }
  }

  return { config: cfg, adjustments };
}

// --------------------------------------------
// Alert Config Calibration
// --------------------------------------------

/**
 * Ajusta AlertConfig com base na análise de feedback.
 *
 * Regras:
 * 1. Se muitos falsos positivos (score melhora rapidamente após alerta) → relaxa thresholds
 * 2. Se score em declínio → aperta thresholds (mais alertas preventivos)
 */
export function calibrateAlertConfig(
  currentConfig: AlertConfig,
  feedback: FeedbackAnalysis,
  bounds: CalibrationBounds = DEFAULT_CALIBRATION_BOUNDS,
): { config: AlertConfig; adjustments: CalibrationAdjustment[] } {
  const adjustments: CalibrationAdjustment[] = [];
  const cfg = { ...currentConfig };
  const stability = feedback.score_stability;

  // Se score em declínio persistente → ser mais conservador nos alertas
  if (stability && stability.trend_direction === 'declining' && stability.sample_size >= 4) {
    const newScoreCritical = round2(Math.min(cfg.score_critical + 3, bounds.max_threshold - 10));
    if (newScoreCritical !== cfg.score_critical) {
      adjustments.push({
        parameter: 'score_critical',
        old_value: cfg.score_critical,
        new_value: newScoreCritical,
        reason: `Score em declínio — alertas mais conservadores`,
        magnitude: 'moderate',
      });
      cfg.score_critical = newScoreCritical;
    }
  }

  // Se score estável e saudável → pode relaxar um pouco
  if (stability && stability.trend_direction === 'improving' && stability.volatility === 'low') {
    const newScoreCritical = round2(Math.max(cfg.score_critical - 2, bounds.min_threshold + 10));
    if (newScoreCritical !== cfg.score_critical) {
      adjustments.push({
        parameter: 'score_critical',
        old_value: cfg.score_critical,
        new_value: newScoreCritical,
        reason: `Score melhorando e estável — relaxando threshold de alerta`,
        magnitude: 'minor',
      });
      cfg.score_critical = newScoreCritical;
    }
  }

  return { config: cfg, adjustments };
}

// --------------------------------------------
// Full Calibration Pipeline
// --------------------------------------------

/**
 * Executa calibração completa: ScoreConfig + AlertConfig.
 * Retorna novo ModelConfig + lista de ajustes + summary.
 *
 * Se feedback indicar saúde 'excellent', não faz ajustes.
 * Confiança na calibração depende do sample_size:
 * - >= 12 meses → high
 * - >= 6 meses → medium
 * - < 6 meses → low
 */
export function calibrateModel(
  currentConfig: ModelConfig,
  feedback: FeedbackAnalysis,
  bounds: CalibrationBounds = DEFAULT_CALIBRATION_BOUNDS,
): CalibrationResult {
  // No calibration needed for excellent health
  if (feedback.overall_health === 'excellent' && !feedback.calibration_recommended) {
    return {
      adjustments: [],
      new_config: {
        score: { ...currentConfig.score },
        alert: { ...currentConfig.alert },
        optimization: {
          ...currentConfig.optimization,
          fractions: [...currentConfig.optimization.fractions],
        },
      },
      calibration_summary: 'Modelo com saúde excelente — nenhuma calibração necessária.',
      total_adjustments: 0,
      confidence_in_calibration: 'high',
    };
  }

  // Calibrate score config
  const scoreResult = calibrateScoreConfig(currentConfig.score, feedback, bounds);

  // Calibrate alert config
  const alertResult = calibrateAlertConfig(currentConfig.alert, feedback, bounds);

  // Merge adjustments
  const allAdjustments = [...scoreResult.adjustments, ...alertResult.adjustments];

  // Determine confidence based on sample sizes (only non-null sections)
  const sampleSizes = [
    feedback.forecast?.sample_size,
    feedback.optimization?.sample_size,
    feedback.score_stability?.sample_size,
  ].filter((s): s is number => s != null);
  const minSamples = sampleSizes.length > 0
    ? sampleSizes.reduce((m, v) => Math.min(m, v), Infinity)
    : 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (minSamples >= 12) confidence = 'high';
  else if (minSamples >= 6) confidence = 'medium';

  // Build summary
  const significantCount = allAdjustments.filter(a => a.magnitude === 'significant').length;
  const moderateCount = allAdjustments.filter(a => a.magnitude === 'moderate').length;
  const minorCount = allAdjustments.filter(a => a.magnitude === 'minor').length;

  let summary = `Calibração: ${allAdjustments.length} ajustes`;
  if (significantCount > 0) summary += ` (${significantCount} significativos)`;
  if (moderateCount > 0) summary += ` (${moderateCount} moderados)`;
  if (minorCount > 0) summary += ` (${minorCount} menores)`;
  summary += `. Saúde do modelo: ${feedback.overall_health}.`;
  summary += ` Confiança: ${confidence}.`;

  return {
    adjustments: allAdjustments,
    new_config: {
      score: scoreResult.config,
      alert: alertResult.config,
      optimization: {
        ...currentConfig.optimization,
        fractions: [...currentConfig.optimization.fractions], // Deep copy array
      },
    },
    calibration_summary: summary,
    total_adjustments: allAdjustments.length,
    confidence_in_calibration: confidence,
  };
}
