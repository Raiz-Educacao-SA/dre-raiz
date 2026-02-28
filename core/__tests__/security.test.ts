import { describe, it, expect, beforeEach } from 'vitest';
import { logInfo, logWarning, logError, addLogSink, clearLogSinks } from '../logger';
import type { LogEntry, LogSink } from '../logger';
import { calculateScoreBreakdown } from '../scoreModel';
import { computeForecast } from '../forecastModel';
import { runOptimization } from '../optimizationEngine';
import { safePct, deriveMetrics } from '../financialModel';
import type { ScoreInputs, FinancialInputs, CutCandidate, OptimizationInput, TimeSeriesPoint } from '../decisionTypes';

// ============================================
// Security Verification — Core Layer
// Valida que o core não vaza dados sensíveis,
// resiste a inputs maliciosos e mantém invariantes
// ============================================

// --------------------------------------------
// 1. Logger: Sensitive Data Redaction
// --------------------------------------------

describe('Security — Logger Redaction', () => {
  let capturedPayload: Record<string, unknown> | undefined;

  function captureSink(): LogSink {
    return (entry: LogEntry) => {
      capturedPayload = entry.payload;
    };
  }

  beforeEach(() => {
    clearLogSinks();
    capturedPayload = undefined;
  });

  const SENSITIVE_KEYS = [
    'api_key',
    'apiKey',
    'API_KEY',
    'token',
    'secret',
    'password',
    'credential',
    'authorization',
    'cookie',
    'session',
    'private_key',
    'privateKey',
    'service_role',
    'service_role_key',
  ];

  it.each(SENSITIVE_KEYS)('redacts key: %s', (key) => {
    addLogSink(captureSink());
    logInfo('test', 'msg', { [key]: 'super_secret_value_12345' });
    expect(capturedPayload?.[key]).toBe('[REDACTED]');
  });

  it('does NOT redact safe keys', () => {
    addLogSink(captureSink());
    logInfo('test', 'msg', {
      run_id: 'abc-123',
      team_id: 'def-456',
      step_order: 2,
      agent_code: 'alex',
      objective: 'Análise DRE',
    });
    expect(capturedPayload?.run_id).toBe('abc-123');
    expect(capturedPayload?.team_id).toBe('def-456');
    expect(capturedPayload?.step_order).toBe(2);
    expect(capturedPayload?.agent_code).toBe('alex');
    expect(capturedPayload?.objective).toBe('Análise DRE');
  });

  it('truncates long strings to prevent log injection', () => {
    addLogSink(captureSink());
    const longString = 'A'.repeat(1000);
    logInfo('test', 'msg', { data: longString });
    const result = capturedPayload?.data as string;
    expect(result.length).toBeLessThan(600); // 500 + truncation message
    expect(result).toContain('[truncated');
  });

  it('limits array depth to prevent memory exhaustion', () => {
    addLogSink(captureSink());
    const largeArray = Array.from({ length: 100 }, (_, i) => i);
    logInfo('test', 'msg', { items: largeArray });
    const result = capturedPayload?.items as unknown[];
    expect(result.length).toBeLessThanOrEqual(21); // 20 items + ellipsis indicator
  });

  it('redacts nested sensitive keys', () => {
    addLogSink(captureSink());
    logInfo('test', 'msg', {
      config: {
        api_key: 'should_be_redacted',
        name: 'visible',
      },
    });
    const config = capturedPayload?.config as Record<string, unknown>;
    expect(config?.api_key).toBe('[REDACTED]');
    expect(config?.name).toBe('visible');
  });
});

// --------------------------------------------
// 2. Score Model: Input Validation / Resilience
// --------------------------------------------

describe('Security — Score Model Input Resilience', () => {
  it('handles NaN inputs without crashing', () => {
    const inputs: ScoreInputs = {
      confidence: NaN,
      margin_real: NaN,
      margin_orcado: NaN,
      ebitda_real: NaN,
      ebitda_a1: NaN,
      high_priority_count: NaN,
      conflicts_count: NaN,
    };
    const result = calculateScoreBreakdown(inputs);
    expect(typeof result.final_score).toBe('number');
    expect(result.final_score).toBeGreaterThanOrEqual(0);
    expect(result.final_score).toBeLessThanOrEqual(100);
  });

  it('handles Infinity inputs without crashing', () => {
    const inputs: ScoreInputs = {
      confidence: Infinity,
      margin_real: -Infinity,
      margin_orcado: Infinity,
      ebitda_real: -Infinity,
      ebitda_a1: Infinity,
      high_priority_count: Infinity,
      conflicts_count: Infinity,
    };
    const result = calculateScoreBreakdown(inputs);
    expect(typeof result.final_score).toBe('number');
  });

  it('handles extreme negative values', () => {
    const inputs: ScoreInputs = {
      confidence: -100,
      margin_real: -50,
      margin_orcado: 50,
      ebitda_real: -1000000,
      ebitda_a1: 1000000,
      high_priority_count: 999,
      conflicts_count: 999,
    };
    const result = calculateScoreBreakdown(inputs);
    expect(result.final_score).toBe(0); // clamped to 0
  });

  it('never produces NaN as output', () => {
    const edgeCases: ScoreInputs[] = [
      { confidence: 0, margin_real: 0, margin_orcado: 0, ebitda_real: 0, ebitda_a1: 0, high_priority_count: 0, conflicts_count: 0 },
      { confidence: 100, margin_real: 100, margin_orcado: 0, ebitda_real: 1, ebitda_a1: 0, high_priority_count: 0, conflicts_count: 0 },
    ];
    for (const inputs of edgeCases) {
      const result = calculateScoreBreakdown(inputs);
      expect(isNaN(result.final_score)).toBe(false);
    }
  });
});

// --------------------------------------------
// 3. Financial Model: Division Safety
// --------------------------------------------

describe('Security — Financial Model Division Safety', () => {
  it('safePct never divides by zero', () => {
    expect(safePct(1000, 0)).toBe(0);
    expect(isNaN(safePct(1000, 0))).toBe(false);
  });

  it('safePct handles undefined-like inputs gracefully', () => {
    // @ts-expect-error — testing runtime safety
    expect(safePct(undefined, 100)).toBe(0);
    // @ts-expect-error — testing runtime safety
    expect(safePct(100, undefined)).toBe(0);
  });

  it('deriveMetrics never produces Infinity', () => {
    const zeroInputs: FinancialInputs = {
      receita_real: 0, receita_orcado: 0,
      custos_variaveis_real: 0, custos_variaveis_orcado: 0,
      custos_fixos_real: 0, custos_fixos_orcado: 0,
      sga_real: 0, sga_orcado: 0,
      rateio_real: 0, rateio_orcado: 0,
    };
    const metrics = deriveMetrics(zeroInputs);
    expect(isFinite(metrics.ebitda)).toBe(true);
    expect(isFinite(metrics.margin)).toBe(true);
    expect(isFinite(metrics.margin_absolute)).toBe(true);
  });
});

// --------------------------------------------
// 4. Optimization Engine: Resource Exhaustion
// --------------------------------------------

describe('Security — Optimization Resource Limits', () => {
  it('handles 100 candidates without timeout', () => {
    const bigCandidates: CutCandidate[] = Array.from({ length: 100 }, (_, i) => ({
      area: `Area_${i}`,
      gap: 10000 + i * 100,
      volume: 50000 + i * 1000,
    }));
    const input: OptimizationInput = {
      current_financials: {
        receita_real: 10000000, receita_orcado: 12000000,
        custos_variaveis_real: -6000000, custos_variaveis_orcado: -7000000,
        custos_fixos_real: -2000000, custos_fixos_orcado: -2200000,
        sga_real: -500000, sga_orcado: -600000,
        rateio_real: -300000, rateio_orcado: -350000,
      },
      current_score_inputs: {
        confidence: 80, margin_real: 40, margin_orcado: 42,
        ebitda_real: 1200000, ebitda_a1: 1500000,
        high_priority_count: 4, conflicts_count: 1,
      },
      target_ebitda: 2000000,
      candidates: bigCandidates,
    };

    const start = performance.now();
    const result = runOptimization(input);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // must complete in < 1s
    expect(result.proposed_actions.length).toBeGreaterThan(0);
  });

  it('returns safely for empty candidates', () => {
    const input: OptimizationInput = {
      current_financials: {
        receita_real: 1000000, receita_orcado: 1200000,
        custos_variaveis_real: -600000, custos_variaveis_orcado: -700000,
        custos_fixos_real: -200000, custos_fixos_orcado: -220000,
        sga_real: -50000, sga_orcado: -60000,
        rateio_real: -30000, rateio_orcado: -35000,
      },
      current_score_inputs: {
        confidence: 80, margin_real: 40, margin_orcado: 42,
        ebitda_real: 120000, ebitda_a1: 150000,
        high_priority_count: 2, conflicts_count: 0,
      },
      target_ebitda: 300000,
      candidates: [],
    };
    const result = runOptimization(input);
    expect(result.proposed_actions).toHaveLength(0);
  });
});

// --------------------------------------------
// 5. Forecast: Boundary Safety
// --------------------------------------------

describe('Security — Forecast Boundary Safety', () => {
  it('clamps projected scores to [0, 100]', () => {
    const extreme: TimeSeriesPoint[] = [
      { score: 98, margin: 50, ebitda: 1000000 },
      { score: 99, margin: 55, ebitda: 1200000 },
      { score: 100, margin: 60, ebitda: 1400000 },
    ];
    const result = computeForecast(extreme);
    result.forecast.score.forEach(s => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it('handles all-zero series', () => {
    const zeros: TimeSeriesPoint[] = [
      { score: 0, margin: 0, ebitda: 0 },
      { score: 0, margin: 0, ebitda: 0 },
    ];
    const result = computeForecast(zeros);
    expect(result.forecast.score).toEqual([0, 0, 0]);
    expect(result.slope.score).toBe(0);
  });
});

// --------------------------------------------
// 6. Core Purity: No Side Effects
// --------------------------------------------

describe('Security — Core Purity (No Side Effects)', () => {
  it('calculateScoreBreakdown does not modify inputs', () => {
    const inputs: ScoreInputs = {
      confidence: 75, margin_real: 28, margin_orcado: 32,
      ebitda_real: 120000, ebitda_a1: 150000,
      high_priority_count: 4, conflicts_count: 1,
    };
    const frozen = JSON.parse(JSON.stringify(inputs));
    calculateScoreBreakdown(inputs);
    expect(inputs).toEqual(frozen);
  });

  it('runOptimization does not modify candidates', () => {
    const candidates: CutCandidate[] = [
      { area: 'A', gap: 50000, volume: 200000 },
      { area: 'B', gap: 30000, volume: 100000 },
    ];
    const frozen = JSON.parse(JSON.stringify(candidates));
    runOptimization({
      current_financials: {
        receita_real: 1000000, receita_orcado: 1200000,
        custos_variaveis_real: -600000, custos_variaveis_orcado: -700000,
        custos_fixos_real: -200000, custos_fixos_orcado: -220000,
        sga_real: -50000, sga_orcado: -60000,
        rateio_real: -30000, rateio_orcado: -35000,
      },
      current_score_inputs: {
        confidence: 80, margin_real: 40, margin_orcado: 42,
        ebitda_real: 120000, ebitda_a1: 150000,
        high_priority_count: 2, conflicts_count: 0,
      },
      target_ebitda: 200000,
      candidates,
    });
    expect(candidates).toEqual(frozen);
  });

  it('computeForecast does not modify series', () => {
    const series: TimeSeriesPoint[] = [
      { score: 80, margin: 30, ebitda: 400000 },
      { score: 85, margin: 32, ebitda: 450000 },
    ];
    const frozen = JSON.parse(JSON.stringify(series));
    computeForecast(series);
    expect(series).toEqual(frozen);
  });
});
