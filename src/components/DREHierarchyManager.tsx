import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import * as dreHierarchyService from '../services/dreHierarchyService';
import { DRELevel2Item } from '../services/dreHierarchyService';

const NIVEL_1_OPTIONS = [
  { code: '01', label: '01. RECEITA LÍQUIDA' },
  { code: '02', label: '02. CUSTOS VARIÁVEIS' },
  { code: '03', label: '03. CUSTOS FIXOS' },
  { code: '04', label: '04. DESPESAS ADM (SG&A)' },
  { code: '06', label: '06. RATEIO RAIZ' }
];

const DREHierarchyManager: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<DRELevel2Item[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<DRELevel2Item | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hierarchyData, categoriesData] = await Promise.all([
        dreHierarchyService.getDREHierarchy(),
        dreHierarchyService.getAllCategories()
      ]);

      setHierarchy(hierarchyData);
      setAllCategories(categoriesData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: DRELevel2Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente deletar este item?')) return;

    try {
      await dreHierarchyService.deleteDRELevel2(id);
      setMessage({ type: 'success', text: 'Item deletado com sucesso!' });
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSave = async (data: DRELevel2Item) => {
    try {
      if (editingItem && editingItem.id) {
        await dreHierarchyService.updateDRELevel2(editingItem.id, data);
        setMessage({ type: 'success', text: 'Item atualizado!' });
      } else {
        await dreHierarchyService.addDRELevel2(data);
        setMessage({ type: 'success', text: 'Item adicionado!' });
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Agrupar por Nível 1
  const groupedHierarchy = hierarchy.reduce((acc, item) => {
    if (!acc[item.nivel_1_code]) {
      acc[item.nivel_1_code] = {
        label: item.nivel_1_label,
        items: []
      };
    }
    acc[item.nivel_1_code].items.push(item);
    return acc;
  }, {} as Record<string, { label: string; items: DRELevel2Item[] }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📊 Estrutura DRE</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure a hierarquia do Nível 2 da DRE Gerencial
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Adicionar Item Nível 2
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Lista Hierárquica */}
      <div className="space-y-4">
        {NIVEL_1_OPTIONS.map(nivel1 => {
          const group = groupedHierarchy[nivel1.code];

          return (
            <div key={nivel1.code} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header Nível 1 */}
              <div className="bg-blue-900 text-white px-4 py-3 font-bold">
                {nivel1.label}
              </div>

              {/* Itens Nível 2 */}
              <div className="divide-y divide-gray-200">
                {group?.items.map(item => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.nivel_2_label}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Categorias: {item.items.join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!group || group.items.length === 0) && (
                  <div className="p-4 text-center text-gray-500 italic">
                    Nenhum item adicionado
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Edição */}
      {isModalOpen && (
        <DREItemModal
          item={editingItem}
          allCategories={allCategories}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default DREHierarchyManager;

// ============================================================================
// MODAL DE EDIÇÃO
// ============================================================================

interface DREItemModalProps {
  item: DRELevel2Item | null;
  allCategories: string[];
  onSave: (data: DRELevel2Item) => void;
  onClose: () => void;
}

const DREItemModal: React.FC<DREItemModalProps> = ({ item, allCategories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    nivel_1_code: item?.nivel_1_code || '01',
    nivel_1_label: item?.nivel_1_label || '01. RECEITA LÍQUIDA',
    nivel_2_code: item?.nivel_2_code || '',
    nivel_2_label: item?.nivel_2_label || '',
    items: item?.items || [],
    ordem: item?.ordem || 1,
    ativo: item?.ativo ?? true
  });

  const [categorySearch, setCategorySearch] = useState('');

  const handleNivel1Change = (code: string) => {
    const nivel1 = NIVEL_1_OPTIONS.find(n => n.code === code);
    if (nivel1) {
      setFormData(prev => ({
        ...prev,
        nivel_1_code: nivel1.code,
        nivel_1_label: nivel1.label
      }));
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.includes(category)
        ? prev.items.filter(c => c !== category)
        : [...prev.items, category]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nivel_2_code || !formData.nivel_2_label) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    onSave(formData as DRELevel2Item);
  };

  const filteredCategories = allCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">
            {item ? 'Editar' : 'Adicionar'} Item Nível 2
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nível 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nível 1 (Categoria Principal)
            </label>
            <select
              value={formData.nivel_1_code}
              onChange={(e) => handleNivel1Change(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {NIVEL_1_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Código Nível 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Nível 2 * (ex: 01.1, 02.3)
            </label>
            <input
              type="text"
              value={formData.nivel_2_code}
              onChange={(e) => setFormData(prev => ({ ...prev, nivel_2_code: e.target.value }))}
              placeholder="01.1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* Label Nível 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label Nível 2 * (ex: 01.1 RECEITAS ACADÊMICAS)
            </label>
            <input
              type="text"
              value={formData.nivel_2_label}
              onChange={(e) => setFormData(prev => ({ ...prev, nivel_2_label: e.target.value }))}
              placeholder="01.1 RECEITAS ACADÊMICAS"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* Ordem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordem de Exibição
            </label>
            <input
              type="number"
              value={formData.ordem}
              onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) }))}
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* Categorias (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categorias (conta_contabil) - Selecione múltiplas
            </label>

            {/* Busca */}
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar categoria..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
            />

            {/* Lista de categorias */}
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto divide-y">
              {filteredCategories.length === 0 ? (
                <div className="p-3 text-center text-gray-500">Nenhuma categoria encontrada</div>
              ) : (
                filteredCategories.map(category => (
                  <label
                    key={category}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.items.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-900">{category}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-2 text-sm text-gray-600">
              {formData.items.length} categori{formData.items.length === 1 ? 'a' : 'as'} selecionada{formData.items.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
              Ativo (exibir na DRE)
            </label>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
