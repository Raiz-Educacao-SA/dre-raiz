// ============================================
// Executive Summary Builder
// Consolida todos os resultados do DecisionEngine
// em formato executivo pronto para consumo
// Zero I/O — função pura
// ============================================

import type {
  ScoreResult,
  ScoreClassification,
  FinancialMetrics,
  AlertDecision,
  ForecastResult,
  OptimizationResult,
  MultiObjectiveResult,
  ProposedAction,
} from '../core/decisionTypes';

// --------------------------------------------
// Types
// --------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ExecutiveDriver {
  label: string;
  impact: string;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface ExecutiveRisk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  source: string;
}

export interface ExecutiveAction {
  action: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface NarrativeParagraph {
  title: string;
  content: string;
}

export interface ExecutiveSummary {
  overall_health_score: number;
  risk_level: RiskLevel;
  main_drivers: ExecutiveDriver[];
  top_risks: ExecutiveRisk[];
  optimal_actions: ExecutiveAction[];
  confidence_level: number;
  executive_narrative: NarrativeParagraph[];
}

export interface ExecutiveSummaryInput {
  scoreResult: ScoreResult;
  metrics: FinancialMetrics;
  forecastResult: ForecastResult | null;
  optimizationResult: OptimizationResult | MultiObjectiveResult | null;
  alerts: AlertDecision[];
}

// --------------------------------------------
// Risk Level Classification
// --------------------------------------------

/**
 * Deriva risk level a partir de score, forecast e alertas.
 * Não contém fórmula nova — apenas mapeamento de classificações existentes.
 */
function deriveRiskLevel(
  classification: ScoreClassification,
  alerts: AlertDecision[],
  forecast: ForecastResult | null,
): RiskLevel {
  const criticalAlerts = alerts.filter((a) => a.severity === 'high').length;
  const decliningForecast = forecast?.slope.score !== undefined && forecast.slope.score < -2;

  if (classification === 'Crítico' || criticalAlerts >= 3) return 'critical';
  if (classification === 'Atenção' && decliningForecast) return 'high';
  if (classification === 'Atenção' || criticalAlerts >= 1) return 'medium';
  return 'low';
}

// --------------------------------------------
// Main Drivers
// --------------------------------------------

/**
 * Extrai os principais drivers a partir do breakdown do score.
 * Sem cálculos novos — lê penalidades que já existem no ScoreResult.
 */
function extractDrivers(score: ScoreResult, metrics: FinancialMetrics): ExecutiveDriver[] {
  const drivers: ExecutiveDriver[] = [];
  const { breakdown } = score;

  if (breakdown.penalty_margin > 3) {
    drivers.push({
      label: 'Gap de Margem',
      impact: `Penalidade de ${round2(breakdown.penalty_margin)} pontos no score`,
      direction: 'negative',
    });
  }

  if (breakdown.penalty_ebitda > 0) {
    drivers.push({
      label: 'EBITDA vs Ano Anterior',
      impact: 'EBITDA real abaixo do A-1',
      direction: 'negative',
    });
  }

  if (breakdown.penalty_confidence > 3) {
    drivers.push({
      label: 'Confiança dos Dados',
      impact: `Penalidade de ${round2(breakdown.penalty_confidence)} pontos por baixa confiança`,
      direction: 'negative',
    });
  }

  if (breakdown.penalty_high_priority > 0) {
    drivers.push({
      label: 'Itens de Alta Prioridade',
      impact: `${round2(breakdown.penalty_high_priority)} pontos de penalidade`,
      direction: 'negative',
    });
  }

  if (metrics.ebitda > 0 && breakdown.penalty_margin <= 3 && breakdown.penalty_ebitda === 0) {
    drivers.push({
      label: 'Performance Financeira',
      impact: `EBITDA positivo (R$ ${formatNumber(metrics.ebitda)}) com margem saudável`,
      direction: 'positive',
    });
  }

  if (drivers.length === 0) {
    drivers.push({
      label: 'Operação Estável',
      impact: 'Nenhum driver negativo significativo identificado',
      direction: 'neutral',
    });
  }

  return drivers;
}

// --------------------------------------------
// Top Risks
// --------------------------------------------

/**
 * Extrai riscos a partir de alertas e forecast.
 * Sem fórmulas novas — reorganiza dados existentes.
 */
function extractRisks(
  alerts: AlertDecision[],
  forecast: ForecastResult | null,
): ExecutiveRisk[] {
  const risks: ExecutiveRisk[] = [];

  // From alerts (sorted by severity)
  const sortedAlerts = [...alerts].sort(
    (a, b) => severityWeight(b.severity) - severityWeight(a.severity),
  );

  for (const alert of sortedAlerts.slice(0, 3)) {
    risks.push({
      description: alert.message,
      severity: alert.severity,
      source: alert.alert_type,
    });
  }

  // From forecast
  if (forecast) {
    if (forecast.slope.score < -2) {
      risks.push({
        description: `Tendência de queda no Health Score (slope: ${round2(forecast.slope.score)})`,
        severity: 'high',
        source: 'forecast_score_decline',
      });
    }
    if (forecast.slope.ebitda < 0) {
      risks.push({
        description: `Projeção de deterioração do EBITDA (slope: ${round2(forecast.slope.ebitda)})`,
        severity: 'medium',
        source: 'forecast_ebitda_decline',
      });
    }
  }

  return risks;
}

// --------------------------------------------
// Optimal Actions
// --------------------------------------------

/**
 * Extrai ações ótimas do resultado de otimização.
 * Sem reprocessamento — apenas formata ProposedAction existentes.
 */
function extractActions(
  optimization: OptimizationResult | MultiObjectiveResult | null,
  score: ScoreResult,
): ExecutiveAction[] {
  const actions: ExecutiveAction[] = [];

  if (optimization && optimization.proposed_actions.length > 0) {
    const sorted = [...optimization.proposed_actions].sort(
      (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority),
    );

    for (const action of sorted.slice(0, 5)) {
      actions.push({
        action: `Otimizar ${action.area}: reduzir R$ ${formatNumber(action.suggested_cut)}`,
        expected_impact: `Contribui ${round2(action.estimated_impact)}% para fechamento do gap`,
        priority: action.priority,
      });
    }
  }

  // Add recommendations based on score breakdown (no new math)
  if (score.breakdown.penalty_margin > 5 && actions.length < 5) {
    actions.push({
      action: 'Revisar estrutura de custos variáveis para fechar gap de margem',
      expected_impact: `Potencial de recuperar ${round2(score.breakdown.penalty_margin)} pontos no score`,
      priority: 'high',
    });
  }

  if (score.breakdown.penalty_confidence > 5 && actions.length < 5) {
    actions.push({
      action: 'Melhorar qualidade e confiabilidade dos dados financeiros',
      expected_impact: `Potencial de recuperar ${round2(score.breakdown.penalty_confidence)} pontos no score`,
      priority: 'medium',
    });
  }

  return actions;
}

// --------------------------------------------
// Confidence Level
// --------------------------------------------

/**
 * Calcula nível de confiança do resumo executivo.
 * Baseado na completude dos dados disponíveis.
 * Não é fórmula financeira — é meta-qualidade do relatório.
 */
function calculateConfidence(input: ExecutiveSummaryInput): number {
  let confidence = 50; // base: score + metrics sempre disponíveis

  if (input.forecastResult) confidence += 20;
  if (input.optimizationResult) confidence += 15;
  if (input.alerts.length > 0) confidence += 10;

  // Penalizar se dados parecem incompletos
  if (input.metrics.ebitda === 0 && input.metrics.margin === 0) {
    confidence -= 20; // dados provavelmente não carregados
  }

  return Math.max(0, Math.min(100, confidence));
}

// --------------------------------------------
// Executive Narrative
// --------------------------------------------

/**
 * Constrói narrativa executiva estruturada.
 * Nenhum cálculo — apenas composição textual a partir de dados já processados.
 */
function buildNarrative(
  score: ScoreResult,
  metrics: FinancialMetrics,
  riskLevel: RiskLevel,
  forecast: ForecastResult | null,
  optimization: OptimizationResult | MultiObjectiveResult | null,
): NarrativeParagraph[] {
  const paragraphs: NarrativeParagraph[] = [];

  // 1. Situação atual
  const healthText = score.classification === 'Saudável'
    ? `A operação apresenta saúde financeira saudável com score de ${score.score}/100.`
    : score.classification === 'Atenção'
    ? `A operação requer atenção com score de ${score.score}/100, indicando pressão nos indicadores.`
    : `Situação crítica com score de ${score.score}/100. Ação imediata é necessária.`;

  paragraphs.push({
    title: 'Situação Atual',
    content: `${healthText} EBITDA acumulado de R$ ${formatNumber(metrics.ebitda)} com margem de contribuição de ${round2(metrics.margin)}%. Nível de risco classificado como ${riskLevelLabel(riskLevel)}.`,
  });

  // 2. Projeção
  if (forecast) {
    const trendText = forecast.slope.score > 0
      ? 'Tendência de melhoria nos próximos ciclos.'
      : forecast.slope.score < 0
      ? 'Tendência de deterioração nos próximos ciclos requer monitoramento.'
      : 'Projeções estáveis no curto prazo.';

    paragraphs.push({
      title: 'Projeção',
      content: `${trendText} Score projetado para 3 períodos: ${forecast.forecast.score.map((s) => round2(s)).join(' → ')}. Avaliação de risco: ${forecast.risk_assessment}.`,
    });
  }

  // 3. Plano de ação
  if (optimization && optimization.proposed_actions.length > 0) {
    const totalCut = optimization.proposed_actions.reduce(
      (sum, a) => sum + a.suggested_cut, 0,
    );
    paragraphs.push({
      title: 'Plano de Otimização',
      content: `${optimization.proposed_actions.length} ações identificadas com corte total sugerido de R$ ${formatNumber(totalCut)}. Score projetado após implementação: ${round2(optimization.projected_score)}/100. EBITDA projetado: R$ ${formatNumber(optimization.projected_ebitda)}.`,
    });
  }

  return paragraphs;
}

// --------------------------------------------
// Main Builder
// --------------------------------------------

/**
 * Constrói o resumo executivo consolidado.
 *
 * Função pura — zero I/O.
 * Não contém regras matemáticas novas.
 * Apenas consolida e formata dados já calculados pelo DecisionEngine.
 */
export function buildExecutiveSummary(input: ExecutiveSummaryInput): ExecutiveSummary {
  const riskLevel = deriveRiskLevel(
    input.scoreResult.classification,
    input.alerts,
    input.forecastResult,
  );

  const mainDrivers = extractDrivers(input.scoreResult, input.metrics);
  const topRisks = extractRisks(input.alerts, input.forecastResult);
  const optimalActions = extractActions(input.optimizationResult, input.scoreResult);
  const confidence = calculateConfidence(input);
  const narrative = buildNarrative(
    input.scoreResult,
    input.metrics,
    riskLevel,
    input.forecastResult,
    input.optimizationResult,
  );

  return {
    overall_health_score: input.scoreResult.score,
    risk_level: riskLevel,
    main_drivers: mainDrivers,
    top_risks: topRisks,
    optimal_actions: optimalActions,
    confidence_level: confidence,
    executive_narrative: narrative,
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

function severityWeight(severity: 'high' | 'medium' | 'low'): number {
  switch (severity) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
  }
}

function priorityWeight(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
  }
}

function riskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'Baixo';
    case 'medium': return 'Moderado';
    case 'high': return 'Alto';
    case 'critical': return 'Crítico';
  }
}
