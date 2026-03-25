
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { CockpitDashboard } from './components/dashboard/CockpitDashboard';
import LoginScreen from './components/LoginScreen';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';

// Lazy loading de views pesadas (carregam sob demanda)
// KPIsView removed — merged into CockpitDashboard
const AnalysisView = React.lazy(() => import('./components/AnalysisView'));
const ManualChangesView = React.lazy(() => import('./components/ManualChangesView'));
const TransactionsView = React.lazy(() => import('./components/TransactionsView'));
const ForecastingView = React.lazy(() => import('./components/ForecastingView'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const SomaTagsView = React.lazy(() => import('./components/SomaTagsView'));
const ExecutiveDashboard = React.lazy(() => import('./components/agentTeam/ExecutiveDashboard'));
// HoldingDashboardPage removido — integrado ao CEO Dashboard como aba "Portfolio"
// AgentTeamView agora é aba dentro de AnalysisView
const CronogramaPopup = React.lazy(() => import('./components/CronogramaPopup'));
// VarianceJustificationsView agora é aba dentro de AnalysisView
const InquiryInboxView = React.lazy(() => import('./components/inquiries/InquiryInboxView'));
import { ViewType, Transaction, SchoolKPIs, ManualChange, TransactionType } from './types';
import { INITIAL_TRANSACTIONS, CATEGORIES, BRANCHES } from './constants';
import { PanelLeftOpen, Building2, Maximize2, Minimize2, Flag, Loader2, Lock, Menu, X, Activity, Table as TableIcon, Table2, RefreshCw, Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import * as supabaseService from './services/supabaseService';
import { getPendingInquiryCount, getAnsweredInquiryCount, subscribeInquiries } from './services/inquiryService';
import { getSomaTags, SomaTagsRow } from './services/supabaseService';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { useIsMobile } from './hooks/useIsMobile';
import { TransactionsSyncUI } from './src/components/TransactionsSyncUI';
import { useTransactions } from './src/hooks/useTransactions';

const App: React.FC = () => {
  const { user, loading: authLoading, isApprover } = useAuth();
  const { filterTransactions, hasPermissions, allowedMarcas, allowedFiliais, allowedCategories, allowedTag01, allowedTag02, allowedTag03, loading: permissionsLoading } = usePermissions();
  const { isMobile, isTablet, isDesktop } = useIsMobile();

  // Hook do TransactionsContext (COM Realtime!)
  const {
    transactions: contextTransactions,
    isLoading: isLoadingTransactions,
    applyFilters,
    currentFilters
  } = useTransactions();

  const [currentView, setCurrentView] = useState<ViewType>('soma_tags');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtros Globais (agora arrays para seleção múltipla)
  const [selectedMarca, setSelectedMarca] = useState<string[]>([]);
  const [selectedFilial, setSelectedFilial] = useState<string[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [hasMountedDRE, setHasMountedDRE] = useState(false);
  const [hasMountedSomaTags, setHasMountedSomaTags] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preFullscreenSidebarState, setPreFullscreenSidebarState] = useState(true);

  const [drillDownFilters, setDrillDownFilters] = useState<any>(() => {
    // Carregar filtros salvos do sessionStorage
    const saved = sessionStorage.getItem('drillDownFilters');
    return saved ? JSON.parse(saved) : null;
  });

  const [drillDownActiveTab, setDrillDownActiveTab] = useState<'real' | 'orcamento' | 'comparativo' | undefined>(() => {
    // Carregar aba ativa salva do sessionStorage
    const saved = sessionStorage.getItem('drillDownActiveTab');
    return saved ? JSON.parse(saved) : undefined;
  });

  const [drillDownOriginView, setDrillDownOriginView] = useState<ViewType>('dre');

  // Estado para controlar visualização da DRE (Executivo/Detalhado)
  const [presentationMode, setPresentationMode] = useState<'executive' | 'detailed'>(() => {
    const saved = sessionStorage.getItem('drePresentationMode');
    return (saved as 'executive' | 'detailed') || 'executive';
  });

  // Salvar presentationMode no sessionStorage
  useEffect(() => {
    sessionStorage.setItem('drePresentationMode', presentationMode);
  }, [presentationMode]);

  // Estados para ações do DRE
  const [dreActions, setDreActions] = useState<{
    refresh?: () => void;
    exportTable?: () => void;
    exportLayout?: () => void;
  }>({});
  const [isDreLoading, setIsDreLoading] = useState(false);
  const [isDreExportOpen, setIsDreExportOpen] = useState(false);

  // Estados para ações do Soma Tags
  const [somaTagsActions, setSomaTagsActions] = useState<{
    refresh?: () => void;
    exportExcel?: () => void;
  }>({});
  const [isSomaTagsLoading, setIsSomaTagsLoading] = useState(false);
  const [hasSomaTagsData, setHasSomaTagsData] = useState(false);
  const [isSomaTagsExportOpen, setIsSomaTagsExportOpen] = useState(false);
  const [somaTagsPresentationMode, setSomaTagsPresentationMode] = useState<'executive' | 'detailed'>('detailed');

  // Cronograma popup — aparece após login
  const [showCronograma, setShowCronograma] = useState(false);

  // Usar transactions do Context em vez de estado local
  const transactions = contextTransactions;
  const [manualChanges, setManualChanges] = useState<ManualChange[]>([]);

  // Estado para dados buscados na página de Lançamentos (persistente ao trocar de aba)
  const [searchedTransactions, setSearchedTransactions] = useState<Transaction[]>([]);
  const [hasSearchedTransactions, setHasSearchedTransactions] = useState(false);

  // ⚡ Dashboard — dados da mesma fonte do DRE Gerencial (getSomaTags)
  const [dashboardSomaRows, setDashboardSomaRows] = useState<SomaTagsRow[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  // Chave de carga: muda só quando os FILTROS DE PERMISSÃO mudam — evita carregar com filtros vazios
  const dashboardLoadedRef = React.useRef<string>('');

  // Helper para re-buscar dados do banco após operações de escrita
  const refreshData = React.useCallback(async () => {
    if (currentFilters) {
      await applyFilters(currentFilters);
    }
  }, [applyFilters, currentFilters]);

  // Loading global: apenas auth/permissões — NÃO inclui transações
  // Transações carregam em background sem bloquear a UI
  const isLoading = permissionsLoading;

  // ⚡ Dashboard — LAZY LOAD: só carrega quando o usuário abre o Dashboard
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    if (permissionsLoading) return;

    // Chave única para o conjunto de permissões atual
    // Garante que recarrega quando allowedMarcas muda de [] para ['CGS','QI']
    const loadKey = [
      allowedMarcas.length  > 0 ? [...allowedMarcas].sort().join(',')  : '*',
      allowedFiliais.length > 0 ? [...allowedFiliais].sort().join(',') : '*',
      allowedTag01.length   > 0 ? [...allowedTag01].sort().join(',')   : '*',
    ].join('|');

    if (loadKey === dashboardLoadedRef.current) return;
    dashboardLoadedRef.current = loadKey;

    const year = 2026;
    setIsLoadingDashboard(true);
    getSomaTags(
      `${year}-01`, `${year}-12`,
      allowedMarcas.length  > 0 ? allowedMarcas  : undefined,
      allowedFiliais.length > 0 ? allowedFiliais : undefined,
      undefined,
      allowedTag01.length   > 0 ? allowedTag01   : undefined,
    )
      .then((rows) => {
        setDashboardSomaRows(rows);
        console.log(`⚡ [Dashboard getSomaTags] ${rows.length} linhas | key=${loadKey}`);
      })
      .catch((err) => {
        console.warn('⚠️ [Dashboard getSomaTags] Falhou:', err);
      })
      .finally(() => setIsLoadingDashboard(false));
  }, [currentView, permissionsLoading, allowedMarcas, allowedFiliais, allowedTag01]);

  // ⚡ LAZY LOAD: Carregar transações apenas quando o usuário navegar para views que precisam
  // Views que precisam de transações: movements, kpis, forecasting, analysis
  // Dashboard usa getSomaTags RPC (já carrega separadamente acima)
  const viewsNeedingTransactions = ['dashboard'];
  const transactionsLoadedRef = React.useRef(false);

  const loadTransactionsIfNeeded = React.useCallback(() => {
    if (transactionsLoadedRef.current || permissionsLoading) return;
    transactionsLoadedRef.current = true;

    console.log('🔍 Carregando transações sob demanda com permissões:', {
      hasPermissions,
      allowedMarcas,
      allowedFiliais,
      allowedCategories
    });

    const year = 2026;
    const filters: any = {
      monthFrom: `${year}-01`,
      monthTo: `${year}-12`
    };

    if (allowedMarcas.length > 0) filters.marca = allowedMarcas;
    if (allowedFiliais.length > 0) filters.nome_filial = allowedFiliais;
    if (allowedCategories.length > 0) filters.category = allowedCategories;
    if (allowedTag01.length > 0) filters.tag01 = allowedTag01;
    if (allowedTag02.length > 0) filters.tag02 = allowedTag02;
    if (allowedTag03.length > 0) filters.tag03 = allowedTag03;

    console.log('📤 Buscando transações com filtros:', filters);
    applyFilters(filters);
  }, [permissionsLoading, hasPermissions, allowedMarcas, allowedFiliais, allowedCategories, allowedTag01, allowedTag02, allowedTag03, applyFilters]);

  // Dispara o carregamento quando o usuário navega para uma view que precisa de transações
  useEffect(() => {
    if (viewsNeedingTransactions.includes(currentView)) {
      loadTransactionsIfNeeded();
    }
  }, [currentView, loadTransactionsIfNeeded]);

  // ⚡ LAZY LOAD: Carregar manual changes apenas quando navegar para Aprovações
  // No boot, busca apenas a CONTAGEM de pendentes (query leve, <100ms)
  const [pendingCountFast, setPendingCountFast] = React.useState(0);
  const manualChangesLoadedRef = React.useRef(false);

  // Boot: buscar apenas contagem de pendentes para o badge do Sidebar
  // Approver/Admin vê TODAS as pendentes; demais veem apenas as próprias solicitações
  useEffect(() => {
    if (!user?.email) return;
    supabaseService.getPendingChangesCount?.(user.email, isApprover)
      .then(count => setPendingCountFast(count))
      .catch(() => {}); // silencioso — badge mostra 0 se falhar
  }, [user?.email, isApprover]);

  // Badge de solicitações pendentes + respondidas (inquiries)
  const [pendingInquiriesCount, setPendingInquiriesCount] = React.useState(0);
  const [answeredInquiriesCount, setAnsweredInquiriesCount] = React.useState(0);
  const refreshInquiryCounts = React.useCallback(() => {
    if (!user?.email) return;
    getPendingInquiryCount(user.email).then(setPendingInquiriesCount).catch(() => {});
    getAnsweredInquiryCount(user.email).then(setAnsweredInquiriesCount).catch(() => {});
  }, [user?.email]);
  useEffect(() => {
    refreshInquiryCounts();
    if (!user?.email) return;
    const unsub = subscribeInquiries(user.email, refreshInquiryCounts);
    return unsub;
  }, [user?.email, refreshInquiryCounts]);

  // Callback reutilizável: busca manual changes e atualiza estado
  const loadManualChanges = React.useCallback(async () => {
    try {
      const loadedChanges = await supabaseService.getAllManualChanges();
      setManualChanges(loadedChanges);
      setPendingCountFast(loadedChanges.filter(c => c.status === 'Pendente').length);
    } catch (error) {
      console.error('❌ Erro ao carregar manual changes:', error);
    }
  }, []);

  // Carregar dados completos quando navegar para Aprovações (lazy, apenas uma vez)
  useEffect(() => {
    if (currentView !== 'manual_changes' || manualChangesLoadedRef.current) return;
    manualChangesLoadedRef.current = true;
    loadManualChanges();
  }, [currentView, loadManualChanges]);

  // Salvar filtros no sessionStorage quando mudarem
  useEffect(() => {
    if (drillDownFilters) {
      sessionStorage.setItem('drillDownFilters', JSON.stringify(drillDownFilters));
    } else {
      sessionStorage.removeItem('drillDownFilters');
    }
  }, [drillDownFilters]);

  useEffect(() => {
    if (drillDownActiveTab) {
      sessionStorage.setItem('drillDownActiveTab', JSON.stringify(drillDownActiveTab));
    } else {
      sessionStorage.removeItem('drillDownActiveTab');
    }
  }, [drillDownActiveTab]);

  // Manter DRE e SomaTags montadas após primeira visita (preservar estado ao trocar guias)
  useEffect(() => {
    if (currentView === 'dre') setHasMountedDRE(true);
    if (currentView === 'soma_tags') setHasMountedSomaTags(true);
  }, [currentView]);

  // Contador de pendências para o Sidebar
  // Approver/Admin: conta TODAS as pendentes (precisa aprovar)
  // Demais: conta apenas as PRÓPRIAS solicitações (requested_by = user.email)
  const pendingApprovalsCount = useMemo(() => {
    if (manualChanges.length > 0) {
      const pending = manualChanges.filter(c => c.status === 'Pendente');
      if (isApprover) return pending.length;
      return pending.filter(c => c.requestedBy === user?.email).length;
    }
    return pendingCountFast;
  }, [manualChanges, pendingCountFast, isApprover, user?.email]);

  // Marcas únicas presentes nos dados
  // ✅ Filtrar apenas marcas permitidas (RLS)
  const uniqueBrands = useMemo(() => {
    const marcas = new Set(transactions.map(t => t.marca).filter(Boolean));
    let brandsArray = Array.from(marcas).sort();

    // Se usuário tem permissões restritas, filtrar apenas marcas permitidas
    if (allowedMarcas.length > 0) {
      brandsArray = brandsArray.filter(marca => allowedMarcas.includes(marca));
      console.log('🔒 uniqueBrands filtrado por permissão:', brandsArray);
    }

    return brandsArray;
  }, [transactions, allowedMarcas]);

  // ✅ Filtrar apenas filiais permitidas (RLS)
  const availableBranches = useMemo(() => {
    let filtered = transactions;
    if (selectedMarca.length > 0) {
      filtered = transactions.filter(t => selectedMarca.includes(t.marca || ''));
    }
    const filiais = new Set(filtered.map(t => t.nome_filial || t.filial).filter(Boolean));
    let branchesArray = Array.from(filiais).sort();

    // Se usuário tem permissões restritas, filtrar apenas filiais permitidas
    if (allowedFiliais.length > 0) {
      branchesArray = branchesArray.filter(filial => allowedFiliais.includes(filial));
      console.log('🔒 availableBranches filtrado por permissão:', branchesArray);
    }

    return branchesArray;
  }, [transactions, selectedMarca, allowedFiliais]);

  useEffect(() => {
    setDrillDownFilters((prev: any) => ({
      ...prev,
      marca: selectedMarca,
      filial: selectedFilial
    }));
  }, [selectedMarca, selectedFilial]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setPreFullscreenSidebarState(isSidebarVisible);
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(preFullscreenSidebarState);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isSidebarVisible, preFullscreenSidebarState]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleDrillDown = (drillDownData: {
    categories: string[];
    monthIdx?: number;
    scenario?: string;
    filters?: Record<string, any>;
  }) => {
    const { categories, monthIdx, scenario, filters = {} } = drillDownData;

    // Formatar mês usando ano dinâmico (não fixo 2024)
    const year = new Date().getFullYear();
    const singleMonth = (filters.month as string) || (monthIdx !== undefined ? `${year}-${String(monthIdx + 1).padStart(2, '0')}` : '');
    const monthFilterFrom = singleMonth || (filters.monthFrom as string) || '';
    const monthFilterTo   = singleMonth || (filters.monthTo   as string) || '';

    // A-1: dre_agg armazena datas +1 ano para alinhar com o período atual.
    // transactions_ano_anterior guarda as datas originais (2025), então subtraímos 1 ano.
    const shiftYear = (yyyyMM: string, delta: number) => {
      if (!yyyyMM) return yyyyMM;
      const [y, m] = yyyyMM.split('-');
      return `${parseInt(y) + delta}-${m}`;
    };
    const yearOffset = scenario === 'A-1' ? -1 : 0;

    // Construir filtros para TransactionsView
    const drillFilters: any = {
      // conta_contabil: array de contas da linha clicada na DRE
      conta_contabil: categories || [],

      // Data: mês único (clique em célula mensal) ou período do SomaTags
      monthFrom: shiftYear(monthFilterFrom, yearOffset),
      monthTo:   shiftYear(monthFilterTo,   yearOffset),

      // NÃO passa scenario aqui, pois a aba ativa vai cuidar disso

      // Filtros acumulados das dimensões dinâmicas da DRE
      tag0: Array.isArray(filters.tag0) ? filters.tag0 : (filters.tag0 ? [filters.tag0] : []),
      tag01: Array.isArray(filters.tag01) ? filters.tag01 : (filters.tag01 ? [filters.tag01] : []),
      tag02: Array.isArray(filters.tag02) ? filters.tag02 : (filters.tag02 ? [filters.tag02] : []),
      tag03: Array.isArray(filters.tag03) ? filters.tag03 : (filters.tag03 ? [filters.tag03] : []),
      marca: Array.isArray(filters.marca) ? filters.marca : (filters.marca ? [filters.marca] : []),
      nome_filial: Array.isArray(filters.nome_filial) ? filters.nome_filial : (filters.nome_filial ? [filters.nome_filial] : []),
      ticket: filters.ticket || '',
      vendor: filters.vendor || ''
    };

    // Definir aba ativa baseada no cenário
    let activeTab: 'real' | 'orcamento' | 'comparativo' = 'real';
    if (scenario === 'Real') {
      activeTab = 'real';
    } else if (scenario === 'Orçado') {
      activeTab = 'orcamento';
    } else if (scenario === 'A-1') {
      activeTab = 'comparativo';
    }

    console.log('🔵 Drill-down aplicado:', {
      categories,
      monthIdx,
      monthFilterFrom,
      monthFilterTo,
      scenario,
      activeTab,
      filters,
      drillFilters
    });

    setDrillDownFilters(drillFilters);
    setDrillDownActiveTab(activeTab);
    setDrillDownOriginView(currentView);
    setCurrentView('movements');
  };

  const mapCategoryToType = (category: string): TransactionType => {
    if (CATEGORIES.FIXED_COST.includes(category)) return 'FIXED_COST';
    if (CATEGORIES.VARIABLE_COST.includes(category)) return 'VARIABLE_COST';
    if (CATEGORIES.SGA.includes(category)) return 'SGA';
    if (CATEGORIES.RATEIO.includes(category)) return 'RATEIO';
    return 'REVENUE';
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id' | 'status'>) => {
    const t: Transaction = { ...newT, id: `m-${Date.now()}`, status: 'Normal' };

    // Salvar no Supabase
    const success = await supabaseService.addTransaction(t);

    if (success) {
      await refreshData();
    } else {
      console.error('Erro ao adicionar transação no Supabase');
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  const handleImportData = async (importedTransactions: Transaction[]) => {
    // Filtrar transações que já existem
    const existingIds = new Set(transactions.map(t => t.id));
    const filteredNew = importedTransactions.filter(t => !existingIds.has(t.id));

    if (filteredNew.length > 0) {
      // Salvar em lote no Supabase
      const success = await supabaseService.bulkAddTransactions(filteredNew);

      if (success) {
        await refreshData();
      } else {
        console.error('Erro ao importar dados no Supabase');
        alert('Erro ao importar dados. Tente novamente.');
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const success = await supabaseService.deleteTransaction(id);

    if (success) {
      await refreshData();
    } else {
      console.error('Erro ao deletar transação no Supabase');
      alert('Erro ao deletar transação. Tente novamente.');
    }
  };

  const handleRequestChange = async (change: Omit<ManualChange, 'id' | 'status' | 'requestedAt' | 'requestedBy' | 'originalTransaction'>) => {
    console.log('🔵 handleRequestChange INICIADO');
    console.log('🔵 Dados recebidos:', {
      transactionId: change.transactionId,
      type: change.type,
      description: change.description,
      justification: change.justification,
      hasNewValue: !!change.newValue,
      newValueKeys: change.newValue ? Object.keys(JSON.parse(change.newValue)) : []
    });

    const original = transactions.find(t => t.id === change.transactionId)
      || searchedTransactions.find(t => t.id === change.transactionId);
    if (!original) {
      console.error('❌ Transação original NÃO ENCONTRADA:', change.transactionId);
      console.error('❌ Total de transações (context):', transactions.length);
      console.error('❌ Total de transações (searched):', searchedTransactions.length);
      return;
    }

    console.log('✅ Transação original encontrada:', {
      id: original.id,
      description: original.description,
      amount: original.amount,
      status: original.status
    });

    const newChange: ManualChange = {
      ...change,
      id: crypto.randomUUID(),
      originalTransaction: { ...original },
      status: 'Pendente',
      requestedAt: new Date().toISOString(),
      requestedBy: user?.email || "unknown@raizeducacao.com.br",
      requestedByName: user?.name || "Usuário Desconhecido"
    };

    console.log('📦 ManualChange criado:', {
      id: newChange.id,
      type: newChange.type,
      justification: newChange.justification,
      status: newChange.status,
      requestedAt: newChange.requestedAt,
      requestedBy: newChange.requestedBy,
      requestedByName: newChange.requestedByName,
      hasOriginalTransaction: !!newChange.originalTransaction,
      hasNewValue: !!newChange.newValue
    });

    // Se já estava Pendente, cancelar manual_changes anteriores
    if (original.status === 'Pendente') {
      const oldPending = manualChanges.filter(c => c.transactionId === change.transactionId && c.status === 'Pendente');
      if (oldPending.length > 0) {
        console.log('🔄 Cancelando', oldPending.length, 'manual_changes pendentes anteriores...');
        await Promise.all(oldPending.map(c =>
          supabaseService.updateManualChange(c.id, { status: 'Reprovado' as any })
        ));
      }
    }

    // Salvar no Supabase
    console.log('🔄 Chamando addManualChange...');
    const successChange = await supabaseService.addManualChange(newChange);
    console.log('🔄 addManualChange retornou:', successChange);

    console.log('🔄 Chamando updateTransaction...');
    const successUpdate = original.status === 'Pendente'
      ? true  // já está Pendente, não precisa atualizar status
      : await supabaseService.updateTransaction(change.transactionId, { status: 'Pendente' }, original.scenario || JSON.parse(change.newValue)?._scenario);
    console.log('🔄 updateTransaction retornou:', successUpdate);

    console.log('🔍 Verificando sucesso:', {
      successChange,
      successUpdate,
      ambosTrue: successChange && successUpdate,
      typeofSuccessChange: typeof successChange,
      typeofSuccessUpdate: typeof successUpdate
    });

    if (successChange && successUpdate) {
      console.log('✅ AMBOS SUCESSO - Atualizando estados locais');
      console.log('✅ manualChanges antes:', manualChanges.length);

      setManualChanges(prev => {
        const updated = [newChange, ...prev];
        console.log('✅ manualChanges depois:', updated.length);
        return updated;
      });

      // Atualizar status localmente nos searchedTransactions (sem re-fetch)
      setSearchedTransactions(prev =>
        prev.map(t => t.id === change.transactionId ? { ...t, status: 'Pendente' } : t)
      );

      console.log('✅ Estados locais atualizados com SUCESSO!');
    } else {
      console.error('❌ FALHA ao salvar:', {
        successChange,
        successUpdate,
        motivoFalha: !successChange ? 'addManualChange falhou' : 'updateTransaction falhou'
      });
      alert('Erro ao solicitar mudança. Tente novamente. Veja o console para detalhes.');
    }
  };

  // Helper interno: aplica UMA aprovação no banco (chamadas Supabase paralelas)
  // Não chama refreshData() — quem chama decide quando fazer o refresh
  const _applyChange = React.useCallback(async (changeId: string): Promise<void> => {
    const change = manualChanges.find(c => c.id === changeId);
    if (!change) return;

    const parsedValue = JSON.parse(change.newValue);
    // scenario: prioridade 1) originalTransaction, 2) _scenario salvo no newValue, 3) undefined (= transactions)
    const scenario = change.originalTransaction?.scenario || parsedValue._scenario || undefined;
    console.log('📋 _applyChange scenario:', scenario, '| source:', change.originalTransaction?.scenario ? 'originalTransaction' : parsedValue._scenario ? '_scenario' : 'default');
    const approvalMeta = {
      status: 'Aplicado' as const,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.email || 'unknown@raizeducacao.com.br',
      approvedByName: user?.name || 'Usuário Desconhecido',
    };

    // Campos aplicados na transação (para atualizar estado local com TODOS os campos, não só status)
    let appliedUpdates: Record<string, any> = {};

    if (change.type === 'RATEIO') {
      const rawParts = (parsedValue.transactions || (Array.isArray(parsedValue) ? parsedValue : [])) as Transaction[];
      const newParts = rawParts.map(({ updated_at, id, chave_id, ...rest }: any, idx: number) => ({
        ...rest,
        id: crypto.randomUUID(),
        // chave_id único por parte: evita conflito com o original (ainda existente) e entre partes
        chave_id: chave_id ? `${chave_id}-R${idx + 1}` : null,
        description: `${rest.description} [R${idx + 1}/${rawParts.length}]`,
      }));
      // inserir novas ANTES de deletar (integridade)
      await supabaseService.bulkAddTransactions(newParts as any);
      // deletar original e registrar aprovação em paralelo
      await Promise.all([
        supabaseService.deleteTransaction(change.transactionId, scenario),
        supabaseService.updateManualChange(changeId, approvalMeta),
      ]);
    } else if (change.type === 'EXCLUSAO') {
      await Promise.all([
        supabaseService.deleteTransaction(change.transactionId, scenario),
        supabaseService.updateManualChange(changeId, approvalMeta),
      ]);
    } else {
      // MULTI, CONTA, DATA, MARCA, FILIAL
      const { justification: _j, categoryLabel, filial: filialValue, filial_code: filialCode, category, amount: _amt, _scenario: _sc, ...restData } = parsedValue;
      const updatedData: Record<string, any> = {
        status: 'Ajustado',
      };
      // Só incluir campos que realmente mudaram ou têm valor
      if (filialValue) updatedData.nome_filial = filialValue;
      if (filialCode) updatedData.filial = filialCode;
      if (category) {
        updatedData.conta_contabil = category;
        updatedData.type = mapCategoryToType(category);
      }
      if (restData.date) updatedData.date = restData.date;
      if (restData.marca) updatedData.marca = restData.marca;
      // recurring: aceitar qualquer valor, inclusive 'Não' (truthy check já funciona, mas ser explícito)
      if (restData.recurring !== undefined && restData.recurring !== null) updatedData.recurring = restData.recurring;
      if (restData.tag01) updatedData.tag01 = restData.tag01;
      if (restData.tag02) updatedData.tag02 = restData.tag02;
      if (restData.tag03) updatedData.tag03 = restData.tag03;
      if (restData.nat_orc) updatedData.nat_orc = restData.nat_orc;

      console.log('📋 _applyChange updatedData:', updatedData);

      // atualizar transação e registrar aprovação em paralelo
      const [updateSuccess] = await Promise.all([
        supabaseService.updateTransaction(change.transactionId, updatedData, scenario),
        supabaseService.updateManualChange(changeId, approvalMeta),
      ]);
      console.log('📋 _applyChange updateSuccess:', updateSuccess);
      if (!updateSuccess) throw new Error('Falha ao atualizar transação no Supabase');

      appliedUpdates = updatedData;
    }

    // Atualizar estado local imediatamente (UI reage sem esperar refreshData)
    setManualChanges(prev => prev.map(c =>
      c.id === changeId ? { ...c, ...approvalMeta } : c
    ));

    // Atualizar searchedTransactions com TODOS os campos aplicados (não só status)
    setSearchedTransactions(prev =>
      change.type === 'EXCLUSAO' || change.type === 'RATEIO'
        ? prev.filter(t => t.id !== change.transactionId)
        : prev.map(t => t.id === change.transactionId ? { ...t, ...appliedUpdates } : t)
    );
  }, [manualChanges, user]);

  const handleApproveChange = async (changeId: string) => {
    if (!isApprover) {
      alert('⚠️ Acesso negado!\n\nApenas administradores e aprovadores podem aprovar alterações.');
      return;
    }
    try {
      await _applyChange(changeId);
      // Delay antes do refresh para garantir que Supabase persistiu
      setTimeout(() => refreshData(), 1000);
    } catch (error) {
      console.error('❌ Erro ao aprovar mudança:', error);
      alert('Erro ao aplicar mudança. Tente novamente.');
    }
  };

  const handleBulkApproveChanges = async (ids: string[]) => {
    if (!isApprover) {
      alert('⚠️ Acesso negado!\n\nApenas administradores e aprovadores podem aprovar alterações.');
      return;
    }
    try {
      // Processar todas em paralelo, 1 refreshData no final
      await Promise.all(ids.map(id => _applyChange(id)));
      refreshData(); // fire-and-forget
    } catch (error) {
      console.error('❌ Erro na aprovação em massa:', error);
      alert('Erro ao processar aprovações em massa. Verifique o console.');
    }
  };

  const handleRevertPending = async (transactionId: string) => {
    try {
      // 1. Reverter status da transaction para Normal
      await supabaseService.updateTransaction(transactionId, { status: 'Normal' });

      // 2. Cancelar manual_changes pendentes desta transaction
      const pendingChanges = manualChanges.filter(c => c.transactionId === transactionId && c.status === 'Pendente');
      await Promise.all(pendingChanges.map(c =>
        supabaseService.updateManualChange(c.id, {
          status: 'Reprovado' as any,
          approvedAt: new Date().toISOString(),
          approvedBy: user?.email || 'unknown@raizeducacao.com.br',
          approvedByName: user?.name || 'Usuário Desconhecido',
        })
      ));

      // 3. Atualizar estado local
      setSearchedTransactions(prev =>
        prev.map(t => t.id === transactionId ? { ...t, status: 'Normal' } : t)
      );
      setManualChanges(prev =>
        prev.map(c => c.transactionId === transactionId && c.status === 'Pendente'
          ? { ...c, status: 'Reprovado' as any }
          : c
        )
      );
    } catch (error) {
      console.error('Erro ao reverter pendente:', error);
      alert('Erro ao reverter. Tente novamente.');
    }
  };

  const handleRejectChange = async (changeId: string) => {
    if (!isApprover) {
      alert('⚠️ Acesso negado!\n\nApenas administradores e aprovadores podem reprovar alterações.');
      return;
    }
    const change = manualChanges.find(c => c.id === changeId);
    if (!change) return;

    const rejectionMeta = {
      status: 'Reprovado' as const,
      approvedAt: new Date().toISOString(),
      approvedBy: user?.email || 'unknown@raizeducacao.com.br',
      approvedByName: user?.name || 'Usuário Desconhecido',
    };

    // Atualizar transação e registrar reprovação em paralelo
    await Promise.all([
      supabaseService.updateTransaction(change.transactionId, { status: 'Normal' }),
      supabaseService.updateManualChange(changeId, rejectionMeta),
    ]);

    setManualChanges(prev => prev.map(c => c.id === changeId ? { ...c, ...rejectionMeta } : c));
    refreshData(); // fire-and-forget
  };

  const clearGlobalFilters = () => {
    setSelectedMarca([]);
    setSelectedFilial([]);
    setDrillDownFilters(null);
    setDrillDownActiveTab(undefined);
  };

  const handleBackToDRE = () => {
    setDrillDownFilters(null);
    sessionStorage.removeItem('transactionsColFilters');
    sessionStorage.removeItem('transactionsActiveTab');
    setDrillDownActiveTab(undefined);
    setCurrentView(drillDownOriginView);
  };

  const filteredTransactions = useMemo(() => {
    const permissionFiltered = filterTransactions(transactions);

    // Depois, aplicar filtros de marca/filial selecionados
    if (currentView === 'movements' || currentView === 'dre') return permissionFiltered;
    return permissionFiltered.filter(t => {
      const matchesMarca = selectedMarca.length === 0 || selectedMarca.includes(t.marca || '');
      const matchesFilial = selectedFilial.length === 0 || selectedFilial.includes(t.nome_filial || t.filial || '');
      return matchesMarca && matchesFilial;
    });
  }, [transactions, selectedMarca, selectedFilial, currentView, filterTransactions]);

  // Transações sintéticas para os gráficos do Dashboard (convertidas de SomaTagsRow)
  const dashboardTransactions = useMemo((): Transaction[] =>
    dashboardSomaRows.map((row, idx) => ({
      id: `dash-${idx}`,
      date: `${row.month}-01`,
      amount: Number(row.total),
      type: (row.tag0.startsWith('01.') ? 'REVENUE' :
             row.tag0.startsWith('02.') ? 'VARIABLE_COST' :
             row.tag0.startsWith('03.') ? 'FIXED_COST' : 'SGA') as Transaction['type'],
      scenario: row.scenario,
      tag0: row.tag0,
      tag01: row.tag01,
      description: '',
      conta_contabil: '',
      status: 'Normal',
      updated_at: new Date().toISOString(),
    } as Transaction))
  , [dashboardSomaRows]);

  // KPIs calculados direto das SomaTagsRows (Real) — consistente com o DRE Gerencial
  const kpis: SchoolKPIs = useMemo(() => {
    const real = dashboardSomaRows.filter(r => r.scenario === 'Real');
    const sum  = (prefix: string) => real.filter(r => r.tag0.startsWith(prefix)).reduce((s, r) => s + Number(r.total), 0);

    const rev    = sum('01.');
    const cv     = sum('02.');  // negativo no banco
    const cf     = sum('03.');  // negativo no banco
    const rateio = sum('06.');  // negativo no banco
    const ebitda = rev + cv + cf + rateio;

    const baseStudents    = selectedMarca.length  === 0 ? 5400 : selectedMarca.length  * 850;
    const numberOfStudents = selectedFilial.length === 0 ? baseStudents : selectedFilial.length * 120;
    const targetEbitda    = rev * 0.25;
    const diff            = targetEbitda - ebitda;

    return {
      totalRevenue:      rev,
      totalFixedCosts:   cf,
      totalVariableCosts: cv,
      sgaCosts:          0,
      ebitda,
      netMargin:         rev > 0 ? (ebitda / rev) * 100 : 0,
      costPerStudent:    numberOfStudents > 0 ? Math.abs(cv + cf) / numberOfStudents : 0,
      revenuePerStudent: numberOfStudents > 0 ? rev / numberOfStudents : 0,
      activeStudents:    numberOfStudents,
      breakEvenPoint:    0,
      defaultRate:       8.5,
      targetEbitda,
      costReductionNeeded: diff > 0 ? diff : 0,
      marginOfSafety:    diff < 0 ? Math.abs(diff) : 0,
      churnRate:         0,
      waterPerStudent:   0,
      energyPerClassroom: 0,
      consumptionMaterialPerStudent: 0,
      eventsPerStudent:  0,
    };
  }, [dashboardSomaRows, selectedMarca, selectedFilial]);

  const showGlobalFilters = currentView !== 'dre' && currentView !== 'movements' && currentView !== 'dashboard';

  // Cronograma popup — mostra após login se não dispensado hoje
  useEffect(() => {
    if (!user || user.role === 'pending' || authLoading) return;
    const now = new Date();
    const todayKey = `cronograma_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (localStorage.getItem(todayKey)) return;
    setShowCronograma(true);
    // Limpar chaves antigas (>7 dias)
    try {
      const prefix = 'cronograma_dismissed_';
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const dateStr = key.replace(prefix, '');
          const d = new Date(dateStr);
          if (now.getTime() - d.getTime() > 7 * 86400000) localStorage.removeItem(key);
        }
      }
    } catch {}
  }, [user, authLoading]);

  // Tela de loading - autenticação
  if (authLoading) {
    return (
      <div className="flex h-screen bg-[#fcfcfc] items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-[#1B75BB]" size={48} />
          <h2 className="text-xl font-bold text-gray-900">Verificando autenticação...</h2>
          <p className="text-sm text-gray-500 mt-2">Aguarde</p>
        </div>
      </div>
    );
  }

  // Tela de login se não autenticado
  if (!user) {
    return <LoginScreen />;
  }

  // Tela de aguardando aprovação para usuários pendentes
  if (user.role === 'pending') {
    return <PendingApprovalScreen />;
  }

  // ⚡ OPÇÃO A: Sem bloqueio global — sidebar e header aparecem imediatamente.
  // O loading fica apenas na área de conteúdo (ver abaixo).

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          duration={4000}
        />

        {/* Cronograma Popup — aparece no login */}
        {showCronograma && (
          <Suspense fallback={null}>
            <CronogramaPopup onClose={() => setShowCronograma(false)} />
          </Suspense>
        )}

        {/* Sidebar: Desktop = fixa lateral; Mobile/Tablet = drawer overlay */}
        {isDesktop ? (
          <div className={`${isSidebarVisible ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden shrink-0`}>
            <Sidebar
              currentView={currentView}
              setCurrentView={setCurrentView}
              selectedBrand={selectedMarca}
              pendingCount={pendingApprovalsCount}
              pendingInquiriesCount={pendingInquiriesCount}
              answeredInquiriesCount={answeredInquiriesCount}
            />
          </div>
        ) : (
          <>
            {/* Backdrop */}
            {isDrawerOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
                onClick={() => setIsDrawerOpen(false)}
              />
            )}
            {/* Drawer */}
            <div className={`fixed inset-y-0 left-0 z-[70] w-64 transform transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                selectedBrand={selectedMarca}
                pendingCount={pendingApprovalsCount}
                pendingInquiriesCount={pendingInquiriesCount}
              answeredInquiriesCount={answeredInquiriesCount}
                isDrawer={true}
                onClose={() => setIsDrawerOpen(false)}
              />
            </div>
          </>
        )}

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="sticky top-0 z-40 bg-[#fcfcfc] px-3 md:px-4 lg:px-6 pt-3 md:pt-4 lg:pt-6 pb-3 md:pb-4 lg:pb-6 mb-3 md:mb-4 lg:mb-6 flex justify-between items-center border-b border-gray-200 shadow-sm gap-2 flex-wrap">
          <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
            {/* Hamburger para mobile/tablet */}
            {!isDesktop && (
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-all">
                <Menu size={20} />
              </button>
            )}
            {/* Toggle sidebar para desktop */}
            {isDesktop && (
              <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-all">
                <PanelLeftOpen size={20} />
              </button>
            )}
            <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 flex items-center gap-2 text-xs font-bold transition-all" title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* Indicador de Permissões Restritas */}
            {hasPermissions && (
              <div className={`flex items-center gap-2 lg:gap-3 bg-yellow-50 border-2 border-yellow-200 px-2 lg:px-4 py-1.5 lg:py-2 rounded-xl ${isMobile ? 'hidden' : ''}`}>
                <Lock size={16} className="text-yellow-600 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-yellow-900 uppercase tracking-wider">Acesso Restrito</span>
                  <div className="flex gap-2 text-[10px] font-bold text-yellow-700 flex-wrap">
                    {allowedMarcas.length > 0 && <span>Marcas: {allowedMarcas.join(', ')}</span>}
                    {allowedFiliais.length > 0 && <span>Filiais: {allowedFiliais.join(', ')}</span>}
                    {allowedCategories.length > 0 && <span>Categorias: {allowedCategories.join(', ')}</span>}
                  </div>
                </div>
              </div>
            )}




            {/* Toggle Modo Executivo/Detalhado - DRE (estilo switch) */}
            {currentView === 'dre' && (
              <div className="relative inline-flex items-center bg-gray-200 rounded-full p-0.5 shadow-inner">
                {/* Track do switch */}
                <div
                  className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${
                    presentationMode === 'executive' ? 'left-0.5' : 'left-[calc(50%+0.5px)]'
                  }`}
                />

                {/* Botão Executivo */}
                <button
                  onClick={() => setPresentationMode('executive')}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all ${
                    presentationMode === 'executive'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Activity size={12} />
                  <span>Executivo</span>
                </button>

                {/* Botão Detalhado */}
                <button
                  onClick={() => setPresentationMode('detailed')}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all ${
                    presentationMode === 'detailed'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <TableIcon size={12} />
                  <span>Detalhado</span>
                </button>
              </div>
            )}

            {/* Botões de Ação DRE (Exportar e Atualizar) */}
            {currentView === 'dre' && (
              <>
                {/* Botão Exportar */}
                <div className="relative">
                  <button
                    onClick={() => setIsDreExportOpen(!isDreExportOpen)}
                    disabled={isDreLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-wider shadow-md"
                    title="Exportar dados da DRE"
                  >
                    <Download size={14} />
                    <span className="whitespace-nowrap">Exportar</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isDreExportOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown de exportação */}
                  {isDreExportOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 min-w-[200px] overflow-hidden">
                      <button
                        onClick={() => {
                          dreActions.exportTable?.();
                          setIsDreExportOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-xs font-semibold text-gray-700"
                      >
                        <TableIcon size={16} className="text-blue-600" />
                        <div>
                          <div className="font-bold">Exportar Tabela</div>
                          <div className="text-[10px] text-gray-500 font-normal">CSV agregado</div>
                        </div>
                      </button>
                      <div className="h-px bg-gray-100" />
                      <button
                        onClick={() => {
                          dreActions.exportLayout?.();
                          setIsDreExportOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-xs font-semibold text-gray-700"
                      >
                        <Download size={16} className="text-green-600" />
                        <div>
                          <div className="font-bold">Exportar Layout</div>
                          <div className="text-[10px] text-gray-500 font-normal">Visual atual</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Botão Atualizar */}
                <button
                  onClick={() => dreActions.refresh?.()}
                  disabled={isDreLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-wider shadow-md"
                  title="Atualizar dados da DRE"
                >
                  {isDreLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="whitespace-nowrap">Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span className="whitespace-nowrap">Atualizar</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Botões de Ação DRE Gerencial */}
            {currentView === 'soma_tags' && (
              <>
                {/* Toggle Executivo / Detalhado */}
                <div className="relative inline-flex items-center bg-gray-200 rounded-full p-0.5 shadow-inner shrink-0">
                  <div className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${somaTagsPresentationMode === 'executive' ? 'left-0.5' : 'left-[calc(50%+0.5px)]'}`} />
                  <button onClick={() => setSomaTagsPresentationMode('executive')}
                    className={`relative z-10 flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider transition-all ${somaTagsPresentationMode === 'executive' ? 'text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                    <Activity size={10} /><span>Executivo</span>
                  </button>
                  <button onClick={() => setSomaTagsPresentationMode('detailed')}
                    className={`relative z-10 flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider transition-all ${somaTagsPresentationMode === 'detailed' ? 'text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                    <Table2 size={10} /><span>Detalhado</span>
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsSomaTagsExportOpen(!isSomaTagsExportOpen)}
                    disabled={!hasSomaTagsData || isSomaTagsLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-wider shadow-md"
                    title="Exportar dados do DRE Gerencial"
                  >
                    <Download size={14} />
                    <span className="whitespace-nowrap">Exportar</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isSomaTagsExportOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSomaTagsExportOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 min-w-[220px] overflow-hidden">
                      <button
                        onClick={() => {
                          somaTagsActions.exportExcel?.();
                          setIsSomaTagsExportOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-xs font-semibold text-gray-700"
                      >
                        <FileSpreadsheet size={16} className="text-green-600" />
                        <div>
                          <div className="font-bold">Exportar Excel</div>
                          <div className="text-[10px] text-gray-500 font-normal">Tabela DRE em .xlsx</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => somaTagsActions.refresh?.()}
                  disabled={isSomaTagsLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-[10px] uppercase tracking-wider shadow-md"
                  title="Atualizar dados do DRE Gerencial"
                >
                  {isSomaTagsLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="whitespace-nowrap">Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span className="whitespace-nowrap">Atualizar</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {showGlobalFilters && (
            <div className="flex items-center gap-4">
              {/* Nota: Filtros globais não são usados no dashboard, apenas nas outras views */}
            </div>
          )}
        </div>

        <div className="px-3 md:px-4 lg:px-6 pb-3 md:pb-4 lg:pb-6 relative">
          {/* ⚡ Loading overlay — só durante auth/permissões (poucos segundos) */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl min-h-[200px]">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-3 text-[#1B75BB]" size={40} />
                <p className="text-sm font-semibold text-gray-700">Carregando permissões...</p>
              </div>
            </div>
          )}
          {/* Loading específico para views que carregam transações sob demanda */}
          {!isLoading && isLoadingTransactions && viewsNeedingTransactions.includes(currentView) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl min-h-[200px]">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-3 text-[#1B75BB]" size={40} />
                <p className="text-sm font-semibold text-gray-700">Carregando transações...</p>
                <p className="text-xs text-gray-400 mt-1">Buscando dados do banco</p>
              </div>
            </div>
          )}
          {currentView === 'dashboard' && (
            <CockpitDashboard
              kpis={kpis}
              somaRows={dashboardSomaRows}
              transactions={filteredTransactions}
              selectedMarca={selectedMarca}
              selectedFilial={selectedFilial}
              uniqueBrands={uniqueBrands}
              availableBranches={availableBranches}
              onMarcaChange={setSelectedMarca}
              onFilialChange={setSelectedFilial}
              allowedMarcas={allowedMarcas}
              allowedFiliais={allowedFiliais}
              allowedCategories={allowedCategories}
              isLoading={isLoadingDashboard}
            />
          )}
          {currentView === 'movements' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Lançamentos">
              <Suspense fallback={<LoadingSpinner message="Carregando lançamentos..." />}>
                <TransactionsView
                  transactions={filteredTransactions}
                  searchedTransactions={searchedTransactions}
                  setSearchedTransactions={setSearchedTransactions}
                  hasSearchedTransactions={hasSearchedTransactions}
                  setHasSearchedTransactions={setHasSearchedTransactions}
                  addTransaction={handleAddTransaction}
                  requestChange={handleRequestChange}
                  deleteTransaction={handleDeleteTransaction}
                  fetchFromCSV={handleImportData}
                  isSyncing={isSyncing}
                  externalFilters={drillDownFilters}
                  externalActiveTab={drillDownActiveTab}
                  clearGlobalFilters={clearGlobalFilters}
                  onBackToDRE={handleBackToDRE}
                  backToLabel={drillDownOriginView === 'soma_tags' ? 'Voltar para DRE Gerencial' : 'Voltar para DRE'}
                  allowedMarcas={allowedMarcas}
                  allowedFiliais={allowedFiliais}
                  allowedCategories={allowedCategories}
                  allowedTag01={allowedTag01}
                  allowedTag02={allowedTag02}
                  allowedTag03={allowedTag03}
                  userRole={user?.role}
                  revertPending={handleRevertPending}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          {currentView === 'manual_changes' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Aprovações">
              <Suspense fallback={<LoadingSpinner message="Carregando alterações..." />}>
                <ManualChangesView changes={manualChanges} approveChange={handleApproveChange} rejectChange={handleRejectChange} bulkApproveChanges={handleBulkApproveChanges} onRefresh={loadManualChanges} />
              </Suspense>
            </ErrorBoundary>
          )}
          {/* DREView removida — substituída por SomaTagsView (DRE Gerencial) */}
          {currentView === 'forecasting' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Previsões">
              <Suspense fallback={<LoadingSpinner message="Carregando previsões..." />}>
                <ForecastingView />
              </Suspense>
            </ErrorBoundary>
          )}
          {currentView === 'analysis' && !(hasPermissions && allowedFiliais.length > 0) && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Análises">
              <Suspense fallback={<LoadingSpinner message="Carregando análises..." />}>
                <AnalysisView />
              </Suspense>
            </ErrorBoundary>
          )}
          {hasMountedSomaTags && (
            <div style={{ display: currentView === 'soma_tags' ? undefined : 'none' }}>
              <ErrorBoundary fallbackMessage="Erro ao carregar DRE Gerencial">
                <Suspense fallback={<LoadingSpinner message="Carregando DRE Gerencial..." />}>
                  <SomaTagsView
                    onRegisterActions={setSomaTagsActions}
                    onLoadingChange={setIsSomaTagsLoading}
                    onDataChange={setHasSomaTagsData}
                    onDrillDown={handleDrillDown}
                    allowedTag01={allowedTag01.length > 0 ? allowedTag01 : undefined}
                    allowedMarcas={allowedMarcas.length > 0 ? allowedMarcas : undefined}
                    allowedFiliais={allowedFiliais.length > 0 ? allowedFiliais : undefined}
                    presentationMode={somaTagsPresentationMode}
                    onPresentationModeChange={setSomaTagsPresentationMode}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
          {currentView === 'admin' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Admin">
              <Suspense fallback={<LoadingSpinner message="Carregando painel admin..." />}>
                <AdminPanel />
              </Suspense>
            </ErrorBoundary>
          )}
          {currentView === 'executive_dashboard' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar CEO Dashboard">
              <Suspense fallback={<LoadingSpinner message="Carregando dashboard executivo..." />}>
                <ExecutiveDashboard />
              </Suspense>
            </ErrorBoundary>
          )}
          {currentView === 'inbox' && (
            <ErrorBoundary fallbackMessage="Erro ao carregar Solicitações">
              <Suspense fallback={<LoadingSpinner message="Carregando solicitações..." />}>
                <InquiryInboxView />
              </Suspense>
            </ErrorBoundary>
          )}
          {/* Justificativas e Agentes Financeiros agora dentro de AnalysisView (abas) */}
        </div>
      </main>
    </div>
  );
};

export default App;
