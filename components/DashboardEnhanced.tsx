/**
 * Dashboard Enhanced - Versão aprimorada com blocos visuais integrados
 * Combina o Dashboard original com novos componentes de visualização
 */

import React, { useMemo, useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import {
  ChartBlock,
  TextBlock,
  TableBlock
} from '../features/visualBlocks';
import { SchoolKPIs, Transaction } from '../types';
import { BRANCHES, RECEITA_LIQUIDA_TAGS_SET } from '../constants';
import { EChartsOption } from 'echarts';
import { useBranchData } from '../hooks/useBranchData';
import { generateExecutiveSummary, ExecutiveSummaryContext, ExecutiveSummaryResponse } from '../services/anthropicService';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardEnhancedProps {
  kpis: SchoolKPIs;
  transactions: Transaction[];
  selectedMarca: string[];
  selectedFilial: string[];
  uniqueBrands: string[];
  availableBranches: string[];
  onMarcaChange: (brands: string[]) => void;
  onFilialChange: (branches: string[]) => void;
  // Props adicionais opcionais (RLS + loading)
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedCategories?: string[];
  isLoading?: boolean;
}

export const DashboardEnhanced: React.FC<DashboardEnhancedProps> = (props) => {
  const { transactions, kpis, selectedMarca, selectedFilial } = props;

  // 🔍 DEBUG: Verificar dados recebidos
  React.useEffect(() => {
    console.log('📊 DashboardEnhanced - Debug de Dados:');
    console.log('  Total transactions:', transactions.length);
    console.log('  Transactions Real:', transactions.filter(t => t.scenario === 'Real').length);
    console.log('  Transactions Orçado:', transactions.filter(t => t.scenario === 'Orçado').length);
    console.log('  KPIs:', {
      totalRevenue: kpis.totalRevenue,
      ebitda: kpis.ebitda,
      activeStudents: kpis.activeStudents,
      netMargin: kpis.netMargin
    });
    console.log('  Filtros:', {
      selectedMarca,
      selectedFilial
    });

    if (transactions.length === 0) {
      console.warn('⚠️ NENHUMA TRANSACTION CARREGADA! Verifique:');
      console.warn('  1. Se o banco de dados tem dados');
      console.warn('  2. Se os filtros de período não estão muito restritivos');
      console.warn('  3. Se há erro no console de rede (F12 → Network)');
    } else if (transactions.filter(t => t.scenario === 'Real').length === 0) {
      console.warn('⚠️ NÃO HÁ TRANSACTIONS COM SCENARIO="Real"!');
      console.warn('  Verifique se os dados no banco têm o campo scenario preenchido corretamente');
    }
  }, [transactions, kpis, selectedMarca, selectedFilial]);

  // State para capturar os filtros de mês do Dashboard filho
  const [monthRange, setMonthRange] = React.useState({ start: 0, end: 11 });

  // State para capturar o modo de comparação do Dashboard
  const [comparisonMode, setComparisonMode] = React.useState<'budget' | 'lastYear'>('budget');

  // State para controlar a aba ativa do gráfico de Desempenho por Unidade
  const [branchMetric, setBranchMetric] = React.useState<'revenue' | 'fixedCosts' | 'variableCosts' | 'sga' | 'ebitda'>('revenue');

  // State para controlar drill-down (CIA ou Filial)
  const [drillLevel, setDrillLevel] = React.useState<'cia' | 'filial'>('cia');

  // ⚡ State para Resumo Executivo com IA
  const [aiSummary, setAiSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const isGeneratingRef = React.useRef(false); // Proteção contra loop
  const lastGenerationTimeRef = React.useRef<number>(0); // Timestamp da última geração

  // Listener para evento de mudança de range de meses
  React.useEffect(() => {
    const handleMonthRangeChange = (event: any) => {
      if (event.detail) {
        console.log('📅 DashboardEnhanced: ✅ EVENTO RECEBIDO!', event.detail);
        console.log('   Atualizando monthRange de', monthRange, 'para', event.detail);
        setMonthRange({ start: event.detail.start, end: event.detail.end });
      }
    };
    window.addEventListener('monthRangeChange', handleMonthRangeChange);
    return () => window.removeEventListener('monthRangeChange', handleMonthRangeChange);
  }, []);

  // Listener para evento de mudança de modo de comparação
  React.useEffect(() => {
    const handleComparisonModeChange = (event: any) => {
      if (event.detail) {
        setComparisonMode(event.detail.mode);
      }
    };
    window.addEventListener('comparisonModeChange', handleComparisonModeChange);
    return () => window.removeEventListener('comparisonModeChange', handleComparisonModeChange);
  }, []);

  // Auto drill-down: Quando marca filtrada, mostra visão Filial automaticamente
  React.useEffect(() => {
    if (selectedMarca.length > 0) {
      setDrillLevel('filial');
    } else {
      setDrillLevel('cia');
    }
  }, [selectedMarca]);

  // 📊 Log quando branchMetric muda
  React.useEffect(() => {
    console.log('🔄 MUDANÇA DE ABA DETECTADA:', branchMetric);
    console.log('   → Nova geração será iniciada em ~500ms (se não houver outra recente)');
  }, [branchMetric]);

  // ⚡ Gerar Resumo Executivo com IA quando filtros mudarem
  useEffect(() => {
    console.log('⚙️ useEffect DISPARADO - Iniciando timeout de 500ms', {
      branchMetric,
      selectedMarca: selectedMarca.length,
      selectedFilial: selectedFilial.length,
      monthRange: `${monthRange.start}-${monthRange.end}`,
      comparisonMode
    });

    // Debounce: aguardar 500ms antes de gerar
    const timeoutId = setTimeout(() => {
      const generateSummary = async () => {
        // Proteção: não executar se não houver dados
        if (!transactions || transactions.length === 0 || !kpis) {
          console.log('⏸️ Aguardando dados para gerar resumo executivo...');
          return;
        }

        // ⚡ PROTEÇÃO ANTI-LOOP: Verificar tempo desde última geração
        const now = Date.now();
        const timeSinceLastGeneration = now - lastGenerationTimeRef.current;
        const MIN_INTERVAL = 3000; // Mínimo 3 segundos entre gerações

        if (timeSinceLastGeneration < MIN_INTERVAL) {
          console.log(`⏸️ Geração muito recente (${Math.round(timeSinceLastGeneration/1000)}s atrás). Aguardando ${Math.round((MIN_INTERVAL - timeSinceLastGeneration)/1000)}s...`);
          return;
        }

        // Proteção contra loop: se já está gerando, cancela a anterior e inicia nova
        if (isGeneratingRef.current) {
          console.log('⏸️ Já está gerando, cancelando para iniciar nova com filtros atualizados...');
        }

        console.log('🤖 Iniciando geração de Resumo Executivo com IA...');
        console.log('   📊 Métrica selecionada:', branchMetric);
        console.log('   🏢 Marcas:', selectedMarca.length > 0 ? selectedMarca.join(', ') : 'Todas');
        console.log('   📍 Filiais:', selectedFilial.length > 0 ? selectedFilial.join(', ') : 'Todas');

        isGeneratingRef.current = true;
        lastGenerationTimeRef.current = now; // Salva timestamp da geração
        setIsLoadingSummary(true);

      try {
        // Filtrar transações pelo contexto atual
        const filteredTrans = transactions.filter(t => {
          const month = parseInt(t.date.substring(5, 7), 10) - 1;
          const passMonth = month >= monthRange.start && month <= monthRange.end;
          const passMarca = selectedMarca.length === 0 || selectedMarca.includes(t.marca || '');
          const passFilial = selectedFilial.length === 0 || selectedFilial.includes(t.filial || '');
          return t.scenario === 'Real' && passMonth && passMarca && passFilial;
        });

        // Calcular valor real da métrica selecionada
        let realValue = 0;
        for (const t of filteredTrans) {
          if (branchMetric === 'revenue' && t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01)) {
            realValue += t.amount;
          } else if (branchMetric === 'fixedCosts' && (t.tag0 || '').startsWith('03.')) {
            realValue += t.amount;
          } else if (branchMetric === 'variableCosts' && (t.tag0 || '').startsWith('02.')) {
            realValue += t.amount;
          } else if (branchMetric === 'sga' && (t.tag0 || '').startsWith('04.')) {
            realValue += t.amount;
          } else if (branchMetric === 'ebitda') {
            // EBITDA = Receita - Custos
            if (t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01)) {
              realValue += t.amount;
            } else if ((t.tag0 || '').match(/^0[234]\./)) {
              realValue -= Math.abs(t.amount);
            }
          }
        }

        // Calcular valor de comparação (Orçado ou A-1)
        const compScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';
        const compTrans = transactions.filter(t => {
          const month = parseInt(t.date.substring(5, 7), 10) - 1;
          const passMonth = month >= monthRange.start && month <= monthRange.end;
          const passMarca = selectedMarca.length === 0 || selectedMarca.includes(t.marca || '');
          const passFilial = selectedFilial.length === 0 || selectedFilial.includes(t.filial || '');
          return t.scenario === compScenario && passMonth && passMarca && passFilial;
        });

        let compValue = 0;
        for (const t of compTrans) {
          if (branchMetric === 'revenue' && t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01)) {
            compValue += t.amount;
          } else if (branchMetric === 'fixedCosts' && (t.tag0 || '').startsWith('03.')) {
            compValue += t.amount;
          } else if (branchMetric === 'variableCosts' && (t.tag0 || '').startsWith('02.')) {
            compValue += t.amount;
          } else if (branchMetric === 'sga' && (t.tag0 || '').startsWith('04.')) {
            compValue += t.amount;
          } else if (branchMetric === 'ebitda') {
            if (t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01)) {
              compValue += t.amount;
            } else if ((t.tag0 || '').match(/^0[234]\./)) {
              compValue -= Math.abs(t.amount);
            }
          }
        }

        // Calcular variação percentual
        const variation = compValue !== 0 ? ((realValue - compValue) / Math.abs(compValue)) * 100 : 0;

        // Top 10 transações por valor absoluto
        const topTransactions = filteredTrans
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, 10)
          .map(t => ({
            vendor: t.vendor || 'N/A',
            ticket: t.ticket || 'N/A',
            amount: t.amount,
            description: t.description || 'Sem descrição',
            date: t.date
          }));

        const context: ExecutiveSummaryContext = {
          selectedMarca,
          selectedFilial,
          monthRange,
          metric: branchMetric,
          comparisonMode: comparisonMode === 'budget' ? 'budget' : 'lastYear',
          realValue,
          comparisonValue: compValue,
          variation,
          topTransactions,
          kpis
        };

        const summary = await generateExecutiveSummary(context);
        setAiSummary(summary);
        console.log('✅ Resumo Executivo gerado com sucesso!');
        toast.success('🤖 Análise de IA gerada com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao gerar resumo executivo:', error);
        toast.error('⚠️ Erro ao gerar análise de IA. Usando análise básica.');
        // Fallback
        setAiSummary({
          summary: '⚠️ Não foi possível gerar o resumo executivo com IA. Verifique sua conexão.',
          detailedAnalysis: 'Análise detalhada indisponível no momento.',
          keyFindings: ['Erro ao processar dados'],
          recommendations: ['Tente novamente em alguns instantes']
        });
      } finally {
        setIsLoadingSummary(false);
        isGeneratingRef.current = false; // Libera para próxima geração
      }
    };

      generateSummary();
    }, 500); // Debounce de 500ms (mais rápido para responder a mudanças de aba)

    // Cleanup: cancela timeout se componente desmontar ou deps mudarem
    return () => {
      clearTimeout(timeoutId);
      // Não resetar isGeneratingRef aqui, pois pode cancelar geração em andamento
    };
  }, [
    // ⚡ APENAS FILTROS - removido transactions e kpis para evitar loop
    // transactions e kpis são lidos dentro do useEffect mas não disparam re-geração
    selectedMarca,
    selectedFilial,
    monthRange.start,
    monthRange.end,
    branchMetric,
    comparisonMode
  ]);

  // ============================================
  // DADOS: DESEMPENHO POR UNIDADE (com Drill-Down CIA/Filial)
  // ⚡ OTIMIZAÇÃO #5: Hook compartilhado para cálculo de branchData
  // Elimina duplicação de cálculo entre Dashboard e DashboardEnhanced (-50% computação duplicada)
  const branchData = useBranchData({
    transactions,
    monthRange,
    selectedMarca,
    selectedFilial,
    drillLevel,
    comparisonMode,
    activeStudents: kpis.activeStudents
  }).sort((a, b) => b.revenue - a.revenue);

  // Gráfico de Barras por Unidade - Dinâmico baseado na métrica selecionada
  const branchChartOptions: EChartsOption = React.useMemo(() => {
    // Helper para formatar números com separador de milhares
    const formatCurrency = (value: number) => {
      const valueInK = value / 1000;
      return `R$ ${valueInK.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
    };

    const getMetricData = () => {
      switch (branchMetric) {
        case 'revenue':
          return {
            data: branchData.map(d => d.revenue),
            variations: branchData.map(d => d.revenueVariation),
            label: 'Receita',
            formatter: formatCurrency,
            tooltipFormatter: (value: number) => `Receita: R$ ${value.toLocaleString('pt-BR')}`
          };
        case 'fixedCosts':
          return {
            data: branchData.map(d => d.fixedCosts),
            variations: branchData.map(d => d.fixedCostsVariation),
            label: 'Custos Fixos',
            formatter: formatCurrency,
            tooltipFormatter: (value: number) => `Custos Fixos: R$ ${value.toLocaleString('pt-BR')}`
          };
        case 'variableCosts':
          return {
            data: branchData.map(d => d.variableCosts),
            variations: branchData.map(d => d.variableCostsVariation),
            label: 'Custos Variáveis',
            formatter: formatCurrency,
            tooltipFormatter: (value: number) => `Custos Variáveis: R$ ${value.toLocaleString('pt-BR')}`
          };
        case 'sga':
          return {
            data: branchData.map(d => d.sga),
            variations: branchData.map(d => d.sgaVariation),
            label: 'SG&A',
            formatter: formatCurrency,
            tooltipFormatter: (value: number) => `SG&A: R$ ${value.toLocaleString('pt-BR')}`
          };
        case 'ebitda':
          return {
            data: branchData.map(d => d.ebitda),
            variations: branchData.map(d => d.ebitdaVariation),
            label: 'EBITDA',
            formatter: formatCurrency,
            tooltipFormatter: (value: number) => `EBITDA: R$ ${value.toLocaleString('pt-BR')}`
          };
      }
    };

    const metricData = getMetricData();
    const compLabel = comparisonMode === 'budget' ? 'Orçado' : 'A-1';

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = params[0];
          const idx = params[0].dataIndex;
          const variation = metricData.variations[idx];
          const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`;
          const variationColor = variation >= 0 ? '#10B981' : '#EF4444';
          return `<strong>${item.name}</strong><br/>
                  ${metricData.tooltipFormatter(item.value)}<br/>
                  <span style="color: ${variationColor}; font-weight: bold;">
                    vs ${compLabel}: ${variationText}
                  </span>`;
        }
      },
      xAxis: {
        type: 'category',
        data: branchData.map(d => d.branch),
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: { fontSize: 10, fontWeight: 'bold', rotate: 20 }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: {
          fontSize: 11,
          formatter: metricData.formatter
        }
      },
      series: [
        {
          type: 'bar',
          data: branchData.map((d, idx) => ({
            value: metricData.data[idx],
            itemStyle: {
              color: d.margin >= 25 ? '#10B981' : d.margin >= 20 ? '#F59E0B' : '#EF4444'
            }
          })),
          barWidth: '60%',
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const idx = params.dataIndex;
              const value = metricData.data[idx];
              const variation = metricData.variations[idx];
              const variationText = variation >= 0 ? `↗ +${variation.toFixed(1)}%` : `↘ ${variation.toFixed(1)}%`;

              // Formatar valor principal
              let valueText = '';
              if (branchMetric === 'margin') {
                valueText = `${value.toFixed(1)}%`;
              } else {
                // Formatar com separador de milhares
                const valueInK = value / 1000;
                valueText = `R$ ${valueInK.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
              }

              // Usar rich text style diferente baseado na variação
              const variationStyle = variation >= 0 ? 'positive' : 'negative';
              return `{value|${valueText}}\n{${variationStyle}|${variationText}}`;
            },
            rich: {
              value: {
                fontSize: 11,
                fontWeight: 'bold',
                color: '#374151',
                lineHeight: 16
              },
              positive: {
                fontSize: 9,
                fontWeight: 'bold',
                color: '#10B981',
                lineHeight: 14
              },
              negative: {
                fontSize: 9,
                fontWeight: 'bold',
                color: '#EF4444',
                lineHeight: 14
              }
            }
          }
        }
      ],
      grid: { left: '3%', right: '3%', top: 60, bottom: 80 }
    };
  }, [branchData, branchMetric, comparisonMode]);

  // ============================================
  // TABELA: DETALHAMENTO POR UNIDADE
  // ============================================
  const tableColumns = [
    {
      id: 'branch',
      header: 'Unidade',
      accessor: 'branch',
      sortable: true
    },
    {
      id: 'students',
      header: 'Alunos',
      accessor: 'students',
      align: 'center' as const,
      sortable: true
    },
    {
      id: 'revenue',
      header: 'Receita',
      accessor: 'revenue',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
      id: 'fixedCosts',
      header: 'Custos Fixos',
      accessor: 'fixedCosts',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
      id: 'variableCosts',
      header: 'Custos Variáveis',
      accessor: 'variableCosts',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
      id: 'sga',
      header: 'SG&A',
      accessor: 'sga',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => `R$ ${value.toLocaleString('pt-BR')}`
    },
    {
      id: 'ebitda',
      header: 'EBITDA',
      accessor: 'ebitda',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => (
        <span className={value >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
          R$ {value.toLocaleString('pt-BR')}
        </span>
      )
    },
    {
      id: 'margin',
      header: 'Margem %',
      accessor: 'margin',
      align: 'right' as const,
      sortable: true,
      format: (value: number) => (
        <span className={value >= 25 ? 'text-emerald-600 font-bold' : value >= 20 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'}>
          {value.toFixed(1)}%
        </span>
      )
    }
  ];

  // ============================================
  // RESUMO EXECUTIVO (Gerado com IA via useEffect)
  // ============================================
  // Calcular total de receita para o footer da tabela
  const totalBranchRevenue = branchData.reduce((acc, b) => acc + b.revenue, 0);


  return (
    <div className="space-y-6">
      {/* Dashboard Original */}
      <Dashboard {...props} />

      {/* Desempenho por Unidade - Full Width */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        {/* Header com Abas */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
              Desempenho por {drillLevel === 'cia' ? 'CIA' : 'Unidade'}
              <button
                onClick={() => setDrillLevel(drillLevel === 'cia' ? 'filial' : 'cia')}
                className="px-3 py-1 bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white rounded-lg text-[10px] font-bold uppercase tracking-tight hover:shadow-lg transition-all flex items-center gap-1"
                title={drillLevel === 'cia' ? 'Expandir para Filial' : 'Voltar para CIA'}
              >
                {drillLevel === 'cia' ? '⬇ Abrir Filial' : '⬆ Voltar CIA'}
              </button>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">
                📅 {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][monthRange.start]} - {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][monthRange.end]}
              </span>
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
              {branchMetric === 'revenue' && `Receita por ${drillLevel === 'cia' ? 'CIA' : 'filial'} (cores indicam margem)`}
              {branchMetric === 'fixedCosts' && `Custos Fixos por ${drillLevel === 'cia' ? 'CIA' : 'filial'} (cores indicam margem)`}
              {branchMetric === 'variableCosts' && `Custos Variáveis por ${drillLevel === 'cia' ? 'CIA' : 'filial'} (cores indicam margem)`}
              {branchMetric === 'sga' && `SG&A por ${drillLevel === 'cia' ? 'CIA' : 'filial'} (cores indicam margem)`}
              {branchMetric === 'ebitda' && `EBITDA por ${drillLevel === 'cia' ? 'CIA' : 'filial'} (cores indicam margem)`}
            </p>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setBranchMetric('revenue')}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
              branchMetric === 'revenue'
                ? 'bg-[#1B75BB] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Receita
          </button>
          <button
            onClick={() => setBranchMetric('fixedCosts')}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
              branchMetric === 'fixedCosts'
                ? 'bg-[#EF4444] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Custos Fixos
          </button>
          <button
            onClick={() => setBranchMetric('variableCosts')}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
              branchMetric === 'variableCosts'
                ? 'bg-[#F59E0B] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Custos Variáveis
          </button>
          <button
            onClick={() => setBranchMetric('sga')}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
              branchMetric === 'sga'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            SG&A
          </button>
          <button
            onClick={() => setBranchMetric('ebitda')}
            className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
              branchMetric === 'ebitda'
                ? 'bg-[#10B981] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            EBITDA
          </button>
        </div>

        {/* Gráfico */}
        <ChartBlock
          id="branch-performance"
          type="chart"
          title=""
          subtitle=""
          chartType="bar"
          options={branchChartOptions}
          height={400}
        />
      </div>

      {/* Resumo Executivo com IA */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">🎯 Resumo Executivo</h3>
            <p className="text-sm text-gray-600 mt-1">Análise inteligente com IA - Atualiza automaticamente com seus filtros</p>
          </div>
          {!isLoadingSummary && aiSummary && (
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300 transition-colors"
            >
              {isSummaryExpanded ? (
                <>
                  <ChevronUp size={16} />
                  <span className="text-sm font-medium">Menos Detalhes</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span className="text-sm font-medium">Mais Detalhes</span>
                </>
              )}
            </button>
          )}
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
            {/* Resumo Principal */}
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{aiSummary.summary}</p>
            </div>

            {/* Descobertas Principais */}
            <div className="bg-white p-4 rounded-lg border border-emerald-100">
              <h4 className="text-md font-bold text-emerald-700 mb-3">💡 Descobertas Principais</h4>
              <ul className="space-y-2">
                {aiSummary.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span className="text-gray-700 text-sm">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Análise Detalhada (Expandível) */}
            {isSummaryExpanded && (
              <div className="space-y-4 animate-in slide-in-from-top duration-300">
                <div className="bg-white p-4 rounded-lg border border-blue-100">
                  <h4 className="text-md font-bold text-blue-700 mb-3">📊 Análise Detalhada</h4>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">
                    {aiSummary.detailedAnalysis}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-amber-100">
                  <h4 className="text-md font-bold text-amber-700 mb-3">🎯 Ações Recomendadas</h4>
                  <ol className="space-y-3">
                    {aiSummary.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-gray-700 text-sm pt-0.5">{rec}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-center">Nenhuma análise disponível</p>
          </div>
        )}
      </div>

      {/* Detalhamento por Unidade */}
      <TableBlock
        id="branch-details"
        type="table"
        title="Detalhamento por Unidade"
        subtitle="Performance completa de todas as filiais"
        columns={tableColumns}
        data={branchData}
        variant="striped"
        sortable={true}
        pagination={{ enabled: false }}
        footer={
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-gray-700">Total Consolidado:</span>
            <div className="flex gap-8">
              <span>Receita: <strong className="text-[#1B75BB]">R$ {totalBranchRevenue.toLocaleString('pt-BR')}</strong></span>
              <span>EBITDA: <strong className="text-[#7AC5BF]">R$ {kpis.ebitda.toLocaleString('pt-BR')}</strong></span>
              <span>Margem: <strong className={kpis.netMargin >= 25 ? 'text-emerald-600' : 'text-amber-600'}>{kpis.netMargin.toFixed(1)}%</strong></span>
            </div>
          </div>
        }
      />
    </div>
  );
};
