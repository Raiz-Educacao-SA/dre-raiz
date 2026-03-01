// ============================================
// Equipe Alpha — Public API
// ============================================

export {
  type AgentCode,
  type StepType,
  type AgentRegistryEntry,
  ALPHA_AGENT_REGISTRY,
  ALPHA_AGENT_CODES,
  getAgentEntry,
  getAgentsByStepType,
} from './agentRegistry';

export {
  type AgentMission,
  ALPHA_MISSIONS,
  getAgentMission,
} from './agentMissions';

export {
  type PipelineStep,
  ALPHA_PIPELINE,
  ALPHA_PIPELINE_LENGTH,
  getPipelineStep,
  getAgentSteps,
  getBlockingAgents,
} from './agentFlow';

export {
  type HaltCondition,
  type ConflictRule,
  type OverridePolicy,
  type ApprovalEscalation,
  HALT_CONDITIONS,
  CONFLICT_RULES,
  OVERRIDE_POLICIES,
  APPROVAL_ESCALATIONS,
  getHaltConditionsForAgent,
  getConflictsInvolving,
  shouldHaltPipeline,
} from './approvalRules';

export {
  type AgentCardMetadata,
  type PipelineMatrixRow,
  getAgentCardMetadata,
  getAllAgentCards,
  getPipelineMatrix,
} from './agentMetadata';
