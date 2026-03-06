import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

// Helper function to format monetary values
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return absValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else {
    return absValue.toFixed(2).replace('.', ',');
  }
};

// ─── Traffic light helpers ──────────────────────────────────────────
type TrafficSeverity = 'ok' | 'alert' | 'critical';

const trafficConfig: Record<TrafficSeverity, { dot: string; ring: string; icon: React.ReactNode; label: string }> = {
  ok:       { dot: 'bg-emerald-500', ring: 'ring-emerald-200', icon: <CheckCircle2 size={12} className="text-emerald-600" />, label: 'OK' },
  alert:    { dot: 'bg-amber-500',   ring: 'ring-amber-200',   icon: <AlertTriangle size={12} className="text-amber-600" />, label: 'Alerta' },
  critical: { dot: 'bg-red-500',     ring: 'ring-red-200',     icon: <XCircle size={12} className="text-red-600" />,          label: 'Crítico' },
};

const getTrafficSeverity = (trend: number, isPositiveGood: boolean): TrafficSeverity => {
  if (isPositiveGood) {
    // Revenue/EBITDA/Margin: positive trend is good
    if (trend >= -5) return 'ok';
    if (trend >= -15) return 'alert';
    return 'critical';
  }
  // Costs: negative trend (decrease) is good
  const absDev = Math.abs(trend);
  if (absDev <= 5) return 'ok';
  if (absDev <= 15) return 'alert';
  return 'critical';
};

// ─── HeroCard ───────────────────────────────────────────────────────
export interface HeroCardProps {
  label: string;
  value: number;
  valueComparison: number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'purple';
  trendPercent: number;
  comparisonMode: 'budget' | 'prevYear';
}

const heroColorMaps = {
  blue: { bg: 'bg-gradient-to-br from-[#1B75BB] to-[#4AC8F4]', icon: 'bg-white/20 text-white' },
  orange: { bg: 'bg-gradient-to-br from-[#F44C00] to-[#FF8C42]', icon: 'bg-white/20 text-white' },
  purple: { bg: 'bg-gradient-to-br from-purple-600 to-purple-400', icon: 'bg-white/20 text-white' }
};

export const HeroCard: React.FC<HeroCardProps> = ({ label, value, valueComparison, subtitle, icon, color, trendPercent, comparisonMode }) => {
  const percentChange = valueComparison !== 0 ? ((value - valueComparison) / Math.abs(valueComparison)) * 100 : 0;
  const comparisonLabel = comparisonMode === 'budget' ? 'Or' : 'A-1';
  const hasTrend = trendPercent != null && trendPercent !== 0 && !isNaN(trendPercent);
  // Clamp progress bar to a meaningful range (log scale for extreme values)
  const barWidth = Math.min(100, Math.max(5, Math.abs(percentChange)));

  return (
    <div className={`${heroColorMaps[color].bg} rounded-xl p-4 text-white shadow-lg relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${heroColorMaps[color].icon}`}>{icon}</div>
          {hasTrend && (
            <div className={`flex items-center gap-0.5 px-2 py-1 rounded ${trendPercent < 0 ? 'bg-white/30' : 'bg-white/20'}`}>
              {trendPercent < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              <span className="text-[11px] font-black">{Math.abs(trendPercent).toFixed(1)}pp vs {comparisonLabel}</span>
            </div>
          )}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1">{label}</p>
        <p className="text-3xl font-black mb-1">R$ {formatCurrency(value)}</p>
        <p className="text-[11px] font-bold opacity-75">{subtitle}</p>
        {valueComparison !== 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1 opacity-75">
              <span>Real</span>
              <span>vs {comparisonLabel} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full transition-all" style={{ width: `${barWidth}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CompactKPICard ─────────────────────────────────────────────────
export interface CompactKPICardProps {
  label: string;
  value: number;
  trendAbsolute?: number;
  isPercent?: boolean;
  color: 'blue' | 'orange' | 'amber' | 'teal' | 'purple' | 'emerald' | 'rose';
  icon?: React.ReactNode;
  comparisonMode: 'budget' | 'prevYear';
  tooltip?: string;
  onDoubleClick?: () => void;
}

const compactColorMaps: Record<string, string> = {
  blue: 'text-[#1B75BB] bg-blue-50',
  orange: 'text-[#F44C00] bg-orange-50',
  amber: 'text-[#F44C00] bg-orange-50',
  teal: 'text-[#7AC5BF] bg-teal-50',
  purple: 'text-purple-600 bg-purple-50',
  emerald: 'text-[#7AC5BF] bg-teal-50',
  rose: 'text-rose-600 bg-rose-50'
};

export const CompactKPICard: React.FC<CompactKPICardProps> = ({ label, value, trendAbsolute, isPercent, color, icon, comparisonMode, tooltip, onDoubleClick }) => {
  const formattedValue = isPercent
    ? `${value.toFixed(1)}%`
    : `R$ ${formatCurrency(value)}`;

  const formattedTrend = useMemo(() => {
    if (trendAbsolute === undefined || trendAbsolute === 0) return null;
    if (isPercent) return `${Math.abs(trendAbsolute).toFixed(1)}pp`;
    return `R$ ${formatCurrency(Math.abs(trendAbsolute))}`;
  }, [trendAbsolute, isPercent]);

  const isPositiveTrend = trendAbsolute != null && trendAbsolute < 0; // Negative change is good for costs
  const comparisonLabel = comparisonMode === 'budget' ? 'Or' : 'A-1';

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all hover:border-gray-300"
      onDoubleClick={onDoubleClick}
      title={tooltip}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <div className={`p-1 rounded-lg ${compactColorMaps[color]}`}>{icon}</div>}
        </div>
        {formattedTrend && (
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5 ${
            isPositiveTrend ? 'bg-teal-50 text-[#7AC5BF]' : 'bg-orange-50 text-[#F44C00]'
          }`}>
            {isPositiveTrend ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
            <span>{formattedTrend} vs {comparisonLabel}</span>
          </div>
        )}
      </div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-black tracking-tight ${compactColorMaps[color].split(' ')[0]}`}>
        {formattedValue}
      </p>
    </div>
  );
};

// ─── HealthCard (Zona A) ────────────────────────────────────────────
export interface HealthCardProps {
  label: string;
  value: number;
  comparisonValue: number;
  isPercent?: boolean;
  isNumber?: boolean;
  color: 'blue' | 'orange' | 'teal' | 'purple';
  icon: React.ReactNode;
  variationType: string;
  onClick?: () => void;
}

const healthColorMaps: Record<string, string> = {
  blue: 'text-[#1B75BB] bg-blue-50',
  orange: 'text-[#F44C00] bg-orange-50',
  teal: 'text-[#7AC5BF] bg-teal-50',
  purple: 'text-purple-600 bg-purple-50',
};

export const HealthCard: React.FC<HealthCardProps> = ({ label, value, comparisonValue, isPercent, isNumber, color, icon, variationType, onClick }) => {
  const formatNumber = (num: number) => {
    const absNum = Math.abs(num);
    if (absNum >= 1000) {
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formattedValue = useMemo(() => {
    if (isNumber) return formatNumber(value);
    return isPercent ? `${formatNumber(value)}%` : `R$ ${formatNumber(value)}`;
  }, [value, isPercent, isNumber]);

  const trend = comparisonValue !== 0 ? ((value - comparisonValue) / Math.abs(comparisonValue)) * 100 : 0;
  const safeTrend = isFinite(trend) ? trend : 0;
  const trendAbsolute = value - comparisonValue;
  const hasComparison = comparisonValue !== 0;

  const formattedTrendAbsolute = useMemo(() => {
    if (trendAbsolute === 0) return null;
    if (isNumber) return formatNumber(Math.abs(trendAbsolute));
    return `R$ ${formatNumber(Math.abs(trendAbsolute))}`;
  }, [trendAbsolute, isNumber]);

  // Traffic light with a11y
  const isPositiveGood = label === 'Receita Líquida' || label === 'Alunos Ativos' || label === 'EBITDA' || label === 'Margem %';
  const severity = hasComparison ? getTrafficSeverity(safeTrend, isPositiveGood) : 'ok';
  const tl = trafficConfig[severity];

  return (
    <div
      className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <div className={`p-1.5 rounded-lg ${healthColorMaps[color]}`}>{icon}</div>}
          <span className="text-[10px] font-black text-[#636363] uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Traffic light with icon + text (a11y: not color-only) */}
          {hasComparison && (
            <div className="flex items-center gap-1" role="img" aria-label={`Status: ${tl.label}`} title={tl.label}>
              <div className={`w-2.5 h-2.5 rounded-full ${tl.dot} ring-2 ${tl.ring}`}></div>
              {tl.icon}
            </div>
          )}
          {safeTrend !== 0 && hasComparison && (
            <div className="flex flex-col items-end gap-0.5">
              <div className={`px-2 py-1 rounded text-[11px] font-black flex items-center gap-1 ${safeTrend > 0 ? 'bg-teal-50 text-[#7AC5BF]' : 'bg-orange-50 text-[#F44C00]'}`}>
                {safeTrend > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {formattedTrendAbsolute && <span>{formattedTrendAbsolute} | </span>}
                {Math.abs(safeTrend).toFixed(1)}%
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{variationType}</span>
            </div>
          )}
        </div>
      </div>
      <p className={`text-2xl font-black tracking-tighter ${healthColorMaps[color].split(' ')[0]}`}>
        {formattedValue}
      </p>
    </div>
  );
};

export { formatCurrency };
