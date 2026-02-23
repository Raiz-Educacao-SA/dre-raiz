import { useMemo } from 'react';
import { Transaction } from '../types';
import { RECEITA_LIQUIDA_TAGS_SET } from '../constants';
import { BRANCHES } from '../constants';

export interface BranchDataItem {
  branch: string;
  revenue: number;
  fixedCosts: number;
  variableCosts: number;
  sga: number;
  rateio: number;
  ebitda: number;
  margin: number;
  students: number;
  revenueVariation: number;
  fixedCostsVariation: number;
  variableCostsVariation: number;
  sgaVariation: number;
  rateioVariation: number;
  ebitdaVariation: number;
  marginVariation: number;
}

interface UseBranchDataParams {
  transactions: Transaction[];
  monthRange: { start: number; end: number };
  selectedMarca: string[];
  selectedFilial: string[];
  drillLevel: 'cia' | 'filial';
  comparisonMode: 'budget' | 'lastYear';
  activeStudents: number;
}

/**
 * ⚡ OTIMIZAÇÃO #5: Hook compartilhado para cálculo de branchData
 * Elimina duplicação de cálculo entre Dashboard e DashboardEnhanced
 * Redução de -50% na computação duplicada
 */
export const useBranchData = ({
  transactions,
  monthRange,
  selectedMarca,
  selectedFilial,
  drillLevel,
  comparisonMode,
  activeStudents
}: UseBranchDataParams): BranchDataItem[] => {
  return useMemo(() => {
    // Filtrar transações reais (Real) pelo período
    let filteredTrans = transactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return t.scenario === 'Real' && month >= monthRange.start && month <= monthRange.end;
    });

    // ✅ APLICAR FILTRO DE MARCA
    if (selectedMarca.length > 0) {
      filteredTrans = filteredTrans.filter(t => selectedMarca.includes(t.marca || ''));
    }

    // ✅ APLICAR FILTRO DE FILIAL
    if (selectedFilial.length > 0) {
      filteredTrans = filteredTrans.filter(t => selectedFilial.includes(t.filial || ''));
    }

    // Filtrar transações de comparação (Orçado ou A-1)
    const comparisonScenario = comparisonMode === 'budget' ? 'Orçado' : 'A-1';
    let comparisonTrans = transactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      return t.scenario === comparisonScenario && month >= monthRange.start && month <= monthRange.end;
    });

    // ✅ APLICAR FILTRO DE MARCA nas transações de comparação
    if (selectedMarca.length > 0) {
      comparisonTrans = comparisonTrans.filter(t => selectedMarca.includes(t.marca || ''));
    }

    // ✅ APLICAR FILTRO DE FILIAL nas transações de comparação
    if (selectedFilial.length > 0) {
      comparisonTrans = comparisonTrans.filter(t => selectedFilial.includes(t.filial || ''));
    }

    // Determinar quais dimensões mostrar baseado no drill level
    let dimensionsToShow: string[];

    if (drillLevel === 'cia') {
      // Mostrar por CIA (marca)
      const ciasInData = new Set(filteredTrans.map(t => t.marca).filter(Boolean));
      dimensionsToShow = Array.from(ciasInData).sort();
    } else {
      // Mostrar por Filial
      if (selectedFilial.length > 0) {
        dimensionsToShow = selectedFilial;
      } else {
        const filiaisInData = new Set(filteredTrans.map(t => t.filial).filter(Boolean));
        dimensionsToShow = Array.from(filiaisInData).sort();
        if (dimensionsToShow.length === 0 && selectedMarca.length === 0) {
          dimensionsToShow = BRANCHES;
        }
      }
    }

    return dimensionsToShow.map(dimension => {
      // Dados reais
      const dimensionTrans = drillLevel === 'cia'
        ? filteredTrans.filter(t => t.marca === dimension)
        : filteredTrans.filter(t => t.filial === dimension);

      // ⚡ OTIMIZAÇÃO: Agregar em um único loop
      let revenue = 0;
      let fixedCosts = 0;
      let variableCosts = 0;
      let sga = 0;
      let rateioCosts = 0;

      for (const t of dimensionTrans) {
        const tag0 = t.tag0 || '';
        // Mesma lógica do EBITDA TOTAL do DRE Gerencial
        if (tag0.startsWith('01.')) {
          revenue += t.amount;       // 01. = Receita Bruta
        } else if (tag0.startsWith('02.')) {
          variableCosts += t.amount; // 02. = Custos Variáveis (negativo no DB)
        } else if (tag0.startsWith('03.')) {
          fixedCosts += t.amount;    // 03. = Custos Fixos (negativo no DB)
        } else if (tag0.startsWith('06.')) {
          rateioCosts += t.amount;   // 06. = Rateio Raiz (negativo no DB)
        }
      }

      // EBITDA = soma direta — custos já são negativos no banco
      const ebitda = revenue + fixedCosts + variableCosts + rateioCosts;
      const margin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

      // Dados de comparação
      const compDimensionTrans = drillLevel === 'cia'
        ? comparisonTrans.filter(t => t.marca === dimension)
        : comparisonTrans.filter(t => t.filial === dimension);

      // ⚡ OTIMIZAÇÃO: Agregar em um único loop (comparação)
      let compRevenue = 0;
      let compFixedCosts = 0;
      let compVariableCosts = 0;
      let compSga = 0;
      let compRateioCosts = 0;

      for (const t of compDimensionTrans) {
        const tag0 = t.tag0 || '';
        if (tag0.startsWith('01.')) {
          compRevenue += t.amount;
        } else if (tag0.startsWith('02.')) {
          compVariableCosts += t.amount;
        } else if (tag0.startsWith('03.')) {
          compFixedCosts += t.amount;
        } else if (tag0.startsWith('06.')) {
          compRateioCosts += t.amount;
        }
      }

      const compEbitda = compRevenue + compFixedCosts + compVariableCosts + compRateioCosts;
      const compMargin = compRevenue > 0 ? (compEbitda / compRevenue) * 100 : 0;

      // Calcular variações
      const revenueVariation = compRevenue !== 0 ? ((revenue - compRevenue) / compRevenue) * 100 : 0;
      const fixedCostsVariation = compFixedCosts !== 0 ? ((fixedCosts - compFixedCosts) / Math.abs(compFixedCosts)) * 100 : 0;
      const variableCostsVariation = compVariableCosts !== 0 ? ((variableCosts - compVariableCosts) / Math.abs(compVariableCosts)) * 100 : 0;
      const sgaVariation = compSga !== 0 ? ((sga - compSga) / Math.abs(compSga)) * 100 : 0;
      const rateioVariation = compRateioCosts !== 0 ? ((rateioCosts - compRateioCosts) / Math.abs(compRateioCosts)) * 100 : 0;
      const ebitdaVariation = compEbitda !== 0 ? ((ebitda - compEbitda) / Math.abs(compEbitda)) * 100 : 0;
      const marginVariation = margin - compMargin;

      // Calcular número de alunos estimado (proporcionalmente)
      const totalRevenue = filteredTrans
        .filter(t => (t.tag0 || '').startsWith('01.'))
        .reduce((acc, t) => acc + t.amount, 0);
      const branchStudents = totalRevenue > 0 ? Math.round(activeStudents * (revenue / totalRevenue)) : 0;

      return {
        branch: dimension,
        revenue,
        fixedCosts,
        variableCosts,
        sga,
        rateio: rateioCosts,
        ebitda,
        margin,
        students: branchStudents,
        revenueVariation,
        fixedCostsVariation,
        variableCostsVariation,
        sgaVariation,
        rateioVariation,
        ebitdaVariation,
        marginVariation
      };
    });
  }, [transactions, monthRange, selectedMarca, selectedFilial, drillLevel, comparisonMode, activeStudents]);
};
