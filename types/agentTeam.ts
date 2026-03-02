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
  step_type: 'plan' | 'execute' | 'consolidate' | 'review';
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
  step_type: 'plan' | 'execute' | 'consolidate' | 'review';
  step_order: number;
  status: StepStatus;
  input_data: Record<string, unknown> | null;
  output_data: SupervisorPlanOutput | DataQualityOutput | PerformanceAnalysisOutput | OptimizationOutput | ForecastOutput | RiskOutput | ConsolidationOutput | DirectorReviewOutput | CEOReviewOutput | null;
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
  top_fornecedores_por_tag01?: VendorBreakdown[];
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

export interface VendorBreakdown {
  tag01: string;
  vendor: string;
  total_real: number;
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

export type CautionLevel = 'high_confidence' | 'proceed_with_moderate_reservations' | 'proceed_with_critical_reservations';
export type QualityClassification = 'excelente' | 'adequada' | 'atenção' | 'crítica';

export interface DataQualityOutput {
  executive_data_quality_summary: string;
  quality_score: number;
  quality_classification: QualityClassification;
  fragility_points: FragilityPoint[];
  normalization_actions: NormalizationAction[];
  data_integrity_risk_summary: DataIntegrityRiskSummary;
  correction_needed: boolean;
  recommended_caution_level: CautionLevel;
  recommendation_to_proceed_with_reservations: boolean;
  rationale_for_recommendation: string;
}

export interface FragilityPoint {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_area: string;
  affected_tags: string;
  scenario_affected: string;
  probable_cause: string;
  suggested_fix: string;
  analysis_impact: string;
}

export interface NormalizationAction {
  action_title: string;
  target_area: string;
  issue_reference: string;
  priority: 'high' | 'medium' | 'low';
  expected_benefit: string;
  owner_suggestion: string;
  dependency_level: string;
}

export interface DataIntegrityRiskSummary {
  overall_risk_level: string;
  most_sensitive_areas: string[];
  impact_on_performance: string;
  impact_on_optimization: string;
  impact_on_forecast: string;
  interpretive_caution: string;
}

/** @deprecated Use FragilityPoint instead */
export interface DataIssue {
  type: string;
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_value: string;
  suggested_fix: string;
}

export type VariationNature = 'erro_de_orcamento' | 'delta_operacional' | 'descasamento_temporal' | 'vazamento_entre_linhas' | 'nao_recorrente' | 'estrutural' | 'possivel_erro_de_classificacao';
export type ExecutiveRelevance = 'alta' | 'media' | 'baixa';
export type RecurrenceExpectation = 'deve_se_repetir' | 'nao_deve_se_repetir' | 'monitorar';

export interface PerformanceAnalysisOutput {
  executive_performance_summary: string;
  dre_line_analysis: DRELineAnalysis[];
  ranked_variations: RankedVariation[];
  margin_ebitda_impact: MarginEbitdaImpact;
  recommended_analytical_actions: RecommendedAnalyticalActions;
}

export interface DRELineAnalysis {
  dre_line: string;
  real_value: number;
  budget_value: number;
  a1_value: number;
  gap_vs_budget_value: number;
  gap_vs_budget_pct: number;
  gap_vs_a1_value: number;
  gap_vs_a1_pct: number;
  main_tag01: string;
  main_tag02: string;
  main_tag03: string;
  main_supplier: string;
  main_description: string;
  deviation_explanation: string;
  variation_nature: VariationNature;
  margin_impact: string;
  ebitda_impact: string;
  managerial_reading: string;
  suggested_analytical_action: string;
}

export interface RankedVariation {
  ranking_position: number;
  dre_line: string;
  tag01: string;
  tag02: string;
  tag03: string;
  real_value: number;
  budget_value: number;
  a1_value: number;
  gap_vs_budget_value: number;
  gap_vs_budget_pct: number;
  gap_vs_a1_value: number;
  gap_vs_a1_pct: number;
  supplier_main_reference: string;
  description_main_reference: string;
  budget_cross_check: string;
  prior_year_classification_check: string;
  supplier_history_check: string;
  timing_assessment: string;
  leakage_assessment: string;
  cause_explanation: string;
  variation_nature: VariationNature;
  margin_impact: string;
  ebitda_impact: string;
  recurrence_expectation: RecurrenceExpectation;
  executive_relevance: ExecutiveRelevance;
  classification_review_suggestion_to_bruna: string;
}

export interface MarginEbitdaImpact {
  margin_pressures: string[];
  margin_reliefs: string[];
  ebitda_pressures: string[];
  ebitda_reliefs: string[];
  consolidated_impact_reading: string;
}

export interface RecommendedAnalyticalActions {
  items_to_deepen: string[];
  lines_to_monitor: string[];
  budget_assumptions_to_review: string[];
  points_to_validate_with_bruna: string[];
  reclassification_candidates: string[];
}

/** @deprecated Use RankedVariation instead */
export interface PerformanceDeviation {
  area: string;
  tag01: string;
  description: string;
  real_value: number;
  budget_value: number;
  a1_value: number;
  absolute_gap: number;
  percentage_gap: number;
  materiality: 'high' | 'medium' | 'low';
  probable_driver: string;
  direction: 'positive' | 'negative';
}

/** @deprecated Use MarginEbitdaImpact instead */
export interface MarginAnalysis {
  current_margin_pct: number;
  budget_margin_pct: number;
  prior_year_margin_pct: number;
  assessment: string;
}

// --------------------------------------------
// Denilson — Optimization Output
// --------------------------------------------

export type OptActionType = 'reduce_cost' | 'revise_allocation' | 'renegotiate' | 'remove_non_recurring_pressure' | 'correct_operational_premise' | 'optimize_mix' | 'monitor_only' | 'reframe_budget_line';
export type ImpactType = 'real_financial_gain' | 'analytical_reframing' | 'operational_efficiency_gain' | 'mixed_effect';
export type ImplementationPriority = 'immediate' | 'high' | 'medium' | 'low';
export type FeasibilityLevel = 'high' | 'medium' | 'low';
export type ExecutionComplexity = 'low' | 'medium' | 'high';

export interface OptimizationOutput {
  brand_plans: BrandActionPlan[];
  optimization_summary: OptimizationSummary;
  constraints_feasibility: ConstraintsFeasibility;
  estimated_impact: EstimatedImpactReport;
  action_prioritization_matrix: ActionPrioritizationEntry[];
}

export interface BrandActionPlan {
  brand_name: string;
  objective_of_plan: string;
  current_main_issues: string[];
  proposed_actions: ProposedAction[];
  expected_gain_summary: string;
  notes_for_risk_review: string;
  notes_for_alex_consolidation: string;
}

export interface ProposedAction {
  action_title: string;
  action_type: OptActionType;
  target_dre_line: string;
  target_tag01: string;
  target_tag02: string;
  target_tag03: string;
  rationale: string;
  expected_impact_ebitda: number;
  expected_impact_margin: number;
  expected_impact_score: number;
  expected_impact_efficiency: string;
  impact_type: ImpactType;
  implementation_priority: ImplementationPriority;
  feasibility_level: FeasibilityLevel;
  execution_complexity: ExecutionComplexity;
  does_improve_real_result: boolean;
  does_improve_analytical_framing_only: boolean;
  recommended_owner: string;
  observation: string;
}

export interface OptimizationSummary {
  optimization_objective: string;
  main_levers: string[];
  best_plan_synthesis: string;
  expected_gain_by_brand: string[];
  feasibility_readings: string[];
  consolidation_notes: string;
}

export interface ConstraintsFeasibility {
  operational_constraints: string[];
  practical_limits: string[];
  low_feasibility_actions: string[];
  attention_items: string[];
  items_for_falcao_risk_review: string[];
}

export interface EstimatedImpactReport {
  total_ebitda_impact: number;
  total_margin_impact: number;
  total_score_impact: number;
  total_efficiency_impact: string;
  impact_by_brand: BrandImpact[];
  real_gain_total: number;
  analytical_reframing_total: number;
  mixed_gain_total: number;
}

export interface BrandImpact {
  brand_name: string;
  ebitda_impact: number;
  margin_impact: number;
  score_impact: number;
}

export interface ActionPrioritizationEntry {
  action_title: string;
  brand: string;
  expected_impact: string;
  priority: ImplementationPriority;
  feasibility: FeasibilityLevel;
  complexity: ExecutionComplexity;
  gain_type: ImpactType;
  implementation_note: string;
}

/** @deprecated Use ProposedAction instead */
export interface OptimizationAction {
  area: string;
  action_type: string;
  suggested_adjustment: string;
  estimated_impact_ebitda: number;
  estimated_impact_margin: number;
  estimated_impact_score: number;
  implementation_priority: 'high' | 'medium' | 'low';
  constraint_check: string;
}

/** @deprecated Use ConstraintsFeasibility instead */
export interface InfeasibleAction {
  area: string;
  action_type: string;
  reason: string;
}

/** @deprecated Use EstimatedImpactReport instead */
export interface OptimizationImpact {
  total_ebitda_gain: number;
  total_margin_gain: number;
  total_score_gain: number;
}

// --------------------------------------------
// Edmundo — Forecast Output (7 entregáveis)
// --------------------------------------------

export type TagClassification = 'opportunity' | 'risk';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ForecastOutput {
  brand_projections: BrandProjection[];
  adjusted_year_end_curve: AdjustedYearEndCurve;
  tag_opportunity_risk_map: TagOpportunityRiskEntry[];
  closing_gap_plan: ClosingGapPlan;
  sacrifice_map: SacrificeMap;
  confidence_report: ConfidenceLevelReport;
  curve_confirmation_signals: CurveConfirmationSignals;
}

// 1. Forecast Projection by Brand
export interface BrandProjection {
  brand_name: string;
  current_position_summary: string;
  year_end_projection: string;
  projected_ebitda: number;
  projected_margin: number;
  projected_score: number;
  projected_efficiency: string;
  projection_narrative: string;
  main_dependencies: string[];
  main_uncertainties: string[];
  base_case: ScenarioCase;
  target_case: ScenarioCase;
  stress_case: ScenarioCase;
}

export interface ScenarioCase {
  label: string;
  description: string;
  projected_ebitda: number;
  projected_margin: number;
  projected_revenue: number;
  key_assumptions: string[];
}

// 2. Adjusted Year-End Curve
export interface AdjustedYearEndCurve {
  original_curve: string;
  identified_outliers: OutlierEntry[];
  outlier_adjustment_rationale: string;
  adjusted_curve: string;
  year_end_adjusted_projection: string;
  difference_between_original_and_adjusted_curve: string;
  interpretation_of_adjusted_trajectory: string;
}

export interface OutlierEntry {
  event_description: string;
  month: string;
  impact_value: number;
  justification_for_removal: string;
}

// 3. Tag Opportunity & Risk Map
export interface TagOpportunityRiskEntry {
  tag_level: string;
  tag_name: string;
  classification: TagClassification;
  rationale: string;
  projected_effect_on_year_end: string;
  executable_action_plan: string;
  urgency: string;
  dependency: string;
  confidence_level_for_tag: ConfidenceLevel;
  if_executed_expected_effect: string;
  if_not_executed_expected_effect: string;
}

// 4. Closing Gap Plan
export interface ClosingGapPlan {
  brand_gaps: BrandGap[];
}

export interface BrandGap {
  brand_name: string;
  target_year_end_value: number;
  projected_year_end_value: number;
  gap_to_target: number;
  gap_breakdown_by_tag: TagGapBreakdown[];
  required_deliverables_to_close_gap: string[];
  milestone_expectations: string;
  execution_dependencies: string[];
  comments_on_feasibility: string;
}

export interface TagGapBreakdown {
  tag: string;
  contribution_to_gap: number;
  whether_gap_is_recoverable: boolean;
  action_needed: string;
}

// 5. Sacrifice Map
export interface SacrificeMap {
  commercial_sacrifices: SacrificeEntry[];
  operational_sacrifices: SacrificeEntry[];
  financial_sacrifices: SacrificeEntry[];
}

export interface SacrificeEntry {
  description: string;
  rationale: string;
  expected_benefit_if_sustained: string;
  risk_if_not_accepted: string;
}

// 6. Confidence Level Report
export interface ConfidenceLevelReport {
  brand_confidence_level: ConfidenceLevel;
  confidence_rationale: string;
  factors_increasing_confidence: string[];
  factors_reducing_confidence: string[];
  tag_confidence_breakdown: TagConfidence[];
  dependence_on_execution_level: string;
  sensitivity_to_data_quality: string;
  sensitivity_to_historical_stability: string;
}

export interface TagConfidence {
  tag_name: string;
  confidence_level: ConfidenceLevel;
  rationale: string;
}

// 7. Curve Confirmation Signals
export interface CurveConfirmationSignals {
  confirmation_signals: string[];
  invalidation_signals: string[];
  monitoring_deadlines: string[];
  tags_requiring_confirmation: string[];
  projection_revision_triggers: string[];
}

/** @deprecated Use BrandProjection with ScenarioCase instead */
export interface ForecastProjection {
  period: string;
  receita: number;
  ebitda: number;
  margem_pct: number;
}

// --------------------------------------------
// Falcão — Risk Output (7 entregáveis)
// --------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'financial_execution_risk' | 'school_operation_risk' | 'family_experience_risk' | 'reputation_risk' | 'safety_risk' | 'projection_fragility' | 'plan_dependency_risk' | 'second_order_effect';
export type RiskType = 'financial' | 'operational' | 'reputational' | 'school_operation' | 'execution' | 'projection' | 'mixed';
export type PlanSustainabilityLevel = 'robust' | 'acceptable_with_attention' | 'fragile' | 'critical';
export type AcceptabilityLevel = 'acceptable' | 'acceptable_with_mitigation' | 'non_negotiable';
export type SchoolSensitivity = 'low' | 'medium' | 'high' | 'critical';

export interface RiskOutput {
  risk_exposure_by_brand: BrandRiskExposure[];
  critical_alerts_pack: AlertsPack;
  tag_risk_map: TagRiskEntry[];
  plan_sustainability_review: PlanSustainabilityReview;
  curve_fragility_note: CurveFragilityNote;
  risk_acceptability_matrix: RiskAcceptabilityEntry[];
  executive_risk_summary: ExecutiveRiskSummary;
}

// 1. Risk Exposure Report by Brand
export interface BrandRiskExposure {
  brand_name: string;
  overall_risk_level: RiskLevel;
  risk_summary: string;
  key_risk_drivers: string[];
  relation_to_plan_execution: string;
  relation_to_year_end_closing: string;
  relation_to_school_operation: string;
  relation_to_family_experience: string;
  relation_to_unit_safety: string;
  key_points_for_executive_attention: string[];
}

// 2. Critical Alerts Pack
export interface AlertsPack {
  critical_alerts: RiskAlert[];
  high_alerts: RiskAlert[];
  medium_alerts: RiskAlert[];
  low_alerts: RiskAlert[];
}

export interface RiskAlert {
  alert_title: string;
  alert_type: AlertType;
  severity: RiskLevel;
  probability: 'high' | 'medium' | 'low';
  impact: string;
  brand: string;
  related_tag: string;
  rationale: string;
  mitigation: string;
  escalation_need: string;
}

// 3. Tag Risk Map
export interface TagRiskEntry {
  tag_level: string;
  tag_name: string;
  risk_type: RiskType;
  severity: RiskLevel;
  probability: 'high' | 'medium' | 'low';
  impact_on_year_end: string;
  impact_on_operation: string;
  impact_on_student_experience: string;
  impact_on_family_perception: string;
  impact_on_unit_safety: string;
  rationale: string;
  mitigation: string;
  escalation_trigger: string;
}

// 4. Plan Sustainability Review
export interface PlanSustainabilityReview {
  plan_sustainability_level: PlanSustainabilityLevel;
  main_fragilities_of_plan: string[];
  execution_dependencies: string[];
  operational_constraints: string[];
  school_operation_constraints: string[];
  family_experience_constraints: string[];
  sustainability_rationale: string;
}

// 5. Curve Fragility Note
export interface CurveFragilityNote {
  stable_points: string[];
  fragile_points: string[];
  target_case_risks: string[];
  stress_case_triggers: string[];
  confidence_overestimation_signals: string[];
  conditions_that_break_curve: string[];
}

// 6. Risk Acceptability & Mitigation Matrix
export interface RiskAcceptabilityEntry {
  risk_name: string;
  brand: string;
  acceptability_level: AcceptabilityLevel;
  school_operation_sensitivity: SchoolSensitivity;
  second_order_effect: string;
  minimum_mitigation_required: string;
  review_trigger: string;
  escalation_trigger: string;
  stop_trigger: string;
}

// 7. Executive Risk Summary
export interface ExecutiveRiskSummary {
  top_risks_to_elevate: string[];
  non_negotiable_risks: string[];
  critical_tags: string[];
  risks_that_can_delay_target_case: string[];
  required_executive_attention: string[];
  suggested_caution_tone_for_final_recommendation: string;
}

/** @deprecated Use RiskAlert (new format with alert_title, alert_type, brand, related_tag) */
export interface StressTest {
  scenario: string;
  impact_description: string;
  probability: 'high' | 'medium' | 'low';
  ebitda_impact_pct: number;
}

// --------------------------------------------
// Alex — Consolidation Output (expandido)
// --------------------------------------------

export interface ConsolidationOutput {
  consolidated_summary: string;
  cross_agent_conflicts: string[];
  final_recommendations: Recommendation[];
  confidence_level: number;
  board_presentation: BoardPresentationOutline;
}

export interface BoardPresentationOutline {
  presentation_title: string;
  executive_context: string;
  slides: PresentationSlide[];
}

export interface PresentationSlide {
  title: string;
  purpose: string;
  bullets: string[];
  key_message: string;
  optional_supporting_note: string;
}

export interface Recommendation {
  area: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  expected_impact: string;
}

// --------------------------------------------
// Diretor — Executive Committee Reviewer
// --------------------------------------------

export type DirectorQuestionCategory =
  | 'mensagem_principal'
  | 'performance'
  | 'plano_de_acao'
  | 'ownership'
  | 'prazo'
  | 'impacto'
  | 'risco'
  | 'governanca'
  | 'monitoramento'
  | 'decisao';

export type DirectorReadinessLevel = 'ready' | 'ready_with_adjustments' | 'not_ready';

export interface DirectorQuestion {
  question_id: string;
  question_category: DirectorQuestionCategory;
  question_text: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  why_director_would_ask: string;
  linked_material_section: string;
}

export interface ExpectedDirectorAnswer {
  linked_question_id: string;
  direct_answer: string;
  main_number: string;
  justification: string;
  owner: string;
  deadline: string;
  associated_decision: string;
  answer_confidence: 'high' | 'medium' | 'low';
  answer_gap_note: string;
}

export interface ExecutionOwnershipReview {
  actions_without_owner: string[];
  actions_without_deadline: string[];
  actions_without_metric: string[];
  vague_execution_points: string[];
  missing_governance_items: string[];
  required_execution_clarifications: string[];
}

export interface ExecutiveMaterialReadiness {
  readiness_level: DirectorReadinessLevel;
  readiness_rationale: string;
  strengths_of_material: string[];
  weak_points_of_material: string[];
  mandatory_adjustments_before_ceo: string[];
  recommendation_to_proceed_to_ceo: string;
}

export interface PreCEOReinforcement {
  points_to_reinforce_before_ceo: string[];
  numbers_that_must_be_ready: string[];
  fragile_arguments_to_strengthen: string[];
  ownership_points_to_make_explicit: string[];
  likely_escalation_topics: string[];
  presentation_adjustments_recommended: string[];
}

export interface DirectorReviewOutput {
  director_question_pack: DirectorQuestion[];
  expected_director_answer_pack: ExpectedDirectorAnswer[];
  execution_ownership_review: ExecutionOwnershipReview;
  executive_material_readiness: ExecutiveMaterialReadiness;
  pre_ceo_reinforcement: PreCEOReinforcement;
}

// --------------------------------------------
// CEO — Executive Challenger & Decision Readiness Reviewer
// --------------------------------------------

export type QuestionCategory =
  | 'resultado'
  | 'orçamento'
  | 'histórico'
  | 'causa_real'
  | 'plano_de_acao'
  | 'fechamento_do_ano'
  | 'sacrificios'
  | 'risco'
  | 'risco_escolar'
  | 'governanca'
  | 'decisao_final';

export type QuestionPriority = 'critical' | 'high' | 'medium' | 'low';

export type AnswerConfidence = 'high' | 'medium' | 'low';

export type ReadinessLevel = 'ready' | 'ready_with_adjustments' | 'not_ready';

export interface CEOQuestion {
  question_id: string;
  question_category: QuestionCategory;
  question_text: string;
  priority: QuestionPriority;
  why_ceo_would_ask: string;
  linked_agent_output: string;
}

export interface ExpectedAnswer {
  linked_question_id: string;
  direct_answer: string;
  main_number: string;
  justification: string;
  associated_action: string;
  answer_confidence: AnswerConfidence;
  answer_fragility_note: string;
}

export interface WeaknessReport {
  weak_points: string[];
  unsupported_claims: string[];
  vague_sections: string[];
  missing_numbers: string[];
  likely_ceo_discomfort_points: string[];
  points_requiring_reinforcement: string[];
}

export interface DecisionReadinessAssessment {
  readiness_level: ReadinessLevel;
  readiness_rationale: string;
  what_is_ready: string[];
  what_is_not_ready: string[];
  mandatory_fixes_before_meeting: string[];
  final_recommendation: string;
}

export interface ExecutiveRehearsalEntry {
  simulated_question: string;
  ideal_answer: string;
  risk_if_answered_badly: string;
  follow_up_question: string;
  best_reinforcement_point: string;
}

export interface CEOReviewOutput {
  ceo_question_pack: CEOQuestion[];
  expected_answer_pack: ExpectedAnswer[];
  weakness_exposure_report: WeaknessReport;
  decision_readiness: DecisionReadinessAssessment;
  executive_rehearsal: ExecutiveRehearsalEntry[];
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
