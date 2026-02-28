import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertTriangle, Shield, Target } from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

interface HealthBreakdown {
  confidence: number;
  margin_real: number;
  margin_orcado: number;
  ebitda_real: number;
  ebitda_a1: number;
  high_priority_count: number;
  conflicts_count: number;
}

interface FinancialHealthCardProps {
  score: number;
  classification: string;
  breakdown: HealthBreakdown;
}

// --------------------------------------------
// Color helpers
// --------------------------------------------

function getScoreColors(score: number) {
  if (score >= 85) {
    return {
      ring: 'stroke-emerald-500',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (score >= 70) {
    return {
      ring: 'stroke-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
    };
  }
  return {
    ring: 'stroke-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  };
}

// --------------------------------------------
// SVG Ring
// --------------------------------------------

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
  const offset = CIRCUMFERENCE - (Math.min(score, 100) / 100) * CIRCUMFERENCE;

  return (
    <svg width="140" height="140" viewBox="0 0 128 128" className="mx-auto">
      {/* Background ring */}
      <circle
        cx="64"
        cy="64"
        r={RADIUS}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      {/* Progress ring */}
      <circle
        cx="64"
        cy="64"
        r={RADIUS}
        fill="none"
        className={colorClass}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// --------------------------------------------
// Breakdown row
// --------------------------------------------

function BreakdownRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-gray-900">{children}</div>
    </div>
  );
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function FinancialHealthCard({
  score,
  classification,
  breakdown,
}: FinancialHealthCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = getScoreColors(score);

  const ebitdaUp = breakdown.ebitda_real >= breakdown.ebitda_a1;
  const marginGap = breakdown.margin_real - breakdown.margin_orcado;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all`}>
      {/* Score circle */}
      <div className="relative flex flex-col items-center">
        <ScoreRing score={score} colorClass={colors.ring} />
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ height: 140 }}>
          <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
          <span className="text-xs text-gray-500 mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Classification badge */}
      <div className="flex justify-center mt-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
          {classification}
        </span>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center gap-1 w-full mt-4 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Breakdown */}
      {expanded && (
        <div className="mt-3 bg-white rounded-lg p-3 border border-gray-100">
          <BreakdownRow
            icon={<Shield size={14} className="text-indigo-500" />}
            label="Confiança"
          >
            {breakdown.confidence}%
          </BreakdownRow>

          <BreakdownRow
            icon={<Target size={14} className="text-blue-500" />}
            label="Margem Real vs Orçado"
          >
            <span className="flex items-center gap-1">
              {breakdown.margin_real.toFixed(1)}%
              <span className="text-gray-400 mx-0.5">vs</span>
              {breakdown.margin_orcado.toFixed(1)}%
              {marginGap !== 0 && (
                <span className={marginGap >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  ({marginGap >= 0 ? '+' : ''}{marginGap.toFixed(1)}pp)
                </span>
              )}
            </span>
          </BreakdownRow>

          <BreakdownRow
            icon={ebitdaUp
              ? <TrendingUp size={14} className="text-emerald-500" />
              : <TrendingDown size={14} className="text-red-500" />
            }
            label="EBITDA vs A-1"
          >
            <span className="flex items-center gap-1">
              {breakdown.ebitda_real.toLocaleString('pt-BR')}
              <span className={ebitdaUp ? 'text-emerald-600' : 'text-red-600'}>
                {ebitdaUp ? '↑' : '↓'}
              </span>
              <span className="text-gray-400">{breakdown.ebitda_a1.toLocaleString('pt-BR')}</span>
            </span>
          </BreakdownRow>

          <BreakdownRow
            icon={<AlertTriangle size={14} className="text-amber-500" />}
            label="Recomendações high priority"
          >
            <span className={breakdown.high_priority_count > 3 ? 'text-red-600 font-semibold' : ''}>
              {breakdown.high_priority_count}
            </span>
          </BreakdownRow>

          <BreakdownRow
            icon={<AlertTriangle size={14} className="text-red-500" />}
            label="Conflitos"
          >
            <span className={breakdown.conflicts_count > 0 ? 'text-red-600 font-semibold' : ''}>
              {breakdown.conflicts_count}
            </span>
          </BreakdownRow>
        </div>
      )}
    </div>
  );
}
