import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  FileText,
  ListChecks,
  Presentation,
  Sparkles,
  RefreshCw,
  Flag,
  Building2,
  X,
  CalendarDays,
  ClipboardCheck,
  Loader2,
  Brain,
  History,
  Pencil,
  Trash2,
  Check,
  Clock,
  Download,
  ChevronRight,
} from 'lucide-react';
import { ExecutiveSummary } from '../analysisPack';
import { getMarcasEFiliais, getVarianceJustifications, getVarianceYtdItems, fetchLiveDreForPpt, fetchMarcaBreakdown, getVarianceAvailableMonths, saveSlideVersion, getSlideVersions, updateSlideVersion, deleteSlideVersion, SlideVersion } from '../services/supabaseService';
import { buildContextFromSnapshot } from '../analysisPack/services/snapshotContextBuilder';
import type { AnalysisContext } from '../analysisPack/types/schema';
import type { VariancePptData, SlideReloadParams } from '../services/variancePptTypes';
import MultiSelectFilter from './MultiSelectFilter';
import VariancePptPreview from './VariancePptPreview';
import SlideInsightEditor from './SlideInsightEditor';
import SlideEditHistory from './SlideEditHistory';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const VarianceJustificationsView = React.lazy(() => import('./VarianceJustificationsView'));
const AgentTeamView = React.lazy(() => import('./AgentTeamView'));
const ActionPlansConsolidatedView = React.lazy(() => import('./ActionPlansConsolidatedView'));

type TabType = 'justificativas' | 'summary' | 'actions' | 'slides' | 'agentes';

function computeFilterHash(month: string, marcas: string[]): string {
  const key = `${month}|${[...marcas].sort().join(',')}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return `slides_${Math.abs(hash).toString(36)}`;
}

export default function AnalysisView() {
  const { isAdmin, user } = useAuth();
  const { allowedMarcas, allowedFiliais, allowedTag01, hasPermissions } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('analysisActiveTab') as TabType | null;
    if (saved === 'agentes' && !isAdmin) return 'justificativas';
    return saved || 'justificativas';
  });

  // Meses disponíveis (carregados da tabela variance_justifications)
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Filtros
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isYtd, setIsYtd] = useState(false);

  // Opções de marca/filial (carregadas via RPC leve)
  const [allMarcas, setAllMarcas] = useState<string[]>([]);
  const [allFiliais, setAllFiliais] = useState<Array<{ marca: string; label: string }>>([]);

  // Estados separados para cada aba
  const [summaryData, setSummaryData] = useState<{ summary: any; meta: any } | null>(null);
  const [variancePreviewData, setVariancePreviewData] = useState<VariancePptData | null>(null);

  // Loading states separados
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [variancePptLoading, setVariancePptLoading] = useState(false);

  // Slide versioning
  const [slideVersions, setSlideVersions] = useState<SlideVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [editingInsights, setEditingInsights] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  // Carregar meses disponíveis da tabela variance_justifications
  useEffect(() => {
    getVarianceAvailableMonths().then(months => {
      setAvailableMonths(months);
      // Selecionar o mês mais recente por default (primeiro do array, já vem desc)
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0]);
      }
    }).catch(err => console.error('Erro ao carregar meses disponíveis:', err));
  }, []);

  // Carregar marcas/filiais via RPC leve (SELECT DISTINCT — dezenas de rows)
  useEffect(() => {
    getMarcasEFiliais().then(({ marcas, filiais }) => {
      setAllMarcas(marcas);
      setAllFiliais(filiais);
    }).catch(err => console.error('Erro ao carregar marcas/filiais:', err));
  }, []);

  // Marcas filtradas por permissões do usuário
  const permittedMarcas = useMemo(() => {
    if (!hasPermissions || allowedMarcas.length === 0) return allMarcas;
    return allMarcas.filter(m => allowedMarcas.includes(m));
  }, [allMarcas, allowedMarcas, hasPermissions]);

  // Filiais filtradas por permissão + marca selecionada
  const availableBranches = useMemo(() => {
    let filiais = allFiliais;
    // Filtrar por permissões
    if (hasPermissions && allowedFiliais.length > 0) {
      filiais = filiais.filter(f => allowedFiliais.includes(f.label));
    }
    if (hasPermissions && allowedMarcas.length > 0) {
      filiais = filiais.filter(f => allowedMarcas.includes(f.marca));
    }
    // Filtrar por marca selecionada
    if (selectedMarcas.length > 0) {
      filiais = filiais.filter(f => selectedMarcas.includes(f.marca));
    }
    return filiais.map(f => f.label);
  }, [allFiliais, selectedMarcas, allowedMarcas, allowedFiliais, hasPermissions]);

  // Salvar aba ativa
  useEffect(() => {
    localStorage.setItem('analysisActiveTab', activeTab);
  }, [activeTab]);

  // Marcas efetivas: seleção do usuário, ou permissões se nada selecionado
  const effectiveMarcas = useMemo(() => {
    if (selectedMarcas.length > 0) return selectedMarcas;
    if (hasPermissions && allowedMarcas.length > 0) return allowedMarcas;
    return [];
  }, [selectedMarcas, allowedMarcas, hasPermissions]);

  // Filiais efetivas: seleção do usuário, ou permissões se nada selecionado
  const effectiveFiliais = useMemo(() => {
    if (selectedFiliais.length > 0) return selectedFiliais;
    if (hasPermissions && allowedFiliais.length > 0) return allowedFiliais;
    return [];
  }, [selectedFiliais, allowedFiliais, hasPermissions]);

  // Tag01 efetivas (permissões — sem seletor manual nesta view)
  const effectiveTag01 = useMemo(() => {
    if (hasPermissions && allowedTag01.length > 0) return allowedTag01;
    return [];
  }, [allowedTag01, hasPermissions]);

  // ── Slide Versioning ──
  const currentFilterHash = useMemo(() => computeFilterHash(selectedMonth, effectiveMarcas), [selectedMonth, effectiveMarcas]);

  useEffect(() => {
    if (!selectedMonth) return;
    getSlideVersions(selectedMonth).then(versions => {
      setSlideVersions(versions);
      if (versions.length > 0 && !variancePreviewData) {
        setVariancePreviewData(versions[0].ppt_data);
        setActiveVersionId(versions[0].id);
      }
    });
  }, [selectedMonth]);

  const loadVersion = (version: SlideVersion) => {
    setVariancePreviewData(version.ppt_data);
    setActiveVersionId(version.id);
  };

  const handleRenameVersion = async (id: string, newLabel: string) => {
    const ok = await updateSlideVersion(id, { label: newLabel });
    if (ok) {
      setSlideVersions(prev => prev.map(v => v.id === id ? { ...v, label: newLabel } : v));
      toast.success('Nome atualizado');
    }
    setEditingLabel(null);
  };

  const handleDeleteVersion = async (id: string) => {
    const ok = await deleteSlideVersion(id);
    if (ok) {
      setSlideVersions(prev => prev.filter(v => v.id !== id));
      if (activeVersionId === id) {
        setActiveVersionId(null);
        setVariancePreviewData(null);
      }
      toast.success('Versão excluída');
    }
    setDeletingVersionId(null);
  };

  // Helper: filtrar items por tag01 (permissões).
  // REMOVE rows tag0-level (tag01 vazio) para forçar prepareVariancePptData a
  // recalcular os totais a partir dos filhos filtrados (evita totais consolidados
  // de todas tag01 aparecendo nos slides de CUSTOS, SG&A etc.)
  const filterByTag01 = useCallback((items: any[]) => {
    if (effectiveTag01.length === 0) return items;
    return items.filter(i =>
      i.tag01 && effectiveTag01.includes(i.tag01)
    );
  }, [effectiveTag01]);

  // ── Callback: re-fetch real data when user changes marca filter inside preview ──
  const handleReloadWithMarcas = useCallback(async (marcas: string[]): Promise<VariancePptData> => {
    if (!variancePreviewData) throw new Error('No base data');
    const effectiveMarcasForFetch = marcas.length > 0 ? marcas : undefined;
    const rzNotSelected = effectiveMarcasForFetch != null && !effectiveMarcasForFetch.map(m => m.toUpperCase()).includes('RZ');

    const [rawItems, rzRawItems] = await Promise.all([
      effectiveMarcasForFetch
        ? fetchLiveDreForPpt(selectedMonth, effectiveMarcasForFetch, null)
        : getVarianceJustifications({ year_month: selectedMonth }),
      rzNotSelected
        ? fetchLiveDreForPpt(selectedMonth, ['RZ'], null).catch(() => [] as any[])
        : Promise.resolve([] as any[]),
    ]);

    const filtered = filterByTag01(rawItems);
    const { prepareVariancePptData } = await import('../services/variancePptDataService');
    const newData = prepareVariancePptData(
      filtered,
      selectedMonth,
      marcas.length > 0 ? marcas.join(', ') : null,
      rzRawItems.length > 0 ? rzRawItems : undefined,
    );

    // Attach marca breakdowns for the new selection
    try {
      const breakdown = await fetchMarcaBreakdown(
        selectedMonth,
        permittedMarcas,
        marcas.length > 0 ? marcas : null,
        effectiveTag01.length > 0 ? effectiveTag01 : null,
      );
      if (breakdown) newData.marcaBreakdowns = breakdown;
    } catch (err) {
      console.warn('Marca breakdown skipped on reload:', err);
    }

    return newData;
  }, [selectedMonth, variancePreviewData, filterByTag01, permittedMarcas, effectiveTag01]);

  // ── Callback: re-fetch real data when user changes period inside preview ──
  const handleReloadWithPeriod = useCallback(async (month: string, isYtd: boolean, monthFrom?: string): Promise<VariancePptData> => {
    const hasMarca = effectiveMarcas.length > 0;
    const yearStart = `${month.slice(0, 4)}-01`;
    const rzNotSelected = hasMarca && !effectiveMarcas.map(m => m.toUpperCase()).includes('RZ');

    // rangeFrom: monthFrom (multi-select), then YTD yearStart, then undefined (single month)
    const rangeFrom = monthFrom ?? (isYtd ? yearStart : undefined);
    const ytdNoMarca = !hasMarca && !!rangeFrom && permittedMarcas.length > 0;

    const [rawItems, rzRawItems] = await Promise.all([
      hasMarca
        ? fetchLiveDreForPpt(month, effectiveMarcas, effectiveFiliais.length > 0 ? effectiveFiliais : null, rangeFrom)
        : ytdNoMarca
          ? fetchLiveDreForPpt(month, permittedMarcas, null, rangeFrom)
          : getVarianceJustifications({ year_month: month }),
      rzNotSelected
        ? fetchLiveDreForPpt(month, ['RZ'], null, rangeFrom).catch(() => [] as any[])
        : Promise.resolve([] as any[]),
    ]);

    const filtered = filterByTag01(rawItems);
    const { prepareVariancePptData } = await import('../services/variancePptDataService');
    const newData = prepareVariancePptData(
      filtered,
      month,
      hasMarca ? effectiveMarcas.join(', ') : null,
      rzRawItems.length > 0 ? rzRawItems : undefined,
      isYtd || !!monthFrom,
    );
    newData.monthFrom = monthFrom;

    try {
      const breakdown = await fetchMarcaBreakdown(
        month,
        permittedMarcas,
        hasMarca ? effectiveMarcas : null,
        effectiveTag01.length > 0 ? effectiveTag01 : null,
      );
      if (breakdown) newData.marcaBreakdowns = breakdown;
    } catch {}

    return newData;
  }, [effectiveMarcas, effectiveFiliais, filterByTag01, permittedMarcas, effectiveTag01]);

  // ── Callback unificado: re-fetch com todos os filtros do painel de slides ──
  const handleReloadWithFilters = useCallback(async (params: SlideReloadParams): Promise<VariancePptData> => {
    const { month, monthFrom, marcas, tag01s } = params;

    // Determinar marcas efetivas: seleção do painel > permissões > null (all)
    const fetchMarcas = marcas.length > 0 ? marcas : permittedMarcas.length > 0 ? permittedMarcas : null;

    const rzInSelection = marcas.length === 0 || marcas.map(m => m.toUpperCase()).includes('RZ');
    const rzMarcasForFetch = rzInSelection ? null : ['RZ'];

    const tag01sParam = tag01s.length > 0 ? tag01s : null;

    const [rawItems, rzRawItems] = await Promise.all([
      fetchMarcas
        ? fetchLiveDreForPpt(month, fetchMarcas, effectiveFiliais.length > 0 ? effectiveFiliais : null, monthFrom, tag01sParam)
        : fetchLiveDreForPpt(month, permittedMarcas.length > 0 ? permittedMarcas : ['_none_'], null, monthFrom, tag01sParam),
      rzMarcasForFetch
        ? fetchLiveDreForPpt(month, ['RZ'], null, monthFrom).catch(() => [] as any[])
        : Promise.resolve([] as any[]),
    ]);

    const filtered = filterByTag01(rawItems);
    const { prepareVariancePptData } = await import('../services/variancePptDataService');
    const isRange = !!monthFrom && monthFrom !== month;
    const newData = prepareVariancePptData(
      filtered,
      month,
      marcas.length > 0 ? marcas.join(', ') : null,
      rzRawItems.length > 0 ? rzRawItems : undefined,
      isRange,
    );
    newData.monthFrom = monthFrom;

    try {
      const breakdown = await fetchMarcaBreakdown(
        month,
        permittedMarcas,
        marcas.length > 0 ? marcas : null,
        effectiveTag01.length > 0 ? effectiveTag01 : null,
      );
      if (breakdown) newData.marcaBreakdowns = breakdown;
    } catch {}

    return newData;
  }, [effectiveFiliais, filterByTag01, permittedMarcas, effectiveTag01]);

  // Helper: buscar snapshot do variance_justifications e montar contexto
  const fetchSnapshotContext = async () => {
    const marca = effectiveMarcas.length > 0 ? effectiveMarcas[0] : undefined;
    const rawItems = await getVarianceJustifications({
      year_month: selectedMonth,
      marca,
    });
    const items = filterByTag01(rawItems);
    if (!items || items.length === 0) {
      throw new Error(`Nenhum snapshot encontrado para ${selectedMonth}${marca ? ` / ${marca}` : ''}. Gere os desvios primeiro na aba Justificativas.`);
    }
    return buildContextFromSnapshot(items, {
      year_month: selectedMonth,
      marca,
      filteredTag01: effectiveTag01.length > 0 ? effectiveTag01 : undefined,
    });
  };

  // Helper: chamar API de IA com contexto
  const callAI = async (context: AnalysisContext, type: string) => {
    const response = await fetch('/api/llm-proxy?action=generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, type }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `Erro ${response.status}`);
    }
    return (await response.json()).data;
  };

  // ========================================
  // Gerar Sumário Executivo
  // ========================================
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const context = await fetchSnapshotContext();
      const data = await callAI(context, 'summary');
      setSummaryData({ summary: data.executive_summary, meta: data.meta });
    } catch (error: any) {
      console.error('Erro ao gerar sumário:', error);
      alert(`❌ ${error.message || 'Erro ao gerar sumário.'}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ========================================
  // Gerar Slides (Variance preview)
  // ========================================
  const handleGenerateSlides = async () => {
    setSlidesLoading(true);
    try {
      // Step 1: Fetch data — live RPCs when marca selected, snapshot otherwise
      const hasMarca = effectiveMarcas.length > 0;
      const rzNotSelected = hasMarca && !effectiveMarcas.map(m => m.toUpperCase()).includes('RZ');
      const [rawItems, rzRawItems] = await Promise.all([
        hasMarca
          ? fetchLiveDreForPpt(selectedMonth, effectiveMarcas, effectiveFiliais.length > 0 ? effectiveFiliais : null)
          : getVarianceJustifications({ year_month: selectedMonth }),
        // Sempre buscar RZ separado para o slide de Rateio (exceto se RZ já está incluído)
        rzNotSelected
          ? fetchLiveDreForPpt(selectedMonth, ['RZ'], null).catch(() => [] as any[])
          : Promise.resolve([] as any[]),
      ]);
      // Step 1b: Apply tag01 permissions filter
      const items = filterByTag01(rawItems);
      if (!items || items.length === 0) {
        alert(hasMarca
          ? 'Nenhum dado encontrado para essa marca/periodo. Verifique se existem lancamentos.'
          : 'Nenhum dado de desvio encontrado para o periodo selecionado. Gere os desvios primeiro na aba Justificativas.');
        return;
      }

      // Step 2: Transform to PPT structure (rzRawItems alimenta o DRE-RZ no slide de Rateio)
      const { prepareVariancePptData } = await import('../services/variancePptDataService');
      const data = prepareVariancePptData(items, selectedMonth, effectiveMarcas.length > 0 ? effectiveMarcas.join(', ') : null, rzRawItems.length > 0 ? rzRawItems : undefined);

      // Step 3: Marca breakdown (parallel with AI) — ambos com fallback silencioso
      const [, breakdown] = await Promise.all([
        (async () => {
          try {
            const { enrichVarianceWithAi, injectAiInsights } = await import('../services/variancePptAiService');
            const insights = await enrichVarianceWithAi(data);
            if (insights) injectAiInsights(data, insights);
          } catch (aiErr) {
            console.warn('AI enrichment skipped:', aiErr);
          }
        })(),
        (async () => {
          try {
            if (permittedMarcas.length === 0) return null;
            return await fetchMarcaBreakdown(selectedMonth, permittedMarcas, effectiveMarcas.length > 0 ? effectiveMarcas : null, effectiveTag01.length > 0 ? effectiveTag01 : null);
          } catch (err) {
            console.warn('Marca breakdown skipped:', err);
            return null;
          }
        })(),
      ]);
      if (breakdown) data.marcaBreakdowns = breakdown;

      // Step 4: Set preview data
      setVariancePreviewData(data);

      // Step 5: Auto-save version (apenas admin)
      if (user && isAdmin) {
        try {
          const filterContext = {
            month: selectedMonth,
            marcas: effectiveMarcas,
            tag01: effectiveTag01,
          };
          const saved = await saveSlideVersion(
            currentFilterHash,
            filterContext,
            data,
            user.email,
            user.name || user.email,
          );
          if (saved) {
            setSlideVersions(prev => [saved, ...prev]);
            setActiveVersionId(saved.id);
            toast.success(`Versão ${saved.version} salva`);
          }
        } catch (saveErr) {
          console.error('Erro ao salvar versão:', saveErr);
          toast.error('Erro ao salvar versão dos slides');
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar slides:', error);
      alert(`${error.message || 'Erro ao gerar slides.'}`);
    } finally {
      setSlidesLoading(false);
    }
  };

  // ========================================
  // Exportar PPT Executivo
  // ========================================
  const handleExportPpt = async () => {
    setVariancePptLoading(true);
    try {
      let data = variancePreviewData;

      // If no preview loaded, run full pipeline
      if (!data) {
        const hasMarca = effectiveMarcas.length > 0;
        const rzNotSelected2 = hasMarca && !effectiveMarcas.map(m => m.toUpperCase()).includes('RZ');
        const [rawItems2, rzRawItems2] = await Promise.all([
          hasMarca
            ? fetchLiveDreForPpt(selectedMonth, effectiveMarcas, effectiveFiliais.length > 0 ? effectiveFiliais : null)
            : getVarianceJustifications({ year_month: selectedMonth }),
          rzNotSelected2
            ? fetchLiveDreForPpt(selectedMonth, ['RZ'], null).catch(() => [] as any[])
            : Promise.resolve([] as any[]),
        ]);
        const items = filterByTag01(rawItems2);
        if (!items || items.length === 0) {
          alert('Nenhum dado encontrado para o periodo selecionado.');
          return;
        }
        const { prepareVariancePptData } = await import('../services/variancePptDataService');
        data = prepareVariancePptData(items, selectedMonth, effectiveMarcas.length > 0 ? effectiveMarcas.join(', ') : null, rzRawItems2.length > 0 ? rzRawItems2 : undefined);

        const [, breakdown] = await Promise.all([
          (async () => {
            try {
              const { enrichVarianceWithAi, injectAiInsights } = await import('../services/variancePptAiService');
              const insights = await enrichVarianceWithAi(data!);
              if (insights) injectAiInsights(data!, insights);
            } catch (aiErr) {
              console.warn('AI enrichment skipped:', aiErr);
            }
          })(),
          (async () => {
            try {
              if (permittedMarcas.length === 0) return null;
              return await fetchMarcaBreakdown(selectedMonth, permittedMarcas, effectiveMarcas.length > 0 ? effectiveMarcas : null, effectiveTag01.length > 0 ? effectiveTag01 : null);
            } catch (err) {
              console.warn('Marca breakdown skipped:', err);
              return null;
            }
          })(),
        ]);
        if (breakdown) data.marcaBreakdowns = breakdown;
      }

      // Generate PPTX from data
      const { generateVariancePpt } = await import('../services/variancePptService');
      await generateVariancePpt(data);
    } catch (error: any) {
      console.error('Erro ao exportar PPT Executivo:', error);
      alert(`${error.message || 'Erro ao gerar apresentacao executiva.'}`);
    } finally {
      setVariancePptLoading(false);
    }
  };

  const tabs = [
    { id: 'justificativas', label: 'Corte DRE - (Justificativas)', icon: ClipboardCheck },
    ...(isAdmin ? [{ id: 'agentes', label: 'Agentes Financeiros', icon: Brain }] : []),
    { id: 'summary', label: 'Sumário Executivo', icon: FileText },
    { id: 'actions', label: 'Plano de Ação', icon: ListChecks },
    { id: 'slides', label: 'Slides de Análise', icon: Presentation },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header com Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                📊 Análise Financeira
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Sistema completo de análise e insights com IA
              </p>
            </div>

            {activeTab !== 'justificativas' && activeTab !== 'agentes' && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200 shadow-sm">
              {/* Mês */}
              <MultiSelectFilter
                label="MÊS"
                icon={<CalendarDays size={12} />}
                options={availableMonths}
                selected={selectedMonth ? [selectedMonth] : []}
                onChange={sel => setSelectedMonth(sel.length > 0 ? sel[sel.length - 1] : '')}
                colorScheme="purple"
                compact
              />

              <div className="h-5 w-px bg-blue-200 shrink-0" />

              {/* Toggle YTD */}
              <button
                onClick={() => setIsYtd(!isYtd)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 shadow-sm font-black text-[9px] uppercase transition-all ${
                  isYtd
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-4 ring-purple-500/10'
                    : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                YTD
              </button>

              <div className="h-5 w-px bg-blue-200 shrink-0" />

              {/* Marca */}
              <MultiSelectFilter
                label="MARCA"
                icon={<Flag size={12} />}
                options={permittedMarcas}
                selected={selectedMarcas}
                onChange={setSelectedMarcas}
                colorScheme="orange"
                compact
              />

              {/* Filial */}
              <MultiSelectFilter
                label="FILIAL"
                icon={<Building2 size={12} />}
                options={availableBranches}
                selected={selectedFiliais}
                onChange={setSelectedFiliais}
                colorScheme="blue"
                compact
              />

              {/* Clear Filters Button */}
              {(selectedMarcas.length > 0 || selectedFiliais.length > 0 || isYtd) && (
                <>
                  <div className="h-5 w-px bg-blue-200 shrink-0" />
                  <button
                    onClick={() => {
                      setSelectedMarcas([]);
                      setSelectedFiliais([]);
                      setIsYtd(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 rounded-lg font-black text-[9px] uppercase transition-all"
                    title="Limpar todos os filtros"
                  >
                    <X size={10} />
                    Limpar
                  </button>
                </>
              )}
            </div>}
          </div>

          <div className="flex items-center justify-end mb-4">
            {/* Action Buttons por Aba */}
            {activeTab === 'summary' && (
              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#F44C00] text-white rounded-lg hover:bg-[#d63d00] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
              >
                {summaryLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar Sumário Executivo
                  </>
                )}
              </button>
            )}

            {activeTab === 'slides' && (
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSlides}
                  disabled={slidesLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F44C00] text-white rounded-lg hover:bg-[#d63d00] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
                >
                  {slidesLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Gerar Slides
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportPpt}
                  disabled={variancePptLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
                >
                  {variancePptLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Presentation size={16} />
                  )}
                  Exportar PPT Executivo
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              // Indicador de conteúdo gerado
              let hasContent = false;
              if (tab.id === 'summary') hasContent = !!summaryData;
              if (tab.id === 'slides') hasContent = !!variancePreviewData;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-gray-50 text-[#F44C00] border-b-2 border-[#F44C00]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#F44C00]' : 'text-gray-400'} />
                  <span className="uppercase tracking-tight">{tab.label}</span>
                  {hasContent && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ==================== ABA JUSTIFICATIVAS ==================== */}
        {activeTab === 'justificativas' && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw size={32} className="text-gray-400 animate-spin" /></div>}>
            <VarianceJustificationsView />
          </Suspense>
        )}

        {/* ==================== ABA AGENTES FINANCEIROS (admin only) ==================== */}
        {activeTab === 'agentes' && isAdmin && (
          <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw size={32} className="text-gray-400 animate-spin" /></div>}>
            <AgentTeamView />
          </Suspense>
        )}

        {/* ==================== ABA PLANO DE AÇÃO ==================== */}
        {activeTab === 'actions' && (
          <div className="max-w-7xl mx-auto p-6">
            <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw size={32} className="text-gray-400 animate-spin" /></div>}>
              <ActionPlansConsolidatedView
                selectedMonth={selectedMonth}
                selectedMarcas={effectiveMarcas}
              />
            </Suspense>
          </div>
        )}

        <div className={`max-w-7xl mx-auto p-6 ${activeTab === 'justificativas' || activeTab === 'agentes' || activeTab === 'actions' ? 'hidden' : ''}`}>
          {/* ==================== ABA SUMÁRIO ==================== */}
          {activeTab === 'summary' && (
            <div>
              {summaryData ? (
                <div className="space-y-4">
                  <ExecutiveSummary
                    summary={summaryData.summary}
                    meta={summaryData.meta}
                  />

                  {/* Botão para regerar */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold text-sm"
                    >
                      <RefreshCw size={16} />
                      Regerar Sumário
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText size={48} className="text-gray-400" />}
                  title="Nenhum sumário gerado ainda"
                  description="Clique no botão acima para gerar um sumário executivo com IA."
                  loading={summaryLoading}
                />
              )}
            </div>
          )}

          {/* ==================== ABA SLIDES ==================== */}
          {activeTab === 'slides' && (
            <div className="space-y-4">
              {/* Painel de Versões Salvas */}
              {slideVersions.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={12} />
                    Versões Salvas ({slideVersions.length})
                  </h3>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {slideVersions.map(v => {
                      const isActive = v.id === activeVersionId;
                      const isDeleting = deletingVersionId === v.id;
                      const isRenaming = editingLabel === v.id;

                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? 'bg-orange-50 border-2 border-orange-200'
                              : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => loadVersion(v)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isActive && <ChevronRight size={12} className="text-orange-500 shrink-0" />}
                            <div className="min-w-0">
                              {isRenaming ? (
                                <form
                                  className="flex items-center gap-1"
                                  onSubmit={e => { e.preventDefault(); handleRenameVersion(v.id, editLabelValue); }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={editLabelValue}
                                    onChange={e => setEditLabelValue(e.target.value)}
                                    className="text-xs font-bold border border-blue-300 rounded px-2 py-0.5 w-40 focus:outline-none"
                                    autoFocus
                                  />
                                  <button type="submit" className="text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
                                  <button type="button" onClick={() => setEditingLabel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                </form>
                              ) : (
                                <p className="text-xs font-black text-gray-800 truncate">
                                  v{v.version} — {v.label || `Versão ${v.version}`}
                                </p>
                              )}
                              <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                                <Clock size={9} />
                                {new Date(v.created_at).toLocaleDateString('pt-BR')} {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                <span className="mx-1">·</span>
                                {v.created_by_name || v.created_by}
                                {v.updated_at !== v.created_at && (
                                  <span className="text-orange-500 ml-1">(editado)</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                            {isActive && (
                              <button
                                onClick={() => setShowEditHistory(true)}
                                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                title="Histórico de edições"
                              >
                                <History size={12} />
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => { setEditingLabel(v.id); setEditLabelValue(v.label || `Versão ${v.version}`); }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Renomear"
                                >
                                  <Pencil size={12} />
                                </button>
                                {isActive && (
                                  <button
                                    onClick={() => setEditingInsights(true)}
                                    className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                    title="Editar insights"
                                  >
                                    <Sparkles size={12} />
                                  </button>
                                )}
                                {isDeleting ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDeleteVersion(v.id)} className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Sim</button>
                                    <button onClick={() => setDeletingVersionId(null)} className="text-[9px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Não</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeletingVersionId(v.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir versão"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview */}
              {variancePreviewData ? (
                <div className="space-y-4">
                  <VariancePptPreview
                    data={variancePreviewData}
                    onReloadWithMarcas={handleReloadWithMarcas}
                    onReloadWithPeriod={handleReloadWithPeriod}
                    onReloadWithFilters={handleReloadWithFilters}
                    availableMonths={availableMonths}
                    restrictedMarcas={hasPermissions && allowedMarcas.length > 0 ? allowedMarcas : undefined}
                  />

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleGenerateSlides}
                      disabled={slidesLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold text-sm"
                    >
                      <RefreshCw size={16} />
                      {isAdmin ? 'Gerar Nova Versão' : 'Regerar Slides'}
                    </button>
                    {isAdmin && activeVersionId && (
                      <button
                        onClick={() => setEditingInsights(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold text-sm"
                      >
                        <Pencil size={16} />
                        Editar Insights
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Presentation size={48} className="text-gray-400" />}
                  title={slideVersions.length > 0 ? 'Selecione uma versão acima' : 'Nenhum slide gerado'}
                  description={slideVersions.length > 0 ? 'Clique em uma versão salva para carregar o preview.' : 'Clique em Gerar Slides para visualizar a apresentacao com dados de desvios e insights IA.'}
                  loading={slidesLoading}
                />
              )}

              {/* Modal: Editar Insights */}
              {editingInsights && activeVersionId && variancePreviewData && (
                <SlideInsightEditor
                  versionId={activeVersionId}
                  data={variancePreviewData}
                  onClose={() => setEditingInsights(false)}
                  onSaved={(updatedData) => {
                    setVariancePreviewData(updatedData);
                    setSlideVersions(prev => prev.map(v =>
                      v.id === activeVersionId ? { ...v, ppt_data: updatedData, updated_at: new Date().toISOString() } : v
                    ));
                    setEditingInsights(false);
                  }}
                  onShowHistory={() => { setEditingInsights(false); setShowEditHistory(true); }}
                />
              )}

              {/* Modal: Histórico de Edições */}
              {showEditHistory && activeVersionId && (
                <SlideEditHistory
                  versionId={activeVersionId}
                  versionLabel={slideVersions.find(v => v.id === activeVersionId)?.label || ''}
                  onClose={() => setShowEditHistory(false)}
                />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ========================================
// Empty State Component
// ========================================
function EmptyState({
  icon,
  title,
  description,
  loading = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw size={48} className="text-[#F44C00] animate-spin mb-4" />
        <h3 className="text-xl font-black text-gray-900 mb-2">Gerando com IA...</h3>
        <p className="text-gray-600 max-w-md">
          Aguarde enquanto processamos os dados e geramos insights automáticos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      <div className="text-sm text-gray-500">
        💡 <strong>Dica:</strong> Use o botão laranja no canto superior direito
      </div>
    </div>
  );
}

