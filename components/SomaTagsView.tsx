import React, { useEffect, useState, useMemo } from 'react';
import { getDRESummary, DRESummaryRow } from '../services/supabaseService';
import { Loader2, RefreshCw } from 'lucide-react';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const SomaTagsView: React.FC = () => {
  const [rows, setRows] = useState<DRESummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState('2026');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getDRESummary({
        monthFrom: `${year}-01`,
        monthTo: `${year}-12`,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  // Agrupa por tag0 + tag01 → soma Real e A-1
  const table = useMemo(() => {
    const map = new Map<string, { tag0: string; tag01: string; real: number; a1: number }>();
    rows.forEach(r => {
      const key = `${r.tag0}|||${r.tag01}`;
      if (!map.has(key)) map.set(key, { tag0: r.tag0, tag01: r.tag01, real: 0, a1: 0 });
      const entry = map.get(key)!;
      const val = Number(r.total_amount) || 0;
      if (r.scenario === 'Real') entry.real += val;
      if (r.scenario === 'A-1')  entry.a1  += val;
    });

    return Array.from(map.values()).sort((a, b) => {
      const t0 = a.tag0.localeCompare(b.tag0);
      return t0 !== 0 ? t0 : a.tag01.localeCompare(b.tag01);
    });
  }, [rows]);

  const totals = useMemo(() => ({
    real: table.reduce((s, r) => s + r.real, 0),
    a1:   table.reduce((s, r) => s + r.a1,   0),
  }), [table]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-800">Soma por Tag01 — diagnóstico A-1</h1>
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
        </select>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
        {!loading && (
          <span className="text-xs text-gray-500">
            {table.length} tag01s · {rows.length} linhas brutas
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="animate-spin" size={18} />
          Carregando...
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-140px)]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-[#152e55] text-white">
              <tr>
                <th className="text-left px-3 py-2 font-semibold w-48">Tag0</th>
                <th className="text-left px-3 py-2 font-semibold w-56">Tag01</th>
                <th className="text-right px-3 py-2 font-semibold w-40">Real</th>
                <th className="text-right px-3 py-2 font-semibold w-40">A-1</th>
                <th className="text-right px-3 py-2 font-semibold w-40">Δ (Real − A-1)</th>
                <th className="text-right px-3 py-2 font-semibold w-24">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => {
                const delta = r.real - r.a1;
                const pct = r.a1 !== 0 ? (delta / Math.abs(r.a1)) * 100 : null;
                const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                const hasA1 = r.a1 !== 0;
                return (
                  <tr key={i} className={`${bg} hover:bg-yellow-50 border-b border-gray-100`}>
                    <td className="px-3 py-1 text-gray-600 truncate max-w-[12rem]">{r.tag0}</td>
                    <td className={`px-3 py-1 font-medium truncate max-w-[14rem] ${hasA1 ? 'text-purple-700' : 'text-gray-800'}`}>
                      {r.tag01}
                      {hasA1 && <span className="ml-1 text-[10px] text-purple-400">(A-1 ✓)</span>}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-gray-700">{fmt(r.real)}</td>
                    <td className={`px-3 py-1 text-right tabular-nums font-semibold ${hasA1 ? 'text-purple-700' : 'text-gray-400'}`}>
                      {hasA1 ? fmt(r.a1) : '—'}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-gray-600">
                      {hasA1 ? fmt(delta) : '—'}
                    </td>
                    <td className={`px-3 py-1 text-right tabular-nums text-xs ${pct != null && Math.abs(pct) > 20 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                      {pct != null ? `${pct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#152e55] text-white font-bold">
              <tr>
                <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.real)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.a1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.real - totals.a1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {totals.a1 !== 0 ? `${(((totals.real - totals.a1) / Math.abs(totals.a1)) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SomaTagsView;
