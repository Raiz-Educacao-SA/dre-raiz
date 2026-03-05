import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, Users, CheckSquare } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import type { CronogramaItem } from '../services/supabaseService';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CronogramaPopupProps {
  onClose: () => void;
}

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
        if (data.length === 0) {
          onClose();
          return;
        }
        setItems(data);
      })
      .catch(() => onClose())
      .finally(() => setLoading(false));
  }, [currentMonth, currentYear, onClose]);

  const tasks = useMemo(() => items.filter(i => i.item_type === 'task'), [items]);
  const meetings = useMemo(() => items.filter(i => i.item_type === 'meeting'), [items]);

  // Unique areas for legend
  const areas = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => { if (i.area && !map.has(i.area)) map.set(i.area, i.area_color); });
    return Array.from(map.entries());
  }, [items]);

  // Mini calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [currentMonth, currentYear]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1B75BB] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="text-white/80" size={22} />
            <div>
              <h2 className="text-white font-black text-lg tracking-wide">CRONOGRAMA FINANCEIRO</h2>
              <p className="text-blue-100 text-sm font-medium">{MONTH_NAMES[currentMonth - 1].toUpperCase()} / {currentYear}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Mini calendar + Legend side by side */}
          <div className="flex gap-5 flex-wrap">
            {/* Mini calendar */}
            <div className="bg-gray-50 rounded-xl p-3 min-w-[220px]">
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_HEADERS.map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`text-xs py-1 rounded ${
                      day === null ? '' :
                      day === today ? 'bg-[#1B75BB] text-white font-black' :
                      'text-gray-600'
                    }`}
                  >
                    {day || ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            {areas.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Legenda de Áreas</p>
                <div className="flex flex-wrap gap-2">
                  {areas.map(([name, color]) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: color + '20', color: color, border: `1px solid ${color}40` }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tasks table */}
          {tasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare size={16} className="text-[#1B75BB]" />
                <h3 className="font-black text-sm text-gray-800 uppercase">Tarefas / Entregas</h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-16">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-28">Área</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Entregável</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                        <td className="px-3 py-2 font-mono text-xs font-bold text-gray-700">{t.date_label}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: t.area_color + '20', color: t.area_color }}
                          >
                            {t.area}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{t.deliverable}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{t.action_description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Meetings table */}
          {meetings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-[#1B75BB]" />
                <h3 className="font-black text-sm text-gray-800 uppercase">Reuniões</h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-16">Dia</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-16">Hora</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Marca</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map(m => (
                      <tr key={m.id} className="border-t border-gray-100 hover:bg-blue-50/30">
                        <td className="px-3 py-2 font-mono text-xs font-bold text-gray-700">{m.meeting_day || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" />
                          {m.meeting_time || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700 font-medium">{m.meeting_brand || '-'}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{m.meeting_obs || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between bg-gray-50 shrink-0">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={e => setDontShowToday(e.target.checked)}
              className="rounded border-gray-300"
            />
            Não mostrar hoje
          </label>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-[#1B75BB] text-white rounded-lg text-sm font-bold hover:bg-[#155a8a] transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default CronogramaPopup;
