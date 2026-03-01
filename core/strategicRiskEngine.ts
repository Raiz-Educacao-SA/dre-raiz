// ============================================
// Core Strategic Risk Engine — Strategic Simulation Lab
// Funcoes puras — zero side effects, zero I/O
// Avalia risco, estabilidade e confianca por cenario
// Indice de Estabilidade Estrategica (Strategic Stability Index)
// ============================================

import type { ScenarioSimulationResult, ScenarioDelta } from './scenarioEngine';
import type { ScoreResult, ForecastResult } from './decisionTypes';

// --------------------------------------------
// Types
// --------------------------------------------

/** Classificacao de risco do cenario */
export type ScenarioRiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'critical';

/** Perfil de risco detalhado de um cenario */
export interface ScenarioRiskProfile {
  /** Nome do cenario */
  scenario_name: string;
  /** Nivel de risco geral */
  risk_level: ScenarioRiskLevel;
  /** Strategic Stability Index (0-100, maior = mais estavel) */
  stability_index: number;
  /** Indice de confianca na simulacao (0-100) */
  confidence_index: number;
  /** Componentes do risco */
  risk_components: RiskComponents;
  /** Alertas especificos do cenario */
  risk_alerts: string[];
}

/** Componentes individuais do risco */
export interface RiskComponents {
  /** Risco financeiro: baseado em delta de EBITDA e margem (0-100) */
  financial_risk: number;
  /** Risco operacional: baseado em magnitude das mudancas (0-100) */
  operational_risk: number;
  /** Risco de score: baseado no impacto no Health Score (0-100) */
  score_risk: number;
  /** Risco de tendencia: baseado na projecao de forecast (0-100) */
  trend_risk: number;
}

/** Strategic Stability Index detalhado */
export interface StabilityAnalysis {
  /** Indice composto (0-100, maior = mais estavel) */
  index: number;
  /** Classificacao textual */
  classification: 'muito_estavel' | 'estavel' | 'moderado' | 'instavel' | 'muito_instavel';
  /** Componentes */
  components: {
    score_stability: number;
    margin_stability: number;
    ebitda_stability: number;
    forecast_stability: number;
  };
  /** Explicacao */
  explanation: string;
}

/** Impacto na confianca */
export interface ConfidenceImpact {
  /** Indice de confianca na simulacao (0-100) */
  confidence: number;
  /** Fatores que aumentam confianca */
  positive_factors: string[];
  /** Fatores que reduzem confianca */
  negative_factors: string[];
}

/** Avaliacao completa de risco multi-cenario */
export interface StrategicRiskAssessment {
  /** Perfis de risco por cenario */
  profiles: ScenarioRiskProfile[];
  /** Cenario de menor risco */
  lowest_risk: { scenario_name: string; risk_level: ScenarioRiskLevel; stability_index: number };
  /** Cenario de maior risco */
  highest_risk: { scenario_name: string; risk_level: ScenarioRiskLevel; stability_index: number };
  /** Resumo executivo */
  summary: string;
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

// --------------------------------------------
// Risk Components Calculation
// --------------------------------------------

/**
 * Calcula risco financeiro baseado nos deltas.
 * Quanto maior a variacao negativa de EBITDA e margem, maior o risco.
 * Escala: 0 (sem risco) a 100 (risco maximo).
 */
export function calculateFinancialRisk(delta: ScenarioDelta): number {
  let risk = 0;

  // EBITDA caiu: maior risco
  if (delta.ebitda_delta_pct < 0) {
    risk += Math.min(50, Math.abs(delta.ebitda_delta_pct) * 2);
  }

  // Margem caiu: risco adicional
  if (delta.margem_delta_pp < 0) {
    risk += Math.min(30, Math.abs(delta.margem_delta_pp) * 5);
  }

  // Receita caiu: risco adicional
  if (delta.receita_delta_pct < 0) {
    risk += Math.min(20, Math.abs(delta.receita_delta_pct));
  }

  return clamp(round2(risk), 0, 100);
}

/**
 * Calcula risco operacional baseado na magnitude das mudancas.
 * Mudancas grandes (mesmo positivas) trazem risco de execucao.
 * Escala: 0-100.
 */
export function calculateOperationalRisk(delta: ScenarioDelta): number {
  // Usa apenas metricas percentuais/pp para evitar dependencia de escala absoluta
  const totalMagnitude =
    Math.abs(delta.receita_delta_pct) +
    Math.abs(delta.ebitda_delta_pct) +
    Math.abs(delta.margem_delta_pp);

  // Mudancas pequenas (< 5% total) = risco baixo
  // Mudancas moderadas (5-20%) = risco moderado
  // Mudancas grandes (> 20%) = risco alto
  return clamp(round2(totalMagnitude * 2), 0, 100);
}

/**
 * Calcula risco de score baseado no delta de Health Score.
 * Score caindo = risco alto.
 * Escala: 0-100.
 */
export function calculateScoreRisk(scoreDelta: number, currentScore: number): number {
  let risk = 0;

  // Score caiu
  if (scoreDelta < 0) {
    risk += Math.min(60, Math.abs(scoreDelta) * 4);
  }

  // Score absoluto baixo (mesmo que nao tenha caido)
  if (currentScore < 70) {
    risk += 30;
  } else if (currentScore < 85) {
    risk += 10;
  }

  return clamp(round2(risk), 0, 100);
}

/**
 * Calcula risco de tendencia baseado no forecast.
 * Projecao de deterioracao = risco alto.
 * Escala: 0-100.
 */
export function calculateTrendRisk(forecast: ForecastResult): number {
  let risk = 0;

  // Slope negativo de score (principal indicador numerico)
  if (forecast.slope.score < 0) {
    risk += Math.min(40, Math.abs(forecast.slope.score) * 10);
  }

  // Slope negativo de margem
  if (forecast.slope.margin < 0) {
    risk += Math.min(30, Math.abs(forecast.slope.margin) * 5);
  }

  // Score projetado (3o ponto) abaixo de 70 = risco adicional
  // Isso e derivado dos slopes, nao depende de texto do risk_assessment
  const projectedScore3 = forecast.forecast.score[2];
  if (projectedScore3 < 70) {
    risk += 30;
  } else if (forecast.slope.score < -1) {
    risk += 15;
  }

  return clamp(round2(risk), 0, 100);
}

/**
 * Calcula todos os componentes de risco.
 */
export function calculateRiskComponents(
  scenario: ScenarioSimulationResult,
): RiskComponents {
  return {
    financial_risk: calculateFinancialRisk(scenario.delta_vs_base),
    operational_risk: calculateOperationalRisk(scenario.delta_vs_base),
    score_risk: calculateScoreRisk(
      scenario.delta_vs_base.score_delta,
      scenario.score.score,
    ),
    trend_risk: calculateTrendRisk(scenario.forecast),
  };
}

// --------------------------------------------
// Risk Level Classification
// --------------------------------------------

/**
 * Classifica o nivel de risco geral baseado nos componentes.
 * Usa media ponderada dos componentes.
 *
 * Pesos:
 * - Financial: 35% (impacto direto)
 * - Score: 25% (indicador de saude)
 * - Trend: 25% (direcao futura)
 * - Operational: 15% (risco de execucao)
 */
export function classifyRiskLevel(components: RiskComponents): ScenarioRiskLevel {
  const weighted = round2(
    components.financial_risk * 0.35 +
    components.score_risk * 0.25 +
    components.trend_risk * 0.25 +
    components.operational_risk * 0.15
  );

  if (weighted >= 75) return 'critical';
  if (weighted >= 55) return 'high';
  if (weighted >= 35) return 'moderate';
  if (weighted >= 15) return 'low';
  return 'very_low';
}

// --------------------------------------------
// Strategic Stability Index
// --------------------------------------------

/**
 * Calcula o Strategic Stability Index.
 *
 * Mede o quao "estavel" e a transicao do cenario atual para o cenario simulado.
 * Indice alto = mudanca suave, previsivel e controlavel.
 * Indice baixo = mudanca brusca, arriscada ou dificil de implementar.
 *
 * Componentes (cada um 0-100, maior = mais estavel):
 * - score_stability: quao proximo o score fica do atual
 * - margin_stability: quao proximo a margem fica da atual
 * - ebitda_stability: quao proximo o EBITDA fica do atual
 * - forecast_stability: se a projecao e positiva ou estavel
 *
 * Indice final: media ponderada dos componentes.
 */
export function calculateStabilityIndex(
  scenario: ScenarioSimulationResult,
): StabilityAnalysis {
  const delta = scenario.delta_vs_base;

  // Score stability: 100 - |delta| * 4 (queda de 25pts = 0)
  const scoreStab = clamp(100 - Math.abs(delta.score_delta) * 4, 0, 100);

  // Margin stability: 100 - |delta_pp| * 10 (queda de 10pp = 0)
  const marginStab = clamp(100 - Math.abs(delta.margem_delta_pp) * 10, 0, 100);

  // EBITDA stability: 100 - |delta_%| * 3 (queda de 33% = 0)
  const ebitdaStab = clamp(100 - Math.abs(delta.ebitda_delta_pct) * 3, 0, 100);

  // Forecast stability: baseado no slope de score
  let forecastStab = 70; // neutro
  if (scenario.forecast.slope.score > 0) {
    forecastStab = clamp(70 + scenario.forecast.slope.score * 10, 70, 100);
  } else if (scenario.forecast.slope.score < 0) {
    forecastStab = clamp(70 + scenario.forecast.slope.score * 15, 0, 70);
  }

  // Indice composto (pesos: score 30%, margin 25%, ebitda 25%, forecast 20%)
  const index = round2(
    scoreStab * 0.30 +
    marginStab * 0.25 +
    ebitdaStab * 0.25 +
    forecastStab * 0.20
  );
  const clamped = clamp(index, 0, 100);

  // Classificacao
  let classification: StabilityAnalysis['classification'];
  if (clamped >= 85) classification = 'muito_estavel';
  else if (clamped >= 70) classification = 'estavel';
  else if (clamped >= 50) classification = 'moderado';
  else if (clamped >= 30) classification = 'instavel';
  else classification = 'muito_instavel';

  // Explicacao
  const weakest = Math.min(scoreStab, marginStab, ebitdaStab, forecastStab);
  let weakLabel = 'forecast';
  if (weakest === scoreStab) weakLabel = 'score';
  else if (weakest === marginStab) weakLabel = 'margem';
  else if (weakest === ebitdaStab) weakLabel = 'EBITDA';

  const explanation = clamped >= 70
    ? `Cenario "${scenario.config.name}" apresenta transicao estavel. Indice: ${clamped}/100.`
    : `Cenario "${scenario.config.name}" apresenta instabilidade em ${weakLabel}. Indice: ${clamped}/100. Requer atencao na implementacao.`;

  return {
    index: clamped,
    classification,
    components: {
      score_stability: round2(scoreStab),
      margin_stability: round2(marginStab),
      ebitda_stability: round2(ebitdaStab),
      forecast_stability: round2(forecastStab),
    },
    explanation,
  };
}

// --------------------------------------------
// Confidence Impact
// --------------------------------------------

/**
 * Avalia o impacto do cenario na confianca da simulacao.
 *
 * Cenarios com mudancas pequenas e resultados positivos = alta confianca.
 * Cenarios com mudancas drasticas ou resultados negativos = baixa confianca.
 */
export function evaluateConfidenceImpact(
  scenario: ScenarioSimulationResult,
): ConfidenceImpact {
  const positives: string[] = [];
  const negatives: string[] = [];
  let confidence = 70; // base

  const delta = scenario.delta_vs_base;

  // Score melhorou
  if (delta.score_delta > 0) {
    confidence += Math.min(10, delta.score_delta * 2);
    positives.push(`Score melhora ${delta.score_delta} pontos`);
  } else if (delta.score_delta < 0) {
    confidence -= Math.min(15, Math.abs(delta.score_delta) * 3);
    negatives.push(`Score cai ${Math.abs(delta.score_delta)} pontos`);
  }

  // EBITDA melhorou
  if (delta.ebitda_delta_pct > 0) {
    confidence += Math.min(10, delta.ebitda_delta_pct);
    positives.push(`EBITDA cresce ${delta.ebitda_delta_pct.toFixed(1)}%`);
  } else if (delta.ebitda_delta_pct < -5) {
    confidence -= Math.min(15, Math.abs(delta.ebitda_delta_pct));
    negatives.push(`EBITDA cai ${Math.abs(delta.ebitda_delta_pct).toFixed(1)}%`);
  }

  // Margem melhorou
  if (delta.margem_delta_pp > 0) {
    confidence += Math.min(5, delta.margem_delta_pp * 2);
    positives.push(`Margem sobe ${delta.margem_delta_pp.toFixed(1)}pp`);
  } else if (delta.margem_delta_pp < -2) {
    confidence -= Math.min(10, Math.abs(delta.margem_delta_pp) * 3);
    negatives.push(`Margem cai ${Math.abs(delta.margem_delta_pp).toFixed(1)}pp`);
  }

  // Forecast positivo
  if (scenario.forecast.slope.score > 0) {
    confidence += 5;
    positives.push('Tendencia de score positiva');
  } else if (scenario.forecast.slope.score < -2) {
    confidence -= 10;
    negatives.push('Tendencia de score negativa');
  }

  // Mudancas muito grandes reduzem confianca (incerteza de execucao)
  const totalChange =
    Math.abs(delta.receita_delta_pct) +
    Math.abs(delta.ebitda_delta_pct);
  if (totalChange > 30) {
    confidence -= 10;
    negatives.push('Mudancas muito agressivas (incerteza de execucao)');
  }

  return {
    confidence: clamp(round2(confidence), 0, 100),
    positive_factors: positives,
    negative_factors: negatives,
  };
}

// --------------------------------------------
// Risk Alerts
// --------------------------------------------

/**
 * Gera alertas de risco especificos do cenario.
 */
export function generateRiskAlerts(
  scenario: ScenarioSimulationResult,
  components: RiskComponents,
): string[] {
  const alerts: string[] = [];
  const delta = scenario.delta_vs_base;

  if (scenario.score.score < 70) {
    alerts.push('Score abaixo do limiar critico (70)');
  }

  if (delta.ebitda_delta_pct < -20) {
    alerts.push(`EBITDA cai ${Math.abs(delta.ebitda_delta_pct).toFixed(1)}% — impacto severo`);
  }

  if (delta.margem_delta_pp < -5) {
    alerts.push(`Margem cai ${Math.abs(delta.margem_delta_pp).toFixed(1)}pp — risco estrutural`);
  }

  if (components.trend_risk >= 60) {
    alerts.push('Tendencia de deterioracao projetada no forecast');
  }

  if (components.operational_risk >= 60) {
    alerts.push('Magnitude de mudancas elevada — risco de execucao');
  }

  if (scenario.forecast.slope.score < -3) {
    alerts.push('Slope de score fortemente negativo');
  }

  return alerts;
}

// --------------------------------------------
// Build Risk Profile
// --------------------------------------------

/**
 * Constroi perfil de risco completo para um cenario.
 */
export function buildRiskProfile(
  scenario: ScenarioSimulationResult,
): ScenarioRiskProfile {
  const components = calculateRiskComponents(scenario);
  const riskLevel = classifyRiskLevel(components);
  const stability = calculateStabilityIndex(scenario);
  const confidence = evaluateConfidenceImpact(scenario);
  const alerts = generateRiskAlerts(scenario, components);

  return {
    scenario_name: scenario.config.name,
    risk_level: riskLevel,
    stability_index: stability.index,
    confidence_index: confidence.confidence,
    risk_components: components,
    risk_alerts: alerts,
  };
}

// --------------------------------------------
// Main: Assess Strategic Risk
// --------------------------------------------

/**
 * Avalia risco estrategico de multiplos cenarios.
 *
 * Funcao pura e deterministica.
 * Retorna perfis de risco, cenario de menor/maior risco e resumo.
 */
export function assessStrategicRisk(
  scenarios: ScenarioSimulationResult[],
): StrategicRiskAssessment {
  if (scenarios.length === 0) {
    throw new Error('assessStrategicRisk requires at least 1 scenario');
  }

  const profiles = scenarios.map(s => buildRiskProfile(s));

  // Ordenar por stability_index desc (mais estavel primeiro)
  const sorted = [...profiles].sort((a, b) => b.stability_index - a.stability_index);

  const lowestRisk = sorted[0];
  const highestRisk = sorted[sorted.length - 1];

  const riskLabels: Record<ScenarioRiskLevel, string> = {
    very_low: 'Muito Baixo',
    low: 'Baixo',
    moderate: 'Moderado',
    high: 'Alto',
    critical: 'Critico',
  };

  const summary =
    `Avaliacao de ${profiles.length} cenario(s). ` +
    `Menor risco: "${lowestRisk.scenario_name}" (${riskLabels[lowestRisk.risk_level]}, ` +
    `estabilidade ${lowestRisk.stability_index}/100). ` +
    `Maior risco: "${highestRisk.scenario_name}" (${riskLabels[highestRisk.risk_level]}, ` +
    `estabilidade ${highestRisk.stability_index}/100).`;

  return {
    profiles,
    lowest_risk: {
      scenario_name: lowestRisk.scenario_name,
      risk_level: lowestRisk.risk_level,
      stability_index: lowestRisk.stability_index,
    },
    highest_risk: {
      scenario_name: highestRisk.scenario_name,
      risk_level: highestRisk.risk_level,
      stability_index: highestRisk.stability_index,
    },
    summary,
  };
}
