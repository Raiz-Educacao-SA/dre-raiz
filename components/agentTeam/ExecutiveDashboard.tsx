import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  FlaskConical,
  Lightbulb,
  LayoutDashboard,
} from 'lucide-react';
import type {
  ScoreResult,
  ForecastResult,
  OptimizationResult,
  AlertDecision,
  FinancialInputs,
  ScoreInputs,
  TimeSeriesPoint,
  CutCandidate,
  OptimizationInput,
} from '../../core/decisionTypes';
import type { FinancialSummary } from '../../types/agentTeam';
import type {
  ExecutiveSummary,
  ExecutiveDriver,
  ExecutiveRisk,
  ExecutiveAction,
} from '../../executive/executiveSummaryBuilder';
import type { BenchmarkComparison } from '../../core/benchmarkEngine';
import type { SimulationBaseData, ScenarioSimulationResult } from '../../core/scenarioEngine';
import type { ScenarioComparisonResult } from '../../core/scenarioComparison';
import type { StrategicRiskAssessment } from '../../core/strategicRiskEngine';
import type { MacroRiskIndex, MacroImpactResult, MacroMaturityReport } from '../../core/macroTypes';
import { DEFAULT_MACRO_ASSUMPTIONS } from '../../core/macroTypes';
import BenchmarkPositionPanel from './BenchmarkPositionPanel';
import MacroContextPanel from './MacroContextPanel';
import MacroMaturityPanel from './MacroMaturityPanel';
import StrategicLab from './StrategicLab';
import DecisionAnalysisPanel from './DecisionAnalysisPanel';
// Client-side data fetching + pure engines
import { getSomaTags } from '../../services/supabaseService';
import { buildFinancialSummary } from '../../api/agent-team/_lib/buildFinancialSummary';
import {
  runAnalysis,
  forecast as runForecast,
  optimize,
  deriveMetrics,
  normalizeFinancialInputs,
  safePct,
} from '../../core/DecisionEngine';
import { buildExecutiveSummary } from '../../executive/executiveSummaryBuilder';
import { generateMacroMaturityReport } from '../../core/macroMaturityEngine';

// --------------------------------------------
// Types
// --------------------------------------------

interface DashboardData {
  summary: ExecutiveSummary | null;
  financial_summary: FinancialSummary | null;
  score: ScoreResult | null;
  forecast: ForecastResult | null;
  optimization: OptimizationResult | null;
  alerts: AlertDecision[];
  trend_last_6_months: { mes: string; receita: number; ebitda: number }[];
  benchmark: BenchmarkComparison | null;
  macro_risk: MacroRiskIndex | null;
  macro_impact: MacroImpactResult | null;
  macro_maturity: MacroMaturityReport | null;
}

type TabId = 'dashboard' | 'simulation' | 'decisions';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'simulation', label: 'Simulação', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { id: 'decisions', label: 'Decisões', icon: <Lightbulb className="w-3.5 h-3.5" /> },
];

// --------------------------------------------
// Color maps
// --------------------------------------------

function scoreColor(score: number): string {
  if (score >= 85) return '#059669'; // green-600
  if (score >= 70) return '#D97706'; // amber-600
  return '#DC2626'; // red-600
}

function scoreBg(score: number): string {
  if (score >= 85) return '#ECFDF5'; // green-50
  if (score >= 70) return '#FFFBEB'; // amber-50
  return '#FEF2F2'; // red-50
}

function riskColor(level: string): string {
  switch (level) {
    case 'low': return '#059669';
    case 'medium': return '#D97706';
    case 'high': return '#EA580C';
    case 'critical': return '#DC2626';
    default: return '#6B7280';
  }
}

function riskBg(level: string): string {
  switch (level) {
    case 'low': return '#ECFDF5';
    case 'medium': return '#FFFBEB';
    case 'high': return '#FFF7ED';
    case 'critical': return '#FEF2F2';
    default: return '#F9FAFB';
  }
}

function riskLabel(level: string): string {
  switch (level) {
    case 'low': return 'BAIXO';
    case 'medium': return 'MODERADO';
    case 'high': return 'ALTO';
    case 'critical': return 'CRÍTICO';
    default: return level.toUpperCase();
  }
}

// --------------------------------------------
// Data extraction helpers (adapted from api/agent-team/executive-dashboard.ts)
// --------------------------------------------

interface SomaRow { tag0: string; tag01: string; scenario: string; month: string; total: number }

function buildTimeSeries(rows: SomaRow[]): TimeSeriesPoint[] {
  const months = new Map<string, { receita: number; cv: number; cf: number; rateio: number; receita_orc: number }>();
  for (const row of rows) {
    if (row.scenario !== 'Real') continue;
    if (!months.has(row.month)) months.set(row.month, { receita: 0, cv: 0, cf: 0, rateio: 0, receita_orc: 0 });
    const e = months.get(row.month)!;
    if (row.tag0?.startsWith('01.')) e.receita += row.total;
    else if (row.tag0?.startsWith('02.')) e.cv += row.total;
    else if (row.tag0?.startsWith('03.')) e.cf += row.total;
    else if (row.tag0?.startsWith('06.')) e.rateio += row.total;
  }
  for (const row of rows) {
    if (row.scenario !== 'Orçado') continue;
    const e = months.get(row.month);
    if (e && row.tag0?.startsWith('01.')) e.receita_orc += row.total;
  }
  return [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, d]) => {
    const margin = safePctCalc(d.receita + d.cv, d.receita);
    const ebitda = d.receita + d.cv + d.cf + d.rateio;
    const marginGap = Math.max(0, safePctCalc(d.receita_orc, d.receita_orc) - margin);
    const score = Math.max(0, Math.min(100, 100 - marginGap * 0.5));
    return { score, margin, ebitda };
  });
}

function buildCutCands(summary: FinancialSummary): CutCandidate[] {
  return summary.top5_variacoes
    .filter((v) => v.delta_pct > 0)
    .map((v) => ({ area: v.tag01, gap: v.real - v.orcado, volume: Math.abs(v.real) }));
}

// Format helpers
// --------------------------------------------

function fmtBRL(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `R$ ${(n / 1_000).toFixed(0)}K`;
  }
  return `R$ ${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function safePctCalc(num: number, den: number): number {
  if (!den || !isFinite(den) || !isFinite(num)) return 0;
  return Math.round((num / Math.abs(den)) * 10000) / 100;
}

// --------------------------------------------
// Sub-components
// --------------------------------------------

const KPICard: React.FC<{
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}> = ({ label, value, subtitle, icon, color, bg }) => (
  <div
    className="rounded-xl p-4 border"
    style={{ backgroundColor: bg, borderColor: color + '30' }}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="text-2xl font-black" style={{ color }}>
      {value}
    </div>
    {subtitle && (
      <div className="text-[10px] text-gray-500 mt-1">{subtitle}</div>
    )}
  </div>
);

const MiniBar: React.FC<{ data: { mes: string; ebitda: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => Math.abs(d.ebitda)), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const height = Math.max(4, (Math.abs(d.ebitda) / max) * 100);
        const isNeg = d.ebitda < 0;
        return (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t"
              style={{
                height: `${height}%`,
                backgroundColor: isNeg ? '#FCA5A5' : '#6EE7B7',
                minHeight: '4px',
              }}
              title={`${d.mes}: ${fmtBRL(d.ebitda)}`}
            />
            <span className="text-[8px] text-gray-400 mt-0.5">
              {d.mes.split('-')[1] || d.mes}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DriverItem: React.FC<{ driver: ExecutiveDriver }> = ({ driver }) => (
  <div className="flex items-start gap-2 py-1.5">
    {driver.direction === 'positive' ? (
      <ArrowUp size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
    ) : driver.direction === 'negative' ? (
      <ArrowDown size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
    ) : (
      <Minus size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
    )}
    <div>
      <span className="text-xs font-semibold text-gray-900">{driver.label}</span>
      <p className="text-[10px] text-gray-500">{driver.impact}</p>
    </div>
  </div>
);

const RiskItem: React.FC<{ risk: ExecutiveRisk }> = ({ risk }) => (
  <div className="flex items-start gap-2 py-1.5">
    <span
      className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
      style={{ backgroundColor: riskColor(risk.severity) }}
    />
    <div>
      <p className="text-xs text-gray-900">{risk.description}</p>
      <span className="text-[9px] text-gray-400">{risk.source}</span>
    </div>
  </div>
);

const ActionItem: React.FC<{ action: ExecutiveAction; index: number }> = ({ action, index }) => (
  <div className="flex items-start gap-2 py-1.5">
    <span
      className={`text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
        action.priority === 'high'
          ? 'bg-red-100 text-red-700'
          : action.priority === 'medium'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {index + 1}
    </span>
    <div>
      <p className="text-xs text-gray-900">{action.action}</p>
      <span className="text-[10px] text-gray-500">{action.expected_impact}</span>
    </div>
  </div>
);

// --------------------------------------------
// Dashboard Content (inner component)
// --------------------------------------------

const DashboardContent: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const { summary, financial_summary, score, forecast, optimization, alerts, trend_last_6_months } = data;

  if (!summary) return null;

  return (
    <div className="space-y-5">
      {/* LINHA 1 — Score + Risk + Confidence */}
      <div className="grid grid-cols-3 gap-4">
        {/* Health Score — grande */}
        <div
          className="rounded-xl p-5 border text-center"
          style={{
            backgroundColor: scoreBg(summary.overall_health_score),
            borderColor: scoreColor(summary.overall_health_score) + '30',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Health Score
          </div>
          <div
            className="text-5xl font-black"
            style={{ color: scoreColor(summary.overall_health_score) }}
          >
            {summary.overall_health_score}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {score?.classification ?? '—'}
          </div>
        </div>

        {/* Risk Level */}
        <div
          className="rounded-xl p-5 border text-center"
          style={{
            backgroundColor: riskBg(summary.risk_level),
            borderColor: riskColor(summary.risk_level) + '30',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Nível de Risco
          </div>
          <div
            className="text-2xl font-black"
            style={{ color: riskColor(summary.risk_level) }}
          >
            {riskLabel(summary.risk_level)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} ativo{alerts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Confidence */}
        <div className="rounded-xl p-5 border border-gray-200 bg-gray-50 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Confiança
          </div>
          <div className="text-4xl font-black text-gray-900">
            {summary.confidence_level}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Completude dos dados
          </div>
        </div>
      </div>

      {/* LINHA 2 — KPIs financeiros */}
      {financial_summary && (
        <div className="grid grid-cols-4 gap-3">
          <KPICard
            label="EBITDA"
            value={fmtBRL(financial_summary.ebitda.real)}
            subtitle={`Orçado: ${fmtBRL(financial_summary.ebitda.orcado)}`}
            icon={<Activity size={16} />}
            color={financial_summary.ebitda.real >= 0 ? '#059669' : '#DC2626'}
            bg={financial_summary.ebitda.real >= 0 ? '#ECFDF5' : '#FEF2F2'}
          />
          <KPICard
            label="Margem"
            value={fmtPct(financial_summary.margem_contribuicao.pct_real)}
            subtitle={`Orçado: ${fmtPct(financial_summary.margem_contribuicao.pct_orcado)}`}
            icon={<Target size={16} />}
            color={financial_summary.margem_contribuicao.health === 'healthy' ? '#059669' : financial_summary.margem_contribuicao.health === 'attention' ? '#D97706' : '#DC2626'}
            bg={financial_summary.margem_contribuicao.health === 'healthy' ? '#ECFDF5' : financial_summary.margem_contribuicao.health === 'attention' ? '#FFFBEB' : '#FEF2F2'}
          />
          <KPICard
            label="Receita"
            value={fmtBRL(financial_summary.receita.real)}
            subtitle={`Gap: ${fmtPct(financial_summary.receita.gap_pct)}`}
            icon={<TrendingUp size={16} />}
            color="#2563EB"
            bg="#EFF6FF"
          />
          <KPICard
            label="Tendência"
            value={
              forecast
                ? forecast.slope.score > 0
                  ? 'Melhora'
                  : forecast.slope.score < 0
                  ? 'Queda'
                  : 'Estável'
                : '—'
            }
            subtitle={
              forecast
                ? `Score proj.: ${Math.round(forecast.forecast.score[2])}`
                : 'Sem forecast'
            }
            icon={
              forecast?.slope.score && forecast.slope.score > 0
                ? <TrendingUp size={16} />
                : forecast?.slope.score && forecast.slope.score < 0
                ? <TrendingDown size={16} />
                : <Minus size={16} />
            }
            color={
              forecast?.slope.score && forecast.slope.score > 0 ? '#059669'
                : forecast?.slope.score && forecast.slope.score < 0 ? '#DC2626'
                : '#6B7280'
            }
            bg={
              forecast?.slope.score && forecast.slope.score > 0 ? '#ECFDF5'
                : forecast?.slope.score && forecast.slope.score < 0 ? '#FEF2F2'
                : '#F9FAFB'
            }
          />
        </div>
      )}

      {/* LINHA 3 — Trend chart + Optimization + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            EBITDA Mensal
          </div>
          <MiniBar data={trend_last_6_months} />
        </div>

        {/* Optimization */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Plano Ótimo
          </div>
          {optimization ? (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-bold text-gray-900">
                  {optimization.proposed_actions.length}
                </span>
                <span className="text-gray-500"> ações identificadas</span>
              </div>
              <div className="text-xs text-gray-500">
                Score projetado:{' '}
                <span className="font-bold text-gray-900">
                  {Math.round(optimization.projected_score)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                EBITDA projetado:{' '}
                <span className="font-bold text-gray-900">
                  {fmtBRL(optimization.projected_ebitda)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              Score acima de 85 — sem otimização necessária
            </div>
          )}
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" />
            Alertas Críticos
          </div>
          {alerts.filter((a) => a.severity === 'high').length > 0 ? (
            <div className="space-y-1.5">
              {alerts
                .filter((a) => a.severity === 'high')
                .slice(0, 3)
                .map((alert, i) => (
                  <div key={i} className="text-[10px] text-red-700 bg-red-50 px-2 py-1 rounded">
                    {alert.message}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-xs text-green-600">Nenhum alerta crítico</div>
          )}
        </div>
      </div>

      {/* LINHA 4 — Drivers + Risks + Actions */}
      <div className="grid grid-cols-3 gap-4">
        {/* Main Drivers */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Principais Drivers
          </div>
          <div className="divide-y divide-gray-100">
            {summary.main_drivers.map((d, i) => (
              <DriverItem key={i} driver={d} />
            ))}
          </div>
        </div>

        {/* Top Risks */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Principais Riscos
          </div>
          {summary.top_risks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {summary.top_risks.map((r, i) => (
                <RiskItem key={i} risk={r} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-green-600">Nenhum risco significativo</div>
          )}
        </div>

        {/* Priority Actions */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Ações Prioritárias
          </div>
          {summary.optimal_actions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {summary.optimal_actions.map((a, i) => (
                <ActionItem key={i} action={a} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400">Nenhuma ação pendente</div>
          )}
        </div>
      </div>

      {/* Benchmark + Macro Context — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BenchmarkPositionPanel comparison={data.benchmark} loading={loading} />
        <MacroContextPanel macroRisk={data.macro_risk} macroImpact={data.macro_impact} loading={loading} />
      </div>

      {/* Macro Maturity Report */}
      <MacroMaturityPanel report={data.macro_maturity} loading={loading} />

      {/* Narrative */}
      {summary.executive_narrative.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Sumário Executivo
          </div>
          <div className="space-y-3">
            {summary.executive_narrative.map((p, i) => (
              <div key={i}>
                <h3 className="text-xs font-bold text-gray-900">{p.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------
// Main Component — Container with Tabs
// --------------------------------------------

const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Simulation state (shared between Simulation and Decisions tabs)
  const [simResults, setSimResults] = useState<ScenarioSimulationResult[] | null>(null);
  const [simComparison, setSimComparison] = useState<ScenarioComparisonResult | null>(null);
  const [simRiskAssessment, setSimRiskAssessment] = useState<StrategicRiskAssessment | null>(null);

  const handleSimulationComplete = useCallback((
    results: ScenarioSimulationResult[],
    comparison: ScenarioComparisonResult | null,
    riskAssessment: StrategicRiskAssessment | null,
  ) => {
    setSimResults(results);
    setSimComparison(comparison);
    setSimRiskAssessment(riskAssessment);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = new Date().getUTCFullYear().toString();

      // 1. Buscar dados DRE via Supabase (mesmo RPC que SomaTagsView usa)
      const dreSnapshot = await getSomaTags(`${year}-01`, `${year}-12`);
      if (!dreSnapshot || dreSnapshot.length === 0) {
        setData({
          summary: null,
          financial_summary: null,
          score: null,
          forecast: null,
          optimization: null,
          alerts: [],
          trend_last_6_months: [],
          benchmark: null,
          macro_risk: null,
          macro_impact: null,
          macro_maturity: null,
        });
        return;
      }

      // 2. Build financial summary (função pura)
      let financialSummary: FinancialSummary;
      try {
        financialSummary = buildFinancialSummary(dreSnapshot);
      } catch (e) {
        console.error('❌ buildFinancialSummary falhou:', e);
        setError('Erro ao processar dados financeiros. Verifique se há dados DRE no período.');
        return;
      }

      // 3. Converter para inputs do DecisionEngine
      // normalizeFinancialInputs espera formato aninhado { receita: { real, orcado }, ... }
      const financials = normalizeFinancialInputs(financialSummary);

      const metrics = deriveMetrics(financials);

      const scoreInputs: ScoreInputs = {
        confidence: 80,
        margin_real: metrics.margin,
        margin_orcado: safePct(
          financialSummary.margem_contribuicao.orcado,
          financialSummary.receita.orcado,
        ),
        ebitda_real: metrics.ebitda,
        ebitda_a1: financialSummary.ebitda.a1,
        high_priority_count: 0,
        conflicts_count: 0,
      };

      // 4. DecisionEngine — análise completa
      const analysis = runAnalysis(scoreInputs, financials);

      // 5. Forecast — montar série temporal dos últimos meses
      const timeSeries = buildTimeSeries(dreSnapshot);
      const forecastResult = timeSeries.length >= 3 ? runForecast(timeSeries) : null;

      // 6. Optimization — candidatos a corte
      const candidates = buildCutCands(financialSummary);
      let optimizationResult: OptimizationResult | null = null;
      if (candidates.length > 0 && analysis.score.score < 85) {
        const optInput: OptimizationInput = {
          current_financials: financials,
          current_score_inputs: scoreInputs,
          target_score: 85,
          candidates,
        };
        optimizationResult = optimize(optInput);
      }

      // 7. Executive Summary
      const summary = buildExecutiveSummary({
        scoreResult: analysis.score,
        metrics: analysis.metrics,
        forecastResult,
        optimizationResult,
        alerts: analysis.alerts,
      });

      // 8. Trend últimos 6 meses
      const trend = financialSummary.tendencia_mensal.slice(-6);

      // 9. Macro Maturity (client-side, sem indicadores macro do banco)
      let macroMaturity: MacroMaturityReport | null = null;
      try {
        macroMaturity = generateMacroMaturityReport(financials, DEFAULT_MACRO_ASSUMPTIONS, false);
      } catch { /* opcional */ }

      setData({
        summary,
        financial_summary: financialSummary,
        score: analysis.score,
        forecast: forecastResult,
        optimization: optimizationResult,
        alerts: analysis.alerts,
        trend_last_6_months: trend,
        benchmark: null, // Benchmark requer tabela benchmark_aggregates (opcional)
        macro_risk: null, // Requer tabela macro_indicators (opcional)
        macro_impact: null, // Requer tabela macro_indicators (opcional)
        macro_maturity: macroMaturity,
      });
    } catch (err: unknown) {
      console.error('❌ CEO Dashboard loadData error:', err);
      const msg = err instanceof Error ? `${err.message}` : 'Erro ao carregar dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build SimulationBaseData from dashboard data for StrategicLab
  const simulationBaseData = useMemo<SimulationBaseData | null>(() => {
    if (!data?.financial_summary || !data?.score) return null;

    const fs = data.financial_summary;

    const financials: FinancialInputs = {
      receita_real: fs.receita.real,
      receita_orcado: fs.receita.orcado,
      custos_variaveis_real: fs.custos_variaveis.real,
      custos_variaveis_orcado: fs.custos_variaveis.orcado,
      custos_fixos_real: fs.custos_fixos.real,
      custos_fixos_orcado: fs.custos_fixos.orcado,
      sga_real: fs.sga.real,
      sga_orcado: fs.sga.orcado,
      rateio_real: fs.rateio.real,
      rateio_orcado: fs.rateio.orcado,
    };

    const score_inputs: ScoreInputs = {
      confidence: 80,
      margin_real: fs.margem_contribuicao.pct_real,
      margin_orcado: fs.margem_contribuicao.pct_orcado,
      ebitda_real: fs.ebitda.real,
      ebitda_a1: fs.ebitda.a1,
      high_priority_count: 0,
      conflicts_count: 0,
    };

    // Build time series from trend data
    const historical_series: TimeSeriesPoint[] = data.trend_last_6_months.map((t) => {
      const margin = safePctCalc(t.receita + (t.ebitda - t.receita), t.receita);
      return {
        score: data.score!.score,
        margin,
        ebitda: t.ebitda,
      };
    });

    // Build cut candidates from top5 variations (costs above budget)
    const cut_candidates: CutCandidate[] = fs.top5_variacoes
      .filter((v) => v.delta_pct > 0)
      .map((v) => ({
        area: v.tag01,
        gap: v.real - v.orcado,
        volume: Math.abs(v.real),
      }));

    return { financials, score_inputs, historical_series, cut_candidates };
  }, [data]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 text-xs text-indigo-600 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        Sem dados disponíveis para o dashboard executivo.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: scoreBg(data.summary!.overall_health_score) }}
          >
            <Shield size={22} style={{ color: scoreColor(data.summary!.overall_health_score) }} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-gray-900">
              Decision Intelligence
            </h1>
            <p className="text-[10px] text-gray-400">Plataforma de Inteligência Estratégica</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          title="Atualizar"
        >
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardContent data={data} loading={loading} />
      )}

      {activeTab === 'simulation' && (
        <StrategicLab
          baseData={simulationBaseData}
          loading={loading}
          onSimulationComplete={handleSimulationComplete}
        />
      )}

      {activeTab === 'decisions' && (
        <DecisionAnalysisPanel
          scenarios={simResults}
          comparison={simComparison}
          riskAssessment={simRiskAssessment}
          loading={loading}
        />
      )}
    </div>
  );
};

export default ExecutiveDashboard;
