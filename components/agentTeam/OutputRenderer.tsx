import React from 'react';
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Shield, TrendingUp, FileText, Users, Target } from 'lucide-react';
import type {
  AgentStep,
  SupervisorPlanOutput,
  DataQualityOutput,
  PerformanceAnalysisOutput,
  ConsolidationOutput,
  DataIssue,
  PerformanceDeviation,
  Recommendation,
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
  low:    { bg: 'bg-gray-100',   text: 'text-gray-600' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:   { bg: 'bg-red-100',    text: 'text-red-700' },
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

function TextBlock({ text }: { text: string | undefined | null }) {
  if (!text) return <p className="text-xs text-gray-400 italic">—</p>;
  return <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>;
}

function BulletList({ items }: { items: string[] | undefined | null }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-gray-100 rounded-lg p-3 space-y-2">{children}</div>;
}

// --------------------------------------------
// SupervisorPlan
// --------------------------------------------

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
                    <span key={j} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-medium">
                      {f}
                    </span>
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

// --------------------------------------------
// DataQuality
// --------------------------------------------

function DataQualityView({ data }: { data: DataQualityOutput }) {
  const score = data.quality_score ?? 0;
  const issues = data.inconsistencies_found || [];
  return (
    <div className="space-y-3">
      {/* Score + Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Shield size={12} className="text-amber-500" />}>Qualidade de Dados</SectionTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Score:</span>
            <span className={`text-sm font-bold ${
              score >= 80 ? 'text-green-600' :
              score >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(score)}
            </span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>
        <TextBlock text={data.summary} />
      </Card>

      {/* Issues */}
      {issues.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-red-500" />}>
            Inconsistências ({issues.length})
          </SectionTitle>
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

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Destaques</SectionTitle>
          <BulletList items={data.highlights} />
        </Card>
      )}

      {/* Actions */}
      {data.normalization_actions.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Ações de Normalização</SectionTitle>
          <BulletList items={data.normalization_actions} />
        </Card>
      )}
    </div>
  );
}

// --------------------------------------------
// Performance
// --------------------------------------------

function PerformanceView({ data }: { data: PerformanceAnalysisOutput }) {
  const margin = data.margin_analysis;
  const deviations = data.deviations || [];
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-blue-500" />}>Resumo</SectionTitle>
        <TextBlock text={data.summary} />
      </Card>

      {/* Margin card */}
      {margin && (
      <Card>
        <SectionTitle icon={<TrendingUp size={12} className="text-green-500" />}>Análise de Margem</SectionTitle>
        <div className="grid grid-cols-3 gap-3 mt-1">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Real</p>
            <p className="text-sm font-bold text-gray-900">{(margin.current_margin_pct ?? 0).toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Orçado</p>
            <p className="text-sm font-bold text-gray-900">{(margin.budget_margin_pct ?? 0).toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase">A-1</p>
            <p className="text-sm font-bold text-gray-900">{(margin.prior_year_margin_pct ?? 0).toFixed(1)}%</p>
          </div>
        </div>
        <TextBlock text={margin.assessment} />
      </Card>
      )}

      {/* Revenue + Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <SectionTitle icon={<ArrowUpRight size={12} className="text-green-500" />}>Receita</SectionTitle>
          <TextBlock text={data.revenue_analysis} />
        </Card>
        <Card>
          <SectionTitle icon={<ArrowDownRight size={12} className="text-red-500" />}>Custos</SectionTitle>
          <TextBlock text={data.cost_analysis} />
        </Card>
      </div>

      {/* Deviations */}
      {deviations.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>
            Desvios ({deviations.length})
          </SectionTitle>
          <div className="space-y-2">
            {deviations.map((d: PerformanceDeviation, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className={`mt-0.5 shrink-0 ${d.direction === 'positive' ? 'text-green-500' : 'text-red-500'}`}>
                  {d.direction === 'positive' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{d.tag01}</span>
                    <span className={`text-[10px] font-bold ${d.direction === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {Math.abs(d.impact_brl ?? 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations + Insights */}
      {data.recommended_actions.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-indigo-500" />}>Recomendações</SectionTitle>
          <BulletList items={data.recommended_actions} />
        </Card>
      )}

      {data.insights.length > 0 && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-purple-500" />}>Insights</SectionTitle>
          <BulletList items={data.insights} />
        </Card>
      )}
    </div>
  );
}

// --------------------------------------------
// Consolidation
// --------------------------------------------

function ConsolidationView({ data }: { data: ConsolidationOutput }) {
  const confidence = data.confidence_level ?? 0;
  const conflicts = data.cross_agent_conflicts || [];
  const recommendations = data.final_recommendations || [];
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<FileText size={12} className="text-indigo-500" />}>Resumo Executivo</SectionTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Confiança:</span>
            <span className={`text-sm font-bold ${
              confidence >= 80 ? 'text-green-600' :
              confidence >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(confidence)}%
            </span>
          </div>
        </div>
        <TextBlock text={data.consolidated_summary} />
      </Card>

      {conflicts.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>
            Conflitos entre Agentes ({conflicts.length})
          </SectionTitle>
          <BulletList items={conflicts} />
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-green-500" />}>
            Recomendações Finais ({recommendations.length})
          </SectionTitle>
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
    </div>
  );
}

// --------------------------------------------
// Main Component
// --------------------------------------------

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

  if (agent_code === 'alex' && step_type === 'consolidate') {
    return <ConsolidationView data={output_data as ConsolidationOutput} />;
  }

  // Fallback
  return (
    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
      <AlertTriangle size={14} />
      <span>Renderização não disponível para {agent_code}/{step_type}</span>
    </div>
  );
};

export default OutputRenderer;
