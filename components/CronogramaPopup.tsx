import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, Users, CheckSquare } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import type { CronogramaItem } from '../services/supabaseService';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CronogramaPopupProps {
  onClose: () => void;
}

/** Extrai o primeiro dia numérico do date_label (ex: "11" → 11, "12-13" → 12) */
const getFirstDay = (label: string): number | null => {
  const trimmed = label.trim();
  if (!trimmed || trimmed.toLowerCase() === 'diário') return null;
  const rangeMatch = trimmed.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (rangeMatch) return parseInt(rangeMatch[1]);
  const day = parseInt(trimmed);
  return (!isNaN(day) && day >= 1 && day <= 31) ? day : null;
};

/** Extrai o último dia numérico do date_label (ex: "11" → 11, "12-13" → 13) */
const getLastDay = (label: string): number | null => {
  const trimmed = label.trim();
  if (!trimmed || trimmed.toLowerCase() === 'diário') return null;
  const rangeMatch = trimmed.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (rangeMatch) return parseInt(rangeMatch[2]);
  const day = parseInt(trimmed);
  return (!isNaN(day) && day >= 1 && day <= 31) ? day : null;
};

const CronogramaPopup: React.FC<CronogramaPopupProps> = ({ onClose }) => {
  const [items, setItems] = useState<CronogramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dontShowToday, setDontShowToday] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const today = now.getDate();

  useEffect(() => {
    supabaseService.getCronogramaItems(currentMonth, currentYear)
      .then(data => {
        if (data.length === 0) { onClose(); return; }
        setItems(data);
      })
      .catch(() => onClose())
      .finally(() => setLoading(false));
  }, [currentMonth, currentYear, onClose]);

  const tasks = useMemo(() => items.filter(i => i.item_type === 'task'), [items]);
  const meetings = useMemo(() => items.filter(i => i.item_type === 'meeting'), [items]);

  // Próxima entrega: a task cujo último dia >= hoje, com menor primeiro dia >= hoje
  // Se nenhuma entrega futura, pega a última do mês (ciclo visual)
  const nextDeliveryId = useMemo(() => {
    // Filtra tasks com data numérica (não "Diário")
    const dated = tasks
      .map(t => ({ id: t.id, first: getFirstDay(t.date_label), last: getLastDay(t.date_label) }))
      .filter((d): d is { id: string; first: number; last: number } => d.first !== null && d.last !== null);

    if (dated.length === 0) return null;

    // Entregas cujo último dia ainda não passou (last >= today)
    const upcoming = dated.filter(d => d.last >= today);

    if (upcoming.length > 0) {
      // Pega a mais próxima (menor first day)
      upcoming.sort((a, b) => a.first - b.first);
      return upcoming[0].id;
    }

    // Todas já passaram — não pulsar nenhuma (mês acabando)
    return null;
  }, [tasks, today]);

  // Unique areas for legend
  const areas = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => { if (i.area && !map.has(i.area)) map.set(i.area, i.area_color); });
    return Array.from(map.entries());
  }, [items]);

  // Map dia → itens para marcar no calendário
  const dayItemsMap = useMemo(() => {
    const map = new Map<number, { label: string; color: string; isNext: boolean }[]>();
    tasks.forEach(t => {
      const label = t.date_label.trim();
      if (!label || label.toLowerCase() === 'diário') return;
      const isNext = t.id === nextDeliveryId;
      const color = isNext ? '#F97316' : t.area_color;
      const rangeMatch = label.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
      if (rangeMatch) {
        const from = parseInt(rangeMatch[1]);
        const to = parseInt(rangeMatch[2]);
        for (let d = from; d <= to; d++) {
          if (!map.has(d)) map.set(d, []);
          map.get(d)!.push({ label: t.area, color, isNext });
        }
      } else {
        const day = parseInt(label);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          if (!map.has(day)) map.set(day, []);
          map.get(day)!.push({ label: t.area, color, isNext });
        }
      }
    });
    meetings.forEach(m => {
      if (!m.meeting_day) return;
      const day = parseInt(m.meeting_day);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({ label: 'Reunião', color: '#3B82F6', isNext: false });
      }
    });
    return map;
  }, [tasks, meetings, nextDeliveryId]);

  // Mini calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [currentMonth, currentYear]);

  // Tooltip por dia — textos reais das entregas/reuniões
  const dayTooltipMap = useMemo(() => {
    const map = new Map<number, string[]>();
    const addDay = (day: number, text: string) => {
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(text);
    };
    tasks.forEach(t => {
      const label = t.date_label.trim();
      if (!label || label.toLowerCase() === 'diário') return;
      const text = `${t.area}: ${t.deliverable}`;
      const rangeMatch = label.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
      if (rangeMatch) {
        for (let d = parseInt(rangeMatch[1]); d <= parseInt(rangeMatch[2]); d++) addDay(d, text);
      } else {
        const day = parseInt(label);
        if (!isNaN(day) && day >= 1 && day <= 31) addDay(day, text);
      }
    });
    meetings.forEach(m => {
      if (!m.meeting_day) return;
      const day = parseInt(m.meeting_day);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        addDay(day, `Reunião ${m.meeting_time || ''} — ${m.meeting_brand || ''}`);
      }
    });
    return map;
  }, [tasks, meetings]);

  const handleClose = () => {
    if (dontShowToday) {
      const key = `cronograma_dismissed_${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(today).padStart(2, '0')}`;
      localStorage.setItem(key, '1');
    }
    onClose();
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <>
    <style>{`
      @keyframes cronogramaPulse {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(249, 115, 22, 0.12); }
      }
      .cronograma-pulse-orange {
        animation: cronogramaPulse 1.8s ease-in-out infinite;
      }
      .crono-day-tip { position: relative; }
      .crono-day-tip .crono-tip {
        visibility: hidden; opacity: 0;
        position: absolute; bottom: calc(100% + 6px); left: 50%;
        transform: translateX(-50%); z-index: 20;
        background: #1f2937; color: #fff; font-size: 10px; line-height: 1.3;
        padding: 5px 8px; border-radius: 6px; white-space: nowrap;
        pointer-events: none; transition: opacity 0.15s ease, visibility 0.15s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      }
      .crono-day-tip .crono-tip::after {
        content: ''; position: absolute; top: 100%; left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent; border-top-color: #1f2937;
      }
      .crono-day-tip:hover .crono-tip { visibility: visible; opacity: 1; }
    `}</style>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — 1 linha compacta */}
        <div className="bg-[#1B75BB] px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="text-white/80" size={16} />
            <h2 className="text-white font-black text-sm tracking-wide">CRONOGRAMA FINANCEIRO — {MONTH_NAMES[currentMonth - 1].toUpperCase()} / {currentYear}</h2>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-3 space-y-3">
          {/* Mini calendar + Legend side by side */}
          <div className="flex gap-4 flex-wrap">
            {/* Mini calendar com marcadores */}
            <div className="bg-gray-50 rounded-xl p-3 min-w-[220px]">
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_HEADERS.map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const dayItems = day ? dayItemsMap.get(day) : undefined;
                  const isToday = day === today;
                  const hasNext = dayItems?.some(d => d.isNext);
                  const uniqueColors = dayItems ? [...new Set(dayItems.map(d => d.color))] : [];
                  const tooltipLines = day ? dayTooltipMap.get(day) : undefined;
                  return (
                    <div
                      key={i}
                      className={`relative flex flex-col items-center py-0.5 rounded ${tooltipLines ? 'crono-day-tip' : ''} ${
                        day === null ? '' :
                        isToday ? 'bg-[#1B75BB] text-white font-black' :
                        hasNext ? 'bg-orange-50 border border-orange-300 cronograma-pulse-orange' :
                        dayItems ? 'bg-white shadow-sm border border-gray-100' :
                        'text-gray-600'
                      }`}
                      style={{ minHeight: 30 }}
                    >
                      {tooltipLines && (
                        <div className="crono-tip">
                          {tooltipLines.map((line, li) => (
                            <div key={li}>{line}</div>
                          ))}
                        </div>
                      )}
                      <span className={`text-xs leading-none ${dayItems && !isToday ? 'font-bold text-gray-800' : ''}`}>
                        {day || ''}
                      </span>
                      {uniqueColors.length > 0 && (
                        <div className="flex gap-px mt-0.5 flex-wrap justify-center" style={{ maxWidth: 28 }}>
                          {uniqueColors.slice(0, 3).map((color, ci) => (
                            <span key={ci} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.8)' : color }} />
                          ))}
                          {uniqueColors.length > 3 && (
                            <span className="text-[7px] font-bold" style={{ color: isToday ? 'white' : '#999' }}>+</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            {areas.length > 0 && (
              <div className="flex-1 min-w-[180px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Áreas</p>
                <div className="flex flex-wrap gap-1">
                  {areas.map(([name, color]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: color + '20', color: color, border: `1px solid ${color}40` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tasks — ultra compacto */}
          {tasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <CheckSquare size={12} className="text-[#1B75BB]" />
                <h3 className="font-black text-[11px] text-gray-600 uppercase">Entregas ({tasks.length})</h3>
              </div>
              <div className="space-y-px">
                {tasks.map(t => {
                  const isNext = t.id === nextDeliveryId;
                  return (
                    <div key={t.id}
                      className={`flex items-start gap-1.5 px-2 py-[3px] rounded text-[11px] ${isNext ? 'cronograma-pulse-orange' : 'hover:bg-gray-50'}`}
                      style={{ borderLeft: `3px solid ${isNext ? '#F97316' : t.area_color}` }}>
                      <span className="font-mono font-bold text-gray-500 w-9 shrink-0 text-right leading-[18px]">{t.date_label}</span>
                      <span className="font-bold shrink-0 px-1 py-px rounded text-[10px] leading-[18px]"
                        style={{ backgroundColor: (isNext ? '#F97316' : t.area_color) + '18', color: isNext ? '#F97316' : t.area_color }}>
                        {t.area}
                      </span>
                      <span className="min-w-0">
                        <span className={`${isNext ? 'font-black text-orange-600' : 'text-gray-700'}`}>{t.deliverable}</span>
                        {t.action_description && (
                          <span className={`block text-[10px] leading-tight ${isNext ? 'text-orange-400' : 'text-gray-400'}`}>{t.action_description}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meetings table */}
          {meetings.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-[#1B75BB]" />
                <h3 className="font-black text-[11px] text-gray-600 uppercase">Reuniões ({meetings.length})</h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-400 w-10">Dia</th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-400 w-12">Hora</th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-400">Marca</th>
                      <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-400">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map(m => (
                      <tr key={m.id} className="border-t border-gray-50 hover:bg-blue-50/20">
                        <td className="px-2 py-1 font-mono text-[11px] font-bold text-gray-600">{m.meeting_day || '-'}</td>
                        <td className="px-2 py-1 text-[11px] text-gray-600">{m.meeting_time || '-'}</td>
                        <td className="px-2 py-1 text-[11px] text-gray-700 font-medium">{m.meeting_brand || '-'}</td>
                        <td className="px-2 py-1 text-[10px] text-gray-500">{m.meeting_obs || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-3 py-1.5 flex items-center justify-between bg-gray-50 shrink-0">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={dontShowToday} onChange={e => setDontShowToday(e.target.checked)} className="rounded border-gray-300 w-3.5 h-3.5" />
            Não mostrar hoje
          </label>
          <button onClick={handleClose} className="px-3 py-1 bg-[#1B75BB] text-white rounded-lg text-[11px] font-bold hover:bg-[#155a8a] transition-colors">
            Entendi
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default CronogramaPopup;
