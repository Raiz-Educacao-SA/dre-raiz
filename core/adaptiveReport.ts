// ============================================
// Core Adaptive Intelligence Report
// Funções puras — zero side effects, zero I/O
// Consolida todas as análises adaptivas
// em um relatório executivo estruturado
// ============================================

import type { FeedbackAnalysis } from './feedbackEngine';
import type { CalibrationResult } from './modelCalibration';
import type { ConfidenceResult } from './confidenceScore';
import type { CalibrationCycle } from './calibrationSchedule';
import type { ModelConfig } from './decisionTypes';

// --------------------------------------------
// Types
// --------------------------------------------

/** Seção de insight no relatório */
export interface ReportInsight {
  category: 'strength' | 'warning' | 'action_required';
  title: string;
  description: string;
  metric_value: string;
  priority: 'high' | 'medium' | 'low';
}

/** Evolução temporal de métricas-chave */
export interface MetricEvolution {
  period: string;
  mape: number | null;
  confidence_score: number | null;
  score_mean: number | null;
  calibration_adjustments: number;
}

/** Resumo do modelo atual */
export interface ModelSnapshot {
  version: string;
  config_summary: {
    penalty_margin_factor: number;
    penalty_confidence_factor: number;
    penalty_ebitda_fixed: number;
    classification_healthy: number;
    classification_attention: number;
    alert_score_critical: number;
  };
  maturity: 'initial' | 'learning' | 'calibrated' | 'mature';
}

/** Relatório completo de Adaptive Intelligence */
export interface AdaptiveIntelligenceReport {
  report_id: string;
  generated_at: string;
  reference_period: string;

  // Executive summary
  executive_summary: string;
  overall_status: 'excellent' | 'good' | 'needs_attention' | 'critical';

  // Core metrics
  confidence: ConfidenceResult;
  feedback_analysis: FeedbackAnalysis;

  // Model state
  model_snapshot: ModelSnapshot;
  calibration_result: CalibrationResult | null;

  // Insights
  insights: ReportInsight[];

  // Historical evolution
  evolution: MetricEvolution[];

  // Recommendations
  recommendations: string[];

  // Metadata
  cycle_count: number;
  total_feedback_entries: number;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function translateTendency(tendency: 'optimistic' | 'pessimistic' | 'neutral'): string {
  switch (tendency) {
    case 'optimistic': return 'otimista (superestima)';
    case 'pessimistic': return 'pessimista (subestima)';
    case 'neutral': return 'neutro';
  }
}

// --------------------------------------------
// Model Maturity Classification
// --------------------------------------------

/**
 * Classifica a maturidade do modelo baseado no histórico.
 *
 * - initial: < 3 ciclos completos
 * - learning: 3-5 ciclos E confiança < 70
 * - calibrated: >= 6 ciclos OU confiança >= 70 (o que vier primeiro)
 * - mature: > 12 ciclos E confiança >= 85
 */
export function classifyModelMaturity(
  completedCycles: number,
  confidenceScore: number,
): 'initial' | 'learning' | 'calibrated' | 'mature' {
  if (completedCycles > 12 && confidenceScore >= 85) return 'mature';
  if (completedCycles >= 6 || confidenceScore >= 70) return 'calibrated';
  if (completedCycles >= 3) return 'learning';
  return 'initial';
}

// --------------------------------------------
// Insight Generation
// --------------------------------------------

/**
 * Gera insights a partir da análise de feedback e calibração.
 * Retorna lista ordenada por prioridade (high primeiro).
 */
export function generateInsights(
  feedback: FeedbackAnalysis,
  calibration: CalibrationResult | null,
  confidence: ConfidenceResult,
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  // Confidence-based insights
  if (confidence.level === 'very_high' || confidence.level === 'high') {
    insights.push({
      category: 'strength',
      title: 'Motor de decisão confiável',
      description: `Nível de confiança ${confidence.score}/100. Decisões podem ser aplicadas com segurança.`,
      metric_value: `${confidence.score}/100`,
      priority: 'low',
    });
  } else if (confidence.level === 'moderate') {
    insights.push({
      category: 'warning',
      title: 'Confiança moderada nas decisões',
      description: `Nível de confiança ${confidence.score}/100. Decisões devem ser supervisionadas antes da aplicação.`,
      metric_value: `${confidence.score}/100`,
      priority: 'medium',
    });
  } else if (confidence.level === 'low') {
    insights.push({
      category: 'warning',
      title: 'Confiança baixa nas decisões',
      description: `Nível de confiança ${confidence.score}/100. Revisão manual obrigatória antes de qualquer ação.`,
      metric_value: `${confidence.score}/100`,
      priority: 'high',
    });
  } else if (confidence.level === 'insufficient') {
    insights.push({
      category: 'action_required',
      title: 'Confiança insuficiente para automação',
      description: 'O motor precisa de mais dados históricos para decisões automáticas. Mantenha revisão manual.',
      metric_value: `${confidence.score}/100`,
      priority: 'high',
    });
  }

  // Forecast accuracy insights
  if (feedback.forecast) {
    const f = feedback.forecast;
    if (f.mape <= 10) {
      insights.push({
        category: 'strength',
        title: 'Previsões precisas',
        description: `MAPE de ${f.mape}% — previsões dentro da margem aceitável (<10%).`,
        metric_value: `MAPE ${f.mape}%`,
        priority: 'low',
      });
    } else if (f.mape > 20) {
      insights.push({
        category: 'action_required',
        title: 'Previsões com erro elevado',
        description: `MAPE de ${f.mape}% excede 20%. ${f.systematic_deviation ? 'Desvio sistemático detectado — calibração urgente.' : 'Revise a qualidade dos dados de input.'}`,
        metric_value: `MAPE ${f.mape}%`,
        priority: 'high',
      });
    } else if (f.mape > 10) {
      insights.push({
        category: 'warning',
        title: 'Previsões com erro moderado',
        description: `MAPE de ${f.mape}%. Tendência: ${translateTendency(f.error_tendency)}.`,
        metric_value: `MAPE ${f.mape}%`,
        priority: 'medium',
      });
    }

    if (f.systematic_deviation) {
      insights.push({
        category: 'warning',
        title: 'Desvio sistemático detectado',
        description: `O modelo tem viés ${f.error_tendency === 'optimistic' ? 'otimista' : 'pessimista'} (bias médio: ${f.bias}). Calibração pode corrigir.`,
        metric_value: `Bias: ${f.bias}`,
        priority: 'medium',
      });
    }
  }

  // Score stability insights
  if (feedback.score_stability) {
    const s = feedback.score_stability;
    if (s.volatility === 'high') {
      insights.push({
        category: 'warning',
        title: 'Score com alta volatilidade',
        description: `CV de ${s.cv}% indica flutuações significativas. Range: ${s.range} pontos.`,
        metric_value: `CV ${s.cv}%`,
        priority: 'medium',
      });
    }
    if (s.trend_direction === 'declining') {
      insights.push({
        category: 'action_required',
        title: 'Score em tendência de queda',
        description: `Health Score médio em declínio. Média atual: ${s.mean}/100.`,
        metric_value: `Média: ${s.mean}`,
        priority: 'high',
      });
    }
    if (s.trend_direction === 'improving' && s.volatility === 'low') {
      insights.push({
        category: 'strength',
        title: 'Score estável e em melhoria',
        description: `Health Score médio de ${s.mean}/100, tendência positiva com baixa volatilidade.`,
        metric_value: `Média: ${s.mean}`,
        priority: 'low',
      });
    }
  }

  // Calibration insights
  if (calibration && calibration.total_adjustments > 0) {
    const sigCount = calibration.adjustments.filter(a => a.magnitude === 'significant').length;
    if (sigCount >= 2) {
      insights.push({
        category: 'warning',
        title: 'Calibração com ajustes significativos',
        description: `${sigCount} ajustes significativos aplicados. Monitore o impacto nos próximos ciclos.`,
        metric_value: `${calibration.total_adjustments} ajustes`,
        priority: 'medium',
      });
    } else {
      insights.push({
        category: 'strength',
        title: 'Calibração aplicada com sucesso',
        description: `${calibration.total_adjustments} ajustes menores. Modelo refinado.`,
        metric_value: `${calibration.total_adjustments} ajustes`,
        priority: 'low',
      });
    }
  }

  // Optimization accuracy insights
  if (feedback.optimization) {
    const o = feedback.optimization;
    if (o.hit_rate < 50) {
      insights.push({
        category: 'action_required',
        title: 'Otimizações com baixa taxa de acerto',
        description: `Hit rate de ${o.hit_rate}% — menos da metade das otimizações atingiram 80% do esperado.`,
        metric_value: `Hit rate: ${o.hit_rate}%`,
        priority: 'high',
      });
    } else if (o.hit_rate >= 80) {
      insights.push({
        category: 'strength',
        title: 'Otimizações eficazes',
        description: `Hit rate de ${o.hit_rate}% — maioria das otimizações atingiu o objetivo.`,
        metric_value: `Hit rate: ${o.hit_rate}%`,
        priority: 'low',
      });
    }
  }

  // Sort by priority: high → medium → low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// --------------------------------------------
// Recommendation Generation
// --------------------------------------------

/**
 * Gera recomendações acionáveis baseadas no estado do sistema.
 */
export function generateRecommendations(
  feedback: FeedbackAnalysis,
  confidence: ConfidenceResult,
  maturity: 'initial' | 'learning' | 'calibrated' | 'mature',
): string[] {
  const recs: string[] = [];

  // Maturity-based
  if (maturity === 'initial') {
    recs.push('Coletar mais dados de feedback (mínimo 3 ciclos) antes de confiar em automações.');
  }
  if (maturity === 'learning') {
    recs.push('Motor em fase de aprendizado. Manter revisão manual das decisões enquanto calibra.');
  }

  // Confidence-based
  if (confidence.level === 'insufficient' || confidence.level === 'low') {
    recs.push('Priorizar coleta de dados de feedback para aumentar a confiança do motor.');
  }
  if (confidence.breakdown.penalty_data_freshness > 10) {
    recs.push('Dados desatualizados. Execute coleta de feedback com dados mais recentes.');
  }

  // Forecast-based
  if (feedback.forecast) {
    if (feedback.forecast.mape > 20) {
      recs.push('Revisar qualidade dos dados de input. MAPE acima de 20% indica problemas na base.');
    }
    if (feedback.forecast.systematic_deviation) {
      recs.push(`Desvio sistemático ${feedback.forecast.error_tendency === 'optimistic' ? '(otimista)' : '(pessimista)'} detectado. Calibração corrigirá automaticamente no próximo ciclo.`);
    }
  }

  // Optimization-based
  if (feedback.optimization && feedback.optimization.hit_rate < 50) {
    recs.push('Revisar planos de ação gerados. Hit rate abaixo de 50% sugere metas irrealistas.');
  }

  // Score-based
  if (feedback.score_stability) {
    if (feedback.score_stability.trend_direction === 'declining') {
      recs.push('Score em queda. Investigar causas raiz (margem, custos, conflitos entre agentes).');
    }
    if (feedback.score_stability.volatility === 'high') {
      recs.push('Alta volatilidade no score. Considerar suavização dos fatores de penalidade.');
    }
  }

  // Calibration
  if (feedback.calibration_recommended) {
    recs.push('Calibração recomendada pelo motor. Executar no próximo ciclo agendado.');
  }

  // If everything is good
  if (recs.length === 0) {
    recs.push('Sistema saudável. Manter monitoramento periódico.');
  }

  return recs;
}

// --------------------------------------------
// Executive Summary Generation
// --------------------------------------------

/**
 * Gera o resumo executivo (1-3 frases) para o relatório.
 */
export function generateExecutiveSummary(
  confidence: ConfidenceResult,
  feedback: FeedbackAnalysis,
  maturity: 'initial' | 'learning' | 'calibrated' | 'mature',
  calibration: CalibrationResult | null,
): string {
  const parts: string[] = [];

  // Maturity statement
  const maturityLabels = {
    initial: 'em fase inicial',
    learning: 'em aprendizado',
    calibrated: 'calibrado',
    mature: 'maduro',
  };
  parts.push(`Motor de decisão ${maturityLabels[maturity]} com confiança de ${confidence.score}/100.`);

  // Forecast quality
  if (feedback.forecast) {
    const mape = feedback.forecast.mape;
    if (mape <= 10) {
      parts.push(`Previsões precisas (MAPE ${mape}%).`);
    } else if (mape <= 20) {
      parts.push(`Previsões com erro moderado (MAPE ${mape}%).`);
    } else {
      parts.push(`Previsões necessitam revisão (MAPE ${mape}%).`);
    }
  }

  // Calibration action
  if (calibration && calibration.total_adjustments > 0) {
    parts.push(`Calibração aplicou ${calibration.total_adjustments} ajustes.`);
  } else if (feedback.calibration_recommended) {
    parts.push('Calibração recomendada para próximo ciclo.');
  }

  return parts.join(' ');
}

// --------------------------------------------
// Overall Status
// --------------------------------------------

/**
 * Determina o status geral do sistema adaptivo.
 */
export function determineOverallStatus(
  confidence: ConfidenceResult,
  feedback: FeedbackAnalysis,
): 'excellent' | 'good' | 'needs_attention' | 'critical' {
  // Critical conditions
  if (confidence.level === 'insufficient') return 'critical';
  if (feedback.forecast && feedback.forecast.mape > 30) return 'critical';
  if (feedback.overall_health === 'poor') return 'critical';

  // Needs attention
  if (confidence.level === 'low') return 'needs_attention';
  if (feedback.overall_health === 'needs_calibration') return 'needs_attention';
  if (feedback.forecast && feedback.forecast.mape > 20) return 'needs_attention';

  // Excellent
  if (confidence.level === 'very_high' && feedback.overall_health === 'excellent') return 'excellent';

  return 'good';
}

// --------------------------------------------
// Evolution Builder
// --------------------------------------------

/**
 * Constrói a série de evolução temporal a partir do histórico de ciclos.
 */
export function buildEvolution(
  cycles: CalibrationCycle[],
): MetricEvolution[] {
  return cycles
    .filter(c => c.status === 'completed')
    .map(c => ({
      period: c.reference_period,
      mape: c.feedback_analysis?.forecast?.mape ?? null,
      confidence_score: c.confidence_result?.score ?? null,
      score_mean: c.feedback_analysis?.score_stability?.mean ?? null,
      calibration_adjustments: c.calibration_result?.total_adjustments ?? 0,
    }));
}

// --------------------------------------------
// Model Snapshot Builder
// --------------------------------------------

/**
 * Cria um snapshot do estado atual do modelo.
 */
export function buildModelSnapshot(
  config: ModelConfig,
  version: string,
  completedCycles: number,
  confidenceScore: number,
): ModelSnapshot {
  return {
    version,
    config_summary: {
      penalty_margin_factor: config.score.penalty_margin_factor,
      penalty_confidence_factor: config.score.penalty_confidence_factor,
      penalty_ebitda_fixed: config.score.penalty_ebitda_fixed,
      classification_healthy: config.score.classification_healthy,
      classification_attention: config.score.classification_attention,
      alert_score_critical: config.alert.score_critical,
    },
    maturity: classifyModelMaturity(completedCycles, confidenceScore),
  };
}

// --------------------------------------------
// Full Report Generation
// --------------------------------------------

/**
 * Gera o relatório completo de Adaptive Intelligence.
 *
 * Consolida feedback, calibração, confiança e histórico
 * em um relatório executivo estruturado.
 *
 * @param reportId - Identificador único do relatório (e.g., 'report-2026-02')
 * @param generatedAt - Timestamp ISO da geração
 * @param referencePeriod - Período de referência (e.g., '2026-02')
 * @param feedback - Resultado da análise de feedback
 * @param calibration - Resultado da calibração (null se não executada)
 * @param confidence - Resultado do cálculo de confiança
 * @param currentConfig - Configuração atual do modelo
 * @param modelVersion - Versão do modelo
 * @param cycleHistory - Histórico de ciclos de calibração
 * @param totalFeedbackEntries - Total de feedback entries processados
 */
export function generateAdaptiveReport(
  reportId: string,
  generatedAt: string,
  referencePeriod: string,
  feedback: FeedbackAnalysis,
  calibration: CalibrationResult | null,
  confidence: ConfidenceResult,
  currentConfig: ModelConfig,
  modelVersion: string,
  cycleHistory: CalibrationCycle[],
  totalFeedbackEntries: number,
): AdaptiveIntelligenceReport {
  const completedCycles = cycleHistory.filter(c => c.status === 'completed').length;
  const maturity = classifyModelMaturity(completedCycles, confidence.score);

  return {
    report_id: reportId,
    generated_at: generatedAt,
    reference_period: referencePeriod,

    executive_summary: generateExecutiveSummary(confidence, feedback, maturity, calibration),
    overall_status: determineOverallStatus(confidence, feedback),

    confidence,
    feedback_analysis: feedback,

    model_snapshot: buildModelSnapshot(currentConfig, modelVersion, completedCycles, confidence.score),
    calibration_result: calibration,

    insights: generateInsights(feedback, calibration, confidence),
    evolution: buildEvolution(cycleHistory),

    recommendations: generateRecommendations(feedback, confidence, maturity),

    cycle_count: completedCycles,
    total_feedback_entries: totalFeedbackEntries,
  };
}

