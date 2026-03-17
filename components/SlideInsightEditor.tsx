import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Clock, User, Sparkles, History } from 'lucide-react';
import type { VariancePptData } from '../services/variancePptTypes';
import { updateSlideVersion, saveSlideEdits, getSlideEditHistory, SlideVersionEdit } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  versionId: string;
  data: VariancePptData;
  onClose: () => void;
  onSaved: (updatedData: VariancePptData) => void;
  onShowHistory: () => void;
}

interface EditableField {
  key: string;
  label: string;
  path: string;        // para audit trail
  value: string;
  original: string;    // para comparar diff
}

function getLastEdit(edits: SlideVersionEdit[], path: string): SlideVersionEdit | undefined {
  return edits.find(e => e.field_path === path && e.field_path !== '_created');
}

export default function SlideInsightEditor({ versionId, data, onClose, onSaved, onShowHistory }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [recentEdits, setRecentEdits] = useState<SlideVersionEdit[]>([]);

  // Build editable fields from data
  const buildFields = (): EditableField[] => {
    const fields: EditableField[] = [];

    // Sumário Executivo
    fields.push({
      key: 'executiveSummary',
      label: 'Sumário Executivo',
      path: 'executiveSummary',
      value: data.executiveSummary || '',
      original: data.executiveSummary || '',
    });

    // Insights por seção (tag0)
    data.sections.forEach(section => {
      if (section.node.enrichedInsight) {
        fields.push({
          key: `section:${section.tag0}.enrichedInsight`,
          label: `Insight: ${section.label}`,
          path: `section:${section.tag0}.enrichedInsight`,
          value: section.node.enrichedInsight,
          original: section.node.enrichedInsight,
        });
      }

      // Drivers por seção
      if (section.node.enrichedDrivers && section.node.enrichedDrivers.length > 0) {
        fields.push({
          key: `section:${section.tag0}.enrichedDrivers`,
          label: `Drivers: ${section.label}`,
          path: `section:${section.tag0}.enrichedDrivers`,
          value: section.node.enrichedDrivers.join('\n'),
          original: section.node.enrichedDrivers.join('\n'),
        });
      }
    });

    // Sumário de Fechamento
    fields.push({
      key: 'closingSummary',
      label: 'Sumário de Fechamento',
      path: 'closingSummary',
      value: data.closingSummary || '',
      original: data.closingSummary || '',
    });

    return fields;
  };

  const [fields, setFields] = useState<EditableField[]>(buildFields);

  // Carregar últimas edições para mostrar badge
  useEffect(() => {
    getSlideEditHistory(versionId).then(setRecentEdits);
  }, [versionId]);

  const updateField = (key: string, newValue: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, value: newValue } : f));
  };

  const changedFields = fields.filter(f => f.value !== f.original);
  const hasChanges = changedFields.length > 0;

  const handleSave = async () => {
    if (!hasChanges || !user) return;
    setSaving(true);

    try {
      // Apply changes to a copy of ppt_data
      const updated = JSON.parse(JSON.stringify(data)) as VariancePptData;

      for (const field of changedFields) {
        if (field.key === 'executiveSummary') {
          updated.executiveSummary = field.value;
        } else if (field.key === 'closingSummary') {
          updated.closingSummary = field.value;
        } else if (field.key.startsWith('section:')) {
          const match = field.key.match(/^section:(.+?)\.(.+)$/);
          if (match) {
            const sectionTag0 = match[1];
            const fieldName = match[2];
            const section = updated.sections.find(s => s.tag0 === sectionTag0);
            if (section) {
              if (fieldName === 'enrichedInsight') {
                section.node.enrichedInsight = field.value;
              } else if (fieldName === 'enrichedDrivers') {
                section.node.enrichedDrivers = field.value.split('\n').filter(Boolean);
              }
            }
          }
        }
      }

      // Save to DB
      const ok = await updateSlideVersion(versionId, { ppt_data: updated });
      if (!ok) throw new Error('Falha ao salvar');

      // Save audit trail
      const edits = changedFields.map(f => ({
        field_path: f.path,
        old_value: f.original || null,
        new_value: f.value || null,
        edited_by: user.email,
        edited_by_name: user.name || user.email,
      }));
      await saveSlideEdits(versionId, edits);

      toast.success(`${changedFields.length} campo(s) atualizado(s)`);
      onSaved(updated);
    } catch (err: any) {
      console.error('Erro ao salvar edições:', err);
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600"><Sparkles size={18} /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Editar Insights</h3>
              <p className="text-[10px] text-gray-500 font-bold">
                {hasChanges ? `${changedFields.length} alteração(ões) pendente(s)` : 'Nenhuma alteração'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg text-[10px] font-black uppercase hover:bg-purple-100 transition-all"
            >
              <History size={12} />
              Histórico
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {fields.map(field => {
            const lastEdit = getLastEdit(recentEdits, field.path);
            const isChanged = field.value !== field.original;
            const isDrivers = field.key.includes('enrichedDrivers');

            return (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {field.label}
                  </label>
                  {lastEdit && (
                    <span className="text-[9px] text-gray-400 flex items-center gap-1">
                      <User size={9} />
                      {lastEdit.edited_by_name} — {new Date(lastEdit.edited_at).toLocaleDateString('pt-BR')} {new Date(lastEdit.edited_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <textarea
                  value={field.value}
                  onChange={e => updateField(field.key, e.target.value)}
                  rows={isDrivers ? 4 : field.key === 'executiveSummary' ? 5 : 3}
                  className={`w-full px-3 py-2 text-xs font-medium border-2 rounded-xl bg-white focus:outline-none transition-colors resize-y ${
                    isChanged
                      ? 'border-orange-300 bg-orange-50/30 focus:border-orange-400'
                      : 'border-gray-200 focus:border-blue-300'
                  }`}
                  placeholder={isDrivers ? 'Um driver por linha' : 'Digite o texto...'}
                />
                {isDrivers && (
                  <p className="text-[9px] text-gray-400 mt-0.5 ml-1">Um driver por linha</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-bold">
            Apenas textos/insights — valores numéricos não são alterados
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-black text-xs uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-black text-xs uppercase shadow-lg transition-all active:scale-95"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar ({changedFields.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
