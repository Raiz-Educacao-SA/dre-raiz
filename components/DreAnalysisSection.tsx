import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Sparkles, Save, X, Pencil, Trash2, Loader2, FileText, LayoutList } from 'lucide-react';
import { DreAnalysis } from '../types';
import * as supabaseService from '../services/supabaseService';
import { generateDreNarrativeAnalysis, improveDreNarrativeAnalysis } from '../services/anthropicService';
import { SomaTagsRow } from '../services/supabaseService';

interface CurrentUser {
  email: string;
  name: string;
  role: string;
}

interface EditorState {
  mode: 'closed' | 'new' | 'edit';
  editingId: string;
  title: string;
  content: string;
  isGeneratingAI: boolean;
  isImprovingAI: boolean;
  isSaving: boolean;
  aiError: string;
}

const EDITOR_INITIAL: EditorState = {
  mode: 'closed',
  editingId: '',
  title: '',
  content: '',
  isGeneratingAI: false,
  isImprovingAI: false,
  isSaving: false,
  aiError: '',
};

const MONTH_LBL: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

const contextChips = (ctx: DreAnalysis['filter_context']): string[] => {
  const chips: string[] = [`Ano ${ctx.year}`];
  if (ctx.months.length > 0)  chips.push(ctx.months.map(m => MONTH_LBL[m] || m).join(', '));
  if (ctx.marcas.length > 0)  chips.push(`Marca: ${ctx.marcas.join(', ')}`);
  if (ctx.filiais.length > 0) chips.push(`Filial: ${ctx.filiais.join(', ')}`);
  if (ctx.tags01.length > 0)  chips.push(`Tag01: ${ctx.tags01.join(', ')}`);
  if (ctx.tags02.length > 0)  chips.push(`Tag02: ${ctx.tags02.join(', ')}`);
  if (ctx.tags03.length > 0)  chips.push(`Tag03: ${ctx.tags03.join(', ')}`);
  if (ctx.recurring)          chips.push(`Recorr: ${ctx.recurring}`);
  return chips;
};

interface DreAnalysisSectionProps {
  filterHash: string;
  filterContext: string;
  filterContextObj: DreAnalysis['filter_context'];
  somaRows: SomaTagsRow[];
  currentUser: CurrentUser;
  onRestoreFilters: (ctx: DreAnalysis['filter_context']) => void;
}

const DreAnalysisSection: React.FC<DreAnalysisSectionProps> = ({
  filterHash,
  filterContext,
  filterContextObj,
  somaRows,
  currentUser,
  onRestoreFilters,
}) => {
  const [isExpanded,  setIsExpanded]  = useState(false);
  const [analyses,    setAnalyses]    = useState<DreAnalysis[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [badgeCount,  setBadgeCount]  = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [editor,      setEditor]      = useState<EditorState>(EDITOR_INITIAL);

  // ── Painel "Ver Todas" ────────────────────────────────────────────────────
  const [isPanelOpen,    setIsPanelOpen]    = useState(false);
  const [allAnalyses,    setAllAnalyses]    = useState<DreAnalysis[]>([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelExpanded,  setPanelExpanded]  = useState<Set<string>>(new Set());

  // Filtros do painel
  const [panelSearch,  setPanelSearch]  = useState('');
  const [panelYear,    setPanelYear]    = useState('');
  const [panelMarca,   setPanelMarca]   = useState('');
  const [panelTag01,   setPanelTag01]   = useState('');

  // Opções únicas extraídas das análises carregadas
  const panelYearOptions  = [...new Set(allAnalyses.map(a => a.filter_context.year))].sort().reverse();
  const panelMarcaOptions = [...new Set(allAnalyses.flatMap(a => a.filter_context.marcas))].sort();
  const panelTag01Options = [...new Set(allAnalyses.flatMap(a => a.filter_context.tags01))].sort();

  // Análises filtradas pelo painel
  const filteredPanelAnalyses = allAnalyses.filter(a => {
    if (panelYear  && a.filter_context.year !== panelYear) return false;
    if (panelMarca && !a.filter_context.marcas.includes(panelMarca)) return false;
    if (panelTag01 && !a.filter_context.tags01.includes(panelTag01)) return false;
    if (panelSearch) {
      const q = panelSearch.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const clearPanelFilters = () => {
    setPanelSearch(''); setPanelYear(''); setPanelMarca(''); setPanelTag01('');
  };

  const hasPanelFilters = panelSearch || panelYear || panelMarca || panelTag01;

  const isAdmin = currentUser.role === 'admin';
  const canEdit = (a: DreAnalysis) => isAdmin || a.requested_by === currentUser.email;

  // ── Badge: fetch silencioso ao mudar hash ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    supabaseService.getDreAnalyses(filterHash).then(data => {
      if (!cancelled) setBadgeCount(data.length);
    });
    return () => { cancelled = true; };
  }, [filterHash]);

  // ── Carregar análises do contexto atual ──────────────────────────────────
  const loadAnalyses = useCallback(async () => {
    setIsLoading(true);
    const data = await supabaseService.getDreAnalyses(filterHash);
    setAnalyses(data);
    setBadgeCount(data.length);
    setIsLoading(false);
    setEditor(EDITOR_INITIAL);
    setDeletingId(null);
  }, [filterHash]);

  useEffect(() => {
    if (isExpanded) loadAnalyses();
  }, [isExpanded, loadAnalyses]);

  // ── Painel: carregar todas as análises ────────────────────────────────────
  const openPanel = async () => {
    setIsPanelOpen(true);
    setIsPanelLoading(true);
    clearPanelFilters();
    const data = await supabaseService.getAllDreAnalyses();
    setAllAnalyses(data);
    setIsPanelLoading(false);
  };

  const handleRestoreFilters = (ctx: DreAnalysis['filter_context']) => {
    onRestoreFilters(ctx);
    setIsPanelOpen(false);
    // Expande a seção para o usuário ver as análises do contexto restaurado
    setIsExpanded(true);
  };

  // ── IA ───────────────────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    setEditor(prev => ({ ...prev, isGeneratingAI: true, aiError: '' }));
    try {
      const text = await generateDreNarrativeAnalysis(
        somaRows.map(r => ({
          tag0: r.tag0 || '', tag01: r.tag01 || '',
          scenario: r.scenario || '', month: r.month || '', total: r.total || 0,
        })),
        filterContext
      );
      setEditor(prev => ({ ...prev, content: text, isGeneratingAI: false }));
    } catch (err: any) {
      setEditor(prev => ({ ...prev, isGeneratingAI: false, aiError: err.message || 'Erro ao gerar análise' }));
    }
  };

  const handleImproveAI = async () => {
    if (!editor.content.trim()) return;
    setEditor(prev => ({ ...prev, isImprovingAI: true, aiError: '' }));
    try {
      const text = await improveDreNarrativeAnalysis(editor.content, filterContext);
      setEditor(prev => ({ ...prev, content: text, isImprovingAI: false }));
    } catch (err: any) {
      setEditor(prev => ({ ...prev, isImprovingAI: false, aiError: err.message || 'Erro ao melhorar análise' }));
    }
  };

  // ── Salvar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editor.content.trim()) return;
    setEditor(prev => ({ ...prev, isSaving: true }));

    if (editor.mode === 'new') {
      const saved = await supabaseService.saveDreAnalysis({
        filter_hash: filterHash,
        filter_context: filterContextObj,
        title: editor.title.trim() || 'Análise sem título',
        content: editor.content.trim(),
        requested_by: currentUser.email,
        requested_by_name: currentUser.name,
      });
      if (saved) {
        setAnalyses(prev => [saved, ...prev]);
        setBadgeCount(prev => prev + 1);
        setEditor(EDITOR_INITIAL);
      } else {
        setEditor(prev => ({ ...prev, isSaving: false, aiError: 'Erro ao salvar. Tente novamente.' }));
      }
    } else if (editor.mode === 'edit') {
      const ok = await supabaseService.updateDreAnalysis(editor.editingId, {
        title: editor.title.trim() || 'Análise sem título',
        content: editor.content.trim(),
      });
      if (ok) {
        setAnalyses(prev => prev.map(a =>
          a.id === editor.editingId
            ? { ...a, title: editor.title.trim() || 'Análise sem título', content: editor.content.trim() }
            : a
        ));
        setEditor(EDITOR_INITIAL);
      } else {
        setEditor(prev => ({ ...prev, isSaving: false, aiError: 'Erro ao atualizar. Tente novamente.' }));
      }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await supabaseService.deleteDreAnalysis(id);
    if (ok) {
      setAnalyses(prev => prev.filter(a => a.id !== id));
      setBadgeCount(prev => Math.max(0, prev - 1));
      setDeletingId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePanelExpanded = (id: string) => {
    setPanelExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return iso; }
  };

  return (
    <>
      {/* ══ PAINEL "VER TODAS" — overlay ══ */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-end"
          onClick={() => setIsPanelOpen(false)}
        >
          {/* Fundo semitransparente */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Painel lateral direito */}
          <div
            className="relative z-10 w-[420px] max-w-[95vw] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <LayoutList size={14} />
                <span className="text-[13px] font-bold">Todas as Análises</span>
                {!isPanelLoading && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-black">
                    {hasPanelFilters ? `${filteredPanelAnalyses.length} / ${allAnalyses.length}` : allAnalyses.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Barra de filtros do painel */}
            {!isPanelLoading && allAnalyses.length > 0 && (
              <div className="px-3 py-2.5 border-b border-gray-100 bg-slate-50 shrink-0 space-y-2">
                {/* Busca textual */}
                <input
                  type="text"
                  placeholder="Buscar no título ou conteúdo..."
                  value={panelSearch}
                  onChange={e => setPanelSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300 placeholder-gray-300"
                />
                {/* Selects de dimensão */}
                <div className="flex gap-1.5">
                  {panelYearOptions.length > 1 && (
                    <select
                      value={panelYear}
                      onChange={e => setPanelYear(e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300 text-slate-600"
                    >
                      <option value="">Todos os anos</option>
                      {panelYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  )}
                  {panelMarcaOptions.length > 0 && (
                    <select
                      value={panelMarca}
                      onChange={e => setPanelMarca(e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300 text-slate-600"
                    >
                      <option value="">Todas as marcas</option>
                      {panelMarcaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {panelTag01Options.length > 0 && (
                    <select
                      value={panelTag01}
                      onChange={e => setPanelTag01(e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300 text-slate-600"
                    >
                      <option value="">Todas as Tag01</option>
                      {panelTag01Options.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
                {/* Botão limpar filtros */}
                {hasPanelFilters && (
                  <button
                    onClick={clearPanelFilters}
                    className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 font-bold"
                  >
                    <X size={11} /> Limpar filtros
                  </button>
                )}
              </div>
            )}

            {/* Corpo do painel */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isPanelLoading && (
                <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[13px]">Carregando...</span>
                </div>
              )}

              {!isPanelLoading && allAnalyses.length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-8">
                  Nenhuma análise registrada ainda.
                </p>
              )}

              {!isPanelLoading && hasPanelFilters && filteredPanelAnalyses.length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-8">
                  Nenhuma análise encontrada com estes filtros.
                </p>
              )}

              {!isPanelLoading && filteredPanelAnalyses.map(a => {
                const isCurrentCtx = a.filter_hash === filterHash;
                const chips = contextChips(a.filter_context);
                const isExpPnl = panelExpanded.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 ${
                      isCurrentCtx
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Chips de contexto — destaque principal */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {chips.map((c, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                            i === 0
                              ? 'bg-slate-700 text-white'          // Ano: destaque máximo
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                      {isCurrentCtx && (
                        <span className="px-2 py-0.5 bg-indigo-500 text-white text-[11px] font-bold rounded-md">
                          ✓ filtros atuais
                        </span>
                      )}
                    </div>

                    {/* Título */}
                    <p className="text-[13px] font-bold text-slate-800 leading-tight mb-1">
                      {a.title || 'Análise sem título'}
                    </p>

                    {/* Autor + data */}
                    <p className="text-[11px] text-slate-400 mb-2">
                      {a.requested_by_name || a.requested_by} · {fmtDate(a.created_at)}
                    </p>

                    {/* Preview do conteúdo */}
                    <p className={`text-[12px] text-slate-500 leading-relaxed mb-2 ${isExpPnl ? '' : 'line-clamp-2'}`}>
                      {a.content}
                    </p>
                    {a.content.length > 120 && (
                      <button
                        onClick={() => togglePanelExpanded(a.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-600 font-bold mb-2 block"
                      >
                        {isExpPnl ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}

                    {/* Botão Restaurar */}
                    {!isCurrentCtx && (
                      <button
                        onClick={() => handleRestoreFilters(a.filter_context)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                      >
                        → Restaurar filtros
                      </button>
                    )}
                    {isCurrentCtx && (
                      <span className="text-[11px] text-indigo-500 font-bold">
                        ✓ Filtros já aplicados
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ SEÇÃO COLAPSÁVEL ══ */}
      <div className="mt-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-slate-50 to-indigo-50 shadow-sm">

        {/* Header */}
        <div className="flex items-center">
          {/* Botão colapso (ocupa o restante) */}
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left hover:bg-indigo-50/60 transition-colors rounded-l-xl"
          >
            {isExpanded
              ? <ChevronDown size={15} className="text-indigo-500 shrink-0" />
              : <ChevronRight size={15} className="text-indigo-500 shrink-0" />}
            <FileText size={14} className="text-indigo-500 shrink-0" />
            <span className="text-[13px] font-bold text-slate-700">Análises do Resultado</span>

            {/* Badge — visível sempre que há análises neste contexto */}
            {badgeCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded-full animate-pulse">
                {badgeCount} aqui
              </span>
            )}

            <span className="ml-auto text-[11px] text-slate-400 pr-2">
              {isExpanded ? 'Recolher' : badgeCount > 0 ? 'Clique para ver' : 'Expandir'}
            </span>
          </button>

          {/* Botão "Ver Todas" — separado do colapso */}
          <button
            onClick={openPanel}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-indigo-100/60 transition-colors rounded-r-xl border-l border-indigo-100 shrink-0"
            title="Ver todas as análises salvas"
          >
            <LayoutList size={13} />
            Ver todas
          </button>
        </div>

        {/* Corpo colapsável */}
        <div
          style={{
            maxHeight: isExpanded ? '9999px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-in-out',
          }}
        >
          <div className="px-4 pb-4 pt-1">

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px]">Carregando análises...</span>
              </div>
            )}

            {/* Lista de análises */}
            {!isLoading && analyses.map(a => (
              <div key={a.id} className="mb-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate">
                        {a.title || 'Análise sem título'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {a.requested_by_name || a.requested_by} · {fmtDate(a.created_at)}
                      </p>
                    </div>
                    {canEdit(a) && deletingId !== a.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditor({
                            mode: 'edit', editingId: a.id, title: a.title,
                            content: a.content, isGeneratingAI: false, isSaving: false, aiError: '',
                          })}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingId(a.id)}
                          className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirmação de exclusão inline */}
                  {deletingId === a.id && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-rose-50 rounded-lg border border-rose-200">
                      <span className="text-[12px] text-rose-700 flex-1">Confirmar exclusão?</span>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700"
                      >
                        Confirmar
                      </button>
                    </div>
                  )}

                  {/* Conteúdo */}
                  {deletingId !== a.id && (
                    <div className="mt-2">
                      <p className={`text-[13px] text-slate-600 whitespace-pre-wrap leading-relaxed ${expandedIds.has(a.id) ? '' : 'line-clamp-3'}`}>
                        {a.content}
                      </p>
                      {a.content.length > 200 && (
                        <button
                          onClick={() => toggleExpanded(a.id)}
                          className="mt-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-bold"
                        >
                          {expandedIds.has(a.id) ? 'Ver menos' : 'Ver mais'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Estado vazio */}
            {!isLoading && analyses.length === 0 && editor.mode === 'closed' && (
              <p className="text-[13px] text-slate-400 py-3 text-center">
                Nenhuma análise registrada para este conjunto de filtros.
              </p>
            )}

            {/* Editor */}
            {editor.mode !== 'closed' && (
              <div className="mt-2 bg-white rounded-lg border border-indigo-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-bold text-slate-700">
                    {editor.mode === 'new' ? 'Nova Análise' : 'Editar Análise'}
                  </span>
                  <button
                    onClick={() => setEditor(EDITOR_INITIAL)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                  >
                    <X size={14} />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Título (opcional)"
                  value={editor.title}
                  onChange={e => setEditor(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full mb-2 px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 placeholder-gray-300"
                />
                <textarea
                  placeholder="Escreva a análise ou clique em 'Gerar com IA' para um rascunho automático..."
                  value={editor.content}
                  onChange={e => setEditor(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 placeholder-gray-300 resize-y"
                />

                {editor.aiError && (
                  <p className="mt-1 text-[11px] text-rose-600">{editor.aiError}</p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleGenerateAI}
                    disabled={editor.isGeneratingAI || editor.isImprovingAI || editor.isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {editor.isGeneratingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {editor.isGeneratingAI ? 'Gerando...' : 'Gerar com IA'}
                  </button>
                  <button
                    onClick={handleImproveAI}
                    disabled={!editor.content.trim() || editor.isGeneratingAI || editor.isImprovingAI || editor.isSaving}
                    title="Reescreve o texto existente com estrutura e linguagem de FP&A"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {editor.isImprovingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {editor.isImprovingAI ? 'Melhorando...' : 'Melhorar com IA'}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setEditor(EDITOR_INITIAL)}
                    disabled={editor.isSaving}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editor.content.trim() || editor.isSaving || editor.isGeneratingAI}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {editor.isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {/* Botão Nova Análise */}
            {!isLoading && editor.mode === 'closed' && (
              <button
                onClick={() => setEditor({ ...EDITOR_INITIAL, mode: 'new' })}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                <Plus size={13} />
                Nova Análise
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DreAnalysisSection;
