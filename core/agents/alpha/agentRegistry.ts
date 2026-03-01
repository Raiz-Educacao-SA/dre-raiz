// ============================================
// Equipe Alpha — Agent Registry
// Registro central de todos os agentes da equipe
// ============================================

export type AgentCode = 'alex' | 'bruna' | 'carlos' | 'denilson' | 'edmundo' | 'falcao' | 'diretor' | 'ceo';

export type StepType = 'plan' | 'execute' | 'consolidate' | 'review';

export interface AgentRegistryEntry {
  code: AgentCode;
  display_name: string;
  role_title: string;
  avatar_color: string;
  step_types: StepType[];
  input_dependencies: AgentCode[];
  output_contract_name: string;
  ui_description: string;
}

export const ALPHA_AGENT_REGISTRY: Record<AgentCode, AgentRegistryEntry> = {
  alex: {
    code: 'alex',
    display_name: 'Alex',
    role_title: 'Strategic Supervisor & Executive Consolidator',
    avatar_color: '#8b5cf6',
    step_types: ['plan', 'consolidate'],
    input_dependencies: [],
    output_contract_name: 'AlexPlanOutput | AlexConsolidationOutput',
    ui_description: 'Líder da inteligência decisória da Equipe Alpha. Converte objetivos em planos de análise, coordena agentes, integra outputs e transforma diagnósticos técnicos em recomendações executivas prontas para apresentação.',
  },
  bruna: {
    code: 'bruna',
    display_name: 'Bruna',
    role_title: 'Data Quality Specialist',
    avatar_color: '#f59e0b',
    step_types: ['execute'],
    input_dependencies: ['alex'],
    output_contract_name: 'BrunaDataQualityOutput',
    ui_description: 'Mapeia fragilidades de dados, classifica risco informacional e indica correções necessárias. Permite avanço da análise com o nível adequado de cautela, sem bloqueio automático.',
  },
  carlos: {
    code: 'carlos',
    display_name: 'Carlos',
    role_title: 'Performance Analyst',
    avatar_color: '#3b82f6',
    step_types: ['execute'],
    input_dependencies: ['alex', 'bruna'],
    output_contract_name: 'CarlosPerformanceOutput',
    ui_description: 'Ranqueia e explica as maiores variações da DRE por Tag01/02/03, fornecedor e descrição. Distingue erro de orçamento, delta operacional, timing e vazamento. Sinaliza reenquadramentos à Bruna.',
  },
  denilson: {
    code: 'denilson',
    display_name: 'Denilson',
    role_title: 'Optimization Architect',
    avatar_color: '#10b981',
    step_types: ['execute'],
    input_dependencies: ['alex', 'carlos'],
    output_contract_name: 'DenilsonOptimizationOutput',
    ui_description: 'Monta plano ótimo por marca: ações práticas e explicáveis para melhorar EBITDA, margem e score. Separa ganho real de ajuste analítico, sem misturar operações.',
  },
  edmundo: {
    code: 'edmundo',
    display_name: 'Edmundo',
    role_title: 'Forecast & Adaptive Intelligence Specialist',
    avatar_color: '#6366f1',
    step_types: ['execute'],
    input_dependencies: ['alex', 'carlos', 'denilson'],
    output_contract_name: 'EdmundoForecastOutput',
    ui_description: 'Projeta a curva de fechamento anual por marca, remove outliers, abre por Tags com oportunidades e riscos, calcula gap até o alvo e explicita sacrifícios necessários.',
  },
  falcao: {
    code: 'falcao',
    display_name: 'Falcão',
    role_title: 'Risk & Strategic Oversight Specialist',
    avatar_color: '#ef4444',
    step_types: ['execute'],
    input_dependencies: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo'],
    output_contract_name: 'FalcaoRiskOutput',
    ui_description: 'Avalia risco do plano, da curva e da operação escolar por marca. Classifica aceitável, mitigável e não negociável. Indica gatilhos de revisão, escalonamento e parada.',
  },
  diretor: {
    code: 'diretor',
    display_name: 'Diretor',
    role_title: 'Executive Committee Reviewer',
    avatar_color: '#475569',
    step_types: ['review'],
    input_dependencies: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao'],
    output_contract_name: 'DirectorReviewOutput',
    ui_description: 'Camada executiva intermediária. Revisa clareza, ownership, prazos, governança e prontidão do material antes do desafio final do CEO.',
  },
  ceo: {
    code: 'ceo',
    display_name: 'CEO',
    role_title: 'Executive Challenger & Decision Readiness Reviewer',
    avatar_color: '#1e293b',
    step_types: ['review'],
    input_dependencies: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao', 'diretor'],
    output_contract_name: 'CEOReviewOutput',
    ui_description: 'Revisor executivo final. Simula as perguntas críticas do CEO, testa a robustez do material, identifica fragilidades, prepara respostas defensáveis e avalia se o material está pronto para reunião.',
  },
};

export const ALPHA_AGENT_CODES: AgentCode[] = ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao', 'diretor', 'ceo'];

export function getAgentEntry(code: AgentCode): AgentRegistryEntry {
  return ALPHA_AGENT_REGISTRY[code];
}

export function getAgentsByStepType(stepType: StepType): AgentRegistryEntry[] {
  return ALPHA_AGENT_CODES
    .map((c) => ALPHA_AGENT_REGISTRY[c])
    .filter((a) => a.step_types.includes(stepType));
}
