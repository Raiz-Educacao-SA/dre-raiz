import React, { useEffect, useState, useMemo } from 'react';
import { getSomaTags, SomaTagsRow } from '../services/supabaseService';
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtPct = (real: number, base: number): string => {
  if (base === 0) return '—';
  return `${(((real - base) / Math.abs(base)) * 100).toFixed(1)}%`;
};

const deltaClass = (delta: number, base: number, onCalc = false): string => {
  if (base === 0) return 'text-gray-400';
  if (delta > 0) return onCalc ? 'text-lime-300' : 'text-emerald-600';
  if (delta < 0) return onCalc ? 'text-red-200'  : 'text-rose-600';
  return 'text-gray-400';
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tag01Row  { tag01: string; real: number; orcado: number; a1: number }
interface Tag0Group { tag0:  string; real: number; orcado: number; a1: number; items: Tag01Row[] }
interface CalcData  { real:  number; orcado: number; a1: number }

const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' }, { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' }, { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
];

// ── Linha calculada (MARGEM / EBITDA) — estilo DRE Gerencial ─────────────────
interface CalcRowProps { label: string; data: CalcData; borderTop?: boolean }

const CalcRow: React.FC<CalcRowProps> = ({ label, data, borderTop }) => {
  const { real, orcado, a1 } = data;
  const dOrç  = real - orcado;
  const dA1   = real - a1;
  const hasOrc = orcado !== 0;
  const hasA1  = a1     !== 0;

  return (
    <tr className={`group bg-[#F44C00] text-white font-black text-[11px] shadow-sm
                   ${borderTop ? 'border-t-2 border-yellow-400' : ''}`}>
      <td className="px-2 py-1.5 w-8"></td>

      {/* Label */}
      <td className="px-2 py-1.5 sticky left-0 bg-[#F44C00] group-hover:bg-yellow-400
                     group-hover:text-black transition-colors z-20
                     shadow-[2px_0_4px_rgba(0,0,0,0.2)] uppercase tracking-tight">
        ▶ {label}
      </td>

      {/* Real */}
      <td className="px-2 py-1.5 text-right font-mono">{fmt(real)}</td>

      {/* Orçado */}
      <td className={`px-2 py-1.5 text-right font-mono ${hasOrc ? 'text-green-200' : 'text-orange-300'}`}>
        {hasOrc ? fmt(orcado) : '—'}
      </td>

      {/* Δ R−Orç */}
      <td className={`px-2 py-1.5 text-right font-mono ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>
        {hasOrc ? fmt(dOrç) : '—'}
      </td>

      {/* Δ% Orç */}
      <td className={`px-2 py-1.5 text-right font-mono border-r border-white/20
                     ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>
        {fmtPct(real, orcado)}
      </td>

      {/* A-1 */}
      <td className={`px-2 py-1.5 text-right font-mono ${hasA1 ? 'text-yellow-200' : 'text-orange-300'}`}>
        {hasA1 ? fmt(a1) : '—'}
      </td>

      {/* Δ R−A-1 */}
      <td className={`px-2 py-1.5 text-right font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>
        {hasA1 ? fmt(dA1) : '—'}
      </td>

      {/* Δ% A-1 */}
      <td className={`px-2 py-1.5 text-right font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>
        {fmtPct(real, a1)}
      </td>
    </tr>
  );
};

// ── Excel calc row helper ─────────────────────────────────────────────────────
const calcXlsxRow = (label: string, d: CalcData) => [
  label, '',
  d.real, d.orcado,
  d.real - d.orcado, d.orcado !== 0 ? (d.real - d.orcado) / Math.abs(d.orcado) : null,
  d.a1,
  d.real - d.a1, d.a1 !== 0 ? (d.real - d.a1) / Math.abs(d.a1) : null,
];

// ── Componente principal ──────────────────────────────────────────────────────
const SomaTagsView: React.FC = () => {
  const [rows,      setRows]      = useState<SomaTagsRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [year,      setYear]      = useState('2026');
  const [monthFrom, setMonthFrom] = useState('01');
  const [monthTo,   setMonthTo]   = useState('12');
  const [collapsed,      setCollapsed]      = useState<Set<string>>(new Set());
  const [showOnlyEbitda, setShowOnlyEbitda] = useState(true);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const from = monthFrom <= monthTo ? monthFrom : monthTo;
      const to   = monthFrom <= monthTo ? monthTo   : monthFrom;
      const data = await getSomaTags(`${year}-${from}`, `${year}-${to}`);
      setRows(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, monthFrom, monthTo]);

  // ── Agrupamento ───────────────────────────────────────────────────────────
  const groups = useMemo((): Tag0Group[] => {
    const map = new Map<string, Map<string, Tag01Row>>();
    rows.forEach(r => {
      if (!map.has(r.tag0)) map.set(r.tag0, new Map());
      const m = map.get(r.tag0)!;
      if (!m.has(r.tag01)) m.set(r.tag01, { tag01: r.tag01, real: 0, orcado: 0, a1: 0 });
      const e = m.get(r.tag01)!;
      const v = Number(r.total) || 0;
      if (r.scenario === 'Real')   e.real   += v;
      if (r.scenario === 'Orçado') e.orcado += v;
      if (r.scenario === 'A-1')    e.a1     += v;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag0, m]) => {
        const items = Array.from(m.values()).sort((a, b) => a.tag01.localeCompare(b.tag01));
        return {
          tag0,
          real:   items.reduce((s, i) => s + i.real,   0),
          orcado: items.reduce((s, i) => s + i.orcado, 0),
          a1:     items.reduce((s, i) => s + i.a1,     0),
          items,
        };
      });
  }, [rows]);

  const totals = useMemo(() => ({
    real:   groups.reduce((s, g) => s + g.real,   0),
    orcado: groups.reduce((s, g) => s + g.orcado, 0),
    a1:     groups.reduce((s, g) => s + g.a1,     0),
  }), [groups]);

  // ── Grupos exibidos (filtro Até EBITDA) ──────────────────────────────────
  const EBITDA_PREFIXES = ['01.', '02.', '03.', '04.', '05.'];
  const displayedGroups = useMemo(
    () => showOnlyEbitda ? groups.filter(g => EBITDA_PREFIXES.some(p => g.tag0.startsWith(p))) : groups,
    [groups, showOnlyEbitda],
  );

  // ── Linhas calculadas ────────────────────────────────────────────────────
  const sumPfx = (pfxs: string[]): CalcData =>
    groups.filter(g => pfxs.some(p => g.tag0.startsWith(p)))
          .reduce((a, g) => ({ real: a.real + g.real, orcado: a.orcado + g.orcado, a1: a.a1 + g.a1 }),
            { real: 0, orcado: 0, a1: 0 });

  const margemData = useMemo(() => sumPfx(['01.', '02.', '03.']),          [groups]);
  const ebitdaData = useMemo(() => sumPfx(['01.', '02.', '03.', '04.']),   [groups]);

  const lastIdx = (pfx: string) => {
    let i = -1;
    displayedGroups.forEach((g, idx) => { if (g.tag0.startsWith(pfx)) i = idx; });
    return i;
  };
  const { lastIdx03, lastIdx04 } = useMemo(() => ({
    lastIdx03: lastIdx('03.'),
    lastIdx04: lastIdx('04.'),
  }), [displayedGroups]);

  const toggleGroup = (tag0: string) =>
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(tag0) ? n.delete(tag0) : n.add(tag0);
      return n;
    });

  // ── Exportar Excel ────────────────────────────────────────────────────────
  const exportExcel = () => {
    const wsData: any[][] = [
      ['Tag0', 'Tag01', 'Real', 'Orçado', 'Δ R−Orç', 'Δ% Orç', 'A-1', 'Δ R−A-1', 'Δ% A-1'],
    ];
    displayedGroups.forEach((g, idx) => {
      wsData.push([
        g.tag0, '— SUBTOTAL —',
        g.real, g.orcado,
        g.real - g.orcado, g.orcado !== 0 ? (g.real - g.orcado) / Math.abs(g.orcado) : null,
        g.a1, g.real - g.a1, g.a1 !== 0 ? (g.real - g.a1) / Math.abs(g.a1) : null,
      ]);
      g.items.forEach(r => wsData.push([
        g.tag0, r.tag01,
        r.real, r.orcado,
        r.real - r.orcado, r.orcado !== 0 ? (r.real - r.orcado) / Math.abs(r.orcado) : null,
        r.a1, r.real - r.a1, r.a1 !== 0 ? (r.real - r.a1) / Math.abs(r.a1) : null,
      ]));
      if (idx === lastIdx03) wsData.push(calcXlsxRow('▶ MARGEM DE CONTRIBUIÇÃO', margemData));
      if (idx === lastIdx04) wsData.push(calcXlsxRow('▶ EBITDA (S/ RATEIO RAIZ CSC)', ebitdaData));
      if (idx === lastIdx03 && lastIdx04 === -1)
        wsData.push(calcXlsxRow('▶ EBITDA (S/ RATEIO RAIZ CSC)', ebitdaData));
    });
    wsData.push([
      'TOTAL GERAL', '',
      totals.real, totals.orcado,
      totals.real - totals.orcado,
      totals.orcado !== 0 ? (totals.real - totals.orcado) / Math.abs(totals.orcado) : null,
      totals.a1, totals.real - totals.a1,
      totals.a1 !== 0 ? (totals.real - totals.a1) / Math.abs(totals.a1) : null,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 30 }, { wch: 40 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
      { wch: 18 }, { wch: 18 }, { wch: 10 },
    ];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = 1; r <= range.e.r; r++) {
      ['C','D','E','G','H'].forEach(c => { const cell = ws[`${c}${r+1}`]; if (cell) cell.z = '"R$"#,##0'; });
      ['F','I'].forEach(c => { const cell = ws[`${c}${r+1}`]; if (cell && cell.v != null) cell.z = '0.0%'; });
    }
    const wb  = XLSX.utils.book_new();
    const per = monthFrom === '01' && monthTo === '12' ? year : `${year}_${monthFrom}-${monthTo}`;
    XLSX.utils.book_append_sheet(wb, ws, `SomaTags_${per}`);
    XLSX.writeFile(wb, `soma_tags_${per}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const tag01Count = displayedGroups.reduce((s, g) => s + g.items.length, 0);
  const hasOrcado  = displayedGroups.some(g => g.orcado !== 0);

  return (
    <div className="p-4 space-y-3">

      {/* ── Controles ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-base font-black text-[#152e55] uppercase tracking-tight">
          Soma Tag0 / Tag01
        </h1>

        {/* Ano */}
        <select value={year} onChange={e => setYear(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm font-semibold text-gray-700 bg-white shadow-sm">
          {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
        </select>

        {/* Período */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 font-semibold uppercase">De</span>
          <select value={monthFrom} onChange={e => setMonthFrom(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm font-semibold text-gray-700 bg-white shadow-sm">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span className="text-[11px] text-gray-500 font-semibold uppercase">até</span>
          <select value={monthTo} onChange={e => setMonthTo(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm font-semibold text-gray-700 bg-white shadow-sm">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#152e55] text-white text-xs font-bold rounded
                     hover:bg-[#1e3d6e] disabled:opacity-50 shadow-sm transition-colors uppercase tracking-wide">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>

        {/* Filtro Até EBITDA */}
        <button
          onClick={() => setShowOnlyEbitda(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold shadow-sm transition-all ${
            showOnlyEbitda
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'bg-gradient-to-r from-gray-500 to-slate-600 text-white'
          }`}
          title={showOnlyEbitda ? 'Exibindo apenas até EBITDA (Tag0 01–05)' : 'Exibindo todas as Tag0'}
        >
          {showOnlyEbitda
            ? <><CheckSquare size={13} strokeWidth={2.5} /><span>Até EBITDA</span></>
            : <><Square      size={13} strokeWidth={2.5} /><span>Todas Tag0</span></>
          }
        </button>

        {!loading && !error && groups.length > 0 && (
          <>
            <span className="text-[11px] text-gray-500">
              {groups.length} tag0s · {tag01Count} tag01s · {rows.length} registros
              {!hasOrcado && <span className="ml-2 text-amber-600 font-semibold">(sem Orçado neste período)</span>}
            </span>
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded
                         hover:bg-emerald-700 shadow-sm transition-colors uppercase tracking-wide">
              <Download size={13} />
              Exportar Excel
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-800 font-semibold">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-10">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-130px)] rounded-lg shadow-md border border-gray-200">
          <table className="border-separate border-spacing-0 text-left table-auto min-w-full text-[11px]">

            {/* ══ CABEÇALHO ══ */}
            <thead className="sticky top-0 z-50 shadow-lg">

              {/* Linha 1 — grupos de cenário */}
              <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white h-7">
                <th colSpan={2}
                  className="sticky left-0 z-[60] bg-gradient-to-r from-slate-800 to-slate-700
                             px-3 py-1 text-[9px] font-black uppercase tracking-wider
                             w-[320px] shadow-lg border-r border-white/10">
                  CONTAS GERENCIAIS
                </th>
                {/* Real — apenas 1 coluna */}
                <th className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider
                               bg-gradient-to-r from-blue-600 to-blue-500 border-r border-white/20">
                  REAL
                </th>
                {/* Real vs Orçado */}
                <th colSpan={3}
                  className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider
                             bg-gradient-to-r from-emerald-600 to-emerald-500 border-r border-white/20">
                  REAL vs ORÇADO
                </th>
                {/* Real vs A-1 */}
                <th colSpan={3}
                  className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider
                             bg-gradient-to-r from-purple-600 to-purple-500">
                  REAL vs A-1
                </th>
              </tr>

              {/* Linha 2 — colunas individuais */}
              <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white h-6">
                <th className="w-8 px-2 py-1 sticky left-0 z-[60]
                               bg-gradient-to-r from-slate-700 to-slate-600"></th>
                <th className="px-2 py-1 font-black text-[9px] uppercase tracking-wider sticky left-8 z-[60]
                               bg-gradient-to-r from-slate-700 to-slate-600 w-[280px]
                               border-r border-white/10 shadow-[2px_0_4px_rgba(0,0,0,0.2)]">
                  Tag0 / Tag01
                </th>
                {/* Real */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[130px]
                               bg-blue-700/80 border-r border-white/20">
                  Real
                </th>
                {/* Orçado */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[130px]
                               bg-emerald-700/80">
                  Orçado
                </th>
                {/* Δ R−Orç */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[120px]
                               bg-emerald-700/80">
                  Δ R−Orç
                </th>
                {/* Δ% Orç */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[72px]
                               bg-emerald-700/80 border-r border-white/20">
                  Δ%
                </th>
                {/* A-1 */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[130px]
                               bg-purple-700/80">
                  A-1
                </th>
                {/* Δ R−A-1 */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[120px]
                               bg-purple-700/80">
                  Δ R−A-1
                </th>
                {/* Δ% A-1 */}
                <th className="px-2 py-1 text-right font-black text-[9px] uppercase w-[72px]
                               bg-purple-700/80">
                  Δ%
                </th>
              </tr>
            </thead>

            {/* ══ BODY ══ */}
            <tbody className="bg-white">
              {displayedGroups.map((g, idx) => {
                const isOpen = !collapsed.has(g.tag0);
                const hasA1  = g.a1     !== 0;
                const hasOrc = g.orcado !== 0;
                const dOrç   = g.real - g.orcado;
                const dA1    = g.real - g.a1;

                return (
                  <React.Fragment key={g.tag0}>

                    {/* ── Tag0 — nível 1 ── */}
                    <tr className="group bg-[#152e55] text-white font-black cursor-pointer
                                   hover:bg-[#1e3d6e] transition-colors h-7">
                      <td className="px-2 py-1 text-center w-8
                                     sticky left-0 z-30 bg-[#152e55] group-hover:bg-[#1e3d6e] transition-colors">
                        {isOpen
                          ? <ChevronDown  size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />
                          : <ChevronRight size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />}
                      </td>
                      <td className="px-2 py-1 font-black uppercase tracking-tight text-[11px] truncate
                                     sticky left-8 z-30 bg-[#152e55] group-hover:bg-[#1e3d6e] transition-colors
                                     shadow-[2px_0_4px_rgba(0,0,0,0.2)] border-r border-white/10 w-[280px]"
                          onClick={() => toggleGroup(g.tag0)}>
                        {g.tag0}
                      </td>
                      {/* Real */}
                      <td className="px-2 py-1 text-right font-mono font-black border-r border-white/10">
                        {fmt(g.real)}
                      </td>
                      {/* Orçado */}
                      <td className={`px-2 py-1 text-right font-mono font-black ${hasOrc ? 'text-green-300' : 'text-gray-500'}`}>
                        {hasOrc ? fmt(g.orcado) : '—'}
                      </td>
                      {/* Δ R−Orç */}
                      <td className={`px-2 py-1 text-right font-mono font-black ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>
                        {hasOrc ? fmt(dOrç) : '—'}
                      </td>
                      {/* Δ% Orç */}
                      <td className={`px-2 py-1 text-right font-mono font-black border-r border-white/10
                                     ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>
                        {fmtPct(g.real, g.orcado)}
                      </td>
                      {/* A-1 */}
                      <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? 'text-yellow-300' : 'text-gray-500'}`}>
                        {hasA1 ? fmt(g.a1) : '—'}
                      </td>
                      {/* Δ R−A-1 */}
                      <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>
                        {hasA1 ? fmt(dA1) : '—'}
                      </td>
                      {/* Δ% A-1 */}
                      <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>
                        {fmtPct(g.real, g.a1)}
                      </td>
                    </tr>

                    {/* ── Tag01 — nível 2 ── */}
                    {isOpen && g.items.map((r, i) => {
                      const rHasOrc = r.orcado !== 0;
                      const rHasA1  = r.a1     !== 0;
                      const rdOrç   = r.real - r.orcado;
                      const rdA1    = r.real - r.a1;
                      return (
                        <tr key={r.tag01}
                          className={`${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100
                                     hover:bg-orange-50/30 transition-colors`}>
                          <td className={`px-2 py-1 w-8 sticky left-0 z-20
                                         ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}></td>
                          <td className={`px-2 py-1 pl-6 text-gray-800 font-semibold truncate
                                         sticky left-8 z-20 border-r border-gray-200
                                         shadow-[2px_0_4px_rgba(0,0,0,0.05)] w-[280px]
                                         ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                            {r.tag01}
                          </td>
                          {/* Real */}
                          <td className="px-2 py-1 text-right font-mono text-gray-900 border-r border-gray-100">
                            {fmt(r.real)}
                          </td>
                          {/* Orçado */}
                          <td className={`px-2 py-1 text-right font-mono ${rHasOrc ? 'text-gray-700' : 'text-gray-300'}`}>
                            {rHasOrc ? fmt(r.orcado) : '—'}
                          </td>
                          {/* Δ R−Orç */}
                          <td className={`px-2 py-1 text-right font-mono ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>
                            {rHasOrc ? fmt(rdOrç) : '—'}
                          </td>
                          {/* Δ% Orç */}
                          <td className={`px-2 py-1 text-right font-mono border-r border-gray-200
                                         ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>
                            {rHasOrc ? `${((rdOrç / Math.abs(r.orcado)) * 100).toFixed(1)}%` : '—'}
                          </td>
                          {/* A-1 */}
                          <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? 'text-purple-700' : 'text-gray-300'}`}>
                            {rHasA1 ? fmt(r.a1) : '—'}
                          </td>
                          {/* Δ R−A-1 */}
                          <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>
                            {rHasA1 ? fmt(rdA1) : '—'}
                          </td>
                          {/* Δ% A-1 */}
                          <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>
                            {rHasA1 ? `${((rdA1 / Math.abs(r.a1)) * 100).toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* ── Linhas calculadas ── */}
                    {idx === lastIdx03 && (
                      <CalcRow label="MARGEM DE CONTRIBUIÇÃO" data={margemData} borderTop />
                    )}
                    {idx === lastIdx04 && (
                      <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} borderTop />
                    )}
                    {idx === lastIdx03 && lastIdx04 === -1 && (
                      <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} />
                    )}

                  </React.Fragment>
                );
              })}
            </tbody>

            {/* ══ RODAPÉ ══ */}
            <tfoot className="sticky bottom-0 z-40">
              <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800
                             text-white font-black text-[11px] shadow-[0_-2px_6px_rgba(0,0,0,0.3)]
                             border-t-2 border-yellow-400">
                <td className="px-2 py-2 sticky left-0 z-50
                               bg-gradient-to-r from-slate-800 to-slate-700"></td>
                <td className="px-2 py-2 uppercase tracking-tight font-black
                               sticky left-8 z-50 bg-gradient-to-r from-slate-800 to-slate-700
                               shadow-[2px_0_4px_rgba(0,0,0,0.3)] border-r border-white/10 w-[280px]">
                  TOTAL GERAL
                </td>
                <td className="px-2 py-2 text-right font-mono border-r border-white/10">
                  {fmt(totals.real)}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${totals.orcado !== 0 ? 'text-green-300' : 'text-gray-500'}`}>
                  {totals.orcado !== 0 ? fmt(totals.orcado) : '—'}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${totals.orcado !== 0 ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>
                  {totals.orcado !== 0 ? fmt(totals.real - totals.orcado) : '—'}
                </td>
                <td className={`px-2 py-2 text-right font-mono border-r border-white/10
                               ${totals.orcado !== 0 ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>
                  {fmtPct(totals.real, totals.orcado)}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? 'text-yellow-300' : 'text-gray-500'}`}>
                  {totals.a1 !== 0 ? fmt(totals.a1) : '—'}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>
                  {totals.a1 !== 0 ? fmt(totals.real - totals.a1) : '—'}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>
                  {fmtPct(totals.real, totals.a1)}
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
