import React, { useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import type {
  CompanyFinancialSnapshot,
  ConsolidatedFinancials,
  PortfolioScore,
  RiskDistribution,
  CapitalAllocationResult,
  PortfolioStressResult,
} from '../../core/holdingTypes';
import { calculateConsolidatedFinancials, calculatePortfolioScore, calculateRiskDistribution } from '../../core/holdingEngine';
import { recommendCapitalAllocation } from '../../core/capitalAllocationEngine';

// --------------------------------------------
// Props
// --------------------------------------------

interface HoldingDashboardProps {
  companies: CompanyFinancialSnapshot[];
  stressResults?: PortfolioStressResult[];
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function fmtBRL(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`;
  return `R$ ${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#2563EB';
  if (score >= 50) return '#D97706';
  if (score >= 30) return '#EA580C';
  return '#DC2626';
}

function scoreBg(score: number): string {
  if (score >= 85) return '#ECFDF5';
  if (score >= 70) return '#EFF6FF';
  if (score >= 50) return '#FFFBEB';
  if (score >= 30) return '#FFF7ED';
  return '#FEF2F2';
}

function riskColor(level: string): string {
  switch (level) {
    case 'very_low': return '#059669';
    case 'low': return '#22C55E';
    case 'moderate': return '#D97706';
    case 'high': return '#EA580C';
    case 'critical': return '#DC2626';
    default: return '#6B7280';
  }
}

function riskLabel(level: string): string {
  switch (level) {
    case 'very_low': return 'Muito Baixo';
    case 'low': return 'Baixo';
    case 'moderate': return 'Moderado';
    case 'high': return 'Alto';
    case 'critical': return 'Crítico';
    default: return level;
  }
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
  <div className="rounded-xl p-4 border" style={{ backgroundColor: bg, borderColor: color + '30' }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="text-2xl font-black" style={{ color }}>{value}</div>
    {subtitle && <div className="text-[10px] text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

const CompanyRankingRow: React.FC<{
  entry: { display_name: string; score: number; rank: number; weight: number };
}> = ({ entry }) => (
  <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
    <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
      entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
      entry.rank === 2 ? 'bg-gray-200 text-gray-600' :
      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
      'bg-gray-100 text-gray-500'
    }`}>
      {entry.rank}
    </span>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-gray-800 truncate">{entry.display_name}</div>
      <div className="text-[9px] text-gray-400">Peso: {entry.weight.toFixed(1)}%</div>
    </div>
    <div className="text-right">
      <div className="text-sm font-bold" style={{ color: scoreColor(entry.score) }}>
        {entry.score}
      </div>
    </div>
  </div>
);

const AllocationBadge: React.FC<{ type: 'invest' | 'optimize' | 'divest' }> = ({ type }) => {
  const styles = {
    invest: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'INVESTIR' },
    optimize: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'OTIMIZAR' },
    divest: { bg: 'bg-red-100', text: 'text-red-700', label: 'DESINVESTIR' },
  };
  const s = styles[type];
  return <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{s.label}</span>;
};

// --------------------------------------------
// Main Component
// --------------------------------------------

const HoldingDashboard: React.FC<HoldingDashboardProps> = ({ companies, stressResults, loading }) => {
  // Compute all data via pure engines
  const consolidated = useMemo(() => calculateConsolidatedFinancials(companies), [companies]);
  const portfolioScore = useMemo(() => calculatePortfolioScore(companies), [companies]);
  const riskDist = useMemo(() => calculateRiskDistribution(companies), [companies]);
  const allocation = useMemo(() => recommendCapitalAllocation(companies), [companies]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Nenhuma empresa no portfólio</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: scoreBg(portfolioScore.score) }}>
          <Building2 size={22} style={{ color: scoreColor(portfolioScore.score) }} />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-gray-900">
            Portfolio Intelligence
          </h1>
          <p className="text-[10px] text-gray-400">
            {consolidated.company_count} empresa{consolidated.company_count !== 1 ? 's' : ''} no portfólio
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KPICard
          label="Score Portfólio"
          value={String(portfolioScore.score)}
          subtitle={portfolioScore.label}
          icon={<Shield size={16} />}
          color={scoreColor(portfolioScore.score)}
          bg={scoreBg(portfolioScore.score)}
        />
        <KPICard
          label="EBITDA Consolidado"
          value={fmtBRL(consolidated.consolidated_ebitda)}
          subtitle={`Margem: ${fmtPct(consolidated.consolidated_margin)}`}
          icon={<Activity size={16} />}
          color={consolidated.consolidated_ebitda >= 0 ? '#059669' : '#DC2626'}
          bg={consolidated.consolidated_ebitda >= 0 ? '#ECFDF5' : '#FEF2F2'}
        />
        <KPICard
          label="Receita Total"
          value={fmtBRL(consolidated.consolidated_revenue)}
          subtitle={`Crescimento: ${consolidated.consolidated_growth > 0 ? '+' : ''}${fmtPct(consolidated.consolidated_growth)}`}
          icon={<TrendingUp size={16} />}
          color="#2563EB"
          bg="#EFF6FF"
        />
        <KPICard
          label="Risco Portfólio"
          value={riskLabel(riskDist.portfolio_risk_level)}
          subtitle={`Score: ${riskDist.risk_score}/100`}
          icon={<AlertTriangle size={16} />}
          color={riskColor(riskDist.portfolio_risk_level)}
          bg={riskDist.risk_score <= 30 ? '#ECFDF5' : riskDist.risk_score <= 60 ? '#FFFBEB' : '#FEF2F2'}
        />
      </div>

      {/* Row 2: Ranking + Allocation + Risk Map */}
      <div className="grid grid-cols-3 gap-4">
        {/* Company Ranking */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <BarChart3 size={12} className="text-indigo-500" />
            Ranking Empresas
          </div>
          <div>
            {portfolioScore.company_scores.map((e) => (
              <CompanyRankingRow key={e.organization_id} entry={e} />
            ))}
          </div>
          {/* Diversification */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Concentração (HHI)</span>
              <span className="font-mono text-gray-700">{portfolioScore.diversification.hhi_index}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-gray-500">Dominante</span>
              <span className="text-gray-700">{portfolioScore.diversification.dominant_company} ({fmtPct(portfolioScore.diversification.dominant_share)})</span>
            </div>
          </div>
        </div>

        {/* Capital Allocation */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <DollarSign size={12} className="text-emerald-500" />
            Alocação de Capital
          </div>
          <div className="space-y-2">
            {allocation.invest_more_in.map((r) => (
              <div key={r.organization_id} className="flex items-start gap-2">
                <AllocationBadge type="invest" />
                <div>
                  <div className="text-[11px] font-medium text-gray-800">{r.display_name}</div>
                  <div className="text-[9px] text-gray-500">{r.rationale}</div>
                </div>
              </div>
            ))}
            {allocation.optimize.map((r) => (
              <div key={r.organization_id} className="flex items-start gap-2">
                <AllocationBadge type="optimize" />
                <div>
                  <div className="text-[11px] font-medium text-gray-800">{r.display_name}</div>
                  <div className="text-[9px] text-gray-500">{r.rationale}</div>
                </div>
              </div>
            ))}
            {allocation.divest.map((r) => (
              <div key={r.organization_id} className="flex items-start gap-2">
                <AllocationBadge type="divest" />
                <div>
                  <div className="text-[11px] font-medium text-gray-800">{r.display_name}</div>
                  <div className="text-[9px] text-gray-500">{r.rationale}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Summary */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Ganho esperado</span>
              <span className={`font-mono font-medium ${allocation.expected_portfolio_gain > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {allocation.expected_portfolio_gain > 0 ? '+' : ''}{allocation.expected_portfolio_gain.toFixed(1)} pts
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-gray-500">Retorno ajustado risco</span>
              <span className="font-mono text-gray-700">
                {allocation.risk_adjusted_return > 0 ? '+' : ''}{allocation.risk_adjusted_return.toFixed(1)} pts
              </span>
            </div>
          </div>
        </div>

        {/* Risk Map */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <Shield size={12} className="text-amber-500" />
            Mapa de Risco
          </div>
          <div className="space-y-2">
            {riskDist.company_risks.map((cr) => (
              <div key={cr.organization_id} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: riskColor(cr.risk_level) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-gray-800 truncate">{cr.display_name}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono" style={{ color: riskColor(cr.risk_level) }}>
                    {cr.risk_score}
                  </span>
                  <span className="text-[9px] text-gray-400 ml-1">
                    ({fmtPct(cr.portfolio_impact_pct)})
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Correlation */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-[9px] text-gray-500">{riskDist.risk_correlation.description}</div>
          </div>
          {/* Alerts */}
          {riskDist.alerts.length > 0 && (
            <div className="mt-2 space-y-1">
              {riskDist.alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className="flex items-start gap-1 text-[9px] text-amber-700">
                  <AlertTriangle size={9} className="mt-0.5 shrink-0" />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Interno — Comparação entre empresas */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
          <Target size={12} className="text-indigo-500" />
          Benchmark Interno
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Empresa</th>
                <th className="text-right py-2 text-gray-500 font-medium">Score</th>
                <th className="text-right py-2 text-gray-500 font-medium">Receita</th>
                <th className="text-right py-2 text-gray-500 font-medium">EBITDA</th>
                <th className="text-right py-2 text-gray-500 font-medium">Margem</th>
                <th className="text-right py-2 text-gray-500 font-medium">Cresc.</th>
                <th className="text-right py-2 text-gray-500 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {consolidated.company_breakdown.map((cb) => {
                const company = companies.find(c => c.organization_id === cb.organization_id);
                return (
                  <tr key={cb.organization_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{cb.display_name}</td>
                    <td className="py-2 text-right">
                      <span className="font-bold" style={{ color: scoreColor(company?.health_score ?? 0) }}>
                        {company?.health_score ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-gray-700">{fmtBRL(cb.revenue)}</td>
                    <td className="py-2 text-right font-mono" style={{ color: cb.ebitda >= 0 ? '#059669' : '#DC2626' }}>
                      {fmtBRL(cb.ebitda)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-700">{fmtPct(cb.margin)}</td>
                    <td className="py-2 text-right">
                      <span className={`font-mono ${(company?.growth_yoy ?? 0) > 0 ? 'text-emerald-600' : (company?.growth_yoy ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {(company?.growth_yoy ?? 0) > 0 ? '+' : ''}{fmtPct(company?.growth_yoy ?? 0)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-gray-500">{fmtPct(cb.revenue_share)}</td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-gray-50 font-bold">
                <td className="py-2 text-gray-900">CONSOLIDADO</td>
                <td className="py-2 text-right" style={{ color: scoreColor(portfolioScore.score) }}>
                  {portfolioScore.score}
                </td>
                <td className="py-2 text-right font-mono text-gray-900">{fmtBRL(consolidated.consolidated_revenue)}</td>
                <td className="py-2 text-right font-mono" style={{ color: consolidated.consolidated_ebitda >= 0 ? '#059669' : '#DC2626' }}>
                  {fmtBRL(consolidated.consolidated_ebitda)}
                </td>
                <td className="py-2 text-right font-mono text-gray-900">{fmtPct(consolidated.consolidated_margin)}</td>
                <td className="py-2 text-right">
                  <span className={`font-mono ${consolidated.consolidated_growth > 0 ? 'text-emerald-600' : consolidated.consolidated_growth < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {consolidated.consolidated_growth > 0 ? '+' : ''}{fmtPct(consolidated.consolidated_growth)}
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-gray-500">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Stress Test Results (if available) */}
      {stressResults && stressResults.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-red-500" />
            Stress Test — Resiliência do Portfólio
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stressResults.map((sr, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="text-[10px] font-medium text-gray-700 mb-1">{sr.scenario_name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-400">EBITDA</span>
                  <span className={`text-[11px] font-mono font-medium ${sr.ebitda_delta_pct < -10 ? 'text-red-600' : sr.ebitda_delta_pct < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {sr.ebitda_delta_pct > 0 ? '+' : ''}{sr.ebitda_delta_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-gray-400">Score</span>
                  <span className="text-[11px] font-mono" style={{ color: scoreColor(sr.stressed_portfolio_score) }}>
                    {sr.stressed_portfolio_score}
                  </span>
                </div>
                <div className="mt-1 text-[8px] text-gray-400">
                  {sr.portfolio_survives ? 'Portfólio sobrevive' : 'EBITDA negativo!'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocation Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200">
        <div className="text-[10px] text-gray-500">{allocation.summary}</div>
      </div>
    </div>
  );
};

export default HoldingDashboard;
