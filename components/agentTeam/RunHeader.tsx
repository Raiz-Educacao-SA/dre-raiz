import React, { useMemo } from 'react';
import { Target, Users, Clock, Loader2, CheckCircle2, XCircle, RefreshCw, Play, Activity } from 'lucide-react';
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
}

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
// Component
// --------------------------------------------

const RunHeader: React.FC<RunHeaderProps> = ({ run, steps, teamName, isAdmin, onContinue, onRerun }) => {
  const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;

  // 1. Progresso
  const completedSteps = useMemo(
    () => steps.filter((s) => s.status === 'completed').length,
    [steps],
  );

  // 2. Pipeline travado
  const isRunning = run.status === 'running';
  const hasPendingStep = steps.some((s) => s.status === 'pending');
  const hasRunningStep = steps.some((s) => s.status === 'running');
  const isStuck = isRunning && !hasRunningStep && hasPendingStep;

  // 3. Duração
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
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </span>
      </div>

      {/* Row 2: Meta — grid 2 cols on desktop */}
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

      {/* Progress bar */}
      {steps.length > 0 && (
        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
          {steps.map((s) => (
            <div
              key={s.id}
              className={`flex-1 rounded-full transition-colors ${
                s.status === 'completed' ? 'bg-green-400' :
                s.status === 'running' ? 'bg-blue-400 animate-pulse' :
                s.status === 'failed' ? 'bg-red-400' :
                'bg-gray-200'
              }`}
            />
          ))}
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
        </div>
      )}
    </div>
  );
};

export default RunHeader;
