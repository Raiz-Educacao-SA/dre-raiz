import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import {
  FileText,
  ListChecks,
  Presentation,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  Flag,
  Building2,
  ChevronDown,
  Check,
  X,
  Calendar,
  ClipboardCheck
} from 'lucide-react';
import { ExecutiveSummary, ActionsList, SlideDeck, useChartRegistry, buildPpt } from '../analysisPack';
import type { AnalysisPack, AnalysisContext } from '../analysisPack/types/schema';
import { getMarcasEFiliais, getVarianceJustifications } from '../services/supabaseService';
import { buildContextFromSnapshot } from '../analysisPack/services/snapshotContextBuilder';

const VarianceJustificationsView = React.lazy(() => import('./VarianceJustificationsView'));

type TabType = 'justificativas' | 'summary' | 'actions' | 'slides';

export default function AnalysisView() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('analysisActiveTab');
    return (saved as TabType) || 'justificativas';
  });

  // Filtros
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isYtd, setIsYtd] = useState(false);

  // Opções de marca/filial (carregadas via RPC leve)
  const [allMarcas, setAllMarcas] = useState<string[]>([]);
  const [allFiliais, setAllFiliais] = useState<Array<{ marca: string; label: string }>>([]);

  // Estados separados para cada aba
  const [summaryData, setSummaryData] = useState<{ summary: any; meta: any } | null>(null);
  const [actionsData, setActionsData] = useState<any[] | null>(null);
  const [slidesData, setSlidesData] = useState<{ pack: AnalysisPack; context: AnalysisContext } | null>(null);

  // Loading states separados
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(false);

  const chartRegistry = useChartRegistry();

  // Carregar marcas/filiais via RPC leve (SELECT DISTINCT — dezenas de rows)
  useEffect(() => {
    getMarcasEFiliais().then(({ marcas, filiais }) => {
      setAllMarcas(marcas);
      setAllFiliais(filiais);
    }).catch(err => console.error('Erro ao carregar marcas/filiais:', err));
  }, []);

  // Filiais filtradas por marca selecionada
  const availableBranches = useMemo(() => {
    if (selectedMarcas.length === 0) return allFiliais.map(f => f.label);
    return allFiliais.filter(f => selectedMarcas.includes(f.marca)).map(f => f.label);
  }, [allFiliais, selectedMarcas]);

  // Salvar aba ativa
  useEffect(() => {
    localStorage.setItem('analysisActiveTab', activeTab);
  }, [activeTab]);

  // Helper: buscar snapshot do variance_justifications e montar contexto
  const fetchSnapshotContext = async () => {
    const marca = selectedMarcas.length > 0 ? selectedMarcas[0] : undefined;
    const items = await getVarianceJustifications({
      year_month: selectedMonth,
      marca,
    });
    if (!items || items.length === 0) {
      throw new Error(`Nenhum snapshot encontrado para ${selectedMonth}${marca ? ` / ${marca}` : ''}. Gere os desvios primeiro na aba Justificativas.`);
    }
    return buildContextFromSnapshot(items, { year_month: selectedMonth, marca });
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
  // Gerar Plano de Ação
  // ========================================
  const handleGenerateActions = async () => {
    setActionsLoading(true);
    try {
      const context = await fetchSnapshotContext();
      const data = await callAI(context, 'actions');
      setActionsData(data.actions);
    } catch (error: any) {
      console.error('Erro ao gerar ações:', error);
      alert(`❌ ${error.message || 'Erro ao gerar plano de ação.'}`);
    } finally {
      setActionsLoading(false);
    }
  };

  // ========================================
  // Gerar Slides Completos
  // ========================================
  const handleGenerateSlides = async () => {
    setSlidesLoading(true);
    try {
      const context = await fetchSnapshotContext();
      const data = await callAI(context, 'full');
      setSlidesData({ pack: data, context });
    } catch (error: any) {
      console.error('Erro ao gerar slides:', error);
      alert(`❌ ${error.message || 'Erro ao gerar slides.'}`);
    } finally {
      setSlidesLoading(false);
    }
  };

  // ========================================
  // Exportar PowerPoint
  // ========================================
  const handleExportPpt = async () => {
    if (!slidesData) {
      alert('⚠️ Gere os slides primeiro!');
      return;
    }

    try {
      const pngs = await chartRegistry.exportAllPngBase64();
      await buildPpt({
        pack: slidesData.pack,
        chartImages: pngs,
        fileName: `Analise-${slidesData.context.period_label}.pptx`,
      });
    } catch (error) {
      console.error('Erro ao exportar PowerPoint:', error);
      alert('❌ Erro ao exportar PowerPoint');
    }
  };

  const tabs = [
    { id: 'justificativas', label: 'Justificativas', icon: ClipboardCheck },
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

            {activeTab !== 'justificativas' && <div className="flex items-center gap-3">
              {/* Filtro de Mês */}
              <div className="flex items-center gap-2 bg-white px-4 h-[52px] rounded-lg border-2 border-gray-100 shadow-sm">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <Calendar size={14} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">MÊS</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="font-black text-[10px] uppercase tracking-tight text-gray-900 bg-transparent border-none outline-none cursor-pointer w-[120px]"
                  />
                </div>
              </div>

              {/* Toggle YTD */}
              <button
                onClick={() => setIsYtd(!isYtd)}
                className={`flex items-center gap-1.5 px-4 h-[52px] rounded-lg border-2 shadow-sm font-black text-xs uppercase transition-all ${
                  isYtd
                    ? 'border-purple-500 bg-purple-50 text-purple-700 ring-4 ring-purple-500/10'
                    : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                YTD
              </button>

              {/* Filtros */}
              <MultiSelectFilter
                label="MARCA"
                icon={<Flag size={14} />}
                options={allMarcas}
                selected={selectedMarcas}
                onChange={setSelectedMarcas}
                colorScheme="blue"
              />

              <MultiSelectFilter
                label="FILIAL"
                icon={<Building2 size={14} />}
                options={availableBranches}
                selected={selectedFiliais}
                onChange={setSelectedFiliais}
                colorScheme="orange"
              />

              {/* Clear Filters Button */}
              {(selectedMarcas.length > 0 || selectedFiliais.length > 0 || isYtd) && (
                <button
                  onClick={() => {
                    setSelectedMarcas([]);
                    setSelectedFiliais([]);
                    setIsYtd(false);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs uppercase transition-all"
                  title="Limpar todos os filtros"
                >
                  <X size={14} />
                  Limpar
                </button>
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

            {activeTab === 'actions' && (
              <button
                onClick={handleGenerateActions}
                disabled={actionsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#F44C00] text-white rounded-lg hover:bg-[#d63d00] disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all"
              >
                {actionsLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar Plano de Ação
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

                {slidesData && (
                  <button
                    onClick={handleExportPpt}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-all"
                  >
                    <FileSpreadsheet size={16} />
                    Exportar PowerPoint
                  </button>
                )}
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
              if (tab.id === 'actions') hasContent = !!actionsData;
              if (tab.id === 'slides') hasContent = !!slidesData;

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

        <div className={`max-w-7xl mx-auto p-6 ${activeTab === 'justificativas' ? 'hidden' : ''}`}>
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

          {/* ==================== ABA AÇÕES ==================== */}
          {activeTab === 'actions' && (
            <div>
              {actionsData ? (
                <div className="space-y-4">
                  <ActionsList actions={actionsData} />

                  {/* Botão para regerar */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerateActions}
                      disabled={actionsLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold text-sm"
                    >
                      <RefreshCw size={16} />
                      Regerar Plano de Ação
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<ListChecks size={48} className="text-gray-400" />}
                  title="Nenhum plano de ação gerado"
                  description="Clique no botão acima para gerar um plano de ação com IA."
                  loading={actionsLoading}
                />
              )}
            </div>
          )}

          {/* ==================== ABA SLIDES ==================== */}
          {activeTab === 'slides' && (
            <div>
              {slidesData ? (
                <div className="space-y-4">
                  <SlideDeck
                    pack={slidesData.pack}
                    ctx={slidesData.context}
                    onRegisterChart={chartRegistry.register}
                  />

                  {/* Botão para regerar */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerateSlides}
                      disabled={slidesLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-bold text-sm"
                    >
                      <RefreshCw size={16} />
                      Regerar Slides
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Presentation size={48} className="text-gray-400" />}
                  title="Nenhum slide gerado"
                  description="Clique no botão acima para gerar slides completos com IA."
                  loading={slidesLoading}
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

// ========================================
// MultiSelectFilter Component
// ========================================
interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colorScheme: 'blue' | 'orange';
}

function MultiSelectFilter({
  label,
  icon,
  options,
  selected,
  onChange,
  colorScheme
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = {
    blue: {
      border: 'border-[#1B75BB]',
      borderLight: 'border-gray-100',
      bg: 'bg-[#1B75BB]',
      bgLight: 'bg-blue-50',
      text: 'text-[#1B75BB]',
      ring: 'ring-[#1B75BB]/10'
    },
    orange: {
      border: 'border-[#F44C00]',
      borderLight: 'border-gray-100',
      bg: 'bg-[#F44C00]',
      bgLight: 'bg-orange-50',
      text: 'text-[#F44C00]',
      ring: 'ring-[#F44C00]/10'
    }
  };

  const scheme = colors[colorScheme];
  const hasSelection = selected.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => {
    onChange(options);
  };

  const clearAll = () => {
    onChange([]);
  };

  const displayText = selected.length === 0
    ? 'TODAS'
    : selected.length === 1
    ? selected[0].toUpperCase()
    : `${selected.length} SELECIONADAS`;

  return (
    <div ref={dropdownRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white px-4 h-[52px] rounded-lg border-2 shadow-sm transition-all cursor-pointer hover:shadow-md ${
          hasSelection ? `${scheme.border} ring-4 ${scheme.ring}` : scheme.borderLight
        }`}
      >
        <div className={`p-1.5 rounded-lg ${hasSelection ? `${scheme.bg} text-white` : `${scheme.bgLight} ${scheme.text}`}`}>
          {icon}
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[10px] uppercase tracking-tight text-gray-900 min-w-[120px]">
              {displayText}
            </span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border-2 border-gray-200 shadow-xl z-50 min-w-[240px] max-h-[400px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header with actions */}
          <div className="p-2 border-b border-gray-100 flex gap-2">
            <button
              onClick={selectAll}
              className="flex-1 px-2 py-1.5 text-[9px] font-black uppercase bg-gray-100 hover:bg-gray-200 rounded transition-all"
            >
              Selecionar Todas
            </button>
            <button
              onClick={clearAll}
              className="flex-1 px-2 py-1.5 text-[9px] font-black uppercase bg-gray-100 hover:bg-gray-200 rounded transition-all"
            >
              Limpar
            </button>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto flex-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? `${scheme.border} ${scheme.bg}`
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(option)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold text-gray-900">{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
