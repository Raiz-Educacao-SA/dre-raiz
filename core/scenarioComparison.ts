// ============================================
// Core Scenario Comparison — Strategic Simulation Lab
// Funcoes puras — zero side effects, zero I/O
// Compara multiplos cenarios e gera rankings
// ============================================

import type { ScenarioSimulationResult, ScenarioDelta } from './scenarioEngine';

// --------------------------------------------
// Types
// --------------------------------------------

/** Criterio de ranking */
export type RankingCriterion = 'score' | 'ebitda' | 'risk' | 'margin' | 'overall';

/** Entrada no ranking por criterio */
export interface RankingEntry {
  /** Nome do cenario */
  scenario_name: string;
  /** Indice no array original */
  scenario_index: number;
  /** Valor usado para ranking */
  value: number;
  /** Posicao no ranking (1 = melhor) */
  rank: number;
}

/** Ranking completo de um criterio */
export interface CriterionRanking {
  criterion: RankingCriterion;
  label: string;
  entries: RankingEntry[];
  best: RankingEntry;
  worst: RankingEntry;
}

/** Comparacao par-a-par entre dois cenarios */
export interface PairwiseComparison {
  scenario_a: string;
  scenario_b: string;
  score_diff: number;
  ebitda_diff: number;
  margin_diff_pp: number;
  risk_diff: string;
  winner: string;
}

/** Resultado completo da comparacao multi-cenario */
export interface ScenarioComparisonResult {
  /** Numero de cenarios comparados */
  scenario_count: number;
  /** Rankings por criterio */
  rankings: {
    by_score: CriterionRanking;
    by_ebitda: CriterionRanking;
    by_risk: CriterionRanking;
    by_margin: CriterionRanking;
    overall: CriterionRanking;
  };
  /** Melhor cenario geral */
  best_overall: {
    scenario_name: string;
    scenario_index: number;
    score: number;
    ebitda: number;
    margin_pct: number;
    risk_assessment: string;
    overall_points: number;
  };
  /** Comparacoes par-a-par (top 2 cenarios) */
  top_comparison: PairwiseComparison | null;
  /** Resumo textual */
  summary: string;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Converte risk_assessment para valor numerico (menor = melhor).
 * Usado para ranking por risco.
 */
function riskToNumber(riskAssessment: string): number {
  if (riskAssessment.includes('deterioração') || riskAssessment.includes('deterioracao')) return 3;
  if (riskAssessment.includes('negativa')) return 2;
  return 1; // Estavel ou crescente
}

/**
 * Converte valor numerico de risco para label.
 */
function riskNumberToLabel(value: number): string {
  if (value >= 3) return 'Alto';
  if (value >= 2) return 'Medio';
  return 'Baixo';
}

// --------------------------------------------
// Ranking by Criterion
// --------------------------------------------

/**
 * Cria ranking de cenarios por um criterio especifico.
 * Ordena do melhor para o pior.
 *
 * Para score, ebitda, margin: maior = melhor
 * Para risk: menor = melhor
 */
export function rankByCriterion(
  scenarios: ScenarioSimulationResult[],
  criterion: RankingCriterion,
): CriterionRanking {
  const labels: Record<RankingCriterion, string> = {
    score: 'Health Score',
    ebitda: 'EBITDA',
    risk: 'Risco (menor = melhor)',
    margin: 'Margem de Contribuicao',
    overall: 'Pontuacao Geral',
  };

  const entries: RankingEntry[] = scenarios.map((s, i) => {
    let value: number;
    switch (criterion) {
      case 'score':
        value = s.score.score;
        break;
      case 'ebitda':
        value = s.financial_summary.ebitda;
        break;
      case 'risk':
        value = riskToNumber(s.forecast.risk_assessment);
        break;
      case 'margin':
        value = s.financial_summary.margem_contribuicao_pct;
        break;
      case 'overall':
        value = calculateOverallPoints(s, scenarios.length);
        break;
    }
    return {
      scenario_name: s.config.name,
      scenario_index: i,
      value: round2(value),
      rank: 0,
    };
  });

  // Ordena: para risco, menor e melhor. Para os demais, maior e melhor.
  if (criterion === 'risk') {
    entries.sort((a, b) => a.value - b.value);
  } else {
    entries.sort((a, b) => b.value - a.value);
  }

  // Atribui ranks (1 = melhor)
  entries.forEach((e, i) => { e.rank = i + 1; });

  return {
    criterion,
    label: labels[criterion],
    entries,
    best: entries[0],
    worst: entries[entries.length - 1],
  };
}

// --------------------------------------------
// Overall Points (Weighted Composite)
// --------------------------------------------

/**
 * Calcula pontuacao geral de um cenario via media ponderada normalizada.
 *
 * Cada metrica e normalizada para 0-100 e depois ponderada:
 * - Score: 30% (ja 0-100)
 * - EBITDA%: 25% (normalizado via shift, faixa esperada -50% a +50%)
 * - Margem%: 25% (clamped 0-100)
 * - Risco: 20% (1=100, 2=66, 3=33)
 *
 * Resultado: 0-100. Maior = melhor.
 */
export function calculateOverallPoints(
  scenario: ScenarioSimulationResult,
  _totalScenarios: number,
): number {
  const scoreNorm = scenario.score.score; // ja 0-100
  const marginNorm = Math.min(100, Math.max(0, scenario.financial_summary.margem_contribuicao_pct));
  const riskNorm = (4 - riskToNumber(scenario.forecast.risk_assessment)) * 33.33; // 1→100, 2→66, 3→33

  // EBITDA%: normalizado para 0-100 via shift.
  // Faixa esperada: -50% a +50%. Valores fora saturam (0 ou 100).
  const ebitdaPctNorm = Math.min(100, Math.max(0, scenario.financial_summary.ebitda_pct + 50));

  // Pesos: Score 30%, EBITDA 25%, Margem 25%, Risco 20%
  return round2(
    scoreNorm * 0.30 +
    ebitdaPctNorm * 0.25 +
    marginNorm * 0.25 +
    riskNorm * 0.20
  );
}

// --------------------------------------------
// Pairwise Comparison
// --------------------------------------------

/**
 * Compara dois cenarios diretamente.
 */
export function comparePairwise(
  a: ScenarioSimulationResult,
  b: ScenarioSimulationResult,
): PairwiseComparison {
  const scoreDiff = round2(a.score.score - b.score.score);
  const ebitdaDiff = round2(a.financial_summary.ebitda - b.financial_summary.ebitda);
  const marginDiff = round2(a.financial_summary.margem_contribuicao_pct - b.financial_summary.margem_contribuicao_pct);

  const riskA = riskToNumber(a.forecast.risk_assessment);
  const riskB = riskToNumber(b.forecast.risk_assessment);
  const riskDiff = riskA < riskB ? `${a.config.name} tem menor risco`
    : riskA > riskB ? `${b.config.name} tem menor risco`
    : 'Risco equivalente';

  // Winner: cenario com mais criterios favoraveis
  let aWins = 0;
  let bWins = 0;
  if (scoreDiff > 0) aWins++; else if (scoreDiff < 0) bWins++;
  if (ebitdaDiff > 0) aWins++; else if (ebitdaDiff < 0) bWins++;
  if (marginDiff > 0) aWins++; else if (marginDiff < 0) bWins++;
  if (riskA < riskB) aWins++; else if (riskA > riskB) bWins++;

  const winner = aWins > bWins ? a.config.name
    : bWins > aWins ? b.config.name
    : 'Empate';

  return {
    scenario_a: a.config.name,
    scenario_b: b.config.name,
    score_diff: scoreDiff,
    ebitda_diff: ebitdaDiff,
    margin_diff_pp: marginDiff,
    risk_diff: riskDiff,
    winner,
  };
}

// --------------------------------------------
// Summary Builder
// --------------------------------------------

/**
 * Gera resumo textual da comparacao.
 */
export function buildComparisonSummary(
  scenarios: ScenarioSimulationResult[],
  bestOverallName: string,
  rankings: ScenarioComparisonResult['rankings'],
): string {
  const n = scenarios.length;
  const bestScore = rankings.by_score.best;
  const bestEbitda = rankings.by_ebitda.best;
  const bestRisk = rankings.by_risk.best;

  const parts: string[] = [
    `Comparacao de ${n} cenarios estrategicos.`,
  ];

  parts.push(
    `Melhor cenario geral: "${bestOverallName}".`,
  );

  if (bestScore.scenario_name !== bestOverallName) {
    parts.push(
      `Maior score: "${bestScore.scenario_name}" (${bestScore.value}).`,
    );
  }

  if (bestEbitda.scenario_name !== bestOverallName) {
    parts.push(
      `Maior EBITDA: "${bestEbitda.scenario_name}" (${bestEbitda.value.toLocaleString('pt-BR')}).`,
    );
  }

  if (bestRisk.scenario_name !== bestOverallName) {
    parts.push(
      `Menor risco: "${bestRisk.scenario_name}".`,
    );
  }

  return parts.join(' ');
}

// --------------------------------------------
// Main: Compare Scenarios
// --------------------------------------------

/**
 * Compara multiplos cenarios e gera rankings, comparacoes e resumo.
 *
 * Funcao pura e deterministica.
 * Requer ao menos 2 cenarios para comparacao.
 *
 * Rankings gerados:
 * - by_score: ordenado por Health Score (maior = melhor)
 * - by_ebitda: ordenado por EBITDA (maior = melhor)
 * - by_risk: ordenado por risco (menor = melhor)
 * - by_margin: ordenado por margem de contribuicao (maior = melhor)
 * - overall: pontuacao composta (Score 30%, EBITDA 25%, Margem 25%, Risco 20%)
 */
export function compareScenarios(
  ...scenarios: ScenarioSimulationResult[]
): ScenarioComparisonResult {
  if (scenarios.length < 2) {
    throw new Error('compareScenarios requires at least 2 scenarios');
  }

  // Build rankings
  const byScore = rankByCriterion(scenarios, 'score');
  const byEbitda = rankByCriterion(scenarios, 'ebitda');
  const byRisk = rankByCriterion(scenarios, 'risk');
  const byMargin = rankByCriterion(scenarios, 'margin');
  const overall = rankByCriterion(scenarios, 'overall');

  const rankings = {
    by_score: byScore,
    by_ebitda: byEbitda,
    by_risk: byRisk,
    by_margin: byMargin,
    overall,
  };

  // Best overall
  const bestIdx = overall.best.scenario_index;
  const bestScenario = scenarios[bestIdx];

  const bestOverall = {
    scenario_name: bestScenario.config.name,
    scenario_index: bestIdx,
    score: bestScenario.score.score,
    ebitda: bestScenario.financial_summary.ebitda,
    margin_pct: bestScenario.financial_summary.margem_contribuicao_pct,
    risk_assessment: bestScenario.forecast.risk_assessment,
    overall_points: overall.best.value,
  };

  // Top pairwise comparison (rank 1 vs rank 2 overall)
  let topComparison: PairwiseComparison | null = null;
  if (scenarios.length >= 2) {
    const firstIdx = overall.entries[0].scenario_index;
    const secondIdx = overall.entries[1].scenario_index;
    topComparison = comparePairwise(scenarios[firstIdx], scenarios[secondIdx]);
  }

  // Summary
  const summary = buildComparisonSummary(
    scenarios,
    bestOverall.scenario_name,
    rankings,
  );

  return {
    scenario_count: scenarios.length,
    rankings,
    best_overall: bestOverall,
    top_comparison: topComparison,
    summary,
  };
}

// --------------------------------------------
// Convenience: Quick Best Scenario
// --------------------------------------------

/**
 * Retorna o indice do melhor cenario geral.
 * Atalho para quando so se precisa do resultado.
 */
export function findBestScenario(
  scenarios: ScenarioSimulationResult[],
): { index: number; name: string } {
  if (scenarios.length === 0) {
    throw new Error('findBestScenario requires at least 1 scenario');
  }
  if (scenarios.length === 1) {
    return { index: 0, name: scenarios[0].config.name };
  }
  const result = compareScenarios(...scenarios);
  return {
    index: result.best_overall.scenario_index,
    name: result.best_overall.scenario_name,
  };
}
