// ============================================
// Equipe Alpha — Agent Metadata (UI-facing)
// Metadata para renderização em UI e documentação
// ============================================

import type { AgentCode } from './agentRegistry';
import { ALPHA_AGENT_REGISTRY } from './agentRegistry';
import { ALPHA_MISSIONS } from './agentMissions';
import { ALPHA_PIPELINE } from './agentFlow';

export interface AgentCardMetadata {
  code: AgentCode;
  display_name: string;
  role_title: string;
  avatar_color: string;
  mission: string;
  ui_description: string;
  responsibilities_count: number;
  pipeline_steps: number[];
  output_contracts: string[];
  can_block_pipeline: boolean;
}

export function getAgentCardMetadata(code: AgentCode): AgentCardMetadata {
  const reg = ALPHA_AGENT_REGISTRY[code];
  const mission = ALPHA_MISSIONS[code];
  const steps = ALPHA_PIPELINE.filter((s) => s.agent_code === code);

  return {
    code: reg.code,
    display_name: reg.display_name,
    role_title: reg.role_title,
    avatar_color: reg.avatar_color,
    mission: mission.mission,
    ui_description: reg.ui_description,
    responsibilities_count: mission.responsibilities.length,
    pipeline_steps: steps.map((s) => s.step_order),
    output_contracts: steps.map((s) => s.output_contract),
    can_block_pipeline: steps.some((s) => s.can_block_pipeline),
  };
}

export function getAllAgentCards(): AgentCardMetadata[] {
  const codes: AgentCode[] = ['alex', 'bruna', 'carlos', 'denilson', 'edmundo', 'falcao', 'executivo'];
  return codes.map(getAgentCardMetadata);
}

export interface PipelineMatrixRow {
  step_order: number;
  agent_name: string;
  agent_code: AgentCode;
  label: string;
  input_from: string;
  output_contract: string;
  gate: string;
  next: string;
  can_block: boolean;
}

export function getPipelineMatrix(): PipelineMatrixRow[] {
  return ALPHA_PIPELINE.map((step) => ({
    step_order: step.step_order,
    agent_name: ALPHA_AGENT_REGISTRY[step.agent_code].display_name,
    agent_code: step.agent_code,
    label: step.label,
    input_from: step.receives_from.length > 0
      ? step.receives_from.map((c) => ALPHA_AGENT_REGISTRY[c].display_name).join(', ')
      : 'Financial Summary + Objective',
    output_contract: step.output_contract,
    gate: step.gate_description,
    next: step.next_agent === 'end' ? 'Pipeline Complete' : ALPHA_AGENT_REGISTRY[step.next_agent].display_name,
    can_block: step.can_block_pipeline,
  }));
}
