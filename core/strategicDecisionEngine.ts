// ============================================
// Core Strategic Decision Engine — Strategic Simulation Lab
// Funcoes puras — zero side effects, zero I/O
// Gera recomendacoes de decisao baseadas em cenarios simulados
// ============================================

import type {
  ScenarioSimulationResult,
  ScenarioDelta,
  ScenarioConfig,
} from './scenarioEngine';
import type { ScenarioComparisonResult } from './scenarioComparison';
import type {
  StrategicRiskAssessment,
  ScenarioRiskProfile,
  ScenarioRiskLevel,
} from './strategicRiskEngine';

// --------------------------------------------
// Types
// --------------------------------------------

/** Prioridade da recomendacao */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/** Tipo de acao recomendada */
export type ActionType =
  | 'increase_revenue'
  | 'reduce_costs'
  | 'optimize_margin'
  | 'manage_risk'
  | 'invest'
  | 'restructure'
  | 'maintain';

/** Horizonte temporal */
export type TimeHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term';

/** Recomendacao estrategica individual */
export interface StrategicRecommendation {
  /** Titulo curto */
  title: string;
  /** Descricao detalhada da acao */
  description: string;
  /** Tipo de acao */
  action_type: ActionType;
  /** Prioridade */
  priority: RecommendationPriority;
  /** Horizonte temporal */
  time_horizon: TimeHorizon;
  /** Impacto esperado no score (estimativa) */
  expected_score_impact: number;
  /** Impacto esperado no EBITDA em % (estimativa) */
  expected_ebitda_impact_pct: number;
  /** Cenario(s) que embasa(m) esta recomendacao */
  based_on_scenarios: string[];
  /** Justificativa com dados */
  rationale: string;
}

/** Trade-off identificado entre cenarios */
export interface StrategicTradeoff {
  /** Descricao do trade-off */
  description: string;
  /** Cenarios envolvidos */
  scenario_a: string;
  scenario_b: string;
  /** O que se ganha */
  gain: string;
  /** O que se perde */
  loss: string;
  /** Veredicto */
  verdict: 'favor_a' | 'favor_b' | 'depends_on_context';
}

/** Quick win identificado */
export interface QuickWin {
  /** Acao */
  action: string;
  /** Qual alavanca usar */
  lever: string;
  /** Impacto estimado no score */
  score_uplift: number;
  /** Impacto estimado no EBITDA */
  ebitda_uplift_pct: number;
  /** Risco associado */
  risk: ScenarioRiskLevel;
}

/** Resultado completo da analise de decisao */
export interface DecisionAnalysisResult {
  /** Recomendacao principal */
  primary_recommendation: StrategicRecommendation;
  /** Todas as recomendacoes ordenadas por prioridade */
  recommendations: StrategicRecommendation[];
  /** Trade-offs identificados */
  tradeoffs: StrategicTradeoff[];
  /** Quick wins (acoes de alto impacto e baixo risco) */
  quick_wins: QuickWin[];
  /** Cenario recomendado */
  recommended_scenario: {
    name: string;
    index: number;
    reason: string;
  };
  /** Resumo executivo */
  executive_summary: string;
  /** Acoes a evitar */
  actions_to_avoid: string[];
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const RISK_SEVERITY: Record<ScenarioRiskLevel, number> = {
  very_low: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

// --------------------------------------------
// Revenue Recommendations
// --------------------------------------------

/**
 * Gera recomendacoes de receita baseadas nos cenarios.
 * Analisa quais alavancas de receita tem maior impacto nos melhores cenarios.
 */
export function generateRevenueRecommendations(
  scenarios: ScenarioSimulationResult[],
  riskProfiles: ScenarioRiskProfile[],
): StrategicRecommendation[] {
  const recs: StrategicRecommendation[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const risk = riskProfiles[i];
    const delta = s.delta_vs_base;

    // Cenario com receita significativamente maior e risco aceitavel
    if (delta.receita_delta_pct > 5 && RISK_SEVERITY[risk.risk_level] <= 2) {
      const levers: string[] = [];
      if (s.config.ticket_variation_pct !== undefined && s.config.ticket_variation_pct > 0) {
        levers.push(`ticket medio +${s.config.ticket_variation_pct}%`);
      }
      if (s.config.student_count_variation_pct !== undefined && s.config.student_count_variation_pct > 0) {
        levers.push(`alunos +${s.config.student_count_variation_pct}%`);
      }
      if (s.config.revenue_variation_pct !== undefined && s.config.revenue_variation_pct > 0) {
        levers.push(`receita +${s.config.revenue_variation_pct}%`);
      }
      if (s.config.scholarship_reduction_pct !== undefined && s.config.scholarship_reduction_pct > 0) {
        levers.push(`reducao bolsa ${s.config.scholarship_reduction_pct}%`);
      }

      if (levers.length > 0) {
        recs.push({
          title: 'Expandir receita com risco controlado',
          description: `O cenario "${s.config.name}" mostra que e possivel aumentar receita em ${round1(delta.receita_delta_pct)}% `
            + `usando: ${levers.join(', ')}. Score sobe ${round1(delta.score_delta)} pontos.`,
          action_type: 'increase_revenue',
          priority: delta.score_delta > 5 ? 'high' : 'medium',
          time_horizon: 'short_term',
          expected_score_impact: round2(delta.score_delta),
          expected_ebitda_impact_pct: round1(delta.ebitda_delta_pct),
          based_on_scenarios: [s.config.name],
          rationale: `Receita sobe de ${formatAbs(s.financial_summary.receita - delta.receita_delta * s.financial_summary.receita / (s.financial_summary.receita))} `
            + `para ${formatAbs(s.financial_summary.receita)}, com risco "${risk.risk_level}" e estabilidade ${risk.stability_index}/100.`,
        });
      }
    }
  }

  return recs;
}

function formatAbs(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

// --------------------------------------------
// Cost Optimization Recommendations
// --------------------------------------------

/**
 * Gera recomendacoes de reducao de custos.
 * Identifica cenarios onde cortes de custos melhoram margem e score sem risco excessivo.
 */
export function generateCostRecommendations(
  scenarios: ScenarioSimulationResult[],
  riskProfiles: ScenarioRiskProfile[],
): StrategicRecommendation[] {
  const recs: StrategicRecommendation[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const risk = riskProfiles[i];
    const delta = s.delta_vs_base;

    // Cenario com melhoria de margem via custos
    const hasCostReduction =
      (s.config.variable_cost_variation_pct !== undefined && s.config.variable_cost_variation_pct < 0) ||
      (s.config.fixed_cost_variation_pct !== undefined && s.config.fixed_cost_variation_pct < 0) ||
      (s.config.sga_variation_pct !== undefined && s.config.sga_variation_pct < 0);

    if (hasCostReduction && delta.margem_delta_pp > 1 && RISK_SEVERITY[risk.risk_level] <= 2) {
      const cuts: string[] = [];
      if (s.config.variable_cost_variation_pct !== undefined && s.config.variable_cost_variation_pct < 0) {
        cuts.push(`CV ${s.config.variable_cost_variation_pct}%`);
      }
      if (s.config.fixed_cost_variation_pct !== undefined && s.config.fixed_cost_variation_pct < 0) {
        cuts.push(`CF ${s.config.fixed_cost_variation_pct}%`);
      }
      if (s.config.sga_variation_pct !== undefined && s.config.sga_variation_pct < 0) {
        cuts.push(`SGA ${s.config.sga_variation_pct}%`);
      }

      recs.push({
        title: 'Otimizar estrutura de custos',
        description: `Cenario "${s.config.name}": reducao de custos (${cuts.join(', ')}) `
          + `eleva margem em ${round1(delta.margem_delta_pp)}pp e EBITDA em ${round1(delta.ebitda_delta_pct)}%.`,
        action_type: 'reduce_costs',
        priority: delta.ebitda_delta_pct > 10 ? 'high' : 'medium',
        time_horizon: 'short_term',
        expected_score_impact: round2(delta.score_delta),
        expected_ebitda_impact_pct: round1(delta.ebitda_delta_pct),
        based_on_scenarios: [s.config.name],
        rationale: `Margem de contribuicao sobe para ${round1(s.financial_summary.margem_contribuicao_pct)}%. `
          + `Risco: "${risk.risk_level}", estabilidade: ${risk.stability_index}/100.`,
      });
    }
  }

  return recs;
}

// --------------------------------------------
// Risk Management Recommendations
// --------------------------------------------

/**
 * Gera recomendacoes de gestao de risco.
 * Alerta sobre cenarios com risco alto e sugere mitigacoes.
 */
export function generateRiskRecommendations(
  scenarios: ScenarioSimulationResult[],
  riskProfiles: ScenarioRiskProfile[],
): StrategicRecommendation[] {
  const recs: StrategicRecommendation[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const risk = riskProfiles[i];

    if (RISK_SEVERITY[risk.risk_level] >= 3) {
      // Alto risco — alertar e sugerir mitigacao
      recs.push({
        title: `Mitigar riscos do cenario "${s.config.name}"`,
        description: `Cenario classificado como risco "${risk.risk_level}" (estabilidade ${risk.stability_index}/100). `
          + `${risk.risk_alerts.length > 0 ? 'Alertas: ' + risk.risk_alerts.join('; ') + '.' : ''}`,
        action_type: 'manage_risk',
        priority: risk.risk_level === 'critical' ? 'critical' : 'high',
        time_horizon: 'immediate',
        expected_score_impact: 0,
        expected_ebitda_impact_pct: 0,
        based_on_scenarios: [s.config.name],
        rationale: `Score simulado: ${s.score.score}. EBITDA delta: ${round1(s.delta_vs_base.ebitda_delta_pct)}%. `
          + `Confianca: ${risk.confidence_index}/100.`,
      });
    }

    // Cenario com score caindo abaixo de 60 — zona critica
    if (s.score.score < 60 && s.delta_vs_base.score_delta < -5) {
      recs.push({
        title: 'Evitar deterioracao do Health Score',
        description: `Cenario "${s.config.name}" reduz score para ${s.score.score} `
          + `(queda de ${round1(Math.abs(s.delta_vs_base.score_delta))} pontos). `
          + `Score abaixo de 60 indica zona de risco operacional.`,
        action_type: 'manage_risk',
        priority: 'critical',
        time_horizon: 'immediate',
        expected_score_impact: round2(s.delta_vs_base.score_delta),
        expected_ebitda_impact_pct: round1(s.delta_vs_base.ebitda_delta_pct),
        based_on_scenarios: [s.config.name],
        rationale: `Margem cai para ${round1(s.financial_summary.margem_contribuicao_pct)}%, `
          + `EBITDA para ${formatAbs(s.financial_summary.ebitda)}.`,
      });
    }
  }

  return recs;
}

// --------------------------------------------
// Trade-off Analysis
// --------------------------------------------

/**
 * Identifica trade-offs entre pares de cenarios.
 * Compara os top 2 cenarios do ranking geral e cenarios com perfis opostos.
 */
export function analyzeTradeoffs(
  scenarios: ScenarioSimulationResult[],
  comparison: ScenarioComparisonResult,
  riskProfiles: ScenarioRiskProfile[],
): StrategicTradeoff[] {
  const tradeoffs: StrategicTradeoff[] = [];

  if (scenarios.length < 2) return tradeoffs;

  // Trade-off entre top 2 do ranking geral
  const top1Idx = comparison.rankings.overall.entries[0].scenario_index;
  const top2Idx = comparison.rankings.overall.entries[1].scenario_index;
  const s1 = scenarios[top1Idx];
  const s2 = scenarios[top2Idx];
  const r1 = riskProfiles[top1Idx];
  const r2 = riskProfiles[top2Idx];

  if (r1.risk_level !== r2.risk_level) {
    const lowerRisk = RISK_SEVERITY[r1.risk_level] < RISK_SEVERITY[r2.risk_level] ? s1 : s2;
    const higherReturn = s1.delta_vs_base.ebitda_delta_pct > s2.delta_vs_base.ebitda_delta_pct ? s1 : s2;

    if (lowerRisk.config.name !== higherReturn.config.name) {
      tradeoffs.push({
        description: `Risco vs Retorno: "${higherReturn.config.name}" tem maior retorno `
          + `mas "${lowerRisk.config.name}" tem menor risco.`,
        scenario_a: lowerRisk.config.name,
        scenario_b: higherReturn.config.name,
        gain: `EBITDA ${round1(higherReturn.delta_vs_base.ebitda_delta_pct)}% vs ${round1(lowerRisk.delta_vs_base.ebitda_delta_pct)}%`,
        loss: `Risco "${higherReturn.config.name}": ${(RISK_SEVERITY[riskProfiles[scenarios.indexOf(higherReturn)].risk_level] > RISK_SEVERITY[riskProfiles[scenarios.indexOf(lowerRisk)].risk_level]) ? 'mais alto' : 'equivalente'}`,
        verdict: RISK_SEVERITY[riskProfiles[scenarios.indexOf(higherReturn)].risk_level] >= 3
          ? 'favor_a'
          : 'depends_on_context',
      });
    }
  }

  // Trade-off score vs margem (se cenarios divergem)
  const bestScore = comparison.rankings.by_score.best;
  const bestMargin = comparison.rankings.by_margin.best;

  if (bestScore.scenario_name !== bestMargin.scenario_name) {
    tradeoffs.push({
      description: `Score vs Margem: "${bestScore.scenario_name}" tem melhor score, `
        + `mas "${bestMargin.scenario_name}" tem melhor margem.`,
      scenario_a: bestScore.scenario_name,
      scenario_b: bestMargin.scenario_name,
      gain: `Score ${bestScore.value} vs ${comparison.rankings.by_score.entries.find(e => e.scenario_name === bestMargin.scenario_name)?.value ?? 0}`,
      loss: `Margem ${bestMargin.value.toFixed(1)}% vs ${comparison.rankings.by_margin.entries.find(e => e.scenario_name === bestScore.scenario_name)?.value.toFixed(1) ?? '0'}%`,
      verdict: 'depends_on_context',
    });
  }

  return tradeoffs;
}

// --------------------------------------------
// Quick Wins Detection
// --------------------------------------------

/**
 * Identifica quick wins: acoes de alto impacto com baixo risco.
 * Busca cenarios com risco low/very_low e ganhos significativos.
 */
export function identifyQuickWins(
  scenarios: ScenarioSimulationResult[],
  riskProfiles: ScenarioRiskProfile[],
): QuickWin[] {
  const wins: QuickWin[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const risk = riskProfiles[i];
    const delta = s.delta_vs_base;

    // Risco baixo e ganho significativo
    if (RISK_SEVERITY[risk.risk_level] <= 1 && (delta.score_delta > 3 || delta.ebitda_delta_pct > 5)) {
      // Identificar alavanca principal
      const levers: { lever: string; impact: number }[] = [];

      if (s.config.scholarship_reduction_pct !== undefined && s.config.scholarship_reduction_pct > 0) {
        levers.push({ lever: `Reducao bolsa ${s.config.scholarship_reduction_pct}%`, impact: s.config.scholarship_reduction_pct });
      }
      if (s.config.variable_cost_variation_pct !== undefined && s.config.variable_cost_variation_pct < 0) {
        levers.push({ lever: `Reducao CV ${Math.abs(s.config.variable_cost_variation_pct)}%`, impact: Math.abs(s.config.variable_cost_variation_pct) });
      }
      if (s.config.fixed_cost_variation_pct !== undefined && s.config.fixed_cost_variation_pct < 0) {
        levers.push({ lever: `Reducao CF ${Math.abs(s.config.fixed_cost_variation_pct)}%`, impact: Math.abs(s.config.fixed_cost_variation_pct) });
      }
      if (s.config.sga_variation_pct !== undefined && s.config.sga_variation_pct < 0) {
        levers.push({ lever: `Reducao SGA ${Math.abs(s.config.sga_variation_pct)}%`, impact: Math.abs(s.config.sga_variation_pct) });
      }
      if (s.config.ticket_variation_pct !== undefined && s.config.ticket_variation_pct > 0) {
        levers.push({ lever: `Aumento ticket ${s.config.ticket_variation_pct}%`, impact: s.config.ticket_variation_pct });
      }

      // Usar alavanca de maior impacto
      levers.sort((a, b) => b.impact - a.impact);
      const mainLever = levers[0];

      if (mainLever) {
        wins.push({
          action: `"${s.config.name}": ${mainLever.lever}`,
          lever: mainLever.lever,
          score_uplift: round2(delta.score_delta),
          ebitda_uplift_pct: round1(delta.ebitda_delta_pct),
          risk: risk.risk_level,
        });
      }
    }
  }

  // Ordenar por score uplift descendente
  wins.sort((a, b) => b.score_uplift - a.score_uplift);

  return wins;
}

// --------------------------------------------
// Actions to Avoid
// --------------------------------------------

/**
 * Identifica acoes que devem ser evitadas com base nos cenarios de pior desempenho.
 */
export function identifyActionsToAvoid(
  scenarios: ScenarioSimulationResult[],
  riskProfiles: ScenarioRiskProfile[],
): string[] {
  const avoid: string[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const risk = riskProfiles[i];
    const delta = s.delta_vs_base;

    // Cenario com risco critico — alertar sobre as alavancas usadas
    if (risk.risk_level === 'critical') {
      const levers: string[] = [];
      if (s.config.revenue_variation_pct !== undefined && s.config.revenue_variation_pct < -10) {
        levers.push(`queda de receita > 10%`);
      }
      if (s.config.variable_cost_variation_pct !== undefined && s.config.variable_cost_variation_pct > 10) {
        levers.push(`aumento de CV > 10%`);
      }
      if (s.config.fixed_cost_variation_pct !== undefined && s.config.fixed_cost_variation_pct > 10) {
        levers.push(`aumento de CF > 10%`);
      }

      if (levers.length > 0) {
        avoid.push(
          `Evitar cenario com ${levers.join(' e ')}: score cairia para ${s.score.score} `
          + `e EBITDA ${round1(delta.ebitda_delta_pct)}%.`
        );
      }
    }

    // Score abaixo de 50 — alerta grave
    if (s.score.score < 50) {
      avoid.push(
        `Cenario "${s.config.name}" leva score a ${s.score.score} (zona critica). `
        + `Alavancas deste cenario devem ser evitadas.`
      );
    }

    // EBITDA negativo
    if (s.financial_summary.ebitda < 0 && delta.ebitda_delta_pct < -20) {
      avoid.push(
        `Cenario "${s.config.name}" resulta em EBITDA negativo (${formatAbs(s.financial_summary.ebitda)}). `
        + `Indica inviabilidade operacional.`
      );
    }
  }

  // Deduplicar
  return [...new Set(avoid)];
}

// --------------------------------------------
// Executive Summary Builder
// --------------------------------------------

/**
 * Gera resumo executivo da analise de decisao.
 */
export function buildExecutiveSummary(
  recommended: ScenarioSimulationResult,
  recommendedRisk: ScenarioRiskProfile,
  comparison: ScenarioComparisonResult,
  quickWins: QuickWin[],
  actionsToAvoid: string[],
): string {
  const parts: string[] = [];

  parts.push(
    `Analise de ${comparison.scenario_count} cenarios estrategicos.`
  );

  parts.push(
    `Cenario recomendado: "${recommended.config.name}" `
    + `(Score ${recommended.score.score}, EBITDA ${formatAbs(recommended.financial_summary.ebitda)}, `
    + `risco "${recommendedRisk.risk_level}", estabilidade ${recommendedRisk.stability_index}/100).`
  );

  if (quickWins.length > 0) {
    parts.push(
      `${quickWins.length} quick win(s) identificado(s), `
      + `com potencial de ate +${quickWins[0].score_uplift} pontos no score.`
    );
  }

  if (actionsToAvoid.length > 0) {
    parts.push(
      `${actionsToAvoid.length} acao(oes) a evitar identificada(s).`
    );
  }

  return parts.join(' ');
}

// --------------------------------------------
// Main: Generate Decision Analysis
// --------------------------------------------

/**
 * Gera analise completa de decisao estrategica.
 *
 * Combina:
 * - Resultados de simulacao (scenarioEngine)
 * - Rankings comparativos (scenarioComparison)
 * - Perfis de risco (strategicRiskEngine)
 *
 * Retorna recomendacoes, trade-offs, quick wins e acoes a evitar.
 *
 * Requer ao menos 2 cenarios para comparacao.
 * Funcao pura e deterministica.
 */
export function generateDecisionAnalysis(
  scenarios: ScenarioSimulationResult[],
  comparison: ScenarioComparisonResult,
  riskAssessment: StrategicRiskAssessment,
): DecisionAnalysisResult {
  if (scenarios.length < 2) {
    throw new Error('generateDecisionAnalysis requires at least 2 scenarios');
  }

  const profiles = riskAssessment.profiles;

  // Collect all recommendations
  const revenueRecs = generateRevenueRecommendations(scenarios, profiles);
  const costRecs = generateCostRecommendations(scenarios, profiles);
  const riskRecs = generateRiskRecommendations(scenarios, profiles);

  // Merge and sort by priority
  const allRecs = [...revenueRecs, ...costRecs, ...riskRecs]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // Recommended scenario = best overall from comparison
  const bestIdx = comparison.best_overall.scenario_index;
  const bestScenario = scenarios[bestIdx];
  const bestRisk = profiles[bestIdx];

  // Determine recommendation reason
  const reason = buildRecommendationReason(bestScenario, bestRisk, comparison);

  // Trade-offs
  const tradeoffs = analyzeTradeoffs(scenarios, comparison, profiles);

  // Quick wins
  const quickWins = identifyQuickWins(scenarios, profiles);

  // Actions to avoid
  const actionsToAvoid = identifyActionsToAvoid(scenarios, profiles);

  // Executive summary
  const executiveSummary = buildExecutiveSummary(
    bestScenario,
    bestRisk,
    comparison,
    quickWins,
    actionsToAvoid,
  );

  // Primary recommendation
  const primaryRec: StrategicRecommendation = allRecs.length > 0
    ? allRecs[0]
    : {
        title: 'Manter estrategia atual',
        description: 'Nenhuma acao especifica identificada com base nos cenarios simulados.',
        action_type: 'maintain',
        priority: 'low',
        time_horizon: 'medium_term',
        expected_score_impact: 0,
        expected_ebitda_impact_pct: 0,
        based_on_scenarios: [bestScenario.config.name],
        rationale: 'Cenarios simulados nao revelam oportunidades claras de melhoria.',
      };

  return {
    primary_recommendation: primaryRec,
    recommendations: allRecs,
    tradeoffs,
    quick_wins: quickWins,
    recommended_scenario: {
      name: bestScenario.config.name,
      index: bestIdx,
      reason,
    },
    executive_summary: executiveSummary,
    actions_to_avoid: actionsToAvoid,
  };
}

// --------------------------------------------
// Recommendation Reason Builder
// --------------------------------------------

/**
 * Constroi justificativa para o cenario recomendado.
 */
function buildRecommendationReason(
  scenario: ScenarioSimulationResult,
  risk: ScenarioRiskProfile,
  comparison: ScenarioComparisonResult,
): string {
  const parts: string[] = [];

  parts.push(
    `Melhor pontuacao geral (${comparison.best_overall.overall_points.toFixed(1)} pontos).`
  );

  if (RISK_SEVERITY[risk.risk_level] <= 1) {
    parts.push(`Risco "${risk.risk_level}" — dentro da zona de conforto.`);
  } else if (RISK_SEVERITY[risk.risk_level] <= 2) {
    parts.push(`Risco "${risk.risk_level}" — moderado, requer monitoramento.`);
  } else {
    parts.push(`Atencao: risco "${risk.risk_level}" — necessita plano de mitigacao.`);
  }

  if (scenario.delta_vs_base.score_delta > 0) {
    parts.push(`Score sobe ${round1(scenario.delta_vs_base.score_delta)} pontos.`);
  }

  if (risk.stability_index >= 70) {
    parts.push(`Alta estabilidade (${risk.stability_index}/100).`);
  }

  return parts.join(' ');
}

// --------------------------------------------
// Convenience: Quick Decision Summary
// --------------------------------------------

/**
 * Retorna resumo rapido para tomada de decisao.
 * Atalho para quando so se precisa da recomendacao principal.
 */
export function quickDecisionSummary(
  scenarios: ScenarioSimulationResult[],
  comparison: ScenarioComparisonResult,
  riskAssessment: StrategicRiskAssessment,
): { scenario: string; reason: string; quickWins: number; risksToAvoid: number } {
  const result = generateDecisionAnalysis(scenarios, comparison, riskAssessment);
  return {
    scenario: result.recommended_scenario.name,
    reason: result.recommended_scenario.reason,
    quickWins: result.quick_wins.length,
    risksToAvoid: result.actions_to_avoid.length,
  };
}
