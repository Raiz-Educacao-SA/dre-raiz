// ============================================
// Equipe Alpha — Schemas Simplificados
// Cada agente: max 3 entregáveis, estruturas planas
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
  top5_tags01_receita: z.array(z.object({ tag01: z.string(), total: z.number() })),
  top5_tags01_custo: z.array(z.object({ tag01: z.string(), total: z.number() })),
  tendencia_mensal: z.array(z.object({ mes: z.string(), receita: z.number(), ebitda: z.number() })),
  top_fornecedores_por_tag01: z.array(z.object({
    tag01: z.string(), vendor: z.string(), total_real: z.number(),
  })).default([]),
});

// ============================================
// ALEX — Plan
// ============================================

export const SupervisorPlanOutputSchema = z.object({
  executive_summary: z.string(),
  dre_highlights: z.object({
    receita_liquida: z.string(),
    custos_variaveis: z.string(),
    custos_fixos: z.string(),
    sga: z.string(),
    rateio_raiz: z.string(),
    ebitda_total: z.string(),
  }),
  priority_areas: z.array(z.string()),
  assignments: z.array(z.object({
    agent_code: z.string(),
    focus: z.string(),
  })),
});

export function supervisorPlanJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      executive_summary: { type: 'string' as const },
      dre_highlights: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          receita_liquida: { type: 'string' as const },
          custos_variaveis: { type: 'string' as const },
          custos_fixos: { type: 'string' as const },
          sga: { type: 'string' as const },
          rateio_raiz: { type: 'string' as const },
          ebitda_total: { type: 'string' as const },
        },
        required: ['receita_liquida', 'custos_variaveis', 'custos_fixos', 'sga', 'rateio_raiz', 'ebitda_total'] as const,
      },
      priority_areas: { type: 'array' as const, items: { type: 'string' as const } },
      assignments: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            agent_code: { type: 'string' as const },
            focus: { type: 'string' as const },
          },
          required: ['agent_code', 'focus'] as const,
        },
      },
    },
    required: ['executive_summary', 'dre_highlights', 'priority_areas', 'assignments'] as const,
  };
}

// ============================================
// BRUNA — Data Quality
// ============================================

export const DataQualityOutputSchema = z.object({
  executive_data_quality_summary: z.string(),
  quality_score: z.number().min(0).max(100),
  fragility_points: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    affected_area: z.string(),
    affected_tags: z.string(),
    scenario_affected: z.string(),
    probable_cause: z.string(),
    suggested_fix: z.string(),
    analysis_impact: z.string(),
  })),
  data_integrity_risk_summary: z.object({
    overall_risk_level: z.string(),
    most_sensitive_areas: z.array(z.string()),
    impact_on_performance: z.string(),
    impact_on_optimization: z.string(),
    impact_on_forecast: z.string(),
    interpretive_caution: z.string(),
  }),
  recommended_caution_level: z.enum(['high_confidence', 'proceed_with_moderate_reservations', 'proceed_with_critical_reservations']),
});

export function dataQualityJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      executive_data_quality_summary: { type: 'string' as const },
      quality_score: { type: 'number' as const },
      fragility_points: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
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
          required: ['type', 'description', 'severity', 'affected_area', 'affected_tags', 'scenario_affected', 'probable_cause', 'suggested_fix', 'analysis_impact'] as const,
        },
      },
      data_integrity_risk_summary: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          overall_risk_level: { type: 'string' as const },
          most_sensitive_areas: { type: 'array' as const, items: { type: 'string' as const } },
          impact_on_performance: { type: 'string' as const },
          impact_on_optimization: { type: 'string' as const },
          impact_on_forecast: { type: 'string' as const },
          interpretive_caution: { type: 'string' as const },
        },
        required: ['overall_risk_level', 'most_sensitive_areas', 'impact_on_performance', 'impact_on_optimization', 'impact_on_forecast', 'interpretive_caution'] as const,
      },
      recommended_caution_level: { type: 'string' as const, enum: ['high_confidence', 'proceed_with_moderate_reservations', 'proceed_with_critical_reservations'] },
    },
    required: ['executive_data_quality_summary', 'quality_score', 'fragility_points', 'data_integrity_risk_summary', 'recommended_caution_level'] as const,
  };
}

// ============================================
// CARLOS — Performance
// ============================================

export const PerformanceOutputSchema = z.object({
  summary: z.string(),
  top_variations: z.array(z.object({
    dre_line: z.string(),
    tag01: z.string(),
    real: z.number(),
    budget: z.number(),
    gap_pct: z.number(),
    cause: z.string(),
    nature: z.string(),
  })),
  ebitda_impact: z.object({
    pressures: z.array(z.string()),
    reliefs: z.array(z.string()),
    reading: z.string(),
  }),
});

export function performanceJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      summary: { type: 'string' as const },
      top_variations: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            dre_line: { type: 'string' as const },
            tag01: { type: 'string' as const },
            real: { type: 'number' as const },
            budget: { type: 'number' as const },
            gap_pct: { type: 'number' as const },
            cause: { type: 'string' as const },
            nature: { type: 'string' as const },
          },
          required: ['dre_line', 'tag01', 'real', 'budget', 'gap_pct', 'cause', 'nature'] as const,
        },
      },
      ebitda_impact: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          pressures: { type: 'array' as const, items: { type: 'string' as const } },
          reliefs: { type: 'array' as const, items: { type: 'string' as const } },
          reading: { type: 'string' as const },
        },
        required: ['pressures', 'reliefs', 'reading'] as const,
      },
    },
    required: ['summary', 'top_variations', 'ebitda_impact'] as const,
  };
}

// ============================================
// DENILSON — Optimization
// ============================================

export const OptimizationOutputSchema = z.object({
  actions: z.array(z.object({
    action: z.string(),
    brand: z.string(),
    target_line: z.string(),
    expected_impact_brl: z.number(),
    priority: z.enum(['high', 'medium', 'low']),
    is_real_gain: z.boolean(),
  })),
  total_expected_impact: z.object({
    ebitda_impact_brl: z.number(),
    margin_impact_pct: z.number(),
  }),
  constraints: z.array(z.object({
    description: z.string(),
  })),
});

export function optimizationJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      actions: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            action: { type: 'string' as const },
            brand: { type: 'string' as const },
            target_line: { type: 'string' as const },
            expected_impact_brl: { type: 'number' as const },
            priority: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
            is_real_gain: { type: 'boolean' as const },
          },
          required: ['action', 'brand', 'target_line', 'expected_impact_brl', 'priority', 'is_real_gain'] as const,
        },
      },
      total_expected_impact: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          ebitda_impact_brl: { type: 'number' as const },
          margin_impact_pct: { type: 'number' as const },
        },
        required: ['ebitda_impact_brl', 'margin_impact_pct'] as const,
      },
      constraints: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: { description: { type: 'string' as const } },
          required: ['description'] as const,
        },
      },
    },
    required: ['actions', 'total_expected_impact', 'constraints'] as const,
  };
}

// ============================================
// EDMUNDO — Forecast
// ============================================

export const ForecastOutputSchema = z.object({
  projections: z.array(z.object({
    brand: z.string(),
    base_case_ebitda: z.number(),
    target_case_ebitda: z.number(),
    stress_case_ebitda: z.number(),
    confidence: z.enum(['high', 'medium', 'low']),
    narrative: z.string(),
  })),
  gap_to_target: z.object({
    total_gap_brl: z.number(),
    main_drivers: z.array(z.string()),
    feasibility: z.string(),
  }),
  risks: z.array(z.object({
    description: z.string(),
    probability: z.enum(['high', 'medium', 'low']),
  })),
});

export function forecastJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      projections: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            brand: { type: 'string' as const },
            base_case_ebitda: { type: 'number' as const },
            target_case_ebitda: { type: 'number' as const },
            stress_case_ebitda: { type: 'number' as const },
            confidence: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
            narrative: { type: 'string' as const },
          },
          required: ['brand', 'base_case_ebitda', 'target_case_ebitda', 'stress_case_ebitda', 'confidence', 'narrative'] as const,
        },
      },
      gap_to_target: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          total_gap_brl: { type: 'number' as const },
          main_drivers: { type: 'array' as const, items: { type: 'string' as const } },
          feasibility: { type: 'string' as const },
        },
        required: ['total_gap_brl', 'main_drivers', 'feasibility'] as const,
      },
      risks: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            description: { type: 'string' as const },
            probability: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
          },
          required: ['description', 'probability'] as const,
        },
      },
    },
    required: ['projections', 'gap_to_target', 'risks'] as const,
  };
}

// ============================================
// FALCÃO — Risk
// ============================================

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export const RiskOutputSchema = z.object({
  risk_exposure_by_brand: z.array(z.object({
    brand_name: z.string(),
    overall_risk_level: z.enum(RISK_LEVELS),
    risk_summary: z.string(),
    key_risk_drivers: z.array(z.string()),
  })),
  critical_alerts: z.array(z.object({
    alert_title: z.string(),
    severity: z.enum(RISK_LEVELS),
    brand: z.string(),
    rationale: z.string(),
    mitigation: z.string(),
  })),
  executive_risk_summary: z.object({
    top_risks: z.array(z.string()),
    non_negotiable_risks: z.array(z.string()),
    suggested_caution_tone: z.string(),
  }),
});

export function riskJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      risk_exposure_by_brand: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            brand_name: { type: 'string' as const },
            overall_risk_level: { type: 'string' as const, enum: [...RISK_LEVELS] },
            risk_summary: { type: 'string' as const },
            key_risk_drivers: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['brand_name', 'overall_risk_level', 'risk_summary', 'key_risk_drivers'] as const,
        },
      },
      critical_alerts: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            alert_title: { type: 'string' as const },
            severity: { type: 'string' as const, enum: [...RISK_LEVELS] },
            brand: { type: 'string' as const },
            rationale: { type: 'string' as const },
            mitigation: { type: 'string' as const },
          },
          required: ['alert_title', 'severity', 'brand', 'rationale', 'mitigation'] as const,
        },
      },
      executive_risk_summary: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          top_risks: { type: 'array' as const, items: { type: 'string' as const } },
          non_negotiable_risks: { type: 'array' as const, items: { type: 'string' as const } },
          suggested_caution_tone: { type: 'string' as const },
        },
        required: ['top_risks', 'non_negotiable_risks', 'suggested_caution_tone'] as const,
      },
    },
    required: ['risk_exposure_by_brand', 'critical_alerts', 'executive_risk_summary'] as const,
  };
}

// ============================================
// ALEX — Consolidation
// ============================================

export const ConsolidationOutputSchema = z.object({
  consolidated_summary: z.string(),
  recommendations: z.array(z.object({
    action: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    expected_impact: z.string(),
    owner: z.string(),
  })),
  board_slides: z.array(z.object({
    title: z.string(),
    bullets: z.array(z.string()),
  })),
});

export function consolidationJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      consolidated_summary: { type: 'string' as const },
      recommendations: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            action: { type: 'string' as const },
            priority: { type: 'string' as const, enum: ['high', 'medium', 'low'] },
            expected_impact: { type: 'string' as const },
            owner: { type: 'string' as const },
          },
          required: ['action', 'priority', 'expected_impact', 'owner'] as const,
        },
      },
      board_slides: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            title: { type: 'string' as const },
            bullets: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['title', 'bullets'] as const,
        },
      },
    },
    required: ['consolidated_summary', 'recommendations', 'board_slides'] as const,
  };
}

// ============================================
// DIRETOR/EXECUTIVO — Review
// ============================================

export const ExecutiveReviewOutputSchema = z.object({
  key_questions: z.array(z.object({
    question: z.string(),
    expected_answer: z.string(),
    priority: z.enum(['critical', 'high', 'medium']),
  })),
  weaknesses: z.array(z.object({
    point: z.string(),
    fix_needed: z.string(),
  })),
  readiness: z.object({
    level: z.enum(['ready', 'needs_adjustments', 'not_ready']),
    rationale: z.string(),
    mandatory_fixes: z.array(z.string()),
  }),
});

export function executiveReviewJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      key_questions: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            question: { type: 'string' as const },
            expected_answer: { type: 'string' as const },
            priority: { type: 'string' as const, enum: ['critical', 'high', 'medium'] },
          },
          required: ['question', 'expected_answer', 'priority'] as const,
        },
      },
      weaknesses: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            point: { type: 'string' as const },
            fix_needed: { type: 'string' as const },
          },
          required: ['point', 'fix_needed'] as const,
        },
      },
      readiness: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          level: { type: 'string' as const, enum: ['ready', 'needs_adjustments', 'not_ready'] },
          rationale: { type: 'string' as const },
          mandatory_fixes: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['level', 'rationale', 'mandatory_fixes'] as const,
      },
    },
    required: ['key_questions', 'weaknesses', 'readiness'] as const,
  };
}

// ============================================
// Schema Router
// ============================================

export function getZodSchemaForStep(stepType: string, agentCode: string) {
  if (stepType === 'plan') return SupervisorPlanOutputSchema;
  if (stepType === 'consolidate') return ConsolidationOutputSchema;
  if (stepType === 'execute' && agentCode === 'bruna') return DataQualityOutputSchema;
  if (stepType === 'execute' && agentCode === 'carlos') return PerformanceOutputSchema;
  if (stepType === 'execute' && agentCode === 'denilson') return OptimizationOutputSchema;
  if (stepType === 'execute' && agentCode === 'edmundo') return ForecastOutputSchema;
  if (stepType === 'execute' && agentCode === 'falcao') return RiskOutputSchema;
  if (stepType === 'review' && (agentCode === 'executivo' || agentCode === 'diretor')) return ExecutiveReviewOutputSchema;
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
  if (stepType === 'review' && (agentCode === 'executivo' || agentCode === 'diretor')) return executiveReviewJsonSchema();
  throw new Error(`JSON Schema não encontrado para step_type=${stepType}, agent_code=${agentCode}`);
}
