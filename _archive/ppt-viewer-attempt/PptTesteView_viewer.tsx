import React, { useState, useCallback } from 'react';
import { buildPptSlideData } from '../services/pptSlideData';
import type { PptSlideData } from '../services/pptSlideData';
import PptNovoSlides from './PptNovoSlides';
import { usePermissions } from '../hooks/usePermissions';
import { Presentation, Loader2, AlertCircle, SlidersHorizontal, ChevronRight, Layers } from 'lucide-react';

// ─── Estrutura ACTs ───────────────────────────────────────────────────────────
const ACT_INFO = [
  { act: 1, title: 'Abertura',          baseSlides: 3,  color: 'bg-blue-600',    slides: ['Capa executiva', 'Mensagem SCR', 'Semáforo Portfolio'] },
  { act: 2, title: 'DRE Consolidada',   baseSlides: 4,  color: 'bg-indigo-600',  slides: ['Divisor', 'DRE Real vs Orçado vs A-1', 'EBITDA Bridge', 'Top 15 Desvios'] },
  { act: 3, title: 'Análise por Seção', baseSlides: 15, color: 'bg-violet-600',  slides: ['Divisores (×5)', 'Visão Geral + Chart (×5)', 'Detalhe tag01 (×5)', '+ Justificativas das áreas'] },
  { act: 4, title: 'MC & EBITDA',       baseSlides: 3,  color: 'bg-emerald-600', slides: ['Divisor', 'EBITDA Consolidado + margens', 'EBITDA por Marca'] },
  { act: 5, title: 'Deep Dive/Marca',   baseSlides: 0, deepDiveSlides: 20, color: 'bg-orange-500', slides: ['Divisor', 'Seções por marca', 'Top desvios por marca'] },
  { act: 6, title: 'Encerramento',      baseSlides: 4,  color: 'bg-slate-600',   slides: ['Divisor', 'Alertas críticos', 'Decisões e Ações', 'Slide final'] },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }> =
  ({ checked, onChange, label, sublabel }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-slate-600'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </label>
  );

// ─── Componente principal ─────────────────────────────────────────────────────
const PptTesteView: React.FC = () => {
  const { allowedMarcas } = usePermissions();

  const defaultMonth = (() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [yearMonth, setYearMonth] = useState(defaultMonth);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [withJustificativas, setWithJustificativas] = useState(true);
  const [withDeepDive, setWithDeepDive]       = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [progress, setProgress]               = useState<{ msg: string; pct: number }[]>([]);
  const [slides, setSlides]                   = useState<PptSlideData[] | null>(null);
  const [error, setError]                     = useState<string | null>(null);
  const [showConfig, setShowConfig]           = useState(true);

  const availableMarcas = allowedMarcas.length > 0 ? allowedMarcas : [];

  const toggleMarca = (m: string) =>
    setSelectedMarcas(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const estimatedSlides = ACT_INFO.reduce((t, act) => {
    if (act.act === 5) return t + (withDeepDive ? (act.deepDiveSlides ?? 0) : 0);
    return t + act.baseSlides;
  }, 0) + (withJustificativas ? 5 : 0);

  const lastPct = progress.length > 0 ? progress[progress.length - 1].pct : 0;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgress([]);
    setSlides(null);
    setError(null);

    try {
      const data = await buildPptSlideData({
        yearMonth,
        marcas: selectedMarcas,
        withJustificativas,
        withDeepDive,
        onProgress: (msg, pct) => setProgress(prev => [...prev, { msg, pct }]),
      });
      setSlides(data);
      setShowConfig(false);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro desconhecido');
    } finally {
      setGenerating(false);
    }
  }, [yearMonth, selectedMarcas, withJustificativas, withDeepDive]);

  // ── Modo visualização ─────────────────────────────────────────────────────
  if (slides && !showConfig) {
    return (
      <div className="h-full flex flex-col bg-[#0F1C2E]">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-[#0A1520] flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Presentation className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              DRE Raiz — {yearMonth} · {slides.length} slides
            </div>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Configurar
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Regerar
          </button>
        </div>

        {/* Viewer */}
        <div className="flex-1 min-h-0">
          <PptNovoSlides slides={slides} />
        </div>
      </div>
    );
  }

  // ── Modo configuração ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-[#0F1C2E] border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">PPT Teste — Visualizador Executivo</h1>
            <p className="text-xs text-slate-400">Apresentação interativa em tela · ~{estimatedSlides} slides estimados</p>
          </div>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-73px)]">
        {/* Painel esquerdo — Filtros */}
        <div className="w-80 flex-shrink-0 bg-[#0F1C2E] border-r border-slate-800 overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Período */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Período</div>
              <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
                disabled={generating}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50" />
            </div>

            {/* Marcas */}
            {availableMarcas.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Marcas</div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={selectedMarcas.length === 0}
                      onChange={() => setSelectedMarcas([])} disabled={generating}
                      className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500" />
                    <span className="text-sm text-slate-300 group-hover:text-white font-medium">Todas (Consolidado)</span>
                  </label>
                  {availableMarcas.map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedMarcas.includes(m)}
                        onChange={() => toggleMarca(m)} disabled={generating}
                        className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500" />
                      <span className="text-sm text-slate-300 group-hover:text-white">{m}</span>
                    </label>
                  ))}
                </div>
                {availableMarcas.length > 2 && (
                  <button onClick={() =>
                    setSelectedMarcas(selectedMarcas.length === availableMarcas.length ? [] : [...availableMarcas])}
                    disabled={generating}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50">
                    {selectedMarcas.length === availableMarcas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                )}
              </div>
            )}

            {/* Opções */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Opções</div>
              <div className="space-y-4">
                <Toggle checked={withJustificativas} onChange={setWithJustificativas}
                  label="Incluir Justificativas" sublabel="Slides com desvios justificados pelas áreas" />
                <Toggle checked={withDeepDive} onChange={setWithDeepDive}
                  label="Deep Dive por Marca" sublabel="+~20 slides — DRE e desvios individuais" />
              </div>
            </div>

            {/* Estrutura estimada */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">Estrutura estimada</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">6 ACTs narrativos</span>
                  <span className="text-slate-300 font-mono">~{estimatedSlides} slides</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Justificativas</span>
                  <span className={withJustificativas ? 'text-green-400' : 'text-slate-500'}>
                    {withJustificativas ? '✓ ativado' : '✗ off'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deep Dive</span>
                  <span className={withDeepDive ? 'text-orange-400' : 'text-slate-500'}>
                    {withDeepDive ? '✓ ativado' : '✗ off'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão */}
            <button onClick={handleGenerate} disabled={generating}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                generating
                  ? 'bg-blue-800 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-900/30'
              }`}>
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando... {lastPct}%</>
              ) : (
                <><Presentation className="w-4 h-4" /> Gerar Visualização</>
              )}
            </button>

            {/* Barra de progresso */}
            {generating && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${lastPct}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Painel direito */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6">

          {/* Estado inicial — cards dos ACTs */}
          {!generating && !error && !slides && (
            <>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Estrutura — 6 ACTs narrativos
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {ACT_INFO.map(act => {
                  const isOpt = act.act === 5;
                  const active = !isOpt || withDeepDive;
                  return (
                    <div key={act.act} className={`rounded-xl border p-4 transition-all ${
                      active ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${act.color}`}>
                          ACT {act.act}
                        </div>
                        <span className="text-sm font-semibold text-white">{act.title}</span>
                        <span className="ml-auto text-xs text-slate-400 font-mono">
                          {isOpt ? (withDeepDive ? `~${act.deepDiveSlides} slides` : 'desativado') : `${act.baseSlides} slides`}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {act.slides.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-600" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div className="bg-blue-950/40 border border-blue-900 rounded-xl p-4 text-sm text-blue-300">
                <div className="font-semibold mb-1">Como funciona</div>
                <div className="text-xs text-blue-400 space-y-1">
                  <p>• Dados buscados em tempo real do Supabase (getSomaTags + justificativas)</p>
                  <p>• Slides renderizados diretamente na tela — sem download de arquivo</p>
                  <p>• Navegação por teclado (← →) e clique nas miniaturas</p>
                  <p>• Modo tela cheia disponível no ícone ⛶ durante a visualização</p>
                </div>
              </div>
            </>
          )}

          {/* Log de progresso durante geração */}
          {generating && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Gerando slides...</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
                {progress.map((entry, i) => (
                  <div key={i} className={`flex items-start gap-2 ${
                    entry.msg.startsWith('✅') ? 'text-green-400' :
                    entry.msg.startsWith('⚠') ? 'text-amber-400' : 'text-slate-300'}`}>
                    <span className="text-slate-600 flex-shrink-0 w-6 text-right">{entry.pct}%</span>
                    <span>{entry.msg}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${lastPct}%` }} />
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-300">Erro ao gerar visualização</div>
                <div className="text-xs text-red-400 mt-1 font-mono">{error}</div>
              </div>
              <button onClick={() => { setError(null); setProgress([]); }}
                className="text-xs text-slate-400 hover:text-white underline flex-shrink-0">
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PptTesteView;
