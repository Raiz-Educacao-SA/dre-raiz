import { describe, it, expect } from 'vitest';
import {
  calculateGap,
  sortCandidates,
  distributeCuts,
  distributeCutsWithConfig,
  projectAfterPlan,
  filterProtectedAreas,
  applyPerAreaCap,
  validateConstraints,
  evaluateObjective,
  runOptimization,
  gridSearch,
} from '../optimizationEngine';
import type {
  CutCandidate,
  FinancialInputs,
  ScoreInputs,
  OptimizationInput,
} from '../decisionTypes';

// --------------------------------------------
// Test Fixtures
// --------------------------------------------

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

const SCORE_INPUTS: ScoreInputs = {
  confidence: 85,
  margin_real: 40,
  margin_orcado: 35,
  ebitda_real: 120000,
  ebitda_a1: 150000,
  high_priority_count: 2,
  conflicts_count: 0,
};

const CANDIDATES: CutCandidate[] = [
  { area: 'Marketing', gap: 50000, volume: 200000 },
  { area: 'T&D', gap: 30000, volume: 100000 },
  { area: 'Facilities', gap: 0, volume: 80000 },
];

// --------------------------------------------
// calculateGap
// --------------------------------------------

describe('calculateGap', () => {
  it('calculates gap from target_ebitda', () => {
    expect(calculateGap(120000, 80, 1000000, undefined, 200000)).toBe(80000);
  });

  it('calculates gap from target_score', () => {
    // scoreDiff = 90 - 80 = 10; gap = (10/100) * 1000000 = 100000
    expect(calculateGap(120000, 80, 1000000, 90)).toBe(100000);
  });

  it('returns 0 when no target', () => {
    expect(calculateGap(120000, 80, 1000000)).toBe(0);
  });

  it('prefers target_ebitda over target_score', () => {
    const gap = calculateGap(120000, 80, 1000000, 90, 200000);
    expect(gap).toBe(80000); // target_ebitda takes precedence
  });

  it('returns negative gap when target already met', () => {
    expect(calculateGap(200000, 90, 1000000, undefined, 150000)).toBe(-50000);
  });
});

// --------------------------------------------
// sortCandidates
// --------------------------------------------

describe('sortCandidates', () => {
  it('sorts by gap desc, then volume desc', () => {
    const sorted = sortCandidates(CANDIDATES);
    expect(sorted[0].area).toBe('Marketing');  // gap 50000
    expect(sorted[1].area).toBe('T&D');        // gap 30000
    expect(sorted[2].area).toBe('Facilities'); // gap 0
  });

  it('does not mutate original array', () => {
    const original = [...CANDIDATES];
    sortCandidates(CANDIDATES);
    expect(CANDIDATES).toEqual(original);
  });

  it('breaks ties by volume', () => {
    const candidates: CutCandidate[] = [
      { area: 'A', gap: 100, volume: 200 },
      { area: 'B', gap: 100, volume: 500 },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].area).toBe('B'); // higher volume
  });
});

// --------------------------------------------
// distributeCuts
// --------------------------------------------

describe('distributeCuts', () => {
  it('returns empty for gap <= 0', () => {
    expect(distributeCuts(CANDIDATES, 0)).toHaveLength(0);
    expect(distributeCuts(CANDIDATES, -100)).toHaveLength(0);
  });

  it('distributes within gap limits', () => {
    const sorted = sortCandidates(CANDIDATES);
    const actions = distributeCuts(sorted, 60000);
    expect(actions.length).toBeGreaterThan(0);
    const totalCut = actions.reduce((s, a) => s + a.suggested_cut, 0);
    expect(totalCut).toBeLessThanOrEqual(60000);
  });

  it('assigns priority based on contribution', () => {
    const sorted = sortCandidates(CANDIDATES);
    const actions = distributeCuts(sorted, 50000);
    actions.forEach(a => {
      expect(['high', 'medium', 'low']).toContain(a.priority);
    });
  });

  it('uses 10% of volume for candidates with gap=0', () => {
    const candidates: CutCandidate[] = [
      { area: 'NoGap', gap: 0, volume: 100000 },
    ];
    const actions = distributeCuts(candidates, 50000);
    // maxCut = 100000 * 0.1 = 10000
    expect(actions[0].suggested_cut).toBe(10000);
  });
});

// --------------------------------------------
// filterProtectedAreas
// --------------------------------------------

describe('filterProtectedAreas', () => {
  it('removes protected areas (case insensitive)', () => {
    const result = filterProtectedAreas(CANDIDATES, ['marketing']);
    expect(result.length).toBe(2);
    expect(result.every(c => c.area !== 'Marketing')).toBe(true);
  });

  it('returns all candidates when no protected areas', () => {
    const result = filterProtectedAreas(CANDIDATES, []);
    expect(result.length).toBe(3);
  });
});

// --------------------------------------------
// applyPerAreaCap
// --------------------------------------------

describe('applyPerAreaCap', () => {
  it('caps gap but preserves volume', () => {
    const result = applyPerAreaCap(CANDIDATES, 20000);
    expect(result[0].gap).toBe(20000); // was 50000
    expect(result[0].volume).toBe(200000); // unchanged
  });

  it('does not increase gap', () => {
    const result = applyPerAreaCap(CANDIDATES, 100000);
    expect(result[2].gap).toBe(0); // was 0, stays 0
  });
});

// --------------------------------------------
// validateConstraints
// --------------------------------------------

describe('validateConstraints', () => {
  it('passes when all constraints met', () => {
    const result = validateConstraints(
      { ebitda: 200000, margin: 35, score: 85 },
      50000,
      FINANCIALS,
      { min_margin: 30, max_total_cut: 100000 },
    );
    expect(result.satisfied).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when margin below minimum', () => {
    const result = validateConstraints(
      { ebitda: 200000, margin: 20, score: 85 },
      50000,
      FINANCIALS,
      { min_margin: 30 },
    );
    expect(result.satisfied).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('fails when total cut exceeds maximum', () => {
    const result = validateConstraints(
      { ebitda: 200000, margin: 35, score: 85 },
      150000,
      FINANCIALS,
      { max_total_cut: 100000 },
    );
    expect(result.satisfied).toBe(false);
  });
});

// --------------------------------------------
// evaluateObjective
// --------------------------------------------

describe('evaluateObjective', () => {
  const projected = { ebitda: 200000, margin: 35, score: 85 };

  it('maximize_score returns score', () => {
    expect(evaluateObjective('maximize_score', projected)).toBe(85);
  });

  it('maximize_ebitda returns ebitda', () => {
    expect(evaluateObjective('maximize_ebitda', projected)).toBe(200000);
  });

  it('minimize_risk returns score + margin bonus', () => {
    // 85 + 35 * 0.1 = 88.5
    expect(evaluateObjective('minimize_risk', projected)).toBe(88.5);
  });
});

// --------------------------------------------
// projectAfterPlan
// --------------------------------------------

describe('projectAfterPlan', () => {
  it('improves EBITDA by totalCut amount', () => {
    const result = projectAfterPlan(FINANCIALS, SCORE_INPUTS, 50000);
    // EBITDA = 1M + (-600K) + (-200K) + (-50K) + (-30K) + 50K = 170000
    expect(result.ebitda).toBe(170000);
  });

  it('returns 0 cut → unchanged metrics', () => {
    const result = projectAfterPlan(FINANCIALS, SCORE_INPUTS, 0);
    expect(result.ebitda).toBe(120000); // original EBITDA
  });
});

// --------------------------------------------
// runOptimization (integration)
// --------------------------------------------

describe('runOptimization', () => {
  it('returns no actions when target already met (gap <= 0)', () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: { ...SCORE_INPUTS, margin_real: 40, margin_orcado: 35 },
      target_score: 50, // already above
      candidates: CANDIDATES,
    };
    const result = runOptimization(input);
    expect(result.gap).toBe(0);
    expect(result.proposed_actions).toHaveLength(0);
  });

  it('returns actions when target not met', () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: SCORE_INPUTS,
      target_ebitda: 300000,
      candidates: CANDIDATES,
    };
    const result = runOptimization(input);
    expect(result.gap).toBeGreaterThan(0);
    expect(result.proposed_actions.length).toBeGreaterThan(0);
    expect(result.projected_ebitda).toBeGreaterThan(120000);
  });

  it('returns no actions when no candidates', () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: SCORE_INPUTS,
      target_ebitda: 300000,
      candidates: [],
    };
    const result = runOptimization(input);
    expect(result.proposed_actions).toHaveLength(0);
  });

  it('is deterministic', () => {
    const input: OptimizationInput = {
      current_financials: FINANCIALS,
      current_score_inputs: SCORE_INPUTS,
      target_ebitda: 200000,
      candidates: CANDIDATES,
    };
    const r1 = runOptimization(input);
    const r2 = runOptimization(input);
    expect(r1).toEqual(r2);
  });
});
