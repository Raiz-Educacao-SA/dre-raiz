// ============================================
// Benchmark Score Impact — Benchmark Intelligence Layer
// Funcoes puras — zero side effects, zero I/O
// Calcula ajuste do Health Score baseado na posicao relativa de benchmark
// ============================================

import type { BenchmarkComparison, PercentileBand, RiskPosition } from './benchmarkEngine';
import type { ScoreBreakdown } from './decisionTypes';

// --------------------------------------------
// Types
// --------------------------------------------

/** Fator de performance relativa ao benchmark */
export interface RelativePerformanceFactor {
  /** Bonus/penalidade baseado na posicao geral (-10 a +5) */
  position_adjustment: number;
  /** Bonus/penalidade baseado no gap composto (-5 a +3) */
  gap_adjustment: number;
  /** Bonus/penalidade baseado na tendencia de risco (-5 a +2) */
  risk_adjustment: number;
  /** Ajuste total combinado (-20 a +10) */
  total_adjustment: number;
  /** Explicacao do ajuste para UI */
  explanation: string;
}

/** Score ajustado com benchmark context */
export interface BenchmarkAdjustedScore {
  /** Score original sem ajuste benchmark */
  original_score: number;
  /** Fator de performance relativa */
  performance_factor: RelativePerformanceFactor;
  /** Score final ajustado (0-100) */
  adjusted_score: number;
  /** Breakdown original preservado */
  original_breakdown: ScoreBreakdown;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --------------------------------------------
// Position Adjustment
// --------------------------------------------

/**
 * Calcula ajuste baseado na banda geral (overall_band).
 *
 * - top_25: +5 (bonus por lideranca)
 * - above_median: +2 (bonus moderado)
 * - below_median: -3 (penalidade leve)
 * - bottom_25: -10 (penalidade severa)
 *
 * Logica: empresas no top do segmento merecem bonus;
 * empresas na base precisam de alerta via score mais baixo.
 */
export function calculatePositionAdjustment(band: PercentileBand): number {
  switch (band) {
    case 'top_25': return 5;
    case 'above_median': return 2;
    case 'below_median': return -3;
    case 'bottom_25': return -10;
    default: return 0;
  }
}

// --------------------------------------------
// Gap Adjustment
// --------------------------------------------

/**
 * Calcula ajuste baseado no gap composto de performance.
 *
 * composite_gap varia de -100 a +100 (calculado em benchmarkEngine).
 * Mapeamento:
 * - gap >= +30: +3 (empresa significativamente acima)
 * - gap >= +10: +1 (empresa moderadamente acima)
 * - gap > -10: 0 (empresa na media, sem ajuste)
 * - gap > -30: -2 (empresa moderadamente abaixo)
 * - gap <= -30: -5 (empresa significativamente abaixo)
 */
export function calculateGapAdjustment(compositeGap: number): number {
  if (compositeGap >= 30) return 3;
  if (compositeGap >= 10) return 1;
  if (compositeGap > -10) return 0;
  if (compositeGap > -30) return -2;
  return -5;
}

// --------------------------------------------
// Risk Adjustment
// --------------------------------------------

/**
 * Calcula ajuste baseado na posicao de risco relativa.
 *
 * - leader: +2 (lider reconhecido)
 * - competitive: +1 (competitivo)
 * - average: 0 (neutro)
 * - lagging: -2 (atras do mercado)
 * - at_risk: -5 (risco significativo)
 */
export function calculateRiskAdjustment(riskPosition: RiskPosition): number {
  switch (riskPosition) {
    case 'leader': return 2;
    case 'competitive': return 1;
    case 'average': return 0;
    case 'lagging': return -2;
    case 'at_risk': return -5;
    default: return 0;
  }
}

// --------------------------------------------
// Explanation Builder
// --------------------------------------------

/**
 * Constroi explicacao textual do ajuste para exibicao na UI.
 */
export function buildAdjustmentExplanation(
  band: PercentileBand,
  riskPosition: RiskPosition,
  totalAdjustment: number,
): string {
  const direction = totalAdjustment > 0 ? 'bonus' : totalAdjustment < 0 ? 'penalidade' : 'neutro';

  const bandLabels: Record<PercentileBand, string> = {
    top_25: 'Top 25% do segmento',
    above_median: 'Acima da mediana do segmento',
    below_median: 'Abaixo da mediana do segmento',
    bottom_25: 'Bottom 25% do segmento',
  };

  const riskLabels: Record<RiskPosition, string> = {
    leader: 'lider',
    competitive: 'competitivo',
    average: 'na media',
    lagging: 'abaixo do mercado',
    at_risk: 'em risco',
  };

  const bandText = bandLabels[band] ?? String(band);
  const riskText = riskLabels[riskPosition] ?? String(riskPosition);

  if (totalAdjustment === 0) {
    return `Posicao ${bandText}, perfil ${riskText}. Sem ajuste de benchmark.`;
  }

  const sign = totalAdjustment > 0 ? '+' : '';
  return `Posicao ${bandText}, perfil ${riskText}. Ajuste de ${direction}: ${sign}${totalAdjustment} pontos.`;
}

// --------------------------------------------
// Main: Calculate Relative Performance Factor
// --------------------------------------------

/**
 * Calcula o fator de performance relativa completo.
 *
 * Combina 3 componentes independentes:
 * 1. Position adjustment: baseado na banda geral (top_25/above_median/below_median/bottom_25)
 * 2. Gap adjustment: baseado no gap composto vs media do segmento
 * 3. Risk adjustment: baseado na classificacao de risco relativa
 *
 * O total_adjustment e clamped para [-20, +10] para evitar distorcoes extremas.
 * Um score de 80 pode subir para 90 (lider total) ou cair para 60 (em risco total).
 */
export function calculateRelativePerformanceFactor(
  comparison: BenchmarkComparison,
): RelativePerformanceFactor {
  const posAdj = calculatePositionAdjustment(comparison.overall_band);
  const gapAdj = calculateGapAdjustment(comparison.performance_gap.composite_gap);
  const riskAdj = calculateRiskAdjustment(comparison.risk_relative_position);

  const rawTotal = posAdj + gapAdj + riskAdj;
  const total = clamp(rawTotal, -20, 10);

  const explanation = buildAdjustmentExplanation(
    comparison.overall_band,
    comparison.risk_relative_position,
    total,
  );

  return {
    position_adjustment: posAdj,
    gap_adjustment: gapAdj,
    risk_adjustment: riskAdj,
    total_adjustment: total,
    explanation,
  };
}

// --------------------------------------------
// Apply Benchmark Adjustment to Score
// --------------------------------------------

/**
 * Aplica o ajuste de benchmark a um score existente.
 *
 * NAO modifica o breakdown original — apenas adiciona o ajuste benchmark
 * como uma camada externa. O score original permanece intacto para auditoria.
 *
 * Se comparison for null (sem dados de benchmark), retorna score original sem ajuste.
 *
 * @param originalScore - Health Score calculado pelo scoreModel (0-100)
 * @param breakdown - Breakdown original do scoreModel
 * @param comparison - Resultado da comparacao com benchmark (pode ser null)
 * @returns Score ajustado com context de benchmark
 */
export function applyBenchmarkAdjustment(
  originalScore: number,
  breakdown: ScoreBreakdown,
  comparison: BenchmarkComparison | null,
): BenchmarkAdjustedScore {
  if (!comparison) {
    return {
      original_score: originalScore,
      performance_factor: {
        position_adjustment: 0,
        gap_adjustment: 0,
        risk_adjustment: 0,
        total_adjustment: 0,
        explanation: 'Sem dados de benchmark disponiveis.',
      },
      adjusted_score: originalScore,
      original_breakdown: { ...breakdown },
    };
  }

  const factor = calculateRelativePerformanceFactor(comparison);
  const adjusted = clamp(Math.round(originalScore + factor.total_adjustment), 0, 100);

  return {
    original_score: originalScore,
    performance_factor: factor,
    adjusted_score: adjusted,
    original_breakdown: { ...breakdown },
  };
}

// --------------------------------------------
// Convenience: Quick Impact Assessment
// --------------------------------------------

/**
 * Avaliacao rapida do impacto do benchmark no score.
 * Retorna apenas o ajuste numerico (-20 a +10) sem context completo.
 *
 * Util para dashboards que precisam apenas do delta.
 */
export function quickBenchmarkImpact(comparison: BenchmarkComparison | null): number {
  if (!comparison) return 0;
  return calculateRelativePerformanceFactor(comparison).total_adjustment;
}

/**
 * Verifica se a posicao de benchmark justifica um alerta adicional.
 *
 * Retorna true se a empresa esta em posicao de risco relativo
 * (bottom_25 OU at_risk OU composite_gap < -30).
 */
export function shouldAlertBenchmarkPosition(
  comparison: BenchmarkComparison | null,
): boolean {
  if (!comparison) return false;

  return (
    comparison.overall_band === 'bottom_25' ||
    comparison.risk_relative_position === 'at_risk' ||
    comparison.performance_gap.composite_gap < -30
  );
}
