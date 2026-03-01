import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, RotateCcw, ThumbsUp, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import type { AgentStep } from '../../types/agentTeam';
import OutputRenderer from './OutputRenderer';

// --------------------------------------------
// Props
// --------------------------------------------

interface AgentWorkstationProps {
  step: AgentStep;
  totalSteps: number;
  isAdmin: boolean;
  onReview: (stepId: string, action: 'approved' | 'revision_requested', comment: string) => void;
  onRerun: (stepId: string) => void;
}

// --------------------------------------------
// Agent display config
// --------------------------------------------

const AGENT_DISPLAY: Record<string, { name: string; color: string; role: string; avgSeconds: number }> = {
  alex:     { name: 'Alex',     color: '#8b5cf6', role: 'Supervisor Estratégico',      avgSeconds: 25 },
  bruna:    { name: 'Bruna',    color: '#f59e0b', role: 'Qualidade de Dados',          avgSeconds: 20 },
  carlos:   { name: 'Carlos',   color: '#3b82f6', role: 'Performance Financeira',      avgSeconds: 22 },
  denilson: { name: 'Denilson', color: '#10b981', role: 'Otimização',                  avgSeconds: 25 },
  edmundo:  { name: 'Edmundo',  color: '#6366f1', role: 'Forecast & Tendências',       avgSeconds: 20 },
  falcao:   { name: 'Falcão',   color: '#ef4444', role: 'Risco & Supervisão',          avgSeconds: 22 },
  diretor:  { name: 'Diretor',  color: '#475569', role: 'Comitê Executivo',            avgSeconds: 28 },
  ceo:      { name: 'CEO',      color: '#1e293b', role: 'Desafio Executivo',           avgSeconds: 30 },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: 'Pendente',   bg: 'bg-gray-100',  text: 'text-gray-600'  },
  running:   { label: 'Executando', bg: 'bg-blue-100',  text: 'text-blue-700'  },
  completed: { label: 'Concluído',  bg: 'bg-green-100', text: 'text-green-700' },
  failed:    { label: 'Falhou',     bg: 'bg-red-100',   text: 'text-red-700'   },
};

const REVIEW_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:              { label: 'Aguardando revisão', bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  approved:             { label: 'Aprovado',           bg: 'bg-green-50',   text: 'text-green-700' },
  revision_requested:   { label: 'Revisão solicitada', bg: 'bg-orange-50',  text: 'text-orange-700' },
};

const STEP_TYPE_LABELS: Record<string, string> = {
  plan: 'Planejamento',
  execute: 'Execução',
  consolidate: 'Consolidação',
  review: 'Revisão Executiva',
};

// --------------------------------------------
// Progress Bar Hook
// --------------------------------------------

function useProgressBar(isRunning: boolean, avgSeconds: number): number {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();
    setProgress(0);

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Asymptotic curve: approaches 95% using 1 - e^(-t/avg)
      // Never reaches 100% until actually completed
      const pct = Math.min(95, (1 - Math.exp(-elapsed / (avgSeconds * 0.6))) * 100);
      setProgress(Math.round(pct));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, avgSeconds]);

  return progress;
}

// --------------------------------------------
// Component
// --------------------------------------------

const AgentWorkstation: React.FC<AgentWorkstationProps> = ({ step, totalSteps, isAdmin, onReview, onRerun }) => {
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);

  const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const reviewCfg = REVIEW_CONFIG[step.review_status] || REVIEW_CONFIG.pending;
  const agentCfg = AGENT_DISPLAY[step.agent_code] || {
    name: step.agent_code, color: '#6b7280', role: step.step_type, avgSeconds: 20,
  };

  const isRunning = step.status === 'running';
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';
  const isPending = step.status === 'pending';

  const progress = useProgressBar(isRunning, agentCfg.avgSeconds);

  const handleApprove = () => {
    onReview(step.id, 'approved', reviewComment);
    setReviewComment('');
    setShowReviewInput(false);
  };

  const handleRequestRevision = () => {
    if (!showReviewInput) {
      setShowReviewInput(true);
      return;
    }
    onReview(step.id, 'revision_requested', reviewComment);
    setReviewComment('');
    setShowReviewInput(false);
  };

  // Color utilities
  const agentColor = agentCfg.color;
  const progressBarBg = isCompleted ? '#22c55e' : isFailed ? '#ef4444' : agentColor;

  return (
    <div className={`bg-white rounded-lg border overflow-hidden transition-all ${
      isRunning ? 'border-blue-300 shadow-sm shadow-blue-100' :
      isCompleted ? 'border-green-200' :
      isFailed ? 'border-red-200' :
      'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Avatar circle with agent color */}
          <span
            className="w-7 h-7 flex items-center justify-center rounded-full text-white font-bold text-[11px]"
            style={{ backgroundColor: agentColor }}
          >
            {agentCfg.name.charAt(0)}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{agentCfg.name}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                {STEP_TYPE_LABELS[step.step_type] || step.step_type}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">{agentCfg.role}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Step counter */}
          <span className="text-[10px] text-gray-400 font-mono">
            {step.step_order}/{totalSteps}
          </span>

          {/* Duration */}
          {step.duration_ms > 0 && (
            <span className="text-[10px] text-gray-400">
              {(step.duration_ms / 1000).toFixed(1)}s
            </span>
          )}

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.text}`}>
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agentColor }} />
            )}
            {isCompleted && <CheckCircle2 size={10} />}
            {isFailed && <XCircle size={10} />}
            {isPending && <Clock size={10} />}
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Progress Bar — always visible */}
      <div className="relative h-2 bg-gray-100">
        <div
          className="absolute inset-y-0 left-0 rounded-r-full transition-all duration-500 ease-out"
          style={{
            width: isCompleted ? '100%' : isFailed ? '100%' : isPending ? '0%' : `${progress}%`,
            backgroundColor: progressBarBg,
            opacity: isPending ? 0 : 1,
          }}
        />
        {/* Glow effect when running */}
        {isRunning && (
          <div
            className="absolute inset-y-0 left-0 rounded-r-full animate-pulse opacity-30"
            style={{
              width: `${Math.min(progress + 5, 100)}%`,
              backgroundColor: agentColor,
            }}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Running — progress info */}
        {isRunning && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: agentColor }}
              />
              <span className="text-xs text-gray-600">
                {progress < 20 ? 'Iniciando análise...' :
                 progress < 50 ? 'Processando dados...' :
                 progress < 75 ? 'Gerando insights...' :
                 'Finalizando...'}
              </span>
            </div>
            <span className="text-sm font-bold tabular-nums" style={{ color: agentColor }}>
              {progress}%
            </span>
          </div>
        )}

        {/* Pending */}
        {isPending && (
          <p className="text-xs text-gray-400">Aguardando steps anteriores...</p>
        )}

        {/* Failed */}
        {isFailed && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{step.error_message || 'Erro desconhecido'}</span>
          </div>
        )}

        {/* Completed — output */}
        {isCompleted && step.output_data && (
          <OutputRenderer step={step} />
        )}

        {/* Tokens info */}
        {isCompleted && (step.tokens_input > 0 || step.tokens_output > 0) && (
          <div className="mt-2 text-[10px] text-gray-400">
            Tokens: {step.tokens_input.toLocaleString('pt-BR')} in / {step.tokens_output.toLocaleString('pt-BR')} out
            {step.model_used && <span className="ml-2">({step.model_used})</span>}
          </div>
        )}
      </div>

      {/* Review + Actions */}
      {isCompleted && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          {/* Review status */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${reviewCfg.bg} ${reviewCfg.text}`}>
              {reviewCfg.label}
            </span>

            {step.reviewed_by && (
              <span className="text-[10px] text-gray-400">por {step.reviewed_by}</span>
            )}
          </div>

          {step.review_comment && (
            <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">{step.review_comment}</p>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <ThumbsUp size={12} />
                Aprovar
              </button>

              <button
                onClick={handleRequestRevision}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <MessageSquareWarning size={12} />
                Solicitar Revisão
              </button>

              <button
                onClick={() => onRerun(step.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <RotateCcw size={12} />
                Reexecutar
              </button>
            </div>
          )}

          {showReviewInput && (
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Comentário da revisão..."
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          )}
        </div>
      )}

      {/* Rerun for failed steps */}
      {isAdmin && isFailed && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={() => onRerun(step.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <RotateCcw size={12} />
            Reexecutar
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentWorkstation;
