import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  ListChecks,
  Presentation,
  Sparkles,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Flag,
  Building2,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { ExecutiveSummary, ActionsList, SlideDeck, useChartRegistry, buildPpt, fetchAnalysisContext } from '../analysisPack';
import AIFinancialView from './AIFinancialView';
import type { Transaction, SchoolKPIs } from '../types';
import type { AnalysisPack, AnalysisContext } from '../analysisPack/types/schema';
import { filterTransactionsByPermissions } from '../services/permissionsService';

interface AnalysisViewProps {
  transactions: Transaction[];
  kpis: SchoolKPIs;
  // ✅ RLS: Permissões do usuário
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedCategories?: string[];
}

type TabType = 'summary' | 'actions' | 'slides' | 'ai';

export default function AnalysisView({ transactions, kpis }: AnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('analysisActiveTab');
    return (saved as TabType) || 'summary';
  });

  // Filtros
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);

  // Estados separados para cada aba
  const [summaryData, setSummaryData] = useState<{ summary: any; meta: any } | null>(null);
  const [actionsData, setActionsData] = useState<any[] | null>(null);
  const [slidesData, setSlidesData] = useState<{ pack: AnalysisPack; context: AnalysisContext } | null>(null);

  // Loading states separados
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [slidesLoading, setSlidesLoading] = useState(false);

  const chartRegistry = useChartRegistry();

  // 🔒 RLS: Filtrar transações por permissões do usuário
  const permissionFilteredTransactions = useMemo(() => {
    console.log('🔒 AnalysisView: Aplicando permissões RLS nas transações...');
    const filtered = filterTransactionsByPermissions(transactions);
    console.log(`🔒 AnalysisView: ${transactions.length} → ${filtered.length} transações após RLS`);
    return filtered;
  }, [transactions]);

  // Marcas únicas
  const uniqueBrands = useMemo(() => {
    const brands = new Set(permissionFilteredTransactions.map(t => t.marca).filter(Boolean));
    return Array.from(brands).sort();
  }, [permissionFilteredTransactions]);

  // Filiais disponíveis (filtradas por marca)
  const availableBranches = useMemo(() => {
    let filtered = permissionFilteredTransactions;
    if (selectedMarcas.length > 0) {
      filtered = permissionFilteredTransactions.filter(t => selectedMarcas.includes(t.marca || ''));
    }
    const branches = new Set(filtered.map(t => t.filial).filter(Boolean));
    return Array.from(branches).sort();
  }, [permissionFilteredTransactions, selectedMarcas]);

  // Salvar aba ativa
  useEffect(() => {
    localStorage.setItem('analysisActiveTab', activeTab);
  }, [activeTab]);

  // ========================================
  // Gerar Sumário Executivo
  // ========================================
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      // Tentar API primeiro
      try {
        const context = await fetchAnalysisContext({
          scenario: 'Real',
          marca: selectedMarcas.length > 0 ? selectedMarcas[0] : undefined,
          filial: selectedFiliais.length > 0 ? selectedFiliais[0] : undefined,
        });

        const response = await fetch('/api/llm-proxy?action=generate-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, type: 'summary' }),
        });

        if (response.ok) {
          const { data } = await response.json();
          setSummaryData({
            summary: data.executive_summary,
            meta: data.meta,
          });
          return;
        }
      } catch (apiError) {
        console.warn('API não disponível, usando mock data:', apiError);
      }

      // Fallback: Usar mock data
      const { mockAnalysisPack } = await import('../analysisPack/mock/mockData');
      setSummaryData({
        summary: mockAnalysisPack.executive_summary,
        meta: mockAnalysisPack.meta,
      });
    } catch (error) {
      console.error('Erro ao gerar sumário:', error);
      alert('❌ Erro ao gerar sumário. Tente novamente.');
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
      // Tentar API primeiro
      try {
        const context = await fetchAnalysisContext({
          scenario: 'Real',
          marca: selectedMarcas.length > 0 ? selectedMarcas[0] : undefined,
          filial: selectedFiliais.length > 0 ? selectedFiliais[0] : undefined,
        });

        const response = await fetch('/api/llm-proxy?action=generate-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, type: 'actions' }),
        });

        if (response.ok) {
          const { data } = await response.json();
          setActionsData(data.actions);
          return;
        }
      } catch (apiError) {
        console.warn('API não disponível, usando mock data:', apiError);
      }

      // Fallback: Usar mock data
      const { mockAnalysisPack } = await import('../analysisPack/mock/mockData');
      setActionsData(mockAnalysisPack.actions);
    } catch (error) {
      console.error('Erro ao gerar ações:', error);
      alert('❌ Erro ao gerar plano de ação. Tente novamente.');
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
      // Tentar API primeiro
      try {
        const context = await fetchAnalysisContext({
          scenario: 'Real',
          marca: selectedMarcas.length > 0 ? selectedMarcas[0] : undefined,
          filial: selectedFiliais.length > 0 ? selectedFiliais[0] : undefined,
        });

        const response = await fetch('/api/llm-proxy?action=generate-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, type: 'full' }),
        });

        if (response.ok) {
          const { data } = await response.json();
          setSlidesData({
            pack: data,
            context: context,
          });
          return;
        }
      } catch (apiError) {
        console.warn('API não disponível, usando mock data:', apiError);
      }

      // Fallback: Usar mock data
      const { mockAnalysisPack } = await import('../analysisPack/mock/mockData');
      const { getMockContext } = await import('../analysisPack/mock/mockContext');

      setSlidesData({
        pack: mockAnalysisPack,
        context: getMockContext(),
      });
    } catch (error) {
      console.error('Erro ao gerar slides:', error);
      alert('❌ Erro ao gerar slides. Tente novamente.');
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
    { id: 'summary', label: 'Sumário Executivo', icon: FileText },
    { id: 'actions', label: 'Plano de Ação', icon: ListChecks },
    { id: 'slides', label: 'Slides de Análise', icon: Presentation },
    { id: 'ai', label: 'IA Financeira', icon: Sparkles },
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

            <div className="flex items-center gap-3">
              {/* Filtros */}
              <MultiSelectFilter
                label="MARCA"
                icon={<Flag size={14} />}
                options={uniqueBrands}
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
              {(selectedMarcas.length > 0 || selectedFiliais.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedMarcas([]);
                    setSelectedFiliais([]);
                  }}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs uppercase transition-all"
                  title="Limpar todos os filtros"
                >
                  <X size={14} />
                  Limpar
                </button>
              )}
            </div>
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
        <div className="max-w-7xl mx-auto p-6">
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

          {/* ==================== ABA IA ==================== */}
          {activeTab === 'ai' && (
            <AIFinancialView
              transactions={permissionFilteredTransactions}
              kpis={kpis}
            />
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
