// ============================================
// Holding Consolidation Engine — Multi-Company Intelligence
// Funções puras — zero side effects, zero I/O
// Agrega métricas de múltiplas empresas
// Isolamento total — cada empresa é input independente
// ============================================

import type {
  CompanyFinancialSnapshot,
  ConsolidatedFinancials,
  CompanyBreakdown,
  PortfolioScore,
  PortfolioClassification,
  CompanyScoreEntry,
  DiversificationMetrics,
  RiskDistribution,
  PortfolioRiskLevel,
  CompanyRiskEntry,
  RiskCorrelation,
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

function safeDiv(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return num / den;
}

function safePct(num: number, den: number): number {
  return round2(safeDiv(num, Math.abs(den)) * 100);
}

// --------------------------------------------
// 1. Consolidated Financials
// --------------------------------------------

/**
 * Calcula financials consolidados do holding.
 *
 * Regras:
 * - EBITDA consolidado = soma dos EBITDAs individuais
 * - Receita consolidada = soma das receitas individuais
 * - Margem consolidada = média PONDERADA por receita (não simples)
 * - Crescimento = média ponderada por receita
 * - Cada empresa contribui proporcionalmente à sua receita
 *
 * NÃO duplica contagem: cada empresa aparece exatamente 1x.
 * Empresas com receita zero são incluídas nos totais mas não distorcem médias.
 *
 * @param companies - Array de snapshots financeiros (read-only)
 */
export function calculateConsolidatedFinancials(
  companies: CompanyFinancialSnapshot[],
): ConsolidatedFinancials {
  if (companies.length === 0) {
    return {
      consolidated_ebitda: 0,
      consolidated_margin: 0,
      consolidated_revenue: 0,
      consolidated_costs: 0,
      consolidated_growth: 0,
      company_count: 0,
      company_breakdown: [],
    };
  }

  // Somas diretas (sem duplicação)
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalEbitda = 0;
  let weightedMarginSum = 0;
  let weightedGrowthSum = 0;
  let totalRevenueAbs = 0;

  for (const c of companies) {
    const rev = c.receita_real;
    const costs = c.custos_variaveis_real + c.custos_fixos_real + c.sga_real + c.rateio_real;

    totalRevenue += rev;
    totalCosts += costs;
    totalEbitda += c.ebitda;

    const revAbs = Math.abs(rev);
    totalRevenueAbs += revAbs;

    // Ponderação pela receita absoluta
    weightedMarginSum += c.margem_contribuicao_pct * revAbs;
    weightedGrowthSum += c.growth_yoy * revAbs;
  }

  // Margem ponderada (por receita, não simples)
  const consolidatedMargin = totalRevenueAbs > 0
    ? round2(weightedMarginSum / totalRevenueAbs)
    : 0;

  const consolidatedGrowth = totalRevenueAbs > 0
    ? round2(weightedGrowthSum / totalRevenueAbs)
    : 0;

  // Breakdown por empresa
  const breakdown: CompanyBreakdown[] = companies.map((c) => ({
    organization_id: c.organization_id,
    display_name: c.display_name,
    ebitda: c.ebitda,
    margin: c.margem_contribuicao_pct,
    revenue: c.receita_real,
    revenue_share: safePct(Math.abs(c.receita_real), totalRevenueAbs),
    ebitda_share: totalEbitda !== 0 ? safePct(c.ebitda, Math.abs(totalEbitda)) : 0,
  }));

  return {
    consolidated_ebitda: round2(totalEbitda),
    consolidated_margin: consolidatedMargin,
    consolidated_revenue: round2(totalRevenue),
    consolidated_costs: round2(totalCosts),
    consolidated_growth: consolidatedGrowth,
    company_count: companies.length,
    company_breakdown: breakdown,
  };
}

// --------------------------------------------
// 2. Portfolio Score
// --------------------------------------------

/**
 * Calcula score consolidado do portfólio.
 *
 * Score = média ponderada dos health_scores individuais.
 * Peso: portfolio_weight da empresa (normalizado para somar 100%).
 *
 * Inclui métricas de diversificação via HHI (Herfindahl-Hirschman Index).
 *
 * @param companies - Array de snapshots financeiros (read-only)
 */
export function calculatePortfolioScore(
  companies: CompanyFinancialSnapshot[],
): PortfolioScore {
  if (companies.length === 0) {
    return {
      score: 0,
      classification: 'critical',
      label: 'Sem Dados',
      company_scores: [],
      diversification: {
        hhi_index: 10000,
        concentration: 'high',
        dominant_company: '—',
        dominant_share: 100,
      },
    };
  }

  // Normalizar pesos
  const totalWeight = companies.reduce((s, c) => s + c.portfolio_weight, 0) || 1;

  // Calcular score ponderado
  let weightedScore = 0;
  const entries: CompanyScoreEntry[] = [];

  for (const c of companies) {
    const normalizedWeight = c.portfolio_weight / totalWeight;
    const contribution = round2(c.health_score * normalizedWeight);
    weightedScore += contribution;

    entries.push({
      organization_id: c.organization_id,
      display_name: c.display_name,
      score: c.health_score,
      rank: 0, // preenchido após sort
      weight: round2(normalizedWeight * 100),
      weighted_contribution: contribution,
    });
  }

  // Ranking por score
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });

  const portfolioScore = clamp(Math.round(weightedScore), 0, 100);

  // Classificação
  const { classification, label } = classifyPortfolio(portfolioScore);

  // Diversificação
  const diversification = calculateDiversification(companies);

  return {
    score: portfolioScore,
    classification,
    label,
    company_scores: entries,
    diversification,
  };
}

function classifyPortfolio(score: number): { classification: PortfolioClassification; label: string } {
  if (score >= 85) return { classification: 'excellence', label: 'Excelência' };
  if (score >= 70) return { classification: 'strong', label: 'Forte' };
  if (score >= 50) return { classification: 'moderate', label: 'Moderado' };
  if (score >= 30) return { classification: 'weak', label: 'Fraco' };
  return { classification: 'critical', label: 'Crítico' };
}

/**
 * Calcula Herfindahl-Hirschman Index (HHI) para medir concentração.
 * HHI = soma dos quadrados das participações (%).
 * - 0-1500: baixa concentração
 * - 1500-2500: moderada
 * - 2500+: alta concentração
 * - Monopolista = 10000 (100²)
 */
function calculateDiversification(companies: CompanyFinancialSnapshot[]): DiversificationMetrics {
  const totalRevenueAbs = companies.reduce((s, c) => s + Math.abs(c.receita_real), 0) || 1;

  const shares = companies.map((c) => ({
    name: c.display_name,
    share: (Math.abs(c.receita_real) / totalRevenueAbs) * 100,
  }));

  // HHI = Σ(share²)
  const hhi = Math.round(shares.reduce((s, sh) => s + sh.share * sh.share, 0));

  let concentration: 'low' | 'moderate' | 'high';
  if (hhi <= 1500) concentration = 'low';
  else if (hhi <= 2500) concentration = 'moderate';
  else concentration = 'high';

  // Empresa dominante
  const sorted = [...shares].sort((a, b) => b.share - a.share);
  const dominant = sorted[0] ?? { name: '—', share: 100 };

  return {
    hhi_index: hhi,
    concentration,
    dominant_company: dominant.name,
    dominant_share: round2(dominant.share),
  };
}

// --------------------------------------------
// 3. Risk Distribution
// --------------------------------------------

/**
 * Calcula distribuição de risco no portfólio.
 *
 * Risco por empresa baseado em:
 * - Score baixo → risco alto
 * - Margem negativa → risco crítico
 * - EBITDA negativo → risco crítico
 * - Crescimento negativo → risco moderado
 *
 * Risco do portfólio = média ponderada dos riscos + penalidade por concentração.
 *
 * @param companies - Array de snapshots financeiros (read-only)
 */
export function calculateRiskDistribution(
  companies: CompanyFinancialSnapshot[],
): RiskDistribution {
  if (companies.length === 0) {
    return {
      portfolio_risk_level: 'critical',
      risk_score: 100,
      company_risks: [],
      alerts: ['Nenhuma empresa no portfólio'],
      risk_correlation: {
        is_correlated: false,
        description: 'Sem dados',
        diversification_factor: 0,
      },
    };
  }

  const totalRevenueAbs = companies.reduce((s, c) => s + Math.abs(c.receita_real), 0) || 1;
  const alerts: string[] = [];
  const companyRisks: CompanyRiskEntry[] = [];

  let weightedRisk = 0;

  for (const c of companies) {
    const { riskScore, riskLevel, factors } = assessCompanyRisk(c);
    const revShare = Math.abs(c.receita_real) / totalRevenueAbs;

    weightedRisk += riskScore * revShare;

    companyRisks.push({
      organization_id: c.organization_id,
      display_name: c.display_name,
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: factors,
      portfolio_impact_pct: round2(revShare * 100),
    });

    // Alertas de portfólio
    if (riskLevel === 'critical') {
      alerts.push(`${c.display_name}: risco CRÍTICO (score ${c.health_score}, EBITDA ${c.ebitda < 0 ? 'negativo' : 'baixo'})`);
    } else if (riskLevel === 'high' && revShare > 0.3) {
      alerts.push(`${c.display_name}: risco ALTO e representa ${round2(revShare * 100)}% da receita`);
    }
  }

  // Penalidade por concentração
  const diversification = calculateDiversification(companies);
  const concentrationPenalty = diversification.concentration === 'high' ? 10
    : diversification.concentration === 'moderate' ? 5
    : 0;

  const finalRiskScore = clamp(Math.round(weightedRisk + concentrationPenalty), 0, 100);
  const portfolioRiskLevel = classifyRiskLevel(finalRiskScore);

  if (diversification.concentration === 'high') {
    alerts.push(`Alta concentração: ${diversification.dominant_company} representa ${diversification.dominant_share}% da receita`);
  }

  // Correlação de risco
  const correlation = assessRiskCorrelation(companies);

  // Ranking por risco (mais arriscado primeiro)
  companyRisks.sort((a, b) => b.risk_score - a.risk_score);

  return {
    portfolio_risk_level: portfolioRiskLevel,
    risk_score: finalRiskScore,
    company_risks: companyRisks,
    alerts,
    risk_correlation: correlation,
  };
}

function assessCompanyRisk(c: CompanyFinancialSnapshot): {
  riskScore: number;
  riskLevel: PortfolioRiskLevel;
  factors: string[];
} {
  const factors: string[] = [];
  let riskScore = 0;

  // Score baixo (peso 40%)
  const scoreRisk = clamp(100 - c.health_score, 0, 100);
  riskScore += scoreRisk * 0.4;
  if (c.health_score < 50) factors.push(`Health score crítico: ${c.health_score}`);
  else if (c.health_score < 70) factors.push(`Health score baixo: ${c.health_score}`);

  // EBITDA (peso 25%)
  if (c.ebitda < 0) {
    riskScore += 100 * 0.25;
    factors.push('EBITDA negativo');
  } else if (c.ebitda === 0) {
    riskScore += 60 * 0.25;
    factors.push('EBITDA zero');
  }

  // Margem (peso 20%)
  if (c.margem_contribuicao_pct < 0) {
    riskScore += 100 * 0.2;
    factors.push('Margem negativa');
  } else if (c.margem_contribuicao_pct < 20) {
    riskScore += 50 * 0.2;
    factors.push(`Margem baixa: ${c.margem_contribuicao_pct.toFixed(1)}%`);
  }

  // Crescimento (peso 15%)
  if (c.growth_yoy < -10) {
    riskScore += 80 * 0.15;
    factors.push(`Queda acentuada: ${c.growth_yoy.toFixed(1)}% YoY`);
  } else if (c.growth_yoy < 0) {
    riskScore += 40 * 0.15;
    factors.push(`Crescimento negativo: ${c.growth_yoy.toFixed(1)}% YoY`);
  }

  const clampedRisk = clamp(Math.round(riskScore), 0, 100);

  return {
    riskScore: clampedRisk,
    riskLevel: classifyRiskLevel(clampedRisk),
    factors,
  };
}

function classifyRiskLevel(score: number): PortfolioRiskLevel {
  if (score <= 15) return 'very_low';
  if (score <= 30) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

function assessRiskCorrelation(companies: CompanyFinancialSnapshot[]): RiskCorrelation {
  if (companies.length < 2) {
    return {
      is_correlated: false,
      description: 'Portfólio com empresa única — sem diversificação',
      diversification_factor: 0,
    };
  }

  // Verificar se todas têm crescimento na mesma direção
  const allGrowing = companies.every((c) => c.growth_yoy > 0);
  const allShrinking = companies.every((c) => c.growth_yoy < 0);
  const sameDirection = allGrowing || allShrinking;

  // Verificar dispersão de scores
  const scores = companies.map((c) => c.health_score);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - avgScore) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Alta dispersão = menos correlacionado = melhor diversificação
  const isCorrelated = sameDirection && stdDev < 10;
  const diversificationFactor = round2(
    clamp(stdDev / 20 + (sameDirection ? 0 : 0.3), 0, 1),
  );

  let description: string;
  if (isCorrelated) {
    description = 'Empresas com alto grau de correlação — riscos concentrados';
  } else if (diversificationFactor > 0.6) {
    description = 'Boa diversificação — empresas com perfis de risco distintos';
  } else {
    description = 'Diversificação moderada — alguma correlação entre empresas';
  }

  return {
    is_correlated: isCorrelated,
    description,
    diversification_factor: diversificationFactor,
  };
}
