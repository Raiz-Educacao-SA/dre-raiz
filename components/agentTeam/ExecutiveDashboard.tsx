import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Building2,
  Zap,
  Calendar,
  Tag,
  X,
  Info,
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
import { getSomaTags, getDistinctColumn, getTag02Options, getTag03Options, getTag02OptionsForTag01s, getTag03OptionsForTag02s, getTag03OptionsForTag01s } from '../../services/supabaseService';
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
import MultiSelectFilter from '../MultiSelectFilter';
import { buildPortfolioFromDRE } from '../../core/portfolioBridge';
import { calculateConsolidatedFinancials, calculatePortfolioScore, calculateRiskDistribution } from '../../core/holdingEngine';
import { recommendCapitalAllocation } from '../../core/capitalAllocationEngine';
import { runPortfolioStressTests, buildStressTestSummary } from '../../core/portfolioStressTest';
import type { CompanyFinancialSnapshot, ConsolidatedFinancials, PortfolioScore, RiskDistribution, CapitalAllocationResult, PortfolioStressResult } from '../../core/holdingTypes';
import { getMarcasEFiliais } from '../../services/supabaseService';
import type { SomaTagsRow } from '../../services/supabaseService';
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
  // Portfolio (dados reais por marca)
  portfolio_companies: CompanyFinancialSnapshot[];
  portfolio_consolidated: ConsolidatedFinancials | null;
  portfolio_score: PortfolioScore | null;
  portfolio_risk: RiskDistribution | null;
  portfolio_allocation: CapitalAllocationResult | null;
  portfolio_stress: PortfolioStressResult[];
}

type TabId = 'dashboard' | 'portfolio' | 'simulation' | 'decisions' | 'stress';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'simulation', label: 'Simulacao', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { id: 'decisions', label: 'Decisoes', icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { id: 'stress', label: 'Stress Test', icon: <Zap className="w-3.5 h-3.5" /> },
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
  onClick?: () => void;
}> = ({ label, value, subtitle, icon, color, bg, onClick }) => (
  <div
    className={`rounded-xl p-4 border${onClick ? ' cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    style={{ backgroundColor: bg, borderColor: color + '30' }}
    onClick={onClick}
    title={onClick ? 'Clique para ver memorial de cálculo' : undefined}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
        {label} {onClick && <Info size={9} className="opacity-40" />}
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
// Calculation Memory Modal
// --------------------------------------------

type CardId =
  | 'health-score'
  | 'risk'
  | 'confidence'
  | 'ebitda'
  | 'margin'
  | 'revenue'
  | 'trend'
  | 'ebitda-monthly'
  | 'optimization'
  | 'alerts';

const CalcMemoryModal: React.FC<{
  cardId: CardId;
  data: DashboardData;
  onClose: () => void;
}> = ({ cardId, data, onClose }) => {
  const { summary, financial_summary, score, forecast, optimization, alerts, trend_last_6_months } = data;

  const renderContent = () => {
    switch (cardId) {
      case 'health-score': {
        const b = score?.breakdown;
        if (!b) return <p className="text-xs text-gray-400">Dados de breakdown não disponíveis.</p>;
        const rows = [
          { label: 'Base inicial', value: b.base, op: '' },
          { label: 'Penalidade confiança', value: -b.penalty_confidence, op: '−' },
          { label: 'Penalidade margem', value: -b.penalty_margin, op: '−' },
          { label: 'Penalidade EBITDA', value: -b.penalty_ebitda, op: '−' },
          { label: 'Penalidade alertas críticos', value: -b.penalty_high_priority, op: '−' },
          { label: 'Penalidade conflitos', value: -b.penalty_conflicts, op: '−' },
        ];
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              O Health Score é calculado a partir de uma base de 100 pontos com descontos por penalidades.
            </p>
            <table className="w-full text-xs">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i < rows.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="py-1.5 text-gray-600">{r.label}</td>
                    <td className={`py-1.5 text-right font-bold ${r.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {r.op} {Math.abs(r.value).toFixed(1)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300">
                  <td className="py-2 font-black text-gray-900">= Score Final</td>
                  <td className="py-2 text-right font-black text-2xl" style={{ color: scoreColor(b.final_score) }}>
                    {b.final_score}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-3">Classificação: <strong>{score?.classification ?? '—'}</strong></p>
          </div>
        );
      }

      case 'risk': {
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              O nível de risco é derivado da classificação do health score em conjunto com o número de alertas ativos.
            </p>
            <table className="w-full text-xs mb-3">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Classificação score</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{score?.classification ?? '—'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Alertas ativos</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{alerts.length}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Alertas críticos (high)</td>
                  <td className="py-1.5 text-right font-bold text-red-600">{alerts.filter(a => a.severity === 'high').length}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Tendência slope</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{forecast?.slope.score?.toFixed(2) ?? '—'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-black text-gray-900">= Nível de Risco</td>
                  <td className="py-1.5 text-right font-black" style={{ color: riskColor(summary?.risk_level ?? 'low') }}>
                    {riskLabel(summary?.risk_level ?? 'low')}
                  </td>
                </tr>
              </tbody>
            </table>
            {alerts.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Todos os alertas</p>
                {alerts.map((a, i) => (
                  <div key={i} className={`text-[10px] px-2 py-1 rounded ${a.severity === 'high' ? 'bg-red-50 text-red-700' : a.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                    <span className="font-bold uppercase mr-1">[{a.severity}]</span>{a.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'confidence': {
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              O índice de confiança representa a completude e consistência dos dados disponíveis para análise.
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Confiança calculada</td>
                  <td className="py-1.5 text-right font-black text-2xl text-gray-900">{summary?.confidence_level ?? 0}%</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Significado</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">
                    {(summary?.confidence_level ?? 0) >= 80 ? 'Dados confiáveis' : (summary?.confidence_level ?? 0) >= 50 ? 'Dados parciais' : 'Dados insuficientes'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-3">
              Confiança acima de 80%: análise completa. Entre 50-80%: análise com ressalvas. Abaixo de 50%: dados insuficientes para decisão.
            </p>
          </div>
        );
      }

      case 'ebitda': {
        if (!financial_summary) return <p className="text-xs text-gray-400">Dados não disponíveis.</p>;
        const fs = financial_summary;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              EBITDA = Receita + Custos Variáveis + Custos Fixos + SG&A + Rateio (custos têm sinal negativo)
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 text-left text-[10px] text-gray-400 font-semibold">Componente</th>
                  <th className="py-1 text-right text-[10px] text-gray-400 font-semibold">Real</th>
                  <th className="py-1 text-right text-[10px] text-gray-400 font-semibold">Orçado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Receita', real: fs.receita.real, orc: fs.receita.orcado, positive: true },
                  { label: 'Custos Variáveis', real: fs.custos_variaveis.real, orc: fs.custos_variaveis.orcado, positive: false },
                  { label: 'Custos Fixos', real: fs.custos_fixos.real, orc: fs.custos_fixos.orcado, positive: false },
                  { label: 'SG&A', real: fs.sga.real, orc: fs.sga.orcado, positive: false },
                  { label: 'Rateio', real: fs.rateio.real, orc: fs.rateio.orcado, positive: false },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">{r.label}</td>
                    <td className={`py-1.5 text-right font-semibold ${r.positive ? 'text-blue-700' : 'text-red-600'}`}>{fmtBRL(r.real)}</td>
                    <td className="py-1.5 text-right text-gray-400">{fmtBRL(r.orc)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300">
                  <td className="py-2 font-black text-gray-900">= EBITDA</td>
                  <td className={`py-2 text-right font-black text-lg ${fs.ebitda.real >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtBRL(fs.ebitda.real)}</td>
                  <td className="py-2 text-right font-bold text-gray-400">{fmtBRL(fs.ebitda.orcado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      }

      case 'margin': {
        if (!financial_summary) return <p className="text-xs text-gray-400">Dados não disponíveis.</p>;
        const fs = financial_summary;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              Margem de Contribuição = (Receita + Custos Variáveis) / Receita × 100
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Receita</td>
                  <td className="py-1.5 text-right font-semibold text-blue-700">{fmtBRL(fs.receita.real)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Custos Variáveis</td>
                  <td className="py-1.5 text-right font-semibold text-red-600">{fmtBRL(fs.custos_variaveis.real)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">= Margem de Contribuição (R$)</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">{fmtBRL(fs.margem_contribuicao.real)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-black text-gray-900">= Margem %</td>
                  <td className={`py-1.5 text-right font-black text-lg ${fs.margem_contribuicao.health === 'healthy' ? 'text-emerald-600' : fs.margem_contribuicao.health === 'attention' ? 'text-amber-600' : 'text-red-600'}`}>
                    {fmtPct(fs.margem_contribuicao.pct_real)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Orçado %</td>
                  <td className="py-1.5 text-right text-gray-400">{fmtPct(fs.margem_contribuicao.pct_orcado)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-3">
              Status: <strong>{fs.margem_contribuicao.health === 'healthy' ? '✅ Saudável (≥ 30%)' : fs.margem_contribuicao.health === 'attention' ? '⚠️ Atenção (20-30%)' : '🔴 Crítico (< 20%)'}</strong>
            </p>
          </div>
        );
      }

      case 'revenue': {
        if (!financial_summary) return <p className="text-xs text-gray-400">Dados não disponíveis.</p>;
        const fs = financial_summary;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              Gap% = (Real − Orçado) / |Orçado| × 100
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Receita Real</td>
                  <td className="py-1.5 text-right font-black text-lg text-blue-700">{fmtBRL(fs.receita.real)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Receita Orçada</td>
                  <td className="py-1.5 text-right font-semibold text-gray-600">{fmtBRL(fs.receita.orcado)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Diferença (R$)</td>
                  <td className={`py-1.5 text-right font-bold ${(fs.receita.real - fs.receita.orcado) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtBRL(fs.receita.real - fs.receita.orcado)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 font-black text-gray-900">= Gap %</td>
                  <td className={`py-1.5 text-right font-black text-lg ${fs.receita.gap_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtPct(fs.receita.gap_pct)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      }

      case 'trend': {
        if (!forecast) return <p className="text-xs text-gray-400">Dados de forecast não disponíveis.</p>;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              Tendência calculada por regressão linear sobre os scores históricos mensais.
            </p>
            <table className="w-full text-xs mb-3">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Slope (inclinação)</td>
                  <td className={`py-1.5 text-right font-black text-lg ${forecast.slope.score > 0 ? 'text-emerald-600' : forecast.slope.score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {forecast.slope.score > 0 ? '+' : ''}{forecast.slope.score.toFixed(3)}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Interpretação</td>
                  <td className="py-1.5 text-right font-bold text-gray-900">
                    {forecast.slope.score > 0 ? 'Melhora' : forecast.slope.score < 0 ? 'Queda' : 'Estável'}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Projeções (próximos 3 períodos)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 text-left text-[10px] text-gray-400">Período</th>
                  <th className="py-1 text-right text-[10px] text-gray-400">Score projetado</th>
                </tr>
              </thead>
              <tbody>
                {(forecast.forecast.score ?? []).map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">+{i + 1} mês</td>
                    <td className={`py-1.5 text-right font-bold ${s >= 70 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'ebitda-monthly': {
        if (trend_last_6_months.length === 0) return <p className="text-xs text-gray-400">Sem dados mensais.</p>;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              Histórico mensal de EBITDA dos últimos meses disponíveis.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 text-left text-[10px] text-gray-400">Mês</th>
                  <th className="py-1 text-right text-[10px] text-gray-400">Receita</th>
                  <th className="py-1 text-right text-[10px] text-gray-400">EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {trend_last_6_months.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">{d.mes}</td>
                    <td className="py-1.5 text-right text-blue-700 font-semibold">{fmtBRL(d.receita)}</td>
                    <td className={`py-1.5 text-right font-bold ${d.ebitda >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtBRL(d.ebitda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'optimization': {
        if (!optimization) return <p className="text-xs text-gray-400">Score acima de 85 — sem otimização necessária.</p>;
        return (
          <div>
            <div className="flex gap-4 mb-3">
              <div className="text-center">
                <div className="text-[10px] text-gray-400">Score Projetado</div>
                <div className="text-lg font-black text-gray-900">{Math.round(optimization.projected_score)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-400">EBITDA Projetado</div>
                <div className="text-lg font-black text-emerald-600">{fmtBRL(optimization.projected_ebitda)}</div>
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Ações propostas ({optimization.proposed_actions.length})</p>
            <div className="space-y-2">
              {optimization.proposed_actions.map((a, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-gray-700 uppercase">{a.category}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.priority === 'high' ? 'bg-red-100 text-red-700' : a.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-900 font-semibold">{a.action}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{a.justification}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[9px] text-emerald-700">Economia: {fmtBRL(a.expected_savings)}</span>
                    <span className="text-[9px] text-blue-700">+{a.score_impact} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'alerts': {
        if (alerts.length === 0) return <p className="text-xs text-green-600">Nenhum alerta ativo.</p>;
        const bySeverity = ['high', 'medium', 'low'] as const;
        return (
          <div>
            <p className="text-[10px] text-gray-500 mb-3">
              Todos os alertas gerados pela análise do período selecionado.
            </p>
            {bySeverity.map(sev => {
              const items = alerts.filter(a => a.severity === sev);
              if (items.length === 0) return null;
              return (
                <div key={sev} className="mb-3">
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${sev === 'high' ? 'text-red-600' : sev === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                    {sev === 'high' ? '🔴 Crítico' : sev === 'medium' ? '⚠️ Médio' : '⚪ Baixo'} ({items.length})
                  </p>
                  <div className="space-y-1">
                    {items.map((a, i) => (
                      <div key={i} className={`text-[10px] px-2 py-1.5 rounded ${sev === 'high' ? 'bg-red-50 text-red-700' : sev === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                        <p className="font-semibold">{a.message}</p>
                        {a.recommendation && <p className="mt-0.5 opacity-80">→ {a.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const titles: Record<CardId, string> = {
    'health-score': 'Health Score — Memorial de Cálculo',
    'risk': 'Nível de Risco — Derivação',
    'confidence': 'Confiança — Completude dos Dados',
    'ebitda': 'EBITDA — Composição',
    'margin': 'Margem de Contribuição — Fórmula',
    'revenue': 'Receita — Análise vs Orçado',
    'trend': 'Tendência — Projeção por Regressão',
    'ebitda-monthly': 'EBITDA Mensal — Histórico',
    'optimization': 'Plano Ótimo — Ações Detalhadas',
    'alerts': 'Alertas — Listagem Completa',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#1B75BB]" />
            <h2 className="text-sm font-black text-gray-900">{titles[cardId]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------
// Dashboard Content (inner component)
// --------------------------------------------

const DashboardContent: React.FC<{ data: DashboardData; loading: boolean }> = ({ data, loading }) => {
  const { summary, financial_summary, score, forecast, optimization, alerts, trend_last_6_months } = data;
  const [openCard, setOpenCard] = useState<CardId | null>(null);

  if (!summary) return null;

  return (
    <div className="space-y-5">
      {/* Modal de memorial de cálculo */}
      {openCard && (
        <CalcMemoryModal cardId={openCard} data={data} onClose={() => setOpenCard(null)} />
      )}

      {/* LINHA 1 — Score + Risk + Confidence */}
      <div className="grid grid-cols-3 gap-4">
        {/* Health Score — grande */}
        <div
          className="rounded-xl p-5 border text-center cursor-pointer hover:shadow-md transition-shadow"
          style={{
            backgroundColor: scoreBg(summary.overall_health_score),
            borderColor: scoreColor(summary.overall_health_score) + '30',
          }}
          onClick={() => setOpenCard('health-score')}
          title="Clique para ver memorial de cálculo"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-center gap-1">
            Health Score <Info size={10} className="opacity-40" />
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
          className="rounded-xl p-5 border text-center cursor-pointer hover:shadow-md transition-shadow"
          style={{
            backgroundColor: riskBg(summary.risk_level),
            borderColor: riskColor(summary.risk_level) + '30',
          }}
          onClick={() => setOpenCard('risk')}
          title="Clique para ver derivação do risco"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-center gap-1">
            Nível de Risco <Info size={10} className="opacity-40" />
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
        <div
          className="rounded-xl p-5 border border-gray-200 bg-gray-50 text-center cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenCard('confidence')}
          title="Clique para ver completude dos dados"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-center gap-1">
            Confiança <Info size={10} className="opacity-40" />
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
            onClick={() => setOpenCard('ebitda')}
          />
          <KPICard
            label="Margem"
            value={fmtPct(financial_summary.margem_contribuicao.pct_real)}
            subtitle={`Orçado: ${fmtPct(financial_summary.margem_contribuicao.pct_orcado)}`}
            icon={<Target size={16} />}
            color={financial_summary.margem_contribuicao.health === 'healthy' ? '#059669' : financial_summary.margem_contribuicao.health === 'attention' ? '#D97706' : '#DC2626'}
            bg={financial_summary.margem_contribuicao.health === 'healthy' ? '#ECFDF5' : financial_summary.margem_contribuicao.health === 'attention' ? '#FFFBEB' : '#FEF2F2'}
            onClick={() => setOpenCard('margin')}
          />
          <KPICard
            label="Receita"
            value={fmtBRL(financial_summary.receita.real)}
            subtitle={`Gap: ${fmtPct(financial_summary.receita.gap_pct)}`}
            icon={<TrendingUp size={16} />}
            color="#2563EB"
            bg="#EFF6FF"
            onClick={() => setOpenCard('revenue')}
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
            onClick={() => setOpenCard('trend')}
          />
        </div>
      )}

      {/* LINHA 3 — Trend chart + Optimization + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend */}
        <div
          className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenCard('ebitda-monthly')}
          title="Clique para ver histórico completo"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
            EBITDA Mensal <Info size={9} className="opacity-40" />
          </div>
          <MiniBar data={trend_last_6_months} />
        </div>

        {/* Optimization */}
        <div
          className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenCard('optimization')}
          title="Clique para ver ações detalhadas"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
            Plano Ótimo <Info size={9} className="opacity-40" />
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
        <div
          className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenCard('alerts')}
          title="Clique para ver todos os alertas"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-500" />
            Alertas Críticos <Info size={9} className="opacity-40" />
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

const MONTH_OPTIONS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' }, { value: '09', label: 'Set' },
  { value: '10', label: 'Out' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
];

interface ExecutiveDashboardProps {
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedTag01?: string[];
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  allowedMarcas = [],
  allowedFiliais = [],
  allowedTag01 = [],
}) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear().toString();
  // Default: meses fechados (até mês anterior)
  const defaultMonthTo = String(Math.max(1, now.getUTCMonth())).padStart(2, '0'); // getUTCMonth() = 0-based, so month=2(mar) → "02"(fev)

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [monthFrom, setMonthFrom] = useState('01');
  const [monthTo, setMonthTo] = useState(defaultMonthTo);
  const [availableMarcas, setAvailableMarcas] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);

  // Tag filters
  const [availableTag0s, setAvailableTag0s] = useState<string[]>([]);
  const [availableTag01s, setAvailableTag01s] = useState<string[]>([]);
  const [availableTag02s, setAvailableTag02s] = useState<string[]>([]);
  const [availableTag03s, setAvailableTag03s] = useState<string[]>([]);
  const [selectedTag0s, setSelectedTag0s] = useState<string[]>([]);
  const [selectedTag01s, setSelectedTag01s] = useState<string[]>([]);
  const [selectedTag02s, setSelectedTag02s] = useState<string[]>([]);
  const [selectedTag03s, setSelectedTag03s] = useState<string[]>([]);

  // Refs para evitar stale closures no useCallback
  const monthFromRef = useRef(monthFrom);
  const monthToRef = useRef(monthTo);
  const selectedMarcasRef = useRef(selectedMarcas);
  const selectedTag0sRef = useRef(selectedTag0s);
  const selectedTag01sRef = useRef(selectedTag01s);
  const selectedTag02sRef = useRef(selectedTag02s);
  const selectedTag03sRef = useRef(selectedTag03s);
  useEffect(() => { monthFromRef.current = monthFrom; }, [monthFrom]);
  useEffect(() => { monthToRef.current = monthTo; }, [monthTo]);
  useEffect(() => { selectedMarcasRef.current = selectedMarcas; }, [selectedMarcas]);
  useEffect(() => { selectedTag0sRef.current = selectedTag0s; }, [selectedTag0s]);
  useEffect(() => { selectedTag01sRef.current = selectedTag01s; }, [selectedTag01s]);
  useEffect(() => { selectedTag02sRef.current = selectedTag02s; }, [selectedTag02s]);
  useEffect(() => { selectedTag03sRef.current = selectedTag03s; }, [selectedTag03s]);

  // Load tag filter options on mount
  useEffect(() => {
    Promise.all([
      getDistinctColumn('transactions', 'tag0'),
      getDistinctColumn('transactions', 'tag01'),
      getTag02Options(),
      getTag03Options(),
    ]).then(([t0, t01, t02, t03]) => {
      setAvailableTag0s(t0);
      // Filtrar tag01 pelas permissões do usuário
      const visibleTag01 = allowedTag01.length > 0
        ? t01.filter(t => allowedTag01.includes(t))
        : t01;
      setAvailableTag01s(visibleTag01);
      setAvailableTag02s(t02);
      setAvailableTag03s(t03);
    });
  }, []);

  // Cascading: when tag01 changes, reload tag02 options
  useEffect(() => {
    if (selectedTag01s.length > 0) {
      getTag02OptionsForTag01s(selectedTag01s).then(setAvailableTag02s);
    } else {
      getTag02Options().then(setAvailableTag02s);
    }
    setSelectedTag02s([]);
    setSelectedTag03s([]);
  }, [selectedTag01s]);

  // Cascading: when tag02 changes, reload tag03 options
  useEffect(() => {
    if (selectedTag02s.length > 0) {
      getTag03OptionsForTag02s(selectedTag02s).then(setAvailableTag03s);
    } else if (selectedTag01s.length > 0) {
      // Keep tag03 scoped to selected tag01s
      getTag03OptionsForTag01s(selectedTag01s).then(setAvailableTag03s);
    } else {
      getTag03Options().then(setAvailableTag03s);
    }
    setSelectedTag03s([]);
  }, [selectedTag02s]);

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
      const mFrom = `${currentYear}-${monthFromRef.current}`;
      const mTo = `${currentYear}-${monthToRef.current}`;
      // Aplicar restrição de permissões: interseção com allowedMarcas
      const effectiveMarcas = allowedMarcas.length > 0
        ? (selectedMarcasRef.current.length > 0
            ? selectedMarcasRef.current.filter(m => allowedMarcas.some(p => p.toUpperCase() === m.toUpperCase()))
            : allowedMarcas)
        : (selectedMarcasRef.current.length > 0 ? selectedMarcasRef.current : undefined);
      const marcaFilter = effectiveMarcas;

      // Aplicar restrição de permissões: interseção com allowedTag01
      const effectiveTag01 = allowedTag01.length > 0
        ? (selectedTag01sRef.current.length > 0
            ? selectedTag01sRef.current.filter(t => allowedTag01.includes(t))
            : allowedTag01)
        : (selectedTag01sRef.current.length > 0 ? selectedTag01sRef.current : undefined);
      const tag01Filter = effectiveTag01;
      const tag02Filter = selectedTag02sRef.current.length > 0 ? selectedTag02sRef.current : undefined;
      const tag03Filter = selectedTag03sRef.current.length > 0 ? selectedTag03sRef.current : undefined;
      const tag0Filter = selectedTag0sRef.current;

      // Fetch DRE consolidado + marcas em paralelo — apenas recorrência "Sim"
      const [dreSnapshotRaw, marcasResult] = await Promise.all([
        getSomaTags(mFrom, mTo, marcaFilter, undefined, tag02Filter, tag01Filter, 'Sim', tag03Filter),
        getMarcasEFiliais(),
      ]);

      // Filtrar por tag0 client-side (RPC não tem p_tag0)
      const tag0Set = new Set(tag0Filter);
      const dreSnapshot = tag0Filter.length > 0
        ? dreSnapshotRaw.filter(r => tag0Set.has(r.tag0))
        : dreSnapshotRaw;

      // Popular lista de marcas disponíveis filtrada por permissões (só na primeira vez)
      if (availableMarcas.length === 0 && marcasResult.marcas.length > 0) {
        const visibleMarcas = allowedMarcas.length > 0
          ? marcasResult.marcas.filter(m => allowedMarcas.some(p => p.toUpperCase() === m.toUpperCase()))
          : marcasResult.marcas;
        setAvailableMarcas(visibleMarcas);
      }

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
          portfolio_companies: [],
          portfolio_consolidated: null,
          portfolio_score: null,
          portfolio_risk: null,
          portfolio_allocation: null,
          portfolio_stress: [],
        });
        return;
      }

      // Fetch dados por marca em paralelo para portfolio
      const marcasParaPortfolio = marcaFilter && marcaFilter.length > 0 ? marcaFilter : marcasResult.marcas;
      let portfolioCompanies: CompanyFinancialSnapshot[] = [];
      if (marcasParaPortfolio.length > 1) {
        const marcaResults = await Promise.all(
          marcasParaPortfolio.map(m => getSomaTags(mFrom, mTo, [m], undefined, tag02Filter, tag01Filter, 'Sim', tag03Filter))
        );
        const rowsByMarca = new Map<string, SomaTagsRow[]>();
        marcasParaPortfolio.forEach((m, i) => {
          if (marcaResults[i] && marcaResults[i].length > 0) {
            rowsByMarca.set(m, marcaResults[i]);
          }
        });
        portfolioCompanies = buildPortfolioFromDRE(rowsByMarca);
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

      // Portfolio engines (dados reais por marca)
      const pConsolidated = portfolioCompanies.length > 0
        ? calculateConsolidatedFinancials(portfolioCompanies) : null;
      const pScore = portfolioCompanies.length > 0
        ? calculatePortfolioScore(portfolioCompanies) : null;
      const pRisk = portfolioCompanies.length > 0
        ? calculateRiskDistribution(portfolioCompanies) : null;
      const pAllocation = portfolioCompanies.length > 0
        ? recommendCapitalAllocation(portfolioCompanies) : null;
      const pStress = portfolioCompanies.length > 0
        ? runPortfolioStressTests(portfolioCompanies) : [];

      setData({
        summary,
        financial_summary: financialSummary,
        score: analysis.score,
        forecast: forecastResult,
        optimization: optimizationResult,
        alerts: analysis.alerts,
        trend_last_6_months: trend,
        benchmark: null,
        macro_risk: null,
        macro_impact: null,
        macro_maturity: macroMaturity,
        portfolio_companies: portfolioCompanies,
        portfolio_consolidated: pConsolidated,
        portfolio_score: pScore,
        portfolio_risk: pRisk,
        portfolio_allocation: pAllocation,
        portfolio_stress: pStress,
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
        <div className="flex items-center gap-2 flex-wrap">
          {availableMarcas.length > 0 && (
            <MultiSelectFilter
              label="Marca"
              icon={<Building2 size={14} />}
              options={availableMarcas}
              selected={selectedMarcas}
              onChange={setSelectedMarcas}
              colorScheme="blue"
              compact
            />
          )}
          <Calendar size={14} className="text-gray-400" />
          <select
            value={monthFrom}
            onChange={(e) => setMonthFrom(e.target.value)}
            className="px-2 py-1.5 text-xs font-bold border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span className="text-xs text-gray-400">a</span>
          <select
            value={monthTo}
            onChange={(e) => setMonthTo(e.target.value)}
            className="px-2 py-1.5 text-xs font-bold border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span className="text-[10px] text-gray-400">{currentYear}</span>
          <button
            onClick={loadData}
            disabled={loading}
            className="ml-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tag Filters — segunda linha */}
      {(availableTag0s.length > 0 || availableTag01s.length > 0) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Tag size={14} className="text-gray-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Filtros de Tag</span>
          {availableTag0s.length > 0 && (
            <MultiSelectFilter
              label="Tag0"
              options={availableTag0s}
              selected={selectedTag0s}
              onChange={setSelectedTag0s}
              colorScheme="purple"
              compact
            />
          )}
          {availableTag01s.length > 0 && (
            <MultiSelectFilter
              label="Tag01"
              options={availableTag01s}
              selected={selectedTag01s}
              onChange={setSelectedTag01s}
              colorScheme="blue"
              compact
            />
          )}
          {availableTag02s.length > 0 && (
            <MultiSelectFilter
              label="Tag02"
              options={availableTag02s}
              selected={selectedTag02s}
              onChange={setSelectedTag02s}
              colorScheme="orange"
              compact
            />
          )}
          {availableTag03s.length > 0 && (
            <MultiSelectFilter
              label="Tag03"
              options={availableTag03s}
              selected={selectedTag03s}
              onChange={setSelectedTag03s}
              colorScheme="purple"
              compact
            />
          )}
          {(selectedTag0s.length > 0 || selectedTag01s.length > 0 || selectedTag02s.length > 0 || selectedTag03s.length > 0) && (
            <button
              onClick={() => { setSelectedTag0s([]); setSelectedTag01s([]); setSelectedTag02s([]); setSelectedTag03s([]); }}
              className="text-[10px] text-gray-400 hover:text-red-500 underline ml-1"
            >
              Limpar tags
            </button>
          )}
        </div>
      )}

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

      {activeTab === 'portfolio' && (
        <PortfolioContent data={data} />
      )}

      {activeTab === 'stress' && (
        <StressTestContent data={data} />
      )}
    </div>
  );
};

// --------------------------------------------
// Portfolio Tab Content
// --------------------------------------------

function portfolioRiskColor(level: string): string {
  switch (level) {
    case 'very_low': return '#059669';
    case 'low': return '#10B981';
    case 'moderate': return '#D97706';
    case 'high': return '#EA580C';
    case 'critical': return '#DC2626';
    default: return '#6B7280';
  }
}

function portfolioRiskLabel(level: string): string {
  switch (level) {
    case 'very_low': return 'Muito Baixo';
    case 'low': return 'Baixo';
    case 'moderate': return 'Moderado';
    case 'high': return 'Alto';
    case 'critical': return 'Critico';
    default: return level;
  }
}

function portfolioClassLabel(c: string): string {
  switch (c) {
    case 'excellence': return 'Excelencia';
    case 'strong': return 'Forte';
    case 'moderate': return 'Moderado';
    case 'weak': return 'Fraco';
    case 'critical': return 'Critico';
    default: return c;
  }
}

const PortfolioContent: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { portfolio_companies, portfolio_consolidated, portfolio_score, portfolio_risk, portfolio_allocation } = data;

  if (portfolio_companies.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        Portfolio requer mais de uma marca para comparacao. Verifique os dados.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs consolidados */}
      <div className="grid grid-cols-4 gap-3">
        <KPICard
          label="Score Portfolio"
          value={`${portfolio_score?.score ?? 0}`}
          subtitle={portfolioClassLabel(portfolio_score?.classification ?? '')}
          icon={<Shield size={16} />}
          color={scoreColor(portfolio_score?.score ?? 0)}
          bg={scoreBg(portfolio_score?.score ?? 0)}
        />
        <KPICard
          label="EBITDA Consolidado"
          value={fmtBRL(portfolio_consolidated?.consolidated_ebitda ?? 0)}
          subtitle={`${portfolio_companies.length} marcas`}
          icon={<Activity size={16} />}
          color={(portfolio_consolidated?.consolidated_ebitda ?? 0) >= 0 ? '#059669' : '#DC2626'}
          bg={(portfolio_consolidated?.consolidated_ebitda ?? 0) >= 0 ? '#ECFDF5' : '#FEF2F2'}
        />
        <KPICard
          label="Receita Total"
          value={fmtBRL(portfolio_consolidated?.consolidated_revenue ?? 0)}
          subtitle={`Margem: ${fmtPct(portfolio_consolidated?.consolidated_margin ?? 0)}`}
          icon={<TrendingUp size={16} />}
          color="#2563EB"
          bg="#EFF6FF"
        />
        <KPICard
          label="Risco Portfolio"
          value={portfolioRiskLabel(portfolio_risk?.portfolio_risk_level ?? '')}
          subtitle={`Score: ${portfolio_risk?.risk_score ?? 0}/100`}
          icon={<AlertTriangle size={16} />}
          color={portfolioRiskColor(portfolio_risk?.portfolio_risk_level ?? '')}
          bg="#F9FAFB"
        />
      </div>

      {/* Ranking de marcas */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
          Ranking de Marcas
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Marca</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Score</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Receita</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">C.Var</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">C.Fix</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">SG&A</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Rateio</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">EBITDA</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Margem</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">YoY</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600">Share</th>
              </tr>
            </thead>
            <tbody>
              {portfolio_companies.map((c, i) => {
                const bd = portfolio_consolidated?.company_breakdown.find(b => b.organization_id === c.organization_id);
                return (
                  <tr key={c.organization_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-bold text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-bold text-gray-900">
                      {c.display_name}
                      {c.is_csc && <span className="ml-1.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">CSC</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: scoreBg(c.health_score), color: scoreColor(c.health_score) }}>
                        {c.health_score}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtBRL(c.receita_real)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtBRL(c.custos_variaveis_real)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtBRL(c.custos_fixos_real)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtBRL(c.sga_real)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmtBRL(c.rateio_real)}</td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: c.ebitda >= 0 ? '#059669' : '#DC2626' }}>
                      {fmtBRL(c.ebitda)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmtPct(c.margem_contribuicao_pct)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: c.growth_yoy >= 0 ? '#059669' : '#DC2626' }}>
                      {c.growth_yoy >= 0 ? '+' : ''}{fmtPct(c.growth_yoy)}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">{fmtPct(bd?.revenue_share ?? c.portfolio_weight)}</td>
                  </tr>
                );
              })}
              {portfolio_consolidated && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-gray-900">CONSOLIDADO</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: scoreBg(portfolio_score?.score ?? 0), color: scoreColor(portfolio_score?.score ?? 0) }}>
                      {portfolio_score?.score ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900">{fmtBRL(portfolio_consolidated.consolidated_revenue)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtBRL(portfolio_companies.reduce((s, c) => s + c.custos_variaveis_real, 0))}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtBRL(portfolio_companies.reduce((s, c) => s + c.custos_fixos_real, 0))}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtBRL(portfolio_companies.reduce((s, c) => s + c.sga_real, 0))}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmtBRL(portfolio_companies.reduce((s, c) => s + c.rateio_real, 0))}</td>
                  <td className="px-3 py-2 text-right" style={{ color: portfolio_consolidated.consolidated_ebitda >= 0 ? '#059669' : '#DC2626' }}>
                    {fmtBRL(portfolio_consolidated.consolidated_ebitda)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmtPct(portfolio_consolidated.consolidated_margin)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: portfolio_consolidated.consolidated_growth >= 0 ? '#059669' : '#DC2626' }}>
                    {portfolio_consolidated.consolidated_growth >= 0 ? '+' : ''}{fmtPct(portfolio_consolidated.consolidated_growth)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mapa de Risco + Alocacao de Capital */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mapa de Risco */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Mapa de Risco por Marca
          </div>
          <div className="space-y-2">
            {portfolio_risk?.company_risks.map((cr) => (
              <div key={cr.organization_id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{cr.display_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: portfolioRiskColor(cr.risk_level) + '15', color: portfolioRiskColor(cr.risk_level) }}>
                      {portfolioRiskLabel(cr.risk_level)}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${cr.risk_score}%`, backgroundColor: portfolioRiskColor(cr.risk_level) }} />
                  </div>
                  {cr.risk_factors.length > 0 && (
                    <div className="mt-1 text-[9px] text-gray-500">{cr.risk_factors.join(' | ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {portfolio_risk && portfolio_risk.alerts.length > 0 && (
            <div className="mt-3 space-y-1">
              {portfolio_risk.alerts.map((a, i) => (
                <div key={i} className="text-[10px] text-red-700 bg-red-50 px-2 py-1 rounded">{a}</div>
              ))}
            </div>
          )}
        </div>

        {/* Alocacao de Capital */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Alocacao de Capital
          </div>
          {portfolio_allocation && (
            <div className="space-y-3">
              {portfolio_allocation.invest_more_in.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-green-700 uppercase mb-1">Investir</div>
                  {portfolio_allocation.invest_more_in.map((r) => (
                    <div key={r.organization_id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg mb-1">
                      <div>
                        <span className="text-xs font-bold text-green-900">{r.display_name}</span>
                        <p className="text-[9px] text-green-700">{r.rationale}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <div className="text-gray-500">Score: {r.current_score} &rarr; {r.expected_score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {portfolio_allocation.optimize.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-amber-700 uppercase mb-1">Otimizar</div>
                  {portfolio_allocation.optimize.map((r) => (
                    <div key={r.organization_id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg mb-1">
                      <div>
                        <span className="text-xs font-bold text-amber-900">{r.display_name}</span>
                        <p className="text-[9px] text-amber-700">{r.rationale}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <div className="text-gray-500">Score: {r.current_score} &rarr; {r.expected_score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {portfolio_allocation.divest.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-red-700 uppercase mb-1">Desinvestir</div>
                  {portfolio_allocation.divest.map((r) => (
                    <div key={r.organization_id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg mb-1">
                      <div>
                        <span className="text-xs font-bold text-red-900">{r.display_name}</span>
                        <p className="text-[9px] text-red-700">{r.rationale}</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <div className="text-gray-500">Score: {r.current_score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-gray-500 border-t pt-2 mt-2">
                {portfolio_allocation.summary}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diversificacao */}
      {portfolio_score?.diversification && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
            Diversificacao do Portfolio
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900">{portfolio_score.diversification.hhi_index}</div>
              <div className="text-[10px] text-gray-500">HHI Index</div>
              <div className="text-[9px] mt-1 px-2 py-0.5 rounded-full inline-block" style={{
                backgroundColor: portfolio_score.diversification.concentration === 'low' ? '#ECFDF5' : portfolio_score.diversification.concentration === 'moderate' ? '#FFFBEB' : '#FEF2F2',
                color: portfolio_score.diversification.concentration === 'low' ? '#059669' : portfolio_score.diversification.concentration === 'moderate' ? '#D97706' : '#DC2626',
              }}>
                {portfolio_score.diversification.concentration === 'low' ? 'Baixa concentracao' : portfolio_score.diversification.concentration === 'moderate' ? 'Moderada' : 'Alta concentracao'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900">{portfolio_score.diversification.dominant_company}</div>
              <div className="text-[10px] text-gray-500">Marca Dominante</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900">{fmtPct(portfolio_score.diversification.dominant_share)}</div>
              <div className="text-[10px] text-gray-500">Share Dominante</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------
// Stress Test Tab Content
// --------------------------------------------

const StressTestContent: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { portfolio_stress, portfolio_companies } = data;

  if (portfolio_companies.length === 0 || portfolio_stress.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">
        Stress Test requer mais de uma marca para simulacao. Verifique os dados.
      </div>
    );
  }

  const stressSummary = buildStressTestSummary(portfolio_stress);

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Resumo dos Testes de Estresse
        </div>
        <p className="text-xs text-gray-700">{stressSummary}</p>
      </div>

      {/* Cards de cenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolio_stress.map((s) => {
          const survives = s.portfolio_survives;
          return (
            <div key={s.scenario_name} className={`rounded-xl p-4 border ${survives ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-gray-900">{s.scenario_name}</div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${survives ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {survives ? 'Sobrevive' : 'Nao sobrevive'}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-3">{s.scenario_description}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-[9px] text-gray-500">EBITDA Estressado</div>
                  <div className="text-sm font-black" style={{ color: s.stressed_ebitda >= 0 ? '#059669' : '#DC2626' }}>
                    {fmtBRL(s.stressed_ebitda)}
                  </div>
                  <div className="text-[9px]" style={{ color: s.ebitda_delta_pct <= 0 ? '#DC2626' : '#059669' }}>
                    {s.ebitda_delta_pct > 0 ? '+' : ''}{fmtPct(s.ebitda_delta_pct)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-[9px] text-gray-500">Score Estressado</div>
                  <div className="text-sm font-black" style={{ color: scoreColor(s.stressed_portfolio_score) }}>
                    {s.stressed_portfolio_score}
                  </div>
                  <div className="text-[9px] text-gray-400">Mais vulneravel: {s.most_vulnerable}</div>
                </div>
              </div>

              {/* Impacto por marca */}
              <div className="space-y-1">
                {s.company_impacts.map((ci) => (
                  <div key={ci.organization_id} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-700 font-medium">{ci.display_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{fmtBRL(ci.original_ebitda)}</span>
                      <span className="text-gray-300">&rarr;</span>
                      <span style={{ color: ci.stressed_ebitda >= 0 ? '#059669' : '#DC2626' }} className="font-bold">
                        {fmtBRL(ci.stressed_ebitda)}
                      </span>
                      {!ci.survives && <span className="text-red-500 font-bold">!</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
