import React from 'react';
import { Flag, Building2, CalendarDays, RefreshCw } from 'lucide-react';
import MultiSelectFilter from '@/components/MultiSelectFilter';

interface CockpitHeaderProps {
  selectedMarca: string[];
  selectedFilial: string[];
  uniqueBrands: string[];
  availableBranches: string[];
  onMarcaChange: (brands: string[]) => void;
  onFilialChange: (branches: string[]) => void;
  comparisonMode: 'budget' | 'prevYear';
  onComparisonChange: (mode: 'budget' | 'prevYear') => void;
  selectedMonthStart: number;
  selectedMonthEnd: number;
  onMonthStartChange: (m: number) => void;
  onMonthEndChange: (m: number) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export const CockpitHeader: React.FC<CockpitHeaderProps> = ({
  selectedMarca, selectedFilial, uniqueBrands, availableBranches,
  onMarcaChange, onFilialChange,
  comparisonMode, onComparisonChange,
  selectedMonthStart, selectedMonthEnd,
  onMonthStartChange, onMonthEndChange,
  isRefreshing, onRefresh,
}) => {
  const periodPresets: { label: string; start: number; end: number }[] = [
    { label: 'Ano', start: 0, end: 11 },
    { label: '1T', start: 0, end: 2 },
    { label: '2T', start: 3, end: 5 },
    { label: '3T', start: 6, end: 8 },
    { label: '4T', start: 9, end: 11 },
  ];

  const isPresetActive = (p: { start: number; end: number }) =>
    selectedMonthStart === p.start && selectedMonthEnd === p.end;

  return (
    <header className="sticky top-0 z-40 bg-gray-50 -mx-3 md:-mx-4 lg:-mx-6 px-3 md:px-4 lg:px-6 pt-4 pb-4 border-b border-gray-200 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-[#F44C00] rounded-full"></div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Dashboard</h2>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight flex items-center gap-2 transition-all ${
                isRefreshing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#1B75BB] to-[#1557BB] text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MultiSelectFilter label="Marca" icon={<Flag size={14} />} options={uniqueBrands} selected={selectedMarca}
            onChange={(v) => { onMarcaChange(v); if (v.length > 0 && selectedFilial.length > 0) onFilialChange([]); }}
            colorScheme="blue" />
          <MultiSelectFilter label="Filial" icon={<Building2 size={14} />} options={availableBranches} selected={selectedFilial}
            onChange={onFilialChange} colorScheme="orange" />

          <div className="h-[52px] w-px bg-gray-300"></div>

          <div className="flex bg-white rounded-lg border-2 border-gray-200 shadow-sm h-[52px]">
            {(['budget', 'prevYear'] as const).map(mode => (
              <button key={mode} onClick={() => onComparisonChange(mode)}
                className={`px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all first:rounded-l-md last:rounded-r-md ${
                  comparisonMode === mode ? 'bg-[#1B75BB] text-white' : 'text-gray-400 hover:text-[#1B75BB] hover:bg-gray-50'
                }`}>
                vs {mode === 'budget' ? 'ORÇADO' : 'ANO ANT'}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 h-[52px]">
            {periodPresets.map(p => (
              <button key={p.label}
                onClick={() => { onMonthStartChange(p.start); onMonthEndChange(p.end); }}
                className={`px-3 h-full text-[10px] font-black uppercase rounded-lg transition-all border-2 ${
                  isPresetActive(p)
                    ? 'bg-[#1B75BB] text-white border-[#1B75BB] shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 h-[52px] rounded-lg shadow-sm">
            <CalendarDays size={14} className="text-[#F44C00]" />
            <div className="flex items-center gap-1.5">
              <select className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                value={selectedMonthStart}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  onMonthStartChange(v);
                  if (selectedMonthEnd < v) onMonthEndChange(v);
                }}>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <span className="text-xs text-gray-400 font-bold">até</span>
              <select className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                value={selectedMonthEnd}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  onMonthEndChange(v);
                  if (selectedMonthStart > v) onMonthStartChange(v);
                }}>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

