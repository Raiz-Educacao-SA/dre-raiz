import React from 'react';

// --------------------------------------------
// Types
// --------------------------------------------

interface BrandScore {
  brand: string;
  score: number;
  classification: string;
  margin_real: number;
  margin_orcado: number;
  ebitda_real: number;
}

interface BrandHealthTableProps {
  brands: BrandScore[];
  loading?: boolean;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(score: number): string {
  if (score >= 85) return 'bg-emerald-100 text-emerald-700';
  if (score >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function classificationBadge(classification: string): string {
  if (classification === 'Saudável') return 'bg-emerald-100 text-emerald-700';
  if (classification === 'Atenção') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function BrandHealthTable({ brands, loading }: BrandHealthTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Ranking por Marca</h3>

      {brands.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhuma marca disponível</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 text-gray-500 font-medium">#</th>
                <th className="text-left py-2 pr-3 text-gray-500 font-medium">Marca</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Score</th>
                <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Margem Real</th>
                <th className="text-right py-2 px-2 text-gray-500 font-medium">Margem Orç.</th>
                <th className="text-right py-2 pl-2 text-gray-500 font-medium">EBITDA</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand, idx) => {
                const marginGap = brand.margin_real - brand.margin_orcado;

                return (
                  <tr key={brand.brand} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 pr-3 font-medium text-gray-800">{brand.brand}</td>
                    <td className={`py-2.5 px-2 text-right font-bold ${scoreColor(brand.score)}`}>
                      {brand.score}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${classificationBadge(brand.classification)}`}>
                        {brand.classification}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-600">
                      {brand.margin_real.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="text-gray-600">{brand.margin_orcado.toFixed(1)}%</span>
                      {marginGap !== 0 && (
                        <span className={`ml-1 text-[10px] ${marginGap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ({marginGap >= 0 ? '+' : ''}{marginGap.toFixed(1)})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-right text-gray-600">
                      {brand.ebitda_real.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
