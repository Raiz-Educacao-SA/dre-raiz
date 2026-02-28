import { describe, it, expect } from 'vitest';
import {
  linearProjection,
  calculateSlope,
  clampScore,
  assessRiskTrend,
  isDecreasingTrend,
  isIncreasingTrend,
  computeForecast,
} from '../forecastModel';
import type { TimeSeriesPoint } from '../decisionTypes';

// --------------------------------------------
// linearProjection
// --------------------------------------------

describe('linearProjection', () => {
  it('projects flat for single value', () => {
    const result = linearProjection([50]);
    expect(result.slope).toBe(0);
    expect(result.projected).toEqual([50, 50, 50]);
  });

  it('projects flat for empty array', () => {
    const result = linearProjection([]);
    expect(result.slope).toBe(0);
    expect(result.projected).toEqual([0, 0, 0]);
  });

  it('projects upward for increasing series', () => {
    const result = linearProjection([10, 20, 30]);
    // slope = (30-10)/(3-1) = 10
    expect(result.slope).toBe(10);
    expect(result.projected).toEqual([40, 50, 60]);
  });

  it('projects downward for decreasing series', () => {
    const result = linearProjection([30, 20, 10]);
    // slope = (10-30)/(3-1) = -10
    expect(result.slope).toBe(-10);
    expect(result.projected).toEqual([0, -10, -20]);
  });

  it('handles 2 values', () => {
    const result = linearProjection([80, 90]);
    // slope = (90-80)/(2-1) = 10
    expect(result.slope).toBe(10);
    expect(result.projected).toEqual([100, 110, 120]);
  });

  it('rounds to 2 decimal places', () => {
    const result = linearProjection([10, 13]);
    // slope = 3/1 = 3
    expect(result.projected[0]).toBe(16);
  });
});

// --------------------------------------------
// calculateSlope
// --------------------------------------------

describe('calculateSlope', () => {
  it('returns 0 for < 2 values', () => {
    expect(calculateSlope([])).toBe(0);
    expect(calculateSlope([42])).toBe(0);
  });

  it('calculates positive slope', () => {
    expect(calculateSlope([10, 20])).toBe(10);
  });

  it('calculates negative slope', () => {
    expect(calculateSlope([20, 10])).toBe(-10);
  });

  it('averages across multiple points', () => {
    // slope = (30 - 10) / (3 - 1) = 10
    expect(calculateSlope([10, 20, 30])).toBe(10);
  });
});

// --------------------------------------------
// clampScore
// --------------------------------------------

describe('clampScore', () => {
  it('clamps negative values to 0', () => {
    expect(clampScore([-10, -20, -30])).toEqual([0, 0, 0]);
  });

  it('clamps values > 100 to 100', () => {
    expect(clampScore([110, 120, 130])).toEqual([100, 100, 100]);
  });

  it('rounds to integers', () => {
    expect(clampScore([85.7, 90.3, 92.9])).toEqual([86, 90, 93]);
  });

  it('passes through valid values unchanged (after rounding)', () => {
    expect(clampScore([50, 75, 100])).toEqual([50, 75, 100]);
  });
});

// --------------------------------------------
// assessRiskTrend
// --------------------------------------------

describe('assessRiskTrend', () => {
  it('returns deterioration risk for score3 < 70', () => {
    expect(assessRiskTrend(60, -5)).toBe('Alta probabilidade de deterioração');
  });

  it('returns negative trend for negative slope', () => {
    expect(assessRiskTrend(80, -2)).toBe('Tendência negativa moderada');
  });

  it('returns stable for positive slope and score >= 70', () => {
    expect(assessRiskTrend(85, 3)).toBe('Estável ou crescente');
  });

  it('returns stable for zero slope and score >= 70', () => {
    expect(assessRiskTrend(75, 0)).toBe('Estável ou crescente');
  });
});

// --------------------------------------------
// Trend detection
// --------------------------------------------

describe('isDecreasingTrend', () => {
  it('detects strictly decreasing last 3', () => {
    expect(isDecreasingTrend([100, 90, 85, 80])).toBe(true);
  });

  it('rejects flat series', () => {
    expect(isDecreasingTrend([80, 80, 80])).toBe(false);
  });

  it('rejects increasing series', () => {
    expect(isDecreasingTrend([70, 80, 90])).toBe(false);
  });

  it('returns false for < 3 points', () => {
    expect(isDecreasingTrend([90, 80])).toBe(false);
    expect(isDecreasingTrend([])).toBe(false);
  });

  it('only checks last 3 values', () => {
    // first two are increasing but last 3 are decreasing
    expect(isDecreasingTrend([50, 60, 90, 85, 80])).toBe(true);
  });
});

describe('isIncreasingTrend', () => {
  it('detects strictly increasing last 3', () => {
    expect(isIncreasingTrend([70, 80, 85, 90])).toBe(true);
  });

  it('rejects flat series', () => {
    expect(isIncreasingTrend([80, 80, 80])).toBe(false);
  });

  it('returns false for < 3 points', () => {
    expect(isIncreasingTrend([80, 90])).toBe(false);
  });
});

// --------------------------------------------
// computeForecast
// --------------------------------------------

describe('computeForecast', () => {
  it('computes full forecast from time series', () => {
    const series: TimeSeriesPoint[] = [
      { score: 80, margin: 30, ebitda: 400000 },
      { score: 85, margin: 32, ebitda: 450000 },
      { score: 90, margin: 34, ebitda: 500000 },
    ];
    const result = computeForecast(series);

    expect(result.forecast.score).toHaveLength(3);
    expect(result.forecast.margin).toHaveLength(3);
    expect(result.forecast.ebitda).toHaveLength(3);
    expect(result.slope.score).toBeGreaterThan(0);
    expect(result.slope.margin).toBeGreaterThan(0);
    expect(result.slope.ebitda).toBeGreaterThan(0);
    expect(result.risk_assessment).toBe('Estável ou crescente');
  });

  it('clamps projected scores to [0, 100]', () => {
    const series: TimeSeriesPoint[] = [
      { score: 90, margin: 30, ebitda: 400000 },
      { score: 95, margin: 32, ebitda: 450000 },
      { score: 98, margin: 34, ebitda: 500000 },
    ];
    const result = computeForecast(series);
    result.forecast.score.forEach(s => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it('handles empty series', () => {
    const result = computeForecast([]);
    expect(result.forecast.score).toEqual([0, 0, 0]);
    expect(result.slope.score).toBe(0);
  });
});
