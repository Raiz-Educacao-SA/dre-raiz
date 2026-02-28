// ============================================
// Monthly Decision Ritual
// Estrutura formal do rito mensal de decisão executiva
// Define agenda, ordem de apresentação, deliberação e registro
// Zero I/O — função pura
// ============================================

import type { ExecutiveSummary } from './executiveSummaryBuilder';
import type { BoardReadyReport, DecisionBox } from './ceoReportBuilder';

// --------------------------------------------
// Types
// --------------------------------------------

export interface RitualAgenda {
  title: string;
  duration_minutes: number;
  frequency: 'mensal';
  participants: string[];
  items: AgendaItem[];
}

export interface AgendaItem {
  order: number;
  topic: string;
  presenter: string;
  duration_minutes: number;
  data_source: string;
  decision_required: boolean;
  description: string;
}

export interface DeliberationRecord {
  meeting_date: string;
  participants: string[];
  agenda_items_discussed: DeliberationItem[];
  formal_decisions: FormalDecision[];
  next_review_date: string;
  minutes_by: string;
}

export interface DeliberationItem {
  topic: string;
  summary: string;
  concerns_raised: string[];
  resolution: string;
}

export interface FormalDecision {
  decision_id: string;
  description: string;
  type: 'approval' | 'rejection' | 'override' | 'deferral';
  justification: string;
  responsible: string;
  deadline: string;
  follow_up_action: string;
}

export interface BoardDeckSlide {
  slide_number: number;
  title: string;
  content_type: 'score' | 'risk' | 'trend' | 'optimization' | 'decision' | 'actions' | 'cover' | 'overrides';
  content: Record<string, unknown>;
}

export interface MonthlyBoardDeck {
  title: string;
  subtitle: string;
  generated_at: string;
  period: string;
  slides: BoardDeckSlide[];
}

// --------------------------------------------
// Agenda Padrão
// --------------------------------------------

/**
 * Retorna a agenda padrão do rito mensal executivo.
 * Ordem de apresentação: Score → Risco → Tendência → Plano Ótimo → Decisão.
 */
export function getStandardAgenda(): RitualAgenda {
  return {
    title: 'Rito Mensal de Decisão Financeira',
    duration_minutes: 60,
    frequency: 'mensal',
    participants: [
      'CEO',
      'CFO (Executive Owner)',
      'CTO (Model Owner)',
      'Controller (Operational Owner)',
      'Diretores de Unidade',
    ],
    items: [
      {
        order: 1,
        topic: 'Health Score — Visão Geral',
        presenter: 'Controller',
        duration_minutes: 10,
        data_source: 'CEO Dashboard → Health Score + Classificação',
        decision_required: false,
        description: 'Apresentação do Health Score atual (0-100), classificação (Saudável/Atenção/Crítico), e comparação com mês anterior. Identificação dos principais drivers de penalidade.',
      },
      {
        order: 2,
        topic: 'Análise de Riscos',
        presenter: 'Controller',
        duration_minutes: 10,
        data_source: 'CEO Dashboard → Alertas + Riscos',
        decision_required: false,
        description: 'Apresentação dos alertas ativos (críticos, médios, baixos). Comparação com alertas do mês anterior. Riscos de tendência (score em queda, margem em deterioração).',
      },
      {
        order: 3,
        topic: 'Tendência e Projeção',
        presenter: 'CTO',
        duration_minutes: 10,
        data_source: 'CEO Dashboard → Forecast + Tendência 6 meses',
        decision_required: false,
        description: 'Projeção do score e EBITDA para os próximos 3 ciclos. Análise de tendência dos últimos 6 meses. Avaliação da confiabilidade do forecast.',
      },
      {
        order: 4,
        topic: 'Plano Ótimo de Ação',
        presenter: 'CFO',
        duration_minutes: 15,
        data_source: 'CEO Dashboard → Otimização + Ações Prioritárias',
        decision_required: true,
        description: 'Apresentação do plano de otimização gerado pelo sistema. Ações prioritárias com cortes sugeridos. Impacto projetado no score e EBITDA. DECISÃO FORMAL: aprovar, modificar ou rejeitar plano.',
      },
      {
        order: 5,
        topic: 'Deliberação e Registro',
        presenter: 'CEO',
        duration_minutes: 10,
        data_source: 'Ata formal',
        decision_required: true,
        description: 'Registro formal de todas as decisões tomadas. Definição de responsáveis e prazos. Revisão de overrides pendentes do mês anterior. Próxima data de revisão.',
      },
      {
        order: 6,
        topic: 'Revisão de Overrides',
        presenter: 'CFO',
        duration_minutes: 5,
        data_source: 'decision_audit_trail WHERE action_type = "override"',
        decision_required: true,
        description: 'Revisão obrigatória de todos os overrides realizados desde a última reunião. Validar se justificativas permanecem válidas. Registrar decisão de manter ou reverter.',
      },
    ],
  };
}

// --------------------------------------------
// Board Deck Generator
// --------------------------------------------

export interface BoardDeckInput {
  summary: ExecutiveSummary;
  report: BoardReadyReport;
  previousScore: number | null;
  previousRiskLevel: string | null;
  pendingOverrides: number;
  period: string;
}

/**
 * Gera deck de apresentação para o rito mensal.
 * Função pura — zero I/O.
 * Consome dados já processados pelo CEO Dashboard + CEO Report Builder.
 */
export function generateMonthlyBoardDeck(input: BoardDeckInput): MonthlyBoardDeck {
  const { summary, report, previousScore, previousRiskLevel, pendingOverrides, period } = input;

  const slides: BoardDeckSlide[] = [];

  // Slide 1: Capa
  slides.push({
    slide_number: 1,
    title: 'Rito Mensal de Decisão Financeira',
    content_type: 'cover',
    content: {
      organization: 'Raiz Educação S.A.',
      period,
      generated_at: report.generated_at,
      classification: report.classification,
      score: report.score,
    },
  });

  // Slide 2: Health Score
  const scoreDelta = previousScore !== null ? summary.overall_health_score - previousScore : null;
  slides.push({
    slide_number: 2,
    title: 'Health Score — Situação Atual',
    content_type: 'score',
    content: {
      current_score: summary.overall_health_score,
      previous_score: previousScore,
      delta: scoreDelta,
      classification: report.classification,
      confidence: summary.confidence_level,
      drivers: summary.main_drivers.map((d) => ({
        label: d.label,
        impact: d.impact,
        direction: d.direction,
      })),
    },
  });

  // Slide 3: Riscos
  const riskLevelChanged = previousRiskLevel !== null && previousRiskLevel !== summary.risk_level;
  slides.push({
    slide_number: 3,
    title: 'Análise de Riscos',
    content_type: 'risk',
    content: {
      risk_level: summary.risk_level,
      previous_risk_level: previousRiskLevel,
      risk_level_changed: riskLevelChanged,
      top_risks: summary.top_risks.map((r) => ({
        severity: r.severity,
        description: r.description,
      })),
    },
  });

  // Slide 4: Tendência
  slides.push({
    slide_number: 4,
    title: 'Tendência e Projeção',
    content_type: 'trend',
    content: {
      narrative: summary.executive_narrative
        .filter((p) => p.section === 'forecast')
        .map((p) => p.text),
    },
  });

  // Slide 5: Plano Ótimo
  slides.push({
    slide_number: 5,
    title: 'Plano Ótimo de Ação',
    content_type: 'optimization',
    content: {
      actions: summary.optimal_actions.map((a) => ({
        action: a.action,
        impact: a.expected_impact,
        priority: a.priority,
      })),
      decision_box: {
        recommendation: report.decision_box.recommendation,
        urgency: report.decision_box.urgency,
        expected_outcome: report.decision_box.expected_outcome,
      },
    },
  });

  // Slide 6: Overrides Pendentes
  slides.push({
    slide_number: 6,
    title: 'Revisão de Overrides',
    content_type: 'overrides',
    content: {
      pending_count: pendingOverrides,
      message: pendingOverrides > 0
        ? `${pendingOverrides} override(s) realizado(s) desde a última reunião requerem revisão formal.`
        : 'Nenhum override pendente de revisão.',
    },
  });

  // Slide 7: Decisão Formal
  slides.push({
    slide_number: 7,
    title: 'Deliberação e Registro',
    content_type: 'decision',
    content: {
      template: {
        decisions_to_record: [
          'Aprovação/rejeição do plano de otimização',
          'Resolução dos overrides pendentes',
          'Ações corretivas com responsáveis e prazos',
        ],
        fields_required: [
          'Decisão (aprovação/rejeição/override/adiamento)',
          'Justificativa (mínimo 30 caracteres)',
          'Responsável pela execução',
          'Prazo de conclusão',
          'Ação de follow-up',
        ],
      },
    },
  });

  return {
    title: 'Rito Mensal de Decisão Financeira',
    subtitle: `Período: ${period} — Raiz Educação S.A.`,
    generated_at: new Date().toISOString(),
    period,
    slides,
  };
}

// --------------------------------------------
// Deliberation Record Template
// --------------------------------------------

/**
 * Cria template vazio de ata de deliberação para preenchimento.
 * Função pura — zero I/O.
 */
export function createDeliberationTemplate(
  meetingDate: string,
  participants: string[],
  nextReviewDate: string,
  minutesBy: string,
): DeliberationRecord {
  return {
    meeting_date: meetingDate,
    participants,
    agenda_items_discussed: [],
    formal_decisions: [],
    next_review_date: nextReviewDate,
    minutes_by: minutesBy,
  };
}
