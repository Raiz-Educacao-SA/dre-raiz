import { describe, it, expect } from 'vitest';
import {
  safePct,
  calculateEbitda,
  calculateMargin,
  calculateMarginAbsolute,
  applyDeltas,
  normalizeFinancialInputs,
  deriveMetrics,
} from '../financialModel';
import type { FinancialInputs } from '../decisionTypes';

// --------------------------------------------
// Test Fixture
// --------------------------------------------

const SAMPLE_INPUTS: FinancialInputs = {
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

// --------------------------------------------
// safePct
// --------------------------------------------

describe('safePct', () => {
  it('calculates percentage correctly', () => {
    expect(safePct(50, 200)).toBe(25);
  });

  it('uses absolute value of denominator (numerator sign preserved)', () => {
    // -600000 / |-1000000| * 100 = -60 (abs only on denominator)
    expect(safePct(-600000, -1000000)).toBe(-60);
    // positive numerator, negative denominator
    expect(safePct(400000, -1000000)).toBe(40);
  });

  it('returns 0 for zero denominator', () => {
    expect(safePct(100, 0)).toBe(0);
  });

  it('returns 0 for NaN input', () => {
    expect(safePct(NaN, 100)).toBe(0);
  });

  it('returns 0 for Infinity input', () => {
    expect(safePct(Infinity, 100)).toBe(0);
  });

  it('returns 0 for non-finite denominator', () => {
    expect(safePct(100, Infinity)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 1/3 * 100 = 33.333... → 33.33
    expect(safePct(1, 3)).toBe(33.33);
  });
});

// --------------------------------------------
// calculateEbitda
// --------------------------------------------

describe('calculateEbitda', () => {
  it('sums all components (costs are negative)', () => {
    // 1000000 + (-600000) + (-200000) + (-50000) + (-30000) = 120000
    expect(calculateEbitda(SAMPLE_INPUTS)).toBe(120000);
  });

  it('returns receita when all costs are zero', () => {
    const inputs: FinancialInputs = {
      receita_real: 500000,
      receita_orcado: 500000,
      custos_variaveis_real: 0,
      custos_variaveis_orcado: 0,
      custos_fixos_real: 0,
      custos_fixos_orcado: 0,
      sga_real: 0,
      sga_orcado: 0,
      rateio_real: 0,
      rateio_orcado: 0,
    };
    expect(calculateEbitda(inputs)).toBe(500000);
  });

  it('can be negative (loss scenario)', () => {
    const inputs: FinancialInputs = {
      ...SAMPLE_INPUTS,
      receita_real: 100000,
      custos_variaveis_real: -200000,
    };
    // 100000 + (-200000) + (-200000) + (-50000) + (-30000) = -380000
    expect(calculateEbitda(inputs)).toBe(-380000);
  });
});

// --------------------------------------------
// calculateMargin
// --------------------------------------------

describe('calculateMargin', () => {
  it('calculates margin percentage', () => {
    // (1000000 + (-600000)) / |1000000| * 100 = 40%
    expect(calculateMargin(1000000, -600000)).toBe(40);
  });

  it('returns 0 for zero revenue', () => {
    expect(calculateMargin(0, -100000)).toBe(0);
  });

  it('handles negative revenue', () => {
    // (-100 + (-50)) / |-100| * 100 = -150%
    expect(calculateMargin(-100, -50)).toBe(-150);
  });
});

// --------------------------------------------
// calculateMarginAbsolute
// --------------------------------------------

describe('calculateMarginAbsolute', () => {
  it('returns receita + custos_variaveis', () => {
    expect(calculateMarginAbsolute(1000000, -600000)).toBe(400000);
  });

  it('can be negative', () => {
    expect(calculateMarginAbsolute(100000, -200000)).toBe(-100000);
  });
});

// --------------------------------------------
// applyDeltas
// --------------------------------------------

describe('applyDeltas', () => {
  it('applies revenue and cost deltas', () => {
    const result = applyDeltas(SAMPLE_INPUTS, {
      revenue_delta: 100000,
      cv_delta: -50000,
      cf_delta: 10000,
      sga_delta: 5000,
    });
    expect(result.receita_real).toBe(1100000);
    expect(result.custos_variaveis_real).toBe(-650000);
    expect(result.custos_fixos_real).toBe(-190000);
    expect(result.sga_real).toBe(-45000);
  });

  it('preserves rateio and orcados', () => {
    const result = applyDeltas(SAMPLE_INPUTS, {
      revenue_delta: 0,
      cv_delta: 0,
      cf_delta: 0,
      sga_delta: 0,
    });
    expect(result.rateio_real).toBe(SAMPLE_INPUTS.rateio_real);
    expect(result.receita_orcado).toBe(SAMPLE_INPUTS.receita_orcado);
  });
});

// --------------------------------------------
// normalizeFinancialInputs
// --------------------------------------------

describe('normalizeFinancialInputs', () => {
  it('extracts FinancialInputs from summary structure', () => {
    const summary = {
      receita: { real: 100, orcado: 120 },
      custos_variaveis: { real: -60, orcado: -70 },
      custos_fixos: { real: -20, orcado: -22 },
      sga: { real: -5, orcado: -6 },
      rateio: { real: -3, orcado: -4 },
    };
    const result = normalizeFinancialInputs(summary);
    expect(result.receita_real).toBe(100);
    expect(result.receita_orcado).toBe(120);
    expect(result.custos_variaveis_real).toBe(-60);
    expect(result.rateio_orcado).toBe(-4);
  });
});

// --------------------------------------------
// deriveMetrics
// --------------------------------------------

describe('deriveMetrics', () => {
  it('calculates all derived metrics', () => {
    const metrics = deriveMetrics(SAMPLE_INPUTS);
    expect(metrics.ebitda).toBe(120000);
    expect(metrics.margin).toBe(40); // (1M + (-600K)) / |1M| * 100
    expect(metrics.margin_absolute).toBe(400000);
  });
});
