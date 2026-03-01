// ============================================
// Multi-Company Intelligence Platform — Type Contracts
// Tipos puros — zero lógica, zero side effects
// ============================================

// --------------------------------------------
// Base Entities
// --------------------------------------------

/** Holding/grupo que agrega múltiplas empresas */
export interface Holding {
  id: string;
  name: string;
  description?: string;
  industry_segment: string;
}

/** Empresa associada a um holding */
export interface HoldingCompany {
  holding_id: string;
  organization_id: string;
  display_name: string;
  portfolio_weight: number;
  is_active: boolean;
}

// --------------------------------------------
// Company Financial Data
// --------------------------------------------

/** Snapshot financeiro de uma empresa para consolidação */
export interface CompanyFinancialSnapshot {
  organization_id: string;
  display_name: string;
  period: string;

  // Financials
  receita_real: number;
  receita_orcado: number;
  custos_variaveis_real: number;
  custos_fixos_real: number;
  sga_real: number;
  rateio_real: number;
  ebitda: number;
  margem_contribuicao_pct: number;

  // Score e saúde
  health_score: number;

  // Crescimento
  growth_yoy: number;

  // Portfolio weight (do holding_companies)
  portfolio_weight: number;

  // Headcount (opcional)
  headcount?: number;
}

// --------------------------------------------
// Consolidated Results
// --------------------------------------------

/** Resultado financeiro consolidado do holding */
export interface ConsolidatedFinancials {
  /** EBITDA consolidado (soma) */
  consolidated_ebitda: number;
  /** Margem consolidada (média ponderada por receita) */
  consolidated_margin: number;
  /** Receita total consolidada */
  consolidated_revenue: number;
  /** Custos totais consolidados */
  consolidated_costs: number;
  /** Crescimento médio ponderado */
  consolidated_growth: number;
  /** Número de empresas no portfólio */
  company_count: number;
  /** Breakdown por empresa */
  company_breakdown: CompanyBreakdown[];
}

/** Detalhamento de uma empresa no consolidado */
export interface CompanyBreakdown {
  organization_id: string;
  display_name: string;
  ebitda: number;
  margin: number;
  revenue: number;
  /** Participação na receita total (%) */
  revenue_share: number;
  /** Participação no EBITDA total (%) */
  ebitda_share: number;
}

// --------------------------------------------
// Portfolio Score
// --------------------------------------------

/** Score consolidado do portfólio */
export interface PortfolioScore {
  /** Score geral do portfólio (0-100) */
  score: number;
  /** Classificação qualitativa */
  classification: PortfolioClassification;
  /** Label de exibição */
  label: string;
  /** Score por empresa (ranking) */
  company_scores: CompanyScoreEntry[];
  /** Métricas de diversificação */
  diversification: DiversificationMetrics;
}

export type PortfolioClassification =
  | 'excellence'    // 85-100
  | 'strong'        // 70-84
  | 'moderate'      // 50-69
  | 'weak'          // 30-49
  | 'critical';     // 0-29

export interface CompanyScoreEntry {
  organization_id: string;
  display_name: string;
  score: number;
  rank: number;
  weight: number;
  /** Contribuição ponderada ao score do portfólio */
  weighted_contribution: number;
}

export interface DiversificationMetrics {
  /** Índice de concentração (HHI): 0 = diversificado, 10000 = monopolista */
  hhi_index: number;
  /** Classificação de concentração */
  concentration: 'low' | 'moderate' | 'high';
  /** Empresa dominante (maior share) */
  dominant_company: string;
  /** Share da empresa dominante (%) */
  dominant_share: number;
}

// --------------------------------------------
// Risk Distribution
// --------------------------------------------

/** Distribuição de risco no portfólio */
export interface RiskDistribution {
  /** Nível de risco geral do portfólio */
  portfolio_risk_level: PortfolioRiskLevel;
  /** Score de risco (0 = seguro, 100 = crítico) */
  risk_score: number;
  /** Mapa de risco por empresa */
  company_risks: CompanyRiskEntry[];
  /** Alertas de risco do portfólio */
  alerts: string[];
  /** Correlação de risco entre empresas */
  risk_correlation: RiskCorrelation;
}

export type PortfolioRiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'critical';

export interface CompanyRiskEntry {
  organization_id: string;
  display_name: string;
  risk_level: PortfolioRiskLevel;
  risk_score: number;
  /** Fatores de risco identificados */
  risk_factors: string[];
  /** Impacto potencial no portfólio se esta empresa deteriorar */
  portfolio_impact_pct: number;
}

export interface RiskCorrelation {
  /** Se as empresas têm riscos correlacionados (ex: mesmo setor) */
  is_correlated: boolean;
  /** Descrição da correlação */
  description: string;
  /** Fator de diversificação (1 = independente, 0 = totalmente correlacionado) */
  diversification_factor: number;
}

// --------------------------------------------
// Capital Allocation
// --------------------------------------------

/** Recomendação de alocação de capital */
export interface CapitalAllocationResult {
  /** Empresas para investir mais */
  invest_more_in: AllocationRecommendation[];
  /** Empresas para otimizar */
  optimize: AllocationRecommendation[];
  /** Empresas candidatas a desinvestimento */
  divest: AllocationRecommendation[];
  /** Ganho esperado do portfólio com alocação ótima */
  expected_portfolio_gain: number;
  /** Retorno ajustado ao risco */
  risk_adjusted_return: number;
  /** Resumo executivo */
  summary: string;
}

export interface AllocationRecommendation {
  organization_id: string;
  display_name: string;
  /** Ação recomendada */
  action: string;
  /** Justificativa */
  rationale: string;
  /** Score atual */
  current_score: number;
  /** Score esperado após ação */
  expected_score: number;
  /** Prioridade (1 = mais urgente) */
  priority: number;
}

// --------------------------------------------
// Portfolio Stress Test
// --------------------------------------------

/** Resultado de stress test do portfólio */
export interface PortfolioStressResult {
  /** Nome do cenário de estresse */
  scenario_name: string;
  /** Descrição */
  scenario_description: string;
  /** EBITDA consolidado após estresse */
  stressed_ebitda: number;
  /** Delta EBITDA vs base (%) */
  ebitda_delta_pct: number;
  /** Score do portfólio após estresse */
  stressed_portfolio_score: number;
  /** Impacto por empresa */
  company_impacts: StressCompanyImpact[];
  /** Empresa mais afetada */
  most_vulnerable: string;
  /** Sobrevivência do portfólio (true se EBITDA > 0) */
  portfolio_survives: boolean;
}

export interface StressCompanyImpact {
  organization_id: string;
  display_name: string;
  original_ebitda: number;
  stressed_ebitda: number;
  delta_pct: number;
  survives: boolean;
}

// --------------------------------------------
// Portfolio Maturity Report
// --------------------------------------------

/** Nível de maturidade do portfólio (1-5) */
export type PortfolioMaturityLevel = 1 | 2 | 3 | 4 | 5;

/** Relatório de maturidade do portfólio */
export interface PortfolioMaturityReport {
  /** Nível geral (1 = básico, 5 = avançado) */
  maturity_level: PortfolioMaturityLevel;
  /** Label do nível */
  maturity_label: string;
  /** Capacidade de decisão multi-empresa (0-100) */
  multi_company_capability: number;
  /** Robustez estratégica (0-100) */
  strategic_robustness: number;
  /** Qualidade da diversificação (0-100) */
  diversification_quality: number;
  /** Dimensões avaliadas */
  dimensions: PortfolioMaturityDimension[];
  /** Próximo salto recomendado */
  next_leap: string;
  /** Ações recomendadas */
  recommended_actions: string[];
}

export interface PortfolioMaturityDimension {
  name: string;
  score: number;
  max_score: number;
  description: string;
}
