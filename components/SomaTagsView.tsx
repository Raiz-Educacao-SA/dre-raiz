import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { getSomaTags, invalidateSomaTagsCache, getDREFilterOptions, getTag02Options, getTag02OptionsForTag01s, getTag01sForTag02s, getTag03Options, getTag03OptionsForTag02s, searchVendors, SomaTagsRow, DREFilterOptions, getDREDimension, DREDimensionRow, generateSnapshotFromDre } from '../services/supabaseService';
import { Loader2, RefreshCw, Download, ChevronDown, ChevronRight, CheckSquare, Square, Flag, Building2, FilterX, CalendarDays, Columns, Activity, Layers, X, ArrowDownAZ, Table2, LayoutGrid, Maximize2, Minimize2, Calculator, ChevronsDown, ChevronsUp, GripVertical, Camera, Store } from 'lucide-react';
// ExcelJS carregado sob demanda em exportExcel() via dynamic import
import type ExcelJS from 'exceljs';
import MultiSelectFilter from './MultiSelectFilter';
import InquiryListPanel from './inquiries/InquiryListPanel';
import { useAuth } from '../contexts/AuthContext';
import { DreAnalysis, DreInquiryFilterContext } from '../types';
import { toast } from 'sonner';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v === 0 ? '—' : Math.round(v).toLocaleString('pt-BR');

// Mesmo formato para visões mensais (igual ao DRE Gerencial)
const fmtK = (v: number): string =>
  v === 0 ? '—' : Math.round(v).toLocaleString('pt-BR');

const fmtCard = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

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
interface CalcRowProps { label: string; data: CalcData; borderTop?: boolean; cols: ColsVis; activeElements: string[] }

const CalcRow: React.FC<CalcRowProps> = ({ label, data, borderTop, cols, activeElements }) => {
  const { real, orcado, a1 } = data;
  const dOrç  = real - orcado;
  const dA1   = real - a1;
  const hasOrc = orcado !== 0 || real !== 0;
  const hasA1  = a1     !== 0 || real !== 0;
  return (
    <tr className={`group bg-[#F44C00] text-white font-black text-[12px] h-6 shadow-sm
                   ${borderTop ? 'border-t-2 border-yellow-400' : ''}`}>
      <td colSpan={2}
          className="sticky left-0 bg-[#F44C00] z-20 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
        <div className="flex items-center gap-1 px-2 uppercase tracking-tighter truncate font-black">
          <Activity size={12} /> {label}
        </div>
      </td>
      {activeElements.map(el => {
        switch (el) {
          case 'Real':            return cols.real            ? <td key="real" className="px-2 py-1 text-center font-mono">{fmt(real)}</td> : null;
          case 'Orçado':          return cols.orcado          ? <td key="orc"  className={`px-2 py-1 text-center font-mono ${hasOrc ? '' : 'text-orange-300'}`}>{hasOrc ? fmt(orcado) : '—'}</td> : null;
          case 'DeltaAbsOrcado':  return cols.deltaAbsOrcado  ? <td key="dao"  className={`px-2 py-1 text-center font-mono ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>{hasOrc ? fmt(dOrç) : '—'}</td> : null;
          case 'DeltaPercOrcado': return cols.deltaPercOrcado ? <td key="dpo"  className={`px-2 py-1 text-center font-mono border-r border-white/20 ${hasOrc ? deltaClass(dOrç, orcado, true) : 'text-orange-300'}`}>{fmtPct(real, orcado)}</td> : null;
          case 'A1':              return cols.a1              ? <td key="a1"   className={`px-2 py-1 text-center font-mono ${hasA1 ? '' : 'text-orange-300'}`}>{hasA1 ? fmt(a1) : '—'}</td> : null;
          case 'DeltaAbsA1':      return cols.deltaAbsA1      ? <td key="da1"  className={`px-2 py-1 text-center font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>{hasA1 ? fmt(dA1) : '—'}</td> : null;
          case 'DeltaPercA1':     return cols.deltaPercA1     ? <td key="dp1"  className={`px-2 py-1 text-center font-mono ${hasA1 ? deltaClass(dA1, a1, true) : 'text-orange-300'}`}>{fmtPct(real, a1)}</td> : null;
          default: return null;
        }
      })}
    </tr>
  );
};

// ── Utilitários de hash/contexto de filtros ───────────────────────────────────

const computeFilterHash = (
  year: string, months: string[], marcas: string[], filiais: string[],
  tags01: string[], tags02: string[], tags03: string[], recurring: 'Sim' | 'Não' | null
): string => {
  const canonical = JSON.stringify({
    year,
    months:  [...months].sort(),  marcas: [...marcas].sort(),
    filiais: [...filiais].sort(), tags01: [...tags01].sort(),
    tags02:  [...tags02].sort(),  tags03: [...tags03].sort(),
    recurring: recurring ?? 'todos',
  });
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) {
    h = ((h << 5) + h) ^ canonical.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(36);
};

const computeFilterContext = (
  year: string, months: string[], marcas: string[], filiais: string[],
  tags01: string[], tags02: string[], tags03: string[], recurring: 'Sim' | 'Não' | null
): string => {
  const MONTH_LBL: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  };
  const parts = [`Ano ${year}`];
  parts.push(`Meses: ${months.length === 0 ? 'Todos' : [...months].sort().map(m => MONTH_LBL[m] || m).join(', ')}`);
  if (marcas.length)  parts.push(`Marca: ${marcas.join(', ')}`);
  if (filiais.length) parts.push(`Filial: ${filiais.join(', ')}`);
  if (tags01.length)  parts.push(`Tag01: ${tags01.join(', ')}`);
  if (tags02.length)  parts.push(`Tag02: ${tags02.join(', ')}`);
  if (tags03.length)  parts.push(`Tag03: ${tags03.join(', ')}`);
  if (recurring !== null) parts.push(`Recorrência: ${recurring}`);
  return parts.join(' | ');
};

// ── Componente principal ──────────────────────────────────────────────────────
interface SomaTagsViewProps {
  onRegisterActions?: (actions: { refresh: () => void; exportExcel: () => void }) => void;
  onLoadingChange?: (loading: boolean) => void;
  onDataChange?: (hasData: boolean) => void;
  onDrillDown?: (data: { categories: string[]; scenario?: string; filters?: Record<string, any> }) => void;
  allowedTag01?: string[];
  allowedMarcas?: string[];
  presentationMode?: 'executive' | 'detailed';
  onPresentationModeChange?: (mode: 'executive' | 'detailed') => void;
}

const SomaTagsView: React.FC<SomaTagsViewProps> = ({ onRegisterActions, onLoadingChange, onDataChange, onDrillDown, allowedTag01, allowedMarcas, presentationMode: externalPM, onPresentationModeChange }) => {
  const { user: authUser, isAdmin } = useAuth();
  const [rows,      setRows]      = useState<SomaTagsRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [year,           setYear]           = useState('2026');
  // [] = todos os meses (exibe "TODAS"); parcial = filtra client-side
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [collapsed,      setCollapsed]      = useState<Set<string>>(new Set());
  const [showOnlyEbitda, setShowOnlyEbitda] = useState(true);
  const [viewMode,       setViewMode]       = useState<ViewMode>('consolidado');
  const [internalPM, setInternalPM] = useState<'executive' | 'detailed'>('detailed');
  const presentationMode = externalPM ?? internalPM;
  const setPresentationMode = useCallback((mode: 'executive' | 'detailed') => {
    setInternalPM(mode);
    onPresentationModeChange?.(mode);
  }, [onPresentationModeChange]);
  const [cardLayout,  setCardLayout]  = useState<'compact' | 'medium' | 'expanded' | 'list'>('compact');
  const [execFilter,  setExecFilter]  = useState<'all' | 'positive' | 'negative'>('all');
  const [execSort,    setExecSort]    = useState<'alphabetical' | 'value' | 'delta'>('value');
  const [hoveredBar,  setHoveredBar]  = useState<string | null>(null);

  // ── Filtros Marca / Filial / Tag01 ───────────────────────────────────────
  const [filterOptions,   setFilterOptions]   = useState<DREFilterOptions>({ marcas: [], nome_filiais: [], tags01: [] });
  const [selectedMarcas,  setSelectedMarcas]  = useState<string[]>([]);
  const [selectedTags02,  setSelectedTags02]  = useState<string[]>([]);
  const [tag02Options,    setTag02Options]    = useState<string[]>([]);
  const allTag02OptionsRef = useRef<string[]>([]);
  const [selectedTags03,  setSelectedTags03]  = useState<string[]>([]);
  const [tag03Options,    setTag03Options]    = useState<string[]>([]);
  const allTag03OptionsRef = useRef<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [selectedTags01,  setSelectedTags01]  = useState<string[]>([]);
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

  // ── Filtro Recorrência ────────────────────────────────────────────────────
  const [recurring, setRecurring] = useState<'Sim' | 'Não' | null>('Sim');

  // ── Foto DRE (snapshot) ──────────────────────────────────────────────────
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);

  // ── Drill-down ────────────────────────────────────────────────────────────
  const [dimensionCache,    setDimensionCache]    = useState<Record<string, DREDimensionRow[]>>({});
  const [expandedTag01s,    setExpandedTag01s]    = useState<Record<string, boolean>>({});
  const [expandedDrillRows, setExpandedDrillRows] = useState<Record<string, boolean>>({});
  const [drillDimensions,   setDrillDimensions]   = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'real_total', dir: 'desc' });
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);

  // ── Seleção de células para somatório ─────────────────────────────────────
  const [cellSelection, setCellSelection] = useState<Map<string, { value: number; label: string }>>(new Map());
  const selectedSum = useMemo(() =>
    Array.from(cellSelection.values()).reduce((s, c) => s + c.value, 0), [cellSelection]);
  const toggleCellSel = useCallback((id: string, value: number, label: string) => {
    if (value === 0) return;
    setCellSelection(prev => {
      const n = new Map(prev);
      n.has(id) ? n.delete(id) : n.set(id, { value, label });
      return n;
    });
  }, []);
  // Só ativa com Ctrl pressionado
  const handleCellClick = useCallback((e: React.MouseEvent, id: string, value: number, label: string) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    toggleCellSel(id, value, label);
  }, [toggleCellSel]);
  const isCellSel = (id: string) => cellSelection.has(id);

  const handleColSort = useCallback((col: string) => {
    setSortConfig(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    );
  }, []);

  // Refs para evitar closure stale em loadDrillData (useCallback sem deps)
  const yearRef           = useRef(year);
  const selectedMonthsRef = useRef(selectedMonths);
  const marcasRef         = useRef(selectedMarcas);
  const filiaisRef        = useRef(selectedFiliais);
  const tags02Ref     = useRef(selectedTags02);
  const tags03Ref     = useRef(selectedTags03);
  const vendorsRef    = useRef(selectedVendors);
  const recurringRef  = useRef<'Sim' | 'Não' | null>('Sim');
  const allowedMarcasRef = useRef<string[] | undefined>(allowedMarcas);
  useEffect(() => { yearRef.current           = year;            }, [year]);
  useEffect(() => { selectedMonthsRef.current = selectedMonths;  }, [selectedMonths]);
  useEffect(() => { marcasRef.current         = selectedMarcas;  }, [selectedMarcas]);
  useEffect(() => { filiaisRef.current   = selectedFiliais; }, [selectedFiliais]);
  useEffect(() => { tags02Ref.current    = selectedTags02;  }, [selectedTags02]);
  useEffect(() => { tags03Ref.current    = selectedTags03;  }, [selectedTags03]);
  useEffect(() => { vendorsRef.current   = selectedVendors; }, [selectedVendors]);
  useEffect(() => { recurringRef.current = recurring;       }, [recurring]);
  useEffect(() => { allowedMarcasRef.current = allowedMarcas; }, [allowedMarcas]);

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
    const showMap: Record<string, boolean> = {
      'Real': showReal, 'Orçado': showOrcado,
      'DeltaAbsOrcado': showDeltaAbsOrcado, 'DeltaPercOrcado': showDeltaPercOrcado,
      'A1': showA1, 'DeltaAbsA1': showDeltaAbsA1, 'DeltaPercA1': showDeltaPercA1,
    };
    return selectionOrder.filter(el => showMap[el]);
  }, [showReal, showOrcado, showA1, showDeltaAbsOrcado, showDeltaPercOrcado, showDeltaAbsA1, showDeltaPercA1, selectionOrder]);

  const cols: ColsVis = useMemo(() => ({
    real: showReal, orcado: showOrcado,
    deltaAbsOrcado: showDeltaAbsOrcado, deltaPercOrcado: showDeltaPercOrcado,
    a1: showA1, deltaAbsA1: showDeltaAbsA1, deltaPercA1: showDeltaPercA1,
  }), [showReal, showOrcado, showA1, showDeltaAbsOrcado, showDeltaPercOrcado, showDeltaAbsA1, showDeltaPercA1]);

  // ── Memos de hash e contexto de filtros (para DreAnalysisSection) ─────────
  const filterHash = useMemo(() =>
    computeFilterHash(year, selectedMonths, selectedMarcas, selectedFiliais,
                      selectedTags01, selectedTags02, selectedTags03, recurring),
    [year, selectedMonths, selectedMarcas, selectedFiliais,
     selectedTags01, selectedTags02, selectedTags03, recurring]);

  const filterContextString = useMemo(() =>
    computeFilterContext(year, selectedMonths, selectedMarcas, selectedFiliais,
                         selectedTags01, selectedTags02, selectedTags03, recurring),
    [year, selectedMonths, selectedMarcas, selectedFiliais,
     selectedTags01, selectedTags02, selectedTags03, recurring]);

  const filterContextObj = useMemo(() => ({
    year,
    months:  [...selectedMonths].sort(),
    marcas:  [...selectedMarcas].sort(),
    filiais: [...selectedFiliais].sort(),
    tags01:  [...selectedTags01].sort(),
    tags02:  [...selectedTags02].sort(),
    tags03:  [...selectedTags03].sort(),
    recurring,
  }), [year, selectedMonths, selectedMarcas, selectedFiliais,
      selectedTags01, selectedTags02, selectedTags03, recurring]);

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

  // helper: min/max de selectedMonths
  const getMonthRange = (months: string[]) => {
    if (months.length === 0) return { from: '01', to: '12' };
    const sorted = [...months].sort();
    return { from: sorted[0], to: sorted[sorted.length - 1] };
  };

  // ── loadDrillData ────────────────────────────────────────────────────────
  const loadDrillData = useCallback(async (
    tag01: string, tag0: string, scenario: string, dim: string, accFilters: Record<string, string> = {}
  ) => {
    const filtersKey = Object.entries(accFilters).sort().map(([k, v]) => `${k}=${v}`).join('&');
    const cacheKey   = `${scenario}|${tag01}|${dim}|${filtersKey}`;
    const { from: mfRaw, to: mtRaw } = (() => {
      const m = selectedMonthsRef.current;
      if (m.length === 0) return { from: '01', to: '12' };
      const s = [...m].sort();
      return { from: s[0], to: s[s.length - 1] };
    })();
    const mf = `${yearRef.current}-${mfRaw}`;
    const mt = `${yearRef.current}-${mtRaw}`;
    // Aplicar permissão de marca: intersectar seleção do usuário com marcas permitidas
    const marcasPerm = allowedMarcasRef.current && allowedMarcasRef.current.length > 0 ? allowedMarcasRef.current : undefined;
    const rawMarcas = accFilters.marca ? [accFilters.marca] : (marcasRef.current.length > 0 ? marcasRef.current : undefined);
    const marcas = marcasPerm
      ? (rawMarcas ? rawMarcas.filter(m => marcasPerm.some(p => p.toUpperCase() === m.toUpperCase())) : marcasPerm)
      : rawMarcas;
    const filiais = accFilters.nome_filial ? [accFilters.nome_filial] : (filiaisRef.current.length > 0 ? filiaisRef.current : undefined);
    const tags02  = accFilters.tag02 ? [accFilters.tag02] : (tags02Ref.current.length > 0 ? tags02Ref.current : undefined);
    const tags03  = accFilters.tag03 ? [accFilters.tag03] : (tags03Ref.current.length > 0 ? tags03Ref.current : undefined);
    const vendors = vendorsRef.current.length > 0 ? vendorsRef.current : undefined;
    const rows = await getDREDimension({
      monthFrom: mf, monthTo: mt,
      scenario, dimension: dim,
      tags01: [tag01], tag0,
      marcas, nomeFiliais: filiais,
      tags02, tags03,
      recurring: recurringRef.current ?? undefined,
      vendor: vendors,
    });
    setDimensionCache(prev => ({ ...prev, [cacheKey]: rows }));
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { from, to } = getMonthRange(selectedMonths);
      const mFrom  = `${year}-${from}`;
      const mTo    = `${year}-${to}`;
      // Aplicar permissão de marca: intersectar seleção do usuário com marcas permitidas
      const marcasPerm = allowedMarcas && allowedMarcas.length > 0 ? allowedMarcas : undefined;
      const rawMarcas  = selectedMarcas.length > 0 ? selectedMarcas : undefined;
      const marcas = marcasPerm
        ? (rawMarcas ? rawMarcas.filter(m => marcasPerm.some(p => p.toUpperCase() === m.toUpperCase())) : marcasPerm)
        : rawMarcas;
      const filiais  = selectedFiliais.length > 0 ? selectedFiliais : undefined;
      const tags02   = selectedTags02.length  > 0 ? selectedTags02  : undefined;
      const tags03   = selectedTags03.length  > 0 ? selectedTags03  : undefined;
      const vendors  = selectedVendors.length > 0 ? selectedVendors : undefined;
      const tags01Perm = allowedTag01 && allowedTag01.length > 0 ? allowedTag01 : undefined;
      const [data, opts, t02, t03] = await Promise.all([
        getSomaTags(mFrom, mTo, marcas, filiais, tags02, tags01Perm, recurring ?? undefined, tags03, vendors),
        getDREFilterOptions({ monthFrom: mFrom, monthTo: mTo }),
        allTag02OptionsRef.current.length === 0 ? getTag02Options() : Promise.resolve(allTag02OptionsRef.current),
        allTag03OptionsRef.current.length === 0 ? getTag03Options() : Promise.resolve(allTag03OptionsRef.current),
      ]);
      setRows(data);
      setFilterOptions(opts);
      if (allTag02OptionsRef.current.length === 0) {
        allTag02OptionsRef.current = t02;
        setTag02Options(t02);
      }
      if (allTag03OptionsRef.current.length === 0) {
        allTag03OptionsRef.current = t03;
        setTag03Options(t03);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [year, selectedMonths, selectedMarcas, selectedFiliais, selectedTags02, selectedTags03, selectedVendors, allowedTag01, allowedMarcas, recurring]);

  // Efeito único: fetchData é recriado via useCallback sempre que qualquer filtro muda.
  // filialCleanupRef evita double-fetch quando marca limpa filiais automaticamente.
  useEffect(() => {
    if (filialCleanupRef.current) { filialCleanupRef.current = false; return; }
    fetchData();
  }, [fetchData]);

  // Cascata Tag02: quando Tag01 muda, atualiza opções disponíveis de Tag02
  useEffect(() => {
    if (selectedTags01.length === 0) {
      setTag02Options(allTag02OptionsRef.current);
    } else {
      getTag02OptionsForTag01s(selectedTags01).then(opts => {
        setTag02Options(opts);
        setSelectedTags02(prev => prev.filter(t => opts.includes(t)));
      });
    }
  }, [selectedTags01]);

  // Cascata Tag03: quando Tag02 muda, atualiza opções disponíveis de Tag03
  useEffect(() => {
    if (selectedTags02.length === 0) {
      setTag03Options(allTag03OptionsRef.current);
    } else {
      getTag03OptionsForTag02s(selectedTags02).then(opts => {
        setTag03Options(opts);
        setSelectedTags03(prev => prev.filter(t => opts.includes(t)));
      });
    }
  }, [selectedTags02]);

  // Limpa cache de drill ao trocar filtros (mantém abertura das linhas)
  useEffect(() => {
    setDimensionCache({});
  }, [year, selectedMonths, selectedMarcas, selectedFiliais, selectedTags02, selectedTags03, selectedVendors, recurring]);

  // ── Filtro client-side por Tag01 e meses selecionados ───────────────────
  const filteredRows = useMemo(() => {
    let result = rows;
    if (selectedTags01.length > 0)
      result = result.filter(r => selectedTags01.includes(r.tag01));
    if (selectedMonths.length > 0)
      result = result.filter(r => selectedMonths.includes(r.month.slice(-2)));
    return result;
  }, [rows, selectedTags01, selectedMonths]);

  // ── Meses a exibir ────────────────────────────────────────────────────────
  const monthsToShow = useMemo(() => {
    const months = selectedMonths.length > 0 ? [...selectedMonths].sort() : ['01','02','03','04','05','06','07','08','09','10','11','12'];
    return months.map(m => `${year}-${m}`);
  }, [year, selectedMonths]);

  // ── Extração de valor para sort por coluna ────────────────────────────────
  const getSortValue = useCallback((item: Tag01Row | Tag01MonthlyItem, col: string): number => {
    if ('byMonth' in item) {
      // col format: "orc_2026-01" or "real_total" — split only on first "_"
      const idx = col.indexOf('_');
      const scen = col.slice(0, idx);
      const key = col.slice(idx + 1);
      const months = key === 'total' ? monthsToShow : [key];
      const md = months.reduce(
        (acc, m) => { const d = (item as Tag01MonthlyItem).byMonth[m] || { real: 0, orcado: 0, a1: 0 };
          return { real: acc.real + d.real, orcado: acc.orcado + d.orcado, a1: acc.a1 + d.a1 }; },
        { real: 0, orcado: 0, a1: 0 }
      );
      switch (scen) {
        case 'real': return md.real;
        case 'orc':  return md.orcado;
        case 'a1':   return md.a1;
        case 'dao':  return md.real - md.orcado;
        case 'dpo':  return md.orcado !== 0 ? (md.real - md.orcado) / Math.abs(md.orcado) : 0;
        case 'da1':  return md.real - md.a1;
        case 'dp1':  return md.a1 !== 0 ? (md.real - md.a1) / Math.abs(md.a1) : 0;
      }
    } else {
      const r = item as Tag01Row;
      switch (col) {
        case 'real_total': return r.real;
        case 'orc_total':  return r.orcado;
        case 'a1_total':   return r.a1;
        case 'dao_total':  return r.real - r.orcado;
        case 'dpo_total':  return r.orcado !== 0 ? (r.real - r.orcado) / Math.abs(r.orcado) : 0;
        case 'da1_total':  return r.real - r.a1;
        case 'dp1_total':  return r.a1 !== 0 ? (r.real - r.a1) / Math.abs(r.a1) : 0;
      }
    }
    return 0;
  }, [monthsToShow]);

  // ── Agrupamento Consolidado ───────────────────────────────────────────────
  const groups = useMemo((): Tag0Group[] => {
    const map = new Map<string, Map<string, Tag01Row>>();
    filteredRows.forEach(r => {
      if (!map.has(r.tag0)) map.set(r.tag0, new Map());
      const m = map.get(r.tag0)!;
      const key = r.tag01;
      if (!m.has(key)) m.set(key, { tag01: key, real: 0, orcado: 0, a1: 0 });
      const e = m.get(key)!;
      const v = Number(r.total) || 0;
      if (r.scenario === 'Real')   e.real   += v;
      if (r.scenario === 'Orçado') e.orcado += v;
      if (r.scenario === 'A-1')    e.a1     += v;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag0, m]) => {
        const items = Array.from(m.values());
        if (sortConfig.col === 'tag01') {
          items.sort((a, b) => a.tag01.localeCompare(b.tag01));
        } else {
          const dir = sortConfig.dir === 'desc' ? -1 : 1;
          items.sort((a, b) => dir * (getSortValue(b, sortConfig.col) - getSortValue(a, sortConfig.col)));
        }
        return {
          tag0,
          real:   items.reduce((s, i) => s + i.real,   0),
          orcado: items.reduce((s, i) => s + i.orcado, 0),
          a1:     items.reduce((s, i) => s + i.a1,     0),
          items,
        };
      });
  }, [filteredRows, sortConfig, getSortValue]);

  // ── Agrupamento Mensal ────────────────────────────────────────────────────
  const monthlyGroups = useMemo((): Tag0MonthlyGroup[] => {
    const map = new Map<string, Map<string, Record<string, MonthData>>>();
    filteredRows.forEach(r => {
      if (!map.has(r.tag0)) map.set(r.tag0, new Map());
      const t0 = map.get(r.tag0)!;
      const key = r.tag01;
      if (!t0.has(key)) t0.set(key, {});
      const t1 = t0.get(key)!;
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
      for (const [key, byMonth] of t0Map.entries()) {
        for (const [month, md] of Object.entries(byMonth)) {
          if (!tag0ByMonth[month]) tag0ByMonth[month] = { real: 0, orcado: 0, a1: 0 };
          tag0ByMonth[month].real   += md.real;
          tag0ByMonth[month].orcado += md.orcado;
          tag0ByMonth[month].a1     += md.a1;
        }
        items.push({ tag01: key, byMonth });
      }
      if (sortConfig.col === 'tag01') {
        items.sort((a, b) => a.tag01.localeCompare(b.tag01));
      } else {
        const dir = sortConfig.dir === 'desc' ? -1 : 1;
        items.sort((a, b) => dir * (getSortValue(b, sortConfig.col) - getSortValue(a, sortConfig.col)));
      }
      result.push({ tag0, byMonth: tag0ByMonth, items });
    }
    return result.sort((a, b) => a.tag0.localeCompare(b.tag0));
  }, [filteredRows, sortConfig, getSortValue]);

  // ── Oculta CalcRows quando há filtro de tag ativo ─────────────────────────
  const hasTagFilter = selectedTags01.length > 0 || selectedTags02.length > 0 || selectedTags03.length > 0;

  // ── Grupos exibidos (filtro Até EBITDA) ──────────────────────────────────
  // '06.' incluído: Rateio Raiz faz parte do EBITDA TOTAL
  const EBITDA_PREFIXES = ['01.', '02.', '03.', '04.', '05.', '06.'];
  const displayedGroups = useMemo(
    () => showOnlyEbitda ? groups.filter(g => EBITDA_PREFIXES.some(p => g.tag0.startsWith(p))) : groups,
    [groups, showOnlyEbitda],
  );
  const displayedMonthlyGroups = useMemo(
    () => showOnlyEbitda ? monthlyGroups.filter(g => EBITDA_PREFIXES.some(p => g.tag0.startsWith(p))) : monthlyGroups,
    [monthlyGroups, showOnlyEbitda],
  );

  // totals usa displayedGroups → TOTAL do rodapé sempre bate com a soma dos meses exibidos
  const totals = useMemo(() => ({
    real:   displayedGroups.reduce((s, g) => s + g.real,   0),
    orcado: displayedGroups.reduce((s, g) => s + g.orcado, 0),
    a1:     displayedGroups.reduce((s, g) => s + g.a1,     0),
  }), [displayedGroups]);

  // ── Cards executivos ──────────────────────────────────────────────────────
  const execCards = useMemo(() => {
    let cards = displayedGroups.map(g => ({
      ...g,
      byMonth: displayedMonthlyGroups.find(m => m.tag0 === g.tag0)?.byMonth || {} as Record<string, MonthData>,
    }));
    if (execFilter === 'positive') cards = cards.filter(c => (c.real - c.orcado) >= 0);
    if (execFilter === 'negative') cards = cards.filter(c => (c.real - c.orcado) <  0);
    if (execSort === 'alphabetical') cards.sort((a, b) => a.tag0.localeCompare(b.tag0));
    else if (execSort === 'value')   cards.sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
    else cards.sort((a, b) => {
      const pct = (x: typeof a) => x.orcado !== 0 ? Math.abs((x.real - x.orcado) / x.orcado) : 0;
      return pct(b) - pct(a);
    });
    return cards;
  }, [displayedGroups, displayedMonthlyGroups, execFilter, execSort]);

  const execMaxReal = useMemo(
    () => Math.max(...execCards.map(c => Math.abs(c.real)), 1),
    [execCards],
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

  /** Retorna o valor de sort correto para drill-down baseado em sortConfig.col */
  const getDrillSortValue = (tag01: string, dim: string, dimVal: string, accFilters: Record<string, string>, col: string): number => {
    const real   = getDrillTotal(tag01, dim, 'Real',   dimVal, accFilters);
    const orcado = getDrillTotal(tag01, dim, 'Orçado', dimVal, accFilters);
    const a1     = getDrillTotal(tag01, dim, 'A-1',    dimVal, accFilters);
    const prefix = col.slice(0, col.indexOf('_'));
    switch (prefix) {
      case 'real': return real;
      case 'orc':  return orcado;
      case 'a1':   return a1;
      case 'dao':  return real - orcado;
      case 'dpo':  return orcado !== 0 ? (real - orcado) / Math.abs(orcado) : 0;
      case 'da1':  return real - a1;
      case 'dp1':  return a1 !== 0 ? (real - a1) / Math.abs(a1) : 0;
      default:     return real;
    }
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

  const drillTo = (
    scenario: string,
    tag0: string,
    tag01: string | null,
    month: string | null,
    dimFilters: Record<string, string> = {},   // filtros acumulados do drill-down
  ) => {
    if (!onDrillDown) return;
    // Quando month é null (clique no total), usa min/max dos meses selecionados
    const { from: dfrom, to: dto } = getMonthRange(selectedMonths);
    const mf = month ?? `${year}-${dfrom}`;
    const mt = month ?? `${year}-${dto}`;
    // conta_contabil vai via categories (array), demais dimensões vão via filters
    const contaContabil = dimFilters.conta_contabil ? [dimFilters.conta_contabil] : [];
    const extraDims = Object.fromEntries(
      Object.entries(dimFilters).filter(([k]) => k !== 'conta_contabil'),
    );
    onDrillDown({
      categories: contaContabil,
      scenario,
      filters: {
        tag0,
        ...(tag01 ? { tag01 } : {}),
        ...(month ? { month } : { monthFrom: mf, monthTo: mt }),
        ...(selectedMarcas.length > 0 ? { marca: selectedMarcas } : {}),
        ...(selectedFiliais.length > 0 ? { nome_filial: selectedFiliais } : {}),
        ...extraDims,
      },
    });
  };

  const toggleGroup = (tag0: string) =>
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(tag0) ? n.delete(tag0) : n.add(tag0);
      return n;
    });

  const expandAllGroups = () => {
    // 1. Abrir todos os tag0
    setCollapsed(new Set());
    // 2. Expandir todos os tag01 (drill-down)
    if (drillDimensions.length > 0) {
      const allTag01Keys: Record<string, boolean> = {};
      for (const g of displayedGroups) {
        for (const item of g.items) {
          allTag01Keys[`${g.tag0}|${item.tag01}`] = true;
        }
      }
      setExpandedTag01s(allTag01Keys);
      // 3. Expandir todos os drill sub-níveis já carregados em cache
      const allDrillKeys: Record<string, boolean> = {};
      for (const cacheKey of Object.keys(dimensionCache)) {
        const rows = dimensionCache[cacheKey];
        if (!rows) continue;
        for (const row of rows) {
          if (!row.dimension_value) continue;
          // cacheKey = "scenario|tag01|dim|filtersKey"
          const parts = cacheKey.split('|');
          const tag01 = parts[1];
          const dim = parts[2];
          const filtersKey = parts.slice(3).join('|');
          const dk = `${tag01}|${dim}|${row.dimension_value}|${filtersKey}`;
          allDrillKeys[dk] = true;
        }
      }
      setExpandedDrillRows(prev => ({ ...prev, ...allDrillKeys }));
    }
  };
  const collapseAllGroups = () => {
    const all = new Set(displayedGroups.map(g => g.tag0));
    setCollapsed(all);
    setExpandedTag01s({});
    setExpandedDrillRows({});
  };

  // ── Drag reorder columns ──
  const dragColRef = useRef<string | null>(null);
  const handleColDragStart = (el: string) => { dragColRef.current = el; };
  const handleColDragOver = (e: React.DragEvent, targetEl: string) => {
    e.preventDefault();
    if (!dragColRef.current || dragColRef.current === targetEl) return;
    setSelectionOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragColRef.current!);
      const to = arr.indexOf(targetEl);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, dragColRef.current!);
      return arr;
    });
  };
  const handleColDragEnd = () => { dragColRef.current = null; };

  // ── Exportar Excel ────────────────────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    const ExcelJS = (await import('exceljs')).default;
    // ExcelJS usa ARGB (8 chars): FF + RRGGBB
    const BG = {
      white:    'FFFFFFFF', hdr:      'FFE5E7EB',
      groupHdr: 'FF374151', tag01Row: 'FFFFFFFF',
      drillD0:  'FFFFBEB',  drillD1:  'FFEFF6FF', drillD2: 'FFF9FAFB',
      calcRow:  'FFF44C00', total:    'FF1F2937',
    };
    const FNT = {
      white: 'FFFFFFFF', neutral: 'FF1F2937', muted: 'FF9CA3AF',
      sub: 'FF4B5563', neg: 'FFDC2626', pos: 'FF15803D',
    };
    const ML: Record<string, string> = {
      '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
      '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez',
    };
    const EL: Record<string, string> = {
      'Real':'Real','Orçado':'Orçado','A1':'A-1',
      'DeltaAbsOrcado':'Δ Orç','DeltaPercOrcado':'Δ% Orç',
      'DeltaAbsA1':'Δ A-1','DeltaPercA1':'Δ% A-1',
    };

    type CellDef = { v: any; bg: string; bold?: boolean; color?: string; align?: string; fmt?: string };

    const { from: xFrom, to: xTo } = getMonthRange(selectedMonths);
    const per  = selectedMonths.length === 0 ? year : `${year}_${xFrom}-${xTo}`;
    const mode = viewMode === 'consolidado' ? 'Consol' : viewMode === 'cenario' ? 'Cenario' : 'Mes';

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`DRE_${mode}_${per}`.substring(0, 31));

    // Aplica estilo a uma célula ExcelJS
    const applyCell = (cell: ExcelJS.Cell, def: CellDef) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.bg } };
      cell.font = { bold: def.bold ?? false, color: { argb: def.color ?? FNT.neutral } };
      cell.alignment = { horizontal: (def.align ?? 'left') as any, vertical: 'middle' };
      if (def.fmt) cell.numFmt = def.fmt;
    };

    const addRow = (defs: CellDef[]) => {
      const row = ws.addRow(defs.map(d => d.v));
      row.height = 16;
      defs.forEach((def, i) => applyCell(row.getCell(i + 1), def));
    };

    // Builders de célula (retornam CellDef)
    const tD = (v: string, bg: string, bold = false, color = FNT.neutral): CellDef =>
      ({ v, bg, bold, color, align: 'left' });
    // whiteVals=true → força branco em Real/Orçado/A1 (para fundos escuros); deltas mantêm vermelho/verde
    const nD = (v: number, bg: string, bold = false, color = FNT.neutral): CellDef =>
      ({ v: Math.round(v), bg, bold, color, align: 'right', fmt: '#,##0' });
    const dD = (v: number, base: number, bg: string, bold = false): CellDef =>
      (base === 0 && v === 0)
        ? { v: 'N/D', bg, bold, color: FNT.muted, align: 'center' }
        : { v: Math.round(v), bg, bold, color: v < 0 ? FNT.neg : v > 0 ? FNT.pos : FNT.neutral, align: 'right', fmt: '#,##0' };
    const pD = (real: number, base: number, bg: string, bold = false): CellDef => {
      const delta = real - base;
      return base === 0
        ? { v: (real === 0) ? 'N/D' : '—', bg, bold, color: FNT.muted, align: 'center' }
        : { v: delta / Math.abs(base), bg, bold, color: delta < 0 ? FNT.neg : delta > 0 ? FNT.pos : FNT.neutral, align: 'center', fmt: '0.0%' };
    };

    const vDefs = (real: number, orcado: number, a1: number, bg: string, bold = false, whiteVals = false): CellDef[] => {
      const vc = whiteVals ? FNT.white : FNT.neutral;
      return activeElements.map(el => {
        switch (el) {
          case 'Real':            return nD(real,   bg, bold, vc);
          case 'Orçado':          return nD(orcado, bg, bold, vc);
          case 'A1':              return nD(a1,     bg, bold, vc);
          case 'DeltaAbsOrcado':  return dD(real - orcado, orcado, bg, bold);
          case 'DeltaPercOrcado': return pD(real, orcado, bg, bold);
          case 'DeltaAbsA1':      return dD(real - a1, a1, bg, bold);
          case 'DeltaPercA1':     return pD(real, a1, bg, bold);
          default: return { v: '', bg };
        }
      });
    };

    // Drill-down
    const getDrill = (tag01: string, dim: string, sc: string, val: string, af: Record<string, string>) => {
      const fk = Object.entries(af).sort().map(([k, v]) => `${k}=${v}`).join('&');
      return (dimensionCache[`${sc}|${tag01}|${dim}|${fk}`] || [])
        .filter((r: any) => r.dimension_value === val)
        .reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    };

    const buildDrill = (tag01: string, _tag0: string, dimIdx = 0, af: Record<string, string> = {}, depth = 0) => {
      if (!drillDimensions.length || dimIdx >= drillDimensions.length) return;
      const dim = drillDimensions[dimIdx];
      const fk  = Object.entries(af).sort().map(([k, v]) => `${k}=${v}`).join('&');
      const allVals = new Set<string>();
      for (const sc of SOMA_SCENARIOS) {
        (dimensionCache[`${sc}|${tag01}|${dim}|${fk}`] || []).forEach((r: any) => { if (r.dimension_value) allVals.add(r.dimension_value); });
      }
      let vals = Array.from(allVals);
      if (sortConfig.col === 'tag01') vals.sort((a, b) => a.localeCompare(b));
      else {
        const dir = sortConfig.dir === 'desc' ? -1 : 1;
        vals.sort((a, b) => dir * (getDrillSortValue(tag01, dim, b, af, sortConfig.col) - getDrillSortValue(tag01, dim, a, af, sortConfig.col)));
      }

      const bg     = depth === 0 ? BG.drillD0 : depth === 1 ? BG.drillD1 : BG.drillD2;
      const mark   = depth === 0 ? '◆ ' : '◇ ';
      const pad    = '  '.repeat(depth + 1);
      const dlabel = SOMA_DIMENSIONS.find(d => d.id === dim)?.label ?? dim;
      vals.forEach(val => {
        const real   = getDrill(tag01, dim, 'Real',   val, af);
        const orcado = getDrill(tag01, dim, 'Orçado', val, af);
        const a1     = getDrill(tag01, dim, 'A-1',    val, af);
        addRow([tD('', bg), tD(`${pad}${mark}${dlabel}: ${val}`, bg, false, FNT.sub), ...vDefs(real, orcado, a1, bg)]);
        const dk = `${tag01}|${dim}|${val}|${fk}`;
        if (dimIdx < drillDimensions.length - 1 && expandedDrillRows[dk]) {
          buildDrill(tag01, _tag0, dimIdx + 1, { ...af, [dim]: val }, depth + 1);
        }
      });
    };

    // Helpers mensais
    type MD = { real: number; orcado: number; a1: number };
    const sumMD = (byMonth: Record<string, MD>): MD =>
      Object.values(byMonth).reduce((a, m) => ({ real: a.real + m.real, orcado: a.orcado + m.orcado, a1: a.a1 + m.a1 }), { real: 0, orcado: 0, a1: 0 });

    const vMDefs = (md: MD, bg: string, bold = false, whiteVals = false): CellDef[] => {
      const vc = whiteVals ? FNT.white : FNT.neutral;
      return activeElements.map(el => {
        switch (el) {
          case 'Real':            return nD(md.real,   bg, bold, vc);
          case 'Orçado':          return nD(md.orcado, bg, bold, vc);
          case 'A1':              return nD(md.a1,     bg, bold, vc);
          case 'DeltaAbsOrcado':  return dD(md.real - md.orcado, md.orcado, bg, bold);
          case 'DeltaPercOrcado': return pD(md.real, md.orcado, bg, bold);
          case 'DeltaAbsA1':      return dD(md.real - md.a1, md.a1, bg, bold);
          case 'DeltaPercA1':     return pD(md.real, md.a1, bg, bold);
          default: return { v: '', bg };
        }
      });
    };

    const buildMonthDefs = (byMonth: Record<string, MD>, bg: string, bold = false, whiteVals = false): CellDef[] => {
      const defs: CellDef[] = [];
      const tot = sumMD(byMonth);
      const vc = whiteVals ? FNT.white : FNT.neutral;
      if (viewMode === 'cenario') {
        activeElements.forEach(el => {
          monthsToShow.forEach(m => {
            const md = byMonth[m] || { real: 0, orcado: 0, a1: 0 };
            switch (el) {
              case 'Real':            defs.push(nD(md.real,   bg, bold, vc)); break;
              case 'Orçado':          defs.push(nD(md.orcado, bg, bold, vc)); break;
              case 'A1':              defs.push(nD(md.a1,     bg, bold, vc)); break;
              case 'DeltaAbsOrcado':  defs.push(dD(md.real - md.orcado, md.orcado, bg, bold)); break;
              case 'DeltaPercOrcado': defs.push(pD(md.real, md.orcado, bg, bold)); break;
              case 'DeltaAbsA1':      defs.push(dD(md.real - md.a1, md.a1, bg, bold)); break;
              case 'DeltaPercA1':     defs.push(pD(md.real, md.a1, bg, bold)); break;
              default: defs.push({ v: '', bg });
            }
          });
          switch (el) {
            case 'Real':            defs.push(nD(tot.real,   bg, bold, vc)); break;
            case 'Orçado':          defs.push(nD(tot.orcado, bg, bold, vc)); break;
            case 'A1':              defs.push(nD(tot.a1,     bg, bold, vc)); break;
            case 'DeltaAbsOrcado':  defs.push(dD(tot.real - tot.orcado, tot.orcado, bg, bold)); break;
            case 'DeltaPercOrcado': defs.push(pD(tot.real, tot.orcado, bg, bold)); break;
            case 'DeltaAbsA1':      defs.push(dD(tot.real - tot.a1, tot.a1, bg, bold)); break;
            case 'DeltaPercA1':     defs.push(pD(tot.real, tot.a1, bg, bold)); break;
            default: defs.push({ v: '', bg });
          }
        });
      } else {
        monthsToShow.forEach(m => defs.push(...vMDefs(byMonth[m] || { real: 0, orcado: 0, a1: 0 }, bg, bold, whiteVals)));
        defs.push(...vMDefs(tot, bg, bold, whiteVals));
      }
      return defs;
    };

    // ── Montar worksheet ─────────────────────────────────────────────────
    if (viewMode === 'consolidado') {
      addRow([tD('Grupo (Tag0)', BG.hdr, true), tD('Tag01', BG.hdr, true), ...activeElements.map(el => tD(EL[el] ?? el, BG.hdr, true))]);
      displayedGroups.forEach((g, idx) => {
        addRow([tD(g.tag0, BG.groupHdr, true, FNT.white), tD('▶ SUBTOTAL', BG.groupHdr, true, FNT.white), ...vDefs(g.real, g.orcado, g.a1, BG.groupHdr, true, true)]);
        g.items.forEach(item => {
          addRow([tD(g.tag0, BG.tag01Row), tD(item.tag01, BG.tag01Row), ...vDefs(item.real, item.orcado, item.a1, BG.tag01Row)]);
          if (expandedTag01s[`${g.tag0}|${item.tag01}`] && drillDimensions.length > 0) buildDrill(item.tag01, g.tag0);
        });
        if (!hasTagFilter) {
          if (idx === lastIdx03) addRow([tD('▶ MARGEM DE CONTRIBUIÇÃO', BG.calcRow, true, FNT.white), tD('', BG.calcRow), ...vDefs(margemData.real, margemData.orcado, margemData.a1, BG.calcRow, true)]);
          if (idx === lastIdx04 || (idx === lastIdx03 && lastIdx04 === -1)) addRow([tD('▶ EBITDA (S/ RATEIO RAIZ CSC)', BG.calcRow, true, FNT.white), tD('', BG.calcRow), ...vDefs(ebitdaData.real, ebitdaData.orcado, ebitdaData.a1, BG.calcRow, true)]);
        }
      });
      addRow([tD('TOTAL GERAL', BG.total, true, FNT.white), tD('', BG.total), ...vDefs(totals.real, totals.orcado, totals.a1, BG.total, true, true)]);
    } else {
      const mls = monthsToShow.map(m => ML[m.split('-')[1]] ?? m.split('-')[1]);
      const h1: CellDef[] = [tD('Grupo (Tag0)', BG.hdr, true), tD('Tag01', BG.hdr, true)];
      const h2: CellDef[] = [tD('', BG.hdr), tD('', BG.hdr)];
      if (viewMode === 'cenario') {
        activeElements.forEach((el, ei) => {
          monthsToShow.forEach((_, mi) => { h1.push(tD(mi === 0 ? EL[el] ?? el : '', BG.hdr, true)); h2.push(tD(mls[mi], BG.hdr, false, FNT.sub)); });
          h1.push(tD(ei === 0 ? 'Total' : '', BG.hdr, true)); h2.push(tD(EL[el] ?? el, BG.hdr, false, FNT.sub));
        });
      } else {
        monthsToShow.forEach((_, mi) => { activeElements.forEach((el, ei) => { h1.push(tD(ei === 0 ? mls[mi] : '', BG.hdr, true)); h2.push(tD(EL[el] ?? el, BG.hdr, false, FNT.sub)); }); });
        activeElements.forEach((el, ei) => { h1.push(tD(ei === 0 ? 'Total' : '', BG.hdr, true)); h2.push(tD(EL[el] ?? el, BG.hdr, false, FNT.sub)); });
      }
      addRow(h1); addRow(h2);
      displayedMonthlyGroups.forEach((g, idx) => {
        addRow([tD(g.tag0, BG.groupHdr, true, FNT.white), tD('▶ SUBTOTAL', BG.groupHdr, true, FNT.white), ...buildMonthDefs(g.byMonth, BG.groupHdr, true, true)]);
        g.items.forEach(item => addRow([tD(g.tag0, BG.tag01Row), tD(item.tag01, BG.tag01Row), ...buildMonthDefs(item.byMonth, BG.tag01Row)]));
        if (!hasTagFilter) {
          if (idx === lastIdx03M) addRow([tD('▶ MARGEM DE CONTRIBUIÇÃO', BG.calcRow, true, FNT.white), tD('', BG.calcRow), ...buildMonthDefs(monthlyMargemData, BG.calcRow, true)]);
          if (idx === lastIdx04M || (idx === lastIdx03M && lastIdx04M === -1)) addRow([tD('▶ EBITDA (S/ RATEIO RAIZ CSC)', BG.calcRow, true, FNT.white), tD('', BG.calcRow), ...buildMonthDefs(monthlyEbitdaData, BG.calcRow, true)]);
        }
      });
      addRow([tD('TOTAL GERAL', BG.total, true, FNT.white), tD('', BG.total), ...buildMonthDefs(monthlyTotals, BG.total, true, true)]);
    }

    // Larguras de coluna
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 36;
    const nMth = monthsToShow.length;
    const nEl  = activeElements.length;
    const nDataCols = viewMode === 'consolidado' ? nEl
                    : viewMode === 'cenario'     ? nEl * (nMth + 1)
                    : nMth * nEl + nEl;
    for (let i = 3; i <= 2 + nDataCols; i++) {
      ws.getColumn(i).width = viewMode !== 'consolidado' ? 11 : (activeElements[i - 3]?.includes('Perc') ? 9 : 16);
    }

    // Freeze panes
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: viewMode === 'consolidado' ? 1 : 2 }];

    // Download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dre_gerencial_${viewMode}_${per}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }, [
    viewMode, displayedGroups, displayedMonthlyGroups, activeElements,
    expandedTag01s, expandedDrillRows, drillDimensions, dimensionCache,
    hasTagFilter, margemData, ebitdaData, monthlyMargemData, monthlyEbitdaData,
    monthlyTotals, totals, lastIdx03, lastIdx04, lastIdx03M, lastIdx04M,
    year, selectedMonths, monthsToShow, sortConfig,
  ]);

  // Refresh forçado: invalida cache antes de buscar
  const forceRefresh = useCallback(() => {
    invalidateSomaTagsCache();
    setDimensionCache({});  // Limpa cache de drill-down (vendor, tag02, etc.)
    fetchData();
  }, [fetchData]);

  // ── Gerar Foto DRE (snapshot para Corte DRE / Justificativas) ────────────
  const handleGenerateSnapshot = useCallback(async () => {
    // Exige exatamente 1 mês selecionado — foto é mensal
    if (selectedMonths.length !== 1) {
      toast.error('Selecione exatamente 1 mês no filtro para gerar a foto');
      return;
    }
    if (displayedGroups.length === 0) {
      toast.error('Nenhum dado na DRE para gerar foto');
      return;
    }
    const yearMonth = `${year}-${selectedMonths[0]}`;

    setIsGeneratingSnapshot(true);
    try {
      const result = await generateSnapshotFromDre(yearMonth, displayedGroups, {
        marca: selectedMarcas.length === 1 ? selectedMarcas[0] : undefined,
        depth: 2,
      });
      if (result.error) {
        toast.error(`Erro: ${result.error}`);
      } else {
        const monthLabel = MONTH_LABELS[selectedMonths[0]] || selectedMonths[0];
        const parts = [];
        if (result.created > 0) parts.push(`${result.created} novos`);
        if (result.updated > 0) parts.push(`${result.updated} atualizados`);
        toast.success(`Foto ${monthLabel}/${year} v${result.version}: ${parts.join(' + ') || '0 itens'}`);
      }
    } catch (e) {
      toast.error('Erro ao gerar foto da DRE');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  }, [displayedGroups, selectedMonths, year, selectedMarcas]);

  // Registra ações no App.tsx (header) — deve ficar após exportExcel e fetchData
  useEffect(() => {
    onRegisterActions?.({ refresh: forceRefresh, exportExcel });
  }, [onRegisterActions, forceRefresh, exportExcel]);

  // Sincroniza loading com App.tsx
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);

  // Sincroniza presença de dados com App.tsx
  useEffect(() => { onDataChange?.(groups.length > 0); }, [groups.length, onDataChange]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const tag01Count   = displayedGroups.reduce((s, g) => s + g.items.length, 0);
  const hasOrcado    = displayedGroups.some(g => g.orcado !== 0);
  const hasAnyFilter = selectedMarcas.length > 0 || selectedFiliais.length > 0 || selectedTags01.length > 0 || selectedTags02.length > 0 || selectedTags03.length > 0 || selectedVendors.length > 0;
  const scenarioCount = [showReal, showOrcado, showA1].filter(Boolean).length;
  // Contagem para Mês: inclui deltas quando ativos
  const mesColCount = [showReal, showOrcado, showDeltaAbsOrcado, showDeltaPercOrcado, showA1, showDeltaAbsA1, showDeltaPercA1].filter(Boolean).length;
  const elToMesKey: Record<string, string> = {
    'Real': 'real', 'Orçado': 'orcado',
    'DeltaAbsOrcado': 'deltaAbsOrcado', 'DeltaPercOrcado': 'deltaPercOrcado',
    'A1': 'a1', 'DeltaAbsA1': 'deltaAbsA1', 'DeltaPercA1': 'deltaPercA1',
  };
  const mesFirstCol = activeElements.length > 0 ? (elToMesKey[activeElements[0]] ?? 'real') : 'real';

  const QUARTERS = [
    { label: 'Ano', months: [] as string[],          title: 'Ano completo (limpar filtro de mês)' },
    { label: '1T',  months: ['01','02','03'],         title: '1º Trimestre (Jan–Mar)' },
    { label: '2T',  months: ['04','05','06'],         title: '2º Trimestre (Abr–Jun)' },
    { label: '3T',  months: ['07','08','09'],         title: '3º Trimestre (Jul–Set)' },
    { label: '4T',  months: ['10','11','12'],         title: '4º Trimestre (Out–Dez)' },
  ];
  const isQuarterActive = (q: typeof QUARTERS[0]) => {
    if (q.months.length === 0) return selectedMonths.length === 0;
    return q.months.length === selectedMonths.length &&
      q.months.every(m => selectedMonths.includes(m));
  };

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

    if (sortConfig.col === 'tag01') {
      vals.sort((a, b) => a.localeCompare(b));
    } else {
      const dir = sortConfig.dir === 'desc' ? -1 : 1;
      vals.sort((a, b) => dir * (getDrillSortValue(tag01, dim, b, accFilters, sortConfig.col) - getDrillSortValue(tag01, dim, a, accFilters, sortConfig.col)));
    }

    if (vals.length === 0) {
      return (
        <tr key={`drill-empty-${tag01}-${dim}-${depth}-${filtersKey}`} className="bg-yellow-50">
          <td colSpan={100} className="py-1 text-[9px] text-gray-400 italic" style={{ paddingLeft: `${indentPx}px` }}>Sem dados</td>
        </tr>
      );
    }

    // Cores por profundidade
    const bgBase    = depth === 0 ? 'bg-amber-50' : depth === 1 ? 'bg-blue-50' : 'bg-gray-50';
    const markerClr = depth === 0 ? 'text-amber-500'  : 'text-blue-400';
    const marker    = depth === 0 ? '◆' : '◇';

    return vals.map(val => {
      const drillKey   = `${tag01}|${dim}|${val}|${filtersKey}`;
      const isExpanded = hasChildren && !!expandedDrillRows[drillKey];

      const real   = getDrillTotal(tag01, dim, 'Real',   val, accFilters);
      const orcado = getDrillTotal(tag01, dim, 'Orçado', val, accFilters);
      const a1     = getDrillTotal(tag01, dim, 'A-1',    val, accFilters);
      const dOrç = real - orcado; const dA1 = real - a1;
      const rHasOrc = orcado !== 0 || real !== 0; const rHasA1 = a1 !== 0 || real !== 0;

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

      const trCls   = `group ${bgBase} border-b border-amber-100 hover:bg-yellow-300 transition-colors`;
      const col1Cls = `px-2 py-0.5 w-8 sticky left-0 z-20 ${bgBase} group-hover:bg-yellow-300 transition-colors`;
      const col2Cls = `py-0.5 pr-2 text-gray-700 font-semibold truncate sticky left-8 z-20 w-[280px] text-[10px] ${bgBase} group-hover:bg-yellow-300 transition-colors`;

      const df = { ...accFilters, [dim]: val }; // filtros desta linha de drill
      if (viewMode === 'consolidado') {
        return (
          <React.Fragment key={`drill-frag-${dim}-${tag01}-${val}-${filtersKey}`}>
            <tr className={trCls}>
              <td className={col1Cls} />
              <td className={col2Cls}>{labelContent}</td>
              {activeElements.map(el => {
                switch (el) {
                  case 'Real':            return cols.real            ? <td key="real" className="px-2 py-0.5 text-center font-mono text-gray-800 text-[12px] border-r border-gray-100 cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Real',   tag0, tag01, null, df)}>{fmt(real)}</td> : null;
                  case 'Orçado':          return cols.orcado          ? <td key="orc"  className={`px-2 py-0.5 text-center font-mono text-[12px] cursor-pointer hover:bg-yellow-300 transition-colors ${rHasOrc ? 'text-gray-800' : 'text-gray-300'}`} onDoubleClick={() => drillTo('Orçado', tag0, tag01, null, df)}>{rHasOrc ? fmt(orcado) : '—'}</td> : null;
                  case 'DeltaAbsOrcado':  return cols.deltaAbsOrcado  ? <td key="dao"  className={`px-2 py-0.5 text-center font-mono text-[12px] ${rHasOrc ? deltaClass(dOrç, orcado) : 'text-gray-300'}`}>{rHasOrc ? fmt(dOrç) : '—'}</td> : null;
                  case 'DeltaPercOrcado': return cols.deltaPercOrcado ? <td key="dpo"  className={`px-2 py-0.5 text-center font-mono text-[12px] border-r border-gray-200 ${rHasOrc ? deltaClass(dOrç, orcado) : 'text-gray-300'}`}>{rHasOrc ? fmtPct(real, orcado) : '—'}</td> : null;
                  case 'A1':              return cols.a1              ? <td key="a1"   className={`px-2 py-0.5 text-center font-mono text-[12px] cursor-pointer hover:bg-yellow-300 transition-colors ${rHasA1 ? 'text-gray-800' : 'text-gray-300'}`} onDoubleClick={() => drillTo('A-1',    tag0, tag01, null, df)}>{rHasA1 ? fmt(a1) : '—'}</td> : null;
                  case 'DeltaAbsA1':      return cols.deltaAbsA1      ? <td key="da1"  className={`px-2 py-0.5 text-center font-mono text-[12px] ${rHasA1 ? deltaClass(dA1, a1) : 'text-gray-300'}`}>{rHasA1 ? fmt(dA1) : '—'}</td> : null;
                  case 'DeltaPercA1':     return cols.deltaPercA1     ? <td key="dp1"  className={`px-2 py-0.5 text-center font-mono text-[12px] ${rHasA1 ? deltaClass(dA1, a1) : 'text-gray-300'}`}>{rHasA1 ? fmtPct(real, a1) : '—'}</td> : null;
                  default: return null;
                }
              })}
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
        const hOrc = orcado !== 0 || real !== 0; const hA1 = a1 !== 0 || real !== 0;
        return (
          <React.Fragment key={`drill-frag-${dim}-${tag01}-${val}-${filtersKey}`}>
            <tr className={trCls}>
              <td className={col1Cls} />
              <td className={col2Cls}>{labelContent}</td>
              {activeElements.map(el => {
                switch (el) {
                  case 'Real':            return showReal            ? <React.Fragment key="real">{monthsToShow.map(m => { const v = realByM[m] || 0; return <td key={`r-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Real',   tag0, tag01, m, df)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] bg-blue-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Real',   tag0, tag01, null, df)}>{fmtK(real)}</td></React.Fragment> : null;
                  case 'Orçado':          return showOrcado          ? <React.Fragment key="orc">{monthsToShow.map(m => { const v = orcByM[m]  || 0; return <td key={`o-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Orçado', tag0, tag01, m, df)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] bg-emerald-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Orçado', tag0, tag01, null, df)}>{fmtK(orcado)}</td></React.Fragment> : null;
                  case 'A1':              return showA1              ? <React.Fragment key="a1">{monthsToShow.map(m => { const v = a1ByM[m]   || 0; return <td key={`a-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('A-1',    tag0, tag01, m, df)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] bg-purple-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('A-1',    tag0, tag01, null, df)}>{fmtK(a1)}</td></React.Fragment> : null;
                  case 'DeltaAbsOrcado':  return showDeltaAbsOrcado  ? <React.Fragment key="dao">{monthsToShow.map(m => { const rv = realByM[m]||0; const ov = orcByM[m]||0; const d = rv-ov; const h = ov!==0; return <td key={`dao-${m}`} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d,ov) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT,orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></React.Fragment> : null;
                  case 'DeltaPercOrcado': return showDeltaPercOrcado ? <React.Fragment key="dpo">{monthsToShow.map(m => { const rv = realByM[m]||0; const ov = orcByM[m]||0; const d = rv-ov; const h = ov!==0; return <td key={`dpo-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d,ov) : 'text-gray-300'}`}>{h ? fmtPct(rv,ov) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT,orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(real,orcado) : '—'}</td></React.Fragment> : null;
                  case 'DeltaAbsA1':      return showDeltaAbsA1      ? <React.Fragment key="da1">{monthsToShow.map(m => { const rv = realByM[m]||0; const av = a1ByM[m]||0; const d = rv-av; const h = av!==0; return <td key={`da1-${m}`} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d,av) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T,a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></React.Fragment> : null;
                  case 'DeltaPercA1':     return showDeltaPercA1     ? <React.Fragment key="dp1">{monthsToShow.map(m => { const rv = realByM[m]||0; const av = a1ByM[m]||0; const d = rv-av; const h = av!==0; return <td key={`dp1-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d,av) : 'text-gray-300'}`}>{h ? fmtPct(rv,av) : '—'}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T,a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(real,a1) : '—'}</td></React.Fragment> : null;
                  default: return null;
                }
              })}
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
        const hOrc = orcado !== 0 || real !== 0; const hA1 = a1 !== 0 || real !== 0;
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
                    {activeElements.map(el => {
                      switch (el) {
                        case 'Real':            return showReal            ? <td key="r"   className={`px-1 py-0.5 text-center font-mono text-gray-800 text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='Real'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('Real',   tag0, tag01, m, df)}>{rv!==0?fmtK(rv):<span className="text-gray-300">—</span>}</td> : null;
                        case 'Orçado':          return showOrcado          ? <td key="o"   className={`px-1 py-0.5 text-center font-mono text-gray-600 text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='Orçado'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('Orçado', tag0, tag01, m, df)}>{ov!==0?fmtK(ov):<span className="text-gray-300">—</span>}</td> : null;
                        case 'DeltaAbsOrcado':  return showDeltaAbsOrcado  ? <td key="dao" className={`px-0.5 py-0.5 text-center font-mono text-[12px] w-[85px] ${ov!==0?deltaClass(dOrçM,ov):'text-gray-300'} ${activeElements[0]==='DeltaAbsOrcado'?'border-l-2 border-l-gray-200':''}`}>{ov!==0?fmtK(dOrçM):'—'}</td> : null;
                        case 'DeltaPercOrcado': return showDeltaPercOrcado ? <td key="dpo" className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${ov!==0?deltaClass(dOrçM,ov):'text-gray-300'} ${activeElements[0]==='DeltaPercOrcado'?'border-l-2 border-l-gray-200':''}`}>{ov!==0?fmtPct(rv,ov):'—'}</td> : null;
                        case 'A1':              return showA1              ? <td key="a"   className={`px-1 py-0.5 text-center font-mono text-gray-600 text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='A1'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('A-1',    tag0, tag01, m, df)}>{av!==0?fmtK(av):<span className="text-gray-300">—</span>}</td> : null;
                        case 'DeltaAbsA1':      return showDeltaAbsA1      ? <td key="da1" className={`px-0.5 py-0.5 text-center font-mono text-[12px] w-[85px] ${av!==0?deltaClass(dA1M,av):'text-gray-300'} ${activeElements[0]==='DeltaAbsA1'?'border-l-2 border-l-gray-200':''}`}>{av!==0?fmtK(dA1M):'—'}</td> : null;
                        case 'DeltaPercA1':     return showDeltaPercA1     ? <td key="dp1" className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${av!==0?deltaClass(dA1M,av):'text-gray-300'}`}>{av!==0?fmtPct(rv,av):'—'}</td> : null;
                        default: return null;
                      }
                    })}
                  </React.Fragment>
                );
              })}
              {activeElements.map(el => {
                switch (el) {
                  case 'Real':            return showReal            ? <td key="r-t"   className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-blue-50 text-[#152e55] cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='Real'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('Real',   tag0, tag01, null, df)}>{fmtK(real)}</td> : null;
                  case 'Orçado':          return showOrcado          ? <td key="o-t"   className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-green-50 text-green-900 cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='Orçado'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('Orçado', tag0, tag01, null, df)}>{fmtK(orcado)}</td> : null;
                  case 'DeltaAbsOrcado':  return showDeltaAbsOrcado  ? <td key="dao-t" className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-green-50 ${activeElements[0]==='DeltaAbsOrcado'?'border-l-2 border-l-gray-200':''} ${hOrc?deltaClass(dOrçT,orcado):'text-gray-300'}`}>{hOrc?fmtK(dOrçT):'—'}</td> : null;
                  case 'DeltaPercOrcado': return showDeltaPercOrcado ? <td key="dpo-t" className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-green-50 ${activeElements[0]==='DeltaPercOrcado'?'border-l-2 border-l-gray-200':''} ${hOrc?deltaClass(dOrçT,orcado):'text-gray-300'}`}>{hOrc?fmtPct(real,orcado):'—'}</td> : null;
                  case 'A1':              return showA1              ? <td key="a-t"   className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-purple-50 text-purple-900 cursor-pointer hover:bg-yellow-300 transition-colors ${activeElements[0]==='A1'?'border-l-2 border-l-gray-200':''}`} onDoubleClick={() => drillTo('A-1',    tag0, tag01, null, df)}>{fmtK(a1)}</td> : null;
                  case 'DeltaAbsA1':      return showDeltaAbsA1      ? <td key="da1-t" className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-purple-50 ${activeElements[0]==='DeltaAbsA1'?'border-l-2 border-l-gray-200':''} ${hA1?deltaClass(dA1T,a1):'text-gray-300'}`}>{hA1?fmtK(dA1T):'—'}</td> : null;
                  case 'DeltaPercA1':     return showDeltaPercA1     ? <td key="dp1-t" className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-purple-50 ${hA1?deltaClass(dA1T,a1):'text-gray-300'}`}>{hA1?fmtPct(real,a1):'—'}</td> : null;
                  default: return null;
                }
              })}
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
    <tr className={`group bg-[#F44C00] text-white font-black text-[12px] h-6 shadow-sm
                   ${borderTop ? 'border-t-2 border-yellow-400' : ''}`}>
      <td colSpan={2}
          className="sticky left-0 bg-[#F44C00] z-20 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
        <div className="flex items-center gap-1 px-2 uppercase tracking-tighter truncate font-black">
          <Activity size={12} /> {label}
        </div>
      </td>
      {viewMode === 'cenario' && (() => {
        const dOrçT = totData.real - totData.orcado; const dA1T = totData.real - totData.a1;
        const hOrc = totData.orcado !== 0 || totData.real !== 0; const hA1 = totData.a1 !== 0 || totData.real !== 0;
        return (
          <>
            {activeElements.map(el => {
              switch (el) {
                case 'Real':            return <React.Fragment key="real">{monthsToShow.map(m => { const v = byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 text-center font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-center font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.real)}</td></React.Fragment>;
                case 'Orçado':          return <React.Fragment key="orc">{monthsToShow.map(m => { const v = byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 text-center font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-center font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.orcado)}</td></React.Fragment>;
                case 'A1':              return <React.Fragment key="a1">{monthsToShow.map(m => { const v = byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 text-center font-mono w-[70px]">{fmtK(v)}</td>; })}<td className="px-1 text-center font-mono font-black border-l border-white/20 bg-black/10 w-[80px]">{fmtK(totData.a1)}</td></React.Fragment>;
                case 'DeltaAbsOrcado':  return <React.Fragment key="dao">{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dao-${m}`} className={`px-1 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d, md.orcado, true) : 'text-orange-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 text-center font-mono font-black border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></React.Fragment>;
                case 'DeltaPercOrcado': return <React.Fragment key="dpo">{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dpo-${m}`} className={`px-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado, true) : 'text-orange-300'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtPct(totData.real, totData.orcado) : '—'}</td></React.Fragment>;
                case 'DeltaAbsA1':      return <React.Fragment key="da1">{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`da1-${m}`} className={`px-1 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d, md.a1, true) : 'text-orange-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 text-center font-mono font-black border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></React.Fragment>;
                case 'DeltaPercA1':     return <React.Fragment key="dp1">{monthsToShow.map(m => { const md = byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`dp1-${m}`} className={`px-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1, true) : 'text-orange-300'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtPct(totData.real, totData.a1) : '—'}</td></React.Fragment>;
                default: return null;
              }
            })}
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
                {activeElements.map(el => {
                  switch (el) {
                    case 'Real':            return <td key="r"   className={`px-1 text-center font-mono w-[80px] hover:bg-yellow-300 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.real)}</td>;
                    case 'Orçado':          return <td key="o"   className={`px-1 text-center font-mono w-[80px] hover:bg-yellow-300 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.orcado)}</td>;
                    case 'DeltaAbsOrcado':  return <td key="dao" className={`px-0.5 text-center font-mono text-[12px] font-black w-[85px] ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado, true) : 'text-orange-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/30' : ''}`}>{(md.orcado !== 0 || md.real !== 0) ? fmtK(dOrçM) : '—'}</td>;
                    case 'DeltaPercOrcado': return <td key="dpo" className={`px-0.5 text-center text-[9px] w-[70px] ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado, true) : 'text-orange-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtPct(md.real, md.orcado)}</td>;
                    case 'A1':              return <td key="a"   className={`px-1 text-center font-mono w-[80px] hover:bg-yellow-300 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(md.a1)}</td>;
                    case 'DeltaAbsA1':      return <td key="da1" className={`px-0.5 text-center font-mono text-[12px] font-black w-[85px] ${(md.a1 !== 0 || md.real !== 0) ? deltaClass(dA1M, md.a1, true) : 'text-orange-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/30' : ''}`}>{(md.a1 !== 0 || md.real !== 0) ? fmtK(dA1M) : '—'}</td>;
                    case 'DeltaPercA1':     return <td key="dp1" className="px-0.5 text-center text-[9px] w-[70px] text-orange-300">{fmtPct(md.real, md.a1)}</td>;
                    default: return null;
                  }
                })}
              </React.Fragment>
            );
          })}
          {(() => {
            const dOrçT = totData.real - totData.orcado; const dA1T = totData.real - totData.a1;
            const hOrc = totData.orcado !== 0 || totData.real !== 0; const hA1 = totData.a1 !== 0 || totData.real !== 0;
            return (<>
              {activeElements.map(el => {
                switch (el) {
                  case 'Real':            return <td key="r-t"   className={`px-1 text-center font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.real)}</td>;
                  case 'Orçado':          return <td key="o-t"   className={`px-1 text-center font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.orcado)}</td>;
                  case 'DeltaAbsOrcado':  return <td key="dao-t" className={`px-0.5 text-center font-mono text-[12px] font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/30' : ''} ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>;
                  case 'DeltaPercOrcado': return <td key="dpo-t" className={`px-0.5 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/30' : ''} ${hOrc ? deltaClass(dOrçT, totData.orcado, true) : 'text-orange-300'}`}>{fmtPct(totData.real, totData.orcado)}</td>;
                  case 'A1':              return <td key="a-t"   className={`px-1 text-center font-mono font-black w-[100px] bg-black/10 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/30' : ''}`}>{fmtK(totData.a1)}</td>;
                  case 'DeltaAbsA1':      return <td key="da1-t" className={`px-0.5 text-center font-mono text-[12px] font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/30' : ''} ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>;
                  case 'DeltaPercA1':     return <td key="dp1-t" className={`px-0.5 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, totData.a1, true) : 'text-orange-300'}`}>{fmtPct(totData.real, totData.a1)}</td>;
                  default: return null;
                }
              })}
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
        <th colSpan={2} rowSpan={2} onClick={() => handleColSort('tag01')} className="sticky left-0 z-[60] bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle cursor-pointer select-none hover:brightness-110 transition-all">
          CONTAS GERENCIAIS<SortIcon col="tag01" />
        </th>
        {activeElements.map(el => {
          switch (el) {
            case 'Real':            return <th key="real" colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['Real']}`}>REAL</th>;
            case 'Orçado':          return <th key="orc"  colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['Orçado']}`}>ORÇADO</th>;
            case 'A1':              return <th key="a1"   colSpan={monthsToShow.length + 1} className={`px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-r border-white/20 shadow-sm ${scenarioHeaderBg['A-1']}`}>A-1</th>;
            case 'DeltaAbsOrcado':  return <th key="dao"  colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-teal-700 to-teal-600">ΔR$ Orç</th>;
            case 'DeltaPercOrcado': return <th key="dpo"  colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-teal-700 to-teal-600">Δ% Orç</th>;
            case 'DeltaAbsA1':      return <th key="da1"  colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-violet-700 to-violet-600">ΔR$ A-1</th>;
            case 'DeltaPercA1':     return <th key="dp1"  colSpan={monthsToShow.length + 1} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider border-l border-white/20 shadow-sm bg-gradient-to-r from-violet-700 to-violet-600">Δ% A-1</th>;
            default: return null;
          }
        })}
      </tr>
      <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white h-6">
        {activeElements.map(el => {
          switch (el) {
            case 'Real':            return <React.Fragment key="real">{monthsToShow.map(m => <th key={`r-${m}`} onClick={() => handleColSort(`real_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['Real']}`}>{getML(m)}<SortIcon col={`real_${m}`} /></th>)}<th onClick={() => handleColSort('real_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['Real']}`}>Total<SortIcon col="real_total" /></th></React.Fragment>;
            case 'Orçado':          return <React.Fragment key="orc">{monthsToShow.map(m => <th key={`o-${m}`} onClick={() => handleColSort(`orc_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['Orçado']}`}>{getML(m)}<SortIcon col={`orc_${m}`} /></th>)}<th onClick={() => handleColSort('orc_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['Orçado']}`}>Total<SortIcon col="orc_total" /></th></React.Fragment>;
            case 'A1':              return <React.Fragment key="a1">{monthsToShow.map(m => <th key={`a-${m}`} onClick={() => handleColSort(`a1_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['A-1']}`}>{getML(m)}<SortIcon col={`a1_${m}`} /></th>)}<th onClick={() => handleColSort('a1_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all ${scenarioSubBg['A-1']}`}>Total<SortIcon col="a1_total" /></th></React.Fragment>;
            case 'DeltaAbsOrcado':  return <React.Fragment key="dao">{monthsToShow.map(m => <th key={`dao-${m}`} onClick={() => handleColSort(`dao_${m}`)} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-teal-500 to-teal-600">{getML(m)}<SortIcon col={`dao_${m}`} /></th>)}<th onClick={() => handleColSort('dao_total')} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-teal-500 to-teal-600">Total<SortIcon col="dao_total" /></th></React.Fragment>;
            case 'DeltaPercOrcado': return <React.Fragment key="dpo">{monthsToShow.map(m => <th key={`dpo-${m}`} onClick={() => handleColSort(`dpo_${m}`)} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-teal-500 to-teal-600">{getML(m)}<SortIcon col={`dpo_${m}`} /></th>)}<th onClick={() => handleColSort('dpo_total')} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-teal-500 to-teal-600">Total<SortIcon col="dpo_total" /></th></React.Fragment>;
            case 'DeltaAbsA1':      return <React.Fragment key="da1">{monthsToShow.map(m => <th key={`da1-${m}`} onClick={() => handleColSort(`da1_${m}`)} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-violet-500 to-violet-600">{getML(m)}<SortIcon col={`da1_${m}`} /></th>)}<th onClick={() => handleColSort('da1_total')} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-violet-500 to-violet-600">Total<SortIcon col="da1_total" /></th></React.Fragment>;
            case 'DeltaPercA1':     return <React.Fragment key="dp1">{monthsToShow.map(m => <th key={`dp1-${m}`} onClick={() => handleColSort(`dp1_${m}`)} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-violet-500 to-violet-600">{getML(m)}<SortIcon col={`dp1_${m}`} /></th>)}<th onClick={() => handleColSort('dp1_total')} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] border-l border-white/20 cursor-pointer select-none hover:brightness-110 transition-all bg-gradient-to-br from-violet-500 to-violet-600">Total<SortIcon col="dp1_total" /></th></React.Fragment>;
            default: return null;
          }
        })}
      </tr>
    </thead>
  );

  // ── Render: Cabeçalho de Mês ──────────────────────────────────────────────
  const renderMesHeader = () => (
    <thead className="sticky top-0 z-50 shadow-lg whitespace-nowrap">
      <tr className="text-white h-7">
        <th colSpan={2} rowSpan={2} onClick={() => handleColSort('tag01')} className="sticky left-0 z-[60] bg-[#152e55] px-3 py-0.5 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle cursor-pointer select-none hover:brightness-110 transition-all">
          CONTAS GERENCIAIS<SortIcon col="tag01" />
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
            {activeElements.map(el => {
              switch (el) {
                case 'Real':            return <th key="r"   onClick={() => handleColSort(`real_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>Real<SortIcon col={`real_${m}`} /></th>;
                case 'Orçado':          return <th key="o"   onClick={() => handleColSort(`orc_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>Orç<SortIcon col={`orc_${m}`} /></th>;
                case 'DeltaAbsOrcado':  return <th key="dao" onClick={() => handleColSort(`dao_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[85px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrçR$<SortIcon col={`dao_${m}`} /></th>;
                case 'DeltaPercOrcado': return <th key="dpo" onClick={() => handleColSort(`dpo_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrç%<SortIcon col={`dpo_${m}`} /></th>;
                case 'A1':              return <th key="a"   onClick={() => handleColSort(`a1_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[80px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>A-1<SortIcon col={`a1_${m}`} /></th>;
                case 'DeltaAbsA1':      return <th key="da1" onClick={() => handleColSort(`da1_${m}`)} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[85px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>ΔA-1R$<SortIcon col={`da1_${m}`} /></th>;
                case 'DeltaPercA1':     return <th key="dp1" onClick={() => handleColSort(`dp1_${m}`)} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[70px] bg-[#1B75BB] cursor-pointer select-none hover:brightness-110 transition-all">ΔA-1%<SortIcon col={`dp1_${m}`} /></th>;
                default: return null;
              }
            })}
          </React.Fragment>
        ))}
        {activeElements.map(el => {
          switch (el) {
            case 'Real':            return <th key="r-t"   onClick={() => handleColSort('real_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>Real<SortIcon col="real_total" /></th>;
            case 'Orçado':          return <th key="o-t"   onClick={() => handleColSort('orc_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>Orç<SortIcon col="orc_total" /></th>;
            case 'DeltaAbsOrcado':  return <th key="dao-t" onClick={() => handleColSort('dao_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrçR$<SortIcon col="dao_total" /></th>;
            case 'DeltaPercOrcado': return <th key="dpo-t" onClick={() => handleColSort('dpo_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>ΔOrç%<SortIcon col="dpo_total" /></th>;
            case 'A1':              return <th key="a-t"   onClick={() => handleColSort('a1_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>A-1<SortIcon col="a1_total" /></th>;
            case 'DeltaAbsA1':      return <th key="da1-t" onClick={() => handleColSort('da1_total')} className={`px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] border-r border-white/5 cursor-pointer select-none hover:brightness-110 transition-all ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>ΔA-1R$<SortIcon col="da1_total" /></th>;
            case 'DeltaPercA1':     return <th key="dp1-t" onClick={() => handleColSort('dp1_total')} className="px-1 py-1 text-center font-black text-[9px] uppercase w-[100px] bg-[#152e55] cursor-pointer select-none hover:brightness-110 transition-all">ΔA-1%<SortIcon col="dp1_total" /></th>;
            default: return null;
          }
        })}
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
                const hOrc = gTot.orcado !== 0 || gTot.real !== 0; const hA1 = gTot.a1 !== 0 || gTot.real !== 0;
                return (
                  <>
                    {activeElements.map(el => {
                      switch (el) {
                        case 'Real':            return <React.Fragment key="real">{monthsToShow.map(m => { const v = g.byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 py-1 text-center font-mono font-black text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('Real', g.tag0, null, m)}>{fmtK(v)}</td>; })}<td className="px-1 py-1 text-center font-mono font-black text-[12px] border-l border-white/20 bg-blue-900/30 w-[80px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('Real', g.tag0, null, null)}>{fmtK(gTot.real)}</td></React.Fragment>;
                        case 'Orçado':          return <React.Fragment key="orc">{monthsToShow.map(m => { const v = g.byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 py-1 text-center font-mono font-black text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('Orçado', g.tag0, null, m)}>{fmtK(v)}</td>; })}<td className="px-1 py-1 text-center font-mono font-black text-[12px] border-l border-white/20 bg-emerald-900/30 w-[80px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('Orçado', g.tag0, null, null)}>{fmtK(gTot.orcado)}</td></React.Fragment>;
                        case 'A1':              return <React.Fragment key="a1">{monthsToShow.map(m => { const v = g.byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 py-1 text-center font-mono font-black text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('A-1', g.tag0, null, m)}>{fmtK(v)}</td>; })}<td className="px-1 py-1 text-center font-mono font-black text-[12px] border-l border-white/20 bg-purple-900/30 w-[80px] cursor-pointer hover:bg-yellow-300 hover:text-gray-900 transition-colors" onDoubleClick={() => drillTo('A-1', g.tag0, null, null)}>{fmtK(gTot.a1)}</td></React.Fragment>;
                        case 'DeltaAbsOrcado':  return <React.Fragment key="dao">{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dao-${m}`} className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center font-mono font-black text-[12px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, gTot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></React.Fragment>;
                        case 'DeltaPercOrcado': return <React.Fragment key="dpo">{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hOrc ? deltaClass(dOrçT, gTot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(gTot.real, gTot.orcado) : '—'}</td></React.Fragment>;
                        case 'DeltaAbsA1':      return <React.Fragment key="da1">{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`da1-${m}`} className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center font-mono font-black text-[12px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, gTot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></React.Fragment>;
                        case 'DeltaPercA1':     return <React.Fragment key="dp1">{monthsToShow.map(m => { const md = g.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 py-1 text-center text-[9px] border-l border-white/20 bg-black/10 w-[80px] ${hA1 ? deltaClass(dA1T, gTot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(gTot.real, gTot.a1) : '—'}</td></React.Fragment>;
                        default: return null;
                      }
                    })}
                  </>
                );
              })()}
              {viewMode === 'mes' && (() => {
                const gTot = Object.values(g.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 });
                const dOrçT = gTot.real - gTot.orcado; const dA1T = gTot.real - gTot.a1;
                const hOrc = gTot.orcado !== 0 || gTot.real !== 0; const hA1 = gTot.a1 !== 0 || gTot.real !== 0;
                return (
                  <>
                    {monthsToShow.map(m => {
                      const md = g.byMonth[m] || { real: 0, orcado: 0, a1: 0 };
                      const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                      return (
                        <React.Fragment key={m}>
                          {activeElements.map(el => {
                            switch (el) {
                              case 'Real':            return <td key="r"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('Real', g.tag0, null, m)}>{fmtK(md.real)}</td>;
                              case 'Orçado':          return <td key="o"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('Orçado', g.tag0, null, m)}>{fmtK(md.orcado)}</td>;
                              case 'DeltaAbsOrcado':  return <td key="dao" className={`px-0.5 py-1 text-center font-mono font-black text-[12px] w-[85px] bg-white/10 ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{(md.orcado !== 0 || md.real !== 0) ? fmtK(dOrçM) : '—'}</td>;
                              case 'DeltaPercOrcado': return <td key="dpo" className={`px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtPct(md.real, md.orcado)}</td>;
                              case 'A1':              return <td key="a"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('A-1', g.tag0, null, m)}>{fmtK(md.a1)}</td>;
                              case 'DeltaAbsA1':      return <td key="da1" className={`px-0.5 py-1 text-center font-mono font-black text-[12px] w-[85px] bg-white/10 ${(md.a1 !== 0 || md.real !== 0) ? deltaClass(dA1M, md.a1) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>{(md.a1 !== 0 || md.real !== 0) ? fmtK(dA1M) : '—'}</td>;
                              case 'DeltaPercA1':     return <td key="dp1" className="px-0.5 py-1 text-center text-[9px] w-[70px] bg-white/10 text-gray-300">{fmtPct(md.real, md.a1)}</td>;
                              default: return null;
                            }
                          })}
                        </React.Fragment>
                      );
                    })}
                    {activeElements.map(el => {
                      switch (el) {
                        case 'Real':            return <td key="r-t"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[100px] bg-[#1B75BB] hover:bg-yellow-300 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('Real', g.tag0, null, null)}>{fmtK(gTot.real)}</td>;
                        case 'Orçado':          return <td key="o-t"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[100px] bg-green-600 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('Orçado', g.tag0, null, null)}>{fmtK(gTot.orcado)}</td>;
                        case 'DeltaAbsOrcado':  return <td key="dao-t" className={`px-0.5 py-1 text-center font-mono font-black text-[12px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, gTot.orcado, true) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>;
                        case 'DeltaPercOrcado': return <td key="dpo-t" className={`px-0.5 py-1 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, gTot.orcado, true) : 'text-gray-300'}`}>{fmtPct(gTot.real, gTot.orcado)}</td>;
                        case 'A1':              return <td key="a-t"   className={`px-1 py-1 text-center font-mono font-black text-[12px] w-[100px] bg-purple-600 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`} onDoubleClick={() => drillTo('A-1', g.tag0, null, null)}>{fmtK(gTot.a1)}</td>;
                        case 'DeltaAbsA1':      return <td key="da1-t" className={`px-0.5 py-1 text-center font-mono font-black text-[12px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''} ${hA1 ? deltaClass(dA1T, gTot.a1, true) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>;
                        case 'DeltaPercA1':     return <td key="dp1-t" className={`px-0.5 py-1 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, gTot.a1, true) : 'text-gray-300'}`}>{fmtPct(gTot.real, gTot.a1)}</td>;
                        default: return null;
                      }
                    })}
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
                <tr className="group bg-gray-100 border-b border-gray-200 hover:bg-yellow-300 transition-colors">
                  <td className="px-2 py-1 w-8 sticky left-0 z-20 bg-gray-100 group-hover:bg-yellow-300 transition-colors">
                    {drillDimensions.length > 0 && (
                      <button onClick={() => setExpandedTag01s(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))} className="text-gray-400 hover:text-amber-600 transition-colors">
                        {isDrillExpanded ? <ChevronDown size={10} className="inline" /> : <ChevronRight size={10} className="inline" />}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-1 pl-6 text-gray-950 font-extrabold truncate sticky left-8 z-20 w-[280px] bg-gray-100 group-hover:bg-yellow-300 transition-colors">
                    {r.tag01}
                  </td>
                  {viewMode === 'cenario' && (() => {
                    const tot = r.byMonth ? Object.values(r.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 }) : { real: 0, orcado: 0, a1: 0 };
                    const dOrçT = tot.real - tot.orcado; const dA1T = tot.real - tot.a1;
                    const hOrc = tot.orcado !== 0 || tot.real !== 0; const hA1 = tot.a1 !== 0 || tot.real !== 0;
                    return (
                      <>
                        {activeElements.map(el => {
                          switch (el) {
                            case 'Real':            return <React.Fragment key="real">{monthsToShow.map(m => { const v = r.byMonth[m]?.real   || 0; return <td key={`r-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Real', g.tag0, r.tag01, m)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] bg-blue-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Real', g.tag0, r.tag01, null)}>{fmtK(tot.real)}</td></React.Fragment>;
                            case 'Orçado':          return <React.Fragment key="orc">{monthsToShow.map(m => { const v = r.byMonth[m]?.orcado || 0; return <td key={`o-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Orçado', g.tag0, r.tag01, m)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] bg-emerald-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('Orçado', g.tag0, r.tag01, null)}>{fmtK(tot.orcado)}</td></React.Fragment>;
                            case 'A1':              return <React.Fragment key="a1">{monthsToShow.map(m => { const v = r.byMonth[m]?.a1     || 0; return <td key={`a-${m}`} className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] w-[70px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('A-1', g.tag0, r.tag01, m)}>{v !== 0 ? fmtK(v) : <span className="text-gray-300">—</span>}</td>; })}<td className="px-1 py-0.5 text-center font-mono text-gray-900 text-[12px] bg-purple-50 border-l border-gray-200 font-semibold w-[80px] cursor-pointer hover:bg-yellow-300 transition-colors" onDoubleClick={() => drillTo('A-1', g.tag0, r.tag01, null)}>{fmtK(tot.a1)}</td></React.Fragment>;
                            case 'DeltaAbsOrcado':  return <React.Fragment key="dao">{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dao-${m}`} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtK(d) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></React.Fragment>;
                            case 'DeltaPercOrcado': return <React.Fragment key="dpo">{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.orcado) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-emerald-50 border-l border-gray-200 w-[80px] ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(tot.real, tot.orcado) : '—'}</td></React.Fragment>;
                            case 'DeltaAbsA1':      return <React.Fragment key="da1">{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`da1-${m}`} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtK(d) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></React.Fragment>;
                            case 'DeltaPercA1':     return <React.Fragment key="dp1">{monthsToShow.map(m => { const md = r.byMonth[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-gray-300'}`}>{h ? fmtPct(md.real, md.a1) : <span className="text-gray-300">—</span>}</td>; })}<td className={`px-1 py-0.5 text-center text-[9px] bg-purple-50 border-l border-gray-200 w-[80px] ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(tot.real, tot.a1) : '—'}</td></React.Fragment>;
                            default: return null;
                          }
                        })}
                      </>
                    );
                  })()}
                  {viewMode === 'mes' && (() => {
                    const tot = r.byMonth ? Object.values(r.byMonth).reduce((a, md) => ({ real: a.real + md.real, orcado: a.orcado + md.orcado, a1: a.a1 + md.a1 }), { real: 0, orcado: 0, a1: 0 }) : { real: 0, orcado: 0, a1: 0 };
                    const dOrçT = tot.real - tot.orcado; const dA1T = tot.real - tot.a1;
                    const hOrc = tot.orcado !== 0 || tot.real !== 0; const hA1 = tot.a1 !== 0 || tot.real !== 0;
                    return (
                      <>
                        {monthsToShow.map(m => {
                          const md = r.byMonth[m] || { real: 0, orcado: 0, a1: 0 };
                          const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                          return (
                            <React.Fragment key={m}>
                              {activeElements.map(el => {
                                switch (el) {
                                  case 'Real':            return <td key="r"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Real|${m}`, md.real, `Real: ${r.tag01} (${m.split('-')[1]})`)} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[80px] cursor-pointer transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|Real|${m}`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'text-gray-900 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('Real', g.tag0, r.tag01, m)}>{md.real   !== 0 ? fmtK(md.real)   : <span className="text-gray-300">—</span>}</td>;
                                  case 'Orçado':          return <td key="o"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Orçado|${m}`, md.orcado, `Orçado: ${r.tag01} (${m.split('-')[1]})`)} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[80px] cursor-pointer transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|Orçado|${m}`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'text-gray-600 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('Orçado', g.tag0, r.tag01, m)}>{md.orcado !== 0 ? fmtK(md.orcado) : <span className="text-gray-300">—</span>}</td>;
                                  case 'DeltaAbsOrcado':  return <td key="dao" className={`px-0.5 py-0.5 text-center font-mono text-[12px] w-[85px] ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{(md.orcado !== 0 || md.real !== 0) ? fmtK(dOrçM) : <span className="text-gray-300">—</span>}</td>;
                                  case 'DeltaPercOrcado': return <td key="dpo" className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado) : 'text-gray-300'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-gray-200' : ''}`}>{md.orcado !== 0 ? fmtPct(md.real, md.orcado) : <span className="text-gray-300">—</span>}</td>;
                                  case 'A1':              return <td key="a"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|A1|${m}`, md.a1, `A-1: ${r.tag01} (${m.split('-')[1]})`)} className={`px-1 py-0.5 text-center font-mono text-[12px] w-[80px] cursor-pointer transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|A1|${m}`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'text-gray-600 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('A-1', g.tag0, r.tag01, m)}>{md.a1 !== 0 ? fmtK(md.a1) : <span className="text-gray-300">—</span>}</td>;
                                  case 'DeltaAbsA1':      return <td key="da1" className={`px-0.5 py-0.5 text-center font-mono text-[12px] w-[85px] ${(md.a1 !== 0 || md.real !== 0) ? deltaClass(dA1M, md.a1) : 'text-gray-300'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-gray-200' : ''}`}>{(md.a1 !== 0 || md.real !== 0) ? fmtK(dA1M) : <span className="text-gray-300">—</span>}</td>;
                                  case 'DeltaPercA1':     return <td key="dp1" className={`px-0.5 py-0.5 text-center text-[9px] w-[70px] ${(md.a1 !== 0 || md.real !== 0) ? deltaClass(dA1M, md.a1) : 'text-gray-300'}`}>{md.a1 !== 0 ? fmtPct(md.real, md.a1) : <span className="text-gray-300">—</span>}</td>;
                                  default: return null;
                                }
                              })}
                            </React.Fragment>
                          );
                        })}
                        {activeElements.map(el => {
                          switch (el) {
                            case 'Real':            return <td key="r-t"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Real|total`, tot.real, `Real: ${r.tag01} (Total)`)} className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] cursor-pointer transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|Real|total`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'bg-blue-50 text-[#152e55] hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('Real', g.tag0, r.tag01, null)}>{fmtK(tot.real)}</td>;
                            case 'Orçado':          return <td key="o-t"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Orçado|total`, tot.orcado, `Orçado: ${r.tag01} (Total)`)} className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] cursor-pointer transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|Orçado|total`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'bg-green-50 text-green-900 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('Orçado', g.tag0, r.tag01, null)}>{fmtK(tot.orcado)}</td>;
                            case 'DeltaAbsOrcado':  return <td key="dao-t" className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-green-50 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-gray-200' : ''} ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>;
                            case 'DeltaPercOrcado': return <td key="dpo-t" className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-green-50 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-gray-200' : ''} ${hOrc ? deltaClass(dOrçT, tot.orcado) : 'text-gray-300'}`}>{hOrc ? fmtPct(tot.real, tot.orcado) : '—'}</td>;
                            case 'A1':              return <td key="a-t"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|A1|total`, tot.a1, `A-1: ${r.tag01} (Total)`)} className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] cursor-pointer transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-gray-200' : ''} ${isCellSel(`${g.tag0}|${r.tag01}|A1|total`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'bg-purple-50 text-purple-900 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('A-1', g.tag0, r.tag01, null)}>{fmtK(tot.a1)}</td>;
                            case 'DeltaAbsA1':      return <td key="da1-t" className={`px-1 py-0.5 text-center font-mono font-semibold text-[12px] w-[100px] bg-purple-50 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-gray-200' : ''} ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>;
                            case 'DeltaPercA1':     return <td key="dp1-t" className={`px-1 py-0.5 text-center text-[9px] w-[100px] bg-purple-50 ${hA1 ? deltaClass(dA1T, tot.a1) : 'text-gray-300'}`}>{hA1 ? fmtPct(tot.real, tot.a1) : '—'}</td>;
                            default: return null;
                          }
                        })}
                      </>
                    );
                  })()}
                </tr>
                {drillDimensions.length > 0 && isDrillExpanded && renderDrillRows(r.tag01, g.tag0)}
                </React.Fragment>
              );
            })}

            {/* CalcRows */}
            {!hasTagFilter && idx === lastIdx03M && renderMonthlyCalcRow('MARGEM DE CONTRIBUIÇÃO', monthlyMargemData, margemData, true)}
            {!hasTagFilter && idx === lastIdx04M && renderMonthlyCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', monthlyEbitdaData, ebitdaData, true)}
            {!hasTagFilter && idx === lastIdx03M && lastIdx04M === -1 && renderMonthlyCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', monthlyEbitdaData, ebitdaData, false)}
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
        <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-black text-[12px] shadow-[0_-2px_6px_rgba(0,0,0,0.3)] border-t-2 border-yellow-400">
          <td colSpan={2} className="py-2 uppercase tracking-tight font-black sticky left-0 z-50 bg-gradient-to-r from-slate-800 to-slate-700 ">
            <div className="flex items-center gap-1 px-2">
              {showOnlyEbitda && <Activity size={12} />}
              <span>{footerLabel}</span>
            </div>
          </td>
          {viewMode === 'cenario' && (() => {
            const dOrçT = totals.real - totals.orcado; const dA1T = totals.real - totals.a1;
            const hOrc = totals.orcado !== 0 || totals.real !== 0; const hA1 = totals.a1 !== 0 || totals.real !== 0;
            return (
              <>
                {activeElements.map(el => {
                  switch (el) {
                    case 'Real':            return <React.Fragment key="real">{monthsToShow.map(m => <td key={`r-${m}`} className="px-1 py-2 text-center font-mono w-[70px]">{fmtK(monthlyTotals[m]?.real   || 0)}</td>)}<td className="px-1 py-2 text-center font-mono font-black border-l border-white/20 bg-blue-900/30 w-[80px]">{fmtK(totals.real)}</td></React.Fragment>;
                    case 'Orçado':          return <React.Fragment key="orc">{monthsToShow.map(m => <td key={`o-${m}`} className="px-1 py-2 text-center font-mono w-[70px]">{fmtK(monthlyTotals[m]?.orcado || 0)}</td>)}<td className="px-1 py-2 text-center font-mono font-black border-l border-white/20 bg-emerald-900/30 w-[80px]">{fmtK(totals.orcado)}</td></React.Fragment>;
                    case 'A1':              return <React.Fragment key="a1">{monthsToShow.map(m => <td key={`a-${m}`} className="px-1 py-2 text-center font-mono w-[70px]">{fmtK(monthlyTotals[m]?.a1     || 0)}</td>)}<td className="px-1 py-2 text-center font-mono font-black border-l border-white/20 bg-purple-900/30 w-[80px]">{fmtK(totals.a1)}</td></React.Fragment>;
                    case 'DeltaAbsOrcado':  return <React.Fragment key="dao">{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dao-${m}`} className={`px-1 py-2 text-center font-mono w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-white/40'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center font-mono font-black border-l border-white/20 bg-emerald-900/30 w-[80px] ${hOrc ? deltaClass(dOrçT, totals.orcado) : 'text-white/40'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td></React.Fragment>;
                    case 'DeltaPercOrcado': return <React.Fragment key="dpo">{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.orcado; const h = md.orcado !== 0 || md.real !== 0; return <td key={`dpo-${m}`} className={`px-0.5 py-2 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.orcado) : 'text-white/40'}`}>{h ? fmtPct(md.real, md.orcado) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center text-[9px] border-l border-white/20 bg-emerald-900/30 w-[80px] ${hOrc ? deltaClass(dOrçT, totals.orcado) : 'text-white/40'}`}>{hOrc ? fmtPct(totals.real, totals.orcado) : '—'}</td></React.Fragment>;
                    case 'DeltaAbsA1':      return <React.Fragment key="da1">{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`da1-${m}`} className={`px-1 py-2 text-center font-mono w-[70px] ${h ? deltaClass(d, md.a1) : 'text-white/40'}`}>{h ? fmtK(d) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center font-mono font-black border-l border-white/20 bg-purple-900/30 w-[80px] ${hA1 ? deltaClass(dA1T, totals.a1) : 'text-white/40'}`}>{hA1 ? fmtK(dA1T) : '—'}</td></React.Fragment>;
                    case 'DeltaPercA1':     return <React.Fragment key="dp1">{monthsToShow.map(m => { const md = monthlyTotals[m] || {real:0,orcado:0,a1:0}; const d = md.real - md.a1; const h = md.a1 !== 0 || md.real !== 0; return <td key={`dp1-${m}`} className={`px-0.5 py-2 text-center text-[9px] w-[70px] ${h ? deltaClass(d, md.a1) : 'text-white/40'}`}>{h ? fmtPct(md.real, md.a1) : '—'}</td>; })}<td className={`px-0.5 py-2 text-center text-[9px] border-l border-white/20 bg-purple-900/30 w-[80px] ${hA1 ? deltaClass(dA1T, totals.a1) : 'text-white/40'}`}>{hA1 ? fmtPct(totals.real, totals.a1) : '—'}</td></React.Fragment>;
                    default: return null;
                  }
                })}
              </>
            );
          })()}
          {viewMode === 'mes' && (() => {
            const dOrçT = totals.real - totals.orcado; const dA1T = totals.real - totals.a1;
            const hOrc = totals.orcado !== 0 || totals.real !== 0; const hA1 = totals.a1 !== 0 || totals.real !== 0;
            return (
              <>
                {monthsToShow.map(m => {
                  const md = monthlyTotals[m] || { real: 0, orcado: 0, a1: 0 };
                  const dOrçM = md.real - md.orcado; const dA1M = md.real - md.a1;
                  return (
                    <React.Fragment key={m}>
                      {activeElements.map(el => {
                        switch (el) {
                          case 'Real':            return <td key="r"   className={`px-1 py-2 text-center font-mono w-[80px] ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.real)}</td>;
                          case 'Orçado':          return <td key="o"   className={`px-1 py-2 text-center font-mono w-[80px] ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.orcado)}</td>;
                          case 'DeltaAbsOrcado':  return <td key="dao" className={`px-0.5 py-2 text-center font-mono text-[12px] font-black w-[85px] bg-white/10 ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado, true) : 'text-gray-400'} ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{(md.orcado !== 0 || md.real !== 0) ? fmtK(dOrçM) : '—'}</td>;
                          case 'DeltaPercOrcado': return <td key="dpo" className={`px-0.5 py-2 text-center text-[9px] w-[70px] bg-white/10 ${(md.orcado !== 0 || md.real !== 0) ? deltaClass(dOrçM, md.orcado, true) : 'text-gray-400'} ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''}`}>{md.orcado !== 0 ? fmtPct(md.real, md.orcado) : '—'}</td>;
                          case 'A1':              return <td key="a"   className={`px-1 py-2 text-center font-mono w-[80px] ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(md.a1)}</td>;
                          case 'DeltaAbsA1':      return <td key="da1" className={`px-0.5 py-2 text-center font-mono text-[12px] font-black w-[85px] bg-white/10 ${(md.a1 !== 0 || md.real !== 0) ? deltaClass(dA1M, md.a1, true) : 'text-gray-400'} ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''}`}>{(md.a1 !== 0 || md.real !== 0) ? fmtK(dA1M) : '—'}</td>;
                          case 'DeltaPercA1':     return <td key="dp1" className="px-0.5 py-2 text-center text-[9px] w-[70px] bg-white/10 text-gray-400">{md.a1 !== 0 ? fmtPct(md.real, md.a1) : '—'}</td>;
                          default: return null;
                        }
                      })}
                    </React.Fragment>
                  );
                })}
                {activeElements.map(el => {
                  switch (el) {
                    case 'Real':            return <td key="r-t"   className={`px-1 py-2 text-center font-mono font-black w-[100px] bg-[#1B75BB] hover:bg-yellow-300 transition-colors ${mesFirstCol === 'real' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.real)}</td>;
                    case 'Orçado':          return <td key="o-t"   className={`px-1 py-2 text-center font-mono font-black w-[100px] bg-green-600 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'orcado' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.orcado)}</td>;
                    case 'DeltaAbsOrcado':  return <td key="dao-t" className={`px-0.5 py-2 text-center font-mono font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, totals.orcado, true) : 'text-gray-400'}`}>{hOrc ? fmtK(dOrçT) : '—'}</td>;
                    case 'DeltaPercOrcado': return <td key="dpo-t" className={`px-0.5 py-2 text-center text-[9px] w-[100px] bg-black/10 ${mesFirstCol === 'deltaPercOrcado' ? 'border-l-2 border-l-white/20' : ''} ${hOrc ? deltaClass(dOrçT, totals.orcado, true) : 'text-gray-400'}`}>{hOrc ? fmtPct(totals.real, totals.orcado) : '—'}</td>;
                    case 'A1':              return <td key="a-t"   className={`px-1 py-2 text-center font-mono font-black w-[100px] bg-purple-600 hover:bg-yellow-300 transition-colors ${mesFirstCol === 'a1' ? 'border-l-2 border-l-white/20' : ''}`}>{fmtK(totals.a1)}</td>;
                    case 'DeltaAbsA1':      return <td key="da1-t" className={`px-0.5 py-2 text-center font-mono font-black w-[100px] bg-black/10 ${mesFirstCol === 'deltaAbsA1' ? 'border-l-2 border-l-white/20' : ''} ${hA1 ? deltaClass(dA1T, totals.a1, true) : 'text-gray-400'}`}>{hA1 ? fmtK(dA1T) : '—'}</td>;
                    case 'DeltaPercA1':     return <td key="dp1-t" className={`px-0.5 py-2 text-center text-[9px] w-[100px] bg-black/10 ${hA1 ? deltaClass(dA1T, totals.a1, true) : 'text-gray-400'}`}>{fmtPct(totals.real, totals.a1)}</td>;
                    default: return null;
                  }
                })}
              </>
            );
          })()}
        </tr>
      </tfoot>
    );
  };

  // ── Callback: restaura filtros a partir do contexto salvo numa análise ───
  const handleRestoreFilters = useCallback((ctx: DreAnalysis['filter_context']) => {
    setYear(ctx.year);
    setSelectedMonths(ctx.months);
    setSelectedMarcas(ctx.marcas);
    setSelectedFiliais(ctx.filiais);
    setSelectedTags01(ctx.tags01);
    setSelectedTags02(ctx.tags02);
    setSelectedTags03(ctx.tags03);
    setRecurring(
      ctx.recurring === 'Sim' ? 'Sim' :
      ctx.recurring === 'Não' ? 'Não' : null
    );
    // Limpa cache de drill pois filtros mudaram
    setDimensionCache({});
    setExpandedTag01s({});
    setExpandedDrillRows({});
  }, []);

  // ── Ícone de sort por coluna ──────────────────────────────────────────────
  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-0.5 opacity-80">
      {sortConfig.col === col
        ? (sortConfig.dir === 'desc' ? ' ↓' : ' ↑')
        : <span className="opacity-30"> ↕</span>}
    </span>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 space-y-1.5 bg-gradient-to-br from-gray-50 to-white min-h-screen">

      {/* ══ LINHA 1: Filtros ══ */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200 shadow-sm overflow-x-auto">

        {/* Filtros de dimensão — modo compacto */}
        <MultiSelectFilter compact label="Marca"  icon={<Flag      size={12} />} options={allowedMarcas && allowedMarcas.length > 0 ? filterOptions.marcas.filter(m => allowedMarcas.some(p => p.toUpperCase() === m.toUpperCase())) : filterOptions.marcas}     selected={selectedMarcas}  onChange={setSelectedMarcas}  colorScheme="orange" />
        <MultiSelectFilter compact label="Filial" icon={<Building2 size={12} />} options={filiaisFiltradas}          selected={selectedFiliais} onChange={setSelectedFiliais} colorScheme="blue"   />
        <MultiSelectFilter compact label="Tag01"  icon={<Layers    size={12} />} options={filterOptions.tags01} selected={selectedTags01}  onChange={setSelectedTags01}  colorScheme="purple" />
        <MultiSelectFilter compact label="Tag02"  icon={<Layers    size={12} />} options={tag02Options}          selected={selectedTags02}  onChange={setSelectedTags02}  colorScheme="purple" />
        <MultiSelectFilter compact label="Tag03"  icon={<Layers    size={12} />} options={tag03Options}          selected={selectedTags03}  onChange={setSelectedTags03}  colorScheme="blue"   />
        <MultiSelectFilter compact label="Fornecedor" icon={<Store size={12} />} options={[]} selected={selectedVendors} onChange={setSelectedVendors} colorScheme="orange" onSearch={searchVendors} searchPlaceholder="Digite o fornecedor..." />

        <div className="h-5 w-px bg-blue-200 shrink-0" />

        {/* Filtro de Mês (multi-select) */}
        <MultiSelectFilter compact
          label="Mês"
          icon={<CalendarDays size={12} />}
          options={MONTHS.map(m => m.label)}
          selected={selectedMonths.map(v => MONTHS.find(m => m.value === v)?.label ?? v)}
          onChange={labels => setSelectedMonths(labels.map(l => MONTHS.find(m => m.label === l)?.value ?? l))}
          colorScheme="purple"
        />
        {/* Atalhos trimestrais */}
        <div className="flex gap-0.5 shrink-0">
          {QUARTERS.map(q => (
            <button key={q.label} onClick={() => setSelectedMonths(q.months)} title={q.title}
              className={`px-1.5 py-0.5 text-[10px] font-black uppercase rounded transition-all whitespace-nowrap ${isQuarterActive(q) ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Espaçador */}
        <div className="flex-1 min-w-1" />

        {/* Limpar filtros — ícone apenas */}
        {hasAnyFilter && (
          <button onClick={() => { setSelectedMarcas([]); setSelectedFiliais([]); setSelectedTags01([]); setSelectedTags02([]); setSelectedTags03([]); setSelectedVendors([]); }}
            className="p-1.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-200 hover:bg-rose-100 transition-all shadow-sm shrink-0"
            title="Limpar filtros de dimensão">
            <FilterX size={13} />
          </button>
        )}

        {/* Gerar Foto DRE — admin only */}
        {isAdmin && (
          <button
            onClick={handleGenerateSnapshot}
            disabled={isGeneratingSnapshot || loading || selectedMonths.length !== 1}
            className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 text-[10px] font-black uppercase tracking-tight"
            title={selectedMonths.length !== 1 ? 'Selecione exatamente 1 mês para gerar foto' : 'Gerar foto da DRE para Corte DRE (Justificativas)'}>
            {isGeneratingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            <span>Foto</span>
          </button>
        )}

        {/* Até EBITDA — ícone apenas */}
        <button onClick={() => setShowOnlyEbitda(v => !v)}
          className={`p-1.5 rounded-lg transition-all shadow-sm shrink-0 ${showOnlyEbitda ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-400'}`}
          title={showOnlyEbitda ? 'Mostrando até EBITDA — clique para ver tudo' : 'Mostrando tudo — clique para filtrar até EBITDA'}>
          {showOnlyEbitda ? <CheckSquare size={13} strokeWidth={2.5} /> : <Square size={13} strokeWidth={2.5} />}
        </button>
      </div>

      {/* ══ LINHA 2: Colunas + Visualização ══ */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-blue-100 shadow-sm overflow-x-auto">
        {/* Label */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="p-0.5 rounded bg-blue-500 text-white"><Columns size={10} /></div>
          <span className="text-[9px] font-black text-gray-700 uppercase tracking-tight whitespace-nowrap">Colunas</span>
        </div>
        <div className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />

        {/* Column pills — rendered in selectionOrder, draggable to reorder */}
        {(() => {
          const COL_META: Record<string, { label: string; show: boolean; set: (v: boolean) => void; on: string; off: string }> = {
            Real:            { label: 'Real',    show: showReal,            set: setShowReal,            on: 'bg-blue-500 text-white border-blue-500 shadow-sm',    off: 'bg-white text-gray-400 border-gray-200 hover:border-blue-300' },
            Orçado:          { label: 'Orçado',  show: showOrcado,          set: setShowOrcado,          on: 'bg-emerald-500 text-white border-emerald-500 shadow-sm', off: 'bg-white text-gray-400 border-gray-200 hover:border-emerald-300' },
            A1:              { label: 'A-1',     show: showA1,              set: setShowA1,              on: 'bg-purple-500 text-white border-purple-500 shadow-sm', off: 'bg-white text-gray-400 border-gray-200 hover:border-purple-300' },
            DeltaPercOrcado: { label: 'Δ% Orç',  show: showDeltaPercOrcado, set: setShowDeltaPercOrcado, on: 'bg-orange-500 text-white border-orange-500 shadow-sm', off: 'bg-white text-gray-400 border-gray-200 hover:border-orange-300' },
            DeltaPercA1:     { label: 'Δ% A-1',  show: showDeltaPercA1,     set: setShowDeltaPercA1,     on: 'bg-orange-600 text-white border-orange-600 shadow-sm', off: 'bg-white text-gray-400 border-gray-200 hover:border-orange-400' },
            DeltaAbsOrcado:  { label: 'ΔR$ Orç', show: showDeltaAbsOrcado,  set: setShowDeltaAbsOrcado,  on: 'bg-rose-500 text-white border-rose-500 shadow-sm',   off: 'bg-white text-gray-400 border-gray-200 hover:border-rose-300' },
            DeltaAbsA1:      { label: 'ΔR$ A-1', show: showDeltaAbsA1,      set: setShowDeltaAbsA1,      on: 'bg-rose-600 text-white border-rose-600 shadow-sm',   off: 'bg-white text-gray-400 border-gray-200 hover:border-rose-400' },
          };
          // Render pills in selectionOrder (includes both active and inactive)
          const allKeys = ['Real', 'Orçado', 'A1', 'DeltaPercOrcado', 'DeltaPercA1', 'DeltaAbsOrcado', 'DeltaAbsA1'];
          const orderedKeys = [...selectionOrder, ...allKeys.filter(k => !selectionOrder.includes(k))];
          return orderedKeys.map(key => {
            const col = COL_META[key];
            if (!col) return null;
            return (
              <button key={key}
                draggable
                onDragStart={() => handleColDragStart(key)}
                onDragOver={(e) => handleColDragOver(e, key)}
                onDragEnd={handleColDragEnd}
                onClick={() => toggleElement(key, col.show, col.set)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all text-[8px] font-black uppercase shrink-0 cursor-grab active:cursor-grabbing ${col.show ? col.on : col.off}`}>
                <GripVertical size={8} className="opacity-40" />
                <span>{col.label}</span>{col.show && <>{badge(key)}<span className="ml-0.5 opacity-60">×</span></>}
              </button>
            );
          });
        })()}

        <div className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />

        {/* Recorrência (movido da linha de filtros) */}
        <div className="flex items-center gap-0.5 bg-white border border-teal-200 rounded-lg px-1.5 py-0.5 shadow-sm shrink-0">
          <span className="text-[8px] font-black text-gray-500 uppercase whitespace-nowrap mr-1">Recorr</span>
          {(['Sim', 'Não', null] as const).map(v => (
            <button key={String(v)} onClick={() => setRecurring(v)}
              className={`px-1.5 py-0.5 text-[8px] font-black rounded transition-all ${recurring === v ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-teal-50 hover:text-teal-700'}`}>
              {v ?? 'Todos'}
            </button>
          ))}
        </div>

        {/* Espaçador */}
        <div className="flex-1 min-w-2" />

        {/* Visualização — botões de modo (apenas no modo detalhado) */}
        <div className={`flex items-center gap-1.5 shrink-0 bg-gray-100 p-1 rounded-xl border border-gray-200 transition-all ${presentationMode === 'executive' ? 'opacity-30 pointer-events-none' : ''}`}>
          {([
            { vm: 'consolidado', icon: '📦', label: 'Consolidado', activeCls: 'bg-gradient-to-br from-[#1B75BB] to-[#152e55] text-white shadow-md ring-2 ring-blue-300/60 border-transparent', inactiveCls: 'text-gray-500 border-transparent hover:text-[#1B75BB] hover:bg-white/80' },
            { vm: 'cenario',     icon: '🎭', label: 'Cenário',     activeCls: 'bg-gradient-to-br from-emerald-500 to-teal-700   text-white shadow-md ring-2 ring-emerald-300/60 border-transparent', inactiveCls: 'text-gray-500 border-transparent hover:text-emerald-700 hover:bg-white/80' },
            { vm: 'mes',         icon: '📅', label: 'Mês',         activeCls: 'bg-gradient-to-br from-purple-500 to-violet-700  text-white shadow-md ring-2 ring-purple-300/60 border-transparent', inactiveCls: 'text-gray-500 border-transparent hover:text-purple-700 hover:bg-white/80' },
          ] as { vm: ViewMode; icon: string; label: string; activeCls: string; inactiveCls: string }[]).map(({ vm, icon, label, activeCls, inactiveCls }) => (
            <button key={vm} onClick={() => setViewMode(vm)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-150 text-[9px] font-black uppercase tracking-wide ${viewMode === vm ? activeCls : inactiveCls}`}>
              <span className="text-[12px] leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Fullscreen */}
        {presentationMode === 'detailed' && (
          <button
            onClick={() => setIsTableFullscreen(v => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all shadow-sm shrink-0"
            title="Tela cheia">
            <Maximize2 size={12} />
          </button>
        )}
      </div>

      {/* ══ LINHA 3: Drill-Down (apenas no modo detalhado) ══ */}
      {presentationMode === 'detailed' && <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-red-50 px-2 py-1.5 rounded-lg border border-orange-200 shadow-sm overflow-x-auto">

        {/* Ícone dinâmico */}
        <div className={`p-1 rounded-lg transition-colors shadow-sm shrink-0 ${drillDimensions.length > 0 ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
          <Layers size={12} />
        </div>

        {/* Label + sub-label */}
        <div className="flex flex-col pr-2 mr-1 border-r border-orange-200 shrink-0">
          <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Drill-down</span>
          <span className="text-[12px] font-black text-gray-900 uppercase whitespace-nowrap">
            {drillDimensions.length === 0 ? 'Níveis' : `Níveis ${drillDimensions.length}`}
          </span>
        </div>

        {/* Botões de dimensão */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SOMA_DIMENSIONS.map(d => {
            const order  = drillDimensions.indexOf(d.id);
            const active = order >= 0;
            return (
              <button key={d.id}
                onClick={() => {
                  setDrillDimensions(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]);
                  setDimensionCache({});
                }}
                className={`px-2 py-1 rounded-lg text-[12px] font-black uppercase transition-all flex items-center gap-1.5 border shadow-sm ${
                  active
                    ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                }`}>
                {active && <span className="bg-white/30 px-1 py-0.5 rounded text-[8px] font-black">{order + 1}º</span>}
                <span>{d.label}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-orange-200 mx-0.5" />
          {/* Ordenação — afeta Tag01 e valores de drill-down */}
          <button
            onClick={() => handleColSort('tag01')}
            className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center gap-1 border shadow-sm ${
              sortConfig.col === 'tag01' ? 'bg-[#1B75BB] text-white border-[#1B75BB]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#1B75BB]'
            }`}
            title="Ordenar alfabeticamente (A-Z)">
            <ArrowDownAZ size={11} /> A-Z
          </button>

          {drillDimensions.length > 0 && (
            <>
              <div className="h-4 w-px bg-orange-200 mx-0.5" />
              {/* Limpar drill-down */}
              <button
                onClick={() => { setDrillDimensions([]); setDimensionCache({}); setExpandedTag01s({}); setExpandedDrillRows({}); }}
                className="p-0.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Desativar drill-down">
                <X size={10} />
              </button>
            </>
          )}
        </div>
      </div>}

      {error && <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-800 font-semibold">❌ {error}</div>}

      {/* ══ MODO EXECUTIVO ══ */}
      {!loading && presentationMode === 'executive' && (
        <div className="space-y-4">

          {/* Painel de controle — mesmo padrão do DRE Gerencial */}
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 px-4 py-4 rounded-2xl border-2 border-blue-300 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Título */}
              <div className="flex items-center gap-2">
                <div className="bg-white p-1.5 rounded-lg shadow-sm"><Activity className="w-4 h-4 text-purple-600" /></div>
                <p className="text-xs font-black text-gray-900 leading-tight">💡 Modo Executivo</p>
                <p className="text-[12px] text-gray-600 leading-tight">Cards interativos · {execCards.length} grupos</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Mostrar */}
                <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-blue-100">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide mr-1">Mostrar:</span>
                  {([['all','Todos'],['positive','✅ Positivos'],['negative','❌ Negativos']] as [string,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => setExecFilter(v as any)}
                      className={`px-2 py-1 text-[12px] font-black uppercase rounded transition-all shadow-sm whitespace-nowrap ${execFilter === v ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{l}</button>
                  ))}
                </div>

                {/* Ordenar */}
                <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-blue-100">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide mr-1">Ordenar:</span>
                  {([['alphabetical','A-Z'],['value','💰 Valor'],['delta','📈 Δ%']] as [string,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => setExecSort(v as any)}
                      className={`px-2 py-1 text-[12px] font-black uppercase rounded transition-all shadow-sm whitespace-nowrap ${execSort === v ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{l}</button>
                  ))}
                </div>

                {/* Layout */}
                <div className="flex items-center gap-1 bg-white/60 rounded-lg px-2 py-1 border border-blue-100">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide mr-1">Layout:</span>
                  {([['compact','⚡ Compacto'],['medium','📊 Médio'],['expanded','📈 Expandido'],['list','📋 Lista']] as [string,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => setCardLayout(v as any)}
                      className={`px-2 py-1 text-[12px] font-black uppercase rounded transition-all shadow-sm whitespace-nowrap ${cardLayout === v ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de cards */}
          <div className={`grid gap-4 ${
            cardLayout === 'compact'  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
            cardLayout === 'medium'   ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            cardLayout === 'expanded' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}>
            {execCards.map((card, cardIndex) => {
              const deltaOrç = card.orcado !== 0 ? ((card.real - card.orcado) / Math.abs(card.orcado)) * 100 : null;
              const deltaA1  = card.a1     !== 0 ? ((card.real - card.a1)     / Math.abs(card.a1))     * 100 : null;
              const isPos    = deltaOrç !== null ? deltaOrç >= 0 : card.real >= 0;
              const vals     = monthsToShow.map(m => card.byMonth[m]?.real || 0);
              const maxBar   = Math.max(...vals.map(Math.abs), 1);

              return (
                <div key={card.tag0}
                  className={`bg-white rounded-2xl border-2 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer animate-in fade-in slide-in-from-bottom-4 group border-gray-200 ${cardLayout === 'list' ? 'flex items-center gap-6 p-4' : 'p-5 hover:scale-105'}`}
                  style={{ animationDelay: `${cardIndex * 50}ms`, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>

                  {/* Header */}
                  <div className={`${cardLayout === 'list' ? 'flex-1 min-w-0' : ''}`}>
                    <div className={`flex items-start justify-between ${cardLayout === 'compact' ? 'mb-2' : 'mb-4'}`}>
                      <div>
                        <h3 className={`font-black text-gray-900 ${cardLayout === 'compact' ? 'text-sm leading-tight line-clamp-2' : 'text-lg'}`}>{card.tag0}</h3>
                        <p className={`text-gray-500 font-semibold ${cardLayout === 'compact' ? 'text-[12px]' : 'text-xs'}`}>{card.items.length} subgrupos</p>
                      </div>
                      {deltaOrç !== null && (
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${deltaOrç >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {deltaOrç >= 0 ? '+' : ''}{deltaOrç.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Real YTD */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Real (YTD)</p>
                      <p className="text-2xl font-black text-gray-900">
                        {card.real < 0 ? '-R$ ' : 'R$ '}{fmtCard(Math.abs(card.real))}
                      </p>
                    </div>

                    {/* Orçado / A-1 secundários */}
                    {cardLayout !== 'compact' && (
                      <div className="flex gap-4 mb-4">
                        {card.orcado !== 0 && (
                          <div>
                            <p className="text-[12px] text-gray-400 font-semibold">Orçado</p>
                            <p className="text-sm font-black text-gray-700">R$ {fmtCard(card.orcado)}</p>
                          </div>
                        )}
                        {card.a1 !== 0 && (
                          <div>
                            <p className="text-[12px] text-gray-400 font-semibold">A-1</p>
                            <p className="text-sm font-black text-gray-700">R$ {fmtCard(card.a1)}</p>
                            {deltaA1 !== null && <p className={`text-[12px] font-black ${deltaA1 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{deltaA1 >= 0 ? '+' : ''}{deltaA1.toFixed(1)}%</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Sparklines ── */}

                  {/* Compact: barras finas por mês */}
                  {cardLayout === 'compact' && (
                    <div className="relative h-8 mb-3">
                      <div className="flex items-end gap-px h-full">
                        {monthsToShow.map(m => {
                          const v   = card.byMonth[m]?.real || 0;
                          const pct = maxBar > 0 ? (Math.abs(v) / maxBar) * 100 : 0;
                          const bk  = `${card.tag0}|${m}`;
                          return (
                            <div key={m} className="relative flex-1 group/bar flex flex-col justify-end h-full"
                              onMouseEnter={() => setHoveredBar(bk)} onMouseLeave={() => setHoveredBar(null)}>
                              <div className={`w-full rounded-t transition-all ${v >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ height: `${pct}%`, minHeight: pct > 0 ? '2px' : '0' }} />
                              {hoveredBar === bk && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[12px] font-bold rounded shadow-xl z-50 whitespace-nowrap">
                                  {getML(m)}: {fmtCard(v)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Medium: barras pareadas Real vs Orçado */}
                  {cardLayout === 'medium' && (
                    <>
                      <div className="flex items-center justify-center gap-3 text-[12px] mb-2">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-400 to-blue-600" /><span className="text-gray-600 font-bold">Real</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-purple-300/60 to-purple-500/60" /><span className="text-gray-600 font-bold">Orçado</span></div>
                      </div>
                      <div className="relative h-16 mb-3">
                      <div className="flex items-end gap-1 h-full px-1">
                        {monthsToShow.map(m => {
                          const md   = card.byMonth[m] || { real: 0, orcado: 0, a1: 0 };
                          const maxM = Math.max(Math.abs(md.real), Math.abs(md.orcado), 1);
                          const rPct = (Math.abs(md.real)   / maxM) * 100;
                          const oPct = (Math.abs(md.orcado) / maxM) * 100;
                          const bk   = `${card.tag0}|${m}`;
                          const vPct = md.orcado !== 0 ? Math.abs(((md.real - md.orcado) / md.orcado) * 100) : 0;
                          return (
                            <div key={m} className="relative flex-1 group/month"
                              onMouseEnter={() => setHoveredBar(bk)} onMouseLeave={() => setHoveredBar(null)}>
                              <div className="flex items-end gap-0.5 h-full">
                                <div className="relative flex-1 flex items-end h-full">
                                  <div className={`w-full rounded-t transition-all duration-300 ${md.real >= 0 ? 'bg-gradient-to-t from-blue-400 to-blue-600 group-hover/month:from-blue-500 group-hover/month:to-blue-700' : 'bg-gradient-to-t from-rose-400 to-rose-600 group-hover/month:from-rose-500 group-hover/month:to-rose-700'}`}
                                    style={{ height: `${rPct}%` }} />
                                </div>
                                <div className="relative flex-1 flex items-end h-full">
                                  <div className={`w-full rounded-t transition-all duration-300 ${md.orcado >= 0 ? 'bg-gradient-to-t from-purple-300/60 to-purple-500/60 group-hover/month:from-purple-400/70 group-hover/month:to-purple-600/70' : 'bg-gradient-to-t from-gray-300/60 to-gray-500/60 group-hover/month:from-gray-400/70 group-hover/month:to-gray-600/70'}`}
                                    style={{ height: `${oPct}%` }} />
                                </div>
                              </div>
                              {vPct >= 10 && (
                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                                  <span className={`text-[8px] font-black px-1 py-0.5 rounded ${(md.real - md.orcado) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {(md.real - md.orcado) >= 0 ? '+' : '-'}{vPct.toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {hoveredBar === bk && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-xl z-50 whitespace-nowrap">
                                  <div>{getML(m)}</div>
                                  <div className="text-blue-300">R {fmtCard(md.real)}</div>
                                  <div className="text-purple-300">O {fmtCard(md.orcado)}</div>
                                  {md.orcado !== 0 && <div className={`${(md.real - md.orcado) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>Δ {((md.real - md.orcado) / Math.abs(md.orcado) * 100).toFixed(1)}%</div>}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      </div>
                      <div className="space-y-2 mt-3">
                        {deltaOrç !== null && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                            <span className="text-gray-500 font-semibold">Variação Total</span>
                            <span className={`font-black ${(card.real - card.orcado) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {(card.real - card.orcado) >= 0 ? '+' : '-'}R$ {fmtCard(Math.abs(card.real - card.orcado))}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Expanded: área SVG */}
                  {cardLayout === 'expanded' && (() => {
                    const W = 400, H = 80;
                    const mn    = Math.min(...vals, 0);
                    const mx    = Math.max(...vals.map(Math.abs), Math.abs(mn), 1);
                    const range = Math.max(mx - mn, 1);
                    const pts   = vals.map((v, i) => ({
                      x: vals.length > 1 ? (i / (vals.length - 1)) * W : W / 2,
                      y: H - ((v - mn) / range) * H * 0.8 - H * 0.1,
                    }));
                    const pathD  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const areaD  = `${pathD} L${W},${H} L0,${H} Z`;
                    const gradId = `sg-${card.tag0.replace(/\W/g, '')}`;
                    const color  = isPos ? '#059669' : '#dc2626';
                    return (
                      <div className="relative h-20 mb-3">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
                          <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor={color} stopOpacity="0.4" />
                              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                            </linearGradient>
                          </defs>
                          <path d={areaD} fill={`url(#${gradId})`} />
                          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p, i) => {
                            const bk = `${card.tag0}|${monthsToShow[i]}`;
                            return (
                              <circle key={i} cx={p.x} cy={p.y} r={hoveredBar === bk ? 5 : 3} fill={color}
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredBar(bk)} onMouseLeave={() => setHoveredBar(null)} />
                            );
                          })}
                        </svg>
                        {hoveredBar && hoveredBar.startsWith(card.tag0 + '|') && (() => {
                          const hm  = hoveredBar.split('|')[1];
                          const idx = monthsToShow.indexOf(hm);
                          const v   = idx >= 0 ? (card.byMonth[hm]?.real || 0) : 0;
                          return idx >= 0 ? (
                            <div className="absolute -top-8 px-2 py-1 bg-gray-900 text-white text-[12px] font-bold rounded shadow-xl whitespace-nowrap pointer-events-none"
                              style={{ left: `${(idx / Math.max(monthsToShow.length - 1, 1)) * 100}%`, transform: 'translateX(-50%)' }}>
                              {getML(hm)}: {fmtCard(v)}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    );
                  })()}

                  {/* List: barras horizontais por mês */}
                  {cardLayout === 'list' && (
                    <div className="w-56 shrink-0 space-y-1">
                      {monthsToShow.map(m => {
                        const v   = card.byMonth[m]?.real || 0;
                        const pct = (Math.abs(v) / execMaxReal) * 100;
                        return (
                          <div key={m} className="flex items-center gap-2 group/bar">
                            <span className="text-[9px] font-bold text-gray-500 w-7">{getML(m)}</span>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                              <div className={`h-full rounded-full transition-all duration-300 ${v >= 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[12px] font-black w-14 text-right ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtCard(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Botão Ver Detalhes */}
                  {cardLayout !== 'list' && (
                    <button
                      onClick={() => setPresentationMode('detailed')}
                      className={`w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl transition-all duration-300 hover:scale-105 group-hover:from-blue-700 group-hover:via-purple-700 group-hover:to-pink-700 flex items-center justify-center gap-2 ${cardLayout === 'compact' ? 'py-1.5 text-xs mt-3' : 'py-2 text-sm mt-4'}`}>
                      <Table2 size={cardLayout === 'compact' ? 11 : 14} />
                      Ver Detalhes
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-10">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : presentationMode === 'detailed' ? (
        <div className={isTableFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col bg-white'
          : 'overflow-auto max-h-[calc(100vh-190px)] rounded-2xl shadow-2xl border-2 border-gray-200 dre-scrollbar'
        }>
          {/* Barra de saída do fullscreen */}
          {isTableFullscreen && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white shrink-0">
              <span className="text-[12px] font-black uppercase tracking-wider">DRE Gerencial — Tela Cheia</span>
              <button
                onClick={() => setIsTableFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-all">
                <Minimize2 size={12} /> Sair
              </button>
            </div>
          )}
          {/* Expandir / Recolher Tudo */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
            <button onClick={expandAllGroups}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all">
              <ChevronsDown size={11} /> Expandir Tudo
            </button>
            <button onClick={collapseAllGroups}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all">
              <ChevronsUp size={11} /> Recolher Tudo
            </button>
          </div>
          <div className={isTableFullscreen ? 'overflow-auto flex-1 dre-scrollbar' : 'contents'}>
          <table className="border-separate border-spacing-0 text-left table-auto min-w-full text-[12px]">

            {/* ══ CONSOLIDADO ══ */}
            {viewMode === 'consolidado' && (
              <>
                <thead className="sticky top-0 z-50 shadow-lg whitespace-nowrap">
                  <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white h-7">
                    <th colSpan={2} rowSpan={2} onClick={() => handleColSort('tag01')} className="sticky left-0 z-[60] bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-1 text-[9px] font-black uppercase tracking-wider w-[320px] align-middle cursor-pointer select-none hover:brightness-110 transition-all">CONTAS GERENCIAIS<SortIcon col="tag01" /></th>
                    {cols.real   && <th className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-500 border-r border-white/20 shadow-sm">REAL</th>}
                    {orcGrpCols > 0 && <th colSpan={orcGrpCols} className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-emerald-500 border-r border-white/20 shadow-sm">REAL vs ORÇADO</th>}
                    {a1GrpCols  > 0 && <th colSpan={a1GrpCols}  className="px-2 py-1 text-center text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm">REAL vs A-1</th>}
                  </tr>
                  <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white h-6">
                    {activeElements.map(el => {
                      switch (el) {
                        case 'Real':            return <th key="real" onClick={() => handleColSort('real_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-blue-500 to-blue-600 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all">Real<SortIcon col="real_total" /></th>;
                        case 'Orçado':          return <th key="orc"  onClick={() => handleColSort('orc_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-emerald-500 to-emerald-600 cursor-pointer select-none hover:brightness-110 transition-all">Orçado<SortIcon col="orc_total" /></th>;
                        case 'DeltaAbsOrcado':  return <th key="dao"  onClick={() => handleColSort('dao_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[120px] bg-gradient-to-br from-emerald-500 to-emerald-600 cursor-pointer select-none hover:brightness-110 transition-all">Δ R−Orç<SortIcon col="dao_total" /></th>;
                        case 'DeltaPercOrcado': return <th key="dpo"  onClick={() => handleColSort('dpo_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[72px] bg-gradient-to-br from-emerald-500 to-emerald-600 border-r border-white/20 cursor-pointer select-none hover:brightness-110 transition-all">Δ%<SortIcon col="dpo_total" /></th>;
                        case 'A1':              return <th key="a1"   onClick={() => handleColSort('a1_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[130px] bg-gradient-to-br from-purple-500 to-purple-600 cursor-pointer select-none hover:brightness-110 transition-all">A-1<SortIcon col="a1_total" /></th>;
                        case 'DeltaAbsA1':      return <th key="da1"  onClick={() => handleColSort('da1_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[120px] bg-gradient-to-br from-purple-500 to-purple-600 cursor-pointer select-none hover:brightness-110 transition-all">Δ R−A-1<SortIcon col="da1_total" /></th>;
                        case 'DeltaPercA1':     return <th key="dp1"  onClick={() => handleColSort('dp1_total')} className="px-2 py-1 text-center font-black text-[9px] uppercase w-[72px] bg-gradient-to-br from-purple-500 to-purple-600 cursor-pointer select-none hover:brightness-110 transition-all">Δ%<SortIcon col="dp1_total" /></th>;
                        default: return null;
                      }
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {displayedGroups.map((g, idx) => {
                    const isOpen = !collapsed.has(g.tag0);
                    const hasA1  = g.a1 !== 0 || g.real !== 0; const hasOrc = g.orcado !== 0 || g.real !== 0;
                    const dOrç = g.real - g.orcado; const dA1 = g.real - g.a1;
                    return (
                      <React.Fragment key={g.tag0}>
                        <tr className={TAG0_TR}>
                          <td className={`px-2 py-1 text-center w-8 ${TAG0_STICKY}`}>{isOpen ? <ChevronDown size={13} className="inline" onClick={() => toggleGroup(g.tag0)} /> : <ChevronRight size={13} className="inline" onClick={() => toggleGroup(g.tag0)} />}</td>
                          <td className={TAG0_LABEL} onClick={() => toggleGroup(g.tag0)}>{g.tag0}</td>
                          {activeElements.map(el => {
                            switch (el) {
                              case 'Real':            return <td key="real" onClick={(e) => handleCellClick(e,`${g.tag0}|Real`, g.real, `Real: ${g.tag0}`)} className={`px-2 py-1 text-center font-mono font-black border-r border-white/10 cursor-pointer ${isCellSel(`${g.tag0}|Real`) ? 'bg-blue-200 text-blue-900 ring-2 ring-inset ring-blue-500' : ''}`} onDoubleClick={() => drillTo('Real', g.tag0, null, null)}>{fmt(g.real)}</td>;
                              case 'Orçado':          return <td key="orc"  onClick={(e) => handleCellClick(e,`${g.tag0}|Orçado`, g.orcado, `Orçado: ${g.tag0}`)} className={`px-2 py-1 text-center font-mono font-black cursor-pointer ${isCellSel(`${g.tag0}|Orçado`) ? 'bg-blue-200 text-blue-900 ring-2 ring-inset ring-blue-500' : hasOrc ? '' : 'text-gray-500'}`} onDoubleClick={() => drillTo('Orçado', g.tag0, null, null)}>{hasOrc ? fmt(g.orcado) : '—'}</td>;
                              case 'DeltaAbsOrcado':  return <td key="dao"  className={`px-2 py-1 text-center font-mono font-black ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>{hasOrc ? fmt(dOrç) : '—'}</td>;
                              case 'DeltaPercOrcado': return <td key="dpo"  className={`px-2 py-1 text-center font-mono font-black border-r border-white/10 ${hasOrc ? deltaClass(dOrç, g.orcado) : 'text-gray-500'}`}>{fmtPct(g.real, g.orcado)}</td>;
                              case 'A1':              return <td key="a1"   onClick={(e) => handleCellClick(e,`${g.tag0}|A1`, g.a1, `A-1: ${g.tag0}`)} className={`px-2 py-1 text-center font-mono font-black cursor-pointer ${isCellSel(`${g.tag0}|A1`) ? 'bg-blue-200 text-blue-900 ring-2 ring-inset ring-blue-500' : hasA1 ? '' : 'text-gray-500'}`} onDoubleClick={() => drillTo('A-1', g.tag0, null, null)}>{hasA1 ? fmt(g.a1) : '—'}</td>;
                              case 'DeltaAbsA1':      return <td key="da1"  className={`px-2 py-1 text-center font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>{hasA1 ? fmt(dA1) : '—'}</td>;
                              case 'DeltaPercA1':     return <td key="dp1"  className={`px-2 py-1 text-center font-mono font-black ${hasA1 ? deltaClass(dA1, g.a1) : 'text-gray-500'}`}>{fmtPct(g.real, g.a1)}</td>;
                              default: return null;
                            }
                          })}
                        </tr>
                        {isOpen && g.items.map((r, i) => {
                          const rHasOrc = r.orcado !== 0 || r.real !== 0; const rHasA1 = r.a1 !== 0 || r.real !== 0;
                          const rdOrç = r.real - r.orcado; const rdA1 = r.real - r.a1;
                          const rowKey = `${g.tag0}|${r.tag01}`;
                          const isDrillExpanded = expandedTag01s[rowKey];
                          return (
                            <React.Fragment key={r.tag01}>
                              <tr className="group bg-gray-100 border-b border-gray-200 hover:bg-yellow-300 transition-colors">
                                <td className="px-2 py-1 w-8 sticky left-0 z-20 bg-gray-100 group-hover:bg-yellow-300 transition-colors">
                                  {drillDimensions.length > 0 && (
                                    <button onClick={() => setExpandedTag01s(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))} className="text-gray-400 hover:text-amber-600 transition-colors">
                                      {isDrillExpanded ? <ChevronDown size={10} className="inline" /> : <ChevronRight size={10} className="inline" />}
                                    </button>
                                  )}
                                </td>
                                <td className="px-2 py-1 pl-6 text-gray-950 font-extrabold truncate sticky left-8 z-20 w-[280px] bg-gray-100 group-hover:bg-yellow-300 transition-colors">{r.tag01}</td>
                                {activeElements.map(el => {
                                  switch (el) {
                                    case 'Real':            return <td key="real" onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Real`, r.real, `Real: ${r.tag01}`)} className={`px-2 py-1 text-center font-mono border-r border-gray-100 cursor-pointer ${isCellSel(`${g.tag0}|${r.tag01}|Real`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : 'text-gray-900 hover:bg-yellow-300'}`} onDoubleClick={() => drillTo('Real', g.tag0, r.tag01, null)}>{fmt(r.real)}</td>;
                                    case 'Orçado':          return <td key="orc"  onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|Orçado`, r.orcado, `Orçado: ${r.tag01}`)} className={`px-2 py-1 text-center font-mono cursor-pointer ${isCellSel(`${g.tag0}|${r.tag01}|Orçado`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : rHasOrc ? 'text-gray-900 hover:bg-yellow-300' : 'text-gray-300'}`} onDoubleClick={() => drillTo('Orçado', g.tag0, r.tag01, null)}>{rHasOrc ? fmt(r.orcado) : '—'}</td>;
                                    case 'DeltaAbsOrcado':  return <td key="dao"  className={`px-2 py-1 text-center font-mono ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>{rHasOrc ? fmt(rdOrç) : '—'}</td>;
                                    case 'DeltaPercOrcado': return <td key="dpo"  className={`px-2 py-1 text-center font-mono border-r border-gray-200 ${rHasOrc ? deltaClass(rdOrç, r.orcado) : 'text-gray-300'}`}>{rHasOrc ? `${((rdOrç / Math.abs(r.orcado)) * 100).toFixed(1)}%` : '—'}</td>;
                                    case 'A1':              return <td key="a1"   onClick={(e) => handleCellClick(e,`${g.tag0}|${r.tag01}|A1`, r.a1, `A-1: ${r.tag01}`)} className={`px-2 py-1 text-center font-mono cursor-pointer ${isCellSel(`${g.tag0}|${r.tag01}|A1`) ? 'bg-blue-100 text-blue-800 ring-2 ring-inset ring-blue-400' : rHasA1 ? 'text-gray-900 hover:bg-yellow-300' : 'text-gray-300'}`} onDoubleClick={() => drillTo('A-1', g.tag0, r.tag01, null)}>{rHasA1 ? fmt(r.a1) : '—'}</td>;
                                    case 'DeltaAbsA1':      return <td key="da1"  className={`px-2 py-1 text-center font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>{rHasA1 ? fmt(rdA1) : '—'}</td>;
                                    case 'DeltaPercA1':     return <td key="dp1"  className={`px-2 py-1 text-center font-mono ${rHasA1 ? deltaClass(rdA1, r.a1) : 'text-gray-300'}`}>{rHasA1 ? `${((rdA1 / Math.abs(r.a1)) * 100).toFixed(1)}%` : '—'}</td>;
                                    default: return null;
                                  }
                                })}
                              </tr>
                              {drillDimensions.length > 0 && isDrillExpanded && renderDrillRows(r.tag01, g.tag0)}
                            </React.Fragment>
                          );
                        })}
                        {!hasTagFilter && idx === lastIdx03 && <CalcRow label="MARGEM DE CONTRIBUIÇÃO" data={margemData} borderTop cols={cols} activeElements={activeElements} />}
                        {!hasTagFilter && idx === lastIdx04 && <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} borderTop cols={cols} activeElements={activeElements} />}
                        {!hasTagFilter && idx === lastIdx03 && lastIdx04 === -1 && <CalcRow label="EBITDA (S/ RATEIO RAIZ CSC)" data={ebitdaData} cols={cols} activeElements={activeElements} />}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-40">
                  <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white font-black text-[12px] shadow-[0_-2px_6px_rgba(0,0,0,0.3)] border-t-2 border-yellow-400">
                    <td colSpan={2} className="py-2 uppercase tracking-tight font-black sticky left-0 z-50 bg-gradient-to-r from-slate-800 to-slate-700 ">
                      <div className="flex items-center gap-1 px-2">
                        {showOnlyEbitda && <Activity size={12} />}
                        <span>{showOnlyEbitda ? 'EBITDA TOTAL' : 'TOTAL GERAL'}</span>
                      </div>
                    </td>
                    {activeElements.map(el => {
                      switch (el) {
                        case 'Real':            return <td key="real" className="px-2 py-2 text-center font-mono border-r border-white/10">{fmt(totals.real)}</td>;
                        case 'Orçado':          return <td key="orc"  className={`px-2 py-2 text-center font-mono ${totals.orcado !== 0 ? '' : 'text-gray-500'}`}>{totals.orcado !== 0 ? fmt(totals.orcado) : '—'}</td>;
                        case 'DeltaAbsOrcado':  return <td key="dao"  className={`px-2 py-2 text-center font-mono ${(totals.orcado !== 0 || totals.real !== 0) ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>{(totals.orcado !== 0 || totals.real !== 0) ? fmt(totals.real - totals.orcado) : '—'}</td>;
                        case 'DeltaPercOrcado': return <td key="dpo"  className={`px-2 py-2 text-center font-mono border-r border-white/10 ${(totals.orcado !== 0 || totals.real !== 0) ? deltaClass(totals.real - totals.orcado, totals.orcado, true) : 'text-gray-500'}`}>{fmtPct(totals.real, totals.orcado)}</td>;
                        case 'A1':              return <td key="a1"   className={`px-2 py-2 text-center font-mono ${(totals.a1 !== 0 || totals.real !== 0) ? '' : 'text-gray-500'}`}>{(totals.a1 !== 0 || totals.real !== 0) ? fmt(totals.a1) : '—'}</td>;
                        case 'DeltaAbsA1':      return <td key="da1"  className={`px-2 py-2 text-center font-mono ${(totals.a1 !== 0 || totals.real !== 0) ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>{(totals.a1 !== 0 || totals.real !== 0) ? fmt(totals.real - totals.a1) : '—'}</td>;
                        case 'DeltaPercA1':     return <td key="dp1"  className={`px-2 py-2 text-center font-mono ${(totals.a1 !== 0 || totals.real !== 0) ? deltaClass(totals.real - totals.a1, totals.a1, true) : 'text-gray-500'}`}>{fmtPct(totals.real, totals.a1)}</td>;
                        default: return null;
                      }
                    })}
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
        </div>
      ) : null}

      {/* ══ PAINEL DE SOMATÓRIO DE CÉLULAS SELECIONADAS ══ */}
      {cellSelection.size > 0 && (
        <div className="fixed bottom-6 right-6 z-[300] bg-white rounded-2xl shadow-2xl border border-indigo-100 min-w-[260px] max-w-[320px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <Calculator size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                {cellSelection.size} {cellSelection.size === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <button onClick={() => setCellSelection(new Map())} className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded hover:bg-gray-100">
              <X size={13} />
            </button>
          </div>
          {/* Lista de itens */}
          <div className="max-h-[180px] overflow-y-auto divide-y divide-gray-50">
            {Array.from(cellSelection.entries()).map(([id, { value, label }]) => (
              <div key={id} className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50 group">
                <span className="text-[11px] text-gray-600 truncate mr-2 flex-1">{label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-gray-800">{fmt(value)}</span>
                  <button onClick={(e) => handleCellClick(e,id, value, label)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-400 transition-all">
                    <X size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Footer com soma */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-between">
            <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">SOMA</span>
            <span className="text-[16px] font-black text-white font-mono">{fmt(selectedSum)}</span>
          </div>
        </div>
      )}

      {/* ══ SOLICITAÇÕES DE ANÁLISE ══ */}
      {authUser && !isTableFullscreen && (
        <InquiryListPanel
          filterHash={filterHash}
          filterContext={filterContextObj as DreInquiryFilterContext}
          filterContextLabel={filterContextString}
          dreSnapshot={null}
          currentUser={{ email: authUser.email, name: authUser.name }}
          onRestoreFilters={(ctx) => handleRestoreFilters(ctx as DreAnalysis['filter_context'])}
        />
      )}

    </div>
  );
};

export default SomaTagsView;
