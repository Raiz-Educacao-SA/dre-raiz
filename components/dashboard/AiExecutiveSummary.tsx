import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { generateExecutiveSummary, ExecutiveSummaryContext, ExecutiveSummaryResponse } from '../../services/anthropicService';
import { Transaction, SchoolKPIs } from '../../types';
import { RECEITA_LIQUIDA_TAGS_SET } from '../../constants';

interface AiExecutiveSummaryProps {
  transactions: Transaction[];
  kpis: SchoolKPIs;
  selectedMarca: string[];
  selectedFilial: string[];
  monthRange: { start: number; end: number };
  comparisonMode: 'budget' | 'prevYear';
}

export const AiExecutiveSummary: React.FC<AiExecutiveSummaryProps> = ({
  transactions, kpis, selectedMarca, selectedFilial, monthRange, comparisonMode,
}) => {
  const [aiSummary, setAiSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('dre-raiz:cockpit:section-ai') === 'true'; } catch { return false; }
  });
  const [isStale, setIsStale] = useState(false);
  const isGeneratingRef = useRef(false);
  const lastFilterRef = useRef('');

  // Persist collapse state
  useEffect(() => {
    try { localStorage.setItem('dre-raiz:cockpit:section-ai', String(isCollapsed)); } catch {}
  }, [isCollapsed]);

  // Detect filter changes to mark summary as stale
  useEffect(() => {
    const filterKey = `${selectedMarca.join(',')}_${selectedFilial.join(',')}_${monthRange.start}_${monthRange.end}_${comparisonMode}`;
    if (lastFilterRef.current && lastFilterRef.current !== filterKey && aiSummary) {
      setIsStale(true);
    }
    lastFilterRef.current = filterKey;
  }, [selectedMarca, selectedFilial, monthRange.start, monthRange.end, comparisonMode]);

  const handleGenerate = async () => {
    if (!transactions || transactions.length === 0 || !kpis) return;
    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsLoadingSummary(true);
    setIsStale(false);

    try {
      const filteredTrans = transactions.filter(t => {
        const month = parseInt(t.date.substring(5, 7), 10) - 1;
        return t.scenario === 'Real'
          && month >= monthRange.start && month <= monthRange.end
          && (selectedMarca.length === 0 || selectedMarca.includes(t.marca || ''))
          && (selectedFilial.length === 0 || selectedFilial.includes(t.nome_filial || t.filial || ''));
      });

      let realValue = 0;
      for (const t of filteredTrans) {
        if ((t.tag0 || '').startsWith('01.')) realValue += t.amount;
      }

      const compScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';
      const compTrans = transactions.filter(t => {
        const month = parseInt(t.date.substring(5, 7), 10) - 1;
        return t.scenario === compScenario
          && month >= monthRange.start && month <= monthRange.end
          && (selectedMarca.length === 0 || selectedMarca.includes(t.marca || ''))
          && (selectedFilial.length === 0 || selectedFilial.includes(t.nome_filial || t.filial || ''));
      });

      let compValue = 0;
      for (const t of compTrans) {
        if ((t.tag0 || '').startsWith('01.')) compValue += t.amount;
      }

      const variation = compValue !== 0 ? ((realValue - compValue) / Math.abs(compValue)) * 100 : 0;
      const topTransactions = filteredTrans
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 10)
        .map(t => ({ vendor: t.vendor || 'N/A', ticket: t.ticket || 'N/A', amount: t.amount, description: t.description || 'Sem descrição', date: t.date }));

      const context: ExecutiveSummaryContext = {
        selectedMarca, selectedFilial, monthRange,
        metric: 'revenue',
        comparisonMode: comparisonMode === 'budget' ? 'budget' : 'lastYear',
        realValue, comparisonValue: compValue, variation,
        topTransactions, kpis,
      };

      const summary = await generateExecutiveSummary(context);
      setAiSummary(summary);
    } catch (error) {
      console.error('Erro ao gerar resumo executivo:', error);
      setAiSummary({
        summary: 'Não foi possível gerar o resumo executivo com IA.',
        detailedAnalysis: 'Análise detalhada indisponível no momento.',
        keyFindings: ['Erro ao processar dados'],
        recommendations: ['Tente novamente em alguns instantes'],
      });
    } finally {
      setIsLoadingSummary(false);
      isGeneratingRef.current = false;
    }
  };

  return (
    <section>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-2 mb-3 group">
        <div className="h-6 w-1.5 bg-blue-500 rounded-full"></div>
        <h2 className="text-xl font-black text-gray-900">Resumo Executivo IA</h2>
        {isCollapsed ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />}
      </button>

      {!isCollapsed && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Análise inteligente com IA</p>
              {isStale && aiSummary && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                  <AlertCircle size={10} />
                  Filtros alterados — clique para atualizar
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={isLoadingSummary}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight transition-all ${
                  isLoadingSummary
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isStale
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md animate-pulse'
                      : 'bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white hover:shadow-lg'
                }`}
              >
                {isLoadingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isLoadingSummary ? 'Analisando...' : aiSummary ? 'Atualizar Resumo' : 'Gerar Resumo'}
              </button>
              {!isLoadingSummary && aiSummary && (
                <button onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 transition-colors">
                  {isSummaryExpanded ? <><ChevronUp size={16} /><span className="text-sm font-medium">Menos</span></> : <><ChevronDown size={16} /><span className="text-sm font-medium">Mais</span></>}
                </button>
              )}
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-sm text-gray-600 font-medium">Analisando dados com IA...</p>
              </div>
            </div>
          ) : aiSummary ? (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{aiSummary.summary}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-emerald-100">
                <h4 className="text-md font-bold text-emerald-700 mb-3">Descobertas Principais</h4>
                <ul className="space-y-2">
                  {aiSummary.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span className="text-gray-700 text-sm">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {isSummaryExpanded && (
                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <h4 className="text-md font-bold text-blue-700 mb-3">Análise Detalhada</h4>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">{aiSummary.detailedAnalysis}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-amber-100">
                    <h4 className="text-md font-bold text-amber-700 mb-3">Ações Recomendadas</h4>
                    <ol className="space-y-3">
                      {aiSummary.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <span className="text-gray-700 text-sm pt-0.5">{rec}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
              <Sparkles size={32} className="text-blue-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">Resumo Executivo com IA</p>
              <p className="text-gray-400 text-sm">Clique em "Gerar Resumo" para analisar os dados com inteligência artificial</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
