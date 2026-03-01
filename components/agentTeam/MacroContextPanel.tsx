import React from 'react';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { MacroRiskIndex } from '../../core/macroTypes';
import type { MacroImpactResult } from '../../core/macroTypes';

// --------------------------------------------
// Props
// --------------------------------------------

interface MacroContextPanelProps {
  macroRisk: MacroRiskIndex | null;
  macroImpact: MacroImpactResult | null;
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function envColor(env: string): string {
  switch (env) {
    case 'favorable': return '#059669';
    case 'stable': return '#2563EB';
    case 'moderate': return '#D97706';
    case 'adverse': return '#EA580C';
    case 'critical': return '#DC2626';
    default: return '#6B7280';
  }
}

function envBg(env: string): string {
  switch (env) {
    case 'favorable': return '#ECFDF5';
    case 'stable': return '#EFF6FF';
    case 'moderate': return '#FFFBEB';
    case 'adverse': return '#FFF7ED';
    case 'critical': return '#FEF2F2';
    default: return '#F9FAFB';
  }
}

function riskBarColor(value: number): string {
  if (value <= 25) return '#059669';
  if (value <= 50) return '#D97706';
  if (value <= 75) return '#EA580C';
  return '#DC2626';
}

function formatDelta(v: number, suffix: string = '%'): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}${suffix}`;
}

function deltaColor(v: number): string {
  if (v > 0) return 'text-emerald-600';
  if (v < 0) return 'text-red-600';
  return 'text-gray-500';
}

// --------------------------------------------
// Sub-components
// --------------------------------------------

const RiskBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] text-gray-500 w-20 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, value)}%`,
          backgroundColor: riskBarColor(value),
        }}
      />
    </div>
    <span className="text-[9px] font-mono text-gray-600 w-7 text-right">
      {Math.round(value)}
    </span>
  </div>
);

const ImpactRow: React.FC<{ label: string; value: number; suffix?: string }> = ({ label, value, suffix = '%' }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[10px] text-gray-500">{label}</span>
    <span className={`text-[11px] font-mono font-medium ${deltaColor(value)}`}>
      {formatDelta(value, suffix)}
    </span>
  </div>
);

// --------------------------------------------
// Main Component
// --------------------------------------------

const MacroContextPanel: React.FC<MacroContextPanelProps> = ({
  macroRisk,
  macroImpact,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-12 bg-gray-100 rounded mb-2" />
        <div className="space-y-1.5">
          {[1, 2, 3].map(i => <div key={i} className="h-2 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!macroRisk) return null;

  const color = envColor(macroRisk.environment);
  const bg = envBg(macroRisk.environment);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header: Contexto Econômico */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: bg, borderBottom: `1px solid ${color}20` }}
      >
        <div className="flex items-center gap-2">
          <Globe2 size={16} style={{ color }} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Contexto Econômico
            </div>
            <div className="text-sm font-black" style={{ color }}>
              {macroRisk.label}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-400">Macro Risk</div>
          <div className="text-2xl font-black" style={{ color }}>
            {macroRisk.score}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Risk Components */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Componentes de Risco
          </div>
          <div className="space-y-1.5">
            <RiskBar label="Inflação" value={macroRisk.components.inflation_risk} />
            <RiskBar label="Juros" value={macroRisk.components.interest_risk} />
            <RiskBar label="PIB" value={macroRisk.components.gdp_risk} />
            <RiskBar label="Desemprego" value={macroRisk.components.unemployment_risk} />
            <RiskBar label="Volatilidade" value={macroRisk.components.volatility_risk} />
          </div>
        </div>

        {/* Macro Impact on Financials */}
        {macroImpact && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Impacto Projetado
            </div>
            <div className="divide-y divide-gray-50">
              <ImpactRow label="Receita" value={macroImpact.revenue_delta_pct} />
              <ImpactRow label="Custos" value={macroImpact.cost_delta_pct} />
              <ImpactRow label="EBITDA" value={macroImpact.ebitda_delta_pct} />
              <ImpactRow label="Margem" value={macroImpact.margin_delta_pp} suffix="pp" />
            </div>

            {/* Inadimplência */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
              <span className="text-[10px] text-gray-500">Inadimplência est.</span>
              <span className="text-[11px] font-mono text-gray-700">
                {macroImpact.default_rate_estimate.toFixed(1)}%
              </span>
            </div>

            {/* Risk Adder */}
            {macroImpact.risk_adder !== 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">Risco adicional</span>
                <span className={`text-[11px] font-mono font-medium ${macroImpact.risk_adder > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {macroImpact.risk_adder > 0 ? '+' : ''}{macroImpact.risk_adder.toFixed(1)} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Snapshot Info */}
        {macroImpact && (
          <div className="flex items-center gap-1 text-[9px] text-gray-400 pt-2 border-t border-gray-100">
            <Info size={10} />
            <span>
              Período: {macroImpact.macro_snapshot.period}
              {macroImpact.macro_snapshot.has_projections && ' (inclui projeções)'}
            </span>
          </div>
        )}

        {/* Alerts */}
        {macroRisk.alerts.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            {macroRisk.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700">
                <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MacroContextPanel;
