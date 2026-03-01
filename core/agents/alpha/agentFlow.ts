// ============================================
// Equipe Alpha — Pipeline Flow Definition
// Define a cadeia operacional completa com 9 steps
// ============================================

import type { AgentCode, StepType } from './agentRegistry';

export interface PipelineStep {
  step_order: number;
  agent_code: AgentCode;
  step_type: StepType;
  label: string;
  receives_from: AgentCode[];
  output_contract: string;
  gate_description: string;
  next_agent: AgentCode | 'end';
  can_block_pipeline: boolean;
}

export const ALPHA_PIPELINE: PipelineStep[] = [
  {
    step_order: 1,
    agent_code: 'alex',
    step_type: 'plan',
    label: 'Strategic Analysis Plan',
    receives_from: [],
    output_contract: 'AlexPlanOutput',
    gate_description: 'Plano coerente com objetivo, assignments claros para todos os agentes.',
    next_agent: 'bruna',
    can_block_pipeline: false,
  },
  {
    step_order: 2,
    agent_code: 'bruna',
    step_type: 'execute',
    label: 'Data Quality Assessment',
    receives_from: ['alex'],
    output_contract: 'BrunaDataQualityOutput',
    gate_description: 'Score justificado, fragilidades estruturadas, nível de cautela definido, ações de normalização rastreáveis.',
    next_agent: 'carlos',
    can_block_pipeline: false,
  },
  {
    step_order: 3,
    agent_code: 'carlos',
    step_type: 'execute',
    label: 'Performance Analysis',
    receives_from: ['alex', 'bruna'],
    output_contract: 'CarlosPerformanceOutput',
    gate_description: 'Desvios materiais identificados, drivers explícitos, análise sem conclusões vagas.',
    next_agent: 'denilson',
    can_block_pipeline: false,
  },
  {
    step_order: 4,
    agent_code: 'denilson',
    step_type: 'execute',
    label: 'Optimization Plan',
    receives_from: ['alex', 'carlos'],
    output_contract: 'DenilsonOptimizationOutput',
    gate_description: 'Solução respeita restrições, ganho quantificado, ações inviáveis separadas.',
    next_agent: 'edmundo',
    can_block_pipeline: false,
  },
  {
    step_order: 5,
    agent_code: 'edmundo',
    step_type: 'execute',
    label: 'Year-End Forecast & Tag Analysis',
    receives_from: ['alex', 'carlos', 'denilson'],
    output_contract: 'EdmundoForecastOutput',
    gate_description: 'Projeção por marca com curva ajustada, gap explícito, Tags classificadas, sacrifícios claros, confiança por marca e Tag.',
    next_agent: 'falcao',
    can_block_pipeline: false,
  },
  {
    step_order: 6,
    agent_code: 'falcao',
    step_type: 'execute',
    label: 'Risk & Strategic Oversight',
    receives_from: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo'],
    output_contract: 'FalcaoRiskOutput',
    gate_description: 'Risco por marca avaliado, plano testado, curva validada, Tags críticas mapeadas, aceitabilidade classificada, mitigação indicada, contexto escolar considerado.',
    next_agent: 'alex',
    can_block_pipeline: true,
  },
  {
    step_order: 7,
    agent_code: 'alex',
    step_type: 'consolidate',
    label: 'Executive Consolidation & Board Presentation',
    receives_from: ['bruna', 'carlos', 'denilson', 'edmundo', 'falcao'],
    output_contract: 'AlexConsolidationOutput',
    gate_description: 'Consolidação resolve conflitos, recomendação justificada, PPT bullets claros e acionáveis.',
    next_agent: 'diretor',
    can_block_pipeline: false,
  },
  {
    step_order: 8,
    agent_code: 'diretor',
    step_type: 'review',
    label: 'Executive Committee Review & Ownership Validation',
    receives_from: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao'],
    output_contract: 'DirectorReviewOutput',
    gate_description: 'Perguntas de diretoria geradas, ownership cobrado, prazos verificados, prontidão avaliada, reforços para CEO preparados.',
    next_agent: 'ceo',
    can_block_pipeline: false,
  },
  {
    step_order: 9,
    agent_code: 'ceo',
    step_type: 'review',
    label: 'Executive Challenge & Decision Readiness Review',
    receives_from: ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao', 'diretor'],
    output_contract: 'CEOReviewOutput',
    gate_description: 'Perguntas executivas geradas, respostas defensáveis, fragilidades expostas, prontidão avaliada, ensaio executivo completo.',
    next_agent: 'end',
    can_block_pipeline: false,
  },
];

export function getPipelineStep(stepOrder: number): PipelineStep | undefined {
  return ALPHA_PIPELINE.find((s) => s.step_order === stepOrder);
}

export function getAgentSteps(agentCode: AgentCode): PipelineStep[] {
  return ALPHA_PIPELINE.filter((s) => s.agent_code === agentCode);
}

export function getBlockingAgents(): PipelineStep[] {
  return ALPHA_PIPELINE.filter((s) => s.can_block_pipeline);
}

export const ALPHA_PIPELINE_LENGTH = ALPHA_PIPELINE.length;
