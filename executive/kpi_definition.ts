// ============================================
// KPI Definition — Decision Health Score
// Formalização como métrica oficial institucional
// Zero I/O — estrutura de dados pura
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface OfficialKPI {
  code: string;
  name: string;
  description: string;
  formula: KPIFormula;
  data_source: KPIDataSource;
  periodicity: KPIPeriodicity;
  targets: KPITargets;
  classification: KPIClassification;
  governance: KPIGovernance;
}

export interface KPIFormula {
  /** Expressão formal da métrica */
  expression: string;
  /** Base de cálculo */
  base: number;
  /** Penalidades (detalhamento de cada componente) */
  penalties: PenaltyComponent[];
  /** Range de resultado */
  range: { min: number; max: number };
  /** Unidade */
  unit: 'pontos';
}

export interface PenaltyComponent {
  name: string;
  code: string;
  condition: string;
  formula: string;
  weight_description: string;
  default_parameters: Record<string, number>;
}

export interface KPIDataSource {
  primary: string;
  tables: string[];
  rpcs: string[];
  refresh_mechanism: string;
  data_lag: string;
}

export interface KPIPeriodicity {
  calculation: 'mensal' | 'semanal' | 'diário';
  reporting: 'mensal';
  review: 'trimestral';
  recalibration: 'anual';
}

export interface KPITargets {
  annual: KPITarget;
  quarterly: KPITarget[];
}

export interface KPITarget {
  period: string;
  target_score: number;
  minimum_acceptable: number;
  stretch_goal: number;
  description: string;
}

export interface KPIClassification {
  thresholds: ClassificationThreshold[];
  color_scheme: Record<string, string>;
}

export interface ClassificationThreshold {
  label: string;
  min_score: number;
  max_score: number;
  color: string;
  action_required: string;
}

export interface KPIGovernance {
  owner: string;
  reviewer: string;
  change_authority: string;
  reference_documents: string[];
}

// --------------------------------------------
// Official KPI Definition
// --------------------------------------------

/**
 * Retorna a definição oficial do Decision Health Score como KPI institucional.
 * Função pura — zero I/O.
 *
 * Esta definição formaliza o Health Score como métrica oficial da empresa,
 * estabelecendo fórmula, fonte de dados, periodicidade, metas e governança.
 */
export function getOfficialHealthScoreKPI(): OfficialKPI {
  return {
    code: 'DHS-001',
    name: 'Decision Health Score',
    description: 'Métrica composta que mede a saúde financeira operacional da organização em uma escala de 0 a 100 pontos. Integra indicadores de margem, EBITDA, confiança do modelo, concentração de riscos e coerência entre agentes de análise. Publicada mensalmente como KPI oficial.',

    // ================================================
    // FÓRMULA OFICIAL
    // ================================================
    formula: {
      expression: 'DHS = Base(100) - P_conf - P_marg - P_ebitda - P_prio - P_conf_agentes',
      base: 100,
      penalties: [
        {
          name: 'Penalidade de Confiança',
          code: 'P_conf',
          condition: 'Quando confidence < threshold (default: 80)',
          formula: '(threshold - confidence) × fator (default: 0.5)',
          weight_description: 'Mede a qualidade dos dados e do modelo. Confiança baixa indica que a análise do pipeline foi incerta ou que os dados de entrada estavam incompletos.',
          default_parameters: { threshold: 80, factor: 0.5 },
        },
        {
          name: 'Penalidade de Margem',
          code: 'P_marg',
          condition: 'Quando margem_real < margem_orcado',
          formula: '(margem_orcado - margem_real) × fator (default: 2)',
          weight_description: 'Mede o desvio da margem de contribuição em relação ao orçamento. Fator 2 amplifica a importância: cada ponto percentual de gap representa 2 pontos de penalidade.',
          default_parameters: { factor: 2 },
        },
        {
          name: 'Penalidade de EBITDA',
          code: 'P_ebitda',
          condition: 'Quando EBITDA_real < EBITDA_ano_anterior',
          formula: 'Penalidade fixa (default: 5 pontos)',
          weight_description: 'Sinaliza deterioração do resultado operacional em relação ao ano anterior. Penalidade fixa porque qualquer queda é significativa.',
          default_parameters: { fixed_penalty: 5 },
        },
        {
          name: 'Penalidade de Prioridades Altas',
          code: 'P_prio',
          condition: 'Quando recomendações de alta prioridade > threshold (default: 3)',
          formula: 'Penalidade fixa (default: 5 pontos)',
          weight_description: 'Indica acúmulo de problemas urgentes não resolvidos. Mais de 3 recomendações high-priority sugere gestão reativa.',
          default_parameters: { threshold: 3, fixed_penalty: 5 },
        },
        {
          name: 'Penalidade de Conflitos entre Agentes',
          code: 'P_conf_agentes',
          condition: 'Quando conflitos_count > 0',
          formula: 'Penalidade fixa (default: 3 pontos)',
          weight_description: 'Indica que os agentes de análise IA produziram diagnósticos contraditórios, reduzindo a confiabilidade da análise consolidada.',
          default_parameters: { fixed_penalty: 3 },
        },
      ],
      range: { min: 0, max: 100 },
      unit: 'pontos',
    },

    // ================================================
    // FONTE DE DADOS
    // ================================================
    data_source: {
      primary: 'Pipeline de análise IA (agent_runs + agent_steps) processando dados do DRE Gerencial.',
      tables: [
        'transactions (dados brutos)',
        'agent_runs (runs do pipeline)',
        'agent_steps (outputs por agente)',
        'agent_alerts (alertas gerados)',
        'decision_models (configuração de pesos)',
      ],
      rpcs: [
        'get_soma_tags (agregação DRE)',
        'claim_next_pending_step (execução de pipeline)',
      ],
      refresh_mechanism: 'Calculado automaticamente ao final de cada pipeline run. Também calculável sob demanda via GET /api/agent-team/health-score.',
      data_lag: 'Depende do fechamento mensal do DRE. Tipicamente disponível até o 5º dia útil do mês seguinte.',
    },

    // ================================================
    // PERIODICIDADE
    // ================================================
    periodicity: {
      calculation: 'mensal',
      reporting: 'mensal',
      review: 'trimestral',
      recalibration: 'anual',
    },

    // ================================================
    // METAS
    // ================================================
    targets: {
      annual: {
        period: '2026',
        target_score: 85,
        minimum_acceptable: 70,
        stretch_goal: 92,
        description: 'Meta anual: manter Health Score médio >= 85 (Saudável). Mínimo aceitável: 70 (limiar entre "Atenção" e "Crítico"). Meta aspiracional: 92.',
      },
      quarterly: [
        {
          period: '2026-Q1 (Jan-Mar)',
          target_score: 80,
          minimum_acceptable: 70,
          stretch_goal: 88,
          description: 'Primeiro trimestre: foco em estabilização. Meta mais conservadora enquanto plataforma é calibrada contra dados reais.',
        },
        {
          period: '2026-Q2 (Abr-Jun)',
          target_score: 83,
          minimum_acceptable: 70,
          stretch_goal: 90,
          description: 'Segundo trimestre: melhoria gradual. Primeiros resultados das ações de otimização.',
        },
        {
          period: '2026-Q3 (Jul-Set)',
          target_score: 85,
          minimum_acceptable: 72,
          stretch_goal: 92,
          description: 'Terceiro trimestre: atingir meta anual. Modelo validado contra 6+ meses de dados.',
        },
        {
          period: '2026-Q4 (Out-Dez)',
          target_score: 87,
          minimum_acceptable: 75,
          stretch_goal: 93,
          description: 'Quarto trimestre: consolidação. Preparação para revisão anual do modelo em Janeiro.',
        },
      ],
    },

    // ================================================
    // CLASSIFICAÇÃO
    // ================================================
    classification: {
      thresholds: [
        {
          label: 'Saudável',
          min_score: 85,
          max_score: 100,
          color: '#059669',
          action_required: 'Monitoramento contínuo. Nenhuma intervenção necessária.',
        },
        {
          label: 'Atenção',
          min_score: 70,
          max_score: 84,
          color: '#D97706',
          action_required: 'Plano de otimização gerado. Revisão no rito mensal. Ações preventivas recomendadas.',
        },
        {
          label: 'Crítico',
          min_score: 0,
          max_score: 69,
          color: '#DC2626',
          action_required: 'Plano de ação obrigatório. Aprovação executiva em até 5 dias úteis. Monitoramento semanal.',
        },
      ],
      color_scheme: {
        healthy: '#059669',
        attention: '#D97706',
        critical: '#DC2626',
        background_healthy: '#ECFDF5',
        background_attention: '#FFFBEB',
        background_critical: '#FEF2F2',
      },
    },

    // ================================================
    // GOVERNANÇA
    // ================================================
    governance: {
      owner: 'CFO — responsável pela interpretação e acompanhamento da meta',
      reviewer: 'CTO — responsável pela integridade técnica do cálculo',
      change_authority: 'Alterações em pesos e thresholds requerem aprovação do CFO + CTO conforme Decision Governance Model v1.0 (governance/decision_governance_model.ts)',
      reference_documents: [
        'governance/decision_governance_model.ts — Modelo de Governança',
        'governance/decision_policy.ts — Política Oficial de Uso',
        'executive/monthly_decision_ritual.ts — Rito Mensal Executivo',
        'core/scoreModel.ts — Implementação técnica',
        'core/decisionTypes.ts — Contratos de dados',
      ],
    },
  };
}
