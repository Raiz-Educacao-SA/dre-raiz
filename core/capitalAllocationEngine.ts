// ============================================
// Capital Allocation Engine — Multi-Company Intelligence
// Funções puras — zero side effects, zero I/O
// Recomenda alocação de capital baseada em score, crescimento, risco, eficiência
// ============================================

import type {
  CompanyFinancialSnapshot,
  CapitalAllocationResult,
  AllocationRecommendation,
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
// Company Assessment
// --------------------------------------------

interface CompanyAssessment {
  organization_id: string;
  display_name: string;
  score: number;
  growth: number;
  margin: number;
  ebitda: number;
  efficiency: number;
  attractiveness: number;
  risk: number;
  category: 'invest' | 'optimize' | 'divest';
  rationale: string;
}

/**
 * Avalia uma empresa individual para alocação de capital.
 *
 * Attractiveness = score composto que considera:
 * - Health Score (30%)
 * - Crescimento YoY (25%)
 * - Margem (25%)
 * - Eficiência operacional — EBITDA/receita (20%)
 *
 * Categorização:
 * - INVEST: attractiveness >= 65 E crescimento positivo
 * - DIVEST: attractiveness < 35 OU (EBITDA negativo E crescimento negativo)
 * - OPTIMIZE: demais
 */
function assessCompany(c: CompanyFinancialSnapshot): CompanyAssessment {
  const receita = Math.abs(c.receita_real) || 1;
  const efficiency = round2((c.ebitda / receita) * 100);

  // Score de atratividade composto
  const scoreNorm = clamp(c.health_score, 0, 100);
  const growthNorm = clamp(50 + c.growth_yoy * 2, 0, 100); // -25% → 0, 0% → 50, +25% → 100
  const marginNorm = clamp(c.margem_contribuicao_pct * 2, 0, 100); // 0% → 0, 50% → 100
  const efficiencyNorm = clamp(efficiency * 3, 0, 100); // 0% → 0, 33% → 100

  const attractiveness = round2(
    scoreNorm * 0.30 +
    growthNorm * 0.25 +
    marginNorm * 0.25 +
    efficiencyNorm * 0.20,
  );

  // Risco invertido da atratividade
  const risk = round2(100 - attractiveness);

  // Categorização
  let category: 'invest' | 'optimize' | 'divest';
  let rationale: string;

  if (c.ebitda < 0 && c.growth_yoy < -5) {
    category = 'divest';
    rationale = `EBITDA negativo (${round2(c.ebitda)}) com queda de ${round2(c.growth_yoy)}% — considerar desinvestimento`;
  } else if (attractiveness < 35) {
    category = 'divest';
    rationale = `Baixa atratividade (${attractiveness}/100): score ${c.health_score}, margem ${round2(c.margem_contribuicao_pct)}%, crescimento ${round2(c.growth_yoy)}%`;
  } else if (attractiveness >= 65 && c.growth_yoy > 0) {
    category = 'invest';
    rationale = `Alta atratividade (${attractiveness}/100): crescimento ${round2(c.growth_yoy)}%, margem saudável ${round2(c.margem_contribuicao_pct)}%`;
  } else if (attractiveness >= 65 && c.growth_yoy <= 0) {
    category = 'optimize';
    rationale = `Empresa sólida (${attractiveness}/100) mas crescimento estagnado (${round2(c.growth_yoy)}%) — otimizar para retomar expansão`;
  } else if (c.health_score >= 70 && c.margem_contribuicao_pct < 30) {
    category = 'optimize';
    rationale = `Score bom (${c.health_score}) mas margem baixa (${round2(c.margem_contribuicao_pct)}%) — focar em eficiência`;
  } else {
    category = 'optimize';
    rationale = `Atratividade moderada (${attractiveness}/100): espaço para melhorias em ${
      c.health_score < 70 ? 'score' : c.growth_yoy < 3 ? 'crescimento' : 'margem'
    }`;
  }

  return {
    organization_id: c.organization_id,
    display_name: c.display_name,
    score: c.health_score,
    growth: c.growth_yoy,
    margin: c.margem_contribuicao_pct,
    ebitda: c.ebitda,
    efficiency,
    attractiveness,
    risk,
    category,
    rationale,
  };
}

// --------------------------------------------
// Expected Impact
// --------------------------------------------

/**
 * Estima score esperado após ação recomendada.
 * Invest → score sobe ~5-10pts
 * Optimize → score sobe ~3-7pts
 * Divest → score não muda (empresa sai do portfólio)
 */
function estimateExpectedScore(assessment: CompanyAssessment): number {
  switch (assessment.category) {
    case 'invest':
      return clamp(Math.round(assessment.score + 5 + assessment.growth * 0.3), 0, 100);
    case 'optimize':
      return clamp(Math.round(assessment.score + 3 + Math.max(0, 50 - assessment.score) * 0.1), 0, 100);
    case 'divest':
      return assessment.score; // Sem melhoria esperada
  }
}

/**
 * Estima o ganho percentual do portfólio com alocação ótima.
 * Baseado na soma dos gaps (expected - current) ponderados pelo peso.
 */
function estimatePortfolioGain(
  assessments: CompanyAssessment[],
  companies: CompanyFinancialSnapshot[],
): { gain: number; riskAdjusted: number } {
  const totalWeight = companies.reduce((s, c) => s + c.portfolio_weight, 0) || 1;

  let weightedGain = 0;
  let weightedRisk = 0;

  for (let i = 0; i < assessments.length; i++) {
    const a = assessments[i];
    const c = companies[i];
    const normWeight = c.portfolio_weight / totalWeight;
    const expectedScore = estimateExpectedScore(a);
    const gain = expectedScore - a.score;

    weightedGain += gain * normWeight;
    weightedRisk += a.risk * normWeight;
  }

  // Risk-adjusted return: ganho reduzido pelo risco
  const riskFactor = 1 - (weightedRisk / 200); // risco 100 → fator 0.5
  const riskAdjusted = round2(weightedGain * Math.max(0.1, riskFactor));

  return {
    gain: round2(weightedGain),
    riskAdjusted,
  };
}

// --------------------------------------------
// Main: Recommend Capital Allocation
// --------------------------------------------

/**
 * Gera recomendações de alocação de capital para o portfólio.
 *
 * Processo:
 * 1. Avalia cada empresa (score, crescimento, margem, eficiência)
 * 2. Categoriza: invest / optimize / divest
 * 3. Prioriza ações por impacto esperado
 * 4. Estima ganho consolidado do portfólio
 *
 * Função PURA — zero I/O, zero side effects.
 * Cada empresa é avaliada independentemente (sem contaminação cruzada).
 *
 * @param companies - Array de snapshots financeiros (read-only)
 */
export function recommendCapitalAllocation(
  companies: CompanyFinancialSnapshot[],
): CapitalAllocationResult {
  if (companies.length === 0) {
    return {
      invest_more_in: [],
      optimize: [],
      divest: [],
      expected_portfolio_gain: 0,
      risk_adjusted_return: 0,
      summary: 'Nenhuma empresa no portfólio para análise.',
    };
  }

  // Filtrar CSCs — nao sao unidades de negocio, nao fazem sentido para alocacao de capital
  const businessUnits = companies.filter(c => !c.is_csc);

  if (businessUnits.length === 0) {
    return {
      invest_more_in: [],
      optimize: [],
      divest: [],
      expected_portfolio_gain: 0,
      risk_adjusted_return: 0,
      summary: 'Nenhuma unidade de negocio no portfolio para analise.',
    };
  }

  // 1. Avaliar cada empresa
  const assessments = businessUnits.map((c) => assessCompany(c));

  // 2. Categorizar e criar recomendações
  const invest: AllocationRecommendation[] = [];
  const optimize: AllocationRecommendation[] = [];
  const divest: AllocationRecommendation[] = [];

  for (const a of assessments) {
    const rec: AllocationRecommendation = {
      organization_id: a.organization_id,
      display_name: a.display_name,
      action: a.category === 'invest'
        ? 'Aumentar investimento'
        : a.category === 'optimize'
        ? 'Otimizar operação'
        : 'Considerar desinvestimento',
      rationale: a.rationale,
      current_score: a.score,
      expected_score: estimateExpectedScore(a),
      priority: 0, // preenchido após sort
    };

    switch (a.category) {
      case 'invest': invest.push(rec); break;
      case 'optimize': optimize.push(rec); break;
      case 'divest': divest.push(rec); break;
    }
  }

  // 3. Priorizar por impacto (gap entre expected e current)
  const sortByImpact = (a: AllocationRecommendation, b: AllocationRecommendation) =>
    (b.expected_score - b.current_score) - (a.expected_score - a.current_score);

  invest.sort(sortByImpact);
  optimize.sort(sortByImpact);
  divest.sort((a, b) => a.current_score - b.current_score); // Pior score primeiro

  // Atribuir prioridade
  invest.forEach((r, i) => { r.priority = i + 1; });
  optimize.forEach((r, i) => { r.priority = i + 1; });
  divest.forEach((r, i) => { r.priority = i + 1; });

  // 4. Estimar ganho do portfólio
  const { gain, riskAdjusted } = estimatePortfolioGain(assessments, businessUnits);

  // 5. Resumo executivo
  const summary = buildAllocationSummary(invest, optimize, divest, gain, riskAdjusted);

  return {
    invest_more_in: invest,
    optimize,
    divest,
    expected_portfolio_gain: gain,
    risk_adjusted_return: riskAdjusted,
    summary,
  };
}

function buildAllocationSummary(
  invest: AllocationRecommendation[],
  optimize: AllocationRecommendation[],
  divest: AllocationRecommendation[],
  gain: number,
  riskAdjusted: number,
): string {
  const parts: string[] = [];

  if (invest.length > 0) {
    parts.push(`${invest.length} empresa${invest.length > 1 ? 's' : ''} com potencial de investimento`);
  }
  if (optimize.length > 0) {
    parts.push(`${optimize.length} para otimização operacional`);
  }
  if (divest.length > 0) {
    parts.push(`${divest.length} candidata${divest.length > 1 ? 's' : ''} a desinvestimento`);
  }

  const gainStr = gain > 0
    ? `Ganho esperado de +${gain.toFixed(1)} pontos no score do portfólio`
    : gain < 0
    ? `Atenção: tendência de queda de ${gain.toFixed(1)} pontos`
    : 'Score estável';

  const riskStr = `(retorno ajustado ao risco: ${riskAdjusted > 0 ? '+' : ''}${riskAdjusted.toFixed(1)} pts)`;

  return `${parts.join(', ')}. ${gainStr} ${riskStr}.`;
}
