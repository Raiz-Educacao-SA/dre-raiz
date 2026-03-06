// ─── Variance PPT Preview — HTML Slide Cards ────────────────────────
// Renders VariancePptData as visual slide cards (same structure as PPTX)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <section className={`relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full h-full ${className}`}
      style={{ aspectRatio: '16 / 9' }}
    >
      {children}
    </section>
  );
}

function SlideHeader({ title, monthShort, color }: { title: string; monthShort: string; color?: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: hex(color || C.headerBg) }}>
      <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded text-[10px] font-bold text-gray-400 bg-gray-700/60">
          UNIDADE: MILHARES (R$)
        </span>
        <span className="px-3 py-1 rounded text-[10px] font-bold text-white" style={{ backgroundColor: hex(C.accent) }}>
          {monthShort}
        </span>
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="px-3 py-2 text-center">
        <div className="text-lg font-bold" style={{ color }}>{value}</div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

// ─── Insights Box ────────────────────────────────────────────────────

function InsightsBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: hex(C.headerBg) }}>
      <div className="text-[10px] font-bold mb-1" style={{ color: hex(C.accent) }}>
        SINTESE IA
      </div>
      <p className="text-xs leading-relaxed" style={{ color: text ? '#D1D5DB' : '#6B728080' }}>
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

  return (
    <SlideCard>
      {/* Decorative bars */}
      <div className="absolute right-16 top-4 flex gap-2">
        <div className="w-1.5 rounded" style={{ height: 80, backgroundColor: hex(C.accent) }} />
        <div className="w-1.5 rounded mt-4" style={{ height: 64, backgroundColor: hex(C.teal) }} />
        <div className="w-1.5 rounded mt-8" style={{ height: 48, backgroundColor: hex(C.justified) }} />
      </div>

      <div className="p-8 flex flex-col justify-between h-full">
        {/* Logo */}
        <div>
          <div className="text-3xl font-black" style={{ color: hex(C.accent) }}>RAIZ</div>
          <div className="text-xs font-bold tracking-[0.25em]" style={{ color: hex(C.mutedText) }}>FINANCEIRO</div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl font-black leading-tight" style={{ color: hex(C.accent) }}>
            Book de Resultados
          </h2>
          <h2 className="text-3xl font-black leading-tight" style={{ color: hex(C.accent) }}>
            DRE Gerencial
          </h2>

          <div className="w-32 h-1 mt-4 rounded" style={{ backgroundColor: hex(C.teal) }} />

          <div className="mt-4 text-lg" style={{ color: hex(C.headerBg) }}>{data.monthLabel}</div>
          <div className="text-sm" style={{ color: hex(C.mutedText) }}>
            {data.marca || 'Consolidado'}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded text-xs font-bold text-white" style={{ backgroundColor: hex(C.justified) }}>
            Versao {data.version}
          </span>
          {snapLabel && (
            <span className="px-3 py-1 rounded text-xs font-bold text-white bg-gray-600">
              {snapLabel}
            </span>
          )}
          <span
            className="px-3 py-1 rounded text-xs font-bold text-white"
            style={{ backgroundColor: data.stats.coveragePct >= 80 ? hex(C.approved) : hex(C.pending) }}
          >
            {data.stats.coveragePct}% das contas justificadas
          </span>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-3" style={{ backgroundColor: hex(C.accent) }} />
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
      <div className="flex gap-4 p-4 h-[calc(100%-48px)]">
        {/* Left: DRE table */}
        <div className="flex-1 min-w-0 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: hex(C.headerBg) }}>
                <th className="text-left px-2 py-1.5 font-bold text-[11px] text-white">DESCRICAO</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">REAL {data.year}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">ORCADO</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">D% Orc</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">{a1Label}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                if (entry.type === 'section') {
                  const { section } = entry;
                  const { node, invertDelta } = section;
                  return (
                    <tr key={idx} className="font-bold bg-white border-b border-gray-100">
                      <td className="px-2 py-1.5" style={{ color: hex(C.darkText) }}>{section.tag0}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: hex(C.darkText) }}>{fmtK(node.real)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: hex(C.darkText) }}>{fmtK(node.orcCompare)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.orcVarPct, invertDelta) }}>{fmtPct(node.orcVarPct)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: hex(C.darkText) }}>{fmtK(node.a1Compare)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.a1VarPct, invertDelta) }}>{fmtPct(node.a1VarPct)}</td>
                    </tr>
                  );
                } else {
                  const { calc, bg, textColor } = entry;
                  const baseColor = textColor || 'FFFFFF';
                  const dOrcColor = calc.deltaOrcPct != null && calc.deltaOrcPct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  const dA1Color = calc.deltaA1Pct != null && calc.deltaA1Pct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  return (
                    <tr key={idx} className="font-bold" style={{ backgroundColor: hex(bg), color: hex(baseColor) }}>
                      <td className="px-2 py-1.5">{calc.label}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(calc.real)}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(calc.orcado)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: dOrcColor }}>{fmtPct(calc.deltaOrcPct)}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(calc.a1)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: dA1Color }}>{fmtPct(calc.deltaA1Pct)}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Right: KPIs + progress */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="EBITDA TOTAL" value={ebitdaReal} color={hex(C.consolidado)} />
            <KpiCard label="VS ORCADO" value={ebitdaVsOrc} color={ebitdaOrcColor} />
            <KpiCard label={`VS ${a1Label}`} value={ebitdaVsA1} color={ebitdaA1Color} />
            <KpiCard label="COBERTURA JUSTIF." value={`${stats.coveragePct}%`} color={stats.coveragePct >= 80 ? hex(C.approved) : hex(C.pending)} />
          </div>

          {/* Progress */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-[10px] font-bold text-gray-700 mb-2">Progresso de Justificativas</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {statusItems.map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: hex(item.color) }} />
                  <span className="text-[9px] text-gray-600">{item.label}: {item.count}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-bold text-gray-500 mt-2">Total: {stats.totalLeaves} contas</div>
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
      <div className="flex flex-col gap-3 p-4 h-[calc(100%-48px)]">
        {/* Tag01 financial table */}
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: hex(C.headerBg) }}>
                <th className="text-left px-2 py-1.5 font-bold text-[11px] text-white">DESCRICAO</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">REAL {data.year}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">ORCADO</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">D% Orc</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">{a1Label}</th>
                <th className="text-right px-2 py-1.5 font-bold text-[11px] text-white">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {(section.tag0.startsWith('01.')
                ? [...section.tag01Nodes].sort((a, b) => b.real - a.real)
                : section.tag01Nodes
              ).map((t01, idx) => (
                <tr key={idx} className="border-b border-gray-100 bg-white">
                  <td className="px-2 py-1.5 text-gray-800">↳ {t01.label}</td>
                  <td className="text-right px-2 py-1.5 font-medium" style={{ color: hex(C.darkText) }}>{fmtK(t01.real)}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: hex(C.darkText) }}>{fmtK(t01.orcCompare)}</td>
                  <td className="text-right px-2 py-1.5 font-medium" style={{ color: deltaColor(t01.orcVarPct, invertDelta) }}>{fmtPct(t01.orcVarPct)}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: hex(C.darkText) }}>{fmtK(t01.a1Compare)}</td>
                  <td className="text-right px-2 py-1.5 font-medium" style={{ color: deltaColor(t01.a1VarPct, invertDelta) }}>{fmtPct(t01.a1VarPct)}</td>
                </tr>
              ))}
              {/* Total — bg = sectionColor */}
              <tr className="font-bold text-white" style={{ backgroundColor: hex(section.sectionColor) }}>
                <td className="px-2 py-1.5">TOTAL</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.real)}</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.orcCompare)}</td>
                <td className="text-right px-2 py-1.5">{fmtPct(node.orcVarPct)}</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.a1Compare)}</td>
                <td className="text-right px-2 py-1.5">{fmtPct(node.a1VarPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom: insights + drivers/top desvios */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left: AI Summary */}
          <div className="flex-1 min-w-0">
            <InsightsBox text={insightText} />
          </div>

          {/* Right: Drivers or Top Desvios */}
          <div className="w-64 shrink-0 flex flex-col gap-1.5">
            {hasEnrichedDrivers ? (
              <>
                <div className="text-[10px] font-bold" style={{ color: hex(C.accent) }}>DRIVERS PRINCIPAIS</div>
                {node.enrichedDrivers!.map((driver, idx) => (
                  <div key={idx} className="rounded-md border border-gray-200 bg-white overflow-hidden flex">
                    <div className="w-1 shrink-0" style={{ backgroundColor: hex(C.accent) }} />
                    <p className="text-[10px] text-gray-700 px-2 py-1.5 leading-snug">{driver}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold" style={{ color: hex(C.headerBg) }}>TOP DESVIOS</div>
                {top3.map((n, idx) => {
                  const borderColor = deltaColor(n.orcVarPct, invertDelta);
                  const justText = n.orcAiSummary || n.orcJustification || 'Sem justificativa';
                  return (
                    <div key={idx} className="rounded-md border border-gray-200 bg-white overflow-hidden flex">
                      <div className="w-1 shrink-0" style={{ backgroundColor: borderColor }} />
                      <div className="px-2 py-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-700 truncate">{n.label}</span>
                          <span className="text-[10px] font-bold shrink-0 ml-1" style={{ color: borderColor }}>D Orc: {fmtPct(n.orcVarPct)}</span>
                        </div>
                        <div className="flex items-start gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: statusColor(n.orcStatus) }} />
                          <span className="text-[9px] text-gray-500 leading-snug">{truncate(justText, 80)}</span>
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

function DetailSlide({ section, data }: { section: VariancePptSection; data: VariancePptData }) {
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

  const MAX_ROWS = 18;
  const truncated = allRows.length > MAX_ROWS;
  const displayRows = truncated ? allRows.slice(0, MAX_ROWS) : allRows;
  const remaining = allRows.length - MAX_ROWS;

  return (
    <SlideCard>
      <SlideHeader title={`${section.label.toUpperCase()} — DETALHAMENTO`} monthShort={data.monthShort} color={section.sectionColor} />
      <div className="p-4 overflow-auto h-[calc(100%-48px)]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ backgroundColor: hex(C.headerBg) }}>
              <th className="text-left px-2 py-1.5 font-bold text-[10px] text-white">CONTA</th>
              <th className="text-right px-2 py-1.5 font-bold text-[10px] text-white">REAL</th>
              <th className="text-right px-2 py-1.5 font-bold text-[10px] text-white">ORC</th>
              <th className="text-right px-2 py-1.5 font-bold text-[10px] text-white">D%</th>
              <th className="text-left px-2 py-1.5 font-bold text-[10px] text-white">JUSTIFICATIVA / SINTESE</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const indent = row.depth === 0 ? '' : row.depth === 1 ? '↳ ' : '\u00A0\u00A0\u00A0↳ ';
              const isBold = row.depth === 0;
              const isMarca = row.depth === 2;
              const textColor = isMarca ? '#EA580C' : row.depth <= 1 ? hex(C.darkText) : hex(C.mutedText);
              const realColor = textColor;
              const fontSize = row.depth === 0 ? '11px' : row.depth === 1 ? '10px' : '9px';
              return (
                <tr key={idx} className="border-b border-gray-100 bg-white" style={{ fontSize }}>
                  <td className="px-2 py-1" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }}>{indent}{row.label}</td>
                  <td className="text-right px-2 py-1" style={{ color: realColor, fontWeight: isBold ? 700 : 400 }}>{fmtK(row.real)}</td>
                  <td className="text-right px-2 py-1" style={{ color: textColor }}>{fmtK(row.orc)}</td>
                  <td className="text-right px-2 py-1" style={{ color: deltaColor(row.varPct, section.invertDelta), fontWeight: isBold ? 700 : 400 }}>{fmtPct(row.varPct)}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {row.status && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(row.status) }} />}
                      <span style={{ color: row.justText ? hex(C.darkText) : hex(C.mutedText) }} className="text-[9px]">
                        {truncate(row.justText, 60) || '\u2014'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {truncated && (
              <tr className="border-b border-gray-100">
                <td colSpan={5} className="px-2 py-1 italic text-[9px] text-gray-400">
                  ...e mais {remaining} linhas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SlideCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MARCA BREAKDOWN SLIDE (CSS bar chart per marca)
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

  // Scale based only on marca values (no totals)
  const maxVal = Math.max(...filtered.flatMap(e => [Math.abs(e.real), Math.abs(e.orcado), Math.abs(e.a1)]), 1);

  // Use most of the available vertical space inside the slide
  const BAR_MAX_H = 280;
  const barPx = (v: number) => Math.max(Math.round((Math.abs(v) / maxVal) * BAR_MAX_H), 3);

  return (
    <SlideCard>
      <SlideHeader title={`${section.label.toUpperCase()} POR MARCA`} monthShort={data.monthShort} color={section.sectionColor} />
      <div className="flex gap-4 p-4 h-[calc(100%-48px)]">
        {/* Left: Bar chart — occupies all available height */}
        <div className="flex-1 min-w-0 flex flex-col justify-end">
          <div className="flex items-end gap-2 px-1" style={{ height: BAR_MAX_H }}>
            {filtered.map((entry, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end min-w-0" style={{ height: BAR_MAX_H }}>
                <div className="flex items-end gap-0.5 w-full justify-center h-full">
                  {/* Real */}
                  <div className="flex flex-col items-center justify-end gap-0.5 flex-1 max-w-8 h-full">
                    <span className="text-[8px] font-bold leading-none" style={{ color: hex(section.sectionColor) }}>{fmtK(entry.real)}</span>
                    <div className="w-full rounded-t" style={{ height: barPx(entry.real), backgroundColor: hex(section.sectionColor) }} />
                  </div>
                  {/* Orcado */}
                  <div className="flex flex-col items-center justify-end gap-0.5 flex-1 max-w-8 h-full">
                    <span className="text-[8px] font-bold leading-none" style={{ color: hex(C.orcado) }}>{fmtK(entry.orcado)}</span>
                    <div className="w-full rounded-t" style={{ height: barPx(entry.orcado), backgroundColor: hex(C.orcado) }} />
                  </div>
                  {/* A-1 */}
                  <div className="flex flex-col items-center justify-end gap-0.5 flex-1 max-w-8 h-full">
                    <span className="text-[8px] font-bold leading-none" style={{ color: hex(C.teal) }}>{fmtK(entry.a1)}</span>
                    <div className="w-full rounded-t" style={{ height: barPx(entry.a1), backgroundColor: hex(C.teal) }} />
                  </div>
                </div>
                <div className="text-[9px] font-bold text-gray-600 mt-1 truncate w-full text-center" title={entry.marca}>
                  {entry.marca}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 justify-center mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: hex(section.sectionColor) }} />
              <span className="text-[9px] text-gray-600">Real</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: hex(C.orcado) }} />
              <span className="text-[9px] text-gray-600">Orcado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: hex(C.teal) }} />
              <span className="text-[9px] text-gray-600">{data.a1Year}</span>
            </div>
          </div>
        </div>

        {/* Right: KPIs + AI insight */}
        <div className="w-48 shrink-0 flex flex-col gap-2">
          <KpiCard label="TOTAL REAL" value={`R$ ${fmtK(totalReal)} mil`} color={hex(section.sectionColor)} />
          <KpiCard label="TOTAL ORCADO" value={`R$ ${fmtK(totalOrc)} mil`} color={hex(C.orcado)} />
          <KpiCard
            label={deltaAbs >= 0 ? 'ECONOMIA' : 'DESVIO'}
            value={`${fmtPct(deltaPct)}`}
            color={favorable ? hex(C.deltaPositivo) : hex(C.deltaNegativo)}
          />
          <div className="text-[9px] text-gray-500 text-center mt-1">
            {fmtK(Math.abs(deltaAbs))} mil
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
      <div className="flex gap-6 p-6 h-[calc(100%-48px)]">
        {/* Left: Coverage */}
        <div className="flex-1 flex flex-col">
          <div
            className="text-6xl font-black"
            style={{ color: stats.coveragePct >= 80 ? hex(C.approved) : stats.coveragePct >= 50 ? hex(C.pending) : hex(C.rejected) }}
          >
            {stats.coveragePct}%
          </div>
          <div className="text-sm font-medium mt-1" style={{ color: hex(C.headerBg) }}>
            Cobertura de Justificativas
          </div>

          {/* Segmented bar */}
          <div className="flex h-4 rounded overflow-hidden mt-4 max-w-sm">
            {segments.map(seg => {
              const w = (seg.count / totalForBar) * 100;
              if (w < 0.5) return null;
              return <div key={seg.label} style={{ width: `${w}%`, backgroundColor: hex(seg.color) }} />;
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: hex(seg.color) }} />
                <span className="text-[10px] text-gray-600">{seg.label}: {seg.count}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-bold text-gray-500 mt-2">
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
        <div className="w-72 shrink-0">
          <div className="text-xs font-bold mb-2" style={{ color: hex(C.rejected) }}>
            TOP DESVIOS NAO JUSTIFICADOS
          </div>

          {unjustified.length === 0 ? (
            <div className="text-sm font-bold" style={{ color: hex(C.approved) }}>
              Todas as contas estao justificadas!
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {topUnjust.map((item, idx) => (
                <div key={idx} className="rounded-md border border-gray-200 bg-white overflow-hidden flex">
                  <div className="w-1 shrink-0" style={{ backgroundColor: hex(C.rejected) }} />
                  <div className="px-2 py-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-700 truncate">{item.tag0} {truncate(item.label, 35)}</span>
                      <span className="text-[10px] font-bold shrink-0 ml-1" style={{ color: deltaColor(item.varPct, item.invert) }}>
                        {fmtPct(item.varPct)}
                      </span>
                    </div>
                    <div className="text-[9px] italic text-gray-400">Sem justificativa</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-2" style={{ backgroundColor: hex(C.headerBg) }}>
        <span className="text-[10px]" style={{ color: hex(C.mutedText) }}>Gerado automaticamente — DRE Raiz</span>
        <span className="text-[10px]" style={{ color: hex(C.mutedText) }}>{new Date().toLocaleDateString('pt-BR')}</span>
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

export default function VariancePptPreview({ data }: VariancePptPreviewProps) {
  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Build slide array
  const slides = useMemo(() => {
    const s: React.ReactNode[] = [];
    s.push(<CoverSlide key="cover" data={data} />);
    s.push(<OverviewSlide key="overview" data={data} />);
    for (const section of data.sections) {
      if (section.tag01Nodes.length > 0) {
        s.push(<SectionSlide key={`section-${section.tag0}`} section={section} data={data} />);
        s.push(<DetailSlide key={`detail-${section.tag0}`} section={section} data={data} />);
      }
      const marcaEntries = data.marcaBreakdowns?.[section.tag0];
      if (marcaEntries && marcaEntries.length > 0) {
        s.push(<MarcaSlide key={`marca-${section.tag0}`} section={section} data={data} entries={marcaEntries} />);
      }
    }
    s.push(<SummarySlide key="summary" data={data} />);
    return s;
  }, [data]);

  const totalSlides = slides.length;

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
      {/* Apresentar button */}
      <div className="flex justify-end">
        <button
          onClick={startPresentation}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
        >
          <Play size={16} />
          Apresentar
        </button>
      </div>

      {/* Slide 1: Cover */}
      <CoverSlide data={data} />

      {/* Slide 2: Overview */}
      <OverviewSlide data={data} />

      {/* Slides 3-N: Section + Detail + Marca paired */}
      {data.sections.map(section => {
        const marcaEntries = data.marcaBreakdowns?.[section.tag0];
        return (
          <React.Fragment key={section.tag0}>
            {section.tag01Nodes.length > 0 && (
              <>
                <SectionSlide section={section} data={data} />
                <DetailSlide section={section} data={data} />
              </>
            )}
            {marcaEntries && marcaEntries.length > 0 && (
              <MarcaSlide section={section} data={data} entries={marcaEntries} />
            )}
          </React.Fragment>
        );
      })}

      {/* Final: Summary */}
      <SummarySlide data={data} />

      {/* Presentation mode overlay */}
      {presenting && (
        <PresentationMode
          slides={slides}
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
