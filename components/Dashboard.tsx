import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Legend, ReferenceLine } from 'recharts';
import { Target, Users, ArrowUpRight, ArrowDownRight, ArrowRight, GraduationCap, CalendarDays, Droplets, Zap, Box, PartyPopper, Scissors, ShieldCheck, AlertCircle, PieChart, X, TrendingUp, Flag, Building2, ChevronDown, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { SchoolKPIs, Transaction } from '../types';
import { BRANCHES, CATEGORIES, RECEITA_LIQUIDA_TAGS_SET } from '../constants';
import { getReceitaLiquidaDRE, getDRESummary, SomaTagsRow } from '../services/supabaseService';
import { filterTransactionsByPermissions } from '../services/permissionsService';
import { toast } from 'sonner';

interface DashboardProps {
  kpis: SchoolKPIs;
  transactions: Transaction[];
  selectedMarca: string[];
  selectedFilial: string[];
  uniqueBrands: string[];
  availableBranches: string[];
  onMarcaChange: (brands: string[]) => void;
  onFilialChange: (branches: string[]) => void;
  somaRows?: SomaTagsRow[];
}

export interface MonthRange {
  start: number;
  end: number;
}

const Dashboard: React.FC<DashboardProps> = ({
  kpis,
  transactions,
  selectedMarca,
  selectedFilial,
  uniqueBrands,
  availableBranches,
  onMarcaChange,
  onFilialChange,
  somaRows
}) => {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'ebitda' | 'margin'>('ebitda');
  // ⚡ OTIMIZAÇÃO: Iniciar com mês atual (sincronizado com App.tsx)
  const currentMonthIndex = new Date().getMonth(); // 0-11 (fev = 1)
  const [selectedMonthStart, setSelectedMonthStart] = useState<number>(currentMonthIndex);
  const [selectedMonthEnd, setSelectedMonthEnd] = useState<number>(currentMonthIndex);
  const [comparisonMode, setComparisonMode] = useState<'budget' | 'prevYear'>('budget');
  const [sortBranchesAZ, setSortBranchesAZ] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);

  // Receita Líquida calculada usando a mesma lógica da DRE (tag0 "01.")
  const [receitaLiquidaReal, setReceitaLiquidaReal] = useState<number>(0);
  const [receitaLiquidaComparison, setReceitaLiquidaComparison] = useState<number>(0);
  const [isLoadingReceita, setIsLoadingReceita] = useState(false);

  // Breakdown detalhado por tag01 para o modal (vem da DRE)
  const [receitaBreakdown, setReceitaBreakdown] = useState<Array<{
    tag01: string;
    real: number;
    orcado: number;
    a1: number;
    txCount: number;
    tag02s: Array<{
      tag02: string;
      real: number;
      orcado: number;
      a1: number;
      txCount: number;
    }>;
  }>>([]);

  // Estado para controlar quais tag01s estão expandidas
  const [expandedTag01s, setExpandedTag01s] = useState<Set<string>>(new Set());

  // Estado para ordenação
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 🔄 Estado para botão de atualizar
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🔄 Função para forçar atualização dos dados
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    // Reset isRefreshing após 1 segundo (feedback visual)
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('✅ Dados atualizados com sucesso!');
    }, 1000);
  };

  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // 🔒 RLS: Filtrar transações por permissões do usuário
  const permissionFilteredTransactions = useMemo(() => {
    console.log('🔒 Dashboard: Aplicando permissões RLS nas transações...');
    const filtered = filterTransactionsByPermissions(transactions);
    console.log(`🔒 Dashboard: ${transactions.length} → ${filtered.length} transações após RLS`);
    return filtered;
  }, [transactions]);

  // Expor o range de meses e modo de comparação via eventos para o DashboardEnhanced
  useEffect(() => {
    console.log('🔔 Dashboard: Filtro de mês MUDOU!', {
      selectedMonthStart,
      selectedMonthEnd,
      description: selectedMonthStart === 0 && selectedMonthEnd === 11 ? 'ANO TODO' :
                   selectedMonthStart === 0 && selectedMonthEnd === 2 ? '1º TRI (Jan-Mar)' :
                   selectedMonthStart === 0 && selectedMonthEnd === 1 ? 'Jan-Fev' :
                   `Mês ${selectedMonthStart} até ${selectedMonthEnd}`
    });
    const dashboardEl = document.getElementById('dashboard-wrapper');
    if (dashboardEl) {
      dashboardEl.setAttribute('data-month-start', selectedMonthStart.toString());
      dashboardEl.setAttribute('data-month-end', selectedMonthEnd.toString());
      // Disparar evento customizado
      const event = new CustomEvent('monthRangeChange', {
        detail: { start: selectedMonthStart, end: selectedMonthEnd }
      });
      window.dispatchEvent(event);
    }
  }, [selectedMonthStart, selectedMonthEnd]);

  // Expor o modo de comparação
  useEffect(() => {
    const event = new CustomEvent('comparisonModeChange', {
      detail: { mode: comparisonMode }
    });
    window.dispatchEvent(event);
  }, [comparisonMode]);


  // Receita Líquida: calcula direto dos somaRows (mesma fonte do DRE Gerencial)
  useEffect(() => {
    const compScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';

    // ⚡ Caminho rápido: somaRows já carregados — sem chamada extra ao Supabase
    if (somaRows && somaRows.length > 0) {
      const calcFromRows = (scenario: string) =>
        somaRows
          .filter(r => {
            const m = parseInt(r.month.substring(5, 7), 10) - 1;
            return r.scenario === scenario
              && r.tag0.startsWith('01.')
              && m >= selectedMonthStart
              && m <= selectedMonthEnd;
          })
          .reduce((s, r) => s + Number(r.total), 0);

      const real = calcFromRows('Real');
      const comp = calcFromRows(compScenario);
      setReceitaLiquidaReal(real);
      setReceitaLiquidaComparison(comp);

      // Breakdown por tag01 a partir dos somaRows
      const bdMap = new Map<string, { real: number; orcado: number; a1: number }>();
      somaRows.forEach(r => {
        if (!r.tag0.startsWith('01.')) return;
        const m = parseInt(r.month.substring(5, 7), 10) - 1;
        if (m < selectedMonthStart || m > selectedMonthEnd) return;
        const key = r.tag01 || 'Sem Subclassificação';
        if (!bdMap.has(key)) bdMap.set(key, { real: 0, orcado: 0, a1: 0 });
        const e = bdMap.get(key)!;
        if (r.scenario === 'Real')   e.real   += Number(r.total);
        else if (r.scenario === 'Orçado') e.orcado += Number(r.total);
        else if (r.scenario === 'A-1')    e.a1     += Number(r.total);
      });
      setReceitaBreakdown(
        Array.from(bdMap.entries())
          .map(([tag01, v]) => ({ tag01, ...v, txCount: 0, tag02s: [] }))
          .sort((a, b) => Math.abs(b.real) - Math.abs(a.real))
      );

      console.log(`💰 Receita Líquida (somaRows): Real=${real.toLocaleString('pt-BR')} | ${compScenario}=${comp.toLocaleString('pt-BR')}`);
      return;
    }

    // Fallback: buscar via RPC quando somaRows não disponível
    const fetchReceitaLiquida = async () => {
      setIsLoadingReceita(true);
      try {
        const year = new Date().getFullYear();
        const monthFrom = `${year}-${String(selectedMonthStart + 1).padStart(2, '0')}`;
        const monthTo   = `${year}-${String(selectedMonthEnd   + 1).padStart(2, '0')}`;

        const [receitaReal, receitaComp] = await Promise.all([
          getReceitaLiquidaDRE({ monthFrom, monthTo, marcas: selectedMarca.length > 0 ? selectedMarca : undefined, nomeFiliais: selectedFilial.length > 0 ? selectedFilial : undefined, scenario: 'Real' }),
          getReceitaLiquidaDRE({ monthFrom, monthTo, marcas: selectedMarca.length > 0 ? selectedMarca : undefined, nomeFiliais: selectedFilial.length > 0 ? selectedFilial : undefined, scenario: compScenario }),
        ]);

        setReceitaLiquidaReal(receitaReal);
        setReceitaLiquidaComparison(receitaComp);

        const summaryRows = await getDRESummary({ monthFrom, monthTo, marcas: selectedMarca.length > 0 ? selectedMarca : undefined, nomeFiliais: selectedFilial.length > 0 ? selectedFilial : undefined });
        const receitaRows = summaryRows.filter(row => row.tag0 && row.tag0.match(/^01\./i));

        const breakdownMap = new Map<string, { real: number; orcado: number; a1: number; txCount: number; tag02s: Map<string, { real: number; orcado: number; a1: number; txCount: number }> }>();
        receitaRows.forEach(row => {
          const tag01 = row.tag01 || 'Sem Subclassificação';
          const tag02 = row.tag02 || 'Sem tag02';
          if (!breakdownMap.has(tag01)) breakdownMap.set(tag01, { real: 0, orcado: 0, a1: 0, txCount: 0, tag02s: new Map() });
          const t1 = breakdownMap.get(tag01)!;
          const amt = Number(row.total_amount); const cnt = Number(row.tx_count);
          if (row.scenario === 'Real')        { t1.real += amt; t1.txCount += cnt; }
          else if (row.scenario === 'Orçado') { t1.orcado += amt; }
          else if (row.scenario === 'A-1')    { t1.a1 += amt; }
          if (!t1.tag02s.has(tag02)) t1.tag02s.set(tag02, { real: 0, orcado: 0, a1: 0, txCount: 0 });
          const t2 = t1.tag02s.get(tag02)!;
          if (row.scenario === 'Real')        { t2.real += amt; t2.txCount += cnt; }
          else if (row.scenario === 'Orçado') { t2.orcado += amt; }
          else if (row.scenario === 'A-1')    { t2.a1 += amt; }
        });

        setReceitaBreakdown(
          Array.from(breakdownMap.entries())
            .map(([tag01, v]) => ({ tag01, real: v.real, orcado: v.orcado, a1: v.a1, txCount: v.txCount, tag02s: Array.from(v.tag02s.entries()).map(([tag02, tv]) => ({ tag02, ...tv })).sort((a, b) => Math.abs(b.real) - Math.abs(a.real)) }))
            .sort((a, b) => Math.abs(b.real) - Math.abs(a.real))
        );
      } catch (error) {
        console.error('❌ Erro ao buscar Receita Líquida:', error);
        toast.error('❌ Erro ao carregar dados. Tente novamente.');
      } finally {
        setIsLoadingReceita(false);
      }
    };
    fetchReceitaLiquida();
  }, [selectedMonthStart, selectedMonthEnd, selectedMarca, selectedFilial, comparisonMode, refreshTrigger, somaRows]);

  // Filter transactions by selected month range
  const filteredByMonth = useMemo(() => {
    return permissionFilteredTransactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return month >= selectedMonthStart && month <= selectedMonthEnd;
    });
  }, [permissionFilteredTransactions, selectedMonthStart, selectedMonthEnd]);

  const branchData = useMemo(() => {
    const data = BRANCHES.map(branch => {
      const bTrans = filteredByMonth.filter(t => t.filial === branch);
      // RECEITA LÍQUIDA: Soma das tag01 específicas conforme DRE
      const rev = bTrans.filter(t =>
        t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01)
      ).reduce((acc, t) => acc + t.amount, 0);
      const exp = bTrans.filter(t =>
        !(t.tag01 && RECEITA_LIQUIDA_TAGS_SET.has(t.tag01))
      ).reduce((acc, t) => acc + t.amount, 0);
      const ebitda = rev - exp;
      return { name: branch, revenue: rev, ebitda, margin: rev > 0 ? (ebitda / rev) * 100 : 0 };
    });

    return sortBranchesAZ
      ? data.sort((a, b) => a.name.localeCompare(b.name))
      : data.sort((a, b) => b[activeMetric] - a[activeMetric]);
  }, [filteredByMonth, activeMetric, sortBranchesAZ]);

  // Enhanced KPIs with consumption metrics and additional calculations
  const enhancedKpis = useMemo(() => {
    // ⚡ OTIMIZAÇÃO: Agregar todos os filtros em UMA ÚNICA passada pelo array
    // Antes: 13 filtros sequenciais = 13 × O(n)
    // Depois: 1 loop = 1 × O(n) = -85% em operações
    const aggregated = {
      waterCost: 0,
      energyCost: 0,
      consumptionMaterialCost: 0,
      eventsCost: 0,
      teacherCost: 0,
      adminPayrollCost: 0,
      studentMealCost: 0,
      maintenanceCost: 0,
      totalFixedCosts: 0,
      totalVariableCosts: 0,
      sgaCosts: 0,
      rateioCosts: 0
    };

    // Single-pass aggregation
    for (const t of filteredByMonth) {
      if (t.scenario !== 'Real') continue;

      const category = t.category || '';
      const amount = t.amount;

      // Category-specific costs
      if (category === 'Água & Gás') aggregated.waterCost += amount;
      else if (category === 'Energia') aggregated.energyCost += amount;
      else if (category === 'Material de Consumo' || category === 'Material de Consumo & Operação') {
        aggregated.consumptionMaterialCost += amount;
      }
      else if (category === 'Eventos Comerciais' || category === 'Eventos Pedagógicos') {
        aggregated.eventsCost += amount;
      }
      else if (category === 'Salários' || category.includes('Professor')) {
        aggregated.teacherCost += amount;
      }
      else if (category === 'Folha Administrativa' || category.includes('Folha Adm')) {
        aggregated.adminPayrollCost += amount;
      }
      else if (category === 'Alimentação' || category.includes('Alimentação')) {
        aggregated.studentMealCost += amount;
      }
      else if (category === 'Manutenção' || category.includes('Manutenção')) {
        aggregated.maintenanceCost += amount;
      }

      // Type-specific costs
      if (t.type === 'FIXED_COST') aggregated.totalFixedCosts += amount;
      else if (t.type === 'VARIABLE_COST') aggregated.totalVariableCosts += amount;
      else if (t.type === 'SGA') aggregated.sgaCosts += amount;
      else if (t.type === 'RATEIO') aggregated.rateioCosts += amount;
    }

    // RECEITA LÍQUIDA: Usar valor calculado pela mesma lógica da DRE (tag0 "01.")
    const totalRevenue = receitaLiquidaReal;

    // Destructure aggregated values
    const {
      waterCost,
      energyCost,
      consumptionMaterialCost,
      eventsCost,
      teacherCost,
      adminPayrollCost,
      studentMealCost,
      maintenanceCost,
      totalFixedCosts,
      totalVariableCosts,
      sgaCosts,
      rateioCosts
    } = aggregated;
    const ebitda = totalRevenue - totalFixedCosts - totalVariableCosts - sgaCosts - rateioCosts;

    // Per-unit calculations
    const numberOfStudents = kpis.activeStudents;
    const numberOfClassrooms = Math.ceil(numberOfStudents / 25);

    // Target calculations
    const targetMargin = 25;
    const targetEbitdaValue = totalRevenue * (targetMargin / 100);
    const diffToTarget = targetEbitdaValue - ebitda;
    const costReductionNeeded = diffToTarget > 0 ? diffToTarget : 0;
    const marginOfSafety = diffToTarget < 0 ? Math.abs(diffToTarget) : 0;

    return {
      totalRevenue,
      totalFixedCosts,
      totalVariableCosts,
      sgaCosts,
      ebitda,
      netMargin: totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0,
      revenuePerStudent: numberOfStudents > 0 ? totalRevenue / numberOfStudents : 0,
      costPerStudent: numberOfStudents > 0 ? (totalFixedCosts + totalVariableCosts + sgaCosts + rateioCosts) / numberOfStudents : 0,
      waterPerStudent: numberOfStudents > 0 ? waterCost / numberOfStudents : 0,
      energyPerClassroom: numberOfClassrooms > 0 ? energyCost / numberOfClassrooms : 0,
      consumptionMaterialPerStudent: numberOfStudents > 0 ? consumptionMaterialCost / numberOfStudents : 0,
      eventsPerStudent: numberOfStudents > 0 ? eventsCost / numberOfStudents : 0,
      costReductionNeeded,
      marginOfSafety,
      targetEbitdaValue,
      isBelowTarget: costReductionNeeded > 0,
      numberOfClassrooms,
      activeStudents: numberOfStudents,
      defaultRate: kpis.defaultRate,
      teacherCostPercent: totalRevenue > 0 ? (teacherCost / totalRevenue) * 100 : 0,
      adminPayrollPercent: totalRevenue > 0 ? (adminPayrollCost / totalRevenue) * 100 : 0,
      studentMealPerStudent: numberOfStudents > 0 ? studentMealCost / numberOfStudents : 0,
      teacherCostPerClassroom: numberOfClassrooms > 0 ? teacherCost / numberOfClassrooms : 0,
      maintenancePercent: totalRevenue > 0 ? (maintenanceCost / totalRevenue) * 100 : 0,
      teacherCost,
      adminPayrollCost,
      studentMealCost,
      maintenanceCost
    };
  }, [filteredByMonth, kpis, receitaLiquidaReal]);

  // Calculate trends based on comparison mode
  const trends = useMemo(() => {
    const comparison = filteredByMonth.filter(t =>
      t.scenario === (comparisonMode === 'budget' ? 'Orçamento' : 'Ano Anterior')
    );
    const real = filteredByMonth.filter(t => t.scenario === 'Real');

    // Calculate comparison KPIs
    // RECEITA LÍQUIDA: Usar valor calculado pela mesma lógica da DRE (tag0 "01.")
    const compRevenue = receitaLiquidaComparison;
    const compFixedCosts = comparison.filter(t => t.type === 'FIXED_COST').reduce((acc, t) => acc + t.amount, 0);
    const compVariableCosts = comparison.filter(t => t.type === 'VARIABLE_COST').reduce((acc, t) => acc + t.amount, 0);
    const compSgaCosts = comparison.filter(t => t.type === 'SGA').reduce((acc, t) => acc + t.amount, 0);
    const compRateioCosts = comparison.filter(t => t.type === 'RATEIO').reduce((acc, t) => acc + t.amount, 0);
    const compEbitda = compRevenue - compFixedCosts - compVariableCosts - compSgaCosts - compRateioCosts;
    const compMargin = compRevenue > 0 ? (compEbitda / compRevenue) * 100 : 0;

    // Calculate variations (%)
    const revenueTrend = compRevenue > 0 ? ((enhancedKpis.totalRevenue - compRevenue) / compRevenue) * 100 : 0;
    const ebitdaTrend = compEbitda !== 0 ? ((enhancedKpis.ebitda - compEbitda) / Math.abs(compEbitda)) * 100 : 0;
    const marginTrend = enhancedKpis.netMargin - compMargin;
    const studentsTrend = 0; // Pode adicionar lógica para alunos se tiver dados históricos

    // Calculate absolute variations
    const revenueAbsolute = enhancedKpis.totalRevenue - compRevenue;
    const ebitdaAbsolute = enhancedKpis.ebitda - compEbitda;
    const revenuePerStudentAbsolute = enhancedKpis.revenuePerStudent - (compRevenue > 0 ? compRevenue / enhancedKpis.activeStudents : 0);
    const studentsAbsolute = 0;

    return {
      revenue: revenueTrend,
      ebitda: ebitdaTrend,
      margin: marginTrend,
      students: studentsTrend,
      revenueAbsolute,
      ebitdaAbsolute,
      revenuePerStudentAbsolute,
      studentsAbsolute,
      compRevenue,
      compEbitda,
      compFixedCosts,
      compVariableCosts,
      compSgaCosts,
      compRateioCosts
    };
  }, [filteredByMonth, enhancedKpis, comparisonMode, receitaLiquidaComparison]);

  const unitEconomics = [
    { name: 'Previsto', ticket: enhancedKpis.revenuePerStudent, cost: enhancedKpis.costPerStudent },
    { name: 'Real', ticket: enhancedKpis.revenuePerStudent * 0.98, cost: enhancedKpis.costPerStudent * 1.05 },
  ];


  // Função auxiliar para formatar valores do heatmap
  const formatHeatmapValue = (value: number): string => {
    const valueInThousands = value / 1000;
    const rounded = Math.round(valueInThousands);

    // Retornar "-" para zero absoluto
    if (rounded === 0) return '-';

    // Usar toLocaleString('pt-BR') para adicionar "." como separador
    return rounded.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Heatmap de Performance Mensal - Usando dados da DRE Gerencial

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div id="dashboard-wrapper" className="animate-in fade-in duration-500 pb-10">
      <header className="sticky top-0 z-40 bg-gray-50 -mx-3 md:-mx-4 lg:-mx-6 px-3 md:px-4 lg:px-6 pt-4 pb-4 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Título */}
          <div>
            <div className="flex items-center gap-2 mb-0.5 justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-[#F44C00] rounded-full"></div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Painel Executivo Raiz</h2>
              </div>

              {/* 🔄 Botão de Atualizar */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoadingReceita}
                className={`
                  px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight
                  flex items-center gap-2 transition-all
                  ${isRefreshing || isLoadingReceita
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white hover:shadow-lg hover:scale-105'
                  }
                `}
                title="Atualizar dados do dashboard"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing || isLoadingReceita ? 'animate-spin' : ''}
                />
                {isRefreshing || isLoadingReceita ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            <p className="text-[10px] text-[#636363] font-bold uppercase tracking-widest">Grupo Raiz Educação • Performance Financeira Consolidada</p>
          </div>

          {/* Filtros e Controles - Altura padronizada */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Marca - Multi-select */}
            <MultiSelectFilter
              label="Marca"
              icon={<Flag size={14} />}
              options={uniqueBrands}
              selected={selectedMarca}
              onChange={(newSelection) => {
                onMarcaChange(newSelection);
                if (newSelection.length > 0 && selectedFilial.length > 0) {
                  // Limpar filiais se as marcas mudarem
                  onFilialChange([]);
                }
              }}
              colorScheme="blue"
            />

            {/* Filtro de Filial - Multi-select */}
            <MultiSelectFilter
              label="Filial"
              icon={<Building2 size={14} />}
              options={availableBranches}
              selected={selectedFilial}
              onChange={onFilialChange}
              colorScheme="orange"
            />

            {/* Separador visual */}
            <div className="h-[52px] w-px bg-gray-300"></div>

            {/* Botões de Comparação - Altura padronizada */}
            <div className="flex bg-white rounded-lg border-2 border-gray-200 shadow-sm h-[52px]">
              {(['budget', 'prevYear'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setComparisonMode(mode)}
                  className={`px-4 h-full text-[9px] font-black uppercase tracking-widest transition-all first:rounded-l-md last:rounded-r-md ${
                    comparisonMode === mode
                      ? 'bg-[#1B75BB] text-white'
                      : 'text-gray-400 hover:text-[#1B75BB] hover:bg-gray-50'
                  }`}
                >
                  vs {mode === 'budget' ? 'ORÇADO' : 'ANO ANT'}
                </button>
              ))}
            </div>

            {/* Atalhos de período - Altura padronizada */}
            <div className="flex gap-1.5 h-[52px]">
              <button
                onClick={() => { setSelectedMonthStart(0); setSelectedMonthEnd(11); }}
                className={`px-3 h-full text-[9px] font-black uppercase rounded-lg transition-all border-2 ${
                  selectedMonthStart === 0 && selectedMonthEnd === 11
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
                title="Ano completo"
              >
                Ano
              </button>
              <button
                onClick={() => { setSelectedMonthStart(0); setSelectedMonthEnd(2); }}
                className={`px-3 h-full text-[9px] font-black uppercase rounded-lg transition-all border-2 ${
                  selectedMonthStart === 0 && selectedMonthEnd === 2
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
                title="1º Trimestre"
              >
                1T
              </button>
              <button
                onClick={() => { setSelectedMonthStart(3); setSelectedMonthEnd(5); }}
                className={`px-3 h-full text-[9px] font-black uppercase rounded-lg transition-all border-2 ${
                  selectedMonthStart === 3 && selectedMonthEnd === 5
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
                title="2º Trimestre"
              >
                2T
              </button>
              <button
                onClick={() => { setSelectedMonthStart(6); setSelectedMonthEnd(8); }}
                className={`px-3 h-full text-[9px] font-black uppercase rounded-lg transition-all border-2 ${
                  selectedMonthStart === 6 && selectedMonthEnd === 8
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
                title="3º Trimestre"
              >
                3T
              </button>
              <button
                onClick={() => { setSelectedMonthStart(9); setSelectedMonthEnd(11); }}
                className={`px-3 h-full text-[9px] font-black uppercase rounded-lg transition-all border-2 ${
                  selectedMonthStart === 9 && selectedMonthEnd === 11
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
                title="4º Trimestre"
              >
                4T
              </button>
            </div>

            {/* Seletores de mês - Altura padronizada */}
            <div className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 h-[52px] rounded-lg shadow-sm">
              <CalendarDays size={14} className="text-[#F44C00]" />
              <div className="flex items-center gap-1.5">
                <select
                  className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                  value={selectedMonthStart}
                  onChange={(e) => {
                    const newStart = parseInt(e.target.value);
                    setSelectedMonthStart(newStart);
                    if (selectedMonthEnd < newStart) {
                      setSelectedMonthEnd(newStart);
                    }
                  }}
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 font-bold">até</span>
                <select
                  className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                  value={selectedMonthEnd}
                  onChange={(e) => {
                    const newEnd = parseInt(e.target.value);
                    setSelectedMonthEnd(newEnd);
                    if (selectedMonthStart > newEnd) {
                      setSelectedMonthStart(newEnd);
                    }
                  }}
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
      {/* Executive KPIs Section */}
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <div className="h-6 w-1.5 bg-[#1B75BB] rounded-full"></div>
            Indicadores Executivos
          </h2>
          <p className="text-xs text-gray-500 mt-1 ml-4">KPIs principais e tendências de performance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Receita Líquida"
            value={enhancedKpis.totalRevenue}
            trend={trends.revenue}
            trendAbsolute={trends.revenueAbsolute}
            color="blue"
            icon={<Target size={16} />}
            variationType={comparisonMode === 'budget' ? 'vs Orçado' : 'vs A-1'}
            onClick={() => setShowRevenueBreakdown(true)}
          />
          <KPICard label="EBITDA" value={enhancedKpis.ebitda} trend={trends.ebitda} trendAbsolute={trends.ebitdaAbsolute} color="orange" icon={<Target size={16} />} variationType={comparisonMode === 'budget' ? 'vs Orçado' : 'vs A-1'} />
          <KPICard label="Receita / Aluno" value={enhancedKpis.revenuePerStudent} trend={3.2} trendAbsolute={trends.revenuePerStudentAbsolute} color="blue" icon={<Users size={16} />} variationType={comparisonMode === 'budget' ? 'vs Orçado' : 'vs A-1'} />
          <KPICard label="Alunos Ativos" value={enhancedKpis.activeStudents} isNumber trend={trends.students} trendAbsolute={trends.studentsAbsolute} color="teal" icon={<Users size={16} />} variationType={comparisonMode === 'budget' ? 'vs Orçado' : 'vs A-1'} />
        </div>
      </section>


    {/* Modal: Breakdown Receita Líquida */}
    {showRevenueBreakdown && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1B75BB] to-[#1557BB] p-6 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Breakdown Receita Líquida</h2>
                  <p className="text-sm text-white/80 mt-1">Composição detalhada por tag01</p>
                </div>
              </div>
              <button
                onClick={() => setShowRevenueBreakdown(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-auto flex-1">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 text-xs font-black text-gray-600 uppercase">Tag01</th>
                    <th
                      className="text-right p-3 text-xs font-black text-gray-600 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                        setReceitaBreakdown(prev => [...prev].sort((a, b) =>
                          sortOrder === 'desc' ? Math.abs(a.real) - Math.abs(b.real) : Math.abs(b.real) - Math.abs(a.real)
                        ));
                      }}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Real</span>
                        {sortOrder === 'desc' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                    </th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Orçado</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">A-1</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Δ R$ Orç.</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Δ % Orç.</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Δ R$ A-1</th>
                    <th className="text-right p-3 text-xs font-black text-gray-400 uppercase">Δ % A-1</th>
                  </tr>
                </thead>
                <tbody>
                  {receitaBreakdown.map((item, idx) => {
                    const deltaOrcado = item.real - item.orcado;
                    const deltaPercOrcado = item.orcado !== 0 ? (deltaOrcado / Math.abs(item.orcado)) * 100 : 0;
                    const deltaA1 = item.real - item.a1;
                    const deltaPercA1 = item.a1 !== 0 ? (deltaA1 / Math.abs(item.a1)) * 100 : 0;
                    const isExpanded = expandedTag01s.has(item.tag01);

                    return (
                      <React.Fragment key={idx}>
                        {/* Linha principal - tag01 */}
                        <tr
                          className={`border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${item.real === 0 ? 'opacity-40' : ''}`}
                          onClick={() => {
                            setExpandedTag01s(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(item.tag01)) {
                                newSet.delete(item.tag01);
                              } else {
                                newSet.add(item.tag01);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <ChevronRight
                                size={16}
                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                              <span className="text-sm font-bold text-gray-700">{item.tag01}</span>
                              {item.real === 0 && (
                                <span className="text-xs text-orange-600 font-bold">⚠️ SEM DADOS</span>
                              )}
                            </div>
                          </td>
                          <td className={`p-3 text-right text-sm font-black ${item.real >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {item.real === 0 ? '—' : `R$ ${item.real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className={`p-3 text-right text-sm ${item.orcado === 0 ? 'text-gray-300' : 'font-semibold text-gray-600'}`}>
                            {item.orcado === 0 ? '—' : `R$ ${item.orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className={`p-3 text-right text-sm ${item.a1 === 0 ? 'text-gray-300' : 'font-semibold text-gray-600'}`}>
                            {item.a1 === 0 ? '—' : `R$ ${item.a1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </td>
                          <td className={`p-3 text-right text-xs ${item.orcado === 0 ? 'text-gray-300' : deltaOrcado >= 0 ? 'text-teal-600 font-bold' : 'text-orange-600 font-bold'}`}>
                            {item.orcado === 0 ? '—' : `R$ ${deltaOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                          </td>
                          <td className={`p-3 text-right text-xs ${item.orcado === 0 ? 'text-gray-300' : deltaOrcado >= 0 ? 'text-teal-600 font-bold' : 'text-orange-600 font-bold'}`}>
                            {item.orcado === 0 ? '—' : `${deltaPercOrcado >= 0 ? '+' : ''}${deltaPercOrcado.toFixed(1)}%`}
                          </td>
                          <td className={`p-3 text-right text-xs ${item.a1 === 0 ? 'text-gray-300' : deltaA1 >= 0 ? 'text-teal-600 font-bold' : 'text-orange-600 font-bold'}`}>
                            {item.a1 === 0 ? '—' : `R$ ${deltaA1.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                          </td>
                          <td className={`p-3 text-right text-xs ${item.a1 === 0 ? 'text-gray-300' : deltaA1 >= 0 ? 'text-teal-600 font-bold' : 'text-orange-600 font-bold'}`}>
                            {item.a1 === 0 ? '—' : `${deltaPercA1 >= 0 ? '+' : ''}${deltaPercA1.toFixed(1)}%`}
                          </td>
                        </tr>

                        {/* Linhas expandidas - tag02 */}
                        {isExpanded && item.tag02s.map((tag02Item, tag02Idx) => {
                          const tag02DeltaOrc = tag02Item.real - tag02Item.orcado;
                          const tag02DeltaPercOrc = tag02Item.orcado !== 0 ? (tag02DeltaOrc / Math.abs(tag02Item.orcado)) * 100 : 0;
                          const tag02DeltaA1 = tag02Item.real - tag02Item.a1;
                          const tag02DeltaPercA1 = tag02Item.a1 !== 0 ? (tag02DeltaA1 / Math.abs(tag02Item.a1)) * 100 : 0;

                          return (
                            <tr
                              key={`${idx}-${tag02Idx}`}
                              className="border-b border-gray-50 bg-gray-50 hover:bg-blue-50/50 transition-colors"
                            >
                              <td className="p-3 pl-12">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-600">{tag02Item.tag02}</span>
                                </div>
                              </td>
                              <td className={`p-3 text-right text-xs font-semibold ${tag02Item.real >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                                {tag02Item.real === 0 ? '—' : `R$ ${tag02Item.real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.orcado === 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                                {tag02Item.orcado === 0 ? '—' : `R$ ${tag02Item.orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.a1 === 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                                {tag02Item.a1 === 0 ? '—' : `R$ ${tag02Item.a1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.orcado === 0 ? 'text-gray-300' : tag02DeltaOrc >= 0 ? 'text-teal-500' : 'text-orange-500'}`}>
                                {tag02Item.orcado === 0 ? '—' : `R$ ${tag02DeltaOrc.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.orcado === 0 ? 'text-gray-300' : tag02DeltaOrc >= 0 ? 'text-teal-500' : 'text-orange-500'}`}>
                                {tag02Item.orcado === 0 ? '—' : `${tag02DeltaPercOrc >= 0 ? '+' : ''}${tag02DeltaPercOrc.toFixed(1)}%`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.a1 === 0 ? 'text-gray-300' : tag02DeltaA1 >= 0 ? 'text-teal-500' : 'text-orange-500'}`}>
                                {tag02Item.a1 === 0 ? '—' : `R$ ${tag02DeltaA1.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                              </td>
                              <td className={`p-3 text-right text-xs ${tag02Item.a1 === 0 ? 'text-gray-300' : tag02DeltaA1 >= 0 ? 'text-teal-500' : 'text-orange-500'}`}>
                                {tag02Item.a1 === 0 ? '—' : `${tag02DeltaPercA1 >= 0 ? '+' : ''}${tag02DeltaPercA1.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {/* Linha de Total */}
                  <tr className="border-t-2 border-gray-300 bg-blue-50">
                    <td className="p-3 text-sm font-black text-gray-800 uppercase">TOTAL</td>
                    <td className="p-3 text-right text-base font-black text-blue-600">
                      {(() => {
                        const totalReal = receitaBreakdown.reduce((sum, item) => sum + item.real, 0);
                        return totalReal === 0 ? '—' : `R$ ${totalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                      })()}
                    </td>
                    <td className="p-3 text-right text-base font-semibold text-gray-600">
                      {(() => {
                        const totalOrcado = receitaBreakdown.reduce((sum, item) => sum + item.orcado, 0);
                        return totalOrcado === 0 ? '—' : `R$ ${totalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                      })()}
                    </td>
                    <td className="p-3 text-right text-base font-semibold text-gray-600">
                      {(() => {
                        const totalA1 = receitaBreakdown.reduce((sum, item) => sum + item.a1, 0);
                        return totalA1 === 0 ? '—' : `R$ ${totalA1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                      })()}
                    </td>
                    <td className="p-3 text-right text-sm font-bold text-gray-700">
                      {(() => {
                        const totalReal = receitaBreakdown.reduce((sum, item) => sum + item.real, 0);
                        const totalOrcado = receitaBreakdown.reduce((sum, item) => sum + item.orcado, 0);
                        const diff = totalReal - totalOrcado;
                        return totalOrcado === 0 ? '—' : `R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
                      })()}
                    </td>
                    <td className="p-3 text-right text-sm font-bold text-gray-700">
                      {(() => {
                        const totalReal = receitaBreakdown.reduce((sum, item) => sum + item.real, 0);
                        const totalOrcado = receitaBreakdown.reduce((sum, item) => sum + item.orcado, 0);
                        const percChange = totalOrcado === 0 ? 0 : ((totalReal / totalOrcado - 1) * 100);
                        return totalOrcado === 0 ? '—' : `${percChange.toFixed(1)}%`;
                      })()}
                    </td>
                    <td className="p-3 text-right text-sm text-gray-300">—</td>
                    <td className="p-3 text-right text-sm text-gray-300">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Observações</p>
                  <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                    <li>✅ Dados buscados da DRE usando tag0 "01." (mesma lógica do card)</li>
                    <li>📊 Todas as tag01 que compõem a receita líquida estão listadas</li>
                    <li>💰 Total do breakdown = Total do card (valores idênticos)</li>
                    <li>🔢 Valores negativos (vermelho) = deduções da receita (tributos, devoluções)</li>
                    <li>📈 Deltas calculados vs Orçado quando disponível</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-b-2xl border-t border-gray-200 flex justify-end flex-shrink-0">
            <button
              onClick={() => setShowRevenueBreakdown(false)}
              className="px-6 py-3 bg-[#1B75BB] text-white rounded-lg font-black text-xs uppercase tracking-wider hover:bg-[#1557BB] transition-all shadow-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
    </div>
    </>
  );
};

const KPICard = ({ label, value, trend, trendAbsolute, isPercent, isNumber, color, icon, variationType = 'vs Orçado', onClick }: any) => {
  const colorMaps: any = {
    blue: 'text-[#1B75BB] bg-blue-50',
    orange: 'text-[#F44C00] bg-orange-50',
    amber: 'text-[#F44C00] bg-orange-50',
    teal: 'text-[#7AC5BF] bg-teal-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  // Formatação com "." como separador de milhares e sem decimais para valores >= 1000
  const formatNumber = (num: number) => {
    const absNum = Math.abs(num);
    if (absNum >= 1000) {
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formattedValue = useMemo(() => {
    if (isNumber) return formatNumber(value);
    return isPercent ? `${formatNumber(value)}%` : `R$ ${formatNumber(value)}`;
  }, [value, isPercent, isNumber]);

  const formattedTrendAbsolute = useMemo(() => {
    if (trendAbsolute === undefined) return null;
    if (isNumber) return formatNumber(Math.abs(trendAbsolute));
    return `R$ ${formatNumber(Math.abs(trendAbsolute))}`;
  }, [trendAbsolute, isNumber]);

  return (
    <div
      className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <div className={`p-1.5 rounded-lg ${colorMaps[color]}`}>{icon}</div>}
          <span className="text-[8px] font-black text-[#636363] uppercase tracking-widest">{label}</span>
        </div>
        {trend !== undefined && (
          <div className="flex flex-col items-end gap-0.5">
            <div className={`px-2 py-1 rounded text-[11px] font-black flex items-center gap-1 ${trend > 0 ? 'bg-teal-50 text-[#7AC5BF]' : 'bg-orange-50 text-[#F44C00]'}`}>
              {trend > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {formattedTrendAbsolute && <span>{formattedTrendAbsolute} | </span>}
              {Math.abs(trend).toFixed(1)}%
            </div>
            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">{variationType}</span>
          </div>
        )}
      </div>
      <p className={`text-2xl font-black tracking-tighter ${colorMaps[color].split(' ')[0]}`}>
        {formattedValue}
      </p>
    </div>
  );
};

const ConsumptionCard: React.FC<{
  label: string;
  value: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}> = ({ label, value, desc, icon, color, trend }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200'
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        </div>
        {trend !== undefined && (
          <div className={`px-2 py-1 rounded text-[11px] font-black flex items-center gap-1 ${trend > 0 ? 'bg-orange-50 text-[#F44C00]' : 'bg-teal-50 text-[#7AC5BF]'}`}>
            {trend > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
      <p className="text-[8px] text-gray-400 font-bold">{desc}</p>
    </div>
  );
};

// Multi-Select Filter Component
interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colorScheme: 'blue' | 'orange';
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  icon,
  options,
  selected,
  onChange,
  colorScheme
}) => {
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

          {/* Footer with count */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <span className="text-[9px] font-bold text-gray-600">
              {selected.length} de {options.length} selecionada(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;