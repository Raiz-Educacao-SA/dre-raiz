// ============================================
// Decision Governance Model
// Modelo formal de governança para o Decision Intelligence Platform
// Define responsabilidades, processos e rastreabilidade
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Definições Chave
// --------------------------------------------

/**
 * HEALTH SCORE (Decision Health Score):
 * Métrica composta (0-100) que mede a saúde financeira da operação.
 * Base 100, com penalidades por: baixa confiança do modelo, margem real
 * abaixo do orçado, EBITDA em queda, excesso de prioridades altas e
 * conflitos entre agentes. Faixas: >= 85 = Saudável, 70-84 = Atenção, < 70 = Crítico.
 * Definição técnica: core/scoreModel.ts
 *
 * BACKTESTING:
 * Processo de validação onde a nova calibração do modelo é aplicada
 * retroativamente a dados históricos (mínimo 6 ciclos) para verificar
 * se os scores recalculados refletem com precisão a situação real do
 * período, evitando falsos positivos ou negativos.
 */

// --------------------------------------------
// Enforcement Level
// --------------------------------------------

export type EnforcementLevel =
  | 'database'       // CHECK constraint, trigger ou RLS no PostgreSQL
  | 'api'            // Validação no endpoint (backend Vercel)
  | 'process';       // Revisão manual no rito mensal ou trimestral

// --------------------------------------------
// 1. Responsabilidades
// --------------------------------------------

export interface ModelOwnership {
  model_owner: {
    role: 'CTO' | 'Head de Dados' | 'CFO';
    description: string;
  };
  executive_owner: {
    role: 'CFO' | 'CEO';
    description: string;
  };
  operational_owner: {
    role: 'Controller' | 'Gerente Financeiro';
    description: string;
  };
}

// --------------------------------------------
// 2. Frequência de Revisão do Modelo
// --------------------------------------------

export interface ReviewSchedule {
  regular: {
    frequency: 'trimestral';
    scope: string;
    participants: string[];
    output: string;
  };
  extraordinary: {
    trigger: string;
    scope: string;
    participants: string[];
    output: string;
  };
  annual: {
    frequency: string;
    scope: string;
    participants: string[];
    output: string;
  };
}

// --------------------------------------------
// 3. Processo para Alterar Pesos
// --------------------------------------------

export interface WeightChangeStep {
  step: number;
  action: string;
  responsible: string;
  description: string;
}

export interface WeightChangeProcess {
  steps: WeightChangeStep[];
  required_fields: Record<string, string>;
  enforcement: {
    level: EnforcementLevel;
    mechanism: string;
  };
}

// --------------------------------------------
// 4. Processo para Aprovar Plano Ótimo
// --------------------------------------------

export interface ApprovalStep {
  step: number;
  action: string;
  responsible: string;
  description: string;
  sla: string;
}

export interface OptimalPlanApproval {
  automatic_trigger: string;
  approval_flow: ApprovalStep[];
  auto_approval_criteria: {
    condition: string;
    rationale: string;
  };
  escalation: {
    sla_breach_action: string;
    escalation_to: string;
  };
  enforcement: {
    level: EnforcementLevel;
    mechanism: string;
  };
}

// --------------------------------------------
// 5. Critérios para Override Manual
// --------------------------------------------

export interface OverrideScenario {
  scenario: string;
  example?: string;
  requirement?: string;
  rationale?: string;
}

export interface ManualOverridePolicy {
  allowed_scenarios: OverrideScenario[];
  forbidden_scenarios: OverrideScenario[];
  override_record: {
    fields: string[];
    storage: string;
    review: string;
  };
  enforcement: {
    level: EnforcementLevel;
    mechanism: string;
  };
}

// --------------------------------------------
// 6. Registro Obrigatório de Justificativa
// --------------------------------------------

export interface MandatoryJustification {
  action: string;
  where: string;
}

export interface JustificationPolicy {
  mandatory_justification: MandatoryJustification[];
  format: {
    minimum_length: number;
    required_elements: string[];
    language: string;
  };
  traceability: {
    all_justifications_stored: boolean;
    immutable: string;
    retention: string;
  };
  enforcement: {
    level: EnforcementLevel;
    mechanism: string;
  };
}

// --------------------------------------------
// Tabelas Requeridas
// --------------------------------------------

export interface RequiredMigrations {
  /** decision_audit_trail — tabela principal de rastreabilidade */
  decision_audit_trail: {
    status: 'required';
    sql: 'database/create_decision_audit_trail.sql';
    description: string;
  };
  /** Evolução de decision_models para suportar governança */
  decision_models_governance_columns: {
    status: 'required';
    sql: 'database/evolve_decision_models_governance.sql';
    description: string;
    new_columns: string[];
  };
  /** Evolução de agent_schedules para suportar justificativa */
  agent_schedules_justification: {
    status: 'required';
    sql: 'database/evolve_agent_schedules_justification.sql';
    description: string;
  };
}

// --------------------------------------------
// Governance Model Completo
// --------------------------------------------

export interface DecisionGovernanceModel {
  version: string;
  effective_date: string;
  approved_by: string;
  ownership: ModelOwnership;
  review_schedule: ReviewSchedule;
  weight_change_process: WeightChangeProcess;
  optimal_plan_approval: OptimalPlanApproval;
  manual_override_policy: ManualOverridePolicy;
  justification_policy: JustificationPolicy;
  required_migrations: RequiredMigrations;
}

/**
 * Retorna o modelo de governança padrão.
 * Função pura — zero I/O.
 */
export function getDefaultGovernanceModel(): DecisionGovernanceModel {
  return {
    version: '1.0',
    effective_date: '2026-03-01',
    approved_by: 'Diretoria Executiva — Raiz Educação S.A.',

    // --- 1. Responsabilidades ---
    ownership: {
      model_owner: {
        role: 'CTO',
        description: 'Responsável pela integridade técnica do modelo matemático (scoreModel, forecastModel, optimizationEngine), validação de fórmulas e aprovação de alterações em pesos e thresholds.',
      },
      executive_owner: {
        role: 'CFO',
        description: 'Responsável pela interpretação estratégica dos outputs, validação das recomendações do sistema e decisão final sobre planos de ação.',
      },
      operational_owner: {
        role: 'Controller',
        description: 'Responsável pela qualidade dos dados de entrada (DRE), execução do pipeline de análise e monitoramento dos agendamentos automáticos.',
      },
    },

    // --- 2. Frequência de Revisão ---
    review_schedule: {
      regular: {
        frequency: 'trimestral',
        scope: 'Validação de pesos, thresholds de classificação (Saudável >= 85, Atenção >= 70) e regras de alerta contra dados reais do trimestre.',
        participants: ['model_owner', 'executive_owner'],
        output: 'Ata de revisão com decisão: manter, ajustar ou recalibrar.',
      },
      extraordinary: {
        trigger: 'Quando o Health Score (métrica 0-100 de saúde financeira) divergir consistentemente (>15 pontos) da percepção real por 2 ou mais ciclos consecutivos, ou após mudança significativa no cenário macroeconômico.',
        scope: 'Recalibração completa de pesos e thresholds.',
        participants: ['model_owner', 'executive_owner', 'operational_owner'],
        output: 'Nova versão do modelo registrada em decision_models com justificativa obrigatória.',
      },
      annual: {
        frequency: 'anual (Janeiro)',
        scope: 'Revisão completa: fórmula de score, modelo de previsão (forecast), regras de otimização, alertas e thresholds. Inclui backtesting (validação retroativa contra dados do ano anterior) para confirmar precisão.',
        participants: ['model_owner', 'executive_owner', 'board'],
        output: 'Documento formal de aprovação da nova versão anual.',
      },
    },

    // --- 3. Processo para Alterar Pesos ---
    weight_change_process: {
      steps: [
        { step: 1, action: 'Identificar necessidade', responsible: 'model_owner | operational_owner', description: 'Documentar divergência observada entre score calculado e situação real da operação. Apresentar evidências quantitativas (ex: score = 90, mas EBITDA caindo 3 meses consecutivos).' },
        { step: 2, action: 'Propor alteração', responsible: 'model_owner', description: 'Definir novos valores para pesos ou thresholds. Executar simulação retrospectiva (backtesting) com dados de pelo menos 6 ciclos históricos. Documentar impacto projetado nos scores passados.' },
        { step: 3, action: 'Validar impacto', responsible: 'model_owner', description: 'Comparar scores antigos vs. recalculados com nova calibração. Confirmar que nova versão não gera alertas falsos (falsos positivos) nem falha em detectar riscos reais (falsos negativos).' },
        { step: 4, action: 'Aprovar alteração', responsible: 'executive_owner', description: 'Validar que a alteração proposta reflete a realidade do negócio e não distorce a métrica para fins cosméticos. Assinar aprovação formal.' },
        { step: 5, action: 'Implementar e registrar', responsible: 'model_owner', description: 'Atualizar registro na tabela decision_models (Supabase). Versão anterior permanece no histórico para rastreabilidade. Campos justification e approved_by são obrigatórios.' },
      ],
      required_fields: {
        version: 'Número sequencial da versão (auto-incremento)',
        changed_by: 'Email do responsável pela alteração',
        justification: 'Texto descritivo (mínimo 30 caracteres) explicando o motivo da alteração',
        previous_values: 'Snapshot JSONB dos valores anteriores (auto-capturado pelo trigger)',
        new_values: 'Snapshot JSONB dos novos valores',
        backtesting_result: 'Resumo do impacto observado na simulação retrospectiva',
        approved_by: 'Email do aprovador executivo',
        approved_at: 'Data/hora da aprovação',
      },
      enforcement: {
        level: 'database',
        mechanism: 'Trigger em decision_models que exige justification NOT NULL com LENGTH >= 30 e approved_by NOT NULL antes de aceitar UPDATE. Colunas adicionadas via database/evolve_decision_models_governance.sql.',
      },
    },

    // --- 4. Processo para Aprovar Plano Ótimo ---
    optimal_plan_approval: {
      automatic_trigger: 'Health Score < 85 (classificação "Atenção" ou "Crítico"). O sistema gera plano de otimização automaticamente ao final de cada pipeline run.',
      approval_flow: [
        { step: 1, action: 'Revisão técnica', responsible: 'operational_owner', description: 'Validar viabilidade operacional das ações propostas. Verificar se cortes sugeridos são factíveis sem comprometer qualidade de serviço.', sla: '2 dias úteis' },
        { step: 2, action: 'Aprovação executiva', responsible: 'executive_owner', description: 'Aprovar, rejeitar ou modificar plano proposto. Decisão formal registrada no sistema com justificativa obrigatória.', sla: '5 dias úteis' },
        { step: 3, action: 'Registro de decisão', responsible: 'sistema', description: 'Decisão registrada automaticamente na tabela decision_audit_trail com input_snapshot (plano proposto) e output_snapshot (decisão + justificativa).', sla: 'imediato' },
      ],
      auto_approval_criteria: {
        condition: 'Health Score >= 85 E todas as ações são de prioridade "low" E corte total < 2% da receita.',
        rationale: 'Ações de baixo impacto em cenário saudável não justificam overhead de aprovação formal.',
      },
      escalation: {
        sla_breach_action: 'Se SLA de aprovação executiva (5 dias úteis) for descumprido: notificação automática ao CEO via email. Se ultrapassar 10 dias úteis: plano é registrado como "SLA_BREACH — aprovação pendente" e escalado para próxima reunião do board com prioridade máxima.',
        escalation_to: 'CEO',
      },
      enforcement: {
        level: 'api',
        mechanism: 'Endpoint review-step valida que justificativa é obrigatória para rejeição. Registro em decision_audit_trail é automático (backend).',
      },
    },

    // --- 5. Critérios para Override Manual ---
    manual_override_policy: {
      allowed_scenarios: [
        { scenario: 'Contexto estratégico não capturado pelo modelo', example: 'Investimento intencional em expansão que reduz EBITDA temporariamente. O modelo penalizará, mas a decisão é estratégica.', requirement: 'Justificativa escrita obrigatória com horizonte temporal esperado para retorno ao patamar anterior.' },
        { scenario: 'Dados de entrada incompletos ou incorretos', example: 'Score calculado com base em dados parciais do mês (ex: DRE fechado até dia 15). Override temporário até fechamento.', requirement: 'Indicar quais dados estão incompletos e data esperada de correção.' },
        { scenario: 'Evento externo extraordinário', example: 'Pandemia, mudança regulatória, desastre natural que altera premissas do modelo.', requirement: 'Registro do evento externo e classificação do impacto estimado (alto/médio/baixo).' },
      ],
      forbidden_scenarios: [
        { scenario: 'Ignorar alertas críticos sem justificativa', rationale: 'Alertas de Health Score < 70 indicam risco material à operação. Ignorá-los sem análise documentada compromete a governança e cria risco legal.' },
        { scenario: 'Alterar score manualmente', rationale: 'O Health Score é output determinístico do modelo (core/scoreModel.ts). Alterá-lo diretamente invalida toda a cadeia de decisão. Para ajustar resultados, altere os pesos via processo formal (seção 3).' },
        { scenario: 'Desativar pipeline sem aprovação', rationale: 'Desativar execuções programadas (agent_schedules) remove a visibilidade contínua da saúde financeira. Requer aprovação formal do executive_owner com justificativa.' },
      ],
      override_record: {
        fields: ['override_by', 'override_at', 'original_recommendation', 'override_decision', 'justification', 'expected_review_date'],
        storage: 'Tabela decision_audit_trail com action_type = "override". Criada via database/create_decision_audit_trail.sql.',
        review: 'Todo override é obrigatoriamente revisado na próxima reunião do rito mensal executivo. Overrides não revisados são sinalizados automaticamente.',
      },
      enforcement: {
        level: 'api',
        mechanism: 'Endpoint de override valida campos obrigatórios (justification com LENGTH >= 30). Registro em decision_audit_trail é automático e imutável.',
      },
    },

    // --- 6. Registro Obrigatório de Justificativa ---
    justification_policy: {
      mandatory_justification: [
        { action: 'Alterar pesos do modelo', where: 'decision_models.justification (NOT NULL, CHECK LENGTH >= 30)' },
        { action: 'Rejeitar plano de otimização', where: 'decision_audit_trail.output_snapshot.rejection_reason' },
        { action: 'Override manual de recomendação', where: 'decision_audit_trail.output_snapshot.override_justification' },
        { action: 'Desativar agendamento', where: 'agent_schedules.justification (NOT NULL quando is_active = false)' },
        { action: 'Re-executar step de pipeline', where: 'agent_steps.review_comment (NOT NULL, CHECK LENGTH >= 30)' },
      ],
      format: {
        minimum_length: 30,
        required_elements: ['O que motivou a decisão', 'Qual o impacto esperado', 'Quando será revisado'],
        language: 'Português formal, sem abreviações técnicas internas.',
      },
      traceability: {
        all_justifications_stored: true,
        immutable: 'Justificativas não podem ser editadas após registro. Correções geram novo registro referenciando o anterior.',
        retention: '5 anos ou conforme política de retenção de documentos da organização.',
      },
      enforcement: {
        level: 'database',
        mechanism: 'CHECK constraints em decision_models (justification NOT NULL, LENGTH >= 30), agent_steps (review_comment LENGTH >= 30 quando review_status = "revision_requested"), agent_schedules (justification NOT NULL quando is_active = false). Constraints definidos nas migrations de evolução.',
      },
    },

    // --- Migrações Requeridas ---
    required_migrations: {
      decision_audit_trail: {
        status: 'required',
        sql: 'database/create_decision_audit_trail.sql',
        description: 'Tabela principal de rastreabilidade de decisões. Colunas: id, organization_id, run_id, action_type (analysis|optimization|forecast|schedule|override|weight_change), input_snapshot (JSONB), output_snapshot (JSONB), model_version, performed_by, justification, created_at.',
      },
      decision_models_governance_columns: {
        status: 'required',
        sql: 'database/evolve_decision_models_governance.sql',
        description: 'Adiciona colunas de governança à tabela decision_models existente.',
        new_columns: ['changed_by TEXT', 'justification TEXT NOT NULL', 'previous_values JSONB', 'approved_by TEXT', 'approved_at TIMESTAMPTZ', 'backtesting_result TEXT'],
      },
      agent_schedules_justification: {
        status: 'required',
        sql: 'database/evolve_agent_schedules_justification.sql',
        description: 'Adiciona coluna justification à tabela agent_schedules para registrar motivo de desativação.',
      },
    },
  };
}
