import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { getSomaTags, getDREFilterOptions, SomaTagsRow, DREFilterOptions, getDREDimension, DREDimensionRow } from '../services/supabaseService';
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight, CheckSquare, Square, Flag, Building2, FilterX, CalendarDays, Calendar, Columns, Activity, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import MultiSelectFilter from './MultiSelectFilter';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v === 0 ? '—' : Math.round(v).toLocaleString('pt-BR');

// Mesmo formato para visões mensais (igual ao DRE Gerencial)
const fmtK = (v: number): string =>
  v === 0 ? '—' : Math.round(v).toLocaleString('pt-BR');

const fmtPct = (real: number, base: number): string => {
  if (base === 0) return '—';
  const pct = ((real - base) / Math.abs(base)) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

const deltaClass = (delta: number, base: number, onCalc = false): string => {
  if (base === 0) return 'text-gray-400';
  if (delta > 0) return onCalc ? 'text-lime-300' : 'text-emerald-600';
  if (delta < 0) return onCalc ? 'text-red-200'  : 'text-rose-600';
  return 'text-gray-400';
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};
const getML = (yyyyMM: string) => MONTH_LABELS[yyyyMM.slice(5)] || yyyyMM;

const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' }, { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' }, { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tag01Row  { tag01: string; real: number; orcado: number; a1: number }
interface Tag0Group { tag0:  string; real: number; orcado: number; a1: number; items: Tag01Row[] }
interface CalcData  { real:  number; orcado: number; a1: number }
interface ColsVis {
  real: boolean; orcado: boolean; deltaAbsOrcado: boolean; deltaPercOrcado: boolean;
  a1: boolean;   deltaAbsA1: boolean; deltaPercA1: boolean;
}
interface MonthData { real: number; orcado: number; a1: number }
interface Tag01MonthlyItem { tag01: string; byMonth: Record<string, MonthData> }
interface Tag0MonthlyGroup { tag0: string; byMonth: Record<string, MonthData>; items: Tag01MonthlyItem[] }

type ViewMode = 'consolidado' | 'cenario' | 'mes';

// ── CalcRow — linha calculada (MARGEM / EBITDA) — Consolidado ─────────────────
interface CalcRowProps { label: string; data: CalcData; borderTop?: boolean; cols: ColsVis }

const CalcRow: React.FC<CalcRowProps> = ({ label, data, borderTop, cols }) => {
  const { real, orcado, a1 } = data;
  const dOrç  = real - orcado;
  const dA1   = real - a1;
  const hasOrc = orcado !== 0;
  const hasA1  = a1     !== 0;
  return (
    <tr className={`group bg-[#F44C00] text-white font-black text-[10px] h-6 shadow-sm
                   ${borderTop ? 'border-t-2 border-yellow-400' : ''}`}>
      <td colSpan={2}
          className="sticky left-0 bg-[#F44C00] z-20 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
        <div className="flex items-center gap-1 px-2 uppercase tracking-tighter truncate font-black">
          <Activity size={12} /> {label}
        </div>
      </td>
      {cols.real            && <td className="px-2 py-1 text-right font-mono">{fmt(real)}</td>}
      {cols.orcado          && <td className={`px-2 py-1 text-right font-mono ${hasOrc ? '' : 'text-orange-300'}`}>{hasOrc ? fmt(orcado) : '—'}</td>}
      {cols.deltaAbsOrcado  && <td className={`px-2 py-1 text-right font-mono ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>{hasOrc ? fmt(dOrç) : '—'}</td>}
      {cols.deltaPercOrcado && <td className={`px-2 py-1 text-right font-mono border-r border-white/20 ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>{fmtPct(real, orcado)}</td>}
      {cols.a1              && <td className={`px-2 py-1 text-right font-mono ${hasA1 ? '' : 'text-orange-300'}`}>{hasA1 ? fmt(a1) : '—'}</td>}
      {cols.deltaAbsA1      && <td className={`px-2 py-1 text-right font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>{hasA1 ? fmt(dA1) : '—'}</td>}
      {cols.deltaPercA1     && <td className={`px-2 py-1 text-right font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>{fmtPct(real, a1)}</td>}
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
interface SomaTagsViewProps {
  onRegisterActions?: (actions: { refresh: () => void; exportExcel: () => void }) => void;
  onLoadingChange?: (loading: boolean) => void;
  onDataChange?: (hasData: boolean) => void;
}

const SomaTagsView: React.FC<SomaTagsViewProps> = ({ onRegisterActions, onLoadingChange, onDataChange }) => {
  const [rows,      setRows]      = useState<SomaTagsRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [year,      setYear]      = useState('2026');
  const [monthFrom, setMonthFrom] = useState('01');
  const [monthTo,   setMonthTo]   = useState('12');
  const [collapsed,      setCollapsed]      = useState<Set<string>>(new Set());
  const [showOnlyEbitda, setShowOnlyEbitda] = useState(true);
  const [viewMode,       setViewMode]       = useState<ViewMode>('consolidado');

  // ── Filtros Marca / Filial ────────────────────────────────────────────────
  const [filterOptions,   setFilterOptions]   = useState<DREFilterOptions>({ marcas: [], nome_filiais: [], tags01: [] });
  const [selectedMarcas,  setSelectedMarcas]  = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const filialCleanupRef = useRef(false);

  // ── Visibilidade de colunas ───────────────────────────────────────────────
  const [showReal,            setShowReal]            = useState(true);
  const [showOrcado,          setShowOrcado]          = useState(true);
  const [showA1,              setShowA1]              = useState(true);
  const [showDeltaAbsOrcado,  setShowDeltaAbsOrcado]  = useState(true);
  const [showDeltaPercOrcado, setShowDeltaPercOrcado] = useState(true);
  const [showDeltaAbsA1,      setShowDeltaAbsA1]      = useState(true);
  const [showDeltaPercA1,     setShowDeltaPercA1]     = useState(true);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([
    'Real', 'Orçado', 'DeltaAbsOrcado', 'DeltaPercOrcado', 'A1', 'DeltaAbsA1', 'DeltaPercA1',
  ]);

  // ── Drill-down ────────────────────────────────────────────────────────────
  const [dimensionCache,    setDimensionCache]    = useState<Record<string, DREDimensionRow[]>>({});
  const [expandedTag01s,    setExpandedTag01s]    = useState<Record<string, boolean>>({});
  const [expandedDrillRows, setExpandedDrillRows] = useState<Record<string, boolean>>({});
  const [drillDimensions,   setDrillDimensions]   = useState<string[]>([]);
  const [dimensionSort,     setDimensionSort]     = useState<'alpha' | 'desc' | 'asc'>('desc');

  // Refs para evitar closure stale em loadDrillData (useCallback sem deps)
  const yearRef       = useRef(year);
  const monthFromRef  = useRef(monthFrom);
  const monthToRef    = useRef(monthTo);
  const marcasRef     = useRef(selectedMarcas);
  const filiaisRef    = useRef(selectedFiliais);
  useEffect(() => { yearRef.current      = year;            }, [year]);
  useEffect(() => { monthFromRef.current = monthFrom;       }, [monthFrom]);
  useEffect(() => { monthToRef.current   = monthTo;         }, [monthTo]);
  useEffect(() => { marcasRef.current    = selectedMarcas;  }, [selectedMarcas]);
  useEffect(() => { filiaisRef.current   = selectedFiliais; }, [selectedFiliais]);

  const toggleElement = useCallback(
    (element: string, currentState: boolean, setState: (v: boolean) => void) => {
      if (!currentState) {
        setSelectionOrder(prev => [...prev.filter(s => s !== element), element]);
      } else {
        setSelectionOrder(prev => prev.filter(s => s !== element));
      }
      setState(!currentState);
    }, [],
  );

  const activeElements = useMemo(() => {
    const active: string[] = [];
    if (showReal)            active.push('Real');
    if (showOrcado)          active.push('Orçado');
    if (showDeltaAbsOrcado)  active.push('DeltaAbsOrcado');
    if (showDeltaPercOrcado) active.push('DeltaPercOrcado');
    if (showA1)              active.push('A1');
    if (showDeltaAbsA1)      active.push('DeltaAbsA1');
    if (showDeltaPercA1)     active.push('DeltaPercA1');
    return active.sort((a, b) => selectionOrder.indexOf(a) - selectionOrder.indexOf(b));
  }, [showReal, showOrcado, showA1, showDeltaAbsOrcado, showDeltaPercOrcado, showDeltaAbsA1, showDeltaPercA1, selectionOrder]);

  const cols: ColsVis = useMemo(() => ({
    real: showReal, orcado: showOrcado,
    deltaAbsOrcado: showDeltaAbsOrcado, deltaPercOrcado: showDeltaPercOrcado,
    a1: showA1, deltaAbsA1: showDeltaAbsA1, deltaPercA1: showDeltaPercA1,
  }), [showReal, showOrcado, showA1, showDeltaAbsOrcado, showDeltaPercOrcado, showDeltaAbsA1, showDeltaPercA1]);

  // ColSpans dinâmicos para grupos do cabeçalho (Consolidado)
  const orcGrpCols = [showOrcado, showDeltaAbsOrcado, showDeltaPercOrcado].filter(Boolean).length;
  const a1GrpCols  = [showA1,     showDeltaAbsA1,     showDeltaPercA1].filter(Boolean).length;

  // Cascata: filtra filiais disponíveis conforme marcas selecionadas
  const filiaisFiltradas = useMemo(() => {
    if (selectedMarcas.length === 0) return filterOptions.nome_filiais;
    return filterOptions.nome_filiais.filter(f =>
      selectedMarcas.some(m => f.startsWith(m + ' - ') || f.startsWith(m + '-'))
    );
  }, [selectedMarcas, filterOptions.nome_filiais]);

  // Limpa filiais inválidas ao trocar marca
  useEffect(() => {
    if (selectedFiliais.length > 0 && selectedMarcas.length > 0) {
      const validas = selectedFiliais.filter(f => filiaisFiltradas.includes(f));
      if (validas.length !== selectedFiliais.length) {
        filialCleanupRef.current = true;
        setSelectedFiliais(validas);
      }
    }
  }, [selectedMarcas, filiaisFiltradas]);

  // ── loadDrillData ────────────────────────────────────────────────────────
  const loadDrillData = useCallback(async (
    tag01: string, tag0: string, scenario: string, dim: string, accFilters: Record<string, string> = {}
  ) => {
    const filtersKey = Object.entries(accFilters).sort().map(([k, v]) => `${k}=${v}`).join('&');
    const cacheKey   = `${scenario}|${tag01}|${dim}|${filtersKey}`;
    const mf = `${yearRef.current}-${monthFromRef.current}`;
    const mt = `${yearRef.current}-${monthToRef.current}`;
    const marcas  = accFilters.marca       ? [accFilters.marca]       : (marcasRef.current.length  > 0 ? marcasRef.current  : undefined);
    const filiais = accFilters.nome_filial ? [accFilters.nome_filial] : (filiaisRef.current.length > 0 ? filiaisRef.current : undefined);
    const rows = await getDREDimension({
      monthFrom: mf, monthTo: mt,
      scenario, dimension: dim,
      tags01: [tag01], tag0,
      marcas, nomeFiliais: filiais,
    });
    setDimensionCache(prev => ({ ...prev, [cacheKey]: rows }));
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const from   = monthFrom <= monthTo ? monthFrom : monthTo;
      const to     = monthFrom <= monthTo ? monthTo   : monthFrom;
      const mFrom  = `${year}-${from}`;
      const mTo    = `${year}-${to}`;
      const marcas  = selectedMarcas.length  > 0 ? selectedMarcas  : undefined;
      const filiais = selectedFiliais.length > 0 ? selectedFiliais : undefined;
      const [data, opts] = await Promise.all([
        getSomaTags(mFrom, mTo, marcas, filiais),
        getDREFilterOptions({ monthFrom: mFrom, monthTo: mTo }),
      ]);
      setRows(data);
      setFilterOptions(opts);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [year, monthFrom, monthTo, selectedMarcas, selectedFiliais]);

  useEffect(() => { fetchData(); }, [year, monthFrom, monthTo]);
  useEffect(() => {
    if (filialCleanupRef.current) { filialCleanupRef.current = false; return; }
    fetchData();
  }, [selectedMarcas, selectedFiliais]);

  // Limpa cache de drill ao trocar filtros
  useEffect(() => {
    setDimensionCache({});
    setExpandedTag01s({});
    setExpandedDrillRows({});
  }, [year, monthFrom, monthTo, selectedMarcas, selectedFiliais]);

  // ── Agrupamento Consolidado ───────────────────────────────────────────────
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

  // ── Agrupamento Mensal ────────────────────────────────────────────────────
  const monthlyGroups = useMemo((): Tag0MonthlyGroup[] => {
    const map = new Map<string, Map<string, Record<string, MonthData>>>();
    rows.forEach(r => {
      if (!map.has(r.tag0)) map.set(r.tag0, new Map());
      const t0 = map.get(r.tag0)!;
      if (!t0.has(r.tag01)) t0.set(r.tag01, {});
      const t1 = t0.get(r.tag01)!;
      if (!t1[r.month]) t1[r.month] = { real: 0, orcado: 0, a1: 0 };
      const v = Number(r.total) || 0;
      if (r.scenario === 'Real')   t1[r.month].real   += v;
      if (r.scenario === 'Orçado') t1[r.month].orcado += v;
      if (r.scenario === 'A-1')    t1[r.month].a1     += v;
    });
    const result: Tag0MonthlyGroup[] = [];
    for (const [tag0, t0Map] of map.entries()) {
      const items: Tag01MonthlyItem[] = [];
      const tag0ByMonth: Record<string, MonthData> = {};
      for (const [tag01, byMonth] of t0Map.entries()) {
        for (const [month, md] of Object.entries(byMonth)) {
          if (!tag0ByMonth[month]) tag0ByMonth[month] = { real: 0, orcado: 0, a1: 0 };
          tag0ByMonth[month].real   += md.real;
          tag0ByMonth[month].orcado += md.orcado;
          tag0ByMonth[month].a1     += md.a1;
        }
        items.push({ tag01, byMonth });
      }
      items.sort((a, b) => a.tag01.localeCompare(b.tag01));
      result.push({ tag0, byMonth: tag0ByMonth, items });
    }
    return result.sort((a, b) => a.tag0.localeCompare(b.tag0));
  }, [rows]);

  // ── Meses a exibir ────────────────────────────────────────────────────────
  const monthsToShow = useMemo(() => {
    const from = parseInt(monthFrom);
    const to   = parseInt(monthTo);
    const result: string[] = [];
    for (let m = from; m <= to; m++)
      result.push(`${year}-${String(m).padStart(2, '0')}`);
    return result;
  }, [year, monthFrom, monthTo]);

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
  const displayedMonthlyGroups = useMemo(
    () => showOnlyEbitda ? monthlyGroups.filter(g => EBITDA_PREFIXES.some(p => g.tag0.startsWith(p))) : monthlyGroups,
    [monthlyGroups, showOnlyEbitda],
  );

  // ── Linhas calculadas ────────────────────────────────────────────────────
  const sumPfx = (pfxs: string[]): CalcData =>
    groups.filter(g => pfxs.some(p => g.tag0.startsWith(p)))
          .reduce((a, g) => ({ real: a.real + g.real, orcado: a.orcado + g.orcado, a1: a.a1 + g.a1 }),
            { real: 0, orcado: 0, a1: 0 });

  const margemData = useMemo(() => sumPfx(['01.', '02.', '03.']),         [groups]);
  const ebitdaData = useMemo(() => sumPfx(['01.', '02.', '03.', '04.']), [groups]);

  // Dados mensais para MARGEM/EBITDA (visões Cenário e Mês)
  const monthlyCalcByPfx = useCallback((pfxs: string[]): Record<string, MonthData> => {
    const result: Record<string, MonthData> = {};
    monthlyGroups.filter(g => pfxs.some(p => g.tag0.startsWith(p))).forEach(g => {
      for (const [month, md] of Object.entries(g.byMonth)) {
        if (!result[month]) result[month] = { real: 0, orcado: 0, a1: 0 };
        result[month].real   += md.real;
        result[month].orcado += md.orcado;
        result[month].a1     += md.a1;
      }
    });
    return result;
  }, [monthlyGroups]);

  const monthlyMargemData = useMemo(() => monthlyCalcByPfx(['01.', '02.', '03.']),         [monthlyCalcByPfx]);
  const monthlyEbitdaData = useMemo(() => monthlyCalcByPfx(['01.', '02.', '03.', '04.']), [monthlyCalcByPfx]);

  // Totais mensais do rodapé
  const monthlyTotals = useMemo(() => {
    const result: Record<string, MonthData> = {};
    displayedMonthlyGroups.forEach(g => {
      for (const [month, md] of Object.entries(g.byMonth)) {
        if (!result[month]) result[month] = { real: 0, orcado: 0, a1: 0 };
        result[month].real   += md.real;
        result[month].orcado += md.orcado;
        result[month].a1     += md.a1;
      }
    });
    return result;
  }, [displayedMonthlyGroups]);

  const lastIdx = (pfx: string) => {
    let i = -1;
    displayedGroups.forEach((g, idx) => { if (g.tag0.startsWith(pfx)) i = idx; });
    return i;
  };
  const { lastIdx03, lastIdx04 } = useMemo(() => ({
    lastIdx03: lastIdx('03.'),
    lastIdx04: lastIdx('04.'),
  }), [displayedGroups]);

  // Mesmos índices para visões mensais (mesmos grupos, mesma ordem)
  const lastIdxM = (pfx: string) => {
    let i = -1;
    displayedMonthlyGroups.forEach((g, idx) => { if (g.tag0.startsWith(pfx)) i = idx; });
    return i;
  };
  const { lastIdx03M, lastIdx04M } = useMemo(() => ({
    lastIdx03M: lastIdxM('03.'),
    lastIdx04M: lastIdxM('04.'),
  }), [displayedMonthlyGroups]);

  // ── Helpers de drill-down ────────────────────────────────────────────────
  const SOMA_SCENARIOS = ['Real', 'Orçado', 'A-1'];
  const SOMA_DIMENSIONS = [
    { id: 'marca',       label: 'Marca' },
    { id: 'nome_filial', label: 'Filial' },
    { id: 'vendor',      label: 'Fornecedor' },
    { id: 'tag01',       label: 'Tag 01' },
    { id: 'tag02',       label: 'Tag 02' },
    { id: 'tag03',       label: 'Tag 03' },
  ];

  const getDrillTotal = (tag01: string, dim: string, scenario: string, dimVal: string, accFilters: Record<string, string> = {}): number => {
    const filtersKey = Object.entries(accFilters).sort().map(([k, v]) => `${k}=${v}`).join('&');
    const key = `${scenario}|${tag01}|${dim}|${filtersKey}`;
    return (dimensionCache[key] || [])
      .filter(r => r.dimension_value === dimVal)
      .reduce((s, r) => s + Number(r.total_amount), 0);
  };

  const getDrillMonthData = (tag01: string, dim: string, scenario: string, dimVal: string, accFilters: Record<string, string> = {}): Record<string, number> => {
    const filtersKey = Object.entries(accFilters).sort().map(([k, v]) => `${k}=${v}`).join('&');
    const key = `${scenario}|${tag01}|${dim}|${filtersKey}`;
    const out: Record<string, number> = {};
    (dimensionCache[key] || [])
      .filter(r => r.dimension_value === dimVal)
      .forEach(r => { out[r.year_month] = (out[r.year_month] || 0) + Number(r.total_amount); });
    return out;
  };

  const toggleGroup = (tag0: string) =>
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(tag0) ? n.delete(tag0) : n.add(tag0);
      return n;
    });

  // ── Exportar Excel ────────────────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    const wsData: any[][] = [
      ['Tag0', 'Tag01', 'Real', 'Orçado', 'Δ R−Orç', 'Δ% Orç', 'A-1', 'Δ R−A-1', 'Δ% A-1'],
    ];
    displayedGroups.forEach((g, idx) => {
      wsData.push([
        g.tag0, '— SUBTOTAL —', g.real, g.orcado,
        g.real - g.orcado, g.orcado !== 0 ? (g.real - g.orcado) / Math.abs(g.orcado) : null,
        g.a1, g.real - g.a1, g.a1 !== 0 ? (g.real - g.a1) / Math.abs(g.a1) : null,
      ]);
      g.items.forEach(r => wsData.push([
        g.tag0, r.tag01, r.real, r.orcado,
        r.real - r.orcado, r.orcado !== 0 ? (r.real - r.orcado) / Math.abs(r.orcado) : null,
        r.a1, r.real - r.a1, r.a1 !== 0 ? (r.real - r.a1) / Math.abs(r.a1) : null,
      ]));
      if (idx === lastIdx03) wsData.push(calcXlsxRow('▶ MARGEM DE CONTRIBUIÇÃO', margemData));
      if (idx === lastIdx04) wsData.push(calcXlsxRow('▶ EBITDA (S/ RATEIO RAIZ CSC)', ebitdaData));
      if (idx === lastIdx03 && lastIdx04 === -1) wsData.push(calcXlsxRow('▶ EBITDA (S/ RATEIO RAIZ CSC)', ebitdaData));
    });
    wsData.push(['TOTAL GERAL', '', totals.real, totals.orcado,
      totals.real - totals.orcado, totals.orcado !== 0 ? (totals.real - totals.orcado) / Math.abs(totals.orcado) : null,
      totals.a1, totals.real - totals.a1, totals.a1 !== 0 ? (totals.real - totals.a1) / Math.abs(totals.a1) : null,
    ]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    const per = monthFrom === '01' && monthTo === '12' ? year : `${year}_${monthFrom}-${monthTo}`;
    XLSX.utils.book_append_sheet(wb, ws, `SomaTags_${per}`);
    XLSX.writeFile(wb, `soma_tags_${per}.xlsx`);
  }, [displayedGroups, lastIdx03, lastIdx04, margemData, ebitdaData, totals, year, monthFrom, monthTo]);

  // Registra ações no App.tsx (header) — deve ficar após exportExcel e fetchData
  useEffect(() => {
    onRegisterActions?.({ refresh: fetchData, exportExcel });
  }, [onRegisterActions, fetchData, exportExcel]);

  // Sincroniza loading com App.tsx
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);

  // Sincroniza presença de dados com App.tsx
  useEffect(() => { onDataChange?.(groups.length > 0); }, [groups.length, onDataChange]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const tag01Count   = displayedGroups.reduce((s, g) => s + g.items.length, 0);
  const hasOrcado    = displayedGroups.some(g => g.orcado !== 0);
  const hasAnyFilter = selectedMarcas.length > 0 || selectedFiliais.length > 0;
  const scenarioCount = [showReal, showOrcado, showA1].filter(Boolean).length;
  // Contagem para Mês: inclui deltas quando ativos
  const mesColCount = [showReal, showOrcado, showDeltaAbsOrcado, showDeltaPercOrcado, showA1, showDeltaAbsA1, showDeltaPercA1].filter(Boolean).length;
  const mesFirstCol = showReal ? 'real' : showOrcado ? 'orcado' : showDeltaAbsOrcado ? 'deltaAbsOrcado' : showDeltaPercOrcado ? 'deltaPercOrcado' : showA1 ? 'a1' : showDeltaAbsA1 ? 'deltaAbsA1' : 'deltaPercA1';

  const QUARTERS = [
    { label: 'Ano', from: '01', to: '12', title: 'Ano completo' },
    { label: '1T',  from: '01', to: '03', title: '1º Trimestre (Jan–Mar)' },
    { label: '2T',  from: '04', to: '06', title: '2º Trimestre (Abr–Jun)' },
    { label: '3T',  from: '07', to: '09', title: '3º Trimestre (Jul–Set)' },
    { label: '4T',  from: '10', to: '12', title: '4º Trimestre (Out–Dez)' },
  ];
  const isQuarterActive = (q: typeof QUARTERS[0]) => monthFrom === q.from && monthTo === q.to;

  const badge = (key: string) => {
    const idx = activeElements.indexOf(key);
    if (idx < 0) return null;
    return <span className="ml-0.5 bg-white/30 px-0.5 rounded text-[7px]">{idx + 1}º</span>;
  };

  // Estilos comuns para cabeçalho de cenário nas visões mensais
  const scenarioHeaderBg: Record<string, string> = {
    Real:   'bg-gradient-to-r from-blue-600 to-blue-500',
    Orçado: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    'A-1':  'bg-gradient-to-r from-purple-600 to-purple-500',
  };
  const scenarioSubBg: Record<string, string> = {
    Real:   'bg-gradient-to-br from-blue-500 to-blue-600',
    Orçado: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'A-1':  'bg-gradient-to-br from-purple-500 to-purple-600',
  };

  // ── renderDrillRows (hierárquico — recursivo por nível) ─────────────────
  const renderDrillRows = (
    tag01: string, tag0: string,
    dimIndex: number = 0,
    accFilters: Record<string, string> = {},
    depth: number = 0,
  ): React.ReactNode => {
    if (drillDimensions.length === 0 || dimIndex >= drillDimensions.length) return null;

    const dim         = drillDimensions[dimIndex];
    const hasChildren = dimIndex < drillDimensions.length - 1;
    const filtersKey  = Object.entries(accFilters).sort().map(([k, v]) => `${k}=${v}`).join('&');
    const indentPx    = 40 + depth * 20; // 40px base + 20px per depth

    // Verifica/dispara carregamento para cada cenário
    let allLoaded = true;
    for (const sc of SOMA_SCENARIOS) {
      const cacheKey = `${sc}|${tag01}|${dim}|${filtersKey}`;
      if (!(cacheKey in dimensionCache)) {
        allLoaded = false;
        loadDrillData(tag01, tag0, sc, dim, accFilters);
      }
    }

    if (!allLoaded) {
      return (
        <tr key={`drill-loading-${tag01}-${dim}-${depth}-${filtersKey}`} className="bg-yellow-50">
          <td colSpan={100} className="py-1 text-[9px] text-gray-500 italic" style={{ paddingLeft: `${indentPx}px` }}>
            Carregando...
          </td>
        </tr>
      );
    }

    // Valores únicos consolidados dos 3 cenários
    const allVals = new Set<string>();
    for (const sc of SOMA_SCENARIOS) {
      const cacheKey = `${sc}|${tag01}|${dim}|${filtersKey}`;
      (dimensionCache[cacheKey] || []).forEach(r => { if (r.dimension_value) allVals.add(r.dimension_value); });
    }
    let vals = Array.from(allVals);

    if (dimensionSort === 'alpha') {
      vals.sort((a, b) => a.localeCompare(b));
    } else if (dimensionSort === 'desc') {
      vals.sort((a, b) => getDrillTotal(tag01, dim, 'Real', b, accFilters) - getDrillTotal(tag01, dim, 'Real', a, accFilters));
    } else {
      vals.sort((a, b) => getDrillTotal(tag01, dim, 'Real', a, accFilters) - getDrillTotal(tag01, dim, 'Real', b, accFilters));
    }

    if (vals.length === 0) {
      return (
        <tr key={`drill-empty-${tag01}-${dim}-${depth}-${filtersKey}`} className="bg-yellow-50">
          <td colSpan={100} className="py-1 text-[9px] text-gray-400 italic" style={{ paddingLeft: `${indentPx}px` }}>Sem dados</td>
        </tr>
      );
    }

    // Cores por profundidade
    const bgBase    = depth === 0 ? 'bg-amber-50/60' : depth === 1 ? 'bg-blue-50/40' : 'bg-gray-50';
    const markerClr = depth === 0 ? 'text-amber-500'  : 'text-blue-400';
    const marker    = depth === 0 ? '◆' : '◇';

    return vals.map(val => {
      const drillKey   = `${tag01}|${dim}|${val}|${filtersKey}`;
      const isExpanded = hasChildren && !!expandedDrillRows[drillKey];

      const real   = getDrillTotal(tag01, dim, 'Real',   val, accFilters);
      const orcado = getDrillTotal(tag01, dim, 'Orçado', val, accFilters);
      const a1     = getDrillTotal(tag01, dim, 'A-1',    val, accFilters);
      const dOrç = real - orcado; const dA1 = real - a1;
      const rHasOrc = orcado !== 0; const rHasA1 = a1 !== 0;

      const labelContent = (
        <div className="flex items-center gap-0.5" style={{ paddingLeft: `${indentPx - 8}px` }}>
          {hasChildren
            ? <button onClick={() => setExpandedDrillRows(prev => ({ ...prev, [drillKey]: !prev[drillKey] }))}
                className="shrink-0 text-gray-400 hover:text-gray-700 mr-0.5">
                {isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
              </button>
            : <span className="inline-block w-[9px] shrink-0" />
          }
          <span className={`${markerClr} shrink-0`}>{marker}</span>
          <span className="ml-0.5 truncate">{val}</span>
        </div>
      );

      const children = hasChildren && isExpanded
        ? renderDrillRows(tag01, tag0, dimIndex + 1, { ...accFilters, [dim]: val }, depth + 1)
        : null;

      const trCls   = `group ${bgBase} border-b border-amber-100 hover:bg-yellow-50 transition-colors`;
      const col1Cls = `px-2 py-0.5 w-8 sticky left-0 z-20 ${bgBase} group-hover:bg-yellow-50 transition-colors`;
      const col2Cls = `py-0.5 pr-2 text-gray-700 font-semibold truncate sticky left-8 z-20 w-[280px] text-[9px] ${bgBase} group-hover:bg-yellow-50 transition-colors`;

      if (viewMode === 'consolidado') {
        return (
          <React.Fragment key={`drill-frag-${dim}-${tag01}-${val}-${filtersKey}`}>
            <tr className={trCls}>
              <td className={col1Cls} />
              <td className={col2Cls}>{labelContent}</td>
              {cols.real            && <td className="px-2 py-0.5 text-right font-mono text-gray-800 text-[10px] border-r border-gray-100">{fmt(real)}</td>}
              {cols.orcado          && <td className={`px-2 py-0.5 text-right font-mono text-[10px] ${rHasOrc ? 'text-gray-800' : 'text-gray-300'}`}>{rHasOrc ? fmt(orcado) : '—'}</td>}
              {cols.deltaAbsOrcado  && <td className={`px-2 py-0.5 text-right font-mono text-[10px] ${rHasOrc ? deltaClass(dOrç, orcado) : 'text-gray-300'}`}>{rHasOrc ? fmt(dOrç) : '—'}</td>}
              {cols.deltaPercOrcado && <td className={`px-2 py-0.5 text-right font-mono text-[10px] border-r border-gray-200 ${rHasOrc ? deltaClass(dOrç, orcado) : 'text-gray-300'}`}>{rHasOrc ? fmtPct(real, orcado) : '—'}</td>}
              {cols.a1              && <td className={`px-2 py-0.5 text-right font-mono text-[10px] ${rHasA1 ? 'text-gray-800' : 'text-gray-300'}`}>{rHasA1 ? fmt(a1) : '—'}</td>}
              {cols.deltaAbsA1      && <td className={`px-2 py-0.5 text-right font-mono text-[10px] ${rHasA1 ? deltaClass(dA1, a1) : 'text-gray-300'}`}>{rHasA1 ? fmt(dA1) : '—'}</td>}
              {cols.deltaPercA1     && <td className={`px-2 py-0.5 text-right font-mono text-[10px] ${rHasA1 ? deltaClass(dA1, a1) : 'text-gray-300'}`}>{rHasA1 ? fmtPct(real, a1) : '—'}</td>}
            </tr>
            {children}
          </React.Fragment>
        );
      }

      if (viewMode === 'cenario') {
        const realByM = getDrillMonthData(tag01, dim, 'Real',   val, accFilters);
        const orcByM  = getDrillMonthData(tag01, dim, 'Orçado', val, accFilters);
        const a1ByM   = getDrillMonthData(tag01, dim, 'A-1',    val, accFilters);
        const dOrçT = real - orcado; const dA1T = real - a1;
        const hOrc = orcado !== 0; const hA1 = a1 !== 0;
        return (
          <React.Fragment key={`drill-frag-${dim}-${tag01}-${val}-${filtersKey}`}>
            <tr className={trCls}>
              <td className={col1Cls} />
              <td className={col2Cls}>{labelContent}</td>
              {showReal   && <>{monthsToShow.map(m => { const v = realByM[m] || 0; return <td key={`r-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] bg-blue-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(real)}</td></>}
              {showOrcado && <>{monthsToShow.map(m => { const v = orcByM[m]  || 0; return <td key={`o-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] bg-emerald-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(orcado)}</td></>}
              {showA1     && <>{monthsToShow.map(m => { const v = a1ByM[m]   || 0; return <td key={`a-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] bg-purple-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(a1)}</td></>}
              {showDeltaAbsOrcado  && <>{monthsToShow.map(m => { const rv = realByM[m]||0; const ov = orcByM[m]||0; const d = rv-ov; const h = ov!==0; return <td key={`dao-${m}`} className={`px-1 py-0.5 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d,ov) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT,orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></>}
              {showDeltaPercOrcado && <>{monthsToShow.map(m => { const rv = realByM[m]||0; const ov = orcByM[m]||0; const d = rv-ov; const h = ov!==0; return <td key={`dpo-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d,ov) : 'text-gray-300'}`}>{h ? fmtPct(rv,ov) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT,orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(real,orcado) : '—'}</td></>}
              {showDeltaAbsA1      && <>{monthsToShow.map(m => { const rv = realByM[m]||0; const av = a1ByM[m]||0; const d = rv-av; const h = av!==0; return <td key={`da1-${m}`} className={`px-1 py-0.5 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d,av) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T,a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></>}
              {showDeltaPercA1     && <>{monthsToShow.map(m => { const rv = realByM[m]||0; const av = a1ByM[m]||0; const d = rv-av; const h = av!==0; return <td key={`dp1-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d,av) : 'text-gray-300'}`}>{h ? fmtPct(rv,av) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T,a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(real,a1) : '—'}</td></>}
            </tr>
            {children}
          </React.Fragment>
        );
      }

      if (viewMode === 'mes') {
        const realByM = getDrillMonthData(tag01, dim, 'Real',   val, accFilters);
        const orcByM  = getDrillMonthData(tag01, dim, 'Orçado', val, accFilters);
        const a1ByM   = getDrillMonthData(tag01, dim, 'A-1',    val, accFilters);
        const dOrçT = real - orcado; const dA1T = real - a1;
        const hOrc = orcado !== 0; const hA1 = a1 !== 0;
        return (
          <React.Fragment key={`drill-frag-${dim}-${tag01}-${val}-${filtersKey}`}>
            <tr className={trCls}>
              <td className={col1Cls} />
              <td className={col2Cls}>{labelContent}</td>
              {monthsToShow.map(m => {
                const rv = realByM[m]||0; const ov = orcByM[m]||0; const av = a1ByM[m]||0;
                const dOrçM = rv-ov; const dA1M = rv-av;
                return (
                  <React.Fragment key={m}>
                    {showReal            && <td className={`px-1 py-0.5 text-right font-mono text-gray-800 text-[10px] w-[80px] ${mesFirstCol==='real'?'border-l-2 border-l-gray-200':''}`}>{rv!==0?fmtK(rv):<span className="text-gray-300">—</span>}</td>}
                    {showOrcado          && <td className={`px-1 py-0.5 text-right font-mono text-gray-600 text-[10px] w-[80px] ${mesFirstCol==='orcado'?'border-l-2 border-l-gray-200':''}`}>{ov!==0?fmtK(ov):<span className="text-gray-300">—</span>}</td>}
                    {showDeltaAbsOrcado  && <td className={`px-0.5 py-0.5 text-right font-mono text-[10px] w-[85px] ${ov!==0?deltaClass(dOrçM,ov):'text-gray-300'} ${mesFirstCol==='deltaAbsOrcado'?'border-l-2 border-l-gray-200':''}`}>{ov!==0?fmtK(dOrçM):'—'}</td>}
                    {showDeltaPercOrcado && <td className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${ov!==0?deltaClass(dOrçM,ov):'text-gray-300'} ${mesFirstCol==='deltaPercOrcado'?'border-l-2 border-l-gray-200':''}`}>{ov!==0?fmtPct(rv,ov):'—'}</td>}
                    {showA1              && <td className={`px-1 py-0.5 text-right font-mono text-gray-600 text-[10px] w-[80px] ${mesFirstCol==='a1'?'border-l-2 border-l-gray-200':''}`}>{av!==0?fmtK(av):<span className="text-gray-300">—</span>}</td>}
                    {showDeltaAbsA1      && <td className={`px-0.5 py-0.5 text-right font-mono text-[10px] w-[85px] ${av!==0?deltaClass(dA1M,av):'text-gray-300'} ${mesFirstCol==='deltaAbsA1'?'border-l-2 border-l-gray-200':''}`}>{av!==0?fmtK(dA1M):'—'}</td>}
                    {showDeltaPercA1     && <td className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${av!==0?deltaClass(dA1M,av):'text-gray-300'}`}>{av!==0?fmtPct(rv,av):'—'}</td>}
                  </React.Fragment>
                );
              })}
              {showReal            && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-blue-50 text-[#152e55] ${mesFirstCol==='real'?'border-l-2 border-l-gray-200':''}`}>{fmtK(real)}</td>}
              {showOrcado          && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-green-50 text-green-900 ${mesFirstCol==='orcado'?'border-l-2 border-l-gray-200':''}`}>{fmtK(orcado)}</td>}
              {showDeltaAbsOrcado  && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-green-50 ${mesFirstCol==='deltaAbsOrcado'?'border-l-2 border-l-gray-200':''} ${hOrc?deltaClass(dOrçT,orcado):'text-gray-300'}`}>{hOrc?fmtK(dOrçT):'—'}</td>}
              {showDeltaPercOrcado && <td className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-green-50 ${mesFirstCol==='deltaPercOrcado'?'border-l-2 border-l-gray-200':''} ${hOrc?deltaClass(dOrçT,orcado):'text-gray-300'}`}>{hOrc?fmtPct(real,orcado):'—'}</td>}
              {showA1              && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-purple-50 text-purple-900 ${mesFirstCol==='a1'?'border-l-2 border-l-gray-200':''}`}>{fmtK(a1)}</td>}
              {showDeltaAbsA1      && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-purple-50 ${mesFirstCol==='deltaAbsA1'?'border-l-2 border-l-gray-200':''} ${hA1?deltaClass(dA1T,a1):'text-gray-300'}`}>{hA1?fmtK(dA1T):'—'}</td>}
              {showDeltaPercA1     && <td className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-purple-50 ${hA1?deltaClass(dA1T,a1):'text-gray-300'}`}>{hA1?fmtPct(real,a1):'—'}</td>}
            </tr>
            {children}
          </React.Fragment>
        );
      }

      return null;
    });
  };

  // Helper: linha de CalcRow mensal (Cenário e Mês usam a mesma estrutura)
  const renderMonthlyCalcRow = (label: string, byMonth: Record<string, MonthData>, totData: CalcData, borderTop: boolean) => (
    <tr className={`group bg-[#F44C00] text-white font-black text-[10px] h-6 shadow-sm
                   ${borderTop ? 'border-t-2 border-yellow-400' : ''}`}>
      <td colSpan={2}
          className="sticky left-0 bg-[#F44C00] z-20 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
        <div className="flex items-center gap-1 px-2 uppercase tracking-tighter truncate font-black">
          <Activity size={12} /> {label}
        </div>
      </td>
      {viewMode === 'cenario' && (() => {
        const dOrçT = totData.real - totData.orcado; const dA1T = totData.real - totData.a1;
        const hOrc = totData.orcado !== 0; const hA1 = totData.a1 !== 0;
        return (
          <>
            {showReal   && <>{monthsToShow.map(m => { const v = byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 text-right font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-right font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.real)}</td></>}
            {showOrcado && <>{monthsToShow.map(m => { const v = byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 text-right font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-right font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.orcado)}</td></>}
            {showA1     && <>{monthsToShow.map(m => { const v = byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 text-right font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-right font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.a1)}</td></>}
            {showDeltaAbsOrcado  && <>{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dao-${m}`} className={`px-1 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d, md.orcado, true) : 'text-orange-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 text-right font-mono font-black border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></>}
            {showDeltaPercOrcado && <>{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dpo-${m}`} className={`px-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado, true) : 'text-orange-300'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtPct(totData.real, totData.orcado) : '—'}</td></>}
            {showDeltaAbsA1      && <>{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`da1-${m}`} className={`px-1 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d, md.a1, true) : 'text-orange-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 text-right font-mono font-black border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></>}
            {showDeltaPercA1     && <>{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`dp1-${m}`} className={`px-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1, true) : 'text-orange-300'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtPct(totData.real, totData.a1) : '—'}</td></>}
          </>
        );
      })()}
      {viewMode === 'mes' && (
        <>
          {monthsToShow.map(m => {
            const md = byMonth[m] || { real: 0, orcado: 0, a1: 0 };
            const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
            return (
              <React.Fragment key={m}>
                {showReal            && <td className={`px-1 text-right font-mono w-[80px] hover:bg-yellow-100/40 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.real)}</td>}
                {showOrcado          && <td className={`px-1 text-right font-mono w-[80px] hover:bg-yellow-100/40 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.orcado)}</td>}
                {showDeltaAbsOrcado  && <td className={`px-0.5 text-right font-mono text-[10px] font-black w-[85px] ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado, true) : 'text-orange-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/30' : ''}`}>{md.orcado !== 0 ? fmtK(dOrçM) : '—'}</td>}
                {showDeltaPercOrcado && <td className={`px-0.5 text-center text-[9px] w-[70px] ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado, true) : 'text-orange-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtPct(md.real, md.orcado)}</td>}
                {showA1              && <td className={`px-1 text-right font-mono w-[80px] hover:bg-yellow-100/40 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.a1)}</td>}
                {showDeltaAbsA1      && <td className={`px-0.5 text-right font-mono text-[10px] font-black w-[85px] ${md.a1 !== 0 ? deltaClass(dA1M, md.a1, true) : 'text-orange-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/30' : ''}`}>{md.a1 !== 0 ? fmtK(dA1M) : '—'}</td>}
                {showDeltaPercA1     && <td className="px-0.5 text-center text-[9px] w-[70px] text-orange-300">{fmtPct(md.real, md.a1)}</td>}
              </React.Fragment>
            );
          })}
          {(() => {
            const dOrçT = totData.real - totData.orcado; const dA1T = totData.real - totData.a1;
            const hOrc = totData.orcado !== 0; const hA1 = totData.a1 !== 0;
            return (<>
              {showReal            && <td className={`px-1 text-right font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-200 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.real)}</td>}
              {showOrcado          && <td className={`px-1 text-right font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-200 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.orcado)}</td>}
              {showDeltaAbsOrcado  && <td className={`px-0.5 text-right font-mono text-[10px] font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/30' : ''} ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>}
              {showDeltaPercOrcado && <td className={`px-0.5 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/30' : ''} ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{fmtPct(totData.real, totData.orcado)}</td>}
              {showA1              && <td className={`px-1 text-right font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-200 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.a1)}</td>}
              {showDeltaAbsA1      && <td className={`px-0.5 text-right font-mono text-[10px] font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/30' : ''} ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>}
              {showDeltaPercA1     && <td className={`px-0.5 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{fmtPct(totData.real, totData.a1)}</td>}
            </>);
          })()}
        </>
      )}
    </tr>
  );

  // ── Estilos de linha compartilhados ──────────────────────────────────────
  const TAG0_TR   = 'group bg-[#152e55] text-white font-black cursor-pointer hover:bg-[#1e3d6e] transition-colors h-7';
  const TAG0_STICKY = 'sticky left-0 z-30 bg-[#152e55] group-hover:bg-[#1e3d6e] transition-colors';
  const TAG0_LABEL  = `px-2 py-1 font-black uppercase tracking-tight text-[9px] truncate sticky left-8 z-30 bg-[#152e55] group-hover:bg-[#1e3d6e] transition-colors w-[280px]`;

  // ── Render: Cabeçalho de Cenário ──────────────────────────────────────────
  const renderCenarioHeader = () => (
    <thead className="sticky top-0 z-50 shadow-lg whitespace-nowrap">
      <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white h-7">
        <th colSpan={2} rowSpan={2} className="sticky left-0 z-[60] bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle">
          CONTAS GERENCIAIS
        </th>
        {showReal   && <th colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['Real']}`}>REAL</th>}
        {showOrcado && <th colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['Orçado']}`}>ORÇADO</th>}
        {showA1     && <th colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['A-1']}`}>A-1</th>}
        {showDeltaAbsOrcado  && <th colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-teal-700 to-teal-600">ΔR$ Orç</th>}
        {showDeltaPercOrcado && <th colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-teal-700 to-teal-600">Δ% Orç</th>}
        {showDeltaAbsA1      && <th colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-violet-700 to-violet-600">ΔR$ A-1</th>}
        {showDeltaPercA1     && <th colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-violet-700 to-violet-600">Δ% A-1</th>}
      </tr>
      <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white h-6">
        {showReal   && <>{monthsToShow.map(m => <th key={`r-${m}`} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] ${scenarioSubBg['Real']}`}>{getML(m)}</th>)}<th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 ${scenarioSubBg['Real']}`}>Total</th></>}
        {showOrcado && <>{monthsToShow.map(m => <th key={`o-${m}`} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] ${scenarioSubBg['Orçado']}`}>{getML(m)}</th>)}<th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 ${scenarioSubBg['Orçado']}`}>Total</th></>}
        {showA1     && <>{monthsToShow.map(m => <th key={`a-${m}`} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] ${scenarioSubBg['A-1']}`}>{getML(m)}</th>)}<th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 ${scenarioSubBg['A-1']}`}>Total</th></>}
        {showDeltaAbsOrcado  && <>{monthsToShow.map(m => <th key={`dao-${m}`} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-gradient-to-br from-teal-500 to-teal-600">{getML(m)}</th>)}<th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 bg-gradient-to-br from-teal-500 to-teal-600">Total</th></>}
        {showDeltaPercOrcado && <>{monthsToShow.map(m => <th key={`dpo-${m}`} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-gradient-to-br from-teal-500 to-teal-600">{getML(m)}</th>)}<th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 bg-gradient-to-br from-teal-500 to-teal-600">Total</th></>}
        {showDeltaAbsA1      && <>{monthsToShow.map(m => <th key={`da1-${m}`} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-gradient-to-br from-violet-500 to-violet-600">{getML(m)}</th>)}<th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 bg-gradient-to-br from-violet-500 to-violet-600">Total</th></>}
        {showDeltaPercA1     && <>{monthsToShow.map(m => <th key={`dp1-${m}`} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-gradient-to-br from-violet-500 to-violet-600">{getML(m)}</th>)}<th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 bg-gradient-to-br from-violet-500 to-violet-600">Total</th></>}
      </tr>
    </thead>
  );

  // ── Render: Cabeçalho de Mês ──────────────────────────────────────────────
  const renderMesHeader = () => (
    <thead className="sticky top-0 z-50 shadow-lg whitespace-nowrap">
      <tr className="text-white h-7">
        <th colSpan={2} rowSpan={2} className="sticky left-0 z-[60] bg-[#152e55] px-3 py-0.5 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle">
          CONTAS GERENCIAIS
        </th>
        {monthsToShow.map(m => (
          <th key={m} colSpan={mesColCount} className="px-1.5 py-0.5 text-center text-[9px] font-black uppercase tracking-widest border-l-2 border-l-white/20 border-b border-white/10 bg-[#1B75BB] shadow-sm">
            {getML(m)}
          </th>
        ))}
        <th colSpan={mesColCount} className="px-1.5 py-0.5 text-center text-[9px] font-black uppercase tracking-widest border-l-2 border-l-white/20 border-b border-white/10 bg-[#152e55] shadow-sm">
          Total
        </th>
      </tr>
      <tr className="text-white h-6">
        {monthsToShow.map(m => (
          <React.Fragment key={m}>
            {showReal            && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>Real</th>}
            {showOrcado          && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>Orç</th>}
            {showDeltaAbsOrcado  && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[85px] bg-[#1B75BB] ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrçR$</th>}
            {showDeltaPercOrcado && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-[#1B75BB] ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrç%</th>}
            {showA1              && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>A-1</th>}
            {showDeltaAbsA1      && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[85px] bg-[#1B75BB] ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>ΔA-1R$</th>}
            {showDeltaPercA1     && <th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-[#1B75BB]">ΔA-1%</th>}
          </React.Fragment>
        ))}
        {showReal            && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>Real</th>}
        {showOrcado          && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>Orç</th>}
        {showDeltaAbsOrcado  && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrçR$</th>}
        {showDeltaPercOrcado && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrç%</th>}
        {showA1              && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>A-1</th>}
        {showDeltaAbsA1      && <th className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>ΔA-1R$</th>}
        {showDeltaPercA1     && <th className="px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55]">ΔA-1%</th>}
      </tr>
    </thead>
  );

  // ── Render: Body mensal (shared entre Cenário e Mês) ─────────────────────
  const renderMonthlyBody = () => (
    <tbody className="bg-white">
      {displayedMonthlyGroups.map((g, idx) => {
        const isOpen = !collapsed.has(g.tag0);
        return (
          <React.Fragment key={g.tag0}>
            {/* Tag0 */}
            <tr className={TAG0_TR}>
              <td className={`px-2 py-1 text-center w-8 ${TAG0_STICKY}`}>
                {isOpen
                  ? <ChevronDown  size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />
                  : <ChevronRight size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />}
              </td>
              <td className={TAG0_LABEL} onClick={() => toggleGroup(g.tag0)}>{g.tag0}</td>

              {viewMode === 'cenario' && (() => {
                const gTot = Object.values(g.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 });
                const dOrçT = gTot.real - gTot.orcado; const dA1T = gTot.real - gTot.a1;
                const hOrc = gTot.orcado !== 0; const hA1 = gTot.a1 !== 0;
                return (
                  <>
                    {showReal   && <>{monthsToShow.map(m => { const v = g.byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 py-1 text-right font-mono font-black text-[10px] w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 py-1 text-right font-mono font-black text-[10px] border-l border-white/20 bg-blue-900/30 w-[80px]">{fmtK(gTot.real)}</td></>}
                    {showOrcado && <>{monthsToShow.map(m => { const v = g.byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 py-1 text-right font-mono font-black text-[10px] w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 py-1 text-right font-mono font-black text-[10px] border-l border-white/20 bg-emerald-900/30 w-[80px]">{fmtK(gTot.orcado)}</td></>}
                    {showA1     && <>{monthsToShow.map(m => { const v = g.byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 py-1 text-right font-mono font-black text-[10px] w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 py-1 text-right font-mono font-black text-[10px] border-l border-white/20 bg-purple-900/30 w-[80px]">{fmtK(gTot.a1)}</td></>}
                    {showDeltaAbsOrcado  && <>{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dao-${m}`} className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, gTot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></>}
                    {showDeltaPercOrcado && <>{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, gTot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(gTot.real, gTot.orcado) : '—'}</td></>}
                    {showDeltaAbsA1      && <>{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`da1-${m}`} className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, gTot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></>}
                    {showDeltaPercA1     && <>{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, gTot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(gTot.real, gTot.a1) : '—'}</td></>}
                  </>
                );
              })()}
              {viewMode === 'mes' && (() => {
                const gTot = Object.values(g.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 });
                const dOrçT = gTot.real - gTot.orcado; const dA1T = gTot.real - gTot.a1;
                const hOrc = gTot.orcado !== 0; const hA1 = gTot.a1 !== 0;
                return (
                  <>
                    {monthsToShow.map(m => {
                      const md = g.byMonth[m] || { real: 0, orcado: 0, a1: 0 };
                      const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                      return (
                        <React.Fragment key={m}>
                          {showReal            && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[80px] cursor-pointer hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.real)}</td>}
                          {showOrcado          && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[80px] cursor-pointer hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.orcado)}</td>}
                          {showDeltaAbsOrcado  && <td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] w-[85px] bg-white/10 ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{md.orcado !== 0 ? fmtK(dOrçM) : '—'}</td>}
                          {showDeltaPercOrcado && <td className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtPct(md.real, md.orcado)}</td>}
                          {showA1              && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[80px] cursor-pointer hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.a1)}</td>}
                          {showDeltaAbsA1      && <td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] w-[85px] bg-white/10 ${md.a1 !== 0 ? deltaClass(dA1M, md.a1) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>{md.a1 !== 0 ? fmtK(dA1M) : '—'}</td>}
                          {showDeltaPercA1     && <td className="px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 text-gray-300">{fmtPct(md.real, md.a1)}</td>}
                        </React.Fragment>
                      );
                    })}
                    {showReal            && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[100px] bg-[#1B75BB] hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(gTot.real)}</td>}
                    {showOrcado          && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[100px] bg-green-600 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(gTot.orcado)}</td>}
                    {showDeltaAbsOrcado  && <td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, gTot.orcado, true) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>}
                    {showDeltaPercOrcado && <td className={`px-0.5 py-1 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, gTot.orcado, true) : 'text-gray-300'}`}>{fmtPct(gTot.real, gTot.orcado)}</td>}
                    {showA1              && <td className={`px-1 py-1 text-right font-mono font-black text-[10px] w-[100px] bg-purple-600 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(gTot.a1)}</td>}
                    {showDeltaAbsA1      && <td className={`px-0.5 py-1 text-right font-mono font-black text-[10px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''} ${hA1 ? deltaClass(dA1T, gTot.a1, true) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>}
                    {showDeltaPercA1     && <td className={`px-0.5 py-1 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, gTot.a1, true) : 'text-gray-300'}`}>{fmtPct(gTot.real, gTot.a1)}</td>}
                  </>
                );
              })()}
            </tr>

            {/* Tag01 */}
            {isOpen && g.items.map((r, i) => {
              const rowKey = `${g.tag0}|${r.tag01}`;
              const isDrillExpanded = expandedTag01s[rowKey];
              return (
                <React.Fragment key={r.tag01}>
                <tr className="group bg-gray-100 border-b border-gray-200 hover:bg-yellow-100/60 transition-colors">
                  <td className="px-2 py-1 w-8 sticky left-0 z-20 bg-gray-100 group-hover:bg-yellow-100 transition-colors">
                    {drillDimensions.length > 0 && (
                      <button onClick={() => setExpandedTag01s(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))} className="text-gray-400 hover:text-amber-600 transition-colors">
                        {isDrillExpanded ? <ChevronDown size={10} className="inline" /> : <ChevronRight size={10} className="inline" />}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-1 pl-6 text-gray-950 font-extrabold truncate sticky left-8 z-20 w-[280px] bg-gray-100 group-hover:bg-yellow-100 transition-colors">
                    {r.tag01}
                  </td>
                  {viewMode === 'cenario' && (() => {
                    const tot = r.byMonth ? Object.values(r.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 }) : { real: 0, orcado: 0, a1: 0 };
                    const dOrçT = tot.real - tot.orcado; const dA1T = tot.real - tot.a1;
                    const hOrc = tot.orcado !== 0; const hA1 = tot.a1 !== 0;
                    return (
                      <>
                        {showReal   && <>{monthsToShow.map(m => { const v = r.byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] bg-blue-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(tot.real)}</td></>}
                        {showOrcado && <>{monthsToShow.map(m => { const v = r.byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] bg-emerald-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(tot.orcado)}</td></>}
                        {showA1     && <>{monthsToShow.map(m => { const v = r.byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] w-[70px]">{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] bg-purple-50 border-l border-gray-200 font-semibold w-[80px]">{fmtK(tot.a1)}</td></>}
                        {showDeltaAbsOrcado  && <>{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dao-${m}`} className={`px-1 py-0.5 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtK(d) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></>}
                        {showDeltaPercOrcado && <>{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.orcado) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(tot.real, tot.orcado) : '—'}</td></>}
                        {showDeltaAbsA1      && <>{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`da1-${m}`} className={`px-1 py-0.5 text-right font-mono text-[10px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtK(d) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></>}
                        {showDeltaPercA1     && <>{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.a1) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(tot.real, tot.a1) : '—'}</td></>}
                      </>
                    );
                  })()}
                  {viewMode === 'mes' && (() => {
                    const tot = r.byMonth ? Object.values(r.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 }) : { real: 0, orcado: 0, a1: 0 };
                    const dOrçT = tot.real - tot.orcado; const dA1T = tot.real - tot.a1;
                    const hOrc = tot.orcado !== 0; const hA1 = tot.a1 !== 0;
                    return (
                      <>
                        {monthsToShow.map(m => {
                          const md = r.byMonth[m] || { real: 0, orcado: 0, a1: 0 };
                          const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                          return (
                            <React.Fragment key={m}>
                              {showReal            && <td className={`px-1 py-0.5 text-right font-mono text-gray-900 text-[10px] w-[80px] hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.real   !== 0 ? fmtK(md.real)   : <span className="text-gray-300">—</span>}</td>}
                              {showOrcado          && <td className={`px-1 py-0.5 text-right font-mono text-gray-600 text-[10px] w-[80px] hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.orcado !== 0 ? fmtK(md.orcado) : <span className="text-gray-300">—</span>}</td>}
                              {showDeltaAbsOrcado  && <td className={`px-0.5 py-0.5 text-right font-mono text-[10px] w-[85px] ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.orcado !== 0 ? fmtK(dOrçM) : <span className="text-gray-300">—</span>}</td>}
                              {showDeltaPercOrcado && <td className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.orcado !== 0 ? fmtPct(md.real, md.orcado) : <span className="text-gray-300">—</span>}</td>}
                              {showA1              && <td className={`px-1 py-0.5 text-right font-mono text-gray-600 text-[10px] w-[80px] hover:bg-yellow-100/60 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.a1 !== 0 ? fmtK(md.a1) : <span className="text-gray-300">—</span>}</td>}
                              {showDeltaAbsA1      && <td className={`px-0.5 py-0.5 text-right font-mono text-[10px] w-[85px] ${md.a1 !== 0 ? deltaClass(dA1M, md.a1) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.a1 !== 0 ? fmtK(dA1M) : <span className="text-gray-300">—</span>}</td>}
                              {showDeltaPercA1     && <td className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${md.a1 !== 0 ? deltaClass(dA1M, md.a1) : 'text-gray-300'}`}>{md.a1 !== 0 ? fmtPct(md.real, md.a1) : <span className="text-gray-300">—</span>}</td>}
                            </React.Fragment>
                          );
                        })}
                        {showReal            && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-blue-50 text-[#152e55] hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-gray-200' : ''}`}>{fmtK(tot.real)}</td>}
                        {showOrcado          && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-green-50 text-green-900 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{fmtK(tot.orcado)}</td>}
                        {showDeltaAbsOrcado  && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-green-50 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-gray-200' : ''} ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>}
                        {showDeltaPercOrcado && <td className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-green-50 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-gray-200' : ''} ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(tot.real, tot.orcado) : '—'}</td>}
                        {showA1              && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-purple-50 text-purple-900 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-gray-200' : ''}`}>{fmtK(tot.a1)}</td>}
                        {showDeltaAbsA1      && <td className={`px-1 py-0.5 text-right font-mono font-semibold text-[10px] w-[100px] bg-purple-50 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-gray-200' : ''} ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>}
                        {showDeltaPercA1     && <td className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-purple-50 ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(tot.real, tot.a1) : '—'}</td>}
                      </>
                    );
                  })()}
                </tr>
                {drillDimensions.length > 0 && isDrillExpanded && renderDrillRows(r.tag01, g.tag0)}
                </React.Fragment>
              );
            })}

            {/* CalcRows */}
            {idx === lastIdx03M && renderMonthlyCalcRow('MARGEM DE CONTRIBUIÇÃO', monthlyMargemData, margemData, true)}
            {idx === lastIdx04M && renderMonthlyCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', monthlyEbitdaData, ebitdaData, true)}
            {idx === lastIdx03M && lastIdx04M === -1 && renderMonthlyCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', monthlyEbitdaData, ebitdaData, false)}
          </React.Fragment>
        );
      })}
    </tbody>
  );

  // ── Render: Rodapé mensal ─────────────────────────────────────────────────
  const renderMonthlyFooter = () => {
    const footerLabel = showOnlyEbitda ? 'EBITDA TOTAL' : 'TOTAL GERAL';
    return (
      <tfoot className="sticky bottom-0 z-40">
        <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-black text-[10px] shadow-[0_-2px_6px_rgba(0,0,0,0.3)] border-t-2 border-yellow-400">
          <td colSpan={2} className="py-2 uppercase tracking-tight font-black sticky left-0 z-50 bg-gradient-to-r from-slate-800 to-slate-700 ">
            <div className="flex items-center gap-1 px-2">
              {showOnlyEbitda && <Activity size={12} />}
              <span>{footerLabel}</span>
            </div>
          </td>
          {viewMode === 'cenario' && (() => {
            const dOrçT = totals.real - totals.orcado; const dA1T = totals.real - totals.a1;
            const hOrc = totals.orcado !== 0; const hA1 = totals.a1 !== 0;
            return (
              <>
                {showReal   && <>{monthsToShow.map(m => <td key={`r-${m}`} className="px-1 py-2 text-right font-mono w-[70px]">{fmtK(monthlyTotals[m]?.real   || 0)}</td>)}<td className="px-1 py-2 text-right font-mono font-black border-l border-white/20 bg-blue-900/30 w-[80px]">{fmtK(totals.real)}</td></>}
                {showOrcado && <>{monthsToShow.map(m => <td key={`o-${m}`} className="px-1 py-2 text-right font-mono w-[70px]">{fmtK(monthlyTotals[m]?.orcado || 0)}</td>)}<td className="px-1 py-2 text-right font-mono font-black border-l border-white/20 bg-emerald-900/30 w-[80px]">{fmtK(totals.orcado)}</td></>}
                {showA1     && <>{monthsToShow.map(m => <td key={`a-${m}`} className="px-1 py-2 text-right font-mono w-[70px]">{fmtK(monthlyTotals[m]?.a1     || 0)}</td>)}<td className="px-1 py-2 text-right font-mono font-black border-l border-white/20 bg-purple-900/30 w-[80px]">{fmtK(totals.a1)}</td></>}
                {showDeltaAbsOrcado  && <>{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dao-${m}`} className={`px-1 py-2 text-right font-mono w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-white/40'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-2 text-right font-mono font-black border-l border-white/20 bg-emerald-900/30 w-[80px] ${hOrc ? deltaClass(dOrçT, totals.orcado) : 'text-white/40'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></>}
                {showDeltaPercOrcado && <>{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-2 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-white/40'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center text-[9px] border-l border-white/20 bg-emerald-900/30 w-[80px] ${hOrc ? deltaClass(dOrçT, totals.orcado) : 'text-white/40'}`}>{hOrc ? fmtPct(totals.real, totals.orcado) : '—'}</td></>}
                {showDeltaAbsA1      && <>{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`da1-${m}`} className={`px-1 py-2 text-right font-mono w-[70px] ${h ? deltaClass(d, md.a1) : 'text-white/40'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-2 text-right font-mono font-black border-l border-white/20 bg-purple-900/30 w-[80px] ${hA1 ? deltaClass(dA1T, totals.a1) : 'text-white/40'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></>}
                {showDeltaPercA1     && <>{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-2 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-white/40'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center text-[9px] border-l border-white/20 bg-purple-900/30 w-[80px] ${hA1 ? deltaClass(dA1T, totals.a1) : 'text-white/40'}`}>{hA1 ? fmtPct(totals.real, totals.a1) : '—'}</td></>}
              </>
            );
          })()}
          {viewMode === 'mes' && (() => {
            const dOrçT = totals.real - totals.orcado; const dA1T = totals.real - totals.a1;
            const hOrc = totals.orcado !== 0; const hA1 = totals.a1 !== 0;
            return (
              <>
                {monthsToShow.map(m => {
                  const md = monthlyTotals[m] || { real: 0, orcado: 0, a1: 0 };
                  const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                  return (
                    <React.Fragment key={m}>
                      {showReal            && <td className={`px-1 py-2 text-right font-mono w-[80px] ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.real)}</td>}
                      {showOrcado          && <td className={`px-1 py-2 text-right font-mono w-[80px] ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.orcado)}</td>}
                      {showDeltaAbsOrcado  && <td className={`px-0.5 py-2 text-right font-mono text-[10px] font-black w-[85px] bg-white/10 ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado, true) : 'text-gray-400'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{md.orcado !== 0 ? fmtK(dOrçM) : '—'}</td>}
                      {showDeltaPercOrcado && <td className={`px-0.5 py-2 text-center text-[9px] w-[70px] bg-white/10 ${md.orcado !== 0 ? deltaClass(dOrçM, md.orcado, true) : 'text-gray-400'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{md.orcado !== 0 ? fmtPct(md.real, md.orcado) : '—'}</td>}
                      {showA1              && <td className={`px-1 py-2 text-right font-mono w-[80px] ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.a1)}</td>}
                      {showDeltaAbsA1      && <td className={`px-0.5 py-2 text-right font-mono text-[10px] font-black w-[85px] bg-white/10 ${md.a1 !== 0 ? deltaClass(dA1M, md.a1, true) : 'text-gray-400'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>{md.a1 !== 0 ? fmtK(dA1M) : '—'}</td>}
                      {showDeltaPercA1     && <td className="px-0.5 py-2 text-center text-[9px] w-[70px] bg-white/10 text-gray-400">{md.a1 !== 0 ? fmtPct(md.real, md.a1) : '—'}</td>}
                    </React.Fragment>
                  );
                })}
                {showReal            && <td className={`px-1 py-2 text-right font-mono font-black w-[100px] bg-[#1B75BB] hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.real)}</td>}
                {showOrcado          && <td className={`px-1 py-2 text-right font-mono font-black w-[100px] bg-green-600 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.orcado)}</td>}
                {showDeltaAbsOrcado  && <td className={`px-0.5 py-2 text-right font-mono font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, totals.orcado, true) : 'text-gray-400'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>}
                {showDeltaPercOrcado && <td className={`px-0.5 py-2 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, totals.orcado, true) : 'text-gray-400'}`}>{hOrc ? fmtPct(totals.real, totals.orcado) : '—'}</td>}
                {showA1              && <td className={`px-1 py-2 text-right font-mono font-black w-[100px] bg-purple-600 hover:bg-yellow-200/40 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.a1)}</td>}
                {showDeltaAbsA1      && <td className={`px-0.5 py-2 text-right font-mono font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''} ${hA1 ? deltaClass(dA1T, totals.a1, true) : 'text-gray-400'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>}
                {showDeltaPercA1     && <td className={`px-0.5 py-2 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, totals.a1, true) : 'text-gray-400'}`}>{fmtPct(totals.real, totals.a1)}</td>}
              </>
            );
          })()}
        </tr>
      </tfoot>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-2 bg-gradient-to-br from-gray-50 to-white min-h-screen">

      {/* ── Título + Ações ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-base font-black text-[#152e55] uppercase tracking-tight">📊 Soma Tags</h1>
        {!loading && !error && groups.length > 0 && (
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {displayedGroups.length} grupos · {tag01Count} contas · {rows.length} registros
            {!hasOrcado && <span className="ml-1 text-amber-600 font-semibold">· sem Orçado</span>}
          </span>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg border border-blue-300 shadow-md overflow-x-auto">
        <span className="text-base shrink-0">🎯</span>
        <MultiSelectFilter label="Marca" icon={<Flag size={14} />} options={filterOptions.marcas} selected={selectedMarcas} onChange={setSelectedMarcas} colorScheme="orange" />
        <MultiSelectFilter label="Filial" icon={<Building2 size={14} />} options={filiaisFiltradas} selected={selectedFiliais} onChange={setSelectedFiliais} colorScheme="blue" />
        <div className="h-8 w-px bg-blue-300 mx-0.5 shrink-0" />
        <div className="flex items-center gap-2 shrink-0">
          <CalendarDays size={16} className="text-purple-600 shrink-0" />
          <span className="text-[12px] font-bold text-gray-700 whitespace-nowrap">Período:</span>
          <div className="flex gap-1">
            {QUARTERS.map(q => (
              <button key={q.label} onClick={() => { setMonthFrom(q.from); setMonthTo(q.to); }} title={q.title}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded transition-all shadow-sm whitespace-nowrap ${isQuarterActive(q) ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-purple-300 px-2.5 py-1 rounded shadow-sm">
            <Calendar size={14} className="text-purple-600 shrink-0" />
            <select value={monthFrom} onChange={e => { setMonthFrom(e.target.value); if (e.target.value > monthTo) setMonthTo(e.target.value); }} className="bg-transparent text-[12px] font-bold text-gray-900 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">até</span>
            <select value={monthTo} onChange={e => { setMonthTo(e.target.value); if (monthFrom > e.target.value) setMonthFrom(e.target.value); }} className="bg-transparent text-[12px] font-bold text-gray-900 outline-none cursor-pointer">
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="h-8 w-px bg-blue-300 mx-0.5 shrink-0" />
        <button onClick={() => setShowOnlyEbitda(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md shrink-0 ${showOnlyEbitda ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-gradient-to-r from-gray-600 to-slate-600 text-white'}`}
          title={showOnlyEbitda ? 'Exibindo apenas até EBITDA (Tag0 01–05)' : 'Exibindo todas as Tag0'}>
          {showOnlyEbitda ? <><CheckSquare size={14} strokeWidth={2.5} /><span>Até EBITDA</span></> : <><Square size={14} strokeWidth={2.5} /><span>Todas Tag0</span></>}
        </button>
        {hasAnyFilter && (
          <>
            <div className="h-8 w-px bg-blue-300 mx-0.5 shrink-0" />
            <button onClick={() => { setSelectedMarcas([]); setSelectedFiliais([]); }}
              className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded border border-rose-200 font-bold text-[9px] uppercase tracking-wider hover:bg-rose-100 transition-all shadow-sm shrink-0"
              title="Limpar todos os filtros ativos">
              <FilterX size={12} /><span className="whitespace-nowrap">Limpar</span>
            </button>
          </>
        )}
      </div>

      {/* ── Painel de Colunas + Visualização ── */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-2 py-1 rounded-lg border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="p-0.5 rounded bg-blue-500 text-white"><Columns size={10} /></div>
            <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-tight">Colunas</h3>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Toggles de coluna */}
            <button onClick={() => toggleElement('Real', showReal, setShowReal)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showReal ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
              {showReal ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
              <span className="text-[8px] font-black uppercase">Real</span>{showReal && badge('Real')}
            </button>
            <button onClick={() => toggleElement('Orçado', showOrcado, setShowOrcado)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showOrcado ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
              {showOrcado ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
              <span className="text-[8px] font-black uppercase">Orçado</span>{showOrcado && badge('Orçado')}
            </button>
            <button onClick={() => toggleElement('A1', showA1, setShowA1)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showA1 ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
              {showA1 ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
              <span className="text-[8px] font-black uppercase">A-1</span>{showA1 && badge('A1')}
            </button>

            {/* Deltas — visíveis em todos os modos */}
            {(
              <>
                <div className="h-4 w-px bg-gray-300" />
                <button onClick={() => toggleElement('DeltaAbsOrcado', showDeltaAbsOrcado, setShowDeltaAbsOrcado)} title="Variação R$ vs Orçado"
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showDeltaAbsOrcado ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'}`}>
                  {showDeltaAbsOrcado ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
                  <span className="text-[8px] font-black uppercase">ΔR$ Orç</span>{showDeltaAbsOrcado && badge('DeltaAbsOrcado')}
                </button>
                <button onClick={() => toggleElement('DeltaPercOrcado', showDeltaPercOrcado, setShowDeltaPercOrcado)} title="Variação % vs Orçado"
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showDeltaPercOrcado ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                  {showDeltaPercOrcado ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
                  <span className="text-[8px] font-black uppercase">Δ% Orç</span>{showDeltaPercOrcado && badge('DeltaPercOrcado')}
                </button>
                <button onClick={() => toggleElement('DeltaAbsA1', showDeltaAbsA1, setShowDeltaAbsA1)} title="Variação R$ vs A-1"
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showDeltaAbsA1 ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-rose-400'}`}>
                  {showDeltaAbsA1 ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
                  <span className="text-[8px] font-black uppercase">ΔR$ A-1</span>{showDeltaAbsA1 && badge('DeltaAbsA1')}
                </button>
                <button onClick={() => toggleElement('DeltaPercA1', showDeltaPercA1, setShowDeltaPercA1)} title="Variação % vs A-1"
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all ${showDeltaPercA1 ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400'}`}>
                  {showDeltaPercA1 ? <CheckSquare size={8} strokeWidth={3} /> : <Square size={8} strokeWidth={3} />}
                  <span className="text-[8px] font-black uppercase">Δ% A-1</span>{showDeltaPercA1 && badge('DeltaPercA1')}
                </button>
              </>
            )}

            <div className="h-4 w-px bg-gray-300" />

            {/* Seletor de Visualização */}
            {(['consolidado', 'cenario', 'mes'] as ViewMode[]).map(vm => (
              <button key={vm} onClick={() => setViewMode(vm)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded border transition-all text-[8px] font-black uppercase ${viewMode === vm ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white border-slate-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-400'}`}>
                {vm === 'consolidado' && '📦'}
                {vm === 'cenario'     && '🎭'}
                {vm === 'mes'         && '📅'}
                {' '}{vm.charAt(0).toUpperCase() + vm.slice(1)}
              </button>
            ))}

            {/* Separador + Drill Dimension (multi-select) */}
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <div className="p-0.5 rounded bg-amber-500 text-white"><Layers size={10} /></div>
              <span className="text-[8px] font-black text-gray-700 uppercase">Drill</span>
            </div>
            {SOMA_DIMENSIONS.map(d => {
              const order = drillDimensions.indexOf(d.id);
              const active = order >= 0;
              return (
                <button key={d.id}
                  onClick={() => {
                    setDrillDimensions(prev =>
                      prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                    );
                    setDimensionCache({});
                    setExpandedTag01s({});
                    setExpandedDrillRows({});
                  }}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all text-[8px] font-black uppercase ${active ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'}`}>
                  {d.label}
                  {active && <span className="ml-0.5 bg-white/30 px-0.5 rounded text-[7px]">{order + 1}º</span>}
                </button>
              );
            })}
            {drillDimensions.length > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                {/* Botão de ordenação */}
                <button onClick={() => setDimensionSort(s => s === 'desc' ? 'asc' : s === 'asc' ? 'alpha' : 'desc')}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600 hover:border-amber-400 transition-all text-[8px] font-black uppercase"
                  title={dimensionSort === 'desc' ? 'Maior → Menor' : dimensionSort === 'asc' ? 'Menor → Maior' : 'A → Z'}>
                  {dimensionSort === 'alpha' ? 'A→Z' : dimensionSort === 'desc' ? '↓Val' : '↑Val'}
                </button>
                {/* X limpar tudo */}
                <button onClick={() => { setDrillDimensions([]); setDimensionCache({}); setExpandedTag01s({}); setExpandedDrillRows({}); }}
                  className="flex items-center px-1 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all text-[8px] font-black"
                  title="Desativar drill-down">✕</button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-800 font-semibold">❌ {error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-10">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-190px)] rounded-2xl shadow-2xl border-2 border-gray-200 dre-scrollbar">
          <table className="border-separate border-spacing-0 text-left table-auto min-w-full text-[10px]">

            {/* ══ CONSOLIDADO ══ */}
            {viewMode === 'consolidado' && (
              <>
                <thead className="sticky top-0 z-50 shadow-lg whitespace-nowrap">
                  <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white h-7">
                    <th colSpan={2} rowSpan={2} className="sticky left-0 z-[60] bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle">CONTAS GERENCIAIS</th>
                    {cols.real   && <th className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-500 border-r border-white/20 shadow-sm">REAL</th>}
                    {orcGrpCols > 0 && <th colSpan={orcGrpCols} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-500 border-r border-white/20 shadow-sm">REAL vs ORÇADO</th>}
                    {a1GrpCols  > 0 && <th colSpan={a1GrpCols}  className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm">REAL vs A-1</th>}
                  </tr>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white h-6">
                    {cols.real            && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-blue-500 to-blue-600 border-r border-white/20">Real</th>}
                    {cols.orcado          && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-emerald-500 to-emerald-600">Orçado</th>}
                    {cols.deltaAbsOrcado  && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[120px] bg-gradient-to-br from-emerald-500 to-emerald-600">Δ R−Orç</th>}
                    {cols.deltaPercOrcado && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[72px] bg-gradient-to-br from-emerald-500 to-emerald-600 border-r border-white/20">Δ%</th>}
                    {cols.a1              && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-purple-500 to-purple-600">A-1</th>}
                    {cols.deltaAbsA1      && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[120px] bg-gradient-to-br from-purple-500 to-purple-600">Δ R−A-1</th>}
                    {cols.deltaPercA1     && <th className="px-2 py-1 text-center font-black text-[9px] uppercase w-[72px] bg-gradient-to-br from-purple-500 to-purple-600">Δ%</th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {displayedGroups.map((g, idx) => {
                    const isOpen = !collapsed.has(g.tag0);
                    const hasA1  = g.a1 !== 0; const hasOrc = g.orcado !== 0;
                    const dOrç = g.real - g.orcado; const dA1 = g.real - g.a1;
                    return (
                      <React.Fragment key={g.tag0}>
                        <tr className={TAG0_TR}>
                          <td className={`px-2 py-1 text-center w-8 ${TAG0_STICKY}`}>{isOpen ? <ChevronDown size={13} className="inline" onClick={() => toggleGroup(g.tag0)} /> : <ChevronRight size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />}</td>
                          <td className={TAG0_LABEL} onClick={() => toggleGroup(g.tag0)}>{g.tag0}</td>
                          {cols.real            && <td className="px-2 py-1 text-right font-mono font-black border-r border-white/10">{fmt(g.real)}</td>}
                          {cols.orcado          && <td className={`px-2 py-1 text-right font-mono font-black ${hasOrc ? '' : 'text-gray-500'}`}>{hasOrc ? fmt(g.orcado) : '—'}</td>}
                          {cols.deltaAbsOrcado  && <td className={`px-2 py-1 text-right font-mono font-black ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>{hasOrc ? fmt(dOrç) : '—'}</td>}
                          {cols.deltaPercOrcado && <td className={`px-2 py-1 text-right font-mono font-black border-r border-white/10 ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>{fmtPct(g.real, g.orcado)}</td>}
                          {cols.a1              && <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? '' : 'text-gray-500'}`}>{hasA1 ? fmt(g.a1) : '—'}</td>}
                          {cols.deltaAbsA1      && <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>{hasA1 ? fmt(dA1) : '—'}</td>}
                          {cols.deltaPercA1     && <td className={`px-2 py-1 text-right font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>{fmtPct(g.real, g.a1)}</td>}
                        </tr>
                        {isOpen && g.items.map((r, i) => {
                          const rHasOrc = r.orcado !== 0; const rHasA1 = r.a1 !== 0;
                          const rdOrç = r.real - r.orcado; const rdA1 = r.real - r.a1;
                          const rowKey = `${g.tag0}|${r.tag01}`;
                          const isDrillExpanded = expandedTag01s[rowKey];
                          return (
                            <React.Fragment key={r.tag01}>
                              <tr className="group bg-gray-100 border-b border-gray-200 hover:bg-yellow-100/60 transition-colors">
                                <td className="px-2 py-1 w-8 sticky left-0 z-20 bg-gray-100 group-hover:bg-yellow-100 transition-colors">
                                  {drillDimensions.length > 0 && (
                                    <button onClick={() => setExpandedTag01s(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))} className="text-gray-400 hover:text-amber-600 transition-colors">
                                      {isDrillExpanded ? <ChevronDown size={10} className="inline" /> : <ChevronRight size={10} className="inline" />}
                                    </button>
                                  )}
                                </td>
                                <td className="px-2 py-1 pl-6 text-gray-950 font-extrabold truncate sticky left-8 z-20 w-[280px] bg-gray-100 group-hover:bg-yellow-100 transition-colors">{r.tag01}</td>
                                {cols.real            && <td className="px-2 py-1 text-right font-mono text-gray-900 border-r border-gray-100">{fmt(r.real)}</td>}
                                {cols.orcado          && <td className={`px-2 py-1 text-right font-mono ${rHasOrc ? 'text-gray-900' : 'text-gray-300'}`}>{rHasOrc ? fmt(r.orcado) : '—'}</td>}
                                {cols.deltaAbsOrcado  && <td className={`px-2 py-1 text-right font-mono ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>{rHasOrc ? fmt(rdOrç) : '—'}</td>}
                                {cols.deltaPercOrcado && <td className={`px-2 py-1 text-right font-mono border-r border-gray-200 ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>{rHasOrc ? `${((rdOrç / Math.abs(r.orcado)) * 100).toFixed(1)}%` : '—'}</td>}
                                {cols.a1              && <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? 'text-gray-900' : 'text-gray-300'}`}>{rHasA1 ? fmt(r.a1) : '—'}</td>}
                                {cols.deltaAbsA1      && <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>{rHasA1 ? fmt(rdA1) : '—'}</td>}
                                {cols.deltaPercA1     && <td className={`px-2 py-1 text-right font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>{rHasA1 ? `${((rdA1 / Math.abs(r.a1)) * 100).toFixed(1)}%` : '—'}</td>}
                              </tr>
                              {drillDimensions.length > 0 && isDrillExpanded && renderDrillRows(r.tag01, g.tag0)}
                            </React.Fragment>
                          );
                        })}
                        {idx === lastIdx03 && <CalcRow label="MARGEM DE CONTRIBUIÇÃO" data={margemData} borderTop cols={cols} />}
                        {idx === lastIdx04 && <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} borderTop cols={cols} />}
                        {idx === lastIdx03 && lastIdx04 === -1 && <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} cols={cols} />}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-40">
                  <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-black text-[10px] shadow-[0_-2px_6px_rgba(0,0,0,0.3)] border-t-2 border-yellow-400">
                    <td colSpan={2} className="py-2 uppercase tracking-tight font-black sticky left-0 z-50 bg-gradient-to-r from-slate-800 to-slate-700 ">
                      <div className="flex items-center gap-1 px-2">
                        {showOnlyEbitda && <Activity size={12} />}
                        <span>{showOnlyEbitda ? 'EBITDA TOTAL' : 'TOTAL GERAL'}</span>
                      </div>
                    </td>
                    {cols.real            && <td className="px-2 py-2 text-right font-mono border-r border-white/10">{fmt(totals.real)}</td>}
                    {cols.orcado          && <td className={`px-2 py-2 text-right font-mono ${totals.orcado !== 0 ? '' : 'text-gray-500'}`}>{totals.orcado !== 0 ? fmt(totals.orcado) : '—'}</td>}
                    {cols.deltaAbsOrcado  && <td className={`px-2 py-2 text-right font-mono ${totals.orcado !== 0 ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>{totals.orcado !== 0 ? fmt(totals.real - totals.orcado) : '—'}</td>}
                    {cols.deltaPercOrcado && <td className={`px-2 py-2 text-right font-mono border-r border-white/10 ${totals.orcado !== 0 ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>{fmtPct(totals.real, totals.orcado)}</td>}
                    {cols.a1              && <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? '' : 'text-gray-500'}`}>{totals.a1 !== 0 ? fmt(totals.a1) : '—'}</td>}
                    {cols.deltaAbsA1      && <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>{totals.a1 !== 0 ? fmt(totals.real - totals.a1) : '—'}</td>}
                    {cols.deltaPercA1     && <td className={`px-2 py-2 text-right font-mono ${totals.a1 !== 0 ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>{fmtPct(totals.real, totals.a1)}</td>}
                  </tr>
                </tfoot>
              </>
            )}

            {/* ══ CENÁRIO ══ */}
            {viewMode === 'cenario' && (
              <>
                {renderCenarioHeader()}
                {renderMonthlyBody()}
                {renderMonthlyFooter()}
              </>
            )}

            {/* ══ MÊS ══ */}
            {viewMode === 'mes' && (
              <>
                {renderMesHeader()}
                {renderMonthlyBody()}
                {renderMonthlyFooter()}
              </>
            )}

          </table>
        </div>
      )}
    </div>
  );
};

export default SomaTagsView;
