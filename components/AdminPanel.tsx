import React, { useState, useEffect } from 'react';
import { Shield, Users, X, Plus, Trash2, Save, AlertTriangle, CheckCircle2, User as UserIcon, Database, Search, Upload, Download, FileSpreadsheet, Eye, CheckCircle } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';

interface User {
  id: string;
  email: string;
  name: string;
  photo_url: string | null;
  role: 'admin' | 'manager' | 'viewer' | 'approver' | 'pending';
  created_at: string;
  last_login: string | null;
}

interface Permission {
  id: string;
  user_id: string;
  permission_type: 'centro_custo' | 'cia' | 'filial' | 'tag01';
  permission_value: string;
}

const AdminPanel: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showValuesHelper, setShowValuesHelper] = useState(false);
  const [availableValues, setAvailableValues] = useState<{marcas: string[], filiais: string[], categories: string[], tags: string[], tag01Values: string[]}>({
    marcas: [],
    filiais: [],
    categories: [],
    tags: [],
    tag01Values: []
  });

  // Estado para adicionar nova permissão
  const [newPermissionType, setNewPermissionType] = useState<'centro_custo' | 'cia' | 'filial' | 'tag01'>('centro_custo');
  const [newPermissionValue, setNewPermissionValue] = useState('');

  // Estados para importação de dados
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Estado para controle de abas
  const [activeTab, setActiveTab] = useState<'import' | 'users' | 'banco' | 'recorrencia'>('import');

  // Estado para busca de usuários
  const [userSearch, setUserSearch] = useState('');

  // Estados para aba Banco
  const [bancoYear, setBancoYear] = useState(String(new Date().getFullYear()));
  const [bancoMonths, setBancoMonths] = useState<string[]>([]);
  const [bancoMarcas, setBancoMarcas] = useState<string[]>([]);
  const [bancoFiliais, setBancoFiliais] = useState<string[]>([]);
  const [bancoTags01, setBancoTags01] = useState<string[]>([]);
  const [bancoTags02, setBancoTags02] = useState<string[]>([]);
  const [bancoTags03, setBancoTags03] = useState<string[]>([]);
  const [bancoTag02Options, setBancoTag02Options] = useState<string[]>([]);
  const [bancoTag03Options, setBancoTag03Options] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [bancoMessage, setBancoMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Estados para aba Recorrência
  const [recFile, setRecFile] = useState<File | null>(null);
  const [recPreview, setRecPreview] = useState<{chave_id: string, recurring: string}[]>([]);
  const [recUpdating, setRecUpdating] = useState(false);
  const [recProgress, setRecProgress] = useState(0);
  const [recMessage, setRecMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  const [recLog, setRecLog] = useState<{time: string, type: 'info'|'success'|'error'|'warn', text: string}[]>([]);

  // Filtrar usuários por busca
  const filteredUsers = users.filter(user => {
    if (!userSearch) return true;
    const searchLower = userSearch.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    loadUsers();
    loadAvailableValues();
    loadBancoTagOptions();
  }, []);

  const loadAvailableValues = async () => {
    try {
      const transactions = await supabaseService.getAllTransactions();

      const marcas = [...new Set(transactions.map(t => t.marca).filter(Boolean))].sort();
      const filiais = [...new Set(transactions.map(t => t.nome_filial).filter(Boolean))].sort();
      const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();
      const tag01Values = [...new Set(transactions.map(t => t.tag01).filter(Boolean))].sort() as string[];
      const tags = [...new Set([
        ...transactions.map(t => t.tag01).filter(Boolean),
        ...transactions.map(t => t.tag02).filter(Boolean),
        ...transactions.map(t => t.tag03).filter(Boolean)
      ])].sort();

      setAvailableValues({ marcas, filiais, categories, tags, tag01Values });
    } catch (error) {
      console.error('Erro ao carregar valores disponíveis:', error);
    }
  };

  const loadBancoTagOptions = async () => {
    try {
      const [tag02Opts, tag03Opts] = await Promise.all([
        supabaseService.getTag02Options(),
        supabaseService.getTag03Options(),
      ]);
      setBancoTag02Options(tag02Opts);
      setBancoTag03Options(tag03Opts);
    } catch (error) {
      console.error('Erro ao carregar opções de tag02/tag03:', error);
    }
  };

  const toggleBancoMulti = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const showBancoMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setBancoMessage({ type, text });
    setTimeout(() => setBancoMessage(null), 5000);
  };

  const handleExportBanco = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    showBancoMessage('info', 'Buscando dados do banco...');
    try {
      const monthFrom = bancoMonths.length > 0 ? `${bancoYear}-${[...bancoMonths].sort()[0]}` : `${bancoYear}-01`;
      const monthTo   = bancoMonths.length > 0 ? `${bancoYear}-${[...bancoMonths].sort().slice(-1)[0]}` : `${bancoYear}-12`;

      const filters: supabaseService.TransactionFilters = {
        scenario: 'Real',
        monthFrom,
        monthTo,
        ...(bancoMarcas.length  > 0 && { marca:  bancoMarcas  }),
        ...(bancoFiliais.length > 0 && { nome_filial: bancoFiliais }),
        ...(bancoTags01.length  > 0 && { tag01:  bancoTags01  }),
        ...(bancoTags02.length  > 0 && { tag02:  bancoTags02  }),
        ...(bancoTags03.length  > 0 && { tag03:  bancoTags03  }),
      };

      const result = await supabaseService.getFilteredTransactions(filters);
      const rows = result.data;

      if (rows.length === 0) {
        showBancoMessage('error', 'Nenhum registro encontrado com os filtros aplicados.');
        setIsExporting(false);
        return;
      }

      const exportData = rows.map(t => ({
        'ID':             t.id ?? '',
        'Cenário':        t.scenario ?? 'Real',
        'Data':           t.date,
        'Competência':    t.date?.substring(0, 7) ?? '',
        'Conta Contábil': t.conta_contabil ?? '',
        'Categoria':      t.category ?? '',
        'Filial (código)':t.filial ?? '',
        'Filial':         t.nome_filial ?? '',
        'Marca':          t.marca ?? '',
        'Fornecedor':     t.vendor ?? '',
        'Descrição':      t.description ?? '',
        'Valor':          t.amount ?? 0,
        'Ticket':         t.ticket ?? '',
        'Recorrente':     t.recurring ?? '',
        'Status':         t.status ?? '',
        'Tipo':           t.type ?? '',
        'Tag0':           t.tag0 ?? '',
        'Tag01':          t.tag01 ?? '',
        'Tag02':          t.tag02 ?? '',
        'Tag03':          t.tag03 ?? '',
        'Nat. Orç.':      t.nat_orc ?? '',
        'Chave ID':       t.chave_id ?? '',
        'Justificativa':  t.justification ?? '',
        'Atualizado em':  t.updated_at ?? '',
      }));

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
          { wch: 38 }, // ID
          { wch: 10 }, // Cenário
          { wch: 12 }, // Data
          { wch: 12 }, // Competência
          { wch: 22 }, // Conta Contábil
          { wch: 20 }, // Categoria
          { wch: 14 }, // Filial (código)
          { wch: 30 }, // Filial
          { wch: 12 }, // Marca
          { wch: 30 }, // Fornecedor
          { wch: 40 }, // Descrição
          { wch: 14 }, // Valor
          { wch: 14 }, // Ticket
          { wch: 12 }, // Recorrente
          { wch: 12 }, // Status
          { wch: 15 }, // Tipo
          { wch: 20 }, // Tag0
          { wch: 20 }, // Tag01
          { wch: 20 }, // Tag02
          { wch: 20 }, // Tag03
          { wch: 14 }, // Nat. Orç.
          { wch: 20 }, // Chave ID
          { wch: 40 }, // Justificativa
          { wch: 22 }, // Atualizado em
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transações');
        const filterLabel = [
          bancoYear,
          bancoMonths.length ? bancoMonths.join('_') : 'todos_meses',
          bancoMarcas.length ? bancoMarcas.slice(0, 2).join('_') : '',
        ].filter(Boolean).join('_');
        XLSX.writeFile(wb, `banco_${filterLabel}_${rows.length}reg.xlsx`);
      } else {
        const headers = Object.keys(exportData[0]).join(';');
        const csvRows = exportData.map(row =>
          Object.values(row).map(v =>
            typeof v === 'string' && (v.includes(';') || v.includes('"') || v.includes('\n'))
              ? `"${v.replace(/"/g, '""')}"` : v
          ).join(';')
        );
        const csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `banco_${bancoYear}_${rows.length}reg.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showBancoMessage('success', `✅ ${rows.length} registros exportados com sucesso!`);
    } catch (error: any) {
      showBancoMessage('error', `Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await supabaseService.getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const loadUserPermissions = async (userId: string) => {
    const userPermissions = await supabaseService.getUserPermissions(userId);
    setPermissions(userPermissions);
  };

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    await loadUserPermissions(user.id);
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'manager' | 'viewer' | 'approver' | 'pending') => {
    setSaving(true);
    const success = await supabaseService.updateUserRole(userId, newRole);

    if (success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
      showMessage('success', 'Função atualizada com sucesso!');
    } else {
      showMessage('error', 'Erro ao atualizar função.');
    }
    setSaving(false);
  };

  const handleAddPermission = async () => {
    if (!selectedUser || !newPermissionValue.trim()) {
      showMessage('error', 'Preencha o valor da permissão.');
      return;
    }

    setSaving(true);
    const success = await supabaseService.addUserPermission(
      selectedUser.id,
      newPermissionType,
      newPermissionValue.trim()
    );

    if (success) {
      await loadUserPermissions(selectedUser.id);
      setNewPermissionValue('');
      showMessage('success', 'Permissão adicionada com sucesso!');
    } else {
      showMessage('error', 'Erro ao adicionar permissão. Pode já existir.');
    }
    setSaving(false);
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta permissão?')) return;

    setSaving(true);
    const success = await supabaseService.removeUserPermission(permissionId);

    if (success) {
      setPermissions(prev => prev.filter(p => p.id !== permissionId));
      showMessage('success', 'Permissão removida com sucesso!');
    } else {
      showMessage('error', 'Erro ao remover permissão.');
    }
    setSaving(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!selectedUser) return;

    if (!confirm(`⚠️ ATENÇÃO: Você tem certeza que deseja DELETAR o usuário "${selectedUser.name}"?\n\nEsta ação é IRREVERSÍVEL e removerá:\n- O usuário do sistema\n- Todas as permissões associadas\n\nDigite "CONFIRMAR" para prosseguir.`)) {
      return;
    }

    // Segunda confirmação com verificação de texto
    const confirmText = prompt(`Para confirmar a exclusão de "${selectedUser.name}", digite: CONFIRMAR`);

    if (confirmText !== 'CONFIRMAR') {
      showMessage('error', 'Exclusão cancelada. Texto de confirmação incorreto.');
      return;
    }

    setSaving(true);
    const success = await supabaseService.deleteUser(userId);

    if (success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelectedUser(null);
      setPermissions([]);
      showMessage('success', 'Usuário deletado com sucesso!');
    } else {
      showMessage('error', 'Erro ao deletar usuário. Tente novamente.');
    }
    setSaving(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const showImportMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setImportMessage({ type, text });
    setTimeout(() => setImportMessage(null), 5000);
  };

  // Helpers para aba Recorrência
  const showRecMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setRecMessage({ type, text });
    setTimeout(() => setRecMessage(null), 8000);
  };

  const handleRecFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRecFile(file);
    setRecPreview([]);
    setRecMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showRecMessage('error', 'Arquivo vazio!');
          return;
        }

        // Mapear colunas flexíveis
        const mapped: {chave_id: string, recurring: string}[] = [];
        let skipped = 0;

        for (const row of data) {
          const chaveId = String(row['chave_id'] || row['Chave ID'] || row['CHAVE_ID'] || row['Chave_ID'] || '').trim();
          if (!chaveId) { skipped++; continue; }

          const rawRec = String(row['Recorrente'] || row['Recurring'] || row['recurring'] || row['recorrente'] || '').trim();

          // Normalizar: aceita Sim/Não/sim/não/S/N/s/n
          let recurring = '';
          const lower = rawRec.toLowerCase();
          if (['sim', 's', 'yes', 'y', '1'].includes(lower)) {
            recurring = 'Sim';
          } else if (['não', 'nao', 'n', 'no', '0'].includes(lower)) {
            recurring = 'Não';
          } else {
            recurring = rawRec || 'Não'; // fallback
          }

          mapped.push({ chave_id: chaveId, recurring });
        }

        if (mapped.length === 0) {
          showRecMessage('error', 'Nenhuma linha válida encontrada. Verifique se a coluna "chave_id" existe.');
          return;
        }

        setRecPreview(mapped);
        showRecMessage('info', `${mapped.length} registros carregados${skipped > 0 ? ` (${skipped} linhas sem chave_id ignoradas)` : ''}. Revise e clique em "Atualizar Recorrência".`);
      } catch (error) {
        console.error('Erro ao ler arquivo de recorrência:', error);
        showRecMessage('error', 'Erro ao ler arquivo. Verifique o formato.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const addRecLog = (type: 'info'|'success'|'error'|'warn', text: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setRecLog(prev => [...prev, { time, type, text }]);
  };

  const handleRecUpdate = async () => {
    if (recPreview.length === 0) {
      showRecMessage('error', 'Nenhum dado para atualizar!');
      return;
    }

    if (!confirm(`Você tem certeza que deseja atualizar a recorrência de ${recPreview.length} registros?`)) {
      return;
    }

    setRecUpdating(true);
    setRecProgress(0);
    setRecLog([]); // limpar log anterior

    const simCount = recPreview.filter(r => r.recurring === 'Sim').length;
    const naoCount = recPreview.filter(r => r.recurring === 'Não').length;
    addRecLog('info', `Iniciando atualização: ${recPreview.length} registros (${simCount} Sim, ${naoCount} Não)`);

    try {
      const batchSize = 50;
      const totalBatches = Math.ceil(recPreview.length / batchSize);
      let totalUpdated = 0;
      const allNotFound: string[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batch = recPreview.slice(start, end);

        addRecLog('info', `Batch ${i + 1}/${totalBatches} — processando ${batch.length} registros (${start + 1} a ${Math.min(end, recPreview.length)})...`);

        try {
          const result = await supabaseService.bulkUpdateRecurring(batch);
          totalUpdated += result.updated;
          allNotFound.push(...result.notFound);

          if (result.notFound.length > 0) {
            addRecLog('warn', `Batch ${i + 1}: ${result.updated} atualizados, ${result.notFound.length} não encontrados: ${result.notFound.slice(0, 5).join(', ')}${result.notFound.length > 5 ? '...' : ''}`);
          } else {
            addRecLog('success', `Batch ${i + 1}: ${result.updated} atualizados`);
          }
        } catch (batchErr: any) {
          addRecLog('error', `Batch ${i + 1}: ERRO — ${batchErr.message}`);
          throw batchErr;
        }

        setRecProgress(((i + 1) / totalBatches) * 100);
      }

      // Resumo final
      addRecLog('success', `Concluído: ${totalUpdated} registros atualizados com sucesso`);
      if (allNotFound.length > 0) {
        addRecLog('warn', `${allNotFound.length} chave_id não encontrados no banco:`);
        // Listar todos em grupos de 10
        for (let j = 0; j < allNotFound.length; j += 10) {
          addRecLog('warn', `  ${allNotFound.slice(j, j + 10).join(', ')}`);
        }
      }

      const parts: string[] = [`${totalUpdated} registros atualizados com sucesso!`];
      if (allNotFound.length > 0) {
        parts.push(`${allNotFound.length} chave_id não encontrados.`);
      }

      showRecMessage(allNotFound.length > 0 ? 'info' : 'success', parts.join(' '));

      setRecFile(null);
      setRecPreview([]);
      setRecProgress(0);
    } catch (error: any) {
      console.error('Erro ao atualizar recorrência:', error);
      addRecLog('error', `ERRO FATAL: ${error.message}`);
      showRecMessage('error', `Erro ao atualizar: ${error.message}`);
    } finally {
      setRecUpdating(false);
    }
  };

  // Baixar template Excel
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Cenário': 'Real',
        'Data': '2026-01-15',
        'C.Custo': 'MARKETING',
        'Segmento': 'DIGITAL',
        'Projeto': 'CAMPANHA-2026',
        'Conta': 'Salários',
        'Marca': 'SAP',
        'Unidade': 'Matriz - São Paulo',
        'Ticket': '',
        'Fornecedor': 'FORNECEDOR EXEMPLO LTDA',
        'Descrição': 'Exemplo de lançamento',
        'Valor': 1500.50,
        'Recorrente': 'Sim',
        'Status': 'Normal',
        'Tipo': 'FIXED_COST'
      },
      {
        'Cenário': 'Orçamento',
        'Data': '2026-02-01',
        'C.Custo': 'VENDAS',
        'Segmento': 'B2B',
        'Projeto': 'EXPANSAO',
        'Conta': 'Receita de Serviços',
        'Marca': 'KOGUT',
        'Unidade': 'Filial - Rio de Janeiro',
        'Ticket': '123456',
        'Fornecedor': '',
        'Descrição': 'Receita prevista',
        'Valor': 50000,
        'Recorrente': 'Não',
        'Status': 'Normal',
        'Tipo': 'REVENUE'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 12 }, // Cenário
      { wch: 12 }, // Data
      { wch: 15 }, // C.Custo
      { wch: 15 }, // Segmento
      { wch: 18 }, // Projeto
      { wch: 25 }, // Conta
      { wch: 10 }, // Marca
      { wch: 30 }, // Unidade
      { wch: 10 }, // Ticket
      { wch: 30 }, // Fornecedor
      { wch: 40 }, // Descrição
      { wch: 12 }, // Valor
      { wch: 12 }, // Recorrente
      { wch: 12 }, // Status
      { wch: 15 }  // Tipo
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Template_Importacao_DRE_RAIZ_${new Date().toISOString().split('T')[0]}.xlsx`);
    showImportMessage('success', 'Template baixado com sucesso!');
  };

  // Ler arquivo Excel/CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showImportMessage('error', 'Arquivo vazio! Adicione dados no Excel.');
          return;
        }

        // Mapear colunas do Excel para Transaction
        const mappedData = data.map((row: any, index: number) => ({
          id: `IMP-${Date.now()}-${index}`,
          scenario: row['Cenário'] || row['Cenario'] || row['scenario'] || 'Real',
          date: row['Data'] || row['date'] || new Date().toISOString().split('T')[0],
          tag01: row['C.Custo'] || row['C Custo'] || row['tag01'] || '',
          tag02: row['Segmento'] || row['Segment'] || row['tag02'] || '',
          tag03: row['Projeto'] || row['Project'] || row['tag03'] || '',
          category: row['Conta'] || row['Category'] || row['category'] || 'Outros',
          marca: row['Marca'] || row['Brand'] || row['brand'] || row['marca'] || 'SAP',
          filial: row['Unidade'] || row['Branch'] || row['branch'] || row['filial'] || 'Matriz',
          ticket: row['Ticket'] || row['ticket'] || '',
          vendor: row['Fornecedor'] || row['Vendor'] || row['vendor'] || '',
          description: row['Descrição'] || row['Descricao'] || row['Description'] || row['description'] || '',
          amount: parseFloat(String(row['Valor'] || row['Amount'] || row['amount'] || 0).replace(',', '.')),
          recurring: row['Recorrente'] || row['Recurring'] || row['recurring'] || 'Sim',
          status: row['Status'] || row['status'] || 'Normal',
          type: row['Tipo'] || row['Type'] || row['type'] || 'FIXED_COST'
        }));

        setImportPreview(mappedData);
        showImportMessage('info', `${mappedData.length} registros carregados. Revise e clique em "Importar".`);
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        showImportMessage('error', 'Erro ao ler arquivo. Verifique o formato.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Importar dados para o banco
  const handleImportData = async () => {
    if (importPreview.length === 0) {
      showImportMessage('error', 'Nenhum dado para importar!');
      return;
    }

    if (!confirm(`Você tem certeza que deseja importar ${importPreview.length} registros?`)) {
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const batchSize = 100;
      const totalBatches = Math.ceil(importPreview.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batch = importPreview.slice(start, end);

        await supabaseService.bulkAddTransactions(batch as Transaction[]);

        const progress = ((i + 1) / totalBatches) * 100;
        setImportProgress(progress);
      }

      showImportMessage('success', `✅ ${importPreview.length} registros importados com sucesso!`);
      setImportFile(null);
      setImportPreview([]);
      setImportProgress(0);

      // Recarregar valores disponíveis
      await loadAvailableValues();
    } catch (error) {
      console.error('Erro ao importar:', error);
      showImportMessage('error', 'Erro ao importar dados. Tente novamente.');
    } finally {
      setIsImporting(false);
    }
  };

  // Se não é admin, não pode acessar
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 max-w-2xl mx-auto mt-20">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar o painel de gerenciamento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Shield className="text-purple-600" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Painel de Administração</h1>
          <p className="text-xs text-gray-500">Gerencie dados e usuários do sistema</p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex gap-1 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'import'
              ? 'text-green-700 bg-green-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Database size={14} />
            📊 Importação
          </div>
          {activeTab === 'import' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'users'
              ? 'text-purple-700 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            Usuários
          </div>
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('banco')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'banco'
              ? 'text-blue-700 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Database size={14} />
            Banco
          </div>
          {activeTab === 'banco' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('recorrencia')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'recorrencia'
              ? 'text-orange-700 bg-orange-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Upload size={14} />
            Recorrência
          </div>
          {activeTab === 'recorrencia' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t"></div>
          )}
        </button>
      </div>

      {/* Aba: Importação de Dados */}
      {activeTab === 'import' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <Database className="text-green-600" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-green-900">📊 Importação de Dados em Massa</h2>
            <p className="text-xs text-green-700">Carregue transações via Excel/CSV</p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
          >
            <Download size={14} />
            Baixar Modelo
          </button>
        </div>

        {/* Mensagem de feedback da importação */}
        {importMessage && (
          <div className={`p-2 rounded-lg flex items-center gap-2 mb-3 ${
            importMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            importMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {importMessage.type === 'success' ? <CheckCircle size={14} /> :
             importMessage.type === 'error' ? <AlertTriangle size={14} /> :
             <FileSpreadsheet size={14} />}
            <span className="font-bold text-xs">{importMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Upload de Arquivo */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="text-green-600" size={16} />
              <h3 className="font-bold text-green-900 text-xs">1. Selecione o Arquivo</h3>
            </div>

            <div className="space-y-2">
              <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-400 hover:bg-green-50 transition-all">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="import-file"
                  disabled={isImporting}
                />
                <label
                  htmlFor="import-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 text-xs mb-0.5">
                      {importFile ? importFile.name : 'Clique para selecionar'}
                    </p>
                    <p className="text-[10px] text-green-600">
                      .xlsx, .xls, .csv
                    </p>
                  </div>
                </label>
              </div>

              {importFile && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-[10px] font-bold text-green-900">
                    ✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview e Ações */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="text-green-600" size={16} />
              <h3 className="font-bold text-green-900 text-xs">2. Revise e Importe</h3>
            </div>

            {importPreview.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">Nenhum arquivo carregado</p>
                <p className="text-[10px] mt-0.5">Selecione um arquivo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <p className="font-bold text-green-900 text-xs mb-1">
                    📋 {importPreview.length} registros
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="bg-white p-1 rounded">
                      <strong>Cenários:</strong> {[...new Set(importPreview.map(r => r.scenario))].join(', ')}
                    </div>
                    <div className="bg-white p-1 rounded">
                      <strong>Marcas:</strong> {[...new Set(importPreview.map(r => r.marca))].length}
                    </div>
                  </div>
                </div>

                {/* Preview dos primeiros registros */}
                <div className="max-h-[150px] overflow-y-auto bg-gray-50 border border-gray-200 rounded p-2">
                  <p className="text-[10px] font-bold text-gray-600 mb-1 uppercase">Preview (5 primeiros):</p>
                  {importPreview.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="bg-white p-1 rounded mb-1 text-[9px] border border-gray-200">
                      <strong>{item.scenario}</strong> | {item.date} | {item.category} | R$ {item.amount}
                    </div>
                  ))}
                </div>

                {/* Botão de Importar */}
                <button
                  onClick={handleImportData}
                  disabled={isImporting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                      Importando... {Math.round(importProgress)}%
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Importar {importPreview.length} Registros
                    </>
                  )}
                </button>

                {isImporting && (
                  <div className="bg-green-100 rounded overflow-hidden">
                    <div
                      className="bg-green-600 h-1 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-bold text-blue-900 text-xs mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            ℹ️ Como usar:
          </h4>
          <ol className="text-[10px] text-blue-800 space-y-0.5 ml-4 list-decimal">
            <li><strong>Baixe o modelo</strong> → "Baixar Modelo"</li>
            <li><strong>Preencha o Excel</strong> com seus dados</li>
            <li><strong>Selecione o arquivo</strong> preenchido</li>
            <li><strong>Revise o preview</strong> dos dados</li>
            <li><strong>Clique em "Importar"</strong></li>
          </ol>
          <p className="text-[10px] text-blue-700 mt-2 bg-blue-100 p-1.5 rounded">
            <strong>⚠️ Obrigatórios:</strong> Cenário, Data, Conta, Unidade, Valor, Tipo
          </p>
        </div>
        </div>
      )}

      {/* Aba: Gerenciamento de Usuários */}
      {activeTab === 'users' && (
        <>
      {/* Estatísticas de Usuários */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
          <p className="text-[8px] font-black text-purple-500 uppercase tracking-wider mb-0.5">Total</p>
          <p className="text-2xl font-black text-purple-900">{users.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-wider mb-0.5">Admins</p>
          <p className="text-2xl font-black text-blue-900">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-[8px] font-black text-green-500 uppercase tracking-wider mb-0.5">Gestores</p>
          <p className="text-2xl font-black text-green-900">{users.filter(u => u.role === 'manager').length}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-wider mb-0.5">Aprovadores</p>
          <p className="text-2xl font-black text-indigo-900">{users.filter(u => u.role === 'approver').length}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider mb-0.5">Viewers</p>
          <p className="text-2xl font-black text-gray-900">{users.filter(u => u.role === 'viewer').length}</p>
        </div>
        {users.filter(u => u.role === 'pending').length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 animate-pulse">
            <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider mb-0.5">⏳ Pendentes</p>
            <p className="text-2xl font-black text-amber-900">{users.filter(u => u.role === 'pending').length}</p>
          </div>
        )}
      </div>

      {/* Alerta de Usuários Pendentes */}
      {users.filter(u => u.role === 'pending').length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-3 shadow">
          <div className="flex items-start gap-2">
            <div className="bg-amber-100 p-1.5 rounded-lg shrink-0">
              <AlertTriangle className="text-amber-600" size={16} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-amber-900 mb-1">
                🚨 {users.filter(u => u.role === 'pending').length} {users.filter(u => u.role === 'pending').length === 1 ? 'Usuário' : 'Usuários'} Aguardando Aprovação
              </h3>
              <p className="text-xs text-amber-700 mb-2">
                {users.filter(u => u.role === 'pending').length === 1
                  ? 'Um novo usuário está aguardando aprovação.'
                  : `${users.filter(u => u.role === 'pending').length} novos usuários estão aguardando aprovação.`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {users.filter(u => u.role === 'pending').map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="bg-white border border-amber-300 hover:border-amber-400 rounded-lg p-1.5 flex items-center gap-1.5 transition-all hover:shadow"
                  >
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.name} className="w-6 h-6 rounded-full border border-amber-300" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                        <UserIcon className="text-amber-600" size={12} />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-bold text-[10px] text-gray-900">{user.name}</p>
                      <p className="text-[9px] text-gray-600">{user.email}</p>
                    </div>
                    <span className="text-[10px] font-black text-amber-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de feedback */}
      {message && (
        <div className={`p-2 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span className="font-bold text-xs">{message.text}</span>
        </div>
      )}

      {/* Botão para mostrar valores disponíveis */}
      <button
        onClick={() => setShowValuesHelper(!showValuesHelper)}
        className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-2 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2">
          <Database className="text-blue-600" size={14} />
          <div className="text-left">
            <p className="font-bold text-xs text-blue-900">💡 Valores Disponíveis no Banco</p>
            <p className="text-[10px] text-blue-600">Ver valores para usar nas permissões</p>
          </div>
        </div>
        <span className="text-blue-600 font-black text-xs">{showValuesHelper ? '▼' : '▶'}</span>
      </button>

      {/* Helper de valores disponíveis */}
      {showValuesHelper && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Search className="text-blue-600" size={14} />
            <h3 className="font-bold text-blue-900 text-xs">Valores EXATOS para permissões</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* CIAs (Marcas) */}
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <p className="font-bold text-[10px] text-green-900 uppercase mb-1">🏢 CIAs (Marcas):</p>
              {availableValues.marcas.length > 0 ? (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {availableValues.marcas.map(marca => (
                    <span key={marca} className="block bg-green-200 px-1.5 py-0.5 rounded font-mono text-[9px]">{marca}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-green-600">Nenhuma</p>
              )}
            </div>

            {/* Filiais */}
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <p className="font-bold text-[10px] text-orange-900 uppercase mb-1">🏫 Filiais:</p>
              {availableValues.filiais.length > 0 ? (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {availableValues.filiais.map(filial => (
                    <span key={filial} className="block bg-orange-200 px-1.5 py-0.5 rounded font-mono text-[9px]">{filial}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-orange-600">Nenhuma</p>
              )}
            </div>

            {/* Categorias (Centro de Custo) */}
            <div className="bg-purple-50 border border-purple-200 rounded p-2">
              <p className="font-bold text-[10px] text-purple-900 uppercase mb-1">📊 Categorias:</p>
              {availableValues.categories.length > 0 ? (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {availableValues.categories.map(cat => (
                    <span key={cat} className="block bg-purple-200 px-1.5 py-0.5 rounded font-mono text-[9px]">{cat}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-purple-600">Nenhuma</p>
              )}
            </div>

            {/* Tag01 */}
            <div className="bg-teal-50 border border-teal-200 rounded p-2">
              <p className="font-bold text-[10px] text-teal-900 uppercase mb-1">🏷️ Tag 01:</p>
              {availableValues.tag01Values.length > 0 ? (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {availableValues.tag01Values.slice(0, 15).map(tag => (
                    <span key={tag} className="block bg-teal-200 px-1.5 py-0.5 rounded font-mono text-[9px]">{tag}</span>
                  ))}
                  {availableValues.tag01Values.length > 15 && (
                    <p className="text-[9px] text-teal-600 italic">+{availableValues.tag01Values.length - 15} mais...</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-teal-600">Nenhuma</p>
              )}
            </div>

            {/* Tags (todas) */}
            <div className="bg-pink-50 border border-pink-200 rounded p-2">
              <p className="font-bold text-[10px] text-pink-900 uppercase mb-1">🏷️ Tags (todas):</p>
              {availableValues.tags.length > 0 ? (
                <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                  {availableValues.tags.slice(0, 15).map(tag => (
                    <span key={tag} className="block bg-pink-200 px-1.5 py-0.5 rounded font-mono text-[9px]">{tag}</span>
                  ))}
                  {availableValues.tags.length > 15 && (
                    <p className="text-[9px] text-pink-600 italic">+{availableValues.tags.length - 15} mais...</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-pink-600">Nenhuma</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5 mt-2">
            <p className="text-[9px] text-yellow-800">
              <strong>⚠️ IMPORTANTE:</strong> Digite exatamente como aparece (maiúsculas, espaços, acentos).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Lista de Usuários */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-gray-600" />
            <h2 className="text-sm font-black text-gray-900">Usuários ({filteredUsers.length})</h2>
          </div>

          {/* Campo de Busca */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin mx-auto mb-2 w-6 h-6 border-3 border-gray-200 border-t-purple-600 rounded-full"></div>
              <p className="text-xs text-gray-500">Carregando...</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    selectedUser?.id === user.id
                      ? 'bg-purple-50 border-purple-300 shadow'
                      : 'bg-gray-50 border-gray-200 hover:border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.name} className="w-8 h-8 rounded-full border border-purple-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                        <UserIcon className="text-purple-600" size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'approver' ? 'bg-indigo-100 text-indigo-700' :
                      user.role === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'admin' ? 'ADM' :
                       user.role === 'manager' ? 'GST' :
                       user.role === 'approver' ? 'APV' :
                       user.role === 'pending' ? '⏳' :
                       'VWR'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes do Usuário Selecionado */}
        <div className="bg-white rounded-xl shadow p-4">
          {selectedUser ? (
            <div className="space-y-3">
              {/* Informações do Usuário */}
              <div>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Informações</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedUser.photo_url ? (
                      <img src={selectedUser.photo_url} alt={selectedUser.name} className="w-12 h-12 rounded-full border-2 border-purple-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                        <UserIcon className="text-purple-600" size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm text-gray-900">{selectedUser.name}</p>
                      <p className="text-[10px] text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  {selectedUser.last_login && (
                    <p className="text-[10px] text-gray-500">
                      Último acesso: {new Date(selectedUser.last_login).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Deletar Usuário */}
              {selectedUser.id !== currentUser?.uid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <h3 className="text-[10px] font-black text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Zona de Perigo
                  </h3>
                  <p className="text-[10px] text-red-600 mb-2">
                    Ação irreversível. Remove usuário e permissões.
                  </p>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    disabled={saving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    <Trash2 size={12} />
                    Deletar Permanentemente
                  </button>
                </div>
              )}

              {/* Alterar Função */}
              <div>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Função</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['viewer', 'manager', 'approver', 'admin'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => handleUpdateRole(selectedUser.id, role)}
                      disabled={saving || selectedUser.id === currentUser?.uid}
                      className={`p-2 rounded-lg font-bold text-[10px] uppercase transition-all ${
                        selectedUser.role === role
                          ? role === 'admin' ? 'bg-purple-600 text-white' :
                            role === 'manager' ? 'bg-blue-600 text-white' :
                            role === 'approver' ? 'bg-indigo-600 text-white' :
                            'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${saving || selectedUser.id === currentUser?.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {role === 'admin' ? 'Admin' : role === 'manager' ? 'Gestor' : role === 'approver' ? 'Aprovador' : 'Viewer'}
                    </button>
                  ))}
                </div>
                {selectedUser.id === currentUser?.uid && (
                  <p className="text-[9px] text-gray-500 mt-1">* Não pode alterar sua própria função</p>
                )}
              </div>

              {/* Permissões */}
              <div>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Permissões</h3>

                {/* Lista de Permissões */}
                <div className="space-y-1 mb-2 max-h-[150px] overflow-y-auto">
                  {permissions.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Nenhuma permissão</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Acesso total</p>
                    </div>
                  ) : (
                    permissions.map(perm => (
                      <div key={perm.id} className="flex items-center justify-between bg-gray-50 p-1.5 rounded">
                        <div className="flex-1 min-w-0">
                          <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase mr-1 ${
                            perm.permission_type === 'centro_custo' ? 'bg-blue-100 text-blue-700' :
                            perm.permission_type === 'cia' ? 'bg-green-100 text-green-700' :
                            perm.permission_type === 'tag01' ? 'bg-teal-100 text-teal-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {perm.permission_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold text-gray-900 truncate">{perm.permission_value}</span>
                        </div>
                        <button
                          onClick={() => handleRemovePermission(perm.id)}
                          disabled={saving}
                          className="p-1 hover:bg-red-100 rounded transition-colors text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Adicionar Nova Permissão */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-purple-900 uppercase">Adicionar</p>
                    <button
                      onClick={() => setShowValuesHelper(!showValuesHelper)}
                      className="text-[9px] text-purple-600 hover:text-purple-800 underline font-bold"
                    >
                      Ver valores ▲
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <select
                      value={newPermissionType}
                      onChange={(e) => setNewPermissionType(e.target.value as any)}
                      className="w-full px-2 py-1 border border-purple-200 rounded text-[10px] font-bold focus:outline-none focus:border-purple-400"
                    >
                      <option value="centro_custo">Centro de Custo</option>
                      <option value="cia">CIA (Marca)</option>
                      <option value="filial">Filial</option>
                      <option value="tag01">Tag 01</option>
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        value={newPermissionValue}
                        onChange={(e) => setNewPermissionValue(e.target.value)}
                        placeholder="Digite o valor..."
                        className="w-full px-2 py-1 border border-purple-200 rounded text-[10px] focus:outline-none focus:border-purple-400"
                        list={`suggestions-${newPermissionType}`}
                      />
                      <datalist id={`suggestions-${newPermissionType}`}>
                        {newPermissionType === 'cia' && availableValues.marcas.map(m => (
                          <option key={m} value={m} />
                        ))}
                        {newPermissionType === 'filial' && availableValues.filiais.map(f => (
                          <option key={f} value={f} />
                        ))}
                        {newPermissionType === 'centro_custo' && availableValues.categories.map(c => (
                          <option key={c} value={c} />
                        ))}
                        {newPermissionType === 'tag01' && availableValues.tag01Values.map(t => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                    <button
                      onClick={handleAddPermission}
                      disabled={saving || !newPermissionValue.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[10px]"
                    >
                      <Plus size={12} />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto mb-2 text-gray-300" size={48} />
              <p className="text-gray-500 font-bold text-xs">Selecione um usuário</p>
              <p className="text-[10px] text-gray-400 mt-1">Escolha na lista ao lado</p>
            </div>
          )}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-3">
        <h4 className="font-bold text-blue-900 text-[10px] mb-1">ℹ️ Funções e Permissões</h4>
        <ul className="text-[9px] text-blue-800 space-y-0.5">
          <li><strong>Viewer:</strong> Visualiza dados conforme permissões</li>
          <li><strong>Gestor:</strong> Visualiza e solicita alterações</li>
          <li><strong>Aprovador:</strong> Visualiza, solicita e aprova alterações (não acessa Admin)</li>
          <li><strong>Admin:</strong> Acesso total ao sistema (inclui painel Admin)</li>
          <li><strong>Permissões:</strong> Limitam acesso a dados específicos</li>
        </ul>
      </div>
        </>
      )}

      {/* ── ABA: BANCO ── */}
      {activeTab === 'banco' && (
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-300 rounded-xl p-4 shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-blue-900">🗄️ Exportar Dados do Banco</h2>
              <p className="text-xs text-blue-700">Transações reais (cenário Real) com filtros aplicados</p>
            </div>
          </div>

          {/* Mensagem de feedback */}
          {bancoMessage && (
            <div className={`p-2 rounded-lg flex items-center gap-2 mb-3 ${
              bancoMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
              bancoMessage.type === 'error'   ? 'bg-red-100 text-red-800 border border-red-300' :
                                               'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {bancoMessage.type === 'success' ? <CheckCircle size={14} /> :
               bancoMessage.type === 'error'   ? <AlertTriangle size={14} /> :
               <FileSpreadsheet size={14} />}
              <span className="font-bold text-xs">{bancoMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Coluna esquerda: Período e Dimensões */}
            <div className="space-y-3">

              {/* Ano */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="font-bold text-[10px] text-blue-900 uppercase mb-2">Ano</p>
                <select
                  value={bancoYear}
                  onChange={e => setBancoYear(e.target.value)}
                  className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs font-bold text-blue-900 focus:outline-none focus:border-blue-400"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Meses */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-[10px] text-blue-900 uppercase">Meses</p>
                  <button
                    onClick={() => setBancoMonths([])}
                    className="text-[9px] text-blue-500 hover:text-blue-700"
                  >
                    {bancoMonths.length === 0 ? 'Todos' : `${bancoMonths.length} sel. · Limpar`}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    ['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],
                    ['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],
                    ['09','Set'],['10','Out'],['11','Nov'],['12','Dez'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => toggleBancoMulti(val, bancoMonths, setBancoMonths)}
                      className={`py-1 rounded text-[10px] font-bold border transition-all ${
                        bancoMonths.includes(val)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marca */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-[10px] text-blue-900 uppercase">Marca</p>
                  {bancoMarcas.length > 0 && (
                    <button onClick={() => setBancoMarcas([])} className="text-[9px] text-blue-500 hover:text-blue-700">
                      {bancoMarcas.length} sel. · Limpar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {availableValues.marcas.map(m => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={bancoMarcas.includes(m)}
                        onChange={() => toggleBancoMulti(m, bancoMarcas, setBancoMarcas)}
                        className="accent-blue-500"
                      />
                      <span className="text-[10px] text-gray-700">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filial */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-[10px] text-blue-900 uppercase">Filial</p>
                  {bancoFiliais.length > 0 && (
                    <button onClick={() => setBancoFiliais([])} className="text-[9px] text-blue-500 hover:text-blue-700">
                      {bancoFiliais.length} sel. · Limpar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {availableValues.filiais.map(f => (
                    <label key={f} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={bancoFiliais.includes(f)}
                        onChange={() => toggleBancoMulti(f, bancoFiliais, setBancoFiliais)}
                        className="accent-blue-500"
                      />
                      <span className="text-[10px] text-gray-700">{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna direita: Tags e Botões */}
            <div className="space-y-3">

              {/* Tag01 */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-[10px] text-blue-900 uppercase">Tag 01</p>
                  {bancoTags01.length > 0 && (
                    <button onClick={() => setBancoTags01([])} className="text-[9px] text-blue-500 hover:text-blue-700">
                      {bancoTags01.length} sel. · Limpar
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {availableValues.tag01Values.map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={bancoTags01.includes(t)}
                        onChange={() => toggleBancoMulti(t, bancoTags01, setBancoTags01)}
                        className="accent-blue-500"
                      />
                      <span className="text-[10px] text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tag02 */}
              {bancoTag02Options.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-[10px] text-blue-900 uppercase">Tag 02</p>
                    {bancoTags02.length > 0 && (
                      <button onClick={() => setBancoTags02([])} className="text-[9px] text-blue-500 hover:text-blue-700">
                        {bancoTags02.length} sel. · Limpar
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {bancoTag02Options.map(t => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 rounded">
                        <input
                          type="checkbox"
                          checked={bancoTags02.includes(t)}
                          onChange={() => toggleBancoMulti(t, bancoTags02, setBancoTags02)}
                          className="accent-blue-500"
                        />
                        <span className="text-[10px] text-gray-700">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag03 */}
              {bancoTag03Options.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-[10px] text-blue-900 uppercase">Tag 03</p>
                    {bancoTags03.length > 0 && (
                      <button onClick={() => setBancoTags03([])} className="text-[9px] text-blue-500 hover:text-blue-700">
                        {bancoTags03.length} sel. · Limpar
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[100px] overflow-y-auto">
                    {bancoTag03Options.map(t => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 rounded">
                        <input
                          type="checkbox"
                          checked={bancoTags03.includes(t)}
                          onChange={() => toggleBancoMulti(t, bancoTags03, setBancoTags03)}
                          className="accent-blue-500"
                        />
                        <span className="text-[10px] text-gray-700">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de exportação */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="font-bold text-[10px] text-blue-900 uppercase mb-3">Exportar</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExportBanco('xlsx')}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
                  >
                    {isExporting ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <FileSpreadsheet size={14} />
                    )}
                    Exportar Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExportBanco('csv')}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
                  >
                    {isExporting ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Download size={14} />
                    )}
                    Exportar CSV
                  </button>
                </div>
                <p className="text-[9px] text-blue-600 mt-2">
                  ℹ️ Sem filtros de meses: exporta o ano inteiro. Campos em branco exportam todos os valores.
                </p>
              </div>

              {/* Resumo dos filtros ativos */}
              {(bancoMarcas.length > 0 || bancoFiliais.length > 0 || bancoTags01.length > 0 || bancoTags02.length > 0 || bancoTags03.length > 0 || bancoMonths.length > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="font-bold text-[10px] text-blue-800 mb-1">Filtros ativos:</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-bold">Ano: {bancoYear}</span>
                    {bancoMonths.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Meses: {bancoMonths.length}</span>}
                    {bancoMarcas.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Marca: {bancoMarcas.length}</span>}
                    {bancoFiliais.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Filial: {bancoFiliais.length}</span>}
                    {bancoTags01.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Tag01: {bancoTags01.length}</span>}
                    {bancoTags02.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Tag02: {bancoTags02.length}</span>}
                    {bancoTags03.length > 0 && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">Tag03: {bancoTags03.length}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aba: Recorrência */}
      {activeTab === 'recorrencia' && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-xl p-4 shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Upload className="text-orange-600" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-orange-900">Atualização de Recorrência em Massa</h2>
              <p className="text-xs text-orange-700">Carregue um Excel com <strong>chave_id</strong> e <strong>Recorrente</strong> (Sim/Não)</p>
            </div>
          </div>

          {/* Mensagem */}
          {recMessage && (
            <div className={`p-3 rounded-lg mb-4 text-xs font-bold flex items-center gap-2 ${
              recMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
              recMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
              'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {recMessage.type === 'success' ? <CheckCircle2 size={14} /> :
               recMessage.type === 'error' ? <AlertTriangle size={14} /> :
               <Eye size={14} />}
              {recMessage.text}
            </div>
          )}

          {/* Upload */}
          <div className="mb-4">
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-orange-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-orange-50 transition-all">
              <div className="flex flex-col items-center justify-center py-4">
                <Upload className="w-8 h-8 mb-2 text-orange-400" />
                <p className="text-xs text-orange-600 font-bold">
                  {recFile ? recFile.name : 'Clique para selecionar arquivo (.xlsx, .xls, .csv)'}
                </p>
                {recFile && (
                  <p className="text-[10px] text-orange-500 mt-1">Clique novamente para trocar o arquivo</p>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleRecFileUpload}
              />
            </label>
          </div>

          {/* Preview */}
          {recPreview.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-orange-800">
                  Preview — {recPreview.length} registros
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-orange-600">
                    Sim: {recPreview.filter(r => r.recurring === 'Sim').length} |
                    Não: {recPreview.filter(r => r.recurring === 'Não').length}
                  </span>
                  <button
                    onClick={() => { setRecPreview([]); setRecFile(null); setRecMessage(null); }}
                    className="text-[10px] text-red-600 hover:text-red-800 font-bold"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-orange-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-orange-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-orange-800 font-black">#</th>
                      <th className="text-left px-3 py-1.5 text-orange-800 font-black">chave_id</th>
                      <th className="text-left px-3 py-1.5 text-orange-800 font-black">Recorrente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recPreview.slice(0, 200).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/50'}>
                        <td className="px-3 py-1 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-1 font-mono text-[10px]">{item.chave_id}</td>
                        <td className="px-3 py-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.recurring === 'Sim'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.recurring}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recPreview.length > 200 && (
                      <tr className="bg-orange-50">
                        <td colSpan={3} className="px-3 py-2 text-center text-orange-600 text-[10px] font-bold">
                          ... e mais {recPreview.length - 200} registros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Barra de progresso */}
          {recUpdating && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-orange-700 mb-1 font-bold">
                <span>Atualizando...</span>
                <span>{Math.round(recProgress)}%</span>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${recProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Log de carga */}
          {recLog.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-black text-orange-800 uppercase">Log de Carga</h3>
                {!recUpdating && (
                  <button
                    onClick={() => setRecLog([])}
                    className="text-[9px] text-gray-500 hover:text-red-600 font-bold"
                  >
                    Limpar log
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-2 font-mono text-[10px] leading-relaxed">
                {recLog.map((entry, idx) => (
                  <div key={idx} className={`flex gap-2 ${
                    entry.type === 'success' ? 'text-green-400' :
                    entry.type === 'error' ? 'text-red-400' :
                    entry.type === 'warn' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500 shrink-0">[{entry.time}]</span>
                    <span className="shrink-0">
                      {entry.type === 'success' ? 'OK' :
                       entry.type === 'error' ? 'ERR' :
                       entry.type === 'warn' ? 'WARN' : 'INFO'}
                    </span>
                    <span>{entry.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão Atualizar */}
          {recPreview.length > 0 && !recUpdating && (
            <button
              onClick={handleRecUpdate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
            >
              <CheckCircle size={14} />
              Atualizar Recorrência ({recPreview.length} registros)
            </button>
          )}

          {/* Instruções */}
          {recPreview.length === 0 && !recFile && (
            <div className="bg-white border border-orange-200 rounded-lg p-3 mt-2">
              <p className="text-[10px] text-orange-800 font-bold mb-2">Formato esperado do Excel:</p>
              <table className="w-full text-[10px] border border-orange-100 rounded">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-orange-700">chave_id</th>
                    <th className="px-2 py-1 text-left text-orange-700">Recorrente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-orange-100">
                    <td className="px-2 py-1 font-mono text-gray-600">ABC-123-XYZ</td>
                    <td className="px-2 py-1 text-gray-600">Sim</td>
                  </tr>
                  <tr className="border-t border-orange-100">
                    <td className="px-2 py-1 font-mono text-gray-600">DEF-456-UVW</td>
                    <td className="px-2 py-1 text-gray-600">Não</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[9px] text-orange-600 mt-2">
                Aceita: Sim/Não, sim/não, S/N, Yes/No. Apenas registros com chave_id no Excel serão alterados.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
