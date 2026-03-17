import React, { useEffect, useState } from 'react';
import { X, Clock, User, FileText, Sparkles, Loader2 } from 'lucide-react';
import { getSlideEditHistory, SlideVersionEdit } from '../services/supabaseService';

interface Props {
  versionId: string;
  versionLabel: string;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  '_created': 'Geração inicial',
  '_ai_regenerated': 'Regeneração IA',
  'executiveSummary': 'Sumário Executivo',
  'closingSummary': 'Sumário de Fechamento',
  'label': 'Nome da Versão',
};

function getFieldLabel(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  // sections[0].enrichedInsight → "Insight: RECEITA LÍQUIDA"
  const sectionMatch = path.match(/^section:(.+?)\.(.+)$/);
  if (sectionMatch) {
    const field = sectionMatch[2] === 'enrichedInsight' ? 'Insight' : 'Drivers';
    return `${field}: ${sectionMatch[1]}`;
  }
  return path;
}

function isSystemEdit(edit: SlideVersionEdit): boolean {
  return edit.field_path === '_created' || edit.field_path === '_ai_regenerated';
}

export default function SlideEditHistory({ versionId, versionLabel, onClose }: Props) {
  const [edits, setEdits] = useState<SlideVersionEdit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSlideEditHistory(versionId).then(data => {
      setEdits(data);
      setLoading(false);
    });
  }, [versionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600"><Clock size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Histórico de Edições</h3>
              <p className="text-[10px] text-gray-500 font-bold">{versionLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : edits.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">Nenhuma edição registrada</p>
          ) : (
            <div className="space-y-3">
              {edits.map(edit => (
                <div key={edit.id} className={`rounded-xl border p-3 ${isSystemEdit(edit) ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100'}`}>
                  {/* Header da edição */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isSystemEdit(edit) ? (
                        <Sparkles size={12} className="text-blue-500" />
                      ) : (
                        <User size={12} className="text-gray-400" />
                      )}
                      <span className="text-xs font-black text-gray-800">{edit.edited_by_name || edit.edited_by}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(edit.edited_at).toLocaleDateString('pt-BR')} {new Date(edit.edited_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Campo editado */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={10} className="text-purple-500" />
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wide">{getFieldLabel(edit.field_path)}</span>
                  </div>

                  {/* Valores */}
                  {!isSystemEdit(edit) && (
                    <div className="space-y-1">
                      {edit.old_value && (
                        <div className="bg-red-50 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-black text-red-400 uppercase">De:</span>
                          <p className="text-[11px] text-red-700 line-through mt-0.5 line-clamp-3">{edit.old_value}</p>
                        </div>
                      )}
                      {edit.new_value && (
                        <div className="bg-green-50 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-black text-green-400 uppercase">Para:</span>
                          <p className="text-[11px] text-green-700 mt-0.5 line-clamp-3">{edit.new_value}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isSystemEdit(edit) && edit.new_value && (
                    <p className="text-[11px] text-blue-600 font-medium">{edit.new_value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
