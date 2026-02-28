// ============================================
// Core Feedback Engine — Adaptive Intelligence
// Funções puras — zero side effects, zero I/O
// Analisa erros de previsão para auto-calibração
// ============================================

// --------------------------------------------
// Types (locais ao engine, não poluem decisionTypes)
// --------------------------------------------

/** Um par previsão vs. realizado */
export interface FeedbackEntry {
  forecast_value: number;
  realized_value: number;
}

/** Entrada para análise de otimização */
export interface OptimizationFeedbackEntry {
  expected_gain: number;
  realized_gain: number;
}

/** Entrada para análise de estabilidade de score */
export interface ScoreFeedbackEntry {
  score: number;
  period: string; // e.g. '2026-01'
}

/** Resultado da análise de erro de forecast */
export interface ForecastErrorResult {
  mape: number;            // Mean Absolute Percentage Error (0-100)
  mae: number;             // Mean Absolute Error (valor absoluto)
  bias: number;            // Viés médio (positivo = otimista, negativo = pessimista)
  max_error: number;       // Maior erro absoluto observado
  error_tendency: 'optimistic' | 'pessimistic' | 'neutral';
  systematic_deviation: boolean;  // true se >70% dos erros têm o mesmo sinal
  sample_size: number;
}

/** Resultado da análise de acurácia de otimização */
export interface OptimizationAccuracyResult {
  accuracy_pct: number;     // % médio de acerto (realized/expected)
  mean_overestimate: number; // Superestimação média (esperado - realizado)
  hit_rate: number;          // % de vezes que realizado >= 80% do esperado
  sample_size: number;
}

/** Resultado da análise de estabilidade de score */
export interface ScoreStabilityResult {
  mean: number;
  std_dev: number;
  cv: number;               // Coeficiente de variação (std_dev/mean * 100)
  range: number;             // max - min
  trend_direction: 'improving' | 'declining' | 'stable';
  volatility: 'low' | 'moderate' | 'high';
  sample_size: number;
}

/** Resultado consolidado de todas as análises */
export interface FeedbackAnalysis {
  forecast: ForecastErrorResult | null;
  optimization: OptimizationAccuracyResult | null;
  score_stability: ScoreStabilityResult | null;
  overall_health: 'excellent' | 'good' | 'needs_calibration' | 'poor';
  calibration_recommended: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Divisão segura — retorna 0 se denominador é 0, NaN ou Infinity */
function safeDiv(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return num / den;
}

// --------------------------------------------
// Forecast Error Analysis
// --------------------------------------------

/**
 * Calcula métricas de erro de previsão a partir de pares forecast/realized.
 *
 * MAPE = média(|forecast - realized| / |realized|) * 100
 * MAE  = média(|forecast - realized|)
 * Bias = média(forecast - realized) → positivo = otimista
 *
 * Retorna null se entries estiver vazio.
 * Entradas com realized_value === 0 são excluídas do MAPE (divisão por zero),
 * mas incluídas no MAE e bias.
 */
export function calculateForecastError(
  entries: FeedbackEntry[],
): ForecastErrorResult | null {
  if (entries.length === 0) return null;

  const errors = entries.map(e => e.forecast_value - e.realized_value);
  const absErrors = errors.map(e => Math.abs(e));

  // MAE
  const mae = round2(absErrors.reduce((s, v) => s + v, 0) / entries.length);

  // Bias
  const bias = round2(errors.reduce((s, v) => s + v, 0) / entries.length);

  // Max error (reduce-based to avoid stack overflow on large arrays)
  const maxError = round2(absErrors.reduce((m, v) => Math.max(m, v), 0));

  // MAPE (exclui realized_value === 0)
  const mapeEntries = entries.filter(e => e.realized_value !== 0);
  let mape = 0;
  if (mapeEntries.length > 0) {
    const sumPctErrors = mapeEntries.reduce((sum, e) => {
      return sum + Math.abs(e.forecast_value - e.realized_value) / Math.abs(e.realized_value);
    }, 0);
    mape = round2((sumPctErrors / mapeEntries.length) * 100);
  }

  // Error tendency: >60% same sign → systematic
  const positiveErrors = errors.filter(e => e > 0).length;
  const negativeErrors = errors.filter(e => e < 0).length;
  const totalNonZero = positiveErrors + negativeErrors;

  let errorTendency: 'optimistic' | 'pessimistic' | 'neutral' = 'neutral';
  if (totalNonZero > 0) {
    const positivePct = positiveErrors / totalNonZero;
    if (positivePct > 0.6) errorTendency = 'optimistic';
    else if (positivePct < 0.4) errorTendency = 'pessimistic';
  }

  // Systematic deviation: >70% same sign
  const systematicDeviation = totalNonZero > 0 &&
    (positiveErrors / totalNonZero > 0.7 || negativeErrors / totalNonZero > 0.7);

  return {
    mape,
    mae,
    bias,
    max_error: maxError,
    error_tendency: errorTendency,
    systematic_deviation: systematicDeviation,
    sample_size: entries.length,
  };
}

// --------------------------------------------
// Optimization Accuracy Analysis
// --------------------------------------------

/**
 * Calcula a acurácia das otimizações propostas.
 *
 * accuracy_pct = média(realized_gain / expected_gain) * 100, clamped [0%, 200%]
 * hit_rate = % de vezes que realized >= 80% do expected (assume expected_gain >= 0)
 * mean_overestimate = média(expected - realized)
 *
 * Entradas com expected_gain === 0 são excluídas do accuracy_pct.
 * Ratios são limitados a [0, 200%] para evitar distorção por outliers.
 * Retorna null se entries estiver vazio.
 */
export function calculateOptimizationAccuracy(
  entries: OptimizationFeedbackEntry[],
): OptimizationAccuracyResult | null {
  if (entries.length === 0) return null;

  // Mean overestimate
  const overestimates = entries.map(e => e.expected_gain - e.realized_gain);
  const meanOverestimate = round2(
    overestimates.reduce((s, v) => s + v, 0) / entries.length,
  );

  // Accuracy % (exclui expected_gain === 0)
  const validEntries = entries.filter(e => e.expected_gain !== 0);
  let accuracyPct = 0;
  if (validEntries.length > 0) {
    const sumRatios = validEntries.reduce((sum, e) => {
      const ratio = safeDiv(e.realized_gain, e.expected_gain);
      // Clamp to [0, 200%] to avoid outliers and negative ratios distorting the mean
      return sum + Math.min(Math.max(ratio, 0), 2);
    }, 0);
    accuracyPct = round2((sumRatios / validEntries.length) * 100);
  }

  // Hit rate: realized >= 80% of expected
  const hits = entries.filter(e => {
    if (e.expected_gain === 0) return e.realized_gain >= 0;
    return safeDiv(e.realized_gain, e.expected_gain) >= 0.8;
  }).length;
  const hitRate = round2((hits / entries.length) * 100);

  return {
    accuracy_pct: accuracyPct,
    mean_overestimate: meanOverestimate,
    hit_rate: hitRate,
    sample_size: entries.length,
  };
}

// --------------------------------------------
// Score Stability Analysis
// --------------------------------------------

/**
 * Analisa a estabilidade do Health Score ao longo do tempo.
 *
 * Calcula média, desvio padrão, coeficiente de variação,
 * range, direção de tendência e classificação de volatilidade.
 *
 * Retorna null se entries tiver menos de 2 registros.
 * Entries devem estar ordenados cronologicamente (mais antigo primeiro).
 */
export function calculateScoreStability(
  entries: ScoreFeedbackEntry[],
): ScoreStabilityResult | null {
  if (entries.length < 2) return null;

  const scores = entries.map(e => e.score);
  const n = scores.length;

  // Mean
  const mean = round2(scores.reduce((s, v) => s + v, 0) / n);

  // Standard deviation (population — divides by N, not N-1)
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = round2(Math.sqrt(variance));

  // Coefficient of variation
  const cv = mean !== 0 ? round2((stdDev / Math.abs(mean)) * 100) : 0;

  // Range (reduce-based to avoid stack overflow on large arrays)
  const maxScore = scores.reduce((m, v) => Math.max(m, v), -Infinity);
  const minScore = scores.reduce((m, v) => Math.min(m, v), Infinity);
  const range = round2(maxScore - minScore);

  // Trend direction: compare first half average vs second half average
  const midpoint = Math.floor(n / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);
  const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const trendDiff = secondAvg - firstAvg;

  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (trendDiff > 2) trendDirection = 'improving';
  else if (trendDiff < -2) trendDirection = 'declining';

  // Volatility classification
  let volatility: 'low' | 'moderate' | 'high' = 'low';
  if (cv > 15) volatility = 'high';
  else if (cv > 8) volatility = 'moderate';

  return {
    mean,
    std_dev: stdDev,
    cv,
    range,
    trend_direction: trendDirection,
    volatility,
    sample_size: n,
  };
}

// --------------------------------------------
// Consolidated Analysis
// --------------------------------------------

/**
 * Consolida todas as análises de feedback em um resultado único.
 * Determina a saúde geral do modelo e se calibração é recomendada.
 *
 * Critérios para calibração:
 * - MAPE > 15%
 * - Desvio sistemático detectado
 * - Acurácia de otimização < 60%
 * - Score com volatilidade alta
 */
export function analyzeFeedback(
  forecastEntries: FeedbackEntry[],
  optimizationEntries: OptimizationFeedbackEntry[],
  scoreEntries: ScoreFeedbackEntry[],
): FeedbackAnalysis {
  const forecast = calculateForecastError(forecastEntries);
  const optimization = calculateOptimizationAccuracy(optimizationEntries);
  const scoreStability = calculateScoreStability(scoreEntries);

  // Calibration signals
  let signals = 0;
  let totalChecks = 0;

  if (forecast) {
    totalChecks += 3;
    if (forecast.mape > 15) signals++;
    if (forecast.systematic_deviation) signals++;
    if (forecast.mape > 25) signals++; // Severe
  }

  if (optimization) {
    totalChecks += 2;
    if (optimization.accuracy_pct < 60) signals++;
    if (optimization.hit_rate < 50) signals++;
  }

  if (scoreStability) {
    totalChecks += 2;
    if (scoreStability.volatility === 'high') signals++;
    if (scoreStability.trend_direction === 'declining') signals++;
  }

  // Overall health
  let overallHealth: 'excellent' | 'good' | 'needs_calibration' | 'poor';
  const signalRatio = totalChecks > 0 ? safeDiv(signals, totalChecks) : 0;

  if (signals === 0) {
    overallHealth = 'excellent';
  } else if (signalRatio <= 0.2) {
    overallHealth = 'good';
  } else if (signalRatio <= 0.5) {
    overallHealth = 'needs_calibration';
  } else {
    overallHealth = 'poor';
  }

  // Recommend calibration if any significant signal
  const calibrationRecommended = signals >= 2 ||
    (forecast !== null && forecast.systematic_deviation) ||
    (forecast !== null && forecast.mape > 20) ||
    (optimization !== null && optimization.accuracy_pct < 50);

  return {
    forecast,
    optimization,
    score_stability: scoreStability,
    overall_health: overallHealth,
    calibration_recommended: calibrationRecommended,
  };
}
