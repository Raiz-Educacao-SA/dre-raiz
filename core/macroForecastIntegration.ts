// ============================================
// Macro Forecast Integration
// Funções puras — zero side effects, zero I/O
// Integra indicadores macro no forecast SEM alterar forecastModel original
// ============================================

import type {
  ForecastResult,
  Projection3,
  TimeSeriesPoint,
} from './decisionTypes';
import type { MacroSnapshot, MacroAssumptions } from './macroTypes';
import { DEFAULT_MACRO_ASSUMPTIONS } from './macroTypes';
import { computeForecast, clampScore } from './forecastModel';

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Baseline para calcular desvios
const BASELINE_GDP = 2.0;
const BASELINE_INFLATION = 4.5;
const BASELINE_SECTOR = 5.0;

// --------------------------------------------
// Macro Adjustment Factors
// --------------------------------------------

/**
 * Calcula fator de ajuste de crescimento baseado no macro.
 *
 * Lógica:
 * - PIB acima do potencial → projeção de receita/EBITDA sobe
 * - Inflação alta → projeção de custos sobe (margem cai)
 * - Setor em crescimento → projeção de receita sobe mais
 *
 * Retorna multiplicadores para score, margin e ebitda.
 * Multiplicador de 1.0 = sem ajuste.
 */
function calculateMacroMultipliers(
  macro: MacroSnapshot,
  assumptions: MacroAssumptions,
): { score_mult: number; margin_mult: number; ebitda_mult: number } {
  // Efeito PIB + setor na receita/ebitda
  const gdpDelta = macro.gdp_growth - BASELINE_GDP;
  const sectorDelta = macro.sector_growth - BASELINE_SECTOR;
  const growthEffect = (gdpDelta * 0.4 + sectorDelta * 0.6) * assumptions.revenue_elasticity;

  // Efeito inflação nos custos (reduz margem)
  const inflationDelta = macro.inflation - BASELINE_INFLATION;
  const costPressure = inflationDelta * assumptions.cost_elasticity;

  // Score: crescimento melhora, inflação piora
  const scoreAdj = (growthEffect * 0.5 - costPressure * 0.3) / 100;
  const score_mult = round2(1 + scoreAdj);

  // Margem: inflação pressiona custos
  const marginAdj = (-costPressure * 0.8 + growthEffect * 0.2) / 100;
  const margin_mult = round2(1 + marginAdj);

  // EBITDA: combinação de crescimento e pressão de custo
  const ebitdaAdj = (growthEffect - costPressure * 0.5) / 100;
  const ebitda_mult = round2(1 + ebitdaAdj);

  return { score_mult, margin_mult, ebitda_mult };
}

/**
 * Aplica multiplicadores numa projeção de 3 pontos.
 * O efeito é crescente: p1 recebe 33%, p2 recebe 66%, p3 recebe 100%.
 * Isso garante transição gradual, não salto abrupto.
 */
function applyGradualMultiplier(
  proj: Projection3,
  multiplier: number,
): Projection3 {
  // Desvio do multiplicador em relação a 1.0
  const deviation = multiplier - 1;
  return [
    round2(proj[0] * (1 + deviation * 0.33)),
    round2(proj[1] * (1 + deviation * 0.66)),
    round2(proj[2] * (1 + deviation * 1.0)),
  ];
}

// --------------------------------------------
// Risk Assessment com Macro
// --------------------------------------------

/**
 * Avaliação de risco do forecast considerando macro.
 * Complementa o assessRiskTrend original sem substituí-lo.
 */
function assessMacroForecastRisk(
  projectedScore3: number,
  scoreSlope: number,
  macro: MacroSnapshot,
): string {
  const parts: string[] = [];

  // Risk assessment base
  if (projectedScore3 < 70) {
    parts.push('Alta probabilidade de deterioração');
  } else if (scoreSlope < 0) {
    parts.push('Tendência negativa moderada');
  } else {
    parts.push('Estável ou crescente');
  }

  // Macro overlay
  if (macro.gdp_growth < 0) {
    parts.push('— PIB em contração amplifica riscos');
  } else if (macro.inflation > 8) {
    parts.push('— Pressão inflacionária pode comprometer margem');
  } else if (macro.gdp_growth > 3 && macro.inflation < 5) {
    parts.push('— Ambiente macro favorável sustenta projeção');
  }

  if (macro.has_projections) {
    parts.push('(baseado em projeções macro)');
  }

  return parts.join(' ');
}

// --------------------------------------------
// Main: Compute Forecast with Macro
// --------------------------------------------

/**
 * Executa forecast ajustado por indicadores macroeconômicos.
 *
 * Processo:
 * 1. Executa forecast base (computeForecast original — sem alterar)
 * 2. Calcula multiplicadores macro
 * 3. Aplica multiplicadores GRADUALMENTE nas projeções
 * 4. Re-avalia risco considerando macro
 *
 * Macro NÃO sobrepõe dados internos:
 * - O forecast base usa a série temporal real da empresa
 * - Macro só AJUSTA as projeções futuras (não muda dados históricos)
 * - Ajuste é gradual: 33% → 66% → 100% nos 3 pontos projetados
 *
 * Se macro for null, retorna forecast base inalterado.
 */
export function computeForecastWithMacro(
  series: TimeSeriesPoint[],
  macro: MacroSnapshot | null,
  assumptions?: MacroAssumptions,
): ForecastResult & { macro_adjusted: boolean; macro_multipliers?: { score: number; margin: number; ebitda: number } } {
  // 1. Forecast base (função original, inalterada)
  const baseForecast = computeForecast(series);

  // Se macro não disponível, retorna base
  if (!macro) {
    return { ...baseForecast, macro_adjusted: false };
  }

  const macroAssumptions = assumptions ?? DEFAULT_MACRO_ASSUMPTIONS;

  // 2. Calcular multiplicadores
  const multipliers = calculateMacroMultipliers(macro, macroAssumptions);

  // 3. Aplicar gradualmente nas projeções
  const adjustedScore = clampScore(
    applyGradualMultiplier(baseForecast.forecast.score, multipliers.score_mult),
  );
  const adjustedMargin = applyGradualMultiplier(
    baseForecast.forecast.margin,
    multipliers.margin_mult,
  );
  const adjustedEbitda = applyGradualMultiplier(
    baseForecast.forecast.ebitda,
    multipliers.ebitda_mult,
  );

  // 4. Recalcular slopes com valores ajustados
  const lastScore = series.length > 0 ? series[series.length - 1].score : adjustedScore[0];
  const lastMargin = series.length > 0 ? series[series.length - 1].margin : adjustedMargin[0];
  const lastEbitda = series.length > 0 ? series[series.length - 1].ebitda : adjustedEbitda[0];

  const slope = {
    score: round2((adjustedScore[2] - lastScore) / 3),
    margin: round2((adjustedMargin[2] - lastMargin) / 3),
    ebitda: round2((adjustedEbitda[2] - lastEbitda) / 3),
  };

  // 5. Risk assessment com macro
  const riskAssessment = assessMacroForecastRisk(
    adjustedScore[2],
    slope.score,
    macro,
  );

  return {
    forecast: {
      score: adjustedScore,
      margin: adjustedMargin,
      ebitda: adjustedEbitda,
    },
    slope,
    risk_assessment: riskAssessment,
    macro_adjusted: true,
    macro_multipliers: {
      score: multipliers.score_mult,
      margin: multipliers.margin_mult,
      ebitda: multipliers.ebitda_mult,
    },
  };
}
