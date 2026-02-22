import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// IMPORTANTE: Componente externo (fora de qualquer pai) para evitar
// re-criação a cada render do componente pai — preserva estado do dropdown.

interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (newSelection: string[]) => void;
  colorScheme: 'blue' | 'orange' | 'purple';
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = React.memo(
  ({ label, icon, options, selected, onChange, colorScheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef  = useRef<HTMLDivElement>(null);

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
      }
      setIsOpen(v => !v);
    };

    return (
      <div ref={dropdownRef} className="relative">
        {/* Botão */}
        <div
          ref={buttonRef}
          onClick={handleToggle}
          className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-2 shadow-sm
                     transition-all cursor-pointer hover:shadow-md
                     ${hasSelection ? `${scheme.border} ring-4 ${scheme.ring}` : scheme.borderLight}`}
        >
          <div className={`p-1.5 rounded-lg ${hasSelection ? `${scheme.bg} text-white` : `${scheme.bgLight} ${scheme.text}`}`}>
            {icon}
          </div>
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

            {/* Lista */}
            <div className="overflow-y-auto">
              {options.map(option => {
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
              {options.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">Nenhuma opção</div>
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
