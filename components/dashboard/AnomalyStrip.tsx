import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { AnomalyItem } from '../../hooks/useAnomalyDetection';
import { formatCurrency } from './KPICards';

interface AnomalyStripProps {
  anomalies: AnomalyItem[];
  onAnomalyClick?: (id: string) => void;
}

const severityStyles = {
  green: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
  amber: 'border-amber-200 bg-amber-50 hover:border-amber-400',
  red: 'border-red-200 bg-red-50 hover:border-red-400',
};

const severityDot = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const severityLabel = {
  green: 'OK',
  amber: 'Alerta',
  red: 'Crítico',
};

export const AnomalyStrip: React.FC<AnomalyStripProps> = ({ anomalies, onAnomalyClick }) => {
  if (anomalies.length === 0) {
    return (
      <section className="py-3" aria-label="Alertas de desempenho">
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">Todos os indicadores dentro do esperado</span>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2" aria-label="Alertas de desempenho">
      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <div className="h-4 w-1 bg-red-500 rounded-full"></div>
        Alertas de Desempenho
        <span className="text-[10px] font-bold text-gray-400">({anomalies.length} indicador{anomalies.length > 1 ? 'es' : ''})</span>
      </h3>
      <div className="relative">
        {/* Fade edges (match page bg) */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>

        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-300" role="list">
          {anomalies.map(item => (
            <button
              key={item.id}
              onClick={() => onAnomalyClick?.(item.id)}
              className={`flex-shrink-0 px-3 py-2.5 rounded-lg border-2 ${severityStyles[item.severity]} cursor-pointer hover:shadow-md transition-all min-w-[140px] text-left group`}
              title={`Clique para localizar "${item.label}" na seção de KPIs`}
              aria-label={`${item.label}: ${item.severity === 'red' ? 'desvio crítico' : 'desvio'} de ${Math.abs(item.deviationPercent).toFixed(1)}${item.isPercent ? 'pp' : '%'}`}
              role="listitem"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${severityDot[item.severity]}`}></div>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{item.label}</span>
                </div>
                <ChevronRight size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${
                  item.severity === 'red' ? 'text-red-700' :
                  item.severity === 'amber' ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {item.deviationPercent > 0 ? '+' : ''}{item.isPercent
                    ? `${item.deviationPercent.toFixed(1)}pp`
                    : `R$ ${formatCurrency(item.deviationAbsolute)}`
                  }
                </span>
                <span className={`text-[9px] font-bold uppercase ${
                  item.severity === 'red' ? 'text-red-500' :
                  item.severity === 'amber' ? 'text-amber-500' : 'text-emerald-500'
                }`}>{severityLabel[item.severity]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
