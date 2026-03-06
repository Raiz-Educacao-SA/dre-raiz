import React, { useState, useRef, useEffect } from 'react';
import { Flag, Building2, CalendarDays, Check, ChevronDown, RefreshCw } from 'lucide-react';

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

// ─── MultiSelectFilter (extracted from Dashboard.tsx) ──────────────
interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  colorScheme: 'blue' | 'orange';
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ label, icon, options, selected, onChange, colorScheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = {
    blue: { border: 'border-[#1B75BB]', borderLight: 'border-gray-100', bg: 'bg-[#1B75BB]', bgLight: 'bg-blue-50', text: 'text-[#1B75BB]', ring: 'ring-[#1B75BB]/10' },
    orange: { border: 'border-[#F44C00]', borderLight: 'border-gray-100', bg: 'bg-[#F44C00]', bgLight: 'bg-orange-50', text: 'text-[#F44C00]', ring: 'ring-[#F44C00]/10' },
  };
  const scheme = colors[colorScheme];
  const hasSelection = selected.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayText = selected.length === 0 ? 'TODAS' : selected.length === 1 ? selected[0].toUpperCase() : `${selected.length} SELECIONADAS`;

  return (
    <div ref={dropdownRef} className="relative">
      <div onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white px-4 h-[52px] rounded-lg border-2 shadow-sm transition-all cursor-pointer hover:shadow-md ${
          hasSelection ? `${scheme.border} ring-4 ${scheme.ring}` : scheme.borderLight
        }`}>
        <div className={`p-1.5 rounded-lg ${hasSelection ? `${scheme.bg} text-white` : `${scheme.bgLight} ${scheme.text}`}`}>{icon}</div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-[10px] uppercase tracking-tight text-gray-900 min-w-[120px]">{displayText}</span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border-2 border-gray-200 shadow-xl z-50 min-w-[240px] max-h-[400px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-gray-100 flex gap-2">
            <button onClick={() => onChange(options)} className="flex-1 px-2 py-1.5 text-[10px] font-black uppercase bg-gray-100 hover:bg-gray-200 rounded transition-all">Selecionar Todas</button>
            <button onClick={() => onChange([])} className="flex-1 px-2 py-1.5 text-[10px] font-black uppercase bg-gray-100 hover:bg-gray-200 rounded transition-all">Limpar</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <label key={option} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? `${scheme.border} ${scheme.bg}` : 'border-gray-300'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={isSelected} onChange={() => onChange(isSelected ? selected.filter(i => i !== option) : [...selected, option])} className="sr-only" />
                  <span className="text-xs font-bold text-gray-900">{option}</span>
                </label>
              );
            })}
          </div>
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <span className="text-[10px] font-bold text-gray-600">{selected.length} de {options.length} selecionada(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};
