import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Target, Droplets, Zap, Box, PartyPopper, ChevronDown, ChevronUp } from 'lucide-react';
import { HeroCard, CompactKPICard } from './KPICards';
import { EnhancedKpis, KpiTrends } from '../../hooks/useDashboardKpis';

const STORAGE_KEY = 'dre-raiz:cockpit:section-operacional';

interface OperationalKPIsSectionProps {
  enhancedKpis: EnhancedKpis;
  trends: KpiTrends;
  comparisonMode: 'budget' | 'prevYear';
  highlightId?: string | null;
  forceExpand?: boolean;
  onExpandHandled?: () => void;
}

export const OperationalKPIsSection: React.FC<OperationalKPIsSectionProps> = ({
  enhancedKpis, trends, comparisonMode, highlightId, forceExpand, onExpandHandled,
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch { return true; }
  });

  const opTrends = comparisonMode === 'budget' ? trends.vsBudget : trends.vsPrevYear;

  // Persist expand state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(isExpanded)); } catch {}
  }, [isExpanded]);

  // Force expand when anomaly is clicked
  useEffect(() => {
    if (forceExpand && !isExpanded) {
      setIsExpanded(true);
    }
    if (forceExpand) {
      onExpandHandled?.();
    }
  }, [forceExpand]);

  return (
    <section>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 group"
        aria-expanded={isExpanded}
        aria-controls="operational-kpis-content"
      >
        <div className="h-6 w-1.5 bg-purple-500 rounded-full"></div>
        <h2 className="text-xl font-black text-gray-900">KPIs Operacionais</h2>
        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {isExpanded && (
        <div id="operational-kpis-content" className="space-y-4 animate-in fade-in duration-300">
          {/* Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <HeroCard
              label="Custo Professor"
              value={enhancedKpis.teacherCost}
              valueComparison={opTrends.teacherCostComp}
              subtitle={`${enhancedKpis.teacherCostPercent.toFixed(1)}% da Receita`}
              icon={<GraduationCap size={20} />}
              color="purple"
              trendPercent={opTrends.teacherPercentAbsolute}
              comparisonMode={comparisonMode}
            />
            <HeroCard
              label="Folha Administrativa"
              value={enhancedKpis.adminPayrollCost}
              valueComparison={opTrends.adminPayrollComp}
              subtitle={`${enhancedKpis.adminPayrollPercent.toFixed(1)}% da Receita`}
              icon={<Users size={20} />}
              color="blue"
              trendPercent={opTrends.adminPercentAbsolute}
              comparisonMode={comparisonMode}
            />
            <HeroCard
              label="Rateio CSC"
              value={enhancedKpis.sgaCosts + enhancedKpis.rateioCosts}
              valueComparison={0}
              subtitle="SG&A + Rateio"
              icon={<Target size={20} />}
              color="orange"
              trendPercent={opTrends.rateioCscAbsolute}
              comparisonMode={comparisonMode}
            />
          </div>

          {/* Operational indicators */}
          <div>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
              Indicadores Operacionais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div id="kpi-teacher-rol" className={highlightId === 'teacher-rol' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Professor / ROL" value={enhancedKpis.teacherCostPercent} isPercent color="purple" icon={<GraduationCap size={14} />} trendAbsolute={opTrends.teacherPercentAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Professor / Receita Operacional Líquida" />
              </div>
              <div id="kpi-teacher-turma" className={highlightId === 'teacher-turma' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Professor / Turma" value={enhancedKpis.teacherCostPerClassroom} color="teal" icon={<GraduationCap size={14} />} trendAbsolute={opTrends.teacherPerClassroomAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Professor / Número de Turmas" />
              </div>
              <div id="kpi-admin-rol" className={highlightId === 'admin-rol' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Folha Adm / ROL" value={enhancedKpis.adminPayrollPercent} isPercent color="blue" icon={<Users size={14} />} trendAbsolute={opTrends.adminPercentAbsolute} comparisonMode={comparisonMode} tooltip="Folha Administrativa / Receita Operacional Líquida" />
              </div>
              <div id="kpi-rateio-csc" className={highlightId === 'rateio-csc' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Rateio CSC" value={enhancedKpis.sgaCosts + enhancedKpis.rateioCosts} color="orange" icon={<Target size={14} />} trendAbsolute={opTrends.rateioCscAbsolute} comparisonMode={comparisonMode} tooltip="SG&A + Rateio Raiz" />
              </div>
              <div id="kpi-manutencao-rol" className={highlightId === 'manutencao-rol' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Manutenção / ROL" value={enhancedKpis.maintenancePercent} isPercent color="amber" icon={<Target size={14} />} trendAbsolute={opTrends.maintenancePercentAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Manutenção / Receita Operacional Líquida" />
              </div>
            </div>
          </div>

          {/* Consumption indicators */}
          <div>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
              Indicadores de Consumo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div id="kpi-agua-aluno" className={highlightId === 'agua-aluno' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Água / Aluno" value={enhancedKpis.waterPerStudent} icon={<Droplets size={14} />} color="blue" trendAbsolute={opTrends.waterPerStudentAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Água & Gás / Aluno Ativo" />
              </div>
              <div id="kpi-energia-turma" className={highlightId === 'energia-turma' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Energia / Turma" value={enhancedKpis.energyPerClassroom} icon={<Zap size={14} />} color="amber" trendAbsolute={opTrends.energyPerClassroomAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Energia / Turma" />
              </div>
              <div id="kpi-material-aluno" className={highlightId === 'material-aluno' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Mat. Consumo / Aluno" value={enhancedKpis.consumptionMaterialPerStudent} icon={<Box size={14} />} color="purple" trendAbsolute={opTrends.materialPerStudentAbsolute} comparisonMode={comparisonMode} tooltip="Material de Consumo / Aluno Ativo" />
              </div>
              <div id="kpi-eventos-aluno" className={highlightId === 'eventos-aluno' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Eventos / Aluno" value={enhancedKpis.eventsPerStudent} icon={<PartyPopper size={14} />} color="emerald" trendAbsolute={opTrends.eventsPerStudentAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Eventos / Aluno Ativo" />
              </div>
              <div id="kpi-alimentacao-aluno" className={highlightId === 'alimentacao-aluno' ? 'ring-2 ring-amber-400 rounded-xl animate-pulse' : ''}>
                <CompactKPICard label="Alimentação / Aluno" value={enhancedKpis.studentMealPerStudent} icon={<Users size={14} />} color="rose" trendAbsolute={opTrends.mealPerStudentAbsolute} comparisonMode={comparisonMode} tooltip="Custo de Alimentação / Aluno Ativo" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
