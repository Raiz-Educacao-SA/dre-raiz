import React, { useEffect, useState, useMemo } from 'react';
import { getSomaTags, SomaTagsRow } from '../services/supabaseService';
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (real: number, a1: number) => {
  if (a1 === 0) return '—';
  return `${(((real - a1) / Math.abs(a1)) * 100).toFixed(1)}%`;
};

interface Tag01Row { tag01: string; real: number; a1: number }
interface Tag0Group { tag0: string; real: number; a1: number; items: Tag01Row[] }

const SomaTagsView: React.FC = () => {
  const [rows, setRows] = useState<SomaTagsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState('2026');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSomaTags(`${year}-01`, `${year}-12`);
      setRows(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  const groups = useMemo((): Tag0Group[] => {
    const tag0Map = new Map<string, Map<string, Tag01Row>>();

    rows.forEach(r => {
      if (!tag0Map.has(r.tag0)) tag0Map.set(r.tag0, new Map());
      const tag01Map = tag0Map.get(r.tag0)!;
      if (!tag01Map.has(r.tag01)) tag01Map.set(r.tag01, { tag01: r.tag01, real: 0, a1: 0 });
      const entry = tag01Map.get(r.tag01)!;
      const val = Number(r.total) || 0;
      if (r.scenario === 'Real') entry.real += val;
      if (r.scenario === 'A-1')  entry.a1  += val;
    });

    return Array.from(tag0Map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag0, tag01Map]) => {
        const items = Array.from(tag01Map.values()).sort((a, b) => a.tag01.localeCompare(b.tag01));
        return {
          tag0,
          real: items.reduce((s, i) => s + i.real, 0),
          a1:   items.reduce((s, i) => s + i.a1,   0),
          items,
        };
      });
  }, [rows]);

  const totals = useMemo(() => ({
    real: groups.reduce((s, g) => s + g.real, 0),
    a1:   groups.reduce((s, g) => s + g.a1,   0),
  }), [groups]);

  const toggleGroup = (tag0: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(tag0)) next.delete(tag0); else next.add(tag0);
      return next;
    });
  };

  const exportExcel = () => {
    const wsData: any[][] = [
      ['Tag0', 'Tag01', 'Real', 'A-1', 'Δ (Real − A-1)', 'Δ %'],
    ];
    groups.forEach(g => {
      wsData.push([g.tag0, '— SUBTOTAL —', g.real, g.a1, g.real - g.a1,
        g.a1 !== 0 ? (g.real - g.a1) / Math.abs(g.a1) : null]);
      g.items.forEach(r => {
        const delta = r.real - r.a1;
        wsData.push([g.tag0, r.tag01, r.real, r.a1, delta,
          r.a1 !== 0 ? delta / Math.abs(r.a1) : null]);
      });
    });
    wsData.push(['TOTAL', '', totals.real, totals.a1, totals.real - totals.a1,
      totals.a1 !== 0 ? (totals.real - totals.a1) / Math.abs(totals.a1) : null]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = 1; row <= range.e.r; row++) {
      ['C', 'D', 'E'].forEach(col => {
        const cell = ws[`${col}${row + 1}`];
        if (cell) cell.z = '"R$"#,##0';
      });
      const pctCell = ws[`F${row + 1}`];
      if (pctCell && pctCell.v != null) pctCell.z = '0.0%';
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `SomaTags_${year}`);
    XLSX.writeFile(wb, `soma_tags_${year}.xlsx`);
  };

  const tag01Count = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-gray-800">Soma Tag0 / Tag01 — Real vs A-1</h1>
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
        {!loading && !error && groups.length > 0 && (
          <>
            <span className="text-xs text-gray-500">
              {groups.length} tag0s · {tag01Count} tag01s · {rows.length} linhas brutas
            </span>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Download size={14} />
              Exportar Excel
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-800">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="animate-spin" size={18} />
          Carregando...
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-140px)]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-[#152e55] text-white z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold w-8"></th>
                <th className="text-left px-3 py-2 font-semibold">Tag0 / Tag01</th>
                <th className="text-right px-3 py-2 font-semibold w-40">Real</th>
                <th className="text-right px-3 py-2 font-semibold w-40">A-1</th>
                <th className="text-right px-3 py-2 font-semibold w-40">Δ (Real − A-1)</th>
                <th className="text-right px-3 py-2 font-semibold w-24">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const isOpen = !collapsed.has(g.tag0);
                const hasA1 = g.a1 !== 0;
                return (
                  <React.Fragment key={g.tag0}>
                    {/* Linha Tag0 (cabeçalho do grupo) */}
                    <tr
                      className="bg-[#1e3a5f] text-white cursor-pointer hover:bg-[#2a4d7a]"
                      onClick={() => toggleGroup(g.tag0)}
                    >
                      <td className="px-3 py-2 text-center">
                        {isOpen
                          ? <ChevronDown size={14} className="inline" />
                          : <ChevronRight size={14} className="inline" />}
                      </td>
                      <td className="px-3 py-2 font-bold uppercase tracking-wide">{g.tag0}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(g.real)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-bold ${hasA1 ? 'text-yellow-300' : 'text-gray-400'}`}>
                        {hasA1 ? fmt(g.a1) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">
                        {hasA1 ? fmt(g.real - g.a1) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">
                        {fmtPct(g.real, g.a1)}
                      </td>
                    </tr>

                    {/* Linhas Tag01 (detalhe) */}
                    {isOpen && g.items.map((r, i) => {
                      const delta = r.real - r.a1;
                      const pct = r.a1 !== 0 ? (delta / Math.abs(r.a1)) * 100 : null;
                      const rowHasA1 = r.a1 !== 0;
                      return (
                        <tr key={r.tag01} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 border-b border-gray-100`}>
                          <td className="px-3 py-1"></td>
                          <td className={`px-3 py-1 pl-6 ${rowHasA1 ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                            {r.tag01}
                            {rowHasA1 && <span className="ml-1 text-[10px] text-purple-400">(A-1 ✓)</span>}
                          </td>
                          <td className="px-3 py-1 text-right tabular-nums text-gray-700">{fmt(r.real)}</td>
                          <td className={`px-3 py-1 text-right tabular-nums font-semibold ${rowHasA1 ? 'text-purple-700' : 'text-gray-400'}`}>
                            {rowHasA1 ? fmt(r.a1) : '—'}
                          </td>
                          <td className="px-3 py-1 text-right tabular-nums text-gray-600">
                            {rowHasA1 ? fmt(delta) : '—'}
                          </td>
                          <td className={`px-3 py-1 text-right tabular-nums ${pct != null && Math.abs(pct) > 20 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                            {pct != null ? `${pct.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#152e55] text-white font-bold">
              <tr>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2">TOTAL GERAL</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.real)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.a1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totals.real - totals.a1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtPct(totals.real, totals.a1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SomaTagsView;
