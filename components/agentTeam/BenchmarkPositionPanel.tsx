import React from 'react';
import { BarChart3, ArrowUp, ArrowDown, Minus, Trophy, AlertTriangle } from 'lucide-react';
import type { BenchmarkComparison, MetricComparison, PercentileBand, RiskPosition } from '../../core/benchmarkEngine';

// --------------------------------------------
// Props
// --------------------------------------------

interface BenchmarkPositionPanelProps {
  comparison: BenchmarkComparison | null;
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function bandLabel(band: PercentileBand): string {
  switch (band) {
    case 'top_25': return 'Top 25%';
    case 'above_median': return 'Acima da Mediana';
    case 'below_median': return 'Abaixo da Mediana';
    case 'bottom_25': return 'Bottom 25%';
    default: return String(band);
  }
}

function bandColor(band: PercentileBand): string {
  switch (band) {
    case 'top_25': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'above_median': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'below_median': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'bottom_25': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

function riskLabel(risk: RiskPosition): string {
  switch (risk) {
    case 'leader': return 'Líder do Segmento';
    case 'competitive': return 'Competitivo';
    case 'average': return 'Na Média';
    case 'lagging': return 'Abaixo do Mercado';
    case 'at_risk': return 'Em Risco';
    default: return String(risk);
  }
}

function riskColor(risk: RiskPosition): string {
  switch (risk) {
    case 'leader': return '#059669';
    case 'competitive': return '#2563EB';
    case 'average': return '#B45309';
    case 'lagging': return '#EA580C';
    case 'at_risk': return '#DC2626';
    default: return '#6B7280';
  }
}

function riskIcon(risk: RiskPosition) {
  switch (risk) {
    case 'leader': return <Trophy className="w-4 h-4" />;
    case 'competitive': return <ArrowUp className="w-4 h-4" />;
    case 'average': return <Minus className="w-4 h-4" />;
    case 'lagging': return <ArrowDown className="w-4 h-4" />;
    case 'at_risk': return <AlertTriangle className="w-4 h-4" />;
    default: return <Minus className="w-4 h-4" />;
  }
}

function formatGap(value: number, suffix: string = '%'): string {
  if (value === 0) return `0.0${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

function formatEbitdaGap(value: number): string {
  if (value === 0) return '0';
  const sign = value >= 0 ? '+' : '';
  if (Math.abs(value) >= 1_000_000) return `${sign}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${sign}${(value / 1_000).toFixed(0)}K`;
  return `${sign}${value.toFixed(0)}`;
}

// --------------------------------------------
// Metric Row Component
// --------------------------------------------

function MetricRow({ label, comp }: { label: string; comp: MetricComparison }) {
  const gapMedian = comp.gap_to_median;
  const isPositive = gapMedian >= 0;

  const gapDisplay = (() => {
    if (label === 'Score') return formatGap(gapMedian, 'pts');
    if (label === 'EBITDA') return formatEbitdaGap(gapMedian);
    return formatGap(gapMedian, 'pp');
  })();

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="text-[11px] font-medium text-gray-700">{label}</div>
        <div className="text-[10px] text-gray-400">
          Mediana: {comp.percentile_50.toFixed(1)} | P75: {comp.percentile_75.toFixed(1)}
        </div>
      </div>

      {/* Percentile bar */}
      <div className="flex-1 mx-3">
        <div
          className="relative h-2 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(comp.estimated_percentile)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: percentil ${Math.round(comp.estimated_percentile)}`}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${Math.min(comp.estimated_percentile, 100)}%`,
              backgroundColor: comp.estimated_percentile >= 75 ? '#059669'
                : comp.estimated_percentile >= 50 ? '#2563EB'
                : comp.estimated_percentile >= 25 ? '#D97706'
                : '#DC2626',
            }}
          />
          {/* P50 marker */}
          <div className="absolute left-1/2 top-0 w-px h-full bg-gray-400" />
        </div>
        <div className="text-[9px] text-gray-400 mt-0.5 text-center">
          P{Math.round(comp.estimated_percentile)}
        </div>
      </div>

      {/* Gap badge */}
      <div className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
        isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
      }`}>
        {isPositive ? <ArrowUp className="w-3 h-3 inline -mt-0.5" /> : <ArrowDown className="w-3 h-3 inline -mt-0.5" />}
        {' '}{gapDisplay}
      </div>
    </div>
  );
}

// --------------------------------------------
// Main Component
// --------------------------------------------

const BenchmarkPositionPanel: React.FC<BenchmarkPositionPanelProps> = ({ comparison, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!comparison) return null;

  const { risk_relative_position, performance_gap, benchmark_context, overall_band } = comparison;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Posição Relativa
          </span>
        </div>
        <div className="text-[9px] text-gray-400">
          {benchmark_context.industry_segment} | {benchmark_context.revenue_range} | n={benchmark_context.sample_count}
        </div>
      </div>

      {/* Risk Position Badge */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold"
          style={{ backgroundColor: riskColor(risk_relative_position) }}
        >
          {riskIcon(risk_relative_position)}
          {riskLabel(risk_relative_position)}
        </div>
        <div className={`text-[10px] font-medium px-2 py-1 rounded border ${bandColor(overall_band)}`}>
          {bandLabel(overall_band)}
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-gray-400">Gap Composto</div>
          <div className={`text-sm font-bold font-mono ${
            performance_gap.composite_gap >= 0 ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {formatGap(performance_gap.composite_gap, '')}
          </div>
        </div>
      </div>

      {/* Metric Comparisons */}
      <div className="space-y-0">
        <MetricRow label="Margem" comp={comparison.margin_percentile} />
        <MetricRow label="EBITDA" comp={comparison.ebitda_percentile} />
        <MetricRow label="Score" comp={comparison.score_percentile} />
        <MetricRow label="Crescimento" comp={comparison.growth_percentile} />
      </div>

      {/* Context footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-[9px] text-gray-400">
        Referência: {benchmark_context.reference_period} | Dados anonimizados de {benchmark_context.sample_count} empresas
      </div>
    </div>
  );
};

export default BenchmarkPositionPanel;
