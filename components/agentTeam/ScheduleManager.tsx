import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Clock,
  ChevronDown,
  Loader2,
  X,
  Save,
} from 'lucide-react';
import type { AgentSchedule, ScheduleFrequency, Team } from '../../types/agentTeam';
import { validateScheduleConfig } from '../../core/scheduleEngine';
import { useAuth } from '../../contexts/AuthContext';
import * as agentTeamService from '../../services/agentTeamService';

// --------------------------------------------
// Constants
// --------------------------------------------

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

// --------------------------------------------
// Component
// --------------------------------------------

interface ScheduleManagerProps {
  teams: Team[];
  selectedTeamId: string;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ teams, selectedTeamId }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    objective_template: '',
    frequency: 'daily' as ScheduleFrequency,
    execution_time: '08:00',
    timezone: 'America/Sao_Paulo',
    day_of_week: 1,
    day_of_month: 1,
    team_id: selectedTeamId,
  });

  // Load schedules
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    const data = await agentTeamService.getSchedules(selectedTeamId || undefined);
    setSchedules(data);
    setLoading(false);
  }, [selectedTeamId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Sync team_id in form when selectedTeamId changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, team_id: selectedTeamId }));
  }, [selectedTeamId]);

  // Create schedule
  const handleCreate = useCallback(async () => {
    setError(null);

    // Validate via core
    const validationErrors = validateScheduleConfig({
      frequency: formData.frequency,
      execution_time: formData.execution_time,
      timezone: formData.timezone,
      day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : undefined,
      day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : undefined,
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (!formData.objective_template.trim()) {
      setError('Template de objetivo é obrigatório');
      return;
    }
    if (!formData.team_id) {
      setError('Selecione um time');
      return;
    }

    setSaving(true);
    try {
      await agentTeamService.createSchedule({
        name: formData.name.trim(),
        objective_template: formData.objective_template.trim(),
        frequency: formData.frequency,
        execution_time: formData.execution_time,
        timezone: formData.timezone,
        day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : null,
        day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : null,
        is_active: true,
        team_id: formData.team_id,
        filter_context: null,
        created_by: user?.email ?? null,
      });

      setShowForm(false);
      setFormData({
        name: '',
        objective_template: '',
        frequency: 'daily',
        execution_time: '08:00',
        timezone: 'America/Sao_Paulo',
        day_of_week: 1,
        day_of_month: 1,
        team_id: selectedTeamId,
      });
      loadSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar schedule';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [formData, selectedTeamId, loadSchedules]);

  // Toggle active/inactive
  const handleToggle = useCallback(async (schedule: AgentSchedule) => {
    setTogglingId(schedule.id);
    try {
      await agentTeamService.updateSchedule(schedule.id, { is_active: !schedule.is_active });
      loadSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(msg);
    } finally {
      setTogglingId(null);
    }
  }, [loadSchedules]);

  // Delete schedule
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await agentTeamService.deleteSchedule(id);
      loadSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }, [loadSchedules]);

  // Format schedule description
  const formatScheduleDesc = (s: AgentSchedule): string => {
    const freq = FREQUENCY_LABELS[s.frequency] || s.frequency;
    let desc = `${freq} às ${s.execution_time}`;
    if (s.frequency === 'weekly' && s.day_of_week !== null) {
      const day = DAYS_OF_WEEK.find((d) => d.value === s.day_of_week);
      desc += ` (${day?.label ?? s.day_of_week})`;
    }
    if (s.frequency === 'monthly' && s.day_of_month !== null) {
      desc += ` (dia ${s.day_of_month})`;
    }
    return desc;
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          Agendamentos
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-white transition-all"
          style={{ backgroundColor: showForm ? '#9CA3AF' : 'var(--color-primary-500)' }}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancelar' : 'Novo'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg p-4 space-y-3">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Análise Diária Matinal"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Team */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Time</label>
            <div className="relative">
              <select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Selecione...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Objective template */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
              Template de objetivo
              <span className="text-gray-400 font-normal ml-1">{'(use {{year}}, {{current_month}}, {{current_date}})'}</span>
            </label>
            <textarea
              value={formData.objective_template}
              onChange={(e) => setFormData({ ...formData, objective_template: e.target.value })}
              placeholder="Analisar performance do DRE {{year}} com foco no mês {{current_month}}"
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Frequency + Time row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Frequency */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Frequência</label>
              <div className="relative">
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ScheduleFrequency })}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Execution time */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Horário</label>
              <input
                type="time"
                value={formData.execution_time}
                onChange={(e) => setFormData({ ...formData, execution_time: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Conditional: day of week or day of month */}
            <div>
              {formData.frequency === 'weekly' && (
                <>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Dia da semana</label>
                  <div className="relative">
                    <select
                      value={formData.day_of_week}
                      onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value, 10) })}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </>
              )}
              {formData.frequency === 'monthly' && (
                <>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Dia do mês</label>
                  <div className="relative">
                    <select
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value, 10) })}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </>
              )}
              {formData.frequency === 'daily' && (
                <div className="flex items-end h-full pb-2">
                  <span className="text-[10px] text-gray-400">Todos os dias</span>
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary-500)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Criar Agendamento
            </button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400">
          Nenhum agendamento configurado
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => {
            const team = teams.find((t) => t.id === s.team_id);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                  s.is_active
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{s.name}</span>
                    {team && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold uppercase">
                        {team.name}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {s.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Clock size={10} />
                      {formatScheduleDesc(s)}
                    </span>
                    {s.next_run_at && (
                      <span className="text-[10px] text-gray-400">
                        Próxima: {new Date(s.next_run_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                    {s.last_run_at && (
                      <span className="text-[10px] text-gray-400">
                        Última: {new Date(s.last_run_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {s.objective_template}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => handleToggle(s)}
                    disabled={togglingId === s.id}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50"
                    title={s.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {togglingId === s.id ? (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    ) : s.is_active ? (
                      <PowerOff size={14} className="text-orange-500" />
                    ) : (
                      <Power size={14} className="text-green-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                    title="Excluir"
                  >
                    {deletingId === s.id ? (
                      <Loader2 size={14} className="animate-spin text-red-400" />
                    ) : (
                      <Trash2 size={14} className="text-red-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
