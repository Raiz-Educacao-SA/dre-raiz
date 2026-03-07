// ============================================
// Equipe Alpha — Approval Rules & Governance
// Regras de aprovação, bloqueio, conflito e override
// ============================================

import type { AgentCode } from './agentRegistry';

// --------------------------------------------
// Halt Conditions — Pipeline para obrigatoriamente
// --------------------------------------------

export interface HaltCondition {
  id: string;
  triggered_by: AgentCode;
  condition: string;
  action: 'halt_pipeline' | 'flag_warning' | 'escalate_to_alex';
  description: string;
}

export const HALT_CONDITIONS: HaltCondition[] = [
  {
    id: 'WARN_DQ_CRITICAL_RESERVATIONS',
    triggered_by: 'bruna',
    condition: 'recommended_caution_level === "proceed_with_critical_reservations"',
    action: 'escalate_to_alex',
    description: 'Base com ressalvas críticas. Pipeline avança mas Alex deve consolidar com ressalva obrigatória sobre confiabilidade dos dados.',
  },
  {
    id: 'WARN_DQ_LOW_SCORE',
    triggered_by: 'bruna',
    condition: 'quality_score < 40',
    action: 'flag_warning',
    description: 'Score de qualidade abaixo de 40 indica base frágil. Análise prossegue com cautela elevada e ressalva registrada.',
  },
  {
    id: 'HALT_RISK_CRITICAL',
    triggered_by: 'falcao',
    condition: 'brand with critical risk + 3+ critical_alerts OR 2+ non_negotiable_risks',
    action: 'halt_pipeline',
    description: 'Marca com risco crítico e múltiplos alertas ou riscos não negociáveis. Alex deve consolidar com ressalva obrigatória.',
  },
  {
    id: 'WARN_FORECAST_LOW',
    triggered_by: 'edmundo',
    condition: 'confidence_level < 50',
    action: 'flag_warning',
    description: 'Confiança do forecast abaixo de 50%. Projeções devem ser usadas com cautela.',
  },
  {
    id: 'ESCALATE_OPTIMIZATION_CONFLICT',
    triggered_by: 'denilson',
    condition: 'feasibility_status === "partial" && infeasible_actions.length > proposed_actions.length',
    action: 'escalate_to_alex',
    description: 'Mais ações inviáveis do que viáveis. Alex deve arbitrar prioridades.',
  },
];

// --------------------------------------------
// Conflict Resolution Rules
// --------------------------------------------

export interface ConflictRule {
  id: string;
  scenario: string;
  agents_involved: AgentCode[];
  resolution: string;
  resolver: AgentCode;
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'CONF_OPT_VS_RISK',
    scenario: 'Otimização propõe ação que risco classifica como critical',
    agents_involved: ['denilson', 'falcao'],
    resolution: 'Alex consolida: ação marcada como "alto ganho / alto risco" com flag de cautela no PPT.',
    resolver: 'alex',
  },
  {
    id: 'CONF_FORECAST_LOW_CONF',
    scenario: 'Forecast com confiança < 50% usado como base para otimização',
    agents_involved: ['edmundo', 'denilson'],
    resolution: 'Alex desconta projeções otimistas e adiciona cenário conservador na consolidação.',
    resolver: 'alex',
  },
  {
    id: 'CONF_PERF_VS_OPT',
    scenario: 'Performance mostra área como positiva mas otimização sugere corte nela',
    agents_involved: ['carlos', 'denilson'],
    resolution: 'Alex avalia se o corte é tático (curto prazo) vs estratégico (longo prazo) e decide.',
    resolver: 'alex',
  },
  {
    id: 'CONF_DQ_VS_ALL',
    scenario: 'Qualidade de dados questiona confiabilidade de indicadores usados por outros agentes',
    agents_involved: ['bruna', 'carlos', 'denilson', 'edmundo'],
    resolution: 'Alex marca seções afetadas com "baixa confiança de dados" na consolidação.',
    resolver: 'alex',
  },
  {
    id: 'CONF_RISK_VS_FORECAST',
    scenario: 'Risco aponta cenário pessimista que forecast não contemplou',
    agents_involved: ['falcao', 'edmundo'],
    resolution: 'Alex inclui cenário de stress do Falcão como downside no board presentation.',
    resolver: 'alex',
  },
  {
    id: 'CONF_CARLOS_CLASSIF_VS_BRUNA',
    scenario: 'Carlos identifica possível erro de classificação de lançamento',
    agents_involved: ['carlos', 'bruna'],
    resolution: 'Carlos registra hipótese e sugere revisão formal para Bruna. Bruna avalia e trata.',
    resolver: 'bruna',
  },
  {
    id: 'CONF_OPT_VS_RISK_ESCOLAR',
    scenario: 'Denilson propõe ação financeiramente boa, mas Falcão aponta risco escolar relevante',
    agents_involved: ['denilson', 'falcao'],
    resolution: 'Risco deve ser elevado para Alex. Risco não negociável não pode ser suavizado por ganho financeiro.',
    resolver: 'alex',
  },
  {
    id: 'CONF_FORECAST_FRAGILE_PREMISE',
    scenario: 'Edmundo projeta target case dependente de premissas frágeis que Falcão identifica',
    agents_involved: ['edmundo', 'falcao'],
    resolution: 'Falcão classifica fragilidade. Alex ajusta tom da recomendação final.',
    resolver: 'alex',
  },
  {
    id: 'CONF_DQ_FRAGILITY_CASCADE',
    scenario: 'Bruna indica fragilidade crítica na base que afeta confiança de Edmundo e prudência de Falcão',
    agents_involved: ['bruna', 'edmundo', 'falcao'],
    resolution: 'Fragilidade de base reduz confiança do Edmundo, aumenta prudência do Falcão e influencia narrativa do Alex.',
    resolver: 'alex',
  },
  {
    id: 'CONF_EXECUTIVO_MISSING_OWNERSHIP',
    scenario: 'Executivo identifica ausência de dono, prazo ou governança no material',
    agents_involved: ['executivo', 'alex'],
    resolution: 'Material deve ser reforçado. Executivo registra lacunas explícitas e ajustes obrigatórios.',
    resolver: 'executivo',
  },
];

// --------------------------------------------
// Override Policy
// --------------------------------------------

export interface OverridePolicy {
  id: string;
  scenario: string;
  who_can_override: 'admin' | 'alex';
  requires_justification: boolean;
  audit_required: boolean;
  description: string;
}

export const OVERRIDE_POLICIES: OverridePolicy[] = [
  {
    id: 'OVR_DQ_OVERRIDE_CAUTION',
    scenario: 'Bruna indica ressalvas críticas mas admin quer desconsiderar',
    who_can_override: 'admin',
    requires_justification: true,
    audit_required: true,
    description: 'Admin pode desconsiderar nível de cautela da Bruna com justificativa registrada no audit trail.',
  },
  {
    id: 'OVR_RISK_DOWNGRADE',
    scenario: 'Falcão classifica risco como critical mas admin discorda',
    who_can_override: 'admin',
    requires_justification: true,
    audit_required: true,
    description: 'Admin pode rebaixar severidade com justificativa registrada.',
  },
  {
    id: 'OVR_ALEX_APPROVE_WITH_CAVEAT',
    scenario: 'Alex consolida mas com ressalvas de qualidade ou risco',
    who_can_override: 'alex',
    requires_justification: false,
    audit_required: true,
    description: 'Alex pode aprovar com ressalva explícita no board presentation.',
  },
];

// --------------------------------------------
// Approval Escalation
// --------------------------------------------

export interface ApprovalEscalation {
  condition: string;
  escalation: string;
}

export const APPROVAL_ESCALATIONS: ApprovalEscalation[] = [
  {
    condition: 'Qualquer agente falha 2x no mesmo step',
    escalation: 'Admin notificado para revisão manual.',
  },
  {
    condition: 'Pipeline total dura mais de 5 minutos',
    escalation: 'Alerta de performance enviado ao admin.',
  },
  {
    condition: 'Consolidação do Alex tem confidence_level < 40',
    escalation: 'Run marcado como "low confidence" — requer aprovação manual.',
  },
];

// --------------------------------------------
// Helpers
// --------------------------------------------

export function getHaltConditionsForAgent(code: AgentCode): HaltCondition[] {
  return HALT_CONDITIONS.filter((h) => h.triggered_by === code);
}

export function getConflictsInvolving(code: AgentCode): ConflictRule[] {
  return CONFLICT_RULES.filter((c) => c.agents_involved.includes(code));
}

export function shouldHaltPipeline(
  agentCode: AgentCode,
  output: Record<string, unknown>,
): { halt: boolean; reason: string } {
  // Bruna NÃO bloqueia mais o pipeline.
  // Em vez disso, sinaliza o nível de cautela (high_confidence / moderate / critical reservations).
  // O pipeline sempre avança; Alex consolida com ressalva quando necessário.

  if (agentCode === 'falcao') {
    // New format: check brand exposures for critical + non-negotiable risks
    const brandExposures = output.risk_exposure_by_brand as Array<{ overall_risk_level?: string }> | undefined;
    const alertsPack = output.critical_alerts_pack as { critical_alerts?: unknown[] } | undefined;
    const execSummary = output.executive_risk_summary as { non_negotiable_risks?: string[] } | undefined;
    const criticalBrands = brandExposures?.filter(b => b.overall_risk_level === 'critical') || [];
    const criticalAlerts = alertsPack?.critical_alerts || [];
    const nonNegotiable = execSummary?.non_negotiable_risks || [];
    if ((criticalBrands.length > 0 && criticalAlerts.length >= 3) || nonNegotiable.length >= 2) {
      return { halt: true, reason: `Risco crítico: ${criticalAlerts.length} alertas críticos, ${nonNegotiable.length} riscos não negociáveis — consolidação com ressalva obrigatória.` };
    }
    // Backward compat: old format
    const riskLevel = output.overall_risk_level as string | undefined;
    const oldCriticals = output.critical_alerts as unknown[] | undefined;
    if (riskLevel === 'critical' && oldCriticals && oldCriticals.length >= 3) {
      return { halt: true, reason: `Risco crítico com ${oldCriticals.length} alertas — consolidação com ressalva obrigatória.` };
    }
  }
  return { halt: false, reason: '' };
}
