// ============================================
// Core Decision Types
// Contratos puros — zero lógica, zero side effects
// ============================================

// --------------------------------------------
// Financial Inputs
// --------------------------------------------

/** Inputs financeiros extraídos do FinancialSummary */
export interface FinancialInputs {
  receita_real: number;
  receita_orcado: number;
  custos_variaveis_real: number;
  custos_variaveis_orcado: number;
  custos_fixos_real: number;
  custos_fixos_orcado: number;
  sga_real: number;
  sga_orcado: number;
  rateio_real: number;
  rateio_orcado: number;
}

/** Deltas hipotéticos para simulação */
export interface FinancialDeltas {
  revenue_delta: number;
  cv_delta: number;
  cf_delta: number;
  sga_delta: number;
}

/** Resultado de cálculos financeiros derivados */
export interface FinancialMetrics {
  ebitda: number;
  margin: number;       // margem de contribuição em %
  margin_absolute: number; // margem de contribuição em valor absoluto
}

// --------------------------------------------
// Score Inputs / Outputs
// --------------------------------------------

/** Inputs para o cálculo de Health Score */
export interface ScoreInputs {
  confidence: number;
  margin_real: number;
  margin_orcado: number;
  ebitda_real: number;
  ebitda_a1: number;
  high_priority_count: number;
  conflicts_count: number;
}

/** Breakdown detalhado das penalidades do score */
export interface ScoreBreakdown {
  base: 100;
  penalty_confidence: number;
  penalty_margin: number;
  penalty_ebitda: number;
  penalty_high_priority: number;
  penalty_conflicts: number;
  final_score: number;
}

/** Classificação do score */
export type ScoreClassification = 'Saudável' | 'Atenção' | 'Crítico';

/** Resultado completo do score */
export interface ScoreResult {
  score: number;
  classification: ScoreClassification;
  breakdown: ScoreBreakdown;
}

// --------------------------------------------
// Forecast
// --------------------------------------------

/** Série temporal de um ponto de dados */
export interface TimeSeriesPoint {
  score: number;
  margin: number;
  ebitda: number;
}

/** Projeção linear de 3 pontos futuros */
export type Projection3 = [number, number, number];

/** Slopes das séries */
export interface SlopeSet {
  score: number;
  margin: number;
  ebitda: number;
}

/** Resultado completo da projeção */
export interface ForecastResult {
  forecast: {
    score: Projection3;
    margin: Projection3;
    ebitda: Projection3;
  };
  slope: SlopeSet;
  risk_assessment: string;
}

// --------------------------------------------
// Optimization (Cut Plan)
// --------------------------------------------

/** Área candidata a corte */
export interface CutCandidate {
  area: string;
  gap: number;
  volume: number;
}

/** Input para o engine de otimização */
export interface OptimizationInput {
  current_financials: FinancialInputs;
  current_score_inputs: ScoreInputs;
  target_score?: number;
  target_ebitda?: number;
  candidates: CutCandidate[];
}

/** Ação proposta pelo otimizador */
export interface ProposedAction {
  area: string;
  current_gap: number;
  suggested_cut: number;
  estimated_impact: number;
  priority: 'high' | 'medium' | 'low';
}

/** Resultado da otimização */
export interface OptimizationResult {
  gap: number;
  proposed_actions: ProposedAction[];
  projected_score: number;
  projected_ebitda: number;
  projected_margin: number;
}

// --------------------------------------------
// Multi-Objective Optimization
// --------------------------------------------

/** Objetivo de otimização */
export type OptimizationObjective = 'maximize_score' | 'maximize_ebitda' | 'minimize_risk';

/** Restrições para o otimizador */
export interface OptimizationConstraints {
  min_margin?: number;        // Margem mínima aceitável (%)
  max_total_cut?: number;     // Corte total máximo (valor absoluto)
  max_cut_per_area?: number;  // Corte máximo por área individual
  min_revenue?: number;       // Receita mínima (não cortar abaixo disso)
  protected_areas?: string[]; // Áreas que não podem ser cortadas
}

/** Input para otimização multi-objetivo */
export interface MultiObjectiveInput {
  current_financials: FinancialInputs;
  current_score_inputs: ScoreInputs;
  candidates: CutCandidate[];
  objective: OptimizationObjective;
  constraints: OptimizationConstraints;
  target_score?: number;
  target_ebitda?: number;
}

/** Resultado com métricas multi-objetivo */
export interface MultiObjectiveResult {
  gap: number;
  proposed_actions: ProposedAction[];
  projected_score: number;
  projected_ebitda: number;
  projected_margin: number;
  constraints_satisfied: boolean;
  constraint_violations: string[];
  objective_value: number;
}

// --------------------------------------------
// Model Configuration (dynamic scoring)
// --------------------------------------------

/** Configuração dinâmica do modelo de scoring */
export interface ScoreConfig {
  base_score: number;
  penalty_confidence_threshold: number;
  penalty_confidence_factor: number;
  penalty_margin_factor: number;
  penalty_ebitda_fixed: number;
  penalty_high_priority_threshold: number;
  penalty_high_priority_fixed: number;
  penalty_conflicts_fixed: number;
  classification_healthy: number;
  classification_attention: number;
}

/** Configuração dinâmica dos thresholds de alerta */
export interface AlertConfig {
  score_critical: number;
  margin_gap: number;
  high_priority_threshold: number;
  conflicts_threshold: number;
}

/** Configuração dinâmica do otimizador */
export interface OptimizationConfig {
  fractions: number[];
  max_cut_pct: number;
}

/** Configuração completa do modelo (combina todas) */
export interface ModelConfig {
  score: ScoreConfig;
  alert: AlertConfig;
  optimization: OptimizationConfig;
}

// --------------------------------------------
// Organization (Multi-Tenant)
// --------------------------------------------

/** Configuração por organização */
export interface OrganizationConfig {
  organization_id: string;
  name: string;
  model_config: ModelConfig;
  features: OrganizationFeatures;
}

/** Feature flags por organização */
export interface OrganizationFeatures {
  enable_forecast: boolean;
  enable_optimization: boolean;
  enable_alerts: boolean;
  enable_trend_alerts: boolean;
  enable_brand_score: boolean;
  enable_ceo_view: boolean;
  max_runs_per_day: number;
  max_agents_per_team: number;
}

/** Defaults de features */
export const DEFAULT_ORG_FEATURES: OrganizationFeatures = {
  enable_forecast: true,
  enable_optimization: true,
  enable_alerts: true,
  enable_trend_alerts: true,
  enable_brand_score: true,
  enable_ceo_view: true,
  max_runs_per_day: 50,
  max_agents_per_team: 10,
};

// --------------------------------------------
// Alerts
// --------------------------------------------

export type AlertSeverity = 'high' | 'medium' | 'low';

/** Alerta gerado pelo sistema */
export interface AlertDecision {
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  metric_value: number;
  threshold_value: number;
}

// --------------------------------------------
// Trend Detection
// --------------------------------------------

/** Registro da tabela decision_models (DB row) */
export interface DecisionModelRow {
  base_score: number;
  penalty_confidence_threshold: number;
  penalty_confidence_factor: number;
  penalty_margin_factor: number;
  penalty_ebitda_fixed: number;
  penalty_high_priority_threshold: number;
  penalty_high_priority_fixed: number;
  penalty_conflicts_fixed: number;
  classification_healthy: number;
  classification_attention: number;
  alert_score_critical: number;
  alert_margin_gap: number;
  alert_high_priority_threshold: number;
  alert_conflicts_threshold: number;
  optimization_fractions: number[];
  optimization_max_cut_pct: number;
}

/** Séries históricas para detecção de tendência */
export interface TrendSeries {
  scores: number[];
  margins: number[];
  confidences: number[];
  high_priority_counts: number[];
}
