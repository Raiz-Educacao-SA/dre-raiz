/**
 * PptNovoSlides.tsx
 * Viewer de slides renderizado em HTML — mesma estética do VariancePptPreview.
 * Não usa pptxgenjs; cada tipo de slide é um componente React.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import type {
  PptSlideData, CoverSlide, MensagemExecutivaSlide, PortfolioSemaforoSlide,
  SectionDividerSlide, DreTableSlide, EbitdaBridgeSlide, TopDesviosSlide,
  SectionOverviewSlide, Tag01DetailSlide, JustificativasSlide, EbitdaConsolidadoSlide,
  EbitdaPorMarcaSlide, AlertasSlide, DecisoesSlide, MarcaDeepDiveSlide, EncerramentoSlide,
} from '../services/pptSlideData';
import { fmtBRL, fmtPct, deltaSign, SC } from '../services/pptSlideData';

// ─── Helpers visuais ──────────────────────────────────────────────────────────

function dc(sign: 'pos' | 'neg' | 'neutral'): string {
  if (sign === 'pos')  return 'text-emerald-600 font-semibold';
  if (sign === 'neg')  return 'text-red-500 font-semibold';
  return 'text-gray-400';
}

function dcInline(sign: 'pos' | 'neg' | 'neutral'): React.CSSProperties {
  if (sign === 'pos') return { color: SC.green };
  if (sign === 'neg') return { color: SC.red };
  return { color: SC.gray };
}

function Badge({ text, color, textColor = '#fff' }: { text: string; color: string; textColor?: string }) {
  return (
    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: color, color: textColor }}>
      {text}
    </span>
  );
}

function KpiCard({ label, value, delta, deltaSign: ds }:
  { label: string; value: string; delta?: string; deltaSign?: 'pos' | 'neg' | 'neutral' }) {
  return (
    <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center min-w-0">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider truncate">{label}</div>
      <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{value}</div>
      {delta && ds && (
        <div className={`text-[10px] mt-0.5 ${dc(ds)}`}>{delta}</div>
      )}
    </div>
  );
}

function SlideShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full h-full relative overflow-hidden rounded-xl bg-white border border-gray-200/80 ${className}`}
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
      {children}
    </div>
  );
}

function SlideTitle({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="text-sm font-bold text-[#0F1C2E]">{text}</div>
      {sub && <div className="text-[10px] text-gray-400 italic">{sub}</div>}
    </div>
  );
}

// ─── Slide: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ s }: { s: CoverSlide }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: SC.navy }}>
      {/* accent bars */}
      <div className="h-1.5 w-full" style={{ background: SC.blue }} />
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: SC.blue }} />

      <div className="flex-1 flex flex-col justify-center pl-8 pr-6">
        <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: SC.blue }}>
          DEMONSTRAÇÃO DE RESULTADO
        </div>
        <div className="text-3xl font-black mb-1 leading-tight" style={{ color: '#fff' }}>
          DRE RAIZ EDUCAÇÃO
        </div>
        <div className="text-xl font-bold mb-4" style={{ color: '#fff' }}>
          {s.monthLabelStr}
        </div>

        {s.marcas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {s.marcas.slice(0, 8).map(m => (
              <span key={m} className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: SC.navyLight, color: '#fff', border: `1px solid ${SC.blue}` }}>
                {m}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full self-start"
            style={{ background: SC.navyLight, color: '#fff', border: `1px solid ${SC.blue}` }}>
            CONSOLIDADO — TODAS AS MARCAS
          </span>
        )}
      </div>

      <div className="text-center text-[9px] pb-2" style={{ color: SC.gray }}>
        CONFIDENCIAL — USO INTERNO
      </div>
      <div className="h-1.5 w-full" style={{ background: SC.blue }} />
    </div>
  );
}

// ─── Slide: Mensagem Executiva (SCR) ─────────────────────────────────────────
function SlideMensagemExecutiva({ s }: { s: MensagemExecutivaSlide }) {
  const dOrcEb = deltaSign(s.ebitda - s.ebitdaOrc, false);
  const dOrcRec = deltaSign(pctDiff2(s.receita, s.receitaOrc), false);
  return (
    <SlideShell>
      <SlideTitle text={`Mensagem Executiva — ${s.monthLabelStr}`}
        sub="Framework SCR: Situação → Complicação → Resolução" />

      <div className="px-4 flex gap-2 h-[52%]">
        {[
          { title: '🔵 SITUAÇÃO',    color: SC.blue,  text: s.scr.situacao },
          { title: '🔴 COMPLICAÇÃO', color: SC.red,   text: s.scr.complicacao },
          { title: '🟢 RESOLUÇÃO',   color: SC.green, text: s.scr.resolucao },
        ].map(col => (
          <div key={col.title} className="flex-1 flex flex-col rounded-lg overflow-hidden border border-gray-200 min-w-0">
            <div className="text-[9px] font-bold text-white px-2 py-1.5 text-center"
              style={{ background: col.color }}>
              {col.title}
            </div>
            <div className="flex-1 bg-gray-50 p-2 text-[9px] text-gray-700 leading-relaxed overflow-hidden">
              {col.text}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex gap-2">
        <KpiCard label="EBITDA Real" value={fmtBRL(s.ebitdaTotal)}
          delta={fmtPct(pctDiff2(s.ebitda, s.ebitdaOrc))} deltaSign={dOrcEb} />
        <KpiCard label="Receita Real" value={fmtBRL(s.receita)}
          delta={fmtPct(pctDiff2(s.receita, s.receitaOrc))} deltaSign={dOrcRec} />
        <KpiCard label="Margem EBITDA" value={`${s.margemPct.toFixed(1)}%`} />
        <KpiCard label="Top Desvio"
          value={s.topDesvio ? s.topDesvio.label.substring(0, 16) : '—'}
          delta={s.topDesvio ? fmtPct(s.topDesvio.dp) : undefined}
          deltaSign={s.topDesvio ? deltaSign(s.topDesvio.dp, false) : undefined} />
      </div>
    </SlideShell>
  );
}

// ─── Slide: Portfolio Semáforo ────────────────────────────────────────────────
function SlidePortfolioSemaforo({ s }: { s: PortfolioSemaforoSlide }) {
  return (
    <SlideShell>
      <SlideTitle text="Semáforo do Portfolio — Visão por Marca"
        sub={`Performance relativa vs Orçado — ${s.monthLabelStr}`} />
      <div className="px-4 overflow-auto" style={{ maxHeight: 'calc(100% - 56px)' }}>
        {s.marcaStats.length === 0 ? (
          <div className="text-center text-xs text-gray-400 mt-8">
            Selecione marcas para ver o semáforo individual
          </div>
        ) : (
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-white text-center" style={{ background: SC.navy }}>
                <th className="px-2 py-1.5 text-left rounded-tl">MARCA</th>
                <th className="px-2 py-1.5 text-right">EBITDA R$</th>
                <th className="px-2 py-1.5 text-right">vs Orc%</th>
                <th className="px-2 py-1.5 text-right">Receita R$</th>
                <th className="px-2 py-1.5 text-right">Margem%</th>
                <th className="px-2 py-1.5 text-center rounded-tr">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {s.marcaStats.map((m, i) => {
                const ds = deltaSign(m.deltaOrcPct, true);
                return (
                  <tr key={m.marca} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1 font-semibold text-gray-800">{m.marca}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(m.ebitdaReal)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${dc(ds)}`}>{fmtPct(m.deltaOrcPct)}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(m.receitaReal)}</td>
                    <td className="px-2 py-1 text-right font-bold"
                      style={dcInline(m.margemPct >= 0 ? 'pos' : 'neg')}>
                      {fmtPct(m.margemPct)}
                    </td>
                    <td className="px-2 py-1 text-center text-base">{m.sem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Section Divider ───────────────────────────────────────────────────
function SlideSectionDivider({ s }: { s: SectionDividerSlide }) {
  return (
    <div className="w-full h-full flex relative" style={{ background: SC.navy }}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: s.color }} />
      <div className="absolute top-0 left-0 right-0 h-px opacity-20" style={{ background: s.color }} />
      <div className="flex flex-col justify-center pl-10">
        <div className="text-3xl font-black mb-2 leading-tight" style={{ color: '#fff' }}>
          {s.title}
        </div>
        <div className="h-0.5 w-16 mb-2 rounded-full" style={{ background: s.color }} />
        <div className="text-sm italic" style={{ color: s.color }}>{s.subtitle}</div>
      </div>
    </div>
  );
}

// ─── Slide: DRE Table ─────────────────────────────────────────────────────────
function SlideDreTable({ s }: { s: DreTableSlide }) {
  return (
    <SlideShell>
      <SlideTitle text={s.title} sub={s.subtitle} />
      <div className="px-3 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        <table className="w-full text-[9px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: SC.navy }} className="text-white">
              <th className="px-2 py-1.5 text-left">DESCRIÇÃO</th>
              <th className="px-2 py-1.5 text-right">REAL</th>
              <th className="px-2 py-1.5 text-right">ORÇADO</th>
              <th className="px-2 py-1.5 text-right">Δ% Orc</th>
              <th className="px-2 py-1.5 text-right">A-1</th>
              <th className="px-2 py-1.5 text-right">Δ% A-1</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, i) => {
              if (row.kind === 'section') {
                const ds1 = deltaSign(row.dOrcPct, row.invertDelta);
                const ds2 = deltaSign(row.dA1Pct, row.invertDelta);
                return (
                  <tr key={i} className="text-white font-bold" style={{ background: row.color }}>
                    <td className="px-2 py-1">{row.label}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.real)}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.orcado)}</td>
                    <td className="px-2 py-1 text-right" style={ds1 === 'pos' ? { color: '#A7F3D0' } : { color: '#FCA5A5' }}>
                      {fmtPct(row.dOrcPct)}
                    </td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.a1)}</td>
                    <td className="px-2 py-1 text-right" style={ds2 === 'pos' ? { color: '#A7F3D0' } : { color: '#FCA5A5' }}>
                      {fmtPct(row.dA1Pct)}
                    </td>
                  </tr>
                );
              }
              if (row.kind === 'calc') {
                const ds1 = deltaSign(row.dOrcPct, false);
                const ds2 = deltaSign(row.dA1Pct, false);
                return (
                  <tr key={i} className="font-bold text-white" style={{ background: row.color }}>
                    <td className="px-2 py-1 text-[9px]">{row.label}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.real)}</td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.orcado)}</td>
                    <td className="px-2 py-1 text-right" style={ds1 === 'pos' ? { color: '#A7F3D0' } : { color: '#FCA5A5' }}>
                      {fmtPct(row.dOrcPct)}
                    </td>
                    <td className="px-2 py-1 text-right">{fmtBRL(row.a1)}</td>
                    <td className="px-2 py-1 text-right" style={ds2 === 'pos' ? { color: '#A7F3D0' } : { color: '#FCA5A5' }}>
                      {fmtPct(row.dA1Pct)}
                    </td>
                  </tr>
                );
              }
              // tag01
              const ds1 = deltaSign(row.dOrcPct, row.invertDelta);
              const ds2 = deltaSign(row.dA1Pct, row.invertDelta);
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-0.5 pl-4 text-gray-700">{row.label}</td>
                  <td className="px-2 py-0.5 text-right text-gray-700">{fmtBRL(row.real)}</td>
                  <td className="px-2 py-0.5 text-right text-gray-500">{fmtBRL(row.orcado)}</td>
                  <td className={`px-2 py-0.5 text-right ${dc(ds1)}`}>{fmtPct(row.dOrcPct)}</td>
                  <td className="px-2 py-0.5 text-right text-gray-500">{fmtBRL(row.a1)}</td>
                  <td className={`px-2 py-0.5 text-right ${dc(ds2)}`}>{fmtPct(row.dA1Pct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SlideShell>
  );
}

// ─── Slide: EBITDA Bridge ─────────────────────────────────────────────────────
function SlideEbitdaBridge({ s }: { s: EbitdaBridgeSlide }) {
  const maxAbs = Math.max(...s.bridges.map(b => Math.abs(b.val)), 1);
  const BAR_MAX_H = 55; // % da área do chart

  return (
    <SlideShell>
      <SlideTitle text="EBITDA Bridge — Orçado → Real"
        sub="Contribuição de cada grupo para o desvio de EBITDA" />
      <div className="px-4 flex items-end gap-1 pb-8" style={{ height: 'calc(100% - 52px)' }}>
        {s.bridges.map((b, i) => {
          const ratio = Math.abs(b.val) / maxAbs;
          const barH = Math.max(ratio * BAR_MAX_H, 2);
          const good = b.isDelta
            ? (b.invertDelta ? b.val <= 0 : b.val >= 0)
            : true;
          const color = b.isDelta
            ? (good ? SC.green : SC.red)
            : SC.blue;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0">
              <div className="text-[9px] font-bold text-center" style={{ color }}>
                {b.val >= 0 ? '+' : ''}{fmtBRL(b.val)}
              </div>
              <div className="w-full rounded-t-sm" style={{ height: `${barH}%`, background: color, minHeight: 4 }} />
              <div className="text-[8px] text-gray-500 text-center leading-tight mt-1"
                style={{ wordBreak: 'break-word' }}>
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Top Desvios ───────────────────────────────────────────────────────
function SlideTopDesvios({ s }: { s: TopDesviosSlide }) {
  return (
    <SlideShell>
      <SlideTitle text={s.title} sub="Top 15 desvios por tag01 — ordenado por magnitude vs Orçado" />
      <div className="px-3 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        <table className="w-full text-[9px] border-collapse">
          <thead className="sticky top-0">
            <tr style={{ background: SC.navy }} className="text-white">
              <th className="px-2 py-1.5 text-left">#</th>
              <th className="px-2 py-1.5 text-left">GRUPO</th>
              <th className="px-2 py-1.5 text-left">ITEM</th>
              <th className="px-2 py-1.5 text-right">REAL</th>
              <th className="px-2 py-1.5 text-right">ORÇADO</th>
              <th className="px-2 py-1.5 text-right">Δ%</th>
              <th className="px-2 py-1.5 text-center">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((item, i) => {
              const ds = deltaSign(item.deltaPct, item.invertDelta);
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-1 text-gray-500">{item.tag0.replace(/^\d+\.\s*/, '').substring(0, 12)}</td>
                  <td className="px-2 py-1 font-medium text-gray-800">{item.tag01}</td>
                  <td className="px-2 py-1 text-right">{fmtBRL(item.real)}</td>
                  <td className="px-2 py-1 text-right text-gray-500">{fmtBRL(item.orcado)}</td>
                  <td className={`px-2 py-1 text-right font-bold ${dc(ds)}`}>{fmtPct(item.deltaPct)}</td>
                  <td className="px-2 py-1 text-center text-[9px]">
                    {ds === 'pos'
                      ? <span className="text-emerald-600">✅ Favorável</span>
                      : <span className="text-red-500">⚠ Atenção</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Section Overview ──────────────────────────────────────────────────
function SlideSectionOverview({ s }: { s: SectionOverviewSlide }) {
  const ds1 = deltaSign(s.dOrcPct, s.invertDelta);
  const ds2 = deltaSign(s.dA1Pct, s.invertDelta);
  const maxV = Math.max(...s.top5.map(t => Math.max(Math.abs(t.real), Math.abs(t.orcado))), 1);

  return (
    <SlideShell>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ background: s.secColor }} />
      <div className="pl-4">
        <SlideTitle text={`${s.secLabel} — Visão Geral`} />

        <div className="px-3 flex gap-2 mb-2">
          <KpiCard label="REAL" value={fmtBRL(s.real)} />
          <KpiCard label="vs ORÇADO" value={fmtPct(s.dOrcPct)} delta={fmtPct(s.dOrcPct)} deltaSign={ds1} />
          <KpiCard label="vs A-1" value={fmtPct(s.dA1Pct)} delta={fmtPct(s.dA1Pct)} deltaSign={ds2} />
          <KpiCard label="JUSTIFICATIVAS" value={`${s.justCount}`} />
        </div>

        {/* Insight box */}
        <div className="mx-3 rounded-lg px-3 py-2 mb-2" style={{ background: SC.navyLight }}>
          <div className="text-[10px] font-bold text-white mb-0.5">{s.bluf}</div>
          <div className="text-[9px] leading-relaxed" style={{ color: '#AABBCC' }}>
            Real: {fmtBRL(s.real)} | Orçado: {fmtBRL(s.orcado)} | A-1: {fmtBRL(s.a1)}<br/>
            Desvio vs Orc: {fmtBRL(s.real - s.orcado)} ({fmtPct(s.dOrcPct)}) |
            Desvio vs A-1: {fmtBRL(s.real - s.a1)} ({fmtPct(s.dA1Pct)})
          </div>
        </div>

        {/* Mini chart */}
        {s.top5.length > 0 && (
          <div className="mx-3">
            <div className="text-[9px] text-gray-400 mb-1">Top 5 por desvio — ■ Real  ■ Orçado</div>
            <div className="flex gap-2 items-end h-14">
              {s.top5.map((item, i) => {
                const rH = (Math.abs(item.real) / maxV) * 100;
                const oH = (Math.abs(item.orcado) / maxV) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center min-w-0">
                    <div className="w-full flex gap-0.5 items-end h-10">
                      <div className="flex-1 rounded-t-sm" style={{ height: `${rH}%`, background: s.secColor }} />
                      <div className="flex-1 rounded-t-sm bg-gray-300" style={{ height: `${oH}%` }} />
                    </div>
                    <div className="text-[7px] text-gray-500 text-center leading-tight mt-0.5 truncate w-full">
                      {item.tag01.substring(0, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Tag01 Detail ──────────────────────────────────────────────────────
function SlideTag01Detail({ s }: { s: Tag01DetailSlide }) {
  return (
    <SlideShell>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ background: s.secColor }} />
      <div className="pl-4">
        <SlideTitle text={`${s.secLabel} — Detalhamento por Tag01`} />
        <div className="px-3 overflow-auto" style={{ maxHeight: 'calc(100% - 50px)' }}>
          <table className="w-full text-[9px] border-collapse">
            <thead className="sticky top-0">
              <tr className="text-white" style={{ background: s.secColor }}>
                <th className="px-2 py-1.5 text-left">DESCRIÇÃO</th>
                <th className="px-2 py-1.5 text-right">REAL</th>
                <th className="px-2 py-1.5 text-right">ORÇADO</th>
                <th className="px-2 py-1.5 text-right">Δ R$</th>
                <th className="px-2 py-1.5 text-right">Δ%</th>
                <th className="px-2 py-1.5 text-right">A-1</th>
                <th className="px-2 py-1.5 text-right">Δ A-1%</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((item, i) => {
                const ds1 = deltaSign(item.dOrcPct, s.invertDelta);
                const ds2 = deltaSign(item.dA1Pct,  s.invertDelta);
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1 text-gray-800 font-medium">{item.tag01}</td>
                    <td className="px-2 py-1 text-right text-gray-800">{fmtBRL(item.real)}</td>
                    <td className="px-2 py-1 text-right text-gray-500">{fmtBRL(item.orcado)}</td>
                    <td className={`px-2 py-1 text-right ${dc(ds1)}`}>{fmtBRL(item.dOrc)}</td>
                    <td className={`px-2 py-1 text-right ${dc(ds1)}`}>{fmtPct(item.dOrcPct)}</td>
                    <td className="px-2 py-1 text-right text-gray-500">{fmtBRL(item.a1)}</td>
                    <td className={`px-2 py-1 text-right ${dc(ds2)}`}>{fmtPct(item.dA1Pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Justificativas ────────────────────────────────────────────────────
function SlideJustificativas({ s }: { s: JustificativasSlide }) {
  const statusColor = (st: string) => {
    if (st === 'approved')  return SC.green;
    if (st === 'rejected')  return SC.red;
    if (st === 'justified') return SC.blue;
    return SC.amber;
  };
  return (
    <SlideShell>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ background: s.secColor }} />
      <div className="pl-4">
        <SlideTitle text={`${s.secLabel} — Justificativas`}
          sub="Desvios justificados pelas áreas responsáveis" />
        <div className="px-3 space-y-1.5 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
          {s.justs.slice(0, 6).map((j, i) => (
            <div key={i} className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: s.secColor }} />
              <div className="pl-1 flex items-start justify-between gap-2">
                <div className="font-semibold text-[9px] text-gray-800 flex-1 min-w-0">
                  {j.tag01}{j.tag02 ? ` › ${j.tag02}` : ''}{j.marca ? ` [${j.marca}]` : ''}
                </div>
                <Badge text={j.status.toUpperCase()} color={statusColor(j.status)} />
              </div>
              <div className="pl-1 text-[8px] text-gray-500 mt-0.5">
                Real: {fmtBRL(j.real_value)} | Ref: {fmtBRL(j.compare_value)} |
                Δ: {j.variance_pct != null ? fmtPct(j.variance_pct) : '—'} |
                Resp.: {j.owner_name || '—'}
              </div>
              {j.justification && (
                <div className="pl-1 text-[8px] text-gray-700 mt-0.5 line-clamp-2">{j.justification}</div>
              )}
            </div>
          ))}
          {s.justs.length > 6 && (
            <div className="text-center text-[9px] text-gray-400">
              + {s.justs.length - 6} justificativas adicionais
            </div>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: EBITDA Consolidado ────────────────────────────────────────────────
function SlideEbitdaConsolidado({ s }: { s: EbitdaConsolidadoSlide }) {
  const rows = [
    { label: 'Receita Líquida',          r: s.receita,     o: 0,          a: 0,          inv: false,  bold: false },
    { label: '= MARGEM DE CONTRIBUIÇÃO', r: s.mc,          o: s.mcOrc,    a: s.mcA1,     inv: false,  bold: true },
    { label: '= EBITDA',                 r: s.ebitda,      o: s.ebitdaOrc,a: s.ebitdaA1, inv: false,  bold: true },
    { label: '= EBITDA TOTAL (c/Rateio)',r: s.ebitdaTotal, o: s.ebitdaTotalOrc, a: s.ebitdaTotalA1, inv: false, bold: true },
  ];

  return (
    <SlideShell>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ background: SC.ebitda }} />
      <div className="pl-4">
        <SlideTitle text="MC & EBITDA Consolidado" />
        <div className="px-3 flex gap-2 mb-3">
          <KpiCard label="Margem MC%" value={`${s.margemMC.toFixed(1)}%`} />
          <KpiCard label="Margem EBITDA%" value={`${s.margemEbitda.toFixed(1)}%`} />
          <KpiCard label="EBITDA Total" value={fmtBRL(s.ebitdaTotal)}
            delta={fmtPct(pctDiff2(s.ebitdaTotal, s.ebitdaTotalOrc))}
            deltaSign={deltaSign(pctDiff2(s.ebitdaTotal, s.ebitdaTotalOrc), false)} />
        </div>
        <div className="px-3">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ background: SC.navy }} className="text-white">
                <th className="px-3 py-1.5 text-left">LINHA</th>
                <th className="px-3 py-1.5 text-right">REAL</th>
                <th className="px-3 py-1.5 text-right">ORÇADO</th>
                <th className="px-3 py-1.5 text-right">Δ%</th>
                <th className="px-3 py-1.5 text-right">A-1</th>
                <th className="px-3 py-1.5 text-right">Δ% A-1</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (!row.o) return (
                  <tr key={i} className="bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-700">{row.label}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmtBRL(row.r)}</td>
                    <td colSpan={4} className="px-3 py-1.5 text-center text-gray-400 text-[9px]">—</td>
                  </tr>
                );
                const ds1 = deltaSign(pctDiff2(row.r, row.o), row.inv);
                const ds2 = deltaSign(pctDiff2(row.r, row.a), row.inv);
                return (
                  <tr key={i} className={row.bold ? 'font-bold' : ''} style={row.bold ? { background: '#EEF2FF' } : { background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <td className="px-3 py-1.5 text-gray-800">{row.label}</td>
                    <td className="px-3 py-1.5 text-right">{fmtBRL(row.r)}</td>
                    <td className="px-3 py-1.5 text-right text-gray-500">{fmtBRL(row.o)}</td>
                    <td className={`px-3 py-1.5 text-right ${dc(ds1)}`}>{fmtPct(pctDiff2(row.r, row.o))}</td>
                    <td className="px-3 py-1.5 text-right text-gray-500">{fmtBRL(row.a)}</td>
                    <td className={`px-3 py-1.5 text-right ${dc(ds2)}`}>{fmtPct(pctDiff2(row.r, row.a))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: EBITDA por Marca ──────────────────────────────────────────────────
function SlideEbitdaPorMarca({ s }: { s: EbitdaPorMarcaSlide }) {
  const maxAbs = Math.max(...s.marcaData.map(m => Math.abs(m.ebitdaReal)), 1);
  return (
    <SlideShell>
      <SlideTitle text="EBITDA por Marca — Comparação"
        sub="Ordenado por Margem% (melhor → pior)" />
      <div className="px-4 py-2 space-y-2 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        {s.marcaData.map((m, i) => {
          const ratio = Math.abs(m.ebitdaReal) / maxAbs;
          const good  = m.ebitdaReal >= 0;
          const color = good ? SC.ebitda : SC.red;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-20 text-[9px] font-bold text-gray-700 text-right truncate">{m.marca}</div>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(ratio * 100, 2)}%`, background: color }} />
              </div>
              <div className="w-32 text-[9px]" style={{ color }}>
                {fmtBRL(m.ebitdaReal)} | {m.margemPct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Alertas ───────────────────────────────────────────────────────────
function SlideAlertas({ s }: { s: AlertasSlide }) {
  return (
    <SlideShell>
      <SlideTitle text="🚨 Alertas Críticos"
        sub="Itens com desvio >15% vs Orçado — requer ação imediata" />
      <div className="px-3 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        {s.alerts.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-emerald-600 font-semibold text-sm">
            ✅ Nenhum alerta crítico — todos os itens dentro dos limites
          </div>
        ) : (
          <table className="w-full text-[9px] border-collapse">
            <thead className="sticky top-0">
              <tr style={{ background: SC.red }} className="text-white">
                <th className="px-2 py-1.5 text-left">GRUPO</th>
                <th className="px-2 py-1.5 text-left">ITEM</th>
                <th className="px-2 py-1.5 text-right">REAL</th>
                <th className="px-2 py-1.5 text-right">ORÇADO</th>
                <th className="px-2 py-1.5 text-right">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {s.alerts.map((a, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                  <td className="px-2 py-1 text-gray-500">{a.sec.replace(/^\d+\.\s*/, '').substring(0, 12)}</td>
                  <td className="px-2 py-1 font-semibold text-gray-800">{a.tag01}</td>
                  <td className="px-2 py-1 text-right">{fmtBRL(a.real)}</td>
                  <td className="px-2 py-1 text-right text-gray-500">{fmtBRL(a.orc)}</td>
                  <td className="px-2 py-1 text-right font-bold text-red-500">{fmtPct(a.deltaPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Decisões ──────────────────────────────────────────────────────────
function SlideDecisoes({ s }: { s: DecisoesSlide }) {
  return (
    <SlideShell>
      <SlideTitle text="Decisões e Próximas Ações"
        sub="Itens críticos que requerem plano de ação" />
      <div className="px-3 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        <table className="w-full text-[9px] border-collapse">
          <thead className="sticky top-0">
            <tr style={{ background: SC.navy }} className="text-white">
              <th className="px-2 py-1.5 text-left">ITEM / CONTEXTO</th>
              <th className="px-2 py-1.5 text-left">AÇÃO RECOMENDADA</th>
              <th className="px-2 py-1.5 text-center">RESPONSÁVEL</th>
              <th className="px-2 py-1.5 text-center">PRAZO</th>
              <th className="px-2 py-1.5 text-right">DESVIO</th>
            </tr>
          </thead>
          <tbody>
            {s.items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-emerald-600 font-medium">✅ Sem itens críticos</td></tr>
            ) : s.items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-1.5 font-semibold text-gray-800">{item.tag01}</td>
                <td className="px-2 py-1.5 text-gray-600">Revisar budget e plano de ação</td>
                <td className="px-2 py-1.5 text-center text-gray-400">A definir</td>
                <td className="px-2 py-1.5 text-center text-gray-400">15 dias</td>
                <td className="px-2 py-1.5 text-right font-bold text-red-500">{fmtPct(item.deltaPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Marca Deep Dive ───────────────────────────────────────────────────
function SlideMarcaDeepDive({ s }: { s: MarcaDeepDiveSlide }) {
  return (
    <SlideShell>
      <SlideTitle text={`Deep Dive — ${s.marca}`} sub={s.monthLabelStr} />
      <div className="px-3 grid grid-cols-2 gap-3 overflow-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
        {/* Seções resumidas */}
        <div>
          <div className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Resultado por seção</div>
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr style={{ background: SC.navy }} className="text-white">
                <th className="px-2 py-1 text-left">SEÇÃO</th>
                <th className="px-2 py-1 text-right">REAL</th>
                <th className="px-2 py-1 text-right">Δ% Orc</th>
              </tr>
            </thead>
            <tbody>
              {s.secoes.map((sec, i) => {
                const ds = deltaSign(sec.dOrcPct, sec.invertDelta);
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1">
                      <span className="font-bold" style={{ color: sec.color }}>
                        {sec.label.substring(0, 18)}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right">{fmtBRL(sec.real)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${dc(ds)}`}>{fmtPct(sec.dOrcPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top desvios */}
        <div>
          <div className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Top desvios vs Orçado</div>
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr style={{ background: SC.sga }} className="text-white">
                <th className="px-2 py-1 text-left">ITEM</th>
                <th className="px-2 py-1 text-right">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {s.topDesvios.slice(0, 8).map((item, i) => {
                const ds = deltaSign(item.deltaPct, item.invertDelta);
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-1 text-gray-800">{item.tag01.substring(0, 22)}</td>
                    <td className={`px-2 py-1 text-right font-bold ${dc(ds)}`}>{fmtPct(item.deltaPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Encerramento ──────────────────────────────────────────────────────
function SlideEncerramento({ s }: { s: EncerramentoSlide }) {
  return (
    <div className="w-full h-full flex flex-col relative" style={{ background: SC.navy }}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: SC.blue }} />
      <div className="flex-1 flex flex-col justify-center pl-10 pr-6">
        <div className="text-2xl font-black text-white mb-1">FIM DA APRESENTAÇÃO</div>
        <div className="h-0.5 w-12 rounded-full mb-3" style={{ background: SC.blue }} />
        <div className="text-xs italic mb-6" style={{ color: SC.blue }}>
          DRE Raiz Educação S.A. — {s.monthLabelStr}
        </div>
        <div className="text-[10px] font-bold text-white mb-2">Estrutura desta apresentação:</div>
        {[
          'ACT 1 — Abertura: Capa, Mensagem Executiva, Semáforo Portfolio',
          'ACT 2 — DRE Consolidada: Visão completa Real vs Orçado vs A-1',
          'ACT 3 — Por Seção: Receita, Custos Variáveis, Fixos, SG&A, Rateio',
          'ACT 4 — MC & EBITDA: Análise de rentabilidade e margens',
          'ACT 5 — Deep Dive por Marca (quando ativado)',
          'ACT 6 — Encerramento: Alertas, Decisões, Próximos Passos',
        ].map((line, i) => (
          <div key={i} className="text-[9px] mb-0.5" style={{ color: '#AABBCC' }}>• {line}</div>
        ))}
      </div>
      <div className="text-center text-[8px] pb-2" style={{ color: SC.gray }}>
        Gerado automaticamente — DRE Raiz Plataforma Financeira
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function RenderSlide({ slide }: { slide: PptSlideData }) {
  switch (slide.type) {
    case 'cover':               return <SlideCover s={slide} />;
    case 'mensagem_executiva':  return <SlideMensagemExecutiva s={slide} />;
    case 'portfolio_semaforo':  return <SlidePortfolioSemaforo s={slide} />;
    case 'section_divider':     return <SlideSectionDivider s={slide} />;
    case 'dre_table':           return <SlideDreTable s={slide} />;
    case 'ebitda_bridge':       return <SlideEbitdaBridge s={slide} />;
    case 'top_desvios':         return <SlideTopDesvios s={slide} />;
    case 'section_overview':    return <SlideSectionOverview s={slide} />;
    case 'tag01_detail':        return <SlideTag01Detail s={slide} />;
    case 'justificativas':      return <SlideJustificativas s={slide} />;
    case 'ebitda_consolidado':  return <SlideEbitdaConsolidado s={slide} />;
    case 'ebitda_por_marca':    return <SlideEbitdaPorMarca s={slide} />;
    case 'alertas':             return <SlideAlertas s={slide} />;
    case 'decisoes':            return <SlideDecisoes s={slide} />;
    case 'marca_deep_dive':     return <SlideMarcaDeepDive s={slide} />;
    case 'encerramento':        return <SlideEncerramento s={slide} />;
    default:
      return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Slide não suportado</div>;
  }
}

// ─── Slide label para thumbnail ───────────────────────────────────────────────
function slideLabel(s: PptSlideData): string {
  switch (s.type) {
    case 'cover':              return 'Capa';
    case 'mensagem_executiva': return 'Mensagem Exec.';
    case 'portfolio_semaforo': return 'Semáforo';
    case 'section_divider':    return s.title.substring(0, 14);
    case 'dre_table':          return 'DRE Tabela';
    case 'ebitda_bridge':      return 'EBITDA Bridge';
    case 'top_desvios':        return 'Top Desvios';
    case 'section_overview':   return s.secLabel.substring(0, 12) + ' — Visão';
    case 'tag01_detail':       return s.secLabel.substring(0, 12) + ' — Detalhe';
    case 'justificativas':     return 'Justificativas';
    case 'ebitda_consolidado': return 'MC & EBITDA';
    case 'ebitda_por_marca':   return 'EBITDA/Marca';
    case 'alertas':            return 'Alertas';
    case 'decisoes':           return 'Decisões';
    case 'marca_deep_dive':    return `Deep Dive ${s.marca}`;
    case 'encerramento':       return 'Encerramento';
    default:                   return 'Slide';
  }
}

// ─── Util não exportada ───────────────────────────────────────────────────────
function pctDiff2(real: number, compare: number): number {
  if (!compare) return 0;
  return ((real - compare) / Math.abs(compare)) * 100;
}

// ─── Viewer principal ─────────────────────────────────────────────────────────
interface PptNovoSlidesProps {
  slides: PptSlideData[];
  initialIndex?: number;
}

const PptNovoSlides: React.FC<PptNovoSlidesProps> = ({ slides, initialIndex = 0 }) => {
  const [current, setCurrent] = useState(initialIndex);
  const [fullscreen, setFullscreen] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  const total = slides.length;

  const go = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(total - 1, idx)));
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(current + 1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(current - 1);
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, go]);

  // Scroll thumbnail into view
  useEffect(() => {
    if (thumbnailRef.current) {
      const el = thumbnailRef.current.querySelector(`[data-idx="${current}"]`);
      el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [current]);

  if (total === 0) return null;

  const slide = slides[current];

  return (
    <div className={`flex flex-col bg-[#0F1C2E] ${fullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Nav bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-[#0F1C2E] flex-shrink-0">
        <button onClick={() => go(current - 1)} disabled={current === 0}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 font-mono tabular-nums">
          {current + 1} / {total}
        </span>
        <button onClick={() => go(current + 1)} disabled={current === total - 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1 text-xs text-slate-300 font-medium truncate">
          {slideLabel(slide)}
        </div>
        <button onClick={() => setFullscreen(f => !f)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        {fullscreen && (
          <button onClick={() => setFullscreen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main slide */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-4xl" style={{ aspectRatio: '16 / 9', maxHeight: '100%' }}>
          <RenderSlide slide={slide} />
        </div>
      </div>

      {/* Thumbnails strip */}
      <div ref={thumbnailRef}
        className="flex-shrink-0 h-20 border-t border-slate-800 bg-slate-900 flex items-center gap-1.5 px-3 overflow-x-auto">
        {slides.map((s, i) => (
          <button key={i} data-idx={i}
            onClick={() => go(i)}
            className={`flex-shrink-0 h-14 rounded overflow-hidden border-2 transition-all cursor-pointer ${
              i === current
                ? 'border-blue-500 shadow-lg shadow-blue-900/40 scale-105'
                : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
            }`}
            style={{ aspectRatio: '16/9', width: 88 }}
            title={slideLabel(s)}
          >
            <div className="w-full h-full" style={{ transform: 'scale(0.18)', transformOrigin: 'top left',
              width: '556%', height: '556%', pointerEvents: 'none' }}>
              <RenderSlide slide={s} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PptNovoSlides;
