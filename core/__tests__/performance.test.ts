import { describe, it, expect } from 'vitest';
import { calculateScoreBreakdown, evaluateAlertRules, evaluateTrendAlertRules } from '../scoreModel';
import { linearProjection, computeForecast } from '../forecastModel';
import { calculateGap, sortCandidates, distributeCuts, runOptimization, gridSearch } from '../optimizationEngine';
import { safePct, calculateEbitda, deriveMetrics } from '../financialModel';
import { shouldRunNow, calculateNextRun, buildDateContext, validateScheduleConfig } from '../scheduleEngine';
import type { ScoreInputs, FinancialInputs, CutCandidate, TimeSeriesPoint, TrendSeries, OptimizationInput } from '../decisionTypes';

// --------------------------------------------
// Performance SLAs (máximos aceitáveis)
// --------------------------------------------

const SLA = {
  SCORE_1000_CALLS_MS: 50,       // 1000 cálculos de score < 50ms
  FORECAST_1000_CALLS_MS: 100,   // 1000 projeções < 100ms
  OPTIMIZATION_100_CALLS_MS: 500, // 100 otimizações < 500ms
  FINANCIAL_1000_CALLS_MS: 30,   // 1000 cálculos financeiros < 30ms
  SCHEDULE_1000_CALLS_MS: 50,    // 1000 verificações de schedule < 50ms
  ALERT_1000_CALLS_MS: 50,       // 1000 avaliações de alerta < 50ms
};

// --------------------------------------------
// Fixtures
// --------------------------------------------

const INPUTS: ScoreInputs = {
  confidence: 75,
  margin_real: 28,
  margin_orcado: 32,
  ebitda_real: 120000,
  ebitda_a1: 150000,
  high_priority_count: 4,
  conflicts_count: 1,
};

const FINANCIALS: FinancialInputs = {
  receita_real: 1000000,
  receita_orcado: 1200000,
  custos_variaveis_real: -600000,
  custos_variaveis_orcado: -700000,
  custos_fixos_real: -200000,
  custos_fixos_orcado: -220000,
  sga_real: -50000,
  sga_orcado: -60000,
  rateio_real: -30000,
  rateio_orcado: -35000,
};

const CANDIDATES: CutCandidate[] = Array.from({ length: 10 }, (_, i) => ({
  area: `Area_${i}`,
  gap: (10 - i) * 5000,
  volume: (10 - i) * 20000,
}));

const SERIES: TimeSeriesPoint[] = Array.from({ length: 12 }, (_, i) => ({
  score: 70 + i * 2,
  margin: 25 + i,
  ebitda: 100000 + i * 10000,
}));

const TREND: TrendSeries = {
  scores: [90, 85, 80, 75, 70],
  margins: [35, 33, 31, 29, 27],
  confidences: [95, 90, 85, 80, 75],
  high_priority_counts: [1, 2, 3, 4, 5],
};

// --------------------------------------------
// Helper
// --------------------------------------------

function benchmark(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return performance.now() - start;
}

// --------------------------------------------
// Performance Tests
// --------------------------------------------

describe('Performance — Core Score Model', () => {
  it(`1000 × calculateScoreBreakdown < ${SLA.SCORE_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => calculateScoreBreakdown(INPUTS), 1000);
    expect(ms).toBeLessThan(SLA.SCORE_1000_CALLS_MS);
  });

  it(`1000 × evaluateAlertRules < ${SLA.ALERT_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => evaluateAlertRules(INPUTS, 65), 1000);
    expect(ms).toBeLessThan(SLA.ALERT_1000_CALLS_MS);
  });

  it(`1000 × evaluateTrendAlertRules < ${SLA.ALERT_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => evaluateTrendAlertRules(TREND), 1000);
    expect(ms).toBeLessThan(SLA.ALERT_1000_CALLS_MS);
  });
});

describe('Performance — Core Forecast Model', () => {
  it(`1000 × linearProjection (12 points) < ${SLA.FORECAST_1000_CALLS_MS}ms`, () => {
    const values = SERIES.map(s => s.score);
    const ms = benchmark(() => linearProjection(values), 1000);
    expect(ms).toBeLessThan(SLA.FORECAST_1000_CALLS_MS);
  });

  it(`1000 × computeForecast (12 points) < ${SLA.FORECAST_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => computeForecast(SERIES), 1000);
    expect(ms).toBeLessThan(SLA.FORECAST_1000_CALLS_MS);
  });
});

describe('Performance — Core Financial Model', () => {
  it(`1000 × deriveMetrics < ${SLA.FINANCIAL_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => deriveMetrics(FINANCIALS), 1000);
    expect(ms).toBeLessThan(SLA.FINANCIAL_1000_CALLS_MS);
  });

  it(`1000 × safePct < ${SLA.FINANCIAL_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => safePct(400000, 1000000), 1000);
    expect(ms).toBeLessThan(SLA.FINANCIAL_1000_CALLS_MS);
  });
});

describe('Performance — Core Optimization Engine', () => {
  it(`100 × runOptimization (10 candidates) < ${SLA.OPTIMIZATION_100_CALLS_MS}ms`, () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: INPUTS,
      target_ebitda: 300000,
      candidates: CANDIDATES,
    };
    const ms = benchmark(() => runOptimization(input), 100);
    expect(ms).toBeLessThan(SLA.OPTIMIZATION_100_CALLS_MS);
  });

  it(`1000 × sortCandidates (10 items) < ${SLA.FINANCIAL_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => sortCandidates(CANDIDATES), 1000);
    expect(ms).toBeLessThan(SLA.FINANCIAL_1000_CALLS_MS);
  });

  it(`1000 × distributeCuts (10 items, gap=100K) < ${SLA.FINANCIAL_1000_CALLS_MS}ms`, () => {
    const sorted = sortCandidates(CANDIDATES);
    const ms = benchmark(() => distributeCuts(sorted, 100000), 1000);
    expect(ms).toBeLessThan(SLA.FINANCIAL_1000_CALLS_MS);
  });
});

describe('Performance — Core Schedule Engine', () => {
  it(`1000 × shouldRunNow < ${SLA.SCHEDULE_1000_CALLS_MS}ms`, () => {
    const config = {
      frequency: 'daily' as const,
      execution_time: '08:00',
      timezone: 'UTC',
      is_active: true,
      next_run_at: '2026-02-28T08:00:00.000Z',
      last_run_at: null,
    };
    const ms = benchmark(() => shouldRunNow(config, '2026-02-28T08:15:00.000Z'), 1000);
    expect(ms).toBeLessThan(SLA.SCHEDULE_1000_CALLS_MS);
  });

  it(`1000 × calculateNextRun < ${SLA.SCHEDULE_1000_CALLS_MS}ms`, () => {
    const config = {
      frequency: 'weekly' as const,
      execution_time: '08:00',
      timezone: 'UTC',
      day_of_week: 1,
      is_active: true,
      next_run_at: null,
      last_run_at: null,
    };
    const ms = benchmark(() => calculateNextRun(config, '2026-02-28T10:00:00.000Z'), 1000);
    expect(ms).toBeLessThan(SLA.SCHEDULE_1000_CALLS_MS);
  });

  it(`1000 × buildDateContext < ${SLA.SCHEDULE_1000_CALLS_MS}ms`, () => {
    const ms = benchmark(() => buildDateContext('2026-06-15T12:00:00.000Z'), 1000);
    expect(ms).toBeLessThan(SLA.SCHEDULE_1000_CALLS_MS);
  });
});

describe('Performance — Determinism Verification', () => {
  it('score is deterministic across 100 runs', () => {
    const results = Array.from({ length: 100 }, () => calculateScoreBreakdown(INPUTS));
    const first = results[0];
    results.forEach(r => expect(r).toEqual(first));
  });

  it('optimization is deterministic across 10 runs', () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: INPUTS,
      target_ebitda: 200000,
      candidates: CANDIDATES,
    };
    const results = Array.from({ length: 10 }, () => runOptimization(input));
    const first = results[0];
    results.forEach(r => expect(r).toEqual(first));
  });

  it('forecast is deterministic across 10 runs', () => {
    const results = Array.from({ length: 10 }, () => computeForecast(SERIES));
    const first = results[0];
    results.forEach(r => expect(r).toEqual(first));
  });
});
