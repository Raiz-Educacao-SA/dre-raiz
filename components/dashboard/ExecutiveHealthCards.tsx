import React, { useState, useEffect, useRef } from 'react';
import { Target, Users, X } from 'lucide-react';
import { HealthCard } from './KPICards';
import { EnhancedKpis, KpiTrends } from '../../hooks/useDashboardKpis';
import { SomaTagsRow } from '../../services/supabaseService';

interface ExecutiveHealthCardsProps {
  enhancedKpis: EnhancedKpis;
  trends: KpiTrends;
  comparisonMode: 'budget' | 'prevYear';
  somaRows?: SomaTagsRow[];
  monthRange: { start: number; end: number };
}

export const ExecutiveHealthCards: React.FC<ExecutiveHealthCardsProps> = ({
  enhancedKpis, trends, comparisonMode, somaRows, monthRange,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const variationType = comparisonMode === 'budget' ? 'vs Orçado' : 'vs A-1';

  // Build breakdown from somaRows
  const receitaBreakdown = React.useMemo(() => {
    if (!somaRows || somaRows.length === 0) return [];
    const bdMap = new Map<string, { real: number; orcado: number; a1: number }>();
    somaRows.forEach(r => {
      if (!r.tag0.startsWith('01.')) return;
      const m = parseInt(r.month.substring(5, 7), 10) - 1;
      if (m < monthRange.start || m > monthRange.end) return;
      const key = r.tag01 || 'Sem Subclassificação';
      if (!bdMap.has(key)) bdMap.set(key, { real: 0, orcado: 0, a1: 0 });
      const e = bdMap.get(key)!;
      if (r.scenario === 'Real') e.real += Number(r.total);
      else if (r.scenario === 'Orçado') e.orcado += Number(r.total);
      else if (r.scenario === 'A-1') e.a1 += Number(r.total);
    });
    return Array.from(bdMap.entries())
      .map(([tag01, v]) => ({ tag01, ...v }))
      .sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
  }, [somaRows, monthRange]);

  return (
    <>
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <div className="h-6 w-1.5 bg-[#1B75BB] rounded-full"></div>
            Saúde Executiva
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <HealthCard
            label="Receita Líquida"
            value={enhancedKpis.totalRevenue}
            comparisonValue={trends.compRevenue}
            color="blue"
            icon={<Target size={16} />}
            variationType={variationType}
            onClick={() => setShowBreakdown(true)}
          />
          <HealthCard
            label="EBITDA"
            value={enhancedKpis.ebitda}
            comparisonValue={trends.compEbitda}
            color="orange"
            icon={<Target size={16} />}
            variationType={variationType}
          />
          <HealthCard
            label="Margem %"
            value={enhancedKpis.netMargin}
            comparisonValue={(() => {
              const v = trends.compRevenue > 0 ? (trends.compEbitda / trends.compRevenue) * 100 : 0;
              return isFinite(v) ? v : 0;
            })()}
            isPercent
            color="teal"
            icon={<Target size={16} />}
            variationType={variationType}
          />
          <HealthCard
            label="Alunos Ativos"
            value={enhancedKpis.activeStudents}
            comparisonValue={0}
            isNumber
            color="purple"
            icon={<Users size={16} />}
            variationType=""
          />
        </div>
      </section>

      {/* Modal: Breakdown Receita Líquida */}
      {showBreakdown && receitaBreakdown.length > 0 && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowBreakdown(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBreakdown(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Breakdown Receita Líquida"
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#1B75BB] to-[#1557BB] p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl"><Target size={24} className="text-white" /></div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Breakdown Receita Líquida</h2>
                    <p className="text-sm text-white/80 mt-1">Composição detalhada por tag01</p>
                  </div>
                </div>
                <button onClick={() => setShowBreakdown(false)} className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"><X size={24} /></button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 text-xs font-black text-gray-600 uppercase">Tag01</th>
                    <th className="text-right p-3 text-xs font-black text-gray-600 uppercase">Real</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Orçado</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">A-1</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Δ %</th>
                  </tr>
                </thead>
                <tbody>
                  {receitaBreakdown.map((item, idx) => {
                    const comp = comparisonMode === 'budget' ? item.orcado : item.a1;
                    const delta = comp !== 0 ? ((item.real - comp) / Math.abs(comp)) * 100 : 0;
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="p-3 text-sm font-bold text-gray-700">{item.tag01}</td>
                        <td className={`p-3 text-right text-sm font-black ${item.real >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {item.real === 0 ? '—' : `R$ ${item.real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className={`p-3 text-right text-sm ${item.orcado === 0 ? 'text-gray-300' : 'font-semibold text-gray-600'}`}>
                          {item.orcado === 0 ? '—' : `R$ ${item.orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className={`p-3 text-right text-sm ${item.a1 === 0 ? 'text-gray-300' : 'font-semibold text-gray-600'}`}>
                          {item.a1 === 0 ? '—' : `R$ ${item.a1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className={`p-3 text-right text-xs font-bold ${delta >= 0 ? 'text-teal-600' : 'text-orange-600'}`}>
                          {comp === 0 ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200 flex justify-end flex-shrink-0">
              <button onClick={() => setShowBreakdown(false)} className="px-6 py-3 bg-[#1B75BB] text-white rounded-lg font-black text-xs uppercase tracking-wider hover:bg-[#1557BB] transition-all shadow-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
