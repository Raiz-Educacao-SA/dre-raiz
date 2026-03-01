import React from 'react';
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Shield, TrendingUp, FileText, Users, Target, Zap, BarChart3, Presentation } from 'lucide-react';
import type {
  AgentStep,
  SupervisorPlanOutput,
  DataQualityOutput,
  PerformanceAnalysisOutput,
  OptimizationOutput,
  ForecastOutput,
  RiskOutput,
  ConsolidationOutput,
  DataIssue,
  PerformanceDeviation,
  OptimizationAction,
  RiskAlert,
  StressTest,
  Recommendation,
  PresentationSlide,
} from '../../types/agentTeam';

// --------------------------------------------
// Props
// --------------------------------------------

interface OutputRendererProps {
  step: AgentStep;
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
  if (val && typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return null; }
  }
  return null;
}

function TextBlock({ text }: { text: unknown }) {
  const s = safeStr(text);
  if (!s) return <p className="text-xs text-gray-400 italic">&mdash;</p>;
  return <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{s}</p>;
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
                <span className="text-xs font-bold text-gray-900 capitalize">{a.agent_code}</span>
                <p className="text-[11px] text-gray-600">{a.objective}</p>
                <div className="flex flex-wrap gap-1">
                  {(a.focus_areas || []).map((f, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-medium">{f}</span>
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

function DataQualityView({ data }: { data: DataQualityOutput }) {
  const score = data.quality_score ?? 0;
  const issues = data.inconsistencies_found || [];
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Shield size={12} className="text-amber-500" />}>Qualidade de Dados</SectionTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Score:</span>
            <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(score)}
            </span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>
        <TextBlock text={data.summary} />
        {data.recommendation_to_proceed === false && (
          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700 font-bold">
            <AlertTriangle size={14} /> Pipeline bloqueado — base inviável
          </div>
        )}
      </Card>
      {issues.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>Inconsistências ({issues.length})</SectionTitle>
          <div className="space-y-2">
            {issues.map((issue: DataIssue, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <SeverityBadge level={issue.severity} />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-gray-900">{issue.area}</p>
                  <p className="text-[11px] text-gray-600">{issue.description}</p>
                  <p className="text-[10px] text-gray-400">Valor: {issue.affected_value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {(data.highlights?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Destaques</SectionTitle>
          <BulletList items={data.highlights} />
        </Card>
      )}
      {(data.normalization_actions?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações de Normalização</SectionTitle>
          <BulletList items={data.normalization_actions} />
        </Card>
      )}
    </div>
  );
}

// ============================================
// CARLOS — Performance View
// ============================================

function PerformanceView({ data }: { data: PerformanceAnalysisOutput }) {
  const margin = data.margin_analysis;
  const deviations = data.key_deviations || [];

  // Defensivo: IA pode retornar margin_analysis com shape diferente do esperado
  const marginReal = typeof margin?.current_margin_pct === 'number' ? margin.current_margin_pct
    : typeof (margin as any)?.reported_margin === 'number' ? (margin as any).reported_margin : null;
  const marginOrcado = typeof margin?.budget_margin_pct === 'number' ? margin.budget_margin_pct
    : typeof (margin as any)?.budgeted_margin === 'number' ? (margin as any).budgeted_margin : null;
  const marginA1 = typeof margin?.prior_year_margin_pct === 'number' ? margin.prior_year_margin_pct
    : typeof (margin as any)?.prior_year_margin === 'number' ? (margin as any).prior_year_margin : null;
  const marginAssessment = typeof margin?.assessment === 'string' ? margin.assessment
    : typeof (margin as any)?.variance_explanation === 'string' ? (margin as any).variance_explanation
    : typeof (margin as any)?.sustainability_assessment === 'string' ? (margin as any).sustainability_assessment : null;

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-blue-500" />}>Resumo</SectionTitle>
        <TextBlock text={typeof data.executive_performance_summary === 'string' ? data.executive_performance_summary : null} />
      </Card>
      {margin && (marginReal !== null || marginOrcado !== null || marginA1 !== null) && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Análise de Margem</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Real</p>
              <p className="text-sm font-bold text-gray-900">{marginReal !== null ? `${marginReal.toFixed(1)}%` : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Orçado</p>
              <p className="text-sm font-bold text-gray-900">{marginOrcado !== null ? `${marginOrcado.toFixed(1)}%` : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500 uppercase">A-1</p>
              <p className="text-sm font-bold text-gray-900">{marginA1 !== null ? `${marginA1.toFixed(1)}%` : '—'}</p>
            </div>
          </div>
          <TextBlock text={marginAssessment} />
        </Card>
      )}
      <Card>
        <SectionTitle icon={<BarChart3 size={12} className="text-indigo-500" />}>EBITDA</SectionTitle>
        <TextBlock text={typeof data.ebitda_analysis === 'string' ? data.ebitda_analysis : null} />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <SectionTitle icon={<ArrowUpRight size={12} className="text-green-500" />}>Receita</SectionTitle>
          <TextBlock text={typeof data.revenue_analysis === 'string' ? data.revenue_analysis : null} />
        </Card>
        <Card>
          <SectionTitle icon={<ArrowDownRight size={12} className="text-red-500" />}>Custos</SectionTitle>
          <TextBlock text={typeof data.cost_analysis === 'string' ? data.cost_analysis : null} />
        </Card>
      </div>
      {deviations.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Desvios ({deviations.length})</SectionTitle>
          <div className="space-y-2">
            {deviations.map((d: PerformanceDeviation, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className={`mt-0.5 shrink-0 ${d.direction === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
                  {d.direction === 'positive' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{d.tag01}</span>
                    <SeverityBadge level={d.materiality} />
                    <span className={`text-[10px] font-bold ${d.direction === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {Math.abs(d.absolute_gap ?? 0).toLocaleString('pt-BR')} ({(d.percentage_gap ?? 0).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">{d.description}</p>
                  <p className="text-[10px] text-gray-400">Driver: {d.probable_driver}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {(data.key_positive_drivers?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<ArrowUpRight size={12} className="text-green-500" />}>Drivers Positivos</SectionTitle>
          <BulletList items={data.key_positive_drivers} />
        </Card>
      )}
      {(data.key_negative_drivers?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<ArrowDownRight size={12} className="text-red-500" />}>Drivers Negativos</SectionTitle>
          <BulletList items={data.key_negative_drivers} />
        </Card>
      )}
      {(data.recommended_actions?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-indigo-500" />}>Recomendações</SectionTitle>
          <BulletList items={data.recommended_actions} />
        </Card>
      )}
    </div>
  );
}

// ============================================
// DENILSON — Optimization View
// ============================================

function OptimizationView({ data }: { data: OptimizationOutput }) {
  const actions = data.proposed_actions || [];
  const infeasible = data.infeasible_actions || [];
  const impact = data.expected_impact;
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<Zap size={12} className="text-emerald-500" />}>Objetivo da Otimização</SectionTitle>
        <TextBlock text={data.optimization_objective} />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-500">Status:</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            data.feasibility_status === 'feasible' ? 'bg-green-100 text-green-700' :
            data.feasibility_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>{data.feasibility_status}</span>
        </div>
      </Card>
      {impact && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Impacto Estimado</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">EBITDA</p>
              <p className="text-sm font-bold text-green-700">+R$ {(impact.total_ebitda_gain ?? 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Margem</p>
              <p className="text-sm font-bold text-green-700">+{(impact.total_margin_gain ?? 0).toFixed(1)}pp</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-gray-500">Score</p>
              <p className="text-sm font-bold text-green-700">+{(impact.total_score_gain ?? 0).toFixed(0)}pts</p>
            </div>
          </div>
        </Card>
      )}
      {actions.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações Propostas ({actions.length})</SectionTitle>
          <div className="space-y-2">
            {actions.map((a: OptimizationAction, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={a.implementation_priority} />
                  <span className="text-xs font-medium text-gray-900">{a.area}</span>
                </div>
                <p className="text-[11px] text-gray-700">{a.suggested_adjustment}</p>
                <p className="text-[10px] text-gray-400">
                  EBITDA: +R$ {(a.estimated_impact_ebitda ?? 0).toLocaleString('pt-BR')} | Margem: +{(a.estimated_impact_margin ?? 0).toFixed(1)}pp
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {infeasible.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>Ações Inviáveis ({infeasible.length})</SectionTitle>
          <div className="space-y-1">
            {infeasible.map((a, i) => (
              <div key={i} className="text-xs text-gray-600 bg-red-50 rounded px-3 py-1.5">
                <span className="font-medium">{a.area}:</span> {a.reason}
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Racional</SectionTitle>
        <TextBlock text={data.optimization_rationale} />
      </Card>
    </div>
  );
}

// ============================================
// EDMUNDO — Forecast View
// ============================================

function ForecastView({ data }: { data: ForecastOutput }) {
  const confidence = data.confidence_level ?? 0;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<TrendingUp size={12} className="text-indigo-500" />}>Forecast — {data.forecast_horizon}</SectionTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Confiança:</span>
            <span className={`text-sm font-bold ${confidence >= 70 ? 'text-green-600' : confidence >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(confidence)}%
            </span>
          </div>
        </div>
        <TextBlock text={data.trend_interpretation} />
      </Card>
      {/* Projections table */}
      {(data.base_projection?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-blue-500" />}>Projeções</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="pb-1 font-medium">Período</th>
                  <th className="pb-1 font-medium text-right">Base</th>
                  <th className="pb-1 font-medium text-right text-red-500">Downside</th>
                  <th className="pb-1 font-medium text-right text-green-500">Upside</th>
                </tr>
              </thead>
              <tbody>
                {data.base_projection.map((b, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-1 text-gray-700 font-medium">{b.period}</td>
                    <td className="py-1 text-right text-gray-900">R$ {(b.receita ?? 0).toLocaleString('pt-BR')}</td>
                    <td className="py-1 text-right text-red-600">
                      {data.downside_projection?.[i] ? `R$ ${(data.downside_projection[i].receita ?? 0).toLocaleString('pt-BR')}` : '—'}
                    </td>
                    <td className="py-1 text-right text-green-600">
                      {data.upside_projection?.[i] ? `R$ ${(data.upside_projection[i].receita ?? 0).toLocaleString('pt-BR')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Erro Histórico</SectionTitle>
        <TextBlock text={data.historical_error_summary} />
      </Card>
      {(data.forecast_risks?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Riscos da Projeção</SectionTitle>
          <BulletList items={data.forecast_risks} />
        </Card>
      )}
      {(data.projection_assumptions?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Premissas</SectionTitle>
          <BulletList items={data.projection_assumptions} />
        </Card>
      )}
    </div>
  );
}

// ============================================
// FALCÃO — Risk View
// ============================================

function RiskView({ data }: { data: RiskOutput }) {
  const allAlerts = [
    ...(data.critical_alerts || []),
    ...(data.medium_alerts || []),
    ...(data.low_alerts || []),
  ];
  const stressTests = data.stress_tests || [];
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Shield size={12} className="text-red-500" />}>Risco Geral</SectionTitle>
          <div className="flex items-center gap-2">
            <SeverityBadge level={data.overall_risk_level} />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Macro:</span>
              <span className={`text-sm font-bold ${
                (data.macro_risk_index ?? 0) >= 70 ? 'text-red-600' :
                (data.macro_risk_index ?? 0) >= 40 ? 'text-yellow-600' : 'text-green-600'
              }`}>{Math.round(data.macro_risk_index ?? 0)}</span>
            </div>
          </div>
        </div>
        <TextBlock text={data.strategic_risk_summary} />
      </Card>
      {allAlerts.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Alertas ({allAlerts.length})</SectionTitle>
          <div className="space-y-2">
            {allAlerts.map((a: RiskAlert, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={a.severity} />
                  <span className="text-xs font-medium text-gray-900">{a.title}</span>
                </div>
                <p className="text-[11px] text-gray-600">{a.description}</p>
                <p className="text-[10px] text-gray-400">
                  {a.related_metric}: {a.current_value} (limite: {a.threshold})
                </p>
                <p className="text-[10px] text-blue-600">Resposta: {a.recommended_response}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {stressTests.length > 0 && (
        <Card>
          <SectionTitle icon={<Zap size={12} className="text-orange-500" />}>Stress Tests ({stressTests.length})</SectionTitle>
          <div className="space-y-2">
            {stressTests.map((s: StressTest, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={s.probability} />
                  <span className="text-xs font-medium text-gray-900">{s.scenario}</span>
                </div>
                <p className="text-[11px] text-gray-600">{s.impact_description}</p>
                <p className={`text-[10px] font-bold ${(s.ebitda_impact_pct ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Impacto EBITDA: {(s.ebitda_impact_pct ?? 0).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {(data.mitigation_actions?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle icon={<Shield size={12} className="text-green-500" />}>Ações de Mitigação</SectionTitle>
          <BulletList items={data.mitigation_actions} />
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
          <BulletList items={conflicts} />
        </Card>
      )}
      {recommendations.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-green-500" />}>Recomendações Finais ({recommendations.length})</SectionTitle>
          <div className="space-y-2">
            {recommendations.map((r: Recommendation, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge level={r.priority} />
                  <span className="text-xs font-medium text-gray-900">{r.area}</span>
                </div>
                <p className="text-[11px] text-gray-700">{r.action}</p>
                <p className="text-[10px] text-gray-500">Impacto esperado: {r.expected_impact}</p>
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
            <p className="text-xs text-indigo-700 mt-1">{presentation.presentation_title}</p>
            {presentation.executive_context && (
              <p className="text-[11px] text-indigo-600 mt-1">{presentation.executive_context}</p>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {(presentation.slides || []).map((slide: PresentationSlide, i: number) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-900">{slide.title}</span>
                </div>
                <p className="text-[10px] text-gray-500 italic">{slide.purpose}</p>
                <ul className="space-y-1 ml-7">
                  {(slide.bullets || []).map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-800">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="ml-7 bg-indigo-50 rounded px-3 py-1.5">
                  <p className="text-[11px] font-semibold text-indigo-800">{slide.key_message}</p>
                </div>
                {slide.optional_supporting_note && (
                  <p className="ml-7 text-[10px] text-gray-400 italic">{slide.optional_supporting_note}</p>
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
// Main Component
// ============================================

const OutputRenderer: React.FC<OutputRendererProps> = ({ step }) => {
  if (!step.output_data) return null;

  const { agent_code, step_type, output_data } = step;

  if (agent_code === 'alex' && step_type === 'plan') {
    return <SupervisorPlanView data={output_data as SupervisorPlanOutput} />;
  }
  if (agent_code === 'bruna' && step_type === 'execute') {
    return <DataQualityView data={output_data as DataQualityOutput} />;
  }
  if (agent_code === 'carlos' && step_type === 'execute') {
    return <PerformanceView data={output_data as PerformanceAnalysisOutput} />;
  }
  if (agent_code === 'denilson' && step_type === 'execute') {
    return <OptimizationView data={output_data as OptimizationOutput} />;
  }
  if (agent_code === 'edmundo' && step_type === 'execute') {
    return <ForecastView data={output_data as ForecastOutput} />;
  }
  if (agent_code === 'falcao' && step_type === 'execute') {
    return <RiskView data={output_data as RiskOutput} />;
  }
  if (agent_code === 'alex' && step_type === 'consolidate') {
    return <ConsolidationView data={output_data as ConsolidationOutput} />;
  }

  // Fallback — render raw JSON
  return (
    <Card>
      <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Output ({agent_code})</SectionTitle>
      <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto max-h-48">
        {JSON.stringify(output_data, null, 2)}
      </pre>
    </Card>
  );
};

export default OutputRenderer;
