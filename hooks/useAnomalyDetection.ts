import { useMemo } from 'react';
import { EnhancedKpis, OperationalTrends } from './useDashboardKpis';

export interface AnomalyItem {
  id: string;
  label: string;
  deviationPercent: number;
  deviationAbsolute: number;
  isPercent: boolean;
  severity: 'green' | 'amber' | 'red';
  category: 'operational' | 'consumption';
}

interface UseAnomalyDetectionParams {
  enhancedKpis: EnhancedKpis;
  operationalTrends: OperationalTrends;
  threshold?: number; // default 5%
}

export const useAnomalyDetection = ({
  enhancedKpis,
  operationalTrends,
  threshold = 5,
}: UseAnomalyDetectionParams): AnomalyItem[] => {
  return useMemo(() => {
    const items: AnomalyItem[] = [];

    const addItem = (id: string, label: string, deviation: number, isPercent: boolean, category: 'operational' | 'consumption') => {
      const absDev = Math.abs(deviation);
      // For costs: positive deviation means costs went UP → bad (amber/red)
      // For costs: negative deviation means costs went DOWN → good (green)
      const severity: 'green' | 'amber' | 'red' =
        deviation <= 0 ? 'green' :       // cost decreased = good
        absDev <= 5 ? 'green' :
        absDev <= 15 ? 'amber' : 'red';

      if (absDev > threshold) {
        items.push({ id, label, deviationPercent: deviation, deviationAbsolute: deviation, isPercent, severity, category });
      }
    };

    // Operational KPIs
    addItem('teacher-rol', 'Professor/ROL', operationalTrends.teacherPercentAbsolute, true, 'operational');
    addItem('teacher-turma', 'Professor/Turma', operationalTrends.teacherPerClassroomAbsolute, false, 'operational');
    addItem('admin-rol', 'Folha Adm/ROL', operationalTrends.adminPercentAbsolute, true, 'operational');
    addItem('rateio-csc', 'Rateio CSC', operationalTrends.rateioCscAbsolute, false, 'operational');
    addItem('manutencao-rol', 'Manutenção/ROL', operationalTrends.maintenancePercentAbsolute, true, 'operational');

    // Consumption KPIs
    addItem('agua-aluno', 'Água/Aluno', operationalTrends.waterPerStudentAbsolute, false, 'consumption');
    addItem('energia-turma', 'Energia/Turma', operationalTrends.energyPerClassroomAbsolute, false, 'consumption');
    addItem('material-aluno', 'Mat.Consumo/Al', operationalTrends.materialPerStudentAbsolute, false, 'consumption');
    addItem('eventos-aluno', 'Eventos/Aluno', operationalTrends.eventsPerStudentAbsolute, false, 'consumption');
    addItem('alimentacao-aluno', 'Alimentação/Al', operationalTrends.mealPerStudentAbsolute, false, 'consumption');

    // Sort by severity (red first) then by absolute deviation
    const severityOrder = { red: 0, amber: 1, green: 2 };
    items.sort((a, b) => {
      const sev = severityOrder[a.severity] - severityOrder[b.severity];
      if (sev !== 0) return sev;
      return Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent);
    });

    return items;
  }, [enhancedKpis, operationalTrends, threshold]);
};
