import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SchoolKPIs, Transaction } from '../../types';
import { SomaTagsRow, getReceitaLiquidaDRE } from '../../services/supabaseService';
import { useDashboardKpis } from '../../hooks/useDashboardKpis';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { CockpitHeader } from './CockpitHeader';
import { ExecutiveHealthCards } from './ExecutiveHealthCards';
import { AnomalyStrip } from './AnomalyStrip';
import { OperationalKPIsSection } from './OperationalKPIsSection';
import { BranchPerformanceSection } from './BranchPerformanceSection';
import { AiExecutiveSummary } from './AiExecutiveSummary';

interface CockpitDashboardProps {
  kpis: SchoolKPIs;
  transactions: Transaction[];
  selectedMarca: string[];
  selectedFilial: string[];
  uniqueBrands: string[];
  availableBranches: string[];
  onMarcaChange: (brands: string[]) => void;
  onFilialChange: (branches: string[]) => void;
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedCategories?: string[];
  isLoading?: boolean;
  somaRows?: SomaTagsRow[];
  onRefresh?: () => void;
}

// ─── Skeleton Placeholder ───────────────────────────────────────────
const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 p-4 animate-pulse ${className}`}>
    <div className="flex justify-between mb-3">
      <div className="h-4 w-24 bg-gray-200 rounded"></div>
      <div className="h-4 w-16 bg-gray-200 rounded"></div>
    </div>
    <div className="h-8 w-40 bg-gray-200 rounded"></div>
  </div>
);

const SkeletonSection: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
    <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <SkeletonCard className="h-32" /><SkeletonCard className="h-32" /><SkeletonCard className="h-32" />
    </div>
  </div>
);

export const CockpitDashboard: React.FC<CockpitDashboardProps> = ({
  kpis, transactions, selectedMarca, selectedFilial,
  uniqueBrands, availableBranches, onMarcaChange, onFilialChange,
  allowedMarcas, somaRows, isLoading, onRefresh,
}) => {
  // Filter state
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonthStart, setSelectedMonthStart] = useState<number>(currentMonthIndex);
  const [selectedMonthEnd, setSelectedMonthEnd] = useState<number>(currentMonthIndex);
  const [comparisonMode, setComparisonMode] = useState<'budget' | 'prevYear'>('budget');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [forceExpandKpis, setForceExpandKpis] = useState(false);

  // Receita Líquida from somaRows (same DRE source)
  const [receitaLiquidaReal, setReceitaLiquidaReal] = useState<number>(0);
  const [receitaLiquidaComparison, setReceitaLiquidaComparison] = useState<number>(0);

  // Calculate Receita from somaRows
  useEffect(() => {
    let cancelled = false;
    const compScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';

    if (somaRows && somaRows.length > 0) {
      const calcFromRows = (scenario: string) =>
        somaRows
          .filter(r => {
            const m = parseInt(r.month.substring(5, 7), 10) - 1;
            return r.scenario === scenario && r.tag0.startsWith('01.') && m >= selectedMonthStart && m <= selectedMonthEnd;
          })
          .reduce((s, r) => s + Number(r.total), 0);

      setReceitaLiquidaReal(calcFromRows('Real'));
      setReceitaLiquidaComparison(calcFromRows(compScenario));
      return () => { cancelled = true; };
    }

    // Fallback: RPC
    const fetchReceita = async () => {
      try {
        const year = new Date().getFullYear();
        const monthFrom = `${year}-${String(selectedMonthStart + 1).padStart(2, '0')}`;
        const monthTo = `${year}-${String(selectedMonthEnd + 1).padStart(2, '0')}`;
        const permMarcas = allowedMarcas && allowedMarcas.length > 0 ? allowedMarcas : undefined;
        const effectiveMarcas = permMarcas
          ? (selectedMarca.length > 0 ? selectedMarca.filter(m => permMarcas.some(p => p.toUpperCase() === m.toUpperCase())) : permMarcas)
          : (selectedMarca.length > 0 ? selectedMarca : undefined);

        const [receitaReal, receitaComp] = await Promise.all([
          getReceitaLiquidaDRE({ monthFrom, monthTo, marcas: effectiveMarcas, nomeFiliais: selectedFilial.length > 0 ? selectedFilial : undefined, scenario: 'Real' }),
          getReceitaLiquidaDRE({ monthFrom, monthTo, marcas: effectiveMarcas, nomeFiliais: selectedFilial.length > 0 ? selectedFilial : undefined, scenario: compScenario }),
        ]);
        if (!cancelled) {
          setReceitaLiquidaReal(receitaReal);
          setReceitaLiquidaComparison(receitaComp);
        }
      } catch (error) {
        console.error('Erro ao buscar Receita Líquida:', error);
      }
    };
    fetchReceita();
    return () => { cancelled = true; };
  }, [selectedMonthStart, selectedMonthEnd, selectedMarca, selectedFilial, comparisonMode, somaRows, allowedMarcas]);

  const monthRange = { start: selectedMonthStart, end: selectedMonthEnd };

  // Unified KPIs hook
  const { enhancedKpis, trends } = useDashboardKpis({
    transactions, kpis, monthRange, comparisonMode,
    receitaLiquidaReal, receitaLiquidaComparison, allowedMarcas,
  });

  // Anomaly detection
  const opTrends = comparisonMode === 'budget' ? trends.vsBudget : trends.vsPrevYear;
  const anomalies = useAnomalyDetection({ enhancedKpis, operationalTrends: opTrends });

  // Anomaly click → force expand KPI section + scroll + highlight
  const handleAnomalyClick = useCallback((id: string) => {
    // Force expand the operational KPIs section
    setForceExpandKpis(true);
    setHighlightId(id);

    // Wait a tick for DOM to update after expand
    requestAnimationFrame(() => {
      const el = document.getElementById(`kpi-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Clear highlight after 3s
    setTimeout(() => setHighlightId(null), 3000);
  }, []);

  // Show loading skeleton while data is loading
  const showSkeleton = isLoading && (!somaRows || somaRows.length === 0) && transactions.length === 0;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* Header with filters */}
      <CockpitHeader
        selectedMarca={selectedMarca}
        selectedFilial={selectedFilial}
        uniqueBrands={uniqueBrands}
        availableBranches={availableBranches}
        onMarcaChange={onMarcaChange}
        onFilialChange={onFilialChange}
        comparisonMode={comparisonMode}
        onComparisonChange={setComparisonMode}
        selectedMonthStart={selectedMonthStart}
        selectedMonthEnd={selectedMonthEnd}
        onMonthStartChange={setSelectedMonthStart}
        onMonthEndChange={setSelectedMonthEnd}
        isRefreshing={isLoading}
        onRefresh={onRefresh}
      />

      {showSkeleton ? (
        <div className="mt-4">
          <SkeletonSection />
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {/* Zona A: Executive Health Cards */}
          <ExecutiveHealthCards
            enhancedKpis={enhancedKpis}
            trends={trends}
            comparisonMode={comparisonMode}
            somaRows={somaRows}
            monthRange={monthRange}
          />

          {/* Zona B: Anomaly Strip */}
          <AnomalyStrip
            anomalies={anomalies}
            onAnomalyClick={handleAnomalyClick}
          />

          {/* Zona C: Operational KPIs */}
          <OperationalKPIsSection
            enhancedKpis={enhancedKpis}
            trends={trends}
            comparisonMode={comparisonMode}
            highlightId={highlightId}
            forceExpand={forceExpandKpis}
            onExpandHandled={() => setForceExpandKpis(false)}
          />

          {/* Zona D: Branch Performance */}
          <BranchPerformanceSection
            transactions={transactions}
            monthRange={monthRange}
            selectedMarca={selectedMarca}
            selectedFilial={selectedFilial}
            comparisonMode={comparisonMode}
            kpis={kpis}
          />

          {/* Zona E: AI Executive Summary */}
          <AiExecutiveSummary
            transactions={transactions}
            kpis={kpis}
            selectedMarca={selectedMarca}
            selectedFilial={selectedFilial}
            monthRange={monthRange}
            comparisonMode={comparisonMode}
          />
        </div>
      )}
    </div>
  );
};
