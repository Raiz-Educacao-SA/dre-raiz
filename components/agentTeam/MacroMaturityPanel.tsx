import React from 'react';
import {
  Shield,
  Zap,
  Target,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { MacroMaturityReport, MacroMaturityDimension } from '../../core/macroTypes';

// --------------------------------------------
// Props
// --------------------------------------------

interface MacroMaturityPanelProps {
  report: MacroMaturityReport | null;
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function levelColor(level: number): string {
  if (level >= 5) return '#059669';
  if (level >= 4) return '#2563EB';
  if (level >= 3) return '#D97706';
  if (level >= 2) return '#EA580C';
  return '#DC2626';
}

function levelBg(level: number): string {
  if (level >= 5) return '#ECFDF5';
  if (level >= 4) return '#EFF6FF';
  if (level >= 3) return '#FFFBEB';
  if (level >= 2) return '#FFF7ED';
  return '#FEF2F2';
}

function dimBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return '#059669';
  if (pct >= 60) return '#2563EB';
  if (pct >= 40) return '#D97706';
  if (pct >= 20) return '#EA580C';
  return '#DC2626';
}

// --------------------------------------------
// Sub-components
// --------------------------------------------

const DimensionBar: React.FC<{ dim: MacroMaturityDimension }> = ({ dim }) => {
  const pct = (dim.score / dim.max_score) * 100;
  const color = dimBarColor(dim.score, dim.max_score);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-700">{dim.name}</span>
        <span className="text-[10px] font-mono text-gray-500">
          {dim.score}/{dim.max_score}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[9px] text-gray-400 leading-tight">{dim.description}</p>
    </div>
  );
};

const MetricGauge: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => {
  const color = value >= 70 ? '#059669' : value >= 40 ? '#D97706' : '#DC2626';

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[9px] text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-black" style={{ color }}>
        {Math.round(value)}
      </div>
      <div className="text-[8px] text-gray-400">/100</div>
    </div>
  );
};

// --------------------------------------------
// Main Component
// --------------------------------------------

const MacroMaturityPanel: React.FC<MacroMaturityPanelProps> = ({ report, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-16 bg-gray-100 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const color = levelColor(report.maturity_level);
  const bg = levelBg(report.maturity_level);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header: Maturity Level */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: bg, borderBottom: `1px solid ${color}20` }}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color }} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Maturidade Macro
            </div>
            <div className="text-sm font-black" style={{ color }}>
              {report.maturity_label}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-400">Nível</div>
          <div className="text-3xl font-black" style={{ color }}>
            {report.maturity_level}
          </div>
          <div className="text-[8px] text-gray-400">/5</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Metrics Summary */}
        <div className="grid grid-cols-3 gap-3">
          <MetricGauge
            label="Sensibilidade"
            value={100 - report.external_sensitivity}
            icon={<Zap size={10} />}
          />
          <MetricGauge
            label="Robustez"
            value={report.strategic_robustness}
            icon={<Shield size={10} />}
          />
          <MetricGauge
            label="Absorção"
            value={report.shock_absorption}
            icon={<Target size={10} />}
          />
        </div>

        {/* Dimensions */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Dimensões Avaliadas
          </div>
          <div className="space-y-3">
            {report.dimensions.map((dim, i) => (
              <DimensionBar key={i} dim={dim} />
            ))}
          </div>
        </div>

        {/* Next Leap */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <ArrowRight size={12} className="text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
                Próximo Salto
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                {report.next_leap}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        {report.recommended_actions.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Ações Recomendadas
            </div>
            <div className="space-y-1.5">
              {report.recommended_actions.map((action, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                  <CheckCircle2 size={10} className="mt-0.5 text-gray-400 shrink-0" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MacroMaturityPanel;
