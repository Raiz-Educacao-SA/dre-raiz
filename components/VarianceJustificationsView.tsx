import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Send,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Settings,
  Mail,
  CalendarDays,
  Building2,
  TrendingUp,
  Presentation,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getVarianceJustifications,
  getVarianceYtdItems,
  generateVarianceItems,
  submitJustification,
  reviewJustification,
  bulkReviewJustifications,
  updateVarianceAiSummary,
  subscribeVarianceJustifications,
  getVarianceThresholds,
  upsertVarianceThreshold,
  deleteVarianceThreshold,
  VarianceJustification,
  VarianceThreshold,
} from '../services/supabaseService';
import { generateVarianceSummary, VarianceSummaryItem } from '../services/anthropicService';
import { toast } from 'sonner';

// ── Helpers ──

const fmt = (v: number) =>
  v === 0 ? '—' : Math.round(v).toLocaleString('pt-BR');

const fmtPct = (v: number | null) => {
  if (v === null || v === undefined) return 'N/D';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
};

const deltaColor = (v: number | null, onDark = false): string => {
  if (v === null || v === undefined || v === 0) return onDark ? 'text-white/40' : 'text-gray-400';
  if (v > 0) return onDark ? 'text-lime-300' : 'text-emerald-600';
  return onDark ? 'text-red-200' : 'text-rose-600';
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  notified: 'Notificado',
  justified: 'Justificado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  notified: 'bg-blue-100 text-blue-700',
  justified: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const MONTHS_OPTIONS = (() => {
  const now = new Date();
  const months: { value: string; label: string }[] = [];
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
    months.push({ value: val, label });
  }
  return months.reverse();
})();

// ── Types ──

/** Aggregate values from children when no direct DB row exists */
interface AggValues {
  real: number;
  compare: number;
  varAbs: number;
  varPct: number | null;
  status: string;
  ai_summary: string | null;
  id: number | null;        // id of the DB row if it exists
  owner_email: string | null;
  owner_name: string | null;
}

// ── Component ──

const VarianceJustificationsView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const isAdminOrManager = isAdmin || user?.role === 'manager';

  // Filters
  const [yearMonth, setYearMonth] = useState(MONTHS_OPTIONS[1]?.value || '');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Year labels
  const currentYear = yearMonth ? Number(yearMonth.slice(0, 4)) : new Date().getFullYear();
  const a1Year = currentYear - 1;

  // Data
  const [items, setItems] = useState<VarianceJustification[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [exportingPpt, setExportingPpt] = useState(false);

  // Tree state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Justification modal
  const [justifyItem, setJustifyItem] = useState<VarianceJustification | null>(null);
  const [justifyText, setJustifyText] = useState('');
  const [justifyPlan, setJustifyPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review modal
  const [reviewItem, setReviewItem] = useState<VarianceJustification | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  // AI synthesis
  const [synthesizing, setSynthesizing] = useState<string | null>(null);

  // Thresholds config
  const [showThresholds, setShowThresholds] = useState(false);
  const [thresholds, setThresholds] = useState<VarianceThreshold[]>([]);

  // Available marcas
  const [availableMarcas, setAvailableMarcas] = useState<string[]>([]);

  // YTD panel
  const [showYtd, setShowYtd] = useState(false);
  const [ytdItems, setYtdItems] = useState<VarianceJustification[]>([]);
  const [ytdLoading, setYtdLoading] = useState(false);
  const [ytdSummaries, setYtdSummaries] = useState<Record<string, string>>({});
  const [ytdSynthKey, setYtdSynthKey] = useState<string | null>(null);
  const [ytdExpandedSummaries, setYtdExpandedSummaries] = useState<Set<string>>(new Set());
  const [ytdExpandedNodes, setYtdExpandedNodes] = useState<Set<string>>(new Set());

  // ── Fetch data ──

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVarianceJustifications({
        year_month: yearMonth || undefined,
        marca: filterMarca || undefined,
        status: filterStatus || undefined,
        comparison_type: filterType || undefined,
        owner_email: (!isAdminOrManager && user?.email) ? user.email : undefined,
      });
      setItems(data);

      // Extract unique marcas
      const marcas = [...new Set(data.map(d => d.marca).filter(Boolean))].sort();
      setAvailableMarcas(prev => {
        if (prev.length === 0 && marcas.length > 0) return marcas;
        return prev.length >= marcas.length ? prev : marcas;
      });
    } catch (e) {
      console.error('Erro ao buscar justificativas:', e);
    } finally {
      setLoading(false);
    }
  }, [yearMonth, filterMarca, filterStatus, filterType, isAdminOrManager, user?.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const unsub = subscribeVarianceJustifications(() => {
      fetchData();
    });
    return unsub;
  }, [fetchData]);

  // ── YTD fetch ──

  const fetchYtd = useCallback(async () => {
    setYtdLoading(true);
    try {
      const year = yearMonth.slice(0, 4);
      const data = await getVarianceYtdItems(`${year}-01`, yearMonth, filterMarca || undefined);
      setYtdItems(data);
    } catch (e) {
      console.error('Erro ao buscar YTD:', e);
    } finally {
      setYtdLoading(false);
    }
  }, [yearMonth, filterMarca]);

  useEffect(() => {
    if (showYtd) fetchYtd();
  }, [showYtd, fetchYtd]);

  // ── YTD aggregation — mesma estrutura da tabela principal ──

  type YtdFlatRow = {
    depth: number;
    groupKey: string;
    label: string;
    tag0: string;
    tag01: string;
    tag02: string | null;
    marca: string | null;
    hasChildren: boolean;
    ytdReal: number;
    orcCompare: number;
    orcVarPct: number | null;
    a1Compare: number;
    a1VarPct: number | null;
    months: string[];
  };

  const toggleYtdNode = (key: string) => {
    setYtdExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const ytdFlatRows = useMemo((): YtdFlatRow[] => {
    if (ytdItems.length === 0) return [];

    const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.']);
    const isDre = (t: string) => DRE_PREFIXES.has((t || '').slice(0, 3));

    // 1. Aggregate ytdItems across months per (tag0, tag01, tag02, marca)
    type PathAgg = { realByMonth: Map<string, number>; orcCompare: number; a1Compare: number; months: Set<string> };
    const pathMap = new Map<string, PathAgg>();

    for (const item of ytdItems) {
      if (!isDre(item.tag0)) continue;
      const path = `${item.tag0}|${item.tag01 || ''}|${item.tag02 || ''}|${item.marca || ''}`;
      if (!pathMap.has(path)) pathMap.set(path, { realByMonth: new Map(), orcCompare: 0, a1Compare: 0, months: new Set() });
      const p = pathMap.get(path)!;
      p.months.add(item.year_month);
      // Store real per month (same for orcado/a1, avoid double counting)
      if (!p.realByMonth.has(item.year_month)) p.realByMonth.set(item.year_month, Number(item.real_value));
      if (item.comparison_type === 'orcado') p.orcCompare += Number(item.compare_value);
      else p.a1Compare += Number(item.compare_value);
    }

    // Helper: sum real from realByMonth
    const sumReal = (p: PathAgg) => [...p.realByMonth.values()].reduce((s, v) => s + v, 0);

    // Helper: aggregate multiple paths
    const aggPaths = (paths: PathAgg[]) => {
      let real = 0, orc = 0, a1 = 0;
      const months = new Set<string>();
      // Deduplicate real across paths by month
      const realByMonth = new Map<string, number>();
      for (const p of paths) {
        orc += p.orcCompare;
        a1 += p.a1Compare;
        for (const [m, v] of p.realByMonth) {
          realByMonth.set(m, (realByMonth.get(m) || 0) + v);
        }
        for (const m of p.months) months.add(m);
      }
      real = [...realByMonth.values()].reduce((s, v) => s + v, 0);
      return { real, orc, a1, months: [...months].sort() };
    };

    const varPct = (real: number, compare: number) =>
      compare !== 0 ? Math.round(((real - compare) / Math.abs(compare)) * 1000) / 10 : null;

    // 2. Build tree — same hierarchy as main table
    const CALC_ROW_ORDER: Record<string, number> = {
      'MARGEM DE CONTRIBUIÇÃO': 3.5,
      'EBITDA (S/ RATEIO RAIZ CSC)': 4.5,
      'EBITDA TOTAL': 5.5,
    };

    // Collect unique tag0s from tag01-level items (no tag02)
    const tag0Set = new Set<string>();
    for (const [key] of pathMap) {
      const tag0 = key.split('|')[0];
      tag0Set.add(tag0);
    }
    const tag0Sorted = [...tag0Set].sort((a, b) => {
      const aOrd = CALC_ROW_ORDER[a] ?? (parseFloat(a) || 999);
      const bOrd = CALC_ROW_ORDER[b] ?? (parseFloat(b) || 999);
      return aOrd - bOrd;
    });

    const rows: YtdFlatRow[] = [];

    for (const tag0 of tag0Sorted) {
      // Paths under this tag0, only tag01-level (no tag02)
      const tag01Paths: [string, PathAgg][] = [];
      const tag01Set = new Set<string>();
      for (const [key, val] of pathMap) {
        const [t0, t1, t2] = key.split('|');
        if (t0 !== tag0) continue;
        if (t1 && !t2) { tag01Paths.push([key, val]); tag01Set.add(t1); }
      }

      const tag0Agg = aggPaths(tag01Paths.map(([, v]) => v));
      rows.push({
        depth: 0, groupKey: `ytd-${tag0}`, label: tag0, tag0, tag01: '', tag02: null, marca: null,
        hasChildren: tag01Set.size > 0,
        ytdReal: tag0Agg.real, orcCompare: tag0Agg.orc, orcVarPct: varPct(tag0Agg.real, tag0Agg.orc),
        a1Compare: tag0Agg.a1, a1VarPct: varPct(tag0Agg.real, tag0Agg.a1), months: tag0Agg.months,
      });

      if (!ytdExpandedNodes.has(`ytd-${tag0}`)) continue;

      for (const tag01 of [...tag01Set].sort()) {
        const tag01Path = pathMap.get(`${tag0}|${tag01}||`);
        const tag01Real = tag01Path ? sumReal(tag01Path) : 0;
        const tag01Orc = tag01Path?.orcCompare || 0;
        const tag01A1 = tag01Path?.a1Compare || 0;
        const tag01Months = tag01Path ? [...tag01Path.months].sort() : [];

        // Check for tag02 children
        const tag02Set = new Set<string>();
        for (const [key] of pathMap) {
          const [t0, t1, t2] = key.split('|');
          if (t0 === tag0 && t1 === tag01 && t2) tag02Set.add(t2);
        }

        rows.push({
          depth: 1, groupKey: `ytd-${tag0}|${tag01}`, label: tag01, tag0, tag01, tag02: null, marca: null,
          hasChildren: tag02Set.size > 0,
          ytdReal: tag01Real, orcCompare: tag01Orc, orcVarPct: varPct(tag01Real, tag01Orc),
          a1Compare: tag01A1, a1VarPct: varPct(tag01Real, tag01A1), months: tag01Months,
        });

        if (!ytdExpandedNodes.has(`ytd-${tag0}|${tag01}`) || tag02Set.size === 0) continue;

        for (const tag02 of [...tag02Set].sort()) {
          // Tag02 paths (all marcas under this tag02)
          const tag02Paths: PathAgg[] = [];
          const marcaSet = new Set<string>();
          for (const [key, val] of pathMap) {
            const [t0, t1, t2, m] = key.split('|');
            if (t0 === tag0 && t1 === tag01 && t2 === tag02) {
              tag02Paths.push(val);
              if (m) marcaSet.add(m);
            }
          }
          const tag02Agg = aggPaths(tag02Paths);
          const hasMarcas = marcaSet.size > 0;

          rows.push({
            depth: 2, groupKey: `ytd-${tag0}|${tag01}|${tag02}`, label: tag02, tag0, tag01, tag02, marca: null,
            hasChildren: hasMarcas,
            ytdReal: tag02Agg.real, orcCompare: tag02Agg.orc, orcVarPct: varPct(tag02Agg.real, tag02Agg.orc),
            a1Compare: tag02Agg.a1, a1VarPct: varPct(tag02Agg.real, tag02Agg.a1), months: tag02Agg.months,
          });

          if (!ytdExpandedNodes.has(`ytd-${tag0}|${tag01}|${tag02}`) || !hasMarcas) continue;

          for (const marcaName of [...marcaSet].sort()) {
            const mp = pathMap.get(`${tag0}|${tag01}|${tag02}|${marcaName}`);
            if (!mp) continue;
            const mReal = sumReal(mp);
            rows.push({
              depth: 3, groupKey: `ytd-marca-${tag0}|${tag01}|${tag02}|${marcaName}`, label: marcaName,
              tag0, tag01, tag02, marca: marcaName, hasChildren: false,
              ytdReal: mReal, orcCompare: mp.orcCompare, orcVarPct: varPct(mReal, mp.orcCompare),
              a1Compare: mp.a1Compare, a1VarPct: varPct(mReal, mp.a1Compare), months: [...mp.months].sort(),
            });
          }
        }
      }
    }

    return rows;
  }, [ytdItems, ytdExpandedNodes]);

  // YTD stats
  const ytdStats = useMemo(() => {
    const allMonths = [...new Set(ytdItems.map(i => i.year_month))].sort();
    const totalJustified = ytdItems.filter(i =>
      i.tag02 !== null && (i.status === 'justified' || i.status === 'approved')
    ).length;
    const totalLeaves = ytdItems.filter(i => i.tag02 !== null).length;
    return { months: allMonths, totalJustified, totalLeaves };
  }, [ytdItems]);

  // ── YTD synthesis handler ──

  const handleYtdSynthesis = async (tag0: string, tag01: string, compType: string) => {
    const key = `${tag0}|${tag01}|${compType}`;
    setYtdSynthKey(key);

    try {
      const monthlyItems = ytdItems.filter(i =>
        i.tag0 === tag0 && i.tag01 === tag01 &&
        i.tag02 === null && i.tag03 === null &&
        i.comparison_type === compType && i.ai_summary
      );

      if (monthlyItems.length < 2) {
        toast.error('Precisa de ao menos 2 meses com síntese IA para gerar YTD');
        setYtdSynthKey(null);
        return;
      }

      const summaryItems: VarianceSummaryItem[] = monthlyItems.map(i => ({
        label: i.year_month,
        real: i.real_value,
        compare: i.compare_value,
        variance_pct: i.variance_pct,
        text: i.ai_summary!,
      }));

      const summary = await generateVarianceSummary('ytd', summaryItems, {
        parentLabel: `${tag0} > ${tag01}`,
        marca: filterMarca || undefined,
      });

      setYtdSummaries(prev => ({ ...prev, [key]: summary }));
      setYtdExpandedSummaries(prev => { const n = new Set(prev); n.add(key); return n; });
      toast.success('Síntese YTD gerada');
    } catch (e) {
      toast.error('Erro ao gerar síntese YTD');
    } finally {
      setYtdSynthKey(null);
    }
  };

  // ── Build flat rows for rendering ──
  // Hierarchy: tag0 (depth 0) → tag01 (depth 1) → tag02 (depth 2) → tag03 (depth 3)

  /** A flat row — one per tag path, with orc + a1 side-by-side */
  type FlatRow = {
    depth: number;           // 0=tag0, 1=tag01, 2=tag02, 3=tag03
    groupKey: string;        // for expand/collapse
    label: string;           // display name
    tag0: string;
    tag01: string;
    tag02: string | null;
    tag03: string | null;
    marca: string | null;
    hasChildren: boolean;
    real: number;
    // vs Orçado
    orcCompare: number;
    orcVarAbs: number;
    orcVarPct: number | null;
    orcStatus: string;
    orcDbItem: VarianceJustification | null;
    orcAiSummary: string | null;
    // vs A-1
    a1Compare: number;
    a1VarAbs: number;
    a1VarPct: number | null;
    a1Status: string;
    a1DbItem: VarianceJustification | null;
    a1AiSummary: string | null;
    // Owner (shared)
    ownerEmail: string | null;
    ownerName: string | null;
  };

  /** Helper: aggregate values from a list of items */
  const aggValues = (list: VarianceJustification[]) => {
    const real = list.reduce((s, i) => s + Number(i.real_value), 0);
    const compare = list.reduce((s, i) => s + Number(i.compare_value), 0);
    const varAbs = real - compare;
    const varPct = compare !== 0 ? Math.round(((real - compare) / Math.abs(compare)) * 1000) / 10 : null;
    return { real, compare, varAbs, varPct };
  };

  const flatRows = useMemo(() => {
    if (items.length === 0) return [];

    // Index items by tag path + comparison type
    const pathKey = (i: VarianceJustification) =>
      `${i.tag0}|${i.tag01 || ''}|${i.tag02 || ''}|${i.tag03 || ''}`;
    const orcMap = new Map<string, VarianceJustification>();
    const a1Map = new Map<string, VarianceJustification>();
    for (const item of items) {
      const pk = pathKey(item);
      if (item.comparison_type === 'orcado') orcMap.set(pk, item);
      else if (item.comparison_type === 'a1') a1Map.set(pk, item);
    }

    /** Aggregate values from items of a given comparison type */
    const aggForType = (list: VarianceJustification[], type: 'orcado' | 'a1') => {
      const filtered = list.filter(i => i.comparison_type === type);
      if (filtered.length === 0) return { real: 0, compare: 0, varAbs: 0, varPct: null as number | null };
      return aggValues(filtered);
    };

    const buildRow = (
      depth: number, groupKey: string, label: string,
      tag0: string, tag01: string, tag02: string | null, tag03: string | null,
      hasChildren: boolean,
      allItems: VarianceJustification[],
      orcDirect: VarianceJustification | null, a1Direct: VarianceJustification | null,
      marca: string | null = null,
    ): FlatRow => {
      const orcAgg = aggForType(allItems, 'orcado');
      const a1Agg = aggForType(allItems, 'a1');
      const realVal = orcDirect ? Number(orcDirect.real_value) : a1Direct ? Number(a1Direct.real_value) : orcAgg.real || a1Agg.real;
      return {
        depth, groupKey, label, tag0, tag01, tag02, tag03, marca, hasChildren,
        real: realVal,
        orcCompare: orcDirect ? Number(orcDirect.compare_value) : orcAgg.compare,
        orcVarAbs: orcDirect ? Number(orcDirect.variance_abs) : orcAgg.varAbs,
        orcVarPct: orcDirect ? orcDirect.variance_pct : orcAgg.varPct,
        orcStatus: orcDirect?.status || '',
        orcDbItem: orcDirect,
        orcAiSummary: orcDirect?.ai_summary || null,
        a1Compare: a1Direct ? Number(a1Direct.compare_value) : a1Agg.compare,
        a1VarAbs: a1Direct ? Number(a1Direct.variance_abs) : a1Agg.varAbs,
        a1VarPct: a1Direct ? a1Direct.variance_pct : a1Agg.varPct,
        a1Status: a1Direct?.status || '',
        a1DbItem: a1Direct,
        a1AiSummary: a1Direct?.ai_summary || null,
        ownerEmail: orcDirect?.owner_email || a1Direct?.owner_email || allItems[0]?.owner_email || null,
        ownerName: orcDirect?.owner_name || a1Direct?.owner_name || allItems[0]?.owner_name || null,
      };
    };

    // Collect unique tag0 values, sort with calc rows in correct position
    const CALC_ROW_ORDER: Record<string, number> = {
      'MARGEM DE CONTRIBUIÇÃO': 3.5,           // after 03., before 04.
      'EBITDA (S/ RATEIO RAIZ CSC)': 4.5,      // after 04., before 05.
      'EBITDA TOTAL': 5.5,                      // after 05.
    };
    const tag0Set = new Set(items.map(i => i.tag0));
    const rows: FlatRow[] = [];
    const tag0Sorted = [...tag0Set].sort((a, b) => {
      const aOrd = CALC_ROW_ORDER[a] ?? (parseFloat(a) || 999);
      const bOrd = CALC_ROW_ORDER[b] ?? (parseFloat(b) || 999);
      return aOrd - bOrd;
    });

    for (const tag0 of tag0Sorted) {
      const tag0All = items.filter(i => i.tag0 === tag0);
      // Para agregação tag0: usar apenas itens nível tag01 (sem tag02) para não duplicar
      const tag0Level = tag0All.filter(i => !i.tag02);
      const tag0Key = tag0;
      const tag0Orc = orcMap.get(`${tag0}|||`) || null;
      const tag0A1 = a1Map.get(`${tag0}|||`) || null;
      const tag01Set = new Set(tag0All.filter(i => i.tag01).map(i => i.tag01));

      rows.push(buildRow(0, tag0Key, tag0, tag0, '', null, null, tag01Set.size > 0, tag0Level, tag0Orc, tag0A1));

      if (!expandedNodes.has(tag0Key)) continue;

      for (const tag01 of [...tag01Set].sort()) {
        if (!tag01) continue;
        const tag01All = tag0All.filter(i => i.tag01 === tag01);
        // Para agregação tag01: usar apenas itens nível tag01 (sem tag02) para não duplicar
        const tag01Level = tag01All.filter(i => !i.tag02);
        const tag01Key = `${tag0}|${tag01}`;
        const tag01Orc = orcMap.get(`${tag0}|${tag01}||`) || null;
        const tag01A1 = a1Map.get(`${tag0}|${tag01}||`) || null;
        const tag02Set = new Set(tag01All.filter(i => i.tag02).map(i => i.tag02!));

        rows.push(buildRow(1, tag01Key, tag01, tag0, tag01, null, null, tag02Set.size > 0, tag01Level, tag01Orc, tag01A1));

        if (!expandedNodes.has(tag01Key) || tag02Set.size === 0) continue;

        for (const tag02 of [...tag02Set].sort()) {
          const tag02All = tag01All.filter(i => i.tag02 === tag02);
          const marcaSet = new Set(tag02All.map(i => i.marca).filter(Boolean));
          const hasMarcaChildren = marcaSet.size > 0;
          const tag02Key = `${tag0}|${tag01}|${tag02}`;

          // tag02 = pai das marcas (agregado via allItems, sem orcDirect)
          rows.push(buildRow(2, tag02Key, tag02, tag0, tag01, tag02, null, hasMarcaChildren, tag02All, null, null, null));

          if (!expandedNodes.has(tag02Key) || !hasMarcaChildren) continue;

          for (const marcaName of [...marcaSet].sort()) {
            const marcaItems = tag02All.filter(i => i.marca === marcaName);
            const marcaOrc = marcaItems.find(i => i.comparison_type === 'orcado') || null;
            const marcaA1 = marcaItems.find(i => i.comparison_type === 'a1') || null;

            rows.push(buildRow(3, `marca-${marcaOrc?.id || marcaA1?.id || `${tag02Key}|${marcaName}`}`, marcaName, tag0, tag01, tag02, null, false, marcaItems, marcaOrc, marcaA1, marcaName));
          }
        }
      }
    }

    return rows;
  }, [items, expandedNodes]);

  // ── Stats ──

  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending').length;
    const notified = items.filter(i => i.status === 'notified').length;
    const justified = items.filter(i => i.status === 'justified').length;
    const approved = items.filter(i => i.status === 'approved').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    const version = items.length > 0 ? Math.max(...items.map(i => i.version || 1)) : 0;
    // snapshot_at: pega o mais recente entre os items da versão atual
    const currentVersionItems = items.filter(i => i.version === version && i.snapshot_at);
    const snapshotAt = currentVersionItems.length > 0
      ? currentVersionItems.reduce((latest, i) => {
          const d = i.snapshot_at!;
          return d > latest ? d : latest;
        }, currentVersionItems[0].snapshot_at!)
      : null;
    return { pending, notified, justified, approved, rejected, total: items.length, version, snapshotAt };
  }, [items]);

  // ── Actions ──

  const handleGenerate = async () => {
    if (!yearMonth) {
      toast.error('Selecione um mês');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateVarianceItems(yearMonth, filterMarca || undefined);
      if (result.error) {
        toast.error(`Erro: ${result.error}`);
      } else {
        const parts = [];
        if (result.created > 0) parts.push(`${result.created} novos`);
        if (result.updated > 0) parts.push(`${result.updated} atualizados`);
        toast.success(`Versão ${result.version}: ${parts.join(' + ') || '0 itens'}`);
        if (result.diagnostics) {
          toast.info(result.diagnostics, { duration: 5000 });
        }
        fetchData();
      }
    } catch (e) {
      toast.error('Erro ao gerar desvios');
    } finally {
      setGenerating(false);
    }
  };

  const handleNotify = async () => {
    if (!yearMonth) return;
    setNotifying(true);
    try {
      const response = await fetch('/api/agent-team/notifications?action=variance-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, marca: filterMarca || undefined }),
      });
      const result = await response.json();
      if (result.sent) {
        toast.success(`Cobranças enviadas para ${result.count || 0} pacoteiros`);
        fetchData();
      } else {
        toast.error(result.reason || 'Erro ao enviar cobranças');
      }
    } catch (e) {
      toast.error('Erro ao enviar cobranças');
    } finally {
      setNotifying(false);
    }
  };

  const handleBulkReview = async (status: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) {
      toast.error('Selecione itens primeiro');
      return;
    }
    const note = prompt(status === 'approved' ? 'Comentário de aprovação (opcional):' : 'Motivo da rejeição:');
    if (note === null) return;

    const result = await bulkReviewJustifications([...selectedIds], status, note || undefined);
    if (result.ok) {
      toast.success(`${result.count} itens ${status === 'approved' ? 'aprovados' : 'rejeitados'}`);
      setSelectedIds(new Set());
      fetchData();
    } else {
      toast.error(result.error || 'Erro ao revisar em massa');
    }
  };

  // ── PPT export ──

  const handleExportPpt = useCallback(async () => {
    if (items.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    setExportingPpt(true);
    try {
      toast.info('Gerando apresentação...');
      const { prepareVariancePptData } = await import('../services/variancePptDataService');
      const { generateVariancePpt } = await import('../services/variancePptService');
      const data = prepareVariancePptData(items, yearMonth, filterMarca || null);
      await generateVariancePpt(data);
      toast.success('Apresentação exportada!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar apresentação');
    } finally {
      setExportingPpt(false);
    }
  }, [items, yearMonth, filterMarca]);

  // ── Justification submit ──

  const handleJustifySubmit = async () => {
    if (!justifyItem) return;
    if (justifyText.trim().length < 20) {
      toast.error('Justificativa deve ter pelo menos 20 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitJustification(justifyItem.id, justifyText.trim(), justifyPlan.trim() || undefined);
      if (result.ok) {
        toast.success('Justificativa enviada com sucesso');
        setJustifyItem(null);
        setJustifyText('');
        setJustifyPlan('');
        fetchData();

        // Trigger AI cascade: check if all siblings are justified
        triggerAiCascade(justifyItem);
      } else {
        toast.error(result.error || 'Erro ao enviar justificativa');
      }
    } catch (e) {
      toast.error('Erro ao enviar justificativa');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Review submit ──

  const handleReviewSubmit = async () => {
    if (!reviewItem) return;
    const result = await reviewJustification(reviewItem.id, reviewAction, reviewNote.trim() || undefined);
    if (result.ok) {
      toast.success(reviewAction === 'approved' ? 'Aprovado' : 'Rejeitado');
      setReviewItem(null);
      setReviewNote('');
      fetchData();
    } else {
      toast.error(result.error || 'Erro');
    }
  };

  // ── AI Cascade (tag02 → tag01 → tag0) ──

  const triggerAiCascade = async (justifiedItem: VarianceJustification) => {
    if (!justifiedItem.tag02) return;
    const comp = justifiedItem.comparison_type;

    // 1. Check if ALL tag02 siblings under this tag01 are justified → generate tag01 synthesis
    const tag02Siblings = items.filter(
      i => i.tag0 === justifiedItem.tag0 && i.tag01 === justifiedItem.tag01 &&
           i.tag02 !== null && i.comparison_type === comp
    );
    const allTag02Justified = tag02Siblings.every(
      i => i.status === 'justified' || i.status === 'approved' || i.id === justifiedItem.id
    );

    if (allTag02Justified && tag02Siblings.length > 0) {
      const tag01Item = items.find(
        i => i.tag0 === justifiedItem.tag0 && i.tag01 === justifiedItem.tag01 &&
             i.tag02 === null && i.comparison_type === comp
      );
      if (tag01Item && !tag01Item.ai_summary) {
        await generateSynthesis('tag01', tag01Item, tag02Siblings);
      }
    }
  };

  const generateSynthesis = async (
    level: 'tag01' | 'tag0' | 'ytd',
    targetItem: VarianceJustification,
    childItems: VarianceJustification[]
  ) => {
    const synthKey = `${level}-${targetItem.id}`;
    setSynthesizing(synthKey);
    try {
      const labelFn = (c: VarianceJustification) => {
        if (level === 'tag01') return c.tag02 || '—';
        if (level === 'tag0') return c.tag01 || '—';
        return c.year_month || '—';
      };
      const textFn = (c: VarianceJustification) => {
        if (level === 'tag01') return c.justification || '—';
        return c.ai_summary || '—';
      };

      const summaryItems: VarianceSummaryItem[] = childItems.map(c => ({
        label: labelFn(c),
        real: c.real_value,
        compare: c.compare_value,
        variance_pct: c.variance_pct,
        text: textFn(c),
      }));

      const parentLabel = level === 'tag01'
        ? targetItem.tag01
        : level === 'tag0'
        ? targetItem.tag0
        : targetItem.tag0;

      // Map to the anthropicService level type
      const apiLevel = level === 'tag0' ? 'tag01' : level === 'ytd' ? 'ytd' : level;

      const summary = await generateVarianceSummary(apiLevel as any, summaryItems, {
        parentLabel,
        marca: targetItem.marca,
      });

      await updateVarianceAiSummary(targetItem.id, summary);
      toast.success(`Síntese ${level} gerada`);
      fetchData();

      // Continue cascade upward
      const comp = targetItem.comparison_type;

      if (level === 'tag01') {
        // tag01 done → check if all tag01 siblings under same tag0 have summaries → generate tag0
        const tag01Siblings = items.filter(
          i => i.tag0 === targetItem.tag0 && i.tag01 !== '' &&
               i.tag02 === null && i.tag03 === null && i.comparison_type === comp
        );
        const allTag01HaveSummary = tag01Siblings.every(i => i.ai_summary || i.id === targetItem.id);
        if (allTag01HaveSummary && tag01Siblings.length > 0) {
          const tag0Item = items.find(
            i => i.tag0 === targetItem.tag0 && !i.tag01 &&
                 i.tag02 === null && i.tag03 === null && i.comparison_type === comp
          );
          if (tag0Item && !tag0Item.ai_summary) {
            await generateSynthesis('tag0', tag0Item, tag01Siblings);
          }
        }
      }
    } catch (e) {
      toast.error(`Erro ao gerar síntese ${level}`);
    } finally {
      setSynthesizing(null);
    }
  };

  const handleManualSynthesisForRow = async (row: FlatRow, compType: 'orcado' | 'a1') => {
    const dbItem = compType === 'orcado' ? row.orcDbItem : row.a1DbItem;
    if (!dbItem) return;

    if (row.depth === 0) {
      const tag01Items = items.filter(
        i => i.tag0 === row.tag0 && i.tag01 !== '' &&
             i.tag02 === null && i.comparison_type === compType
      );
      if (tag01Items.length > 0) await generateSynthesis('tag0', dbItem, tag01Items);
    } else if (row.depth === 1) {
      const tag02Items = items.filter(
        i => i.tag0 === row.tag0 && i.tag01 === row.tag01 &&
             i.tag02 !== null && i.comparison_type === compType
      );
      if (tag02Items.length > 0) await generateSynthesis('tag01', dbItem, tag02Items);
    }
  };

  // ── Toggle tree ──

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Column visibility based on filterType ──

  const showOrc = filterType !== 'a1';
  const showA1 = filterType !== 'orcado';

  // ── Render side cells (orc or a1) for a row ──

  const renderSideCells = (
    row: FlatRow,
    compType: 'orcado' | 'a1',
    fontClass: string,
    onDark = false,
  ) => {
    const isOrc = compType === 'orcado';
    const compare = isOrc ? row.orcCompare : row.a1Compare;
    const varPct = isOrc ? row.orcVarPct : row.a1VarPct;
    const status = isOrc ? row.orcStatus : row.a1Status;
    const dbItem = isOrc ? row.orcDbItem : row.a1DbItem;
    const aiSummary = isOrc ? row.orcAiSummary : row.a1AiSummary;
    const borderCls = isOrc ? 'border-l-2 border-emerald-200/60' : 'border-l-2 border-purple-200/60';

    const canJustify = !row.hasChildren && row.depth >= 2 && dbItem &&
      (status === 'pending' || status === 'notified' || status === 'rejected') &&
      (isAdminOrManager || row.ownerEmail === user?.email);
    const canSynthesis = row.depth <= 1 && isAdminOrManager && dbItem;
    const canReview = isAdminOrManager && dbItem && status === 'justified';
    const synthLevel = row.depth === 0 ? 'tag0' : 'tag01';
    const isSynth = dbItem ? synthesizing === `${synthLevel}-${dbItem.id}` : false;
    const hasData = dbItem || compare !== 0;

    return (
      <>
        <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono ${fontClass} tabular-nums ${borderCls}`}>
          {hasData ? fmt(compare) : <span className={onDark ? 'text-white/20' : 'text-gray-300'}>—</span>}
        </td>
        <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono text-[10px] tabular-nums ${hasData ? deltaColor(varPct, onDark) : ''}`}>
          {hasData && varPct !== null ? fmtPct(varPct) : <span className={onDark ? 'text-white/20' : 'text-gray-300'}>—</span>}
        </td>
        <td className="px-1 py-0.5">
          {hasData ? (
            <div className="flex items-center gap-0.5 flex-nowrap">
              {status && (
                <span className={`inline-flex px-1 py-0.5 rounded text-[7px] font-bold leading-none whitespace-nowrap ${STATUS_COLORS[status] || ''}`}>
                  {STATUS_LABELS[status] || ''}
                </span>
              )}
              {canJustify && dbItem && (
                <button
                  onClick={() => {
                    setJustifyItem(dbItem);
                    setJustifyText(dbItem.justification || '');
                    setJustifyPlan(dbItem.action_plan || '');
                  }}
                  className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-purple-100 text-purple-700 hover:bg-purple-200 whitespace-nowrap"
                >
                  Just.
                </button>
              )}
              {canSynthesis && (
                <button
                  onClick={() => handleManualSynthesisForRow(row, compType)}
                  disabled={isSynth}
                  className="px-1 py-0.5 text-[8px] rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-0.5 whitespace-nowrap"
                >
                  {isSynth ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                  IA
                </button>
              )}
              {canReview && dbItem && (
                <>
                  <button
                    onClick={async () => {
                      const result = await reviewJustification(dbItem.id, 'approved');
                      if (result.ok) { toast.success('Aprovado'); fetchData(); }
                    }}
                    className="p-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                    title="Aprovar"
                  >
                    <CheckCircle2 size={10} />
                  </button>
                  <button
                    onClick={() => {
                      setReviewItem(dbItem);
                      setReviewAction('rejected');
                      setReviewNote('');
                    }}
                    className="p-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    title="Rejeitar"
                  >
                    <XCircle size={10} />
                  </button>
                </>
              )}
              {dbItem?.justification && !canJustify && (
                <button
                  onClick={() => {
                    setJustifyItem(dbItem);
                    setJustifyText(dbItem.justification || '');
                    setJustifyPlan(dbItem.action_plan || '');
                  }}
                  className="p-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
                  title="Ver justificativa"
                >
                  <FileText size={9} />
                </button>
              )}
              {aiSummary && <Sparkles size={8} className="text-indigo-300 flex-shrink-0" title="Síntese IA" />}
            </div>
          ) : (
            <span className="text-gray-300 text-[8px]">—</span>
          )}
        </td>
      </>
    );
  };

  // ── Render flat row ──

  const CALC_ROW_TAGS = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);

  const renderFlatRow = (row: FlatRow, idx: number) => {
    const indent = row.depth * 20;
    const isExpanded = expandedNodes.has(row.groupKey);
    const isCalcRow = CALC_ROW_TAGS.has(row.tag0);
    const isEbitdaTotal = row.tag0 === 'EBITDA TOTAL';
    const isDark = row.depth === 0 || isCalcRow;

    const bgClass = isEbitdaTotal
      ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white border-t-2 border-yellow-400 shadow-[0_-2px_6px_rgba(0,0,0,0.3)]'
      : isCalcRow
      ? 'bg-[#F44C00] text-white border-b border-orange-600 shadow-sm'
      : row.depth === 0
      ? 'bg-[#152e55] text-white border-b border-[#1e3d6e]'
      : row.depth === 1
      ? 'bg-blue-50 border-b border-blue-100'
      : row.depth === 2
      ? 'bg-gray-50 border-b border-gray-100'
      : row.depth === 3
      ? 'bg-orange-50/40 border-b border-orange-100/50'
      : 'bg-white border-b border-gray-50';

    const fontClass = isCalcRow
      ? 'font-black text-[12px] uppercase tracking-tight'
      : row.depth === 0
      ? 'font-black text-[11px] uppercase tracking-tight'
      : row.depth === 1 ? 'font-bold text-[11px]'
      : row.depth === 2 ? 'font-semibold text-[11px]'
      : row.depth === 3 ? 'font-medium text-[10px]'
      : 'text-[11px]';

    const hoverClass = isEbitdaTotal ? 'hover:bg-slate-600' : isCalcRow ? 'hover:bg-orange-600' : isDark ? 'hover:bg-[#1e3d6e]' : 'hover:bg-yellow-100';

    return (
      <tr key={`${row.groupKey}-${idx}`} className={`group ${bgClass} ${hoverClass} transition-colors`}>
        {/* Checkbox */}
        <td className={`px-1 py-0.5 text-center w-7 ${isEbitdaTotal ? 'bg-slate-800' : isCalcRow ? 'bg-[#F44C00]' : isDark ? 'bg-[#152e55] group-hover:bg-[#1e3d6e]' : ''}`}>
          {!row.hasChildren && row.depth >= 2 && !isCalcRow && (row.orcDbItem || row.a1DbItem) && (
            <input
              type="checkbox"
              checked={
                (row.orcDbItem ? selectedIds.has(row.orcDbItem.id) : true) &&
                (row.a1DbItem ? selectedIds.has(row.a1DbItem.id) : true)
              }
              onChange={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  const ids = [row.orcDbItem?.id, row.a1DbItem?.id].filter(Boolean) as number[];
                  const allChecked = ids.every(id => prev.has(id));
                  if (allChecked) ids.forEach(id => next.delete(id));
                  else ids.forEach(id => next.add(id));
                  return next;
                });
              }}
              className="rounded border-gray-300 w-3.5 h-3.5"
            />
          )}
        </td>

        {/* Label */}
        <td className={`py-0.5 ${fontClass}`} style={{ paddingLeft: `${isCalcRow ? 8 : indent + 8}px`, paddingRight: 4 }}>
          <div className="flex items-center gap-1">
            {isCalcRow ? (
              <span className="text-white/80 text-[10px] mr-0.5">▶</span>
            ) : row.hasChildren ? (
              <button onClick={() => toggleNode(row.groupKey)} className={`${isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'} flex-shrink-0`}>
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <span className="w-[11px] inline-block flex-shrink-0" />
            )}
            {!isCalcRow && row.depth === 0 && <span className="text-amber-400 text-[9px] mr-0.5">◆</span>}
            {!isCalcRow && row.depth === 1 && <span className="text-blue-400 text-[9px] mr-0.5">◇</span>}
            {!isCalcRow && row.depth === 2 && <span className="text-[9px] text-gray-300 flex-shrink-0">{row.tag0.slice(0, 3)}</span>}
            {!isCalcRow && row.depth === 3 && <Building2 size={9} className="text-orange-400 flex-shrink-0" />}
            <span className="truncate" title={row.label}>{row.label}</span>
          </div>
        </td>

        {/* Real */}
        <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono ${fontClass} tabular-nums`}>{fmt(row.real)}</td>

        {/* vs Orçado columns */}
        {showOrc && renderSideCells(row, 'orcado', fontClass, isDark)}

        {/* vs A-1 columns */}
        {showA1 && renderSideCells(row, 'a1', fontClass, isDark)}

        {/* Owner */}
        <td className={`px-2 py-0.5 text-[10px] whitespace-nowrap truncate max-w-[110px] ${isDark ? 'text-white/60' : 'text-gray-500'}`} title={row.ownerName || row.ownerEmail || ''}>
          {row.ownerName || row.ownerEmail || '—'}
        </td>
      </tr>
    );
  };

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-3 py-2 space-y-2">
        {/* Title + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#1B75BB] to-[#152e55] text-white shadow-sm">
              <ClipboardCheck size={14} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-gray-900 leading-none">
                Justificativas de Desvios
              </h2>
              <span className="text-[9px] text-gray-400 mt-0.5">Cobrança estruturada de desvios DRE</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-black">
            {stats.version > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">v{stats.version}</span>
            )}
            {stats.snapshotAt && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title={`Snapshot: ${stats.snapshotAt}`}>
                Foto {new Date(stats.snapshotAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{stats.pending + stats.notified} pendentes</span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{stats.justified} justificados</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{stats.approved} aprovados</span>
            {stats.rejected > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{stats.rejected} rejeitados</span>
            )}
          </div>
        </div>

        {/* Filters + Actions */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200 shadow-sm overflow-x-auto">
          {/* Month */}
          <div className="flex items-center gap-1 shrink-0">
            <CalendarDays size={12} className="text-purple-500" />
            <select
              value={yearMonth}
              onChange={e => setYearMonth(e.target.value)}
              className="text-[10px] font-bold bg-white border border-gray-200 rounded-lg px-1.5 py-1 cursor-pointer hover:border-purple-300 transition-colors"
            >
              {MONTHS_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-blue-200 shrink-0" />

          {/* Marca */}
          <div className="flex items-center gap-1 shrink-0">
            <Building2 size={12} className="text-orange-500" />
            <select
              value={filterMarca}
              onChange={e => setFilterMarca(e.target.value)}
              className="text-[10px] font-bold bg-white border border-gray-200 rounded-lg px-1.5 py-1 cursor-pointer hover:border-orange-300 transition-colors"
            >
              <option value="">Todas as Marcas</option>
              {availableMarcas.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-blue-200 shrink-0" />

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-[10px] font-bold bg-white border border-gray-200 rounded-lg px-1.5 py-1 cursor-pointer hover:border-blue-300 transition-colors"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-blue-200 shrink-0" />

          {/* Comparison type toggles */}
          <div className="flex gap-0.5 shrink-0">
            {([
              { value: '', label: 'Ambos' },
              { value: 'orcado', label: 'Orçado' },
              { value: 'a1', label: 'A-1' },
            ] as { value: string; label: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded transition-all whitespace-nowrap ${
                  filterType === opt.value
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[8px]" />

          {/* Admin actions */}
          {isAdminOrManager && (
            <>
              <div className="h-5 w-px bg-blue-200 shrink-0" />
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-[#1B75BB] to-[#152e55] text-white transition-all disabled:opacity-50 shadow-sm shrink-0"
              >
                {generating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Gerar
              </button>
              <button
                onClick={handleNotify}
                disabled={notifying}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white transition-all disabled:opacity-50 shadow-sm shrink-0"
              >
                {notifying ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                Cobranças
              </button>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkReview('approved')}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shrink-0"
                  >
                    <CheckCircle2 size={11} />
                    Aprovar ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => handleBulkReview('rejected')}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-sm shrink-0"
                  >
                    <XCircle size={11} />
                    Rejeitar ({selectedIds.size})
                  </button>
                </>
              )}
            </>
          )}

          {/* PPT export */}
          {isAdminOrManager && (
            <button
              onClick={handleExportPpt}
              disabled={exportingPpt || items.length === 0}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-sm disabled:opacity-50 shrink-0"
              title="Exportar apresentação PPTX"
            >
              {exportingPpt ? <Loader2 size={11} className="animate-spin" /> : <Presentation size={11} />}
              PPT
            </button>
          )}

          {/* Settings toggle */}
          {isAdminOrManager && (
            <button
              onClick={() => setShowThresholds(!showThresholds)}
              className={`p-1 rounded-lg transition-all shadow-sm shrink-0 ${
                showThresholds
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-400'
              }`}
              title="Configurar limites"
            >
              <Settings size={12} />
            </button>
          )}
        </div>

        {/* Thresholds config (collapsible) */}
        {showThresholds && isAdminOrManager && (
          <ThresholdsPanel thresholds={thresholds} setThresholds={setThresholds} />
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : flatRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <AlertTriangle size={32} className="mb-2" />
            <p className="text-sm font-semibold">Nenhum desvio encontrado</p>
            <p className="text-xs mt-1">
              {isAdminOrManager
                ? 'Clique em "Gerar Desvios" para criar itens para o mês selecionado'
                : 'Nenhum desvio atribuído a você para este período'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ minWidth: 180 }} />
              <col style={{ width: 90 }} />
              {showOrc && <col style={{ width: 90 }} />}
              {showOrc && <col style={{ width: 60 }} />}
              {showOrc && <col style={{ width: 120 }} />}
              {showA1 && <col style={{ width: 90 }} />}
              {showA1 && <col style={{ width: 60 }} />}
              {showA1 && <col style={{ width: 120 }} />}
              <col style={{ width: 100 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 shadow-lg whitespace-nowrap">
              {/* Group header */}
              <tr className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white h-7">
                <th rowSpan={2} className="px-1 py-1 w-7 bg-slate-800"></th>
                <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-800">Conta / Centro de Custo</th>
                <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-right">Real</th>
                {showOrc && (
                  <th colSpan={3} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-center border-l border-white/20 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-sm">
                    vs Orçado
                  </th>
                )}
                {showA1 && (
                  <th colSpan={3} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-center border-l border-white/20 bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm">
                    vs {a1Year}
                  </th>
                )}
                <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider">Responsável</th>
              </tr>
              {/* Sub-headers */}
              <tr className="text-white h-6">
                {showOrc && (
                  <>
                    <th className="px-2 py-1 text-[8px] font-bold uppercase text-right border-l border-white/10 bg-gradient-to-br from-emerald-500 to-emerald-600">Orçado</th>
                    <th className="px-2 py-1 text-[8px] font-bold uppercase text-right bg-gradient-to-br from-emerald-500 to-emerald-600">Δ %</th>
                    <th className="px-1 py-1 text-[8px] font-bold uppercase text-center bg-gradient-to-br from-emerald-500 to-emerald-600">Status / Ação</th>
                  </>
                )}
                {showA1 && (
                  <>
                    <th className="px-2 py-1 text-[8px] font-bold uppercase text-right border-l border-white/10 bg-gradient-to-br from-purple-500 to-purple-600">{a1Year}</th>
                    <th className="px-2 py-1 text-[8px] font-bold uppercase text-right bg-gradient-to-br from-purple-500 to-purple-600">Δ %</th>
                    <th className="px-1 py-1 text-[8px] font-bold uppercase text-center bg-gradient-to-br from-purple-500 to-purple-600">Status / Ação</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, idx) => renderFlatRow(row, idx))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── YTD Collapsible Panel ── */}
      <div className="flex-shrink-0 border-t border-gray-200">
        {/* Toggle bar */}
        <button
          onClick={() => setShowYtd(!showYtd)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 hover:from-indigo-100 hover:via-blue-100 hover:to-purple-100 transition-all"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-600" />
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
              Consolidado YTD — Jan a {yearMonth ? new Date(yearMonth + '-01').toLocaleString('pt-BR', { month: 'short', year: 'numeric' }) : '...'}
            </span>
            {showYtd && ytdStats.months.length > 0 && (
              <span className="text-[9px] text-indigo-500 font-bold">
                {ytdStats.months.length} {ytdStats.months.length === 1 ? 'mês' : 'meses'}
                {ytdStats.totalLeaves > 0 && ` · ${ytdStats.totalJustified}/${ytdStats.totalLeaves} justificados`}
              </span>
            )}
          </div>
          {showYtd ? <ChevronDown size={14} className="text-indigo-500" /> : <ChevronUp size={14} className="text-indigo-500" />}
        </button>

        {/* YTD Content */}
        {showYtd && (
          <div className="bg-gradient-to-b from-indigo-50/50 to-white max-h-[50vh] overflow-auto">
            {ytdLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-indigo-400" size={24} />
                <span className="ml-2 text-xs text-indigo-500">Carregando dados YTD...</span>
              </div>
            ) : ytdFlatRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <AlertTriangle size={24} className="mb-2" />
                <p className="text-xs font-semibold">Nenhum dado YTD encontrado</p>
                <p className="text-[10px] mt-1">Gere desvios para 2+ meses do mesmo ano</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <colgroup>
                  <col style={{ minWidth: 180 }} />
                  <col style={{ width: 90 }} />
                  {showOrc && <col style={{ width: 90 }} />}
                  {showOrc && <col style={{ width: 60 }} />}
                  {showA1 && <col style={{ width: 90 }} />}
                  {showA1 && <col style={{ width: 60 }} />}
                  <col style={{ width: 70 }} />
                </colgroup>
                <thead className="sticky top-0 z-10 shadow-lg whitespace-nowrap">
                  <tr className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-purple-800 text-white h-7">
                    <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider">Conta / Centro de Custo</th>
                    <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-right">Real YTD</th>
                    {showOrc && (
                      <th colSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-center border-l border-white/20 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-sm">
                        vs Orçado
                      </th>
                    )}
                    {showA1 && (
                      <th colSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-center border-l border-white/20 bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm">
                        vs {a1Year}
                      </th>
                    )}
                    <th rowSpan={2} className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-center">Meses</th>
                  </tr>
                  <tr className="text-white h-6">
                    {showOrc && (
                      <>
                        <th className="px-2 py-1 text-[8px] font-bold uppercase text-right border-l border-white/10 bg-gradient-to-br from-emerald-500 to-emerald-600">Orçado</th>
                        <th className="px-2 py-1 text-[8px] font-bold uppercase text-right bg-gradient-to-br from-emerald-500 to-emerald-600">Δ %</th>
                      </>
                    )}
                    {showA1 && (
                      <>
                        <th className="px-2 py-1 text-[8px] font-bold uppercase text-right border-l border-white/10 bg-gradient-to-br from-purple-500 to-purple-600">{a1Year}</th>
                        <th className="px-2 py-1 text-[8px] font-bold uppercase text-right bg-gradient-to-br from-purple-500 to-purple-600">Δ %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ytdFlatRows.map((row, idx) => {
                    const indent = row.depth * 20;
                    const isExpanded = ytdExpandedNodes.has(row.groupKey);
                    const CALC_TAGS = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
                    const isCalcRow = CALC_TAGS.has(row.tag0);
                    const isEbitdaTotal = row.tag0 === 'EBITDA TOTAL';
                    const isDark = row.depth === 0 || isCalcRow;

                    const bgClass = isEbitdaTotal
                      ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white border-t-2 border-yellow-400'
                      : isCalcRow
                      ? 'bg-[#F44C00] text-white border-b border-orange-600'
                      : row.depth === 0
                      ? 'bg-[#152e55] text-white border-b border-[#1e3d6e]'
                      : row.depth === 1
                      ? 'bg-blue-50 border-b border-blue-100'
                      : row.depth === 2
                      ? 'bg-gray-50 border-b border-gray-100'
                      : row.depth === 3
                      ? 'bg-orange-50/40 border-b border-orange-100/50'
                      : 'bg-white border-b border-gray-50';

                    const fontClass = isCalcRow
                      ? 'font-black text-[12px] uppercase tracking-tight'
                      : row.depth === 0
                      ? 'font-black text-[11px] uppercase tracking-tight'
                      : row.depth === 1 ? 'font-bold text-[11px]'
                      : row.depth === 2 ? 'font-semibold text-[11px]'
                      : row.depth === 3 ? 'font-medium text-[10px]'
                      : 'text-[11px]';

                    const hoverClass = isEbitdaTotal ? 'hover:bg-slate-600' : isCalcRow ? 'hover:bg-orange-600' : isDark ? 'hover:bg-[#1e3d6e]' : 'hover:bg-yellow-100';

                    const colCount = 2 + (showOrc ? 2 : 0) + (showA1 ? 2 : 0) + 1;

                    return (
                      <React.Fragment key={`ytd-${row.groupKey}-${idx}`}>
                        <tr className={`group ${bgClass} ${hoverClass} transition-colors`}>
                          {/* Label */}
                          <td className={`py-0.5 ${fontClass}`} style={{ paddingLeft: `${isCalcRow ? 8 : indent + 8}px`, paddingRight: 4 }}>
                            <div className="flex items-center gap-1">
                              {isCalcRow ? (
                                <span className="text-white/80 text-[10px] mr-0.5">▶</span>
                              ) : row.hasChildren ? (
                                <button onClick={() => toggleYtdNode(row.groupKey)} className={`${isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'} flex-shrink-0`}>
                                  {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                </button>
                              ) : (
                                <span className="w-[11px] inline-block flex-shrink-0" />
                              )}
                              {!isCalcRow && row.depth === 0 && <span className="text-amber-400 text-[9px] mr-0.5">◆</span>}
                              {!isCalcRow && row.depth === 1 && <span className="text-blue-400 text-[9px] mr-0.5">◇</span>}
                              {!isCalcRow && row.depth === 2 && <span className="text-[9px] text-gray-300 flex-shrink-0">{row.tag0.slice(0, 3)}</span>}
                              {!isCalcRow && row.depth === 3 && <Building2 size={9} className="text-orange-400 flex-shrink-0" />}
                              <span className="truncate" title={row.label}>{row.label}</span>
                            </div>
                          </td>

                          {/* Real YTD */}
                          <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono ${fontClass} tabular-nums`}>{fmt(row.ytdReal)}</td>

                          {/* vs Orçado */}
                          {showOrc && (
                            <>
                              <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono ${fontClass} tabular-nums border-l-2 ${isDark ? 'border-white/10' : 'border-emerald-200/60'}`}>
                                {row.orcCompare !== 0 ? fmt(row.orcCompare) : <span className={isDark ? 'text-white/30' : 'text-gray-300'}>—</span>}
                              </td>
                              <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono text-[10px] font-bold tabular-nums ${isDark ? (row.orcVarPct === null || row.orcVarPct === 0 ? 'text-white/40' : row.orcVarPct > 0 ? 'text-lime-300' : 'text-red-200') : deltaColor(row.orcVarPct)}`}>
                                {row.orcVarPct !== null ? fmtPct(row.orcVarPct) : <span className={isDark ? 'text-white/30' : 'text-gray-300'}>—</span>}
                              </td>
                            </>
                          )}

                          {/* vs A-1 */}
                          {showA1 && (
                            <>
                              <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono ${fontClass} tabular-nums border-l-2 ${isDark ? 'border-white/10' : 'border-purple-200/60'}`}>
                                {row.a1Compare !== 0 ? fmt(row.a1Compare) : <span className={isDark ? 'text-white/30' : 'text-gray-300'}>—</span>}
                              </td>
                              <td className={`px-2 py-0.5 text-right whitespace-nowrap font-mono text-[10px] font-bold tabular-nums ${isDark ? (row.a1VarPct === null || row.a1VarPct === 0 ? 'text-white/40' : row.a1VarPct > 0 ? 'text-lime-300' : 'text-red-200') : deltaColor(row.a1VarPct)}`}>
                                {row.a1VarPct !== null ? fmtPct(row.a1VarPct) : <span className={isDark ? 'text-white/30' : 'text-gray-300'}>—</span>}
                              </td>
                            </>
                          )}

                          {/* Meses */}
                          <td className="px-2 py-0.5 text-center">
                            <div className="flex justify-center gap-0.5">
                              {row.months.map(m => (
                                <span key={m} className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/40' : 'bg-indigo-300'}`} title={m} />
                              ))}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Justification Modal ── */}
      {justifyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-3" style={{ color: 'var(--color-primary-500)' }}>
                {justifyItem.status === 'justified' || justifyItem.status === 'approved' ? 'Justificativa' : 'Justificar Desvio'}
              </h3>

              {/* Context */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
                <div className="flex gap-2">
                  <span className="text-gray-400">Tag0:</span>
                  <span className="font-semibold">{justifyItem.tag0}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400">Tag01:</span>
                  <span className="font-semibold">{justifyItem.tag01}</span>
                </div>
                {justifyItem.tag02 && (
                  <div className="flex gap-2">
                    <span className="text-gray-400">Tag02:</span>
                    <span className="font-semibold">{justifyItem.tag02}</span>
                  </div>
                )}
                <div className="flex gap-4 mt-2 pt-2 border-t border-gray-200">
                  <div>
                    <span className="text-gray-400">Real:</span>{' '}
                    <span className="font-bold font-mono">{fmt(justifyItem.real_value)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{justifyItem.comparison_type === 'orcado' ? 'Orçado' : String(a1Year)}:</span>{' '}
                    <span className="font-bold font-mono">{fmt(justifyItem.compare_value)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Δ:</span>{' '}
                    <span className={`font-bold font-mono ${(justifyItem.variance_pct ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {fmt(justifyItem.variance_abs)} ({fmtPct(justifyItem.variance_pct)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Review note if rejected */}
              {justifyItem.status === 'rejected' && justifyItem.review_note && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-700">
                  <span className="font-bold">Motivo da rejeição:</span> {justifyItem.review_note}
                </div>
              )}

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Justificativa *
                  </label>
                  <textarea
                    value={justifyText}
                    onChange={e => setJustifyText(e.target.value)}
                    rows={4}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-colors"
                    placeholder="Explique o motivo do desvio (mínimo 20 caracteres)..."
                    disabled={justifyItem.status === 'approved'}
                  />
                  <span className="text-[9px] text-gray-400">{justifyText.length} caracteres (mín. 20)</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    Plano de Ação (opcional)
                  </label>
                  <textarea
                    value={justifyPlan}
                    onChange={e => setJustifyPlan(e.target.value)}
                    rows={2}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-colors"
                    placeholder="Ações planejadas para corrigir o desvio..."
                    disabled={justifyItem.status === 'approved'}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => { setJustifyItem(null); setJustifyText(''); setJustifyPlan(''); }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {justifyItem.status === 'approved' ? 'Fechar' : 'Cancelar'}
                </button>
                {justifyItem.status !== 'approved' && (
                  <button
                    onClick={handleJustifySubmit}
                    disabled={submitting || justifyText.trim().length < 20}
                    className="px-4 py-2 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--color-primary-500)' }}
                  >
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Enviar Justificativa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal (rejection) ── */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-3 text-red-600">
                Rejeitar Justificativa
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                {reviewItem.tag01} › {reviewItem.tag02}
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs">
                <span className="font-bold">Justificativa do pacoteiro:</span>
                <p className="mt-1">{reviewItem.justification}</p>
              </div>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 mb-3"
                placeholder="Motivo da rejeição..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setReviewItem(null)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReviewSubmit}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Thresholds Panel (small admin config) ──

const ThresholdsPanel: React.FC<{
  thresholds: VarianceThreshold[];
  setThresholds: React.Dispatch<React.SetStateAction<VarianceThreshold[]>>;
}> = ({ thresholds, setThresholds }) => {
  const [loading, setLoading] = useState(false);
  const [newMarca, setNewMarca] = useState('');
  const [newTag0, setNewTag0] = useState('');
  const [newAbs, setNewAbs] = useState('0');
  const [newPct, setNewPct] = useState('0');

  useEffect(() => {
    setLoading(true);
    getVarianceThresholds().then(data => {
      setThresholds(data);
      setLoading(false);
    });
  }, [setThresholds]);

  const handleAdd = async () => {
    const result = await upsertVarianceThreshold({
      marca: newMarca || null,
      tag0: newTag0 || null,
      min_abs_value: Number(newAbs) || 0,
      min_pct_value: Number(newPct) || 0,
      active: true,
    });
    if (result.ok) {
      toast.success('Limite salvo');
      const data = await getVarianceThresholds();
      setThresholds(data);
      setNewMarca('');
      setNewTag0('');
      setNewAbs('0');
      setNewPct('0');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este limite?')) return;
    await deleteVarianceThreshold(id);
    const data = await getVarianceThresholds();
    setThresholds(data);
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 flex items-center gap-1">
        <Settings size={12} />
        Configuração de Limites (Thresholds)
      </h4>
      <p className="text-[10px] text-gray-400 mb-2">
        Defina valores mínimos para gerar cobranças. Se 0, todos os desvios são incluídos.
      </p>

      {loading ? (
        <Loader2 size={14} className="animate-spin text-gray-400" />
      ) : (
        <>
          <div className="flex gap-2 items-end mb-2">
            <div>
              <label className="text-[9px] text-gray-400 block">Marca</label>
              <input value={newMarca} onChange={e => setNewMarca(e.target.value)} placeholder="(todas)" className="text-xs border rounded px-2 py-1 w-24" />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block">Tag0</label>
              <input value={newTag0} onChange={e => setNewTag0(e.target.value)} placeholder="(todos)" className="text-xs border rounded px-2 py-1 w-32" />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block">Δ R$ mín</label>
              <input value={newAbs} onChange={e => setNewAbs(e.target.value)} type="number" className="text-xs border rounded px-2 py-1 w-20" />
            </div>
            <div>
              <label className="text-[9px] text-gray-400 block">Δ % mín</label>
              <input value={newPct} onChange={e => setNewPct(e.target.value)} type="number" className="text-xs border rounded px-2 py-1 w-16" />
            </div>
            <button onClick={handleAdd} className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Salvar
            </button>
          </div>

          {thresholds.length > 0 && (
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-[9px] text-gray-400 uppercase">
                  <th className="text-left py-1">Marca</th>
                  <th className="text-left py-1">Tag0</th>
                  <th className="text-right py-1">Δ R$ mín</th>
                  <th className="text-right py-1">Δ % mín</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map(t => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="py-1">{t.marca || '(todas)'}</td>
                    <td className="py-1">{t.tag0 || '(todos)'}</td>
                    <td className="py-1 text-right">{fmt(t.min_abs_value)}</td>
                    <td className="py-1 text-right">{t.min_pct_value}%</td>
                    <td className="py-1 text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 text-[9px]">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default VarianceJustificationsView;
