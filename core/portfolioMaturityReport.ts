// ============================================
// Portfolio Maturity Report Engine — Multi-Company Intelligence
// Funções puras — zero side effects, zero I/O
// Avalia maturidade do portfólio em 5 dimensões (nível 1-5)
// ============================================

import type {
  CompanyFinancialSnapshot,
  PortfolioMaturityReport,
  PortfolioMaturityLevel,
  PortfolioMaturityDimension,
  PortfolioStressResult,
} from './holdingTypes';

import {
  calculateConsolidatedFinancials,
  calculatePortfolioScore,
  calculateRiskDistribution,
} from './holdingEngine';

import { recommendCapitalAllocation } from './capitalAllocationEngine';

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
// Dimension 1: Financial Health (0-20)
// --------------------------------------------

/**
 * Avalia saúde financeira consolidada.
 * - EBITDA positivo: +5
 * - Margem > 20%: +5
 * - Crescimento positivo: +5
 * - Score médio > 70: +5
 */
function assessFinancialHealth(companies: CompanyFinancialSnapshot[]): PortfolioMaturityDimension {
  let score = 0;

  const consolidated = calculateConsolidatedFinancials(companies);
  const portfolioScore = calculatePortfolioScore(companies);

  // EBITDA positivo
  if (consolidated.consolidated_ebitda > 0) score += 5;
  else if (consolidated.consolidated_ebitda === 0) score += 2;

  // Margem consolidada > 20%
  if (consolidated.consolidated_margin >= 30) score += 5;
  else if (consolidated.consolidated_margin >= 20) score += 3;
  else if (consolidated.consolidated_margin >= 10) score += 1;

  // Crescimento positivo
  if (consolidated.consolidated_growth >= 10) score += 5;
  else if (consolidated.consolidated_growth >= 5) score += 4;
  else if (consolidated.consolidated_growth > 0) score += 2;

  // Score médio do portfólio
  if (portfolioScore.score >= 80) score += 5;
  else if (portfolioScore.score >= 70) score += 4;
  else if (portfolioScore.score >= 50) score += 2;

  return {
    name: 'Saúde Financeira',
    score: clamp(score, 0, 20),
    max_score: 20,
    description: score >= 15
      ? 'Saúde financeira sólida — EBITDA, margem e crescimento em bom nível'
      : score >= 10
      ? 'Saúde financeira moderada — algumas métricas precisam de atenção'
      : 'Saúde financeira frágil — ação urgente necessária em indicadores-chave',
  };
}

// --------------------------------------------
// Dimension 2: Diversification Quality (0-20)
// --------------------------------------------

/**
 * Avalia qualidade da diversificação do portfólio.
 * - Número de empresas: +5 (4+), +3 (3), +1 (2)
 * - HHI baixo (< 1500): +5
 * - Empresa dominante < 40%: +5
 * - Correlação de risco baixa: +5
 */
function assessDiversification(companies: CompanyFinancialSnapshot[]): PortfolioMaturityDimension {
  let score = 0;

  const portfolioScore = calculatePortfolioScore(companies);
  const risk = calculateRiskDistribution(companies);

  // Número de empresas
  if (companies.length >= 4) score += 5;
  else if (companies.length === 3) score += 3;
  else if (companies.length === 2) score += 1;

  // HHI (concentração)
  const hhi = portfolioScore.diversification.hhi_index;
  if (hhi <= 1500) score += 5;
  else if (hhi <= 2500) score += 3;
  else if (hhi <= 5000) score += 1;

  // Empresa dominante
  const dominantShare = portfolioScore.diversification.dominant_share;
  if (dominantShare <= 30) score += 5;
  else if (dominantShare <= 40) score += 3;
  else if (dominantShare <= 60) score += 1;

  // Correlação de risco
  if (risk.risk_correlation.diversification_factor >= 0.7) score += 5;
  else if (risk.risk_correlation.diversification_factor >= 0.4) score += 3;
  else if (risk.risk_correlation.diversification_factor >= 0.2) score += 1;

  return {
    name: 'Qualidade da Diversificação',
    score: clamp(score, 0, 20),
    max_score: 20,
    description: score >= 15
      ? 'Portfólio bem diversificado com baixa concentração e riscos descorrelacionados'
      : score >= 10
      ? 'Diversificação moderada — ainda há dependência excessiva de poucos ativos'
      : 'Diversificação insuficiente — portfólio altamente concentrado',
  };
}

// --------------------------------------------
// Dimension 3: Risk Management (0-20)
// --------------------------------------------

/**
 * Avalia gestão de risco do portfólio.
 * - Risco portfólio <= moderate: +5
 * - Nenhum alerta crítico: +5
 * - Todas as empresas sobrevivem (EBITDA > 0): +5
 * - Fator diversificação > 0.5: +5
 */
function assessRiskManagement(companies: CompanyFinancialSnapshot[]): PortfolioMaturityDimension {
  let score = 0;

  const risk = calculateRiskDistribution(companies);

  // Nível de risco do portfólio
  if (risk.portfolio_risk_level === 'very_low') score += 5;
  else if (risk.portfolio_risk_level === 'low') score += 4;
  else if (risk.portfolio_risk_level === 'moderate') score += 3;
  else if (risk.portfolio_risk_level === 'high') score += 1;

  // Alertas
  if (risk.alerts.length === 0) score += 5;
  else if (risk.alerts.length <= 1) score += 3;
  else if (risk.alerts.length <= 2) score += 1;

  // Todas as empresas com EBITDA positivo
  const allPositiveEbitda = companies.every((c) => c.ebitda > 0);
  if (allPositiveEbitda) score += 5;
  else if (companies.filter((c) => c.ebitda > 0).length >= companies.length * 0.75) score += 3;
  else if (companies.filter((c) => c.ebitda > 0).length >= companies.length * 0.5) score += 1;

  // Fator de diversificação
  if (risk.risk_correlation.diversification_factor >= 0.7) score += 5;
  else if (risk.risk_correlation.diversification_factor >= 0.4) score += 3;
  else if (risk.risk_correlation.diversification_factor >= 0.2) score += 1;

  return {
    name: 'Gestão de Risco',
    score: clamp(score, 0, 20),
    max_score: 20,
    description: score >= 15
      ? 'Gestão de risco robusta — baixa exposição e boa resiliência'
      : score >= 10
      ? 'Gestão de risco moderada — alguns pontos de vulnerabilidade'
      : 'Gestão de risco frágil — exposição elevada a choques',
  };
}

// --------------------------------------------
// Dimension 4: Strategic Capacity (0-20)
// --------------------------------------------

/**
 * Avalia capacidade estratégica do portfólio.
 * - Empresas para investir > 0: +5
 * - Poucas empresas para desinvestir: +5
 * - Retorno ajustado ao risco positivo: +5
 * - Growth médio positivo: +5
 */
function assessStrategicCapacity(companies: CompanyFinancialSnapshot[]): PortfolioMaturityDimension {
  let score = 0;

  const allocation = recommendCapitalAllocation(companies);
  const consolidated = calculateConsolidatedFinancials(companies);

  // Empresas para investir (oportunidade de crescimento)
  if (allocation.invest_more_in.length >= 2) score += 5;
  else if (allocation.invest_more_in.length === 1) score += 3;

  // Poucas para desinvestir (portfólio saudável)
  if (allocation.divest.length === 0) score += 5;
  else if (allocation.divest.length === 1) score += 3;
  else if (allocation.divest.length <= 2) score += 1;

  // Retorno ajustado ao risco
  if (allocation.risk_adjusted_return > 3) score += 5;
  else if (allocation.risk_adjusted_return > 1) score += 3;
  else if (allocation.risk_adjusted_return > 0) score += 1;

  // Crescimento consolidado
  if (consolidated.consolidated_growth >= 10) score += 5;
  else if (consolidated.consolidated_growth >= 5) score += 4;
  else if (consolidated.consolidated_growth > 0) score += 2;

  return {
    name: 'Capacidade Estratégica',
    score: clamp(score, 0, 20),
    max_score: 20,
    description: score >= 15
      ? 'Forte capacidade estratégica — portfólio com oportunidades claras de investimento'
      : score >= 10
      ? 'Capacidade estratégica moderada — algumas oportunidades mas com restrições'
      : 'Capacidade estratégica limitada — poucas opções de crescimento',
  };
}

// --------------------------------------------
// Dimension 5: Operational Resilience (0-20)
// --------------------------------------------

/**
 * Avalia resiliência operacional baseada em stress tests (se disponíveis).
 * Sem stress tests: avalia pela dispersão de margens e EBITDA.
 * - Sobrevive a todos os cenários: +5
 * - Score estressado > 50 em todos: +5
 * - Nenhuma empresa com delta > -50%: +5
 * - Portfólio sobrevive recessão severa: +5
 */
function assessOperationalResilience(
  companies: CompanyFinancialSnapshot[],
  stressResults?: PortfolioStressResult[],
): PortfolioMaturityDimension {
  let score = 0;

  if (stressResults && stressResults.length > 0) {
    // Com stress tests disponíveis — avaliação completa
    const allSurvive = stressResults.every((r) => r.portfolio_survives);
    if (allSurvive) score += 5;
    else if (stressResults.filter((r) => r.portfolio_survives).length >= stressResults.length * 0.75) score += 3;
    else if (stressResults.filter((r) => r.portfolio_survives).length >= stressResults.length * 0.5) score += 1;

    // Score estressado médio
    const avgStressedScore = stressResults.reduce((s, r) => s + r.stressed_portfolio_score, 0) / stressResults.length;
    if (avgStressedScore >= 60) score += 5;
    else if (avgStressedScore >= 50) score += 3;
    else if (avgStressedScore >= 35) score += 1;

    // Nenhuma empresa com delta > -50%
    const hasExtremeImpact = stressResults.some((r) =>
      r.company_impacts.some((ci) => ci.delta_pct < -50),
    );
    if (!hasExtremeImpact) score += 5;
    else score += 1;

    // Recessão severa sobrevive
    const severeRecession = stressResults.find((r) => r.scenario_name === 'Recessão Severa');
    if (severeRecession?.portfolio_survives) score += 5;
    else if (severeRecession && severeRecession.ebitda_delta_pct > -40) score += 2;
  } else {
    // Sem stress tests — estimativa via métricas base
    const consolidated = calculateConsolidatedFinancials(companies);

    // Margem alta = mais resiliente
    if (consolidated.consolidated_margin >= 35) score += 7;
    else if (consolidated.consolidated_margin >= 25) score += 5;
    else if (consolidated.consolidated_margin >= 15) score += 3;

    // EBITDA saudável
    const ebitdaMargin = consolidated.consolidated_revenue !== 0
      ? (consolidated.consolidated_ebitda / Math.abs(consolidated.consolidated_revenue)) * 100
      : 0;
    if (ebitdaMargin >= 15) score += 7;
    else if (ebitdaMargin >= 8) score += 5;
    else if (ebitdaMargin >= 3) score += 3;

    // Dispersão de margens (quanto mais uniforme, mais resiliente)
    const margins = companies.map((c) => c.margem_contribuicao_pct);
    if (margins.length > 1) {
      const avg = margins.reduce((s, m) => s + m, 0) / margins.length;
      const variance = margins.reduce((s, m) => s + (m - avg) ** 2, 0) / margins.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 5) score += 6;
      else if (stdDev < 10) score += 4;
      else if (stdDev < 20) score += 2;
    }
  }

  return {
    name: 'Resiliência Operacional',
    score: clamp(score, 0, 20),
    max_score: 20,
    description: score >= 15
      ? 'Alta resiliência — portfólio sobrevive à maioria dos cenários de estresse'
      : score >= 10
      ? 'Resiliência moderada — vulnerável em cenários severos'
      : 'Baixa resiliência — portfólio frágil a choques externos',
  };
}

// --------------------------------------------
// Main: Generate Maturity Report
// --------------------------------------------

/**
 * Gera relatório completo de maturidade do portfólio.
 *
 * Avalia 5 dimensões (0-20 cada, total 0-100):
 * 1. Saúde Financeira
 * 2. Qualidade da Diversificação
 * 3. Gestão de Risco
 * 4. Capacidade Estratégica
 * 5. Resiliência Operacional
 *
 * Nível de maturidade (1-5) baseado no score total:
 * - Level 1 (0-20): Básico — portfólio em formação
 * - Level 2 (21-40): Em Desenvolvimento — estrutura básica estabelecida
 * - Level 3 (41-60): Intermediário — gestão multi-empresa funcional
 * - Level 4 (61-80): Avançado — inteligência de portfólio ativa
 * - Level 5 (81-100): Excelência — referência em gestão multi-empresa
 *
 * Função PURA — zero I/O, zero side effects.
 *
 * @param companies - Array de snapshots financeiros (read-only)
 * @param stressResults - Resultados opcionais de stress test (read-only)
 */
export function generatePortfolioMaturityReport(
  companies: CompanyFinancialSnapshot[],
  stressResults?: PortfolioStressResult[],
): PortfolioMaturityReport {
  if (companies.length === 0) {
    return {
      maturity_level: 1,
      maturity_label: 'Sem Dados',
      multi_company_capability: 0,
      strategic_robustness: 0,
      diversification_quality: 0,
      dimensions: [],
      next_leap: 'Adicionar empresas ao portfólio para iniciar avaliação',
      recommended_actions: ['Cadastrar pelo menos 2 empresas no portfólio'],
    };
  }

  // Avaliar cada dimensão
  const dim1 = assessFinancialHealth(companies);
  const dim2 = assessDiversification(companies);
  const dim3 = assessRiskManagement(companies);
  const dim4 = assessStrategicCapacity(companies);
  const dim5 = assessOperationalResilience(companies, stressResults);

  const dimensions = [dim1, dim2, dim3, dim4, dim5];
  const totalScore = dimensions.reduce((s, d) => s + d.score, 0);

  // Nível de maturidade (1-5)
  const maturityLevel = determineMaturityLevel(totalScore);
  const maturityLabel = getMaturityLabel(maturityLevel);

  // Métricas derivadas
  const multiCompanyCapability = round2(
    ((dim2.score + dim4.score) / 40) * 100,
  );

  const strategicRobustness = round2(
    ((dim1.score + dim3.score + dim5.score) / 60) * 100,
  );

  const diversificationQuality = round2(
    (dim2.score / 20) * 100,
  );

  // Próximo salto e ações recomendadas
  const nextLeap = determineNextLeap(maturityLevel, dimensions);
  const actions = generateRecommendedActions(dimensions);

  return {
    maturity_level: maturityLevel,
    maturity_label: maturityLabel,
    multi_company_capability: multiCompanyCapability,
    strategic_robustness: strategicRobustness,
    diversification_quality: diversificationQuality,
    dimensions,
    next_leap: nextLeap,
    recommended_actions: actions,
  };
}

// --------------------------------------------
// Classification & Recommendations
// --------------------------------------------

function determineMaturityLevel(totalScore: number): PortfolioMaturityLevel {
  if (totalScore >= 81) return 5;
  if (totalScore >= 61) return 4;
  if (totalScore >= 41) return 3;
  if (totalScore >= 21) return 2;
  return 1;
}

function getMaturityLabel(level: PortfolioMaturityLevel): string {
  switch (level) {
    case 1: return 'Básico';
    case 2: return 'Em Desenvolvimento';
    case 3: return 'Intermediário';
    case 4: return 'Avançado';
    case 5: return 'Excelência';
  }
}

function determineNextLeap(level: PortfolioMaturityLevel, dimensions: PortfolioMaturityDimension[]): string {
  // Encontrar dimensão com menor score relativo (maior gap)
  const sorted = [...dimensions].sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score));
  const weakest = sorted[0];

  switch (level) {
    case 1:
      return `Foco imediato: ${weakest.name} — estabelecer bases mínimas do portfólio`;
    case 2:
      return `Fortalecer ${weakest.name} — consolidar estrutura para gestão multi-empresa efetiva`;
    case 3:
      return `Elevar ${weakest.name} — desenvolver inteligência de portfólio para decisões proativas`;
    case 4:
      return `Aprimorar ${weakest.name} — alcançar excelência em gestão integrada de portfólio`;
    case 5:
      return `Manter excelência — focar em inovação e benchmarks de classe mundial`;
  }
}

function generateRecommendedActions(dimensions: PortfolioMaturityDimension[]): string[] {
  const actions: string[] = [];

  for (const dim of dimensions) {
    const ratio = dim.score / dim.max_score;

    if (ratio < 0.5) {
      // Ação urgente para dimensões fracas
      switch (dim.name) {
        case 'Saúde Financeira':
          actions.push('Priorizar melhoria de EBITDA e margem das empresas com pior desempenho');
          break;
        case 'Qualidade da Diversificação':
          actions.push('Avaliar inclusão de novas empresas para reduzir concentração do portfólio');
          break;
        case 'Gestão de Risco':
          actions.push('Implementar plano de mitigação para empresas com risco elevado');
          break;
        case 'Capacidade Estratégica':
          actions.push('Reavaliar empresas candidatas a desinvestimento e redirecionar capital');
          break;
        case 'Resiliência Operacional':
          actions.push('Realizar stress tests e fortalecer margens para resistir a choques');
          break;
      }
    } else if (ratio < 0.75) {
      // Ação de otimização para dimensões moderadas
      switch (dim.name) {
        case 'Saúde Financeira':
          actions.push('Otimizar eficiência operacional das empresas com margem abaixo da média');
          break;
        case 'Qualidade da Diversificação':
          actions.push('Equilibrar pesos do portfólio para reduzir dependência da empresa dominante');
          break;
        case 'Gestão de Risco':
          actions.push('Monitorar indicadores de risco e estabelecer alertas proativos');
          break;
        case 'Capacidade Estratégica':
          actions.push('Aumentar investimento em empresas com melhor relação retorno/risco');
          break;
        case 'Resiliência Operacional':
          actions.push('Diversificar fontes de receita para aumentar resiliência a cenários adversos');
          break;
      }
    }
  }

  // Limitar a 5 ações no máximo
  return actions.slice(0, 5);
}
