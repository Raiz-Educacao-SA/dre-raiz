import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

// IMPORTANTE: Componente externo (fora de qualquer pai) para evitar
// re-criação a cada render do componente pai — preserva estado do dropdown.

interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (newSelection: string[]) => void;
  colorScheme: 'blue' | 'orange' | 'purple';
  compact?: boolean;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = React.memo(
  ({ label, icon, options, selected, onChange, colorScheme, compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef   = useRef<HTMLDivElement>(null);
    const searchRef   = useRef<HTMLInputElement>(null);

    const colors = {
      blue: {
        border: 'border-[#1B75BB]', borderLight: 'border-gray-100',
        bg: 'bg-[#1B75BB]', bgLight: 'bg-blue-50',
        text: 'text-[#1B75BB]', ring: 'ring-[#1B75BB]/10',
      },
      orange: {
        border: 'border-[#F44C00]', borderLight: 'border-gray-100',
        bg: 'bg-[#F44C00]', bgLight: 'bg-orange-50',
        text: 'text-[#F44C00]', ring: 'ring-[#F44C00]/10',
      },
      purple: {
        border: 'border-purple-600', borderLight: 'border-gray-100',
        bg: 'bg-purple-600', bgLight: 'bg-purple-50',
        text: 'text-purple-600', ring: 'ring-purple-600/10',
      },
    };

    const scheme       = colors[colorScheme];
    const hasSelection = selected.length > 0;

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
          setIsOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) =>
      onChange(selected.includes(option)
        ? selected.filter(i => i !== option)
        : [...selected, option]);

    const displayText = selected.length === 0
      ? 'TODAS'
      : selected.length === 1
      ? selected[0].toUpperCase()
      : `${selected.length} SELECIONADAS`;

    const handleToggle = () => {
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      setIsOpen(v => !v);
    };

    const filteredOptions = search.trim()
      ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
      : options;

    return (
      <div ref={dropdownRef} className="relative">
        {/* Botão */}
        <div
          ref={buttonRef}
          onClick={handleToggle}
          title={compact ? `${label}: ${displayText}` : undefined}
          className={`flex items-center bg-white rounded-lg border-2 shadow-sm
                     transition-all cursor-pointer hover:shadow-md
                     ${compact ? 'gap-1 px-2 py-1' : 'gap-2 px-3 py-1.5'}
                     ${hasSelection ? `${scheme.border} ring-4 ${scheme.ring}` : scheme.borderLight}`}
        >
          <div className={`rounded-lg ${compact ? 'p-1' : 'p-1.5'} ${hasSelection ? `${scheme.bg} text-white` : `${scheme.bgLight} ${scheme.text}`}`}>
            {icon}
          </div>
          {!compact && (
            <div className="flex flex-col justify-center">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">
                {label}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[10px] uppercase tracking-tight text-gray-900 min-w-[100px]">
                  {displayText}
                </span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          )}
          {compact && (
            <div className="flex items-center gap-1">
              <span className={`font-black text-[9px] uppercase tracking-tight min-w-[45px] ${hasSelection ? scheme.text : 'text-gray-500'}`}>
                {selected.length === 0 ? label.toUpperCase() : selected.length === 1 ? selected[0].substring(0, 8).toUpperCase() : `${label} ×${selected.length}`}
              </span>
              <ChevronDown size={10} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>

        {/* Dropdown — position:fixed para "explodir" fora do container */}
        {isOpen && (
          <div
            className="fixed bg-white rounded-md border border-gray-300 shadow-lg z-[9999]
                       w-[220px] max-h-[320px] overflow-hidden flex flex-col"
            style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-700">Selecione</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange(options)}
                  className="text-[10px] text-green-600 hover:text-green-800 font-medium"
                >
                  Todos
                </button>
                <span className="text-gray-300 text-[10px]">|</span>
                <button
                  onClick={() => onChange([])}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Busca */}
            {options.length > 6 && (
              <div className="px-2 py-1.5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                  <Search size={11} className="text-gray-400 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-[11px] text-gray-700 outline-none placeholder-gray-400 min-w-0"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-[10px] leading-none">✕</button>
                  )}
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="overflow-y-auto">
              {filteredOptions.map(option => {
                const isSel = selected.includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0
                               ${isSel ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{option}</span>
                      {isSel && <Check size={14} className="text-blue-600" />}
                    </div>
                  </div>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">
                  {search ? `Nenhum resultado para "${search}"` : 'Nenhuma opção'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MultiSelectFilter.displayName = 'MultiSelectFilter';

export default MultiSelectFilter;
