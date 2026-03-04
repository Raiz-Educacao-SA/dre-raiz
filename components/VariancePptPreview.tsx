// ─── Variance PPT Preview — HTML Slide Cards ────────────────────────
// Renders VariancePptData as visual slide cards (same structure as PPTX)

import React from 'react';
import type {
  VariancePptData,
  VariancePptSection,
  VariancePptNode,
  VariancePptCalcRow,
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
    <section className={`relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
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
            Justificativas de Desvios
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
  type RowEntry = { type: 'section'; section: VariancePptSection } | { type: 'calc'; calc: VariancePptCalcRow; bg: string };
  const entries: RowEntry[] = [];

  for (const section of data.sections) {
    entries.push({ type: 'section', section });
    if (section.tag0.startsWith('03.') && margemCalc) {
      entries.push({ type: 'calc', calc: margemCalc, bg: C.accent });
    }
    if (section.tag0.startsWith('04.') && ebitdaSrCalc) {
      entries.push({ type: 'calc', calc: ebitdaSrCalc, bg: C.headerBg });
    }
  }
  if (ebitdaTotalCalc) {
    entries.push({ type: 'calc', calc: ebitdaTotalCalc, bg: C.headerBg });
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
                <th className="text-left px-2 py-1.5 text-white font-bold text-[11px]">DESCRICAO</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">REAL {data.year}</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">ORCADO</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">D% Orc</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">{a1Label}</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                if (entry.type === 'section') {
                  const { section } = entry;
                  const { node, invertDelta } = section;
                  return (
                    <tr key={idx} className="font-bold text-white" style={{ backgroundColor: '#4B5563' }}>
                      <td className="px-2 py-1.5">{section.tag0}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(node.real)}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(node.orcCompare)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.orcVarPct, invertDelta) }}>{fmtPct(node.orcVarPct)}</td>
                      <td className="text-right px-2 py-1.5">{fmtK(node.a1Compare)}</td>
                      <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.a1VarPct, invertDelta) }}>{fmtPct(node.a1VarPct)}</td>
                    </tr>
                  );
                } else {
                  const { calc, bg } = entry;
                  const dOrcColor = calc.deltaOrcPct != null && calc.deltaOrcPct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  const dA1Color = calc.deltaA1Pct != null && calc.deltaA1Pct >= 0 ? hex(C.deltaPositivo) : hex(C.deltaNegativo);
                  return (
                    <tr key={idx} className="font-bold text-white" style={{ backgroundColor: hex(bg) }}>
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
                <th className="text-left px-2 py-1.5 text-white font-bold text-[11px]">DESCRICAO</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">REAL {data.year}</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">ORCADO</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">D% Orc</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">{a1Label}</th>
                <th className="text-right px-2 py-1.5 text-white font-bold text-[11px]">D% {a1Label}</th>
              </tr>
            </thead>
            <tbody>
              {section.tag01Nodes.map((t01, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 text-gray-800">{t01.label}</td>
                  <td className="text-right px-2 py-1.5 text-gray-800">{fmtK(t01.real)}</td>
                  <td className="text-right px-2 py-1.5 text-gray-500">{fmtK(t01.orcCompare)}</td>
                  <td className="text-right px-2 py-1.5 font-medium" style={{ color: deltaColor(t01.orcVarPct, invertDelta) }}>{fmtPct(t01.orcVarPct)}</td>
                  <td className="text-right px-2 py-1.5 text-gray-500">{fmtK(t01.a1Compare)}</td>
                  <td className="text-right px-2 py-1.5 font-medium" style={{ color: deltaColor(t01.a1VarPct, invertDelta) }}>{fmtPct(t01.a1VarPct)}</td>
                </tr>
              ))}
              {/* Total */}
              <tr className="font-bold text-white" style={{ backgroundColor: '#374151' }}>
                <td className="px-2 py-1.5">TOTAL</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.real)}</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.orcCompare)}</td>
                <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.orcVarPct, invertDelta) }}>{fmtPct(node.orcVarPct)}</td>
                <td className="text-right px-2 py-1.5">{fmtK(node.a1Compare)}</td>
                <td className="text-right px-2 py-1.5" style={{ color: deltaColor(node.a1VarPct, invertDelta) }}>{fmtPct(node.a1VarPct)}</td>
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
      for (const t03 of t02.children) {
        allRows.push({ depth: 2, label: t03.label, real: t03.real, orc: t03.orcCompare, varPct: t03.orcVarPct, justText: t03.orcJustification || t03.orcAiSummary || '', status: t03.orcStatus });
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
              <th className="text-left px-2 py-1.5 text-white font-bold text-[10px]">CONTA</th>
              <th className="text-right px-2 py-1.5 text-white font-bold text-[10px]">REAL</th>
              <th className="text-right px-2 py-1.5 text-white font-bold text-[10px]">ORC</th>
              <th className="text-right px-2 py-1.5 text-white font-bold text-[10px]">D%</th>
              <th className="text-left px-2 py-1.5 text-white font-bold text-[10px]">JUSTIFICATIVA / SINTESE</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => {
              const indent = row.depth === 0 ? '' : row.depth === 1 ? '\u00A0\u00A0\u00A0' : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
              const isBold = row.depth === 0;
              const textColor = row.depth <= 1 ? hex(C.darkText) : hex(C.mutedText);
              const fontSize = row.depth === 0 ? '11px' : row.depth === 1 ? '10px' : '9px';
              return (
                <tr key={idx} className="border-b border-gray-100" style={{ fontSize }}>
                  <td className="px-2 py-1" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }}>{indent}{row.label}</td>
                  <td className="text-right px-2 py-1" style={{ color: textColor, fontWeight: isBold ? 700 : 400 }}>{fmtK(row.real)}</td>
                  <td className="text-right px-2 py-1" style={{ color: hex(C.mutedText) }}>{fmtK(row.orc)}</td>
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

interface VariancePptPreviewProps {
  data: VariancePptData;
}

export default function VariancePptPreview({ data }: VariancePptPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Slide 1: Cover */}
      <CoverSlide data={data} />

      {/* Slide 2: Overview */}
      <OverviewSlide data={data} />

      {/* Slides 3-N: Section slides */}
      {data.sections.map(section => (
        <SectionSlide key={`section-${section.tag0}`} section={section} data={data} />
      ))}

      {/* Detail slides */}
      {data.sections.map(section => (
        section.tag01Nodes.length > 0
          ? <DetailSlide key={`detail-${section.tag0}`} section={section} data={data} />
          : null
      ))}

      {/* Final: Summary */}
      <SummarySlide data={data} />
    </div>
  );
}
