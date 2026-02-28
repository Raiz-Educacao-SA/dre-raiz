import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, RotateCcw, ThumbsUp, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import type { AgentStep } from '../../types/agentTeam';
import OutputRenderer from './OutputRenderer';

// --------------------------------------------
// Props
// --------------------------------------------

interface AgentWorkstationProps {
  step: AgentStep;
  isAdmin: boolean;
  onReview: (stepId: string, action: 'approved' | 'revision_requested', comment: string) => void;
  onRerun: (stepId: string) => void;
}

// --------------------------------------------
// Status config
// --------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendente',   bg: 'bg-gray-100',  text: 'text-gray-600',  icon: <Clock size={10} /> },
  running:   { label: 'Executando', bg: 'bg-blue-100',  text: 'text-blue-700',  icon: <Loader2 size={10} className="animate-spin" /> },
  completed: { label: 'Concluído',  bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={10} /> },
  failed:    { label: 'Falhou',     bg: 'bg-red-100',   text: 'text-red-700',   icon: <XCircle size={10} /> },
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
};

// --------------------------------------------
// Component
// --------------------------------------------

const AgentWorkstation: React.FC<AgentWorkstationProps> = ({ step, isAdmin, onReview, onRerun }) => {
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewInput, setShowReviewInput] = useState(false);

  const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const reviewCfg = REVIEW_CONFIG[step.review_status] || REVIEW_CONFIG.pending;

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold text-[10px]">
            {step.step_order}
          </span>
          <div>
            <span className="text-sm font-bold text-gray-900 capitalize">{step.agent_code}</span>
            <span className="text-[10px] text-gray-400 ml-2 uppercase tracking-wide">
              {STEP_TYPE_LABELS[step.step_type] || step.step_type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration */}
          {step.duration_ms > 0 && (
            <span className="text-[10px] text-gray-400">
              {(step.duration_ms / 1000).toFixed(1)}s
            </span>
          )}

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Running */}
        {step.status === 'running' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            <span>Processando análise...</span>
          </div>
        )}

        {/* Pending */}
        {step.status === 'pending' && (
          <p className="text-xs text-gray-400">Aguardando steps anteriores...</p>
        )}

        {/* Failed */}
        {step.status === 'failed' && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{step.error_message || 'Erro desconhecido'}</span>
          </div>
        )}

        {/* Completed — output */}
        {step.status === 'completed' && step.output_data && (
          <OutputRenderer step={step} />
        )}

        {/* Tokens info */}
        {step.status === 'completed' && (step.tokens_input > 0 || step.tokens_output > 0) && (
          <div className="mt-2 text-[10px] text-gray-400">
            Tokens: {step.tokens_input.toLocaleString('pt-BR')} in / {step.tokens_output.toLocaleString('pt-BR')} out
            {step.model_used && <span className="ml-2">({step.model_used})</span>}
          </div>
        )}
      </div>

      {/* Review + Actions */}
      {step.status === 'completed' && (
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
              {/* Approve */}
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
              >
                <ThumbsUp size={12} />
                Aprovar
              </button>

              {/* Request revision */}
              <button
                onClick={handleRequestRevision}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <MessageSquareWarning size={12} />
                Solicitar Revisão
              </button>

              {/* Rerun */}
              <button
                onClick={() => onRerun(step.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <RotateCcw size={12} />
                Reexecutar
              </button>
            </div>
          )}

          {/* Revision comment input */}
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
      {isAdmin && step.status === 'failed' && (
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
