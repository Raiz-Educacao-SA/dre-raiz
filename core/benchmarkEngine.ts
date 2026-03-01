// ============================================
// Core Benchmark Engine — Benchmark Intelligence Layer
// Funções puras — zero side effects, zero I/O
// Compara métricas da empresa com benchmarks de mercado
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

/** Métricas da empresa para comparação */
export interface CompanyMetrics {
  margin: number;      // Margem de contribuição (%)
  ebitda: number;      // EBITDA (valor absoluto)
  score: number;       // Health Score (0-100)
  growth: number;      // Crescimento receita YoY (%)
}

/** Dados de benchmark do segmento (vindos de benchmark_aggregates) */
export interface BenchmarkData {
  industry_segment: string;
  revenue_range: string;
  avg_margin: number;
  avg_ebitda: number;
  avg_growth: number;
  avg_score: number;
  percentile_25_margin: number;
  percentile_50_margin: number;
  percentile_75_margin: number;
  percentile_25_ebitda: number;
  percentile_50_ebitda: number;
  percentile_75_ebitda: number;
  percentile_25_score: number;
  percentile_50_score: number;
  percentile_75_score: number;
  percentile_25_growth: number;
  percentile_50_growth: number;
  percentile_75_growth: number;
  sample_count: number;
  reference_period: string;
}

/** Classificação de posição relativa */
export type PercentileBand = 'top_25' | 'above_median' | 'below_median' | 'bottom_25';

/** Resultado da comparação de uma métrica individual */
export interface MetricComparison {
  company_value: number;
  benchmark_avg: number;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  estimated_percentile: number;  // 0-100, posição estimada
  band: PercentileBand;
  gap_to_median: number;         // diferença para a mediana (positivo = acima)
  gap_to_top25: number;          // diferença para o P75 (positivo = acima)
}

/** Posição relativa de risco */
export type RiskPosition = 'leader' | 'competitive' | 'average' | 'lagging' | 'at_risk';

/** Resultado completo da comparação */
export interface BenchmarkComparison {
  margin_percentile: MetricComparison;
  ebitda_percentile: MetricComparison;
  score_percentile: MetricComparison;
  growth_percentile: MetricComparison;
  risk_relative_position: RiskPosition;
  performance_gap: PerformanceGap;
  overall_band: PercentileBand;
  benchmark_context: {
    industry_segment: string;
    revenue_range: string;
    sample_count: number;
    reference_period: string;
  };
}

/** Gap de performance agregado */
export interface PerformanceGap {
  margin_gap_pct: number;    // % acima/abaixo da média
  ebitda_gap_pct: number;
  score_gap_pts: number;     // pontos acima/abaixo
  growth_gap_pct: number;
  composite_gap: number;     // score composto (-100 a +100)
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Divisão segura */
function safeDiv(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return num / den;
}

// --------------------------------------------
// Percentile Estimation
// --------------------------------------------

/**
 * Estima o percentil de um valor dado 3 pontos de referência (P25, P50, P75).
 *
 * Usa interpolação linear entre os quartis conhecidos:
 * - valor <= P25 → estima entre 0 e 25
 * - P25 < valor <= P50 → estima entre 25 e 50
 * - P50 < valor <= P75 → estima entre 50 e 75
 * - valor > P75 → estima entre 75 e 100
 *
 * Retorna valor clamped entre 0 e 100.
 */
export function estimatePercentile(
  value: number,
  p25: number,
  p50: number,
  p75: number,
): number {
  // Proteção: se todos iguais, retorna 50 (mediana)
  if (p25 === p50 && p50 === p75) return 50;

  let percentile: number;

  if (value <= p25) {
    // Abaixo do P25 — extrapola para 0-25
    const range = p50 - p25;
    if (range === 0) {
      percentile = value < p25 ? 10 : 25;
    } else {
      const ratio = safeDiv(p25 - value, range);
      percentile = 25 - ratio * 25;
    }
  } else if (value <= p50) {
    // Entre P25 e P50 — interpola 25-50
    const range = p50 - p25;
    if (range === 0) {
      percentile = 37.5;
    } else {
      percentile = 25 + safeDiv(value - p25, range) * 25;
    }
  } else if (value <= p75) {
    // Entre P50 e P75 — interpola 50-75
    const range = p75 - p50;
    if (range === 0) {
      percentile = 62.5;
    } else {
      percentile = 50 + safeDiv(value - p50, range) * 25;
    }
  } else {
    // Acima do P75 — extrapola para 75-100
    const range = p75 - p50;
    if (range === 0) {
      percentile = value > p75 ? 90 : 75;
    } else {
      const ratio = safeDiv(value - p75, range);
      percentile = 75 + ratio * 25;
    }
  }

  return round2(clamp(percentile, 0, 100));
}

// --------------------------------------------
// Band Classification
// --------------------------------------------

/**
 * Classifica o percentil em faixa:
 * >= 75 → top_25
 * >= 50 → above_median
 * >= 25 → below_median
 * < 25 → bottom_25
 */
export function classifyBand(percentile: number): PercentileBand {
  if (percentile >= 75) return 'top_25';
  if (percentile >= 50) return 'above_median';
  if (percentile >= 25) return 'below_median';
  return 'bottom_25';
}

// --------------------------------------------
// Risk Position
// --------------------------------------------

/**
 * Determina a posição relativa de risco baseada no score e margem.
 *
 * - leader: score P75+ E margem P75+
 * - competitive: score P50+ E margem P50+
 * - average: score P25-P75 OU margem P25-P75
 * - lagging: score < P50 E margem < P50
 * - at_risk: score < P25 OU margem < P25
 */
export function classifyRiskPosition(
  scorePercentile: number,
  marginPercentile: number,
): RiskPosition {
  if (scorePercentile >= 75 && marginPercentile >= 75) return 'leader';
  if (scorePercentile >= 50 && marginPercentile >= 50) return 'competitive';
  if (scorePercentile < 25 || marginPercentile < 25) return 'at_risk';
  if (scorePercentile < 50 && marginPercentile < 50) return 'lagging';
  return 'average';
}

// --------------------------------------------
// Performance Gap
// --------------------------------------------

/**
 * Calcula gaps de performance vs média do benchmark.
 * Valores positivos = empresa acima da média.
 *
 * composite_gap: média ponderada normalizada (-100 a +100)
 *   - margin: peso 30%
 *   - ebitda: peso 25%
 *   - score: peso 25%
 *   - growth: peso 20%
 */
export function calculatePerformanceGap(
  company: CompanyMetrics,
  benchmark: BenchmarkData,
): PerformanceGap {
  // Gap percentual vs média
  const marginGap = round2(safeDiv(company.margin - benchmark.avg_margin, Math.abs(benchmark.avg_margin)) * 100);
  const ebitdaGap = round2(safeDiv(company.ebitda - benchmark.avg_ebitda, Math.abs(benchmark.avg_ebitda)) * 100);
  const growthGap = round2(safeDiv(company.growth - benchmark.avg_growth, Math.max(Math.abs(benchmark.avg_growth), 1)) * 100);

  // Score gap em pontos absolutos
  const scoreGap = round2(company.score - benchmark.avg_score);

  // Composite: normaliza cada gap para -100..+100 e pondera
  const normMargin = clamp(marginGap, -100, 100);
  const normEbitda = clamp(ebitdaGap, -100, 100);
  const normScore = clamp(scoreGap * 2, -100, 100); // score gap * 2 para normalizar (50pts diff = 100)
  const normGrowth = clamp(growthGap, -100, 100);

  const composite = round2(
    normMargin * 0.30 +
    normEbitda * 0.25 +
    normScore * 0.25 +
    normGrowth * 0.20,
  );

  return {
    margin_gap_pct: marginGap,
    ebitda_gap_pct: ebitdaGap,
    score_gap_pts: scoreGap,
    growth_gap_pct: growthGap,
    composite_gap: clamp(composite, -100, 100),
  };
}

// --------------------------------------------
// Single Metric Comparison
// --------------------------------------------

/**
 * Compara uma métrica individual com seu benchmark.
 */
export function compareMetric(
  value: number,
  benchmarkAvg: number,
  p25: number,
  p50: number,
  p75: number,
): MetricComparison {
  const percentile = estimatePercentile(value, p25, p50, p75);

  return {
    company_value: value,
    benchmark_avg: benchmarkAvg,
    percentile_25: p25,
    percentile_50: p50,
    percentile_75: p75,
    estimated_percentile: percentile,
    band: classifyBand(percentile),
    gap_to_median: round2(value - p50),
    gap_to_top25: round2(value - p75),
  };
}

// --------------------------------------------
// Full Comparison
// --------------------------------------------

/**
 * Compara todas as métricas da empresa com o benchmark do segmento.
 *
 * Retorna percentis estimados, classificação de risco,
 * gap de performance e banda geral.
 *
 * Requer benchmark com sample_count >= 5 (garantido pela tabela).
 */
export function compareWithBenchmark(
  companyMetrics: CompanyMetrics,
  benchmarkData: BenchmarkData,
): BenchmarkComparison {
  const marginComp = compareMetric(
    companyMetrics.margin,
    benchmarkData.avg_margin,
    benchmarkData.percentile_25_margin,
    benchmarkData.percentile_50_margin,
    benchmarkData.percentile_75_margin,
  );

  const ebitdaComp = compareMetric(
    companyMetrics.ebitda,
    benchmarkData.avg_ebitda,
    benchmarkData.percentile_25_ebitda,
    benchmarkData.percentile_50_ebitda,
    benchmarkData.percentile_75_ebitda,
  );

  const scoreComp = compareMetric(
    companyMetrics.score,
    benchmarkData.avg_score,
    benchmarkData.percentile_25_score,
    benchmarkData.percentile_50_score,
    benchmarkData.percentile_75_score,
  );

  const growthComp = compareMetric(
    companyMetrics.growth,
    benchmarkData.avg_growth,
    benchmarkData.percentile_25_growth,
    benchmarkData.percentile_50_growth,
    benchmarkData.percentile_75_growth,
  );

  const riskPosition = classifyRiskPosition(
    scoreComp.estimated_percentile,
    marginComp.estimated_percentile,
  );

  const performanceGap = calculatePerformanceGap(companyMetrics, benchmarkData);

  // Overall band: média dos 4 percentis
  const avgPercentile = round2(
    (marginComp.estimated_percentile +
     ebitdaComp.estimated_percentile +
     scoreComp.estimated_percentile +
     growthComp.estimated_percentile) / 4,
  );

  return {
    margin_percentile: marginComp,
    ebitda_percentile: ebitdaComp,
    score_percentile: scoreComp,
    growth_percentile: growthComp,
    risk_relative_position: riskPosition,
    performance_gap: performanceGap,
    overall_band: classifyBand(avgPercentile),
    benchmark_context: {
      industry_segment: benchmarkData.industry_segment,
      revenue_range: benchmarkData.revenue_range,
      sample_count: benchmarkData.sample_count,
      reference_period: benchmarkData.reference_period,
    },
  };
}
