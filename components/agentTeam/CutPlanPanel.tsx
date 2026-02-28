import React, { useState } from 'react';
import { Scissors, ChevronDown, ChevronUp } from 'lucide-react';

// --------------------------------------------
// Types
// --------------------------------------------

interface ProposedAction {
  area: string;
  current_gap: number;
  suggested_cut: number;
  estimated_impact: number;
  priority: 'high' | 'medium' | 'low';
}

interface CutPlanData {
  gap: number;
  proposed_actions: ProposedAction[];
  projected_score_after_plan: number;
}

interface CutPlanPanelProps {
  data: CutPlanData | null;
  currentScore: number;
  loading?: boolean;
  onGenerate?: (targetScore: number) => void;
}

// --------------------------------------------
// Helpers
// --------------------------------------------

function priorityBadge(priority: string): string {
  if (priority === 'high') return 'bg-red-100 text-red-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

// --------------------------------------------
// Component
// --------------------------------------------

export default function CutPlanPanel({ data, currentScore, loading, onGenerate }: CutPlanPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [targetInput, setTargetInput] = useState('85');

  const handleGenerate = () => {
    const target = parseInt(targetInput, 10);
    if (target > 0 && target <= 100 && onGenerate) {
      onGenerate(target);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scissors size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-700">Plano de Corte</h3>
      </div>

      {/* Target input */}
      {onGenerate && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-gray-500">Score alvo:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      )}

      {/* No data */}
      {!data && !loading && (
        <p className="text-xs text-gray-400">
          Defina um score alvo e clique em Gerar.
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-[10px] text-gray-500 mb-1">Gap EBITDA</div>
              <div className="text-sm font-bold text-gray-800">
                {data.gap.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-[10px] text-gray-500 mb-1">Score Atual</div>
              <div className="text-sm font-bold text-gray-600">{currentScore}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-[10px] text-gray-500 mb-1">Score Projetado</div>
              <div className="text-sm font-bold text-emerald-600">{data.projected_score_after_plan}</div>
            </div>
          </div>

          {/* Actions toggle */}
          {data.proposed_actions.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
              >
                {expanded ? 'Ocultar ações' : `Ver ${data.proposed_actions.length} ações propostas`}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {expanded && (
                <div className="space-y-2">
                  {data.proposed_actions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-xs text-gray-400 font-mono w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-800 truncate">
                            {action.area}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityBadge(action.priority)}`}>
                            {action.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                          <span>Gap: {action.current_gap.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                          <span>Corte: {action.suggested_cut.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-indigo-600">{action.estimated_impact}%</div>
                        <div className="text-[10px] text-gray-400">impacto</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {data.proposed_actions.length === 0 && data.gap <= 0 && (
            <p className="text-xs text-emerald-600">Target já atingido. Nenhuma ação necessária.</p>
          )}
        </>
      )}
    </div>
  );
}
