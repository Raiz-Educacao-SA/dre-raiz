import React, { useState, useCallback } from 'react';
import { generateNovoPpt, PptNovoParams } from '../services/pptNovoService';
import { usePermissions } from '../hooks/usePermissions';
import {
  Presentation,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Layers,
} from 'lucide-react';

const ACT_INFO = [
  { act: 1, title: 'Abertura',          baseSlides: 3,  color: 'bg-blue-600',    slides: ['Capa executiva com badges de marca', 'Mensagem Executiva (framework SCR)', 'Semáforo do Portfolio por marca'] },
  { act: 2, title: 'DRE Consolidada',   baseSlides: 4,  color: 'bg-indigo-600',  slides: ['Divisor de seção', 'DRE Completa — Real vs Orçado vs A-1', 'EBITDA Bridge (waterfall)', 'Top 15 Desvios rankeados'] },
  { act: 3, title: 'Análise por Seção', baseSlides: 15, color: 'bg-violet-600',  slides: ['Divisores de seção (×5)', 'Visão Geral com KPIs e gráfico (×5)', 'Detalhamento tag01 (×5)', '+ Justificativas das áreas (quando disponível)'] },
  { act: 4, title: 'MC & EBITDA',       baseSlides: 4,  color: 'bg-emerald-600', slides: ['Divisor de seção', 'Margem de Contribuição detalhada', 'EBITDA Consolidado + margens', 'EBITDA por Marca (barras)'] },
  { act: 5, title: 'Deep Dive por Marca', baseSlides: 0, deepDiveSlides: 20, color: 'bg-orange-500', slides: ['Divisor + slide por marca', 'DRE Sintética por marca', 'Top Desvios por marca', 'Justificativas por marca'] },
  { act: 6, title: 'Encerramento',      baseSlides: 4,  color: 'bg-slate-600',   slides: ['Divisor de seção', 'Síntese de Alertas críticos', 'Decisões e Ações', 'Slide de encerramento'] },
];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string }> =
  ({ checked, onChange, label, sublabel }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-slate-600'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </label>
  );

const PptTesteView: React.FC = () => {
  const { allowedMarcas } = usePermissions();

  const defaultMonth = (() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [yearMonth, setYearMonth]             = useState(defaultMonth);
  const [selectedMarcas, setSelectedMarcas]   = useState<string[]>([]);
  const [withJustificativas, setWithJustificativas] = useState(true);
  const [withDeepDive, setWithDeepDive]       = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [progressLog, setProgressLog]         = useState<{ msg: string; pct: number }[]>([]);
  const [done, setDone]                       = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const availableMarcas = allowedMarcas.length > 0 ? allowedMarcas : [];

  const toggleMarca = (m: string) =>
    setSelectedMarcas(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const toggleAllMarcas = () =>
    setSelectedMarcas(selectedMarcas.length === availableMarcas.length ? [] : [...availableMarcas]);

  const estimatedSlides = ACT_INFO.reduce((t, act) => {
    if (act.act === 5) return t + (withDeepDive ? (act.deepDiveSlides ?? 0) : 0);
    return t + act.baseSlides;
  }, 0) + (withJustificativas ? 5 : 0);

  const lastPct = progressLog.length > 0 ? progressLog[progressLog.length - 1].pct : 0;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgressLog([]);
    setDone(false);
    setError(null);
    try {
      await generateNovoPpt({
        yearMonth,
        marcas: selectedMarcas,
        withJustificativas,
        withDeepDive,
        onProgress: (msg, pct) => setProgressLog(prev => [...prev, { msg, pct }]),
      } as PptNovoParams);
      setDone(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erro desconhecido ao gerar PPT');
    } finally {
      setGenerating(false);
    }
  }, [yearMonth, selectedMarcas, withJustificativas, withDeepDive]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-[#0F1C2E] border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">PPT Teste — Nova Estrutura Executiva</h1>
            <p className="text-xs text-slate-400">
              Proposta de apresentação com storytelling SCR + Pirâmide McKinsey — ~{estimatedSlides} slides
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-73px)]">
        {/* Painel esquerdo */}
        <div className="w-80 flex-shrink-0 bg-[#0F1C2E] border-r border-slate-800 overflow-y-auto">
          <div className="p-5 space-y-6">

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Período</div>
              <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
                disabled={generating}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50" />
            </div>

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
                  <button onClick={toggleAllMarcas} disabled={generating}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50">
                    {selectedMarcas.length === availableMarcas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                )}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Opções</div>
              <div className="space-y-4">
                <Toggle checked={withJustificativas} onChange={setWithJustificativas}
                  label="Incluir Justificativas das Áreas"
                  sublabel="Slides com desvios justificados por responsáveis" />
                <Toggle checked={withDeepDive} onChange={setWithDeepDive}
                  label="Deep Dive por Marca"
                  sublabel="+~20 slides — DRE e desvios individuais por marca" />
              </div>
            </div>

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
                    {withJustificativas ? '✓ ativado' : '✗ desativado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deep Dive</span>
                  <span className={withDeepDive ? 'text-orange-400' : 'text-slate-500'}>
                    {withDeepDive ? '✓ ativado (+~20)' : '✗ desativado'}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                generating
                  ? 'bg-blue-800 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-900/30'
              }`}>
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando... {lastPct}%</>
                : <><Download className="w-4 h-4" /> Gerar e Baixar PPT</>}
            </button>

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

          {!generating && !done && !error && (
            <>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Estrutura do PPT — 6 ACTs narrativos
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {ACT_INFO.map(act => {
                  const isOptional = act.act === 5;
                  const isActive = !isOptional || withDeepDive;
                  return (
                    <div key={act.act} className={`rounded-xl border p-4 transition-all ${
                      isActive ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${act.color}`}>
                          ACT {act.act}
                        </div>
                        <span className="text-sm font-semibold text-white">{act.title}</span>
                        <span className="ml-auto text-xs text-slate-400 font-mono">
                          {isOptional
                            ? withDeepDive ? `~${act.deepDiveSlides} slides` : 'desativado'
                            : `${act.baseSlides} slides`}
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
                  <p>• Dados buscados diretamente do Supabase (getSomaTags + justificativas)</p>
                  <p>• PPT gerado no browser via pptxgenjs e baixado automaticamente</p>
                  <p>• Cores: verde = favorável, vermelho = desfavorável (custos: invertido)</p>
                  <p>• Framework SCR: Situação → Complicação → Resolução</p>
                </div>
              </div>
            </>
          )}

          {(generating || done || error) && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Log de geração</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-1 min-h-40 max-h-96 overflow-y-auto">
                {progressLog.map((entry, i) => (
                  <div key={i} className={`flex items-start gap-2 ${
                    entry.msg.startsWith('✅') ? 'text-green-400' :
                    entry.msg.startsWith('⚠') ? 'text-amber-400' : 'text-slate-300'}`}>
                    <span className="text-slate-600 flex-shrink-0 w-6 text-right">{entry.pct}%</span>
                    <span>{entry.msg}</span>
                  </div>
                ))}
                {generating && (
                  <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                  </div>
                )}
              </div>

              {generating && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progresso</span><span>{lastPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${lastPct}%` }} />
                  </div>
                </div>
              )}

              {done && !generating && (
                <div className="flex items-center gap-3 bg-green-950/50 border border-green-800 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-green-300">PPT gerado com sucesso!</div>
                    <div className="text-xs text-green-500 mt-0.5">Arquivo baixado automaticamente — verifique sua pasta de Downloads</div>
                  </div>
                  <button onClick={() => { setDone(false); setProgressLog([]); setError(null); }}
                    className="ml-auto text-xs text-slate-400 hover:text-white underline">
                    Gerar novamente
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 bg-red-950/50 border border-red-800 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-red-300">Erro ao gerar PPT</div>
                    <div className="text-xs text-red-400 mt-1 font-mono">{error}</div>
                  </div>
                  <button onClick={() => { setError(null); setProgressLog([]); }}
                    className="ml-auto text-xs text-slate-400 hover:text-white underline flex-shrink-0">
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PptTesteView;
