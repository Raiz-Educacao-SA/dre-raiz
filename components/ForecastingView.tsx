import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getSomaTags, SomaTagsRow } from '../services/supabaseService';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Brain, Activity, Loader2,
  ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, Calendar, BarChart3, Info,
} from 'lucide-react';

// ── Types ──

interface ForecastingViewProps {
  transactions?: any[];
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedCategories?: string[];
}

type ForecastMethod = 'runRate' | 'budgetAdjusted' | 'linearTrend';

interface MonthRow {
  month: string;        // 'YYYY-MM'
  monthLabel: string;   // 'Jan', 'Fev'...
  real: number;
  orcado: number;
  a1: number;
  forecast: number;     // real if past, projected if future
  isForecast: boolean;
  upperBound: number;
  lowerBound: number;
}

interface Tag0Summary {
  tag0: string;
  realYtd: number;
  orcadoYtd: number;
  a1Ytd: number;
  realFull: number;       // real ytd + forecast
  orcadoFull: number;     // orcado 12 meses
  a1Full: number;         // a1 12 meses
  forecastClosing: number;
  months: MonthRow[];
  tag01Details: Tag01Detail[];
}

interface Tag01Detail {
  tag01: string;
  realYtd: number;
  orcadoYtd: number;
  a1Ytd: number;
  forecastClosing: number;
  orcadoFull: number;
  a1Full: number;
}

// ── Constants ──

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DRE_PREFIXES = ['01.', '02.', '03.', '04.', '05.'];

const METHOD_INFO: Record<ForecastMethod, { label: string; desc: string; color: string }> = {
  runRate:        { label: 'Run Rate',         desc: 'Media dos ultimos 3 meses reais projetada para os meses restantes', color: 'orange' },
  budgetAdjusted: { label: 'Orcado Ajustado', desc: 'Orcado futuro ajustado pelo % de realizacao YTD vs orcado', color: 'emerald' },
  linearTrend:    { label: 'Tendencia Linear', desc: 'Regressao linear dos meses reais projetada para o restante', color: 'purple' },
};

// ── Helpers ──

const fmt = (v: number) => Math.round(v).toLocaleString('pt-BR');
const fmtK = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
};
const pct = (real: number, ref: number) =>
  ref !== 0 ? ((real - ref) / Math.abs(ref) * 100).toFixed(1) + '%' : 'N/A';
const deltaColor = (v: number, invert = false) => {
  const positive = invert ? v < 0 : v > 0;
  if (v === 0) return 'text-gray-400';
  return positive ? 'text-emerald-600' : 'text-rose-600';
};

// ── Forecast math ──

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function projectMonths(
  realValues: number[],   // valores reais por mes (index 0=jan)
  orcValues: number[],    // orcado por mes
  lastRealIdx: number,    // indice do ultimo mes com dados reais
  method: ForecastMethod,
): { projected: number[]; upper: number[]; lower: number[] } {
  const projected = [...realValues];
  const upper = [...realValues];
  const lower = [...realValues];

  if (lastRealIdx < 0) return { projected, upper, lower };

  const realSlice = realValues.slice(0, lastRealIdx + 1).filter(v => v !== 0);
  const sd = stdDev(realSlice) * 1.96;

  // Run Rate: media dos ultimos 3 meses
  const runRateAvg = (() => {
    const window = realSlice.slice(-3);
    return window.length > 0 ? window.reduce((s, v) => s + v, 0) / window.length : 0;
  })();

  // Budget Adjusted: % realizacao YTD
  const realYtd = realSlice.reduce((s, v) => s + v, 0);
  const orcYtd = orcValues.slice(0, lastRealIdx + 1).reduce((s, v) => s + v, 0);
  const realizationPct = orcYtd !== 0 ? realYtd / orcYtd : 1;

  // Linear Trend
  const reg = linearRegression(realSlice);

  for (let i = lastRealIdx + 1; i < 12; i++) {
    let val = 0;
    switch (method) {
      case 'runRate':
        val = runRateAvg;
        break;
      case 'budgetAdjusted':
        val = orcValues[i] * realizationPct;
        break;
      case 'linearTrend':
        val = reg.intercept + reg.slope * i;
        break;
    }
    projected[i] = val;
    upper[i] = val + sd;
    lower[i] = Math.min(val, val - sd); // allow negative for costs
  }

  return { projected, upper, lower };
}

// ── Component ──

const ForecastingView: React.FC<ForecastingViewProps> = () => {
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [method, setMethod] = useState<ForecastMethod>('budgetAdjusted');
  const [loading, setLoading] = useState(false);
  const [somaData, setSomaData] = useState<SomaTagsRow[]>([]);
  const [expandedTag0s, setExpandedTag0s] = useState<Set<string>>(new Set());
  const [selectedTag0, setSelectedTag0] = useState<string | null>(null);

  // ── Fetch data via get_soma_tags (12 meses do ano) ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSomaTags(`${year}-01`, `${year}-12`, undefined, undefined, undefined, undefined, 'Sim');
      setSomaData(data);
    } catch (e) {
      console.error('Erro ao buscar dados forecast:', e);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Identify last month with real data ──
  const lastRealMonth = useMemo(() => {
    const realMonths = new Set<string>();
    for (const r of somaData) {
      if (r.scenario === 'Real' && r.total !== 0) realMonths.add(r.month);
    }
    let lastIdx = -1;
    for (const m of realMonths) {
      const idx = parseInt(m.slice(5, 7), 10) - 1;
      if (idx > lastIdx) lastIdx = idx;
    }
    return lastIdx;
  }, [somaData]);

  // ── Build tag0 summaries ──
  const tag0Summaries = useMemo((): Tag0Summary[] => {
    if (somaData.length === 0) return [];

    // Index: tag0 -> tag01 -> scenario -> month -> total
    type DeepMap = Map<string, Map<string, Map<string, Map<string, number>>>>;
    const idx: DeepMap = new Map();

    for (const r of somaData) {
      if (!DRE_PREFIXES.some(p => r.tag0.startsWith(p))) continue;
      if (!idx.has(r.tag0)) idx.set(r.tag0, new Map());
      const t0 = idx.get(r.tag0)!;
      if (!t0.has(r.tag01)) t0.set(r.tag01, new Map());
      const t1 = t0.get(r.tag01)!;
      if (!t1.has(r.scenario)) t1.set(r.scenario, new Map());
      const sc = t1.get(r.scenario)!;
      sc.set(r.month, (sc.get(r.month) || 0) + r.total);
    }

    const allMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const results: Tag0Summary[] = [];

    for (const tag0 of [...idx.keys()].sort()) {
      const tag01Map = idx.get(tag0)!;

      // Aggregate tag0 level per scenario per month
      const tag0ByScMonth = new Map<string, number[]>(); // scenario -> [12 months]
      for (const sc of ['Real', 'Orcado', 'A-1']) {
        tag0ByScMonth.set(sc, new Array(12).fill(0));
      }

      const tag01Details: Tag01Detail[] = [];

      for (const [tag01, scMap] of tag01Map) {
        if (!tag01) continue;
        const t1Real = new Array(12).fill(0);
        const t1Orc = new Array(12).fill(0);
        const t1A1 = new Array(12).fill(0);

        for (const [sc, mMap] of scMap) {
          for (const [m, val] of mMap) {
            const mi = parseInt(m.slice(5, 7), 10) - 1;
            if (sc === 'Real') { t1Real[mi] += val; tag0ByScMonth.get('Real')![mi] += val; }
            else if (sc === 'Orcado') { t1Orc[mi] += val; tag0ByScMonth.get('Orcado')![mi] += val; }
            else if (sc === 'A-1') { t1A1[mi] += val; tag0ByScMonth.get('A-1')![mi] += val; }
          }
        }

        const realYtd = t1Real.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);
        const orcYtd = t1Orc.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);
        const a1Ytd = t1A1.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);
        const { projected } = projectMonths(t1Real, t1Orc, lastRealMonth, method);
        const forecastClosing = projected.reduce((s, v) => s + v, 0);

        tag01Details.push({
          tag01, realYtd, orcadoYtd: orcYtd, a1Ytd: a1Ytd,
          forecastClosing,
          orcadoFull: t1Orc.reduce((s, v) => s + v, 0),
          a1Full: t1A1.reduce((s, v) => s + v, 0),
        });
      }

      // Sort tag01 by realYtd desc (absolute)
      tag01Details.sort((a, b) => Math.abs(b.realYtd) - Math.abs(a.realYtd));

      const realArr = tag0ByScMonth.get('Real')!;
      const orcArr = tag0ByScMonth.get('Orcado')!;
      const a1Arr = tag0ByScMonth.get('A-1')!;

      const { projected, upper, lower } = projectMonths(realArr, orcArr, lastRealMonth, method);

      const months: MonthRow[] = allMonths.map((m, i) => ({
        month: m,
        monthLabel: MONTH_LABELS[i],
        real: realArr[i],
        orcado: orcArr[i],
        a1: a1Arr[i],
        forecast: projected[i],
        isForecast: i > lastRealMonth,
        upperBound: upper[i],
        lowerBound: lower[i],
      }));

      const realYtd = realArr.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);
      const orcadoYtd = orcArr.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);
      const a1Ytd = a1Arr.slice(0, lastRealMonth + 1).reduce((s, v) => s + v, 0);

      results.push({
        tag0,
        realYtd,
        orcadoYtd,
        a1Ytd,
        realFull: projected.reduce((s, v) => s + v, 0),
        orcadoFull: orcArr.reduce((s, v) => s + v, 0),
        a1Full: a1Arr.reduce((s, v) => s + v, 0),
        forecastClosing: projected.reduce((s, v) => s + v, 0),
        months,
        tag01Details,
      });
    }

    return results;
  }, [somaData, lastRealMonth, method, year]);

  // ── CalcRows (Margem, EBITDA) ──
  const calcRows = useMemo(() => {
    const byPrefix = new Map<string, Tag0Summary>();
    for (const s of tag0Summaries) byPrefix.set(s.tag0.slice(0, 3), s);
    const g = (p: string) => byPrefix.get(p);

    const sum = (prefixes: string[], field: keyof Tag0Summary) =>
      prefixes.reduce((s, p) => s + ((g(p) as any)?.[field] || 0), 0);

    const sumMonths = (prefixes: string[]) => {
      const result = new Array(12).fill(null).map((_, i) => ({
        forecast: 0, real: 0, orcado: 0, a1: 0, upperBound: 0, lowerBound: 0,
      }));
      for (const p of prefixes) {
        const t = g(p);
        if (!t) continue;
        for (let i = 0; i < 12; i++) {
          result[i].forecast += t.months[i].forecast;
          result[i].real += t.months[i].real;
          result[i].orcado += t.months[i].orcado;
          result[i].a1 += t.months[i].a1;
          result[i].upperBound += t.months[i].upperBound;
          result[i].lowerBound += t.months[i].lowerBound;
        }
      }
      return result;
    };

    const margem = ['01.', '02.', '03.'];
    const ebitda = ['01.', '02.', '03.', '04.'];
    const ebitdaTotal = ['01.', '02.', '03.', '04.', '05.'];

    const allMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    const buildCalc = (label: string, prefixes: string[]) => {
      const mData = sumMonths(prefixes);
      const months: MonthRow[] = allMonths.map((m, i) => ({
        month: m, monthLabel: MONTH_LABELS[i],
        real: mData[i].real, orcado: mData[i].orcado, a1: mData[i].a1,
        forecast: mData[i].forecast, isForecast: i > lastRealMonth,
        upperBound: mData[i].upperBound, lowerBound: mData[i].lowerBound,
      }));
      return {
        tag0: label,
        realYtd: sum(prefixes, 'realYtd'),
        orcadoYtd: sum(prefixes, 'orcadoYtd'),
        a1Ytd: sum(prefixes, 'a1Ytd'),
        realFull: sum(prefixes, 'realFull'),
        orcadoFull: sum(prefixes, 'orcadoFull'),
        a1Full: sum(prefixes, 'a1Full'),
        forecastClosing: sum(prefixes, 'forecastClosing'),
        months,
        tag01Details: [],
      } as Tag0Summary;
    };

    return {
      margem: buildCalc('MARGEM DE CONTRIBUICAO', margem),
      ebitda: buildCalc('EBITDA (S/ RATEIO)', ebitda),
      ebitdaTotal: buildCalc('EBITDA TOTAL', ebitdaTotal),
    };
  }, [tag0Summaries, lastRealMonth, year]);

  // ── Chart data for selected tag0 ──
  const chartSource = useMemo(() => {
    if (selectedTag0 === 'MARGEM') return calcRows.margem;
    if (selectedTag0 === 'EBITDA') return calcRows.ebitda;
    if (selectedTag0 === 'EBITDA_TOTAL') return calcRows.ebitdaTotal;
    return tag0Summaries.find(s => s.tag0 === selectedTag0) || calcRows.ebitdaTotal;
  }, [selectedTag0, tag0Summaries, calcRows]);

  const chartData = useMemo(() => {
    return chartSource.months.map(m => ({
      name: m.monthLabel,
      real: m.isForecast ? null : m.real,
      forecast: m.isForecast ? m.forecast : null,
      orcado: m.orcado,
      a1: m.a1,
      upper: m.isForecast ? m.upperBound : null,
      lower: m.isForecast ? m.lowerBound : null,
      // Connection point: last real month also has forecast value
      ...(m.month === `${year}-${String(lastRealMonth + 1).padStart(2, '0')}` ? { forecast: m.real } : {}),
    }));
  }, [chartSource, year, lastRealMonth]);

  // ── Accuracy (backtest last 2 realized months) ──
  const accuracy = useMemo(() => {
    if (lastRealMonth < 3) return null;
    const src = calcRows.ebitdaTotal;
    const testMonths = 2;
    const start = lastRealMonth - testMonths + 1;

    // Simulate forecast as if lastRealMonth was `start-1`
    const realSlice = src.months.slice(0, start).map(m => m.real);
    const orcSlice = src.months.map(m => m.orcado);
    const { projected } = projectMonths(realSlice, orcSlice, start - 1, method);

    let mapeSum = 0;
    let rmseSum = 0;
    let count = 0;
    for (let i = start; i <= lastRealMonth; i++) {
      const actual = src.months[i].real;
      const pred = projected[i];
      if (actual !== 0) {
        mapeSum += Math.abs((actual - pred) / actual);
        rmseSum += (actual - pred) ** 2;
        count++;
      }
    }

    return count > 0 ? {
      mape: ((mapeSum / count) * 100).toFixed(1),
      rmse: Math.sqrt(rmseSum / count),
    } : null;
  }, [calcRows, lastRealMonth, method]);

  // ── Toggle expand ──
  const toggleTag0 = (tag0: string) => {
    setExpandedTag0s(prev => {
      const n = new Set(prev);
      n.has(tag0) ? n.delete(tag0) : n.add(tag0);
      return n;
    });
  };

  // ── Render helpers ──
  const renderKPI = (label: string, value: number, ref: number, refLabel: string, invert = false) => {
    const delta = value - ref;
    const deltaPct = ref !== 0 ? (delta / Math.abs(ref)) * 100 : 0;
    const positive = invert ? delta < 0 : delta > 0;
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-black text-gray-900 mt-1">{fmtK(value)}</div>
        <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {deltaPct.toFixed(1)}% vs {refLabel}
        </div>
      </div>
    );
  };

  const isCost = (tag0: string) => tag0.startsWith('02.') || tag0.startsWith('03.') || tag0.startsWith('04.') || tag0.startsWith('05.');

  // ── RENDER ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">Carregando dados do DRE...</span>
      </div>
    );
  }

  const ebt = calcRows.ebitdaTotal;

  return (
    <div className="space-y-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Forecast de Fechamento {year}
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Real ate {lastRealMonth >= 0 ? MONTH_LABELS[lastRealMonth] : '—'} + projecao {lastRealMonth < 11 ? `${MONTH_LABELS[lastRealMonth + 1]}–Dez` : '(completo)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="text-xs border rounded-lg px-2 py-1.5 font-bold">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchData} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" title="Atualizar">
            <RefreshCw size={13} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Method selector */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-orange-50 rounded-xl border border-orange-100 px-3 py-2">
        <Brain size={14} className="text-orange-500 shrink-0" />
        <span className="text-[9px] font-black text-gray-600 uppercase shrink-0">Metodo</span>
        <div className="h-4 w-px bg-orange-200 shrink-0" />
        {(Object.entries(METHOD_INFO) as [ForecastMethod, typeof METHOD_INFO['runRate']][]).map(([key, info]) => (
          <button key={key} onClick={() => setMethod(key)}
            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all border ${
              method === key
                ? `bg-${info.color}-500 text-white border-${info.color}-500 shadow-sm`
                : `bg-white text-gray-500 border-gray-200 hover:border-${info.color}-300`
            }`}
            style={method === key ? { backgroundColor: info.color === 'orange' ? '#f97316' : info.color === 'emerald' ? '#10b981' : '#8b5cf6', color: 'white', borderColor: 'transparent' } : {}}>
            {info.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[9px] text-gray-400">
          <Info size={10} />
          <span>{METHOD_INFO[method].desc}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-2">
        {renderKPI('Forecast Fechamento', ebt.forecastClosing, ebt.orcadoFull, 'Orcado')}
        {renderKPI('Real YTD', ebt.realYtd, ebt.orcadoYtd, 'Orc YTD')}
        {renderKPI('Orcado Anual', ebt.orcadoFull, ebt.a1Full, 'A-1')}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Realizacao YTD</div>
          <div className="text-xl font-black text-gray-900 mt-1">
            {ebt.orcadoYtd !== 0 ? ((ebt.realYtd / ebt.orcadoYtd) * 100).toFixed(1) + '%' : 'N/A'}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Real / Orcado acumulado</div>
        </div>
        {accuracy && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Precisao (MAPE)</div>
            <div className={`text-xl font-black mt-1 ${Number(accuracy.mape) < 10 ? 'text-emerald-600' : Number(accuracy.mape) < 20 ? 'text-amber-600' : 'text-rose-600'}`}>
              {accuracy.mape}%
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Backtest ultimos 2 meses</div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-gray-400" />
            <span className="text-xs font-black text-gray-700">
              {chartSource.tag0 || 'EBITDA TOTAL'} — Mensal {year}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { key: null, label: 'EBITDA Total' },
              { key: 'MARGEM', label: 'Margem' },
              { key: 'EBITDA', label: 'EBITDA s/Rat' },
              ...tag0Summaries.map(s => ({ key: s.tag0, label: s.tag0.slice(4) })),
            ].map(opt => (
              <button key={opt.key || 'ebt'} onClick={() => setSelectedTag0(opt.key === selectedTag0 ? null : opt.key)}
                className={`px-2 py-0.5 text-[8px] font-bold rounded-full border transition-all ${
                  (opt.key || 'EBITDA_TOTAL') === (selectedTag0 || 'EBITDA_TOTAL')
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmtK(v)} width={60} />
            <Tooltip
              formatter={(v: any) => fmt(v)}
              labelStyle={{ fontWeight: 800 }}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
            <ReferenceLine x={lastRealMonth >= 0 ? MONTH_LABELS[lastRealMonth] : undefined}
              stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Corte', fill: '#f97316', fontSize: 9, fontWeight: 800 }} />
            <Bar dataKey="real" name="Real" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={20} />
            <Bar dataKey="forecast" name="Forecast" radius={[3, 3, 0, 0]} barSize={20}>
              {chartData.map((_, i) => <Cell key={i} fill="#fb923c" fillOpacity={0.7} />)}
            </Bar>
            <Line dataKey="orcado" name="Orcado" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line dataKey="a1" name="A-1" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* DRE Forecast Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-[11px] w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                <th className="px-3 py-2 text-left font-black text-[9px] uppercase tracking-wider w-[250px] sticky left-0 z-10 bg-slate-800">Conta</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[90px]">Real YTD</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[90px] bg-orange-600/30">Forecast</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[90px]">Orcado</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[70px]">F vs O</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[90px]">A-1</th>
                <th className="px-2 py-2 text-right font-black text-[9px] uppercase w-[70px]">F vs A-1</th>
              </tr>
            </thead>
            <tbody>
              {tag0Summaries.map(s => {
                const isOpen = expandedTag0s.has(s.tag0);
                const costInvert = isCost(s.tag0);
                const fvO = s.forecastClosing - s.orcadoFull;
                const fvA1 = s.forecastClosing - s.a1Full;
                return (
                  <React.Fragment key={s.tag0}>
                    <tr className="bg-[#152e55] text-white hover:bg-[#1e3d6e] transition-colors cursor-pointer"
                      onClick={() => toggleTag0(s.tag0)}>
                      <td className="px-3 py-1.5 font-black text-[10px] uppercase sticky left-0 z-10 bg-[#152e55]">
                        <div className="flex items-center gap-1">
                          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          {s.tag0}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-black">{fmt(s.realYtd)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-black bg-orange-500/20 text-orange-200">{fmt(s.forecastClosing)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{fmt(s.orcadoFull)}</td>
                      <td className={`px-2 py-1.5 text-right font-mono font-bold text-[10px] ${fvO === 0 ? 'text-white/40' : (costInvert ? fvO < 0 : fvO > 0) ? 'text-lime-300' : 'text-red-300'}`}>
                        {pct(s.forecastClosing, s.orcadoFull)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{fmt(s.a1Full)}</td>
                      <td className={`px-2 py-1.5 text-right font-mono font-bold text-[10px] ${fvA1 === 0 ? 'text-white/40' : (costInvert ? fvA1 < 0 : fvA1 > 0) ? 'text-lime-300' : 'text-red-300'}`}>
                        {pct(s.forecastClosing, s.a1Full)}
                      </td>
                    </tr>
                    {isOpen && s.tag01Details.map(d => {
                      const dfvO = d.forecastClosing - d.orcadoFull;
                      const dfvA1 = d.forecastClosing - d.a1Full;
                      return (
                        <tr key={d.tag01} className="bg-gray-50 border-b border-gray-100 hover:bg-yellow-50 transition-colors">
                          <td className="px-3 py-1 pl-8 font-bold text-gray-800 sticky left-0 z-10 bg-gray-50">{d.tag01}</td>
                          <td className="px-2 py-1 text-right font-mono">{fmt(d.realYtd)}</td>
                          <td className="px-2 py-1 text-right font-mono font-bold text-orange-600 bg-orange-50">{fmt(d.forecastClosing)}</td>
                          <td className="px-2 py-1 text-right font-mono text-gray-600">{fmt(d.orcadoFull)}</td>
                          <td className={`px-2 py-1 text-right font-mono text-[10px] font-bold ${deltaColor(dfvO, costInvert)}`}>{pct(d.forecastClosing, d.orcadoFull)}</td>
                          <td className="px-2 py-1 text-right font-mono text-gray-600">{fmt(d.a1Full)}</td>
                          <td className={`px-2 py-1 text-right font-mono text-[10px] font-bold ${deltaColor(dfvA1, costInvert)}`}>{pct(d.forecastClosing, d.a1Full)}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Calc Rows */}
              {[calcRows.margem, calcRows.ebitda, calcRows.ebitdaTotal].map(cr => {
                const fvO = cr.forecastClosing - cr.orcadoFull;
                const fvA1 = cr.forecastClosing - cr.a1Full;
                const isTotal = cr.tag0 === 'EBITDA TOTAL';
                return (
                  <tr key={cr.tag0} className={isTotal
                    ? 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white border-t-2 border-yellow-400'
                    : 'bg-[#F44C00] text-white'}>
                    <td className={`px-3 py-1.5 font-black text-[10px] uppercase sticky left-0 z-10 ${isTotal ? 'bg-slate-800' : 'bg-[#F44C00]'}`}>{cr.tag0}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-black">{fmt(cr.realYtd)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-black bg-white/10">{fmt(cr.forecastClosing)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold">{fmt(cr.orcadoFull)}</td>
                    <td className={`px-2 py-1.5 text-right font-mono font-bold text-[10px] ${fvO > 0 ? 'text-lime-300' : fvO < 0 ? 'text-red-200' : 'text-white/40'}`}>{pct(cr.forecastClosing, cr.orcadoFull)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold">{fmt(cr.a1Full)}</td>
                    <td className={`px-2 py-1.5 text-right font-mono font-bold text-[10px] ${fvA1 > 0 ? 'text-lime-300' : fvA1 < 0 ? 'text-red-200' : 'text-white/40'}`}>{pct(cr.forecastClosing, cr.a1Full)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-indigo-500" />
          <span className="text-xs font-black text-gray-700 uppercase">Insights Automaticos</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Forecast vs Budget */}
          {(() => {
            const delta = ebt.forecastClosing - ebt.orcadoFull;
            const deltaPct = ebt.orcadoFull !== 0 ? (delta / Math.abs(ebt.orcadoFull)) * 100 : 0;
            const above = deltaPct > 0;
            return (
              <div className={`p-3 rounded-lg border ${above ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center gap-1 mb-1">
                  {above ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-rose-600" />}
                  <span className={`text-[10px] font-black ${above ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Forecast {above ? 'ACIMA' : 'ABAIXO'} do Orcado
                  </span>
                </div>
                <p className="text-[10px] text-gray-600">
                  EBITDA Total projetado de <strong>{fmtK(ebt.forecastClosing)}</strong> vs orcado de <strong>{fmtK(ebt.orcadoFull)}</strong> ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%).
                  {Math.abs(deltaPct) > 10
                    ? ' Desvio significativo — requer atencao.'
                    : ' Dentro da faixa esperada.'}
                </p>
              </div>
            );
          })()}

          {/* Realization rate */}
          {(() => {
            const rate = ebt.orcadoYtd !== 0 ? (ebt.realYtd / ebt.orcadoYtd) * 100 : 100;
            const good = rate >= 95;
            return (
              <div className={`p-3 rounded-lg border ${good ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-1 mb-1">
                  <Target size={12} className={good ? 'text-emerald-600' : 'text-amber-600'} />
                  <span className={`text-[10px] font-black ${good ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Realizacao YTD: {rate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] text-gray-600">
                  {good
                    ? `Execucao orcamentaria saudavel. Real acumulado de ${fmtK(ebt.realYtd)} vs orcado de ${fmtK(ebt.orcadoYtd)}.`
                    : `Execucao orcamentaria abaixo do esperado. Gap de ${fmtK(ebt.orcadoYtd - ebt.realYtd)} no acumulado.`}
                </p>
              </div>
            );
          })()}

          {/* Top deviations */}
          {(() => {
            const deviations = tag0Summaries
              .filter(s => s.orcadoFull !== 0)
              .map(s => ({ tag0: s.tag0, pct: ((s.forecastClosing - s.orcadoFull) / Math.abs(s.orcadoFull)) * 100 }))
              .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
            const worst = deviations[0];
            return worst ? (
              <div className="p-3 rounded-lg border bg-orange-50 border-orange-200 col-span-2">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar size={12} className="text-orange-600" />
                  <span className="text-[10px] font-black text-orange-700">Maiores Desvios Projetados</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {deviations.slice(0, 5).map(d => (
                    <span key={d.tag0} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      d.pct > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {d.tag0.slice(0, 15)} {d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default ForecastingView;
