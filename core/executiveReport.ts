// ============================================
// Executive Report Builder
// Gera sumários executivos e relatórios CEO
// Zero I/O — funções puras
// ============================================

import type {
  ScoreResult,
  ScoreClassification,
  FinancialMetrics,
  AlertDecision,
  ForecastResult,
  OptimizationResult,
  MultiObjectiveResult,
} from './decisionTypes';

// --------------------------------------------
// Types
// --------------------------------------------

/** Bloco de KPI para relatório */
export interface KPIBlock {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

/** Seção de insight */
export interface InsightSection {
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';
}

/** Relatório executivo completo */
export interface ExecutiveReport {
  title: string;
  generated_at: string;
  kpis: KPIBlock[];
  health_summary: HealthSummary;
  insights: InsightSection[];
  recommendations: RecommendationBlock[];
  forecast_summary: ForecastSummaryBlock | null;
  optimization_summary: OptimizationSummaryBlock | null;
}

/** Resumo de saúde financeira */
export interface HealthSummary {
  score: number;
  classification: ScoreClassification;
  ebitda: number;
  margin: number;
  alert_count: number;
  critical_alert_count: number;
}

/** Bloco de recomendação */
export interface RecommendationBlock {
  action: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

/** Resumo de forecast */
export interface ForecastSummaryBlock {
  risk_assessment: string;
  score_trend: 'improving' | 'declining' | 'stable';
  projected_score_3: number;
  projected_ebitda_3: number;
}

/** Resumo de otimização */
export interface OptimizationSummaryBlock {
  gap: number;
  actions_count: number;
  projected_score: number;
  projected_ebitda: number;
  top_action: string | null;
}

// --------------------------------------------
// KPI Builders
// --------------------------------------------

/**
 * Constrói KPIs a partir de score e métricas.
 */
export function buildKPIs(
  score: ScoreResult,
  metrics: FinancialMetrics,
  alerts: AlertDecision[],
): KPIBlock[] {
  return [
    {
      label: 'Health Score',
      value: score.score,
      unit: '/100',
      trend: 'stable',
      status: score.score >= 85 ? 'good' : score.score >= 70 ? 'warning' : 'critical',
    },
    {
      label: 'EBITDA',
      value: round2(metrics.ebitda),
      unit: 'R$',
      trend: 'stable',
      status: metrics.ebitda >= 0 ? 'good' : 'critical',
    },
    {
      label: 'Margem de Contribuição',
      value: round2(metrics.margin),
      unit: '%',
      trend: 'stable',
      status: metrics.margin >= 30 ? 'good' : metrics.margin >= 15 ? 'warning' : 'critical',
    },
    {
      label: 'Alertas Ativos',
      value: alerts.length,
      unit: '',
      trend: alerts.length > 0 ? 'up' : 'stable',
      status: alerts.length === 0 ? 'good' : alerts.some((a) => a.severity === 'high') ? 'critical' : 'warning',
    },
  ];
}

/**
 * Atualiza trend dos KPIs com dados de forecast.
 */
export function enrichKPIsWithForecast(
  kpis: KPIBlock[],
  forecast: ForecastResult,
): KPIBlock[] {
  return kpis.map((kpi) => {
    if (kpi.label === 'Health Score') {
      return {
        ...kpi,
        trend: forecast.slope.score > 0 ? 'up' as const : forecast.slope.score < 0 ? 'down' as const : 'stable' as const,
      };
    }
    if (kpi.label === 'EBITDA') {
      return {
        ...kpi,
        trend: forecast.slope.ebitda > 0 ? 'up' as const : forecast.slope.ebitda < 0 ? 'down' as const : 'stable' as const,
      };
    }
    if (kpi.label === 'Margem de Contribuição') {
      return {
        ...kpi,
        trend: forecast.slope.margin > 0 ? 'up' as const : forecast.slope.margin < 0 ? 'down' as const : 'stable' as const,
      };
    }
    return kpi;
  });
}

// --------------------------------------------
// Insights Builder
// --------------------------------------------

/**
 * Gera insights a partir de alertas e métricas.
 */
export function buildInsights(
  score: ScoreResult,
  metrics: FinancialMetrics,
  alerts: AlertDecision[],
): InsightSection[] {
  const insights: InsightSection[] = [];

  // Health score insight
  if (score.classification === 'Crítico') {
    insights.push({
      title: 'Saúde Financeira Crítica',
      content: `O Health Score está em ${score.score}/100, classificado como Crítico. Ação imediata é necessária para reverter a tendência.`,
      severity: 'critical',
    });
  } else if (score.classification === 'Atenção') {
    insights.push({
      title: 'Saúde Financeira em Atenção',
      content: `O Health Score está em ${score.score}/100, na faixa de Atenção. Monitoramento próximo e ações preventivas são recomendados.`,
      severity: 'warning',
    });
  }

  // Penalty insights
  const { breakdown } = score;
  if (breakdown.penalty_margin > 5) {
    insights.push({
      title: 'Gap de Margem Significativo',
      content: `A margem real está significativamente abaixo do orçado, gerando penalidade de ${round2(breakdown.penalty_margin)} pontos no score.`,
      severity: 'warning',
    });
  }

  if (breakdown.penalty_ebitda > 0) {
    insights.push({
      title: 'EBITDA Abaixo do Ano Anterior',
      content: `O EBITDA real está abaixo do A-1, indicando deterioração ano-sobre-ano.`,
      severity: 'warning',
    });
  }

  // Alert-based insights
  const criticalAlerts = alerts.filter((a) => a.severity === 'high');
  if (criticalAlerts.length > 0) {
    insights.push({
      title: `${criticalAlerts.length} Alerta(s) Crítico(s)`,
      content: criticalAlerts.map((a) => a.message).join('. '),
      severity: 'critical',
    });
  }

  // EBITDA positive insight
  if (metrics.ebitda > 0 && score.classification === 'Saudável') {
    insights.push({
      title: 'Performance Saudável',
      content: `EBITDA positivo (R$ ${formatNumber(metrics.ebitda)}) com score saudável. Manter curso atual.`,
      severity: 'info',
    });
  }

  return insights;
}

// --------------------------------------------
// Recommendations Builder
// --------------------------------------------

/**
 * Gera recomendações executivas baseadas no estado atual.
 */
export function buildRecommendations(
  score: ScoreResult,
  alerts: AlertDecision[],
  optimization: OptimizationResult | MultiObjectiveResult | null,
): RecommendationBlock[] {
  const recs: RecommendationBlock[] = [];

  // From score penalties
  if (score.breakdown.penalty_confidence > 5) {
    recs.push({
      action: 'Melhorar qualidade dos dados e confiabilidade dos agentes',
      impact: `Pode recuperar até ${round2(score.breakdown.penalty_confidence)} pontos no score`,
      priority: 'medium',
    });
  }

  if (score.breakdown.penalty_margin > 5) {
    recs.push({
      action: 'Revisar estrutura de custos variáveis para fechar gap de margem',
      impact: `Pode recuperar até ${round2(score.breakdown.penalty_margin)} pontos no score`,
      priority: 'high',
    });
  }

  if (score.breakdown.penalty_ebitda > 0) {
    recs.push({
      action: 'Analisar drivers de queda de EBITDA vs ano anterior',
      impact: 'Pode recuperar 5 pontos no score',
      priority: 'high',
    });
  }

  // From optimization
  if (optimization && optimization.proposed_actions.length > 0) {
    const topActions = optimization.proposed_actions
      .filter((a) => a.priority === 'high')
      .slice(0, 3);

    for (const action of topActions) {
      recs.push({
        action: `Cortar R$ ${formatNumber(action.suggested_cut)} em ${action.area}`,
        impact: `Contribui ${round2(action.estimated_impact)}% para o gap total`,
        priority: 'high',
      });
    }
  }

  // From alerts
  const trendAlerts = alerts.filter((a) => a.alert_type.startsWith('TREND_'));
  if (trendAlerts.length > 0) {
    recs.push({
      action: 'Investigar tendências negativas detectadas nos últimos 3 ciclos',
      impact: `${trendAlerts.length} tendência(s) negativa(s) identificada(s)`,
      priority: 'medium',
    });
  }

  return recs;
}

// --------------------------------------------
// Forecast Summary
// --------------------------------------------

/**
 * Constrói resumo de forecast para o relatório.
 */
export function buildForecastSummary(
  forecast: ForecastResult,
): ForecastSummaryBlock {
  const scoreTrend = forecast.slope.score > 0
    ? 'improving' as const
    : forecast.slope.score < 0
    ? 'declining' as const
    : 'stable' as const;

  return {
    risk_assessment: forecast.risk_assessment,
    score_trend: scoreTrend,
    projected_score_3: forecast.forecast.score[2],
    projected_ebitda_3: forecast.forecast.ebitda[2],
  };
}

// --------------------------------------------
// Optimization Summary
// --------------------------------------------

/**
 * Constrói resumo de otimização para o relatório.
 */
export function buildOptimizationSummary(
  result: OptimizationResult | MultiObjectiveResult,
): OptimizationSummaryBlock {
  const topAction = result.proposed_actions.length > 0
    ? `${result.proposed_actions[0].area}: cortar R$ ${formatNumber(result.proposed_actions[0].suggested_cut)}`
    : null;

  return {
    gap: result.gap,
    actions_count: result.proposed_actions.length,
    projected_score: result.projected_score,
    projected_ebitda: result.projected_ebitda,
    top_action: topAction,
  };
}

// --------------------------------------------
// Full Report Builder
// --------------------------------------------

/** Input para gerar relatório executivo */
export interface ExecutiveReportInput {
  score: ScoreResult;
  metrics: FinancialMetrics;
  alerts: AlertDecision[];
  forecast: ForecastResult | null;
  optimization: OptimizationResult | MultiObjectiveResult | null;
  title?: string;
}

/**
 * Gera relatório executivo completo.
 * Função pura — zero I/O.
 */
export function generateExecutiveReport(input: ExecutiveReportInput): ExecutiveReport {
  let kpis = buildKPIs(input.score, input.metrics, input.alerts);

  if (input.forecast) {
    kpis = enrichKPIsWithForecast(kpis, input.forecast);
  }

  const healthSummary: HealthSummary = {
    score: input.score.score,
    classification: input.score.classification,
    ebitda: input.metrics.ebitda,
    margin: input.metrics.margin,
    alert_count: input.alerts.length,
    critical_alert_count: input.alerts.filter((a) => a.severity === 'high').length,
  };

  const insights = buildInsights(input.score, input.metrics, input.alerts);
  const recommendations = buildRecommendations(input.score, input.alerts, input.optimization);

  const forecastSummary = input.forecast
    ? buildForecastSummary(input.forecast)
    : null;

  const optimizationSummary = input.optimization
    ? buildOptimizationSummary(input.optimization)
    : null;

  return {
    title: input.title ?? 'Relatório Executivo — Saúde Financeira',
    generated_at: new Date().toISOString(),
    kpis,
    health_summary: healthSummary,
    insights,
    recommendations,
    forecast_summary: forecastSummary,
    optimization_summary: optimizationSummary,
  };
}

// --------------------------------------------
// CEO Report (condensed)
// --------------------------------------------

/** Relatório CEO condensado (1 página) */
export interface CEOReport {
  headline: string;
  score: number;
  classification: ScoreClassification;
  top_3_insights: string[];
  top_3_actions: string[];
  risk_level: string;
  outlook: string;
}

/**
 * Gera relatório CEO condensado a partir do relatório executivo.
 */
export function generateCEOReport(report: ExecutiveReport): CEOReport {
  // Headline based on classification
  const headline = report.health_summary.classification === 'Saudável'
    ? 'Operação financeira saudável — manter curso'
    : report.health_summary.classification === 'Atenção'
    ? 'Atenção requerida — indicadores sob pressão'
    : 'Situação crítica — ação imediata necessária';

  // Top insights (max 3)
  const top3Insights = report.insights
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
    .slice(0, 3)
    .map((i) => i.content);

  // Top actions (max 3)
  const top3Actions = report.recommendations
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 3)
    .map((r) => r.action);

  // Risk level
  const riskLevel = report.forecast_summary
    ? report.forecast_summary.risk_assessment
    : report.health_summary.classification === 'Crítico'
    ? 'Alto'
    : report.health_summary.classification === 'Atenção'
    ? 'Moderado'
    : 'Baixo';

  // Outlook
  const outlook = report.forecast_summary
    ? report.forecast_summary.score_trend === 'improving'
      ? 'Tendência de melhoria nas próximas projeções'
      : report.forecast_summary.score_trend === 'declining'
      ? 'Tendência de deterioração — necessária intervenção'
      : 'Projeções estáveis no curto prazo'
    : 'Sem dados de projeção disponíveis';

  return {
    headline,
    score: report.health_summary.score,
    classification: report.health_summary.classification,
    top_3_insights: top3Insights,
    top_3_actions: top3Actions,
    risk_level: riskLevel,
    outlook,
  };
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function severityWeight(severity: 'info' | 'warning' | 'critical'): number {
  switch (severity) {
    case 'critical': return 3;
    case 'warning': return 2;
    case 'info': return 1;
  }
}

function priorityWeight(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
  }
}
