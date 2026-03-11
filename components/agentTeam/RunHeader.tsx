import React, { useMemo } from 'react';
import { Target, Users, Clock, Loader2, CheckCircle2, XCircle, RefreshCw, Play, Activity, StopCircle, Trash2, Flag, Building2, Layers, CalendarDays } from 'lucide-react';
import type { AgentRun, AgentStep } from '../../types/agentTeam';

// --------------------------------------------
// Props
// --------------------------------------------

interface RunHeaderProps {
  run: AgentRun;
  steps: AgentStep[];
  teamName: string;
  isAdmin: boolean;
  onContinue?: () => void;
  onRerun?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

// --------------------------------------------
// Agent colors
// --------------------------------------------

const AGENT_COLORS: Record<string, string> = {
  alex:     '#8b5cf6',
  carlos:   '#3b82f6',
  denilson: '#10b981',
  edmundo:  '#6366f1',
};

const AGENT_NAMES: Record<string, string> = {
  alex:     'Alex',
  carlos:   'Carlos',
  denilson: 'Denilson',
  edmundo:  'Edmundo',
};

// --------------------------------------------
// Status config
// --------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendente',   bg: 'bg-gray-100',  text: 'text-gray-600',  icon: <Clock size={12} /> },
  running:   { label: 'Executando', bg: 'bg-blue-100',  text: 'text-blue-700',  icon: <Loader2 size={12} className="animate-spin" /> },
  completed: { label: 'Concluído',  bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={12} /> },
  failed:    { label: 'Falhou',     bg: 'bg-red-100',   text: 'text-red-700',   icon: <XCircle size={12} /> },
  cancelled: { label: 'Cancelado',  bg: 'bg-gray-200',  text: 'text-gray-700',  icon: <XCircle size={12} /> },
};

// --------------------------------------------
// Helpers
// --------------------------------------------

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --------------------------------------------
// Filter Badges — exibe filtros aplicados no run
// --------------------------------------------

export function FilterBadges({ filterContext, size = 'normal' }: { filterContext: Record<string, unknown> | null; size?: 'normal' | 'compact' }) {
  if (!filterContext) return null;

  const marcas = filterContext.marcas as string[] | undefined;
  const filiais = filterContext.filiais as string[] | undefined;
  const tags01 = filterContext.tags01 as string[] | undefined;
  const months = filterContext.months_range as string | undefined;

  const hasSome = marcas?.length || filiais?.length || tags01?.length || (months && months !== 'Jan-Dez');
  if (!hasSome) return null;

  const isCompact = size === 'compact';
  const badgeBase = isCompact
    ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium'
    : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium';
  const iconSize = isCompact ? 9 : 11;

  return (
    <div className="flex flex-wrap gap-1">
      {marcas?.map(m => (
        <span key={m} className={`${badgeBase} bg-orange-50 text-orange-700 border border-orange-200`}>
          <Flag size={iconSize} />
          {m}
        </span>
      ))}
      {filiais?.map(f => (
        <span key={f} className={`${badgeBase} bg-blue-50 text-blue-700 border border-blue-200`}>
          <Building2 size={iconSize} />
          {f}
        </span>
      ))}
      {tags01?.map(t => (
        <span key={t} className={`${badgeBase} bg-purple-50 text-purple-700 border border-purple-200`}>
          <Layers size={iconSize} />
          {t}
        </span>
      ))}
      {months && months !== 'Jan-Dez' && (
        <span className={`${badgeBase} bg-sky-50 text-sky-700 border border-sky-200`}>
          <CalendarDays size={iconSize} />
          {months}
        </span>
      )}
    </div>
  );
}

// --------------------------------------------
// Component
// --------------------------------------------

const RunHeader: React.FC<RunHeaderProps> = ({ run, steps, teamName, isAdmin, onContinue, onRerun, onCancel, onDelete }) => {
  const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;

  const completedSteps = useMemo(
    () => steps.filter((s) => s.status === 'completed').length,
    [steps],
  );

  const overallPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  const isRunning = run.status === 'running';
  const hasPendingStep = steps.some((s) => s.status === 'pending');
  const hasRunningStep = steps.some((s) => s.status === 'running');
  const isStuck = isRunning && !hasRunningStep && hasPendingStep;

  const durationMs = useMemo(() => {
    if (!run.started_at) return 0;
    const start = new Date(run.started_at).getTime();
    const end = run.completed_at
      ? new Date(run.completed_at).getTime()
      : Date.now();
    return Math.max(0, end - start);
  }, [run.started_at, run.completed_at]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      {/* Row 1: Objective + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Target size={16} className="text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-sm font-semibold text-gray-900 leading-snug">{run.objective}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRunning && (
            <span className="text-sm font-bold text-blue-600 tabular-nums">{overallPct}%</span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Row 1.5: Filter badges */}
      <FilterBadges filterContext={run.filter_context} />

      {/* Row 2: Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Users size={12} className="text-gray-400" />
          {teamName}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={12} className="text-gray-400" />
          {run.started_by_name || run.started_by} — {formatDateTime(run.started_at)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Activity size={12} className="text-gray-400" />
          Progresso: <strong className="text-gray-700">{completedSteps}</strong> / {steps.length} steps
        </span>
        {durationMs > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} className="text-gray-400" />
            Duração: <strong className="text-gray-700">{formatDuration(durationMs)}</strong>
          </span>
        )}
      </div>

      {/* Progress bar — segmented by agent with labels */}
      {steps.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-100">
            {steps.map((s) => {
              const color = AGENT_COLORS[s.agent_code] || '#6b7280';
              const isStepCompleted = s.status === 'completed';
              const isStepRunning = s.status === 'running';
              const isStepFailed = s.status === 'failed';

              return (
                <div
                  key={s.id}
                  className="flex-1 relative transition-all duration-500"
                  title={`${AGENT_NAMES[s.agent_code] || s.agent_code} — ${s.status}`}
                  style={{
                    backgroundColor: isStepCompleted ? color :
                                     isStepFailed ? '#ef4444' :
                                     isStepRunning ? undefined : '#e5e7eb',
                  }}
                >
                  {isStepRunning && (
                    <>
                      <div
                        className="absolute inset-0 animate-pulse rounded-sm"
                        style={{ backgroundColor: color, opacity: 0.4 }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm transition-all duration-1000"
                        style={{
                          width: '60%',
                          backgroundColor: color,
                          animation: 'progressPulse 2s ease-in-out infinite',
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Agent name labels */}
          <div className="flex gap-0.5">
            {steps.map((s) => {
              const color = AGENT_COLORS[s.agent_code] || '#6b7280';
              const isStepCompleted = s.status === 'completed';
              const isStepRunning = s.status === 'running';
              return (
                <div key={s.id} className="flex-1 text-center">
                  <span
                    className={`text-[9px] font-medium ${
                      isStepCompleted ? 'opacity-100' :
                      isStepRunning ? 'opacity-100 font-bold' :
                      'opacity-40'
                    }`}
                    style={{ color: isStepCompleted || isStepRunning ? color : '#9ca3af' }}
                  >
                    {AGENT_NAMES[s.agent_code] || s.agent_code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions — admin only */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-1">
          {isStuck && onContinue && (
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Play size={12} />
              Continuar Pipeline
            </button>
          )}
          {onRerun && (
            <button
              onClick={onRerun}
              disabled={isRunning && hasRunningStep}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} />
              Reexecutar Pipeline
            </button>
          )}
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <StopCircle size={12} />
              Cancelar Análise
            </button>
          )}
          {!isRunning && onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} />
              Excluir Análise
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RunHeader;
