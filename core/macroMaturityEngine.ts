// ============================================
// Macro Maturity Engine — Macro Intelligence Layer
// Funções puras — zero side effects, zero I/O
// Avalia maturidade da organização frente ao ambiente macro
// ============================================

import type { FinancialInputs } from './decisionTypes';
import type {
  MacroSnapshot,
  MacroAssumptions,
  MacroImpactResult,
  MacroRiskIndex,
  MacroMaturityReport,
  MacroMaturityLevel,
  MacroMaturityDimension,
} from './macroTypes';
import { DEFAULT_MACRO_ASSUMPTIONS } from './macroTypes';
import { applyMacroImpact, calculateMacroRiskIndex } from './macroImpactEngine';

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
// Stress Test Scenarios (for shock absorption)
// --------------------------------------------

/** Cenários de estresse para testar absorção de choques */
const STRESS_SCENARIOS: { label: string; snapshot: MacroSnapshot }[] = [
  {
    label: 'Choque inflacionário',
    snapshot: {
      inflation: 10,
      interest_rate: 14,
      gdp_growth: 1,
      unemployment: 10,
      sector_growth: 2,
      period: 'stress',
      has_projections: true,
    },
  },
  {
    label: 'Recessão severa',
    snapshot: {
      inflation: 3,
      interest_rate: 8,
      gdp_growth: -2,
      unemployment: 14,
      sector_growth: -3,
      period: 'stress',
      has_projections: true,
    },
  },
  {
    label: 'Estagflação',
    snapshot: {
      inflation: 12,
      interest_rate: 15,
      gdp_growth: -1,
      unemployment: 13,
      sector_growth: -2,
      period: 'stress',
      has_projections: true,
    },
  },
];

// --------------------------------------------
// Dimension Evaluators
// --------------------------------------------

/**
 * D1: Margem de Segurança — quanto a margem atual resiste a choques.
 * Empresas com margem alta absorvem melhor pressões de custo.
 * Score 0-20.
 */
function evaluateMarginSafety(financials: FinancialInputs): MacroMaturityDimension {
  const receita = Math.abs(financials.receita_real);
  const marginAbs = financials.receita_real + financials.custos_variaveis_real;
  const marginPct = receita > 0 ? (marginAbs / receita) * 100 : 0;

  let score: number;
  if (marginPct >= 50) score = 20;
  else if (marginPct >= 40) score = 16;
  else if (marginPct >= 30) score = 12;
  else if (marginPct >= 20) score = 8;
  else if (marginPct >= 10) score = 4;
  else score = 1;

  return {
    name: 'Margem de Segurança',
    score,
    max_score: 20,
    description: `Margem de contribuição de ${marginPct.toFixed(1)}% — ${
      score >= 16 ? 'alta resiliência a choques de custo' :
      score >= 12 ? 'resiliência moderada' :
      score >= 8 ? 'margem vulnerável a pressões' :
      'margem crítica — qualquer choque compromete resultado'
    }`,
  };
}

/**
 * D2: Diversificação de Receita — quanto a empresa depende de poucos fatores.
 * Medido pela distância entre receita real e orçada (volatilidade).
 * Score 0-20.
 */
function evaluateRevenueDiversification(financials: FinancialInputs): MacroMaturityDimension {
  const receita = Math.abs(financials.receita_real);
  const orcado = Math.abs(financials.receita_orcado);
  const gap = orcado > 0 ? Math.abs((receita - orcado) / orcado) * 100 : 50;

  let score: number;
  if (gap <= 3) score = 20;
  else if (gap <= 5) score = 16;
  else if (gap <= 10) score = 12;
  else if (gap <= 15) score = 8;
  else if (gap <= 25) score = 4;
  else score = 1;

  return {
    name: 'Previsibilidade de Receita',
    score,
    max_score: 20,
    description: `Gap real vs orçado de ${gap.toFixed(1)}% — ${
      score >= 16 ? 'alta previsibilidade, baixa volatilidade' :
      score >= 12 ? 'previsibilidade razoável' :
      score >= 8 ? 'volatilidade moderada na receita' :
      'alta volatilidade — receita muito distante do orçado'
    }`,
  };
}

/**
 * D3: Eficiência Operacional — capacidade de operar com custos controlados.
 * Score 0-20.
 */
function evaluateOperationalEfficiency(financials: FinancialInputs): MacroMaturityDimension {
  const ebitda = financials.receita_real + financials.custos_variaveis_real +
    financials.custos_fixos_real + financials.sga_real + financials.rateio_real;
  const receita = Math.abs(financials.receita_real);
  const ebitdaPct = receita > 0 ? (ebitda / receita) * 100 : 0;

  let score: number;
  if (ebitdaPct >= 25) score = 20;
  else if (ebitdaPct >= 15) score = 16;
  else if (ebitdaPct >= 10) score = 12;
  else if (ebitdaPct >= 5) score = 8;
  else if (ebitdaPct >= 0) score = 4;
  else score = 1;

  return {
    name: 'Eficiência Operacional',
    score,
    max_score: 20,
    description: `Margem EBITDA de ${ebitdaPct.toFixed(1)}% — ${
      score >= 16 ? 'operação eficiente com folga para investir' :
      score >= 12 ? 'eficiência adequada' :
      score >= 8 ? 'margem operacional apertada' :
      'operação deficitária ou próxima do breakeven'
    }`,
  };
}

/**
 * D4: Absorção de Choques — simula cenários extremos e mede deterioração.
 * Quanto menor a variação sob estresse, maior a resiliência.
 * Score 0-20.
 */
function evaluateShockAbsorption(
  financials: FinancialInputs,
  assumptions: MacroAssumptions,
): MacroMaturityDimension {
  const baseEbitda = financials.receita_real + financials.custos_variaveis_real +
    financials.custos_fixos_real + financials.sga_real + financials.rateio_real;
  const absBase = Math.abs(baseEbitda) || 1;

  // Simular cada cenário de estresse e medir degradação do EBITDA
  const degradations: number[] = [];
  for (const scenario of STRESS_SCENARIOS) {
    const impact = applyMacroImpact(financials, scenario.snapshot, assumptions);
    const delta = Math.abs(impact.ebitda_delta_pct);
    degradations.push(delta);
  }

  // Média de degradação sob estresse
  const avgDegradation = degradations.reduce((s, v) => s + v, 0) / degradations.length;

  let score: number;
  if (avgDegradation <= 3) score = 20;
  else if (avgDegradation <= 5) score = 16;
  else if (avgDegradation <= 10) score = 12;
  else if (avgDegradation <= 15) score = 8;
  else if (avgDegradation <= 25) score = 4;
  else score = 1;

  return {
    name: 'Absorção de Choques',
    score,
    max_score: 20,
    description: `Degradação média de EBITDA de ${avgDegradation.toFixed(1)}% sob cenários extremos — ${
      score >= 16 ? 'alta resiliência a choques externos' :
      score >= 12 ? 'resiliência moderada' :
      score >= 8 ? 'vulnerabilidade significativa a choques' :
      'exposição crítica — choques macro podem ser devastadores'
    }`,
  };
}

/**
 * D5: Sensibilidade Estratégica — quão calibradas estão as premissas.
 * Premissas próximas do default indicam menor customização.
 * Score 0-20.
 */
function evaluateStrategicSensitivity(
  assumptions: MacroAssumptions,
  hasCustomAssumptions: boolean,
): MacroMaturityDimension {
  if (!hasCustomAssumptions) {
    return {
      name: 'Calibração de Premissas',
      score: 4,
      max_score: 20,
      description: 'Usando premissas default — sem calibração específica para a organização',
    };
  }

  // Medir divergência das premissas em relação ao default
  const diffs = [
    Math.abs(assumptions.inflation_sensitivity - DEFAULT_MACRO_ASSUMPTIONS.inflation_sensitivity),
    Math.abs(assumptions.revenue_elasticity - DEFAULT_MACRO_ASSUMPTIONS.revenue_elasticity),
    Math.abs(assumptions.cost_elasticity - DEFAULT_MACRO_ASSUMPTIONS.cost_elasticity),
    Math.abs(assumptions.interest_sensitivity - DEFAULT_MACRO_ASSUMPTIONS.interest_sensitivity),
    Math.abs(assumptions.unemployment_sensitivity - DEFAULT_MACRO_ASSUMPTIONS.unemployment_sensitivity),
  ];
  const totalDiff = diffs.reduce((s, v) => s + v, 0);

  // Customização moderada é bom (mostra que calibraram),
  // mas extrema pode indicar erro
  let score: number;
  if (totalDiff >= 0.1 && totalDiff <= 1.5) score = 20; // Bem calibrado
  else if (totalDiff > 1.5 && totalDiff <= 3) score = 14; // Muito customizado
  else if (totalDiff > 0 && totalDiff < 0.1) score = 10; // Quase default
  else score = 6; // Extremo

  return {
    name: 'Calibração de Premissas',
    score,
    max_score: 20,
    description: `Premissas customizadas (divergência: ${totalDiff.toFixed(2)}) — ${
      score >= 18 ? 'calibração cuidadosa e específica' :
      score >= 14 ? 'customização significativa, verificar coerência' :
      score >= 10 ? 'customização mínima, considerar refinar' :
      'premissas com desvio alto, revisar calibração'
    }`,
  };
}

// --------------------------------------------
// Maturity Level Classification
// --------------------------------------------

function classifyMaturity(totalScore: number): { level: MacroMaturityLevel; label: string } {
  // totalScore é de 0-100 (5 dimensões × 20 cada)
  if (totalScore >= 85) return { level: 5, label: 'Excelência Estratégica' };
  if (totalScore >= 70) return { level: 4, label: 'Gestão Avançada' };
  if (totalScore >= 50) return { level: 3, label: 'Consciência Macro' };
  if (totalScore >= 30) return { level: 2, label: 'Reatividade Inicial' };
  return { level: 1, label: 'Exposição Passiva' };
}

function buildNextLeap(level: MacroMaturityLevel): string {
  switch (level) {
    case 1:
      return 'Estabelecer monitoramento básico de indicadores macro (inflação, PIB, SELIC) e definir premissas de sensibilidade.';
    case 2:
      return 'Calibrar premissas com dados históricos da empresa e implementar simulações de cenários macro regularmente.';
    case 3:
      return 'Integrar dados macro nas decisões de orçamento e pricing. Simular impactos antes de aprovar investimentos.';
    case 4:
      return 'Automatizar alertas macro e implementar hedge strategies. Diversificar receitas para reduzir sensibilidade setorial.';
    case 5:
      return 'Manter excelência: revisar premissas trimestralmente, testar cenários extremos, benchmarking contínuo.';
  }
}

function buildRecommendedActions(
  dimensions: MacroMaturityDimension[],
  level: MacroMaturityLevel,
): string[] {
  const actions: string[] = [];

  // Identificar dimensões fracas (score < 50% do max)
  for (const dim of dimensions) {
    if (dim.score < dim.max_score * 0.5) {
      switch (dim.name) {
        case 'Margem de Segurança':
          actions.push('Aumentar margem de contribuição via revisão de pricing ou redução de custos variáveis');
          break;
        case 'Previsibilidade de Receita':
          actions.push('Reduzir gap real vs orçado via forecast mais granular e acompanhamento mensal de pipeline');
          break;
        case 'Eficiência Operacional':
          actions.push('Implementar programa de eficiência operacional: revisão de custos fixos e SG&A');
          break;
        case 'Absorção de Choques':
          actions.push('Construir reservas estratégicas e diversificar fontes de receita para reduzir exposição');
          break;
        case 'Calibração de Premissas':
          actions.push('Customizar premissas macro com base em dados históricos da organização');
          break;
      }
    }
  }

  // Ações genéricas por nível
  if (level <= 2) {
    actions.push('Inserir indicadores macro atualizados no sistema (inflação, SELIC, PIB, desemprego)');
  }
  if (level <= 3) {
    actions.push('Executar simulações de cenários macro trimestralmente antes de revisar o orçamento');
  }

  return actions;
}

// --------------------------------------------
// Main: Generate Macro Maturity Report
// --------------------------------------------

/**
 * Gera relatório de maturidade macro da organização.
 *
 * Avalia 5 dimensões (0-20 cada, total 0-100):
 * 1. Margem de Segurança — resiliência da margem
 * 2. Previsibilidade de Receita — volatilidade real vs orçado
 * 3. Eficiência Operacional — margem EBITDA
 * 4. Absorção de Choques — degradação sob cenários extremos
 * 5. Calibração de Premissas — qualidade das premissas macro
 *
 * Função PURA — zero I/O, zero side effects.
 *
 * @param financials - Financials atuais (read-only)
 * @param assumptions - Premissas macro configuradas
 * @param hasCustomAssumptions - Se a org customizou as premissas
 */
export function generateMacroMaturityReport(
  financials: FinancialInputs,
  assumptions: MacroAssumptions = DEFAULT_MACRO_ASSUMPTIONS,
  hasCustomAssumptions: boolean = false,
): MacroMaturityReport {
  // 1. Avaliar cada dimensão
  const d1 = evaluateMarginSafety(financials);
  const d2 = evaluateRevenueDiversification(financials);
  const d3 = evaluateOperationalEfficiency(financials);
  const d4 = evaluateShockAbsorption(financials, assumptions);
  const d5 = evaluateStrategicSensitivity(assumptions, hasCustomAssumptions);

  const dimensions = [d1, d2, d3, d4, d5];
  const totalScore = dimensions.reduce((s, d) => s + d.score, 0);

  // 2. Classificar nível de maturidade
  const { level, label } = classifyMaturity(totalScore);

  // 3. Calcular métricas agregadas
  const externalSensitivity = round2(
    100 - ((d4.score / d4.max_score) * 50 + (d1.score / d1.max_score) * 50) * 100 / 100,
  );
  const strategicRobustness = round2(
    ((d3.score / d3.max_score) * 40 + (d1.score / d1.max_score) * 30 + (d5.score / d5.max_score) * 30) * 100 / 100,
  );
  const shockAbsorption = round2(
    ((d4.score / d4.max_score) * 60 + (d1.score / d1.max_score) * 40) * 100 / 100,
  );

  // 4. Gerar próximo salto e ações
  const nextLeap = buildNextLeap(level);
  const recommendedActions = buildRecommendedActions(dimensions, level);

  return {
    maturity_level: level,
    maturity_label: label,
    external_sensitivity: externalSensitivity,
    strategic_robustness: strategicRobustness,
    shock_absorption: shockAbsorption,
    dimensions,
    next_leap: nextLeap,
    recommended_actions: recommendedActions,
  };
}
