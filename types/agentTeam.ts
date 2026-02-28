// ============================================
// Equipe Financeira 2.0 — Interfaces TypeScript
// ============================================

// --------------------------------------------
// Entidades do banco de dados
// --------------------------------------------

export interface Team {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  code: string;
  name: string;
  role: string;
  description: string;
  avatar_color: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamAgent {
  id: string;
  team_id: string;
  agent_id: string;
  step_order: number;
  step_type: 'plan' | 'execute' | 'consolidate';
  is_active: boolean;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ReviewStatus = 'pending' | 'approved' | 'revision_requested';

export interface AgentRun {
  id: string;
  team_id: string;
  objective: string;
  status: RunStatus;
  dre_data_snapshot: Record<string, unknown> | null;
  financial_summary: FinancialSummary | null;
  filter_context: Record<string, unknown> | null;
  consolidated_summary: string | null;
  admin_comment: string | null;
  started_by: string;
  started_by_name: string;
  started_at: string;
  completed_at: string | null;
}

export interface AgentStep {
  id: string;
  run_id: string;
  agent_code: string;
  step_type: 'plan' | 'execute' | 'consolidate';
  step_order: number;
  status: StepStatus;
  input_data: Record<string, unknown> | null;
  output_data: SupervisorPlanOutput | DataQualityOutput | PerformanceAnalysisOutput | ConsolidationOutput | null;
  raw_output: string | null;
  error_message: string | null;
  review_status: ReviewStatus;
  review_comment: string | null;
  reviewed_by: string | null;
  tokens_input: number;
  tokens_output: number;
  model_used: string | null;
  duration_ms: number;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Agent Schedules
// --------------------------------------------

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface AgentSchedule {
  id: string;                    // UUID
  organization_id: string;       // UUID — RLS isolado
  team_id: string;               // UUID FK → teams
  name: string;
  objective_template: string;
  frequency: ScheduleFrequency;
  execution_time: string;        // "HH:MM"
  timezone: string;              // IANA timezone
  day_of_week: number | null;    // 0-6 (Sunday-Saturday), for weekly
  day_of_month: number | null;   // 1-28, for monthly
  is_active: boolean;
  next_run_at: string | null;    // ISO 8601
  last_run_at: string | null;    // ISO 8601
  filter_context: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Pre-Aggregation: Financial Summary
// --------------------------------------------

export interface ScenarioValues {
  real: number;
  orcado: number;
  a1: number;
}

export interface FinancialSummary {
  periodo: string;
  receita: ScenarioValues & { gap_pct: number };
  custos_variaveis: ScenarioValues;
  custos_fixos: ScenarioValues;
  sga: ScenarioValues;
  rateio: ScenarioValues;
  margem_contribuicao: { real: number; orcado: number; pct_real: number; pct_orcado: number; health: 'healthy' | 'attention' | 'critical' };
  ebitda: ScenarioValues & { pct_real: number };
  top5_variacoes: TagVariation[];
  top5_tags01_receita: TagTotal[];
  top5_tags01_custo: TagTotal[];
  tendencia_mensal: MonthlyTrend[];
}

export interface TagVariation {
  tag01: string;
  real: number;
  orcado: number;
  delta_pct: number;
}

export interface TagTotal {
  tag01: string;
  total: number;
}

export interface MonthlyTrend {
  mes: string;
  receita: number;
  ebitda: number;
}

// --------------------------------------------
// Agent Outputs (estruturados)
// --------------------------------------------

export interface SupervisorPlanOutput {
  executive_summary: string;
  key_findings: string[];
  priority_actions: string[];
  risks_identified: string[];
  assignments: AgentAssignment[];
}

export interface AgentAssignment {
  agent_code: string;
  objective: string;
  focus_areas: string[];
}

export interface DataQualityOutput {
  summary: string;
  quality_score: number;
  inconsistencies_found: DataIssue[];
  normalization_actions: string[];
  missing_mappings: string[];
  highlights: string[];
}

export interface DataIssue {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_value: string;
}

export interface PerformanceAnalysisOutput {
  summary: string;
  revenue_analysis: string;
  cost_analysis: string;
  margin_analysis: MarginAnalysis;
  deviations: PerformanceDeviation[];
  recommended_actions: string[];
  insights: string[];
}

export interface MarginAnalysis {
  current_margin_pct: number;
  budget_margin_pct: number;
  prior_year_margin_pct: number;
  assessment: string;
}

export interface PerformanceDeviation {
  tag01: string;
  description: string;
  impact_brl: number;
  direction: 'positive' | 'negative';
}

export interface ConsolidationOutput {
  consolidated_summary: string;
  cross_agent_conflicts: string[];
  final_recommendations: Recommendation[];
  confidence_level: number;
}

export interface Recommendation {
  area: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  expected_impact: string;
}

// --------------------------------------------
// API Request/Response types
// --------------------------------------------

export interface RunPipelineRequest {
  teamId: string;
  objective: string;
  dreSnapshot: Record<string, unknown>[];
  filterContext: Record<string, unknown>;
  startedBy: string;
  startedByName: string;
}

export interface RunPipelineResponse {
  runId: string;
}

export interface ProcessNextStepRequest {
  runId: string;
}

export interface ProcessNextStepResponse {
  processed: boolean;
  stepId: string | null;
  pipelineComplete: boolean;
}

export interface ReviewStepRequest {
  stepId: string;
  action: 'approve' | 'revision_requested';
  comment: string;
  reviewedBy: string;
}

export interface RerunStepRequest {
  stepId: string;
  revisionComment: string;
}

export interface GetRunResponse {
  run: AgentRun;
  steps: AgentStep[];
}

export interface ListRunsResponse {
  runs: AgentRun[];
}
