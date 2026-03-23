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
  AlertTriangle,
  FileText,
  Settings,
  Mail,
  CalendarDays,
  Building2,
  TrendingUp,
  Filter,
  ChevronsDown,
  ChevronsUp,
  Wand2,
  BrainCircuit,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getVarianceJustifications,
  getVarianceYtdItems,
  getVarianceAvailableMonths,
  submitJustification,
  reviewJustification,
  bulkReviewJustifications,
  updateVarianceAiSummary,
  subscribeVarianceJustifications,
  getVarianceThresholds,
  upsertVarianceThreshold,
  deleteVarianceThreshold,
  createActionPlan,
  VarianceJustification,
  VarianceThreshold,
} from '../services/supabaseService';
import ActionPlanForm from './ActionPlanForm';
import { generateVarianceSummary, VarianceSummaryItem, aiAnalyzeVariance, aiImproveText, aiGenerateActionPlan, aiImproveActionPlan } from '../services/anthropicService';
import { toast } from 'sonner';
import MultiSelectFilter from './MultiSelectFilter';
import { usePermissions } from '../hooks/usePermissions';

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
  const { allowedMarcas, allowedTag01, hasPermissions } = usePermissions();

  // Meses disponíveis (da tabela variance_justifications)
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Filters
  const [yearMonth, setYearMonth] = useState('');
  const [filterMarcas, setFilterMarcas] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');

  // Year labels
  const currentYear = yearMonth ? Number(yearMonth.slice(0, 4)) : new Date().getFullYear();
  const a1Year = currentYear - 1;

  // Data
  const [items, setItems] = useState<VarianceJustification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);


  // Tree state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Justification modal
  const [justifyItem, setJustifyItem] = useState<VarianceJustification | null>(null);
  const [justifyText, setJustifyText] = useState('');
  const [justifyPlan, setJustifyPlan] = useState('');
  const [justifyReadOnly, setJustifyReadOnly] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState<'analyze' | 'improve' | 'plan-generate' | 'plan-improve' | null>(null);

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

  // ── Carregar meses disponíveis ──
  useEffect(() => {
    getVarianceAvailableMonths().then(months => {
      setAvailableMonths(months);
      if (months.length > 0 && !yearMonth) {
        setYearMonth(months[0]); // mais recente
      }
    }).catch(err => console.error('Erro ao carregar meses:', err));
  }, []);

  // ── Fetch data ──

  // Marcas efetivas: seleção do usuário intersectada com permissões
  const effectiveMarcas = useMemo(() => {
    if (filterMarcas.length > 0) return filterMarcas;
    if (hasPermissions && allowedMarcas.length > 0) return allowedMarcas;
    return [];
  }, [filterMarcas, allowedMarcas, hasPermissions]);

  // Tag01 efetivas (permissões)
  const effectiveTag01 = useMemo(() => {
    if (hasPermissions && allowedTag01.length > 0) return allowedTag01;
    return [];
  }, [allowedTag01, hasPermissions]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        year_month: yearMonth || undefined,
        marcas: effectiveMarcas.length > 0 ? effectiveMarcas : undefined,
        status: filterStatuses.length === 1 ? filterStatuses[0] : undefined,
        comparison_type: filterType || undefined,
        // Não filtrar por owner_email — usuários com permissão na tag01 veem todas as justificativas
      };
      console.log('📋 Justificativas — fetchData com filtros:', filters);
      const data = await getVarianceJustifications(filters);
      console.log('📋 Justificativas — retornou', data.length, 'items. Primeiro:', data[0]);
      // Client-side filter for tag01 permissions (keep tag0-level rows for reaggregation)
      const tag01Filtered = effectiveTag01.length > 0
        ? data.filter(d => !d.tag01 || effectiveTag01.includes(d.tag01))
        : data;
      // Client-side filter for multi-status
      const filtered = filterStatuses.length > 1
        ? tag01Filtered.filter(d => filterStatuses.includes(d.status))
        : tag01Filtered;
      setItems(filtered);

      // Extract unique marcas (always from unfiltered data for dropdown options)
      const marcas = [...new Set(data.map(d => d.marca).filter(Boolean))].sort();
      // Filtrar por permissões do usuário
      const permittedMarcas = (hasPermissions && allowedMarcas.length > 0)
        ? marcas.filter(m => allowedMarcas.includes(m))
        : marcas;
      setAvailableMarcas(prev => {
        if (prev.length === 0 && permittedMarcas.length > 0) return permittedMarcas;
        return prev.length >= permittedMarcas.length ? prev : permittedMarcas;
      });
    } catch (e) {
      console.error('Erro ao buscar justificativas:', e);
    } finally {
      setLoading(false);
    }
  }, [yearMonth, effectiveMarcas, effectiveTag01, filterStatuses, filterType, hasPermissions, allowedMarcas]);

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
      const data = await getVarianceYtdItems(
        `${year}-01`,
        yearMonth,
        undefined,
        effectiveMarcas.length > 0 ? effectiveMarcas : undefined
      );
      setYtdItems(data);
    } catch (e) {
      console.error('Erro ao buscar YTD:', e);
    } finally {
      setYtdLoading(false);
    }
  }, [yearMonth, effectiveMarcas]);

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

    const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.', '06.']);
    const CALC_LABELS_YTD = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
    const isDrePrefix = (t: string) => DRE_PREFIXES.has((t || '').slice(0, 3));

    // 1. Aggregate ytdItems across months per (tag0, tag01, tag02, marca) — only DRE prefixes
    type PathAgg = { realByMonth: Map<string, number>; orcCompare: number; a1Compare: number; months: Set<string> };
    const pathMap = new Map<string, PathAgg>();

    for (const item of ytdItems) {
      if (!isDrePrefix(item.tag0)) continue; // only 01.–05., CalcRows are computed
      const path = `${item.tag0}|${item.tag01 || ''}|${item.tag02 || ''}|${item.marca || ''}`;
      if (!pathMap.has(path)) pathMap.set(path, { realByMonth: new Map(), orcCompare: 0, a1Compare: 0, months: new Set() });
      const p = pathMap.get(path)!;
      p.months.add(item.year_month);
      if (!p.realByMonth.has(item.year_month)) p.realByMonth.set(item.year_month, Number(item.real_value));
      if (item.comparison_type === 'orcado') p.orcCompare += Number(item.compare_value);
      else p.a1Compare += Number(item.compare_value);
    }

    const sumReal = (p: PathAgg) => [...p.realByMonth.values()].reduce((s, v) => s + v, 0);

    const aggPaths = (paths: PathAgg[]) => {
      let real = 0, orc = 0, a1 = 0;
      const months = new Set<string>();
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

    // 2. Build tree — only regular DRE tag0s (sorted by numeric prefix)
    const tag0Set = new Set<string>();
    for (const [key] of pathMap) {
      tag0Set.add(key.split('|')[0]);
    }
    const tag0Sorted = [...tag0Set].sort((a, b) => (parseFloat(a) || 999) - (parseFloat(b) || 999));

    const rows: YtdFlatRow[] = [];

    for (const tag0 of tag0Sorted) {
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

    // ── Recalcular tag0 quando filtro de tag01 ativo (YTD — permissões) ──
    if (effectiveTag01.length > 0) {
      const ytdTag0Agg = new Map<string, { real: number; orc: number; a1: number }>();
      for (const row of rows) {
        if (row.depth !== 1) continue;
        const cur = ytdTag0Agg.get(row.tag0) || { real: 0, orc: 0, a1: 0 };
        cur.real += row.ytdReal; cur.orc += row.orcCompare; cur.a1 += row.a1Compare;
        ytdTag0Agg.set(row.tag0, cur);
      }
      for (const row of rows) {
        if (row.depth !== 0) continue;
        const agg = ytdTag0Agg.get(row.tag0);
        if (!agg) continue;
        row.ytdReal = agg.real;
        row.orcCompare = agg.orc;
        row.orcVarPct = row.orcCompare !== 0 ? Math.round(((row.ytdReal - row.orcCompare) / Math.abs(row.orcCompare)) * 1000) / 10 : null;
        row.a1Compare = agg.a1;
        row.a1VarPct = row.a1Compare !== 0 ? Math.round(((row.ytdReal - row.a1Compare) / Math.abs(row.a1Compare)) * 1000) / 10 : null;
      }
    }

    // ── Recalcular pais quando filtro de marca ativo (YTD — seleção ou permissão) ──
    // Agrega diretamente dos ytdItems fonte (marca=effectiveMarcas) — independe de drill-down
    if (effectiveMarcas.length > 0) {
      const marcaYtd = ytdItems.filter(i => effectiveMarcas.includes(i.marca || '') && isDrePrefix(i.tag0));

      // Indexar por (tag0, tag01, tag02) — somar real por mês (dedup) e compares
      type YtdMarcaAgg = { realByMonth: Map<string, number>; orc: number; a1: number };
      const ytdByTag02 = new Map<string, YtdMarcaAgg>();

      for (const item of marcaYtd) {
        if (!item.tag02) continue;
        const k2 = `${item.tag0}|${item.tag01}|${item.tag02}`;
        if (!ytdByTag02.has(k2)) ytdByTag02.set(k2, { realByMonth: new Map(), orc: 0, a1: 0 });
        const a = ytdByTag02.get(k2)!;
        if (!a.realByMonth.has(item.year_month)) a.realByMonth.set(item.year_month, Number(item.real_value));
        if (item.comparison_type === 'orcado') a.orc += Number(item.compare_value);
        else a.a1 += Number(item.compare_value);
      }

      const sumMonths = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

      // Agregar tag01 a partir dos tag02
      const ytdByTag01 = new Map<string, { real: number; orc: number; a1: number }>();
      for (const [k2, v] of ytdByTag02) {
        const [t0, t1] = k2.split('|');
        const k1 = `${t0}|${t1}`;
        const cur = ytdByTag01.get(k1) || { real: 0, orc: 0, a1: 0 };
        cur.real += sumMonths(v.realByMonth); cur.orc += v.orc; cur.a1 += v.a1;
        ytdByTag01.set(k1, cur);
      }

      // Agregar tag0 a partir dos tag01
      const ytdByTag0 = new Map<string, { real: number; orc: number; a1: number }>();
      for (const [k1, v] of ytdByTag01) {
        const t0 = k1.split('|')[0];
        const cur = ytdByTag0.get(t0) || { real: 0, orc: 0, a1: 0 };
        cur.real += v.real; cur.orc += v.orc; cur.a1 += v.a1;
        ytdByTag0.set(t0, cur);
      }

      // Aplicar aos rows (zerar se marca não tem dados naquele nível)
      for (const row of rows) {
        if (row.depth === 3) continue; // marcas já têm valores corretos
        let agg: { real: number; orc: number; a1: number } | undefined;
        if (row.depth === 0) agg = ytdByTag0.get(row.tag0);
        else if (row.depth === 1) agg = ytdByTag01.get(`${row.tag0}|${row.tag01}`);
        else if (row.depth === 2) {
          const v = ytdByTag02.get(`${row.tag0}|${row.tag01}|${row.tag02}`);
          if (v) agg = { real: sumMonths(v.realByMonth), orc: v.orc, a1: v.a1 };
        }
        const val = agg || { real: 0, orc: 0, a1: 0 };

        row.ytdReal = val.real;
        row.orcCompare = val.orc;
        row.orcVarPct = row.orcCompare !== 0 ? Math.round(((row.ytdReal - row.orcCompare) / Math.abs(row.orcCompare)) * 1000) / 10 : null;
        row.a1Compare = val.a1;
        row.a1VarPct = row.a1Compare !== 0 ? Math.round(((row.ytdReal - row.a1Compare) / Math.abs(row.a1Compare)) * 1000) / 10 : null;
      }
    }

    // ── Inject CalcRows (computed from depth-0 values) ──
    const d0ytd = new Map<string, { real: number; orc: number; a1: number; months: string[] }>();
    for (const row of rows) {
      if (row.depth === 0) d0ytd.set(row.tag0.slice(0, 3), { real: row.ytdReal, orc: row.orcCompare, a1: row.a1Compare, months: row.months });
    }
    const gpy = (p: string) => d0ytd.get(p) || { real: 0, orc: 0, a1: 0, months: [] as string[] };
    const allYtdMonths = [...new Set(rows.filter(r => r.depth === 0).flatMap(r => r.months))].sort();

    const mRy = gpy('01.').real + gpy('02.').real + gpy('03.').real;
    const mOy = gpy('01.').orc + gpy('02.').orc + gpy('03.').orc;
    const mAy = gpy('01.').a1 + gpy('02.').a1 + gpy('03.').a1;
    const eRy = mRy + gpy('04.').real, eOy = mOy + gpy('04.').orc, eAy = mAy + gpy('04.').a1;
    const etRy = eRy + gpy('05.').real + gpy('06.').real, etOy = eOy + gpy('05.').orc + gpy('06.').orc, etAy = eAy + gpy('05.').a1 + gpy('06.').a1;

    const makeYtdCalc = (label: string, r: number, o: number, a: number): YtdFlatRow => ({
      depth: 0, groupKey: `ytd-${label}`, label, tag0: label, tag01: '', tag02: null, marca: null,
      hasChildren: false,
      ytdReal: r, orcCompare: o, orcVarPct: varPct(r, o),
      a1Compare: a, a1VarPct: varPct(r, a), months: allYtdMonths,
    });

    const insertAfterYtd = (prefix: string, calcRow: YtdFlatRow) => {
      let idx = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].tag0.startsWith(prefix)) idx = i;
      }
      if (idx >= 0) rows.splice(idx + 1, 0, calcRow);
      else rows.push(calcRow);
    };
    insertAfterYtd('06.', makeYtdCalc('EBITDA TOTAL', etRy, etOy, etAy));
    insertAfterYtd('04.', makeYtdCalc('EBITDA (S/ RATEIO RAIZ CSC)', eRy, eOy, eAy));
    insertAfterYtd('03.', makeYtdCalc('MARGEM DE CONTRIBUIÇÃO', mRy, mOy, mAy));

    return rows;
  }, [ytdItems, ytdExpandedNodes, filterMarcas, effectiveMarcas, effectiveTag01]);

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
        marca: effectiveMarcas.length > 0 ? effectiveMarcas[0] : undefined,
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
    // Obrigatoriedade (threshold)
    orcMandatory: boolean;
    a1Mandatory: boolean;
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

    const CALC_LABELS_SET = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);

    // Filter out DB CalcRows — they'll be computed client-side
    const dreItems = items.filter(i => !CALC_LABELS_SET.has(i.tag0));

    // Debug: contagem de itens por nível
    const withTag02 = dreItems.filter(i => i.tag02);
    const withMarca = dreItems.filter(i => i.marca && i.marca !== '');
    console.log(`📊 flatRows: ${dreItems.length} dreItems, ${withTag02.length} com tag02, ${withMarca.length} com marca`);

    // Index items by tag path + comparison type
    const pathKey = (i: VarianceJustification) =>
      `${i.tag0}|${i.tag01 || ''}|${i.tag02 || ''}|${i.tag03 || ''}`;
    const orcMap = new Map<string, VarianceJustification>();
    const a1Map = new Map<string, VarianceJustification>();
    for (const item of dreItems) {
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

    const varPctCalc = (r: number, c: number) => c !== 0 ? Math.round(((r - c) / Math.abs(c)) * 1000) / 10 : null;

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
        orcMandatory: orcDirect?.mandatory ?? false,
        a1Mandatory: a1Direct?.mandatory ?? false,
      };
    };

    // Sort only by numeric prefix (CalcRows are computed after)
    const tag0Set = new Set(dreItems.map(i => i.tag0));
    const rows: FlatRow[] = [];
    const tag0Sorted = [...tag0Set].sort((a, b) => (parseFloat(a) || 999) - (parseFloat(b) || 999));

    for (const tag0 of tag0Sorted) {
      const tag0All = dreItems.filter(i => i.tag0 === tag0);
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

        // Marcas diretamente sob tag01 (quando depth=1, tag02 é null mas marca existe)
        const directMarcaSet = new Set(tag01All.filter(i => !i.tag02 && i.marca).map(i => i.marca!));
        const hasAnyChildren = tag02Set.size > 0 || directMarcaSet.size > 0;

        rows.push(buildRow(1, tag01Key, tag01, tag0, tag01, null, null, hasAnyChildren, tag01Level, tag01Orc, tag01A1));

        if (!expandedNodes.has(tag01Key) || !hasAnyChildren) continue;

        // Marcas diretas sob tag01 (depth=1: sem tag02)
        if (directMarcaSet.size > 0 && tag02Set.size === 0) {
          for (const marcaName of [...directMarcaSet].sort()) {
            const marcaItems = tag01All.filter(i => !i.tag02 && i.marca === marcaName);
            const marcaOrc = marcaItems.find(i => i.comparison_type === 'orcado') || null;
            const marcaA1 = marcaItems.find(i => i.comparison_type === 'a1') || null;

            rows.push(buildRow(2, `marca-${tag0}|${tag01}|${marcaName}`, marcaName, tag0, tag01, null, null, false, marcaItems, marcaOrc, marcaA1, marcaName));
          }
          continue;
        }

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

    // ── Recalcular tag0 quando filtro de tag01 ativo (permissões) ──
    if (effectiveTag01.length > 0) {
      // Agregar tag0 a partir das rows de depth=1 (tag01) que passaram o filtro
      const tag0Agg = new Map<string, { real: number; orc: number; a1: number }>();
      for (const row of rows) {
        if (row.depth !== 1) continue;
        const cur = tag0Agg.get(row.tag0) || { real: 0, orc: 0, a1: 0 };
        cur.real += row.real; cur.orc += row.orcCompare; cur.a1 += row.a1Compare;
        tag0Agg.set(row.tag0, cur);
      }
      for (const row of rows) {
        if (row.depth !== 0) continue;
        const agg = tag0Agg.get(row.tag0);
        if (!agg) continue;
        row.real = agg.real;
        row.orcCompare = agg.orc;
        row.orcVarAbs = row.real - row.orcCompare;
        row.orcVarPct = row.orcCompare !== 0 ? Math.round(((row.real - row.orcCompare) / Math.abs(row.orcCompare)) * 1000) / 10 : null;
        row.a1Compare = agg.a1;
        row.a1VarAbs = row.real - row.a1Compare;
        row.a1VarPct = row.a1Compare !== 0 ? Math.round(((row.real - row.a1Compare) / Math.abs(row.a1Compare)) * 1000) / 10 : null;
      }
    }

    // ── Recalcular pais quando filtro de marca ativo (seleção ou permissão) ──
    // Agrega diretamente dos items fonte (marca=effectiveMarcas) — independe de drill-down aberto
    if (effectiveMarcas.length > 0) {
      const marcaItems = dreItems.filter(i => effectiveMarcas.includes(i.marca || ''));

      // Indexar marcaItems por (tag0, tag01, tag02, compType)
      type MarcaAgg = { real: number; orc: number; a1: number };
      const marcaByTag02 = new Map<string, MarcaAgg>();
      const marcaByTag01 = new Map<string, MarcaAgg>();
      const marcaByTag0 = new Map<string, MarcaAgg>();

      // Agrupar por (tag0|tag01|tag02|marca) para evitar double-counting do real
      const realAdded = new Set<string>();
      for (const item of marcaItems) {
        const val = Number(item.real_value);
        const cmp = Number(item.compare_value);
        const isOrc = item.comparison_type === 'orcado';

        // tag02 level
        if (item.tag02) {
          const k2 = `${item.tag0}|${item.tag01}|${item.tag02}`;
          const cur2 = marcaByTag02.get(k2) || { real: 0, orc: 0, a1: 0 };
          // Acumular real apenas 1x por (tag0|tag01|tag02|marca) para não duplicar
          const realKey = `${k2}|${item.marca}`;
          if (!realAdded.has(realKey)) {
            cur2.real += val;
            realAdded.add(realKey);
          }
          if (isOrc) { cur2.orc += cmp; }
          else { cur2.a1 += cmp; }
          marcaByTag02.set(k2, cur2);
        }
      }

      // Agregar tag01 a partir dos tag02
      for (const [k2, v] of marcaByTag02) {
        const [t0, t1] = k2.split('|');
        const k1 = `${t0}|${t1}`;
        const cur1 = marcaByTag01.get(k1) || { real: 0, orc: 0, a1: 0 };
        cur1.real += v.real; cur1.orc += v.orc; cur1.a1 += v.a1;
        marcaByTag01.set(k1, cur1);
      }

      // Agregar tag0 a partir dos tag01
      for (const [k1, v] of marcaByTag01) {
        const t0 = k1.split('|')[0];
        const cur0 = marcaByTag0.get(t0) || { real: 0, orc: 0, a1: 0 };
        cur0.real += v.real; cur0.orc += v.orc; cur0.a1 += v.a1;
        marcaByTag0.set(t0, cur0);
      }

      // Aplicar aos rows (zerar se marca não tem dados naquele nível)
      for (const row of rows) {
        if (row.depth === 3 || (row.depth === 2 && row.marca)) continue; // marcas já têm valores corretos
        let agg: MarcaAgg | undefined;
        if (row.depth === 0) agg = marcaByTag0.get(row.tag0);
        else if (row.depth === 1) agg = marcaByTag01.get(`${row.tag0}|${row.tag01}`);
        else if (row.depth === 2) agg = marcaByTag02.get(`${row.tag0}|${row.tag01}|${row.tag02}`);
        const v = agg || { real: 0, orc: 0, a1: 0 };

        row.real = v.real;
        row.orcCompare = v.orc;
        row.orcVarAbs = row.real - row.orcCompare;
        row.orcVarPct = row.orcCompare !== 0 ? Math.round(((row.real - row.orcCompare) / Math.abs(row.orcCompare)) * 1000) / 10 : null;
        row.a1Compare = v.a1;
        row.a1VarAbs = row.real - row.a1Compare;
        row.a1VarPct = row.a1Compare !== 0 ? Math.round(((row.real - row.a1Compare) / Math.abs(row.a1Compare)) * 1000) / 10 : null;
      }
    }

    // ── Inject CalcRows (computed from depth-0 values) ──
    const d0 = new Map<string, { real: number; orc: number; a1: number }>();
    for (const row of rows) {
      if (row.depth === 0) d0.set(row.tag0.slice(0, 3), { real: row.real, orc: row.orcCompare, a1: row.a1Compare });
    }
    const gp = (p: string) => d0.get(p) || { real: 0, orc: 0, a1: 0 };

    const mR = gp('01.').real + gp('02.').real + gp('03.').real;
    const mO = gp('01.').orc + gp('02.').orc + gp('03.').orc;
    const mA = gp('01.').a1 + gp('02.').a1 + gp('03.').a1;
    const eR = mR + gp('04.').real, eO = mO + gp('04.').orc, eA = mA + gp('04.').a1;
    const etR = eR + gp('05.').real + gp('06.').real, etO = eO + gp('05.').orc + gp('06.').orc, etA = eA + gp('05.').a1 + gp('06.').a1;

    const makeCalc = (label: string, r: number, o: number, a: number): FlatRow => ({
      depth: 0, groupKey: label, label, tag0: label, tag01: '', tag02: null, tag03: null, marca: null,
      hasChildren: false, real: r,
      orcCompare: o, orcVarAbs: r - o, orcVarPct: varPctCalc(r, o),
      orcStatus: '', orcDbItem: null, orcAiSummary: null,
      a1Compare: a, a1VarAbs: r - a, a1VarPct: varPctCalc(r, a),
      a1Status: '', a1DbItem: null, a1AiSummary: null,
      ownerEmail: null, ownerName: null,
      orcMandatory: false, a1Mandatory: false,
    });

    // Insert after last row of each prefix group (reverse order to preserve indices)
    const insertAfterPrefix = (prefix: string, calcRow: FlatRow) => {
      let idx = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].tag0.startsWith(prefix)) idx = i;
      }
      if (idx >= 0) rows.splice(idx + 1, 0, calcRow);
      else rows.push(calcRow);
    };
    insertAfterPrefix('06.', makeCalc('EBITDA TOTAL', etR, etO, etA));
    insertAfterPrefix('04.', makeCalc('EBITDA (S/ RATEIO RAIZ CSC)', eR, eO, eA));
    insertAfterPrefix('03.', makeCalc('MARGEM DE CONTRIBUIÇÃO', mR, mO, mA));

    return rows;
  }, [items, expandedNodes, filterMarcas, effectiveMarcas, effectiveTag01]);

  // ── Stats ──

  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending').length;
    const notified = items.filter(i => i.status === 'notified').length;
    const justified = items.filter(i => i.status === 'justified').length;
    const approved = items.filter(i => i.status === 'approved').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    const mandatoryPending = items.filter(i => i.mandatory && (i.status === 'pending' || i.status === 'notified')).length;
    const mandatoryTotal = items.filter(i => i.mandatory).length;
    const version = items.length > 0 ? Math.max(...items.map(i => i.version || 1)) : 0;
    // snapshot_at: pega o mais recente entre os items da versão atual
    const currentVersionItems = items.filter(i => i.version === version && i.snapshot_at);
    const snapshotAt = currentVersionItems.length > 0
      ? currentVersionItems.reduce((latest, i) => {
          const d = i.snapshot_at!;
          return d > latest ? d : latest;
        }, currentVersionItems[0].snapshot_at!)
      : null;
    return { pending, notified, justified, approved, rejected, mandatoryPending, mandatoryTotal, total: items.length, version, snapshotAt };
  }, [items]);

  // ── Actions ──

  const handleNotify = async () => {
    if (!yearMonth) return;
    setNotifying(true);
    try {
      const response = await fetch('/api/agent-team/notifications?action=variance-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, marca: effectiveMarcas.length > 0 ? effectiveMarcas[0] : undefined }),
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

  // ── AI helpers for justification modal ──

  const handleAiAnalyze = async () => {
    if (!justifyItem) return;
    setAiLoading('analyze');
    try {
      const result = await aiAnalyzeVariance({
        tag0: justifyItem.tag0,
        tag01: justifyItem.tag01,
        tag02: justifyItem.tag02,
        marca: justifyItem.marca,
        real: justifyItem.real_value,
        compare: justifyItem.compare_value,
        variancePct: justifyItem.variance_pct,
        comparisonType: justifyItem.comparison_type as 'orcado' | 'a1',
      });
      setJustifyText(result);
      toast.success('Análise gerada pela IA');
    } catch {
      toast.error('Erro ao gerar análise com IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiImprove = async () => {
    if (!justifyItem || justifyText.trim().length < 10) {
      toast.error('Escreva pelo menos 10 caracteres para a IA melhorar');
      return;
    }
    setAiLoading('improve');
    try {
      const result = await aiImproveText(justifyText.trim(), {
        tag0: justifyItem.tag0,
        tag01: justifyItem.tag01,
        tag02: justifyItem.tag02,
        marca: justifyItem.marca,
        real: justifyItem.real_value,
        compare: justifyItem.compare_value,
        variancePct: justifyItem.variance_pct,
        comparisonType: justifyItem.comparison_type as 'orcado' | 'a1',
      });
      setJustifyText(result);
      toast.success('Texto melhorado pela IA');
    } catch {
      toast.error('Erro ao melhorar texto com IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiPlanGenerate = async () => {
    if (!justifyItem || justifyText.trim().length < 20) {
      toast.error('Preencha a justificativa antes de gerar o plano de ação');
      return;
    }
    setAiLoading('plan-generate');
    try {
      const result = await aiGenerateActionPlan(justifyText.trim(), {
        tag0: justifyItem.tag0,
        tag01: justifyItem.tag01,
        tag02: justifyItem.tag02,
        marca: justifyItem.marca,
        real: justifyItem.real_value,
        compare: justifyItem.compare_value,
        variancePct: justifyItem.variance_pct,
        comparisonType: justifyItem.comparison_type as 'orcado' | 'a1',
      });
      setJustifyPlan(result);
      toast.success('Plano de ação gerado pela IA');
    } catch {
      toast.error('Erro ao gerar plano de ação com IA');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiPlanImprove = async () => {
    if (!justifyItem || justifyPlan.trim().length < 10) {
      toast.error('Escreva pelo menos 10 caracteres para a IA melhorar');
      return;
    }
    setAiLoading('plan-improve');
    try {
      const result = await aiImproveActionPlan(justifyPlan.trim(), justifyText.trim(), {
        tag0: justifyItem.tag0,
        tag01: justifyItem.tag01,
        tag02: justifyItem.tag02,
        marca: justifyItem.marca,
        real: justifyItem.real_value,
        compare: justifyItem.compare_value,
        variancePct: justifyItem.variance_pct,
        comparisonType: justifyItem.comparison_type as 'orcado' | 'a1',
      });
      setJustifyPlan(result);
      toast.success('Plano de ação melhorado pela IA');
    } catch {
      toast.error('Erro ao melhorar plano de ação com IA');
    } finally {
      setAiLoading(null);
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
      // Filhos podem ser tag02 items OU marcas diretas (depth=1 sem tag02)
      let childItems = items.filter(
        i => i.tag0 === row.tag0 && i.tag01 === row.tag01 &&
             i.tag02 !== null && i.comparison_type === compType
      );
      // Se não há tag02, buscar marcas diretas sob tag01
      if (childItems.length === 0) {
        childItems = items.filter(
          i => i.tag0 === row.tag0 && i.tag01 === row.tag01 &&
               i.tag02 === null && i.marca && i.marca !== '' &&
               i.comparison_type === compType
        );
      }
      if (childItems.length > 0) await generateSynthesis('tag01', dbItem, childItems);
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

  const expandAll = () => {
    // Compute ALL expandable keys from items (not just visible flatRows)
    const CALC_SET = new Set(['MARGEM DE CONTRIBUIÇÃO', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
    const dreItems = items.filter(i => !CALC_SET.has(i.tag0));
    const allKeys = new Set<string>();
    const tag0Set = new Set(dreItems.map(i => i.tag0));
    for (const tag0 of tag0Set) {
      allKeys.add(tag0); // depth 0
      const t0Items = dreItems.filter(i => i.tag0 === tag0);
      const tag01Set = new Set(t0Items.filter(i => i.tag01).map(i => i.tag01));
      for (const tag01 of tag01Set) {
        allKeys.add(`${tag0}|${tag01}`); // depth 1
        const t1Items = t0Items.filter(i => i.tag01 === tag01);
        const tag02Set = new Set(t1Items.filter(i => i.tag02).map(i => i.tag02!));
        for (const tag02 of tag02Set) {
          allKeys.add(`${tag0}|${tag01}|${tag02}`); // depth 2
        }
      }
    }
    setExpandedNodes(allKeys);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
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
    const mandatory = isOrc ? row.orcMandatory : row.a1Mandatory;
    const borderCls = isOrc ? 'border-l-2 border-emerald-200/60' : 'border-l-2 border-purple-200/60';

    // Quem pode justificar: qualquer usuário autorizado (tag01 permission) em folhas pendentes; admin sempre
    const isOwner = row.ownerEmail === user?.email;
    const canJustify = !row.hasChildren && row.depth >= 2 && dbItem &&
      (status === 'pending' || status === 'notified' || status === 'rejected');
    // Criador pode editar se status = justified (antes de aprovação); admin também
    const canEditJustified = !row.hasChildren && row.depth >= 2 && dbItem &&
      status === 'justified' && (isOwner || isAdmin);
    const canSynthesis = row.depth <= 1 && isAdminOrManager && dbItem;
    // Só admin pode aprovar/rejeitar
    const canReview = isAdmin && dbItem && status === 'justified';
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
              {row.depth >= 2 && dbItem && (
                <span className={`inline-flex px-1 py-0.5 rounded text-[7px] font-bold leading-none whitespace-nowrap ${
                  mandatory
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {mandatory ? 'Obrig.' : 'Opcional'}
                </span>
              )}
              {canJustify && dbItem && (
                <button
                  onClick={() => {
                    setJustifyItem(dbItem);
                    setJustifyText(dbItem.justification || '');
                    setJustifyPlan(dbItem.action_plan || '');
                    setJustifyReadOnly(false);
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
              {canEditJustified && dbItem && (
                <button
                  onClick={() => {
                    setJustifyItem(dbItem);
                    setJustifyText(dbItem.justification || '');
                    setJustifyPlan(dbItem.action_plan || '');
                    setJustifyReadOnly(false);
                  }}
                  className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-amber-100 text-amber-700 hover:bg-amber-200 whitespace-nowrap"
                >
                  Editar
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
              {dbItem?.justification && !canJustify && !canEditJustified && (
                <button
                  onClick={() => {
                    setJustifyItem(dbItem);
                    setJustifyText(dbItem.justification || '');
                    setJustifyPlan(dbItem.action_plan || '');
                    setJustifyReadOnly(true);
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
      : row.depth === 2 && row.marca
      ? 'bg-orange-50/40 border-b border-orange-100/50'
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
      : row.depth === 2 && row.marca ? 'font-medium text-[10px]'
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
        <td
          className={`py-0.5 ${fontClass} ${row.hasChildren && !isCalcRow ? 'cursor-pointer select-none' : ''}`}
          style={{ paddingLeft: `${isCalcRow ? 8 : indent + 8}px`, paddingRight: 4 }}
          onClick={() => { if (row.hasChildren && !isCalcRow) toggleNode(row.groupKey); }}
        >
          <div className="flex items-center gap-1">
            {isCalcRow ? (
              <span className="text-white/80 text-[10px] mr-0.5">▶</span>
            ) : row.hasChildren ? (
              <span className={`${isDark ? 'text-white/60' : 'text-gray-400'} flex-shrink-0`}>
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
            ) : (
              <span className="w-[11px] inline-block flex-shrink-0" />
            )}
            {!isCalcRow && row.depth === 0 && <span className="text-amber-400 text-[9px] mr-0.5">◆</span>}
            {!isCalcRow && row.depth === 1 && <span className="text-blue-400 text-[9px] mr-0.5">◇</span>}
            {!isCalcRow && row.depth === 2 && !row.marca && <span className="text-[9px] text-gray-300 flex-shrink-0">{row.tag0.slice(0, 3)}</span>}
            {!isCalcRow && ((row.depth === 2 && row.marca) || row.depth === 3) && <Building2 size={9} className="text-orange-400 flex-shrink-0" />}
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
            {stats.mandatoryPending > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold">{stats.mandatoryPending} obrig. pendentes</span>
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
          <MultiSelectFilter
            label="MÊS"
            icon={<CalendarDays size={12} />}
            options={availableMonths}
            selected={yearMonth ? [yearMonth] : []}
            onChange={sel => setYearMonth(sel.length > 0 ? sel[sel.length - 1] : '')}
            colorScheme="purple"
            compact
          />

          <div className="h-5 w-px bg-blue-200 shrink-0" />

          {/* Marca */}
          <MultiSelectFilter
            label="MARCA"
            icon={<Building2 size={12} />}
            options={availableMarcas}
            selected={filterMarcas}
            onChange={setFilterMarcas}
            colorScheme="orange"
            compact
          />

          <div className="h-5 w-px bg-blue-200 shrink-0" />

          {/* Status */}
          <MultiSelectFilter
            label="STATUS"
            icon={<Filter size={12} />}
            options={Object.keys(STATUS_LABELS)}
            selected={filterStatuses}
            onChange={setFilterStatuses}
            colorScheme="blue"
            compact
          />

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

          {/* Admin/Manager actions */}
          {isAdminOrManager && (
            <>
              <div className="h-5 w-px bg-blue-200 shrink-0" />
              <button
                onClick={handleNotify}
                disabled={notifying}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white transition-all disabled:opacity-50 shadow-sm shrink-0"
              >
                {notifying ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                Cobranças
              </button>
            </>
          )}
          {/* Aprovar/Rejeitar em massa — só admin */}
          {isAdmin && selectedIds.size > 0 && (
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

        {/* Config panel (collapsible) */}
        {showThresholds && isAdminOrManager && (
          <ThresholdsPanel
            thresholds={thresholds}
            setThresholds={setThresholds}
          />
        )}
      </div>

      {/* Expand/Collapse + Table */}
      {flatRows.length > 0 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-gray-50 border-b border-gray-200">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronsDown size={10} /> Expandir Tudo
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronsUp size={10} /> Recolher
          </button>
          <span className="text-[9px] text-gray-400 ml-2">
            {items.filter(i => i.tag02).length > 0
              ? `${items.filter(i => i.tag02).length} itens tag02+marca`
              : 'Sem detalhe tag02/marca — regenere os desvios'}
          </span>
        </div>
      )}
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
                ? 'Use o botão "Foto" na DRE Gerencial para gerar o snapshot do mês'
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
              Consolidado YTD — Jan a {yearMonth ? (() => { const [y, m] = yearMonth.split('-'); return new Date(Number(y), Number(m) - 1, 15).toLocaleString('pt-BR', { month: 'short', year: 'numeric' }); })() : '...'}
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

      {/* ── Justification + Action Plan Modal (5W1H) ── */}
      {justifyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--color-primary-500)' }}>
                  {justifyItem.status === 'approved'
                    ? (isAdmin ? 'Editar Justificativa (Admin)' : 'Justificativa (Aprovada)')
                    : justifyItem.status === 'justified'
                      ? (isAdmin || justifyItem.owner_email === user?.email ? 'Editar Justificativa' : 'Justificativa')
                      : 'Justificar Desvio'}
                </h3>
              </div>

              {/* Review note if rejected */}
              {justifyItem.status === 'rejected' && justifyItem.review_note && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs text-red-700">
                  <span className="font-bold">Motivo da rejeição:</span> {justifyItem.review_note}
                </div>
              )}

              <ActionPlanForm
                item={{
                  id: justifyItem.id,
                  year_month: justifyItem.year_month,
                  marca: justifyItem.marca || '',
                  tag0: justifyItem.tag0,
                  tag01: justifyItem.tag01,
                  tag02: justifyItem.tag02,
                  comparison_type: justifyItem.comparison_type as 'orcado' | 'a1',
                  real_value: justifyItem.real_value,
                  compare_value: justifyItem.compare_value,
                  variance_abs: justifyItem.variance_abs,
                  variance_pct: justifyItem.variance_pct,
                  justification: justifyItem.justification,
                  status: justifyItem.status,
                }}
                userName={user?.display_name || user?.email || ''}
                userEmail={user?.email || ''}
                readOnly={justifyReadOnly}
                onSave={async (data) => {
                  // 1. Save justification to variance_justifications
                  if (data.justification && data.justification.trim().length >= 20) {
                    const result = await submitJustification(
                      justifyItem.id,
                      data.justification.trim(),
                      data.actionPlan ? `${data.actionPlan.what} | ${data.actionPlan.why} | ${data.actionPlan.how}` : undefined,
                      user?.email || undefined,
                    );
                    if (!result.ok) {
                      toast.error(result.error || 'Erro ao enviar justificativa');
                      return;
                    }
                    toast.success('Justificativa enviada com sucesso');

                    // Trigger AI cascade
                    triggerAiCascade(justifyItem);
                  }

                  // 2. Save action plan to action_plans table
                  if (data.actionPlan) {
                    try {
                      await createActionPlan({
                        variance_justification_id: justifyItem.id,
                        year_month: justifyItem.year_month,
                        marca: justifyItem.marca || null,
                        tag0: justifyItem.tag0,
                        tag01: justifyItem.tag01,
                        tag02: justifyItem.tag02,
                        comparison_type: justifyItem.comparison_type as 'orcado' | 'a1',
                        real_value: justifyItem.real_value,
                        compare_value: justifyItem.compare_value,
                        variance_abs: justifyItem.variance_abs,
                        variance_pct: justifyItem.variance_pct,
                        justification: data.justification || justifyItem.justification || '',
                        what: data.actionPlan.what,
                        why: data.actionPlan.why,
                        how: data.actionPlan.how,
                        who_responsible: data.actionPlan.who_responsible,
                        who_email: data.actionPlan.who_email,
                        deadline: data.actionPlan.deadline,
                        expected_impact: data.actionPlan.expected_impact,
                        status: 'aberto' as const,
                        ai_generated: data.actionPlan.ai_generated,
                        created_by: user?.email || '',
                        created_by_name: user?.display_name || null,
                        progress_note: null,
                        completed_at: null,
                      });
                      toast.success('Plano de ação criado — veja na aba Plano de Ação');
                    } catch (e) {
                      console.error('Erro ao criar plano de ação:', e);
                      toast.error('Justificativa salva, mas erro ao criar plano de ação');
                    }
                  }

                  setJustifyItem(null);
                  setJustifyText('');
                  setJustifyPlan('');
                  fetchData();
                }}
                onClose={() => { setJustifyItem(null); setJustifyText(''); setJustifyPlan(''); setJustifyReadOnly(false); }}
              />
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
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
      <div>
        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-1.5">
          Limites de Obrigatoriedade
        </h4>
        <p className="text-[10px] text-gray-400 mb-2">
          Desvios acima destes limites são marcados como <b className="text-red-600">obrigatórios</b>. Abaixo ficam como <b className="text-gray-500">opcionais</b>. Se nenhum limite cadastrado, todos são obrigatórios.
        </p>
      </div>

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
