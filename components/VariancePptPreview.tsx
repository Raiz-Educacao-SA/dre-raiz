// ─── Variance PPT Preview — HTML Slide Cards ────────────────────────
// Renders VariancePptData as visual slide cards (same structure as PPTX)
// Visual design inspired by Genspark executive presentation quality

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type {
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
  VariancePptMarcaEntry,
} from '../services/variancePptTypes';
import { VARIANCE_COLORS } from '../services/variancePptTypes';

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

// ─── Slide Header — Genspark style ───────────────────────────────────

function SlideHeader({
  sectionLabel,
  title,
  monthShort,
  color,
  unitLabel,
}: {
  sectionLabel?: string;
  title: string;
  monthShort: string;
  color?: string;
  unitLabel?: string;
}) {
  const accentColor = color ? `#${color}` : '#2563EB';
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
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {monthShort}
          </span>
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

// ─── AI Insights Box ─────────────────────────────────────────────────

function InsightsBox({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: `linear-gradient(135deg, #${C.headerBg} 0%, #${C.headerBg}ee 100%)` }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex(C.accent) }} />
        <span className="text-[9px] font-bold tracking-widest" style={{ color: hex(C.accent) }}>
          SÍNTESE IA
        </span>
      </div>
      <p
        className={compact ? 'text-[9px] line-clamp-2 leading-snug' : 'text-[11px] leading-relaxed'}
        style={{ color: text ? '#D1D5DB' : '#6B728080' }}
      >
        {text || 'Síntese pendente'}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1: COVER — Full blue background (Genspark style)
// ═══════════════════════════════════════════════════════════════════════

function CoverSlide({ data }: { data: VariancePptData }) {
  const snapLabel = data.snapshotAt
    ? `Atualizado em ${new Date(data.snapshotAt).toLocaleDateString('pt-BR')} ${new Date(data.snapshotAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;
  const marcaList = data.marca ? data.marca.split(',').map(m => m.trim()).filter(Boolean) : [];

  return (
    <SlideCard>
      {/* Full blue background */}
      <div className="absolute inset-0" style={{ backgroundColor: '#1D4ED8' }} />

      {/* Diagonal geometric right element */}
      <div className="absolute right-0 top-0 bottom-0 overflow-hidden pointer-events-none" style={{ width: '38%' }}>
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(148deg, transparent 32%, #2563EB 32%)', opacity: 0.8 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, transparent 50%, #1E40AF 50%)', opacity: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full px-10 py-7">
        {/* Top: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/30 bg-white/15">
            <div className="w-5 h-5 rounded bg-white/70" />
          </div>
          <div>
            <div className="text-[20px] font-black text-white tracking-widest leading-none">RAIZ</div>
            <div className="text-[8px] font-bold tracking-[0.2em] text-blue-200 uppercase">
              Inteligência Financeira
            </div>
          </div>
        </div>

        {/* Center: Title */}
        <div>
          <div className="flex items-start gap-1 mb-2">
            <div className="w-[3px] rounded bg-white/80 self-stretch mr-2" />
            <div>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded border border-white/30 text-[9px] font-bold tracking-widest text-white/80 uppercase"
              >
                FINANCEIRO
              </span>
              {marcaList.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {marcaList.map(m => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded border border-white/25 text-[9px] font-bold text-white/75"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-[4px] rounded-full bg-white self-stretch shrink-0" />
            <div>
              <h1 className="text-[50px] font-black text-white leading-none tracking-tight">Book de</h1>
              <h1 className="text-[50px] font-black text-white leading-none tracking-tight">Resultados</h1>
              <p className="text-[18px] font-semibold mt-3" style={{ color: '#93C5FD' }}>
                DRE Gerencial •{' '}
                <strong className="text-white">{data.monthLabel}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Metadata */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-bold tracking-widest text-blue-300 uppercase mb-1.5">
              INFORMAÇÕES DO DOCUMENTO
            </div>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1 text-[11px] text-blue-200">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                Versão {data.version}
              </span>
              {snapLabel && (
                <span className="flex items-center gap-1 text-[11px] text-blue-200">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  {snapLabel}
                </span>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border border-white/20 px-4 py-2.5 text-right"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="text-[9px] font-bold tracking-widest text-blue-300 uppercase mb-0.5">
              STATUS DE PROCESSO
            </div>
            <div
              className="text-[15px] font-black text-white"
            >
              {data.stats.coveragePct}% das contas justificadas
            </div>
          </div>
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2: DRE OVERVIEW — table left + bar chart right (Genspark p2)
// ═══════════════════════════════════════════════════════════════════════

function OverviewSlide({ data }: { data: VariancePptData }) {
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

  const chartOption = {
    grid: { left: 8, right: 8, top: 38, bottom: 32 },
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
          formatter: (p: any) => {
            const idx = p.dataIndex;
            const pct = overviewVarPcts[idx];
            const abs = overviewVarAbs[idx];
            const val = fmtChartLabel(p.value, unit);
            if (pct === null || pct === undefined) return `{val|${val}}`;
            const fav = pct >= 0;
            const tag = fav ? 'pos' : 'neg';
            const sign = pct >= 0 ? '+' : '-';
            const absLabel = `${sign}${fmtChartLabel(Math.abs(toChartVal(abs, unit)), unit)}`;
            const pctLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
            return `{${tag}|${absLabel} | ${pctLabel}}\n{val|${val}}`;
          },
          rich: {
            pos: { fontSize: 7, fontWeight: 800, color: '#16A34A', lineHeight: 13 },
            neg: { fontSize: 7, fontWeight: 800, color: '#DC2626', lineHeight: 13 },
            val: { fontSize: 8, fontWeight: 700, color: '#2563EB', lineHeight: 11 },
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
            <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
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

function SectionSlide({ section, data, pageNum }: { section: VariancePptSection; data: VariancePptData; pageNum?: number }) {
  if (section.tag01Nodes.length === 0) return null;

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

  // Bar chart
  const allRaw = section.tag01Nodes.flatMap(n => [Math.abs(n.real), Math.abs(n.orcCompare)]);
  const unit = detectScale(...allRaw);
  const labels = section.tag01Nodes.map(n => n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label);
  const realV = section.tag01Nodes.map(n => Math.abs(toChartVal(n.real, unit)));
  const orcV = section.tag01Nodes.map(n => Math.abs(toChartVal(n.orcCompare, unit)));
  const sectionVarPcts = section.tag01Nodes.map(n => n.orcVarPct);
  const sectionVarAbs = section.tag01Nodes.map(n => n.real - n.orcCompare);

  const accentClr = `#${section.sectionColor}`;

  const chartOption = {
    grid: { left: 8, right: 8, top: 42, bottom: 32 },
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
          position: 'top' as const,
          formatter: (p: any) => {
            const idx = p.dataIndex;
            const pct = sectionVarPcts[idx];
            const abs = sectionVarAbs[idx];
            const val = fmtChartLabel(p.value, unit);
            if (pct === null || pct === undefined) return `{val|${val}}`;
            const fav = pct >= 0;
            const tag = fav ? 'pos' : 'neg';
            const sign = pct >= 0 ? '+' : '-';
            const absLabel = `${sign}${fmtChartLabel(Math.abs(toChartVal(abs, unit)), unit)}`;
            const pctLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
            return `{${tag}|${absLabel} | ${pctLabel}}\n{val|${val}}`;
          },
          rich: {
            pos: { fontSize: 7, fontWeight: 800, color: '#16A34A', lineHeight: 13 },
            neg: { fontSize: 7, fontWeight: 800, color: '#DC2626', lineHeight: 13 },
            val: { fontSize: 9, fontWeight: 700, color: accentClr, lineHeight: 11 },
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
        sectionLabel={section.tag0}
        title={`${section.label} – Análise de Componentes`}
        monthShort={data.monthShort}
        color={section.sectionColor}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left panel: insight cards */}
        <div className="w-[33%] shrink-0 flex flex-col gap-2 px-4 py-3 border-r border-gray-100">
          {/* Card 1: Worst/Attention */}
          {worstNode && (
            <div
              className="flex-1 rounded-xl p-3 border flex flex-col gap-1 overflow-hidden"
              style={{ backgroundColor: worstBg, borderColor: worstBorder }}
            >
              <div className="flex items-center gap-1 shrink-0">
                {!worstFav && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill={worstAccent}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                )}
                {worstFav && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill={worstAccent}>
                    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                    <polyline points="16,7 22,7 22,13" />
                  </svg>
                )}
                <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: worstAccent }}>
                  {worstType}
                </span>
              </div>
              <div className="text-[15px] font-black leading-tight shrink-0" style={{ color: worstAccent }}>
                {truncate(worstNode.label, 22)}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-500">Real vs Orçado</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: worstAccent }}>
                  {fmtPct(worstNode.orcVarPct)}
                </span>
              </div>
              {(worstNode.orcAiSummary || worstNode.orcJustification) && (
                <p className="text-[9px] text-gray-500 leading-snug line-clamp-3 mt-0.5">
                  {(worstNode.orcAiSummary || worstNode.orcJustification || '').slice(0, 130)}
                </p>
              )}
            </div>
          )}

          {/* Card 2: Biggest component */}
          {biggestNode && biggestNode !== worstNode ? (
            <div className="flex-1 rounded-xl p-3 border border-blue-100 bg-blue-50 flex flex-col gap-1 overflow-hidden">
              <span className="text-[9px] font-bold tracking-wider uppercase text-blue-600 shrink-0">
                MAIOR COMPONENTE
              </span>
              <div className="text-[15px] font-black text-blue-700 leading-tight shrink-0">
                {truncate(biggestNode.label, 22)}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-500">Representatividade</span>
                <span className="text-[11px] font-bold text-blue-700">{biggestRep}%</span>
              </div>
              {(biggestNode.orcAiSummary || biggestNode.orcJustification) && (
                <p className="text-[9px] text-gray-500 leading-snug line-clamp-3 mt-0.5">
                  {(biggestNode.orcAiSummary || biggestNode.orcJustification || '').slice(0, 130)}
                </p>
              )}
            </div>
          ) : insightText ? (
            <div className="flex-1">
              <InsightsBox text={insightText} compact />
            </div>
          ) : null}

          {/* Legend */}
          <div className="shrink-0 mt-auto pt-1">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">LEGENDA DO GRÁFICO</div>
            <div className="flex gap-3">
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

        {/* Right panel: Chart */}
        <div className="flex-1 min-w-0 flex flex-col px-3 pt-3">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
            COMPARATIVO POR COMPONENTE (R$ {scaleLabel(unit)})
          </div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
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
}: {
  section: VariancePptSection;
  data: VariancePptData;
  entries: VariancePptMarcaEntry[];
  pageNum?: number;
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

  const accentClr = `#${section.sectionColor}`;

  const chartOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, textStyle: { fontSize: 12 } },
    legend: {
      bottom: 4, itemWidth: 12, itemHeight: 8,
      textStyle: { fontSize: 10, fontWeight: 600, color: '#374151' },
    },
    grid: { left: 6, right: 6, top: 44, bottom: 34 },
    xAxis: {
      type: 'category' as const,
      data: labels,
      axisLabel: { fontSize: 12, fontWeight: 800, color: '#1F2937' },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, show: false, splitLine: { show: false } },
    series: [
      {
        name: 'Real',
        type: 'bar' as const,
        data: realV,
        barMaxWidth: 44,
        barGap: '12%',
        itemStyle: { color: accentClr, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => {
            const idx = p.dataIndex;
            const d = marcaDeltas[idx];
            const val = fmtChartLabel(p.value, unit);
            if (d.orcPct === null) return `{val|${val}}`;
            const fav = d.orcPct >= 0;
            const tag = fav ? 'pos' : 'neg';
            const sign = d.orcPct >= 0 ? '+' : '-';
            const absLabel = `${sign}${fmtChartLabel(Math.abs(toChartVal(d.orcAbs, unit)), unit)}`;
            const pctLabel = `${d.orcPct >= 0 ? '+' : ''}${d.orcPct.toFixed(1)}%`;
            return `{${tag}|${absLabel} | ${pctLabel}}\n{val|${val}}`;
          },
          rich: {
            pos: { fontSize: 8, fontWeight: 800, color: '#16A34A', lineHeight: 14 },
            neg: { fontSize: 8, fontWeight: 800, color: '#DC2626', lineHeight: 14 },
            val: { fontSize: 10, fontWeight: 700, color: accentClr, lineHeight: 12 },
          },
        },
      },
      {
        name: 'Orçado',
        type: 'bar' as const,
        data: orcV,
        barMaxWidth: 44,
        itemStyle: { color: '#D1D5DB', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 9,
          color: '#9CA3AF',
          fontWeight: 600,
        },
      },
      {
        name: String(data.a1Year),
        type: 'bar' as const,
        data: a1V,
        barMaxWidth: 44,
        itemStyle: { color: hex(C.teal), borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top' as const,
          formatter: (p: any) => fmtChartLabel(p.value, unit),
          fontSize: 9,
          color: hex(C.teal),
          fontWeight: 600,
        },
      },
    ],
  };

  // Sort marcas for ranking: worst to best (most negative orcPct first)
  const ranked = filtered
    .map((e, i) => ({ ...e, ...marcaDeltas[i] }))
    .sort((a, b) => (a.orcPct ?? 0) - (b.orcPct ?? 0));

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={`${section.label} por Marca`}
        monthShort={data.monthShort}
        color={section.sectionColor}
        unitLabel={scaleLabel(unit)}
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left 65%: Chart full height */}
        <div className="flex-1 min-w-0 flex flex-col px-3 pt-2 min-h-0">
          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>

        {/* Right 35%: KPI summary + per-marca ranking */}
        <div className="w-[35%] shrink-0 border-l border-gray-100 flex flex-col px-3 pt-2 pb-1 gap-2">

          {/* KPI row — 2 cols */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
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
              </div>
              <div className="text-[8px] tabular-nums mt-0.5" style={{ color: favorable ? '#16A34A' : '#DC2626' }}>
                {fmtScaled(Math.abs(deltaAbs), unit)} {suffix}
              </div>
            </div>
            <div className="rounded-lg p-2 border border-gray-100 bg-gray-50">
              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                {deltaA1Abs >= 0 ? 'ECON.' : 'DESVIO'} vs {data.a1Year}
              </div>
              <div className="text-[13px] font-black tabular-nums" style={{ color: deltaColor(deltaA1Pct) }}>
                {fmtPct(deltaA1Pct)}
              </div>
              <div className="text-[8px] tabular-nums mt-0.5 text-gray-400">
                {fmtScaled(Math.abs(deltaA1Abs), unit)} {suffix}
              </div>
            </div>
          </div>

          {/* Per-marca ranking */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
              RANKING POR MARCA — Δ vs Orçado
            </div>
            <div className="flex flex-col gap-1 overflow-hidden">
              {ranked.map((e, i) => {
                const fav = (e.orcPct ?? 0) >= 0;
                const barW = Math.min(100, Math.abs(e.orcPct ?? 0) * 2);
                const barClr = fav ? '#16A34A' : '#DC2626';
                return (
                  <div key={e.marca} className="flex items-center gap-1.5 shrink-0">
                    {/* rank */}
                    <span className="text-[8px] font-black text-gray-300 w-3 shrink-0 text-right">{i + 1}</span>
                    {/* marca badge */}
                    <span className="text-[9px] font-black w-8 shrink-0" style={{ color: accentClr }}>{e.marca}</span>
                    {/* real value */}
                    <span className="text-[9px] tabular-nums text-gray-500 w-10 shrink-0 text-right">
                      {fmtScaled(Math.abs(e.real), unit)}{suffix}
                    </span>
                    {/* bar */}
                    <div className="flex-1 min-w-0 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barW}%`, backgroundColor: barClr, opacity: 0.8 }}
                      />
                    </div>
                    {/* delta pct */}
                    <span className="text-[9px] font-bold tabular-nums w-10 shrink-0 text-right" style={{ color: barClr }}>
                      {e.orcPct !== null ? `${e.orcPct >= 0 ? '+' : ''}${e.orcPct.toFixed(1)}%` : '–'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI insight */}
          {(section.node.enrichedInsight || section.node.orcAiSummary) && (
            <div className="shrink-0 mt-auto">
              <InsightsBox text={section.node.enrichedInsight || section.node.orcAiSummary || ''} compact />
            </div>
          )}
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PERFORMANCE SLIDE — Horizontal bar chart + Entendendo os Desvios (Genspark p3)
// ═══════════════════════════════════════════════════════════════════════

function PerformanceSlide({ data, pageNum }: { data: VariancePptData; pageNum?: number }) {
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
      />
      <div className="flex gap-0 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Left: horizontal bar chart */}
        <div className="flex-1 min-w-0 flex flex-col px-4 pt-3 border-r border-gray-100">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 shrink-0">
            VARIAÇÃO PERCENTUAL (REAL VS ORÇADO)
          </div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
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

function AnalyticsSlide({ data, pageNum }: { data: VariancePptData; pageNum?: number }) {
  const margemCalc   = data.calcRows.find(c => c.label.includes('MARGEM'));
  const ebitdaSrCalc = data.calcRows.find(c => c.label.includes('S/ RATEIO') || c.label.includes('SEM RATEIO'));
  const ebitdaTotal  = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  const receitaSection = data.sections.find(s => s.tag0.startsWith('01.'));
  const receitaReal = receitaSection?.node.real || 0;
  const ebitdaReal  = ebitdaTotal?.real || 0;
  const margemReal  = margemCalc?.real || 0;
  const margemPct   = receitaReal !== 0 ? (margemReal / Math.abs(receitaReal)) * 100 : null;
  const ebitdaMgPct = receitaReal !== 0 ? (ebitdaReal / Math.abs(receitaReal)) * 100 : null;

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

  const wfLabels  = bars.map(b => b.label);
  const wfBase    = bars.map(b => b.base);
  const wfDelta   = bars.map(b => ({ value: b.delta, itemStyle: { color: b.color, borderRadius: [4, 4, 0, 0] } }));
  const connectorY = bars.map(b => b.connY);

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
    grid: { left: 8, right: 8, top: 24, bottom: 56 },
    xAxis: {
      type: 'category' as const,
      data: wfLabels,
      axisLabel: { fontSize: 10, fontWeight: 700, color: '#374151', interval: 0, overflow: 'truncate' as const, width: 72 },
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
        name: 'delta', type: 'bar' as const, stack: 'wf', barMaxWidth: 64,
        data: wfDelta,
        label: {
          show: true, position: 'inside' as const,
          fontSize: 11, fontWeight: 700, color: '#FFFFFF',
          formatter: labelFmt,
        },
      },
      {
        name: 'connector', type: 'line' as const, silent: true,
        step: 'end' as const,
        data: connectorY,
        lineStyle: { color: '#9CA3AF', type: 'dashed' as const, width: 1.5 },
        symbol: 'none',
        z: 2,
      },
    ],
  };

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel="EVOLUÇÃO DO RESULTADO"
        title={`EBITDA Bridge – ${data.monthShort}`}
        monthShort={data.monthShort}
        unitLabel={scaleLabel(unit)}
      />
      <div className="flex gap-3 px-4 pb-8 pt-2" style={{ height: 'calc(100% - 52px)' }}>

        {/* Chart — main area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <ReactECharts option={waterfallOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-5 pt-1 shrink-0">
            {[
              { color: colorReceita,   label: 'Receita' },
              { color: colorCost,      label: 'Custos/Despesas' },
              { color: colorMilestone, label: 'Resultado Parcial' },
              { color: colorFinal,     label: 'Resultado Final' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: KPI panel */}
        <div className="w-44 shrink-0 flex flex-col gap-2.5">
          <KpiCard
            label={`RECEITA ${data.year}`}
            value={`${fmtScaled(Math.abs(receitaReal), unit)} ${suffix}`}
            color={colorReceita}
          />
          {margemReal !== 0 && (
            <KpiCard
              label="MARGEM CONTRIB."
              value={`${fmtScaled(Math.abs(margemReal), unit)} ${suffix}`}
              color={colorMilestone}
              sub={margemPct !== null ? `${margemPct.toFixed(1)}% da Receita` : undefined}
            />
          )}
          <KpiCard
            label="EBITDA TOTAL"
            value={`${fmtScaled(Math.abs(ebitdaReal), unit)} ${suffix}`}
            color={colorFinal}
            sub={ebitdaMgPct !== null ? `Margem: ${ebitdaMgPct.toFixed(1)}%` : undefined}
          />

          {/* Section values */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 flex flex-col gap-1 flex-1 min-h-0 overflow-auto">
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Seções</div>
            {data.sections.map((s, i) => {
              const isReceita = s.tag0.startsWith('01.');
              const color = isReceita ? colorReceita : colorCost;
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] text-gray-600 truncate font-medium">
                      {s.label.replace(/^\d+\.\s*/, '').slice(0, 14)}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold tabular-nums shrink-0" style={{ color }}>
                    {s.node.real < 0 ? '−' : ''}{fmtChartLabel(Math.abs(toChartVal(Math.abs(s.node.real), unit)), unit)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FINAL SLIDE: RESUMO EXECUTIVO (Genspark p8 — 3 cards + next steps)
// ═══════════════════════════════════════════════════════════════════════

function SummarySlide({ data, pageNum }: { data: VariancePptData; pageNum?: number }) {
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

        {/* Bottom: Próximos Passos */}
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
              <polygon points="5,3 19,12 5,21 5,3" />
            </svg>
            <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
              PRÓXIMOS PASSOS &amp; RECOMENDAÇÕES
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
            {/* Passo 1 */}
            <div className="rounded-lg bg-white border border-gray-200 p-3 flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                  <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                  <polyline points="16,7 22,7 22,13" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gray-800">
                  {attentionItems.length > 0 ? attentionItems[0].label.replace(/^\d+\.\s*/, '') : 'Recuperação de Receita'}
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">
                  Plano de ação focado nas linhas com maior desvio negativo em relação ao orçado.
                </p>
              </div>
            </div>
            {/* Passo 2 */}
            <div className="rounded-lg bg-white border border-gray-200 p-3 flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gray-800">Monitoramento</div>
                <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">
                  Acompanhar semanalmente as linhas com desvios acima de 5% em relação ao orçamento.
                </p>
              </div>
            </div>
            {/* Passo 3 */}
            <div className="rounded-lg bg-white border border-gray-200 p-3 flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                  <polyline points="9,11 12,14 22,4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gray-800">Processos</div>
                <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">
                  Meta de justificativas {'>'} 90% até o próximo fechamento. {stats.pending + stats.notified} contas pendentes.
                </p>
              </div>
            </div>
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

function buildT01JustCards(t01: VariancePptNode): T01JustCard[] {
  const cards: T01JustCard[] = [];
  const collect = (node: VariancePptNode) => {
    const text = node.orcJustification || node.orcAiSummary;
    if (text && node.depth >= 2) {
      cards.push({
        label: node.label,
        varPct: node.orcVarPct,
        varAbs: node.real - node.orcCompare,
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

function JustCardItem({ card }: { card: T01JustCard }) {
  const dColor = deltaColor(card.varPct);
  const sColor = statusColor(card.status);
  const favorable = (card.varPct ?? 0) >= 0;
  const bgColor = favorable ? '#F0FDF4' : '#FFF5F5';
  const borderColor = favorable ? '#BBF7D0' : '#FECACA';
  const absK = card.varAbs !== null ? fmtK(card.varAbs) : null;
  return (
    <div className="rounded-lg border overflow-hidden flex flex-shrink-0" style={{ backgroundColor: bgColor, borderColor }}>
      <div className="w-1 shrink-0" style={{ backgroundColor: dColor }} />
      <div className="px-2.5 py-2 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-gray-800 truncate">{truncate(card.label, 24)}</span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-bold tabular-nums" style={{ color: dColor }}>{fmtPct(card.varPct)}</span>
            {absK && <span className="text-[10px] font-semibold text-gray-400 tabular-nums">{absK}k</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sColor }} />
          {card.owner && <span className="text-[10px] italic text-gray-400 truncate">{card.owner}</span>}
        </div>
        <p className="text-[11px] text-gray-600 leading-snug mt-1 line-clamp-3">{card.justText}</p>
      </div>
    </div>
  );
}

// SLIDE 1 DE 2: Tabela + Síntese IA
function Tag01DetailSlide({
  section, t01, data, rows, pageNum,
}: {
  section: VariancePptSection;
  t01: VariancePptNode;
  data: VariancePptData;
  rows: T01Row[];
  pageNum?: number;
}) {
  const a1Label     = String(data.a1Year);
  const title       = `${section.label} — ${t01.label}`;
  const insightText = t01.enrichedInsight || t01.orcAiSummary || '';
  const accentClr   = `#${section.sectionColor}`;

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={title}
        monthShort={data.monthShort}
        color={section.sectionColor}
      />
      <div className="flex flex-col gap-2 px-4 pt-3 pb-7" style={{ height: 'calc(100% - 52px)' }}>

        {/* Tabela completa — todas as marcas, sem scroll */}
        <div className="shrink-0 rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6' }}>
                <th className="text-left px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">DESCRIÇÃO / MARCA</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">REAL {data.year}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">ORÇADO</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">Δ R$ Orç</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">Δ% Orç</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">{a1Label}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-wide">Δ% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isTotal = row.depth === -1;
                const isT02   = row.depth === 0;
                const isMarca = row.depth === 1;
                const bg      = isTotal ? accentClr : isT02 ? '#F9FAFB' : 'white';
                const textClr = isTotal ? 'white' : hex(C.darkText);
                const bold    = isTotal || isT02;
                const indent  = isMarca ? '\u00A0\u00A0↳ ' : '';
                return (
                  <tr key={idx} className="border-b border-gray-50" style={{ backgroundColor: bg }}>
                    <td className="px-2 py-0.5 text-[9px] truncate max-w-xs" title={row.label}
                      style={{ color: textClr, fontWeight: bold ? 700 : 400 }}>{indent}{row.label}</td>
                    <td className="text-right px-2 py-0.5 text-[9px] tabular-nums"
                      style={{ color: textClr, fontWeight: bold ? 700 : 400 }}>{fmtK(row.real)}</td>
                    <td className="text-right px-2 py-0.5 text-[9px] tabular-nums"
                      style={{ color: isTotal ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>{fmtK(row.orc)}</td>
                    <td className="text-right px-2 py-0.5 text-[9px] tabular-nums font-semibold tabular-nums">
                      {(() => {
                        const varAbs = row.real - row.orc;
                        const clr = isTotal
                          ? (varAbs >= 0 ? '#86EFAC' : '#FCA5A5')
                          : deltaColor(row.orcPct);
                        return <span style={{ color: clr }}>{varAbs >= 0 ? '+' : ''}{fmtK(varAbs)}</span>;
                      })()}
                    </td>
                    <td className="text-right px-2 py-0.5">
                      {isTotal
                        ? <span className="text-[9px] font-bold" style={{ color: 'white' }}>{fmtPct(row.orcPct)}</span>
                        : <VarBadge pct={row.orcPct} />}
                    </td>
                    <td className="text-right px-2 py-0.5 text-[9px] tabular-nums"
                      style={{ color: isTotal ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>{fmtK(row.a1)}</td>
                    <td className="text-right px-2 py-0.5">
                      {isTotal
                        ? <span className="text-[9px] font-bold" style={{ color: 'white' }}>{fmtPct(row.a1Pct)}</span>
                        : <VarBadge pct={row.a1Pct} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Síntese IA — bloco expandido com mais texto */}
        {insightText ? (
          <div
            className="flex-1 min-h-0 flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
            style={{ background: `#${C.headerBg}` }}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hex(C.accent) }} />
              <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: hex(C.accent) }}>
                Síntese IA
              </span>
            </div>
            <p className="text-[11px] leading-relaxed overflow-hidden" style={{ color: '#E5E7EB' }}>
              {insightText.slice(0, 600)}
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-dashed border-gray-200">
            <span className="text-[10px] text-gray-400 italic">Síntese IA não disponível</span>
          </div>
        )}
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
  );
}

// SLIDE 2 DE 2: Justificativas
function Tag01JustificativasSlide({
  section, t01, data, cards, pageNum,
}: {
  section: VariancePptSection;
  t01: VariancePptNode;
  data: VariancePptData;
  cards: T01JustCard[];
  pageNum?: number;
}) {
  const title     = `${section.label} — ${t01.label} — Justificativas`;
  const accentClr = `#${section.sectionColor}`;

  // Determina número de colunas: <= 4 cards → 2 cols, 5-6 → 3 cols, 7+ → 3 cols
  const cols = cards.length <= 4 ? 2 : 3;
  const colClass = cols === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <SlideCard>
      <SlideHeader
        sectionLabel={section.tag0}
        title={title}
        monthShort={data.monthShort}
        color={section.sectionColor}
      />
      <div className="flex flex-col px-4 pt-3 pb-7 gap-2" style={{ height: 'calc(100% - 52px)' }}>
        {/* Cabeçalho da seção */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentClr }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentClr }}>
            Justificativas dos Desvios
          </span>
          <span className="text-[9px] text-gray-400 font-medium">
            ({cards.length} {cards.length === 1 ? 'item' : 'itens'})
          </span>
        </div>

        {/* Grid de cards */}
        <div className={`flex-1 min-h-0 grid ${colClass} gap-2 content-start`}>
          {cards.map((card, idx) => (
            <JustCardItem key={idx} card={card} />
          ))}
        </div>
      </div>
      <SlideFooter page={pageNum} />
    </SlideCard>
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
}: {
  slides: React.ReactNode[];
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
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

        <div className="w-14" />
      </div>

      {/* Zonas de clique para navegar */}
      <div
        className="absolute top-0 left-0 w-1/3 cursor-pointer"
        style={{ height: `calc(100% - ${NAV_H}px)` }}
        onClick={onPrev}
      />
      <div
        className="absolute top-0 right-0 w-1/3 cursor-pointer"
        style={{ height: `calc(100% - ${NAV_H}px)` }}
        onClick={onNext}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

interface VariancePptPreviewProps {
  data: VariancePptData;
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

export default function VariancePptPreview({ data }: VariancePptPreviewProps) {
  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hiddenSlides, setHiddenSlides] = useState<Set<string>>(new Set());

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

    entries.push({ key: 'cover', label: 'Capa', node: <CoverSlide key="cover" data={data} /> });
    pageCounter++;

    entries.push({ key: 'overview', label: 'Visão Geral', node: <OverviewSlide key="overview" data={data} /> });
    pageCounter++;

    entries.push({ key: 'performance', label: 'Performance vs Orçado', node: <PerformanceSlide key="performance" data={data} pageNum={pageCounter} /> });
    pageCounter++;

    entries.push({ key: 'analytics', label: 'Análise', node: <AnalyticsSlide key="analytics" data={data} pageNum={pageCounter} /> });
    pageCounter++;

    for (const section of data.sections) {
      if (section.tag01Nodes.length > 0) {
        entries.push({
          key: `section-${section.tag0}`,
          label: section.label,
          node: <SectionSlide key={`section-${section.tag0}`} section={section} data={data} pageNum={pageCounter} />,
        });
        pageCounter++;

        // Slide 1: Tabela + Síntese IA / Slide 2: Justificativas (se existirem)
        for (const t01 of section.tag01Nodes) {
          const allRows  = buildT01Rows(t01);
          const allCards = buildT01JustCards(t01);

          // Slide 1 — tabela completa + IA
          entries.push({
            key: `tag01detail-${section.tag0}-${t01.label}`,
            label: `${section.label} — ${t01.label}`,
            node: (
              <Tag01DetailSlide
                key={`tag01detail-${section.tag0}-${t01.label}`}
                section={section}
                t01={t01}
                data={data}
                rows={allRows}
                pageNum={pageCounter}
              />
            ),
          });
          pageCounter++;

          // Slide 2 — justificativas (só se existirem cards)
          if (allCards.length > 0) {
            entries.push({
              key: `tag01just-${section.tag0}-${t01.label}`,
              label: `${section.label} — ${t01.label} — Justificativas`,
              node: (
                <Tag01JustificativasSlide
                  key={`tag01just-${section.tag0}-${t01.label}`}
                  section={section}
                  t01={t01}
                  data={data}
                  cards={allCards}
                  pageNum={pageCounter}
                />
              ),
            });
            pageCounter++;
          }
        }
      }

      const marcaEntries = data.marcaBreakdowns?.[section.tag0];
      if (marcaEntries && marcaEntries.length > 0) {
        entries.push({
          key: `marca-${section.tag0}`,
          label: `${section.label} Marcas`,
          node: <MarcaSlide key={`marca-${section.tag0}`} section={section} data={data} entries={marcaEntries} pageNum={pageCounter} />,
        });
        pageCounter++;
      }
    }

    entries.push({ key: 'summary', label: 'Resumo', node: <SummarySlide key="summary" data={data} pageNum={pageCounter} /> });
    return entries;
  }, [data]);

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
          <button
            onClick={() => startPresentation()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Play size={16} />
            Apresentar
          </button>
        </div>
      </div>

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

      {/* Presentation mode overlay */}
      {presenting && (
        <PresentationMode
          slides={presentationSlides}
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          onPrev={goPrev}
          onNext={goNext}
          onExit={exitPresentation}
        />
      )}
    </div>
  );
}
