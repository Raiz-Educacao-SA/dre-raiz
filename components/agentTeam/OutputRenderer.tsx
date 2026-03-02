import React from 'react';
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Shield, TrendingUp, FileText, Users, Target, Zap, BarChart3, Presentation } from 'lucide-react';
import type {
  AgentStep,
  SupervisorPlanOutput,
  DataQualityOutput,
  FragilityPoint,
  NormalizationAction,
  PerformanceAnalysisOutput,
  RankedVariation,
  DRELineAnalysis,
  OptimizationOutput,
  BrandActionPlan,
  ProposedAction,
  ActionPrioritizationEntry,
  ForecastOutput,
  BrandProjection,
  TagOpportunityRiskEntry,
  BrandGap,
  TagGapBreakdown,
  SacrificeEntry,
  TagConfidence,
  RiskOutput,
  BrandRiskExposure,
  RiskAlert,
  TagRiskEntry,
  PlanSustainabilityReview,
  CurveFragilityNote,
  RiskAcceptabilityEntry,
  ExecutiveRiskSummary,
  ConsolidationOutput,
  Recommendation,
  PresentationSlide,
  DirectorReviewOutput,
  DirectorQuestion,
  ExpectedDirectorAnswer,
  ExecutionOwnershipReview,
  ExecutiveMaterialReadiness,
  PreCEOReinforcement,
  CEOReviewOutput,
  CEOQuestion,
  ExpectedAnswer,
  WeaknessReport,
  DecisionReadinessAssessment,
  ExecutiveRehearsalEntry,
} from '../../types/agentTeam';

// --------------------------------------------
// Props
// --------------------------------------------

interface OutputRendererProps {
  step: AgentStep;
}

// --------------------------------------------
// ErrorBoundary — captura crashes de renderização
// quando IA retorna formato inesperado
// --------------------------------------------

interface ErrorBoundaryState { hasError: boolean; error?: Error }

class OutputErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackData?: unknown },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallbackData?: unknown }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-amber-200 rounded-lg p-3 space-y-2 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={14} />
            <span className="text-xs font-bold">Formato de saída incompatível — exibindo dados brutos</span>
          </div>
          <p className="text-[10px] text-amber-600">{this.state.error?.message}</p>
          {this.props.fallbackData && (
            <pre className="text-[10px] text-gray-600 bg-white rounded p-2 overflow-x-auto max-h-96 border border-gray-200">
              {JSON.stringify(this.props.fallbackData, null, 2)}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// --------------------------------------------
// Severity / Priority badges
// --------------------------------------------

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  low:      { bg: 'bg-gray-100',   text: 'text-gray-600' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:     { bg: 'bg-red-100',    text: 'text-red-700' },
  critical: { bg: 'bg-red-200',    text: 'text-red-800' },
};

function SeverityBadge({ level }: { level: string }) {
  const style = SEVERITY_STYLES[level] || SEVERITY_STYLES.low;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.bg} ${style.text}`}>
      {level}
    </span>
  );
}

// --------------------------------------------
// Section helpers
// --------------------------------------------

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
      {icon}
      {children}
    </h4>
  );
}

// Defensivo: IA pode retornar objetos onde esperamos strings
function safeStr(val: unknown): string | null {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (val && typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return null; }
  }
  return null;
}

/** Safely render any value — prevents "Objects are not valid as React child" crash */
function safeVal(val: unknown): string {
  if (val == null) return '—';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toLocaleString('pt-BR');
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return '—'; }
  }
  return String(val);
}

/** Safely extract number from potentially object value */
function safeNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') { const n = parseFloat(val); return isNaN(n) ? fallback : n; }
  return fallback;
}

function TextBlock({ text }: { text: unknown }) {
  const s = safeStr(text);
  if (!s) return <p className="text-xs text-gray-400 italic">&mdash;</p>;
  return <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{s}</p>;
}

/** Inline safe render — use anywhere a value might be an object: {S(val)} */
function S(val: unknown): string {
  return safeVal(val);
}

function BulletList({ items }: { items: unknown[] | undefined | null }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => {
        const s = safeStr(item);
        if (!s) return null;
        return (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
            {s}
          </li>
        );
      })}
    </ul>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-gray-100 rounded-lg p-3 space-y-2">{children}</div>;
}

// ============================================
// ALEX — Plan View
// ============================================

function SupervisorPlanView({ data }: { data: SupervisorPlanOutput }) {
  const assignments = data.assignments || [];
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-indigo-500" />}>Resumo Executivo</SectionTitle>
        <TextBlock text={data.executive_summary} />
      </Card>
      <Card>
        <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Achados Principais</SectionTitle>
        <BulletList items={data.key_findings} />
      </Card>
      <Card>
        <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Ações Prioritárias</SectionTitle>
        <BulletList items={data.priority_actions} />
      </Card>
      {(data.risks_identified?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Riscos Identificados</SectionTitle>
          <BulletList items={data.risks_identified} />
        </Card>
      )}
      {assignments.length > 0 && (
        <Card>
          <SectionTitle icon={<Users size={12} className="text-purple-500" />}>Atribuições</SectionTitle>
          <div className="space-y-2">
            {assignments.map((a, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <span className="text-xs font-bold text-gray-900 capitalize">{S(a.agent_code)}</span>
                <p className="text-[11px] text-gray-600">{S(a.objective)}</p>
                <div className="flex flex-wrap gap-1">
                  {(a.focus_areas || []).map((f, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-medium">{S(f)}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// BRUNA — Data Quality View
// ============================================

const CAUTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high_confidence:                        { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Alta Confiança' },
  proceed_with_moderate_reservations:     { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Ressalvas Moderadas' },
  proceed_with_critical_reservations:     { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Ressalvas Críticas' },
};

const CLASSIFICATION_STYLES: Record<string, { bg: string; text: string }> = {
  'excelente': { bg: 'bg-green-100',  text: 'text-green-700' },
  'adequada':  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  'atenção':   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'crítica':   { bg: 'bg-red-100',    text: 'text-red-700' },
};

function DataQualityView({ data }: { data: DataQualityOutput }) {
  const score = data.quality_score ?? 0;
  // Compatibilidade: aceitar formato antigo (summary) e novo (executive_data_quality_summary)
  const summary = data.executive_data_quality_summary || (data as any).summary || '';
  const classification = data.quality_classification || (score >= 85 ? 'excelente' : score >= 65 ? 'adequada' : score >= 40 ? 'atenção' : 'crítica');
  const classStyle = CLASSIFICATION_STYLES[classification] || CLASSIFICATION_STYLES['atenção'];
  const cautionLevel = data.recommended_caution_level || 'high_confidence';
  const cautionStyle = CAUTION_STYLES[cautionLevel] || CAUTION_STYLES.high_confidence;
  const fragilityPoints = data.fragility_points || (data as any).inconsistencies_found || [];
  const normActions = data.normalization_actions || [];
  const riskSummary = data.data_integrity_risk_summary;

  return (
    <div className="space-y-3">
      {/* Score + Classification + Caution Level */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Shield size={12} className="text-amber-500" />}>Qualidade de Dados</SectionTitle>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${classStyle.bg} ${classStyle.text}`}>
              {S(classification)}
            </span>
            <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(score)}
            </span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>
        <TextBlock text={summary} />
        {/* Caution Level Banner */}
        <div className={`flex items-center gap-2 ${cautionStyle.bg} rounded-lg px-3 py-2 text-xs ${cautionStyle.text} font-semibold`}>
          <Shield size={14} />
          Nível de Cautela: {cautionStyle.label}
        </div>
        {data.rationale_for_recommendation && (
          <p className="text-[11px] text-gray-500 italic">{S(data.rationale_for_recommendation)}</p>
        )}
      </Card>

      {/* Fragility Points */}
      {fragilityPoints.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>Fragilidades ({fragilityPoints.length})</SectionTitle>
          <div className="space-y-2">
            {fragilityPoints.map((fp: FragilityPoint, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <SeverityBadge level={S(fp.severity || (fp as any).severity || 'low')} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-900">{S(fp.affected_area || (fp as any).area || '—')}</p>
                    {fp.type && (
                      <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[8px] font-mono">{S(fp.type)}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600">{S(fp.description)}</p>
                  {fp.probable_cause && <p className="text-[10px] text-gray-400">Causa: {S(fp.probable_cause)}</p>}
                  {fp.analysis_impact && <p className="text-[10px] text-blue-500">Impacto: {S(fp.analysis_impact)}</p>}
                  {fp.suggested_fix && <p className="text-[10px] text-green-600">Correção: {S(fp.suggested_fix)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Data Integrity Risk Summary */}
      {riskSummary && (
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-orange-500" />}>Risco Informacional</SectionTitle>
          {typeof riskSummary === 'string' ? (
            <TextBlock text={riskSummary} />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Risco Geral:</span>
                <SeverityBadge level={S(riskSummary.overall_risk_level || 'low')} />
              </div>
              {riskSummary.most_sensitive_areas?.length > 0 && (
                <div>
                  <span className="text-[10px] text-gray-500">Áreas sensíveis:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {riskSummary.most_sensitive_areas.map((a: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[9px] font-medium">{S(a)}</span>
                    ))}
                  </div>
                </div>
              )}
              {riskSummary.impact_on_performance && <p className="text-[10px] text-gray-600"><span className="font-medium">Performance:</span> {S(riskSummary.impact_on_performance)}</p>}
              {riskSummary.impact_on_optimization && <p className="text-[10px] text-gray-600"><span className="font-medium">Otimização:</span> {S(riskSummary.impact_on_optimization)}</p>}
              {riskSummary.impact_on_forecast && <p className="text-[10px] text-gray-600"><span className="font-medium">Forecast:</span> {S(riskSummary.impact_on_forecast)}</p>}
              {riskSummary.interpretive_caution && <p className="text-[10px] text-amber-600 font-medium mt-1">{S(riskSummary.interpretive_caution)}</p>}
            </div>
          )}
        </Card>
      )}

      {/* Normalization Actions */}
      {normActions.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações de Normalização ({normActions.length})</SectionTitle>
          <div className="space-y-2">
            {normActions.map((action: NormalizationAction | string, i: number) => {
              if (typeof action === 'string') {
                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    {action}
                  </li>
                );
              }
              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={S(action.priority || 'medium')} />
                    <span className="text-xs font-medium text-gray-900">{S(action.action_title)}</span>
                  </div>
                  {action.target_area && <p className="text-[10px] text-gray-500">Área: {S(action.target_area)}</p>}
                  {action.expected_benefit && <p className="text-[10px] text-green-600">{S(action.expected_benefit)}</p>}
                  {action.owner_suggestion && <p className="text-[10px] text-gray-400">Responsável sugerido: {S(action.owner_suggestion)}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// CARLOS — Performance View
// ============================================

const NATURE_LABELS: Record<string, { label: string; color: string }> = {
  erro_de_orcamento:              { label: 'Erro Orçamento',       color: 'bg-orange-100 text-orange-700' },
  delta_operacional:              { label: 'Delta Operacional',    color: 'bg-blue-100 text-blue-700' },
  descasamento_temporal:          { label: 'Timing',               color: 'bg-purple-100 text-purple-700' },
  vazamento_entre_linhas:         { label: 'Vazamento',            color: 'bg-yellow-100 text-yellow-700' },
  nao_recorrente:                 { label: 'Não Recorrente',       color: 'bg-gray-100 text-gray-700' },
  estrutural:                     { label: 'Estrutural',           color: 'bg-red-100 text-red-700' },
  possivel_erro_de_classificacao: { label: 'Erro Classificação?',  color: 'bg-pink-100 text-pink-700' },
};

const RELEVANCE_STYLES: Record<string, string> = {
  alta:  'bg-red-50 text-red-700',
  media: 'bg-yellow-50 text-yellow-700',
  baixa: 'bg-gray-50 text-gray-600',
};

function PerformanceView({ data }: { data: PerformanceAnalysisOutput }) {
  const rankedVariations = data.ranked_variations || (data as any).key_deviations || [];
  const dreLines = data.dre_line_analysis || [];
  const impact = data.margin_ebitda_impact;
  const actions = data.recommended_analytical_actions;
  // Compatibilidade com formato antigo
  const hasOldFormat = !!(data as any).revenue_analysis || !!(data as any).key_deviations;

  return (
    <div className="space-y-3">
      {/* Executive Summary */}
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-blue-500" />}>Resumo Executivo</SectionTitle>
        <TextBlock text={typeof data.executive_performance_summary === 'string' ? data.executive_performance_summary : null} />
      </Card>

      {/* Ranked Variations — entregável principal */}
      {rankedVariations.length > 0 && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-indigo-500" />}>
            Ranking de Variações ({rankedVariations.length})
          </SectionTitle>
          <div className="space-y-3">
            {rankedVariations.map((v: RankedVariation, i: number) => {
              const nature = NATURE_LABELS[v.variation_nature] || NATURE_LABELS.delta_operacional;
              const gapBudget = v.gap_vs_budget_value ?? (v as any).absolute_gap ?? 0;
              const gapBudgetPct = v.gap_vs_budget_pct ?? (v as any).percentage_gap ?? 0;
              const gapA1 = v.gap_vs_a1_value ?? 0;
              const gapA1Pct = v.gap_vs_a1_pct ?? 0;
              const isNeg = gapBudget < 0;
              const relevance = RELEVANCE_STYLES[v.executive_relevance] || RELEVANCE_STYLES.media;

              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
                  {/* Header: position + line + nature + relevance */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold shrink-0">
                      {S(v.ranking_position || i + 1)}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{S(v.dre_line || (v as any).area || v.tag01)}</span>
                    {v.tag01 && v.tag01 !== v.dre_line && (
                      <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-medium">{S(v.tag01)}</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${nature.color}`}>{S(nature.label)}</span>
                    {v.executive_relevance && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${relevance}`}>{S(v.executive_relevance)}</span>
                    )}
                  </div>
                  {/* Gap values */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className={`font-bold ${isNeg ? 'text-red-600' : 'text-green-600'}`}>
                      {isNeg ? '' : '+'}R$ {Math.abs(gapBudget).toLocaleString('pt-BR')} vs Orçado ({gapBudgetPct.toFixed(1)}%)
                    </span>
                    {gapA1 !== 0 && (
                      <span className={`font-medium ${gapA1 < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {gapA1 < 0 ? '' : '+'}R$ {Math.abs(gapA1).toLocaleString('pt-BR')} vs A-1 ({gapA1Pct.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  {/* Cause + context */}
                  <p className="text-[11px] text-gray-700">{S(v.cause_explanation || (v as any).description || '')}</p>
                  {/* Supplier / Description */}
                  {(v.supplier_main_reference || v.description_main_reference) && (
                    <p className="text-[10px] text-gray-400">
                      {v.supplier_main_reference && <>Fornecedor: {S(v.supplier_main_reference)}</>}
                      {v.supplier_main_reference && v.description_main_reference && ' | '}
                      {v.description_main_reference && <>Desc: {S(v.description_main_reference)}</>}
                    </p>
                  )}
                  {/* Investigation details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[9px] text-gray-400">
                    {v.budget_cross_check && <span>Orçamento: {S(v.budget_cross_check)}</span>}
                    {v.timing_assessment && <span>Timing: {S(v.timing_assessment)}</span>}
                    {v.leakage_assessment && <span>Vazamento: {S(v.leakage_assessment)}</span>}
                    {v.recurrence_expectation && <span>Recorrência: {S(String(v.recurrence_expectation).replace(/_/g, ' '))}</span>}
                  </div>
                  {/* Signal to Bruna */}
                  {v.classification_review_suggestion_to_bruna && (
                    <p className="text-[10px] text-pink-600 font-medium">
                      Sinalização Bruna: {S(v.classification_review_suggestion_to_bruna)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* DRE Line Analysis */}
      {dreLines.length > 0 && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Análise por Linha da DRE ({dreLines.length})</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-100">
                  <th className="pb-1 font-medium">Linha</th>
                  <th className="pb-1 font-medium text-right">Real</th>
                  <th className="pb-1 font-medium text-right">Orçado</th>
                  <th className="pb-1 font-medium text-right">Gap</th>
                  <th className="pb-1 font-medium text-right">Gap %</th>
                  <th className="pb-1 font-medium">Natureza</th>
                </tr>
              </thead>
              <tbody>
                {dreLines.map((l: DRELineAnalysis, i: number) => {
                  const nature = NATURE_LABELS[l.variation_nature] || NATURE_LABELS.delta_operacional;
                  const isNeg = (l.gap_vs_budget_value ?? 0) < 0;
                  return (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-1 text-gray-700 font-medium">{S(l.dre_line)}</td>
                      <td className="py-1 text-right text-gray-900">R$ {(l.real_value ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="py-1 text-right text-gray-600">R$ {(l.budget_value ?? 0).toLocaleString('pt-BR')}</td>
                      <td className={`py-1 text-right font-medium ${isNeg ? 'text-red-600' : 'text-green-600'}`}>
                        R$ {Math.abs(l.gap_vs_budget_value ?? 0).toLocaleString('pt-BR')}
                      </td>
                      <td className={`py-1 text-right ${isNeg ? 'text-red-500' : 'text-green-500'}`}>
                        {(l.gap_vs_budget_pct ?? 0).toFixed(1)}%
                      </td>
                      <td className="py-1">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${nature.color}`}>{S(nature.label)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Margin & EBITDA Impact */}
      {impact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <SectionTitle icon={<ArrowDownRight size={12} className="text-red-500" />}>Pressões</SectionTitle>
            {(impact.margin_pressures?.length ?? 0) > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-500 font-medium">Margem</p>
                <BulletList items={impact.margin_pressures} />
              </div>
            )}
            {(impact.ebitda_pressures?.length ?? 0) > 0 && (
              <div className="space-y-0.5 mt-2">
                <p className="text-[10px] text-gray-500 font-medium">EBITDA</p>
                <BulletList items={impact.ebitda_pressures} />
              </div>
            )}
          </Card>
          <Card>
            <SectionTitle icon={<ArrowUpRight size={12} className="text-green-500" />}>Alívios</SectionTitle>
            {(impact.margin_reliefs?.length ?? 0) > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-500 font-medium">Margem</p>
                <BulletList items={impact.margin_reliefs} />
              </div>
            )}
            {(impact.ebitda_reliefs?.length ?? 0) > 0 && (
              <div className="space-y-0.5 mt-2">
                <p className="text-[10px] text-gray-500 font-medium">EBITDA</p>
                <BulletList items={impact.ebitda_reliefs} />
              </div>
            )}
          </Card>
        </div>
      )}
      {impact?.consolidated_impact_reading && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-indigo-500" />}>Leitura Consolidada de Impacto</SectionTitle>
          <TextBlock text={impact.consolidated_impact_reading} />
        </Card>
      )}

      {/* Recommended Analytical Actions */}
      {actions && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações Analíticas Recomendadas</SectionTitle>
          <div className="space-y-2">
            {(actions.items_to_deepen?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 font-medium mb-0.5">Aprofundar</p>
                <BulletList items={actions.items_to_deepen} />
              </div>
            )}
            {(actions.lines_to_monitor?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 font-medium mb-0.5">Monitorar</p>
                <BulletList items={actions.lines_to_monitor} />
              </div>
            )}
            {(actions.budget_assumptions_to_review?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 font-medium mb-0.5">Premissas a Revisar</p>
                <BulletList items={actions.budget_assumptions_to_review} />
              </div>
            )}
            {(actions.points_to_validate_with_bruna?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-pink-500 font-medium mb-0.5">Validar com Bruna</p>
                <BulletList items={actions.points_to_validate_with_bruna} />
              </div>
            )}
            {(actions.reclassification_candidates?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-pink-500 font-medium mb-0.5">Candidatos a Reclassificação</p>
                <BulletList items={actions.reclassification_candidates} />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Fallback: old format fields */}
      {hasOldFormat && !actions && (
        <>
          {((data as any).key_positive_drivers?.length ?? 0) > 0 && (
            <Card>
              <SectionTitle icon={<ArrowUpRight size={12} className="text-green-500" />}>Drivers Positivos</SectionTitle>
              <BulletList items={(data as any).key_positive_drivers} />
            </Card>
          )}
          {((data as any).key_negative_drivers?.length ?? 0) > 0 && (
            <Card>
              <SectionTitle icon={<ArrowDownRight size={12} className="text-red-500" />}>Drivers Negativos</SectionTitle>
              <BulletList items={(data as any).key_negative_drivers} />
            </Card>
          )}
          {((data as any).recommended_actions?.length ?? 0) > 0 && (
            <Card>
              <SectionTitle icon={<Target size={12} className="text-indigo-500" />}>Recomendações</SectionTitle>
              <BulletList items={(data as any).recommended_actions} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// DENILSON — Optimization View
// ============================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  reduce_cost: 'Reduzir Custo',
  revise_allocation: 'Revisar Alocação',
  renegotiate: 'Renegociar',
  remove_non_recurring_pressure: 'Não Recorrente',
  correct_operational_premise: 'Corrigir Premissa',
  optimize_mix: 'Otimizar Mix',
  monitor_only: 'Monitorar',
  reframe_budget_line: 'Reenquadrar',
};

const IMPACT_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  real_financial_gain:          { label: 'Ganho Real',      color: 'bg-green-100 text-green-700' },
  analytical_reframing:         { label: 'Reenquadramento', color: 'bg-blue-100 text-blue-700' },
  operational_efficiency_gain:  { label: 'Eficiência',      color: 'bg-purple-100 text-purple-700' },
  mixed_effect:                 { label: 'Misto',           color: 'bg-yellow-100 text-yellow-700' },
};

function OptimizationView({ data }: { data: OptimizationOutput }) {
  const brandPlans = data.brand_plans || [];
  const summary = data.optimization_summary;
  const impact = data.estimated_impact;
  const constraints = data.constraints_feasibility;
  const matrix = data.action_prioritization_matrix || [];
  // Compatibilidade com formato antigo
  const hasOldFormat = !!(data as any).optimization_objective && !brandPlans.length;

  if (hasOldFormat) {
    const oldActions = (data as any).proposed_actions || [];
    return (
      <div className="space-y-3">
        <Card>
          <SectionTitle icon={<Zap size={12} className="text-emerald-500" />}>Objetivo</SectionTitle>
          <TextBlock text={(data as any).optimization_objective} />
        </Card>
        {oldActions.length > 0 && (
          <Card>
            <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações ({oldActions.length})</SectionTitle>
            <div className="space-y-2">
              {oldActions.map((a: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={S(a.implementation_priority || 'medium')} />
                    <span className="text-xs font-medium text-gray-900">{S(a.area || a.action_title)}</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{S(a.suggested_adjustment || a.rationale)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card>
          <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Racional</SectionTitle>
          <TextBlock text={(data as any).optimization_rationale} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary + Impact Overview */}
      {summary && (
        <Card>
          <SectionTitle icon={<Zap size={12} className="text-emerald-500" />}>Resumo da Otimização</SectionTitle>
          <TextBlock text={summary.best_plan_synthesis} />
          {(summary.main_levers?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-gray-500 font-medium">Principais Alavancas:</p>
              <BulletList items={summary.main_levers} />
            </div>
          )}
        </Card>
      )}

      {/* Estimated Impact */}
      {impact && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Impacto Estimado</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">EBITDA</p>
              <p className="text-sm font-bold text-green-700">+R$ {safeNum(impact.total_ebitda_impact ?? (impact as any).total_ebitda_gain ?? (impact as any).total_ebitda_potential).toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Margem</p>
              <p className="text-sm font-bold text-green-700">+{safeNum(impact.total_margin_impact ?? (impact as any).total_margin_gain ?? (impact as any).total_margin_improvement).toFixed(1)}pp</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Score</p>
              <p className="text-sm font-bold text-green-700">+{safeNum(impact.total_score_impact ?? (impact as any).total_score_gain).toFixed(0)}pts</p>
            </div>
          </div>
          {/* Gain type breakdown */}
          {(safeNum(impact.real_gain_total ?? (impact as any).real_gain) > 0 || safeNum(impact.analytical_reframing_total ?? (impact as any).analytical_adjustment) > 0) && (
            <div className="flex items-center gap-3 mt-2 text-[10px]">
              {safeNum(impact.real_gain_total ?? (impact as any).real_gain) > 0 && (
                <span className="text-green-600 font-medium">Ganho Real: R$ {safeNum(impact.real_gain_total ?? (impact as any).real_gain).toLocaleString('pt-BR')}</span>
              )}
              {safeNum(impact.analytical_reframing_total ?? (impact as any).analytical_adjustment) > 0 && (
                <span className="text-blue-600 font-medium">Reenquadramento: R$ {safeNum(impact.analytical_reframing_total ?? (impact as any).analytical_adjustment).toLocaleString('pt-BR')}</span>
              )}
              {safeNum(impact.mixed_gain_total) > 0 && (
                <span className="text-yellow-600 font-medium">Misto: R$ {safeNum(impact.mixed_gain_total).toLocaleString('pt-BR')}</span>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Brand Plans — main deliverable */}
      {brandPlans.map((bp: BrandActionPlan, bi: number) => (
        <div key={bi} className="border-2 border-emerald-200 rounded-lg overflow-hidden">
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-600" />
              <h3 className="text-xs font-bold text-emerald-900">{S(bp.brand_name)}</h3>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5">{S(bp.objective_of_plan)}</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {/* Issues */}
            {(bp.current_main_issues?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Problemas Atuais:</p>
                <BulletList items={bp.current_main_issues} />
              </div>
            )}
            {/* Proposed Actions */}
            {(bp.proposed_actions?.length ?? 0) > 0 && (
              <div className="space-y-2 mt-1">
                <p className="text-[10px] text-gray-500 font-medium">Ações Propostas ({bp.proposed_actions.length}):</p>
                {bp.proposed_actions.map((a: ProposedAction, ai: number) => {
                  const impType = IMPACT_TYPE_STYLES[a.impact_type] || IMPACT_TYPE_STYLES.real_financial_gain;
                  return (
                    <div key={ai} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge level={S(a.implementation_priority || 'medium')} />
                        <span className="text-xs font-medium text-gray-900">{S(a.action_title)}</span>
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${impType.color}`}>{S(impType.label)}</span>
                        {a.action_type && (
                          <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[8px]">
                            {S(ACTION_TYPE_LABELS[a.action_type] || a.action_type)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-700">{S(a.rationale)}</p>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-green-600 font-medium">
                          EBITDA: +R$ {(a.expected_impact_ebitda ?? 0).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-green-600">
                          Margem: +{(a.expected_impact_margin ?? 0).toFixed(1)}pp
                        </span>
                        {a.feasibility_level && (
                          <span className="text-gray-400">Viabilidade: {S(a.feasibility_level)}</span>
                        )}
                      </div>
                      {a.observation && <p className="text-[10px] text-gray-400 italic">{S(a.observation)}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Gain summary */}
            {bp.expected_gain_summary && (
              <p className="text-[10px] text-emerald-700 font-medium mt-1">{safeVal(bp.expected_gain_summary)}</p>
            )}
            {/* Notes */}
            {bp.notes_for_risk_review && (
              <p className="text-[10px] text-red-500">Falcão: {safeVal(bp.notes_for_risk_review)}</p>
            )}
          </div>
        </div>
      ))}

      {/* Constraints & Feasibility */}
      {constraints && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Restrições e Viabilidade</SectionTitle>
          {(constraints.operational_constraints?.length ?? 0) > 0 && (
            <div className="mb-1">
              <p className="text-[10px] text-gray-500 font-medium">Restrições Operacionais:</p>
              <BulletList items={constraints.operational_constraints} />
            </div>
          )}
          {(constraints.items_for_falcao_risk_review?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-red-500 font-medium">Para Avaliação do Falcão:</p>
              <BulletList items={constraints.items_for_falcao_risk_review} />
            </div>
          )}
        </Card>
      )}

      {/* Prioritization Matrix */}
      {matrix.length > 0 && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-indigo-500" />}>Matriz de Priorização ({matrix.length})</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-100">
                  <th className="pb-1 font-medium">Ação</th>
                  <th className="pb-1 font-medium">Marca</th>
                  <th className="pb-1 font-medium">Prioridade</th>
                  <th className="pb-1 font-medium">Tipo</th>
                  <th className="pb-1 font-medium">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((m: ActionPrioritizationEntry, i: number) => {
                  const gt = IMPACT_TYPE_STYLES[m.gain_type] || IMPACT_TYPE_STYLES.real_financial_gain;
                  return (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-1 text-gray-700 font-medium">{S(m.action_title)}</td>
                      <td className="py-1 text-gray-600">{S(m.brand)}</td>
                      <td className="py-1"><SeverityBadge level={S(m.priority || 'medium')} /></td>
                      <td className="py-1"><span className={`px-1 py-0.5 rounded text-[8px] font-bold ${gt.color}`}>{S(gt.label)}</span></td>
                      <td className="py-1 text-gray-600">{safeVal(m.expected_impact)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// EDMUNDO — Forecast View
// ============================================

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-red-600 bg-red-50',
};

const TAG_CLASS_STYLES: Record<string, { label: string; color: string }> = {
  opportunity: { label: 'Oportunidade', color: 'text-green-700 bg-green-50' },
  risk: { label: 'Risco', color: 'text-red-700 bg-red-50' },
};

function ForecastView({ data }: { data: ForecastOutput }) {
  const brandProjections = data.brand_projections || [];
  const curve = data.adjusted_year_end_curve;
  const tagMap = data.tag_opportunity_risk_map || [];
  const gapPlan = data.closing_gap_plan;
  const sacrifice = data.sacrifice_map;
  const confidence = data.confidence_report;
  const signals = data.curve_confirmation_signals;

  // Backward compat with old format
  const hasOldFormat = !!(data as any).forecast_horizon && !brandProjections.length;
  if (hasOldFormat) {
    const oldBase = (data as any).base_projection || [];
    return (
      <div className="space-y-3">
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-indigo-500" />}>Forecast — {S((data as any).forecast_horizon)}</SectionTitle>
          <TextBlock text={(data as any).trend_interpretation} />
        </Card>
        {oldBase.length > 0 && (
          <Card>
            <SectionTitle icon={<BarChart3 size={12} className="text-blue-500" />}>Projeções</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="text-gray-500 text-left"><th className="pb-1 font-medium">Período</th><th className="pb-1 font-medium text-right">Receita</th><th className="pb-1 font-medium text-right">EBITDA</th></tr></thead>
                <tbody>{oldBase.map((b: any, i: number) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-1 text-gray-700 font-medium">{S(b.period)}</td>
                    <td className="py-1 text-right text-gray-900">R$ {(b.receita ?? 0).toLocaleString('pt-BR')}</td>
                    <td className="py-1 text-right text-green-600">R$ {(b.ebitda ?? 0).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        )}
        {((data as any).forecast_risks?.length ?? 0) > 0 && (
          <Card>
            <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Riscos</SectionTitle>
            <BulletList items={(data as any).forecast_risks} />
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Confidence Report */}
      {confidence && (
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle icon={<Shield size={12} className="text-indigo-500" />}>Confiança da Projeção</SectionTitle>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CONFIDENCE_COLORS[confidence.brand_confidence_level] || CONFIDENCE_COLORS.medium}`}>
              {S(confidence.brand_confidence_level?.toUpperCase())}
            </span>
          </div>
          <TextBlock text={confidence.confidence_rationale} />
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(confidence.factors_increasing_confidence?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-green-600 font-medium">Fatores positivos:</p>
                <BulletList items={confidence.factors_increasing_confidence} />
              </div>
            )}
            {(confidence.factors_reducing_confidence?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-red-500 font-medium">Fatores negativos:</p>
                <BulletList items={confidence.factors_reducing_confidence} />
              </div>
            )}
          </div>
          {(confidence.tag_confidence_breakdown?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-gray-500 font-medium">Confiança por Tag:</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {confidence.tag_confidence_breakdown.map((tc: TagConfidence, i: number) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${CONFIDENCE_COLORS[tc.confidence_level] || CONFIDENCE_COLORS.medium}`}>
                    {S(tc.tag_name)}: {S(tc.confidence_level)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Brand Projections — 3 scenarios per brand */}
      {brandProjections.map((bp: BrandProjection, bi: number) => (
        <div key={bi} className="border-2 border-indigo-200 rounded-lg overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-indigo-900">{S(bp.brand_name)}</h3>
            </div>
            <p className="text-[10px] text-indigo-700 mt-0.5">{S(bp.current_position_summary)}</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <TextBlock text={bp.projection_narrative} />
            {/* Scenario comparison */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[bp.base_case, bp.target_case, bp.stress_case].map((sc, si) => {
                if (!sc) return null;
                const colors = si === 0 ? 'bg-gray-50 border-gray-200' : si === 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                return (
                  <div key={si} className={`rounded-lg px-2 py-2 border ${colors}`}>
                    <p className="text-[10px] font-bold text-gray-700">{S(sc.label || ['Base', 'Target', 'Stress'][si])}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{S(sc.description)}</p>
                    <div className="mt-1 space-y-0.5 text-[10px]">
                      <p><span className="text-gray-400">EBITDA:</span> <span className="font-medium">R$ {(sc.projected_ebitda ?? 0).toLocaleString('pt-BR')}</span></p>
                      <p><span className="text-gray-400">Margem:</span> <span className="font-medium">{(sc.projected_margin ?? 0).toFixed(1)}%</span></p>
                      <p><span className="text-gray-400">Receita:</span> <span className="font-medium">R$ {(sc.projected_revenue ?? 0).toLocaleString('pt-BR')}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
            {bp.year_end_projection && (
              <p className="text-[10px] text-indigo-700 font-medium mt-1">{S(bp.year_end_projection)}</p>
            )}
          </div>
        </div>
      ))}

      {/* Adjusted Year-End Curve */}
      {curve && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-blue-500" />}>Curva Ajustada de Fechamento</SectionTitle>
          <TextBlock text={curve.interpretation_of_adjusted_trajectory} />
          {(curve.identified_outliers?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-amber-600 font-medium">Outliers Identificados ({curve.identified_outliers.length}):</p>
              <div className="space-y-1 mt-0.5">
                {curve.identified_outliers.map((o, i) => (
                  <div key={i} className="bg-amber-50 rounded px-2 py-1 text-[10px]">
                    <span className="font-medium text-amber-800">{S(o.month)}:</span>{' '}
                    <span className="text-gray-700">{S(o.event_description)}</span>
                    {o.impact_value !== 0 && (
                      <span className="text-amber-600 ml-1">(R$ {Math.abs(o.impact_value).toLocaleString('pt-BR')})</span>
                    )}
                  </div>
                ))}
              </div>
              {curve.outlier_adjustment_rationale && (
                <p className="text-[10px] text-gray-500 mt-1 italic">{S(curve.outlier_adjustment_rationale)}</p>
              )}
            </div>
          )}
          {curve.difference_between_original_and_adjusted_curve && (
            <p className="text-[10px] text-blue-600 mt-1">{S(curve.difference_between_original_and_adjusted_curve)}</p>
          )}
        </Card>
      )}

      {/* Tag Opportunity & Risk Map */}
      {tagMap.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-purple-500" />}>Mapa de Oportunidades e Riscos por Tag ({tagMap.length})</SectionTitle>
          <div className="space-y-1.5 mt-1">
            {tagMap.map((t: TagOpportunityRiskEntry, i: number) => {
              const cls = TAG_CLASS_STYLES[t.classification] || TAG_CLASS_STYLES.risk;
              const conf = CONFIDENCE_COLORS[t.confidence_level_for_tag] || CONFIDENCE_COLORS.medium;
              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${cls.color}`}>{S(cls.label)}</span>
                    <span className="text-xs font-medium text-gray-900">{S(t.tag_name)}</span>
                    <span className="text-[8px] text-gray-400">{S(t.tag_level)}</span>
                    <span className={`px-1 py-0.5 rounded text-[8px] ${conf}`}>{S(t.confidence_level_for_tag)}</span>
                  </div>
                  <p className="text-[10px] text-gray-700">{S(t.rationale)}</p>
                  <p className="text-[10px] text-indigo-600">{S(t.executable_action_plan)}</p>
                  <div className="flex gap-3 text-[9px] text-gray-400">
                    {t.projected_effect_on_year_end && <span>Efeito: {S(t.projected_effect_on_year_end)}</span>}
                    {t.urgency && <span>Urgência: {S(t.urgency)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Closing Gap Plan */}
      {gapPlan && (gapPlan.brand_gaps?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<ArrowUpRight size={12} className="text-orange-500" />}>Gap até o Alvo</SectionTitle>
          {gapPlan.brand_gaps.map((bg: BrandGap, i: number) => (
            <div key={i} className="mt-1 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">{S(bg.brand_name)}</span>
                <span className={`text-xs font-bold ${bg.gap_to_target >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Gap: R$ {(bg.gap_to_target ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex gap-4 text-[10px]">
                <span className="text-gray-500">Target: R$ {(bg.target_year_end_value ?? 0).toLocaleString('pt-BR')}</span>
                <span className="text-gray-500">Projetado: R$ {(bg.projected_year_end_value ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              {(bg.gap_breakdown_by_tag?.length ?? 0) > 0 && (
                <div className="mt-0.5">
                  <p className="text-[9px] text-gray-400 font-medium">Composição do gap:</p>
                  {bg.gap_breakdown_by_tag.map((tg: TagGapBreakdown, j: number) => (
                    <div key={j} className="flex items-center gap-2 text-[10px]">
                      <span className="text-gray-600">{S(tg.tag)}:</span>
                      <span className="font-medium text-red-600">R$ {(tg.contribution_to_gap ?? 0).toLocaleString('pt-BR')}</span>
                      <span className={`text-[8px] ${tg.whether_gap_is_recoverable ? 'text-green-500' : 'text-red-500'}`}>
                        {tg.whether_gap_is_recoverable ? 'recuperável' : 'difícil'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {bg.comments_on_feasibility && (
                <p className="text-[10px] text-gray-400 italic">{S(bg.comments_on_feasibility)}</p>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Sacrifice Map */}
      {sacrifice && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>Sacrifícios Necessários</SectionTitle>
          {[
            { label: 'Comerciais', items: sacrifice.commercial_sacrifices, color: 'text-orange-600' },
            { label: 'Operacionais', items: sacrifice.operational_sacrifices, color: 'text-amber-600' },
            { label: 'Financeiros', items: sacrifice.financial_sacrifices, color: 'text-red-600' },
          ].map((group, gi) => (
            (group.items?.length ?? 0) > 0 ? (
              <div key={gi} className="mt-1">
                <p className={`text-[10px] font-medium ${group.color}`}>{group.label}:</p>
                {group.items.map((s: SacrificeEntry, si: number) => (
                  <div key={si} className="bg-gray-50 rounded px-2 py-1 mt-0.5 text-[10px]">
                    <p className="font-medium text-gray-800">{S(s.description)}</p>
                    {s.rationale && <p className="text-gray-500">{S(s.rationale)}</p>}
                  </div>
                ))}
              </div>
            ) : null
          ))}
        </Card>
      )}

      {/* Curve Confirmation Signals */}
      {signals && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-green-500" />}>Sinais de Confirmação da Curva</SectionTitle>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(signals.confirmation_signals?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-green-600 font-medium">Confirmação:</p>
                <BulletList items={signals.confirmation_signals} />
              </div>
            )}
            {(signals.invalidation_signals?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-red-500 font-medium">Invalidação:</p>
                <BulletList items={signals.invalidation_signals} />
              </div>
            )}
          </div>
          {(signals.projection_revision_triggers?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-amber-600 font-medium">Gatilhos de revisão:</p>
              <BulletList items={signals.projection_revision_triggers} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ============================================
// FALCÃO — Risk View
// ============================================

const RISK_LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  low:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
};

const ACCEPTABILITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  acceptable:                  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Aceitável' },
  acceptable_with_mitigation:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aceitável c/ Mitigação' },
  non_negotiable:              { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Não Negociável' },
};

const SUSTAINABILITY_STYLES: Record<string, { bg: string; text: string }> = {
  sustainable:           { bg: 'bg-green-100',  text: 'text-green-800' },
  partially_sustainable: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  fragile:               { bg: 'bg-orange-100', text: 'text-orange-800' },
  unsustainable:         { bg: 'bg-red-100',    text: 'text-red-800' },
};

function RiskView({ data }: { data: RiskOutput }) {
  // New format detection
  const hasNewFormat = Array.isArray(data.risk_exposure_by_brand);

  // --- Backward compat: old format ---
  if (!hasNewFormat) {
    const oldData = data as any;
    const allAlerts = [
      ...(oldData.critical_alerts || []),
      ...(oldData.medium_alerts || []),
      ...(oldData.low_alerts || []),
    ];
    return (
      <div className="space-y-3">
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-red-500" />}>Risco Geral</SectionTitle>
          <SeverityBadge level={S(oldData.overall_risk_level || 'low')} />
          <TextBlock text={oldData.strategic_risk_summary} />
        </Card>
        {allAlerts.length > 0 && (
          <Card>
            <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Alertas ({allAlerts.length})</SectionTitle>
            <div className="space-y-2">
              {allAlerts.map((a: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={S(a.severity || 'medium')} />
                    <span className="text-xs font-medium text-gray-900">{S(a.title)}</span>
                  </div>
                  <p className="text-[11px] text-gray-600">{S(a.description)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // --- New 7-deliverable format ---
  const brandExposures = data.risk_exposure_by_brand || [];
  const alertsPack = data.critical_alerts_pack;
  const alerts: RiskAlert[] = alertsPack?.critical_alerts || [];
  const tagRiskMap: TagRiskEntry[] = data.tag_risk_map || [];
  const sustainability: PlanSustainabilityReview | undefined = data.plan_sustainability_review;
  const fragility: CurveFragilityNote | undefined = data.curve_fragility_note;
  const acceptability: RiskAcceptabilityEntry[] = data.risk_acceptability_matrix || [];
  const execSummary: ExecutiveRiskSummary | undefined = data.executive_risk_summary;

  return (
    <div className="space-y-3">
      {/* 1. Executive Risk Summary */}
      {execSummary && (
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-red-500" />}>Resumo Executivo de Risco</SectionTitle>
          <TextBlock text={execSummary.strategic_risk_narrative} />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-500">Confiança geral:</span>
            <span className={`text-sm font-bold ${
              (execSummary.overall_risk_confidence ?? 0) >= 70 ? 'text-green-600' :
              (execSummary.overall_risk_confidence ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>{Math.round(execSummary.overall_risk_confidence ?? 0)}%</span>
          </div>
          {(execSummary.non_negotiable_risks?.length ?? 0) > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-[10px] font-bold text-red-700 mb-1">Riscos Não Negociáveis:</p>
              <BulletList items={execSummary.non_negotiable_risks} />
            </div>
          )}
          {(execSummary.mandatory_caveats_for_board?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-amber-700">Ressalvas obrigatórias para diretoria:</p>
              <BulletList items={execSummary.mandatory_caveats_for_board} />
            </div>
          )}
          {(execSummary.recommended_next_steps?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-blue-600">Próximos passos recomendados:</p>
              <BulletList items={execSummary.recommended_next_steps} />
            </div>
          )}
        </Card>
      )}

      {/* 2. Risk Exposure by Brand */}
      {brandExposures.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-orange-500" />}>Exposição de Risco por Marca ({brandExposures.length})</SectionTitle>
          <div className="space-y-2">
            {brandExposures.map((b: BrandRiskExposure, i: number) => {
              const style = RISK_LEVEL_STYLES[b.overall_risk_level] || RISK_LEVEL_STYLES.moderate;
              return (
                <div key={i} className={`rounded-lg px-3 py-2 border ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{S(b.brand)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.bg} ${style.text}`}>
                      {S(b.overall_risk_level)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 mt-0.5">{S(b.risk_narrative)}</p>
                  {b.key_risk_drivers?.length > 0 && (
                    <div className="mt-1">
                      <p className="text-[10px] text-gray-500">Drivers:</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {b.key_risk_drivers.map((d: string, j: number) => (
                          <span key={j} className="px-1.5 py-0.5 bg-white/60 rounded text-[9px] text-gray-600">{S(d)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {b.school_operation_impact && (
                    <p className="text-[10px] text-purple-600 mt-1">Operação escolar: {S(b.school_operation_impact)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. Critical Alerts Pack */}
      {alerts.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>
            Alertas Críticos ({alerts.length})
            {alertsPack?.total_critical_count != null && (
              <span className="ml-1 text-[9px] text-gray-400">/ {alertsPack.total_critical_count} total</span>
            )}
          </SectionTitle>
          <div className="space-y-2">
            {alerts.map((a: RiskAlert, i: number) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={S(a.severity)} />
                  <span className="text-[9px] text-gray-400 uppercase">{S(a.alert_type)}</span>
                  <span className="text-xs font-medium text-gray-900">{S(a.alert_title)}</span>
                </div>
                {a.brand && <span className="text-[9px] text-orange-600">Marca: {S(a.brand)}</span>}
                <p className="text-[11px] text-gray-600">{S(a.description)}</p>
                {a.quantified_impact && (
                  <p className="text-[10px] font-medium text-red-600">Impacto: {S(a.quantified_impact)}</p>
                )}
                <p className="text-[10px] text-blue-600">Resposta: {S(a.recommended_response)}</p>
                {a.school_sensitivity && (
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium mt-0.5 ${
                    a.school_sensitivity === 'high' ? 'bg-red-100 text-red-700' :
                    a.school_sensitivity === 'moderate' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>Sensibilidade escolar: {S(a.school_sensitivity)}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Tag Risk Map */}
      {tagRiskMap.length > 0 && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-amber-500" />}>Mapa de Risco por Tag ({tagRiskMap.length})</SectionTitle>
          <div className="space-y-2">
            {tagRiskMap.map((t: TagRiskEntry, i: number) => {
              const style = RISK_LEVEL_STYLES[t.risk_level] || RISK_LEVEL_STYLES.moderate;
              return (
                <div key={i} className={`rounded-lg px-3 py-2 border ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-gray-900">{S(t.tag)}</span>
                      {t.brand && <span className="text-[9px] text-gray-500 ml-1">({S(t.brand)})</span>}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.bg} ${style.text}`}>
                      {S(t.risk_level)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">{S(t.risk_explanation)}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-gray-500">
                    {t.risk_type && <span>Tipo: {S(t.risk_type)}</span>}
                    {t.ebitda_impact_estimate && <span>Impacto EBITDA: {S(t.ebitda_impact_estimate)}</span>}
                  </div>
                  {(t.family_impact || t.student_safety_impact) && (
                    <div className="flex gap-3 mt-1 text-[9px]">
                      {t.family_impact && <span className="text-purple-600">Famílias: {S(t.family_impact)}</span>}
                      {t.student_safety_impact && <span className="text-red-600">Segurança: {S(t.student_safety_impact)}</span>}
                    </div>
                  )}
                  {t.mitigation_suggestion && (
                    <p className="text-[10px] text-blue-600 mt-0.5">Mitigação: {S(t.mitigation_suggestion)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 5. Plan Sustainability Review */}
      {sustainability && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Sustentabilidade do Plano</SectionTitle>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500">Classificação:</span>
            {(() => {
              const ss = SUSTAINABILITY_STYLES[sustainability.sustainability_level] || SUSTAINABILITY_STYLES.fragile;
              return (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ss.bg} ${ss.text}`}>
                  {S(sustainability.sustainability_level)}
                </span>
              );
            })()}
          </div>
          <TextBlock text={sustainability.justification} />
          {(sustainability.execution_risks?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-orange-600">Riscos de execução:</p>
              <BulletList items={sustainability.execution_risks} />
            </div>
          )}
          {(sustainability.dependency_risks?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] font-medium text-amber-600">Dependências críticas:</p>
              <BulletList items={sustainability.dependency_risks} />
            </div>
          )}
          {sustainability.recommended_adjustments && (
            <div className="mt-1">
              <p className="text-[10px] font-medium text-blue-600">Ajustes recomendados:</p>
              <TextBlock text={sustainability.recommended_adjustments} />
            </div>
          )}
        </Card>
      )}

      {/* 6. Curve Fragility Note */}
      {fragility && (
        <Card>
          <SectionTitle icon={<Zap size={12} className="text-orange-500" />}>Fragilidade da Curva</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(fragility.fragile_segments?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-medium text-red-600">Segmentos frágeis:</p>
                <BulletList items={fragility.fragile_segments} />
              </div>
            )}
            {(fragility.robust_segments?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-medium text-green-600">Segmentos robustos:</p>
                <BulletList items={fragility.robust_segments} />
              </div>
            )}
            {(fragility.assumptions_at_risk?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-medium text-amber-600">Premissas em risco:</p>
                <BulletList items={fragility.assumptions_at_risk} />
              </div>
            )}
            {(fragility.external_dependency_risks?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-medium text-purple-600">Dependências externas:</p>
                <BulletList items={fragility.external_dependency_risks} />
              </div>
            )}
          </div>
          {(fragility.invalidation_signals?.length ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-red-500">Sinais de invalidação:</p>
              <BulletList items={fragility.invalidation_signals} />
            </div>
          )}
          {(fragility.confidence_boosters?.length ?? 0) > 0 && (
            <div className="mt-1">
              <p className="text-[10px] font-medium text-green-500">Reforços de confiança:</p>
              <BulletList items={fragility.confidence_boosters} />
            </div>
          )}
        </Card>
      )}

      {/* 7. Risk Acceptability Matrix */}
      {acceptability.length > 0 && (
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-indigo-500" />}>Matriz de Aceitabilidade ({acceptability.length})</SectionTitle>
          <div className="space-y-2">
            {acceptability.map((r: RiskAcceptabilityEntry, i: number) => {
              const aStyle = ACCEPTABILITY_STYLES[r.acceptability] || ACCEPTABILITY_STYLES.acceptable_with_mitigation;
              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{S(r.risk_item)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${aStyle.bg} ${aStyle.text}`}>
                      {S(aStyle.label)}
                    </span>
                  </div>
                  {r.brand && <span className="text-[9px] text-orange-600">Marca: {S(r.brand)}</span>}
                  <p className="text-[11px] text-gray-600">{S(r.justification)}</p>
                  {r.mitigation_plan && (
                    <p className="text-[10px] text-blue-600">Mitigação: {S(r.mitigation_plan)}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-[9px] text-gray-500 mt-0.5">
                    {r.review_trigger && <span>Revisão: {S(r.review_trigger)}</span>}
                    {r.escalation_trigger && <span className="text-amber-600">Escalação: {S(r.escalation_trigger)}</span>}
                    {r.stop_trigger && <span className="text-red-600">Parada: {S(r.stop_trigger)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// ALEX — Consolidation View (with Board Presentation)
// ============================================

function ConsolidationView({ data }: { data: ConsolidationOutput }) {
  const confidence = data.confidence_level ?? 0;
  const conflicts = data.cross_agent_conflicts || [];
  const recommendations = data.final_recommendations || [];
  const presentation = data.board_presentation;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<FileText size={12} className="text-indigo-500" />}>Resumo Executivo</SectionTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Confiança:</span>
            <span className={`text-sm font-bold ${confidence >= 80 ? 'text-green-600' : confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(confidence)}%
            </span>
          </div>
        </div>
        <TextBlock text={data.consolidated_summary} />
      </Card>
      {conflicts.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Conflitos entre Agentes ({conflicts.length})</SectionTitle>
          <div className="space-y-2">
            {conflicts.map((c: any, i: number) => {
              // Suporta tanto string quanto objeto com keys conflict_description, agents_involved, etc.
              if (typeof c === 'string') {
                return (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {c}
                  </div>
                );
              }
              return (
                <div key={i} className="bg-amber-50 rounded-lg px-3 py-2 space-y-1">
                  <p className="text-xs font-medium text-amber-900">{safeVal(c.conflict_description || c.description)}</p>
                  {c.agents_involved && (
                    <p className="text-[10px] text-amber-700">Agentes: {safeVal(c.agents_involved)}</p>
                  )}
                  {c.alex_arbitration && (
                    <p className="text-[10px] text-blue-600">Arbitragem: {safeVal(c.alex_arbitration)}</p>
                  )}
                  {c.arbitration_rationale && (
                    <p className="text-[10px] text-gray-500 italic">{safeVal(c.arbitration_rationale)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {recommendations.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-green-500" />}>Recomendações Finais ({recommendations.length})</SectionTitle>
          <div className="space-y-2">
            {recommendations.map((r: Recommendation, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={safeVal(r.priority)} />
                  <span className="text-xs font-medium text-gray-900">{safeVal(r.area)}</span>
                </div>
                <p className="text-[11px] text-gray-700">{safeVal(r.action)}</p>
                <p className="text-[10px] text-gray-500">Impacto esperado: {safeVal(r.expected_impact)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* Board Presentation */}
      {presentation && (
        <div className="border-2 border-indigo-200 rounded-lg overflow-hidden">
          <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200">
            <div className="flex items-center gap-2">
              <Presentation size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-indigo-900">Board Presentation</h3>
            </div>
            <p className="text-xs text-indigo-700 mt-1">{safeVal(presentation.presentation_title)}</p>
            {presentation.executive_context && (
              <p className="text-[11px] text-indigo-600 mt-1">{safeVal(presentation.executive_context)}</p>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {(presentation.slides || []).map((slide: PresentationSlide, i: number) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-900">{safeVal(slide.title)}</span>
                </div>
                <p className="text-[10px] text-gray-500 italic">{safeVal(slide.purpose)}</p>
                <ul className="space-y-1 ml-7">
                  {(slide.bullets || []).map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-800">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      {safeVal(b)}
                    </li>
                  ))}
                </ul>
                <div className="ml-7 bg-indigo-50 rounded px-3 py-1.5">
                  <p className="text-[11px] font-semibold text-indigo-800">{safeVal(slide.key_message)}</p>
                </div>
                {slide.optional_supporting_note && (
                  <p className="ml-7 text-[10px] text-gray-400 italic">{safeVal(slide.optional_supporting_note)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CEO — Executive Challenge & Decision Readiness View
// ============================================

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100',    text: 'text-red-800' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-800' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  low:      { bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const CONFIDENCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Alta' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Média' },
  low:    { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Baixa' },
};

const READINESS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ready:                 { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-300', label: 'Pronto' },
  ready_with_adjustments: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Pronto com Ajustes' },
  not_ready:             { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300', label: 'Não Pronto' },
};

function DirectorReviewView({ data }: { data: DirectorReviewOutput }) {
  const questions: DirectorQuestion[] = data.director_question_pack || [];
  const answers: ExpectedDirectorAnswer[] = data.expected_director_answer_pack || [];
  const ownership: ExecutionOwnershipReview | undefined = data.execution_ownership_review;
  const readiness: ExecutiveMaterialReadiness | undefined = data.executive_material_readiness;
  const reinforcement: PreCEOReinforcement | undefined = data.pre_ceo_reinforcement;

  const answerMap = new Map<string, ExpectedDirectorAnswer>();
  answers.forEach(a => answerMap.set(a.linked_question_id, a));

  return (
    <div className="space-y-3">
      {/* 1. Executive Material Readiness */}
      {readiness && (() => {
        const rs = READINESS_STYLES[readiness.readiness_level] || READINESS_STYLES.ready_with_adjustments;
        return (
          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle icon={<Target size={12} className="text-slate-600" />}>Prontidão para Comitê/Diretoria</SectionTitle>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${rs.bg} ${rs.text} ${rs.border}`}>
                {rs.label}
              </span>
            </div>
            <TextBlock text={readiness.readiness_rationale} />
            {readiness.strengths_of_material.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-medium text-green-600">Pontos fortes:</p>
                <BulletList items={readiness.strengths_of_material} />
              </div>
            )}
            {readiness.weak_points_of_material.length > 0 && (
              <div className="mt-1">
                <p className="text-[10px] font-medium text-red-600">Pontos fracos:</p>
                <BulletList items={readiness.weak_points_of_material} />
              </div>
            )}
            {readiness.mandatory_adjustments_before_ceo.length > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                <p className="text-[10px] font-bold text-amber-700 mb-1">Ajustes obrigatórios antes do CEO:</p>
                <BulletList items={readiness.mandatory_adjustments_before_ceo} />
              </div>
            )}
            {readiness.recommendation_to_proceed_to_ceo && (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                <p className="text-[10px] font-bold text-slate-700">Recomendação para seguir ao CEO:</p>
                <TextBlock text={readiness.recommendation_to_proceed_to_ceo} />
              </div>
            )}
          </Card>
        );
      })()}

      {/* 2. Director Question Pack + Expected Answers */}
      {questions.length > 0 && (
        <Card>
          <SectionTitle icon={<Users size={12} className="text-slate-600" />}>
            Perguntas da Diretoria ({questions.length})
          </SectionTitle>
          <div className="space-y-3">
            {questions.map((q: DirectorQuestion, i: number) => {
              const ps = PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.medium;
              const answer = answerMap.get(q.question_id);
              const ac = answer ? (CONFIDENCE_BADGE[answer.answer_confidence] || CONFIDENCE_BADGE.medium) : null;
              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${ps.bg} ${ps.text}`}>
                      {S(q.priority)}
                    </span>
                    <span className="text-[9px] text-gray-400 shrink-0">{S(q.question_category)}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900 italic">"{S(q.question_text)}"</p>
                  <p className="text-[10px] text-gray-500">{S(q.why_director_would_ask)}</p>
                  {q.linked_material_section && (
                    <p className="text-[9px] text-blue-500">Seção: {S(q.linked_material_section)}</p>
                  )}
                  {answer && (
                    <div className="mt-1.5 pl-3 border-l-2 border-slate-300 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-600">RESPOSTA ESPERADA</span>
                        {ac && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${ac.bg} ${ac.text}`}>
                            {ac.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-800 font-medium">{S(answer.direct_answer)}</p>
                      {answer.main_number && (
                        <p className="text-[10px] text-blue-700 font-medium">Dado: {S(answer.main_number)}</p>
                      )}
                      {answer.justification && (
                        <p className="text-[10px] text-gray-600">{S(answer.justification)}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-[10px] mt-0.5">
                        {answer.owner && <span className="text-purple-700">Dono: {S(answer.owner)}</span>}
                        {answer.deadline && <span className="text-orange-700">Prazo: {S(answer.deadline)}</span>}
                      </div>
                      {answer.associated_decision && (
                        <p className="text-[10px] text-green-700">Decisão: {S(answer.associated_decision)}</p>
                      )}
                      {answer.answer_gap_note && (
                        <p className="text-[10px] text-amber-600">Lacuna: {S(answer.answer_gap_note)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. Execution & Ownership Review */}
      {ownership && (
        <Card>
          <SectionTitle icon={<FileText size={12} className="text-purple-500" />}>Execução e Ownership</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {ownership.actions_without_owner.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-red-600">Sem dono:</p>
                <BulletList items={ownership.actions_without_owner} />
              </div>
            )}
            {ownership.actions_without_deadline.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-orange-600">Sem prazo:</p>
                <BulletList items={ownership.actions_without_deadline} />
              </div>
            )}
            {ownership.actions_without_metric.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-amber-600">Sem métrica:</p>
                <BulletList items={ownership.actions_without_metric} />
              </div>
            )}
            {ownership.vague_execution_points.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-purple-600">Execução vaga:</p>
                <BulletList items={ownership.vague_execution_points} />
              </div>
            )}
          </div>
          {ownership.missing_governance_items.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-red-500">Governança faltando:</p>
              <BulletList items={ownership.missing_governance_items} />
            </div>
          )}
          {ownership.required_execution_clarifications.length > 0 && (
            <div className="mt-1">
              <p className="text-[10px] font-medium text-blue-600">Esclarecimentos necessários:</p>
              <BulletList items={ownership.required_execution_clarifications} />
            </div>
          )}
        </Card>
      )}

      {/* 4. Pre-CEO Reinforcement Pack */}
      {reinforcement && (
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-amber-500" />}>Preparação para o CEO</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {reinforcement.points_to_reinforce_before_ceo.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-blue-600">Reforçar:</p>
                <BulletList items={reinforcement.points_to_reinforce_before_ceo} />
              </div>
            )}
            {reinforcement.numbers_that_must_be_ready.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-green-600">Números prontos:</p>
                <BulletList items={reinforcement.numbers_that_must_be_ready} />
              </div>
            )}
            {reinforcement.fragile_arguments_to_strengthen.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-red-600">Argumentos frágeis:</p>
                <BulletList items={reinforcement.fragile_arguments_to_strengthen} />
              </div>
            )}
            {reinforcement.ownership_points_to_make_explicit.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-purple-600">Ownership a explicitar:</p>
                <BulletList items={reinforcement.ownership_points_to_make_explicit} />
              </div>
            )}
          </div>
          {reinforcement.likely_escalation_topics.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-[10px] font-bold text-red-700 mb-1">Temas prováveis de escalação:</p>
              <BulletList items={reinforcement.likely_escalation_topics} />
            </div>
          )}
          {reinforcement.presentation_adjustments_recommended.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-amber-600">Ajustes na apresentação:</p>
              <BulletList items={reinforcement.presentation_adjustments_recommended} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function CEOReviewView({ data }: { data: CEOReviewOutput }) {
  const questions: CEOQuestion[] = data.ceo_question_pack || [];
  const answers: ExpectedAnswer[] = data.expected_answer_pack || [];
  const weakness: WeaknessReport | undefined = data.weakness_exposure_report;
  const readiness: DecisionReadinessAssessment | undefined = data.decision_readiness;
  const rehearsal: ExecutiveRehearsalEntry[] = data.executive_rehearsal || [];

  // Build answer lookup for Q&A pairing
  const answerMap = new Map<string, ExpectedAnswer>();
  answers.forEach(a => answerMap.set(a.linked_question_id, a));

  return (
    <div className="space-y-3">
      {/* 1. Decision Readiness Assessment */}
      {readiness && (() => {
        const rs = READINESS_STYLES[readiness.readiness_level] || READINESS_STYLES.ready_with_adjustments;
        return (
          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle icon={<Target size={12} className="text-slate-700" />}>Prontidão para Reunião</SectionTitle>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${rs.bg} ${rs.text} ${rs.border}`}>
                {rs.label}
              </span>
            </div>
            <TextBlock text={readiness.readiness_rationale} />
            {readiness.what_is_ready.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-medium text-green-600">Pronto:</p>
                <BulletList items={readiness.what_is_ready} />
              </div>
            )}
            {readiness.what_is_not_ready.length > 0 && (
              <div className="mt-1">
                <p className="text-[10px] font-medium text-red-600">Não está pronto:</p>
                <BulletList items={readiness.what_is_not_ready} />
              </div>
            )}
            {readiness.mandatory_fixes_before_meeting.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-[10px] font-bold text-red-700 mb-1">Ajustes obrigatórios antes da reunião:</p>
                <BulletList items={readiness.mandatory_fixes_before_meeting} />
              </div>
            )}
            {readiness.final_recommendation && (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                <p className="text-[10px] font-bold text-slate-700">Recomendação final:</p>
                <TextBlock text={readiness.final_recommendation} />
              </div>
            )}
          </Card>
        );
      })()}

      {/* 2. CEO Question Pack + Expected Answers */}
      {questions.length > 0 && (
        <Card>
          <SectionTitle icon={<Users size={12} className="text-slate-700" />}>
            Perguntas do CEO ({questions.length})
          </SectionTitle>
          <div className="space-y-3">
            {questions.map((q: CEOQuestion, i: number) => {
              const ps = PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.medium;
              const answer = answerMap.get(q.question_id);
              const ac = answer ? (CONFIDENCE_BADGE[answer.answer_confidence] || CONFIDENCE_BADGE.medium) : null;
              return (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
                  {/* Question */}
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${ps.bg} ${ps.text}`}>
                      {S(q.priority)}
                    </span>
                    <span className="text-[9px] text-gray-400 shrink-0">{S(q.question_category)}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900 italic">"{S(q.question_text)}"</p>
                  <p className="text-[10px] text-gray-500">{S(q.why_ceo_would_ask)}</p>
                  {q.linked_agent_output && (
                    <p className="text-[9px] text-blue-500">Fonte: {S(q.linked_agent_output)}</p>
                  )}
                  {/* Answer */}
                  {answer && (
                    <div className="mt-1.5 pl-3 border-l-2 border-slate-300 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-600">RESPOSTA ESPERADA</span>
                        {ac && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${ac.bg} ${ac.text}`}>
                            Confiança: {ac.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-800 font-medium">{S(answer.direct_answer)}</p>
                      {answer.main_number && (
                        <p className="text-[10px] text-blue-700 font-medium">Dado: {S(answer.main_number)}</p>
                      )}
                      {answer.justification && (
                        <p className="text-[10px] text-gray-600">{S(answer.justification)}</p>
                      )}
                      {answer.associated_action && (
                        <p className="text-[10px] text-green-700">Acao: {S(answer.associated_action)}</p>
                      )}
                      {answer.answer_fragility_note && (
                        <p className="text-[10px] text-amber-600">Ressalva: {S(answer.answer_fragility_note)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. Weakness & Exposure Report */}
      {weakness && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Fragilidades e Exposições</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {weakness.weak_points.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-red-600">Pontos fracos:</p>
                <BulletList items={weakness.weak_points} />
              </div>
            )}
            {weakness.unsupported_claims.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-orange-600">Afirmações sem suporte:</p>
                <BulletList items={weakness.unsupported_claims} />
              </div>
            )}
            {weakness.vague_sections.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-amber-600">Seções vagas:</p>
                <BulletList items={weakness.vague_sections} />
              </div>
            )}
            {weakness.missing_numbers.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-purple-600">Números faltando:</p>
                <BulletList items={weakness.missing_numbers} />
              </div>
            )}
          </div>
          {weakness.likely_ceo_discomfort_points.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-[10px] font-bold text-red-700 mb-1">Pontos de desconforto provável:</p>
              <BulletList items={weakness.likely_ceo_discomfort_points} />
            </div>
          )}
          {weakness.points_requiring_reinforcement.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-medium text-blue-600">Requer reforço:</p>
              <BulletList items={weakness.points_requiring_reinforcement} />
            </div>
          )}
        </Card>
      )}

      {/* 4. Executive Rehearsal Simulation */}
      {rehearsal.length > 0 && (
        <Card>
          <SectionTitle icon={<Presentation size={12} className="text-indigo-500" />}>Ensaio Executivo ({rehearsal.length})</SectionTitle>
          <div className="space-y-3">
            {rehearsal.map((r: ExecutiveRehearsalEntry, i: number) => (
              <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 space-y-1">
                <p className="text-xs font-medium text-gray-900 italic">"{S(r.simulated_question)}"</p>
                <div className="pl-3 border-l-2 border-green-300 space-y-0.5">
                  <p className="text-[10px] font-medium text-green-700">Resposta ideal:</p>
                  <p className="text-[11px] text-gray-700">{S(r.ideal_answer)}</p>
                </div>
                {r.risk_if_answered_badly && (
                  <p className="text-[10px] text-red-600">Risco se mal respondida: {S(r.risk_if_answered_badly)}</p>
                )}
                {r.follow_up_question && (
                  <p className="text-[10px] text-amber-700 italic">Follow-up: "{S(r.follow_up_question)}"</p>
                )}
                {r.best_reinforcement_point && (
                  <p className="text-[10px] text-blue-600">Reforco: {S(r.best_reinforcement_point)}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

const OutputRenderer: React.FC<OutputRendererProps> = ({ step }) => {
  if (!step.output_data) return null;

  const { agent_code, step_type, output_data } = step;

  let content: React.ReactNode = null;

  if (agent_code === 'alex' && step_type === 'plan') {
    content = <SupervisorPlanView data={output_data as SupervisorPlanOutput} />;
  } else if (agent_code === 'bruna' && step_type === 'execute') {
    content = <DataQualityView data={output_data as DataQualityOutput} />;
  } else if (agent_code === 'carlos' && step_type === 'execute') {
    content = <PerformanceView data={output_data as PerformanceAnalysisOutput} />;
  } else if (agent_code === 'denilson' && step_type === 'execute') {
    content = <OptimizationView data={output_data as OptimizationOutput} />;
  } else if (agent_code === 'edmundo' && step_type === 'execute') {
    content = <ForecastView data={output_data as ForecastOutput} />;
  } else if (agent_code === 'falcao' && step_type === 'execute') {
    content = <RiskView data={output_data as RiskOutput} />;
  } else if (agent_code === 'alex' && step_type === 'consolidate') {
    content = <ConsolidationView data={output_data as ConsolidationOutput} />;
  } else if (agent_code === 'diretor' && step_type === 'review') {
    content = <DirectorReviewView data={output_data as DirectorReviewOutput} />;
  } else if (agent_code === 'ceo' && step_type === 'review') {
    content = <CEOReviewView data={output_data as CEOReviewOutput} />;
  } else {
    // Fallback — render raw JSON
    content = (
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Output ({agent_code})</SectionTitle>
        <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto max-h-48">
          {JSON.stringify(output_data, null, 2)}
        </pre>
      </Card>
    );
  }

  return (
    <OutputErrorBoundary fallbackData={output_data}>
      {content}
    </OutputErrorBoundary>
  );
};

export default OutputRenderer;
