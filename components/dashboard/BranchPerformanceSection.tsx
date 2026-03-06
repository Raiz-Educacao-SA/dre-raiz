import React, { useMemo } from 'react';
import { EChartsOption } from 'echarts';
import { ChartBlock, TableBlock } from '../../features/visualBlocks';
import { useBranchData, BranchDataItem } from '../../hooks/useBranchData';
import { Transaction, SchoolKPIs } from '../../types';

interface BranchPerformanceSectionProps {
  transactions: Transaction[];
  monthRange: { start: number; end: number };
  selectedMarca: string[];
  selectedFilial: string[];
  comparisonMode: 'budget' | 'prevYear';
  kpis: SchoolKPIs;
  onNavigateToDRE?: (filial: string) => void;
}

type BranchMetric = 'revenue' | 'fixedCosts' | 'variableCosts' | 'sga' | 'ebitda';

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const BranchPerformanceSection: React.FC<BranchPerformanceSectionProps> = ({
  transactions, monthRange, selectedMarca, selectedFilial,
  comparisonMode, kpis, onNavigateToDRE,
}) => {
  const [branchMetric, setBranchMetric] = React.useState<BranchMetric>('revenue');
  const [drillLevel, setDrillLevel] = React.useState<'cia' | 'filial'>('cia');

  // Auto drill when marca selected
  React.useEffect(() => {
    setDrillLevel(selectedMarca.length > 0 ? 'filial' : 'cia');
  }, [selectedMarca]);

  const branchData = useBranchData({
    transactions,
    monthRange,
    selectedMarca,
    selectedFilial,
    drillLevel,
    comparisonMode: comparisonMode === 'budget' ? 'budget' : 'lastYear',
    activeStudents: kpis.activeStudents,
  }).sort((a, b) => b.revenue - a.revenue);

  const branchChartOptions: EChartsOption = useMemo(() => {
    const formatCurrency = (value: number) => {
      const valueInK = value / 1000;
      return `R$ ${valueInK.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
    };

    const getMetricData = () => {
      switch (branchMetric) {
        case 'revenue': return { data: branchData.map(d => d.revenue), variations: branchData.map(d => d.revenueVariation), label: 'Receita', formatter: formatCurrency, tooltipFormatter: (v: number) => `Receita: R$ ${v.toLocaleString('pt-BR')}` };
        case 'fixedCosts': return { data: branchData.map(d => d.fixedCosts), variations: branchData.map(d => d.fixedCostsVariation), label: 'Custos Fixos', formatter: formatCurrency, tooltipFormatter: (v: number) => `Custos Fixos: R$ ${v.toLocaleString('pt-BR')}` };
        case 'variableCosts': return { data: branchData.map(d => d.variableCosts), variations: branchData.map(d => d.variableCostsVariation), label: 'Custos Variáveis', formatter: formatCurrency, tooltipFormatter: (v: number) => `Custos Variáveis: R$ ${v.toLocaleString('pt-BR')}` };
        case 'sga': return { data: branchData.map(d => d.sga), variations: branchData.map(d => d.sgaVariation), label: 'SG&A', formatter: formatCurrency, tooltipFormatter: (v: number) => `SG&A: R$ ${v.toLocaleString('pt-BR')}` };
        case 'ebitda': return { data: branchData.map(d => d.ebitda), variations: branchData.map(d => d.ebitdaVariation), label: 'EBITDA', formatter: formatCurrency, tooltipFormatter: (v: number) => `EBITDA: R$ ${v.toLocaleString('pt-BR')}` };
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
          return `<strong>${item.name}</strong><br/>${metricData.tooltipFormatter(item.value)}<br/><span style="color: ${variationColor}; font-weight: bold;">vs ${compLabel}: ${variationText}</span>`;
        },
      },
      xAxis: {
        type: 'category',
        data: branchData.map(d => d.branch),
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: { fontSize: 10, fontWeight: 'bold', rotate: 20 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: { fontSize: 11, formatter: metricData.formatter },
      },
      series: [{
        type: 'bar',
        data: branchData.map((d, idx) => {
          const variation = metricData.variations[idx];
          // Color by metric variation: favorable (within 5%) = green, moderate (5-15%) = amber, unfavorable (>15%) = red
          // Revenue/EBITDA: positive is good. Costs: negative is good.
          const isRevenueType = branchMetric === 'revenue' || branchMetric === 'ebitda';
          const effectiveVariation = isRevenueType ? variation : -variation;
          const color = effectiveVariation >= -5 ? '#10B981' : effectiveVariation >= -15 ? '#F59E0B' : '#EF4444';
          return { value: metricData.data[idx], itemStyle: { color } };
        }),
        barWidth: '60%',
        itemStyle: { borderRadius: [8, 8, 0, 0] },
        label: {
          show: true, position: 'top',
          formatter: (params: any) => {
            const idx = params.dataIndex;
            const value = metricData.data[idx];
            const variation = metricData.variations[idx];
            const variationText = variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`;
            const valueInK = value / 1000;
            const valueText = `R$ ${valueInK.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
            const variationStyle = variation >= 0 ? 'positive' : 'negative';
            return `{value|${valueText}}\n{${variationStyle}|${variationText}}`;
          },
          rich: {
            value: { fontSize: 11, fontWeight: 'bold', color: '#374151', lineHeight: 16 },
            positive: { fontSize: 9, fontWeight: 'bold', color: '#10B981', lineHeight: 14 },
            negative: { fontSize: 9, fontWeight: 'bold', color: '#EF4444', lineHeight: 14 },
          },
        },
      }],
      grid: { left: '3%', right: '3%', top: 60, bottom: 80 },
    };
  }, [branchData, branchMetric, comparisonMode]);

  const tableColumns = [
    { id: 'branch', header: 'Unidade', accessor: 'branch', sortable: true },
    { id: 'students', header: 'Alunos', accessor: 'students', align: 'center' as const, sortable: true },
    { id: 'revenue', header: 'Receita', accessor: 'revenue', align: 'right' as const, sortable: true, format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
    { id: 'fixedCosts', header: 'Custos Fixos', accessor: 'fixedCosts', align: 'right' as const, sortable: true, format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
    { id: 'variableCosts', header: 'Custos Variáveis', accessor: 'variableCosts', align: 'right' as const, sortable: true, format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
    { id: 'sga', header: 'SG&A', accessor: 'sga', align: 'right' as const, sortable: true, format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
    { id: 'rateio', header: 'Rateio Raiz', accessor: 'rateio', align: 'right' as const, sortable: true, format: (v: number) => <span className={v < 0 ? 'text-orange-600' : 'text-gray-700'}>R$ {v.toLocaleString('pt-BR')}</span> },
    { id: 'ebitda', header: 'EBITDA', accessor: 'ebitda', align: 'right' as const, sortable: true, format: (v: number) => <span className={v >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>R$ {v.toLocaleString('pt-BR')}</span> },
    { id: 'margin', header: 'Margem %', accessor: 'margin', align: 'right' as const, sortable: true, format: (v: number) => <span className={v >= 25 ? 'text-emerald-600 font-bold' : v >= 20 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold'}>{v.toFixed(1)}%</span> },
  ];

  const totalBranchRevenue = branchData.reduce((acc, b) => acc + b.revenue, 0);
  const totalEbitda = branchData.reduce((acc, b) => acc + b.ebitda, 0);
  const totalMargin = totalBranchRevenue > 0 ? (totalEbitda / totalBranchRevenue) * 100 : 0;

  const metricTabs: { key: BranchMetric; label: string; activeColor: string }[] = [
    { key: 'revenue', label: 'Receita', activeColor: 'bg-[#1B75BB]' },
    { key: 'fixedCosts', label: 'Custos Fixos', activeColor: 'bg-[#EF4444]' },
    { key: 'variableCosts', label: 'Custos Variáveis', activeColor: 'bg-[#F59E0B]' },
    { key: 'sga', label: 'SG&A', activeColor: 'bg-[#8B5CF6]' },
    { key: 'ebitda', label: 'EBITDA', activeColor: 'bg-[#10B981]' },
  ];

  return (
    <section className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
              Desempenho por {drillLevel === 'cia' ? 'CIA' : 'Unidade'}
              <button
                onClick={() => setDrillLevel(drillLevel === 'cia' ? 'filial' : 'cia')}
                className="px-3 py-1 bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white rounded-lg text-[10px] font-bold uppercase tracking-tight hover:shadow-lg transition-all flex items-center gap-1"
              >
                {drillLevel === 'cia' ? 'Abrir Filial' : 'Voltar CIA'}
              </button>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                {monthLabels[monthRange.start]} - {monthLabels[monthRange.end]}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          {metricTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setBranchMetric(tab.key)}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
                branchMetric === tab.key
                  ? `${tab.activeColor} text-white shadow-md`
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ChartBlock id="branch-performance" type="chart" title="" subtitle="" chartType="bar" options={branchChartOptions} height={400} />
      </div>

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
              <span>EBITDA: <strong className="text-[#7AC5BF]">R$ {totalEbitda.toLocaleString('pt-BR')}</strong></span>
              <span>Margem: <strong className={totalMargin >= 25 ? 'text-emerald-600' : 'text-amber-600'}>{totalMargin.toFixed(1)}%</strong></span>
            </div>
          </div>
        }
      />
    </section>
  );
};
