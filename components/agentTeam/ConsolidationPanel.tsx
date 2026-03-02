import React from 'react';
import { FileText, AlertTriangle, Target, Shield } from 'lucide-react';
import type { AgentRun, AgentStep, ConsolidationOutput, Recommendation } from '../../types/agentTeam';

// --------------------------------------------
// Props
// --------------------------------------------

interface ConsolidationPanelProps {
  run: AgentRun;
  consolidationStep?: AgentStep;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  low:    { bg: 'bg-gray-100',   text: 'text-gray-600' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:   { bg: 'bg-red-100',    text: 'text-red-700' },
};

function PriorityBadge({ level }: { level: string }) {
  const style = PRIORITY_STYLES[level] || PRIORITY_STYLES.low;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.bg} ${style.text}`}>
      {level}
    </span>
  );
}

function confidenceColor(value: number): string {
  if (value >= 80) return 'text-green-600';
  if (value >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

// --------------------------------------------
// Component
// --------------------------------------------

const ConsolidationPanel: React.FC<ConsolidationPanelProps> = ({ run, consolidationStep }) => {
  // Guard: só renderizar se tudo completo
  if (run.status !== 'completed') return null;
  if (!consolidationStep || consolidationStep.status !== 'completed') return null;
  if (!consolidationStep.output_data) return null;

  const data = consolidationStep.output_data as ConsolidationOutput;
  const confidence = data.confidence_level ?? 0;
  const conflicts = data.cross_agent_conflicts || [];
  const recommendations = data.final_recommendations || [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-900">Resumo Executivo Consolidado</h2>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-gray-400" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Confiança</span>
          <span className={`text-lg font-bold ${confidenceColor(confidence)}`}>
            {Math.round(confidence)}%
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Executive Summary */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
            <FileText size={12} className="text-indigo-500" />
            Síntese Executiva
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {data.consolidated_summary || '—'}
          </p>
        </section>

        {/* Conflicts */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
            <AlertTriangle size={12} className="text-amber-500" />
            Conflitos entre Agentes
          </h3>
          {conflicts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhum conflito relevante identificado.</p>
          ) : (
            <ul className="space-y-1">
              {conflicts.map((item: any, i) => {
                // item pode ser string ou objeto {conflict_description, resolution, agents_involved, ...}
                if (typeof item === 'string') {
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      {item}
                    </li>
                  );
                }
                const desc = item.conflict_description || item.description || item.resolution || JSON.stringify(item);
                const descStr = typeof desc === 'object' ? JSON.stringify(desc) : String(desc);
                return (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    <span>{descStr}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recommendations */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
            <Target size={12} className="text-green-500" />
            Recomendações Finais ({recommendations.length})
          </h3>
          {recommendations.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhuma recomendação gerada.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.map((r: Recommendation, i: number) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PriorityBadge level={r.priority || 'low'} />
                    <span className="text-xs font-semibold text-gray-900">{r.area || '—'}</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{r.action || '—'}</p>
                  {r.expected_impact && (
                    <p className="text-[10px] text-gray-500">
                      Impacto esperado: {r.expected_impact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConsolidationPanel;
