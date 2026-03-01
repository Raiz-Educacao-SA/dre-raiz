// ============================================
// Core Benchmark Maturity Report — Benchmark Intelligence Layer
// Funcoes puras — zero side effects, zero I/O
// Gera relatorio executivo de maturidade benchmark
// ============================================

import type {
  BenchmarkComparison,
  MetricComparison,
  PercentileBand,
  RiskPosition,
  PerformanceGap,
} from './benchmarkEngine';
import type { RelativePerformanceFactor } from './benchmarkScoreImpact';

// --------------------------------------------
// Types
// --------------------------------------------

/** Classificacao de maturidade benchmark */
export type BenchmarkMaturity = 'initial' | 'developing' | 'established' | 'advanced';

/** Insight do benchmark report */
export interface BenchmarkInsight {
  category: 'strength' | 'opportunity' | 'risk' | 'action_required';
  title: string;
  description: string;
  metric: string;
  priority: 'high' | 'medium' | 'low';
}

/** Recomendacao estrategica */
export interface StrategicRecommendation {
  area: string;
  action: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: 'short' | 'medium' | 'long';
}

/** Analise por metrica individual */
export interface MetricAnalysis {
  metric_name: string;
  company_value: number;
  benchmark_median: number;
  benchmark_p75: number;
  estimated_percentile: number;
  band: PercentileBand;
  gap_to_median: number;
  gap_to_top25: number;
  status: 'above_target' | 'on_track' | 'below_target' | 'critical';
}

/** Sumario competitivo */
export interface CompetitiveSummary {
  overall_position: string;
  risk_classification: string;
  composite_gap: number;
  strongest_metric: MetricAnalysis;
  weakest_metric: MetricAnalysis;
  metrics_above_median: number;
  metrics_below_median: number;
}

/** Relatorio completo de Benchmark Maturity */
export interface BenchmarkMaturityReport {
  report_id: string;
  generated_at: string;

  // Context
  industry_segment: string;
  revenue_range: string;
  sample_count: number;
  reference_period: string;

  // Executive summary
  executive_summary: string;
  maturity: BenchmarkMaturity;

  // Competitive position
  competitive_summary: CompetitiveSummary;

  // Metric-by-metric analysis
  metric_analyses: MetricAnalysis[];

  // Score impact
  score_impact: RelativePerformanceFactor;

  // Insights
  insights: BenchmarkInsight[];

  // Strategic recommendations
  recommendations: StrategicRecommendation[];
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Labels legíveis para bandas */
const BAND_LABELS: Record<PercentileBand, string> = {
  top_25: 'Top 25%',
  above_median: 'Acima da Mediana',
  below_median: 'Abaixo da Mediana',
  bottom_25: 'Bottom 25%',
};

/** Labels legíveis para risco */
const RISK_LABELS: Record<RiskPosition, string> = {
  leader: 'Lider do Segmento',
  competitive: 'Competitivo',
  average: 'Na Media',
  lagging: 'Abaixo do Mercado',
  at_risk: 'Em Risco',
};

// --------------------------------------------
// Metric Analysis
// --------------------------------------------

/**
 * Analisa uma metrica individual, classificando seu status.
 *
 * - above_target: percentil >= 75 (top 25%)
 * - on_track: percentil >= 50 (acima mediana)
 * - below_target: percentil >= 25 (abaixo mediana)
 * - critical: percentil < 25 (bottom 25%)
 */
export function analyzeMetric(
  name: string,
  comp: MetricComparison,
): MetricAnalysis {
  let status: MetricAnalysis['status'];
  if (comp.estimated_percentile >= 75) status = 'above_target';
  else if (comp.estimated_percentile >= 50) status = 'on_track';
  else if (comp.estimated_percentile >= 25) status = 'below_target';
  else status = 'critical';

  return {
    metric_name: name,
    company_value: comp.company_value,
    benchmark_median: comp.percentile_50,
    benchmark_p75: comp.percentile_75,
    estimated_percentile: comp.estimated_percentile,
    band: comp.band,
    gap_to_median: comp.gap_to_median,
    gap_to_top25: comp.gap_to_top25,
    status,
  };
}

// --------------------------------------------
// Competitive Summary
// --------------------------------------------

/**
 * Constroi sumario competitivo a partir da comparacao benchmark.
 */
export function buildCompetitiveSummary(
  comparison: BenchmarkComparison,
  analyses: MetricAnalysis[],
): CompetitiveSummary {
  if (analyses.length === 0) {
    throw new Error('buildCompetitiveSummary requires at least 1 MetricAnalysis');
  }

  const sorted = [...analyses].sort(
    (a, b) => b.estimated_percentile - a.estimated_percentile,
  );
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const aboveMedian = analyses.filter(a => a.estimated_percentile >= 50).length;
  const belowMedian = analyses.length - aboveMedian;

  const overallLabel = BAND_LABELS[comparison.overall_band] ?? String(comparison.overall_band);
  const riskLabel = RISK_LABELS[comparison.risk_relative_position] ?? String(comparison.risk_relative_position);

  return {
    overall_position: overallLabel,
    risk_classification: riskLabel,
    composite_gap: comparison.performance_gap.composite_gap,
    strongest_metric: strongest,
    weakest_metric: weakest,
    metrics_above_median: aboveMedian,
    metrics_below_median: belowMedian,
  };
}

// --------------------------------------------
// Maturity Classification
// --------------------------------------------

/**
 * Classifica a maturidade da posicao benchmark.
 *
 * Baseado na qualidade dos dados + posicao da empresa:
 * - advanced: sample >= 20 E banda top_25
 * - established: sample >= 15 E banda acima da mediana
 * - developing: sample >= 10
 * - initial: sample < 10
 *
 * Nota: sample_count refere-se ao numero de empresas no benchmark,
 * nao a quantidade de dados da propria empresa.
 */
export function classifyBenchmarkMaturity(
  sampleCount: number,
  overallBand: PercentileBand,
): BenchmarkMaturity {
  if (sampleCount >= 20 && overallBand === 'top_25') return 'advanced';
  if (sampleCount >= 15 && (overallBand === 'top_25' || overallBand === 'above_median')) return 'established';
  if (sampleCount >= 10) return 'developing';
  return 'initial';
}

// --------------------------------------------
// Insights Generation
// --------------------------------------------

/**
 * Gera insights automaticos baseados na analise benchmark.
 */
export function generateBenchmarkInsights(
  comparison: BenchmarkComparison,
  analyses: MetricAnalysis[],
): BenchmarkInsight[] {
  const insights: BenchmarkInsight[] = [];
  const gap = comparison.performance_gap;

  // Strengths: metricas acima do P75
  for (const a of analyses) {
    if (a.status === 'above_target') {
      insights.push({
        category: 'strength',
        title: `${a.metric_name} no Top 25%`,
        description: `${a.metric_name} esta no percentil ${round1(a.estimated_percentile)}, `
          + `${round1(Math.abs(a.gap_to_median))} acima da mediana do segmento.`,
        metric: `P${round1(a.estimated_percentile)}`,
        priority: 'low',
      });
    }
  }

  // Opportunities: metricas entre P50 e P75
  for (const a of analyses) {
    if (a.status === 'on_track') {
      insights.push({
        category: 'opportunity',
        title: `${a.metric_name}: potencial para Top 25%`,
        description: `${a.metric_name} esta no percentil ${round1(a.estimated_percentile)}. `
          + `Precisa melhorar ${round1(Math.abs(a.gap_to_top25))} para atingir o Top 25%.`,
        metric: `Gap P75: ${round1(a.gap_to_top25)}`,
        priority: 'medium',
      });
    }
  }

  // Risks: metricas abaixo da mediana
  for (const a of analyses) {
    if (a.status === 'below_target') {
      insights.push({
        category: 'risk',
        title: `${a.metric_name} abaixo da mediana`,
        description: `${a.metric_name} esta no percentil ${round1(a.estimated_percentile)}, `
          + `${round1(Math.abs(a.gap_to_median))} abaixo da mediana do segmento.`,
        metric: `Gap mediana: ${round1(a.gap_to_median)}`,
        priority: 'medium',
      });
    }
  }

  // Critical: metricas no bottom 25%
  for (const a of analyses) {
    if (a.status === 'critical') {
      insights.push({
        category: 'action_required',
        title: `${a.metric_name} no Bottom 25%`,
        description: `${a.metric_name} esta no percentil ${round1(a.estimated_percentile)}, `
          + `significativamente abaixo do mercado. Acao imediata recomendada.`,
        metric: `P${round1(a.estimated_percentile)}`,
        priority: 'high',
      });
    }
  }

  // Overall risk position
  if (comparison.risk_relative_position === 'at_risk') {
    insights.push({
      category: 'action_required',
      title: 'Posicao de Risco no Segmento',
      description: 'A empresa esta classificada como "Em Risco" no posicionamento relativo. '
        + 'Score e/ou margem estao no bottom 25% do segmento.',
      metric: `Gap composto: ${round1(gap.composite_gap)}`,
      priority: 'high',
    });
  }

  // Overall leader position
  if (comparison.risk_relative_position === 'leader') {
    insights.push({
      category: 'strength',
      title: 'Lider do Segmento',
      description: 'A empresa esta classificada como lider do segmento, '
        + 'com score e margem no Top 25%.',
      metric: `Gap composto: +${round1(gap.composite_gap)}`,
      priority: 'low',
    });
  }

  return insights;
}

// --------------------------------------------
// Strategic Recommendations
// --------------------------------------------

/**
 * Gera recomendacoes estrategicas baseadas na posicao benchmark.
 */
export function generateStrategicRecommendations(
  comparison: BenchmarkComparison,
  analyses: MetricAnalysis[],
): StrategicRecommendation[] {
  const recs: StrategicRecommendation[] = [];

  // Recomendacoes por metrica critica
  for (const a of analyses) {
    if (a.status === 'critical') {
      recs.push({
        area: a.metric_name,
        action: `Implementar plano de recuperacao para ${a.metric_name}. `
          + `Meta: atingir mediana do segmento (${round1(a.benchmark_median)}).`,
        expected_impact: `Subir do P${round1(a.estimated_percentile)} para P50+`,
        priority: 'high',
        timeframe: 'short',
      });
    }
  }

  // Recomendacoes por metrica abaixo da mediana
  for (const a of analyses) {
    if (a.status === 'below_target') {
      recs.push({
        area: a.metric_name,
        action: `Desenvolver iniciativas para elevar ${a.metric_name} acima da mediana. `
          + `Gap atual: ${round1(a.gap_to_median)}.`,
        expected_impact: `Atingir mediana do segmento (${round1(a.benchmark_median)})`,
        priority: 'medium',
        timeframe: 'medium',
      });
    }
  }

  // Recomendacoes para metricas on_track → top 25%
  for (const a of analyses) {
    if (a.status === 'on_track') {
      recs.push({
        area: a.metric_name,
        action: `Otimizar ${a.metric_name} para atingir Top 25%. `
          + `Gap para P75: ${round1(a.gap_to_top25)}.`,
        expected_impact: `Subir do P${round1(a.estimated_percentile)} para P75+`,
        priority: 'low',
        timeframe: 'long',
      });
    }
  }

  // Recomendacao geral baseada na posicao de risco
  if (comparison.risk_relative_position === 'at_risk' || comparison.risk_relative_position === 'lagging') {
    recs.push({
      area: 'Estrategia Geral',
      action: 'Priorizar melhoria das metricas mais criticas antes de expansao. '
        + 'Focar em eficiencia operacional e reducao de gaps.',
      expected_impact: 'Sair da zona de risco para posicao competitiva',
      priority: 'high',
      timeframe: 'short',
    });
  }

  return recs;
}

// --------------------------------------------
// Executive Summary
// --------------------------------------------

/**
 * Gera sumario executivo em texto para o relatorio.
 */
export function generateBenchmarkExecutiveSummary(
  comparison: BenchmarkComparison,
  summary: CompetitiveSummary,
  maturity: BenchmarkMaturity,
): string {
  const position = summary.overall_position;
  const risk = summary.risk_classification;
  const gap = round1(summary.composite_gap);
  const strongest = summary.strongest_metric.metric_name;
  const weakest = summary.weakest_metric.metric_name;
  const above = summary.metrics_above_median;
  const total = summary.metrics_above_median + summary.metrics_below_median;
  const segment = comparison.benchmark_context.industry_segment;
  const n = comparison.benchmark_context.sample_count;

  const maturityLabels: Record<BenchmarkMaturity, string> = {
    initial: 'inicial',
    developing: 'em desenvolvimento',
    established: 'estabelecida',
    advanced: 'avancada',
  };

  const gapDirection = gap >= 0 ? 'acima' : 'abaixo';
  const gapAbs = round1(Math.abs(gap));

  return (
    `A empresa esta posicionada como "${position}" no segmento ${segment}, `
    + `com classificacao de risco "${risk}" (base: ${n} empresas). `
    + `O gap composto e de ${gapAbs} pontos ${gapDirection} da media do mercado. `
    + `${above} de ${total} metricas estao acima da mediana. `
    + `Ponto mais forte: ${strongest} (P${round1(summary.strongest_metric.estimated_percentile)}). `
    + `Ponto mais fraco: ${weakest} (P${round1(summary.weakest_metric.estimated_percentile)}). `
    + `Maturidade da analise benchmark: ${maturityLabels[maturity]}.`
  );
}

// --------------------------------------------
// Main: Generate Full Report
// --------------------------------------------

/**
 * Gera relatorio completo de maturidade benchmark.
 *
 * Requer:
 * - comparison: resultado de compareWithBenchmark()
 * - scoreImpact: resultado de calculateRelativePerformanceFactor()
 * - reportId: UUID unico para o relatorio
 *
 * Retorna relatorio estruturado com:
 * - Sumario executivo
 * - Posicao competitiva
 * - Analise por metrica
 * - Insights automaticos
 * - Recomendacoes estrategicas
 */
export function generateBenchmarkReport(
  comparison: BenchmarkComparison,
  scoreImpact: RelativePerformanceFactor,
  reportId: string,
  generatedAt?: string,
): BenchmarkMaturityReport {
  // Analyze each metric
  const metricAnalyses: MetricAnalysis[] = [
    analyzeMetric('Margem', comparison.margin_percentile),
    analyzeMetric('EBITDA', comparison.ebitda_percentile),
    analyzeMetric('Score', comparison.score_percentile),
    analyzeMetric('Crescimento', comparison.growth_percentile),
  ];

  // Build competitive summary
  const competitiveSummary = buildCompetitiveSummary(comparison, metricAnalyses);

  // Classify maturity
  const maturity = classifyBenchmarkMaturity(
    comparison.benchmark_context.sample_count,
    comparison.overall_band,
  );

  // Generate insights
  const insights = generateBenchmarkInsights(comparison, metricAnalyses);

  // Generate recommendations
  const recommendations = generateStrategicRecommendations(comparison, metricAnalyses);

  // Generate executive summary
  const executiveSummary = generateBenchmarkExecutiveSummary(
    comparison,
    competitiveSummary,
    maturity,
  );

  return {
    report_id: reportId,
    generated_at: generatedAt ?? new Date().toISOString(),
    industry_segment: comparison.benchmark_context.industry_segment,
    revenue_range: comparison.benchmark_context.revenue_range,
    sample_count: comparison.benchmark_context.sample_count,
    reference_period: comparison.benchmark_context.reference_period,
    executive_summary: executiveSummary,
    maturity,
    competitive_summary: competitiveSummary,
    metric_analyses: metricAnalyses,
    score_impact: scoreImpact,
    insights,
    recommendations,
  };
}
