// ─── Variance PPT Preview — HTML Slide Cards ────────────────────────
// Renders VariancePptData as visual slide cards (same structure as PPTX)
// Visual design inspired by Genspark executive presentation quality

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, X, ChevronLeft, ChevronRight, Eye, EyeOff, Filter, SlidersHorizontal, Check } from 'lucide-react';
import type {
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
  VariancePptMarcaEntry,
  SlideReloadParams,
} from '../services/variancePptTypes';
import { VARIANCE_COLORS } from '../services/variancePptTypes';
import {
  type SlideViewFilters,
  type FilterGroup,
  isFiltersEmpty,
  filterSection,
  filterSectionByMarcaBreakdowns,
  filterVariancePptData,
  filterMarcaEntries,
  extractSectionMarcas,
  extractNodeMarcas,
} from '../services/variancePptFilterService';

// ─── Formatting Helpers ──────────────────────────────────────────────

const C = VARIANCE_COLORS;

// ─── Scale detection: auto-choose K (milhares) or M (milhões) ────────
type ScaleUnit = 'K' | 'M';

function detectScale(...rawValues: number[]): ScaleUnit {
  const maxAbs = Math.max(...rawValues.map(Math.abs), 0);
  return maxAbs >= 1_000_000_000 ? 'M' : 'K';
}

function scaleLabel(unit: ScaleUnit): string {
  return unit === 'M' ? 'MILHÕES (R$)' : 'MILHARES (R$)';
}

function scaleSuffix(unit: ScaleUnit): string {
  return unit === 'M' ? 'M' : 'mil';
}

function fmtScaled(v: number, unit: ScaleUnit): string {
  if (unit === 'M') {
    const m = v / 1_000_000;
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  }
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

function toChartVal(v: number, unit: ScaleUnit): number {
  return unit === 'M' ? Math.round(v / 100_000) / 10 : Math.round(v / 1000);
}

function fmtChartLabel(v: number, unit: ScaleUnit): string {
  if (unit === 'M') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return v.toLocaleString('pt-BR');
}

function fmtK(v: number): string {
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return 'N/D';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function hex(color: string): string {
  return `#${color}`;
}

// Positivo = favorável (verde) para todas as linhas — receita E custos.
// Custos são armazenados como valores negativos, logo varPct > 0 = gastou menos = bom.
function deltaColor(v: number | null, _invert?: boolean): string {
  if (v === null || v === undefined || v === 0) return hex(C.mutedText);
  return v >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
}

function statusColor(status: string): string {
  if (status === 'approved') return hex(C.approved);
  if (status === 'justified') return hex(C.justified);
  if (status === 'rejected') return hex(C.rejected);
  if (status === 'notified') return '#3B82F6';
  return hex(C.pending);
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// Remove markdown formatting and leading label prefixes so AI text reads as natural prose
function cleanInsight(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s+/g, '')                        // ## Headers
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1')        // **bold** / *italic*
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')           // __bold__ / _italic_
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))        // `code`
    .replace(/^[-*•]\s+/gm, '')                        // bullet points
    .replace(/^\d+\.\s+/gm, '')                        // numbered lists
    // Strip leading label prefix: "Consolidação - Centro de Custo: Nome - " etc.
    .replace(/^(?:[^:]{3,60}:\s*)?[^:]{3,60}\s*[-–]\s+/i, '')
    .replace(/^[^:]{3,60}:\s+/, '')                    // fallback: "Label: " prefix
    .replace(/\n{2,}/g, ' ')                           // multiple newlines → space
    .replace(/\n/g, ' ')                               // single newlines → space
    .replace(/\s{2,}/g, ' ')                           // extra spaces
    .trim();
}

// ─── Slide Base Card ─────────────────────────────────────────────────

// SlideCard: em preview usa aspectRatio 16:9 para definir altura.
// Em apresentação, o pai tem 960×540 fixo → h-full=540px (aspectRatio confirma o mesmo valor).
function SlideCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden w-full h-full ${className}`}
      style={{ aspectRatio: '16 / 9', boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </section>
  );
}

// ─── Global slide filters type ───────────────────────────────────────
type GlobalSlideFilters = {
  month: string;
  monthFrom?: string;
  marcas: string[];   // vazio = todas as marcas permitidas
  tag01s: string[];   // vazio = todas as linhas
};

// ─── Slide Filters Panel ─────────────────────────────────────────────
function SlideFiltersPanel({
  current,
  liveMonths,
  availableMarcas,
  availableTag01s,
  loading,
  onApply,
  onClose,
}: {
  current: GlobalSlideFilters;
  liveMonths: string[];
  availableMarcas: string[];
  availableTag01s: string[];
  loading: boolean;
  onApply: (f: GlobalSlideFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState<GlobalSlideFilters>(() => ({ ...current }));

  React.useEffect(() => { setDraft({ ...current }); }, [current]);

  const toggleMonth = (m: string) => {
    setDraft(prev => {
      const inRange = prev.monthFrom
        ? liveMonths.filter(x => x >= prev.monthFrom! && x <= prev.month)
        : [prev.month];
      const checked = inRange.includes(m);
      const next = checked ? inRange.filter(x => x !== m) : [...inRange, m];
      const sorted = [...next].sort();
      if (sorted.length === 0) return prev;
      return { ...prev, month: sorted[sorted.length - 1], monthFrom: sorted.length > 1 ? sorted[0] : undefined };
    });
  };

  const isMonthChecked = (m: string) => {
    if (!draft.monthFrom) return draft.month === m;
    return m >= draft.monthFrom && m <= draft.month;
  };

  const toggleMarca = (m: string) =>
    setDraft(prev => ({ ...prev, marcas: prev.marcas.includes(m) ? prev.marcas.filter(x => x !== m) : [...prev.marcas, m] }));

  const toggleTag01 = (t: string) =>
    setDraft(prev => ({ ...prev, tag01s: prev.tag01s.includes(t) ? prev.tag01s.filter(x => x !== t) : [...prev.tag01s, t] }));

  const activeCount = (draft.monthFrom ? 1 : 0) + (draft.marcas.length > 0 ? 1 : 0) + (draft.tag01s.length > 0 ? 1 : 0);

  const CB = 'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div
        className="relative rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#111827', border: '1px solid #374151', width: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#374151' }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} style={{ color: '#60A5FA' }} />
            <span className="text-sm font-bold text-white">Filtros dos Slides</span>
            {activeCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#2563EB', color: 'white' }}>
                {activeCount} ativo{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
            <X size={14} style={{ color: '#9CA3AF' }} />
          </button>
        </div>

        {/* Body — 3 columns */}
        <div className="flex overflow-hidden flex-1 min-h-0">
          {/* Período */}
          <div className="flex-1 flex flex-col border-r overflow-hidden" style={{ borderColor: '#374151' }}>
            <div className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: '#6B7280', borderBottom: '1px solid #1F2937' }}>
              Período
            </div>
            <div className="overflow-y-auto flex-1 py-1.5">
              {liveMonths.map(m => {
                const checked = isMonthChecked(m);
                return (
                  <label key={m} className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer select-none" style={{ color: checked ? 'white' : '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className={CB} style={{ borderColor: checked ? '#2563EB' : '#4B5563', background: checked ? '#2563EB' : 'transparent' }}>
                      {checked && <Check size={8} color="white" strokeWidth={3} />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleMonth(m)} className="sr-only" />
                    <span className="text-xs font-bold">{monthShortFromYearMonth(m)}</span>
                  </label>
                );
              })}
              {liveMonths.length === 0 && <div className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>Nenhum mês</div>}
            </div>
          </div>

          {/* Marca */}
          <div className="flex-1 flex flex-col border-r overflow-hidden" style={{ borderColor: '#374151' }}>
            <div className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between" style={{ color: '#6B7280', borderBottom: '1px solid #1F2937' }}>
              <span>Marca</span>
              {draft.marcas.length > 0 && (
                <button className="text-[9px] font-bold" style={{ color: '#3B82F6' }} onClick={() => setDraft(p => ({ ...p, marcas: [] }))}>Limpar</button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 py-1.5">
              {availableMarcas.map(m => {
                const checked = draft.marcas.includes(m);
                return (
                  <label key={m} className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer select-none" style={{ color: checked ? 'white' : '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className={CB} style={{ borderColor: checked ? '#2563EB' : '#4B5563', background: checked ? '#2563EB' : 'transparent' }}>
                      {checked && <Check size={8} color="white" strokeWidth={3} />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleMarca(m)} className="sr-only" />
                    <span className="text-xs font-bold">{m}</span>
                  </label>
                );
              })}
              {availableMarcas.length === 0 && <div className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>Sem marcas</div>}
            </div>
          </div>

          {/* Linhas DRE */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between" style={{ color: '#6B7280', borderBottom: '1px solid #1F2937' }}>
              <span>Linhas DRE</span>
              {draft.tag01s.length > 0 && (
                <button className="text-[9px] font-bold" style={{ color: '#3B82F6' }} onClick={() => setDraft(p => ({ ...p, tag01s: [] }))}>Limpar</button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 py-1.5">
              {availableTag01s.map(t => {
                const checked = draft.tag01s.includes(t);
                return (
                  <label key={t} className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer select-none" style={{ color: checked ? 'white' : '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className={CB} style={{ borderColor: checked ? '#2563EB' : '#4B5563', background: checked ? '#2563EB' : 'transparent' }}>
                      {checked && <Check size={8} color="white" strokeWidth={3} />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleTag01(t)} className="sr-only" />
                    <span className="text-[11px] font-medium leading-snug">{t}</span>
                  </label>
                );
              })}
              {availableTag01s.length === 0 && <div className="px-4 py-2 text-xs" style={{ color: '#6B7280' }}>Sem linhas</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: '#374151' }}>
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#9CA3AF', background: '#1F2937' }}
            onClick={() => setDraft({ month: current.month, monthFrom: undefined, marcas: [], tag01s: [] })}
          >
            Limpar todos
          </button>
          <div className="flex items-center gap-2">
            <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ color: '#9CA3AF' }} onClick={onClose}>
              Cancelar
            </button>
            <button
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
              style={{ background: loading ? '#1D4ED8' : '#2563EB', color: 'white', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
              onClick={() => !loading && onApply(draft)}
            >
              {loading ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Carregando…</> : <><Check size={13} /> Aplicar filtros</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide Header — Genspark style ───────────────────────────────────

function SlideHeader({
  sectionLabel,
  title,
  monthShort,
  color,
  unitLabel,
  filterSlot,
}: {
  sectionLabel?: string;
  title: string;
  monthShort: string;
  color?: string;
  unitLabel?: string;
  filterSlot?: React.ReactNode;
}) {
  const accentColor = color ? `#${color}` : '#2563EB';
  const { activePeriod, setActivePeriod, periodLoading, availableMonths } = React.useContext(PeriodContext);
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement | null>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  // Sync picker checkboxes with current activePeriod when opening
  React.useEffect(() => {
    if (!showPicker) return;
    if (activePeriod.monthFrom) {
      setPickerSelected(availableMonths.filter(m => m >= activePeriod.monthFrom! && m <= activePeriod.month));
    } else if (activePeriod.month) {
      setPickerSelected([activePeriod.month]);
    } else {
      setPickerSelected([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker]);

  // Display: if context has active period, use it; else use prop
  const displayLabel = activePeriod.month
    ? (activePeriod.monthFrom
        ? `${monthShortFromYearMonth(activePeriod.monthFrom).split('/')[0]}-${monthShortFromYearMonth(activePeriod.month)}`
        : activePeriod.isYtd
          ? buildYtdShort(activePeriod.month)
          : monthShortFromYearMonth(activePeriod.month))
    : monthShort;

  // Detect if period has been changed from original
  const periodChanged = activePeriod.month
    ? (activePeriod.isYtd || !!activePeriod.monthFrom || monthShortFromYearMonth(activePeriod.month) !== monthShort)
    : false;

  // Multi-month picker local state: track which months are checked before applying
  const [pickerSelected, setPickerSelected] = React.useState<string[]>(() =>
    activePeriod.monthFrom
      ? availableMonths.filter(m => m >= activePeriod.monthFrom! && m <= activePeriod.month)
      : [activePeriod.month].filter(Boolean)
  );

  return (
    <div className="px-6 pt-3 pb-2.5 border-b border-gray-100 shrink-0 bg-white" style={{ minHeight: 52 }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {sectionLabel && (
            <div
              className="text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5 leading-none"
              style={{ color: accentColor }}
            >
              {sectionLabel}
            </div>
          )}
          <h3 className="text-[17px] font-black text-gray-900 leading-tight truncate">{title}</h3>
          {unitLabel && (
            <div className="text-[9px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
              R$ {unitLabel}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <div className="relative" ref={pickerRef}>
            <button
              onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
              disabled={availableMonths.length === 0 || periodLoading}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-bold transition-colors select-none"
              style={periodChanged
                ? { borderColor: '#2563EB', backgroundColor: '#EFF6FF', color: '#2563EB' }
                : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#6B7280' }
              }
              title="Trocar período"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {periodLoading ? '…' : displayLabel}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {showPicker && availableMonths.length > 0 && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl border overflow-hidden"
                style={{ backgroundColor: '#111827', borderColor: '#374151', minWidth: 160 }}
              >
                <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                  Selecionar meses
                </div>
                <div style={{ borderTop: '1px solid #374151', maxHeight: 220, overflowY: 'auto' }}>
                  {availableMonths.map(m => {
                    const checked = pickerSelected.includes(m);
                    return (
                      <label
                        key={m}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none"
                        style={{ color: checked ? 'white' : '#D1D5DB' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1F2937')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setPickerSelected(prev =>
                              prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                            );
                          }}
                          style={{ accentColor: '#2563EB', width: 12, height: 12 }}
                        />
                        <span className="text-[11px] font-bold">{monthShortFromYearMonth(m)}</span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ borderTop: '1px solid #374151' }} className="px-3 py-2 flex gap-2">
                  <button
                    className="flex-1 text-[10px] font-bold py-1 rounded-md"
                    style={{ backgroundColor: '#374151', color: '#9CA3AF' }}
                    onClick={() => { setPickerSelected([]); }}
                  >
                    Limpar
                  </button>
                  <button
                    disabled={pickerSelected.length === 0}
                    className="flex-1 text-[10px] font-bold py-1 rounded-md transition-colors"
                    style={pickerSelected.length > 0
                      ? { backgroundColor: '#2563EB', color: 'white' }
                      : { backgroundColor: '#1F2937', color: '#6B7280', cursor: 'not-allowed' }
                    }
                    onClick={() => {
                      if (pickerSelected.length === 0) return;
                      const sorted = [...pickerSelected].sort();
                      const monthTo = sorted[sorted.length - 1];
                      const monthFrom = sorted.length > 1 ? sorted[0] : undefined;
                      setActivePeriod({ month: monthTo, isYtd: false, monthFrom });
                      setShowPicker(false);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
          {filterSlot}
        </div>
      </div>
    </div>
  );
}

// ─── Slide Footer ─────────────────────────────────────────────────────

function SlideFooter({ page }: { page?: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 border-t border-gray-100 bg-white/98"
      style={{ height: 26 }}
    >
      <span className="text-[9px] font-medium text-gray-400">RAIZ | Inteligência Financeira</span>
      <span className="text-[9px] text-gray-300">Documento Confidencial - Uso Interno</span>
      {page != null ? (
        <span className="text-[9px] font-bold text-gray-400">Página {page}</span>
      ) : (
        <span className="w-14" />
      )}
    </div>
  );
}

// ─── Variance Badge (pill style like Genspark) ────────────────────────

function VarBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) return <span className="text-[10px] text-gray-400">N/D</span>;
  const favorable = pct >= 0;
  const bg = favorable ? '#DCFCE7' : '#FEE2E2';
  const textClr = favorable ? '#166534' : '#991B1B';
  const sign = pct >= 0 ? '+' : '';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums whitespace-nowrap"
      style={{ backgroundColor: bg, color: textClr }}
    >
      {sign}
      {pct.toFixed(1)}%
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5">
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</div>
        <div className="text-lg font-black tabular-nums leading-tight" style={{ color }}>
          {value}
        </div>
        {sub && <div className="text-[9px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Insight Full-Text Popup ─────────────────────────────────────────

function InsightPopup({ title, text, accent, onClose }: {
  title: string;
  text: string;
  accent: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-5 flex flex-col gap-3"
        style={{ maxHeight: '80vh', borderTop: `4px solid ${accent}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-[13px] leading-snug" style={{ color: accent }}>
            {title}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        {/* Full text */}
        <p className="text-[12px] text-gray-700 leading-relaxed overflow-y-auto" style={{ maxHeight: 'calc(80vh - 100px)' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// ─── AI Insights Box ─────────────────────────────────────────────────

function InsightsBox({ text, compact, onExpand }: { text: string; compact?: boolean; onExpand?: () => void }) {
  const accentColor = hex(C.accent);
  const cleaned = cleanInsight(text);
  const PREVIEW_LEN = compact ? 120 : 300;
  const isLong = cleaned.length > PREVIEW_LEN;
  const preview = isLong ? cleaned.slice(0, PREVIEW_LEN).trimEnd() + '…' : cleaned;

  return (
    <div
      className="rounded-xl p-3 border"
      style={{ backgroundColor: `${accentColor}0D`, borderColor: `${accentColor}25`, borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="text-[9px] font-bold tracking-widest" style={{ color: accentColor }}>
          SÍNTESE IA
        </span>
      </div>
      <p className={compact ? 'text-[9px] leading-snug' : 'text-[11px] leading-relaxed'}
        style={{ color: cleaned ? '#374151' : '#9CA3AF' }}>
        {preview || 'Síntese pendente'}
        {isLong && onExpand && (
          <button
            className="ml-1 text-[8px] font-semibold underline underline-offset-1 bg-transparent border-none p-0 cursor-pointer"
            style={{ color: accentColor }}
            onClick={e => { e.stopPropagation(); onExpand(); }}
          >
            ver mais →
          </button>
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1: COVER — Full blue background (Genspark style)
// ═══════════════════════════════════════════════════════════════════════

function CoverSlide({ data }: { data: VariancePptData }) {
  const snapLabel = data.snapshotAt
    ? `${new Date(data.snapshotAt).toLocaleDateString('pt-BR')} ${new Date(data.snapshotAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;
  const marcaList = data.marca ? data.marca.split(',').map(m => m.trim()).filter(Boolean) : [];

  return (
    <SlideCard>
      {/* ── LEFT PANEL: dark navy ── */}
      <div className="absolute inset-0 flex">
        <div className="flex flex-col justify-between h-full px-9 py-7 shrink-0" style={{ width: '57%', backgroundColor: '#0F172A' }}>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            {/* Icon: mini bar chart — same pattern as app sidebar */}
            <div className="flex items-end gap-[3px] h-7">
              <div className="w-2 rounded-sm" style={{ height: '45%', backgroundColor: '#F59E0B' }} />
              <div className="w-2 rounded-sm" style={{ height: '70%', backgroundColor: '#10B981' }} />
              <div className="w-2 rounded-sm" style={{ height: '100%', backgroundColor: '#2563EB' }} />
              <div className="w-2 rounded-sm" style={{ height: '55%', backgroundColor: '#10B981' }} />
            </div>
            <div>
              <div className="text-[18px] font-black text-white tracking-[0.15em] leading-none">RAIZ</div>
              <div className="text-[7px] font-semibold tracking-[0.22em] uppercase" style={{ color: '#64748B' }}>
                Inteligência Financeira
              </div>
            </div>
          </div>

          {/* Main title block */}
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[2px] w-6 rounded" style={{ backgroundColor: '#10B981' }} />
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: '#10B981' }}>
                DRE Gerencial
              </span>
            </div>

            {/* Title */}
            <h1 className="font-black text-white leading-none tracking-tight" style={{ fontSize: 46 }}>
              Book de
            </h1>
            <h1 className="font-black leading-none tracking-tight" style={{ fontSize: 46, color: '#2563EB' }}>
              Resultados
            </h1>

            {/* Month */}
            <div className="flex items-center gap-3 mt-4">
              <div className="w-[3px] h-8 rounded-full" style={{ backgroundColor: '#2563EB' }} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>Período de Referência</div>
                <div className="text-[22px] font-black text-white leading-tight">{data.monthLabel}</div>
              </div>
            </div>

            {/* Marca chips */}
            {marcaList.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-4">
                {marcaList.map(m => (
                  <span
                    key={m}
                    className="px-2.5 py-0.5 rounded text-[9px] font-bold text-white"
                    style={{ backgroundColor: 'rgba(37,99,235,0.35)', border: '1px solid rgba(37,99,235,0.5)' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom metadata */}
          <div>
            {/* Divider */}
            <div className="h-px w-full mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                  <span className="text-[9px]" style={{ color: '#64748B' }}>Versão {data.version}</span>
                </div>
                {snapLabel && (
                  <div className="flex items-center gap-1.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                    </svg>
                    <span className="text-[9px]" style={{ color: '#64748B' }}>{snapLabel}</span>
                  </div>
                )}
              </div>
              <span className="text-[8px] font-semibold tracking-widest uppercase" style={{ color: '#334155' }}>
                Uso Interno
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: blue gradient ── */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1D4ED8 0%, #1E3A8A 55%, #0F172A 100%)' }}>

          {/* Decorative circles */}
          <div className="absolute rounded-full" style={{ width: 260, height: 260, top: -60, right: -60, background: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute rounded-full" style={{ width: 180, height: 180, top: 80, right: 20, background: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute rounded-full" style={{ width: 320, height: 320, bottom: -100, right: -80, background: 'rgba(16,185,129,0.08)' }} />
          <div className="absolute rounded-full" style={{ width: 140, height: 140, bottom: 60, right: 80, background: 'rgba(16,185,129,0.1)' }} />

          {/* Grid lines */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

          {/* KPI cards stack */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 gap-3">
            {/* Coverage card */}
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="text-[8px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Cobertura de Justificativas
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[32px] font-black text-white leading-none">{data.stats.coveragePct}%</span>
                <span className="text-[10px] font-semibold mb-1" style={{ color: data.stats.coveragePct >= 80 ? '#34D399' : data.stats.coveragePct >= 50 ? '#FCD34D' : '#F87171' }}>
                  {data.stats.coveragePct >= 80 ? '● Em dia' : data.stats.coveragePct >= 50 ? '● Parcial' : '● Pendente'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full w-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${data.stats.coveragePct}%`, backgroundColor: data.stats.coveragePct >= 80 ? '#10B981' : data.stats.coveragePct >= 50 ? '#F59E0B' : '#EF4444' }} />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Justificadas', value: data.stats.justified + data.stats.approved, color: '#34D399' },
                { label: 'Pendentes', value: data.stats.pending + data.stats.notified, color: '#FCD34D' },
                { label: 'Total Contas', value: data.stats.totalLeaves, color: 'rgba(255,255,255,0.7)' },
                { label: 'Rejeitadas', value: data.stats.rejected, color: '#F87171' },
              ].map(item => (
                <div key={item.label} className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-[7px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div>
                  <div className="text-[18px] font-black leading-none" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* A1 year badge */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Comparativo Ano Anterior</span>
              <span className="text-[11px] font-black text-white">{data.a1Year}</span>
            </div>
          </div>

          {/* Bottom label */}
          <div className="absolute bottom-5 left-0 right-0 flex justify-center">
            <span className="text-[8px] font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Raiz Educação S.A. — Documento Confidencial
            </span>
          </div>
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2: DRE OVERVIEW — table left + bar chart right (Genspark p2)
// ═══════════════════════════════════════════════════════════════════════

function OverviewSlide({ data, filterSlot }: { data: VariancePptData; filterSlot?: React.ReactNode }) {
  const a1Label = String(data.a1Year);
  const margemCalc = data.calcRows.find(c => c.label === 'MARGEM DE CONTRIBUICAO') || data.calcRows.find(c => c.label.includes('MARGEM'));
  const ebitdaSrCalc = data.calcRows.find(c => c.label.includes('S/ RATEIO'));
  const ebitdaTotalCalc = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  type RowEntry = { type: 'section'; section: VariancePptSection } | { type: 'calc'; calc: VariancePptCalcRow; bg: string; textColor?: string };
  const entries: RowEntry[] = [];

  const CALC_STYLES = {
    margem:      { bg: 'FEF3C7', text: '92400E' },
    ebitdaSr:    { bg: 'E5E7EB', text: '1F2937' },
    ebitdaTotal: { bg: '1E3A8A', text: 'FFFFFF' },
  };

  for (const section of data.sections) {
    entries.push({ type: 'section', section });
    if (section.tag0.startsWith('03.') && margemCalc)
      entries.push({ type: 'calc', calc: margemCalc, bg: CALC_STYLES.margem.bg, textColor: CALC_STYLES.margem.text });
    if (section.tag0.startsWith('04.') && ebitdaSrCalc)
      entries.push({ type: 'calc', calc: ebitdaSrCalc, bg: CALC_STYLES.ebitdaSr.bg, textColor: CALC_STYLES.ebitdaSr.text });
  }
  if (ebitdaTotalCalc)
    entries.push({ type: 'calc', calc: ebitdaTotalCalc, bg: CALC_STYLES.ebitdaTotal.bg, textColor: CALC_STYLES.ebitdaTotal.text });

  const ebitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  // Bar chart: sections + EBITDA
  const allRaw = data.sections.flatMap(s => [Math.abs(s.node.real), Math.abs(s.node.orcCompare)]);
  if (ebitda) allRaw.push(Math.abs(ebitda.real), Math.abs(ebitda.orcado));
  const unit = detectScale(...allRaw);

  const chartLabels = [
    ...data.sections.map(s => s.label.replace(/^\d+\.\s*/, '').slice(0, 12)),
    ...(ebitda ? ['EBITDA'] : []),
  ];
  const realV = [
    ...data.sections.map(s => Math.abs(toChartVal(s.node.real, unit))),
    ...(ebitda ? [Math.abs(toChartVal(ebitda.real, unit))] : []),
  ];
  const orcV = [
    ...data.sections.map(s => Math.abs(toChartVal(s.node.orcCompare, unit))),
    ...(ebitda ? [Math.abs(toChartVal(ebitda.orcado, unit))] : []),
  ];
  const overviewVarPcts = [
    ...data.sections.map(s => s.node.orcVarPct),
    ...(ebitda ? [ebitda.deltaOrcPct] : []),
  ];
  const overviewVarAbs = [
    ...data.sections.map(s => s.node.real - s.node.orcCompare),
    ...(ebitda ? [ebitda.real - ebitda.orcado] : []),
  ];

  // Phantom heights: max(real, orc) so variance label appears above both bars
  const phantomV = realV.map((r, i) => Math.max(r, orcV[i]));

  const chartOption = {
    grid: { left: 8, right: 8, top: 62, bottom: 46 },
    xAxis: {
      type: 'category' as const,
      data: chartLabels,
      axisLabel: { fontSize: 9, fontWeight: 700, color: '#374151', interval: 0, overflow: 'truncate' as const, width: 64 },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
    legend: {
      bottom: 2,
      data: [`Real ${data.year}`, 'Orçado'],
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { fontSize: 9, color: '#6B7280', fontWeight: 600 },
    },
    series: [
      {
        name: `Real ${data.year}`,
        type: 'bar' as const,
        data: realV,
        barMaxWidth: 28,
        barGap: '15%',
        itemStyle: { color: '#2563EB', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 8,
          fontWeight: 700,
          color: '#2563EB',
        },
      },
      {
        // Phantom series: invisible bar centered between Real and Orçado, carries variance label
        name: '__var__',
        type: 'bar' as const,
        data: phantomV,
        barWidth: 1,
        silent: true,
        itemStyle: { color: 'transparent', borderRadius: 0 },
        label: {
          show: true,
          position: 'top' as const,
          offset: [0, -4],
          formatter: (p: any) => {
            const idx = p.dataIndex;
            const pct = overviewVarPcts[idx];
            const abs = overviewVarAbs[idx];
            if (pct === null || pct === undefined) return '';
            const fav = pct >= 0;
            const tag = fav ? 'pos' : 'neg';
            const sign = pct >= 0 ? '+' : '';
            const absLabel = `${sign}${fmtChartLabel(toChartVal(abs, unit), unit)}`;
            const pctLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
            return `{${tag}|${absLabel} | ${pctLabel}}`;
          },
          rich: {
            pos: { fontSize: 7, fontWeight: 800, color: '#16A34A', lineHeight: 13 },
            neg: { fontSize: 7, fontWeight: 800, color: '#DC2626', lineHeight: 13 },
          },
        },
      },
      {
        name: 'Orçado',
        type: 'bar' as const,
        data: orcV,
        barMaxWidth: 28,
        itemStyle: { color: '#D1D5DB', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 7,
          color: '#9CA3AF',
          fontWeight: 600,
        },
      },
    ],
  };

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel="BOOK DE RESULTADOS"
        title="DRE – Visão Geral (Snapshot)"
        monthShort={data.monthShort}
        unitLabel="MILHARES (R$)"
        filterSlot={filterSlot}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left: DRE table */}
        <div className="w-[50%] shrink-0 overflow-hidden px-3 pt-3 border-r border-gray-100">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Detalhamento (R$ Milhares)
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="text-left px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">DESCRIÇÃO</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">REAL</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">ORÇADO</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">Δ R$</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">VAR %</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                if (entry.type === 'section') {
                  const { section } = entry;
                  return (
                    <tr key={idx} className="border-b border-gray-50 bg-white">
                      <td className="px-1.5 py-1 text-[10px] font-medium text-gray-800 truncate max-w-0" style={{ width: '40%' }}>{section.tag0}</td>
                      <td className="text-right px-1.5 py-1 text-[10px] font-semibold text-gray-800 tabular-nums">{fmtK(section.node.real)}</td>
                      <td className="text-right px-1.5 py-1 text-[10px] text-gray-500 tabular-nums">{fmtK(section.node.orcCompare)}</td>
                      <td className="text-right px-1.5 py-1 text-[10px] font-semibold tabular-nums" style={{ color: deltaColor(section.node.orcVarPct) }}>
                        {(() => { const v = section.node.real - section.node.orcCompare; return (v >= 0 ? '+' : '') + fmtK(v); })()}
                      </td>
                      <td className="text-right px-1.5 py-1">
                        <VarBadge pct={section.node.orcVarPct} />
                      </td>
                    </tr>
                  );
                } else {
                  const { calc, bg, textColor } = entry;
                  const baseColor = textColor ? `#${textColor}` : '#111827';
                  const isDark = bg === '1E3A8A' || bg === '374151';
                  return (
                    <tr key={idx} className="border-b border-gray-200" style={{ backgroundColor: `#${bg}` }}>
                      <td className="px-1.5 py-1.5 text-[10px] font-extrabold truncate max-w-0" style={{ color: baseColor, width: '40%' }}>{calc.label}</td>
                      <td className="text-right px-1.5 py-1.5 text-[10px] font-extrabold tabular-nums" style={{ color: baseColor }}>{fmtK(calc.real)}</td>
                      <td className="text-right px-1.5 py-1.5 text-[10px] tabular-nums" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : baseColor }}>{fmtK(calc.orcado)}</td>
                      <td className="text-right px-1.5 py-1.5 text-[10px] font-bold tabular-nums">
                        {(() => {
                          const v = calc.real - calc.orcado;
                          const clr = isDark
                            ? (v >= 0 ? '#86EFAC' : '#FCA5A5')
                            : deltaColor(calc.deltaOrcPct);
                          return <span style={{ color: clr }}>{v >= 0 ? '+' : ''}{fmtK(v)}</span>;
                        })()}
                      </td>
                      <td className="text-right px-1.5 py-1.5">
                        {isDark ? (
                          <span className="text-[9px] font-bold tabular-nums" style={{ color: (calc.deltaOrcPct ?? 0) >= 0 ? '#86EFAC' : '#FCA5A5' }}>
                            {fmtPct(calc.deltaOrcPct)}
                          </span>
                        ) : (
                          <VarBadge pct={calc.deltaOrcPct} />
                        )}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-green-500" />
              <span className="text-[9px] text-gray-500">Variação Favorável</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-red-500" />
              <span className="text-[9px] text-gray-500">Variação Desfavorável</span>
            </div>
          </div>
        </div>

        {/* Right: Bar chart */}
        <div className="flex-1 min-w-0 flex flex-col px-3 pt-3">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
            COMPARATIVO: REAL VS ORÇADO (R$)
          </div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={chartOption} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 2 }} />
          </div>
        </div>
      </div>
      <SlideFooter page={2} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE: SECTION — Left insight cards + right bar chart (Genspark p4-p6)
// ═══════════════════════════════════════════════════════════════════════

function SectionSlide({ section, data, pageNum, filterSlot }: { section: VariancePptSection; data: VariancePptData; pageNum?: number; filterSlot?: React.ReactNode }) {
  if (section.tag01Nodes.length === 0) return null;

  const [popup, setPopup] = React.useState<{ title: string; text: string; accent: string } | null>(null);

  const { node } = section;
  const insightText = node.enrichedInsight || node.orcAiSummary || '';

  // Find worst deviator and biggest component for insight cards
  // Sort by most unfavorable first (most negative varPct = worst)
  const sortedByDev = [...section.tag01Nodes].sort((a, b) => {
    return (a.orcVarPct ?? 0) - (b.orcVarPct ?? 0);
  });
  const worstNode = sortedByDev[0];
  const biggestNode = [...section.tag01Nodes].sort((a, b) => Math.abs(b.real) - Math.abs(a.real))[0];
  const totalRealAbs = section.tag01Nodes.reduce((s, n) => s + Math.abs(n.real), 0);
  const biggestRep = totalRealAbs > 0 ? Math.round((Math.abs(biggestNode.real) / totalRealAbs) * 100) : 0;

  // Worst card style
  const worstFav = (worstNode?.orcVarPct ?? 0) >= 0;
  const worstBg = worstFav ? '#F0FDF4' : '#FFF5F5';
  const worstAccent = worstFav ? '#16A34A' : '#DC2626';
  const worstBorder = worstFav ? '#BBF7D0' : '#FECACA';
  const worstType = worstFav ? 'DESTAQUE' : 'PONTO DE ATENÇÃO';

  // Custom sort orders por seção
  const RECEITA_ORDER       = ['mensalidade', 'material', 'integral', 'extras', 'tributo'];
  const CUSTOS_FIXOS_ORDER  = ['folha', 'professor', 'material did', 'consumo', 'concess', 'alimenta'];

  const getSortOrder = (label: string, order: string[]) => {
    const l = label.toLowerCase();
    const i = order.findIndex(k => l.includes(k));
    return i === -1 ? 999 : i;
  };

  const sortedNodes = section.tag0.startsWith('01.')
    ? [...section.tag01Nodes].sort((a, b) =>
        getSortOrder(a.label, RECEITA_ORDER) - getSortOrder(b.label, RECEITA_ORDER))
    : section.tag0.startsWith('02.')
    ? [...section.tag01Nodes].sort((a, b) =>
        getSortOrder(a.label, CUSTOS_FIXOS_ORDER) - getSortOrder(b.label, CUSTOS_FIXOS_ORDER))
    : [...section.tag01Nodes].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));

  const allRaw = sortedNodes.flatMap(n => [Math.abs(n.real), Math.abs(n.orcCompare)]);
  const unit = detectScale(...allRaw);
  const labels = sortedNodes.map(n => n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label);
  const realV = sortedNodes.map(n => Math.abs(toChartVal(n.real, unit)));
  const orcV = sortedNodes.map(n => Math.abs(toChartVal(n.orcCompare, unit)));
  const sectionVarPcts = sortedNodes.map(n => n.orcVarPct);
  const sectionVarAbs = sortedNodes.map(n => n.real - n.orcCompare);

  const accentClr = `#${section.sectionColor}`;
  const isRateio = section.label.toUpperCase().includes('RATEIO');

  // ── RZ DRE table (apenas para seção Rateio) ──────────────────────────
  // Computed in variancePptDataService from items filtered to marca=RZ, sem 06.
  type RzRow = { type: 'section' | 't01' | 'calc'; label: string; real: number; orc: number; a1: number; orcPct: number | null; a1Pct: number | null };
  const rzTableRows: RzRow[] = isRateio && data.rzDre
    ? data.rzDre.map(r => ({ ...r }))
    : [];

  // Phantom heights: max(real, orc) so variance label appears above both bars
  const sectionPhantomV = realV.map((r, i) => Math.max(r, orcV[i]));

  const chartOption = {
    grid: { left: 8, right: 8, top: 72, bottom: 46 },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontSize: 9, fontWeight: 700, color: '#374151', interval: 0, overflow: 'truncate' as const, width: 68 },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
    legend: {
      bottom: 2,
      data: [`Real ${data.year}`, 'Orçado'],
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { fontSize: 9, color: '#6B7280' },
    },
    series: [
      {
        name: `Real ${data.year}`,
        type: 'bar' as const,
        data: realV,
        barMaxWidth: 32,
        barGap: '15%',
        itemStyle: { color: accentClr, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'inside' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 8,
          fontWeight: 700,
          color: '#fff',
        },
      },
      {
        // Phantom: invisible bar, carries 2-line variance label (R$ + %)
        name: '__var__',
        type: 'bar' as const,
        data: sectionPhantomV,
        barWidth: 1,
        silent: true,
        itemStyle: { color: 'transparent', borderRadius: 0 },
        label: {
          show: true,
          position: 'top' as const,
          offset: [0, -4],
          formatter: (p: any) => {
            const idx = p.dataIndex;
            const pct = sectionVarPcts[idx];
            const abs = sectionVarAbs[idx];
            if (pct === null || pct === undefined) return '';
            const tag = pct >= 0 ? 'pos' : 'neg';
            const sign = pct >= 0 ? '+' : '';
            const absLabel = `${sign}${fmtChartLabel(toChartVal(abs, unit), unit)}`;
            const pctLabel = `${sign}${pct.toFixed(1)}%`;
            return `{${tag}|${absLabel}}\n{${tag}2|${pctLabel}}`;
          },
          rich: {
            pos:  { fontSize: 8, fontWeight: 800, color: '#34D399', lineHeight: 14 },
            neg:  { fontSize: 8, fontWeight: 800, color: '#FB7185', lineHeight: 14 },
            pos2: { fontSize: 7, fontWeight: 700, color: '#34D399', lineHeight: 13 },
            neg2: { fontSize: 7, fontWeight: 700, color: '#FB7185', lineHeight: 13 },
          },
        },
      },
      {
        name: 'Orçado',
        type: 'bar' as const,
        data: orcV,
        barMaxWidth: 32,
        itemStyle: { color: '#D1D5DB', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'inside' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 7,
          color: '#6B7280',
          fontWeight: 600,
        },
      },
    ],
  };

  return (
    <>
    {popup && <InsightPopup title={popup.title} text={popup.text} accent={popup.accent} onClose={() => setPopup(null)} />}
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={`${section.label} – Análise de Componentes`}
        monthShort={data.monthShort}
        color={section.sectionColor}
        filterSlot={filterSlot}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left panel: insight cards */}
        <div className="w-[36%] shrink-0 flex flex-col gap-2.5 px-4 py-3 border-r border-gray-100">

          {/* Card 1: Destaque / Ponto de Atenção */}
          {worstNode && (() => {
            const worstText = cleanInsight(worstNode.orcAiSummary || worstNode.orcJustification || '');
            const hasText = worstText.length > 0;
            const isLong = worstText.length > 160;
            const preview = isLong ? worstText.slice(0, 160).trimEnd() + '…' : worstText;
            return (
              <div
                className="rounded-xl p-3 border flex flex-col gap-2 cursor-pointer transition-shadow hover:shadow-md"
                style={{ backgroundColor: worstBg, borderColor: worstBorder }}
                onClick={() => hasText && setPopup({ title: worstNode.label, text: worstText, accent: worstAccent })}
                title={hasText ? 'Clique para ler a análise completa' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ color: worstAccent, backgroundColor: `${worstAccent}18` }}>
                    {worstType}
                  </span>
                  <span className="text-[18px] font-black tabular-nums leading-none" style={{ color: worstAccent }}>
                    {fmtPct(worstNode.orcVarPct)}
                  </span>
                </div>
                <div className="text-[12px] font-black leading-tight" style={{ color: worstAccent }}>
                  {truncate(worstNode.label, 28)}
                </div>
                <div className="text-[8px] text-gray-400 -mt-1">vs Orçado</div>
                {hasText && (
                  <p className="text-[9px] leading-snug text-gray-500">
                    {preview}
                    {isLong && (
                      <button className="ml-1 text-[8px] font-semibold underline underline-offset-1 bg-transparent border-none p-0 cursor-pointer"
                        style={{ color: worstAccent }}
                        onClick={e => { e.stopPropagation(); setPopup({ title: worstNode.label, text: worstText, accent: worstAccent }); }}>
                        ver mais →
                      </button>
                    )}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Card 2: Maior componente */}
          {biggestNode && biggestNode !== worstNode ? (() => {
            const bigText = cleanInsight(biggestNode.orcAiSummary || biggestNode.orcJustification || '');
            const hasText = bigText.length > 0;
            const isLong = bigText.length > 160;
            const preview = isLong ? bigText.slice(0, 160).trimEnd() + '…' : bigText;
            return (
              <div
                className="rounded-xl p-3 border border-blue-100 bg-blue-50/70 flex flex-col gap-2 cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => hasText && setPopup({ title: biggestNode.label, text: bigText, accent: '#1D4ED8' })}
                title={hasText ? 'Clique para ler a análise completa' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full text-blue-600 bg-blue-100">
                    MAIOR COMPONENTE
                  </span>
                  <span className="text-[18px] font-black tabular-nums leading-none text-blue-700">
                    {biggestRep}%
                  </span>
                </div>
                <div className="text-[12px] font-black leading-tight text-blue-800">
                  {truncate(biggestNode.label, 28)}
                </div>
                <div className="text-[8px] text-gray-400 -mt-1">do total da seção</div>
                {hasText && (
                  <p className="text-[9px] leading-snug text-gray-500">
                    {preview}
                    {isLong && (
                      <button className="ml-1 text-[8px] font-semibold underline underline-offset-1 bg-transparent border-none p-0 cursor-pointer text-blue-600"
                        onClick={e => { e.stopPropagation(); setPopup({ title: biggestNode.label, text: bigText, accent: '#1D4ED8' }); }}>
                        ver mais →
                      </button>
                    )}
                  </p>
                )}
              </div>
            );
          })() : insightText ? (
            <InsightsBox
              text={insightText}
              compact
              onExpand={() => setPopup({ title: section.label, text: cleanInsight(insightText), accent: accentClr })}
            />
          ) : null}

          {/* Spacer + Legend */}
          <div className="mt-auto pt-1 shrink-0">
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: accentClr }} />
                <span className="text-[9px] text-gray-500">Real {data.year}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 rounded-sm bg-gray-300" />
                <span className="text-[9px] text-gray-500">Orçado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Chart ou DRE RZ */}
        {isRateio ? (
          <div className="flex-1 min-w-0 flex flex-col px-3 pt-3 overflow-hidden">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 shrink-0 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              DRE MARCA RZ (R$ Milhares)
            </div>
            <div className="overflow-hidden">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '26%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th className="text-left px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">DESCRIÇÃO</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">REAL</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">ORC</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">Δ ORC</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">%ORC</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">A-1</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">Δ A-1</th>
                    <th className="text-right px-1 py-0.5 font-bold text-[8px] text-gray-500 border-b border-gray-200">%A-1</th>
                  </tr>
                </thead>
                <tbody>
                  {rzTableRows.map((row, idx) => {
                    const deltaOrc = row.real - row.orc;
                    const deltaA1  = row.real - row.a1;
                    const isSection = row.type === 'section';
                    const isCalc    = row.type === 'calc';
                    const isT01     = row.type === 't01';
                    const bg = isCalc ? '#1E3A8A' : isSection ? '#F3F4F6' : 'white';
                    const textClr = isCalc ? 'white' : '#374151';
                    const fw = isSection || isCalc ? 700 : 400;
                    return (
                      <tr key={idx} className="border-b border-gray-50" style={{ backgroundColor: bg }}>
                        <td
                          className="px-1 py-0.5 text-[8.5px] truncate"
                          style={{ color: textClr, fontWeight: fw, paddingLeft: isT01 ? 12 : undefined }}
                          title={row.label}
                        >
                          {isT01 ? '↳ ' : ''}{row.label}
                        </td>
                        <td className="text-right px-1 py-0.5 text-[8.5px] tabular-nums" style={{ color: textClr, fontWeight: fw }}>
                          {fmtK(row.real)}
                        </td>
                        <td className="text-right px-1 py-0.5 text-[8.5px] tabular-nums" style={{ color: isCalc ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                          {fmtK(row.orc)}
                        </td>
                        <td className="text-right px-1 py-0.5 text-[8.5px] tabular-nums font-semibold">
                          <span style={{ color: isCalc ? (deltaOrc >= 0 ? '#86EFAC' : '#FCA5A5') : deltaColor(row.orcPct) }}>
                            {(deltaOrc >= 0 ? '+' : '') + fmtK(deltaOrc)}
                          </span>
                        </td>
                        <td className="text-right px-1 py-0.5">
                          {isCalc
                            ? <span className="text-[8px] font-bold" style={{ color: (row.orcPct ?? 0) >= 0 ? '#86EFAC' : '#FCA5A5' }}>{fmtPct(row.orcPct)}</span>
                            : <VarBadge pct={row.orcPct} />}
                        </td>
                        <td className="text-right px-1 py-0.5 text-[8.5px] tabular-nums" style={{ color: isCalc ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                          {row.a1 !== 0 ? fmtK(row.a1) : '—'}
                        </td>
                        <td className="text-right px-1 py-0.5 text-[8.5px] tabular-nums font-semibold">
                          {row.a1 !== 0
                            ? <span style={{ color: isCalc ? (deltaA1 >= 0 ? '#86EFAC' : '#FCA5A5') : deltaColor(row.a1Pct) }}>
                                {(deltaA1 >= 0 ? '+' : '') + fmtK(deltaA1)}
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-right px-1 py-0.5">
                          {row.a1 !== 0
                            ? isCalc
                              ? <span className="text-[8px] font-bold" style={{ color: (row.a1Pct ?? 0) >= 0 ? '#86EFAC' : '#FCA5A5' }}>{fmtPct(row.a1Pct)}</span>
                              : <VarBadge pct={row.a1Pct} />
                            : <span className="text-[8px] text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col px-3 pt-3">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
              COMPARATIVO POR COMPONENTE (R$ {scaleLabel(unit)})
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={chartOption} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 2 }} />
            </div>
          </div>
        )}
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL SLIDES (1 per tag0) — full table with justifications
// ═══════════════════════════════════════════════════════════════════════

function DetailSlide({ section, data, page = 0, pageNum }: { section: VariancePptSection; data: VariancePptData; page?: number; pageNum?: number }) {
  type DetailRow = { depth: number; label: string; real: number; orc: number; varPct: number | null; justText: string; status: string };
  const allRows: DetailRow[] = [];

  for (const t01 of section.tag01Nodes) {
    allRows.push({ depth: 0, label: t01.label, real: t01.real, orc: t01.orcCompare, varPct: t01.orcVarPct, justText: t01.orcAiSummary || '', status: t01.orcStatus });
    for (const t02 of t01.children) {
      allRows.push({ depth: 1, label: t02.label, real: t02.real, orc: t02.orcCompare, varPct: t02.orcVarPct, justText: t02.orcAiSummary || '', status: t02.orcStatus });
      for (const marca of t02.children) {
        allRows.push({ depth: 2, label: marca.label, real: marca.real, orc: marca.orcCompare, varPct: marca.orcVarPct, justText: marca.orcJustification || marca.orcAiSummary || '', status: marca.orcStatus });
      }
    }
  }

  if (allRows.length === 0) return null;

  const ROWS_PER_PAGE = 14;
  const start = page * ROWS_PER_PAGE;
  const displayRows = allRows.slice(start, start + ROWS_PER_PAGE);
  const totalPages = Math.ceil(allRows.length / ROWS_PER_PAGE);
  const pageLabel = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';

  if (displayRows.length === 0) return null;

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={`${section.label} — Detalhamento${pageLabel}`}
        monthShort={data.monthShort}
        color={section.sectionColor}
      />
      <div className="p-4 pb-8 overflow-hidden" style={{ height: 'calc(100% - 52px)' }}>
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '47%' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th className="text-left px-2 py-2 font-bold text-[10px] text-gray-600 border-b border-gray-200">CONTA</th>
              <th className="text-right px-2 py-2 font-bold text-[10px] text-gray-600 border-b border-gray-200">REAL</th>
              <th className="text-right px-2 py-2 font-bold text-[10px] text-gray-600 border-b border-gray-200">ORC</th>
              <th className="text-right px-2 py-2 font-bold text-[10px] text-gray-600 border-b border-gray-200">Δ%</th>
              <th className="text-left px-2 py-2 font-bold text-[10px] text-gray-600 border-b border-gray-200">JUSTIFICATIVA / SÍNTESE</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const indent = row.depth === 0 ? '' : row.depth === 1 ? '↳ ' : '\u00A0\u00A0↳ ';
              const isBold = row.depth === 0;
              const isMarca = row.depth === 2;
              const textColor = isMarca ? '#EA580C' : row.depth <= 1 ? hex(C.darkText) : hex(C.mutedText);
              const rowBg = row.depth === 0 ? '#FAFAFA' : 'white';
              return (
                <tr key={idx} className="border-b border-gray-50" style={{ backgroundColor: rowBg }}>
                  <td className="px-2 py-1 truncate text-[11px]" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }} title={row.label}>{indent}{row.label}</td>
                  <td className="text-right px-2 py-1 text-[11px] tabular-nums" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }}>{fmtK(row.real)}</td>
                  <td className="text-right px-2 py-1 text-[11px] tabular-nums text-gray-500">{fmtK(row.orc)}</td>
                  <td className="text-right px-2 py-1">
                    <VarBadge pct={row.varPct} />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-start gap-1">
                      {row.status && (
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: statusColor(row.status) }} />
                      )}
                      <span
                        style={{ color: row.justText ? hex(C.darkText) : hex(C.mutedText) }}
                        className="text-[10px] leading-tight line-clamp-2 break-words"
                      >
                        {row.justText || '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

function getDetailPageCount(section: VariancePptSection): number {
  let count = 0;
  for (const t01 of section.tag01Nodes) {
    count++;
    for (const t02 of t01.children) {
      count++;
      count += t02.children.length;
    }
  }
  return Math.max(1, Math.ceil(count / 14));
}

// ═══════════════════════════════════════════════════════════════════════
// MARCA BREAKDOWN SLIDE (ECharts bar chart per marca)
// ═══════════════════════════════════════════════════════════════════════

function MarcaSlide({
  section,
  data,
  entries,
  pageNum,
  filterSlot,
}: {
  section: VariancePptSection;
  data: VariancePptData;
  entries: VariancePptMarcaEntry[];
  pageNum?: number;
  filterSlot?: React.ReactNode;
}) {
  if (entries.length === 0) return null;

  const filtered = entries.filter(e => e.marca !== 'RZ');
  if (filtered.length === 0) return null;

  const totalReal = filtered.reduce((s, e) => s + e.real, 0);
  const totalOrc = filtered.reduce((s, e) => s + e.orcado, 0);
  const deltaAbs = totalReal - totalOrc;
  const deltaPct = totalOrc !== 0 ? Math.round(((totalReal - totalOrc) / Math.abs(totalOrc)) * 1000) / 10 : null;
  const favorable = deltaPct !== null && deltaPct >= 0;

  const allRaw = filtered.flatMap(e => [e.real, e.orcado, e.a1]);
  const unit = detectScale(totalReal, totalOrc, ...allRaw);
  const suffix = scaleSuffix(unit);

  const labels = filtered.map(e => e.marca);
  const realV = filtered.map(e => Math.abs(toChartVal(e.real, unit)));
  const orcV = filtered.map(e => Math.abs(toChartVal(e.orcado, unit)));
  const a1V = filtered.map(e => Math.abs(toChartVal(e.a1, unit)));

  const totalA1 = filtered.reduce((s, e) => s + e.a1, 0);
  const deltaA1Abs = totalReal - totalA1;
  const deltaA1Pct = totalA1 !== 0 ? Math.round(((totalReal - totalA1) / Math.abs(totalA1)) * 1000) / 10 : null;

  const marcaDeltas = filtered.map(e => {
    const dOrc = e.orcado !== 0 ? Math.round(((e.real - e.orcado) / Math.abs(e.orcado)) * 1000) / 10 : null;
    const dA1 = e.a1 !== 0 ? Math.round(((e.real - e.a1) / Math.abs(e.a1)) * 1000) / 10 : null;
    return { orcAbs: e.real - e.orcado, orcPct: dOrc, a1Abs: e.real - e.a1, a1Pct: dA1 };
  });

  const [popup, setPopup] = React.useState<{ text: string; accent: string } | null>(null);
  const accentClr = `#${section.sectionColor}`;
  const aiText = section.node.enrichedInsight || section.node.orcAiSummary || '';

  // Phantom: posicionado no máximo das 3 barras → label de Δ% aparece acima de tudo
  const phantomV = realV.map((r, i) => Math.max(r, orcV[i], a1V[i]));

  const chartOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, textStyle: { fontSize: 10 } },
    legend: {
      bottom: 0, itemWidth: 12, itemHeight: 8,
      data: [`Real ${data.year}`, 'Orçado', String(data.a1Year)],
      textStyle: { fontSize: 9, fontWeight: 600, color: '#374151' },
    },
    grid: { left: 6, right: 6, top: 68, bottom: 48 },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontSize: 9, fontWeight: 700, color: '#374151' },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
    series: [
      {
        name: `Real ${data.year}`,
        type: 'bar' as const,
        data: realV,
        barMaxWidth: 100,
        barGap: '6%',
        barCategoryGap: '12%',
        itemStyle: { color: accentClr, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true, position: 'inside' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 9, fontWeight: 700, color: 'white',
        },
      },
      {
        // Phantom: 2 linhas de variação acima de tudo (sem seta, sem R$)
        name: '__delta__',
        type: 'bar' as const,
        data: phantomV,
        barWidth: 1,
        silent: true,
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'top' as const,
          offset: [0, -4],
          formatter: (p: any) => {
            const d = marcaDeltas[p.dataIndex];
            // Linha 1: vs Orçado
            const orcFav = (d.orcPct ?? 0) >= 0;
            const orcAbs = `${orcFav ? '+' : ''}${fmtChartLabel(toChartVal(d.orcAbs, unit), unit)}`;
            const orcPct = d.orcPct !== null ? ` ${d.orcPct >= 0 ? '+' : ''}${d.orcPct.toFixed(1)}% Orç` : '';
            const line1 = `{${orcFav ? 'pos' : 'neg'}|${orcAbs}${orcPct}}`;
            // Linha 2: vs A-1
            const a1Fav = (d.a1Pct ?? 0) >= 0;
            const a1Abs = `${a1Fav ? '+' : ''}${fmtChartLabel(toChartVal(d.a1Abs, unit), unit)}`;
            const a1Pct = d.a1Pct !== null ? ` ${d.a1Pct >= 0 ? '+' : ''}${d.a1Pct.toFixed(1)}% A-1` : '';
            const line2 = `{${a1Fav ? 'posA1' : 'negA1'}|${a1Abs}${a1Pct}}`;
            return `${line1}\n${line2}`;
          },
          rich: {
            pos:   { fontSize: 8, fontWeight: 800, color: '#34D399', lineHeight: 14 },
            neg:   { fontSize: 8, fontWeight: 800, color: '#FB7185', lineHeight: 14 },
            posA1: { fontSize: 7, fontWeight: 700, color: '#34D399', lineHeight: 13 },
            negA1: { fontSize: 7, fontWeight: 700, color: '#FB7185', lineHeight: 13 },
          },
        },
      },
      {
        name: 'Orçado',
        type: 'bar' as const,
        data: orcV,
        barMaxWidth: 100,
        itemStyle: { color: '#D1D5DB', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true, position: 'inside' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 8, color: '#4B5563', fontWeight: 600,
        },
      },
      {
        name: String(data.a1Year),
        type: 'bar' as const,
        data: a1V,
        barMaxWidth: 100,
        itemStyle: { color: hex(C.teal), borderRadius: [3, 3, 0, 0] },
        label: {
          show: true, position: 'inside' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 8, color: 'white', fontWeight: 600,
        },
      },
    ],
  };

  return (
    <>
    {popup && (
      <InsightPopup
        title={`${section.label} por Marca`}
        text={popup.text}
        accent={accentClr}
        onClose={() => setPopup(null)}
      />
    )}
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={`${section.label} por Marca`}
        monthShort={data.monthShort}
        color={section.sectionColor}
        unitLabel={scaleLabel(unit)}
        filterSlot={filterSlot}
      />
      <div className="flex flex-col px-4 pt-2 pb-7 gap-2" style={{ height: 'calc(100% - 52px)' }}>

        {/* KPIs em linha — 4 cards compactos full-width */}
        <div className="grid grid-cols-4 gap-2 shrink-0">
          <div className="rounded-lg p-2 border border-gray-100 bg-gray-50">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TOTAL REAL</div>
            <div className="text-[13px] font-black tabular-nums" style={{ color: accentClr }}>
              {fmtScaled(Math.abs(totalReal), unit)}<span className="text-[9px] font-bold ml-0.5 text-gray-400">{suffix}</span>
            </div>
          </div>
          <div className="rounded-lg p-2 border border-gray-100 bg-gray-50">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TOTAL ORÇADO</div>
            <div className="text-[13px] font-black tabular-nums text-gray-500">
              {fmtScaled(Math.abs(totalOrc), unit)}<span className="text-[9px] font-bold ml-0.5 text-gray-400">{suffix}</span>
            </div>
          </div>
          <div className="rounded-lg p-2 border" style={{ borderColor: favorable ? '#BBF7D0' : '#FECACA', backgroundColor: favorable ? '#F0FDF4' : '#FFF5F5' }}>
            <div className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: favorable ? '#16A34A' : '#DC2626' }}>
              {deltaAbs >= 0 ? 'ECONOMIA' : 'DESVIO'} vs ORC
            </div>
            <div className="text-[13px] font-black tabular-nums" style={{ color: favorable ? '#16A34A' : '#DC2626' }}>
              {fmtPct(deltaPct)}
              <span className="text-[8px] font-semibold ml-1" style={{ color: favorable ? '#16A34A' : '#DC2626' }}>
                {fmtScaled(Math.abs(deltaAbs), unit)}{suffix}
              </span>
            </div>
          </div>
          <div className="rounded-lg p-2 border border-gray-100 bg-gray-50">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              {deltaA1Abs >= 0 ? 'ECON.' : 'DESVIO'} vs {data.a1Year}
            </div>
            <div className="text-[13px] font-black tabular-nums" style={{ color: deltaColor(deltaA1Pct) }}>
              {fmtPct(deltaA1Pct)}
              <span className="text-[8px] font-semibold ml-1 text-gray-400">
                {fmtScaled(Math.abs(deltaA1Abs), unit)}{suffix}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico full-width */}
        <div className="flex-1 min-h-0">
          <ReactECharts option={chartOption} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 2 }} />
        </div>

        {/* SÍNTESE IA — faixa horizontal na base, clicável */}
        {aiText && (
          <div
            className="shrink-0 flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer border transition-shadow hover:shadow-md"
            style={{ backgroundColor: `${accentClr}0D`, borderColor: `${accentClr}30`, borderLeft: `3px solid ${accentClr}` }}
            onClick={() => setPopup({ text: cleanInsight(aiText), accent: accentClr })}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentClr }} />
              <span className="text-[9px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: accentClr }}>SÍNTESE IA</span>
            </div>
            <p className="text-[10px] leading-snug text-gray-700 flex-1 min-w-0 overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
              {cleanInsight(aiText)}
            </p>
            <span className="text-[8px] font-semibold shrink-0" style={{ color: accentClr }}>ver mais →</span>
          </div>
        )}
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PERFORMANCE SLIDE — Horizontal bar chart + Entendendo os Desvios (Genspark p3)
// ═══════════════════════════════════════════════════════════════════════

function PerformanceSlide({ data, pageNum, filterSlot }: { data: VariancePptData; pageNum?: number; filterSlot?: React.ReactNode }) {
  const margemCalc    = data.calcRows.find(c => c.label.includes('MARGEM'));
  const ebitdaSrCalc  = data.calcRows.find(c => c.label.includes('S/ RATEIO') || c.label.includes('SEM RATEIO'));
  const ebitdaTotalCalc = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  // Build ordered rows: sections interleaved with calc rows (same order as DRE)
  type PerfRow = { label: string; varPct: number | null; favorable: boolean; isCalc: boolean };
  const rows: PerfRow[] = [];

  for (const section of data.sections) {
    const pct = section.node.orcVarPct;
    const fav = (pct ?? 0) >= 0;
    rows.push({ label: section.label.replace(/^\d+\.\s*/, ''), varPct: pct, favorable: fav, isCalc: false });

    if (section.tag0.startsWith('03.') && margemCalc) {
      const p = margemCalc.deltaOrcPct;
      rows.push({ label: 'Margem Contrib.', varPct: p, favorable: (p ?? 0) >= 0, isCalc: true });
    }
    if (section.tag0.startsWith('04.') && ebitdaSrCalc) {
      const p = ebitdaSrCalc.deltaOrcPct;
      rows.push({ label: 'EBITDA S/ Rateio', varPct: p, favorable: (p ?? 0) >= 0, isCalc: true });
    }
  }
  if (ebitdaTotalCalc) {
    const p = ebitdaTotalCalc.deltaOrcPct;
    rows.push({ label: 'EBITDA Total', varPct: p, favorable: (p ?? 0) >= 0, isCalc: true });
  }

  // Best (biggest favorable) and worst (biggest unfavorable) for right panel
  const favorable  = rows.filter(r => r.favorable).sort((a, b) => Math.abs(b.varPct ?? 0) - Math.abs(a.varPct ?? 0));
  const unfavorable = rows.filter(r => !r.favorable).sort((a, b) => Math.abs(b.varPct ?? 0) - Math.abs(a.varPct ?? 0));
  const bestRow  = favorable[0];
  const worstRow = unfavorable[0];

  // ECharts horizontal bar — per-item color + label position
  const chartData = rows.map(r => {
    const v = r.varPct ?? 0;
    return {
      value: v,
      itemStyle: {
        color: r.favorable ? '#16A34A' : '#DC2626',
        borderRadius: v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3],
      },
      label: {
        show: true,
        position: v >= 0 ? ('right' as const) : ('left' as const),
        distance: 4,
        fontSize: 10,
        fontWeight: 700,
        color: r.favorable ? '#16A34A' : '#DC2626',
        formatter: () => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      },
    };
  });

  const chartOption = {
    grid: { left: 110, right: 60, top: 12, bottom: 36 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 9, color: '#9CA3AF', formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' as const } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category' as const,
      data: rows.map(r => r.label),
      inverse: true,
      axisLabel: {
        fontSize: 10,
        fontWeight: 600,
        color: '#374151',
        width: 100,
        overflow: 'truncate' as const,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        data: chartData,
        barMaxWidth: 22,
      },
    ],
  };

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel="ANÁLISE DE DESVIOS"
        title="Performance vs Orçado"
        monthShort={data.monthShort}
        filterSlot={filterSlot}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left: horizontal bar chart */}
        <div className="flex-1 min-w-0 flex flex-col px-4 pt-3 border-r border-gray-100">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
            VARIAÇÃO PERCENTUAL (REAL VS ORÇADO)
          </div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={chartOption} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 2 }} />
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 shrink-0 pb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[9px] text-gray-500">Desvio Favorável (Melhor que Orçado)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[9px] text-gray-500">Desvio Desfavorável (Pior que Orçado)</span>
            </div>
          </div>
        </div>

        {/* Right: interpretation panel */}
        <div className="w-72 shrink-0 flex flex-col px-5 pt-4 gap-3">
          <div className="text-[17px] font-black text-gray-900 border-b border-gray-100 pb-3 shrink-0">
            Entendendo os Desvios
          </div>

          {/* Best performer card */}
          {bestRow && (
            <div className="rounded-xl border border-green-100 bg-green-50 p-3.5 flex flex-col gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
                  <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                  <polyline points="16,7 22,7 22,13" />
                </svg>
                <span className="text-[10px] font-bold text-green-700">{bestRow.label}</span>
              </div>
              <div className="text-[26px] font-black text-green-700 leading-none tabular-nums">
                {fmtPct(bestRow.varPct)}
              </div>
              <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
                {bestRow.isCalc
                  ? 'Superou largamente a meta devido à forte contenção de custos.'
                  : 'Desempenho acima do orçado no período.'}
              </p>
            </div>
          )}

          {/* Worst performer card */}
          {worstRow && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 flex flex-col gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                  <polyline points="22,17 13.5,8.5 8.5,13.5 2,7" />
                  <polyline points="16,17 22,17 22,11" />
                </svg>
                <span className="text-[10px] font-bold text-red-700">{worstRow.label}</span>
              </div>
              <div className="text-[26px] font-black text-red-700 leading-none tabular-nums">
                {fmtPct(worstRow.varPct)}
              </div>
              <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
                Único indicador abaixo da meta. Requer atenção e plano de ação.
              </p>
            </div>
          )}

          {/* Regra de Favorabilidade */}
          <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-100">
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              REGRA DE FAVORABILIDADE
            </div>
            <div className="flex items-start gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="shrink-0 mt-0.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              <span className="text-[10px] text-gray-600 leading-snug">
                <strong>Receitas/Margens:</strong> Verde quando MAIOR que o orçado.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="shrink-0 mt-0.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              <span className="text-[10px] text-gray-600 leading-snug">
                <strong>Custos/Despesas:</strong> Verde quando MENOR que o orçado (economia).
              </span>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS SLIDE — DRE Composition Waterfall (Genspark p7)
// ═══════════════════════════════════════════════════════════════════════

function AnalyticsSlide({ data, pageNum, filterSlot }: { data: VariancePptData; pageNum?: number; filterSlot?: React.ReactNode }) {
  const margemCalc   = data.calcRows.find(c => c.label.includes('MARGEM'));
  const ebitdaSrCalc = data.calcRows.find(c => c.label.includes('S/ RATEIO') || c.label.includes('SEM RATEIO'));
  const ebitdaTotal  = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  const receitaSection = data.sections.find(s => s.tag0.startsWith('01.'));
  const receitaReal = receitaSection?.node.real || 0;
  const ebitdaReal  = ebitdaTotal?.real || 0;
  const margemReal  = margemCalc?.real || 0;
  const margemPct   = receitaReal !== 0 ? (margemReal / Math.abs(receitaReal)) * 100 : null;
  const ebitdaMgPct = receitaReal !== 0 ? (ebitdaReal / Math.abs(receitaReal)) * 100 : null;

  // Δ% vs Orçado for each KPI
  const receitaOrcPct = receitaSection?.node.orcVarPct ?? null;
  const margemOrcPct  = margemCalc?.deltaOrcPct ?? null;
  const ebitdaOrcPct  = ebitdaTotal?.deltaOrcPct ?? null;

  const allVals = [
    ...data.sections.map(s => Math.abs(s.node.real)),
    Math.abs(margemReal), Math.abs(ebitdaReal),
  ];
  const unit   = detectScale(...allVals);
  const suffix = scaleSuffix(unit);

  const colorReceita   = '#2563EB';
  const colorCost      = '#94A3B8';
  const colorMilestone = '#10B981';
  const colorFinal     = '#065F46';

  type WfBar = { label: string; base: number; delta: number; connY: number; color: string; rawV: number; isMilestone: boolean };
  const bars: WfBar[] = [];
  let running = 0;

  const pushMilestone = (calc: typeof margemCalc, color: string, shortLabel: string) => {
    if (!calc) return;
    const mv = calc.real;
    bars.push({ label: shortLabel, base: 0, delta: toChartVal(Math.abs(mv), unit), connY: toChartVal(mv, unit), color, rawV: mv, isMilestone: true });
    running = mv;
  };

  for (const section of data.sections) {
    const v = section.node.real;
    const shortLabel = section.label.replace(/^\d+\.\s*/, '').slice(0, 12);

    if (section.tag0.startsWith('01.')) {
      bars.push({ label: shortLabel, base: 0, delta: toChartVal(Math.abs(v), unit), connY: toChartVal(v, unit), color: colorReceita, rawV: v, isMilestone: false });
      running = v;
    } else {
      const lower = running + v;
      bars.push({
        label: shortLabel,
        base:  toChartVal(Math.min(running, lower), unit),
        delta: toChartVal(Math.abs(v), unit),
        connY: toChartVal(lower, unit),
        color: colorCost,
        rawV:  v,
        isMilestone: false,
      });
      running = lower;
    }

    if (section.tag0.startsWith('03.')) pushMilestone(margemCalc,   colorMilestone, 'MARGEM CONTRIB.');
    if (section.tag0.startsWith('04.')) pushMilestone(ebitdaSrCalc, colorMilestone, 'EBITDA s/RATEIO');
  }
  pushMilestone(ebitdaTotal, colorFinal, 'EBITDA TOTAL');

  const wfLabels   = bars.map(b => b.label);
  const wfBase     = bars.map(b => b.base);
  const wfDelta    = bars.map(b => ({ value: b.delta, itemStyle: { color: b.color, borderRadius: [4, 4, 0, 0] } }));
  const connectorY = bars.map(b => b.connY);

  // Labels outside bars (top), avoiding clipping on small bars
  const labelFmt = (p: any) => {
    const idx: number = p.dataIndex;
    const b = bars[idx];
    const fmtV = fmtChartLabel(Math.abs(toChartVal(Math.abs(b.rawV), unit)), unit);
    if (b.isMilestone || !b.rawV) return fmtV;
    if (b.color === colorReceita) return fmtV;
    return `−${fmtV}`;
  };

  const waterfallOption = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      textStyle: { fontSize: 12 },
      formatter: (params: any[]) => {
        const d = params.find((p: any) => p.seriesName === 'delta');
        if (!d) return '';
        const b = bars[d.dataIndex];
        const fmtV = `${fmtChartLabel(Math.abs(toChartVal(Math.abs(b.rawV), unit)), unit)} ${suffix}`;
        return `<b>${b.label}</b><br/>${b.rawV < 0 ? '− ' : ''}${fmtV}`;
      },
    },
    grid: { left: 8, right: 8, top: 30, bottom: 56 },
    xAxis: {
      type: 'category' as const,
      data: wfLabels,
      axisLabel: { fontSize: 9, fontWeight: 700, color: '#374151', interval: 0, overflow: 'truncate' as const, width: 68 },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
    legend: { show: false },
    series: [
      {
        name: 'base', type: 'bar' as const, stack: 'wf', silent: true,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
        data: wfBase,
      },
      {
        name: 'delta', type: 'bar' as const, stack: 'wf', barMaxWidth: 60,
        data: wfDelta,
        label: {
          show: true,
          position: 'top' as const,
          distance: 4,
          fontSize: 10,
          fontWeight: 700,
          color: '#374151',
          formatter: labelFmt,
        },
      },
      {
        name: 'connector', type: 'line' as const, silent: true,
        step: 'end' as const,
        data: connectorY,
        lineStyle: { color: '#CBD5E1', type: 'dashed' as const, width: 1.5 },
        symbol: 'none',
        z: 0,
      },
    ],
  };

  // Helper: delta badge style
  const deltaBadge = (pct: number | null) => {
    if (pct === null) return null;
    const fav = pct >= 0;
    return {
      color: fav ? '#16A34A' : '#DC2626',
      bg: fav ? '#DCFCE7' : '#FEE2E2',
      label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    };
  };

  const receitaBadge = deltaBadge(receitaOrcPct);
  const margemBadge  = deltaBadge(margemOrcPct);
  const ebitdaBadge  = deltaBadge(ebitdaOrcPct);

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel="EVOLUÇÃO DO RESULTADO"
        title={`EBITDA Bridge – ${data.monthShort}`}
        monthShort={data.monthShort}
        unitLabel={scaleLabel(unit)}
        filterSlot={filterSlot}
      />
      <div className="flex gap-3 px-4 pb-8 pt-2" style={{ height: 'calc(100% - 52px)' }}>

        {/* Chart + legend */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <ReactECharts option={waterfallOption} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas', devicePixelRatio: 2 }} />
          </div>
          {/* Compact legend */}
          <div className="flex items-center justify-center gap-4 pt-1 shrink-0">
            {[
              { color: colorReceita,   label: 'Receita' },
              { color: colorCost,      label: 'Custos/Desp.' },
              { color: colorMilestone, label: 'Resultado Parcial' },
              { color: colorFinal,     label: 'EBITDA Final' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-gray-500 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: KPI panel */}
        <div className="w-44 shrink-0 flex flex-col gap-2">

          {/* Receita */}
          <div style={{ borderLeft: '3px solid #2563EB' }} className="rounded-lg border border-gray-100 bg-white px-2.5 py-2 flex flex-col gap-0.5 shrink-0">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Receita {data.year}</div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[14px] font-extrabold text-blue-600">{fmtScaled(Math.abs(receitaReal), unit)}<span className="text-[10px] font-semibold ml-0.5">{suffix}</span></span>
              {receitaBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: receitaBadge.color, backgroundColor: receitaBadge.bg }}>
                  {receitaBadge.label}
                </span>
              )}
            </div>
            <div className="text-[8px] text-gray-400">vs Orçado</div>
          </div>

          {/* Margem */}
          {margemReal !== 0 && (
            <div style={{ borderLeft: '3px solid #10B981' }} className="rounded-lg border border-gray-100 bg-white px-2.5 py-2 flex flex-col gap-0.5 shrink-0">
              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Margem Contrib.</div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[14px] font-extrabold text-emerald-600">{fmtScaled(Math.abs(margemReal), unit)}<span className="text-[10px] font-semibold ml-0.5">{suffix}</span></span>
                {margemBadge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: margemBadge.color, backgroundColor: margemBadge.bg }}>
                    {margemBadge.label}
                  </span>
                )}
              </div>
              {margemPct !== null && <div className="text-[8px] text-gray-400">{margemPct.toFixed(1)}% da Receita</div>}
            </div>
          )}

          {/* EBITDA */}
          <div style={{ borderLeft: '3px solid #065F46' }} className="rounded-lg border border-gray-100 bg-white px-2.5 py-2 flex flex-col gap-0.5 shrink-0">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">EBITDA Total</div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[14px] font-extrabold" style={{ color: '#065F46' }}>{fmtScaled(Math.abs(ebitdaReal), unit)}<span className="text-[10px] font-semibold ml-0.5">{suffix}</span></span>
              {ebitdaBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: ebitdaBadge.color, backgroundColor: ebitdaBadge.bg }}>
                  {ebitdaBadge.label}
                </span>
              )}
            </div>
            {ebitdaMgPct !== null && <div className="text-[8px] text-gray-400">Margem {ebitdaMgPct.toFixed(1)}%</div>}
          </div>

          {/* AI Insight */}
          {data.executiveSummary ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
              <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">IA Insight</div>
              <p className="text-[9px] text-indigo-900 leading-relaxed overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                {cleanInsight(data.executiveSummary)}
              </p>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FINAL SLIDE: RESUMO EXECUTIVO (Genspark p8 — 3 cards + next steps)
// ═══════════════════════════════════════════════════════════════════════

function SummarySlide({ data, pageNum, filterSlot }: { data: VariancePptData; pageNum?: number; filterSlot?: React.ReactNode }) {
  const { stats } = data;

  const ebitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL');
  const ebitdaReal = ebitda?.real || 0;
  const ebitdaVsOrc = ebitda?.deltaOrcPct || null;
  const ebitdaVsA1  = ebitda?.deltaA1Pct  || null;
  const unit = detectScale(Math.abs(ebitdaReal));
  const suffix = scaleSuffix(unit);

  // Collect attention items (most unfavorable sections)
  const attentionItems: { label: string; varPct: number | null }[] = [];
  for (const section of data.sections) {
    const unfav = (section.node.orcVarPct ?? 0) < 0;
    if (unfav) attentionItems.push({ label: section.tag0, varPct: section.node.orcVarPct });
  }
  attentionItems.sort((a, b) => Math.abs(b.varPct || 0) - Math.abs(a.varPct || 0));

  // Collect favorable cost sections (economia)
  const costSections = data.sections.filter(s => !s.tag0.startsWith('01.'));
  const favorableCosts = costSections.filter(s => (s.node.orcVarPct ?? 0) >= 0);

  // Unjustified for "próximos passos"
  const unjustified: { label: string; tag0: string; varPct: number }[] = [];
  for (const section of data.sections) {
    const collectLeaves = (node: VariancePptNode) => {
      if (node.children.length === 0 && node.depth >= 1) {
        if (node.orcStatus !== 'approved' && node.orcStatus !== 'justified') {
          unjustified.push({ label: node.label, tag0: section.tag0.slice(0, 3), varPct: node.orcVarPct || 0 });
        }
      }
      for (const child of node.children) collectLeaves(child);
    };
    for (const t01 of section.tag01Nodes) collectLeaves(t01);
  }
  unjustified.sort((a, b) => Math.abs(b.varPct) - Math.abs(a.varPct));

  const ebitdaFav = (ebitdaVsOrc ?? 0) >= 0;
  const coverageGood = stats.coveragePct >= 80;

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel="BOOK DE RESULTADOS"
        title="Resumo Executivo"
        monthShort={data.monthShort}
        filterSlot={filterSlot}
      />
      <div className="flex flex-col gap-3 px-5 pt-3 pb-8" style={{ height: 'calc(100% - 52px)' }}>

        {/* Top row: 3 equal cards */}
        <div className="grid grid-cols-3 gap-3 flex-none">

          {/* Card 1: Performance */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', borderTopWidth: 3, borderTopColor: '#16A34A' }}
          >
            <div className="flex items-center justify-between">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Destaque</span>
            </div>
            <div>
              <div className="text-[13px] font-black text-gray-800">
                {ebitdaFav ? 'Performance Excepcional' : 'Resultado do Período'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {ebitdaFav ? 'Resultado acima das expectativas' : 'Acompanhamento do período'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">EBITDA Total</div>
              <div className="text-[22px] font-black leading-none" style={{ color: '#065F46' }}>
                R$ {fmtScaled(Math.abs(ebitdaReal), unit)}{suffix}
              </div>
            </div>
            <div className="flex gap-2">
              {ebitdaVsOrc !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ebitdaFav ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  ↑ {fmtPct(ebitdaVsOrc)} vs Orçado
                </span>
              )}
              {ebitdaVsA1 !== null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  ↑ {fmtPct(ebitdaVsA1)} vs {data.a1Year}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Disciplina de Custos */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderTopWidth: 3, borderTopColor: '#2563EB' }}
          >
            <div className="flex items-center justify-between">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Disciplina de Custos</span>
            </div>
            <div className="text-[13px] font-black text-gray-800">Eficiência em todas as linhas</div>
            <div className="flex flex-col gap-1.5 mt-1">
              {costSections.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 truncate">{s.label.replace(/^\d+\.\s*/, '').slice(0, 22)}</span>
                  <span className="text-[10px] font-bold ml-2 shrink-0" style={{ color: deltaColor(s.node.orcVarPct) }}>
                    {fmtPct(s.node.orcVarPct)} {(s.node.orcVarPct ?? 0) >= 0 ? 'fav.' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Pontos de Atenção */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-2"
            style={{ borderColor: '#FECACA', backgroundColor: '#FFF5F5', borderTopWidth: 3, borderTopColor: '#DC2626' }}
          >
            <div className="flex items-center justify-between">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Pontos de Atenção</span>
            </div>
            <div className="text-[13px] font-black text-gray-800">Áreas que requerem intervenção</div>
            <div className="flex flex-col gap-1.5 mt-1">
              {attentionItems.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-red-100">
                  <div className="w-1 h-8 rounded-full bg-red-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-gray-700 truncate">{item.label}</div>
                    <div className="text-[10px] text-red-600 font-bold">{fmtPct(item.varPct)} vs Orçado</div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-gray-200 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" />
                </svg>
                <div>
                  <div className="text-[10px] text-gray-500">Justificativas</div>
                  <div className="text-[11px] font-black" style={{ color: coverageGood ? '#16A34A' : '#DC2626' }}>
                    Apenas {stats.coveragePct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Próximos Passos — layout 3 colunas enriquecido */}
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
                <polygon points="5,3 19,12 5,21 5,3" />
              </svg>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                PRÓXIMOS PASSOS &amp; RECOMENDAÇÕES
              </div>
            </div>
            <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">
              {data.monthLabel} → fechamento
            </span>
          </div>

          {/* 3 cards ricos */}
          <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">

            {/* Card 1: Ação Imediata — dados do pior desvio */}
            {(() => {
              const worst = attentionItems[0];
              const worstSec = worst ? data.sections.find(s => s.tag0 === worst.label) : null;
              const worstT01s = worstSec ? [...worstSec.tag01Nodes].sort((a, b) => (a.orcVarPct ?? 0) - (b.orcVarPct ?? 0)).slice(0, 3) : [];
              const label = worst ? worst.label.replace(/^\d+\.\s*/, '') : 'Recuperação';
              const pct = worst?.varPct;
              return (
                <div className="rounded-lg bg-white border-l-4 border border-red-200 p-3 flex flex-col gap-1.5" style={{ borderLeftColor: '#DC2626' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wider">P0 · URGENTE</span>
                    <span className="text-[8px] text-gray-400 font-semibold">7 dias</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-gray-800 leading-tight">{label}</div>
                    <div className="text-[9px] font-bold mt-0.5" style={{ color: '#DC2626' }}>
                      Desvio {fmtPct(pct ?? null)} vs Orçado
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {worstT01s.map((t, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-50 rounded px-1.5 py-0.5">
                        <span className="text-[8px] text-gray-600 truncate">{t.label.slice(0, 22)}</span>
                        <span className="text-[8px] font-bold text-red-600 shrink-0 ml-1">{fmtPct(t.orcVarPct)}</span>
                      </div>
                    ))}
                    {worstT01s.length === 0 && (
                      <div className="text-[8px] text-gray-400 italic">Revisar todas as sub-linhas da seção</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-auto pt-1 border-t border-gray-100">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span className="text-[8px] text-gray-400">Reunião FP&A + Responsáveis da área</span>
                  </div>
                </div>
              );
            })()}

            {/* Card 2: Monitoramento — lista seções com desvio */}
            {(() => {
              const toWatch = data.sections
                .filter(s => Math.abs(s.node.orcVarPct ?? 0) > 5)
                .sort((a, b) => Math.abs(b.node.orcVarPct ?? 0) - Math.abs(a.node.orcVarPct ?? 0))
                .slice(0, 4);
              return (
                <div className="rounded-lg bg-white border-l-4 border border-blue-200 p-3 flex flex-col gap-1.5" style={{ borderLeftColor: '#2563EB' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white tracking-wider">P1 · SEMANAL</span>
                    <span className="text-[8px] text-gray-400 font-semibold">Recorrente</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-gray-800 leading-tight">Monitoramento de Desvios</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {toWatch.length} linha{toWatch.length !== 1 ? 's' : ''} com desvio &gt; 5% — threshold DRE
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {toWatch.map((s, i) => {
                      const fav = (s.node.orcVarPct ?? 0) >= 0;
                      return (
                        <div key={i} className="flex items-center justify-between rounded px-1.5 py-0.5" style={{ backgroundColor: fav ? '#F0FDF4' : '#FEF2F2' }}>
                          <span className="text-[8px] text-gray-600 truncate">{s.label.slice(0, 20)}</span>
                          <span className="text-[8px] font-bold shrink-0 ml-1" style={{ color: fav ? '#16A34A' : '#DC2626' }}>{fmtPct(s.node.orcVarPct)}</span>
                        </div>
                      );
                    })}
                    {toWatch.length === 0 && (
                      <div className="text-[8px] text-green-600 font-semibold">✓ Todas linhas dentro do threshold</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-auto pt-1 border-t border-gray-100">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-[8px] text-gray-400">Review semanal — Dashboard DRE Gerencial</span>
                  </div>
                </div>
              );
            })()}

            {/* Card 3: Fechamento de Justificativas */}
            {(() => {
              const pending = stats.pending + stats.notified;
              const done = stats.justified + stats.approved;
              const topPending = unjustified.slice(0, 3);
              const coverageOk = stats.coveragePct >= 80;
              return (
                <div className="rounded-lg bg-white border-l-4 border border-amber-200 p-3 flex flex-col gap-1.5" style={{ borderLeftColor: '#D97706' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white tracking-wider" style={{ backgroundColor: coverageOk ? '#16A34A' : '#D97706' }}>
                      {coverageOk ? 'P2 · OK' : 'P1 · ATENÇÃO'}
                    </span>
                    <span className="text-[8px] text-gray-400 font-semibold">Próx. fechamento</span>
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-gray-800 leading-tight">Cobertura de Justificativas</div>
                    <div className="text-[9px] mt-0.5 font-semibold" style={{ color: coverageOk ? '#16A34A' : '#D97706' }}>
                      {done}/{stats.totalLeaves} contas cobertas · Meta: ≥ 90%
                    </div>
                  </div>
                  {/* Progress mini */}
                  <div className="h-1.5 rounded-full w-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${stats.coveragePct}%`, backgroundColor: coverageOk ? '#16A34A' : '#D97706' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    {topPending.length > 0 ? topPending.map((u, i) => (
                      <div key={i} className="flex items-center justify-between bg-amber-50 rounded px-1.5 py-0.5">
                        <span className="text-[8px] text-gray-600 truncate">{u.label.slice(0, 22)}</span>
                        <span className="text-[8px] font-bold text-amber-700 shrink-0 ml-1">{u.tag0} · pendente</span>
                      </div>
                    )) : (
                      <div className="text-[8px] text-green-600 font-semibold">✓ Sem pendências críticas</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-auto pt-1 border-t border-gray-100">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    <span className="text-[8px] text-gray-400">{pending} pendentes com pacoteiros responsáveis</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Timeline footer */}
          <div className="shrink-0 flex items-center gap-0 pt-1">
            {[
              { label: 'Hoje', sub: 'Reunião FP&A', color: '#DC2626' },
              { label: '+7 dias', sub: 'Planos de ação', color: '#D97706' },
              { label: '+15 dias', sub: 'Review desvios', color: '#2563EB' },
              { label: '+30 dias', sub: 'Fechamento', color: '#16A34A' },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: step.color }} />
                  <div className="text-[7.5px] font-bold mt-0.5 leading-none" style={{ color: step.color }}>{step.label}</div>
                  <div className="text-[7px] text-gray-400 leading-none mt-0.5">{step.sub}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-[1px] mx-1" style={{ backgroundColor: '#E5E7EB' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PER-TAG01 DETAIL SLIDES — helpers + components
// ═══════════════════════════════════════════════════════════════════════

type T01Row = {
  depth: number;   // -1=total, 0=tag02, 1=marca
  label: string;
  real: number;
  orc: number;
  orcPct: number | null;
  a1: number;
  a1Pct: number | null;
};

type T01JustCard = {
  label: string;
  varPct: number | null;
  varAbs: number | null;   // delta absoluto em R$ (real - orcado)
  real: number;
  orc: number;
  status: string;
  justText: string;
  owner: string | null;
};

function buildT01Rows(t01: VariancePptNode): T01Row[] {
  const rows: T01Row[] = [];
  rows.push({ depth: -1, label: t01.label, real: t01.real, orc: t01.orcCompare, orcPct: t01.orcVarPct, a1: t01.a1Compare, a1Pct: t01.a1VarPct });
  for (const t02 of t01.children) {
    rows.push({ depth: 0, label: t02.label, real: t02.real, orc: t02.orcCompare, orcPct: t02.orcVarPct, a1: t02.a1Compare, a1Pct: t02.a1VarPct });
    // Marcas ordenadas do maior valor real absoluto para o menor
    const marcasSorted = [...t02.children].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
    for (const marca of marcasSorted) {
      rows.push({ depth: 1, label: marca.label, real: marca.real, orc: marca.orcCompare, orcPct: marca.orcVarPct, a1: marca.a1Compare, a1Pct: marca.a1VarPct });
    }
  }
  return rows;
}

function buildTag02AsT01Rows(tag02: VariancePptNode): T01Row[] {
  const rows: T01Row[] = [];
  // tag02 itself = total row (depth -1)
  rows.push({ depth: -1, label: tag02.label, real: tag02.real, orc: tag02.orcCompare, orcPct: tag02.orcVarPct, a1: tag02.a1Compare, a1Pct: tag02.a1VarPct });
  // its children = marcas (depth 1)
  const marcasSorted = [...tag02.children].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
  for (const marca of marcasSorted) {
    rows.push({ depth: 1, label: marca.label, real: marca.real, orc: marca.orcCompare, orcPct: marca.orcVarPct, a1: marca.a1Compare, a1Pct: marca.a1VarPct });
  }
  return rows;
}

function buildT01JustCards(t01: VariancePptNode): T01JustCard[] {
  const cards: T01JustCard[] = [];
  const collect = (node: VariancePptNode) => {
    const text = node.orcJustification || node.orcAiSummary;
    if (text && node.depth >= 2) {
      cards.push({
        label: node.label,
        varPct: node.orcVarPct,
        varAbs: node.real - node.orcCompare,
        real: node.real,
        orc: node.orcCompare,
        status: node.orcStatus,
        justText: text,
        owner: node.ownerName,
      });
    }
    for (const child of node.children) collect(child);
  };
  collect(t01);
  return cards;
}

const JUST_STATUS_PRIORITY = ['approved', 'justified', 'notified', 'pending', 'rejected'];

// ── Per-slide filter helpers (local types) ────────────────────────────

function pct(real: number, cmp: number): number | null {
  if (cmp === 0) return null;
  return Math.round(((real - cmp) / Math.abs(cmp)) * 1000) / 10;
}

// ── Global marca filter context ───────────────────────────────────────
// Shared across all FilterableSlide instances so any slide can drive
// a DB re-fetch that updates the entire presentation.
const MarcaFilterContext = React.createContext<{
  activeMarcas: string[];
  setActiveMarcas: (m: string[]) => void;
  loading: boolean;
}>({ activeMarcas: [], setActiveMarcas: () => {}, loading: false });

// ── Global period context ─────────────────────────────────────────────
type ActivePeriod = { month: string; isYtd: boolean; monthFrom?: string };

const PeriodContext = React.createContext<{
  activePeriod: ActivePeriod;
  setActivePeriod: (p: ActivePeriod) => void;
  periodLoading: boolean;
  availableMonths: string[];
}>({ activePeriod: { month: '', isYtd: false }, setActivePeriod: () => {}, periodLoading: false, availableMonths: [] });

// ── Period badge helper functions ─────────────────────────────────────
function monthShortFromYearMonth(ym: string): string {
  const [yr, mo] = ym.split('-');
  const names = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  return `${names[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
}
function buildYtdShort(ym: string): string {
  const [yr, mo] = ym.split('-');
  const names = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  return `JAN-${names[parseInt(mo, 10) - 1]}/${yr.slice(2)}`;
}

function filterT01Rows(rows: T01Row[], filters: SlideViewFilters): T01Row[] {
  if (isFiltersEmpty(filters)) return rows;

  // ── 1. Filter rows ────────────────────────────────────────────────
  let result = [...rows];

  if (filters.tag02s?.length) {
    const allowed = new Set(filters.tag02s);
    let inAllowed = false;
    result = result.filter(row => {
      if (row.depth === -1) return true;
      if (row.depth === 0) { inAllowed = allowed.has(row.label); return inAllowed; }
      if (row.depth === 1) return inAllowed;
      return true;
    });
  }

  if (filters.marcas?.length) {
    const marcaSet = new Set(filters.marcas);
    result = result.filter(row => row.depth !== 1 || marcaSet.has(row.label));
  }

  // ── 2. Recalculate tag02 subtotals from remaining marca rows ──────
  if (filters.marcas?.length && result.some(r => r.depth === 1)) {
    const rebuilt: T01Row[] = [];
    let pendingT02: T01Row | null = null;
    let pendingMarcas: T01Row[] = [];

    const flushT02 = () => {
      if (!pendingT02) return;
      if (pendingMarcas.length > 0) {
        const real = pendingMarcas.reduce((s, r) => s + r.real, 0);
        const orc  = pendingMarcas.reduce((s, r) => s + r.orc,  0);
        const a1   = pendingMarcas.reduce((s, r) => s + r.a1,   0);
        rebuilt.push({ ...pendingT02, real, orc, a1, orcPct: pct(real, orc), a1Pct: pct(real, a1) });
        rebuilt.push(...pendingMarcas);
      }
      pendingT02 = null;
      pendingMarcas = [];
    };

    for (const row of result) {
      if (row.depth === -1)      rebuilt.push(row);               // placeholder, updated below
      else if (row.depth === 0)  { flushT02(); pendingT02 = row; pendingMarcas = []; }
      else if (row.depth === 1)  pendingMarcas.push(row);
    }
    flushT02();
    result = rebuilt;
  }

  // ── 3. Recalculate grand total from remaining tag02/marca rows ────
  const t02Rows  = result.filter(r => r.depth === 0);
  const t01Marca = result.filter(r => r.depth === 1);
  const src = t02Rows.length > 0 ? t02Rows : t01Marca;
  const totalIdx = result.findIndex(r => r.depth === -1);

  if (totalIdx >= 0 && src.length > 0) {
    const real = src.reduce((s, r) => s + r.real, 0);
    const orc  = src.reduce((s, r) => s + r.orc,  0);
    const a1   = src.reduce((s, r) => s + r.a1,   0);
    result = [...result];
    result[totalIdx] = { ...result[totalIdx], real, orc, a1, orcPct: pct(real, orc), a1Pct: pct(real, a1) };
  }

  return result;
}

function filterJustCards(cards: T01JustCard[], filters: SlideViewFilters): T01JustCard[] {
  if (!filters.statuses?.length) return cards;
  const set = new Set(filters.statuses);
  return cards.filter(c => set.has(c.status));
}

const STATUS_LABEL: Record<string, string> = {
  approved:  'Aprovada',
  justified: 'Justificada',
  pending:   'Pendente',
  notified:  'Notificada',
  rejected:  'Rejeitada',
};

// ── SlideFilterPanel ─────────────────────────────────────────────────

function SlideFilterPanel({
  groups,
  current,
  onApply,
  onClear,
  onClose,
  panelRef,
}: {
  groups: FilterGroup[];
  current: SlideViewFilters;
  onApply: (f: SlideViewFilters) => void;
  onClear: () => void;
  onClose: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [draft, setDraft] = useState<SlideViewFilters>({ ...current });

  const toggle = (groupId: keyof SlideViewFilters, value: string) => {
    setDraft(prev => {
      const curr = (prev[groupId] as string[] | undefined) ?? [];
      const has = curr.includes(value);
      return { ...prev, [groupId]: has ? curr.filter(v => v !== value) : [...curr, value] };
    });
  };

  // Unchecked = NOT in filter array (empty = all selected)
  const isChecked = (groupId: keyof SlideViewFilters, value: string): boolean => {
    const arr = draft[groupId] as string[] | undefined;
    return !arr || arr.length === 0 || arr.includes(value);
  };

  const allGroupSelected = (groupId: keyof SlideViewFilters): boolean => {
    const arr = draft[groupId] as string[] | undefined;
    return !arr || arr.length === 0;
  };

  const selectAll = (groupId: keyof SlideViewFilters) => {
    setDraft(prev => ({ ...prev, [groupId]: [] }));
  };

  return (
    <div
      ref={panelRef as React.RefObject<HTMLDivElement>}
      className="absolute top-[52px] right-6 z-50 w-56 rounded-xl shadow-2xl border border-gray-600 overflow-hidden"
      style={{ backgroundColor: '#111827' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700" style={{ backgroundColor: '#1F2937' }}>
        <div className="flex items-center gap-1.5">
          <Filter size={10} className="text-blue-400" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wide">Filtrar slide</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Groups */}
      <div className="max-h-60 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={group.id} className={gi < groups.length - 1 ? 'border-b border-gray-800' : ''}>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{group.label}</p>
                <button
                  onClick={() => selectAll(group.id)}
                  className={`text-[8px] font-semibold px-1.5 py-0.5 rounded transition-colors ${allGroupSelected(group.id) ? 'text-gray-500 cursor-default' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'}`}
                  disabled={allGroupSelected(group.id)}
                >
                  Selecionar tudo
                </button>
              </div>
              <div className="space-y-0.5">
                {group.options.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer py-0.5 px-1 hover:bg-gray-800/60 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={isChecked(group.id, opt)}
                      onChange={() => toggle(group.id, opt)}
                      className="w-3 h-3 rounded accent-blue-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-gray-200 truncate leading-tight">
                      {group.id === 'statuses' ? (STATUS_LABEL[opt] ?? opt) : opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-gray-700" style={{ backgroundColor: '#1F2937' }}>
        <button
          onClick={() => { onClear(); }}
          className="flex-1 py-1 text-[10px] font-bold text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={() => onApply(draft)}
          className="flex-1 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ── FilterableSlide wrapper ───────────────────────────────────────────
// Wraps any slide with a per-slide filter button + panel.
// Marca filters are routed to MarcaFilterContext (DB re-fetch).
// All other filters remain local in-memory per slide.

function FilterableSlide({
  groups,
  children,
}: {
  groups: FilterGroup[];
  children: (filters: SlideViewFilters, filterButton: React.ReactNode) => React.ReactNode;
}) {
  const { activeMarcas, setActiveMarcas, loading } = React.useContext(MarcaFilterContext);
  const [localFilters, setLocalFilters] = useState<SlideViewFilters>({});
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Separate marca group from local groups
  const marcaGroup  = groups.find(g => g.id === 'marcas');
  const localGroups = groups.filter(g => g.id !== 'marcas');

  const hasLocalFilters = !isFiltersEmpty(localFilters);
  const hasMarcaFilter  = activeMarcas.length > 0;
  const hasActive = hasLocalFilters || hasMarcaFilter;
  const activeCount =
    Object.values(localFilters).filter(v => Array.isArray(v) && (v as string[]).length > 0).length +
    (hasMarcaFilter ? 1 : 0);

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  // All visible groups in the panel: local groups first, then marca
  const panelGroups: FilterGroup[] = marcaGroup
    ? [...localGroups, marcaGroup]
    : localGroups;

  // Current state for the panel (merges local + global marcas)
  const panelCurrent: SlideViewFilters = { ...localFilters, marcas: activeMarcas };

  const filterButton = panelGroups.length === 0 ? null : (
    <button
      onClick={e => { e.stopPropagation(); setShowPanel(v => !v); }}
      className="flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none"
      style={hasActive
        ? { borderColor: '#2563EB', backgroundColor: '#EFF6FF', color: '#2563EB' }
        : { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#6B7280' }
      }
      title="Filtrar este slide"
    >
      <Filter size={10} />
      {hasActive ? `Filtros (${activeCount})` : 'Filtrar'}
    </button>
  );

  if (panelGroups.length === 0) return <>{children(localFilters, null)}</>;

  return (
    <div className="relative">
      {loading && hasMarcaFilter && (
        <div className="absolute inset-0 z-30 bg-white/60 flex items-center justify-center rounded-2xl pointer-events-none">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}
      {children(localFilters, filterButton)}

      {showPanel && (
        <SlideFilterPanel
          groups={panelGroups}
          current={panelCurrent}
          panelRef={panelRef}
          onApply={draft => {
            // Route: marcas → global DB re-fetch; others → local in-memory
            const { marcas, ...local } = draft;
            setLocalFilters(local as SlideViewFilters);
            const newMarcas = (marcas as string[]) ?? [];
            if (JSON.stringify(newMarcas.sort()) !== JSON.stringify([...activeMarcas].sort())) {
              setActiveMarcas(newMarcas);
            }
            setShowPanel(false);
          }}
          onClear={() => {
            setLocalFilters({});
            setActiveMarcas([]);
            setShowPanel(false);
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}

// Agrega cards pelo label (marca) — soma real/orc, sintetiza textos, escolhe status de maior prioridade
function aggregateJustCardsByMarca(cards: T01JustCard[]): T01JustCard[] {
  const map = new Map<string, T01JustCard[]>();
  for (const card of cards) {
    const key = card.label.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(card);
  }
  return [...map.values()].map(grp => {
    const real   = grp.reduce((s, c) => s + c.real, 0);
    const orc    = grp.reduce((s, c) => s + c.orc,  0);
    const varAbs = real - orc;
    const varPct = orc !== 0 ? ((real - orc) / Math.abs(orc)) * 100 : null;
    const status = grp
      .map(c => c.status)
      .sort((a, b) => JUST_STATUS_PRIORITY.indexOf(a) - JUST_STATUS_PRIORITY.indexOf(b))[0] ?? 'pending';
    // Textos únicos concatenados (sem repetição)
    const texts = [...new Set(grp.map(c => c.justText).filter(Boolean))];
    const justText = texts.join(' | ');
    return {
      label: grp[0].label,
      varPct,
      varAbs,
      real,
      orc,
      status,
      justText,
      owner: grp.find(c => c.owner)?.owner ?? null,
    };
  }).sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
}

const JUST_PREVIEW_LEN = 180;

function JustCardItem({ card, onExpand }: { card: T01JustCard; onExpand?: () => void }) {
  const dColor      = deltaColor(card.varPct);
  const sColor      = statusColor(card.status);
  const favorable   = (card.varPct ?? 0) >= 0;
  const bgColor     = favorable ? '#F0FDF4' : '#FFF5F5';
  const borderColor = favorable ? '#BBF7D0' : '#FECACA';
  const cleanText   = cleanInsight(card.justText);
  const absLabel    = card.varAbs !== null ? `Δ R$ ${fmtK(card.varAbs)}k` : null;

  // Truncação via JS — confiável em qualquer modo de renderização
  const isLong      = cleanText.length > JUST_PREVIEW_LEN;
  const previewText = isLong ? cleanText.slice(0, JUST_PREVIEW_LEN).trimEnd() + '…' : cleanText;

  return (
    <div
      className="rounded-xl border overflow-hidden flex transition-shadow hover:shadow-md"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      {/* Barra lateral colorida */}
      <div className="w-1.5 shrink-0" style={{ backgroundColor: dColor }} />

      <div className="px-3 py-2.5 flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Linha 1: label + Δ% hero */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold text-gray-800 leading-snug flex-1 min-w-0">
            {truncate(card.label, 32)}
          </span>
          <span className="text-[16px] font-black tabular-nums leading-none shrink-0" style={{ color: dColor }}>
            {fmtPct(card.varPct)}
          </span>
        </div>

        {/* Linha 2: Δ R$ + status + owner */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            {absLabel && (
              <span className="text-[9px] font-semibold tabular-nums text-gray-500">{absLabel}</span>
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: sColor, backgroundColor: `${sColor}18` }}>
              {STATUS_LABEL[card.status] ?? card.status}
            </span>
          </div>
          {card.owner && (
            <span className="text-[9px] italic text-gray-400 truncate">{card.owner}</span>
          )}
        </div>

        {/* Texto da justificativa — sempre visível, truncado via JS */}
        {previewText && (
          <p className="text-[10px] text-gray-600 leading-snug">
            {previewText}
            {isLong && (
              <button
                className="ml-1 text-[8px] font-semibold underline underline-offset-1 cursor-pointer bg-transparent border-none p-0"
                style={{ color: dColor }}
                onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
              >
                ver mais →
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// Gera síntese textual diretamente dos dados da tabela (sempre aderente)
function buildTableInsight(rows: T01Row[], t01Label: string, year: number): string {
  const totalRow  = rows.find(r => r.depth === -1);
  const t02Rows   = rows.filter(r => r.depth === 0);
  const marcaRows = rows.filter(r => r.depth === 1 && r.orcPct !== null);

  const parts: string[] = [];

  // 1. Performance geral
  if (totalRow && totalRow.orcPct !== null) {
    const dir      = totalRow.orcPct >= 0 ? 'acima' : 'abaixo';
    const varAbsK  = fmtK(Math.abs(totalRow.real - totalRow.orc));
    const varPctS  = Math.abs(totalRow.orcPct).toFixed(1);
    parts.push(`${t01Label} encerrou com R$ ${fmtK(totalRow.real)}k realizados — ${varPctS}% ${dir} do orçado (Δ R$ ${varAbsK}k).`);
  }

  // 2. Maior componente (tag02)
  const biggestT02 = [...t02Rows].sort((a, b) => Math.abs(b.real) - Math.abs(a.real))[0];
  if (biggestT02 && totalRow && Math.abs(totalRow.real) > 0) {
    const rep = Math.round(Math.abs(biggestT02.real) / Math.abs(totalRow.real) * 100);
    const varNote = biggestT02.orcPct !== null
      ? `, com variação de ${fmtPct(biggestT02.orcPct)} vs orçado`
      : '';
    parts.push(`O maior componente é ${biggestT02.label}, representando ${rep}% do total${varNote}.`);
  }

  // 3. Melhor desempenho de marca
  const sorted = [...marcaRows].sort((a, b) => (b.orcPct ?? 0) - (a.orcPct ?? 0));
  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best && (best.orcPct ?? 0) > 0) {
    parts.push(`Destaque positivo: ${best.label} com ${fmtPct(best.orcPct)} vs orçado (R$ ${fmtK(best.real)}k realizados).`);
  }

  // 4. Pior desempenho de marca
  if (worst && worst !== best && (worst.orcPct ?? 0) < 0) {
    parts.push(`Ponto de atenção: ${worst.label} com desvio de ${fmtPct(worst.orcPct)} vs orçado (R$ ${fmtK(worst.real)}k realizados).`);
  }

  // 5. Comparativo vs ano anterior (se disponível no total)
  if (totalRow && totalRow.a1Pct !== null) {
    const dir = totalRow.a1Pct >= 0 ? 'superior' : 'inferior';
    parts.push(`Em relação ao ano anterior, o resultado é ${Math.abs(totalRow.a1Pct).toFixed(1)}% ${dir} (A-1: R$ ${fmtK(totalRow.a1)}k).`);
  }

  return parts.join(' ');
}

// SLIDE 1 DE 2: Tabela + Síntese IA
function Tag01DetailSlide({
  section, t01, data, rows, pageNum, titleOverride, filterSlot,
}: {
  section: VariancePptSection;
  t01: VariancePptNode;
  data: VariancePptData;
  rows: T01Row[];
  pageNum?: number;
  titleOverride?: string;
  filterSlot?: React.ReactNode;
}) {
  const [showPopup, setShowPopup] = React.useState(false);

  const a1Label   = String(data.a1Year);
  const title     = titleOverride ?? `${section.label} — ${t01.label}`;
  const accentClr = `#${section.sectionColor}`;

  // Filter out subtotal rows that duplicate other entries (e.g. "Outras Receitas De Alunos")
  const EXCLUDE_LABELS = ['outras receitas de alunos'];
  const _excluded = rows.filter(row =>
    !EXCLUDE_LABELS.some(ex => row.label.toLowerCase().includes(ex))
  );
  // Remove tag02 rows (depth 0) — mostrar apenas total + marcas
  const noT02 = _excluded.filter(row => row.depth !== 0);

  // Agregar marcas (depth 1) com mesmo label — soma real/orc/a1, recalcula pct
  const totalRow = noT02.find(r => r.depth === -1);
  const marcaMap = new Map<string, T01Row>();
  for (const row of noT02) {
    if (row.depth !== 1) continue;
    const key = row.label.toLowerCase().trim();
    if (!marcaMap.has(key)) {
      marcaMap.set(key, { ...row });
    } else {
      const acc = marcaMap.get(key)!;
      acc.real += row.real;
      acc.orc  += row.orc;
      acc.a1   += row.a1;
    }
  }
  // Recalcular pct após agregação
  for (const row of marcaMap.values()) {
    row.orcPct = row.orc !== 0 ? ((row.real - row.orc) / Math.abs(row.orc)) * 100 : null;
    row.a1Pct  = row.a1  !== 0 ? ((row.real - row.a1)  / Math.abs(row.a1))  * 100 : null;
  }
  // Ordenar marcas por |real| desc
  const marcasSorted = [...marcaMap.values()].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
  const filteredRows: T01Row[] = [
    ...(totalRow ? [totalRow] : []),
    ...marcasSorted,
  ];

  // Síntese gerada dos dados reais da tabela (sempre aderente ao conteúdo)
  const tableInsight = buildTableInsight(filteredRows, t01.label, data.year);
  // Texto IA original como complemento no popup
  const aiComplement = cleanInsight(t01.enrichedInsight || t01.orcAiSummary || '');
  const popupText = [tableInsight, aiComplement].filter(Boolean).join('\n\n');

  const INSIGHT_PREVIEW_LEN = 520;
  const insightIsLong = tableInsight.length > INSIGHT_PREVIEW_LEN;
  const insightPreview = insightIsLong ? tableInsight.slice(0, INSIGHT_PREVIEW_LEN).trimEnd() + '…' : tableInsight;

  return (
    <>
    {showPopup && popupText && (
      <InsightPopup
        title={title}
        text={popupText}
        accent={accentClr}
        onClose={() => setShowPopup(false)}
      />
    )}
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={title}
        monthShort={data.monthShort}
        color={section.sectionColor}
        filterSlot={filterSlot}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Esquerda: Tabela */}
        <div className="w-[58%] shrink-0 px-4 pt-3 border-r border-gray-100 overflow-hidden">
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <th className="text-left px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">DESCRIÇÃO / MARCA</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">REAL</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">ORÇADO</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">Δ R$</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">Δ% Orç</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">{a1Label}</th>
                  <th className="text-right px-2 py-1.5 font-bold text-[10px] text-gray-500 uppercase tracking-wide">Δ% {a1Label}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const isTotal = row.depth === -1;
                  const isT02   = row.depth === 0;
                  const isMarca = row.depth === 1;
                  const bg      = isTotal ? accentClr : isT02 ? '#F9FAFB' : 'white';
                  const textClr = isTotal ? 'white' : hex(C.darkText);
                  const bold    = isTotal || isT02;
                  const indent  = isMarca ? '\u00A0\u00A0↳ ' : '';
                  const varAbs  = row.real - row.orc;
                  return (
                    <tr key={idx} className="border-b border-gray-50" style={{ backgroundColor: bg }}>
                      <td className="px-2 py-0.5 text-[10px] truncate" style={{ maxWidth: 120, color: textClr, fontWeight: bold ? 700 : 400 }} title={row.label}>
                        {indent}{row.label}
                      </td>
                      <td className="text-right px-2 py-0.5 text-[10px] tabular-nums"
                        style={{ color: textClr, fontWeight: bold ? 700 : 400 }}>{fmtK(row.real)}</td>
                      <td className="text-right px-2 py-0.5 text-[10px] tabular-nums"
                        style={{ color: isTotal ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>{fmtK(row.orc)}</td>
                      <td className="text-right px-2 py-0.5 text-[10px] tabular-nums font-semibold">
                        <span style={{ color: isTotal ? (varAbs >= 0 ? '#86EFAC' : '#FCA5A5') : deltaColor(row.orcPct) }}>
                          {varAbs >= 0 ? '+' : ''}{fmtK(varAbs)}
                        </span>
                      </td>
                      <td className="text-right px-2 py-0.5">
                        {isTotal
                          ? <span className="text-[10px] font-bold text-white">{fmtPct(row.orcPct)}</span>
                          : <VarBadge pct={row.orcPct} />}
                      </td>
                      <td className="text-right px-2 py-0.5 text-[10px] tabular-nums"
                        style={{ color: isTotal ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>{fmtK(row.a1)}</td>
                      <td className="text-right px-2 py-0.5">
                        {isTotal
                          ? <span className="text-[10px] font-bold text-white">{fmtPct(row.a1Pct)}</span>
                          : <VarBadge pct={row.a1Pct} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direita: Síntese dos dados */}
        <div className="flex-1 min-w-0 px-4 pt-3 flex flex-col gap-2">
          {tableInsight ? (
            <div
              className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-3 rounded-xl cursor-pointer border transition-shadow hover:shadow-md"
              style={{ backgroundColor: `${accentClr}0D`, borderColor: `${accentClr}30`, borderLeft: `3px solid ${accentClr}` }}
              onClick={() => setShowPopup(true)}
              title="Clique para mais detalhes"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentClr }} />
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: accentClr }}>
                    Análise
                  </span>
                </div>
                {popupText && <span className="text-[8px] font-semibold" style={{ color: accentClr }}>ver mais →</span>}
              </div>
              <p className="text-[10px] leading-relaxed text-gray-700">
                {insightPreview}
                {insightIsLong && (
                  <button
                    className="ml-1 text-[9px] font-semibold underline underline-offset-1 bg-transparent border-none p-0 cursor-pointer"
                    style={{ color: accentClr }}
                    onClick={e => { e.stopPropagation(); setShowPopup(true); }}
                  >
                    ver mais →
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-dashed border-gray-200">
              <span className="text-[10px] text-gray-400 italic">Dados insuficientes para análise</span>
            </div>
          )}
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
    </>
  );
}

// SLIDE 2+: Justificativas (paginado)
function Tag01JustificativasSlide({
  section, t01, data, cards, pageNum, slideLabel, titleOverride, filterSlot,
}: {
  section: VariancePptSection;
  t01: VariancePptNode;
  data: VariancePptData;
  cards: T01JustCard[];
  pageNum?: number;
  slideLabel?: string;
  titleOverride?: string;
  filterSlot?: React.ReactNode;
}) {
  const [popup, setPopup] = React.useState<{ title: string; text: string; accent: string } | null>(null);

  const titleBase = titleOverride ?? `${section.label} — ${t01.label} — Justificativas`;
  const title = (titleOverride || !slideLabel) ? titleBase : `${titleBase} ${slideLabel}`;
  const accentClr = `#${section.sectionColor}`;

  // Stats de cobertura
  const justified = cards.filter(c => c.status === 'justified' || c.status === 'approved').length;
  const pending    = cards.filter(c => c.status === 'pending' || c.status === 'notified').length;
  const coverPct   = cards.length > 0 ? Math.round(justified / cards.length * 100) : 0;

  return (
    <>
    {popup && (
      <InsightPopup
        title={popup.title}
        text={popup.text}
        accent={popup.accent}
        onClose={() => setPopup(null)}
      />
    )}
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={title}
        monthShort={data.monthShort}
        color={section.sectionColor}
        filterSlot={filterSlot}
      />
      <div className="flex flex-col px-4 pt-3 pb-7 gap-2" style={{ height: 'calc(100% - 52px)' }}>
        {/* Cabeçalho com stats */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentClr }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentClr }}>
              Justificativas dos Desvios
            </span>
            <span className="text-[9px] text-gray-400 font-medium">
              ({cards.length} {cards.length === 1 ? 'item' : 'itens'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              {justified} justificado{justified !== 1 ? 's' : ''}
            </span>
            {pending > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                {pending} pendente{pending !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[9px] font-bold tabular-nums" style={{ color: accentClr }}>
              {coverPct}% cobertos
            </span>
          </div>
        </div>

        {/* Grid de cards — sempre 2 colunas */}
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 content-start overflow-hidden">
          {cards.map((card, idx) => (
            <JustCardItem
              key={idx}
              card={card}
              onExpand={() => setPopup({
                title: card.label,
                text: cleanInsight(card.justText) || 'Sem justificativa registrada.',
                accent: accentClr,
              })}
            />
          ))}
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRESENTATION MODE — Fullscreen slide-by-slide
// ═══════════════════════════════════════════════════════════════════════

// Tamanho de design fixo: os slides são desenhados para 960×540.
// Na apresentação, aplicamos transform:scale para preencher a tela
// sem distorcer nada — fontes, espaçamentos e gráficos escalam juntos.
const DESIGN_W = 960;
const DESIGN_H = 540;
const NAV_H    = 44;

function PresentationMode({
  slides,
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  onExit,
  filterPanel,
  onOpenFilters,
  filterActiveCount,
}: {
  slides: React.ReactNode[];
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  filterPanel?: React.ReactNode;
  onOpenFilters?: () => void;
  filterActiveCount?: number;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const availW = window.innerWidth;
      const availH = window.innerHeight - NAV_H;
      setScale(Math.min(availW / DESIGN_W, availH / DESIGN_H));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col select-none">
      {/* Área de exibição do slide */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        style={{ height: `calc(100vh - ${NAV_H}px)` }}
      >
        {/* Container fixo no tamanho de design, escalado para a tela */}
        <div
          style={{
            width:  DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {slides[currentSlide]}
        </div>
      </div>

      {/* Barra de navegação */}
      <div
        className="shrink-0 flex items-center justify-between px-4 bg-gray-950 border-t border-gray-800"
        style={{ height: NAV_H }}
      >
        <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
          <X size={14} />
          ESC
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            disabled={currentSlide === 0}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-gray-400 text-xs font-medium tabular-nums">
            {currentSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {onOpenFilters ? (
          <button
            onClick={onOpenFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors relative"
            style={filterActiveCount && filterActiveCount > 0
              ? { background: '#1D4ED8', color: 'white' }
              : { color: '#9CA3AF', background: '#1F2937' }}
          >
            <SlidersHorizontal size={13} />
            Filtros
            {filterActiveCount && filterActiveCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: '#EF4444', color: 'white' }}>
                {filterActiveCount}
              </span>
            ) : null}
          </button>
        ) : <div className="w-14" />}
      </div>

      {/* Filter panel overlay (rendered inside fullscreen container) */}
      {filterPanel}


      {/* Zonas de clique nas bordas pretas (fora do slide) para navegar */}
      <div
        className="absolute top-0 left-0 cursor-pointer"
        style={{ height: `calc(100% - ${NAV_H}px)`, width: `calc(50% - ${DESIGN_W * scale / 2}px)`, zIndex: 1 }}
        onClick={onPrev}
      />
      <div
        className="absolute top-0 right-0 cursor-pointer"
        style={{ height: `calc(100% - ${NAV_H}px)`, width: `calc(50% - ${DESIGN_W * scale / 2}px)`, zIndex: 1 }}
        onClick={onNext}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAG01 → TAG02 BREAKDOWN SLIDE (tabela + gráfico de barras por tag02)
// Estilo slide 2 (OverviewSlide): tabela à esquerda, barras à direita
// ═══════════════════════════════════════════════════════════════════════

function Tag01T02BreakdownSlide({
  section, t01, data, pageNum, filterSlot,
}: {
  section: VariancePptSection;
  t01: VariancePptNode;
  data: VariancePptData;
  pageNum?: number;
  filterSlot?: React.ReactNode;
}) {
  const accentClr = `#${section.sectionColor}`;

  // tag02s sorted by |real| desc
  const tag02s = [...t01.children].sort((a, b) => Math.abs(b.real) - Math.abs(a.real));

  // Table rows: total + tag02s
  const tableRows = [
    { label: t01.label, real: t01.real, orc: t01.orcCompare, orcPct: t01.orcVarPct, isTotal: true },
    ...tag02s.map(n => ({ label: n.label, real: n.real, orc: n.orcCompare, orcPct: n.orcVarPct, isTotal: false })),
  ];

  // Top 5 estouros: orcVarPct < 0, ordenado pelo maior gap R$ (real - orc mais negativo primeiro)
  const top5Desvios = [...tag02s]
    .filter(n => (n.orcVarPct ?? 0) < 0)
    .sort((a, b) => (a.real - a.orcCompare) - (b.real - b.orcCompare))
    .slice(0, 5);

  // Top 5 savings: orcVarPct > 0, ordenado pelo maior saving R$ (real - orc mais positivo primeiro)
  const top5Savings = [...tag02s]
    .filter(n => (n.orcVarPct ?? 0) > 0)
    .sort((a, b) => (b.real - b.orcCompare) - (a.real - a.orcCompare))
    .slice(0, 5);

  // Helper: build a Real vs Orçado mini chart option for a subset of nodes
  const buildMiniChart = (nodes: typeof tag02s, accentColor: string, orcColor: string) => {
    const raw = nodes.flatMap(n => [Math.abs(n.real), Math.abs(n.orcCompare)]);
    const u = detectScale(...raw);
    const labels = nodes.map(n => n.label.length > 13 ? n.label.slice(0, 12) + '…' : n.label);
    const rV = nodes.map(n => Math.abs(toChartVal(n.real, u)));
    const oV = nodes.map(n => Math.abs(toChartVal(n.orcCompare, u)));
    const vPcts = nodes.map(n => n.orcVarPct);
    const vAbs  = nodes.map(n => n.real - n.orcCompare);
    const phV = rV.map((r, i) => Math.max(r, oV[i]));

    return {
      grid: { left: 6, right: 6, top: 38, bottom: 36 },
      xAxis: {
        type: 'category' as const,
        data: labels,
        axisLabel: { fontSize: 8, fontWeight: 600, color: '#374151', interval: 0, overflow: 'truncate' as const, width: 60 },
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisTick: { show: false },
      },
      yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
      legend: {
        bottom: 0,
        data: [`Real ${data.year}`, 'Orçado'],
        itemWidth: 8,
        itemHeight: 6,
        textStyle: { fontSize: 8, color: '#6B7280' },
      },
      series: [
        {
          name: `Real ${data.year}`,
          type: 'bar' as const,
          data: rV,
          barMaxWidth: 30,
          barGap: '10%',
          itemStyle: { color: accentColor, borderRadius: [2, 2, 0, 0] },
          label: { show: true, position: 'inside' as const, formatter: (p: any) => fmtChartLabel(p.value, u), fontSize: 7, fontWeight: 700, color: '#fff' },
        },
        {
          name: '__var__',
          type: 'bar' as const,
          data: phV,
          barWidth: 1,
          silent: true,
          itemStyle: { color: 'transparent' },
          label: {
            show: true,
            position: 'top' as const,
            offset: [0, -2],
            formatter: (p: any) => {
              const idx = p.dataIndex;
              const pct = vPcts[idx];
              const abs = vAbs[idx];
              if (pct === null || pct === undefined) return '';
              const tag = pct >= 0 ? 'pos' : 'neg';
              const sign = pct >= 0 ? '+' : '';
              const absLabel = `${sign}${fmtChartLabel(toChartVal(abs, u), u)}`;
              const pctLabel = `${sign}${pct.toFixed(1)}%`;
              return `{${tag}|${absLabel}}\n{${tag}2|${pctLabel}}`;
            },
            rich: {
              pos:  { fontSize: 7, fontWeight: 800, color: '#34D399', lineHeight: 11 },
              neg:  { fontSize: 7, fontWeight: 800, color: '#FB7185', lineHeight: 11 },
              pos2: { fontSize: 6, fontWeight: 700, color: '#34D399', lineHeight: 10 },
              neg2: { fontSize: 6, fontWeight: 700, color: '#FB7185', lineHeight: 10 },
            },
          },
        },
        {
          name: 'Orçado',
          type: 'bar' as const,
          data: oV,
          barMaxWidth: 30,
          itemStyle: { color: orcColor, borderRadius: [2, 2, 0, 0] },
          label: { show: true, position: 'inside' as const, formatter: (p: any) => fmtChartLabel(p.value, u), fontSize: 6, color: '#fff', fontWeight: 600 },
        },
      ],
    };
  };

  const desviosOption = buildMiniChart(top5Desvios, '#FB7185', '#FECDD3');
  const savingsOption = buildMiniChart(top5Savings, '#34D399', '#A7F3D0');

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel={section.label}
        title={`${t01.label} — Detalhamento por Categoria`}
        monthShort={data.monthShort}
        unitLabel="MILHARES (R$)"
        color={section.sectionColor}
        filterSlot={filterSlot}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left: table */}
        <div className="w-[48%] shrink-0 overflow-hidden px-3 pt-3 border-r border-gray-100">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Detalhamento por Categoria (R$ Milhares)
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                <th className="text-left px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">CATEGORIA</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">REAL</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">ORÇADO</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">Δ R$</th>
                <th className="text-right px-1.5 py-1 font-bold text-[9px] text-gray-500 border-b border-gray-200">VAR %</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => {
                const delta = row.real - row.orc;
                return (
                  <tr
                    key={idx}
                    className="border-b border-gray-50"
                    style={{ backgroundColor: row.isTotal ? `${accentClr}12` : 'white' }}
                  >
                    <td
                      className={`px-1.5 py-1 text-[10px] truncate max-w-0 ${row.isTotal ? 'font-extrabold' : 'font-medium text-gray-800'}`}
                      style={{ width: '38%', color: row.isTotal ? accentClr : undefined }}
                    >
                      {row.label}
                    </td>
                    <td
                      className={`text-right px-1.5 py-1 text-[10px] tabular-nums ${row.isTotal ? 'font-extrabold' : 'font-semibold text-gray-800'}`}
                      style={{ color: row.isTotal ? accentClr : undefined }}
                    >
                      {fmtK(row.real)}
                    </td>
                    <td className="text-right px-1.5 py-1 text-[10px] text-gray-500 tabular-nums">{fmtK(row.orc)}</td>
                    <td className="text-right px-1.5 py-1 text-[10px] font-semibold tabular-nums" style={{ color: deltaColor(row.orcPct) }}>
                      {(delta >= 0 ? '+' : '') + fmtK(delta)}
                    </td>
                    <td className="text-right px-1.5 py-1">
                      <VarBadge pct={row.orcPct} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: dois gráficos Top5 */}
        <div className="flex-1 min-w-0 flex flex-col px-2 pt-2 gap-1.5">

          {/* Top 5 Desvios */}
          {top5Desvios.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-1 px-1 mb-0.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-500">
                  Top {top5Desvios.length} Estouros
                </span>
              </div>
              <div className="flex-1 min-h-0 border border-red-100 rounded-lg overflow-hidden bg-red-50/30">
                <ReactECharts
                  option={desviosOption}
                  notMerge
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas', devicePixelRatio: 2 }}
                />
              </div>
            </div>
          )}

          {/* Top 5 Savings */}
          {top5Savings.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-1 px-1 mb-0.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">
                  Top {top5Savings.length} Savings
                </span>
              </div>
              <div className="flex-1 min-h-0 border border-emerald-100 rounded-lg overflow-hidden bg-emerald-50/30">
                <ReactECharts
                  option={savingsOption}
                  notMerge
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas', devicePixelRatio: 2 }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export interface VariancePptPreviewProps {
  data: VariancePptData;
  onReloadWithMarcas?: (marcas: string[]) => Promise<VariancePptData>;
  onReloadWithPeriod?: (month: string, isYtd: boolean, monthFrom?: string) => Promise<VariancePptData>;
  /** Callback unificado: substitui onReloadWithPeriod + onReloadWithMarcas para o painel de filtros */
  onReloadWithFilters?: (params: SlideReloadParams) => Promise<VariancePptData>;
  availableMonths?: string[];
  /** Quando fornecido, o componente restringe a visualização às marcas da lista. */
  restrictedMarcas?: string[];
}

// ─── Slide wrapper with hide toggle ──────────────────────────────────

function HideableSlide({
  slideKey,
  hidden,
  onToggle,
  onPresent,
  children,
}: {
  slideKey: string;
  hidden: boolean;
  onToggle: (key: string) => void;
  onPresent: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={() => onToggle(slideKey)}
        className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
          hidden
            ? 'bg-red-100 text-red-600 border border-red-200 opacity-100'
            : 'bg-white/80 text-gray-400 border border-gray-200 opacity-0 group-hover:opacity-100 hover:text-gray-600 hover:bg-white'
        }`}
        title={hidden ? 'Slide oculto — clique para exibir' : 'Ocultar este slide da apresentação'}
      >
        {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
        {hidden ? 'Oculto' : 'Ocultar'}
      </button>
      <button
        onClick={onPresent}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md bg-gray-900/85 text-white border border-gray-700 opacity-0 group-hover:opacity-100 hover:bg-gray-900"
        title="Apresentar a partir deste slide"
      >
        <Play size={10} />
        Apresentar daqui
      </button>
      <div className={hidden ? 'opacity-40 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}

export default function VariancePptPreview({ data, onReloadWithPeriod, onReloadWithFilters, availableMonths = [], restrictedMarcas }: VariancePptPreviewProps) {
  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hiddenSlides, setHiddenSlides] = useState<Set<string>>(new Set());

  // ── Unified global filters (drives both period picker and filter panel) ──────────
  const [globalFilters, setGlobalFilters] = useState<GlobalSlideFilters>({
    month: data.yearMonth ?? '',
    monthFrom: data.monthFrom,
    marcas: restrictedMarcas ?? [],
    tag01s: [],
  });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Derived values — keep existing code in contexts working
  const activeMarcas = globalFilters.marcas;
  const setActiveMarcas = useCallback((marcas: string[]) => {
    setGlobalFilters(prev => ({ ...prev, marcas }));
  }, []);
  const activePeriod: ActivePeriod = {
    month: globalFilters.month,
    monthFrom: globalFilters.monthFrom,
    isYtd: false,
  };
  const setActivePeriod = useCallback((p: ActivePeriod) => {
    setGlobalFilters(prev => ({ ...prev, month: p.month, monthFrom: p.monthFrom }));
  }, []);
  const periodLoading = globalLoading;

  // ── Base data ─────────────────────────────────────────────────────────────────
  const [baseData, setBaseData] = useState<VariancePptData>(data);

  // Reset when parent loads a new snapshot
  useEffect(() => {
    setBaseData(data);
    setGlobalFilters({
      month: data.yearMonth ?? '',
      monthFrom: data.monthFrom,
      marcas: restrictedMarcas ?? [],
      tag01s: [],
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Period change effect (SlideHeader picker — backward compat) ───────────────
  useEffect(() => {
    if (!onReloadWithPeriod || onReloadWithFilters) return;  // unified handler takes precedence
    if (!globalFilters.month) return;
    const sameMonth = globalFilters.month === (data.yearMonth ?? '');
    const sameYtd = false === (data.isYtd ?? false);
    const sameFrom = (globalFilters.monthFrom ?? '') === (data.monthFrom ?? '');
    if (sameMonth && !sameYtd && sameFrom) return;
    setGlobalLoading(true);
    onReloadWithPeriod(globalFilters.month, false, globalFilters.monthFrom)
      .then(d => { setBaseData(d); setGlobalFilters(prev => ({ ...prev, marcas: restrictedMarcas ?? [] })); })
      .catch(console.error)
      .finally(() => setGlobalLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilters.month, globalFilters.monthFrom]);

  // applyFilters: chamado diretamente pelo painel (sem useEffect intermediário)
  const applyFilters = useCallback(async (f: GlobalSlideFilters) => {
    if (!onReloadWithFilters || !f.month) return;
    setGlobalFilters(f);
    setGlobalLoading(true);
    console.log('[PPT] applyFilters →', f);
    try {
      const d = await onReloadWithFilters({ month: f.month, monthFrom: f.monthFrom, marcas: f.marcas, tag01s: f.tag01s });
      console.log('[PPT] applyFilters ← yearMonth:', d.yearMonth, 'monthFrom:', d.monthFrom, 'sections:', d.sections.length);
      setBaseData(d);
    } catch (e) {
      console.error('[PPT] applyFilters error:', e);
    } finally {
      setGlobalLoading(false);
    }
  }, [onReloadWithFilters]);

  // Apply marca filter in-memory on top of baseData
  const localData = useMemo(
    () => activeMarcas.length > 0 ? filterVariancePptData(baseData, { marcas: activeMarcas }) : baseData,
    [baseData, activeMarcas],
  );

  // All available marcas from the ORIGINAL baseData (never shrink the option list)
  // Se restrictedMarcas fornecido, limita às marcas permitidas do usuário
  const allAvailableMarcas = useMemo(() => {
    const all = [...new Set(Object.values(baseData.marcaBreakdowns ?? {}).flat().map(e => e.marca))].sort();
    if (restrictedMarcas && restrictedMarcas.length > 0) {
      return all.filter(m => restrictedMarcas.includes(m));
    }
    return all;
  }, [baseData, restrictedMarcas]);

  // All unique tag01 lines from current data (for filter panel)
  const availableTag01s = useMemo(() => {
    const names = new Set<string>();
    for (const section of baseData.sections) {
      for (const node of section.tag01Nodes) {
        if (node.label) names.add(node.label);
      }
    }
    return Array.from(names).sort();
  }, [baseData.sections]);

  // Count active non-default filters for badge
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (globalFilters.monthFrom) n++;
    if (globalFilters.marcas.length > 0) n++;
    if (globalFilters.tag01s.length > 0) n++;
    return n;
  }, [globalFilters]);

  const marcaCtxValue = useMemo(
    () => ({ activeMarcas, setActiveMarcas, loading: false }),
    [activeMarcas, setActiveMarcas],
  );

  // Months from Jan to current data month — always complete for live range selection.
  // availableMonths prop (snapshot-based) may be sparse; this ensures all months are pickable.
  const liveAvailableMonths = useMemo(() => {
    const ym = globalFilters.month || data.yearMonth;
    if (!ym) return availableMonths;
    const [yr, mo] = ym.split('-').map(Number);
    const months: string[] = [];
    for (let m = 1; m <= mo; m++) {
      months.push(`${yr}-${String(m).padStart(2, '0')}`);
    }
    return months;
  }, [activePeriod.month, data.yearMonth, availableMonths]);

  const periodCtxValue = useMemo(
    () => ({ activePeriod, setActivePeriod, periodLoading, availableMonths: liveAvailableMonths }),
    [activePeriod, periodLoading, liveAvailableMonths],
  );

  const toggleHide = useCallback((key: string) => {
    setHiddenSlides(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Build all slide entries with keys and sequential page numbers
  const allSlideEntries = useMemo(() => {
    const entries: { key: string; label: string; node: React.ReactNode }[] = [];
    let pageCounter = 1;

    entries.push({ key: 'cover', label: 'Capa', node: <CoverSlide key="cover" data={localData} /> });
    pageCounter++;

    // ── Global slides — filterable by Seções (tag0) + Marcas ─────────
    const globalSectionNames = localData.sections.map(s => s.tag0);
    const globalMarcas = allAvailableMarcas;
    const globalFilterGroups: FilterGroup[] = [
      ...(globalSectionNames.length > 1 ? [{ id: 'tag01s' as const, label: 'Seções', options: globalSectionNames }] : []),
      ...(globalMarcas.length > 0 ? [{ id: 'marcas' as const, label: 'Marcas', options: globalMarcas }] : []),
    ];

    const overviewPn = pageCounter;
    entries.push({
      key: 'overview', label: 'Visão Geral',
      node: (
        <FilterableSlide key="fs-overview" groups={globalFilterGroups}>
          {(filters, filterButton) => <OverviewSlide data={filterVariancePptData(localData, filters)} filterSlot={filterButton} />}
        </FilterableSlide>
      ),
    });
    pageCounter++;

    const performancePn = pageCounter;
    entries.push({
      key: 'performance', label: 'Performance vs Orçado',
      node: (
        <FilterableSlide key="fs-performance" groups={globalFilterGroups}>
          {(filters, filterButton) => <PerformanceSlide data={filterVariancePptData(localData, filters)} pageNum={performancePn} filterSlot={filterButton} />}
        </FilterableSlide>
      ),
    });
    pageCounter++;

    const analyticsPn = pageCounter;
    entries.push({
      key: 'analytics', label: 'Análise',
      node: (
        <FilterableSlide key="fs-analytics" groups={globalFilterGroups}>
          {(filters, filterButton) => <AnalyticsSlide data={filterVariancePptData(localData, filters)} pageNum={analyticsPn} filterSlot={filterButton} />}
        </FilterableSlide>
      ),
    });
    pageCounter++;

    for (const section of localData.sections) {
      if (section.tag01Nodes.length > 0) {
        // ── SectionSlide — filterable by tag01 + marca ──────────────────
        const sectionTag01s  = section.tag01Nodes.map(n => n.label);
        const depth3Marcas   = extractSectionMarcas(section);
        const breakdownEntries = localData.marcaBreakdowns?.[section.tag0] ?? [];
        const sectionMarcas  = depth3Marcas.length > 0
          ? depth3Marcas
          : [...new Set(breakdownEntries.map(e => e.marca))].sort();
        const sectionFilterGroups: FilterGroup[] = [
          ...(sectionTag01s.length > 1 ? [{ id: 'tag01s' as const, label: 'Sub-contas', options: sectionTag01s }] : []),
          ...(sectionMarcas.length > 0  ? [{ id: 'marcas' as const, label: 'Marcas',    options: sectionMarcas }] : []),
        ];
        const sectionPn = pageCounter;
        entries.push({
          key: `section-${section.tag0}`,
          label: section.label,
          node: (
            <FilterableSlide key={`fs-section-${section.tag0}`} groups={sectionFilterGroups}>
              {(filters, filterButton) => {
                const filteredSection = depth3Marcas.length > 0
                  ? filterSection(section, filters)
                  : filterSectionByMarcaBreakdowns(filterSection(section, filters), filters, breakdownEntries);
                return <SectionSlide section={filteredSection} data={localData} pageNum={sectionPn} filterSlot={filterButton} />;
              }}
            </FilterableSlide>
          ),
        });
        pageCounter++;

        // Slide 1: Tabela + Síntese IA / Slide 2: Justificativas (se existirem)
        const TAG01_SPLIT_BY_TAG02 = ['concess'];
        const CARDS_PER_JUST_SLIDE = 6;

        // Helper: push paginated justificativas slides for a set of cards
        const pushJustSlides = (
          cards: T01JustCard[],
          keyBase: string,
          labelBase: string,
          t01Node: VariancePptNode,
        ) => {
          const aggregated = aggregateJustCardsByMarca(cards);
          if (aggregated.length === 0) return;
          const pages: T01JustCard[][] = [];
          for (let i = 0; i < aggregated.length; i += CARDS_PER_JUST_SLIDE) {
            pages.push(aggregated.slice(i, i + CARDS_PER_JUST_SLIDE));
          }
          const allStatuses = [...new Set(aggregated.map(c => c.status))].sort();
          const justFilterGroups: FilterGroup[] = allStatuses.length > 1
            ? [{ id: 'statuses' as const, label: 'Status', options: allStatuses }]
            : [];
          pages.forEach((pageCards, pi) => {
            const slideLabel = pages.length > 1 ? `(${pi + 1}/${pages.length})` : undefined;
            const fullLabel = `${labelBase} — Justificativas${slideLabel ? ` ${slideLabel}` : ''}`;
            const justPn = pageCounter;
            entries.push({
              key: `${keyBase}-p${pi}`,
              label: fullLabel,
              node: (
                <FilterableSlide key={`fs-${keyBase}-p${pi}`} groups={justFilterGroups}>
                  {(filters, filterButton) => {
                    const filteredCards = filterJustCards(pageCards, filters);
                    return (
                      <Tag01JustificativasSlide
                        key={`${keyBase}-p${pi}`}
                        section={section}
                        t01={t01Node}
                        data={localData}
                        cards={filteredCards}
                        pageNum={justPn}
                        slideLabel={slideLabel}
                        titleOverride={fullLabel}
                        filterSlot={filterButton}
                      />
                    );
                  }}
                </FilterableSlide>
              ),
            });
            pageCounter++;
          });
        };

        const TAG01_WITH_T02_BREAKDOWN = ['folha'];

        for (const t01 of section.tag01Nodes) {
          const shouldSplit = TAG01_SPLIT_BY_TAG02.some(k => t01.label.toLowerCase().includes(k)) && t01.children.length > 0;
          const shouldBreakdown = TAG01_WITH_T02_BREAKDOWN.some(k => t01.label.toLowerCase().includes(k)) && t01.children.length > 0;

          if (shouldSplit) {
            // Per-tag02: detail slide immediately followed by its own justificativas
            for (const tag02 of t01.children) {
              const tag02Rows = buildTag02AsT01Rows(tag02);
              const overrideTitle = `${section.label} — ${tag02.label}`;

              // Detail slide for this tag02 (no per-slide filter — already narrowed to one tag02)
              entries.push({
                key: `tag01detail-${section.tag0}-${t01.label}-${tag02.label}`,
                label: overrideTitle,
                node: (
                  <Tag01DetailSlide
                    key={`tag01detail-${section.tag0}-${t01.label}-${tag02.label}`}
                    section={section}
                    t01={t01}
                    data={localData}
                    rows={tag02Rows}
                    pageNum={pageCounter}
                    titleOverride={overrideTitle}
                  />
                ),
              });
              pageCounter++;

              // Justificativas only for this tag02's subtree
              const tag02Cards = buildT01JustCards(tag02);
              pushJustSlides(
                tag02Cards,
                `tag01just-${section.tag0}-${t01.label}-${tag02.label}`,
                overrideTitle,
                t01,
              );
            }
          } else {
            const allRows  = buildT01Rows(t01);
            const allCards = buildT01JustCards(t01);

            // ── Tag01DetailSlide — filterable by tag02 + marca ────────
            const detailTag02s  = t01.children.map(c => c.label);
            const detailMarcas  = extractNodeMarcas(t01);
            const detailFilterGroups: FilterGroup[] = [
              ...(detailTag02s.length > 1 ? [{ id: 'tag02s' as const, label: 'Categorias', options: detailTag02s }] : []),
              ...(detailMarcas.length > 0  ? [{ id: 'marcas' as const, label: 'Marcas',    options: detailMarcas }] : []),
            ];
            const detailPn = pageCounter;
            entries.push({
              key: `tag01detail-${section.tag0}-${t01.label}`,
              label: `${section.label} — ${t01.label}`,
              node: (
                <FilterableSlide key={`fs-detail-${section.tag0}-${t01.label}`} groups={detailFilterGroups}>
                  {(filters, filterButton) => (
                    <Tag01DetailSlide
                      section={section}
                      t01={t01}
                      data={localData}
                      rows={filterT01Rows(allRows, filters)}
                      pageNum={detailPn}
                      filterSlot={filterButton}
                    />
                  )}
                </FilterableSlide>
              ),
            });
            pageCounter++;

            // Tag02 breakdown slide (ex: Folha de Funcionários → categorias)
            if (shouldBreakdown) {
              const breakdownTag02s = t01.children.map(c => c.label);
              const breakdownMarcas = extractNodeMarcas(t01);
              const breakdownFilterGroups: FilterGroup[] = [
                ...(breakdownTag02s.length > 1 ? [{ id: 'tag02s' as const, label: 'Categorias', options: breakdownTag02s }] : []),
                ...(breakdownMarcas.length > 0  ? [{ id: 'marcas' as const, label: 'Marcas',    options: breakdownMarcas }] : []),
              ];
              const breakdownPn = pageCounter;
              entries.push({
                key: `tag01breakdown-${section.tag0}-${t01.label}`,
                label: `${section.label} — ${t01.label} — Categorias`,
                node: (
                  <FilterableSlide key={`fs-breakdown-${section.tag0}-${t01.label}`} groups={breakdownFilterGroups}>
                    {(filters, filterButton) => {
                      const filtT01 = filters.tag02s?.length || filters.marcas?.length
                        ? { ...t01, children: t01.children
                            .filter(c => !filters.tag02s?.length || filters.tag02s.includes(c.label))
                            .map(c => filters.marcas?.length
                              ? { ...c, children: c.children.filter(m => filters.marcas!.includes(m.label)) }
                              : c)
                          }
                        : t01;
                      return (
                        <Tag01T02BreakdownSlide
                          section={section}
                          t01={filtT01}
                          data={localData}
                          pageNum={breakdownPn}
                          filterSlot={filterButton}
                        />
                      );
                    }}
                  </FilterableSlide>
                ),
              });
              pageCounter++;
            }

            // Justificativas
            pushJustSlides(
              allCards,
              `tag01just-${section.tag0}-${t01.label}`,
              `${section.label} — ${t01.label}`,
              t01,
            );
          }
        }
      }

      // ── MarcaSlide — filterable by marca ──────────────────────────────
      const marcaEntries = localData.marcaBreakdowns?.[section.tag0];
      if (marcaEntries && marcaEntries.length > 0) {
        const marcaOptions = [...new Set(marcaEntries.map(e => e.marca))].sort();
        const marcaFilterGroups: FilterGroup[] = marcaOptions.length > 1
          ? [{ id: 'marcas' as const, label: 'Marcas', options: marcaOptions }]
          : [];
        const marcaPn = pageCounter;
        entries.push({
          key: `marca-${section.tag0}`,
          label: `${section.label} Marcas`,
          node: (
            <FilterableSlide key={`fs-marca-${section.tag0}`} groups={marcaFilterGroups}>
              {(filters, filterButton) => (
                <MarcaSlide
                  section={section}
                  data={localData}
                  entries={filterMarcaEntries(marcaEntries, filters)}
                  pageNum={marcaPn}
                  filterSlot={filterButton}
                />
              )}
            </FilterableSlide>
          ),
        });
        pageCounter++;
      }
    }

    const summaryPn = pageCounter;
    entries.push({
      key: 'summary', label: 'Resumo',
      node: (
        <FilterableSlide key="fs-summary" groups={globalFilterGroups}>
          {(filters, filterButton) => <SummarySlide data={filterVariancePptData(localData, filters)} pageNum={summaryPn} filterSlot={filterButton} />}
        </FilterableSlide>
      ),
    });
    return entries;
  }, [localData, allAvailableMarcas]);

  const presentationSlides = useMemo(
    () => allSlideEntries.filter(e => !hiddenSlides.has(e.key)).map(e => e.node),
    [allSlideEntries, hiddenSlides],
  );

  const totalSlides = presentationSlides.length;
  const hiddenCount = hiddenSlides.size;

  const goNext = useCallback(() => setCurrentSlide(c => Math.min(c + 1, totalSlides - 1)), [totalSlides]);
  const goPrev = useCallback(() => setCurrentSlide(c => Math.max(c - 1, 0)), []);
  const exitPresentation = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const startPresentation = useCallback((fromEntryIndex?: number) => {
    let slideIdx = 0;
    if (fromEntryIndex !== undefined) {
      const key = allSlideEntries[fromEntryIndex]?.key;
      if (key) {
        const visibleKeys = allSlideEntries.filter(e => !hiddenSlides.has(e.key)).map(e => e.key);
        const idx = visibleKeys.indexOf(key);
        slideIdx = idx >= 0 ? idx : 0;
      }
    }
    setCurrentSlide(slideIdx);
    setPresenting(true);
    document.documentElement.requestFullscreen().catch(() => {});
  }, [allSlideEntries, hiddenSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!presenting) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') { e.preventDefault(); exitPresentation(); }
      else if (e.key === 'Home') { e.preventDefault(); setCurrentSlide(0); }
      else if (e.key === 'End') { e.preventDefault(); setCurrentSlide(totalSlides - 1); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [presenting, goNext, goPrev, exitPresentation, totalSlides]);

  useEffect(() => {
    if (!presenting) return;
    const handleFsChange = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [presenting]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {allSlideEntries.length} slides
          {hiddenCount > 0 && (
            <span className="text-red-500 font-bold ml-1">
              ({hiddenCount} oculto{hiddenCount > 1 ? 's' : ''})
            </span>
          )}
          {globalLoading && (
            <span className="text-blue-500 font-bold ml-2 animate-pulse">⟳ atualizando…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setHiddenSlides(new Set())}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Eye size={13} />
              Exibir todos
            </button>
          )}
          {onReloadWithFilters && (
            <button
              onClick={() => setShowFilterPanel(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors"
              style={activeFilterCount > 0
                ? { background: '#EFF6FF', borderColor: '#93C5FD', color: '#1D4ED8' }
                : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              <SlidersHorizontal size={13} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-blue-600 text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => startPresentation()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Play size={16} />
            Apresentar
          </button>
        </div>
      </div>

      {/* Filter panel (preview mode) */}
      {showFilterPanel && onReloadWithFilters && (
        <SlideFiltersPanel
          current={globalFilters}
          liveMonths={liveAvailableMonths}
          availableMarcas={allAvailableMarcas}
          availableTag01s={availableTag01s}
          loading={globalLoading}
          onApply={f => { applyFilters(f); setShowFilterPanel(false); }}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      <PeriodContext.Provider value={periodCtxValue}>
        <MarcaFilterContext.Provider value={marcaCtxValue}>
          {/* All slides — preview mode */}
          {allSlideEntries.map((entry, idx) => (
            <HideableSlide
              key={entry.key}
              slideKey={entry.key}
              hidden={hiddenSlides.has(entry.key)}
              onToggle={toggleHide}
              onPresent={() => startPresentation(idx)}
            >
              {entry.node}
            </HideableSlide>
          ))}
        </MarcaFilterContext.Provider>
      </PeriodContext.Provider>

      {/* Presentation mode overlay */}
      {presenting && (
        <PeriodContext.Provider value={periodCtxValue}>
          <MarcaFilterContext.Provider value={marcaCtxValue}>
            <PresentationMode
              slides={presentationSlides}
              currentSlide={currentSlide}
              totalSlides={totalSlides}
              onPrev={goPrev}
              onNext={goNext}
              onExit={exitPresentation}
              onOpenFilters={onReloadWithFilters ? () => setShowFilterPanel(true) : undefined}
              filterActiveCount={activeFilterCount}
              filterPanel={showFilterPanel && onReloadWithFilters ? (
                <SlideFiltersPanel
                  current={globalFilters}
                  liveMonths={liveAvailableMonths}
                  availableMarcas={allAvailableMarcas}
                  availableTag01s={availableTag01s}
                  loading={globalLoading}
                  onApply={f => { applyFilters(f); setShowFilterPanel(false); }}
                  onClose={() => setShowFilterPanel(false)}
                />
              ) : undefined}
            />
          </MarcaFilterContext.Provider>
        </PeriodContext.Provider>
      )}
    </div>
  );
}
