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
    affected_tags: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join(', ') : v),
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
  recommended_caution_level: z.enum(['alta_confianca', 'cautela_moderada', 'cautela_critica']),
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
      recommended_caution_level: { type: 'string' as const, enum: ['alta_confianca', 'cautela_moderada', 'cautela_critica'] },
    },
    required: ['executive_data_quality_summary', 'quality_score', 'fragility_points', 'data_integrity_risk_summary', 'recommended_caution_level'] as const,
  };
}

// ============================================
// CARLOS — Performance
// ============================================

export const PerformanceOutputSchema = z.object({
  user_objective_response: z.string(),
  executive_performance_summary: z.string(),
  ranked_variations: z.array(z.object({
    dre_line: z.string(),
    tag01: z.string(),
    real_value: z.number(),
    budget_value: z.number(),
    gap_vs_budget_pct: z.number(),
    cause_explanation: z.string(),
    variation_nature: z.string(),
    ebitda_impact: z.string(),
    recurrence_expectation: z.string(),
  })),
  margin_ebitda_impact: z.object({
    ebitda_pressures: z.array(z.string()),
    ebitda_reliefs: z.array(z.string()),
    consolidated_impact_reading: z.string(),
  }),
  recommended_actions: z.object({
    items_to_deepen: z.array(z.string()),
    lines_to_monitor: z.array(z.string()),
    budget_assumptions_to_review: z.array(z.string()),
  }),
});

export function performanceJsonSchema() {
  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      user_objective_response: { type: 'string' as const },
      executive_performance_summary: { type: 'string' as const },
      ranked_variations: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            dre_line: { type: 'string' as const },
            tag01: { type: 'string' as const },
            real_value: { type: 'number' as const },
            budget_value: { type: 'number' as const },
            gap_vs_budget_pct: { type: 'number' as const },
            cause_explanation: { type: 'string' as const },
            variation_nature: { type: 'string' as const },
            ebitda_impact: { type: 'string' as const },
            recurrence_expectation: { type: 'string' as const },
          },
          required: ['dre_line', 'tag01', 'real_value', 'budget_value', 'gap_vs_budget_pct', 'cause_explanation', 'variation_nature', 'ebitda_impact', 'recurrence_expectation'] as const,
        },
      },
      margin_ebitda_impact: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          ebitda_pressures: { type: 'array' as const, items: { type: 'string' as const } },
          ebitda_reliefs: { type: 'array' as const, items: { type: 'string' as const } },
          consolidated_impact_reading: { type: 'string' as const },
        },
        required: ['ebitda_pressures', 'ebitda_reliefs', 'consolidated_impact_reading'] as const,
      },
      recommended_actions: {
        type: 'object' as const, additionalProperties: false,
        properties: {
          items_to_deepen: { type: 'array' as const, items: { type: 'string' as const } },
          lines_to_monitor: { type: 'array' as const, items: { type: 'string' as const } },
          budget_assumptions_to_review: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['items_to_deepen', 'lines_to_monitor', 'budget_assumptions_to_review'] as const,
      },
    },
    required: ['user_objective_response', 'executive_performance_summary', 'ranked_variations', 'margin_ebitda_impact', 'recommended_actions'] as const,
  };
}

// ============================================
// DENILSON — Real vs Orçado
// ============================================

// Schema flexível: aceita analise_por_linha OU analise_por_marca (dependendo se tem marca selecionada)
const DestaqueTag01Schema = z.object({
  tag01: z.string(),
  real_brl: z.number(),
  orcado_brl: z.number(),
  delta_pct: z.number(),
  comentario: z.string(),
});

const AnalisePorLinhaSchema = z.object({
  tag0: z.string(),
  real_brl: z.number(),
  orcado_brl: z.number(),
  delta_pct: z.number(),
  classificacao: z.string(),
  destaques_tag01: z.array(DestaqueTag01Schema).optional().default([]),
  recado: z.string(),
});

const LinhaMarcaSchema = z.object({
  tag0: z.string(),
  real_brl: z.number(),
  orcado_brl: z.number(),
  delta_pct: z.number(),
  classificacao: z.string(),
  comentario: z.string(),
});

const AnalisePorMarcaSchema = z.object({
  marca: z.string(),
  situacao_geral: z.string(),
  linhas: z.array(LinhaMarcaSchema),
  ebitda_estimado: z.number().optional().default(0),
  recado_marca: z.string(),
});

export const OptimizationOutputSchema = z.object({
  resumo_executivo: z.string(),
  // Aceita ambos — o prompt define qual deve vir preenchido
  analise_por_linha: z.array(AnalisePorLinhaSchema).optional().default([]),
  analise_por_marca: z.array(AnalisePorMarcaSchema).optional().default([]),
  recado_final: z.string(),
});

export function optimizationJsonSchema() {
  const destaqueTag01 = {
    type: 'object' as const, additionalProperties: false,
    properties: {
      tag01: { type: 'string' as const },
      real_brl: { type: 'number' as const },
      orcado_brl: { type: 'number' as const },
      delta_pct: { type: 'number' as const },
      comentario: { type: 'string' as const },
    },
    required: ['tag01', 'real_brl', 'orcado_brl', 'delta_pct', 'comentario'] as const,
  };

  return {
    type: 'object' as const, additionalProperties: false,
    properties: {
      resumo_executivo: { type: 'string' as const },
      analise_por_linha: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            tag0: { type: 'string' as const },
            real_brl: { type: 'number' as const },
            orcado_brl: { type: 'number' as const },
            delta_pct: { type: 'number' as const },
            classificacao: { type: 'string' as const },
            destaques_tag01: { type: 'array' as const, items: destaqueTag01 },
            recado: { type: 'string' as const },
          },
          required: ['tag0', 'real_brl', 'orcado_brl', 'delta_pct', 'classificacao', 'recado'] as const,
        },
      },
      analise_por_marca: {
        type: 'array' as const, items: {
          type: 'object' as const, additionalProperties: false,
          properties: {
            marca: { type: 'string' as const },
            situacao_geral: { type: 'string' as const },
            linhas: {
              type: 'array' as const, items: {
                type: 'object' as const, additionalProperties: false,
                properties: {
                  tag0: { type: 'string' as const },
                  real_brl: { type: 'number' as const },
                  orcado_brl: { type: 'number' as const },
                  delta_pct: { type: 'number' as const },
                  classificacao: { type: 'string' as const },
                  comentario: { type: 'string' as const },
                },
                required: ['tag0', 'real_brl', 'orcado_brl', 'delta_pct', 'classificacao', 'comentario'] as const,
              },
            },
            ebitda_estimado: { type: 'number' as const },
            recado_marca: { type: 'string' as const },
          },
          required: ['marca', 'situacao_geral', 'linhas', 'recado_marca'] as const,
        },
      },
      recado_final: { type: 'string' as const },
    },
    required: ['resumo_executivo', 'recado_final'] as const,
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
