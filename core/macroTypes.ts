// ============================================
// Macro Intelligence Layer — Type Contracts
// Tipos puros — zero lógica, zero side effects
// ============================================

// --------------------------------------------
// Indicator Types
// --------------------------------------------

/** Tipos de indicadores macroeconômicos suportados */
export type MacroIndicatorType =
  | 'inflation'       // IPCA / inflação acumulada (%)
  | 'interest_rate'   // SELIC / taxa de juros (%)
  | 'gdp'             // PIB crescimento (%)
  | 'unemployment'    // Taxa de desemprego (%)
  | 'sector_growth';  // Crescimento do setor educacional (%)

/** Fonte do dado macroeconômico */
export type MacroSource = 'manual' | 'bcb' | 'ibge' | 'ipea' | 'market' | 'internal';

/** Indicador macroeconômico individual */
export interface MacroIndicator {
  indicator_type: MacroIndicatorType;
  value: number;
  period: string;
  source: MacroSource;
  is_projection: boolean;
}

// --------------------------------------------
// Macro Data Snapshot
// --------------------------------------------

/**
 * Snapshot consolidado dos indicadores macro para um período.
 * Usado como input para o macroImpactEngine.
 */
export interface MacroSnapshot {
  /** Inflação acumulada no período (%) */
  inflation: number;
  /** Taxa de juros vigente (%) */
  interest_rate: number;
  /** Crescimento do PIB no período (%) */
  gdp_growth: number;
  /** Taxa de desemprego (%) */
  unemployment: number;
  /** Crescimento do setor educacional (%) */
  sector_growth: number;
  /** Período de referência */
  period: string;
  /** Se contém projeções (vs dados realizados) */
  has_projections: boolean;
}

// --------------------------------------------
// Macro Assumptions
// --------------------------------------------

/**
 * Premissas de sensibilidade da organização ao macro.
 * Configuram QUANTO cada indicador afeta a empresa.
 */
export interface MacroAssumptions {
  /** Quanto 1pp de inflação afeta custos (0-2). Default: 0.7 */
  inflation_sensitivity: number;
  /** Quanto 1pp de PIB afeta receita (0-3). Default: 0.5 */
  revenue_elasticity: number;
  /** Quanto inflação afeta custos variáveis (0-3). Default: 0.8 */
  cost_elasticity: number;
  /** Impacto de 1pp de juros no risco (0-2). Default: 0.3 */
  interest_sensitivity: number;
  /** Quanto desemprego afeta inadimplência (0-2). Default: 0.4 */
  unemployment_sensitivity: number;
}

/** Premissas default para quando não há configuração */
export const DEFAULT_MACRO_ASSUMPTIONS: MacroAssumptions = {
  inflation_sensitivity: 0.7,
  revenue_elasticity: 0.5,
  cost_elasticity: 0.8,
  interest_sensitivity: 0.3,
  unemployment_sensitivity: 0.4,
};

// --------------------------------------------
// Macro Impact Results
// --------------------------------------------

/** Ajuste individual por componente */
export interface MacroAdjustment {
  /** Componente afetado */
  component: 'revenue' | 'variable_costs' | 'fixed_costs' | 'sga' | 'risk' | 'default_rate';
  /** Variação percentual aplicada */
  adjustment_pct: number;
  /** Indicador que gerou o ajuste */
  driven_by: MacroIndicatorType;
  /** Descrição do efeito */
  description: string;
}

/** Resultado completo do impacto macro nos financials */
export interface MacroImpactResult {
  /** Financials ajustados (projeção com macro) */
  adjusted_revenue: number;
  adjusted_variable_costs: number;
  adjusted_fixed_costs: number;
  adjusted_sga: number;
  adjusted_ebitda: number;
  adjusted_margin_pct: number;

  /** Deltas vs base (sem macro) */
  revenue_delta_pct: number;
  cost_delta_pct: number;
  ebitda_delta_pct: number;
  margin_delta_pp: number;

  /** Ajustes individuais para transparência */
  adjustments: MacroAdjustment[];

  /** Risk adder: pontos adicionais de risco por macro */
  risk_adder: number;

  /** Inadimplência estimada (% da receita) */
  default_rate_estimate: number;

  /** Snapshot macro usado */
  macro_snapshot: MacroSnapshot;
  /** Premissas usadas */
  assumptions_used: MacroAssumptions;
}

// --------------------------------------------
// Macro Risk Index
// --------------------------------------------

/** Classificação do ambiente macro */
export type MacroEnvironment = 'favorable' | 'stable' | 'moderate' | 'adverse' | 'critical';

/** Índice de risco macroeconômico */
export interface MacroRiskIndex {
  /** Score de 0 a 100 (0 = ambiente favorável, 100 = crise) */
  score: number;
  /** Classificação qualitativa */
  environment: MacroEnvironment;
  /** Label para exibição */
  label: string;
  /** Componentes do índice */
  components: {
    inflation_risk: number;
    interest_risk: number;
    gdp_risk: number;
    unemployment_risk: number;
    volatility_risk: number;
  };
  /** Alertas gerados */
  alerts: string[];
}

// --------------------------------------------
// Macro Scenario Presets
// --------------------------------------------

/** Preset de cenário macroeconômico para simulação */
export interface MacroScenarioPreset {
  name: string;
  description: string;
  snapshot: MacroSnapshot;
}

// --------------------------------------------
// Macro Maturity Report
// --------------------------------------------

/** Nível de maturidade macro (1-5) */
export type MacroMaturityLevel = 1 | 2 | 3 | 4 | 5;

/** Relatório de maturidade macro */
export interface MacroMaturityReport {
  /** Nível geral (1 = básico, 5 = avançado) */
  maturity_level: MacroMaturityLevel;
  /** Label do nível */
  maturity_label: string;
  /** Sensibilidade ao ambiente externo (0-100) */
  external_sensitivity: number;
  /** Robustez estratégica (0-100) */
  strategic_robustness: number;
  /** Capacidade de absorção de choques (0-100) */
  shock_absorption: number;
  /** Dimensões avaliadas */
  dimensions: MacroMaturityDimension[];
  /** Próximo salto recomendado */
  next_leap: string;
  /** Ações recomendadas */
  recommended_actions: string[];
}

/** Dimensão individual de maturidade */
export interface MacroMaturityDimension {
  name: string;
  score: number;
  max_score: number;
  description: string;
}
