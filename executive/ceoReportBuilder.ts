// ============================================
// CEO Report Builder
// Gera relatório estruturado para board/diretoria
// Formato institucional, exportável para PDF
// Zero I/O — função pura
// ============================================

import type {
  ScoreResult,
  ForecastResult,
  OptimizationResult,
  MultiObjectiveResult,
  AlertDecision,
  FinancialMetrics,
} from '../core/decisionTypes';

import type {
  ExecutiveSummary,
  RiskLevel,
} from './executiveSummaryBuilder';

// --------------------------------------------
// Types
// --------------------------------------------

export interface ReportSection {
  number: number;
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

export interface BoardReadyReport {
  title: string;
  subtitle: string;
  generated_at: string;
  classification: string;
  score: number;
  sections: ReportSection[];
  decision_box: DecisionBox;
}

export interface DecisionBox {
  recommendation: string;
  urgency: 'imediata' | 'curto_prazo' | 'monitoramento';
  expected_outcome: string;
}

export interface BoardReportInput {
  summary: ExecutiveSummary;
  scoreResult: ScoreResult;
  metrics: FinancialMetrics;
  forecastResult: ForecastResult | null;
  optimizationResult: OptimizationResult | MultiObjectiveResult | null;
  alerts: AlertDecision[];
  reportDate: string; // ISO 8601
}

// --------------------------------------------
// Section Builders
// (Nenhum cálculo financeiro — apenas composição textual
// a partir de dados já processados pelo DecisionEngine)
// --------------------------------------------

/**
 * Seção 1: Situação Atual
 */
function buildSituacaoAtual(input: BoardReportInput): ReportSection {
  const { scoreResult, metrics, summary } = input;

  const healthDesc = scoreResult.classification === 'Saudável'
    ? 'A operação apresenta indicadores dentro dos parâmetros esperados, sem necessidade de intervenção imediata.'
    : scoreResult.classification === 'Atenção'
    ? 'Os indicadores financeiros encontram-se sob pressão, demandando monitoramento próximo e ações corretivas pontuais.'
    : 'A operação encontra-se em estado crítico, com indicadores significativamente abaixo dos parâmetros aceitáveis. Intervenção imediata é recomendada.';

  const driversText = summary.main_drivers
    .map((d) => `• ${d.label}: ${d.impact}`)
    .join('\n');

  return {
    number: 1,
    title: 'Situação Atual',
    content: `Health Score: ${scoreResult.score}/100 (${scoreResult.classification}). ${healthDesc}`,
    subsections: [
      {
        title: 'Indicadores Principais',
        content: `EBITDA Acumulado: R$ ${fmtNumber(metrics.ebitda)}\nMargem de Contribuição: ${fmtPct(metrics.margin)}\nMargem Absoluta: R$ ${fmtNumber(metrics.margin_absolute)}`,
      },
      {
        title: 'Drivers do Score',
        content: driversText || 'Nenhum driver negativo identificado.',
      },
    ],
  };
}

/**
 * Seção 2: Riscos
 */
function buildRiscos(input: BoardReportInput): ReportSection {
  const { summary, alerts } = input;
  const criticalCount = alerts.filter((a) => a.severity === 'high').length;
  const mediumCount = alerts.filter((a) => a.severity === 'medium').length;

  const riskSummary = `Nível de risco geral: ${riskLevelPT(summary.risk_level)}. ${criticalCount} alerta(s) crítico(s) e ${mediumCount} alerta(s) de atenção identificados.`;

  const riskDetails = summary.top_risks.length > 0
    ? summary.top_risks.map((r) => `• [${r.severity.toUpperCase()}] ${r.description}`).join('\n')
    : 'Nenhum risco significativo identificado no período.';

  return {
    number: 2,
    title: 'Riscos',
    content: riskSummary,
    subsections: [
      {
        title: 'Detalhamento de Riscos',
        content: riskDetails,
      },
    ],
  };
}

/**
 * Seção 3: Projeção
 */
function buildProjecao(input: BoardReportInput): ReportSection {
  const { forecastResult } = input;

  if (!forecastResult) {
    return {
      number: 3,
      title: 'Projeção',
      content: 'Dados insuficientes para projeção. Recomenda-se aguardar pelo menos 3 ciclos de dados para habilitar o forecast.',
    };
  }

  const trendDirection = forecastResult.slope.score > 0
    ? 'melhoria'
    : forecastResult.slope.score < 0
    ? 'deterioração'
    : 'estabilidade';

  const projectedScores = forecastResult.forecast.score
    .map((s) => Math.round(s))
    .join(' → ');

  return {
    number: 3,
    title: 'Projeção',
    content: `Tendência de ${trendDirection} identificada nos próximos 3 ciclos.`,
    subsections: [
      {
        title: 'Score Projetado',
        content: `Próximos 3 períodos: ${projectedScores}`,
      },
      {
        title: 'EBITDA Projetado',
        content: `Próximos 3 períodos: ${forecastResult.forecast.ebitda.map((e) => `R$ ${fmtNumber(e)}`).join(' → ')}`,
      },
      {
        title: 'Avaliação de Risco',
        content: forecastResult.risk_assessment,
      },
    ],
  };
}

/**
 * Seção 4: Plano Ótimo
 */
function buildPlanoOtimo(input: BoardReportInput): ReportSection {
  const { optimizationResult } = input;

  if (!optimizationResult || optimizationResult.proposed_actions.length === 0) {
    return {
      number: 4,
      title: 'Plano de Otimização',
      content: 'Não foram identificadas oportunidades de otimização que justifiquem intervenção no momento. O score atual está dentro dos parâmetros esperados.',
    };
  }

  const totalCut = optimizationResult.proposed_actions.reduce(
    (sum, a) => sum + a.suggested_cut, 0,
  );

  const actionsText = optimizationResult.proposed_actions
    .slice(0, 5)
    .map((a, i) => `${i + 1}. ${a.area}: reduzir R$ ${fmtNumber(a.suggested_cut)} (prioridade: ${a.priority})`)
    .join('\n');

  return {
    number: 4,
    title: 'Plano de Otimização',
    content: `${optimizationResult.proposed_actions.length} ações identificadas com potencial de corte total de R$ ${fmtNumber(totalCut)}.`,
    subsections: [
      {
        title: 'Ações Prioritárias',
        content: actionsText,
      },
    ],
  };
}

/**
 * Seção 5: Impacto Esperado
 */
function buildImpactoEsperado(input: BoardReportInput): ReportSection {
  const { optimizationResult, scoreResult } = input;

  if (!optimizationResult) {
    return {
      number: 5,
      title: 'Impacto Esperado',
      content: `Score atual de ${scoreResult.score}/100 deve ser mantido com a operação corrente.`,
    };
  }

  const scoreGain = optimizationResult.projected_score - scoreResult.score;

  return {
    number: 5,
    title: 'Impacto Esperado',
    content: `Com a implementação do plano proposto:`,
    subsections: [
      {
        title: 'Score',
        content: `De ${scoreResult.score} para ${Math.round(optimizationResult.projected_score)} (${scoreGain > 0 ? '+' : ''}${Math.round(scoreGain)} pontos)`,
      },
      {
        title: 'EBITDA',
        content: `Projetado: R$ ${fmtNumber(optimizationResult.projected_ebitda)}`,
      },
      {
        title: 'Margem',
        content: `Projetada: ${fmtPct(optimizationResult.projected_margin)}`,
      },
    ],
  };
}

/**
 * Seção 6: Decisão Recomendada
 */
function buildDecisaoRecomendada(input: BoardReportInput): ReportSection {
  const { summary } = input;

  const actionsText = summary.optimal_actions.length > 0
    ? summary.optimal_actions.map((a) => `• ${a.action}`).join('\n')
    : '• Manter operação corrente e monitorar indicadores.';

  return {
    number: 6,
    title: 'Decisão Recomendada',
    content: actionsText,
  };
}

// --------------------------------------------
// Decision Box
// --------------------------------------------

function buildDecisionBox(input: BoardReportInput): DecisionBox {
  const { summary, scoreResult, optimizationResult } = input;

  let recommendation: string;
  let urgency: DecisionBox['urgency'];
  let expectedOutcome: string;

  if (summary.risk_level === 'critical') {
    recommendation = 'Implementar plano de ação imediato para reverter deterioração dos indicadores financeiros.';
    urgency = 'imediata';
    expectedOutcome = optimizationResult
      ? `Score projetado de ${Math.round(optimizationResult.projected_score)} após implementação.`
      : `Estabilização do score em patamares acima de 70 pontos.`;
  } else if (summary.risk_level === 'high') {
    recommendation = 'Aprovar plano de otimização e iniciar implementação nas áreas de maior impacto.';
    urgency = 'curto_prazo';
    expectedOutcome = optimizationResult
      ? `Melhoria projetada de ${Math.round(optimizationResult.projected_score - scoreResult.score)} pontos no score.`
      : 'Recuperação gradual dos indicadores nos próximos 2-3 ciclos.';
  } else if (summary.risk_level === 'medium') {
    recommendation = 'Monitorar indicadores com atenção e preparar ações preventivas para as áreas identificadas.';
    urgency = 'curto_prazo';
    expectedOutcome = 'Manutenção do score acima de 70 com tendência de melhoria gradual.';
  } else {
    recommendation = 'Manter curso operacional atual. Indicadores saudáveis, sem necessidade de intervenção.';
    urgency = 'monitoramento';
    expectedOutcome = `Score de ${scoreResult.score} deve se manter estável nos próximos ciclos.`;
  }

  return { recommendation, urgency, expected_outcome: expectedOutcome };
}

// --------------------------------------------
// Main Builder
// --------------------------------------------

/**
 * Gera relatório estruturado pronto para board/diretoria.
 *
 * Função pura — zero I/O.
 * Formato de 6 seções conforme padrão institucional.
 * Exportável para PDF futuramente.
 */
export function generateBoardReadyReport(input: BoardReportInput): BoardReadyReport {
  const date = new Date(input.reportDate);
  const dateStr = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const sections: ReportSection[] = [
    buildSituacaoAtual(input),
    buildRiscos(input),
    buildProjecao(input),
    buildPlanoOtimo(input),
    buildImpactoEsperado(input),
    buildDecisaoRecomendada(input),
  ];

  const decisionBox = buildDecisionBox(input);

  return {
    title: 'Relatório Executivo — Saúde Financeira',
    subtitle: `Período de referência: ${dateStr}`,
    generated_at: new Date(input.reportDate).toISOString(),
    classification: input.scoreResult.classification,
    score: input.scoreResult.score,
    sections,
    decision_box: decisionBox,
  };
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function riskLevelPT(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'Baixo';
    case 'medium': return 'Moderado';
    case 'high': return 'Alto';
    case 'critical': return 'Crítico';
  }
}
