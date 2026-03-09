import React, { useState, useEffect } from 'react';
import { Shield, Users, X, Plus, Trash2, Save, AlertTriangle, CheckCircle2, User as UserIcon, Database, Search, Upload, Download, FileSpreadsheet, Eye, CheckCircle, Calculator, Pencil, Check, Filter, Tag, ArrowRightLeft, Play, Percent, Mail, Loader2, Calendar, Clock, Copy, Flag, Building2, Layers, CalendarDays, Hash, Trophy } from 'lucide-react';
import EngagementPanel from './EngagementPanel';
import MultiSelectFilter from './MultiSelectFilter';
import * as supabaseService from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
// ExcelJS carregado sob demanda via dynamic import
import type ExcelJS from 'exceljs';
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
  const [activeTab, setActiveTab] = useState<'import' | 'users' | 'recorrencia' | 'pdd' | 'tributos' | 'rateio' | 'depara' | 'smtp' | 'cronograma' | 'override'>('import');
  const [dadosSubTab, setDadosSubTab] = useState<'importar' | 'exportar'>('importar');
  const [usersSubTab, setUsersSubTab] = useState<'cadastro' | 'engajamento'>('cadastro');

  // Estados para aba Cronograma
  const [cronogramaItems, setCronogramaItems] = useState<supabaseService.CronogramaItem[]>([]);
  const [cronogramaLoading, setCronogramaLoading] = useState(false);
  const [cronogramaMonth, setCronogramaMonth] = useState(new Date().getMonth() + 1);
  const [cronogramaYear, setCronogramaYear] = useState(new Date().getFullYear());
  const [cronogramaMessage, setCronogramaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cronogramaEditing, setCronogramaEditing] = useState<supabaseService.CronogramaItem | null>(null);
  const [cronogramaShowForm, setCronogramaShowForm] = useState(false);
  const [cronogramaFormType, setCronogramaFormType] = useState<'task' | 'meeting'>('task');
  const [cronogramaForm, setCronogramaForm] = useState({
    date_label: '', area: '', area_color: '#6B7280', deliverable: '', action_description: '',
    meeting_day: '', meeting_time: '', meeting_brand: '', meeting_obs: '', sort_order: 0,
  });
  const [cronogramaDupMonth, setCronogramaDupMonth] = useState(new Date().getMonth() + 1);
  const [cronogramaDupYear, setCronogramaDupYear] = useState(new Date().getFullYear());
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [cronogramaFilterAreas, setCronogramaFilterAreas] = useState<string[]>([]);

  // Estados para aba PDD
  const [pddData, setPddData] = useState<supabaseService.SharePdd[]>([]);
  const [pddLoading, setPddLoading] = useState(false);
  const [pddEditingId, setPddEditingId] = useState<number | null>(null);
  const [pddEditValue, setPddEditValue] = useState('');
  const [pddSaving, setPddSaving] = useState(false);
  const [pddNewMarca, setPddNewMarca] = useState('');
  const [pddNewValor, setPddNewValor] = useState('');
  const [pddAdding, setPddAdding] = useState(false);
  const [pddMessage, setPddMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  // Estados para aba Rateio
  const [rateioLog, setRateioLog] = useState<supabaseService.RateioLog[]>([]);
  const [rateioLoading, setRateioLoading] = useState(false);
  const [rateioMesFilter, setRateioMesFilter] = useState('');
  const [rateioGroupBy, setRateioGroupBy] = useState<'filial' | 'marca'>('filial');
  const [rateioSort, setRateioSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'year_month', dir: 'asc' });

  // Contas PDD
  const [pddContas, setPddContas] = useState<supabaseService.PddConta[]>([]);
  const [pddAllTags, setPddAllTags] = useState<Array<{ tag0: string; tag01: string }>>([]);
  const [pddTag0Filter, setPddTag0Filter] = useState('');
  const [pddTag01Search, setPddTag01Search] = useState('');
  const [pddContasLoading, setPddContasLoading] = useState(false);

  // Estados para aba Tributos
  const [tribData, setTribData] = useState<supabaseService.TributoConfig[]>([]);
  const [tribLoading, setTribLoading] = useState(false);
  const [tribSaving, setTribSaving] = useState(false);
  const [tribEditingCell, setTribEditingCell] = useState<{ id: number; col: 'pis_cofins' | 'iss' | 'paa' } | null>(null);
  const [tribEditValue, setTribEditValue] = useState('');
  const [tribMessage, setTribMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [tribFilterMarca, setTribFilterMarca] = useState('');
  const [tribFilterFilial, setTribFilterFilial] = useState('');
  const [tribFilterTipoReceita, setTribFilterTipoReceita] = useState('');
  const [tribFilterPisCofins, setTribFilterPisCofins] = useState('');
  const [tribFilterIss, setTribFilterIss] = useState('');
  const [tribFilterPaa, setTribFilterPaa] = useState('');
  // Pendências (receita sem config)
  const [tribPendentes, setTribPendentes] = useState<supabaseService.TributoPendente[]>([]);
  const [tribPendentesLoading, setTribPendentesLoading] = useState(false);
  // Import Excel
  const [tribFile, setTribFile] = useState<File | null>(null);
  const [tribImportPreview, setTribImportPreview] = useState<{ marca: string; filial: string; tipo_receita: string; pis_cofins: number; iss: number; paa: number }[]>([]);
  const [tribImporting, setTribImporting] = useState(false);

  // Estados para aba Override Contábil
  const [overrideData, setOverrideData] = useState<supabaseService.OverrideContabil[]>([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideShowForm, setOverrideShowForm] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    tag01: '', marca: '', filial: '', mes_de: '', mes_ate: '', motivo: '',
  });

  // Estado para busca de usuários
  const [userSearch, setUserSearch] = useState('');

  // Estados para aba SMTP
  const [smtpHost, setSmtpHost] = useState('email-smtp.sa-east-1.amazonaws.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('DRE Raiz');
  const [smtpFromEmail, setSmtpFromEmail] = useState('noreply@raizeducacao.com.br');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // Estados para aba Banco / Exportar
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
  const [bancoTable, setBancoTable] = useState<supabaseService.ExportableTable>('transactions');

  // Estados para aba Recorrência
  const [recFile, setRecFile] = useState<File | null>(null);
  const [recPreview, setRecPreview] = useState<{chave_id: string, recurring: string}[]>([]);
  const [recUpdating, setRecUpdating] = useState(false);
  const [recProgress, setRecProgress] = useState(0);
  const [recMessage, setRecMessage] = useState<{type: 'success'|'error'|'info', text: string} | null>(null);
  const [recLog, setRecLog] = useState<{time: string, type: 'info'|'success'|'error'|'warn', text: string}[]>([]);

  // Estados para aba De-Para Fornecedores
  const [deparaData, setDeparaData] = useState<supabaseService.DeparaFornec[]>([]);
  const [deparaLoading, setDeparaLoading] = useState(false);
  const [deparaSearch, setDeparaSearch] = useState('');
  const [deparaTotalCount, setDeparaTotalCount] = useState(0);
  const [deparaSearching, setDeparaSearching] = useState(false);
  const [deparaIsSearchResult, setDeparaIsSearchResult] = useState(false);
  const [deparaEditingId, setDeparaEditingId] = useState<string | null>(null);
  const [deparaEditDe, setDeparaEditDe] = useState('');
  const [deparaEditPara, setDeparaEditPara] = useState('');
  const [deparaSaving, setDeparaSaving] = useState(false);
  const [deparaNewDe, setDeparaNewDe] = useState('');
  const [deparaNewPara, setDeparaNewPara] = useState('');
  const [deparaAdding, setDeparaAdding] = useState(false);
  const [deparaMessage, setDeparaMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deparaNormalizing, setDeparaNormalizing] = useState(false);
  const [deparaFile, setDeparaFile] = useState<File | null>(null);
  const [deparaImportPreview, setDeparaImportPreview] = useState<{fornecedor_de: string; fornecedor_para: string}[]>([]);
  const [deparaImporting, setDeparaImporting] = useState(false);
  const [deparaImportProgress, setDeparaImportProgress] = useState(0);
  const [deparaImportLog, setDeparaImportLog] = useState<{time: string; type: 'info'|'success'|'error'|'warn'; text: string}[]>([]);

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

  useEffect(() => {
    if (activeTab === 'pdd') {
      if (pddData.length === 0) loadPddData();
      if (pddAllTags.length === 0) loadPddContas();
    }
    if (activeTab === 'tributos') {
      if (tribData.length === 0) loadAllTributos();
      loadTributosPendentes();
    }
    if (activeTab === 'rateio' && rateioLog.length === 0) loadRateioLog();
    if (activeTab === 'depara' && deparaData.length === 0) loadDeparaData();
    if (activeTab === 'smtp' && !smtpConfigured && !smtpLoading) loadSmtpConfig();
    if (activeTab === 'cronograma') loadCronogramaData();
    if (activeTab === 'override' && overrideData.length === 0) loadOverrideData();
  }, [activeTab]);

  // Realtime: sincroniza share_pdd e pdd_contas com banco
  useEffect(() => {
    const unsub1 = supabaseService.subscribeSharePdd(() => {
      supabaseService.getSharePdd().then(setPddData);
    });
    const unsub2 = supabaseService.subscribePddContas(() => {
      supabaseService.getPddContas().then(setPddContas);
    });
    const unsub3 = supabaseService.subscribeDeparaFornec(() => {
      supabaseService.getDeparaFornecCount().then(setDeparaTotalCount);
    });
    const unsub4 = supabaseService.subscribeTributosConfig(() => {
      supabaseService.getAllTributosConfig().then(setTribData);
    });
    const unsub5 = supabaseService.subscribeCronogramaItems(() => {
      if (activeTab === 'cronograma') loadCronogramaData();
    });
    const unsub6 = supabaseService.subscribeOverrideContabil(() => {
      supabaseService.getOverrideContabil().then(setOverrideData);
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, []);

  // ---- Override Contábil handlers ----
  const loadOverrideData = async () => {
    setOverrideLoading(true);
    const data = await supabaseService.getOverrideContabil();
    setOverrideData(data);
    setOverrideLoading(false);
  };

  const handleOverrideAdd = async () => {
    if (!overrideForm.tag01.trim()) {
      setOverrideMessage({ type: 'error', text: 'Tag01 é obrigatório.' });
      return;
    }
    setOverrideSaving(true);
    const result = await supabaseService.insertOverrideContabil({
      tag01: overrideForm.tag01.trim(),
      marca: overrideForm.marca.trim() || null,
      filial: overrideForm.filial.trim() || null,
      mes_de: overrideForm.mes_de || null,
      mes_ate: overrideForm.mes_ate || null,
      motivo: overrideForm.motivo.trim(),
      ativo: true,
      created_by: currentUser?.email || null,
    });
    setOverrideSaving(false);
    if (result) {
      setOverrideMessage({ type: 'success', text: 'Override criado com sucesso.' });
      setOverrideForm({ tag01: '', marca: '', filial: '', mes_de: '', mes_ate: '', motivo: '' });
      setOverrideShowForm(false);
      loadOverrideData();
    } else {
      setOverrideMessage({ type: 'error', text: 'Erro ao criar override. Verifique permissões.' });
    }
  };

  const handleOverrideToggle = async (id: number, ativo: boolean) => {
    const res = await supabaseService.updateOverrideContabil(id, { ativo: !ativo });
    if (res.ok) loadOverrideData();
    else setOverrideMessage({ type: 'error', text: res.error || 'Erro ao atualizar.' });
  };

  const handleOverrideDelete = async (id: number) => {
    const ok = await supabaseService.deleteOverrideContabil(id);
    if (ok) {
      setOverrideMessage({ type: 'success', text: 'Override removido.' });
      loadOverrideData();
    } else {
      setOverrideMessage({ type: 'error', text: 'Erro ao remover.' });
    }
  };

  // ---- Cronograma handlers ----
  const DEFAULT_AREA_PRESETS = [
    { name: 'CSC', color: '#EC4899' },
    { name: 'CEO', color: '#3B82F6' },
    { name: 'MARCAS', color: '#6B7280' },
    { name: 'PLANFIN', color: '#10B981' },
    { name: 'CONTABILIDADE', color: '#F59E0B' },
    { name: 'FERIADO', color: '#1F2937' },
    { name: 'CSC + MARCAS', color: '#8B5CF6' },
  ];

  const [customAreas, setCustomAreas] = useState<{ name: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem('cronograma_custom_areas');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAreaManager, setShowAreaManager] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#6366F1');

  const AREA_PRESETS = [...DEFAULT_AREA_PRESETS, ...customAreas];

  const saveCustomAreas = (areas: { name: string; color: string }[]) => {
    setCustomAreas(areas);
    localStorage.setItem('cronograma_custom_areas', JSON.stringify(areas));
  };

  const handleAddCustomArea = () => {
    const trimmed = newAreaName.trim().toUpperCase();
    if (!trimmed) return;
    if (AREA_PRESETS.some(a => a.name === trimmed)) return;
    saveCustomAreas([...customAreas, { name: trimmed, color: newAreaColor }]);
    setNewAreaName('');
    setNewAreaColor('#6366F1');
  };

  const handleRemoveCustomArea = (name: string) => {
    saveCustomAreas(customAreas.filter(a => a.name !== name));
  };

  const loadCronogramaData = async () => {
    setCronogramaLoading(true);
    try {
      const data = await supabaseService.getCronogramaItems(cronogramaMonth, cronogramaYear);
      setCronogramaItems(data);
    } catch (err) {
      console.error('Erro ao carregar cronograma:', err);
    } finally {
      setCronogramaLoading(false);
    }
  };

  // Reload when month/year changes
  useEffect(() => {
    if (activeTab === 'cronograma') loadCronogramaData();
  }, [cronogramaMonth, cronogramaYear]);

  const resetCronogramaForm = () => {
    setCronogramaForm({
      date_label: '', area: '', area_color: '#6B7280', deliverable: '', action_description: '',
      meeting_day: '', meeting_time: '', meeting_brand: '', meeting_obs: '', sort_order: 0,
    });
    setCronogramaFormType('task');
    setCronogramaEditing(null);
  };

  const handleCronogramaEdit = (item: supabaseService.CronogramaItem) => {
    setCronogramaEditing(item);
    setCronogramaFormType(item.item_type);
    setCronogramaForm({
      date_label: item.date_label, area: item.area, area_color: item.area_color,
      deliverable: item.deliverable, action_description: item.action_description,
      meeting_day: item.meeting_day || '', meeting_time: item.meeting_time || '',
      meeting_brand: item.meeting_brand || '', meeting_obs: item.meeting_obs || '',
      sort_order: item.sort_order,
    });
    setCronogramaShowForm(true);
  };

  const handleCronogramaSave = async () => {
    setCronogramaMessage(null);
    const isMeeting = cronogramaFormType === 'meeting';

    if (cronogramaEditing) {
      // Update: só campos editáveis
      const updates: Partial<supabaseService.CronogramaItem> = {
        date_label: cronogramaForm.date_label, area: cronogramaForm.area,
        area_color: cronogramaForm.area_color, deliverable: cronogramaForm.deliverable,
        action_description: cronogramaForm.action_description, item_type: cronogramaFormType,
        meeting_day: isMeeting ? cronogramaForm.meeting_day || null : null,
        meeting_time: isMeeting ? cronogramaForm.meeting_time || null : null,
        meeting_brand: isMeeting ? cronogramaForm.meeting_brand || null : null,
        meeting_obs: isMeeting ? cronogramaForm.meeting_obs || null : null,
        sort_order: cronogramaForm.sort_order,
      };
      const { ok, error } = await supabaseService.updateCronogramaItem(cronogramaEditing.id, updates);
      if (!ok) { setCronogramaMessage({ type: 'error', text: error || 'Erro ao atualizar' }); return; }
      setCronogramaMessage({ type: 'success', text: 'Item atualizado!' });
    } else {
      // Insert: payload completo
      const payload: supabaseService.CronogramaItemInsert = {
        month: cronogramaMonth, year: cronogramaYear,
        date_label: cronogramaForm.date_label, area: cronogramaForm.area,
        area_color: cronogramaForm.area_color, deliverable: cronogramaForm.deliverable,
        action_description: cronogramaForm.action_description, item_type: cronogramaFormType,
        meeting_day: isMeeting ? cronogramaForm.meeting_day || null : null,
        meeting_time: isMeeting ? cronogramaForm.meeting_time || null : null,
        meeting_brand: isMeeting ? cronogramaForm.meeting_brand || null : null,
        meeting_obs: isMeeting ? cronogramaForm.meeting_obs || null : null,
        sort_order: cronogramaForm.sort_order, is_active: true,
        created_by: currentUser?.email || null,
      };
      const result = await supabaseService.insertCronogramaItem(payload);
      if (!result) { setCronogramaMessage({ type: 'error', text: 'Erro ao criar item' }); return; }
      setCronogramaMessage({ type: 'success', text: 'Item criado!' });
    }
    setCronogramaShowForm(false);
    resetCronogramaForm();
    loadCronogramaData();
  };

  const handleCronogramaDelete = async (id: string) => {
    if (!confirm('Excluir este item do cronograma?')) return;
    const ok = await supabaseService.deleteCronogramaItem(id);
    if (ok) {
      setCronogramaMessage({ type: 'success', text: 'Item excluído' });
      loadCronogramaData();
    } else {
      setCronogramaMessage({ type: 'error', text: 'Erro ao excluir' });
    }
  };

  const handleCronogramaDuplicate = async () => {
    setCronogramaMessage(null);
    const { ok, count, error } = await supabaseService.duplicateCronogramaMonth(
      cronogramaMonth, cronogramaYear, cronogramaDupMonth, cronogramaDupYear,
      currentUser?.email || ''
    );
    setShowDuplicateModal(false);
    if (ok) {
      setCronogramaMessage({ type: 'success', text: `${count} itens duplicados para ${cronogramaDupMonth}/${cronogramaDupYear}` });
    } else {
      setCronogramaMessage({ type: 'error', text: error || 'Erro ao duplicar' });
    }
  };

  const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // ---- De-Para Fornecedores handlers ----
  const loadDeparaData = async () => {
    setDeparaLoading(true);
    try {
      const [data, count] = await Promise.all([
        supabaseService.getDeparaFornec(),
        supabaseService.getDeparaFornecCount()
      ]);
      setDeparaData(data);
      setDeparaTotalCount(count);
      setDeparaIsSearchResult(false);
    } catch (error) {
      console.error('Erro ao carregar depara_fornec:', error);
    } finally {
      setDeparaLoading(false);
    }
  };

  const handleDeparaServerSearch = async () => {
    const term = deparaSearch.trim();
    if (!term) {
      // Limpar busca — recarregar dados iniciais
      loadDeparaData();
      return;
    }
    setDeparaSearching(true);
    try {
      const results = await supabaseService.searchDeparaFornec(term);
      setDeparaData(results);
      setDeparaIsSearchResult(true);
    } catch (error) {
      console.error('Erro ao buscar depara_fornec:', error);
    } finally {
      setDeparaSearching(false);
    }
  };

  const handleDeparaEdit = (item: supabaseService.DeparaFornec) => {
    setDeparaEditingId(item.fornecedor_de);
    setDeparaEditDe(item.fornecedor_de);
    setDeparaEditPara(item.fornecedor_para);
  };

  const handleDeparaCancelEdit = () => {
    setDeparaEditingId(null);
    setDeparaEditDe('');
    setDeparaEditPara('');
  };

  const handleDeparaSave = async (fornecedor_de_old: string) => {
    if (!deparaEditDe.trim() || !deparaEditPara.trim()) {
      setDeparaMessage({ type: 'error', text: 'Preencha ambos os campos.' });
      return;
    }
    setDeparaSaving(true);
    const result = await supabaseService.updateDeparaFornec(fornecedor_de_old, deparaEditDe, deparaEditPara);
    if (result.ok) {
      setDeparaMessage({ type: 'success', text: 'Registro atualizado!' });
      handleDeparaCancelEdit();
      loadDeparaData();
    } else {
      setDeparaMessage({ type: 'error', text: result.error || 'Erro ao atualizar.' });
    }
    setDeparaSaving(false);
    setTimeout(() => setDeparaMessage(null), 3000);
  };

  const handleDeparaAdd = async () => {
    if (!deparaNewDe.trim() || !deparaNewPara.trim()) {
      setDeparaMessage({ type: 'error', text: 'Preencha ambos os campos.' });
      return;
    }
    setDeparaAdding(true);
    const result = await supabaseService.insertDeparaFornec(deparaNewDe, deparaNewPara);
    if (result) {
      setDeparaMessage({ type: 'success', text: 'Registro adicionado!' });
      setDeparaNewDe('');
      setDeparaNewPara('');
      loadDeparaData();
    } else {
      setDeparaMessage({ type: 'error', text: 'Erro ao adicionar. Fornecedor "De" já existe?' });
    }
    setDeparaAdding(false);
    setTimeout(() => setDeparaMessage(null), 3000);
  };

  const handleDeparaDelete = async (fornecedor_de: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    const ok = await supabaseService.deleteDeparaFornec(fornecedor_de);
    if (ok) {
      setDeparaMessage({ type: 'success', text: 'Registro excluído.' });
      loadDeparaData();
    } else {
      setDeparaMessage({ type: 'error', text: 'Erro ao excluir.' });
    }
    setTimeout(() => setDeparaMessage(null), 3000);
  };

  const handleNormalizarFornecedores = async () => {
    if (!confirm('Executar normalização de fornecedores agora? Isso atualizará nomes em transactions conforme o de-para.')) return;
    setDeparaNormalizing(true);
    const result = await supabaseService.runNormalizarFornecedores();
    if (result.ok) {
      const d = result.data;
      const real = d?.real ?? 0;
      const orcado = d?.orcado ?? 0;
      const ant = d?.ano_anterior ?? 0;
      const total = d?.total ?? 0;
      setDeparaMessage({ type: 'success', text: `Normalização concluída! ${total} registros — Real: ${real} | Orçado: ${orcado} | Ano Anterior: ${ant}` });
    } else {
      setDeparaMessage({ type: 'error', text: result.error || 'Erro ao normalizar.' });
    }
    setDeparaNormalizing(false);
    setTimeout(() => setDeparaMessage(null), 5000);
  };

  // deparaData já vem filtrado do servidor (via searchDeparaFornec) ou os primeiros 1000

  const addDeparaLog = (type: 'info'|'success'|'error'|'warn', text: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setDeparaImportLog(prev => [...prev, { time, type, text }]);
  };

  const handleDeparaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDeparaFile(file);
    setDeparaImportPreview([]);
    setDeparaImportLog([]);
    setDeparaImportProgress(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        // Detectar colunas: tentar variações comuns
        const mapped: {fornecedor_de: string; fornecedor_para: string}[] = [];
        let skipped = 0;

        for (const row of rows) {
          const de = String(row['Fornecedor De'] || row['fornecedor_de'] || row['DE'] || row['de'] || row['FORNECEDOR_DE'] || '').trim();
          const para = String(row['Fornecedor Para'] || row['fornecedor_para'] || row['PARA'] || row['para'] || row['FORNECEDOR_PARA'] || '').trim();
          if (de && para) {
            mapped.push({ fornecedor_de: de, fornecedor_para: para });
          } else {
            skipped++;
          }
        }

        if (mapped.length === 0) {
          setDeparaMessage({ type: 'error', text: 'Nenhuma linha válida. Verifique se as colunas "Fornecedor De" e "Fornecedor Para" existem.' });
          return;
        }

        setDeparaImportPreview(mapped);
        setDeparaMessage({ type: 'success', text: `${mapped.length} registros carregados${skipped > 0 ? ` (${skipped} linhas ignoradas)` : ''}. Revise e clique em "Importar".` });
      } catch (error) {
        console.error('Erro ao ler arquivo de-para:', error);
        setDeparaMessage({ type: 'error', text: 'Erro ao ler arquivo. Verifique o formato.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeparaImport = async () => {
    if (deparaImportPreview.length === 0) return;
    if (!confirm(`Importar ${deparaImportPreview.length} registros de de-para? Registros existentes serão atualizados.`)) return;

    setDeparaImporting(true);
    setDeparaImportProgress(0);
    setDeparaImportLog([]);
    addDeparaLog('info', `Iniciando importação de ${deparaImportPreview.length} registros...`);

    const batchSize = 100;
    const totalBatches = Math.ceil(deparaImportPreview.length / batchSize);
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = start + batchSize;
      const batch = deparaImportPreview.slice(start, end);

      addDeparaLog('info', `Batch ${i + 1}/${totalBatches} — ${batch.length} registros...`);

      try {
        const result = await supabaseService.upsertDeparaFornecBatch(batch);
        if (result.error) {
          addDeparaLog('error', `Batch ${i + 1}: ${result.error}`);
          totalErrors += batch.length;
        } else {
          totalInserted += result.inserted;
          addDeparaLog('success', `Batch ${i + 1}: ${result.inserted} registros`);
        }
      } catch (err: any) {
        addDeparaLog('error', `Batch ${i + 1}: ERRO — ${err.message}`);
        totalErrors += batch.length;
      }

      setDeparaImportProgress(((i + 1) / totalBatches) * 100);
    }

    addDeparaLog('success', `Concluído: ${totalInserted} registros importados${totalErrors > 0 ? `, ${totalErrors} erros` : ''}`);
    setDeparaImporting(false);
    setDeparaImportPreview([]);
    setDeparaFile(null);
    loadDeparaData();
    setTimeout(() => setDeparaMessage(null), 5000);
  };

  const handleDeparaClearImport = () => {
    setDeparaFile(null);
    setDeparaImportPreview([]);
    setDeparaImportLog([]);
    setDeparaImportProgress(0);
  };

  const loadAvailableValues = async () => {
    try {
      const [marcas, filiais, categories, tag01Values, tag02s, tag03s] = await Promise.all([
        supabaseService.getDistinctColumn('transactions', 'marca'),
        supabaseService.getDistinctColumn('transactions', 'nome_filial'),
        supabaseService.getDistinctColumn('transactions', 'conta_contabil'),
        supabaseService.getDistinctColumn('transactions', 'tag01'),
        supabaseService.getDistinctColumn('transactions', 'tag02'),
        supabaseService.getDistinctColumn('transactions', 'tag03'),
      ]);
      const tags = [...new Set([...tag01Values, ...tag02s, ...tag03s])].sort();
      setAvailableValues({ marcas, filiais, categories, tags, tag01Values });
    } catch (error) {
      console.error('Erro ao carregar valores disponíveis:', error);
    }
  };

  const loadPddData = async () => {
    setPddLoading(true);
    try {
      const data = await supabaseService.getSharePdd();
      setPddData(data);
    } catch (error) {
      console.error('Erro ao carregar share_pdd:', error);
    } finally {
      setPddLoading(false);
    }
  };

  const handlePddEdit = (item: supabaseService.SharePdd) => {
    setPddEditingId(item.id);
    setPddEditValue(String(item.valor).replace('.', ','));
  };

  const handlePddSave = async (id: number) => {
    const parsed = parseFloat(pddEditValue.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      showPddMessage('error', 'Valor inválido. Use entre 0 e 100 (ex: 5,00)');
      return;
    }
    setPddSaving(true);
    const result = await supabaseService.updateSharePdd(id, parsed);
    if (result.ok) {
      setPddData(prev => prev.map(p => p.id === id ? { ...p, valor: parsed, updated_at: new Date().toISOString() } : p));
      showPddMessage('success', 'Percentual atualizado');
    } else {
      showPddMessage('error', result.error || 'Erro ao salvar');
    }
    setPddEditingId(null);
    setPddSaving(false);
  };

  const handlePddCancel = () => {
    setPddEditingId(null);
    setPddEditValue('');
  };

  const showPddMessage = (type: 'success' | 'error', text: string) => {
    setPddMessage({ type, text });
    setTimeout(() => setPddMessage(null), 4000);
  };

  const handlePddAdd = async () => {
    const marca = pddNewMarca.toUpperCase().trim();
    if (!marca) { showPddMessage('error', 'Informe a sigla da marca'); return; }
    if (pddData.some(p => p.marca === marca)) { showPddMessage('error', `Marca "${marca}" já existe`); return; }
    const parsed = parseFloat(pddNewValor.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0 || parsed > 100) { showPddMessage('error', 'Valor deve ser entre 0 e 100'); return; }
    setPddAdding(true);
    const result = await supabaseService.insertSharePdd(marca, parsed);
    if (result) {
      setPddData(prev => [...prev, result].sort((a, b) => a.marca.localeCompare(b.marca)));
      setPddNewMarca('');
      setPddNewValor('');
      showPddMessage('success', `Marca "${marca}" adicionada com ${parsed}%`);
    } else {
      showPddMessage('error', 'Erro ao inserir. Verifique se a marca já existe.');
    }
    setPddAdding(false);
  };

  const handlePddDelete = async (item: supabaseService.SharePdd) => {
    if (!confirm(`Excluir marca "${item.marca}" da tabela PDD?`)) return;
    const ok = await supabaseService.deleteSharePdd(item.id);
    if (ok) {
      setPddData(prev => prev.filter(p => p.id !== item.id));
      showPddMessage('success', `Marca "${item.marca}" removida`);
    } else {
      showPddMessage('error', 'Erro ao excluir');
    }
  };

  const loadRateioLog = async () => {
    setRateioLoading(true);
    try {
      const data = await supabaseService.getRateioLog();
      setRateioLog(data);
    } catch (e) {
      console.error('Erro ao carregar rateio log:', e);
    } finally {
      setRateioLoading(false);
    }
  };

  const loadPddContas = async () => {
    setPddContasLoading(true);
    try {
      const [contas, tags] = await Promise.all([
        supabaseService.getPddContas(),
        supabaseService.getAllTag01WithTag0(),
      ]);
      setPddContas(contas);
      setPddAllTags(tags);
    } catch (e) {
      console.error('Erro ao carregar contas PDD:', e);
    } finally {
      setPddContasLoading(false);
    }
  };

  const handleToggleConta = async (tag0: string, tag01: string) => {
    const existing = pddContas.find(c => c.tag0 === tag0 && c.tag01 === tag01);
    if (existing) {
      const ok = await supabaseService.removePddConta(existing.id);
      if (ok) {
        setPddContas(prev => prev.filter(c => c.id !== existing.id));
      } else {
        showPddMessage('error', `Erro ao remover "${tag01}"`);
      }
    } else {
      const result = await supabaseService.addPddConta(tag0, tag01);
      if (result) {
        setPddContas(prev => [...prev, result].sort((a, b) => a.tag0.localeCompare(b.tag0) || a.tag01.localeCompare(b.tag01)));
      } else {
        showPddMessage('error', `Erro ao adicionar "${tag01}" — verifique se a tabela pdd_contas existe no Supabase`);
      }
    }
  };

  const isContaSelected = (tag0: string, tag01: string) =>
    pddContas.some(c => c.tag0 === tag0 && c.tag01 === tag01);

  // ---- Tributos handlers ----
  const loadAllTributos = async () => {
    setTribLoading(true);
    try {
      const data = await supabaseService.getAllTributosConfig();
      setTribData(data);
    } catch (error) {
      console.error('Erro ao carregar tributos_config:', error);
    } finally {
      setTribLoading(false);
    }
  };

  const loadTributosPendentes = async () => {
    setTribPendentesLoading(true);
    try {
      const data = await supabaseService.getTributosPendentes();
      setTribPendentes(data);
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
    } finally {
      setTribPendentesLoading(false);
    }
  };

  const showTribMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setTribMessage({ type, text });
    setTimeout(() => setTribMessage(null), 5000);
  };

  const handleTribCellClick = (id: number, col: 'pis_cofins' | 'iss' | 'paa') => {
    const row = tribData.find(r => r.id === id);
    if (!row) return;
    setTribEditingCell({ id, col });
    setTribEditValue(String(row[col]).replace('.', ','));
  };

  const handleTribCellSave = async () => {
    if (!tribEditingCell) return;
    const { id, col } = tribEditingCell;
    const parsed = parseFloat(tribEditValue.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      showTribMessage('error', 'Valor inválido. Use entre 0 e 100.');
      return;
    }
    setTribSaving(true);
    const result = await supabaseService.updateTributoConfig(id, { [col]: parsed });
    if (result.ok) {
      setTribData(prev => prev.map(r => r.id === id ? { ...r, [col]: parsed, updated_at: new Date().toISOString() } : r));
      showTribMessage('success', 'Alíquota atualizada');
    } else {
      showTribMessage('error', result.error || 'Erro ao salvar');
    }
    setTribEditingCell(null);
    setTribEditValue('');
    setTribSaving(false);
  };

  const handleTribCellCancel = () => {
    setTribEditingCell(null);
    setTribEditValue('');
  };

  const handleTribDelete = async (item: supabaseService.TributoConfig) => {
    if (!confirm(`Excluir alíquota "${item.tipo_receita}" da filial "${item.filial}"?`)) return;
    const ok = await supabaseService.deleteTributoConfig(item.id);
    if (ok) {
      setTribData(prev => prev.filter(r => r.id !== item.id));
      showTribMessage('success', 'Registro removido');
    } else {
      showTribMessage('error', 'Erro ao excluir');
    }
  };

  const handleTribFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTribFile(file);
    setTribImportPreview([]);
    setTribMessage(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws);
        if (raw.length === 0) { showTribMessage('error', 'Arquivo vazio!'); return; }

        const mapped: typeof tribImportPreview = [];
        let skipped = 0;
        for (const row of raw) {
          const marca = String(row['marca'] || row['Marca'] || row['MARCA'] || '').trim();
          const filial = String(row['filial'] || row['Filial'] || row['FILIAL'] || '').trim();
          const tipo = String(row['tipo_receita'] || row['Tipo Receita'] || row['TIPO_RECEITA'] || row['tipo receita'] || '').trim();
          if (!marca || !filial || !tipo) { skipped++; continue; }
          const pis = parseFloat(String(row['pis_cofins'] || row['PIS/COFINS'] || row['pis cofins'] || 0).replace(',', '.')) || 0;
          const iss = parseFloat(String(row['iss'] || row['ISS'] || 0).replace(',', '.')) || 0;
          const paa = parseFloat(String(row['paa'] || row['PAA'] || 0).replace(',', '.')) || 0;
          mapped.push({ marca, filial, tipo_receita: tipo, pis_cofins: pis, iss, paa });
        }
        if (mapped.length === 0) {
          showTribMessage('error', 'Nenhuma linha válida. Verifique as colunas: marca, filial, tipo_receita, pis_cofins, iss, paa');
          return;
        }
        setTribImportPreview(mapped);
        showTribMessage('info', `${mapped.length} registros carregados${skipped > 0 ? ` (${skipped} ignorados)` : ''}. Revise e clique em "Importar".`);
      } catch (error) {
        console.error('Erro ao ler arquivo tributos:', error);
        showTribMessage('error', 'Erro ao ler arquivo. Verifique o formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTribImport = async () => {
    if (tribImportPreview.length === 0) return;
    if (!confirm(`Importar/atualizar ${tribImportPreview.length} registros de tributos?`)) return;
    setTribImporting(true);
    const batchSize = 50;
    let ok = true;
    for (let i = 0; i < tribImportPreview.length; i += batchSize) {
      const batch = tribImportPreview.slice(i, i + batchSize);
      const result = await supabaseService.upsertTributosConfig(batch);
      if (!result.ok) { showTribMessage('error', result.error || 'Erro no batch'); ok = false; break; }
    }
    if (ok) {
      showTribMessage('success', `${tribImportPreview.length} registros importados/atualizados com sucesso!`);
      setTribImportPreview([]);
      setTribFile(null);
      loadAllTributos();
    }
    setTribImporting(false);
  };

  const handleTribDownloadTemplate = () => {
    const header = ['marca', 'filial', 'tipo_receita', 'pis_cofins', 'iss', 'paa'];
    const examples = [
      ['SEB', 'SEB - Escola Conceito', 'Receita De Mensalidade', '9,25', '5,00', '2,50'],
      ['SEB', 'SEB - Escola Conceito', 'Material Didático', '9,25', '0,00', '0,00'],
      ['SEB', 'SEB - Escola Conceito', 'Integral', '9,25', '5,00', '2,50'],
      ['SEB', 'SEB - Escola Conceito', 'Receitas Extras', '9,25', '5,00', '0,00'],
      ['SEB', 'SEB - Escola Conceito', 'Receitas Não Operacionais', '3,65', '0,00', '0,00'],
    ];
    const wsData = [header, ...examples];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tributos');
    XLSX.writeFile(wb, 'template_tributos.xlsx');
  };

  const tribMarcas = [...new Set(tribData.map(r => r.marca))].sort();
  const tribFiliaisDisponiveis = tribFilterMarca
    ? [...new Set(tribData.filter(r => r.marca === tribFilterMarca).map(r => r.filial))].sort()
    : [...new Set(tribData.map(r => r.filial))].sort();
  const tribTiposReceita = (() => {
    let base = tribData;
    if (tribFilterMarca) base = base.filter(r => r.marca === tribFilterMarca);
    if (tribFilterFilial) base = base.filter(r => r.filial === tribFilterFilial);
    return [...new Set(base.map(r => r.tipo_receita))].sort();
  })();
  const tribPisCofinsValues = [...new Set(tribData.map(r => String(r.pis_cofins)))].sort((a, b) => Number(a) - Number(b));
  const tribIssValues = [...new Set(tribData.map(r => String(r.iss)))].sort((a, b) => Number(a) - Number(b));
  const tribPaaValues = [...new Set(tribData.map(r => String(r.paa)))].sort((a, b) => Number(a) - Number(b));

  const tribFiltered = tribData.filter(r => {
    if (tribFilterMarca && r.marca !== tribFilterMarca) return false;
    if (tribFilterFilial && r.filial !== tribFilterFilial) return false;
    if (tribFilterTipoReceita && r.tipo_receita !== tribFilterTipoReceita) return false;
    if (tribFilterPisCofins && String(r.pis_cofins) !== tribFilterPisCofins) return false;
    if (tribFilterIss && String(r.iss) !== tribFilterIss) return false;
    if (tribFilterPaa && String(r.paa) !== tribFilterPaa) return false;
    return true;
  });

  const handleTribExport = async () => {
    if (tribFiltered.length === 0) { showTribMessage('error', 'Nenhum dado para exportar'); return; }
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tributos');

    // Header
    const headerRow = ws.addRow(['Marca', 'Filial', 'Tipo de Receita', 'PIS/COFINS %', 'ISS %', 'PAA %']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFB45309' } } };
    });

    // Data
    for (const r of tribFiltered) {
      const row = ws.addRow([r.marca, r.filial, r.tipo_receita, r.pis_cofins, r.iss, r.paa]);
      [4, 5, 6].forEach(i => {
        const cell = row.getCell(i);
        cell.numFmt = '0.00"%"';
        cell.alignment = { horizontal: 'center' };
      });
    }

    // Column widths
    ws.columns = [{ width: 12 }, { width: 32 }, { width: 30 }, { width: 14 }, { width: 10 }, { width: 10 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = tribFilterMarca ? `_${tribFilterMarca}` : '';
    a.download = `tributos_config${suffix}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showTribMessage('success', `${tribFiltered.length} registros exportados`);
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

  const showBancoMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setBancoMessage({ type, text });
    setTimeout(() => setBancoMessage(null), 5000);
  };

  const TABLE_LABELS: Record<supabaseService.ExportableTable, string> = {
    transactions: 'Transações (Real)',
    transactions_orcado: 'Orçado',
    transactions_ano_anterior: 'Ano Anterior (A-1)',
    dre_fabric: 'DRE Fabric',
  };

  const handleExportBanco = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    showBancoMessage('info', `Buscando dados de ${TABLE_LABELS[bancoTable]}...`);
    try {
      const exportFilters: supabaseService.ExportTableFilters = {
        year: bancoYear,
        ...(bancoMonths.length  > 0 && { months:  bancoMonths  }),
        ...(bancoMarcas.length  > 0 && { marcas:  bancoMarcas  }),
        ...(bancoFiliais.length > 0 && { filiais: bancoFiliais }),
        ...(bancoTags01.length  > 0 && { tags01:  bancoTags01  }),
        ...(bancoTags02.length  > 0 && { tags02:  bancoTags02  }),
        ...(bancoTags03.length  > 0 && { tags03:  bancoTags03  }),
      };

      const rows = await supabaseService.exportTableData(bancoTable, exportFilters);

      if (rows.length === 0) {
        showBancoMessage('error', 'Nenhum registro encontrado com os filtros aplicados.');
        setIsExporting(false);
        return;
      }

      // Exportar todas as colunas da tabela (dinâmico)
      const allKeys = [...new Set(rows.flatMap(r => Object.keys(r)))];
      const exportData = rows.map(row => {
        const obj: Record<string, unknown> = {};
        for (const key of allKeys) {
          obj[key] = row[key] ?? '';
        }
        return obj;
      });

      const sheetName = TABLE_LABELS[bancoTable].substring(0, 31); // Excel limit
      const filterLabel = [
        bancoTable,
        bancoYear,
        bancoMonths.length ? bancoMonths.join('_') : 'todos',
        bancoMarcas.length ? bancoMarcas.slice(0, 2).join('_') : '',
      ].filter(Boolean).join('_');

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        // Auto-width: min 12, max 40
        ws['!cols'] = allKeys.map(k => ({ wch: Math.min(40, Math.max(12, k.length + 4)) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filterLabel}_${rows.length}reg.xlsx`);
      } else {
        const headers = allKeys.join(';');
        const csvRows = exportData.map(row =>
          allKeys.map(k => {
            const v = row[k];
            if (v == null) return '';
            const s = String(v);
            return (s.includes(';') || s.includes('"') || s.includes('\n'))
              ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(';')
        );
        const csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filterLabel}_${rows.length}reg.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showBancoMessage('success', `${rows.length} registros de ${TABLE_LABELS[bancoTable]} exportados com sucesso!`);
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
    const wasPending = selectedUser?.role === 'pending';
    setSaving(true);
    const success = await supabaseService.updateUserRole(userId, newRole);

    if (success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
      showMessage('success', 'Função atualizada com sucesso!');

      // Se saiu de pending → oferece enviar email de boas-vindas
      if (wasPending && newRole !== 'pending') {
        setShowWelcomeModal(true);
      }
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

  const [sendingEmail, setSendingEmail] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const handleSendWelcomeEmail = async () => {
    if (!selectedUser) return;
    if (selectedUser.role === 'pending') {
      showMessage('error', 'Configure o perfil do usuário antes de enviar o email de liberação.');
      return;
    }

    const marcaPerms = permissions
      .filter(p => p.permission_type === 'cia')
      .map(p => p.permission_value);
    const marcasText = marcaPerms.length > 0 ? marcaPerms.join(', ') : 'Acesso total';

    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          marcas: marcasText,
        }),
      });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        showMessage('error', `Resposta inesperada do servidor: ${text.slice(0, 100)}`);
        setSendingEmail(false);
        return;
      }
      if (data.sent) {
        showMessage('success', `Email de liberação enviado para ${selectedUser.email}!`);
      } else {
        showMessage('error', `Falha ao enviar email: ${data.reason || data.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      showMessage('error', `Erro ao enviar email: ${err.message}`);
    }
    setSendingEmail(false);
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

  // Baixar template Excel para importação manual (transactions_manual)
  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'DRE Raiz';
    const ws = wb.addWorksheet('Carga Manual', { views: [{ state: 'frozen', ySplit: 2 }] });

    // Definição das colunas: header, width, obrigatório
    const cols: { header: string; key: string; width: number; required: boolean }[] = [
      { header: 'Data',            key: 'data',            width: 14, required: true },
      { header: 'Marca',           key: 'marca',           width: 12, required: true },
      { header: 'Unidade',         key: 'unidade',         width: 14, required: true },
      { header: 'Conta Contábil',  key: 'conta_contabil',  width: 22, required: true },
      { header: 'Valor',           key: 'valor',           width: 16, required: true },
      { header: 'Descrição',       key: 'descricao',       width: 40, required: true },
      { header: 'Fornecedor',      key: 'fornecedor',      width: 30, required: true },
      { header: 'C.Custo',         key: 'ccusto',          width: 16, required: false },
      { header: 'Segmento',        key: 'segmento',        width: 16, required: false },
      { header: 'Projeto',         key: 'projeto',         width: 18, required: false },
      { header: 'Recorrente',      key: 'recorrente',      width: 14, required: false },
      { header: 'Tipo',            key: 'tipo',            width: 16, required: false },
      { header: 'Nat Orc',         key: 'nat_orc',         width: 14, required: false },
      { header: 'Ticket',          key: 'ticket',          width: 12, required: false },
    ];

    ws.columns = cols.map(c => ({ header: c.header, key: c.key, width: c.width }));

    // ── Cores (padrão Raiz) ──
    const ORANGE_DARK  = 'FFD97706'; // header obrigatório
    const ORANGE_LIGHT = 'FFFEF3C7'; // fundo obrigatório (dados)
    const GRAY_DARK    = 'FF6B7280'; // header opcional
    const GRAY_LIGHT   = 'FFF9FAFB'; // fundo opcional (dados)
    const WHITE        = 'FFFFFFFF';
    const BLACK        = 'FF1F2937';
    const BORDER_COLOR = 'FFE5E7EB';
    const TEAL_DARK    = 'FF0D9488'; // legenda "Manual"
    const TEAL_LIGHT   = 'FFF0FDFA';

    const thinBorder = { style: 'thin' as const, color: { argb: BORDER_COLOR } };
    const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    // ── Linha 1: Título ──
    ws.spliceRows(1, 0, []);
    const titleCell = ws.getCell('A1');
    titleCell.value = 'MODELO DE CARGA MANUAL — DRE RAIZ';
    titleCell.font = { bold: true, size: 13, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.mergeCells(1, 1, 1, cols.length);
    ws.getRow(1).height = 32;
    // Preencher fundo do merge inteiro
    for (let c = 2; c <= cols.length; c++) {
      const mc = ws.getCell(1, c);
      mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    }

    // ── Linha 2: Headers (já adicionados pelo ws.columns, agora estão na row 2) ──
    const headerRow = ws.getRow(2);
    headerRow.height = 28;
    cols.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      const isReq = col.required;
      cell.font = { bold: true, size: 10, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReq ? ORANGE_DARK : GRAY_DARK } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = allBorders;
    });

    // ── Linhas de exemplo (3 e 4) ──
    const examples = [
      { data: '2026-03-01', marca: 'CGS', unidade: 'BOT', conta_contabil: '4.1.1.01.01.01', valor: 1500.50, descricao: 'Exemplo de lançamento manual', fornecedor: 'FORNECEDOR EXEMPLO LTDA', ccusto: '', segmento: '', projeto: '', recorrente: 'Sim', tipo: 'FIXED_COST', nat_orc: '', ticket: '' },
      { data: '2026-03-01', marca: 'CGS', unidade: 'GUA', conta_contabil: '4.2.1.13.01.03', valor: -2500, descricao: 'Provisão PDD manual', fornecedor: 'Planejamento Financeiro', ccusto: '', segmento: '', projeto: '', recorrente: 'Sim', tipo: 'SGA', nat_orc: '', ticket: '' },
    ];
    examples.forEach(ex => {
      const row = ws.addRow(ex);
      row.height = 22;
      cols.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        cell.font = { size: 10, color: { argb: BLACK }, italic: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? ORANGE_LIGHT : GRAY_LIGHT } };
        cell.alignment = { horizontal: i === 4 ? 'right' : 'left', vertical: 'middle' };
        cell.border = allBorders;
        if (col.key === 'valor') cell.numFmt = '#,##0.00';
      });
    });

    // ── Linhas em branco para preenchimento (5 a 104) ──
    for (let r = 0; r < 100; r++) {
      const row = ws.addRow({});
      row.height = 20;
      cols.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? 'FFFFFBEB' : WHITE } };
        cell.border = allBorders;
        cell.font = { size: 10, color: { argb: BLACK } };
        if (col.key === 'valor') cell.numFmt = '#,##0.00';
        if (col.key === 'data') cell.numFmt = 'YYYY-MM-DD';
      });
    }

    // ── Aba "Legenda" ──
    const lg = wb.addWorksheet('Legenda');
    lg.columns = [{ width: 22 }, { width: 14 }, { width: 60 }, { width: 30 }];

    const lgTitle = lg.addRow(['LEGENDA DO MODELO DE CARGA MANUAL']);
    lgTitle.getCell(1).font = { bold: true, size: 13, color: { argb: WHITE } };
    lgTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    lgTitle.height = 32;
    lg.mergeCells(1, 1, 1, 4);
    for (let c = 2; c <= 4; c++) lg.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

    const lgHeader = lg.addRow(['Coluna', 'Obrigatório', 'Descrição', 'Exemplo']);
    lgHeader.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_DARK } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = allBorders;
    });
    lgHeader.height = 24;

    const legendRows: [string, string, string, string][] = [
      ['Data',            'SIM', 'Data do lançamento no formato YYYY-MM-DD',          '2026-03-01'],
      ['Marca',           'SIM', 'Sigla da marca (deve existir no sistema)',           'CGS, SAP, PHYTUS'],
      ['Unidade',         'SIM', 'Código da filial (trigger gera nome_filial)',        'BOT, GUA, SPA'],
      ['Conta Contábil',  'SIM', 'Código contábil (trigger preenche tag01/02/03/tag0)','4.1.1.01.01.01'],
      ['Valor',           'SIM', 'Positivo ou negativo. Usar ponto decimal',           '1500.50 ou -2500'],
      ['Descrição',       'SIM', 'Texto descritivo do lançamento',                     'Provisão PDD'],
      ['Fornecedor',      'SIM', 'Nome do fornecedor ou origem',                       'FORNECEDOR LTDA'],
      ['C.Custo',         'NÃO', 'Centro de custo (tag01). Se vazio, trigger preenche','MARKETING'],
      ['Segmento',        'NÃO', 'Segmento (tag02). Se vazio, trigger preenche',       'DIGITAL'],
      ['Projeto',         'NÃO', 'Projeto (tag03). Se vazio, trigger preenche',        'CAMPANHA-2026'],
      ['Recorrente',      'NÃO', 'Sim ou Não (default: Sim)',                          'Sim'],
      ['Tipo',            'NÃO', 'REVENUE, FIXED_COST, VARIABLE_COST, SGA, RATEIO',   'FIXED_COST'],
      ['Nat Orc',         'NÃO', 'Natureza orçamentária',                              ''],
      ['Ticket',          'NÃO', 'Número do ticket/chamado',                           '123456'],
    ];
    legendRows.forEach(([colName, req, desc, ex]) => {
      const row = lg.addRow([colName, req, desc, ex]);
      row.height = 22;
      const isReq = req === 'SIM';
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 10, color: { argb: BLACK }, bold: colNumber === 1 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReq ? ORANGE_LIGHT : GRAY_LIGHT } };
        cell.alignment = { horizontal: colNumber === 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
        cell.border = allBorders;
      });
    });

    // Linha de status Manual
    lg.addRow([]);
    const manualRow = lg.addRow(['Status: Manual']);
    manualRow.getCell(1).font = { bold: true, size: 10, color: { argb: TEAL_DARK } };
    manualRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
    manualRow.getCell(1).border = allBorders;
    lg.mergeCells(manualRow.number, 1, manualRow.number, 4);
    for (let c = 2; c <= 4; c++) {
      lg.getCell(manualRow.number, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
      lg.getCell(manualRow.number, c).border = allBorders;
    }
    const noteRow = lg.addRow(['Todos os lançamentos importados recebem status "Manual" e cenário "Real" automaticamente. tag0, tag01, tag02, tag03 e nome_filial são preenchidos por triggers do banco.']);
    noteRow.getCell(1).font = { size: 9, color: { argb: GRAY_DARK }, italic: true };
    lg.mergeCells(noteRow.number, 1, noteRow.number, 4);

    // ── Download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Modelo_Carga_Manual_DRE_RAIZ_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    showImportMessage('success', 'Modelo baixado com sucesso!');
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

        // Detectar se a primeira linha é título (modelo formatado com header na row 2)
        // Tenta ler normalmente; se não encontra colunas conhecidas, pula row 1
        let data = XLSX.utils.sheet_to_json(ws) as any[];
        if (data.length > 0) {
          const firstKeys = Object.keys(data[0]);
          const knownCols = ['Data', 'Marca', 'Unidade', 'Valor', 'Conta Contábil', 'Descrição', 'Fornecedor'];
          const hasKnownCol = knownCols.some(k => firstKeys.includes(k));
          if (!hasKnownCol) {
            // Primeira linha é título — re-ler a partir da row 2 (index 1)
            data = XLSX.utils.sheet_to_json(ws, { range: 1 }) as any[];
          }
        }

        // Filtrar linhas vazias (linhas pré-formatadas do template sem dados)
        data = data.filter((row: any) => {
          const val = row['Valor'] || row['Amount'] || row['amount'];
          const dt = row['Data'] || row['date'];
          return val !== undefined && val !== '' && val !== null && dt;
        });

        if (data.length === 0) {
          showImportMessage('error', 'Arquivo vazio! Adicione dados no Excel.');
          return;
        }

        // Mapear colunas do Excel para Transaction
        const batchTs = Date.now();
        const mappedData = data.map((row: any, index: number) => {
          const dt = row['Data'] || row['date'] || new Date().toISOString().split('T')[0];
          const marca = row['Marca'] || row['Brand'] || row['marca'] || '';
          const filial = row['Unidade'] || row['Filial'] || row['Branch'] || row['filial'] || '';
          const yearMonth = String(dt).substring(0, 7); // YYYY-MM
          return {
            id: `MAN-${batchTs}-${index}`,
            chave_id: `MAN_${yearMonth}_${marca}_${filial}_${String(index + 1).padStart(4, '0')}`,
            scenario: 'Real',
            date: dt,
            conta_contabil: row['Conta Contábil'] || row['Conta Contabil'] || row['conta_contabil'] || row['Conta'] || '',
            tag01: row['C.Custo'] || row['C Custo'] || row['tag01'] || '',
            tag02: row['Segmento'] || row['Segment'] || row['tag02'] || '',
            tag03: row['Projeto'] || row['Project'] || row['tag03'] || '',
            marca,
            filial,
            ticket: row['Ticket'] || row['ticket'] || '',
            vendor: row['Fornecedor'] || row['Vendor'] || row['vendor'] || '',
            nat_orc: row['Nat Orc'] || row['nat_orc'] || row['Natureza'] || '',
            description: row['Descrição'] || row['Descricao'] || row['Description'] || row['description'] || '',
            amount: parseFloat(String(row['Valor'] || row['Amount'] || row['amount'] || 0).replace(',', '.')),
            recurring: row['Recorrente'] || row['Recurring'] || row['recurring'] || 'Sim',
            status: 'Manual',
            type: row['Tipo'] || row['Type'] || row['type'] || 'FIXED_COST'
          };
        });

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

        await supabaseService.bulkAddTransactionsManual(batch as Transaction[]);

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

  // ===== SMTP Config handlers =====
  const loadSmtpConfig = async () => {
    setSmtpLoading(true);
    try {
      const config = await supabaseService.getSmtpConfig();
      if (config) {
        setSmtpHost(config.host);
        setSmtpPort(String(config.port));
        setSmtpUsername(config.username);
        setSmtpPassword(config.password_encrypted);
        setSmtpFromName(config.from_name);
        setSmtpFromEmail(config.from_email);
        setSmtpUseTls(config.use_tls);
        setSmtpEnabled(config.enabled);
        setSmtpConfigured(true);
      }
    } catch (err) {
      console.error('Erro ao carregar smtp_config:', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSmtpSave = async () => {
    if (!smtpHost || !smtpUsername || !smtpPassword || !smtpFromEmail) {
      setSmtpMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    setSmtpSaving(true);
    setSmtpMessage(null);
    try {
      await supabaseService.upsertSmtpConfig({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        username: smtpUsername,
        password_encrypted: smtpPassword,
        from_name: smtpFromName,
        from_email: smtpFromEmail,
        use_tls: smtpUseTls,
        enabled: smtpEnabled,
      });
      setSmtpConfigured(true);
      setSmtpMessage({ type: 'success', text: 'Configuração SMTP salva com sucesso!' });
    } catch (err: any) {
      setSmtpMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSmtpTest = async () => {
    if (!smtpHost || !smtpUsername || !smtpPassword || !smtpFromEmail) {
      setSmtpMessage({ type: 'error', text: 'Preencha todos os campos antes de testar.' });
      return;
    }
    setSmtpTesting(true);
    setSmtpMessage({ type: 'info', text: 'Testando conexão SMTP...' });
    try {
      const resp = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort) || 587,
          username: smtpUsername,
          password: smtpPassword,
          from_name: smtpFromName,
          from_email: smtpFromEmail,
          use_tls: smtpUseTls,
          test_email: currentUser?.email || '',
        }),
      });
      const result = await resp.json();
      if (result.success) {
        setSmtpMessage({ type: 'success', text: `Teste OK! Email enviado para ${currentUser?.email}` });
      } else {
        setSmtpMessage({ type: 'error', text: `Falha: ${result.error || 'Erro desconhecido'}` });
      }
    } catch (err: any) {
      setSmtpMessage({ type: 'error', text: `Erro de conexão: ${err.message}` });
    } finally {
      setSmtpTesting(false);
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
            Dados
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
        <button
          onClick={() => setActiveTab('pdd')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'pdd'
              ? 'text-rose-700 bg-rose-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calculator size={14} />
            Cálculo PDD
          </div>
          {activeTab === 'pdd' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('tributos')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'tributos'
              ? 'text-amber-700 bg-amber-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Percent size={14} />
            Tributos
          </div>
          {activeTab === 'tributos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rateio')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'rateio'
              ? 'text-teal-700 bg-teal-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calculator size={14} />
            Rateio Raiz
          </div>
          {activeTab === 'rateio' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('depara')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'depara'
              ? 'text-indigo-700 bg-indigo-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ArrowRightLeft size={14} />
            De-Para Fornec
          </div>
          {activeTab === 'depara' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'smtp'
              ? 'text-sky-700 bg-sky-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Mail size={14} />
            Email/SMTP
          </div>
          {activeTab === 'smtp' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('cronograma')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'cronograma'
              ? 'text-teal-700 bg-teal-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            Cronograma
          </div>
          {activeTab === 'cronograma' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('override')}
          className={`px-4 py-2 font-bold text-xs uppercase transition-all relative ${
            activeTab === 'override'
              ? 'text-red-700 bg-red-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Layers size={14} />
            Override
          </div>
          {activeTab === 'override' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-t"></div>
          )}
        </button>
      </div>

      {/* Aba: Dados (Importar / Exportar) */}
      {activeTab === 'import' && (
        <>
        {/* Sub-abas: Importar / Exportar */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDadosSubTab('importar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
              dadosSubTab === 'importar'
                ? 'bg-green-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Upload size={14} />
            Importar
          </button>
          <button
            onClick={() => setDadosSubTab('exportar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
              dadosSubTab === 'exportar'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Download size={14} />
            Exportar
          </button>
        </div>

        {dadosSubTab === 'importar' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <Database className="text-green-600" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-green-900">Importação de Dados em Massa</h2>
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

        {dadosSubTab === 'exportar' && (
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-300 rounded-xl p-4 shadow">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-blue-900">Exportar Dados do Banco</h2>
              <p className="text-xs text-blue-700">Selecione a tabela e aplique filtros para exportar</p>
            </div>
            {/* Limpar todos os filtros */}
            {(bancoMarcas.length > 0 || bancoFiliais.length > 0 || bancoTags01.length > 0 || bancoTags02.length > 0 || bancoTags03.length > 0 || bancoMonths.length > 0) && (
              <button
                onClick={() => { setBancoMonths([]); setBancoMarcas([]); setBancoFiliais([]); setBancoTags01([]); setBancoTags02([]); setBancoTags03([]); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-bold text-[10px] uppercase transition-all"
              >
                <X size={12} />
                Limpar Filtros
              </button>
            )}
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

          {/* Seletor de Tabela */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-black text-gray-400 uppercase shrink-0">Tabela:</span>
            {(
              [
                { value: 'transactions', label: 'Transações (Real)', color: 'blue' },
                { value: 'transactions_orcado', label: 'Orçado', color: 'purple' },
                { value: 'transactions_ano_anterior', label: 'Ano Anterior (A-1)', color: 'orange' },
                { value: 'dre_fabric', label: 'DRE Fabric', color: 'blue' },
              ] as const
            ).map(opt => (
              <button
                key={opt.value}
                onClick={() => setBancoTable(opt.value)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border ${
                  bancoTable === opt.value
                    ? opt.color === 'blue'   ? 'bg-blue-600 text-white border-blue-600 shadow' :
                      opt.color === 'purple' ? 'bg-purple-600 text-white border-purple-600 shadow' :
                                               'bg-orange-500 text-white border-orange-500 shadow'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Barra de filtros — estilo DRE Gerencial */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-blue-200 shadow-sm overflow-x-auto mb-4">

            {/* Ano */}
            <div className="flex items-center bg-white rounded-lg border-2 border-gray-100 shadow-sm gap-2 px-3 py-1.5 shrink-0">
              <div className="rounded-lg p-1.5 bg-blue-50 text-[#1B75BB]">
                <Calendar size={12} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Ano</span>
                <select
                  value={bancoYear}
                  onChange={e => setBancoYear(e.target.value)}
                  className="font-black text-[10px] uppercase tracking-tight text-gray-900 bg-transparent border-none outline-none cursor-pointer pr-1"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Separador */}
            <div className="h-5 w-px bg-blue-200 shrink-0" />

            {/* Mês */}
            <MultiSelectFilter
              compact
              label="Mês"
              icon={<CalendarDays size={12} />}
              options={['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']}
              selected={bancoMonths.map(m => ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m)] || m)}
              onChange={(labels) => {
                const MONTH_MAP: Record<string, string> = { Jan:'01',Fev:'02',Mar:'03',Abr:'04',Mai:'05',Jun:'06',Jul:'07',Ago:'08',Set:'09',Out:'10',Nov:'11',Dez:'12' };
                setBancoMonths(labels.map(l => MONTH_MAP[l] || l));
              }}
              colorScheme="blue"
            />

            {/* Marca */}
            <MultiSelectFilter
              compact
              label="Marca"
              icon={<Flag size={12} />}
              options={availableValues.marcas}
              selected={bancoMarcas}
              onChange={setBancoMarcas}
              colorScheme="orange"
            />

            {/* Filial */}
            <MultiSelectFilter
              compact
              label="Filial"
              icon={<Building2 size={12} />}
              options={availableValues.filiais}
              selected={bancoFiliais}
              onChange={setBancoFiliais}
              colorScheme="blue"
            />

            {/* Separador */}
            <div className="h-5 w-px bg-blue-200 shrink-0" />

            {/* Tag01 */}
            <MultiSelectFilter
              compact
              label="Tag01"
              icon={<Layers size={12} />}
              options={availableValues.tag01Values}
              selected={bancoTags01}
              onChange={setBancoTags01}
              colorScheme="purple"
            />

            {/* Tag02 */}
            {bancoTag02Options.length > 0 && (
              <MultiSelectFilter
                compact
                label="Tag02"
                icon={<Hash size={12} />}
                options={bancoTag02Options}
                selected={bancoTags02}
                onChange={setBancoTags02}
                colorScheme="purple"
              />
            )}

            {/* Tag03 */}
            {bancoTag03Options.length > 0 && (
              <MultiSelectFilter
                compact
                label="Tag03"
                icon={<Tag size={12} />}
                options={bancoTag03Options}
                selected={bancoTags03}
                onChange={setBancoTags03}
                colorScheme="blue"
              />
            )}
          </div>

          {/* Resumo dos filtros ativos (badges) */}
          {(bancoMarcas.length > 0 || bancoFiliais.length > 0 || bancoTags01.length > 0 || bancoTags02.length > 0 || bancoTags03.length > 0 || bancoMonths.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <span className="text-[9px] font-black text-gray-400 uppercase">Filtros:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Ano: {bancoYear}</span>
              {bancoMonths.length > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Meses: {bancoMonths.length}</span>}
              {bancoMarcas.length > 0 && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Marca: {bancoMarcas.length}</span>}
              {bancoFiliais.length > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Filial: {bancoFiliais.length}</span>}
              {bancoTags01.length > 0 && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Tag01: {bancoTags01.length}</span>}
              {bancoTags02.length > 0 && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Tag02: {bancoTags02.length}</span>}
              {bancoTags03.length > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Tag03: {bancoTags03.length}</span>}
            </div>
          )}

          {/* Botões de exportação */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportBanco('xlsx')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              Exportar Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExportBanco('csv')}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg font-bold text-xs uppercase transition-all shadow hover:shadow-md"
            >
              {isExporting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Download size={16} />
              )}
              Exportar CSV
            </button>
          </div>
          <p className="text-[9px] text-blue-600 mt-2 text-center">
            Sem filtros de meses: exporta o ano inteiro. Campos em branco exportam todos os valores.
          </p>
        </div>
        )}
        </>
      )}

      {/* Aba: Usuários (Cadastro + Engajamento) */}
      {activeTab === 'users' && (
        <>
      {/* Sub-abas: Cadastro / Engajamento */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setUsersSubTab('cadastro')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
            usersSubTab === 'cadastro'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users size={14} />
          Cadastro
        </button>
        <button
          onClick={() => setUsersSubTab('engajamento')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
            usersSubTab === 'engajamento'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Trophy size={14} />
          Engajamento
        </button>
      </div>

      {usersSubTab === 'cadastro' && (
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

              {/* Enviar Email de Liberação */}
              {selectedUser.role !== 'pending' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                  <h3 className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail size={12} />
                    Notificar Usuário
                  </h3>
                  <p className="text-[10px] text-orange-600 mb-2">
                    Envia email informando que o acesso foi liberado.
                  </p>
                  <button
                    onClick={handleSendWelcomeEmail}
                    disabled={sendingEmail || saving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail size={12} />
                        Enviar Email de Liberação
                      </>
                    )}
                  </button>
                </div>
              )}

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

      {usersSubTab === 'engajamento' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-xl p-4 shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Trophy className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-blue-900">Engajamento de Usuarios</h2>
              <p className="text-xs text-blue-700">Acompanhe o uso da plataforma e engaje sua equipe</p>
            </div>
          </div>
          <EngagementPanel />
        </div>
      )}
        </>
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

      {/* Aba: Cálculo PDD */}
      {activeTab === 'pdd' && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose-100 p-2 rounded-xl">
              <Calculator className="text-rose-600" size={18} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-black text-rose-900">Provisão para Devedores Duvidosos</h2>
              <p className="text-[10px] text-rose-600/80">Percentuais por marca e contas base para cálculo automático</p>
            </div>
          </div>

          {/* Mensagem de feedback */}
          {pddMessage && (
            <div className={`mb-3 px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold ${
              pddMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {pddMessage.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
              {pddMessage.text}
            </div>
          )}

          {/* Layout 2 colunas */}
          <div className="flex gap-4">

            {/* ===== COLUNA ESQUERDA — Share PDD ===== */}
            <div className="w-[320px] shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">% PDD por Marca</p>
                <button onClick={loadPddData} disabled={pddLoading} className="text-[9px] text-rose-400 hover:text-rose-600 font-bold">
                  {pddLoading ? '...' : 'Recarregar'}
                </button>
              </div>

              {/* Tabela ultra-compacta */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-rose-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-rose-50/80">
                      <th className="text-left px-2 py-1 text-[9px] font-black text-rose-400 uppercase">Marca</th>
                      <th className="text-right px-2 py-1 text-[9px] font-black text-rose-400 uppercase">%</th>
                      <th className="text-center px-1 py-1 text-[9px] font-black text-rose-400 uppercase w-14"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pddLoading ? (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-rose-400 text-[10px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                            Carregando...
                          </div>
                        </td>
                      </tr>
                    ) : pddData.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-t border-rose-50/80 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/20'
                        } ${pddEditingId === item.id ? '!bg-rose-50/60' : 'hover:bg-rose-50/40'}`}
                      >
                        <td className="px-2 py-0.5">
                          <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1 h-5 rounded bg-rose-100 text-rose-700 font-black text-[9px]">
                            {item.marca}
                          </span>
                        </td>
                        <td className="px-2 py-0.5 text-right">
                          {pddEditingId === item.id ? (
                            <input
                              type="text"
                              value={pddEditValue}
                              onChange={e => setPddEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handlePddSave(item.id);
                                if (e.key === 'Escape') handlePddCancel();
                              }}
                              autoFocus
                              className="w-16 px-1.5 py-0.5 text-right text-[10px] font-bold border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white"
                            />
                          ) : (
                            <span className="font-bold text-[11px] text-gray-800 tabular-nums">
                              {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-0.5 text-center">
                          {pddEditingId === item.id ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => handlePddSave(item.id)} disabled={pddSaving} className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors disabled:opacity-50" title="Salvar">
                                <Check size={11} />
                              </button>
                              <button onClick={handlePddCancel} className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Cancelar">
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => handlePddEdit(item)} className="p-1 rounded hover:bg-rose-100 text-rose-300 hover:text-rose-600 transition-colors" title="Editar">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handlePddDelete(item)} className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors" title="Excluir">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Inserir nova marca — inline compacto */}
              <div className="flex items-center gap-1.5 bg-white/50 rounded-lg border border-dashed border-rose-200 px-2 py-1.5">
                <input
                  type="text"
                  placeholder="Sigla"
                  value={pddNewMarca}
                  onChange={e => setPddNewMarca(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-16 px-1.5 py-1 text-[10px] font-bold border border-rose-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white placeholder:text-rose-300 uppercase"
                />
                <input
                  type="text"
                  placeholder="%"
                  value={pddNewValor}
                  onChange={e => setPddNewValor(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePddAdd(); }}
                  className="w-14 px-1.5 py-1 text-[10px] font-bold border border-rose-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white placeholder:text-rose-300 text-right"
                />
                <button
                  onClick={handlePddAdd}
                  disabled={pddAdding || !pddNewMarca.trim()}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition-all disabled:opacity-40"
                >
                  <Plus size={11} />
                  {pddAdding ? '...' : 'Add'}
                </button>
              </div>

              <p className="text-[9px] text-rose-400/70 leading-tight">
                Sincronizado em tempo real. Alterações aqui ou no Supabase refletem automaticamente.
              </p>
            </div>

            {/* ===== COLUNA DIREITA — Contas Base PDD ===== */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag size={12} className="text-rose-500" />
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Contas Base do Cálculo</p>
                </div>
                <span className="text-[9px] font-bold text-rose-400 bg-rose-100 px-1.5 py-0.5 rounded">
                  {pddContas.length} selecionadas
                </span>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-rose-300" />
                  <input
                    type="text"
                    placeholder="Buscar tag01..."
                    value={pddTag01Search}
                    onChange={e => setPddTag01Search(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-[10px] border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white placeholder:text-rose-300"
                  />
                </div>
                <select
                  value={pddTag0Filter}
                  onChange={e => setPddTag0Filter(e.target.value)}
                  className="px-2 py-1.5 text-[10px] font-bold border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white text-gray-700"
                >
                  <option value="">Todos Tag0</option>
                  {[...new Set(pddAllTags.map(t => t.tag0))].sort().map(t0 => (
                    <option key={t0} value={t0}>{t0}</option>
                  ))}
                </select>
                <button
                  onClick={loadPddContas}
                  disabled={pddContasLoading}
                  className="text-[9px] text-rose-400 hover:text-rose-600 font-bold shrink-0"
                >
                  {pddContasLoading ? '...' : 'Recarregar'}
                </button>
              </div>

              {/* Lista de contas — checkbox */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-rose-100 overflow-hidden flex-1">
                <div className="max-h-[280px] overflow-y-auto">
                  {pddContasLoading ? (
                    <div className="flex items-center justify-center py-6 text-rose-400 text-[10px] gap-1.5">
                      <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                      Carregando contas...
                    </div>
                  ) : (() => {
                    const filtered = pddAllTags.filter(t =>
                      (!pddTag0Filter || t.tag0 === pddTag0Filter) &&
                      (!pddTag01Search || t.tag01.toLowerCase().includes(pddTag01Search.toLowerCase()))
                    );
                    const grouped = filtered.reduce<Record<string, string[]>>((acc, t) => {
                      (acc[t.tag0] = acc[t.tag0] || []).push(t.tag01);
                      return acc;
                    }, {});
                    const tag0Keys = Object.keys(grouped).sort();
                    if (tag0Keys.length === 0) return (
                      <p className="text-center py-6 text-gray-400 text-[10px]">Nenhuma conta encontrada</p>
                    );
                    return tag0Keys.map(tag0 => (
                      <div key={tag0}>
                        <div className="px-2 py-1 bg-rose-50/60 border-b border-rose-100 sticky top-0">
                          <span className="text-[9px] font-black text-rose-500 uppercase">{tag0}</span>
                          <span className="text-[8px] text-rose-400 ml-1.5">
                            ({grouped[tag0].filter(t01 => isContaSelected(tag0, t01)).length}/{grouped[tag0].length})
                          </span>
                        </div>
                        {grouped[tag0].sort().map(tag01 => {
                          const selected = isContaSelected(tag0, tag01);
                          return (
                            <label
                              key={`${tag0}_${tag01}`}
                              className={`flex items-center gap-1.5 px-2 py-[3px] cursor-pointer transition-colors border-b border-rose-50/50 ${
                                selected ? 'bg-rose-50/50' : 'hover:bg-rose-50/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleToggleConta(tag0, tag01)}
                                className="accent-rose-500 w-3 h-3 shrink-0"
                              />
                              <span className={`text-[10px] truncate ${selected ? 'font-bold text-rose-800' : 'text-gray-600'}`}>
                                {tag01}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Resumo contas selecionadas */}
              {pddContas.length > 0 && (
                <div className="bg-white/50 rounded-lg border border-rose-100 px-2 py-1.5">
                  <p className="text-[9px] font-bold text-rose-500 mb-1">Selecionadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {pddContas.map(c => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[8px] font-bold"
                      >
                        {c.tag01}
                        <button
                          onClick={() => handleToggleConta(c.tag0, c.tag01)}
                          className="hover:text-red-600 transition-colors ml-0.5"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Aba: Cálculo Tributos */}
      {activeTab === 'tributos' && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-2 rounded-xl">
              <Percent className="text-amber-600" size={18} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-black text-amber-900">Configuração de Tributos</h2>
              <p className="text-[10px] text-amber-600/80">Alíquotas de PIS/COFINS, ISS e PAA por marca, filial e tipo de receita</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAllTributos}
                disabled={tribLoading}
                className="text-[9px] text-amber-500 hover:text-amber-700 font-bold"
              >
                {tribLoading ? '...' : 'Recarregar'}
              </button>
              <span className="text-[9px] font-bold text-amber-400 bg-amber-100 px-1.5 py-0.5 rounded">
                {tribData.length} registros
              </span>
            </div>
          </div>

          {/* Mensagem de feedback */}
          {tribMessage && (
            <div className={`mb-3 px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold ${
              tribMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              tribMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {tribMessage.type === 'success' ? <CheckCircle size={12} /> : tribMessage.type === 'error' ? <AlertTriangle size={12} /> : <Eye size={12} />}
              {tribMessage.text}
            </div>
          )}

          {/* Alerta de pendências: receita sem config de tributos */}
          {tribPendentes.length > 0 && (
            <details className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl group" open>
              <summary className="px-4 py-3 cursor-pointer select-none flex items-center gap-2 list-none">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <span className="text-xs font-black text-red-800">
                  {tribPendentes.length} combinação(ões) de receita SEM tributo cadastrado
                </span>
                <span className="ml-auto text-[10px] font-medium text-red-400 group-open:hidden">▸ ver</span>
                <span className="ml-auto text-[10px] font-medium text-red-400 hidden group-open:inline">▾ ocultar</span>
              </summary>
              <div className="px-4 pb-3">
                <p className="text-[10px] text-red-600 mb-2">
                  Estas combinações de marca/filial/tipo de receita possuem receita mas <strong>não têm alíquotas configuradas</strong>. O cálculo de tributos não será feito para elas.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-red-100/80 text-red-800">
                        <th className="px-2 py-1.5 text-left font-black rounded-tl-lg">Marca</th>
                        <th className="px-2 py-1.5 text-left font-black">Filial</th>
                        <th className="px-2 py-1.5 text-left font-black">Tipo Receita</th>
                        <th className="px-2 py-1.5 text-right font-black">Meses</th>
                        <th className="px-2 py-1.5 text-right font-black rounded-tr-lg">Receita Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tribPendentes.map((p, i) => (
                        <tr key={i} className={`border-t border-red-200 ${i % 2 === 0 ? 'bg-red-50/50' : 'bg-white/50'}`}>
                          <td className="px-2 py-1.5 font-bold text-red-900">{p.o_marca}</td>
                          <td className="px-2 py-1.5 text-red-800">{p.o_filial}</td>
                          <td className="px-2 py-1.5 text-red-800">{p.o_tipo_receita}</td>
                          <td className="px-2 py-1.5 text-right text-red-700">{p.o_meses}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-red-900">
                            {Number(p.o_receita_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          )}
          {tribPendentesLoading && (
            <div className="mb-4 flex items-center gap-2 text-[10px] text-amber-600">
              <Loader2 size={12} className="animate-spin" />
              Verificando pendências...
            </div>
          )}

          {/* Árvore: Como o tributo é calculado (colapsável) */}
          <details className="mb-4 bg-white/70 border border-amber-200 rounded-xl group" open>
            <summary className="px-4 py-3 cursor-pointer select-none flex items-center gap-1.5 text-xs font-black text-amber-800 list-none">
              <Calculator size={14} className="text-amber-600" />
              Como o tributo é calculado automaticamente
              <span className="ml-auto text-[10px] font-medium text-amber-400 group-open:hidden">▸ expandir</span>
              <span className="ml-auto text-[10px] font-medium text-amber-400 hidden group-open:inline">▾ recolher</span>
            </summary>
            <div className="px-4 pb-4">
              <div className="text-[11px] text-gray-700 font-mono leading-relaxed space-y-0.5">
                <div className="font-bold text-amber-700">Receita (tag0 = '01. RECEITA LÍQUIDA')</div>
                <div className="pl-3 text-gray-500">│</div>
                <div className="pl-3">├─ <span className="text-blue-600 font-semibold">transactions</span> <span className="text-gray-400">(contábil)</span> — <span className="text-red-500 text-[10px]">exclui se override ativo</span></div>
                <div className="pl-3">└─ <span className="text-green-600 font-semibold">transactions_manual</span> — <span className="text-green-500 text-[10px]">sempre incluso</span></div>
                <div className="pl-3 text-gray-500">│</div>
                <div className="pl-3 text-gray-600">▼ Agregar por: <span className="font-bold text-gray-800">filial + mês + tipo_receita (tag01)</span></div>
                <div className="pl-3 text-gray-500">│</div>
                <div className="pl-3 text-gray-600">▼ Cruzar com <span className="font-bold text-amber-700">tributos_config</span> <span className="text-gray-400">(marca + filial + tipo_receita)</span></div>
                <div className="pl-3 text-gray-500">│</div>
                <div className="pl-3">├─ <span className="font-bold text-purple-700">PIS/COFINS</span>: receita × alíquota% × <span className="text-red-600 font-bold">-1</span> <span className="text-gray-400">(3.1.3.01.01.03) → TRIB_PISCOFINS_YYYY-MM_FILIAL_TIPO</span></div>
                <div className="pl-3">├─ <span className="font-bold text-purple-700">ISS</span>: receita × alíquota% × <span className="text-red-600 font-bold">-1</span> <span className="text-gray-400">(3.1.3.01.01.01) → TRIB_ISS_YYYY-MM_FILIAL_TIPO</span></div>
                <div className="pl-3">└─ <span className="font-bold text-purple-700">PAA</span>: receita × alíquota% × <span className="text-green-600 font-bold">+1</span> <span className="text-gray-400">(3.1.3.01.01.50) → TRIB_PAA_YYYY-MM_FILIAL_TIPO</span></div>
                <div className="pl-3 text-gray-500">│</div>
                <div className="pl-3 text-gray-600">▼ UPSERT em <span className="font-bold text-gray-800">transactions_manual</span> <span className="text-gray-400">(tag0 = '02. CUSTOS VARIÁVEIS')</span></div>
                <div className="pl-3 text-gray-600">▼ Refresh <span className="font-bold text-gray-800">dre_agg</span></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  <Clock size={11} className="text-amber-500" />
                  <span className="text-amber-700 font-bold">Automático a cada 15 min via pg_cron</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                  <Hash size={11} className="text-blue-500" />
                  <span className="text-blue-700 font-bold">chave_id idempotente — não duplica ao re-executar</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                  <CheckCircle size={11} className="text-green-500" />
                  <span className="text-green-700 font-bold">Valores negativos (dedução de receita)</span>
                </div>
              </div>
            </div>
          </details>

          {/* Layout 2 colunas */}
          <div className="flex gap-4">
            {/* === COLUNA ESQUERDA — Tabela completa === */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* Filtros: Marca, Filial, Tipo Receita, PIS/COFINS, ISS, PAA */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={tribFilterMarca}
                  onChange={e => { setTribFilterMarca(e.target.value); setTribFilterFilial(''); setTribFilterTipoReceita(''); }}
                  className="px-2 py-1.5 text-[10px] font-bold border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white text-gray-700 min-w-[100px]"
                >
                  <option value="">Todas Marcas</option>
                  {tribMarcas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={tribFilterFilial}
                  onChange={e => { setTribFilterFilial(e.target.value); setTribFilterTipoReceita(''); }}
                  className="px-2 py-1.5 text-[10px] font-bold border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white text-gray-700 min-w-[160px]"
                >
                  <option value="">Todas Filiais</option>
                  {tribFiliaisDisponiveis.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                  value={tribFilterTipoReceita}
                  onChange={e => setTribFilterTipoReceita(e.target.value)}
                  className="px-2 py-1.5 text-[10px] font-bold border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white text-gray-700 min-w-[150px]"
                >
                  <option value="">Todos Tipos Receita</option>
                  {tribTiposReceita.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={tribFilterPisCofins}
                  onChange={e => setTribFilterPisCofins(e.target.value)}
                  className="px-2 py-1.5 text-[10px] font-bold border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white text-gray-700 min-w-[90px]"
                >
                  <option value="">PIS/COFINS</option>
                  {tribPisCofinsValues.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
                <select
                  value={tribFilterIss}
                  onChange={e => setTribFilterIss(e.target.value)}
                  className="px-2 py-1.5 text-[10px] font-bold border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white text-gray-700 min-w-[70px]"
                >
                  <option value="">ISS</option>
                  {tribIssValues.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
                <select
                  value={tribFilterPaa}
                  onChange={e => setTribFilterPaa(e.target.value)}
                  className="px-2 py-1.5 text-[10px] font-bold border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white text-gray-700 min-w-[70px]"
                >
                  <option value="">PAA</option>
                  {tribPaaValues.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
                {(tribFilterMarca || tribFilterFilial || tribFilterTipoReceita || tribFilterPisCofins || tribFilterIss || tribFilterPaa) && (
                  <button
                    onClick={() => { setTribFilterMarca(''); setTribFilterFilial(''); setTribFilterTipoReceita(''); setTribFilterPisCofins(''); setTribFilterIss(''); setTribFilterPaa(''); }}
                    className="text-[9px] text-red-500 hover:text-red-700 font-bold shrink-0"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={handleTribExport}
                  disabled={tribFiltered.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[9px] transition-all disabled:opacity-40 shrink-0 ml-auto"
                >
                  <Download size={11} />
                  Exportar
                </button>
              </div>

              {/* Tabela */}
              {tribLoading ? (
                <div className="flex items-center justify-center py-12 text-amber-400 text-[10px] gap-1.5">
                  <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                  Carregando alíquotas...
                </div>
              ) : tribFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-amber-400">
                  <Percent size={28} className="mb-2 opacity-40" />
                  <p className="text-[10px] font-bold">{tribData.length === 0 ? 'Nenhum registro cadastrado' : 'Nenhum resultado para o filtro'}</p>
                  <p className="text-[9px] mt-1 text-amber-400/70">Use o importador Excel à direita para carregar dados</p>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-amber-100 overflow-hidden">
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-amber-50/95 backdrop-blur-sm">
                          <th className="text-left px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">Marca</th>
                          <th className="text-left px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">Filial</th>
                          <th className="text-left px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">Tipo de Receita</th>
                          <th className="text-center px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">PIS/COFINS %</th>
                          <th className="text-center px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">ISS %</th>
                          <th className="text-center px-2 py-1.5 text-[9px] font-black text-amber-500 uppercase">PAA %</th>
                          <th className="text-center px-1 py-1.5 text-[9px] font-black text-amber-500 uppercase w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tribFiltered.map((row, idx) => (
                          <tr
                            key={row.id}
                            className={`border-t border-amber-50/80 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'
                            } hover:bg-amber-50/40`}
                          >
                            <td className="px-2 py-0.5">
                              <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1 h-5 rounded bg-amber-100 text-amber-700 font-black text-[9px]">
                                {row.marca}
                              </span>
                            </td>
                            <td className="px-2 py-0.5">
                              <span className="text-[10px] text-gray-700 truncate block max-w-[180px]" title={row.filial}>{row.filial}</span>
                            </td>
                            <td className="px-2 py-0.5">
                              <span className="text-[10px] font-bold text-gray-800">{row.tipo_receita}</span>
                            </td>
                            {(['pis_cofins', 'iss', 'paa'] as const).map(col => {
                              const isEditing = tribEditingCell?.id === row.id && tribEditingCell?.col === col;
                              return (
                                <td key={col} className="px-2 py-0.5 text-center">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={tribEditValue}
                                      onChange={e => setTribEditValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleTribCellSave();
                                        if (e.key === 'Escape') handleTribCellCancel();
                                      }}
                                      autoFocus
                                      className="w-16 px-1 py-0.5 text-center text-[10px] font-bold border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => handleTribCellClick(row.id, col)}
                                      className="w-16 px-1 py-0.5 text-center text-[11px] font-bold text-gray-800 tabular-nums rounded hover:bg-amber-100 transition-colors cursor-pointer"
                                      title="Clique para editar"
                                    >
                                      {row[col].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-1 py-0.5 text-center">
                              <button
                                onClick={() => handleTribDelete(row)}
                                className="p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-[9px] text-amber-400/70 leading-tight">
                Clique em qualquer valor % para editar inline. Enter salva, Escape cancela. Sincronizado em tempo real.
              </p>
            </div>

            {/* === COLUNA DIREITA — Importação Excel === */}
            <div className="w-[340px] shrink-0 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Upload size={12} className="text-amber-500" />
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Importar / Atualizar via Excel</p>
              </div>

              {/* Máscara / Template */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-amber-100 p-2.5">
                <p className="text-[9px] font-bold text-amber-700 mb-1.5">Estrutura esperada do Excel:</p>
                <div className="overflow-x-auto">
                  <table className="text-[8px] border-collapse w-full">
                    <thead>
                      <tr className="bg-amber-100/60">
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">marca</th>
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">filial</th>
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">tipo_receita</th>
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">pis_cofins</th>
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">iss</th>
                        <th className="border border-amber-200 px-1.5 py-0.5 font-black text-amber-600">paa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">SEB</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">SEB - Escola</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">Receita De Mensalidade</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">9,25</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">5,00</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">2,50</td>
                      </tr>
                      <tr className="bg-amber-50/30">
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">SEB</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">SEB - Escola</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500">Material Didático</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">9,25</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">0,00</td>
                        <td className="border border-amber-100 px-1.5 py-0.5 text-gray-500 text-center">0,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    onClick={handleTribDownloadTemplate}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[9px] transition-all"
                  >
                    <Download size={10} />
                    Baixar Template .xlsx
                  </button>
                  <span className="text-[8px] text-amber-400">com 5 exemplos preenchidos</span>
                </div>
                <p className="text-[8px] text-amber-500/70 mt-1.5 leading-tight">
                  <strong>Tipos válidos:</strong> Receita De Mensalidade, Material Didático, Integral, Receitas Extras, Receitas Não Operacionais
                </p>
                <p className="text-[8px] text-amber-500/70 leading-tight">
                  <strong>Regra:</strong> combinação (marca + filial + tipo_receita) é a chave. Se já existir, atualiza os valores.
                </p>
              </div>

              {/* Upload área */}
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-amber-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-amber-50 transition-all">
                <div className="flex flex-col items-center justify-center py-2">
                  <Upload className="w-5 h-5 mb-1 text-amber-400" />
                  <p className="text-[10px] text-amber-600 font-bold">
                    {tribFile ? tribFile.name : 'Clique para selecionar (.xlsx, .xls, .csv)'}
                  </p>
                  {tribFile && (
                    <p className="text-[8px] text-amber-500 mt-0.5">Clique novamente para trocar</p>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleTribFileUpload}
                />
              </label>

              {/* Preview da importação */}
              {tribImportPreview.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-amber-700">
                      Preview — {tribImportPreview.length} registros
                    </h3>
                    <button
                      onClick={() => { setTribImportPreview([]); setTribFile(null); setTribMessage(null); }}
                      className="text-[9px] text-red-500 hover:text-red-700 font-bold"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="max-h-[180px] overflow-y-auto border border-amber-200 rounded-lg">
                    <table className="w-full text-[9px]">
                      <thead className="bg-amber-100 sticky top-0">
                        <tr>
                          <th className="text-left px-1.5 py-1 text-amber-700 font-black">Marca</th>
                          <th className="text-left px-1.5 py-1 text-amber-700 font-black">Filial</th>
                          <th className="text-left px-1.5 py-1 text-amber-700 font-black">Tipo</th>
                          <th className="text-center px-1 py-1 text-amber-700 font-black">PIS</th>
                          <th className="text-center px-1 py-1 text-amber-700 font-black">ISS</th>
                          <th className="text-center px-1 py-1 text-amber-700 font-black">PAA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tribImportPreview.slice(0, 100).map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/50'}>
                            <td className="px-1.5 py-0.5 text-gray-700">{item.marca}</td>
                            <td className="px-1.5 py-0.5 text-gray-700 truncate max-w-[80px]" title={item.filial}>{item.filial}</td>
                            <td className="px-1.5 py-0.5 text-gray-700 truncate max-w-[100px]" title={item.tipo_receita}>{item.tipo_receita}</td>
                            <td className="px-1 py-0.5 text-center text-gray-700">{item.pis_cofins}</td>
                            <td className="px-1 py-0.5 text-center text-gray-700">{item.iss}</td>
                            <td className="px-1 py-0.5 text-center text-gray-700">{item.paa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleTribImport}
                    disabled={tribImporting}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-40"
                  >
                    {tribImporting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        Importar {tribImportPreview.length} registros
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-[9px] text-amber-400/70 leading-tight mt-1">
                Sincronizado em tempo real. Alterações via Excel ou edição inline refletem automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aba: Rateio Raiz */}
      {activeTab === 'rateio' && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-teal-100 p-2 rounded-xl">
              <Calculator className="text-teal-600" size={18} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-black text-teal-900">Rateio Raiz — Despesas Intercompany</h2>
              <p className="text-[10px] text-teal-600/80">Distribuição automática dos custos corporativos RZ para cada filial</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (rateioLog.length === 0) return;
                  const filtered = rateioMesFilter
                    ? rateioLog.filter(r => r.year_month === rateioMesFilter)
                    : rateioLog;

                  const ExcelJS = (await import('exceljs')).default;
                  const wb = new ExcelJS.Workbook();
                  const ws = wb.addWorksheet('Rateio Raiz');

                  // Cores
                  const TEAL_DARK = 'FF0D9488';
                  const TEAL_LIGHT = 'FFE6FFFA';
                  const WHITE = 'FFFFFFFF';
                  const GRAY_BG = 'FFF9FAFB';
                  const RED_FNT = 'FFDC2626';
                  const FNT_DARK = 'FF1F2937';
                  const FNT_WHITE = 'FFFFFFFF';

                  const headerStyle = (cell: ExcelJS.Cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
                    cell.font = { bold: true, color: { argb: FNT_WHITE }, size: 9 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { bottom: { style: 'thin', color: { argb: TEAL_DARK } } };
                  };

                  // === ABA 1: Log detalhado ===
                  const headers = ['Mês', 'Filial', 'Nome Filial', 'Marca', 'EBITDA RZ', 'Receita Bruta', 'Receita Total', 'Share %', 'Valor Rateado'];
                  const hRow = ws.addRow(headers);
                  hRow.height = 20;
                  hRow.eachCell(c => headerStyle(c));

                  ws.columns = [
                    { width: 10 }, { width: 12 }, { width: 28 }, { width: 8 },
                    { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 16 },
                  ];

                  filtered.forEach((r, idx) => {
                    const row = ws.addRow([
                      r.year_month,
                      r.filial,
                      r.nome_filial || '',
                      r.marca || '',
                      Math.round(Number(r.rz_ebitda)),
                      Math.round(Number(r.receita_bruta)),
                      Math.round(Number(r.receita_total)),
                      Number((Number(r.share_pct) * 100).toFixed(2)),
                      Math.round(Number(r.valor_rateado)),
                    ]);
                    const bg = idx % 2 === 0 ? WHITE : GRAY_BG;
                    row.eachCell((cell, colNum) => {
                      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                      cell.font = { size: 9, color: { argb: FNT_DARK } };
                      if (colNum >= 5) {
                        cell.numFmt = '#,##0';
                        cell.alignment = { horizontal: 'right' };
                      }
                      if (colNum === 8) cell.numFmt = '0.00"%"';
                    });
                  });

                  // Linha TOTAL
                  const totReceita = filtered.reduce((s, r) => s + Number(r.receita_bruta), 0);
                  const totShare = filtered.reduce((s, r) => s + Number(r.share_pct), 0);
                  const totRateado = filtered.reduce((s, r) => s + Number(r.valor_rateado), 0);
                  const totRow = ws.addRow(['TOTAL', '', '', '', '', Math.round(totReceita), '', Number((totShare * 100).toFixed(2)), Math.round(totRateado)]);
                  totRow.eachCell((cell, colNum) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
                    cell.font = { bold: true, size: 9, color: { argb: TEAL_DARK } };
                    if (colNum >= 5) { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
                    if (colNum === 8) cell.numFmt = '0.00"%"';
                    cell.border = { top: { style: 'medium', color: { argb: TEAL_DARK } } };
                  });

                  // === ABA 2: Resumo mensal ===
                  const ws2 = wb.addWorksheet('Resumo Mensal');
                  const year = filtered.length > 0 ? filtered[0].year_month.slice(0, 4) : new Date().getFullYear().toString();
                  const mLabels = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const byMonth: Record<string, { rateado: number; receita: number; ebitda: number }> = {};
                  rateioLog.forEach(r => {
                    const ym = r.year_month;
                    if (!byMonth[ym]) byMonth[ym] = { rateado: 0, receita: 0, ebitda: 0 };
                    byMonth[ym].rateado += Number(r.valor_rateado);
                    byMonth[ym].receita += Number(r.receita_bruta);
                    byMonth[ym].ebitda = Number(r.rz_ebitda);
                  });
                  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
                  const get = (ym: string) => byMonth[ym] || { rateado: 0, receita: 0, ebitda: 0 };

                  ws2.columns = [{ width: 14 }, ...Array(12).fill({ width: 12 })];

                  // Header meses
                  const mRow = ws2.addRow(mLabels);
                  mRow.height = 20;
                  mRow.eachCell((c, i) => { if (i > 1) headerStyle(c); else { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } }; c.font = { bold: true, color: { argb: FNT_WHITE }, size: 9 }; } });

                  // Receita (k)
                  const rRow = ws2.addRow(['Receita (k)', ...keys.map(ym => Math.round(get(ym).receita / 1000))]);
                  rRow.eachCell((c, i) => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
                    c.font = { size: 9, bold: i === 1, color: { argb: FNT_DARK } };
                    if (i > 1) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                  });

                  // Custos RZ (k)
                  const cRow = ws2.addRow(['Custos RZ (k)', ...keys.map(ym => Math.round(get(ym).ebitda / 1000))]);
                  cRow.eachCell((c, i) => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_BG } };
                    c.font = { size: 9, bold: i === 1, color: { argb: i > 1 ? RED_FNT : FNT_DARK } };
                    if (i > 1) { c.numFmt = '#,##0'; c.alignment = { horizontal: 'right' }; }
                  });

                  // % Rateio
                  const pRow = ws2.addRow(['% Rateio', ...keys.map(ym => {
                    const d = get(ym);
                    return d.receita !== 0 ? Number(Math.abs(d.rateado / d.receita * 100).toFixed(1)) : 0;
                  })]);
                  pRow.eachCell((c, i) => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
                    c.font = { size: 9, bold: true, color: { argb: TEAL_DARK } };
                    if (i > 1) { c.numFmt = '0.0"%"'; c.alignment = { horizontal: 'right' }; }
                    c.border = { top: { style: 'thin', color: { argb: TEAL_DARK } } };
                  });

                  // Download
                  const buf = await wb.xlsx.writeBuffer();
                  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `rateio_raiz_${rateioMesFilter || 'todos'}_${filtered.length}reg.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={rateioLog.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                <FileSpreadsheet size={12} />
                Exportar Excel
              </button>
              <button
                onClick={loadRateioLog}
                disabled={rateioLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                <Download size={12} />
                {rateioLoading ? '...' : 'Atualizar'}
              </button>
            </div>
          </div>

          {/* Faixa de resumo — Cards horizontais */}
          <div className="flex flex-wrap gap-3 mb-3">

            {/* Card: Como funciona */}
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-teal-100 p-2.5 flex-1 min-w-[200px]">
              <p className="text-[9px] font-black text-teal-600 uppercase tracking-wider mb-1.5">Como funciona</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[
                  { step: '1', text: 'Soma custos RZ (02.%+03.%+04.%)' },
                  { step: '2', text: 'Receita bruta por filial (01.%)' },
                  { step: '3', text: 'Share % = receita filial ÷ total' },
                  { step: '4', text: 'Rateado = custos × share%' },
                  { step: '5', text: 'UPSERT idempotente em transactions' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-1">
                    <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-100 text-teal-700 font-black text-[8px]">{s.step}</span>
                    <span className="text-[9px] text-gray-600">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Parâmetros */}
            <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-teal-100 p-2.5 min-w-[220px]">
              <p className="text-[9px] font-black text-teal-600 uppercase tracking-wider mb-1.5">Parâmetros</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  ['Holding', 'RZ'],
                  ['Custos', '02.%+03.%+04.%'],
                  ['Receita', '01.%'],
                  ['Recurring', 'Sim'],
                  ['Tag0 destino', '05. RATEIO RAIZ'],
                  ['Tag01', 'RATEIO ADM'],
                  ['Conta', '4.2.1.17.01.01'],
                  ['Vendor', 'RZ Educação — CSC'],
                  ['Scenario', 'Real / Original'],
                  ['Automação', 'pg_cron 15min'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-1">
                    <span className="text-[8px] text-gray-400">{label}</span>
                    <span className="text-[8px] font-bold text-teal-800 bg-teal-50 px-1 py-0.5 rounded truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Último cálculo */}
            {rateioLog.length > 0 && (() => {
              const lastCalc = rateioLog[0]?.calculated_at;
              const meses = [...new Set(rateioLog.map(r => r.year_month))].length;
              const filiais = [...new Set(rateioLog.map(r => r.filial))].length;
              const totalRateado = rateioLog.reduce((s, r) => s + Number(r.valor_rateado), 0);
              return (
                <div className="bg-teal-600 rounded-lg p-2.5 text-white min-w-[180px]">
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-70 mb-1">Último cálculo</p>
                  <p className="text-[9px] font-bold opacity-80">
                    {lastCalc ? new Date(lastCalc).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <div className="flex gap-3 mt-1.5">
                    <div>
                      <p className="text-[14px] font-black">{meses}</p>
                      <p className="text-[7px] opacity-70">meses</p>
                    </div>
                    <div>
                      <p className="text-[14px] font-black">{filiais}</p>
                      <p className="text-[7px] opacity-70">filiais</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-black tabular-nums">{totalRateado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
                      <p className="text-[7px] opacity-70">total rateado</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Log de Cálculos — full width */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black text-teal-500 uppercase tracking-wider shrink-0">Log de Cálculos</p>
              <div className="flex items-center gap-2">
                {/* Toggle Marca / Filial */}
                <div className="flex bg-teal-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setRateioGroupBy('filial')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                      rateioGroupBy === 'filial'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-teal-500 hover:text-teal-700'
                    }`}
                  >
                    Por Filial
                  </button>
                  <button
                    onClick={() => setRateioGroupBy('marca')}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                      rateioGroupBy === 'marca'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-teal-500 hover:text-teal-700'
                    }`}
                  >
                    Por Marca
                  </button>
                </div>
                {/* Filtro mês */}
                {rateioLog.length > 0 && (
                  <select
                    value={rateioMesFilter}
                    onChange={e => setRateioMesFilter(e.target.value)}
                    className="px-2 py-1 text-[10px] font-bold border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white text-gray-700"
                  >
                    <option value="">Todos os meses</option>
                    {[...new Set(rateioLog.map(r => r.year_month))].sort().reverse().map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-teal-100 overflow-hidden">
              <div className="max-h-[340px] overflow-y-auto">
                  {rateioLoading ? (
                    <div className="flex items-center justify-center py-8 text-teal-400 text-[10px] gap-1.5">
                      <div className="w-3 h-3 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                      Carregando...
                    </div>
                  ) : rateioLog.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-[10px]">Nenhum cálculo encontrado</p>
                  ) : rateioGroupBy === 'filial' ? (
                    /* ---- VISÃO POR FILIAL ---- */
                    (() => {
                      const filtered = rateioMesFilter
                        ? rateioLog.filter(r => r.year_month === rateioMesFilter)
                        : [...rateioLog];
                      const sortDir = rateioSort.dir === 'asc' ? 1 : -1;
                      const sortedFilial = filtered.sort((a, b) => {
                        switch (rateioSort.col) {
                          case 'year_month': return sortDir * a.year_month.localeCompare(b.year_month);
                          case 'filial': return sortDir * (a.nome_filial || a.filial).localeCompare(b.nome_filial || b.filial);
                          case 'marca': return sortDir * (a.marca || '').localeCompare(b.marca || '');
                          case 'rz_ebitda': return sortDir * (Number(a.rz_ebitda) - Number(b.rz_ebitda));
                          case 'receita_bruta': return sortDir * (Number(a.receita_bruta) - Number(b.receita_bruta));
                          case 'share_pct': return sortDir * (Number(a.share_pct) - Number(b.share_pct));
                          case 'valor_rateado': return sortDir * (Number(a.valor_rateado) - Number(b.valor_rateado));
                          default: return 0;
                        }
                      });
                      const totReceita = sortedFilial.reduce((s, r) => s + Number(r.receita_bruta), 0);
                      const totShare = sortedFilial.reduce((s, r) => s + Number(r.share_pct), 0);
                      const totRateado = sortedFilial.reduce((s, r) => s + Number(r.valor_rateado), 0);
                      const toggleSort = (col: string) => setRateioSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
                      const arrow = (col: string) => rateioSort.col === col ? (rateioSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
                      const thCls = (align: string) => `${align} px-2 py-1.5 text-[9px] font-black text-teal-400 uppercase cursor-pointer select-none hover:text-teal-600 transition-colors`;
                      return (
                        <table className="w-full">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-teal-50/90 backdrop-blur-sm">
                              <th className={thCls('text-left')} onClick={() => toggleSort('year_month')}>Mês{arrow('year_month')}</th>
                              <th className={thCls('text-left')} onClick={() => toggleSort('filial')}>Filial{arrow('filial')}</th>
                              <th className={thCls('text-left')} onClick={() => toggleSort('marca')}>Marca{arrow('marca')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('rz_ebitda')}>EBITDA RZ{arrow('rz_ebitda')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('receita_bruta')}>Receita{arrow('receita_bruta')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('share_pct')}>Share{arrow('share_pct')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('valor_rateado')}>Rateado{arrow('valor_rateado')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedFilial.map((r, idx) => (
                              <tr
                                key={`${r.year_month}_${r.filial}`}
                                className={`border-t border-teal-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'} hover:bg-teal-50/40`}
                              >
                                <td className="px-2 py-[3px]"><span className="text-[10px] font-bold text-teal-700">{r.year_month}</span></td>
                                <td className="px-2 py-[3px]">
                                  <span className="text-[10px] text-gray-700 truncate block max-w-[120px]" title={r.nome_filial || r.filial}>{r.nome_filial || r.filial}</span>
                                </td>
                                <td className="px-2 py-[3px]">
                                  <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1 h-4 rounded bg-teal-100 text-teal-700 font-black text-[8px]">{r.marca || '—'}</span>
                                </td>
                                <td className="px-2 py-[3px] text-right"><span className="text-[10px] text-gray-500 tabular-nums">{Number(r.rz_ebitda).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                                <td className="px-2 py-[3px] text-right"><span className="text-[10px] text-gray-600 tabular-nums">{Number(r.receita_bruta).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                                <td className="px-2 py-[3px] text-right"><span className="text-[10px] font-bold text-teal-600 tabular-nums">{(Number(r.share_pct) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></td>
                                <td className="px-2 py-[3px] text-right"><span className="text-[10px] font-bold text-gray-800 tabular-nums">{Number(r.valor_rateado).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-teal-300 bg-teal-50/60">
                              <td className="px-2 py-1.5" colSpan={2}><span className="text-[10px] font-black text-teal-800">TOTAL</span></td>
                              <td className="px-2 py-1.5" />
                              <td className="px-2 py-1.5" />
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{totReceita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{(totShare * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{totRateado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                            </tr>
                          </tfoot>
                        </table>
                      );
                    })()
                  ) : (
                    /* ---- VISÃO POR MARCA (agrupado) ---- */
                    (() => {
                      const filtered = rateioMesFilter
                        ? rateioLog.filter(r => r.year_month === rateioMesFilter)
                        : rateioLog;
                      const grouped: Record<string, { ym: string; marca: string; filiais: number; receita: number; share: number; rateado: number }> = {};
                      filtered.forEach(r => {
                        const key = `${r.year_month}_${r.marca || 'SEM'}`;
                        if (!grouped[key]) grouped[key] = { ym: r.year_month, marca: r.marca || '—', filiais: 0, receita: 0, share: 0, rateado: 0 };
                        grouped[key].filiais += 1;
                        grouped[key].receita += Number(r.receita_bruta);
                        grouped[key].share += Number(r.share_pct);
                        grouped[key].rateado += Number(r.valor_rateado);
                      });
                      const sortDir = rateioSort.dir === 'asc' ? 1 : -1;
                      const rows = Object.values(grouped).sort((a, b) => {
                        switch (rateioSort.col) {
                          case 'year_month': return sortDir * a.ym.localeCompare(b.ym);
                          case 'marca': return sortDir * a.marca.localeCompare(b.marca);
                          case 'filiais': return sortDir * (a.filiais - b.filiais);
                          case 'receita_bruta': return sortDir * (a.receita - b.receita);
                          case 'share_pct': return sortDir * (a.share - b.share);
                          case 'valor_rateado': return sortDir * (a.rateado - b.rateado);
                          default: return a.ym.localeCompare(b.ym) || a.marca.localeCompare(b.marca);
                        }
                      });
                      const totFiliais = rows.reduce((s, g) => s + g.filiais, 0);
                      const totReceita = rows.reduce((s, g) => s + g.receita, 0);
                      const totShare = rows.reduce((s, g) => s + g.share, 0);
                      const totRateado = rows.reduce((s, g) => s + g.rateado, 0);
                      const toggleSort = (col: string) => setRateioSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
                      const arrow = (col: string) => rateioSort.col === col ? (rateioSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
                      const thCls = (align: string) => `${align} px-2 py-1.5 text-[9px] font-black text-teal-400 uppercase cursor-pointer select-none hover:text-teal-600 transition-colors`;
                      return (
                        <table className="w-full">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-teal-50/90 backdrop-blur-sm">
                              <th className={thCls('text-left')} onClick={() => toggleSort('year_month')}>Mês{arrow('year_month')}</th>
                              <th className={thCls('text-left')} onClick={() => toggleSort('marca')}>Marca{arrow('marca')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('filiais')}>Filiais{arrow('filiais')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('receita_bruta')}>Receita Total{arrow('receita_bruta')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('share_pct')}>Share Total{arrow('share_pct')}</th>
                              <th className={thCls('text-right')} onClick={() => toggleSort('valor_rateado')}>Total Rateado{arrow('valor_rateado')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((g, idx) => (
                              <tr
                                key={`${g.ym}_${g.marca}`}
                                className={`border-t border-teal-50/80 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'} hover:bg-teal-50/40`}
                              >
                                <td className="px-2 py-1"><span className="text-[10px] font-bold text-teal-700">{g.ym}</span></td>
                                <td className="px-2 py-1">
                                  <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 h-5 rounded bg-teal-100 text-teal-700 font-black text-[9px]">{g.marca}</span>
                                </td>
                                <td className="px-2 py-1 text-right"><span className="text-[10px] text-gray-600 tabular-nums">{g.filiais}</span></td>
                                <td className="px-2 py-1 text-right"><span className="text-[10px] text-gray-600 tabular-nums">{g.receita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                                <td className="px-2 py-1 text-right"><span className="text-[10px] font-bold text-teal-600 tabular-nums">{(g.share * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></td>
                                <td className="px-2 py-1 text-right"><span className="text-[11px] font-black text-gray-800 tabular-nums">{g.rateado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-teal-300 bg-teal-50/60">
                              <td className="px-2 py-1.5" colSpan={2}><span className="text-[10px] font-black text-teal-800">TOTAL</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{totFiliais}</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{totReceita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{(totShare * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span></td>
                              <td className="px-2 py-1.5 text-right"><span className="text-[10px] font-black text-teal-800 tabular-nums">{totRateado.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span></td>
                            </tr>
                          </tfoot>
                        </table>
                      );
                    })()
                  )}
                </div>
              </div>

            {/* Tabela Receita × Custos × % Rateio (jan-dez, sempre 12 colunas) */}
            {(() => {
              const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              const year = rateioLog.length > 0 ? rateioLog[0].year_month.slice(0, 4) : new Date().getFullYear().toString();
              const byMonth: Record<string, { rateado: number; receita: number; ebitda: number }> = {};
              rateioLog.forEach(r => {
                const ym = r.year_month;
                if (!byMonth[ym]) byMonth[ym] = { rateado: 0, receita: 0, ebitda: 0 };
                byMonth[ym].rateado += Number(r.valor_rateado);
                byMonth[ym].receita += Number(r.receita_bruta);
                byMonth[ym].ebitda = Number(r.rz_ebitda);
              });
              const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
              const get = (ym: string) => byMonth[ym] || { rateado: 0, receita: 0, ebitda: 0 };
              const fmt = (v: number) => v === 0 ? '—' : (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              return (
                <div className="bg-white/70 backdrop-blur-sm rounded-lg border border-teal-100 p-2 mt-2">
                  <p className="text-[9px] font-black text-teal-600 uppercase tracking-wider mb-1.5">Receita × Custos RZ × % Rateio ({year})</p>
                  <table className="w-full text-[9px] table-fixed">
                    <thead>
                      <tr>
                        <th className="text-left px-1 py-0.5 text-teal-400 font-black w-20"></th>
                        {monthLabels.map(m => (
                          <th key={m} className="text-right px-0.5 py-0.5 text-teal-400 font-black">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-teal-50">
                        <td className="px-1 py-0.5 font-bold text-gray-600 whitespace-nowrap">Receita (k)</td>
                        {keys.map(ym => (
                          <td key={ym} className="px-0.5 py-0.5 text-right text-gray-700 tabular-nums">{fmt(get(ym).receita)}</td>
                        ))}
                      </tr>
                      <tr className="border-t border-teal-50">
                        <td className="px-1 py-0.5 font-bold text-gray-600 whitespace-nowrap">Custos RZ (k)</td>
                        {keys.map(ym => {
                          const v = get(ym).ebitda;
                          return <td key={ym} className="px-0.5 py-0.5 text-right text-red-600 tabular-nums">{v === 0 ? '—' : fmt(v)}</td>;
                        })}
                      </tr>
                      <tr className="border-t border-teal-100 bg-teal-50/40">
                        <td className="px-1 py-0.5 font-black text-teal-700 whitespace-nowrap">% Rateio</td>
                        {keys.map(ym => {
                          const d = get(ym);
                          const pct = d.receita !== 0 ? Math.abs(d.rateado / d.receita * 100) : 0;
                          return (
                            <td key={ym} className="px-0.5 py-0.5 text-right font-black text-teal-700 tabular-nums">{pct === 0 ? '—' : `${pct.toFixed(1)}%`}</td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Aba: De-Para Fornecedores */}
      {activeTab === 'depara' && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-300 rounded-xl p-4 shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <ArrowRightLeft className="text-indigo-600" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-indigo-900">De-Para Fornecedores</h2>
              <p className="text-xs text-indigo-700">
                Normalização de nomes de fornecedores — {deparaIsSearchResult
                  ? `${deparaData.length} resultado${deparaData.length !== 1 ? 's' : ''} encontrado${deparaData.length !== 1 ? 's' : ''}`
                  : `${deparaData.length} de ${deparaTotalCount} registros`
                }
              </p>
            </div>
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
              <FileSpreadsheet size={12} />
              {deparaFile ? deparaFile.name : 'Importar Excel'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleDeparaFileChange}
                disabled={deparaImporting}
              />
            </label>
            {deparaFile && (
              <button onClick={handleDeparaClearImport} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Limpar arquivo">
                <X size={14} />
              </button>
            )}
            <button
              onClick={handleNormalizarFornecedores}
              disabled={deparaNormalizing || deparaData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play size={12} />
              {deparaNormalizing ? 'Normalizando...' : 'Executar Agora'}
            </button>
          </div>

          {/* Mensagem */}
          {deparaMessage && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs font-bold ${
              deparaMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {deparaMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {deparaMessage.text}
            </div>
          )}

          {/* Preview + Progresso + Log da importação */}
          {deparaImportPreview.length > 0 && (
            <div className="mb-2 p-2 bg-white/60 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-600">Preview — {deparaImportPreview.length} registros</span>
                {!deparaImporting && (
                  <button
                    onClick={handleDeparaImport}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 transition-colors"
                  >
                    <Upload size={10} />
                    Importar {deparaImportPreview.length} registros
                  </button>
                )}
              </div>
              <div className="max-h-[120px] overflow-auto rounded border border-indigo-100">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-indigo-100">
                    <tr>
                      <th className="text-left px-1 py-0.5 font-bold text-indigo-600 w-8">#</th>
                      <th className="text-left px-1 py-0.5 font-bold text-indigo-600">Fornecedor De</th>
                      <th className="text-left px-1 py-0.5 font-bold text-indigo-600">Fornecedor Para</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deparaImportPreview.slice(0, 100).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/30'}>
                        <td className="px-1 py-0 text-gray-400">{idx + 1}</td>
                        <td className="px-1 py-0 text-gray-700">{item.fornecedor_de}</td>
                        <td className="px-1 py-0 text-indigo-700 font-semibold">{item.fornecedor_para}</td>
                      </tr>
                    ))}
                    {deparaImportPreview.length > 100 && (
                      <tr><td colSpan={3} className="px-1 py-0.5 text-center text-indigo-400 text-[10px]">... e mais {deparaImportPreview.length - 100} registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {deparaImporting && (
            <div className="mb-2">
              <div className="w-full bg-indigo-100 rounded-full h-1.5">
                <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${deparaImportProgress}%` }}></div>
              </div>
              <p className="text-[10px] text-indigo-500 mt-0.5">{Math.round(deparaImportProgress)}% concluído</p>
            </div>
          )}

          {deparaImportLog.length > 0 && (
            <div className="mb-2 max-h-[100px] overflow-auto bg-gray-900 rounded-lg p-2 font-mono text-[10px]">
              {deparaImportLog.map((log, idx) => (
                <div key={idx} className={`leading-tight ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warn' ? 'text-yellow-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{log.time}]</span> {log.text}
                </div>
              ))}
            </div>
          )}

          {/* Busca server-side */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
              <input
                type="text"
                placeholder="Digite parte ou todo o nome do fornecedor e clique Buscar..."
                value={deparaSearch}
                onChange={(e) => setDeparaSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleDeparaServerSearch(); }}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
            <button
              onClick={handleDeparaServerSearch}
              disabled={deparaSearching}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search size={12} />
              {deparaSearching ? 'Buscando...' : 'Buscar'}
            </button>
            {deparaIsSearchResult && (
              <button
                onClick={() => { setDeparaSearch(''); loadDeparaData(); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <X size={12} />
                Limpar
              </button>
            )}
          </div>

          {/* Formulário para adicionar novo */}
          <div className="flex gap-2 mb-3 p-2 bg-white/60 rounded-lg border border-indigo-200">
            <input
              type="text"
              placeholder="Fornecedor De (nome original)"
              value={deparaNewDe}
              onChange={(e) => setDeparaNewDe(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              placeholder="Fornecedor Para (nome normalizado)"
              value={deparaNewPara}
              onChange={(e) => setDeparaNewPara(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={handleDeparaAdd}
              disabled={deparaAdding || !deparaNewDe.trim() || !deparaNewPara.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={12} />
              {deparaAdding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>

          {/* Tabela */}
          {deparaLoading ? (
            <div className="text-center py-8 text-indigo-500 text-xs font-bold">Carregando...</div>
          ) : deparaData.length === 0 ? (
            <div className="text-center py-8 text-indigo-400 text-xs">
              {deparaIsSearchResult ? `Nenhum fornecedor encontrado para "${deparaSearch}".` : 'Nenhum registro de-para cadastrado.'}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto rounded-lg border border-indigo-200">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-indigo-100 z-10">
                  <tr>
                    <th className="text-left px-1.5 py-0.5 font-black text-indigo-700 w-[46%]">Fornecedor De</th>
                    <th className="text-left px-1.5 py-0.5 font-black text-indigo-700 w-[46%]">Fornecedor Para</th>
                    <th className="text-center px-1 py-0.5 font-black text-indigo-700 w-[8%]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {deparaData.map((item, idx) => (
                    <tr key={item.fornecedor_de} className={`border-t border-indigo-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'} hover:bg-indigo-100/40`}>
                      {deparaEditingId === item.fornecedor_de ? (
                        <>
                          <td className="px-1 py-0">
                            <input
                              type="text"
                              value={deparaEditDe}
                              onChange={(e) => setDeparaEditDe(e.target.value)}
                              className="w-full px-1 py-0 text-[10px] border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-1 py-0">
                            <input
                              type="text"
                              value={deparaEditPara}
                              onChange={(e) => setDeparaEditPara(e.target.value)}
                              className="w-full px-1 py-0 text-[10px] border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-0 py-0 text-center">
                            <div className="flex items-center justify-center gap-0">
                              <button
                                onClick={() => handleDeparaSave(item.fornecedor_de)}
                                disabled={deparaSaving}
                                className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                                title="Salvar"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={handleDeparaCancelEdit}
                                className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                                title="Cancelar"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-1.5 py-0 text-gray-800 truncate">{item.fornecedor_de}</td>
                          <td className="px-1.5 py-0 text-indigo-700 font-semibold truncate">{item.fornecedor_para}</td>
                          <td className="px-0 py-0 text-center">
                            <div className="flex items-center justify-center gap-0">
                              <button
                                onClick={() => handleDeparaEdit(item)}
                                className="p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded"
                                title="Editar"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => handleDeparaDelete(item.fornecedor_de)}
                                className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
                                title="Excluir"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info automação */}
          <div className="mt-3 p-2 bg-indigo-100/50 rounded-lg border border-indigo-200">
            <p className="text-[10px] text-indigo-600">
              <strong>Automação:</strong> A normalização roda automaticamente todo dia à meia-noite (pg_cron).
              Use o botão "Executar Agora" para rodar manualmente. A tabela é sincronizada em tempo real com o Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Aba: Email/SMTP */}
      {activeTab === 'smtp' && (
        <div className="bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-300 rounded-xl p-4 shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-sky-100 p-2 rounded-lg">
              <Mail className="text-sky-600" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-sky-900">Configuração SMTP</h2>
              <p className="text-xs text-sky-700">Configure o servidor de email para envios do sistema (AWS SES ou outro)</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              smtpConfigured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${smtpConfigured ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {smtpConfigured ? 'Configurado' : 'Não configurado'}
            </div>
          </div>

          {/* Mensagem */}
          {smtpMessage && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-bold ${
              smtpMessage.type === 'success' ? 'bg-green-100 text-green-800' :
              smtpMessage.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {smtpMessage.type === 'success' ? <CheckCircle size={14} /> :
               smtpMessage.type === 'error' ? <AlertTriangle size={14} /> :
               <Loader2 size={14} className="animate-spin" />}
              {smtpMessage.text}
            </div>
          )}

          {smtpLoading ? (
            <div className="text-center py-12 text-sky-500 text-xs font-bold">Carregando configuração...</div>
          ) : (
            <div className="bg-white/60 rounded-lg border border-sky-200 p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Host */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Host SMTP *</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="email-smtp.sa-east-1.amazonaws.com"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Porta */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Porta *</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Usuário */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Usuário SMTP *</label>
                  <input
                    type="text"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="Credencial IAM SMTP"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Senha SMTP *</label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="Credencial IAM SMTP"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Email remetente */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Email Remetente *</label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@raizeducacao.com.br"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Nome remetente */}
                <div>
                  <label className="block text-xs font-bold text-sky-800 mb-1">Nome Remetente</label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="DRE Raiz"
                    className="w-full px-3 py-2 text-xs border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-sky-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpUseTls}
                    onChange={(e) => setSmtpUseTls(e.target.checked)}
                    className="w-4 h-4 rounded border-sky-300 text-sky-600 focus:ring-sky-400"
                  />
                  <span className="text-xs font-bold text-sky-800">TLS Ativado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtpEnabled}
                    onChange={(e) => setSmtpEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-sky-300 text-sky-600 focus:ring-sky-400"
                  />
                  <span className="text-xs font-bold text-sky-800">SMTP Ativo</span>
                  <span className="text-[10px] text-sky-500">(desativar usa Resend como fallback)</span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-sky-100">
                <button
                  onClick={handleSmtpTest}
                  disabled={smtpTesting || !smtpHost || !smtpUsername || !smtpPassword}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-sky-300 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {smtpTesting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {smtpTesting ? 'Testando...' : 'Testar Conexão'}
                </button>
                <button
                  onClick={handleSmtpSave}
                  disabled={smtpSaving || !smtpHost || !smtpUsername || !smtpPassword || !smtpFromEmail}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {smtpSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {smtpSaving ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-3 p-2 bg-sky-100/50 rounded-lg border border-sky-200">
            <p className="text-[10px] text-sky-600">
              <strong>Como funciona:</strong> Com SMTP configurado, todos os emails de liberação de acesso usam o servidor SMTP cadastrado (ex: AWS SES).
              Se desativado ou em caso de falha, o sistema usa o Resend como fallback.
              O email de teste é enviado para o email do admin logado ({currentUser?.email}).
            </p>
          </div>
        </div>
      )}

      {/* Modal de Envio de Email de Boas-Vindas */}
      {showWelcomeModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-teal-400 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Usuário Aprovado!</h2>
              <p className="text-white/90 text-sm mt-1">{selectedUser.name}</p>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-2">
                  {selectedUser.photo_url ? (
                    <img src={selectedUser.photo_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
                      <UserIcon size={18} className="text-orange-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase bg-orange-500 text-white px-2 py-0.5 rounded-full">
                    {selectedUser.role === 'admin' ? 'Admin' : selectedUser.role === 'manager' ? 'Gestor' : selectedUser.role === 'approver' ? 'Aprovador' : 'Viewer'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {permissions.filter(p => p.permission_type === 'cia').length > 0
                      ? permissions.filter(p => p.permission_type === 'cia').map(p => p.permission_value).join(', ')
                      : 'Acesso total'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center mb-5">
                Deseja enviar o <strong>email de boas-vindas</strong> informando que o acesso foi liberado?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Não, obrigado
                </button>
                <button
                  onClick={async () => {
                    setShowWelcomeModal(false);
                    await handleSendWelcomeEmail();
                  }}
                  disabled={sendingEmail}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Mail size={14} /> Enviar Email</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aba: Cronograma Financeiro */}
      {activeTab === 'cronograma' && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-300 rounded-xl p-4 shadow">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Calendar className="text-teal-600" size={20} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-base font-black text-teal-900">Cronograma Financeiro</h2>
              <p className="text-xs text-teal-700">Gerencie tarefas e reuniões do fechamento mensal</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={cronogramaMonth} onChange={e => setCronogramaMonth(+e.target.value)} className="border border-teal-300 rounded-lg px-2 py-1.5 text-sm font-bold bg-white">
                {MONTH_NAMES_SHORT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input type="number" value={cronogramaYear} onChange={e => setCronogramaYear(+e.target.value)} min={2020} max={2100} className="border border-teal-300 rounded-lg px-2 py-1.5 text-sm font-bold bg-white w-20" />
              <button onClick={() => setShowDuplicateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition-all">
                <Copy size={14} /> Duplicar Mês
              </button>
              <button onClick={() => setShowAreaManager(!showAreaManager)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-xs transition-all">
                <Tag size={14} /> Áreas
              </button>
              <button onClick={() => { resetCronogramaForm(); setCronogramaShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all">
                <Plus size={14} /> Novo Item
              </button>
            </div>
          </div>

          {/* Gerenciador de Áreas */}
          {showAreaManager && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-gray-700">Gerenciar Áreas</h4>
                <button onClick={() => setShowAreaManager(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              {/* Áreas padrão */}
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Padrão (fixas)</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DEFAULT_AREA_PRESETS.map(a => (
                  <span key={a.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: a.color + '20', color: a.color, border: `1px solid ${a.color}40` }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </span>
                ))}
              </div>
              {/* Áreas customizadas */}
              {customAreas.length > 0 && (
                <>
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-1.5">Customizadas</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {customAreas.map(a => (
                      <span key={a.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold group" style={{ backgroundColor: a.color + '20', color: a.color, border: `1px solid ${a.color}40` }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                        {a.name}
                        <button onClick={() => handleRemoveCustomArea(a.name)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-600" title="Remover"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {/* Adicionar nova área */}
              <div className="flex items-center gap-2">
                <input value={newAreaName} onChange={e => setNewAreaName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomArea()} placeholder="Nome da nova área" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
                <input type="color" value={newAreaColor} onChange={e => setNewAreaColor(e.target.value)} className="w-9 h-8 rounded-lg border cursor-pointer" />
                <button onClick={handleAddCustomArea} disabled={!newAreaName.trim()} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs transition-all">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Message */}
          {cronogramaMessage && (
            <div className={`p-2 rounded-lg flex items-center gap-2 mb-3 text-sm ${cronogramaMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
              {cronogramaMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {cronogramaMessage.text}
            </div>
          )}

          {/* Filtro por Área */}
          {cronogramaItems.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase">Filtrar:</span>
              {(() => {
                const uniqueAreas = new Map<string, string>();
                cronogramaItems.forEach(i => { if (i.area && !uniqueAreas.has(i.area)) uniqueAreas.set(i.area, i.area_color); });
                return Array.from(uniqueAreas.entries()).map(([name, color]) => {
                  const isSelected = cronogramaFilterAreas.includes(name);
                  return (
                    <button key={name} onClick={() => setCronogramaFilterAreas(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name])}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-teal-400 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color + '20', color: color, borderColor: color + '40' }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {name}
                    </button>
                  );
                });
              })()}
              {cronogramaFilterAreas.length > 0 && (
                <button onClick={() => setCronogramaFilterAreas([])} className="text-[11px] text-gray-400 hover:text-gray-600 underline">Limpar</button>
              )}
            </div>
          )}

          {/* Loading */}
          {cronogramaLoading && (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
          )}

          {!cronogramaLoading && (
            <>
              {/* Tarefas */}
              {(() => { const tasks = cronogramaItems.filter(i => i.item_type === 'task' && (cronogramaFilterAreas.length === 0 || cronogramaFilterAreas.includes(i.area))); return tasks.length > 0 ? (
                <div className="mb-5">
                  <h3 className="text-sm font-black text-gray-700 uppercase mb-2 flex items-center gap-1.5"><CheckCircle size={14} className="text-teal-600" /> Tarefas / Entregas ({tasks.length})</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-12">Ord</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-20">Data</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-28">Área</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Entregável</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Ação</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-20">Ações</th>
                      </tr></thead>
                      <tbody>{tasks.map(t => (
                        <tr key={t.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-400 font-mono">{t.sort_order}</td>
                          <td className="px-3 py-2 font-mono text-xs font-bold">{t.date_label}</td>
                          <td className="px-3 py-2"><span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: t.area_color + '20', color: t.area_color }}>{t.area}</span></td>
                          <td className="px-3 py-2 text-gray-700">{t.deliverable}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{t.action_description}</td>
                          <td className="px-3 py-2 flex gap-1">
                            <button onClick={() => handleCronogramaEdit(t)} className="text-blue-600 hover:text-blue-800"><Pencil size={14} /></button>
                            <button onClick={() => handleCronogramaDelete(t.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400 mb-4">Nenhuma tarefa para este mês.</p>; })()}

              {/* Reuniões */}
              {(() => { const meetings = cronogramaItems.filter(i => i.item_type === 'meeting' && (cronogramaFilterAreas.length === 0 || cronogramaFilterAreas.includes(i.area))); return meetings.length > 0 ? (
                <div className="mb-4">
                  <h3 className="text-sm font-black text-gray-700 uppercase mb-2 flex items-center gap-1.5"><Clock size={14} className="text-teal-600" /> Reuniões ({meetings.length})</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-12">Ord</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-16">Dia</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-16">Hora</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Marca</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Obs</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 w-20">Ações</th>
                      </tr></thead>
                      <tbody>{meetings.map(m => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-400 font-mono">{m.sort_order}</td>
                          <td className="px-3 py-2 font-mono text-xs font-bold">{m.meeting_day || '-'}</td>
                          <td className="px-3 py-2 text-xs">{m.meeting_time || '-'}</td>
                          <td className="px-3 py-2 font-medium">{m.meeting_brand || '-'}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{m.meeting_obs || '-'}</td>
                          <td className="px-3 py-2 flex gap-1">
                            <button onClick={() => handleCronogramaEdit(m)} className="text-blue-600 hover:text-blue-800"><Pencil size={14} /></button>
                            <button onClick={() => handleCronogramaDelete(m.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400 mb-2">Nenhuma reunião para este mês.</p>; })()}

              {cronogramaItems.length === 0 && !cronogramaLoading && (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold">Nenhum item cadastrado</p>
                  <p className="text-xs">Clique em "Novo Item" para adicionar</p>
                </div>
              )}
            </>
          )}

          {/* Form modal */}
          {cronogramaShowForm && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={() => { setCronogramaShowForm(false); resetCronogramaForm(); }}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-800">{cronogramaEditing ? 'Editar Item' : 'Novo Item'}</h3>
                  <button onClick={() => { setCronogramaShowForm(false); resetCronogramaForm(); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setCronogramaFormType('task')} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${cronogramaFormType === 'task' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Tarefa</button>
                  <button onClick={() => setCronogramaFormType('meeting')} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${cronogramaFormType === 'meeting' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Reunião</button>
                </div>

                <div className="space-y-3">
                  {cronogramaFormType === 'task' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Data (ex: "11", "11-13", "Diário")</label>
                          <input value={cronogramaForm.date_label} onChange={e => setCronogramaForm(f => ({ ...f, date_label: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Ordem</label>
                          <input type="number" value={cronogramaForm.sort_order} onChange={e => setCronogramaForm(f => ({ ...f, sort_order: +e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Área</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {AREA_PRESETS.map(p => (
                            <button key={p.name} onClick={() => setCronogramaForm(f => ({ ...f, area: p.name, area_color: p.color }))}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${cronogramaForm.area === p.name ? 'ring-2 ring-offset-1 ring-teal-400' : ''}`}
                              style={{ backgroundColor: p.color + '20', color: p.color, borderColor: p.color + '40' }}>
                              {p.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={cronogramaForm.area} onChange={e => setCronogramaForm(f => ({ ...f, area: e.target.value }))} placeholder="Ou digite..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                          <input type="color" value={cronogramaForm.area_color} onChange={e => setCronogramaForm(f => ({ ...f, area_color: e.target.value }))} className="w-10 h-9 rounded-lg border cursor-pointer" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Entregável</label>
                        <input value={cronogramaForm.deliverable} onChange={e => setCronogramaForm(f => ({ ...f, deliverable: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Ação / Descrição</label>
                        <textarea value={cronogramaForm.action_description} onChange={e => setCronogramaForm(f => ({ ...f, action_description: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Dia</label>
                          <input value={cronogramaForm.meeting_day} onChange={e => setCronogramaForm(f => ({ ...f, meeting_day: e.target.value }))} placeholder="ex: 15" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Hora</label>
                          <input value={cronogramaForm.meeting_time} onChange={e => setCronogramaForm(f => ({ ...f, meeting_time: e.target.value }))} placeholder="ex: 14:00" className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Ordem</label>
                          <input type="number" value={cronogramaForm.sort_order} onChange={e => setCronogramaForm(f => ({ ...f, sort_order: +e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Marca</label>
                        <input value={cronogramaForm.meeting_brand} onChange={e => setCronogramaForm(f => ({ ...f, meeting_brand: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Observação</label>
                        <textarea value={cronogramaForm.meeting_obs} onChange={e => setCronogramaForm(f => ({ ...f, meeting_obs: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => { setCronogramaShowForm(false); resetCronogramaForm(); }} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button onClick={handleCronogramaSave} className="px-4 py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all">
                    {cronogramaEditing ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate modal */}
          {showDuplicateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDuplicateModal(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                <h3 className="font-black text-gray-800 mb-3">Duplicar Cronograma</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Copiar itens de <strong>{MONTH_NAMES_SHORT[cronogramaMonth - 1]}/{cronogramaYear}</strong> para:
                </p>
                <div className="flex gap-2 mb-4">
                  <select value={cronogramaDupMonth} onChange={e => setCronogramaDupMonth(+e.target.value)} className="border rounded-lg px-2 py-2 text-sm font-bold flex-1">
                    {MONTH_NAMES_SHORT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <input type="number" value={cronogramaDupYear} onChange={e => setCronogramaDupYear(+e.target.value)} min={2020} max={2100} className="border rounded-lg px-2 py-2 text-sm font-bold w-20" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowDuplicateModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button onClick={handleCronogramaDuplicate} className="px-4 py-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all">Duplicar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Aba: Override Contábil */}
      {activeTab === 'override' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-800">Override Contábil</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Substitui dados do contábil (transactions) por lançamentos manuais (transactions_manual) na DRE e Lançamentos.
                Quando ativo, as linhas contábeis do tag01/marca/período são ignoradas.
              </p>
            </div>
            <button
              onClick={() => setOverrideShowForm(!overrideShowForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs uppercase transition-all"
            >
              <Plus size={14} />
              Nova Regra
            </button>
          </div>

          {/* Mensagem */}
          {overrideMessage && (
            <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
              overrideMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {overrideMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {overrideMessage.text}
              <button onClick={() => setOverrideMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          )}

          {/* Formulário novo override */}
          {overrideShowForm && (
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-sm text-red-800">Nova Regra de Override</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Tag01 (Centro de Custo) *</label>
                  <input
                    value={overrideForm.tag01}
                    onChange={e => setOverrideForm(f => ({ ...f, tag01: e.target.value }))}
                    placeholder="Ex: MARKETING DIGITAL"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Marca <span className="text-gray-400">(vazio = todas)</span></label>
                  <input
                    value={overrideForm.marca}
                    onChange={e => setOverrideForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Ex: COC"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Filial <span className="text-gray-400">(vazio = todas)</span></label>
                  <input
                    value={overrideForm.filial}
                    onChange={e => setOverrideForm(f => ({ ...f, filial: e.target.value }))}
                    placeholder="Ex: SP - Matriz"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Mês Início <span className="text-gray-400">(vazio = sempre)</span></label>
                  <input
                    type="month"
                    value={overrideForm.mes_de}
                    onChange={e => setOverrideForm(f => ({ ...f, mes_de: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Mês Fim <span className="text-gray-400">(vazio = permanente)</span></label>
                  <input
                    type="month"
                    value={overrideForm.mes_ate}
                    onChange={e => setOverrideForm(f => ({ ...f, mes_ate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Motivo</label>
                  <input
                    value={overrideForm.motivo}
                    onChange={e => setOverrideForm(f => ({ ...f, motivo: e.target.value }))}
                    placeholder="Ex: Contábil com rateio incorreto"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleOverrideAdd}
                  disabled={overrideSaving || !overrideForm.tag01.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs uppercase transition-all disabled:opacity-50"
                >
                  {overrideSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar
                </button>
                <button
                  onClick={() => { setOverrideShowForm(false); setOverrideForm({ tag01: '', marca: '', filial: '', mes_de: '', mes_ate: '', motivo: '' }); }}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabela de overrides */}
          {overrideLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-red-500" />
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
            </div>
          ) : overrideData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Layers size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma regra de override cadastrada.</p>
              <p className="text-xs mt-1">Clique em "Nova Regra" para substituir dados contábeis por manuais.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Status</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Tag01</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Marca</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Filial</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Período</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Motivo</th>
                    <th className="px-3 py-2.5 text-left font-bold text-xs text-gray-600 uppercase">Criado por</th>
                    <th className="px-3 py-2.5 text-center font-bold text-xs text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {overrideData.map(row => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!row.ativo ? 'opacity-50 bg-gray-50' : ''}`}>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleOverrideToggle(row.id, row.ativo)}
                          className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                            row.ativo
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {row.ativo ? 'ATIVO' : 'INATIVO'}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800">{row.tag01}</td>
                      <td className="px-3 py-2 text-gray-600">{row.marca || <span className="text-gray-300 italic">Todas</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{row.filial || <span className="text-gray-300 italic">Todas</span>}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.mes_de || '...'} {' → '} {row.mes_ate || <span className="text-red-500 font-bold text-xs">PERMANENTE</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate" title={row.motivo}>{row.motivo || '-'}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{row.created_by?.split('@')[0] || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleOverrideDelete(row.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Excluir regra"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Nota explicativa */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Como funciona:</strong> Quando uma regra está <strong>ATIVA</strong>, os dados do contábil (transactions) para o tag01/marca/período
            são <strong>ignorados</strong> na DRE Gerencial, Lançamentos e Justificativas. Apenas os dados de transactions_manual contam.
            <br />
            <strong>Importante:</strong> Após criar/alterar regras, é necessário executar <code className="bg-amber-100 px-1 rounded">REFRESH MATERIALIZED VIEW dre_agg</code> no Supabase
            para que o drill-down reflita as mudanças. A DRE Gerencial (get_soma_tags) atualiza em tempo real.
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
