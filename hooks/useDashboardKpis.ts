import { useMemo } from 'react';
import { Transaction, SchoolKPIs } from '../types';
import { filterTransactionsByPermissions } from '../services/permissionsService';

export interface EnhancedKpis {
  totalRevenue: number;
  totalFixedCosts: number;
  totalVariableCosts: number;
  sgaCosts: number;
  rateioCosts: number;
  ebitda: number;
  netMargin: number;
  revenuePerStudent: number;
  costPerStudent: number;
  waterPerStudent: number;
  energyPerClassroom: number;
  consumptionMaterialPerStudent: number;
  eventsPerStudent: number;
  teacherCostPercent: number;
  adminPayrollPercent: number;
  studentMealPerStudent: number;
  teacherCostPerClassroom: number;
  maintenancePercent: number;
  teacherCost: number;
  adminPayrollCost: number;
  studentMealCost: number;
  maintenanceCost: number;
  numberOfClassrooms: number;
  activeStudents: number;
  defaultRate: number;
  costReductionNeeded: number;
  marginOfSafety: number;
  targetEbitdaValue: number;
  isBelowTarget: boolean;
}

export interface KpiTrends {
  revenue: number;
  ebitda: number;
  margin: number;
  students: number;
  revenueAbsolute: number;
  ebitdaAbsolute: number;
  revenuePerStudentAbsolute: number;
  studentsAbsolute: number;
  compRevenue: number;
  compEbitda: number;
  compFixedCosts: number;
  compVariableCosts: number;
  compSgaCosts: number;
  compRateioCosts: number;
  // Operational KPI trends (both budget and prevYear)
  vsBudget: OperationalTrends;
  vsPrevYear: OperationalTrends;
}

export interface OperationalTrends {
  teacherCostComp: number;
  adminPayrollComp: number;
  teacherPercentAbsolute: number;
  teacherPerClassroomAbsolute: number;
  adminPercentAbsolute: number;
  rateioCscAbsolute: number;
  maintenancePercentAbsolute: number;
  waterPerStudentAbsolute: number;
  energyPerClassroomAbsolute: number;
  materialPerStudentAbsolute: number;
  eventsPerStudentAbsolute: number;
  mealPerStudentAbsolute: number;
}

interface UseDashboardKpisParams {
  transactions: Transaction[];
  kpis: SchoolKPIs;
  monthRange: { start: number; end: number };
  comparisonMode: 'budget' | 'prevYear';
  receitaLiquidaReal: number;
  receitaLiquidaComparison: number;
  allowedMarcas?: string[];
}

export const useDashboardKpis = ({
  transactions,
  kpis,
  monthRange,
  comparisonMode,
  receitaLiquidaReal,
  receitaLiquidaComparison,
  allowedMarcas,
}: UseDashboardKpisParams): { enhancedKpis: EnhancedKpis; trends: KpiTrends } => {
  // Permission-filtered transactions
  const permissionFilteredTransactions = useMemo(() => {
    return filterTransactionsByPermissions(transactions);
  }, [transactions]);

  // Filter by month range + permission marca
  const filteredByMonth = useMemo(() => {
    return permissionFilteredTransactions.filter(t => {
      const month = parseInt(t.date.substring(5, 7), 10) - 1;
      if (month < monthRange.start || month > monthRange.end) return false;
      if (allowedMarcas && allowedMarcas.length > 0) {
        if (!t.marca || !allowedMarcas.some(p => p.toUpperCase() === (t.marca || '').toUpperCase())) return false;
      }
      return true;
    });
  }, [permissionFilteredTransactions, monthRange.start, monthRange.end, allowedMarcas]);

  // Enhanced KPIs - single-pass aggregation
  const enhancedKpis = useMemo((): EnhancedKpis => {
    const agg = {
      waterCost: 0, energyCost: 0, consumptionMaterialCost: 0, eventsCost: 0,
      teacherCost: 0, adminPayrollCost: 0, studentMealCost: 0, maintenanceCost: 0,
      totalFixedCosts: 0, totalVariableCosts: 0, sgaCosts: 0, rateioCosts: 0,
    };

    for (const t of filteredByMonth) {
      if (t.scenario !== 'Real') continue;
      const category = t.category || '';
      const amount = t.amount;

      if (category === 'Água & Gás') agg.waterCost += amount;
      else if (category === 'Energia') agg.energyCost += amount;
      else if (category === 'Material de Consumo' || category === 'Material de Consumo & Operação') agg.consumptionMaterialCost += amount;
      else if (category === 'Eventos Comerciais' || category === 'Eventos Pedagógicos') agg.eventsCost += amount;
      else if (category === 'Salários' || category.includes('Professor')) agg.teacherCost += amount;
      else if (category === 'Folha Administrativa' || category.includes('Folha Adm')) agg.adminPayrollCost += amount;
      else if (category === 'Alimentação' || category.includes('Alimentação')) agg.studentMealCost += amount;
      else if (category === 'Manutenção' || category.includes('Manutenção')) agg.maintenanceCost += amount;

      if (t.type === 'FIXED_COST') agg.totalFixedCosts += amount;
      else if (t.type === 'VARIABLE_COST') agg.totalVariableCosts += amount;
      else if (t.type === 'SGA') agg.sgaCosts += amount;
      else if (t.type === 'RATEIO') agg.rateioCosts += amount;
    }

    const totalRevenue = receitaLiquidaReal;
    const ebitda = totalRevenue - agg.totalFixedCosts - agg.totalVariableCosts - agg.sgaCosts - agg.rateioCosts;
    const numberOfStudents = kpis.activeStudents;
    const numberOfClassrooms = Math.ceil(numberOfStudents / 25);
    const targetMargin = 25;
    const targetEbitdaValue = totalRevenue * (targetMargin / 100);
    const diffToTarget = targetEbitdaValue - ebitda;

    return {
      totalRevenue,
      totalFixedCosts: agg.totalFixedCosts,
      totalVariableCosts: agg.totalVariableCosts,
      sgaCosts: agg.sgaCosts,
      rateioCosts: agg.rateioCosts,
      ebitda,
      netMargin: totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0,
      revenuePerStudent: numberOfStudents > 0 ? totalRevenue / numberOfStudents : 0,
      costPerStudent: numberOfStudents > 0 ? (agg.totalFixedCosts + agg.totalVariableCosts + agg.sgaCosts + agg.rateioCosts) / numberOfStudents : 0,
      waterPerStudent: numberOfStudents > 0 ? agg.waterCost / numberOfStudents : 0,
      energyPerClassroom: numberOfClassrooms > 0 ? agg.energyCost / numberOfClassrooms : 0,
      consumptionMaterialPerStudent: numberOfStudents > 0 ? agg.consumptionMaterialCost / numberOfStudents : 0,
      eventsPerStudent: numberOfStudents > 0 ? agg.eventsCost / numberOfStudents : 0,
      teacherCostPercent: totalRevenue > 0 ? (agg.teacherCost / totalRevenue) * 100 : 0,
      adminPayrollPercent: totalRevenue > 0 ? (agg.adminPayrollCost / totalRevenue) * 100 : 0,
      studentMealPerStudent: numberOfStudents > 0 ? agg.studentMealCost / numberOfStudents : 0,
      teacherCostPerClassroom: numberOfClassrooms > 0 ? agg.teacherCost / numberOfClassrooms : 0,
      maintenancePercent: totalRevenue > 0 ? (agg.maintenanceCost / totalRevenue) * 100 : 0,
      teacherCost: agg.teacherCost,
      adminPayrollCost: agg.adminPayrollCost,
      studentMealCost: agg.studentMealCost,
      maintenanceCost: agg.maintenanceCost,
      numberOfClassrooms,
      activeStudents: numberOfStudents,
      defaultRate: kpis.defaultRate,
      costReductionNeeded: diffToTarget > 0 ? diffToTarget : 0,
      marginOfSafety: diffToTarget < 0 ? Math.abs(diffToTarget) : 0,
      targetEbitdaValue,
      isBelowTarget: diffToTarget > 0,
    };
  }, [filteredByMonth, kpis, receitaLiquidaReal]);

  // Trends — executive-level
  const trends = useMemo((): KpiTrends => {
    const compScenarioName = comparisonMode === 'budget' ? 'Orçamento' : 'Ano Anterior';
    const comparison = filteredByMonth.filter(t => t.scenario === compScenarioName);

    const compRevenue = receitaLiquidaComparison;
    const compFixedCosts = comparison.filter(t => t.type === 'FIXED_COST').reduce((a, t) => a + t.amount, 0);
    const compVariableCosts = comparison.filter(t => t.type === 'VARIABLE_COST').reduce((a, t) => a + t.amount, 0);
    const compSgaCosts = comparison.filter(t => t.type === 'SGA').reduce((a, t) => a + t.amount, 0);
    const compRateioCosts = comparison.filter(t => t.type === 'RATEIO').reduce((a, t) => a + t.amount, 0);
    const compEbitda = compRevenue - compFixedCosts - compVariableCosts - compSgaCosts - compRateioCosts;
    const compMargin = compRevenue > 0 ? (compEbitda / compRevenue) * 100 : 0;

    const revenueTrend = compRevenue > 0 ? ((enhancedKpis.totalRevenue - compRevenue) / compRevenue) * 100 : 0;
    const ebitdaTrend = compEbitda !== 0 ? ((enhancedKpis.ebitda - compEbitda) / Math.abs(compEbitda)) * 100 : 0;
    const marginTrend = enhancedKpis.netMargin - compMargin;

    // Operational trends — calculate for BOTH scenarios
    const calcOperational = (compData: Transaction[]): OperationalTrends => {
      const compTeacherCost = compData.filter(t => t.category === 'Salários' || (t.category || '').includes('Professor')).reduce((a, t) => a + t.amount, 0);
      const compAdminPayroll = compData.filter(t => t.category === 'Folha Administrativa' || (t.category || '').includes('Folha Adm')).reduce((a, t) => a + t.amount, 0);
      const compMaintenance = compData.filter(t => t.category === 'Manutenção' || (t.category || '').includes('Manutenção')).reduce((a, t) => a + t.amount, 0);
      const compWater = compData.filter(t => t.category === 'Água & Gás').reduce((a, t) => a + t.amount, 0);
      const compEnergy = compData.filter(t => t.category === 'Energia').reduce((a, t) => a + t.amount, 0);
      const compMaterial = compData.filter(t => t.category === 'Material de Consumo' || t.category === 'Material de Consumo & Operação').reduce((a, t) => a + t.amount, 0);
      const compEvents = compData.filter(t => t.category === 'Eventos Comerciais' || t.category === 'Eventos Pedagógicos').reduce((a, t) => a + t.amount, 0);
      const compMeal = compData.filter(t => t.category === 'Alimentação' || (t.category || '').includes('Alimentação')).reduce((a, t) => a + t.amount, 0);
      const compSga = compData.filter(t => t.type === 'SGA').reduce((a, t) => a + t.amount, 0);
      const compRateio = compData.filter(t => t.type === 'RATEIO').reduce((a, t) => a + t.amount, 0);
      const compRev = compData.filter(t => t.type === 'REVENUE').reduce((a, t) => a + t.amount, 0);

      const nStudents = kpis.activeStudents;
      const nClassrooms = Math.ceil(nStudents / 25);

      const compTeacherPercent = compRev > 0 ? (compTeacherCost / compRev) * 100 : 0;
      const compAdminPercent = compRev > 0 ? (compAdminPayroll / compRev) * 100 : 0;
      const compMaintenancePercent = compRev > 0 ? (compMaintenance / compRev) * 100 : 0;

      return {
        teacherCostComp: compTeacherCost,
        adminPayrollComp: compAdminPayroll,
        teacherPercentAbsolute: enhancedKpis.teacherCostPercent - compTeacherPercent,
        teacherPerClassroomAbsolute: enhancedKpis.teacherCostPerClassroom - (nClassrooms > 0 ? compTeacherCost / nClassrooms : 0),
        adminPercentAbsolute: enhancedKpis.adminPayrollPercent - compAdminPercent,
        rateioCscAbsolute: (enhancedKpis.sgaCosts + enhancedKpis.rateioCosts) - (compSga + compRateio),
        maintenancePercentAbsolute: enhancedKpis.maintenancePercent - compMaintenancePercent,
        waterPerStudentAbsolute: enhancedKpis.waterPerStudent - (nStudents > 0 ? compWater / nStudents : 0),
        energyPerClassroomAbsolute: enhancedKpis.energyPerClassroom - (nClassrooms > 0 ? compEnergy / nClassrooms : 0),
        materialPerStudentAbsolute: enhancedKpis.consumptionMaterialPerStudent - (nStudents > 0 ? compMaterial / nStudents : 0),
        eventsPerStudentAbsolute: enhancedKpis.eventsPerStudent - (nStudents > 0 ? compEvents / nStudents : 0),
        mealPerStudentAbsolute: enhancedKpis.studentMealPerStudent - (nStudents > 0 ? compMeal / nStudents : 0),
      };
    };

    const budgetData = filteredByMonth.filter(t => t.scenario === 'Orçamento');
    const prevYearData = filteredByMonth.filter(t => t.scenario === 'Ano Anterior');

    return {
      revenue: revenueTrend,
      ebitda: ebitdaTrend,
      margin: marginTrend,
      students: 0,
      revenueAbsolute: enhancedKpis.totalRevenue - compRevenue,
      ebitdaAbsolute: enhancedKpis.ebitda - compEbitda,
      revenuePerStudentAbsolute: enhancedKpis.revenuePerStudent - (compRevenue > 0 ? compRevenue / enhancedKpis.activeStudents : 0),
      studentsAbsolute: 0,
      compRevenue,
      compEbitda,
      compFixedCosts,
      compVariableCosts,
      compSgaCosts,
      compRateioCosts,
      vsBudget: calcOperational(budgetData),
      vsPrevYear: calcOperational(prevYearData),
    };
  }, [filteredByMonth, enhancedKpis, comparisonMode, receitaLiquidaComparison, kpis]);

  return { enhancedKpis, trends };
};
