import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

interface ForecastData {
  forecast: {
    score: [number, number, number];
    margin: [number, number, number];
    ebitda: [number, number, number];
  };
  slope: {
    score: number;
    margin: number;
    ebitda: number;
  };
  risk_assessment: string;
}

interface ForecastPanelProps {
  data: ForecastData | null;
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function SlopeIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={14} className="text-emerald-500" />;
  if (value < 0) return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function riskColor(risk: string): string {
  if (risk.includes('deterioração')) return 'bg-red-100 text-red-700';
  if (risk.includes('negativa')) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function ForecastPanel({ data, loading }: ForecastPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Projeção</h3>
        <p className="text-xs text-gray-400">Dados insuficientes</p>
      </div>
    );
  }

  const rows: { label: string; values: [number, number, number]; slope: number; format: (n: number) => string }[] = [
    {
      label: 'Score',
      values: data.forecast.score,
      slope: data.slope.score,
      format: (n) => `${Math.round(n)}`,
    },
    {
      label: 'Margem',
      values: data.forecast.margin,
      slope: data.slope.margin,
      format: (n) => `${n.toFixed(1)}%`,
    },
    {
      label: 'EBITDA',
      values: data.forecast.ebitda,
      slope: data.slope.ebitda,
      format: (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Projeção (3 próximos runs)</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(data.risk_assessment)}`}>
          {data.risk_assessment}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Métrica</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">+1</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">+2</th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">+3</th>
              <th className="text-right py-2 pl-2 text-gray-500 font-medium">Slope</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-50">
                <td className="py-2 pr-3 font-medium text-gray-700">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="py-2 px-2 text-right text-gray-600">{row.format(v)}</td>
                ))}
                <td className="py-2 pl-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    <SlopeIcon value={row.slope} />
                    <span className={row.slope > 0 ? 'text-emerald-600' : row.slope < 0 ? 'text-red-600' : 'text-gray-400'}>
                      {row.slope > 0 ? '+' : ''}{row.slope}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.risk_assessment.includes('deterioração') && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-red-50 rounded-lg">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <span className="text-xs text-red-700">
            Projeção indica score abaixo de 70 em 3 runs. Ação corretiva recomendada.
          </span>
        </div>
      )}
    </div>
  );
}
