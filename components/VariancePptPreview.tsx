// ─── Variance PPT Preview — HTML Slide Cards ────────────────────────
// Renders VariancePptData as visual slide cards (same structure as PPTX)

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

/** Detect best scale based on max absolute value (raw, not pre-divided) */
function detectScale(...rawValues: number[]): ScaleUnit {
  const maxAbs = Math.max(...rawValues.map(Math.abs), 0);
  // If max >= 1 billion (raw) → values in K would be >= 1M → use M
  return maxAbs >= 1_000_000_000 ? 'M' : 'K';
}

function scaleLabel(unit: ScaleUnit): string {
  return unit === 'M' ? 'MILHOES (R$)' : 'MILHARES (R$)';
}

function scaleSuffix(unit: ScaleUnit): string {
  return unit === 'M' ? 'M' : 'mil';
}

/** Format raw value according to scale */
function fmtScaled(v: number, unit: ScaleUnit): string {
  if (unit === 'M') {
    const m = v / 1_000_000;
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  }
  return Math.round(v / 1000).toLocaleString('pt-BR');
}

/** Convert raw value to chart-axis number (K or M) */
function toChartVal(v: number, unit: ScaleUnit): number {
  return unit === 'M' ? Math.round(v / 100_000) / 10 : Math.round(v / 1000);
}

/** Format a chart-axis number for data labels */
function fmtChartLabel(v: number, unit: ScaleUnit): string {
  if (unit === 'M') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return v.toLocaleString('pt-BR');
}

// Legacy helper — used by slides that always show K
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

function deltaColor(v: number | null, invert: boolean): string {
  if (v === null || v === undefined || v === 0) return hex(C.mutedText);
  const favorable = invert ? v <= 0 : v >= 0;
  return favorable ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
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

// ─── Slide Wrapper ───────────────────────────────────────────────────

function SlideCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden w-full h-full ${className}`}
      style={{ aspectRatio: '16 / 9', boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </section>
  );
}

function SlideHeader({ title, monthShort, color, unitLabel }: { title: string; monthShort: string; color?: string; unitLabel?: string }) {
  const bgColor = color || C.headerBg;
  return (
    <div
      className="flex items-center justify-between px-8 py-4"
      style={{ background: `linear-gradient(135deg, #${bgColor} 0%, #${bgColor}dd 100%)` }}
    >
      <h3 className="text-xl font-extrabold text-white tracking-wide drop-shadow-sm">{title}</h3>
      <div className="flex items-center gap-3">
        <span className="px-4 py-1.5 rounded-md text-xs font-bold text-gray-300 bg-white/10 backdrop-blur-sm border border-white/10">
          UNIDADE: {unitLabel || 'MILHARES (R$)'}
        </span>
        <span className="px-4 py-1.5 rounded-md text-sm font-extrabold text-white shadow-sm" style={{ backgroundColor: hex(C.accent) }}>
          {monthShort}
        </span>
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="h-1.5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      <div className="px-4 py-3 text-center">
        <div className="text-xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Insights Box ────────────────────────────────────────────────────

function InsightsBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, #${C.headerBg} 0%, #${C.headerBg}ee 100%)` }}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: hex(C.accent) }} />
        <span className="text-xs font-bold tracking-widest" style={{ color: hex(C.accent) }}>
          SINTESE IA
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: text ? '#D1D5DB' : '#6B728080' }}>
        {text || 'Sintese pendente'}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1: COVER
// ═══════════════════════════════════════════════════════════════════════

function CoverSlide({ data }: { data: VariancePptData }) {
  const snapLabel = data.snapshotAt
    ? `Foto ${new Date(data.snapshotAt).toLocaleDateString('pt-BR')} ${new Date(data.snapshotAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  // Split marca string into individual brands for badge display
  const marcaList = data.marca ? data.marca.split(',').map(m => m.trim()).filter(Boolean) : [];

  // Alternating badge colors for marca badges
  const marcaBadgeColors = [C.accent, C.teal, C.justified, C.pending, C.approved];

  return (
    <SlideCard>
      {/* Decorative bars */}
      <div className="absolute right-16 top-4 flex gap-2">
        <div className="w-2 rounded" style={{ height: 100, backgroundColor: hex(C.accent) }} />
        <div className="w-2 rounded mt-4" style={{ height: 80, backgroundColor: hex(C.teal) }} />
        <div className="w-2 rounded mt-8" style={{ height: 60, backgroundColor: hex(C.justified) }} />
      </div>

      <div className="p-10 flex flex-col justify-between h-full">
        {/* Logo */}
        <div>
          <div className="text-4xl font-black" style={{ color: hex(C.accent) }}>RAIZ</div>
          <div className="text-sm font-bold tracking-[0.25em]" style={{ color: hex(C.mutedText) }}>FINANCEIRO</div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-5xl font-black leading-tight" style={{ color: hex(C.accent) }}>
            Book de Resultados
          </h2>
          <h2 className="text-5xl font-black leading-tight" style={{ color: hex(C.accent) }}>
            DRE Gerencial
          </h2>

          <div className="w-40 h-1.5 mt-5 rounded" style={{ backgroundColor: hex(C.teal) }} />

          <div className="mt-5 text-2xl font-semibold" style={{ color: hex(C.headerBg) }}>{data.monthLabel}</div>

          {/* Marca badges */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {marcaList.length > 0 ? marcaList.map((m, i) => (
              <span
                key={m}
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-white shadow-sm"
                style={{
                  backgroundColor: hex(marcaBadgeColors[i % marcaBadgeColors.length]),
                  border: `2px solid ${hex(marcaBadgeColors[i % marcaBadgeColors.length])}`,
                }}
              >
                {m}
              </span>
            )) : (
              <span
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: hex(C.accent), border: `2px solid ${hex(C.accent)}` }}
              >
                Consolidado
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-4 py-1.5 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: hex(C.justified) }}>
            Versao {data.version}
          </span>
          {snapLabel && (
            <span className="px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-gray-600">
              {snapLabel}
            </span>
          )}
          <span
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: data.stats.coveragePct >= 80 ? hex(C.approved) : hex(C.pending) }}
          >
            {data.stats.coveragePct}% das contas justificadas
          </span>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-4" style={{ backgroundColor: hex(C.accent) }} />
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2: DRE OVERVIEW
// ═══════════════════════════════════════════════════════════════════════

function OverviewSlide({ data }: { data: VariancePptData }) {
  const a1Label = String(data.a1Year);
  const margemCalc = data.calcRows.find(c => c.label === 'MARGEM DE CONTRIBUICAO') || data.calcRows.find(c => c.label.includes('MARGEM'));
  const ebitdaSrCalc = data.calcRows.find(c => c.label.includes('S/ RATEIO'));
  const ebitdaTotalCalc = data.calcRows.find(c => c.label === 'EBITDA TOTAL');

  // Build ordered rows: sections interleaved with calc rows
  type RowEntry = { type: 'section'; section: VariancePptSection } | { type: 'calc'; calc: VariancePptCalcRow; bg: string; textColor?: string };
  const entries: RowEntry[] = [];

  // Calc row styles: soft tinted backgrounds instead of loud solid fills
  const CALC_STYLES = {
    margem:     { bg: 'FEF3C7', text: '92400E' }, // amber-100 bg, amber-800 text
    ebitdaSr:   { bg: 'E5E7EB', text: '1F2937' }, // gray-200 bg, dark text
    ebitdaTotal:{ bg: '374151', text: 'FFFFFF' }, // gray-700 bg, white text
  };

  for (const section of data.sections) {
    entries.push({ type: 'section', section });
    if (section.tag0.startsWith('03.') && margemCalc) {
      entries.push({ type: 'calc', calc: margemCalc, bg: CALC_STYLES.margem.bg, textColor: CALC_STYLES.margem.text });
    }
    if (section.tag0.startsWith('04.') && ebitdaSrCalc) {
      entries.push({ type: 'calc', calc: ebitdaSrCalc, bg: CALC_STYLES.ebitdaSr.bg, textColor: CALC_STYLES.ebitdaSr.text });
    }
  }
  if (ebitdaTotalCalc) {
    entries.push({ type: 'calc', calc: ebitdaTotalCalc, bg: CALC_STYLES.ebitdaTotal.bg, textColor: CALC_STYLES.ebitdaTotal.text });
  }

  const ebitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL');
  const ebitdaReal = ebitda ? `R$ ${fmtK(ebitda.real)} mil` : 'N/D';
  const ebitdaVsOrc = ebitda ? fmtPct(ebitda.deltaOrcPct) : 'N/D';
  const ebitdaVsA1 = ebitda ? fmtPct(ebitda.deltaA1Pct) : 'N/D';
  const ebitdaOrcColor = ebitda?.deltaOrcPct != null ? deltaColor(ebitda.deltaOrcPct, false) : hex(C.mutedText);
  const ebitdaA1Color = ebitda?.deltaA1Pct != null ? deltaColor(ebitda.deltaA1Pct, false) : hex(C.mutedText);

  const { stats } = data;
  const statusItems = [
    { label: 'Aprovados', count: stats.approved, color: C.approved },
    { label: 'Justificados', count: stats.justified, color: C.justified },
    { label: 'Pendentes', count: stats.pending, color: C.pending },
    { label: 'Rejeitados', count: stats.rejected, color: C.rejected },
    { label: 'Notificados', count: stats.notified, color: '3B82F6' },
  ];

  return (
    <SlideCard>
      <SlideHeader title="DRE — VISAO GERAL (SNAPSHOT)" monthShort={data.monthShort} />
      <div className="flex gap-5 p-5 h-[calc(100%-56px)]">
        {/* Left: DRE table */}
        <div className="flex-1 min-w-0 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: hex(C.headerBg) }}>
                <th className="text-left px-3 py-2.5 font-extrabold text-sm text-white">DESCRICAO</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">REAL {data.year}</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">ORCADO</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">D% Orc</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">{a1Label}</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                if (entry.type === 'section') {
                  const { section } = entry;
                  const { node, invertDelta } = section;
                  return (
                    <tr key={idx} className="font-bold bg-white border-b border-gray-100">
                      <td className="px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{section.tag0}</td>
                      <td className="text-right px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{fmtK(node.real)}</td>
                      <td className="text-right px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{fmtK(node.orcCompare)}</td>
                      <td className="text-right px-3 py-2 text-sm font-extrabold" style={{ color: deltaColor(node.orcVarPct, invertDelta) }}>{fmtPct(node.orcVarPct)}</td>
                      <td className="text-right px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{fmtK(node.a1Compare)}</td>
                      <td className="text-right px-3 py-2 text-sm font-extrabold" style={{ color: deltaColor(node.a1VarPct, invertDelta) }}>{fmtPct(node.a1VarPct)}</td>
                    </tr>
                  );
                } else {
                  const { calc, bg, textColor } = entry;
                  const baseColor = textColor || 'FFFFFF';
                  const dOrcColor = calc.deltaOrcPct != null && calc.deltaOrcPct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  const dA1Color = calc.deltaA1Pct != null && calc.deltaA1Pct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  return (
                    <tr key={idx} className="font-extrabold" style={{ backgroundColor: hex(bg), color: hex(baseColor) }}>
                      <td className="px-3 py-2 text-sm">{calc.label}</td>
                      <td className="text-right px-3 py-2 text-sm">{fmtK(calc.real)}</td>
                      <td className="text-right px-3 py-2 text-sm">{fmtK(calc.orcado)}</td>
                      <td className="text-right px-3 py-2 text-sm" style={{ color: dOrcColor }}>{fmtPct(calc.deltaOrcPct)}</td>
                      <td className="text-right px-3 py-2 text-sm">{fmtK(calc.a1)}</td>
                      <td className="text-right px-3 py-2 text-sm" style={{ color: dA1Color }}>{fmtPct(calc.deltaA1Pct)}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Right: KPIs + progress */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="EBITDA TOTAL" value={ebitdaReal} color={hex(C.consolidado)} />
            <KpiCard label="VS ORCADO" value={ebitdaVsOrc} color={ebitdaOrcColor} />
            <KpiCard label={`VS ${a1Label}`} value={ebitdaVsA1} color={ebitdaA1Color} />
            <KpiCard label="COBERTURA JUSTIF." value={`${stats.coveragePct}%`} color={stats.coveragePct >= 80 ? hex(C.approved) : hex(C.pending)} />
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-bold text-gray-700 mb-2">Progresso de Justificativas</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {statusItems.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: hex(item.color) }} />
                  <span className="text-xs text-gray-600">{item.label}: {item.count}</span>
                </div>
              ))}
            </div>
            <div className="text-xs font-bold text-gray-500 mt-2">Total: {stats.totalLeaves} contas</div>
          </div>

          {/* Executive summary */}
          {data.executiveSummary && <InsightsBox text={data.executiveSummary} />}
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDES 3-N: SECTION SLIDES (1 per tag0)
// ═══════════════════════════════════════════════════════════════════════

function SectionSlide({ section, data }: { section: VariancePptSection; data: VariancePptData }) {
  if (section.tag01Nodes.length === 0) return null;

  const a1Label = String(data.a1Year);
  const { node, invertDelta } = section;

  const hasEnrichedDrivers = node.enrichedDrivers && node.enrichedDrivers.length > 0;
  const top3 = hasEnrichedDrivers
    ? []
    : [...section.tag01Nodes]
        .sort((a, b) => Math.abs(b.orcVarPct || 0) - Math.abs(a.orcVarPct || 0))
        .slice(0, 3);

  const insightText = node.enrichedInsight || node.orcAiSummary || '';

  return (
    <SlideCard>
      <SlideHeader title={section.tag0.toUpperCase()} monthShort={data.monthShort} color={section.sectionColor} />
      <div className="flex flex-col gap-4 p-5 h-[calc(100%-56px)]">
        {/* Tag01 financial table */}
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: hex(C.headerBg) }}>
                <th className="text-left px-3 py-2.5 font-extrabold text-sm text-white">DESCRICAO</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">REAL {data.year}</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">ORCADO</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">D% Orc</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">{a1Label}</th>
                <th className="text-right px-3 py-2.5 font-extrabold text-sm text-white">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {(section.tag0.startsWith('01.')
                ? [...section.tag01Nodes].sort((a, b) => b.real - a.real)
                : section.tag01Nodes
              ).map((t01, idx) => (
                <tr key={idx} className="border-b border-gray-100 bg-white">
                  <td className="px-3 py-2 text-sm text-gray-800 font-medium">↳ {t01.label}</td>
                  <td className="text-right px-3 py-2 text-sm font-semibold" style={{ color: hex(C.darkText) }}>{fmtK(t01.real)}</td>
                  <td className="text-right px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{fmtK(t01.orcCompare)}</td>
                  <td className="text-right px-3 py-2 text-sm font-bold" style={{ color: deltaColor(t01.orcVarPct, invertDelta) }}>{fmtPct(t01.orcVarPct)}</td>
                  <td className="text-right px-3 py-2 text-sm" style={{ color: hex(C.darkText) }}>{fmtK(t01.a1Compare)}</td>
                  <td className="text-right px-3 py-2 text-sm font-bold" style={{ color: deltaColor(t01.a1VarPct, invertDelta) }}>{fmtPct(t01.a1VarPct)}</td>
                </tr>
              ))}
              {/* Total — bg = sectionColor */}
              <tr className="font-extrabold text-white text-sm" style={{ backgroundColor: hex(section.sectionColor) }}>
                <td className="px-3 py-2">TOTAL</td>
                <td className="text-right px-3 py-2">{fmtK(node.real)}</td>
                <td className="text-right px-3 py-2">{fmtK(node.orcCompare)}</td>
                <td className="text-right px-3 py-2">{fmtPct(node.orcVarPct)}</td>
                <td className="text-right px-3 py-2">{fmtK(node.a1Compare)}</td>
                <td className="text-right px-3 py-2">{fmtPct(node.a1VarPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom: insights + drivers/top desvios */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: AI Summary */}
          <div className="flex-1 min-w-0">
            <InsightsBox text={insightText} />
          </div>

          {/* Right: Drivers or Top Desvios */}
          <div className="w-72 shrink-0 flex flex-col gap-2">
            {hasEnrichedDrivers ? (
              <>
                <div className="text-xs font-bold" style={{ color: hex(C.accent) }}>DRIVERS PRINCIPAIS</div>
                {node.enrichedDrivers!.map((driver, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white overflow-hidden flex">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: hex(C.accent) }} />
                    <p className="text-xs text-gray-700 px-3 py-2 leading-snug">{driver}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="text-xs font-bold" style={{ color: hex(C.headerBg) }}>TOP DESVIOS</div>
                {top3.map((n, idx) => {
                  const borderColor = deltaColor(n.orcVarPct, invertDelta);
                  const justText = n.orcAiSummary || n.orcJustification || 'Sem justificativa';
                  return (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white overflow-hidden flex">
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: borderColor }} />
                      <div className="px-3 py-2 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700 truncate">{n.label}</span>
                          <span className="text-xs font-bold shrink-0 ml-2" style={{ color: borderColor }}>D Orc: {fmtPct(n.orcVarPct)}</span>
                        </div>
                        <div className="flex items-start gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: statusColor(n.orcStatus) }} />
                          <span className="text-[11px] text-gray-500 leading-snug">{truncate(justText, 80)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL SLIDES (1 per tag0)
// ═══════════════════════════════════════════════════════════════════════

function DetailSlide({ section, data, page = 0 }: { section: VariancePptSection; data: VariancePptData; page?: number }) {
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
      <SlideHeader title={`${section.label.toUpperCase()} — DETALHAMENTO${pageLabel}`} monthShort={data.monthShort} color={section.sectionColor} />
      <div className="p-4 overflow-hidden h-[calc(100%-56px)]">
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '45%' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: hex(C.headerBg) }}>
              <th className="text-left px-2 py-1.5 font-extrabold text-xs text-white">CONTA</th>
              <th className="text-right px-2 py-1.5 font-extrabold text-xs text-white">REAL</th>
              <th className="text-right px-2 py-1.5 font-extrabold text-xs text-white">ORC</th>
              <th className="text-right px-2 py-1.5 font-extrabold text-xs text-white">Δ%</th>
              <th className="text-left px-2 py-1.5 font-extrabold text-xs text-white">JUSTIFICATIVA / SÍNTESE</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const indent = row.depth === 0 ? '' : row.depth === 1 ? '↳ ' : '\u00A0\u00A0↳ ';
              const isBold = row.depth === 0;
              const isMarca = row.depth === 2;
              const textColor = isMarca ? '#EA580C' : row.depth <= 1 ? hex(C.darkText) : hex(C.mutedText);
              const fontSize = row.depth === 0 ? '12px' : '11px';
              return (
                <tr key={idx} className="border-b border-gray-100 bg-white" style={{ fontSize }}>
                  <td className="px-2 py-1 truncate" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }} title={row.label}>{indent}{row.label}</td>
                  <td className="text-right px-2 py-1 tabular-nums" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }}>{fmtK(row.real)}</td>
                  <td className="text-right px-2 py-1 tabular-nums" style={{ color: textColor }}>{fmtK(row.orc)}</td>
                  <td className="text-right px-2 py-1 tabular-nums" style={{ color: deltaColor(row.varPct, section.invertDelta), fontWeight: isBold ? 700 : 400 }}>{fmtPct(row.varPct)}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-start gap-1">
                      {row.status && <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: statusColor(row.status) }} />}
                      <span
                        style={{ color: row.justText ? hex(C.darkText) : hex(C.mutedText) }}
                        className="text-[10px] leading-tight line-clamp-2 break-words"
                      >
                        {row.justText || '\u2014'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SlideCard>
  );
}

/** Returns total pages for a section's detail slides */
function getDetailPageCount(section: VariancePptSection): number {
  let count = 0;
  for (const t01 of section.tag01Nodes) {
    count++; // tag01
    for (const t02 of t01.children) {
      count++; // tag02
      count += t02.children.length; // marcas
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
}: {
  section: VariancePptSection;
  data: VariancePptData;
  entries: VariancePptMarcaEntry[];
}) {
  if (entries.length === 0) return null;

  // Filter out RZ brand
  const filtered = entries.filter(e => e.marca !== 'RZ');
  if (filtered.length === 0) return null;

  const totalReal = filtered.reduce((s, e) => s + e.real, 0);
  const totalOrc = filtered.reduce((s, e) => s + e.orcado, 0);
  const deltaAbs = totalReal - totalOrc;
  const deltaPct = totalOrc !== 0 ? Math.round(((totalReal - totalOrc) / Math.abs(totalOrc)) * 1000) / 10 : null;
  const favorable = section.invertDelta ? (deltaPct !== null && deltaPct <= 0) : (deltaPct !== null && deltaPct >= 0);

  // Auto-detect scale from raw values
  const allRaw = filtered.flatMap(e => [e.real, e.orcado, e.a1]);
  const unit = detectScale(totalReal, totalOrc, ...allRaw);
  const suffix = scaleSuffix(unit);

  const labels = filtered.map(e => e.marca);
  // Use absolute values so cost bars (negative) point upward
  const realV = filtered.map(e => Math.abs(toChartVal(e.real, unit)));
  const orcV = filtered.map(e => Math.abs(toChartVal(e.orcado, unit)));
  const a1V = filtered.map(e => Math.abs(toChartVal(e.a1, unit)));
  const labelFmt = (p: any) => fmtChartLabel(p.value, unit);

  // Per-marca delta calculations
  const totalA1 = filtered.reduce((s, e) => s + e.a1, 0);
  const deltaA1Abs = totalReal - totalA1;
  const deltaA1Pct = totalA1 !== 0 ? Math.round(((totalReal - totalA1) / Math.abs(totalA1)) * 1000) / 10 : null;

  const marcaDeltas = filtered.map(e => {
    const dOrc = e.orcado !== 0 ? Math.round(((e.real - e.orcado) / Math.abs(e.orcado)) * 1000) / 10 : null;
    const dA1 = e.a1 !== 0 ? Math.round(((e.real - e.a1) / Math.abs(e.a1)) * 1000) / 10 : null;
    return { orcAbs: e.real - e.orcado, orcPct: dOrc, a1Abs: e.real - e.a1, a1Pct: dA1 };
  });

  const chartOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, textStyle: { fontSize: 13 } },
    legend: {
      bottom: 4, itemWidth: 16, itemHeight: 10, textStyle: { fontSize: 13, fontWeight: 600, color: '#374151' },
    },
    grid: { left: 16, right: 16, top: 20, bottom: 48 },
    xAxis: {
      type: 'category' as const, data: labels,
      axisLabel: { fontSize: 13, fontWeight: 700, color: '#1F2937' },
      axisLine: { lineStyle: { color: '#D1D5DB' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const, show: false,
      splitLine: { show: false },
    },
    series: [
      {
        name: 'Real', type: 'bar' as const, data: realV, barMaxWidth: 40, barGap: '20%',
        itemStyle: { color: hex(section.sectionColor), borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: hex(section.sectionColor), formatter: labelFmt },
      },
      {
        name: 'Orcado', type: 'bar' as const, data: orcV, barMaxWidth: 40,
        itemStyle: { color: hex(C.orcado), borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: hex(C.orcado), formatter: labelFmt },
      },
      {
        name: `${data.a1Year}`, type: 'bar' as const, data: a1V, barMaxWidth: 40,
        itemStyle: { color: hex(C.teal), borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: hex(C.teal), formatter: labelFmt },
      },
    ],
  };

  return (
    <SlideCard>
      <SlideHeader title={`${section.label.toUpperCase()} POR MARCA`} monthShort={data.monthShort} color={section.sectionColor} unitLabel={scaleLabel(unit)} />
      <div className="flex gap-4 p-4 h-[calc(100%-56px)]">
        {/* Left: ECharts bar chart */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
          {/* Delta strip below chart */}
          <div className="mt-1 overflow-x-auto">
            <table className="w-full text-center border-collapse" style={{ fontSize: '9px' }}>
              <thead>
                <tr>
                  <th className="px-1 py-0.5 text-gray-400 font-bold">Marca</th>
                  <th className="px-1 py-0.5 font-bold" style={{ color: hex(C.orcado) }}>Δ vs Orç (R$)</th>
                  <th className="px-1 py-0.5 font-bold" style={{ color: hex(C.orcado) }}>Δ vs Orç %</th>
                  <th className="px-1 py-0.5 font-bold" style={{ color: hex(C.teal) }}>Δ vs A-1 (R$)</th>
                  <th className="px-1 py-0.5 font-bold" style={{ color: hex(C.teal) }}>Δ vs A-1 %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const d = marcaDeltas[i];
                  const orcColor = deltaColor(d.orcPct, section.invertDelta);
                  const a1Color = deltaColor(d.a1Pct, section.invertDelta);
                  return (
                    <tr key={e.marca} className="border-t border-gray-100">
                      <td className="px-1 py-0.5 font-bold text-gray-600">{e.marca}</td>
                      <td className="px-1 py-0.5 font-bold tabular-nums" style={{ color: orcColor }}>{fmtScaled(d.orcAbs, unit)} {suffix}</td>
                      <td className="px-1 py-0.5 font-bold tabular-nums" style={{ color: orcColor }}>{fmtPct(d.orcPct)}</td>
                      <td className="px-1 py-0.5 font-bold tabular-nums" style={{ color: a1Color }}>{fmtScaled(d.a1Abs, unit)} {suffix}</td>
                      <td className="px-1 py-0.5 font-bold tabular-nums" style={{ color: a1Color }}>{fmtPct(d.a1Pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: KPIs */}
        <div className="w-52 shrink-0 flex flex-col gap-2">
          <KpiCard label="TOTAL REAL" value={`R$ ${fmtScaled(Math.abs(totalReal), unit)} ${suffix}`} color={hex(section.sectionColor)} />
          <KpiCard label="TOTAL ORCADO" value={`R$ ${fmtScaled(Math.abs(totalOrc), unit)} ${suffix}`} color={hex(C.orcado)} />
          <KpiCard
            label={deltaAbs >= 0 ? 'ECONOMIA vs ORC' : 'DESVIO vs ORC'}
            value={`${fmtPct(deltaPct)}`}
            color={favorable ? hex(C.deltaPositivo) : hex(C.deltaNegativo)}
          />
          <div className="text-[10px] text-gray-500 text-center font-semibold tabular-nums">
            {fmtScaled(Math.abs(deltaAbs), unit)} {suffix}
          </div>
          <KpiCard
            label={deltaA1Abs >= 0 ? `ECONOMIA vs ${data.a1Year}` : `DESVIO vs ${data.a1Year}`}
            value={`${fmtPct(deltaA1Pct)}`}
            color={deltaColor(deltaA1Pct, section.invertDelta)}
          />
          <div className="text-[10px] text-gray-500 text-center font-semibold tabular-nums">
            {fmtScaled(Math.abs(deltaA1Abs), unit)} {suffix}
          </div>

          {(section.node.enrichedInsight || section.node.orcAiSummary) && (
            <InsightsBox text={section.node.enrichedInsight || section.node.orcAiSummary || ''} />
          )}
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS SLIDE — Waterfall (EBITDA bridge) + Pareto (top desvios)
// ═══════════════════════════════════════════════════════════════════════

function AnalyticsSlide({ data }: { data: VariancePptData }) {
  // --- Detect scale from all raw values in this slide ---
  const allSectionRaw = data.sections.flatMap(s => [s.node.real, s.node.orcCompare]);
  const totalOrcEbitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL')?.orcado || 0;
  const totalRealEbitda = data.calcRows.find(c => c.label === 'EBITDA TOTAL')?.real || 0;
  const tag01AllRaw = data.sections.flatMap(s => s.tag01Nodes.flatMap(t => [t.real, t.orcCompare]));
  const unit = detectScale(totalOrcEbitda, totalRealEbitda, ...allSectionRaw, ...tag01AllRaw);
  const labelFmt = (p: any) => {
    const v = typeof p.value === 'object' ? p.value.value : p.value;
    return fmtChartLabel(v, unit);
  };

  // --- Waterfall: EBITDA bridge Real vs Orcado ---
  const sectionTotals = data.sections.map(s => ({
    label: s.label,
    realVal: s.node.real,
    orcVal: s.node.orcCompare,
  }));

  const wfLabels = ['EBITDA Orc.', ...sectionTotals.map(s => `D ${s.label}`), 'EBITDA Real'];
  const wfBase: number[] = [];
  const wfDelta: (number | { value: number; itemStyle: { color: string } })[] = [];

  let acc = totalOrcEbitda;
  wfBase.push(0);
  wfDelta.push({ value: toChartVal(totalOrcEbitda, unit), itemStyle: { color: hex(C.consolidado) } });

  for (const s of sectionTotals) {
    const gap = s.realVal - s.orcVal;
    const gapV = toChartVal(gap, unit);
    wfBase.push(toChartVal(Math.min(acc, acc + gap), unit));
    wfDelta.push({ value: Math.abs(gapV), itemStyle: { color: gap >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo) } });
    acc += gap;
  }

  wfBase.push(0);
  wfDelta.push({ value: toChartVal(totalRealEbitda, unit), itemStyle: { color: hex(C.accent) } });

  const waterfallOption = {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, textStyle: { fontSize: 13 } },
    grid: { left: 16, right: 20, top: 24, bottom: 48 },
    xAxis: {
      type: 'category' as const, data: wfLabels,
      axisLabel: { fontSize: 11, fontWeight: 600, rotate: 15, color: '#1F2937' },
      axisLine: { lineStyle: { color: '#D1D5DB' } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const, show: false,
      splitLine: { show: false },
    },
    series: [
      { name: 'base', type: 'bar' as const, stack: 'wf', itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: wfBase },
      {
        name: 'delta', type: 'bar' as const, stack: 'wf', barMaxWidth: 56, data: wfDelta,
        label: { show: true, position: 'top' as const, fontSize: 12, fontWeight: 700, formatter: labelFmt },
      },
    ],
  };

  // --- Pareto: Top 8 tag01 desvios vs Orcado ---
  const tag01Gaps: { name: string; gap: number }[] = [];
  for (const sec of data.sections) {
    for (const t01 of sec.tag01Nodes) {
      const gap = t01.real - t01.orcCompare;
      if (gap !== 0) tag01Gaps.push({ name: t01.label, gap });
    }
  }
  tag01Gaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const top8 = tag01Gaps.slice(0, 8);
  const paretoLabels = top8.map(t => t.name.length > 18 ? t.name.slice(0, 16) + '..' : t.name);
  const paretoValues = top8.map(t => toChartVal(t.gap, unit));
  const totalAbsGap = top8.reduce((s, t) => s + Math.abs(t.gap), 0) || 1;
  let pAcc = 0;
  const paretoPct = top8.map(t => { pAcc += Math.abs(t.gap); return Math.round((pAcc / totalAbsGap) * 100); });

  const paretoOption = {
    tooltip: { trigger: 'axis' as const, textStyle: { fontSize: 13 } },
    grid: { left: 16, right: 50, top: 24, bottom: 70 },
    xAxis: {
      type: 'category' as const, data: paretoLabels,
      axisLabel: { fontSize: 10, fontWeight: 600, rotate: 25, color: '#1F2937' },
      axisLine: { lineStyle: { color: '#D1D5DB' } }, axisTick: { show: false },
    },
    yAxis: [
      { type: 'value' as const, show: false, splitLine: { show: false } },
      { type: 'value' as const, min: 0, max: 100, axisLabel: { fontSize: 11, color: '#6B7280', formatter: '{value}%' }, splitLine: { show: false } },
    ],
    series: [
      {
        name: `Variacao (${scaleSuffix(unit)})`, type: 'bar' as const, barMaxWidth: 44, data: paretoValues,
        itemStyle: { color: (p: any) => p.value >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo), borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, formatter: labelFmt },
      },
      {
        name: 'Acumulado %', type: 'line' as const, yAxisIndex: 1, smooth: true,
        data: paretoPct, lineStyle: { color: hex(C.accent), width: 3 },
        itemStyle: { color: hex(C.accent) }, symbol: 'circle', symbolSize: 7,
        label: { show: false },
      },
    ],
  };

  return (
    <SlideCard>
      <SlideHeader title="ANALISE — PONTE EBITDA + TOP DESVIOS" monthShort={data.monthShort} unitLabel={scaleLabel(unit)} />
      <div className="flex gap-5 p-5 h-[calc(100%-56px)]">
        {/* Left: Waterfall */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Ponte EBITDA — Real vs Orcado</div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={waterfallOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
        </div>
        {/* Right: Pareto */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Top 8 Desvios por Centro de Custo</div>
          <div className="flex-1 min-h-0">
            <ReactECharts option={paretoOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
          </div>
        </div>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FINAL SLIDE: SUMMARY
// ═══════════════════════════════════════════════════════════════════════

function SummarySlide({ data }: { data: VariancePptData }) {
  const { stats } = data;

  // Collect unjustified leaves
  const unjustified: { label: string; tag0: string; varPct: number; invert: boolean }[] = [];
  for (const section of data.sections) {
    const collectLeaves = (node: VariancePptNode) => {
      if (node.children.length === 0 && node.depth >= 1) {
        if (node.orcStatus !== 'approved' && node.orcStatus !== 'justified') {
          unjustified.push({ label: node.label, tag0: section.tag0.slice(0, 3), varPct: node.orcVarPct || 0, invert: section.invertDelta });
        }
      }
      for (const child of node.children) collectLeaves(child);
    };
    for (const t01 of section.tag01Nodes) collectLeaves(t01);
  }
  unjustified.sort((a, b) => Math.abs(b.varPct) - Math.abs(a.varPct));
  const topUnjust = unjustified.slice(0, 8);

  const segments = [
    { count: stats.approved, color: C.approved, label: 'Aprovados' },
    { count: stats.justified, color: C.justified, label: 'Justificados' },
    { count: stats.pending + stats.notified, color: C.pending, label: 'Pendentes' },
    { count: stats.rejected, color: C.rejected, label: 'Rejeitados' },
  ];
  const totalForBar = stats.totalLeaves || 1;

  return (
    <SlideCard>
      <SlideHeader title="RESUMO — COBERTURA DE JUSTIFICATIVAS" monthShort={data.monthShort} />
      <div className="flex gap-6 p-6 h-[calc(100%-56px)]">
        {/* Left: Coverage */}
        <div className="flex-1 flex flex-col">
          <div
            className="text-7xl font-black"
            style={{ color: stats.coveragePct >= 80 ? hex(C.approved) : stats.coveragePct >= 50 ? hex(C.pending) : hex(C.rejected) }}
          >
            {stats.coveragePct}%
          </div>
          <div className="text-lg font-semibold mt-1" style={{ color: hex(C.headerBg) }}>
            Cobertura de Justificativas
          </div>

          {/* Segmented bar */}
          <div className="flex h-6 rounded-lg overflow-hidden mt-4 max-w-md">
            {segments.map(seg => {
              const w = (seg.count / totalForBar) * 100;
              if (w < 0.5) return null;
              return <div key={seg.label} style={{ width: `${w}%`, backgroundColor: hex(seg.color) }} />;
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: hex(seg.color) }} />
                <span className="text-sm text-gray-600 font-medium">{seg.label}: {seg.count}</span>
              </div>
            ))}
          </div>

          <div className="text-sm font-bold text-gray-500 mt-3">
            Total: {stats.totalLeaves} contas | Versao {data.version}
          </div>

          {/* Closing summary */}
          {data.closingSummary && (
            <div className="mt-4">
              <InsightsBox text={data.closingSummary} />
            </div>
          )}
        </div>

        {/* Right: Top unjustified */}
        <div className="w-80 shrink-0">
          <div className="text-sm font-bold mb-3" style={{ color: hex(C.rejected) }}>
            TOP DESVIOS NAO JUSTIFICADOS
          </div>

          {unjustified.length === 0 ? (
            <div className="text-base font-bold" style={{ color: hex(C.approved) }}>
              Todas as contas estao justificadas!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topUnjust.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-white overflow-hidden flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: hex(C.rejected) }} />
                  <div className="px-3 py-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 truncate">{item.tag0} {truncate(item.label, 35)}</span>
                      <span className="text-xs font-bold shrink-0 ml-2" style={{ color: deltaColor(item.varPct, item.invert) }}>
                        {fmtPct(item.varPct)}
                      </span>
                    </div>
                    <div className="text-[11px] italic text-gray-400 mt-0.5">Sem justificativa</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3" style={{ backgroundColor: hex(C.headerBg) }}>
        <span className="text-xs font-medium" style={{ color: hex(C.mutedText) }}>Gerado automaticamente — DRE Raiz</span>
        <span className="text-xs font-medium" style={{ color: hex(C.mutedText) }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRESENTATION MODE — Fullscreen slide-by-slide
// ═══════════════════════════════════════════════════════════════════════

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
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col select-none">
      {/* Slide area — fills all space above taskbar */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="w-full h-full"
          style={{
            maxWidth: 'calc((100vh - 40px) * 16 / 9)',
            maxHeight: 'calc(100vw * 9 / 16)',
            aspectRatio: '16 / 9',
          }}
        >
          {slides[currentSlide]}
        </div>
      </div>

      {/* Taskbar — always visible, fixed at bottom */}
      <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-gray-950 border-t border-gray-800">
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

      {/* Click zones — left/right */}
      <div className="absolute top-0 left-0 w-1/3 cursor-pointer" style={{ height: 'calc(100% - 40px)' }} onClick={onPrev} />
      <div className="absolute top-0 right-0 w-1/3 cursor-pointer" style={{ height: 'calc(100% - 40px)' }} onClick={onNext} />
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
  children,
}: {
  slideKey: string;
  hidden: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      {/* Hide/Show toggle */}
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
      {/* Dimmed overlay when hidden */}
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

  // Build all slide entries with keys
  const allSlideEntries = useMemo(() => {
    const entries: { key: string; label: string; node: React.ReactNode }[] = [];
    entries.push({ key: 'cover', label: 'Capa', node: <CoverSlide key="cover" data={data} /> });
    entries.push({ key: 'overview', label: 'Visao Geral', node: <OverviewSlide key="overview" data={data} /> });
    entries.push({ key: 'analytics', label: 'Analise', node: <AnalyticsSlide key="analytics" data={data} /> });
    for (const section of data.sections) {
      if (section.tag01Nodes.length > 0) {
        entries.push({ key: `section-${section.tag0}`, label: section.label, node: <SectionSlide key={`section-${section.tag0}`} section={section} data={data} /> });
        const pages = getDetailPageCount(section);
        for (let p = 0; p < pages; p++) {
          const pageLabel = pages > 1 ? ` (${p + 1}/${pages})` : '';
          entries.push({
            key: `detail-${section.tag0}-p${p}`,
            label: `${section.label} Det.${pageLabel}`,
            node: <DetailSlide key={`detail-${section.tag0}-p${p}`} section={section} data={data} page={p} />,
          });
        }
      }
      const marcaEntries = data.marcaBreakdowns?.[section.tag0];
      if (marcaEntries && marcaEntries.length > 0) {
        entries.push({
          key: `marca-${section.tag0}`,
          label: `${section.label} Marcas`,
          node: <MarcaSlide key={`marca-${section.tag0}`} section={section} data={data} entries={marcaEntries} />,
        });
      }
    }
    entries.push({ key: 'summary', label: 'Resumo', node: <SummarySlide key="summary" data={data} /> });
    return entries;
  }, [data]);

  // Presentation slides exclude hidden ones
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

  const startPresentation = useCallback(() => {
    setCurrentSlide(0);
    setPresenting(true);
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);

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

  // Exit presentation if user exits fullscreen manually
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
          {allSlideEntries.length} slides{hiddenCount > 0 && <span className="text-red-500 font-bold ml-1">({hiddenCount} oculto{hiddenCount > 1 ? 's' : ''})</span>}
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
            onClick={startPresentation}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Play size={16} />
            Apresentar
          </button>
        </div>
      </div>

      {/* All slides — preview mode */}
      {allSlideEntries.map(entry => (
        <HideableSlide key={entry.key} slideKey={entry.key} hidden={hiddenSlides.has(entry.key)} onToggle={toggleHide}>
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
