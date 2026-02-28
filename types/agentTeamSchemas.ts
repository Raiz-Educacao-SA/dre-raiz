// ============================================
// Equipe Financeira 2.0 — Zod Schemas + JSON Schemas
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
});

// --------------------------------------------
// SupervisorPlanOutput
// --------------------------------------------

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
          required: ['agent_code', 'objective', 'focus_areas'],
        },
      },
    },
    required: ['executive_summary', 'key_findings', 'priority_actions', 'risks_identified', 'assignments'],
  };
}

// --------------------------------------------
// DataQualityOutput
// --------------------------------------------

export const DataQualityOutputSchema = z.object({
  summary: z.string(),
  quality_score: z.number().min(0).max(100),
  inconsistencies_found: z.array(z.object({
    area: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    affected_value: z.string(),
  })),
  normalization_actions: z.array(z.string()),
  missing_mappings: z.array(z.string()),
  highlights: z.array(z.string()),
});

export function dataQualityJsonSchema() {
  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      summary: { type: 'string' as const },
      quality_score: { type: 'number' as const, minimum: 0, maximum: 100 },
      inconsistencies_found: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            area: { type: 'string' as const },
            description: { type: 'string' as const },
            severity: { type: 'string' as const, enum: ['low', 'medium', 'high'] },
            affected_value: { type: 'string' as const },
          },
          required: ['area', 'description', 'severity', 'affected_value'],
        },
      },
      normalization_actions: { type: 'array' as const, items: { type: 'string' as const } },
      missing_mappings: { type: 'array' as const, items: { type: 'string' as const } },
      highlights: { type: 'array' as const, items: { type: 'string' as const } },
    },
    required: ['summary', 'quality_score', 'inconsistencies_found', 'normalization_actions', 'missing_mappings', 'highlights'],
  };
}

// --------------------------------------------
// PerformanceAnalysisOutput
// --------------------------------------------

export const PerformanceAnalysisOutputSchema = z.object({
  summary: z.string(),
  revenue_analysis: z.string(),
  cost_analysis: z.string(),
  margin_analysis: z.object({
    current_margin_pct: z.number(),
    budget_margin_pct: z.number(),
    prior_year_margin_pct: z.number(),
    assessment: z.string(),
  }),
  deviations: z.array(z.object({
    tag01: z.string(),
    description: z.string(),
    impact_brl: z.number(),
    direction: z.enum(['positive', 'negative']),
  })),
  recommended_actions: z.array(z.string()),
  insights: z.array(z.string()),
});

export function performanceJsonSchema() {
  return {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      summary: { type: 'string' as const },
      revenue_analysis: { type: 'string' as const },
      cost_analysis: { type: 'string' as const },
      margin_analysis: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          current_margin_pct: { type: 'number' as const },
          budget_margin_pct: { type: 'number' as const },
          prior_year_margin_pct: { type: 'number' as const },
          assessment: { type: 'string' as const },
        },
        required: ['current_margin_pct', 'budget_margin_pct', 'prior_year_margin_pct', 'assessment'],
      },
      deviations: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            tag01: { type: 'string' as const },
            description: { type: 'string' as const },
            impact_brl: { type: 'number' as const },
            direction: { type: 'string' as const, enum: ['positive', 'negative'] },
          },
          required: ['tag01', 'description', 'impact_brl', 'direction'],
        },
      },
      recommended_actions: { type: 'array' as const, items: { type: 'string' as const } },
      insights: { type: 'array' as const, items: { type: 'string' as const } },
    },
    required: ['summary', 'revenue_analysis', 'cost_analysis', 'margin_analysis', 'deviations', 'recommended_actions', 'insights'],
  };
}

// --------------------------------------------
// ConsolidationOutput
// --------------------------------------------

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
          required: ['area', 'action', 'priority', 'expected_impact'],
        },
      },
      confidence_level: { type: 'number' as const, minimum: 0, maximum: 100 },
    },
    required: ['consolidated_summary', 'cross_agent_conflicts', 'final_recommendations', 'confidence_level'],
  };
}

// --------------------------------------------
// Lookup: schema por step_type + agent_code
// --------------------------------------------

export function getZodSchemaForStep(stepType: string, agentCode: string) {
  if (stepType === 'plan') return SupervisorPlanOutputSchema;
  if (stepType === 'consolidate') return ConsolidationOutputSchema;
  if (stepType === 'execute' && agentCode === 'bruna') return DataQualityOutputSchema;
  if (stepType === 'execute' && agentCode === 'carlos') return PerformanceAnalysisOutputSchema;
  throw new Error(`Schema não encontrado para step_type=${stepType}, agent_code=${agentCode}`);
}

export function getJsonSchemaForStep(stepType: string, agentCode: string) {
  if (stepType === 'plan') return supervisorPlanJsonSchema();
  if (stepType === 'consolidate') return consolidationJsonSchema();
  if (stepType === 'execute' && agentCode === 'bruna') return dataQualityJsonSchema();
  if (stepType === 'execute' && agentCode === 'carlos') return performanceJsonSchema();
  throw new Error(`JSON Schema não encontrado para step_type=${stepType}, agent_code=${agentCode}`);
}
