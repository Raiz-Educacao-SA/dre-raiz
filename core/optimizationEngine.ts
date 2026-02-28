// ============================================
// Core Optimization Engine
// Grid search determinístico — zero side effects
// ============================================

import type {
  FinancialInputs,
  ScoreInputs,
  OptimizationInput,
  OptimizationResult,
  ProposedAction,
  CutCandidate,
  OptimizationConfig,
  OptimizationConstraints,
  OptimizationObjective,
  MultiObjectiveInput,
  MultiObjectiveResult,
} from './decisionTypes';
import { calculateEbitda, calculateMargin, safePct } from './financialModel';
import { calculateScore } from './scoreModel';

// --------------------------------------------
// Default Config
// --------------------------------------------

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  fractions: [0.6, 0.7, 0.8, 0.9, 1.0],
  max_cut_pct: 0.1,
};

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --------------------------------------------
// Gap calculation
// --------------------------------------------

/**
 * Calcula o gap de EBITDA necessário para atingir o target.
 * Se target_ebitda definido, usa direto.
 * Se target_score definido, estima gap proporcional à receita.
 */
export function calculateGap(
  currentEbitda: number,
  currentScore: number,
  receita: number,
  targetScore?: number,
  targetEbitda?: number,
): number {
  if (targetEbitda !== undefined && targetEbitda > 0) {
    return targetEbitda - currentEbitda;
  }

  if (targetScore !== undefined && targetScore > 0) {
    const scoreDiff = targetScore - currentScore;
    const base = Math.abs(receita) || 1;
    return (scoreDiff / 100) * base;
  }

  return 0;
}

// --------------------------------------------
// Candidate sorting
// --------------------------------------------

/**
 * Ordena candidatos por gap desc, depois volume desc.
 * Retorna cópia — não muta o array original.
 */
export function sortCandidates(candidates: CutCandidate[]): CutCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.gap !== a.gap) return b.gap - a.gap;
    return b.volume - a.volume;
  });
}

// --------------------------------------------
// Distribute cuts (greedy)
// --------------------------------------------

/**
 * Distribui o gap entre candidatos usando heurística greedy:
 * cada área recebe corte até seu gap ou 10% do volume (o menor),
 * sem exceder o remaining gap.
 */
export function distributeCuts(
  sorted: CutCandidate[],
  totalGap: number,
): ProposedAction[] {
  if (totalGap <= 0) return [];

  const actions: ProposedAction[] = [];
  let remaining = totalGap;

  for (const candidate of sorted) {
    if (remaining <= 0) break;

    const maxCut = candidate.gap > 0
      ? candidate.gap
      : candidate.volume * 0.1;
    const suggestedCut = Math.min(maxCut, remaining);

    if (suggestedCut <= 0) continue;

    const contribution = round2((suggestedCut / totalGap) * 100);

    actions.push({
      area: candidate.area,
      current_gap: round2(candidate.gap),
      suggested_cut: round2(suggestedCut),
      estimated_impact: contribution,
      priority: contribution >= 30 ? 'high' : contribution >= 15 ? 'medium' : 'low',
    });

    remaining -= suggestedCut;
  }

  return actions;
}

/**
 * Distribui cortes com max_cut_pct configurável.
 */
export function distributeCutsWithConfig(
  sorted: CutCandidate[],
  totalGap: number,
  maxCutPct: number,
): ProposedAction[] {
  if (totalGap <= 0) return [];

  const actions: ProposedAction[] = [];
  let remaining = totalGap;

  for (const candidate of sorted) {
    if (remaining <= 0) break;

    const maxCut = candidate.gap > 0
      ? candidate.gap
      : candidate.volume * maxCutPct;
    const suggestedCut = Math.min(maxCut, remaining);

    if (suggestedCut <= 0) continue;

    const contribution = round2((suggestedCut / totalGap) * 100);

    actions.push({
      area: candidate.area,
      current_gap: round2(candidate.gap),
      suggested_cut: round2(suggestedCut),
      estimated_impact: contribution,
      priority: contribution >= 30 ? 'high' : contribution >= 15 ? 'medium' : 'low',
    });

    remaining -= suggestedCut;
  }

  return actions;
}

/**
 * Grid search com config dinâmica (frações e max_cut_pct customizáveis).
 */
export function gridSearchWithConfig(
  financials: FinancialInputs,
  scoreInputs: ScoreInputs,
  candidates: CutCandidate[],
  totalGap: number,
  config: OptimizationConfig,
): { actions: ProposedAction[]; projected: { ebitda: number; margin: number; score: number } } {
  const sorted = sortCandidates(candidates);

  let bestActions: ProposedAction[] = [];
  let bestProjected = { ebitda: 0, margin: 0, score: 0 };
  let bestScore = -1;

  for (const frac of config.fractions) {
    const adjustedGap = totalGap * frac;
    const actions = distributeCutsWithConfig(sorted, adjustedGap, config.max_cut_pct);
    const totalCut = actions.reduce((s, a) => s + a.suggested_cut, 0);
    const projected = projectAfterPlan(financials, scoreInputs, totalCut);

    if (projected.score > bestScore) {
      bestScore = projected.score;
      bestActions = actions;
      bestProjected = projected;
    }
  }

  return { actions: bestActions, projected: bestProjected };
}

/**
 * Executa otimização com configuração dinâmica.
 */
export function runOptimizationWithConfig(
  config: OptimizationInput,
  optConfig: OptimizationConfig,
): OptimizationResult {
  const currentEbitda = calculateEbitda(config.current_financials);
  const currentScore = calculateScore(config.current_score_inputs);

  const gap = calculateGap(
    currentEbitda,
    currentScore,
    config.current_financials.receita_real,
    config.target_score,
    config.target_ebitda,
  );

  if (gap <= 0) {
    return {
      gap: 0,
      proposed_actions: [],
      projected_score: currentScore,
      projected_ebitda: currentEbitda,
      projected_margin: calculateMargin(
        config.current_financials.receita_real,
        config.current_financials.custos_variaveis_real,
      ),
    };
  }

  const { actions, projected } = gridSearchWithConfig(
    config.current_financials,
    config.current_score_inputs,
    config.candidates,
    gap,
    optConfig,
  );

  return {
    gap: round2(gap),
    proposed_actions: actions,
    projected_score: projected.score,
    projected_ebitda: projected.ebitda,
    projected_margin: projected.margin,
  };
}

// --------------------------------------------
// Project after plan
// --------------------------------------------

/**
 * Projeta métricas financeiras após aplicação dos cortes.
 * Retorna EBITDA, margin e score projetados.
 */
export function projectAfterPlan(
  financials: FinancialInputs,
  scoreInputs: ScoreInputs,
  totalCut: number,
): { ebitda: number; margin: number; score: number } {
  // Corte melhora custos → EBITDA sobe
  const projectedEbitda = financials.receita_real +
    financials.custos_variaveis_real +
    financials.custos_fixos_real +
    financials.sga_real +
    financials.rateio_real +
    totalCut;

  // Margem: assume 50% do corte impacta custos variáveis
  const projectedMargin = safePct(
    financials.receita_real + financials.custos_variaveis_real + totalCut * 0.5,
    financials.receita_real,
  );

  const projectedScore = calculateScore({
    ...scoreInputs,
    margin_real: projectedMargin,
    ebitda_real: projectedEbitda,
  });

  return {
    ebitda: round2(projectedEbitda),
    margin: round2(projectedMargin),
    score: projectedScore,
  };
}

// --------------------------------------------
// Constraint Validation
// --------------------------------------------

/**
 * Filtra candidatos removendo áreas protegidas.
 */
export function filterProtectedAreas(
  candidates: CutCandidate[],
  protectedAreas: string[],
): CutCandidate[] {
  if (protectedAreas.length === 0) return candidates;
  const protectedSet = new Set(protectedAreas.map((a) => a.toLowerCase()));
  return candidates.filter((c) => !protectedSet.has(c.area.toLowerCase()));
}

/**
 * Aplica constraint de corte máximo por área.
 * Retorna candidatos com gap/volume limitados.
 */
export function applyPerAreaCap(
  candidates: CutCandidate[],
  maxCutPerArea: number,
): CutCandidate[] {
  return candidates.map((c) => ({
    ...c,
    gap: Math.min(c.gap, maxCutPerArea),
    volume: c.volume,
  }));
}

/**
 * Verifica se as constraints são satisfeitas pelo resultado projetado.
 */
export function validateConstraints(
  projected: { ebitda: number; margin: number; score: number },
  totalCut: number,
  financials: FinancialInputs,
  constraints: OptimizationConstraints,
): { satisfied: boolean; violations: string[] } {
  const violations: string[] = [];

  if (constraints.min_margin !== undefined && projected.margin < constraints.min_margin) {
    violations.push(`Margem projetada (${round2(projected.margin)}%) abaixo do mínimo (${constraints.min_margin}%)`);
  }

  if (constraints.max_total_cut !== undefined && totalCut > constraints.max_total_cut) {
    violations.push(`Corte total (${round2(totalCut)}) excede o máximo (${constraints.max_total_cut})`);
  }

  if (constraints.min_revenue !== undefined) {
    const projectedRevenue = financials.receita_real;
    if (projectedRevenue < constraints.min_revenue) {
      violations.push(`Receita (${round2(projectedRevenue)}) abaixo do mínimo (${constraints.min_revenue})`);
    }
  }

  return { satisfied: violations.length === 0, violations };
}

// --------------------------------------------
// Objective Functions
// --------------------------------------------

/**
 * Calcula o valor do objetivo para comparação entre soluções.
 * Maior = melhor para todos os objetivos.
 */
export function evaluateObjective(
  objective: OptimizationObjective,
  projected: { ebitda: number; margin: number; score: number },
): number {
  switch (objective) {
    case 'maximize_score':
      return projected.score;
    case 'maximize_ebitda':
      return projected.ebitda;
    case 'minimize_risk':
      // Higher score = lower risk, plus margin bonus
      return projected.score + projected.margin * 0.1;
  }
}

// --------------------------------------------
// Multi-Objective Optimization
// --------------------------------------------

/**
 * Grid search multi-objetivo com constraints.
 * Testa frações, aplica constraints, seleciona pelo objetivo.
 */
export function multiObjectiveGridSearch(
  financials: FinancialInputs,
  scoreInputs: ScoreInputs,
  candidates: CutCandidate[],
  totalGap: number,
  objective: OptimizationObjective,
  constraints: OptimizationConstraints,
  config: OptimizationConfig,
): MultiObjectiveResult {
  // Apply protected areas
  let filtered = constraints.protected_areas
    ? filterProtectedAreas(candidates, constraints.protected_areas)
    : candidates;

  // Apply per-area cap
  if (constraints.max_cut_per_area !== undefined) {
    filtered = applyPerAreaCap(filtered, constraints.max_cut_per_area);
  }

  const sorted = sortCandidates(filtered);

  let bestActions: ProposedAction[] = [];
  let bestProjected = { ebitda: 0, margin: 0, score: 0 };
  let bestObjectiveValue = -Infinity;
  let bestConstraintResult = { satisfied: false, violations: [] as string[] };

  for (const frac of config.fractions) {
    let adjustedGap = totalGap * frac;

    // Apply max_total_cut constraint
    if (constraints.max_total_cut !== undefined) {
      adjustedGap = Math.min(adjustedGap, constraints.max_total_cut);
    }

    const actions = distributeCutsWithConfig(sorted, adjustedGap, config.max_cut_pct);
    const totalCut = actions.reduce((s, a) => s + a.suggested_cut, 0);
    const projected = projectAfterPlan(financials, scoreInputs, totalCut);
    const constraintResult = validateConstraints(projected, totalCut, financials, constraints);
    const objectiveValue = evaluateObjective(objective, projected);

    // Prefer solutions that satisfy constraints
    const isBetter =
      (constraintResult.satisfied && !bestConstraintResult.satisfied) ||
      (constraintResult.satisfied === bestConstraintResult.satisfied && objectiveValue > bestObjectiveValue);

    if (isBetter) {
      bestObjectiveValue = objectiveValue;
      bestActions = actions;
      bestProjected = projected;
      bestConstraintResult = constraintResult;
    }
  }

  return {
    gap: round2(totalGap),
    proposed_actions: bestActions,
    projected_score: bestProjected.score,
    projected_ebitda: bestProjected.ebitda,
    projected_margin: bestProjected.margin,
    constraints_satisfied: bestConstraintResult.satisfied,
    constraint_violations: bestConstraintResult.violations,
    objective_value: round2(bestObjectiveValue),
  };
}

/**
 * Entry point para otimização multi-objetivo.
 */
export function runMultiObjectiveOptimization(
  input: MultiObjectiveInput,
  config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG,
): MultiObjectiveResult {
  const currentEbitda = calculateEbitda(input.current_financials);
  const currentScore = calculateScore(input.current_score_inputs);

  const gap = calculateGap(
    currentEbitda,
    currentScore,
    input.current_financials.receita_real,
    input.target_score,
    input.target_ebitda,
  );

  if (gap <= 0) {
    return {
      gap: 0,
      proposed_actions: [],
      projected_score: currentScore,
      projected_ebitda: currentEbitda,
      projected_margin: calculateMargin(
        input.current_financials.receita_real,
        input.current_financials.custos_variaveis_real,
      ),
      constraints_satisfied: true,
      constraint_violations: [],
      objective_value: evaluateObjective(input.objective, {
        score: currentScore,
        ebitda: currentEbitda,
        margin: calculateMargin(
          input.current_financials.receita_real,
          input.current_financials.custos_variaveis_real,
        ),
      }),
    };
  }

  return multiObjectiveGridSearch(
    input.current_financials,
    input.current_score_inputs,
    input.candidates,
    gap,
    input.objective,
    input.constraints,
    config,
  );
}

// --------------------------------------------
// Grid Search (discrete combinations)
// --------------------------------------------

/**
 * Testa múltiplas combinações discretas de corte
 * para encontrar o resultado ótimo.
 *
 * Testa 5 frações do gap: 60%, 70%, 80%, 90%, 100%.
 * Para cada fração, distribui via greedy e projeta score.
 * Retorna a combinação com melhor score (ou menor gap restante).
 */
export function gridSearch(
  financials: FinancialInputs,
  scoreInputs: ScoreInputs,
  candidates: CutCandidate[],
  totalGap: number,
): { actions: ProposedAction[]; projected: { ebitda: number; margin: number; score: number } } {
  const sorted = sortCandidates(candidates);
  const fractions = [0.6, 0.7, 0.8, 0.9, 1.0];

  let bestActions: ProposedAction[] = [];
  let bestProjected = { ebitda: 0, margin: 0, score: 0 };
  let bestScore = -1;

  for (const frac of fractions) {
    const adjustedGap = totalGap * frac;
    const actions = distributeCuts(sorted, adjustedGap);
    const totalCut = actions.reduce((s, a) => s + a.suggested_cut, 0);
    const projected = projectAfterPlan(financials, scoreInputs, totalCut);

    if (projected.score > bestScore) {
      bestScore = projected.score;
      bestActions = actions;
      bestProjected = projected;
    }
  }

  return { actions: bestActions, projected: bestProjected };
}

// --------------------------------------------
// Main entry point
// --------------------------------------------

/**
 * Executa otimização completa.
 * Calcula gap, distribui cortes via grid search, projeta resultado.
 */
export function runOptimization(config: OptimizationInput): OptimizationResult {
  const currentEbitda = calculateEbitda(config.current_financials);
  const currentScore = calculateScore(config.current_score_inputs);

  const gap = calculateGap(
    currentEbitda,
    currentScore,
    config.current_financials.receita_real,
    config.target_score,
    config.target_ebitda,
  );

  // Target already met
  if (gap <= 0) {
    return {
      gap: 0,
      proposed_actions: [],
      projected_score: currentScore,
      projected_ebitda: currentEbitda,
      projected_margin: calculateMargin(
        config.current_financials.receita_real,
        config.current_financials.custos_variaveis_real,
      ),
    };
  }

  const { actions, projected } = gridSearch(
    config.current_financials,
    config.current_score_inputs,
    config.candidates,
    gap,
  );

  return {
    gap: round2(gap),
    proposed_actions: actions,
    projected_score: projected.score,
    projected_ebitda: projected.ebitda,
    projected_margin: projected.margin,
  };
}
