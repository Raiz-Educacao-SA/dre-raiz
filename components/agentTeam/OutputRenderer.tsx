import React from 'react';
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Shield, TrendingUp, FileText, Users, Target, Zap, BarChart3, Presentation, DollarSign, Receipt, Building, Briefcase, ArrowLeftRight, PieChart } from 'lucide-react';
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
  AnalisePorLinha,
  AnalisePorMarca,
  DestaqueTag01,
  ForecastOutput,
  ProjecaoPorMarca,
  RiscoEdmundo,
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
  ExecutiveReviewOutput,
  ExecutiveQuestion,
  ExecutiveAnswer,
  ExecutionOwnershipReview,
  WeaknessExposure,
  DecisionReadiness,
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
    if (Array.isArray(val)) {
      try { return JSON.stringify(val); } catch { return null; }
    }
    try { return humanizedToString(humanizeObject(val as Record<string, unknown>)); } catch { return null; }
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
    if (Array.isArray(val)) {
      try { return JSON.stringify(val); } catch { return '—'; }
    }
    try { return humanizedToString(humanizeObject(val as Record<string, unknown>)); } catch { return '—'; }
  }
  return String(val);
}

/** Safely extract number from potentially object value */
function safeNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') { const n = parseFloat(val); return isNaN(n) ? fallback : n; }
  return fallback;
}

// --------------------------------------------
// Humanizer — extrai texto legível de objetos
// --------------------------------------------

/** Chaves que contêm o texto principal (ordem de prioridade) */
const TEXT_KEYS = [
  'description','text','finding','action','summary','title','name',
  'explanation','rationale','message','narrative','strategic_angle','observation',
  'conflict_description','alert_title','action_title','point','issue','comment',
  'recommendation','suggestion','insight','note','detail',
];

/** Chaves que viram labels inline ("Resp.: João | Prazo: 30d") */
const DETAIL_MAP: Record<string, string> = {
  owner: 'Resp.', recommended_owner: 'Resp.', deadline: 'Prazo', priority: 'Prioridade',
  severity: 'Severidade', impact: 'Impacto', expected_impact: 'Impacto', area: 'Área',
  brand: 'Marca', brand_name: 'Marca', urgency: 'Urgência', resolution: 'Resolução',
  agents_involved: 'Agentes', why_this_resolution: 'Motivo', mitigation: 'Mitigação',
  feasibility_level: 'Viabilidade', status: 'Status',
};

/** Chaves técnicas a ignorar */
const SKIP_KEYS = new Set([
  'id','question_id','linked_question_id','linked_material_section',
  'linked_agent_output','ranking_position','step_type','agent_code','question_category',
  'alert_type','risk_type','action_type','impact_type','variation_nature','type',
  'scenario_affected','tag_level',
]);

interface HumanizedResult {
  main: string;
  details: Array<{ label: string; value: string }>;
}

/** Extrai texto legível de um objeto — retorna texto principal + detalhes inline */
function humanizeObject(obj: Record<string, unknown>): HumanizedResult {
  const details: Array<{ label: string; value: string }> = [];
  let main = '';
  const usedKeys = new Set<string>();

  // 1. Procurar texto principal pela ordem de prioridade
  for (const key of TEXT_KEYS) {
    if (key in obj && obj[key] != null) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) {
        main = v.trim();
        usedKeys.add(key);
        break;
      }
    }
  }

  // 2. Coletar campos de DETAIL_MAP
  for (const [key, label] of Object.entries(DETAIL_MAP)) {
    if (key in obj && obj[key] != null && !usedKeys.has(key)) {
      const v = obj[key];
      const str = typeof v === 'string' ? v.trim()
        : typeof v === 'number' ? String(v)
        : typeof v === 'boolean' ? (v ? 'Sim' : 'Não')
        : Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : String(x)).join(', ')
        : null;
      if (str) {
        details.push({ label, value: str });
        usedKeys.add(key);
      }
    }
  }

  // 3. Se não encontrou texto principal, usar primeiro valor string do objeto
  if (!main) {
    for (const [key, v] of Object.entries(obj)) {
      if (usedKeys.has(key) || SKIP_KEYS.has(key)) continue;
      if (typeof v === 'string' && v.trim()) {
        main = v.trim();
        usedKeys.add(key);
        break;
      }
    }
  }

  // 4. Fallback final: juntar todos os strings restantes
  if (!main) {
    const remaining: string[] = [];
    for (const [key, v] of Object.entries(obj)) {
      if (usedKeys.has(key) || SKIP_KEYS.has(key)) continue;
      if (typeof v === 'string' && v.trim()) remaining.push(v.trim());
      else if (typeof v === 'number') remaining.push(String(v));
    }
    main = remaining.join(' — ') || JSON.stringify(obj);
  }

  return { main, details };
}

/** Formata resultado humanizado como string plana */
function humanizedToString(h: HumanizedResult): string {
  if (h.details.length === 0) return h.main;
  const detailStr = h.details.map(d => `${d.label}: ${d.value}`).join(' | ');
  return `${h.main} — ${detailStr}`;
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
        // Objeto não-array → renderização rica com details inline
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const h = humanizeObject(item as Record<string, unknown>);
          if (!h.main) return null;
          return (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              <div>
                <span className="text-xs text-gray-700">{h.main}</span>
                {h.details.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    {h.details.map((d, j) => (
                      <span key={j} className="text-[9px] text-gray-500 font-medium">
                        {d.label}: {d.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        }
        // String ou primitivo → comportamento original
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
  const hl = (data as any).dre_highlights;
  const priorityAreas = (data as any).priority_areas || (data as any).key_findings || [];
  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon={<FileText size={12} className="text-indigo-500" />}>Resumo Executivo</SectionTitle>
        <TextBlock text={data.executive_summary} />
      </Card>

      {hl && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-blue-600" />}>Destaques por Linha da DRE</SectionTitle>
          <div className="space-y-2 mt-1">
            {[
              { key: 'receita_liquida', label: '01. Receita Líquida', icon: <DollarSign size={11} className="text-green-600" />, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
              { key: 'custos_variaveis', label: '02. Custos Variáveis', icon: <Receipt size={11} className="text-orange-600" />, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
              { key: 'custos_fixos', label: '03. Custos Fixos', icon: <Building size={11} className="text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
              { key: 'sga', label: '04. SG&A', icon: <Briefcase size={11} className="text-red-600" />, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
              { key: 'rateio_raiz', label: '05. Rateio Raiz', icon: <ArrowLeftRight size={11} className="text-purple-600" />, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
              { key: 'ebitda_total', label: 'EBITDA TOTAL', icon: <PieChart size={11} className="text-indigo-600" />, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
            ].map(({ key, label, icon, bg, border, text }) => {
              const content = hl[key];
              if (!content) return null;
              return (
                <div key={key} className={`${bg} border ${border} rounded-lg px-3 py-2`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {icon}
                    <span className={`text-[11px] font-bold ${text}`}>{label}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">{S(content)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {priorityAreas.length > 0 && (
        <Card>
          <SectionTitle icon={<Target size={12} className="text-blue-500" />}>Áreas Prioritárias</SectionTitle>
          <BulletList items={priorityAreas} />
        </Card>
      )}

      {assignments.length > 0 && (
        <Card>
          <SectionTitle icon={<Users size={12} className="text-purple-500" />}>Atribuições</SectionTitle>
          <div className="space-y-2">
            {assignments.map((a: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <span className="text-xs font-bold text-gray-900 capitalize">{S(a.agent_code)}</span>
                <p className="text-[11px] text-gray-600">{S(a.focus || a.objective || '')}</p>
                {(a.focus_areas || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.focus_areas.map((f: string, j: number) => (
                      <span key={j} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-medium">{S(f)}</span>
                    ))}
                  </div>
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
// DENILSON — Real vs Orçado View
// ============================================

function OptimizationView({ data }: { data: OptimizationOutput }) {
  const linhas = data.analise_por_linha || [];
  const marcas = data.analise_por_marca || [];
  const hasMarcas = marcas.length > 0;
  const hasLinhas = linhas.length > 0;

  const classColors: Record<string, string> = {
    favoravel: 'text-green-700 bg-green-50',
    desfavoravel: 'text-red-700 bg-red-50',
    neutro: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="space-y-3">
      {/* Resumo Executivo */}
      {data.resumo_executivo && (
        <Card>
          <SectionTitle icon={<Receipt size={12} className="text-emerald-500" />}>Resumo Executivo</SectionTitle>
          <TextBlock text={data.resumo_executivo} />
        </Card>
      )}

      {/* Modo Marca Selecionada — analise_por_linha */}
      {hasLinhas && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-blue-500" />}>Real vs Orçado por Linha DRE ({linhas.length})</SectionTitle>
          <div className="space-y-3 mt-1">
            {linhas.map((l: AnalisePorLinha, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900">{S(l.tag0)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${classColors[l.classificacao] || classColors.neutro}`}>
                      {l.classificacao === 'favoravel' ? 'Favorável' : l.classificacao === 'desfavoravel' ? 'Desfavorável' : 'Neutro'}
                    </span>
                    <span className={`text-[10px] font-bold ${l.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {l.delta_pct >= 0 ? '+' : ''}{l.delta_pct}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span>Real: <strong className="text-gray-700">R$ {safeNum(l.real_brl).toLocaleString('pt-BR')}</strong></span>
                  <span>Orçado: <strong className="text-gray-700">R$ {safeNum(l.orcado_brl).toLocaleString('pt-BR')}</strong></span>
                </div>
                <p className="text-[11px] text-gray-700">{S(l.recado)}</p>
                {/* Destaques tag01 */}
                {(l.destaques_tag01?.length ?? 0) > 0 && (
                  <div className="mt-1 pl-2 border-l-2 border-gray-200 space-y-1">
                    {l.destaques_tag01.map((d: DestaqueTag01, di: number) => (
                      <div key={di} className="text-[10px]">
                        <span className="font-medium text-gray-700">{S(d.tag01)}</span>
                        <span className="text-gray-400 mx-1">R$ {safeNum(d.real_brl).toLocaleString('pt-BR')} vs {safeNum(d.orcado_brl).toLocaleString('pt-BR')}</span>
                        <span className={d.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}>({d.delta_pct >= 0 ? '+' : ''}{d.delta_pct}%)</span>
                        <p className="text-gray-500">{S(d.comentario)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modo Consolidado — analise_por_marca */}
      {hasMarcas && (
        <>
          {marcas.map((m: AnalisePorMarca, mi: number) => (
            <div key={mi} className="border-2 border-emerald-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-emerald-600" />
                    <h3 className="text-xs font-bold text-emerald-900">{S(m.marca)}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    m.situacao_geral === 'acima_do_orcado' ? 'bg-green-100 text-green-700' :
                    m.situacao_geral === 'abaixo_do_orcado' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {m.situacao_geral === 'acima_do_orcado' ? 'Acima do Orçado' :
                     m.situacao_geral === 'abaixo_do_orcado' ? 'Abaixo do Orçado' : 'No Orçado'}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2">
                {/* Linhas da DRE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-gray-500 text-left border-b border-gray-100">
                        <th className="pb-1 font-medium">Linha</th>
                        <th className="pb-1 font-medium text-right">Real</th>
                        <th className="pb-1 font-medium text-right">Orçado</th>
                        <th className="pb-1 font-medium text-right">Δ%</th>
                        <th className="pb-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(m.linhas || []).map((l, li) => (
                        <tr key={li} className="border-t border-gray-50">
                          <td className="py-1 text-gray-700 font-medium">{S(l.tag0)}</td>
                          <td className="py-1 text-right text-gray-900">R$ {safeNum(l.real_brl).toLocaleString('pt-BR')}</td>
                          <td className="py-1 text-right text-gray-500">R$ {safeNum(l.orcado_brl).toLocaleString('pt-BR')}</td>
                          <td className={`py-1 text-right font-medium ${l.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {l.delta_pct >= 0 ? '+' : ''}{l.delta_pct}%
                          </td>
                          <td className="py-1">
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${classColors[l.classificacao] || classColors.neutro}`}>
                              {l.classificacao === 'favoravel' ? 'Fav' : l.classificacao === 'desfavoravel' ? 'Desf' : 'Neutro'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {m.ebitda_estimado !== 0 && (
                  <p className="text-[10px] text-emerald-700 font-medium">EBITDA: R$ {safeNum(m.ebitda_estimado).toLocaleString('pt-BR')}</p>
                )}
                <p className="text-[11px] text-gray-700">{S(m.recado_marca)}</p>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Recado Final */}
      {data.recado_final && (
        <Card>
          <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Recado Final</SectionTitle>
          <TextBlock text={data.recado_final} />
        </Card>
      )}
    </div>
  );
}

// ============================================
// EDMUNDO — Forecast + Riscos View
// ============================================

const CONFIDENCE_COLORS: Record<string, string> = {
  alta: 'text-green-600 bg-green-50',
  media: 'text-yellow-600 bg-yellow-50',
  baixa: 'text-red-600 bg-red-50',
  high: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-red-600 bg-red-50',
};

const PROB_COLORS: Record<string, string> = {
  alta: 'text-red-700 bg-red-50',
  media: 'text-yellow-700 bg-yellow-50',
  baixa: 'text-green-700 bg-green-50',
};

function ForecastView({ data }: { data: ForecastOutput }) {
  const projecoes = data.projecoes_por_marca || [];
  const riscos = data.riscos || [];

  return (
    <div className="space-y-3">
      {/* Resumo da Projeção */}
      {data.resumo_projecao && (
        <Card>
          <SectionTitle icon={<TrendingUp size={12} className="text-indigo-500" />}>Resumo da Projeção</SectionTitle>
          <TextBlock text={data.resumo_projecao} />
        </Card>
      )}

      {/* Projeções por Marca — 3 cenários */}
      {projecoes.length > 0 && (
        <Card>
          <SectionTitle icon={<BarChart3 size={12} className="text-blue-500" />}>Projeções por Marca ({projecoes.length})</SectionTitle>
          <div className="space-y-3 mt-1">
            {projecoes.map((p: ProjecaoPorMarca, i: number) => (
              <div key={i} className="border border-indigo-200 rounded-lg overflow-hidden">
                <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={12} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900">{S(p.marca)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${CONFIDENCE_COLORS[p.confianca] || CONFIDENCE_COLORS.media}`}>
                    {S(p.confianca).toUpperCase()}
                  </span>
                </div>
                <div className="px-3 py-2 space-y-2">
                  {/* 3 Cenários */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center border border-gray-200">
                      <p className="text-[9px] text-gray-500 font-medium">Base</p>
                      <p className="text-sm font-bold text-gray-800">R$ {safeNum(p.ebitda_base).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg px-2 py-2 text-center border border-green-200">
                      <p className="text-[9px] text-green-600 font-medium">Target</p>
                      <p className="text-sm font-bold text-green-700">R$ {safeNum(p.ebitda_target).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg px-2 py-2 text-center border border-red-200">
                      <p className="text-[9px] text-red-500 font-medium">Stress</p>
                      <p className="text-sm font-bold text-red-700">R$ {safeNum(p.ebitda_stress).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-700">{S(p.comentario)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Riscos */}
      {riscos.length > 0 && (
        <Card>
          <SectionTitle icon={<AlertTriangle size={12} className="text-amber-500" />}>Riscos ({riscos.length})</SectionTitle>
          <div className="space-y-2 mt-1">
            {riscos.map((r: RiscoEdmundo, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900">{S(r.titulo)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${PROB_COLORS[r.probabilidade] || PROB_COLORS.media}`}>
                      {S(r.probabilidade).toUpperCase()}
                    </span>
                    {r.marca_afetada && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-gray-100 text-gray-600">
                        {S(r.marca_afetada)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-700">{S(r.descricao)}</p>
                {r.impacto_estimado_brl !== 0 && (
                  <p className="text-[10px] text-red-600 font-medium">
                    Impacto: R$ {safeNum(r.impacto_estimado_brl).toLocaleString('pt-BR')}
                  </p>
                )}
                <p className="text-[10px] text-blue-600">{S(r.mitigacao)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recado Estratégico */}
      {data.recado_estrategico && (
        <Card>
          <SectionTitle icon={<FileText size={12} className="text-gray-500" />}>Recado Estratégico</SectionTitle>
          <TextBlock text={data.recado_estrategico} />
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
// Executivo — Executive Review & Decision Readiness View
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

function ExecutiveReviewView({ data }: { data: ExecutiveReviewOutput }) {
  const questions: ExecutiveQuestion[] = data.executive_question_pack || [];
  const answers: ExecutiveAnswer[] = data.expected_answer_pack || [];
  const ownership: ExecutionOwnershipReview | undefined = data.execution_ownership_review;
  const weakness: WeaknessExposure | undefined = data.weakness_exposure;
  const readiness: DecisionReadiness | undefined = data.decision_readiness;
  const rehearsal: ExecutiveRehearsalEntry[] = data.executive_rehearsal || [];

  const answerMap = new Map<string, ExecutiveAnswer>();
  answers.forEach(a => answerMap.set(a.linked_question_id, a));

  return (
    <div className="space-y-3">
      {/* 1. Decision Readiness */}
      {readiness && (() => {
        const rs = READINESS_STYLES[readiness.readiness_level] || READINESS_STYLES.ready_with_adjustments;
        return (
          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle icon={<Target size={12} className="text-slate-700" />}>Prontidão para Reunião Executiva</SectionTitle>
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

      {/* 2. Executive Question Pack + Expected Answers */}
      {questions.length > 0 && (
        <Card>
          <SectionTitle icon={<Users size={12} className="text-slate-700" />}>
            Perguntas Executivas ({questions.length})
          </SectionTitle>
          <div className="space-y-3">
            {questions.map((q: ExecutiveQuestion, i: number) => {
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
                  <p className="text-[10px] text-gray-500">{S(q.why_executive_would_ask)}</p>
                  {q.linked_material_section && (
                    <p className="text-[9px] text-blue-500">Seção: {S(q.linked_material_section)}</p>
                  )}
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
                      <div className="flex flex-wrap gap-3 text-[10px] mt-0.5">
                        {answer.owner && <span className="text-purple-700">Dono: {S(answer.owner)}</span>}
                        {answer.deadline && <span className="text-orange-700">Prazo: {S(answer.deadline)}</span>}
                      </div>
                      {answer.associated_action && (
                        <p className="text-[10px] text-green-700">Ação: {S(answer.associated_action)}</p>
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
        </Card>
      )}

      {/* 4. Weakness & Exposure */}
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
          {weakness.likely_discomfort_points.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-[10px] font-bold text-red-700 mb-1">Pontos de desconforto provável:</p>
              <BulletList items={weakness.likely_discomfort_points} />
            </div>
          )}
        </Card>
      )}

      {/* 5. Executive Rehearsal */}
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
                  <p className="text-[10px] text-blue-600">Reforço: {S(r.best_reinforcement_point)}</p>
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
  } else if (agent_code === 'executivo' && step_type === 'review') {
    content = <ExecutiveReviewView data={output_data as ExecutiveReviewOutput} />;
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
