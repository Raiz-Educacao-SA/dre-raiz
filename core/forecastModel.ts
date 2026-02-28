// ============================================
// Core Forecast Model
// Funções puras — zero side effects, zero I/O
// ============================================

import type {
  Projection3,
  SlopeSet,
  ForecastResult,
  TimeSeriesPoint,
} from './decisionTypes';

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --------------------------------------------
// Linear Projection
// --------------------------------------------

/**
 * Calcula slope linear e projeta 3 pontos futuros.
 * slope = (last - first) / (length - 1)
 * Se < 2 pontos, retorna flat (slope=0, repete o último valor).
 */
export function linearProjection(
  values: number[],
): { projected: Projection3; slope: number } {
  if (values.length < 2) {
    const last = values[0] ?? 0;
    return { projected: [last, last, last], slope: 0 };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const slope = (last - first) / (values.length - 1);

  return {
    projected: [
      round2(last + slope),
      round2(last + slope * 2),
      round2(last + slope * 3),
    ],
    slope: round2(slope),
  };
}

// --------------------------------------------
// Slope
// --------------------------------------------

/**
 * Calcula slope individual de uma série.
 * Retorna 0 se < 2 pontos.
 */
export function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  return round2((last - first) / (values.length - 1));
}

// --------------------------------------------
// Clamp Score
// --------------------------------------------

/**
 * Restringe projeção de score ao intervalo 0–100,
 * arredondando para inteiro.
 */
export function clampScore(values: Projection3): Projection3 {
  return [
    Math.max(0, Math.min(100, Math.round(values[0]))),
    Math.max(0, Math.min(100, Math.round(values[1]))),
    Math.max(0, Math.min(100, Math.round(values[2]))),
  ];
}

// --------------------------------------------
// Risk Assessment
// --------------------------------------------

/**
 * Avalia o risco futuro com base no terceiro ponto projetado
 * do score e na tendência (slope).
 */
export function assessRiskTrend(
  projectedScore3: number,
  scoreSlope: number,
): string {
  if (projectedScore3 < 70) {
    return 'Alta probabilidade de deterioração';
  }
  if (scoreSlope < 0) {
    return 'Tendência negativa moderada';
  }
  return 'Estável ou crescente';
}

// --------------------------------------------
// Trend Detection
// --------------------------------------------

/**
 * Returns true if the last 3+ values are strictly decreasing.
 */
export function isDecreasingTrend(series: number[]): boolean {
  if (series.length < 3) return false;
  const last3 = series.slice(-3);
  return last3[0] > last3[1] && last3[1] > last3[2];
}

/**
 * Returns true if the last 3+ values are strictly increasing.
 */
export function isIncreasingTrend(series: number[]): boolean {
  if (series.length < 3) return false;
  const last3 = series.slice(-3);
  return last3[0] < last3[1] && last3[1] < last3[2];
}

// --------------------------------------------
// Full Forecast (convenience)
// --------------------------------------------

/**
 * Executa forecast completo a partir de uma série temporal.
 * Cada ponto contém score, margin e ebitda.
 * Retorna projeções, slopes e avaliação de risco.
 */
export function computeForecast(series: TimeSeriesPoint[]): ForecastResult {
  const scores = series.map((p) => p.score);
  const margins = series.map((p) => p.margin);
  const ebitdas = series.map((p) => p.ebitda);

  const scoreProj = linearProjection(scores);
  const marginProj = linearProjection(margins);
  const ebitdaProj = linearProjection(ebitdas);

  const scoreClamped = clampScore(scoreProj.projected);

  const slope: SlopeSet = {
    score: scoreProj.slope,
    margin: marginProj.slope,
    ebitda: ebitdaProj.slope,
  };

  return {
    forecast: {
      score: scoreClamped,
      margin: marginProj.projected,
      ebitda: ebitdaProj.projected,
    },
    slope,
    risk_assessment: assessRiskTrend(scoreClamped[2], scoreProj.slope),
  };
}
