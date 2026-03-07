// ============================================
// Equipe Financeira 2.0 — Zod Schemas + JSON Schemas
// Equipe Alpha: Alex, Bruna, Carlos, Denilson, Edmundo, Falcão
// ============================================

import { z } from 'zod';

// --------------------------------------------
// FinancialSummary (validação do buildFinancialSummary)
// --------------------------------------------

const ScenarioValuesSchema = z.object({
  real: z.number(),
  orcado: z.number(),
  a1: z.number(),
});

export const FinancialSummarySchema = z.object({
  periodo: z.string(),
  receita: ScenarioValuesSchema.extend({ gap_pct: z.number() }),
  custos_variaveis: ScenarioValuesSchema,
  custos_fixos: ScenarioValuesSchema,
  sga: ScenarioValuesSchema,
  rateio: ScenarioValuesSchema,
  margem_contribuicao: z.object({
    real: z.number(),
    orcado: z.number(),
    pct_real: z.number(),
    pct_orcado: z.number(),
    health: z.enum(['healthy', 'attention', 'critical']),
  }),
  ebitda: ScenarioValuesSchema.extend({ pct_real: z.number() }),
  top5_variacoes: z.array(z.object({
    tag01: z.string(),
    real: z.number(),
    orcado: z.number(),
    delta_pct: z.number(),
  })),
  top5_tags01_receita: z.array(z.object({
    tag01: z.string(),
    total: z.number(),
  })),
  top5_tags01_custo: z.array(z.object({
    tag01: z.string(),
    total: z.number(),
  })),
  tendencia_mensal: z.array(z.object({
    mes: z.string(),
    receita: z.number(),
    ebitda: z.number(),
  })),
  top_fornecedores_por_tag01: z.array(z.object({
    tag01: z.string(),
    vendor: z.string(),
    total_real: z.number(),
  })).default([]),
});

// ============================================
// ALEX — Plan Output
// ============================================

export const SupervisorPlanOutputSchema = z.object({
  executive_summary: z.string(),
  key_findings: z.array(z.string()),
  priority_actions: z.array(z.string()),
  risks_identified: z.array(z.string()),
  assignments: z.array(z.object({
    agent_code: z.string(),
    objective: z.string(),
    focus_areas: z.array(z.string()),
  })),
});

export function supervisorPlanJsonSchema() {
  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      executive_summary: { type: 'string' as const },
      key_findings: { type: 'array' as const, items: { type: 'string' as const } },
      priority_actions: { type: 'array' as const, items: { type: 'string' as const } },
      risks_identified: { type: 'array' as const, items: { type: 'string' as const } },
      assignments: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            agent_code: { type: 'string' as const },
            objective: { type: 'string' as const },
            focus_areas: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['agent_code', 'objective', 'focus_areas'] as const,
        },
      },
    },
    required: ['executive_summary', 'key_findings', 'priority_actions', 'risks_identified', 'assignments'] as const,
  };
}

// ============================================
// BRUNA — Data Quality Output
// ============================================

const FragilityPointSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affected_area: z.string(),
  affected_tags: z.string().default(''),
  scenario_affected: z.string().default(''),
  probable_cause: z.string().default(''),
  suggested_fix: z.string().default(''),
  analysis_impact: z.string().default('low interpretation impact'),
});

const NormalizationActionSchema = z.object({
  action_title: z.string(),
  target_area: z.string(),
  issue_reference: z.string().default(''),
  priority: z.enum(['high', 'medium', 'low']),
  expected_benefit: z.string().default(''),
  owner_suggestion: z.string().default(''),
  dependency_level: z.string().default('none'),
});

const DataIntegrityRiskSummarySchema = z.object({
  overall_risk_level: z.string(),
  most_sensitive_areas: z.array(z.string()),
  impact_on_performance: z.string(),
  impact_on_optimization: z.string(),
  impact_on_forecast: z.string(),
  interpretive_caution: z.string(),
});

export const DataQualityOutputSchema = z.object({
  executive_data_quality_summary: z.string(),
  quality_score: z.number().min(0).max(100),
  quality_classification: z.enum(['excelente', 'adequada', 'atenção', 'crítica']),
  fragility_points: z.array(FragilityPointSchema),
  normalization_actions: z.array(NormalizationActionSchema),
  data_integrity_risk_summary: DataIntegrityRiskSummarySchema,
  correction_needed: z.boolean(),
  recommended_caution_level: z.enum(['high_confidence', 'proceed_with_moderate_reservations', 'proceed_with_critical_reservations']),
  recommendation_to_proceed_with_reservations: z.boolean().default(true),
  rationale_for_recommendation: z.string(),
});

export function dataQualityJsonSchema() {
  const fragilityItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      type: { type: 'string' as const },
      description: { type: 'string' as const },
      severity: { type: 'string' as const, enum: ['low', 'medium', 'high', 'critical'] },
      affected_area: { type: 'string' as const },
      affected_tags: { type: 'string' as const },
      scenario_affected: { type: 'string' as const },
      probable_cause: { type: 'string' as const },
      suggested_fix: { type: 'string' as const },
      analysis_impact: { type: 'string' as const },
    },
    required: ['type', 'description', 'severity', 'affected_area'] as const,
  };

  const normalizationItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      action_title: { type: 'string' as const },
      target_area: { type: 'string' as const },
      issue_reference: { type: 'string' as const },
      priority: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
      expected_benefit: { type: 'string' as const },
      owner_suggestion: { type: 'string' as const },
      dependency_level: { type: 'string' as const },
    },
    required: ['action_title', 'target_area', 'priority'] as const,
  };

  const riskSummarySchema = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      overall_risk_level: { type: 'string' as const },
      most_sensitive_areas: { type: 'array' as const, items: { type: 'string' as const } },
      impact_on_performance: { type: 'string' as const },
      impact_on_optimization: { type: 'string' as const },
      impact_on_forecast: { type: 'string' as const },
      interpretive_caution: { type: 'string' as const },
    },
    required: ['overall_risk_level', 'most_sensitive_areas', 'impact_on_performance', 'impact_on_optimization', 'impact_on_forecast', 'interpretive_caution'] as const,
  };

  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      executive_data_quality_summary: { type: 'string' as const },
      quality_score: { type: 'number' as const },
      quality_classification: { type: 'string' as const, enum: ['excelente', 'adequada', 'atenção', 'crítica'] },
      fragility_points: { type: 'array' as const, items: fragilityItem },
      normalization_actions: { type: 'array' as const, items: normalizationItem },
      data_integrity_risk_summary: riskSummarySchema,
      correction_needed: { type: 'boolean' as const },
      recommended_caution_level: { type: 'string' as const, enum: ['high_confidence', 'proceed_with_moderate_reservations', 'proceed_with_critical_reservations'] },
      recommendation_to_proceed_with_reservations: { type: 'boolean' as const },
      rationale_for_recommendation: { type: 'string' as const },
    },
    required: ['executive_data_quality_summary', 'quality_score', 'quality_classification', 'fragility_points', 'normalization_actions', 'data_integrity_risk_summary', 'correction_needed', 'recommended_caution_level', 'recommendation_to_proceed_with_reservations', 'rationale_for_recommendation'] as const,
  };
}

// ============================================
// CARLOS — Performance Analysis Output
// ============================================

const VARIATION_NATURES = ['erro_de_orcamento', 'delta_operacional', 'descasamento_temporal', 'vazamento_entre_linhas', 'nao_recorrente', 'estrutural', 'possivel_erro_de_classificacao'] as const;
const EXEC_RELEVANCES = ['alta', 'media', 'baixa'] as const;
const RECURRENCE_EXPECTATIONS = ['deve_se_repetir', 'nao_deve_se_repetir', 'monitorar'] as const;

const DRELineAnalysisSchema = z.object({
  dre_line: z.string(),
  real_value: z.number(),
  budget_value: z.number(),
  a1_value: z.number(),
  gap_vs_budget_value: z.number(),
  gap_vs_budget_pct: z.number(),
  gap_vs_a1_value: z.number(),
  gap_vs_a1_pct: z.number(),
  main_tag01: z.string().default(''),
  main_tag02: z.string().default(''),
  main_tag03: z.string().default(''),
  main_supplier: z.string().default(''),
  main_description: z.string().default(''),
  deviation_explanation: z.string(),
  variation_nature: z.enum(VARIATION_NATURES).default('delta_operacional'),
  margin_impact: z.string().default(''),
  ebitda_impact: z.string().default(''),
  managerial_reading: z.string().default(''),
  suggested_analytical_action: z.string().default(''),
});

const RankedVariationSchema = z.object({
  ranking_position: z.number(),
  dre_line: z.string(),
  tag01: z.string(),
  tag02: z.string().default(''),
  tag03: z.string().default(''),
  real_value: z.number(),
  budget_value: z.number(),
  a1_value: z.number(),
  gap_vs_budget_value: z.number(),
  gap_vs_budget_pct: z.number(),
  gap_vs_a1_value: z.number(),
  gap_vs_a1_pct: z.number(),
  supplier_main_reference: z.string().default(''),
  description_main_reference: z.string().default(''),
  budget_cross_check: z.string().default(''),
  prior_year_classification_check: z.string().default(''),
  supplier_history_check: z.string().default(''),
  timing_assessment: z.string().default(''),
  leakage_assessment: z.string().default(''),
  cause_explanation: z.string(),
  variation_nature: z.enum(VARIATION_NATURES).default('delta_operacional'),
  margin_impact: z.string().default(''),
  ebitda_impact: z.string().default(''),
  recurrence_expectation: z.enum(RECURRENCE_EXPECTATIONS).default('monitorar'),
  executive_relevance: z.enum(EXEC_RELEVANCES).default('media'),
  classification_review_suggestion_to_bruna: z.string().default(''),
});

const MarginEbitdaImpactSchema = z.object({
  margin_pressures: z.array(z.string()),
  margin_reliefs: z.array(z.string()),
  ebitda_pressures: z.array(z.string()),
  ebitda_reliefs: z.array(z.string()),
  consolidated_impact_reading: z.string(),
});

const RecommendedAnalyticalActionsSchema = z.object({
  items_to_deepen: z.array(z.string()),
  lines_to_monitor: z.array(z.string()),
  budget_assumptions_to_review: z.array(z.string()),
  points_to_validate_with_bruna: z.array(z.string()),
  reclassification_candidates: z.array(z.string()),
});

export const PerformanceAnalysisOutputSchema = z.object({
  executive_performance_summary: z.string(),
  dre_line_analysis: z.array(DRELineAnalysisSchema),
  ranked_variations: z.array(RankedVariationSchema),
  margin_ebitda_impact: MarginEbitdaImpactSchema,
  recommended_analytical_actions: RecommendedAnalyticalActionsSchema,
});

export function performanceJsonSchema() {
  const dreLineItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      dre_line: { type: 'string' as const },
      real_value: { type: 'number' as const },
      budget_value: { type: 'number' as const },
      a1_value: { type: 'number' as const },
      gap_vs_budget_value: { type: 'number' as const },
      gap_vs_budget_pct: { type: 'number' as const },
      gap_vs_a1_value: { type: 'number' as const },
      gap_vs_a1_pct: { type: 'number' as const },
      main_tag01: { type: 'string' as const },
      main_tag02: { type: 'string' as const },
      main_tag03: { type: 'string' as const },
      main_supplier: { type: 'string' as const },
      main_description: { type: 'string' as const },
      deviation_explanation: { type: 'string' as const },
      variation_nature: { type: 'string' as const, enum: [...VARIATION_NATURES] },
      margin_impact: { type: 'string' as const },
      ebitda_impact: { type: 'string' as const },
      managerial_reading: { type: 'string' as const },
      suggested_analytical_action: { type: 'string' as const },
    },
    required: ['dre_line', 'real_value', 'budget_value', 'a1_value', 'gap_vs_budget_value', 'gap_vs_budget_pct', 'gap_vs_a1_value', 'gap_vs_a1_pct', 'deviation_explanation'] as const,
  };

  const rankedItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      ranking_position: { type: 'number' as const },
      dre_line: { type: 'string' as const },
      tag01: { type: 'string' as const },
      tag02: { type: 'string' as const },
      tag03: { type: 'string' as const },
      real_value: { type: 'number' as const },
      budget_value: { type: 'number' as const },
      a1_value: { type: 'number' as const },
      gap_vs_budget_value: { type: 'number' as const },
      gap_vs_budget_pct: { type: 'number' as const },
      gap_vs_a1_value: { type: 'number' as const },
      gap_vs_a1_pct: { type: 'number' as const },
      supplier_main_reference: { type: 'string' as const },
      description_main_reference: { type: 'string' as const },
      budget_cross_check: { type: 'string' as const },
      prior_year_classification_check: { type: 'string' as const },
      supplier_history_check: { type: 'string' as const },
      timing_assessment: { type: 'string' as const },
      leakage_assessment: { type: 'string' as const },
      cause_explanation: { type: 'string' as const },
      variation_nature: { type: 'string' as const, enum: [...VARIATION_NATURES] },
      margin_impact: { type: 'string' as const },
      ebitda_impact: { type: 'string' as const },
      recurrence_expectation: { type: 'string' as const, enum: [...RECURRENCE_EXPECTATIONS] },
      executive_relevance: { type: 'string' as const, enum: [...EXEC_RELEVANCES] },
      classification_review_suggestion_to_bruna: { type: 'string' as const },
    },
    required: ['ranking_position', 'dre_line', 'tag01', 'real_value', 'budget_value', 'a1_value', 'gap_vs_budget_value', 'gap_vs_budget_pct', 'cause_explanation', 'variation_nature'] as const,
  };

  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      executive_performance_summary: { type: 'string' as const },
      dre_line_analysis: { type: 'array' as const, items: dreLineItem },
      ranked_variations: { type: 'array' as const, items: rankedItem },
      margin_ebitda_impact: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          margin_pressures: { type: 'array' as const, items: { type: 'string' as const } },
          margin_reliefs: { type: 'array' as const, items: { type: 'string' as const } },
          ebitda_pressures: { type: 'array' as const, items: { type: 'string' as const } },
          ebitda_reliefs: { type: 'array' as const, items: { type: 'string' as const } },
          consolidated_impact_reading: { type: 'string' as const },
        },
        required: ['margin_pressures', 'margin_reliefs', 'ebitda_pressures', 'ebitda_reliefs', 'consolidated_impact_reading'] as const,
      },
      recommended_analytical_actions: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          items_to_deepen: { type: 'array' as const, items: { type: 'string' as const } },
          lines_to_monitor: { type: 'array' as const, items: { type: 'string' as const } },
          budget_assumptions_to_review: { type: 'array' as const, items: { type: 'string' as const } },
          points_to_validate_with_bruna: { type: 'array' as const, items: { type: 'string' as const } },
          reclassification_candidates: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['items_to_deepen', 'lines_to_monitor', 'budget_assumptions_to_review', 'points_to_validate_with_bruna', 'reclassification_candidates'] as const,
      },
    },
    required: ['executive_performance_summary', 'dre_line_analysis', 'ranked_variations', 'margin_ebitda_impact', 'recommended_analytical_actions'] as const,
  };
}

// ============================================
// DENILSON — Optimization Output
// ============================================

const OPT_ACTION_TYPES = ['reduce_cost', 'revise_allocation', 'renegotiate', 'remove_non_recurring_pressure', 'correct_operational_premise', 'optimize_mix', 'monitor_only', 'reframe_budget_line'] as const;
const IMPACT_TYPES = ['real_financial_gain', 'analytical_reframing', 'operational_efficiency_gain', 'mixed_effect'] as const;
const IMPL_PRIORITIES = ['immediate', 'high', 'medium', 'low'] as const;
const FEASIBILITY_LEVELS = ['high', 'medium', 'low'] as const;
const EXEC_COMPLEXITIES = ['low', 'medium', 'high'] as const;

const ProposedActionSchema = z.object({
  action_title: z.string(),
  action_type: z.enum(OPT_ACTION_TYPES).default('reduce_cost'),
  target_dre_line: z.string().default(''),
  target_tag01: z.string().default(''),
  target_tag02: z.string().default(''),
  target_tag03: z.string().default(''),
  rationale: z.string(),
  expected_impact_ebitda: z.number(),
  expected_impact_margin: z.number(),
  expected_impact_score: z.number().default(0),
  expected_impact_efficiency: z.string().default(''),
  impact_type: z.enum(IMPACT_TYPES).default('real_financial_gain'),
  implementation_priority: z.enum(IMPL_PRIORITIES).default('medium'),
  feasibility_level: z.enum(FEASIBILITY_LEVELS).default('medium'),
  execution_complexity: z.enum(EXEC_COMPLEXITIES).default('medium'),
  does_improve_real_result: z.boolean().default(true),
  does_improve_analytical_framing_only: z.boolean().default(false),
  recommended_owner: z.string().default(''),
  observation: z.string().default(''),
});

const BrandActionPlanSchema = z.object({
  brand_name: z.string(),
  objective_of_plan: z.string(),
  current_main_issues: z.array(z.string()),
  proposed_actions: z.array(ProposedActionSchema),
  expected_gain_summary: z.string(),
  notes_for_risk_review: z.string().default(''),
  notes_for_alex_consolidation: z.string().default(''),
});

export const OptimizationOutputSchema = z.object({
  brand_plans: z.array(BrandActionPlanSchema),
  optimization_summary: z.object({
    optimization_objective: z.string(),
    main_levers: z.array(z.string()),
    best_plan_synthesis: z.string(),
    expected_gain_by_brand: z.array(z.string()),
    feasibility_readings: z.array(z.string()),
    consolidation_notes: z.string().default(''),
  }),
  constraints_feasibility: z.object({
    operational_constraints: z.array(z.string()),
    practical_limits: z.array(z.string()),
    low_feasibility_actions: z.array(z.string()),
    attention_items: z.array(z.string()),
    items_for_falcao_risk_review: z.array(z.string()),
  }),
  estimated_impact: z.object({
    total_ebitda_impact: z.number(),
    total_margin_impact: z.number(),
    total_score_impact: z.number().default(0),
    total_efficiency_impact: z.string().default(''),
    impact_by_brand: z.array(z.object({
      brand_name: z.string(),
      ebitda_impact: z.number(),
      margin_impact: z.number(),
      score_impact: z.number().default(0),
    })),
    real_gain_total: z.number().default(0),
    analytical_reframing_total: z.number().default(0),
    mixed_gain_total: z.number().default(0),
  }),
  action_prioritization_matrix: z.array(z.object({
    action_title: z.string(),
    brand: z.string(),
    expected_impact: z.string(),
    priority: z.enum(IMPL_PRIORITIES).default('medium'),
    feasibility: z.enum(FEASIBILITY_LEVELS).default('medium'),
    complexity: z.enum(EXEC_COMPLEXITIES).default('medium'),
    gain_type: z.enum(IMPACT_TYPES).default('real_financial_gain'),
    implementation_note: z.string().default(''),
  })),
});

export function optimizationJsonSchema() {
  const actionItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      action_title: { type: 'string' as const },
      action_type: { type: 'string' as const, enum: [...OPT_ACTION_TYPES] },
      target_dre_line: { type: 'string' as const },
      target_tag01: { type: 'string' as const },
      target_tag02: { type: 'string' as const },
      target_tag03: { type: 'string' as const },
      rationale: { type: 'string' as const },
      expected_impact_ebitda: { type: 'number' as const },
      expected_impact_margin: { type: 'number' as const },
      expected_impact_score: { type: 'number' as const },
      expected_impact_efficiency: { type: 'string' as const },
      impact_type: { type: 'string' as const, enum: [...IMPACT_TYPES] },
      implementation_priority: { type: 'string' as const, enum: [...IMPL_PRIORITIES] },
      feasibility_level: { type: 'string' as const, enum: [...FEASIBILITY_LEVELS] },
      execution_complexity: { type: 'string' as const, enum: [...EXEC_COMPLEXITIES] },
      does_improve_real_result: { type: 'boolean' as const },
      does_improve_analytical_framing_only: { type: 'boolean' as const },
      recommended_owner: { type: 'string' as const },
      observation: { type: 'string' as const },
    },
    required: ['action_title', 'rationale', 'expected_impact_ebitda', 'expected_impact_margin'] as const,
  };

  const brandPlanItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      brand_name: { type: 'string' as const },
      objective_of_plan: { type: 'string' as const },
      current_main_issues: { type: 'array' as const, items: { type: 'string' as const } },
      proposed_actions: { type: 'array' as const, items: actionItem },
      expected_gain_summary: { type: 'string' as const },
      notes_for_risk_review: { type: 'string' as const },
      notes_for_alex_consolidation: { type: 'string' as const },
    },
    required: ['brand_name', 'objective_of_plan', 'current_main_issues', 'proposed_actions', 'expected_gain_summary'] as const,
  };

  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      brand_plans: { type: 'array' as const, items: brandPlanItem },
      optimization_summary: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          optimization_objective: { type: 'string' as const },
          main_levers: { type: 'array' as const, items: { type: 'string' as const } },
          best_plan_synthesis: { type: 'string' as const },
          expected_gain_by_brand: { type: 'array' as const, items: { type: 'string' as const } },
          feasibility_readings: { type: 'array' as const, items: { type: 'string' as const } },
          consolidation_notes: { type: 'string' as const },
        },
        required: ['optimization_objective', 'main_levers', 'best_plan_synthesis', 'expected_gain_by_brand', 'feasibility_readings'] as const,
      },
      constraints_feasibility: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          operational_constraints: { type: 'array' as const, items: { type: 'string' as const } },
          practical_limits: { type: 'array' as const, items: { type: 'string' as const } },
          low_feasibility_actions: { type: 'array' as const, items: { type: 'string' as const } },
          attention_items: { type: 'array' as const, items: { type: 'string' as const } },
          items_for_falcao_risk_review: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['operational_constraints', 'practical_limits', 'low_feasibility_actions', 'attention_items', 'items_for_falcao_risk_review'] as const,
      },
      estimated_impact: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          total_ebitda_impact: { type: 'number' as const },
          total_margin_impact: { type: 'number' as const },
          total_score_impact: { type: 'number' as const },
          total_efficiency_impact: { type: 'string' as const },
          impact_by_brand: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: false, properties: { brand_name: { type: 'string' as const }, ebitda_impact: { type: 'number' as const }, margin_impact: { type: 'number' as const }, score_impact: { type: 'number' as const } }, required: ['brand_name', 'ebitda_impact', 'margin_impact'] as const } },
          real_gain_total: { type: 'number' as const },
          analytical_reframing_total: { type: 'number' as const },
          mixed_gain_total: { type: 'number' as const },
        },
        required: ['total_ebitda_impact', 'total_margin_impact', 'impact_by_brand'] as const,
      },
      action_prioritization_matrix: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            action_title: { type: 'string' as const },
            brand: { type: 'string' as const },
            expected_impact: { type: 'string' as const },
            priority: { type: 'string' as const, enum: [...IMPL_PRIORITIES] },
            feasibility: { type: 'string' as const, enum: [...FEASIBILITY_LEVELS] },
            complexity: { type: 'string' as const, enum: [...EXEC_COMPLEXITIES] },
            gain_type: { type: 'string' as const, enum: [...IMPACT_TYPES] },
            implementation_note: { type: 'string' as const },
          },
          required: ['action_title', 'brand', 'expected_impact', 'priority'] as const,
        },
      },
    },
    required: ['brand_plans', 'optimization_summary', 'constraints_feasibility', 'estimated_impact', 'action_prioritization_matrix'] as const,
  };
}

// ============================================
// EDMUNDO — Forecast Output
// ============================================

const TAG_CLASSIFICATIONS = ['opportunity', 'risk'] as const;
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

const ScenarioCaseSchema = z.object({
  label: z.string(),
  description: z.string(),
  projected_ebitda: z.number(),
  projected_margin: z.number(),
  projected_revenue: z.number(),
  key_assumptions: z.array(z.string()),
});

const BrandProjectionSchema = z.object({
  brand_name: z.string(),
  current_position_summary: z.string(),
  year_end_projection: z.string(),
  projected_ebitda: z.number().default(0),
  projected_margin: z.number().default(0),
  projected_score: z.number().default(0),
  projected_efficiency: z.string().default(''),
  projection_narrative: z.string(),
  main_dependencies: z.array(z.string()),
  main_uncertainties: z.array(z.string()),
  base_case: ScenarioCaseSchema,
  target_case: ScenarioCaseSchema,
  stress_case: ScenarioCaseSchema,
});

const OutlierEntrySchema = z.object({
  event_description: z.string(),
  month: z.string(),
  impact_value: z.number().default(0),
  justification_for_removal: z.string(),
});

const TagOpportunityRiskSchema = z.object({
  tag_level: z.string(),
  tag_name: z.string(),
  classification: z.enum(TAG_CLASSIFICATIONS),
  rationale: z.string(),
  projected_effect_on_year_end: z.string(),
  executable_action_plan: z.string(),
  urgency: z.string().default(''),
  dependency: z.string().default(''),
  confidence_level_for_tag: z.enum(CONFIDENCE_LEVELS).default('medium'),
  if_executed_expected_effect: z.string().default(''),
  if_not_executed_expected_effect: z.string().default(''),
});

const TagGapBreakdownSchema = z.object({
  tag: z.string(),
  contribution_to_gap: z.number(),
  whether_gap_is_recoverable: z.boolean().default(true),
  action_needed: z.string(),
});

const BrandGapSchema = z.object({
  brand_name: z.string(),
  target_year_end_value: z.number(),
  projected_year_end_value: z.number(),
  gap_to_target: z.number(),
  gap_breakdown_by_tag: z.array(TagGapBreakdownSchema),
  required_deliverables_to_close_gap: z.array(z.string()),
  milestone_expectations: z.string().default(''),
  execution_dependencies: z.array(z.string()),
  comments_on_feasibility: z.string().default(''),
});

const SacrificeEntrySchema = z.object({
  description: z.string(),
  rationale: z.string(),
  expected_benefit_if_sustained: z.string(),
  risk_if_not_accepted: z.string(),
});

const TagConfidenceSchema = z.object({
  tag_name: z.string(),
  confidence_level: z.enum(CONFIDENCE_LEVELS),
  rationale: z.string(),
});

export const ForecastOutputSchema = z.object({
  brand_projections: z.array(BrandProjectionSchema),
  adjusted_year_end_curve: z.object({
    original_curve: z.string(),
    identified_outliers: z.array(OutlierEntrySchema),
    outlier_adjustment_rationale: z.string(),
    adjusted_curve: z.string(),
    year_end_adjusted_projection: z.string(),
    difference_between_original_and_adjusted_curve: z.string().default(''),
    interpretation_of_adjusted_trajectory: z.string(),
  }),
  tag_opportunity_risk_map: z.array(TagOpportunityRiskSchema),
  closing_gap_plan: z.object({
    brand_gaps: z.array(BrandGapSchema),
  }),
  sacrifice_map: z.object({
    commercial_sacrifices: z.array(SacrificeEntrySchema),
    operational_sacrifices: z.array(SacrificeEntrySchema),
    financial_sacrifices: z.array(SacrificeEntrySchema),
  }),
  confidence_report: z.object({
    brand_confidence_level: z.enum(CONFIDENCE_LEVELS),
    confidence_rationale: z.string(),
    factors_increasing_confidence: z.array(z.string()),
    factors_reducing_confidence: z.array(z.string()),
    tag_confidence_breakdown: z.array(TagConfidenceSchema),
    dependence_on_execution_level: z.string().default(''),
    sensitivity_to_data_quality: z.string().default(''),
    sensitivity_to_historical_stability: z.string().default(''),
  }),
  curve_confirmation_signals: z.object({
    confirmation_signals: z.array(z.string()),
    invalidation_signals: z.array(z.string()),
    monitoring_deadlines: z.array(z.string()),
    tags_requiring_confirmation: z.array(z.string()),
    projection_revision_triggers: z.array(z.string()),
  }),
});

export function forecastJsonSchema() {
  const scenarioCaseItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      label: { type: 'string' as const },
      description: { type: 'string' as const },
      projected_ebitda: { type: 'number' as const },
      projected_margin: { type: 'number' as const },
      projected_revenue: { type: 'number' as const },
      key_assumptions: { type: 'array' as const, items: { type: 'string' as const } },
    },
    required: ['label', 'description', 'projected_ebitda', 'projected_margin', 'projected_revenue'] as const,
  };

  const brandProjectionItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      brand_name: { type: 'string' as const },
      current_position_summary: { type: 'string' as const },
      year_end_projection: { type: 'string' as const },
      projected_ebitda: { type: 'number' as const },
      projected_margin: { type: 'number' as const },
      projected_score: { type: 'number' as const },
      projected_efficiency: { type: 'string' as const },
      projection_narrative: { type: 'string' as const },
      main_dependencies: { type: 'array' as const, items: { type: 'string' as const } },
      main_uncertainties: { type: 'array' as const, items: { type: 'string' as const } },
      base_case: scenarioCaseItem,
      target_case: scenarioCaseItem,
      stress_case: scenarioCaseItem,
    },
    required: ['brand_name', 'current_position_summary', 'year_end_projection', 'projection_narrative', 'base_case', 'target_case', 'stress_case'] as const,
  };

  const outlierItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      event_description: { type: 'string' as const },
      month: { type: 'string' as const },
      impact_value: { type: 'number' as const },
      justification_for_removal: { type: 'string' as const },
    },
    required: ['event_description', 'month', 'justification_for_removal'] as const,
  };

  const tagMapItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      tag_level: { type: 'string' as const },
      tag_name: { type: 'string' as const },
      classification: { type: 'string' as const, enum: [...TAG_CLASSIFICATIONS] },
      rationale: { type: 'string' as const },
      projected_effect_on_year_end: { type: 'string' as const },
      executable_action_plan: { type: 'string' as const },
      urgency: { type: 'string' as const },
      dependency: { type: 'string' as const },
      confidence_level_for_tag: { type: 'string' as const, enum: [...CONFIDENCE_LEVELS] },
      if_executed_expected_effect: { type: 'string' as const },
      if_not_executed_expected_effect: { type: 'string' as const },
    },
    required: ['tag_level', 'tag_name', 'classification', 'rationale', 'projected_effect_on_year_end', 'executable_action_plan'] as const,
  };

  const tagGapItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      tag: { type: 'string' as const },
      contribution_to_gap: { type: 'number' as const },
      whether_gap_is_recoverable: { type: 'boolean' as const },
      action_needed: { type: 'string' as const },
    },
    required: ['tag', 'contribution_to_gap', 'action_needed'] as const,
  };

  const brandGapItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      brand_name: { type: 'string' as const },
      target_year_end_value: { type: 'number' as const },
      projected_year_end_value: { type: 'number' as const },
      gap_to_target: { type: 'number' as const },
      gap_breakdown_by_tag: { type: 'array' as const, items: tagGapItem },
      required_deliverables_to_close_gap: { type: 'array' as const, items: { type: 'string' as const } },
      milestone_expectations: { type: 'string' as const },
      execution_dependencies: { type: 'array' as const, items: { type: 'string' as const } },
      comments_on_feasibility: { type: 'string' as const },
    },
    required: ['brand_name', 'target_year_end_value', 'projected_year_end_value', 'gap_to_target', 'gap_breakdown_by_tag'] as const,
  };

  const sacrificeItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      description: { type: 'string' as const },
      rationale: { type: 'string' as const },
      expected_benefit_if_sustained: { type: 'string' as const },
      risk_if_not_accepted: { type: 'string' as const },
    },
    required: ['description', 'rationale'] as const,
  };

  const tagConfidenceItem = {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      tag_name: { type: 'string' as const },
      confidence_level: { type: 'string' as const, enum: [...CONFIDENCE_LEVELS] },
      rationale: { type: 'string' as const },
    },
    required: ['tag_name', 'confidence_level', 'rationale'] as const,
  };

  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      brand_projections: { type: 'array' as const, items: brandProjectionItem },
      adjusted_year_end_curve: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          original_curve: { type: 'string' as const },
          identified_outliers: { type: 'array' as const, items: outlierItem },
          outlier_adjustment_rationale: { type: 'string' as const },
          adjusted_curve: { type: 'string' as const },
          year_end_adjusted_projection: { type: 'string' as const },
          difference_between_original_and_adjusted_curve: { type: 'string' as const },
          interpretation_of_adjusted_trajectory: { type: 'string' as const },
        },
        required: ['original_curve', 'identified_outliers', 'adjusted_curve', 'year_end_adjusted_projection', 'interpretation_of_adjusted_trajectory'] as const,
      },
      tag_opportunity_risk_map: { type: 'array' as const, items: tagMapItem },
      closing_gap_plan: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          brand_gaps: { type: 'array' as const, items: brandGapItem },
        },
        required: ['brand_gaps'] as const,
      },
      sacrifice_map: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          commercial_sacrifices: { type: 'array' as const, items: sacrificeItem },
          operational_sacrifices: { type: 'array' as const, items: sacrificeItem },
          financial_sacrifices: { type: 'array' as const, items: sacrificeItem },
        },
        required: ['commercial_sacrifices', 'operational_sacrifices', 'financial_sacrifices'] as const,
      },
      confidence_report: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          brand_confidence_level: { type: 'string' as const, enum: [...CONFIDENCE_LEVELS] },
          confidence_rationale: { type: 'string' as const },
          factors_increasing_confidence: { type: 'array' as const, items: { type: 'string' as const } },
          factors_reducing_confidence: { type: 'array' as const, items: { type: 'string' as const } },
          tag_confidence_breakdown: { type: 'array' as const, items: tagConfidenceItem },
          dependence_on_execution_level: { type: 'string' as const },
          sensitivity_to_data_quality: { type: 'string' as const },
          sensitivity_to_historical_stability: { type: 'string' as const },
        },
        required: ['brand_confidence_level', 'confidence_rationale', 'factors_increasing_confidence', 'factors_reducing_confidence', 'tag_confidence_breakdown'] as const,
      },
      curve_confirmation_signals: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          confirmation_signals: { type: 'array' as const, items: { type: 'string' as const } },
          invalidation_signals: { type: 'array' as const, items: { type: 'string' as const } },
          monitoring_deadlines: { type: 'array' as const, items: { type: 'string' as const } },
          tags_requiring_confirmation: { type: 'array' as const, items: { type: 'string' as const } },
          projection_revision_triggers: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['confirmation_signals', 'invalidation_signals', 'monitoring_deadlines'] as const,
      },
    },
    required: ['brand_projections', 'adjusted_year_end_curve', 'tag_opportunity_risk_map', 'closing_gap_plan', 'sacrifice_map', 'confidence_report', 'curve_confirmation_signals'] as const,
  };
}

// ============================================
// FALCÃO — Risk Output (7 entregáveis)
// ============================================

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const ALERT_TYPES = ['financial_execution_risk', 'school_operation_risk', 'family_experience_risk', 'reputation_risk', 'safety_risk', 'projection_fragility', 'plan_dependency_risk', 'second_order_effect'] as const;
const RISK_TYPES = ['financial', 'operational', 'reputational', 'school_operation', 'execution', 'projection', 'mixed'] as const;
const PLAN_SUSTAINABILITY = ['robust', 'acceptable_with_attention', 'fragile', 'critical'] as const;
const ACCEPTABILITY_LEVELS = ['acceptable', 'acceptable_with_mitigation', 'non_negotiable'] as const;

const RiskAlertSchema = z.object({
  alert_title: z.string(),
  alert_type: z.enum(ALERT_TYPES).default('financial_execution_risk'),
  severity: z.enum(RISK_LEVELS).default('medium'),
  probability: z.enum(['high', 'medium', 'low']).default('medium'),
  impact: z.string(),
  brand: z.string().default(''),
  related_tag: z.string().default(''),
  rationale: z.string(),
  mitigation: z.string().default(''),
  escalation_need: z.string().default(''),
});

const BrandRiskSchema = z.object({
  brand_name: z.string(),
  overall_risk_level: z.enum(RISK_LEVELS),
  risk_summary: z.string(),
  key_risk_drivers: z.array(z.string()),
  relation_to_plan_execution: z.string().default(''),
  relation_to_year_end_closing: z.string().default(''),
  relation_to_school_operation: z.string().default(''),
  relation_to_family_experience: z.string().default(''),
  relation_to_unit_safety: z.string().default(''),
  key_points_for_executive_attention: z.array(z.string()),
});

const TagRiskSchema = z.object({
  tag_level: z.string(),
  tag_name: z.string(),
  risk_type: z.enum(RISK_TYPES).default('financial'),
  severity: z.enum(RISK_LEVELS).default('medium'),
  probability: z.enum(['high', 'medium', 'low']).default('medium'),
  impact_on_year_end: z.string(),
  impact_on_operation: z.string().default(''),
  impact_on_student_experience: z.string().default(''),
  impact_on_family_perception: z.string().default(''),
  impact_on_unit_safety: z.string().default(''),
  rationale: z.string(),
  mitigation: z.string().default(''),
  escalation_trigger: z.string().default(''),
});

const RiskAcceptabilitySchema = z.object({
  risk_name: z.string(),
  brand: z.string(),
  acceptability_level: z.enum(ACCEPTABILITY_LEVELS),
  school_operation_sensitivity: z.enum(RISK_LEVELS).default('low'),
  second_order_effect: z.string().default(''),
  minimum_mitigation_required: z.string(),
  review_trigger: z.string().default(''),
  escalation_trigger: z.string().default(''),
  stop_trigger: z.string().default(''),
});

export const RiskOutputSchema = z.object({
  risk_exposure_by_brand: z.array(BrandRiskSchema),
  critical_alerts_pack: z.object({
    critical_alerts: z.array(RiskAlertSchema),
    high_alerts: z.array(RiskAlertSchema),
    medium_alerts: z.array(RiskAlertSchema),
    low_alerts: z.array(RiskAlertSchema),
  }),
  tag_risk_map: z.array(TagRiskSchema),
  plan_sustainability_review: z.object({
    plan_sustainability_level: z.enum(PLAN_SUSTAINABILITY),
    main_fragilities_of_plan: z.array(z.string()),
    execution_dependencies: z.array(z.string()),
    operational_constraints: z.array(z.string()),
    school_operation_constraints: z.array(z.string()),
    family_experience_constraints: z.array(z.string()),
    sustainability_rationale: z.string(),
  }),
  curve_fragility_note: z.object({
    stable_points: z.array(z.string()),
    fragile_points: z.array(z.string()),
    target_case_risks: z.array(z.string()),
    stress_case_triggers: z.array(z.string()),
    confidence_overestimation_signals: z.array(z.string()),
    conditions_that_break_curve: z.array(z.string()),
  }),
  risk_acceptability_matrix: z.array(RiskAcceptabilitySchema),
  executive_risk_summary: z.object({
    top_risks_to_elevate: z.array(z.string()),
    non_negotiable_risks: z.array(z.string()),
    critical_tags: z.array(z.string()),
    risks_that_can_delay_target_case: z.array(z.string()),
    required_executive_attention: z.array(z.string()),
    suggested_caution_tone_for_final_recommendation: z.string(),
  }),
});

export function riskJsonSchema() {
  const alertItem = {
    type: 'object' as const, additionalProperties: false,
    properties: {
      alert_title: { type: 'string' as const }, alert_type: { type: 'string' as const, enum: [...ALERT_TYPES] },
      severity: { type: 'string' as const, enum: [...RISK_LEVELS] }, probability: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
      impact: { type: 'string' as const }, brand: { type: 'string' as const }, related_tag: { type: 'string' as const },
      rationale: { type: 'string' as const }, mitigation: { type: 'string' as const }, escalation_need: { type: 'string' as const },
    },
    required: ['alert_title', 'severity', 'impact', 'rationale'] as const,
  };
  const brandRiskItem = {
    type: 'object' as const, additionalProperties: false,
    properties: {
      brand_name: { type: 'string' as const }, overall_risk_level: { type: 'string' as const, enum: [...RISK_LEVELS] },
      risk_summary: { type: 'string' as const }, key_risk_drivers: { type: 'array' as const, items: { type: 'string' as const } },
      relation_to_plan_execution: { type: 'string' as const }, relation_to_year_end_closing: { type: 'string' as const },
      relation_to_school_operation: { type: 'string' as const }, relation_to_family_experience: { type: 'string' as const },
      relation_to_unit_safety: { type: 'string' as const },
      key_points_for_executive_attention: { type: 'array' as const, items: { type: 'string' as const } },
    },
    required: ['brand_name', 'overall_risk_level', 'risk_summary', 'key_risk_drivers', 'key_points_for_executive_attention'] as const,
  };
  const tagRiskItem = {
    type: 'object' as const, additionalProperties: false,
    properties: {
      tag_level: { type: 'string' as const }, tag_name: { type: 'string' as const },
      risk_type: { type: 'string' as const, enum: [...RISK_TYPES] }, severity: { type: 'string' as const, enum: [...RISK_LEVELS] },
      probability: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
      impact_on_year_end: { type: 'string' as const }, impact_on_operation: { type: 'string' as const },
      impact_on_student_experience: { type: 'string' as const }, impact_on_family_perception: { type: 'string' as const },
      impact_on_unit_safety: { type: 'string' as const }, rationale: { type: 'string' as const },
      mitigation: { type: 'string' as const }, escalation_trigger: { type: 'string' as const },
    },
    required: ['tag_level', 'tag_name', 'risk_type', 'severity', 'impact_on_year_end', 'rationale'] as const,
  };
  const acceptabilityItem = {
    type: 'object' as const, additionalProperties: false,
    properties: {
      risk_name: { type: 'string' as const }, brand: { type: 'string' as const },
      acceptability_level: { type: 'string' as const, enum: [...ACCEPTABILITY_LEVELS] },
      school_operation_sensitivity: { type: 'string' as const, enum: [...RISK_LEVELS] },
      second_order_effect: { type: 'string' as const }, minimum_mitigation_required: { type: 'string' as const },
      review_trigger: { type: 'string' as const }, escalation_trigger: { type: 'string' as const }, stop_trigger: { type: 'string' as const },
    },
    required: ['risk_name', 'brand', 'acceptability_level', 'minimum_mitigation_required'] as const,
  };
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      risk_exposure_by_brand: { type: 'array' as const, items: brandRiskItem },
      critical_alerts_pack: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          critical_alerts: { type: 'array' as const, items: alertItem }, high_alerts: { type: 'array' as const, items: alertItem },
          medium_alerts: { type: 'array' as const, items: alertItem }, low_alerts: { type: 'array' as const, items: alertItem },
        },
        required: ['critical_alerts', 'high_alerts', 'medium_alerts', 'low_alerts'] as const,
      },
      tag_risk_map: { type: 'array' as const, items: tagRiskItem },
      plan_sustainability_review: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          plan_sustainability_level: { type: 'string' as const, enum: [...PLAN_SUSTAINABILITY] },
          main_fragilities_of_plan: { type: 'array' as const, items: { type: 'string' as const } },
          execution_dependencies: { type: 'array' as const, items: { type: 'string' as const } },
          operational_constraints: { type: 'array' as const, items: { type: 'string' as const } },
          school_operation_constraints: { type: 'array' as const, items: { type: 'string' as const } },
          family_experience_constraints: { type: 'array' as const, items: { type: 'string' as const } },
          sustainability_rationale: { type: 'string' as const },
        },
        required: ['plan_sustainability_level', 'main_fragilities_of_plan', 'sustainability_rationale'] as const,
      },
      curve_fragility_note: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          stable_points: { type: 'array' as const, items: { type: 'string' as const } },
          fragile_points: { type: 'array' as const, items: { type: 'string' as const } },
          target_case_risks: { type: 'array' as const, items: { type: 'string' as const } },
          stress_case_triggers: { type: 'array' as const, items: { type: 'string' as const } },
          confidence_overestimation_signals: { type: 'array' as const, items: { type: 'string' as const } },
          conditions_that_break_curve: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['stable_points', 'fragile_points', 'target_case_risks'] as const,
      },
      risk_acceptability_matrix: { type: 'array' as const, items: acceptabilityItem },
      executive_risk_summary: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          top_risks_to_elevate: { type: 'array' as const, items: { type: 'string' as const } },
          non_negotiable_risks: { type: 'array' as const, items: { type: 'string' as const } },
          critical_tags: { type: 'array' as const, items: { type: 'string' as const } },
          risks_that_can_delay_target_case: { type: 'array' as const, items: { type: 'string' as const } },
          required_executive_attention: { type: 'array' as const, items: { type: 'string' as const } },
          suggested_caution_tone_for_final_recommendation: { type: 'string' as const },
        },
        required: ['top_risks_to_elevate', 'non_negotiable_risks', 'critical_tags', 'suggested_caution_tone_for_final_recommendation'] as const,
      },
    },
    required: ['risk_exposure_by_brand', 'critical_alerts_pack', 'tag_risk_map', 'plan_sustainability_review', 'curve_fragility_note', 'risk_acceptability_matrix', 'executive_risk_summary'] as const,
  };
}

// ============================================
// ALEX — Consolidation Output (com Board Presentation)
// ============================================

export const ConsolidationOutputSchema = z.object({
  consolidated_summary: z.string(),
  cross_agent_conflicts: z.array(z.string()),
  final_recommendations: z.array(z.object({
    area: z.string(),
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    expected_impact: z.string(),
  })),
  confidence_level: z.number().min(0).max(100),
  board_presentation: z.object({
    presentation_title: z.string(),
    executive_context: z.string(),
    slides: z.array(z.object({
      title: z.string(),
      purpose: z.string(),
      bullets: z.array(z.string()),
      key_message: z.string(),
      optional_supporting_note: z.string(),
    })),
  }),
});

export function consolidationJsonSchema() {
  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      consolidated_summary: { type: 'string' as const },
      cross_agent_conflicts: { type: 'array' as const, items: { type: 'string' as const } },
      final_recommendations: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            area: { type: 'string' as const },
            action: { type: 'string' as const },
            priority: { type: 'string' as const, enum: ['low', 'medium', 'high'] },
            expected_impact: { type: 'string' as const },
          },
          required: ['area', 'action', 'priority', 'expected_impact'] as const,
        },
      },
      confidence_level: { type: 'number' as const },
      board_presentation: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          presentation_title: { type: 'string' as const },
          executive_context: { type: 'string' as const },
          slides: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              additionalProperties: false,
              properties: {
                title: { type: 'string' as const },
                purpose: { type: 'string' as const },
                bullets: { type: 'array' as const, items: { type: 'string' as const } },
                key_message: { type: 'string' as const },
                optional_supporting_note: { type: 'string' as const },
              },
              required: ['title', 'purpose', 'bullets', 'key_message', 'optional_supporting_note'] as const,
            },
          },
        },
        required: ['presentation_title', 'executive_context', 'slides'] as const,
      },
    },
    required: ['consolidated_summary', 'cross_agent_conflicts', 'final_recommendations', 'confidence_level', 'board_presentation'] as const,
  };
}

// ============================================
// Executivo — Executive Reviewer & Decision Readiness Challenger Schema
// ============================================

const EXECUTIVE_QUESTION_CATEGORIES = [
  'resultado', 'orçamento', 'causa_real', 'plano_de_acao', 'ownership', 'prazo',
  'fechamento_do_ano', 'sacrificios', 'risco', 'risco_escolar', 'governanca', 'decisao_final',
] as const;

const ExecutiveQuestionSchema = z.object({
  question_id: z.string(),
  question_category: z.enum(EXECUTIVE_QUESTION_CATEGORIES).default('resultado'),
  question_text: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('high'),
  why_executive_would_ask: z.string().default(''),
  linked_material_section: z.string().default(''),
});

const ExecutiveAnswerSchema = z.object({
  linked_question_id: z.string(),
  direct_answer: z.string(),
  main_number: z.string().default(''),
  justification: z.string().default(''),
  owner: z.string().default(''),
  deadline: z.string().default(''),
  associated_action: z.string().default(''),
  answer_confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  answer_fragility_note: z.string().default(''),
});

const ExecutionOwnershipReviewSchema = z.object({
  actions_without_owner: z.array(z.string()).default([]),
  actions_without_deadline: z.array(z.string()).default([]),
  actions_without_metric: z.array(z.string()).default([]),
  vague_execution_points: z.array(z.string()).default([]),
  missing_governance_items: z.array(z.string()).default([]),
});

const WeaknessExposureSchema = z.object({
  weak_points: z.array(z.string()).default([]),
  unsupported_claims: z.array(z.string()).default([]),
  vague_sections: z.array(z.string()).default([]),
  missing_numbers: z.array(z.string()).default([]),
  likely_discomfort_points: z.array(z.string()).default([]),
});

const DecisionReadinessSchema = z.object({
  readiness_level: z.enum(['ready', 'ready_with_adjustments', 'not_ready']).default('ready_with_adjustments'),
  readiness_rationale: z.string(),
  what_is_ready: z.array(z.string()).default([]),
  what_is_not_ready: z.array(z.string()).default([]),
  mandatory_fixes_before_meeting: z.array(z.string()).default([]),
  final_recommendation: z.string().default(''),
});

const ExecutiveRehearsalSchema = z.object({
  simulated_question: z.string(),
  ideal_answer: z.string(),
  risk_if_answered_badly: z.string().default(''),
  follow_up_question: z.string().default(''),
  best_reinforcement_point: z.string().default(''),
});

export const ExecutiveReviewOutputSchema = z.object({
  executive_question_pack: z.array(ExecutiveQuestionSchema).default([]),
  expected_answer_pack: z.array(ExecutiveAnswerSchema).default([]),
  execution_ownership_review: ExecutionOwnershipReviewSchema,
  weakness_exposure: WeaknessExposureSchema,
  decision_readiness: DecisionReadinessSchema,
  executive_rehearsal: z.array(ExecutiveRehearsalSchema).default([]),
});

export function executiveReviewJsonSchema() {
  const strArr = { type: 'array' as const, items: { type: 'string' as const } };
  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      executive_question_pack: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            question_id: { type: 'string' as const },
            question_category: { type: 'string' as const, enum: [...EXECUTIVE_QUESTION_CATEGORIES] },
            question_text: { type: 'string' as const },
            priority: { type: 'string' as const, enum: ['critical', 'high', 'medium', 'low'] },
            why_executive_would_ask: { type: 'string' as const },
            linked_material_section: { type: 'string' as const },
          },
          required: ['question_id', 'question_category', 'question_text', 'priority', 'why_executive_would_ask', 'linked_material_section'] as const,
        },
      },
      expected_answer_pack: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            linked_question_id: { type: 'string' as const },
            direct_answer: { type: 'string' as const },
            main_number: { type: 'string' as const },
            justification: { type: 'string' as const },
            owner: { type: 'string' as const },
            deadline: { type: 'string' as const },
            associated_action: { type: 'string' as const },
            answer_confidence: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
            answer_fragility_note: { type: 'string' as const },
          },
          required: ['linked_question_id', 'direct_answer', 'main_number', 'justification', 'owner', 'deadline', 'associated_action', 'answer_confidence', 'answer_fragility_note'] as const,
        },
      },
      execution_ownership_review: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          actions_without_owner: strArr,
          actions_without_deadline: strArr,
          actions_without_metric: strArr,
          vague_execution_points: strArr,
          missing_governance_items: strArr,
        },
        required: ['actions_without_owner', 'actions_without_deadline', 'actions_without_metric', 'vague_execution_points', 'missing_governance_items'] as const,
      },
      weakness_exposure: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          weak_points: strArr,
          unsupported_claims: strArr,
          vague_sections: strArr,
          missing_numbers: strArr,
          likely_discomfort_points: strArr,
        },
        required: ['weak_points', 'unsupported_claims', 'vague_sections', 'missing_numbers', 'likely_discomfort_points'] as const,
      },
      decision_readiness: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          readiness_level: { type: 'string' as const, enum: ['ready', 'ready_with_adjustments', 'not_ready'] },
          readiness_rationale: { type: 'string' as const },
          what_is_ready: strArr,
          what_is_not_ready: strArr,
          mandatory_fixes_before_meeting: strArr,
          final_recommendation: { type: 'string' as const },
        },
        required: ['readiness_level', 'readiness_rationale', 'what_is_ready', 'what_is_not_ready', 'mandatory_fixes_before_meeting', 'final_recommendation'] as const,
      },
      executive_rehearsal: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            simulated_question: { type: 'string' as const },
            ideal_answer: { type: 'string' as const },
            risk_if_answered_badly: { type: 'string' as const },
            follow_up_question: { type: 'string' as const },
            best_reinforcement_point: { type: 'string' as const },
          },
          required: ['simulated_question', 'ideal_answer', 'risk_if_answered_badly', 'follow_up_question', 'best_reinforcement_point'] as const,
        },
      },
    },
    required: ['executive_question_pack', 'expected_answer_pack', 'execution_ownership_review', 'weakness_exposure', 'decision_readiness', 'executive_rehearsal'] as const,
  };
}

// ============================================
// Lookup: schema por step_type + agent_code
// ============================================

export function getZodSchemaForStep(stepType: string, agentCode: string) {
  if (stepType === 'plan') return SupervisorPlanOutputSchema;
  if (stepType === 'consolidate') return ConsolidationOutputSchema;
  if (stepType === 'execute' && agentCode === 'bruna') return DataQualityOutputSchema;
  if (stepType === 'execute' && agentCode === 'carlos') return PerformanceAnalysisOutputSchema;
  if (stepType === 'execute' && agentCode === 'denilson') return OptimizationOutputSchema;
  if (stepType === 'execute' && agentCode === 'edmundo') return ForecastOutputSchema;
  if (stepType === 'execute' && agentCode === 'falcao') return RiskOutputSchema;
  if (stepType === 'review' && agentCode === 'executivo') return ExecutiveReviewOutputSchema;
  throw new Error(`Schema não encontrado para step_type=${stepType}, agent_code=${agentCode}`);
}

export function getJsonSchemaForStep(stepType: string, agentCode: string) {
  if (stepType === 'plan') return supervisorPlanJsonSchema();
  if (stepType === 'consolidate') return consolidationJsonSchema();
  if (stepType === 'execute' && agentCode === 'bruna') return dataQualityJsonSchema();
  if (stepType === 'execute' && agentCode === 'carlos') return performanceJsonSchema();
  if (stepType === 'execute' && agentCode === 'denilson') return optimizationJsonSchema();
  if (stepType === 'execute' && agentCode === 'edmundo') return forecastJsonSchema();
  if (stepType === 'execute' && agentCode === 'falcao') return riskJsonSchema();
  if (stepType === 'review' && agentCode === 'executivo') return executiveReviewJsonSchema();
  throw new Error(`JSON Schema não encontrado para step_type=${stepType}, agent_code=${agentCode}`);
}
