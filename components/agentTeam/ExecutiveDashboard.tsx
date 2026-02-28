import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import type {
  ScoreResult,
  ForecastResult,
  OptimizationResult,
  AlertDecision,
} from '../../core/decisionTypes';
import type { FinancialSummary } from '../../types/agentTeam';
import type {
  ExecutiveSummary,
  ExecutiveDriver,
  ExecutiveRisk,
  ExecutiveAction,
} from '../../executive/executiveSummaryBuilder';

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
}

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
// Main Component
// --------------------------------------------

const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-team/executive-dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
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

  const { summary, financial_summary, score, forecast, optimization, alerts, trend_last_6_months } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: scoreBg(summary.overall_health_score) }}
          >
            <Shield size={22} style={{ color: scoreColor(summary.overall_health_score) }} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-gray-900">
              Dashboard Executivo
            </h1>
            <p className="text-[10px] text-gray-400">Decision Intelligence Platform</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 transition-all"
          title="Atualizar"
        >
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

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

export default ExecutiveDashboard;
