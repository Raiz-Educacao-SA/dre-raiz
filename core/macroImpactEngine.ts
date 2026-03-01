// ============================================
// Macro Impact Engine — Macro Intelligence Layer
// Funções puras — zero side effects, zero I/O
// Aplica indicadores macroeconômicos nos financials
// ============================================

import type { FinancialInputs } from './decisionTypes';
import type {
  MacroSnapshot,
  MacroAssumptions,
  MacroImpactResult,
  MacroAdjustment,
  MacroIndicatorType,
  MacroRiskIndex,
  MacroEnvironment,
} from './macroTypes';
import { DEFAULT_MACRO_ASSUMPTIONS } from './macroTypes';

// --------------------------------------------
// Helpers
// --------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeDiv(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return num / den;
}

// --------------------------------------------
// Referência: valores neutros (baseline)
// Desvios em relação a esses valores geram impacto
// --------------------------------------------

/** Indicadores neutros — sem impacto quando iguais */
const BASELINE: Record<MacroIndicatorType, number> = {
  inflation: 4.5,       // Meta IPCA do BCB
  interest_rate: 10.0,  // SELIC neutra (estimativa)
  gdp: 2.0,             // Crescimento potencial do Brasil
  unemployment: 8.0,    // Taxa natural de desemprego (NAIRU estimada)
  sector_growth: 5.0,   // Crescimento médio setor educacional
};

// --------------------------------------------
// Cálculos de Impacto Individual
// --------------------------------------------

/**
 * Calcula impacto da inflação nos custos.
 *
 * Lógica: inflação acima da meta pressiona custos.
 * - Inflação 4.5% (meta) → 0% de ajuste
 * - Inflação 8% (3.5pp acima) com cost_elasticity 0.8 → +2.8% nos custos
 * - Inflação 2% (2.5pp abaixo) com cost_elasticity 0.8 → -2.0% nos custos
 *
 * Custos são negativos no modelo DRE:
 * - adjustment_pct positivo = custos ficam MAIS negativos (mais custo)
 * - adjustment_pct negativo = custos ficam MENOS negativos (economia)
 */
function calculateInflationImpact(
  inflation: number,
  assumptions: MacroAssumptions,
): { cv_pct: number; cf_pct: number; sga_pct: number } {
  const delta = inflation - BASELINE.inflation;

  // CV: mais sensível (matéria-prima, insumos)
  const cv_pct = round2(delta * assumptions.cost_elasticity);

  // CF: menos sensível (contratos mais rígidos) — 60% da elasticidade
  const cf_pct = round2(delta * assumptions.cost_elasticity * 0.6);

  // SGA: sensibilidade intermediária — 50% da elasticidade
  const sga_pct = round2(delta * assumptions.inflation_sensitivity * 0.5);

  return { cv_pct, cf_pct, sga_pct };
}

/**
 * Calcula impacto do PIB na receita.
 *
 * Lógica: PIB acima do potencial estimula receita.
 * - PIB 2% (potencial) → 0% ajuste
 * - PIB 4% (+2pp) com revenue_elasticity 0.5 → +1% na receita
 * - PIB -1% (-3pp) com revenue_elasticity 0.5 → -1.5% na receita
 */
function calculateGDPImpact(
  gdp: number,
  sectorGrowth: number,
  assumptions: MacroAssumptions,
): number {
  const gdpDelta = gdp - BASELINE.gdp;
  const sectorDelta = sectorGrowth - BASELINE.sector_growth;

  // Média ponderada: 40% PIB geral + 60% setor específico
  const compositeDelta = gdpDelta * 0.4 + sectorDelta * 0.6;

  return round2(compositeDelta * assumptions.revenue_elasticity);
}

/**
 * Calcula taxa de inadimplência estimada.
 *
 * Lógica: desemprego alto → mais inadimplência.
 * Base: 3% de inadimplência quando desemprego = NAIRU (8%)
 * Cada 1pp acima → +0.4pp de inadimplência (com sensitivity)
 */
function calculateDefaultRate(
  unemployment: number,
  assumptions: MacroAssumptions,
): number {
  const baseRate = 3.0; // Taxa base de inadimplência (%)
  const delta = unemployment - BASELINE.unemployment;
  const addition = delta * assumptions.unemployment_sensitivity;
  return round2(clamp(baseRate + addition, 0, 25));
}

/**
 * Calcula adder de risco por juros.
 *
 * Lógica: juros altos → mais risco financeiro.
 * Cada 1pp acima da SELIC neutra → + risk_adder
 * Máximo: 15 pontos de risco adicional
 */
function calculateInterestRiskAdder(
  interestRate: number,
  assumptions: MacroAssumptions,
): number {
  const delta = interestRate - BASELINE.interest_rate;
  const adder = delta * assumptions.interest_sensitivity * 2;
  return round2(clamp(adder, -5, 15));
}

// --------------------------------------------
// Main: Apply Macro Impact
// --------------------------------------------

/**
 * Aplica impacto macroeconômico nos financials.
 *
 * Função PURA — não muta inputs, não faz I/O.
 *
 * Regras de impacto:
 * 1. Inflação ↑ → custos variáveis ↑ (elasticidade)
 * 2. Inflação ↑ → custos fixos ↑ (menos elástico)
 * 3. PIB ↑ → receita projetada ↑ (elasticidade)
 * 4. Setor ↑ → receita ↑ (peso maior que PIB geral)
 * 5. Juros ↑ → risco ↑ (adder de risco)
 * 6. Desemprego ↑ → inadimplência ↑ (reduz receita efetiva)
 *
 * Todos os ajustes são GRADUAIS — sem saltos abruptos.
 * Cada ajuste é proporcional ao desvio do baseline.
 *
 * @param financials - Financials atuais (read-only)
 * @param macro - Snapshot dos indicadores macroeconômicos
 * @param assumptions - Premissas de sensibilidade (opcional, usa default)
 * @returns Projeção ajustada + detalhamento dos ajustes
 */
export function applyMacroImpact(
  financials: FinancialInputs,
  macro: MacroSnapshot,
  assumptions: MacroAssumptions = DEFAULT_MACRO_ASSUMPTIONS,
): MacroImpactResult {
  const adjustments: MacroAdjustment[] = [];

  // 1. Impacto da inflação nos custos
  const inflationImpact = calculateInflationImpact(macro.inflation, assumptions);

  if (inflationImpact.cv_pct !== 0) {
    adjustments.push({
      component: 'variable_costs',
      adjustment_pct: inflationImpact.cv_pct,
      driven_by: 'inflation',
      description: `Inflação ${macro.inflation}% (meta ${BASELINE.inflation}%): custos variáveis ${inflationImpact.cv_pct > 0 ? '+' : ''}${inflationImpact.cv_pct}%`,
    });
  }

  if (inflationImpact.cf_pct !== 0) {
    adjustments.push({
      component: 'fixed_costs',
      adjustment_pct: inflationImpact.cf_pct,
      driven_by: 'inflation',
      description: `Inflação ${macro.inflation}%: custos fixos ${inflationImpact.cf_pct > 0 ? '+' : ''}${inflationImpact.cf_pct}%`,
    });
  }

  if (inflationImpact.sga_pct !== 0) {
    adjustments.push({
      component: 'sga',
      adjustment_pct: inflationImpact.sga_pct,
      driven_by: 'inflation',
      description: `Inflação ${macro.inflation}%: SG&A ${inflationImpact.sga_pct > 0 ? '+' : ''}${inflationImpact.sga_pct}%`,
    });
  }

  // 2. Impacto do PIB + setor na receita
  const revenuePct = calculateGDPImpact(macro.gdp_growth, macro.sector_growth, assumptions);

  if (revenuePct !== 0) {
    adjustments.push({
      component: 'revenue',
      adjustment_pct: revenuePct,
      driven_by: 'gdp',
      description: `PIB ${macro.gdp_growth}% + setor ${macro.sector_growth}%: receita ${revenuePct > 0 ? '+' : ''}${revenuePct}%`,
    });
  }

  // 3. Inadimplência por desemprego (reduz receita efetiva)
  const defaultRate = calculateDefaultRate(macro.unemployment, assumptions);
  const baseDefaultRate = calculateDefaultRate(BASELINE.unemployment, assumptions);
  const defaultDelta = defaultRate - baseDefaultRate;

  if (defaultDelta !== 0) {
    adjustments.push({
      component: 'default_rate',
      adjustment_pct: -defaultDelta, // inadimplência maior = receita menor
      driven_by: 'unemployment',
      description: `Desemprego ${macro.unemployment}%: inadimplência estimada ${defaultRate}% (${defaultDelta > 0 ? '+' : ''}${defaultDelta}pp vs baseline)`,
    });
  }

  // 4. Risco por juros
  const riskAdder = calculateInterestRiskAdder(macro.interest_rate, assumptions);

  if (riskAdder !== 0) {
    adjustments.push({
      component: 'risk',
      adjustment_pct: riskAdder,
      driven_by: 'interest_rate',
      description: `SELIC ${macro.interest_rate}% (neutra ${BASELINE.interest_rate}%): risco ${riskAdder > 0 ? '+' : ''}${riskAdder} pontos`,
    });
  }

  // 5. Aplicar ajustes nos financials
  // Receita: PIB + setor + inadimplência
  const revenueAdjPct = revenuePct - defaultDelta;
  const adjustedRevenue = round2(financials.receita_real * (1 + revenueAdjPct / 100));

  // Custos (negativos no DRE): inflação
  // custo * (1 + pct/100) → custo mais negativo se pct > 0
  const adjustedCV = round2(financials.custos_variaveis_real * (1 + inflationImpact.cv_pct / 100));
  const adjustedCF = round2(financials.custos_fixos_real * (1 + inflationImpact.cf_pct / 100));
  const adjustedSGA = round2(financials.sga_real * (1 + inflationImpact.sga_pct / 100));

  // Rateio não é afetado por macro (é distribuição interna)
  const adjustedEbitda = round2(
    adjustedRevenue + adjustedCV + adjustedCF + adjustedSGA + financials.rateio_real,
  );

  const adjustedMarginAbs = adjustedRevenue + adjustedCV;
  const adjustedMarginPct = round2(safeDiv(adjustedMarginAbs, Math.abs(adjustedRevenue)) * 100);

  // 6. Calcular deltas
  const baseEbitda = financials.receita_real + financials.custos_variaveis_real +
    financials.custos_fixos_real + financials.sga_real + financials.rateio_real;
  const baseMarginAbs = financials.receita_real + financials.custos_variaveis_real;
  const baseMarginPct = round2(safeDiv(baseMarginAbs, Math.abs(financials.receita_real)) * 100);

  const totalCostBase = Math.abs(financials.custos_variaveis_real + financials.custos_fixos_real + financials.sga_real);
  const totalCostAdj = Math.abs(adjustedCV + adjustedCF + adjustedSGA);

  return {
    adjusted_revenue: adjustedRevenue,
    adjusted_variable_costs: adjustedCV,
    adjusted_fixed_costs: adjustedCF,
    adjusted_sga: adjustedSGA,
    adjusted_ebitda: adjustedEbitda,
    adjusted_margin_pct: adjustedMarginPct,

    revenue_delta_pct: round2(safeDiv(adjustedRevenue - financials.receita_real, Math.abs(financials.receita_real)) * 100),
    cost_delta_pct: round2(totalCostBase !== 0 ? ((totalCostAdj - totalCostBase) / totalCostBase) * 100 : 0),
    ebitda_delta_pct: round2(safeDiv(adjustedEbitda - baseEbitda, Math.abs(baseEbitda)) * 100),
    margin_delta_pp: round2(adjustedMarginPct - baseMarginPct),

    adjustments,
    risk_adder: riskAdder,
    default_rate_estimate: defaultRate,

    macro_snapshot: { ...macro },
    assumptions_used: { ...assumptions },
  };
}

// --------------------------------------------
// Macro Risk Index
// --------------------------------------------

/**
 * Calcula índice de risco macroeconômico (0-100).
 *
 * Score = média ponderada das pressões individuais:
 * - Inflação: peso 25%
 * - Juros: peso 25%
 * - PIB: peso 20%
 * - Desemprego: peso 15%
 * - Volatilidade (dispersão): peso 15%
 *
 * 0 = ambiente muito favorável
 * 100 = crise severa
 */
export function calculateMacroRiskIndex(
  macro: MacroSnapshot,
  previousMacro?: MacroSnapshot | null,
): MacroRiskIndex {
  const alerts: string[] = [];

  // Inflação: 0 na meta, escala até 100
  // > 10% = risco máximo, < 2% = deflação (risco moderado)
  const inflationDelta = Math.abs(macro.inflation - BASELINE.inflation);
  const inflationRisk = clamp(inflationDelta * 15, 0, 100);
  if (macro.inflation > 8) alerts.push(`Inflação elevada: ${macro.inflation}% (meta: ${BASELINE.inflation}%)`);
  if (macro.inflation < 1) alerts.push(`Risco deflacionário: inflação ${macro.inflation}%`);

  // Juros: 0 na neutra, escala até 100
  const interestDelta = Math.max(0, macro.interest_rate - BASELINE.interest_rate);
  const interestRisk = clamp(interestDelta * 7, 0, 100);
  if (macro.interest_rate > 14) alerts.push(`SELIC elevada: ${macro.interest_rate}%`);

  // PIB: crescimento baixo/negativo = risco
  const gdpRisk = clamp((BASELINE.gdp - macro.gdp_growth) * 20, 0, 100);
  if (macro.gdp_growth < 0) alerts.push(`PIB em contração: ${macro.gdp_growth}%`);
  if (macro.gdp_growth < 1) alerts.push(`Crescimento próximo de zero: PIB ${macro.gdp_growth}%`);

  // Desemprego: acima da NAIRU = risco
  const unemploymentDelta = Math.max(0, macro.unemployment - BASELINE.unemployment);
  const unemploymentRisk = clamp(unemploymentDelta * 10, 0, 100);
  if (macro.unemployment > 12) alerts.push(`Desemprego elevado: ${macro.unemployment}%`);

  // Volatilidade: se temos macro anterior, calcular dispersão
  let volatilityRisk = 20; // default moderado
  if (previousMacro) {
    const changes = [
      Math.abs(macro.inflation - previousMacro.inflation),
      Math.abs(macro.interest_rate - previousMacro.interest_rate),
      Math.abs(macro.gdp_growth - previousMacro.gdp_growth) * 2,
      Math.abs(macro.unemployment - previousMacro.unemployment),
    ];
    const avgChange = changes.reduce((s, v) => s + v, 0) / changes.length;
    volatilityRisk = clamp(avgChange * 15, 0, 100);
    if (avgChange > 3) alerts.push('Alta volatilidade nos indicadores macro');
  }

  // Score ponderado
  const score = round2(
    inflationRisk * 0.25 +
    interestRisk * 0.25 +
    gdpRisk * 0.20 +
    unemploymentRisk * 0.15 +
    volatilityRisk * 0.15,
  );

  const clampedScore = clamp(Math.round(score), 0, 100);

  // Classificação
  let environment: MacroEnvironment;
  let label: string;
  if (clampedScore <= 15) { environment = 'favorable'; label = 'Favorável'; }
  else if (clampedScore <= 30) { environment = 'stable'; label = 'Estável'; }
  else if (clampedScore <= 50) { environment = 'moderate'; label = 'Moderado'; }
  else if (clampedScore <= 75) { environment = 'adverse'; label = 'Adverso'; }
  else { environment = 'critical'; label = 'Crítico'; }

  return {
    score: clampedScore,
    environment,
    label,
    components: {
      inflation_risk: round2(inflationRisk),
      interest_risk: round2(interestRisk),
      gdp_risk: round2(gdpRisk),
      unemployment_risk: round2(unemploymentRisk),
      volatility_risk: round2(volatilityRisk),
    },
    alerts,
  };
}

// --------------------------------------------
// Build Macro Snapshot from Indicators
// --------------------------------------------

/**
 * Constrói MacroSnapshot a partir de lista de indicadores.
 * Usa o valor mais recente de cada tipo.
 * Se faltar algum indicador, usa o baseline.
 */
export function buildMacroSnapshot(
  indicators: { indicator_type: string; value: number; period: string; is_projection: boolean }[],
  targetPeriod?: string,
): MacroSnapshot {
  const latest: Record<string, { value: number; period: string; is_projection: boolean }> = {};

  for (const ind of indicators) {
    const existing = latest[ind.indicator_type];
    if (!existing || ind.period > existing.period) {
      // Se targetPeriod definido, priorizar indicadores <= targetPeriod
      if (!targetPeriod || ind.period <= targetPeriod) {
        latest[ind.indicator_type] = ind;
      }
    }
  }

  const get = (type: MacroIndicatorType): number =>
    latest[type]?.value ?? BASELINE[type];

  const hasProjection = Object.values(latest).some(v => v.is_projection);

  const period = targetPeriod ?? Object.values(latest)
    .map(v => v.period)
    .sort()
    .pop() ?? new Date().getFullYear().toString();

  return {
    inflation: get('inflation'),
    interest_rate: get('interest_rate'),
    gdp_growth: get('gdp'),
    unemployment: get('unemployment'),
    sector_growth: get('sector_growth'),
    period,
    has_projections: hasProjection,
  };
}

// --------------------------------------------
// Convenience: Quick Macro Check
// --------------------------------------------

/**
 * Retorna resumo rápido do impacto macro.
 * Atalho para quando só se precisa do delta de EBITDA e risco.
 */
export function quickMacroCheck(
  financials: FinancialInputs,
  macro: MacroSnapshot,
  assumptions?: MacroAssumptions,
): { ebitda_delta_pct: number; risk_adder: number; environment: MacroEnvironment } {
  const impact = applyMacroImpact(financials, macro, assumptions);
  const riskIndex = calculateMacroRiskIndex(macro);

  return {
    ebitda_delta_pct: impact.ebitda_delta_pct,
    risk_adder: impact.risk_adder,
    environment: riskIndex.environment,
  };
}
