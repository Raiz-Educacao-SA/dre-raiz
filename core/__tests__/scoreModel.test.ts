import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  calculateScoreBreakdown,
  classifyScore,
  evaluateScore,
  calculateScoreWithConfig,
  classifyScoreWithConfig,
  evaluateAlertRules,
  evaluateAlertRulesWithConfig,
  evaluateTrendAlertRules,
  DEFAULT_SCORE_CONFIG,
  DEFAULT_ALERT_CONFIG,
} from '../scoreModel';
import type { ScoreInputs, TrendSeries } from '../decisionTypes';

// --------------------------------------------
// Test Fixtures
// --------------------------------------------

const PERFECT_INPUTS: ScoreInputs = {
  confidence: 95,
  margin_real: 35,
  margin_orcado: 30,
  ebitda_real: 500000,
  ebitda_a1: 400000,
  high_priority_count: 0,
  conflicts_count: 0,
};

const WORST_INPUTS: ScoreInputs = {
  confidence: 0,
  margin_real: 5,
  margin_orcado: 40,
  ebitda_real: -100000,
  ebitda_a1: 500000,
  high_priority_count: 10,
  conflicts_count: 5,
};

const BOUNDARY_INPUTS: ScoreInputs = {
  confidence: 80,
  margin_real: 30,
  margin_orcado: 30,
  ebitda_real: 400000,
  ebitda_a1: 400000,
  high_priority_count: 3,
  conflicts_count: 0,
};

// --------------------------------------------
// calculateScore / calculateScoreBreakdown
// --------------------------------------------

describe('calculateScoreBreakdown', () => {
  it('returns 100 for perfect inputs (no penalties)', () => {
    const result = calculateScoreBreakdown(PERFECT_INPUTS);
    expect(result.final_score).toBe(100);
    expect(result.base).toBe(100);
    expect(result.penalty_confidence).toBe(0);
    expect(result.penalty_margin).toBe(0);
    expect(result.penalty_ebitda).toBe(0);
    expect(result.penalty_high_priority).toBe(0);
    expect(result.penalty_conflicts).toBe(0);
  });

  it('applies confidence penalty when confidence < 80', () => {
    const inputs = { ...PERFECT_INPUTS, confidence: 60 };
    const result = calculateScoreBreakdown(inputs);
    // (80 - 60) * 0.5 = 10
    expect(result.penalty_confidence).toBe(10);
    expect(result.final_score).toBe(90);
  });

  it('applies margin penalty when margin_real < margin_orcado', () => {
    const inputs = { ...PERFECT_INPUTS, margin_real: 25, margin_orcado: 30 };
    const result = calculateScoreBreakdown(inputs);
    // (30 - 25) * 2 = 10
    expect(result.penalty_margin).toBe(10);
    expect(result.final_score).toBe(90);
  });

  it('applies EBITDA penalty when ebitda_real < ebitda_a1', () => {
    const inputs = { ...PERFECT_INPUTS, ebitda_real: 300000, ebitda_a1: 400000 };
    const result = calculateScoreBreakdown(inputs);
    expect(result.penalty_ebitda).toBe(5);
    expect(result.final_score).toBe(95);
  });

  it('applies high priority penalty when count > 3', () => {
    const inputs = { ...PERFECT_INPUTS, high_priority_count: 5 };
    const result = calculateScoreBreakdown(inputs);
    expect(result.penalty_high_priority).toBe(5);
    expect(result.final_score).toBe(95);
  });

  it('applies conflicts penalty when count > 0', () => {
    const inputs = { ...PERFECT_INPUTS, conflicts_count: 1 };
    const result = calculateScoreBreakdown(inputs);
    expect(result.penalty_conflicts).toBe(3);
    expect(result.final_score).toBe(97);
  });

  it('clamps to 0 when penalties exceed 100', () => {
    const result = calculateScoreBreakdown(WORST_INPUTS);
    expect(result.final_score).toBe(0);
    expect(result.penalty_confidence).toBeGreaterThan(0);
  });

  it('does NOT penalize at exact boundary values', () => {
    const result = calculateScoreBreakdown(BOUNDARY_INPUTS);
    expect(result.penalty_confidence).toBe(0);   // confidence == 80
    expect(result.penalty_margin).toBe(0);        // margin_real == margin_orcado
    expect(result.penalty_ebitda).toBe(0);         // ebitda_real == ebitda_a1
    expect(result.penalty_high_priority).toBe(0);  // count == 3, not > 3
    expect(result.final_score).toBe(100);
  });

  it('is deterministic (same inputs → same output)', () => {
    const r1 = calculateScoreBreakdown(PERFECT_INPUTS);
    const r2 = calculateScoreBreakdown(PERFECT_INPUTS);
    expect(r1).toEqual(r2);
  });
});

describe('calculateScore', () => {
  it('returns same value as breakdown.final_score', () => {
    const score = calculateScore(PERFECT_INPUTS);
    const breakdown = calculateScoreBreakdown(PERFECT_INPUTS);
    expect(score).toBe(breakdown.final_score);
  });
});

// --------------------------------------------
// classifyScore
// --------------------------------------------

describe('classifyScore', () => {
  it('classifies >= 85 as Saudável', () => {
    expect(classifyScore(85)).toBe('Saudável');
    expect(classifyScore(100)).toBe('Saudável');
    expect(classifyScore(92)).toBe('Saudável');
  });

  it('classifies 70-84 as Atenção', () => {
    expect(classifyScore(70)).toBe('Atenção');
    expect(classifyScore(84)).toBe('Atenção');
    expect(classifyScore(75)).toBe('Atenção');
  });

  it('classifies < 70 as Crítico', () => {
    expect(classifyScore(69)).toBe('Crítico');
    expect(classifyScore(0)).toBe('Crítico');
    expect(classifyScore(50)).toBe('Crítico');
  });
});

// --------------------------------------------
// evaluateScore
// --------------------------------------------

describe('evaluateScore', () => {
  it('returns score, classification and breakdown together', () => {
    const result = evaluateScore(PERFECT_INPUTS);
    expect(result.score).toBe(100);
    expect(result.classification).toBe('Saudável');
    expect(result.breakdown.base).toBe(100);
  });
});

// --------------------------------------------
// Config-aware score
// --------------------------------------------

describe('calculateScoreWithConfig', () => {
  it('uses custom thresholds', () => {
    const config = { ...DEFAULT_SCORE_CONFIG, penalty_confidence_threshold: 90 };
    const inputs = { ...PERFECT_INPUTS, confidence: 85 };
    const result = calculateScoreWithConfig(inputs, config);
    // (90 - 85) * 0.5 = 2.5 → score = 100 - 2.5 = 97.5 → round = 98
    expect(result.penalty_confidence).toBe(2.5);
    expect(result.final_score).toBe(98);
  });

  it('uses custom penalty factors', () => {
    const config = { ...DEFAULT_SCORE_CONFIG, penalty_margin_factor: 5 };
    const inputs = { ...PERFECT_INPUTS, margin_real: 25, margin_orcado: 30 };
    const result = calculateScoreWithConfig(inputs, config);
    // (30 - 25) * 5 = 25
    expect(result.penalty_margin).toBe(25);
    expect(result.final_score).toBe(75);
  });
});

describe('classifyScoreWithConfig', () => {
  it('uses custom classification thresholds', () => {
    const config = { ...DEFAULT_SCORE_CONFIG, classification_healthy: 90, classification_attention: 80 };
    expect(classifyScoreWithConfig(89, config)).toBe('Atenção');
    expect(classifyScoreWithConfig(90, config)).toBe('Saudável');
    expect(classifyScoreWithConfig(79, config)).toBe('Crítico');
  });
});

// --------------------------------------------
// Alert evaluation
// --------------------------------------------

describe('evaluateAlertRules', () => {
  it('returns empty array for healthy inputs', () => {
    const alerts = evaluateAlertRules(PERFECT_INPUTS, 100);
    expect(alerts).toHaveLength(0);
  });

  it('generates HEALTH_SCORE_CRITICAL when score < 70', () => {
    const alerts = evaluateAlertRules(PERFECT_INPUTS, 65);
    expect(alerts.some(a => a.alert_type === 'HEALTH_SCORE_CRITICAL')).toBe(true);
  });

  it('generates LOW_MARGIN when gap > 2pp', () => {
    const inputs = { ...PERFECT_INPUTS, margin_real: 25, margin_orcado: 30 };
    const alerts = evaluateAlertRules(inputs, 90);
    expect(alerts.some(a => a.alert_type === 'LOW_MARGIN')).toBe(true);
  });

  it('does NOT generate LOW_MARGIN when gap is exactly 2pp', () => {
    const inputs = { ...PERFECT_INPUTS, margin_real: 28, margin_orcado: 30 };
    const alerts = evaluateAlertRules(inputs, 90);
    expect(alerts.some(a => a.alert_type === 'LOW_MARGIN')).toBe(false);
  });

  it('generates EBITDA_DROP when real < a1', () => {
    const inputs = { ...PERFECT_INPUTS, ebitda_real: 300000, ebitda_a1: 400000 };
    const alerts = evaluateAlertRules(inputs, 90);
    expect(alerts.some(a => a.alert_type === 'EBITDA_DROP')).toBe(true);
  });

  it('generates TOO_MANY_HIGH_PRIORITY when count > 3', () => {
    const inputs = { ...PERFECT_INPUTS, high_priority_count: 5 };
    const alerts = evaluateAlertRules(inputs, 90);
    expect(alerts.some(a => a.alert_type === 'TOO_MANY_HIGH_PRIORITY')).toBe(true);
  });

  it('generates AGENT_CONFLICTS when count > 2', () => {
    const inputs = { ...PERFECT_INPUTS, conflicts_count: 3 };
    const alerts = evaluateAlertRules(inputs, 90);
    expect(alerts.some(a => a.alert_type === 'AGENT_CONFLICTS')).toBe(true);
  });
});

// --------------------------------------------
// Trend alerts
// --------------------------------------------

describe('evaluateTrendAlertRules', () => {
  it('detects decreasing score trend', () => {
    const series: TrendSeries = {
      scores: [90, 85, 80],
      margins: [30, 30, 30],
      confidences: [90, 90, 90],
      high_priority_counts: [1, 1, 1],
    };
    const alerts = evaluateTrendAlertRules(series);
    expect(alerts.some(a => a.alert_type === 'TREND_SCORE_DOWN')).toBe(true);
  });

  it('detects increasing high priority trend', () => {
    const series: TrendSeries = {
      scores: [90, 90, 90],
      margins: [30, 30, 30],
      confidences: [90, 90, 90],
      high_priority_counts: [1, 2, 3],
    };
    const alerts = evaluateTrendAlertRules(series);
    expect(alerts.some(a => a.alert_type === 'TREND_RISK_INCREASING')).toBe(true);
  });

  it('returns empty for flat series', () => {
    const series: TrendSeries = {
      scores: [80, 80, 80],
      margins: [30, 30, 30],
      confidences: [90, 90, 90],
      high_priority_counts: [2, 2, 2],
    };
    const alerts = evaluateTrendAlertRules(series);
    expect(alerts).toHaveLength(0);
  });

  it('returns empty for < 3 data points', () => {
    const series: TrendSeries = {
      scores: [90, 85],
      margins: [30, 25],
      confidences: [90, 85],
      high_priority_counts: [1, 2],
    };
    const alerts = evaluateTrendAlertRules(series);
    expect(alerts).toHaveLength(0);
  });
});
