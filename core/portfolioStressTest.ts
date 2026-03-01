// ============================================
// Portfolio Stress Test Engine — Multi-Company Intelligence
// Funções puras — zero side effects, zero I/O
// Simula cenários de estresse e avalia resiliência do portfólio
// ============================================

import type {
  CompanyFinancialSnapshot,
  PortfolioStressResult,
  StressCompanyImpact,
} from './holdingTypes';

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
// Stress Scenarios (predefinidos)
// --------------------------------------------

interface StressScenario {
  name: string;
  description: string;
  /** Fator multiplicador da receita (0.8 = -20%) */
  revenue_factor: number;
  /** Fator multiplicador dos custos variáveis (1.1 = +10%) */
  variable_cost_factor: number;
  /** Fator multiplicador dos custos fixos (1.0 = sem mudança) */
  fixed_cost_factor: number;
  /** Fator multiplicador do SG&A (1.0 = sem mudança) */
  sga_factor: number;
  /** Penalidade direta no score (pontos) */
  score_penalty: number;
}

const STRESS_SCENARIOS: StressScenario[] = [
  {
    name: 'Recessão Leve',
    description: 'Queda moderada na receita (-15%) com aumento leve de custos (+5%)',
    revenue_factor: 0.85,
    variable_cost_factor: 1.05,
    fixed_cost_factor: 1.0,
    sga_factor: 1.02,
    score_penalty: 5,
  },
  {
    name: 'Recessão Severa',
    description: 'Queda acentuada na receita (-30%) com aumento de custos (+10%) e SG&A (+8%)',
    revenue_factor: 0.70,
    variable_cost_factor: 1.10,
    fixed_cost_factor: 1.05,
    sga_factor: 1.08,
    score_penalty: 12,
  },
  {
    name: 'Perda de Unidade',
    description: 'Simulação de perda da maior unidade do portfólio (receita zerada)',
    revenue_factor: 0, // Tratamento especial: aplica só na maior empresa
    variable_cost_factor: 1.0,
    fixed_cost_factor: 1.0,
    sga_factor: 1.0,
    score_penalty: 15,
  },
  {
    name: 'Aumento de Juros',
    description: 'Juros sobem — custos fixos +15%, SG&A +10%, receita -5%',
    revenue_factor: 0.95,
    variable_cost_factor: 1.0,
    fixed_cost_factor: 1.15,
    sga_factor: 1.10,
    score_penalty: 8,
  },
  {
    name: 'Queda de Receita 20%',
    description: 'Receita cai 20% uniformemente, custos mantidos',
    revenue_factor: 0.80,
    variable_cost_factor: 1.0,
    fixed_cost_factor: 1.0,
    sga_factor: 1.0,
    score_penalty: 7,
  },
];

// --------------------------------------------
// Core: Apply Stress to a Company
// --------------------------------------------

/**
 * Aplica um cenário de estresse a uma empresa individual.
 * Retorna o EBITDA estressado e o impacto.
 *
 * Cálculo do EBITDA estressado:
 * - Receita × revenue_factor
 * - Custos variáveis × variable_cost_factor (são negativos no modelo)
 * - Custos fixos × fixed_cost_factor (são negativos no modelo)
 * - SG&A × sga_factor (são negativos no modelo)
 * - Rateio mantido (não afetado por estresse)
 *
 * EBITDA = receita_estressada + custos_var_estressados + custos_fix_estressados + sga_estressado + rateio
 * (custos são negativos no DB, então a soma é correta)
 */
function stressCompany(
  c: CompanyFinancialSnapshot,
  scenario: StressScenario,
  isLargestUnit: boolean,
): StressCompanyImpact {
  // Cenário especial: "Perda de Unidade" zera receita apenas da maior
  const revFactor = scenario.name === 'Perda de Unidade'
    ? (isLargestUnit ? 0 : 1.0)
    : scenario.revenue_factor;

  const costVarFactor = scenario.name === 'Perda de Unidade'
    ? (isLargestUnit ? 0 : 1.0) // Se unidade perdida, custos variáveis também zeram
    : scenario.variable_cost_factor;

  const stressedReceita = c.receita_real * revFactor;
  const stressedCustosVar = c.custos_variaveis_real * costVarFactor;
  const stressedCustosFix = c.custos_fixos_real * scenario.fixed_cost_factor;
  const stressedSga = c.sga_real * scenario.sga_factor;

  // EBITDA estressado (custos são negativos no modelo)
  const stressedEbitda = round2(
    stressedReceita + stressedCustosVar + stressedCustosFix + stressedSga + c.rateio_real,
  );

  const originalEbitda = c.ebitda;
  const deltaPct = originalEbitda !== 0
    ? round2(((stressedEbitda - originalEbitda) / Math.abs(originalEbitda)) * 100)
    : stressedEbitda < 0 ? -100 : 0;

  return {
    organization_id: c.organization_id,
    display_name: c.display_name,
    original_ebitda: originalEbitda,
    stressed_ebitda: stressedEbitda,
    delta_pct: deltaPct,
    survives: stressedEbitda > 0,
  };
}

// --------------------------------------------
// Core: Calculate Stressed Portfolio Score
// --------------------------------------------

/**
 * Calcula o score do portfólio após estresse.
 * Score estressado = score ponderado atual - penalidade do cenário
 * + ajuste por empresas que não sobrevivem (-5 por cada).
 */
function calculateStressedScore(
  companies: CompanyFinancialSnapshot[],
  impacts: StressCompanyImpact[],
  scenarioPenalty: number,
): number {
  const totalWeight = companies.reduce((s, c) => s + c.portfolio_weight, 0) || 1;

  let weightedScore = 0;
  for (const c of companies) {
    weightedScore += c.health_score * (c.portfolio_weight / totalWeight);
  }

  // Penalidade adicional por empresas que não sobrevivem
  const nonSurvivors = impacts.filter((i) => !i.survives).length;
  const survivorPenalty = nonSurvivors * 5;

  return clamp(Math.round(weightedScore - scenarioPenalty - survivorPenalty), 0, 100);
}

// --------------------------------------------
// Main: Run All Stress Tests
// --------------------------------------------

/**
 * Executa todos os cenários de stress test predefinidos no portfólio.
 *
 * Para cada cenário:
 * 1. Aplica fatores de estresse em cada empresa
 * 2. Calcula EBITDA consolidado estressado
 * 3. Calcula score do portfólio estressado
 * 4. Identifica empresa mais vulnerável
 * 5. Verifica sobrevivência do portfólio
 *
 * Função PURA — zero I/O, zero side effects.
 *
 * @param companies - Array de snapshots financeiros (read-only)
 * @returns Array de resultados de stress test, um por cenário
 */
export function runPortfolioStressTests(
  companies: CompanyFinancialSnapshot[],
): PortfolioStressResult[] {
  if (companies.length === 0) {
    return STRESS_SCENARIOS.map((s) => ({
      scenario_name: s.name,
      scenario_description: s.description,
      stressed_ebitda: 0,
      ebitda_delta_pct: 0,
      stressed_portfolio_score: 0,
      company_impacts: [],
      most_vulnerable: '—',
      portfolio_survives: false,
    }));
  }

  // Identificar a maior empresa por receita (para cenário "Perda de Unidade")
  const largestOrg = companies.reduce((best, c) =>
    Math.abs(c.receita_real) > Math.abs(best.receita_real) ? c : best,
  );

  // EBITDA base do portfólio
  const baseEbitda = companies.reduce((s, c) => s + c.ebitda, 0);

  return STRESS_SCENARIOS.map((scenario) => {
    // 1. Aplicar estresse em cada empresa
    const impacts = companies.map((c) =>
      stressCompany(c, scenario, c.organization_id === largestOrg.organization_id),
    );

    // 2. EBITDA consolidado estressado
    const stressedEbitda = round2(impacts.reduce((s, i) => s + i.stressed_ebitda, 0));

    // 3. Delta vs base
    const ebitdaDeltaPct = baseEbitda !== 0
      ? round2(((stressedEbitda - baseEbitda) / Math.abs(baseEbitda)) * 100)
      : stressedEbitda < 0 ? -100 : 0;

    // 4. Score estressado do portfólio
    const stressedScore = calculateStressedScore(companies, impacts, scenario.score_penalty);

    // 5. Empresa mais vulnerável (maior queda percentual de EBITDA)
    const mostVulnerable = impacts.reduce((worst, i) =>
      i.delta_pct < worst.delta_pct ? i : worst,
    );

    // 6. Portfólio sobrevive?
    const survives = stressedEbitda > 0;

    return {
      scenario_name: scenario.name,
      scenario_description: scenario.description,
      stressed_ebitda: stressedEbitda,
      ebitda_delta_pct: ebitdaDeltaPct,
      stressed_portfolio_score: stressedScore,
      company_impacts: impacts,
      most_vulnerable: mostVulnerable.display_name,
      portfolio_survives: survives,
    };
  });
}

/**
 * Executa um stress test customizado com parâmetros definidos pelo usuário.
 *
 * @param companies - Array de snapshots financeiros (read-only)
 * @param params - Parâmetros customizados do cenário
 */
export function runCustomStressTest(
  companies: CompanyFinancialSnapshot[],
  params: {
    name: string;
    description: string;
    revenue_change_pct: number;    // -20 = queda de 20%
    cost_change_pct: number;       // +10 = aumento de 10%
    fixed_cost_change_pct: number; // +15 = aumento de 15%
    sga_change_pct: number;        // +10 = aumento de 10%
    score_penalty: number;         // pontos a subtrair do score
  },
): PortfolioStressResult {
  if (companies.length === 0) {
    return {
      scenario_name: params.name,
      scenario_description: params.description,
      stressed_ebitda: 0,
      ebitda_delta_pct: 0,
      stressed_portfolio_score: 0,
      company_impacts: [],
      most_vulnerable: '—',
      portfolio_survives: false,
    };
  }

  const scenario: StressScenario = {
    name: params.name,
    description: params.description,
    revenue_factor: 1 + params.revenue_change_pct / 100,
    variable_cost_factor: 1 + params.cost_change_pct / 100,
    fixed_cost_factor: 1 + params.fixed_cost_change_pct / 100,
    sga_factor: 1 + params.sga_change_pct / 100,
    score_penalty: params.score_penalty,
  };

  const baseEbitda = companies.reduce((s, c) => s + c.ebitda, 0);

  // Nenhuma empresa é "a maior" em cenário customizado (sem perda de unidade)
  const impacts = companies.map((c) => stressCompany(c, scenario, false));

  const stressedEbitda = round2(impacts.reduce((s, i) => s + i.stressed_ebitda, 0));

  const ebitdaDeltaPct = baseEbitda !== 0
    ? round2(((stressedEbitda - baseEbitda) / Math.abs(baseEbitda)) * 100)
    : stressedEbitda < 0 ? -100 : 0;

  const stressedScore = calculateStressedScore(companies, impacts, scenario.score_penalty);

  const mostVulnerable = impacts.reduce((worst, i) =>
    i.delta_pct < worst.delta_pct ? i : worst,
  );

  return {
    scenario_name: params.name,
    scenario_description: params.description,
    stressed_ebitda: stressedEbitda,
    ebitda_delta_pct: ebitdaDeltaPct,
    stressed_portfolio_score: stressedScore,
    company_impacts: impacts,
    most_vulnerable: mostVulnerable.display_name,
    portfolio_survives: stressedEbitda > 0,
  };
}

/**
 * Retorna os nomes dos cenários de stress test predefinidos.
 * Útil para UI dropdown.
 */
export function getStressScenarioNames(): string[] {
  return STRESS_SCENARIOS.map((s) => s.name);
}

/**
 * Retorna resumo executivo dos stress tests.
 * Identifica cenários onde o portfólio não sobrevive.
 */
export function buildStressTestSummary(results: PortfolioStressResult[]): string {
  if (results.length === 0) return 'Nenhum cenário de estresse executado.';

  const survivors = results.filter((r) => r.portfolio_survives);
  const failures = results.filter((r) => !r.portfolio_survives);

  const parts: string[] = [];

  parts.push(`${results.length} cenários testados`);
  parts.push(`${survivors.length} sobrevividos`);

  if (failures.length > 0) {
    const failNames = failures.map((f) => f.scenario_name).join(', ');
    parts.push(`${failures.length} com EBITDA negativo (${failNames})`);
  }

  // Pior cenário
  const worst = results.reduce((w, r) => r.ebitda_delta_pct < w.ebitda_delta_pct ? r : w);
  parts.push(`Pior cenário: ${worst.scenario_name} (${worst.ebitda_delta_pct > 0 ? '+' : ''}${worst.ebitda_delta_pct.toFixed(1)}% EBITDA)`);

  return parts.join('. ') + '.';
}
