
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRANSAÇÕES VIEW - EM MIGRAÇÃO PARA CONTEXT API
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FASE 1 (ATUAL): Estrutura base criada
 * - TransactionsContext criado (src/contexts/TransactionsContext.tsx)
 * - useTransactions hook disponível (src/hooks/useTransactions.ts)
 * - PRÓXIMO PASSO: Migrar este componente para consumir o context
 *
 * TODO - CONFIGURAÇÕES FUTURAS
 *
 * 1. ABA "ORÇAMENTO":
 *    - Atualmente desabilitada (retorna false no filtro)
 *    - Precisa configurar fonte de dados de orçamento
 *
 * 2. ABA "ANO ANTERIOR":
 *    - Atualmente desabilitada (retorna false no filtro)
 *    - Precisa configurar lógica de comparação com ano anterior
 *
 * STATUS: Por enquanto, apenas a aba REAL está funcional (50.000 registros)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Transaction, TransactionType, TransactionStatus, ManualChange, PaginationParams, ContaContabilOption } from '../types';
import { BRANCHES, ALL_CATEGORIES, CATEGORIES } from '../constants';
import { getFilteredTransactions, TransactionFilters, getFiliais, getTagRecords, FilialOption, TagRecord, getContaContabilOptions, getTag0Map, getTag0Options, getTag01Options, getTag02Options, getTag03Options, getTag02OptionsForTag01s, getTag03OptionsForTag02s, resolveTag0 } from '../services/supabaseService';
import ContaContabilSelector from './ContaContabilSelector';
import ExcelJS from 'exceljs';
import debounce from 'lodash.debounce';
import {
  Edit3, GitFork, X, Save,
  ReceiptText, FilterX,
  PlusCircle, ExternalLink,
  Trash2, Filter, Loader2,
  Split, CheckCircle2, Download, ListOrdered, Calculator, ArrowRight,
  ChevronDown, Check, Square, CheckSquare, TrendingUp, History,
  TrendingDown, ArrowUpRight, ArrowDownRight, AlertCircle, Search, ArrowLeft, TableProperties, Eye
} from 'lucide-react';

// ─── Visibilidade de colunas ──────────────────────────────────────────────────
const COL_VISIBILITY_KEY = 'transactions_col_visibility_v1';

// ─── Densidade da tabela ───────────────────────────────────────────────────────
const DENSITY_KEY = 'transactions_density_v1';
type Density = 'comfortable' | 'compact' | 'ultra';
const DENSITY_CYCLE: Density[] = ['comfortable', 'compact', 'ultra'];
const DENSITY_LABELS: Record<Density, string> = {
  comfortable: 'Confortável',
  compact:     'Compacto',
  ultra:       'Ultra',
};
interface DensCfg {
  cellPy: number; cellPx: number;
  headerPy: number;
  badgePy: number; badgePx: number;
  btnP: number;
}
const DENSITY_CFG: Record<Density, DensCfg> = {
  //                    cellPy cellPx headerPy badgePy badgePx btnP
  comfortable: { cellPy: 4,  cellPx: 8, headerPy: 10, badgePy: 2, badgePx: 6, btnP: 6 },
  compact:     { cellPy: 2,  cellPx: 8, headerPy: 6,  badgePy: 1, badgePx: 4, btnP: 4 },
  ultra:       { cellPy: 1,  cellPx: 6, headerPy: 3,  badgePy: 0, badgePx: 3, btnP: 2 },
};

const COLUMN_DEFS: Array<{
  key: string;
  label: string;
  headerLabel: string;
  className: string;
  align?: 'left' | 'right' | 'center';
}> = [
  { key: 'scenario',    label: 'Cenário',    headerLabel: 'Cen',        className: 'w-[50px]'  },
  { key: 'date',        label: 'Data',       headerLabel: 'Data',       className: 'w-[65px]'  },
  { key: 'tag0',        label: 'Tag0',       headerLabel: 'Tag0',       className: 'w-[75px]'  },
  { key: 'tag01',       label: 'Tag01',      headerLabel: 'Tag01',      className: 'w-[75px]'  },
  { key: 'tag02',       label: 'Tag02',      headerLabel: 'Tag02',      className: 'w-[85px]'  },
  { key: 'tag03',       label: 'Tag03',      headerLabel: 'Tag03',      className: 'w-[85px]'  },
  { key: 'category',   label: 'Conta',      headerLabel: 'Conta',      className: 'w-[105px]' },
  { key: 'marca',       label: 'Marca',      headerLabel: 'Mar',        className: 'w-[45px]'  },
  { key: 'filial',      label: 'Filial',     headerLabel: 'Filial',     className: 'w-[100px]' },
  { key: 'ticket',      label: 'Ticket',     headerLabel: 'Tick',       className: 'w-[60px]'  },
  { key: 'chave_id',    label: 'Chave ID',   headerLabel: 'Chave ID',   className: 'w-[80px]'  },
  { key: 'vendor',      label: 'Fornecedor', headerLabel: 'Fornecedor', className: 'w-[120px]' },
  { key: 'description', label: 'Descrição',  headerLabel: 'Descrição',  className: 'w-[180px]' },
  { key: 'amount',      label: 'Valor',      headerLabel: 'Valor',      className: 'w-[95px]',  align: 'right'  },
  { key: 'status',      label: 'Status',     headerLabel: 'Status',     className: 'w-[70px]',  align: 'center' },
  { key: 'recurring',   label: 'Recorrência',headerLabel: 'Recorr',     className: 'w-[70px]',  align: 'center' },
  { key: 'acoes',       label: 'Ações',      headerLabel: 'Ações',      className: 'w-[65px]',  align: 'center' },
];

const DEFAULT_VISIBILITY: Record<string, boolean> = Object.fromEntries(
  COLUMN_DEFS.map(c => [c.key, true])
);

interface TransactionsViewProps {
  transactions: Transaction[];
  searchedTransactions: Transaction[];
  setSearchedTransactions: (transactions: Transaction[]) => void;
  hasSearchedTransactions: boolean;
  setHasSearchedTransactions: (value: boolean) => void;
  addTransaction: (t: Omit<Transaction, 'id' | 'status'>) => void;
  requestChange: (change: Omit<ManualChange, 'id' | 'status' | 'requestedAt' | 'requestedBy' | 'originalTransaction'>) => void;
  deleteTransaction: (id: string) => void;
  fetchFromCSV?: (imported: Transaction[]) => void;
  isSyncing?: boolean;
  externalFilters?: any;
  clearGlobalFilters?: () => void;
  externalActiveTab?: 'real' | 'orcamento' | 'comparativo';
  onBackToDRE?: () => void;
  backToLabel?: string;
  // ✅ PERMISSÕES: Sempre aplicadas nas queries
  allowedMarcas?: string[];
  allowedFiliais?: string[];
  allowedCategories?: string[];
  allowedTag01?: string[];
  allowedTag02?: string[];
  allowedTag03?: string[];
  userRole?: string;
}

type SortKey = keyof Transaction;
type SortDirection = 'asc' | 'desc';

interface RateioPart {
  id: string;
  amount: number;
  percent: number;
  filial: string;      // nome_filial (display, ex: "CGS - Barra")
  filial_code: string; // código da filial (ex: "CGS")
  marca: string;
  date: string;
  category: string;
}

const formatDateToMMAAAA = (date: any) => {
  if (!date) return '-';
  let d = date;
  if (typeof d === 'number') {
    const dateObj = new Date((d - 25569) * 86400 * 1000);
    return `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
  }
  const parts = String(d).split('-');
  if (parts.length >= 2) {
    if (parts[0].length === 4) return `${parts[1]}-${parts[0]}`;
    if (parts[2]?.length === 4) return `${parts[1]}-${parts[2]}`;
  }
  return String(d);
};

const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions: propsTransactions,
  searchedTransactions,
  setSearchedTransactions,
  hasSearchedTransactions,
  setHasSearchedTransactions,
  requestChange,
  fetchFromCSV,
  isSyncing: initialSyncing,
  externalFilters,
  clearGlobalFilters,
  externalActiveTab,
  onBackToDRE,
  backToLabel = 'Voltar para DRE',
  allowedMarcas,
  allowedFiliais,
  allowedCategories,
  allowedTag01,
  allowedTag02,
  allowedTag03,
  userRole
}) => {
  // Estado de busca
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchAllModal, setShowSearchAllModal] = useState(false);
  const [searchAllProgress, setSearchAllProgress] = useState({ current: 0, total: 0, loaded: 0 });
  const cancelSearchAllRef = useRef(false); // Usar ref para cancelamento funcionar no loop
  const [autoSearchTrigger, setAutoSearchTrigger] = useState(0); // Trigger para auto-busca após drill-down

  // Opções de filtro carregadas do banco (filial + tags)
  const [filterOptions, setFilterOptions] = useState<{
    filiais: FilialOption[];
    marcas: string[];
    tagRecords: TagRecord[];
    tag0Map: Map<string, string>; // Mapeamento tag01 → tag0
    tag0Options: string[]; // Lista completa de Tag0
    tag01Options: string[]; // Lista completa de Tag01
    tag02Options: string[]; // Lista completa de Tag02
    tag03Options: string[]; // Lista completa de Tag03
  }>({ filiais: [], marcas: [], tagRecords: [], tag0Map: new Map(), tag0Options: [], tag01Options: [], tag02Options: [], tag03Options: [] });

  // Carregar opções de lookup ao montar
  useEffect(() => {
    Promise.all([
      getFiliais(),
      getTagRecords(),
      getTag0Map(),
      getTag0Options(),
      getTag01Options(),
      getTag02Options(),
      getTag03Options()
    ]).then(([filiais, tagRecords, tag0Map, tag0Options, tag01Options, tag02Options, tag03Options]) => {
      const marcas = [...new Set(filiais.map(f => f.cia))].sort();
      setFilterOptions({ filiais, marcas, tagRecords, tag0Map, tag0Options, tag01Options, tag02Options, tag03Options });
    });
  }, []);

  const [showFilters, setShowFilters] = useState(true);
  const [isSyncing, setIsSyncing] = useState(initialSyncing);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [rateioTransaction, setRateioTransaction] = useState<Transaction | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

  // ─── Visibilidade de colunas ────────────────────────────────────────────────
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(COL_VISIBILITY_KEY);
      if (stored) return { ...DEFAULT_VISIBILITY, ...JSON.parse(stored) };
    } catch {}
    return { ...DEFAULT_VISIBILITY };
  });
  const [showColPanel, setShowColPanel] = useState(false);

  useEffect(() => {
    if (!showColPanel) return;
    const close = () => setShowColPanel(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showColPanel]);

  const toggleColVisibility = useCallback((key: string) => {
    setColVisibility(prev => {
      const visibleCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && visibleCount <= 1) return prev; // não oculta a última
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(COL_VISIBILITY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const showAllCols = useCallback(() => {
    setColVisibility({ ...DEFAULT_VISIBILITY });
    try { localStorage.removeItem(COL_VISIBILITY_KEY); } catch {}
  }, []);

  const visibleColDefs = useMemo(
    () => COLUMN_DEFS.filter(c => colVisibility[c.key] !== false),
    [colVisibility]
  );

  // ─── Densidade ─────────────────────────────────────────────────────────────
  const [density, setDensity] = useState<Density>(() => {
    try { return (localStorage.getItem(DENSITY_KEY) as Density) || 'comfortable'; } catch {}
    return 'comfortable';
  });
  const cycleDensity = useCallback(() => {
    setDensity(prev => {
      const next = DENSITY_CYCLE[(DENSITY_CYCLE.indexOf(prev) + 1) % DENSITY_CYCLE.length];
      try { localStorage.setItem(DENSITY_KEY, next); } catch {}
      return next;
    });
  }, []);
  const dc = DENSITY_CFG[density];

  // ─── Seleção para edição em massa ──────────────────────────────────────────
  type BulkFieldKey = 'date' | 'filial' | 'conta_contabil' | 'recurring';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<BulkFieldKey>('date');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkJustification, setBulkJustification] = useState('');

  const BULK_FIELDS: Array<{ key: BulkFieldKey; label: string }> = [
    { key: 'date',           label: 'Data de Competência' },
    { key: 'filial',         label: 'Filial' },
    { key: 'conta_contabil', label: 'Conta Contábil' },
    { key: 'recurring',      label: 'Recorrência' },
  ];

  // Carregar contas contábeis quando o usuário escolher esse campo no bulk
  useEffect(() => {
    if (bulkField === 'conta_contabil' && contaContabilData.length === 0) {
      getContaContabilOptions().then(setContaContabilData);
    }
  }, [bulkField]);

  // Usar transactions buscados do estado do App.tsx se já buscou, senão mostrar vazio
  const transactions = hasSearchedTransactions ? searchedTransactions : [];

  // Abas e Paginação
  const [activeTab, setActiveTab] = useState<'real' | 'orcamento' | 'comparativo'>(() => {
    // Carregar aba ativa salva do sessionStorage
    const saved = sessionStorage.getItem('transactionsActiveTab');
    return saved ? JSON.parse(saved) : 'real';
  });
  // Paginação server-side
  const PAGE_SIZE = 1000;
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);


  const filterContainerRef = useRef<HTMLDivElement>(null);

  const [rateioParts, setRateioParts] = useState<RateioPart[]>([]);
  const [editForm, setEditForm] = useState({ category: '', categoryLabel: '', date: '', filial: '', filial_code: '', marca: '', justification: '', amount: 0, recurring: 'Sim', chave_id: '', tag01: '', tag02: '', tag03: '', nat_orc: '' });
  const [contaSelectorOpen, setContaSelectorOpen] = useState(false);
  const [contaContabilData, setContaContabilData] = useState<ContaContabilOption[]>([]);
  const [rateioJustification, setRateioJustification] = useState('');

  const initialFilters = {
    monthFrom: '',
    monthTo: '',
    marca: [] as string[],
    nome_filial: [] as string[],
    tag0: [] as string[],
    tag01: [] as string[],
    tag02: [] as string[],
    tag03: [] as string[],
    category: [] as string[],
    conta_contabil: [] as string[],
    ticket: '',
    chave_id: '',
    vendor: '',
    description: '',
    amount: '',
    recurring: ['Sim'] as string[],  // Filtro padrão: apenas "Sim"
    status: [] as string[]
  };

  const [colFilters, setColFilters] = useState(() => {
    // Carregar filtros salvos do sessionStorage (merge com defaults para evitar campos undefined)
    const saved = sessionStorage.getItem('transactionsColFilters');
    return saved ? { ...initialFilters, ...JSON.parse(saved) } : initialFilters;
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterResetKey, setFilterResetKey] = useState(0);

  // Debounced filter setter for text inputs
  const debouncedSetFilter = useMemo(
    () => debounce((key: string, value: string) => {
      setColFilters(prev => ({ ...prev, [key]: value }));
    }, 300),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSetFilter.cancel();
  }, [debouncedSetFilter]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (openDropdown && filterContainerRef.current) {
        const target = event.target as HTMLElement;
        if (!target.closest('.multi-select-container')) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [openDropdown]);


  // Cascata: Marca → Filial (usando nome_filial do banco, ex: "CLV - Alfa")
  const filteredFilialLabels = useMemo(() => {
    let filiais = filterOptions.filiais;
    if (colFilters.marca?.length > 0)
      filiais = filiais.filter(f => colFilters.marca.includes(f.cia));
    return [...new Set(filiais.map(f => f.label))].sort();
  }, [filterOptions.filiais, colFilters.marca]);

  // 🎯 Tag0 Options (todas do banco via tag0_map)
  const tag0Options = useMemo(() =>
    filterOptions.tag0Options
  , [filterOptions.tag0Options]);

  // 🎯 Cascata: Tag0 → Tag01
  // Filtrar tag01 baseado nos tag0 selecionados
  const tag1Options = useMemo(() => {
    let tag1s = [...filterOptions.tag01Options]; // Usar lista completa do banco

    // Se tem filtro de tag0 ativo, mostrar apenas tag01 que pertencem aos tag0 selecionados
    if (colFilters.tag0?.length > 0 && filterOptions.tag0Map.size > 0) {
      tag1s = tag1s.filter(tag1 => {
        const tag0ForThisTag1 = resolveTag0(tag1, filterOptions.tag0Map);
        return tag0ForThisTag1 && colFilters.tag0.includes(tag0ForThisTag1);
      });
    }

    return tag1s.sort();
  }, [filterOptions.tag01Options, filterOptions.tag0Map, colFilters.tag0]);

  // 🎯 Cascata: Tag01 → Tag02 (busca dinâmica do banco)
  const [tag2Options, setTag2Options] = useState<string[]>([]);
  useEffect(() => {
    if (colFilters.tag01?.length > 0) {
      // Buscar do banco apenas tag02 que existem para os tag01 selecionados
      getTag02OptionsForTag01s(colFilters.tag01).then(opts => setTag2Options(opts));
    } else {
      // Sem filtro de tag01 → mostrar todas as tag02
      setTag2Options(filterOptions.tag02Options);
    }
  }, [colFilters.tag01, filterOptions.tag02Options]);

  // 🎯 Cascata: Tag02 → Tag03 (busca dinâmica do banco)
  const [tag3Options, setTag3Options] = useState<string[]>([]);
  useEffect(() => {
    if (colFilters.tag02?.length > 0) {
      // Buscar do banco apenas tag03 que existem para os tag02 selecionados
      getTag03OptionsForTag02s(colFilters.tag02).then(opts => setTag3Options(opts));
    } else if (colFilters.tag01?.length > 0) {
      // Tag01 ativo mas tag02 não → buscar tag03 via tag01 (usando tagRecords como fallback)
      const validTag3s = new Set(
        filterOptions.tagRecords
          .filter(r => colFilters.tag01.includes(r.tag1))
          .map(r => r.tag3)
          .filter(Boolean)
      );
      setTag3Options([...validTag3s].sort());
    } else {
      // Sem filtro → mostrar todas as tag03
      setTag3Options(filterOptions.tag03Options);
    }
  }, [colFilters.tag01, colFilters.tag02, filterOptions.tag03Options, filterOptions.tagRecords]);

  // 🎯 Conta Contábil: busca da tabela tags (somente cod_conta com 14 dígitos)
  const [contaContabilOptions, setContaContabilOptions] = useState<string[]>([]);
  useEffect(() => {
    getContaContabilOptions().then(opts => setContaContabilOptions(opts.map(o => o.cod_conta)));
  }, []);

  // 🎯 EFEITO CASCATA: Limpar filtros downstream quando tag0 mudar
  useEffect(() => {
    // Limpar tag01 se algum valor não pertence mais aos tag0 selecionados
    if (colFilters.tag0?.length > 0 && colFilters.tag01?.length > 0 && filterOptions.tag0Map.size > 0) {
      const validTag01s = colFilters.tag01.filter(tag1 => {
        const tag0ForThisTag1 = resolveTag0(tag1, filterOptions.tag0Map);
        return tag0ForThisTag1 && colFilters.tag0.includes(tag0ForThisTag1);
      });

      if (validTag01s.length !== colFilters.tag01.length) {
        console.log('🔄 Limpando tag01 inválidos após mudança de tag0');
        setColFilters(prev => ({ ...prev, tag01: validTag01s }));
      }
    }

    // Se tag0 foi limpo completamente, não precisa limpar tag01 (usuário pode ter removido tag0 intencionalmente)
  }, [colFilters.tag0, filterOptions.tag0Map]);

  // Categories e recurrings mantêm comportamento atual (extraídos dos dados carregados)
  const dynamicOptions = useMemo(() => {
    const getOptions = (field: keyof Transaction) => {
      return Array.from(new Set(transactions.map(t => t[field]).filter(Boolean))).sort() as string[];
    };
    return {
      marcas: filterOptions.marcas,
      filiais: filteredFilialLabels,
      tag0s: tag0Options,
      tag01s: tag1Options,
      tag02s: tag2Options,
      tag03s: tag3Options,
      categories: getOptions('category'),
      recurrings: ['Sim', 'Não'],
      statuses: ['Normal', 'Pendente', 'Ajustado', 'Rateado', 'Excluído']
    };
  }, [filterOptions.marcas, filteredFilialLabels, tag0Options, tag1Options, tag2Options, tag3Options, transactions]);

  const ALL_BRANDS = useMemo(() => filterOptions.marcas, [filterOptions.marcas]);

  useEffect(() => {
    if (externalFilters) {
      const formatted = { ...externalFilters };
      ['marca', 'nome_filial', 'tag0', 'tag01', 'tag02', 'tag03', 'category', 'conta_contabil'].forEach(key => {
        if (formatted[key] && typeof formatted[key] === 'string' && formatted[key] !== 'all') {
          formatted[key] = [formatted[key]];
        } else if (formatted[key] === 'all' || !formatted[key]) {
          formatted[key] = [];
        }
      });
      setColFilters(prev => ({ ...prev, ...formatted }));
      setShowFilters(true);
      // Trigger auto-search: batched com setColFilters, garante que roda após atualização
      setAutoSearchTrigger(prev => prev + 1);
    }
  }, [externalFilters]);

  // Sincronizar aba ativa quando vem do drill-down
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Salvar filtros no sessionStorage quando mudarem
  useEffect(() => {
    sessionStorage.setItem('transactionsColFilters', JSON.stringify(colFilters));
  }, [colFilters]);

  // Salvar aba ativa no sessionStorage
  useEffect(() => {
    sessionStorage.setItem('transactionsActiveTab', JSON.stringify(activeTab));
  }, [activeTab]);

  // Sincroniza estado do formulário de edição
  useEffect(() => {
    if (editingTransaction) {
      setEditForm({
        category: editingTransaction.conta_contabil || editingTransaction.category || '',
        categoryLabel: editingTransaction.conta_contabil || editingTransaction.category || '',
        date: editingTransaction.date,
        filial: editingTransaction.nome_filial || editingTransaction.filial,
        filial_code: editingTransaction.filial,
        marca: editingTransaction.marca || 'SAP',
        justification: '',
        amount: editingTransaction.amount,
        recurring: editingTransaction.recurring || 'Sim',
        chave_id: editingTransaction.chave_id || '',
        tag01: editingTransaction.tag01 || '',
        tag02: editingTransaction.tag02 || '',
        tag03: editingTransaction.tag03 || '',
        nat_orc: editingTransaction.nat_orc || ''
      });
    }
  }, [editingTransaction]);

  // Sincroniza estado do rateio
  useEffect(() => {
    if (rateioTransaction) {
      setRateioJustification('');
      setRateioParts([
        {
          id: `p1-${Date.now()}`,
          filial: rateioTransaction.nome_filial || rateioTransaction.filial || '',
          filial_code: rateioTransaction.filial || '',
          marca: rateioTransaction.marca || '',
          amount: Number((rateioTransaction.amount / 2).toFixed(2)),
          percent: 50,
          date: rateioTransaction.date,
          category: rateioTransaction.category
        },
        {
          id: `p2-${Date.now()}`,
          filial: rateioTransaction.nome_filial || rateioTransaction.filial || '',
          filial_code: rateioTransaction.filial || '',
          marca: rateioTransaction.marca || '',
          amount: Number((rateioTransaction.amount / 2).toFixed(2)),
          percent: 50,
          date: rateioTransaction.date,
          category: rateioTransaction.category
        }
      ]);
    }
  }, [rateioTransaction]);

  // Função para buscar dados com filtros
  const handleSearchData = async (pageNumber: number | any = 1) => {
    // Garantir que pageNumber é sempre um número
    const page = typeof pageNumber === 'number' ? pageNumber : 1;

    setIsSearching(true);
    console.log('🔍 Iniciando busca com filtros:', colFilters);

    // Rotear para a tabela correta conforme a aba ativa
    const tableName =
      activeTab === 'orcamento' ? 'transactions_orcado' :
      activeTab === 'comparativo' ? 'transactions_ano_anterior' :
      'transactions';

    try {
      // 🎯 Converter tag0 → tag01 (tag0 não existe na tabela, precisa resolver via tag0_map)
      let resolvedTag01 = colFilters.tag01?.length > 0 ? [...colFilters.tag01] : [];
      if (colFilters.tag0?.length > 0 && filterOptions.tag0Map.size > 0) {
        const tag01sFromTag0: string[] = [];
        filterOptions.tag0Map.forEach((tag0Value, tag01Key) => {
          if (colFilters.tag0.includes(tag0Value)) {
            // Buscar o tag01 original (não normalizado) nos tag01Options
            const original = filterOptions.tag01Options.find(t => t.toLowerCase().trim() === tag01Key);
            if (original) tag01sFromTag0.push(original);
          }
        });
        // Merge: tag01 explícitos do usuário + tag01 derivados do tag0
        resolvedTag01 = [...new Set([...resolvedTag01, ...tag01sFromTag0])];
        console.log(`🏷️ tag0 [${colFilters.tag0.join(', ')}] → tag01 [${tag01sFromTag0.join(', ')}] (total: ${resolvedTag01.length})`);
      }

      const filters: TransactionFilters = {
        monthFrom: colFilters.monthFrom || undefined,
        monthTo: colFilters.monthTo || undefined,
        // Real: filtrar por scenario. Orçado/A-1: a tabela já é o filtro de cenário
        scenario: activeTab === 'real' ? 'Real' : undefined,
        marca: colFilters.marca?.length > 0 ? colFilters.marca : undefined,
        nome_filial: colFilters.nome_filial?.length > 0 ? colFilters.nome_filial : undefined,
        tag01: resolvedTag01.length > 0 ? resolvedTag01 : undefined,
        tag02: colFilters.tag02?.length > 0 ? colFilters.tag02 : undefined,
        tag03: colFilters.tag03?.length > 0 ? colFilters.tag03 : undefined,
        category: colFilters.category?.length > 0 ? colFilters.category : undefined,
        conta_contabil: colFilters.conta_contabil?.length > 0 ? colFilters.conta_contabil : undefined,
        chave_id: colFilters.chave_id || undefined,
        recurring: colFilters.recurring?.length > 0 ? colFilters.recurring : undefined,
        status: colFilters.status?.length > 0 ? colFilters.status : undefined,
        ticket: colFilters.ticket || undefined,
        vendor: colFilters.vendor || undefined,
        description: colFilters.description || undefined,
        amount: colFilters.amount || undefined,
      };

      if (allowedMarcas && allowedMarcas.length > 0) {
        if (filters.marca && filters.marca.length > 0) {
          filters.marca = filters.marca.filter(m => allowedMarcas.includes(m));
        } else {
          filters.marca = allowedMarcas;
        }
        console.log('🔒 Filtro de permissão MARCA aplicado:', filters.marca);
      }

      if (allowedFiliais && allowedFiliais.length > 0) {
        if (filters.nome_filial && filters.nome_filial.length > 0) {
          filters.nome_filial = filters.nome_filial.filter(f => allowedFiliais.includes(f));
        } else {
          filters.nome_filial = allowedFiliais;
        }
        console.log('🔒 Filtro de permissão FILIAL aplicado:', filters.nome_filial);
      }

      if (allowedCategories && allowedCategories.length > 0) {
        if (filters.category && filters.category.length > 0) {
          filters.category = filters.category.filter(c => allowedCategories.includes(c));
        } else {
          filters.category = allowedCategories;
        }
        console.log('🔒 Filtro de permissão CATEGORIA aplicado:', filters.category);
      }

      // ✅ NOVO: Aplicar filtros de TAG01, TAG02, TAG03
      if (allowedTag01 && allowedTag01.length > 0) {
        if (filters.tag01 && filters.tag01.length > 0) {
          filters.tag01 = filters.tag01.filter(t => allowedTag01.includes(t));
        } else {
          filters.tag01 = allowedTag01;
        }
        console.log('🔒 Filtro de permissão TAG01 aplicado:', filters.tag01);
      }

      if (allowedTag02 && allowedTag02.length > 0) {
        if (filters.tag02 && filters.tag02.length > 0) {
          filters.tag02 = filters.tag02.filter(t => allowedTag02.includes(t));
        } else {
          filters.tag02 = allowedTag02;
        }
        console.log('🔒 Filtro de permissão TAG02 aplicado:', filters.tag02);
      }

      if (allowedTag03 && allowedTag03.length > 0) {
        if (filters.tag03 && filters.tag03.length > 0) {
          filters.tag03 = filters.tag03.filter(t => allowedTag03.includes(t));
        } else {
          filters.tag03 = allowedTag03;
        }
        console.log('🔒 Filtro de permissão TAG03 aplicado:', filters.tag03);
      }

      const pagination: PaginationParams = { pageNumber: page, pageSize: PAGE_SIZE };

      const response = await getFilteredTransactions(filters, pagination, tableName);

      setSearchedTransactions(response.data);
      setSelectedIds(new Set());
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setCurrentPageNumber(page);
      setHasSearchedTransactions(true);

      console.log(`✅ Busca concluída [${tableName}]: ${response.data.length} registros retornados (página ${page})`);
      console.log(`📊 Total de registros: ${response.totalCount}, Mais páginas: ${response.hasMore}`);
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Funções de navegação de página
  const goToNextPage = () => {
    if (currentPageNumber < totalPages) {
      handleSearchData(currentPageNumber + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPageNumber > 1) {
      handleSearchData(currentPageNumber - 1);
    }
  };

  // Auto-busca após drill-down da DRE
  // autoSearchTrigger é batched com setColFilters/setActiveTab, então quando este
  // effect roda, colFilters e activeTab já estão atualizados nesta renderização
  useEffect(() => {
    if (autoSearchTrigger > 0) {
      handleSearchData(1);
    }
  }, [autoSearchTrigger]);

  // Função para buscar TODOS os dados (loop paginado com progresso)
  const handleSearchAll = async () => {
    setShowSearchAllModal(false);
    setIsSearching(true);
    cancelSearchAllRef.current = false; // Reset do flag de cancelamento
    setSearchAllProgress({ current: 0, total: 0, loaded: 0 });
    console.log('🔍 Buscando TODOS os dados com filtros:', colFilters);

    // Rotear para a tabela correta conforme a aba ativa
    const tableNameAll =
      activeTab === 'orcamento' ? 'transactions_orcado' :
      activeTab === 'comparativo' ? 'transactions_ano_anterior' :
      'transactions';

    try {
      // 🎯 Converter tag0 → tag01 (tag0 não existe na tabela, precisa resolver via tag0_map)
      let resolvedTag01All = colFilters.tag01?.length > 0 ? [...colFilters.tag01] : [];
      if (colFilters.tag0?.length > 0 && filterOptions.tag0Map.size > 0) {
        const tag01sFromTag0: string[] = [];
        filterOptions.tag0Map.forEach((tag0Value, tag01Key) => {
          if (colFilters.tag0.includes(tag0Value)) {
            const original = filterOptions.tag01Options.find(t => t.toLowerCase().trim() === tag01Key);
            if (original) tag01sFromTag0.push(original);
          }
        });
        resolvedTag01All = [...new Set([...resolvedTag01All, ...tag01sFromTag0])];
        console.log(`🏷️ [SearchAll] tag0 [${colFilters.tag0.join(', ')}] → tag01 [${tag01sFromTag0.join(', ')}] (total: ${resolvedTag01All.length})`);
      }

      // Passar TODOS os filtros para o servidor
      const filters: TransactionFilters = {
        monthFrom: colFilters.monthFrom || undefined,
        monthTo: colFilters.monthTo || undefined,
        scenario: activeTab === 'real' ? 'Real' : undefined,
        marca: colFilters.marca && colFilters.marca.length > 0 ? colFilters.marca : undefined,
        nome_filial: colFilters.nome_filial && colFilters.nome_filial.length > 0 ? colFilters.nome_filial : undefined,
        tag01: resolvedTag01All.length > 0 ? resolvedTag01All : undefined,
        tag02: colFilters.tag02 && colFilters.tag02.length > 0 ? colFilters.tag02 : undefined,
        tag03: colFilters.tag03 && colFilters.tag03.length > 0 ? colFilters.tag03 : undefined,
        category: colFilters.category && colFilters.category.length > 0 ? colFilters.category : undefined,
        conta_contabil: colFilters.conta_contabil && colFilters.conta_contabil.length > 0 ? colFilters.conta_contabil : undefined,
        chave_id: colFilters.chave_id && colFilters.chave_id.length > 0 ? colFilters.chave_id : undefined,
        recurring: colFilters.recurring && colFilters.recurring.length > 0 ? colFilters.recurring : undefined,
        status: colFilters.status && colFilters.status.length > 0 ? colFilters.status : undefined,
        ticket: colFilters.ticket || undefined,
        vendor: colFilters.vendor || undefined,
        description: colFilters.description || undefined,
        amount: colFilters.amount || undefined,
      };

      if (allowedMarcas && allowedMarcas.length > 0) {
        if (filters.marca && filters.marca.length > 0) {
          filters.marca = filters.marca.filter(m => allowedMarcas.includes(m));
        } else {
          filters.marca = allowedMarcas;
        }
        console.log('🔒 Filtro de permissão MARCA aplicado:', filters.marca);
      }

      if (allowedFiliais && allowedFiliais.length > 0) {
        if (filters.nome_filial && filters.nome_filial.length > 0) {
          filters.nome_filial = filters.nome_filial.filter(f => allowedFiliais.includes(f));
        } else {
          filters.nome_filial = allowedFiliais;
        }
        console.log('🔒 Filtro de permissão FILIAL aplicado:', filters.nome_filial);
      }

      if (allowedCategories && allowedCategories.length > 0) {
        if (filters.category && filters.category.length > 0) {
          filters.category = filters.category.filter(c => allowedCategories.includes(c));
        } else {
          filters.category = allowedCategories;
        }
        console.log('🔒 Filtro de permissão CATEGORIA aplicado:', filters.category);
      }

      // ✅ NOVO: Aplicar filtros de TAG01, TAG02, TAG03
      if (allowedTag01 && allowedTag01.length > 0) {
        if (filters.tag01 && filters.tag01.length > 0) {
          filters.tag01 = filters.tag01.filter(t => allowedTag01.includes(t));
        } else {
          filters.tag01 = allowedTag01;
        }
        console.log('🔒 Filtro de permissão TAG01 aplicado (Buscar Tudo):', filters.tag01);
      }

      if (allowedTag02 && allowedTag02.length > 0) {
        if (filters.tag02 && filters.tag02.length > 0) {
          filters.tag02 = filters.tag02.filter(t => allowedTag02.includes(t));
        } else {
          filters.tag02 = allowedTag02;
        }
        console.log('🔒 Filtro de permissão TAG02 aplicado (Buscar Tudo):', filters.tag02);
      }

      if (allowedTag03 && allowedTag03.length > 0) {
        if (filters.tag03 && filters.tag03.length > 0) {
          filters.tag03 = filters.tag03.filter(t => allowedTag03.includes(t));
        } else {
          filters.tag03 = allowedTag03;
        }
        console.log('🔒 Filtro de permissão TAG03 aplicado (Buscar Tudo):', filters.tag03);
      }

      console.log('📋 Filtros aplicados:', filters);

      // Primeira busca para descobrir o total
      const firstResponse = await getFilteredTransactions(filters, {
        pageNumber: 1,
        pageSize: 1000
      }, tableNameAll);

      if (firstResponse.data.length === 0) {
        console.log('⚠️ Nenhum dado encontrado');
        setIsSearching(false);
        setHasSearchedTransactions(true);
        return;
      }

      const totalPages = firstResponse.totalPages;
      const totalRecords = firstResponse.totalCount;

      console.log(`📊 Total: ${totalRecords} registros em ${totalPages} páginas`);
      setSearchAllProgress({ current: 1, total: totalPages, loaded: firstResponse.data.length });

      // Iniciar com dados da primeira página
      let allData: Transaction[] = [...firstResponse.data];

      // Atualizar UI com primeira página
      setSearchedTransactions(allData);
      setHasSearchedTransactions(true);

      // Buscar páginas restantes
      for (let page = 2; page <= totalPages; page++) {
        // Verificar se foi cancelado (usando ref)
        if (cancelSearchAllRef.current) {
          console.log(`⚠️ Busca cancelada pelo usuário na página ${page}/${totalPages}`);
          console.log(`✅ ${allData.length} registros foram carregados antes do cancelamento`);
          break;
        }

        console.log(`📄 Buscando página ${page}/${totalPages}...`);

        const response = await getFilteredTransactions(filters, {
          pageNumber: page,
          pageSize: 1000,
        }, tableNameAll);

        allData = [...allData, ...response.data];

        // Atualizar UI incrementalmente a cada 5 páginas
        if (page % 5 === 0 || page === totalPages) {
          setSearchedTransactions([...allData]);
          console.log(`✅ Carregado: ${allData.length}/${totalRecords} registros (${Math.round((allData.length / totalRecords) * 100)}%)`);
        }

        setSearchAllProgress({
          current: page,
          total: totalPages,
          loaded: allData.length
        });

        // Segurança: parar se passar de 150 páginas
        if (page >= 150) {
          console.warn('⚠️ Limite de segurança atingido (150 páginas)');
          break;
        }

        // Pequeno delay para não sobrecarregar (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Atualização final
      setSearchedTransactions(allData);
      setTotalCount(allData.length);
      setTotalPages(1);
      setCurrentPageNumber(1);

      if (!cancelSearchAllRef.current) {
        console.log(`✅ Busca completa: ${allData.length} registros carregados em ${totalPages} páginas`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar todos os dados:', error);
      alert(`Erro ao buscar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSearching(false);
      cancelSearchAllRef.current = false;
      setSearchAllProgress({ current: 0, total: 0, loaded: 0 });
    }
  };

  const filteredAndSorted = useMemo(() => {
    console.log('🔍 Aplicando filtros client-side e ordenação:', {
      activeTab,
      totalTransactions: transactions.length,
      activeFilters: Object.keys(colFilters).filter(key => {
        const value = colFilters[key as keyof typeof colFilters];
        return value && (Array.isArray(value) ? value.length > 0 : true);
      })
    });

    return transactions
      .filter(t => {
        // 1. Filtrar por aba ativa (cenário) - case-insensitive e sem acentos
        const scenarioNormalized = (t.scenario || '').toLowerCase().trim()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (activeTab === 'real') {
          // Aceitar 'real' ou vazio (transações sem cenário definido são consideradas 'real')
          if (scenarioNormalized !== 'real' && scenarioNormalized !== '') return false;
        }
        // Orçado e A-1: dados já vêm das tabelas corretas (transactions_orcado / transactions_ano_anterior)
        // Não é necessário filtrar por scenario aqui

        // 2. Aplicar filtros client-side (EXCETO período, que já foi aplicado no servidor)
        return Object.entries(colFilters).every(([key, value]) => {
          // Ignorar filtros vazios
          if (!value || (Array.isArray(value) && value.length === 0)) return true;

          // IMPORTANTE: NÃO filtrar por período aqui (já foi aplicado no servidor)
          if (key === 'monthFrom' || key === 'monthTo') return true;

          // Filtros de array (marca, filial, tags, category, recurring)
          const tValue = String(t[key as keyof Transaction] || '');
          if (Array.isArray(value)) {
            // Comparação case-insensitive para campos que podem ter variação de maiúsculas/minúsculas
            if (key === 'recurring') {
              return value.some(v => String(v).toLowerCase() === tValue.toLowerCase());
            }
            return value.includes(tValue);
          }

          // Filtros de texto (ticket, vendor, description, amount)
          const filterValue = String(value).toLowerCase();
          return tValue.toLowerCase().includes(filterValue);
        });
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
  }, [transactions, colFilters, sortConfig, activeTab]);

  const totalAmount = useMemo(() => {
    return filteredAndSorted.reduce((sum, t) => t.type === 'REVENUE' ? sum + t.amount : sum - t.amount, 0);
  }, [filteredAndSorted]);


  const parentRef = useRef<HTMLDivElement>(null);

  // Contadores por aba
  const tabCounts = useMemo(() => {
    const counts = { real: 0, orcamento: 0, comparativo: 0 };

    // Orçado e A-1 vêm de tabelas separadas — todos os registros buscados pertencem ao cenário ativo
    if (activeTab === 'orcamento') {
      counts.orcamento = transactions.length;
    } else if (activeTab === 'comparativo') {
      counts.comparativo = transactions.length;
    } else {
      transactions.forEach(t => {
        const s = (t.scenario || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (s === 'real' || s === '') counts.real++;
      });
    }

    return counts;
  }, [transactions, activeTab]);

  // Calculate summary metrics for filtered data
  const filteredSummary = useMemo(() => {
    const filtered = filteredAndSorted;
    const budget = transactions.filter(t => t.scenario === 'Orçamento');

    const totalRevenue = filtered.filter(t => t.type === 'REVENUE').reduce((acc, t) => acc + t.amount, 0);
    const totalVariableCosts = filtered.filter(t => t.type === 'VARIABLE_COST').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalFixedCosts = filtered.filter(t => t.type === 'FIXED_COST').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const sgaCosts = filtered.filter(t => t.type === 'SGA').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const rateioCosts = filtered.filter(t => t.type === 'RATEIO').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const ebitda = totalRevenue - totalVariableCosts - totalFixedCosts - sgaCosts - rateioCosts;

    // Budget comparisons
    const budgetRevenue = budget.filter(t => t.type === 'REVENUE').reduce((acc, t) => acc + t.amount, 0);
    const budgetVariableCosts = budget.filter(t => t.type === 'VARIABLE_COST').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const budgetFixedCosts = budget.filter(t => t.type === 'FIXED_COST').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const budgetSga = budget.filter(t => t.type === 'SGA').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const budgetRateio = budget.filter(t => t.type === 'RATEIO').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const budgetEbitda = budgetRevenue - budgetVariableCosts - budgetFixedCosts - budgetSga - budgetRateio;

    const revenueVsBudget = budgetRevenue > 0 ? ((totalRevenue - budgetRevenue) / budgetRevenue) * 100 : undefined;
    const variableCostsVsBudget = budgetVariableCosts > 0 ? ((totalVariableCosts - budgetVariableCosts) / budgetVariableCosts) * 100 : undefined;
    const fixedCostsVsBudget = budgetFixedCosts > 0 ? ((totalFixedCosts - budgetFixedCosts) / budgetFixedCosts) * 100 : undefined;
    const ebitdaVsBudget = budgetEbitda !== 0 ? ((ebitda - budgetEbitda) / Math.abs(budgetEbitda)) * 100 : undefined;

    return {
      totalRevenue,
      totalVariableCosts,
      totalFixedCosts,
      ebitda,
      revenueVsBudget,
      variableCostsVsBudget,
      fixedCostsVsBudget,
      ebitdaVsBudget
    };
  }, [filteredAndSorted, transactions]);

  const handleExportExcel = async () => {
    const COLS = [
      { header: 'Cenário',    key: 'scenario',    width: 11, align: 'left'  as const },
      { header: 'Data',       key: 'date',        width: 13, align: 'center'as const },
      { header: 'Tag 0',      key: 'tag0',        width: 16, align: 'left'  as const },
      { header: 'Tag 01',     key: 'tag01',       width: 16, align: 'left'  as const },
      { header: 'Tag 02',     key: 'tag02',       width: 16, align: 'left'  as const },
      { header: 'Tag 03',     key: 'tag03',       width: 16, align: 'left'  as const },
      { header: 'Conta',      key: 'category',    width: 26, align: 'left'  as const },
      { header: 'Marca',      key: 'marca',       width: 10, align: 'left'  as const },
      { header: 'Filial',     key: 'filial',      width: 14, align: 'left'  as const },
      { header: 'Ticket',     key: 'ticket',      width: 16, align: 'left'  as const },
      { header: 'Chave ID',   key: 'chave_id',    width: 22, align: 'left'  as const },
      { header: 'Fornecedor', key: 'vendor',      width: 30, align: 'left'  as const },
      { header: 'Descrição',  key: 'description', width: 50, align: 'left'  as const },
      { header: 'Valor',      key: 'amount',      width: 16, align: 'right' as const, numFmt: '#,##0.00' },
      { header: 'Status',     key: 'status',      width: 13, align: 'center'as const },
      { header: 'Recorrente', key: 'recurring',   width: 13, align: 'center'as const },
      { header: 'ID',         key: 'id',          width: 32, align: 'left'  as const },
      { header: 'Justificativa', key: 'justification', width: 42, align: 'left' as const },
    ];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'DRE Raiz';
    const ws = wb.addWorksheet('Lançamentos');

    // Colunas
    ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));

    // Cabeçalho
    const headerRow = ws.addRow(COLS.map(c => c.header));
    headerRow.height = 20;
    headerRow.eachCell((cell, colIdx) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: COLS[colIdx - 1].align, vertical: 'middle', wrapText: false };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF2E75B6' } },
      };
    });

    // Freeze cabeçalho
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

    // Dados
    filteredAndSorted.forEach((t, rowIdx) => {
      const values: Record<string, unknown> = {
        scenario:      t.scenario || 'Real',
        date:          t.date,
        tag0:          t.tag0 || '',
        tag01:         t.tag01 || '',
        tag02:         t.tag02 || '',
        tag03:         t.tag03 || '',
        category:      t.category,
        marca:         t.marca || 'SAP',
        filial:        t.filial,
        ticket:        t.ticket || '',
        chave_id:      (t as any).chave_id || '',
        vendor:        t.vendor || '',
        description:   t.description,
        amount:        t.amount,
        status:        t.status,
        recurring:     t.recurring || 'Sim',
        id:            t.id,
        justification: (t as any).justification || '',
      };

      const dataRow = ws.addRow(COLS.map(c => values[c.key]));
      const isEven = rowIdx % 2 === 0;
      const bgArgb = isEven ? 'FFFFFFFF' : 'FFF5F8FC';

      dataRow.height = 16;
      dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        const colDef = COLS[colIdx - 1];
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font      = { size: 10, color: { argb: 'FF1A1A2E' } };
        cell.alignment = { horizontal: colDef.align, vertical: 'middle' };
        if (colDef.numFmt) cell.numFmt = colDef.numFmt;
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFD9E1EC' } },
        };
      });
    });

    // Auto-filtro no cabeçalho
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };

    // Download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lancamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitAjuste = () => {
    console.log('🟢 handleSubmitAjuste INICIADO');

    if (!editingTransaction) {
      console.error('❌ editingTransaction é NULL');
      return;
    }

    if (!editForm.justification.trim()) {
      console.error('❌ justification está vazia');
      return;
    }

    console.log('✅ Validações OK', {
      transactionId: editingTransaction.id,
      justification: editForm.justification,
      justificationLength: editForm.justification.length
    });

    const changeData = {
      transactionId: editingTransaction.id,
      description: `Ajuste: ${editForm.justification}`,
      justification: editForm.justification,
      type: 'MULTI' as const,
      oldValue: JSON.stringify(editingTransaction),
      newValue: JSON.stringify(editForm)
    };

    console.log('📦 Dados do change (ajuste):', {
      transactionId: changeData.transactionId,
      description: changeData.description,
      justification: changeData.justification,
      type: changeData.type,
      oldValuePreview: changeData.oldValue.substring(0, 50) + '...',
      newValuePreview: changeData.newValue.substring(0, 50) + '...'
    });

    console.log('🔄 Chamando requestChange...');
    requestChange(changeData);

    console.log('✅ requestChange chamado, fechando modal');
    setEditingTransaction(null);
  };

  const currentRateioSum = useMemo(() => rateioParts.reduce((sum, p) => sum + Number(p.amount), 0), [rateioParts]);
  const remainingRateio = useMemo(() => (rateioTransaction?.amount || 0) - currentRateioSum, [rateioTransaction, currentRateioSum]);
  const isRateioFullyAllocated = useMemo(() => Math.abs(remainingRateio) < 0.05, [remainingRateio]);

  const handleSubmitRateio = () => {
    console.log('🟢 handleSubmitRateio INICIADO');

    if (!rateioTransaction) {
      console.error('❌ rateioTransaction é NULL');
      return;
    }

    if (!isRateioFullyAllocated) {
      console.error('❌ Rateio não está totalmente alocado', {
        currentSum: currentRateioSum,
        remaining: remainingRateio
      });
      return;
    }

    if (!rateioJustification.trim()) {
      console.error('❌ rateioJustification está vazia');
      return;
    }

    console.log('✅ Validações OK', {
      transactionId: rateioTransaction.id,
      justification: rateioJustification,
      justificationLength: rateioJustification.length,
      partsCount: rateioParts.length
    });

    const newTransactions: Transaction[] = rateioParts.filter(p => p.amount !== 0).map((p, idx) => ({
      ...rateioTransaction,
      id: crypto.randomUUID(),
      chave_id: rateioTransaction.chave_id,
      filial: p.filial_code || p.filial,   // código da filial (coluna filial no banco)
      nome_filial: p.filial,               // nome de exibição (coluna nome_filial no banco)
      marca: p.marca,
      date: p.date,
      category: p.category,
      amount: Number(p.amount.toFixed(2)),
      type: CATEGORIES.FIXED_COST.includes(p.category) ? 'FIXED_COST' : CATEGORIES.VARIABLE_COST.includes(p.category) ? 'VARIABLE_COST' : 'REVENUE',
      status: 'Rateado'
    }));

    console.log('📦 Novas transações criadas:', {
      count: newTransactions.length,
      ids: newTransactions.map(t => t.id),
      amounts: newTransactions.map(t => t.amount)
    });

    const changeData = {
      transactionId: rateioTransaction.id,
      description: `Rateio: ${rateioJustification}`,
      justification: rateioJustification,
      type: 'RATEIO' as const,
      oldValue: JSON.stringify(rateioTransaction),
      newValue: JSON.stringify({ transactions: newTransactions, justification: rateioJustification })
    };

    console.log('📦 Dados do change (rateio):', {
      transactionId: changeData.transactionId,
      description: changeData.description,
      justification: changeData.justification,
      type: changeData.type,
      oldValuePreview: changeData.oldValue.substring(0, 50) + '...',
      newValuePreview: changeData.newValue.substring(0, 100) + '...'
    });

    console.log('🔄 Chamando requestChange...');
    requestChange(changeData);

    console.log('✅ requestChange chamado, fechando modal');
    setRateioTransaction(null);
  };

  const updateRateioPart = (id: string, updates: Partial<RateioPart>) => {
    setRateioParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleClearAllFilters = () => {
    setColFilters(initialFilters);
    setFilterResetKey(k => k + 1); // força re-render dos inputs de texto (defaultValue)
    if (clearGlobalFilters) clearGlobalFilters();
    // Limpar também os dados da busca
    setHasSearchedTransactions(false);
    setSearchedTransactions([]);
  };

  const handleBulkApply = () => {
    if (!bulkValue || selectedIds.size === 0 || !bulkJustification.trim()) return;

    const selectedTransactions = searchedTransactions.filter(t => selectedIds.has(t.id));
    const fieldLabel = BULK_FIELDS.find(f => f.key === bulkField)?.label || bulkField;

    selectedTransactions.forEach(t => {
      // Base: todos os campos do editForm com os valores originais da transação
      const newValue: Record<string, any> = {
        category:      t.conta_contabil || t.category || '',
        categoryLabel: t.conta_contabil || t.category || '',
        date:          t.date,
        filial:        t.filial,
        marca:         t.marca || '',
        justification: bulkJustification,
        amount:        t.amount,
        recurring:     t.recurring || 'Sim',
        chave_id:      t.chave_id || '',
        tag01:         t.tag01 || '',
        tag02:         t.tag02 || '',
        tag03:         t.tag03 || '',
        nat_orc:       t.nat_orc || '',
      };

      // Sobrescreve só o campo alterado
      if (bulkField === 'date')           newValue.date = bulkValue + '-01';
      if (bulkField === 'filial') {
        // bulkValue = nome_filial (display); encontra o código e a marca no filterOptions
        const opt = filterOptions.filiais.find(f => f.label === bulkValue);
        newValue.filial      = bulkValue;                        // → nome_filial no banco (via _applyChange)
        newValue.filial_code = opt?.filialCodes[0] || bulkValue; // → filial (código) no banco
        newValue.marca       = opt?.cia || t.marca || '';        // → marca no banco
      }
      if (bulkField === 'conta_contabil') { newValue.category = bulkValue; newValue.categoryLabel = bulkValue; }
      if (bulkField === 'recurring')      newValue.recurring = bulkValue;

      requestChange({
        transactionId: t.id,
        description:   `Alteração em massa: ${fieldLabel} → ${bulkValue}`,
        justification: bulkJustification,
        type:          'MULTI',
        oldValue:      JSON.stringify(t),
        newValue:      JSON.stringify(newValue),
      });
    });

    // Atualiza status para 'Pendente' otimisticamente na lista local
    setSearchedTransactions(
      searchedTransactions.map(t => selectedIds.has(t.id) ? { ...t, status: 'Pendente' } : t)
    );
    setSelectedIds(new Set());
    setBulkValue('');
    setBulkJustification('');
    console.log(`✅ ${selectedTransactions.length} solicitações de alteração (${fieldLabel}) enviadas para aprovação`);
  };

  const toggleMultiFilter = (key: string, value: string) => {
    setColFilters(prev => {
      const current = (prev as any)[key] as string[];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const isFilterActive = (key: keyof typeof initialFilters) => {
    const val = colFilters[key];
    if (Array.isArray(val)) return val.length > 0;
    return val !== initialFilters[key];
  };

  // Check if any filter is active
  const isAnyFilterActive = useMemo(() => {
    return Object.keys(colFilters).some(key => isFilterActive(key as keyof typeof initialFilters));
  }, [colFilters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.keys(colFilters).filter(key => isFilterActive(key as keyof typeof initialFilters)).length;
  }, [colFilters]);


  const DeParaVisualizer = ({ oldValue, newValue, labelFormatter }: any) => {
    const isChanged = oldValue !== newValue;
    if (!isChanged) return null;
    const formattedOld = labelFormatter ? labelFormatter(oldValue) : oldValue;
    const formattedNew = labelFormatter ? labelFormatter(newValue) : newValue;
    return (
      <div className="flex items-center gap-1 mt-0.5 animate-in fade-in slide-in-from-top-1">
        <span className="text-[7px] font-bold text-gray-400 line-through truncate max-w-[80px]">{formattedOld}</span>
        <ArrowRight size={7} className="text-gray-300" />
        <span className="text-[8px] font-black text-[#F44C00] truncate max-w-[80px]">{formattedNew}</span>
      </div>
    );
  };

  return (
    <div className="space-y-2 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <ReceiptText className="text-[#F44C00]" size={16} /> Lançamentos
          </h2>
          <p className="text-gray-500 text-[7px] font-bold uppercase tracking-widest leading-none">Gestão de Dados • Raiz Educação</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
           {/* Botão Voltar para DRE - só aparece quando há filtros de drill-down */}
           {externalFilters && onBackToDRE && (
             <button
               onClick={onBackToDRE}
               className="flex items-center gap-1 px-2 py-1.5 rounded-none font-black text-[8px] uppercase tracking-widest transition-all border bg-[#152e55] text-white border-[#152e55] hover:bg-[#1B75BB]"
             >
               <ArrowLeft size={10} />
               <TableProperties size={10} />
               {backToLabel}
             </button>
           )}
           <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1 px-2 py-1.5 rounded-none font-black text-[8px] uppercase tracking-widest transition-all border ${showFilters ? 'bg-[#1B75BB] text-white border-[#1B75BB]' : 'bg-white text-[#1B75BB] border-[#1B75BB]'}`}>
             <Filter size={10}/> {showFilters ? 'Ocultar Filtros' : 'Filtrar'}
             {activeFilterCount > 0 && (
               <span className="ml-1 px-1.5 py-0.5 bg-[#F44C00] text-white rounded-full text-[8px] font-black">
                 {activeFilterCount}
               </span>
             )}
           </button>
           <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1.5 rounded-none font-black text-[8px] uppercase border bg-[#1B75BB] text-white border-[#1B75BB] hover:bg-[#152e55]">
             <Download size={10} /> Exportar Tudo
           </button>
        </div>
      </header>

      {/* Abas de Cenário */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('real')}
          className={`px-3 py-1.5 font-black text-[10px] uppercase tracking-wide transition-all relative ${
            activeTab === 'real'
              ? 'text-[#1B75BB] border-b-2 border-[#1B75BB] -mb-[1px]'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Real
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
            activeTab === 'real' ? 'bg-[#1B75BB] text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {tabCounts.real.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('orcamento')}
          className={`px-3 py-1.5 font-black text-[10px] uppercase tracking-wide transition-all relative ${
            activeTab === 'orcamento'
              ? 'text-[#F44C00] border-b-2 border-[#F44C00] -mb-[1px]'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Orçamento
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
            activeTab === 'orcamento' ? 'bg-[#F44C00] text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {tabCounts.orcamento.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('comparativo')}
          className={`px-3 py-1.5 font-black text-[10px] uppercase tracking-wide transition-all relative ${
            activeTab === 'comparativo'
              ? 'text-emerald-600 border-b-2 border-emerald-600 -mb-[1px]'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Ano Anterior
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
            activeTab === 'comparativo' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {tabCounts.comparativo.toLocaleString()}
          </span>
        </button>
      </div>

      {showFilters && (
        <div ref={filterContainerRef} className="bg-white p-3 border border-gray-200 shadow-sm animate-in slide-in-from-top-1 duration-300 rounded-none">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                 <div className="bg-blue-50 p-1.5 rounded-none text-[#1B75BB]"><Filter size={12}/></div>
                 <h3 className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">Painel de Refinamento Dinâmico</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSearchData()}
                  disabled={isSearching}
                  className="flex items-center gap-2 px-3 py-2 min-h-[44px] md:min-h-0 bg-[#1B75BB] hover:bg-[#152e55] text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      Buscar Dados
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSearchAllModal(true)}
                  disabled={isSearching}
                  className="flex items-center gap-2 px-3 py-2 min-h-[44px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar todos os dados (pode demorar)"
                >
                  <Download size={14} />
                  Buscar Tudo
                </button>
                <button onClick={handleClearAllFilters} className="flex items-center gap-2 px-3 py-2 min-h-[44px] md:min-h-0 bg-[#F44C00] hover:bg-[#d44200] text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm active:scale-95">
                  <FilterX size={14} />
                  Limpar Filtros
                </button>
              </div>
           </div>
           <div className="space-y-1.5">
              {/* Primeira linha de filtros */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-1.5">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-[6.5px] font-black text-gray-400 uppercase tracking-widest leading-none">Período (Mês-Ano)</label>
                  <div className="flex gap-1">
                    <div className={`border p-1 rounded-none text-[8px] flex items-center gap-1 flex-1 ${isFilterActive('monthFrom') ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-[7px] text-gray-400">De:</span>
                      <input
                        type="month"
                        value={colFilters.monthFrom}
                        onChange={e => setColFilters({...colFilters, monthFrom: e.target.value})}
                        className="bg-transparent outline-none text-[8px] font-bold flex-1 min-w-0"
                        placeholder="MM-AAAA"
                      />
                    </div>
                    <div className={`border p-1 rounded-none text-[8px] flex items-center gap-1 flex-1 ${isFilterActive('monthTo') ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-100'}`}>
                      <span className="text-[7px] text-gray-400">Até:</span>
                      <input
                        type="month"
                        value={colFilters.monthTo}
                        onChange={e => setColFilters({...colFilters, monthTo: e.target.value})}
                        className="bg-transparent outline-none text-[8px] font-bold flex-1 min-w-0"
                        placeholder="MM-AAAA"
                      />
                    </div>
                  </div>
                </div>
                <MultiSelectFilter id="tag0" label="Tag0" options={dynamicOptions.tag0s} selected={colFilters.tag0} active={isFilterActive('tag0')} isOpen={openDropdown === 'tag0'} onToggle={() => setOpenDropdown(openDropdown === 'tag0' ? null : 'tag0')} onClear={() => setColFilters(prev => ({...prev, tag0: []}))} onToggleItem={(val) => toggleMultiFilter('tag0', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, tag0: [...new Set([...prev.tag0, ...vals])]}))} />
                <MultiSelectFilter id="tag01" label="Tag01" options={dynamicOptions.tag01s} selected={colFilters.tag01} active={isFilterActive('tag01')} isOpen={openDropdown === 'tag01'} onToggle={() => setOpenDropdown(openDropdown === 'tag01' ? null : 'tag01')} onClear={() => setColFilters(prev => ({...prev, tag01: []}))} onToggleItem={(val) => toggleMultiFilter('tag01', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, tag01: [...new Set([...prev.tag01, ...vals])]}))} />
                <MultiSelectFilter id="tag02" label="Tag02" options={dynamicOptions.tag02s} selected={colFilters.tag02} active={isFilterActive('tag02')} isOpen={openDropdown === 'tag02'} onToggle={() => setOpenDropdown(openDropdown === 'tag02' ? null : 'tag02')} onClear={() => setColFilters(prev => ({...prev, tag02: []}))} onToggleItem={(val) => toggleMultiFilter('tag02', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, tag02: [...new Set([...prev.tag02, ...vals])]}))} />
                <MultiSelectFilter id="tag03" label="Tag03" options={dynamicOptions.tag03s} selected={colFilters.tag03} active={isFilterActive('tag03')} isOpen={openDropdown === 'tag03'} onToggle={() => setOpenDropdown(openDropdown === 'tag03' ? null : 'tag03')} onClear={() => setColFilters(prev => ({...prev, tag03: []}))} onToggleItem={(val) => toggleMultiFilter('tag03', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, tag03: [...new Set([...prev.tag03, ...vals])]}))} />
                <MultiSelectFilter id="category" label="Conta" options={dynamicOptions.categories} selected={colFilters.category} active={isFilterActive('category')} isOpen={openDropdown === 'category'} onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} onClear={() => setColFilters(prev => ({...prev, category: []}))} onToggleItem={(val) => toggleMultiFilter('category', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, category: [...new Set([...prev.category, ...vals])]}))} />
                <MultiSelectFilter id="marca" label="Marca" options={dynamicOptions.marcas} selected={colFilters.marca} active={isFilterActive('marca')} isOpen={openDropdown === 'marca'} onToggle={() => setOpenDropdown(openDropdown === 'marca' ? null : 'marca')} onClear={() => setColFilters(prev => ({...prev, marca: []}))} onToggleItem={(val) => toggleMultiFilter('marca', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, marca: [...new Set([...prev.marca, ...vals])]}))} />
                <MultiSelectFilter id="nome_filial" label="Unidade" options={dynamicOptions.filiais} selected={colFilters.nome_filial} active={isFilterActive('nome_filial')} isOpen={openDropdown === 'nome_filial'} onToggle={() => setOpenDropdown(openDropdown === 'nome_filial' ? null : 'nome_filial')} onClear={() => setColFilters(prev => ({...prev, nome_filial: []}))} onToggleItem={(val) => toggleMultiFilter('nome_filial', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, nome_filial: [...new Set([...prev.nome_filial, ...vals])]}))} />
              </div>

              {/* Segunda linha de filtros */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-1.5">
                <FilterTextInput key={`ticket-${filterResetKey}`} label="Ticket" id="ticket" value={colFilters.ticket} colFilters={colFilters} setColFilters={setColFilters} debouncedSetFilter={debouncedSetFilter} />
                <FilterTextInput key={`chave_id-${filterResetKey}`} label="Chave ID" id="chave_id" value={colFilters.chave_id} colFilters={colFilters} setColFilters={setColFilters} debouncedSetFilter={debouncedSetFilter} />
                <FilterTextInput key={`vendor-${filterResetKey}`} label="Fornecedor" id="vendor" value={colFilters.vendor} colFilters={colFilters} setColFilters={setColFilters} className="xl:col-span-2" debouncedSetFilter={debouncedSetFilter} />
                <FilterTextInput key={`description-${filterResetKey}`} label="Descrição" id="description" value={colFilters.description} colFilters={colFilters} setColFilters={setColFilters} className="xl:col-span-2" debouncedSetFilter={debouncedSetFilter} />
                <MultiSelectFilter id="conta_contabil" label="Conta Contábil" options={contaContabilOptions} selected={colFilters.conta_contabil} active={isFilterActive('conta_contabil')} isOpen={openDropdown === 'conta_contabil'} onToggle={() => setOpenDropdown(openDropdown === 'conta_contabil' ? null : 'conta_contabil')} onClear={() => setColFilters(prev => ({...prev, conta_contabil: []}))} onToggleItem={(val) => toggleMultiFilter('conta_contabil', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, conta_contabil: [...new Set([...prev.conta_contabil, ...vals])]}))} />
                <FilterTextInput key={`amount-${filterResetKey}`} label="Valor" id="amount" value={colFilters.amount} colFilters={colFilters} setColFilters={setColFilters} debouncedSetFilter={debouncedSetFilter} />
                <MultiSelectFilter id="recurring" label="Recorrência" options={dynamicOptions.recurrings} selected={colFilters.recurring} active={isFilterActive('recurring')} isOpen={openDropdown === 'recurring'} onToggle={() => setOpenDropdown(openDropdown === 'recurring' ? null : 'recurring')} onClear={() => setColFilters(prev => ({...prev, recurring: []}))} onToggleItem={(val) => toggleMultiFilter('recurring', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, recurring: [...new Set([...prev.recurring, ...vals])]}))} />
                <MultiSelectFilter id="status" label="Status" options={dynamicOptions.statuses} selected={colFilters.status} active={isFilterActive('status')} isOpen={openDropdown === 'status'} onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')} onClear={() => setColFilters(prev => ({...prev, status: []}))} onToggleItem={(val) => toggleMultiFilter('status', val)} onSelectMultiple={(vals) => setColFilters(prev => ({...prev, status: [...new Set([...prev.status, ...vals])]}))} />
              </div>
           </div>
        </div>
      )}

      {/* Indicador de Progresso "Buscar Tudo" */}
      {isSearching && searchAllProgress.total > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 mb-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <div>
                <p className="text-sm font-black text-emerald-900">
                  Carregando todos os dados...
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Página {searchAllProgress.current} de {searchAllProgress.total} • {searchAllProgress.loaded.toLocaleString()} registros carregados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-600">
                  {Math.round((searchAllProgress.current / searchAllProgress.total) * 100)}%
                </p>
              </div>
              <button
                onClick={() => {
                  cancelSearchAllRef.current = true;
                  console.log('🛑 Cancelamento solicitado pelo usuário...');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                <X size={14} />
                Cancelar
              </button>
            </div>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${(searchAllProgress.current / searchAllProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}


      {/* Barra de paginação acima da tabela */}
      {hasSearchedTransactions && filteredAndSorted.length > 0 && (
        <div className="bg-[#152e55] text-white px-2 md:px-4 py-2 flex items-center gap-3 md:gap-6 text-[10px] font-black uppercase tracking-widest flex-wrap">
          <div className="flex items-center gap-2">
            <ListOrdered size={14} className="text-[#4AC8F4]" />
            <span>ITENS: <span className="text-[#4AC8F4]">{filteredAndSorted.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calculator size={14} className="text-[#4AC8F4]" />
            <span>TOTAL: <span className="text-[#4AC8F4]">R$ {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          </div>
          {totalPages > 1 && (
            <>
              <div className="mx-2 h-4 w-px bg-white/30" />
              <div className="flex items-center gap-2">
                <span>TOTAL BD: <span className="text-[#4AC8F4]">{totalCount.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPageNumber <= 1 || isSearching}
                  className="px-3 py-1.5 min-h-[44px] md:min-h-0 md:py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px] font-bold"
                >
                  <ArrowLeft size={12} className="inline mr-1" />
                  ANTERIOR
                </button>
                <span className="text-[11px]">
                  Pg <span className="text-[#4AC8F4] font-bold">{currentPageNumber}</span> de <span className="text-[#4AC8F4] font-bold">{totalPages}</span>
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPageNumber >= totalPages || isSearching}
                  className="px-3 py-1.5 min-h-[44px] md:min-h-0 md:py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px] font-bold"
                >
                  PRÓXIMA
                  <ArrowRight size={12} className="inline ml-1" />
                </button>
              </div>
            </>
          )}
          {/* Controles direita: Densidade + Colunas */}
          <div style={{ marginLeft: 'auto' }} className="flex items-center gap-2">
            {/* Toggle de densidade */}
            <div className="flex items-center gap-0.5 bg-white/5 rounded px-1 py-0.5">
              {DENSITY_CYCLE.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setDensity(d);
                    try { localStorage.setItem(DENSITY_KEY, d); } catch {}
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-colors ${
                    density === d
                      ? 'bg-white text-[#152e55]'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {d === 'comfortable' ? 'Conf.' : d === 'compact' ? 'Comp.' : 'Ultra'}
                </button>
              ))}
            </div>
            {/* Botão Colunas */}
            <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowColPanel(p => !p); }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-[9px] font-black uppercase tracking-widest"
            >
              <Eye size={11} />
              Colunas
              {visibleColDefs.length < COLUMN_DEFS.length && (
                <span className="ml-0.5 text-[#4AC8F4]">({visibleColDefs.length}/{COLUMN_DEFS.length})</span>
              )}
            </button>
            {showColPanel && (
              <div
                onMouseDown={e => e.stopPropagation()}
                style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 600, minWidth: 210 }}
                className="bg-white border border-gray-200 shadow-2xl rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Colunas visíveis</span>
                  <button
                    onClick={showAllCols}
                    className="text-[9px] font-black text-[#1B75BB] hover:underline uppercase"
                  >
                    Exibir todas
                  </button>
                </div>
                <div className="py-1 max-h-[320px] overflow-y-auto">
                  {COLUMN_DEFS.map(colDef => {
                    const visible = colVisibility[colDef.key] !== false;
                    return (
                      <button
                        key={colDef.key}
                        onClick={() => toggleColVisibility(colDef.key)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        {visible
                          ? <CheckSquare size={13} className="text-[#1B75BB] shrink-0" />
                          : <Square size={13} className="text-gray-300 shrink-0" />
                        }
                        <span className="text-[10px] font-bold text-gray-700">{colDef.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 mb-1 bg-blue-600 text-white rounded-xl shadow-lg flex-wrap">
          <span className="text-sm font-bold shrink-0">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-white/30 shrink-0" />
          <span className="text-xs font-semibold opacity-80 shrink-0">Alterar:</span>
          <select
            value={bulkField}
            onChange={e => { setBulkField(e.target.value as BulkFieldKey); setBulkValue(''); }}
            className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold"
          >
            {BULK_FIELDS.map(f => <option key={f.key} value={f.key} className="text-gray-900 bg-white">{f.label}</option>)}
          </select>
          {bulkField === 'date' && (
            <input
              type="month"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold text-white"
            />
          )}
          {bulkField === 'filial' && (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold text-white"
            >
              <option value="" className="text-gray-900 bg-white">Selecionar filial...</option>
              {filterOptions.filiais.map(f => <option key={f.label} value={f.label} className="text-gray-900 bg-white">{f.label}</option>)}
            </select>
          )}
          {bulkField === 'conta_contabil' && (
            <>
              <input
                list="bulk-conta-list"
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                placeholder="Código da conta..."
                className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold text-white placeholder:text-white/50 w-[160px]"
              />
              <datalist id="bulk-conta-list">
                {contaContabilData.map(c => (
                  <option key={c.cod_conta} value={c.cod_conta}>
                    {c.nome_nat_orc ? `${c.cod_conta} — ${c.nome_nat_orc}` : c.cod_conta}
                  </option>
                ))}
              </datalist>
            </>
          )}
          {bulkField === 'recurring' && (
            <select
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold text-white"
            >
              <option value="" className="text-gray-900 bg-white">Selecionar...</option>
              <option value="Sim" className="text-gray-900 bg-white">Sim</option>
              <option value="Não" className="text-gray-900 bg-white">Não</option>
            </select>
          )}
          <div className="h-4 w-px bg-white/30 shrink-0" />
          <input
            type="text"
            placeholder="Justificativa (obrigatório)"
            value={bulkJustification}
            onChange={e => setBulkJustification(e.target.value)}
            className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs font-bold text-white placeholder:text-white/50 min-w-[180px]"
          />
          <button
            onClick={handleBulkApply}
            disabled={!bulkValue || !bulkJustification.trim()}
            className="px-3 py-1 bg-white text-blue-700 rounded font-bold text-xs disabled:opacity-40 hover:bg-blue-50 transition-all shrink-0"
          >
            Enviar para Aprovação
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkValue(''); setBulkJustification(''); }}
            className="ml-auto text-xs opacity-60 hover:opacity-100 transition-all shrink-0"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-none">
        <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)] relative">
          <table className="w-full border-separate border-spacing-0 text-left table-fixed min-w-[900px]">
            <thead>
              <tr className="whitespace-nowrap">
                <th className="sticky top-0 z-[60] bg-[#1B75BB] w-8 px-2 border-b border-white/10">
                  <input
                    type="checkbox"
                    checked={filteredAndSorted.length > 0 && filteredAndSorted.every(t => selectedIds.has(t.id))}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && !filteredAndSorted.every(t => selectedIds.has(t.id)); }}
                    onChange={e => {
                      if (e.target.checked) setSelectedIds(new Set(filteredAndSorted.map(t => t.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColDefs.map(colDef => {
                  if (colDef.key === 'acoes') {
                    return (
                      <th key="acoes" style={{ paddingTop: dc.headerPy, paddingBottom: dc.headerPy }} className="sticky top-0 z-[60] bg-[#1B75BB] text-white text-center w-[65px] border-b border-white/10 px-1 py-1.5 uppercase text-[8px] font-black">Ações</th>
                    );
                  }
                  return (
                    <HeaderCell
                      key={colDef.key}
                      label={colDef.headerLabel}
                      sortKey={colDef.key}
                      config={sortConfig}
                      setConfig={setSortConfig}
                      align={colDef.align}
                      className={colDef.className}
                      headerPy={dc.headerPy}
                    />
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={visibleColDefs.length + 1} className="py-20">
                    <div className="text-center">
                      {!hasSearchedTransactions ? (
                        <>
                          <Search size={48} className="mx-auto text-[#1B75BB] mb-4" />
                          <p className="text-gray-700 font-black text-base mb-2">Configure os filtros e clique em "Buscar Dados"</p>
                          <p className="text-gray-400 text-xs mt-2">Aplique filtros de período, marca, filial ou outros campos para buscar os lançamentos</p>
                          <button
                            onClick={() => handleSearchData()}
                            disabled={isSearching}
                            className="mt-4 px-6 py-3 bg-[#1B75BB] text-white rounded-xl text-sm font-black uppercase hover:bg-[#152e55] transition-all shadow-lg disabled:opacity-50"
                          >
                            {isSearching ? 'Buscando...' : 'Buscar Dados'}
                          </button>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-500 font-bold text-sm">Nenhum lançamento encontrado</p>
                          <p className="text-gray-400 text-xs mt-2">Ajuste os filtros e busque novamente</p>
                          <div className="flex gap-2 justify-center mt-4">
                            {isAnyFilterActive && (
                              <button
                                onClick={handleClearAllFilters}
                                className="px-4 py-2 bg-[#F44C00] text-white rounded-xl text-xs font-black uppercase hover:bg-[#d44200] transition-all"
                              >
                                Limpar Filtros
                              </button>
                            )}
                            <button
                              onClick={() => handleSearchData()}
                              disabled={isSearching}
                              className="px-4 py-2 bg-[#1B75BB] text-white rounded-xl text-xs font-black uppercase hover:bg-[#152e55] transition-all disabled:opacity-50"
                            >
                              Buscar Novamente
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredAndSorted.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-blue-50/50 transition-colors border-b border-gray-50"
                  >
                    <td className="w-8 px-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(t.id) ? next.delete(t.id) : next.add(t.id);
                          return next;
                        })}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColDefs.map(colDef => {
                      const tdS = { paddingTop: dc.cellPy, paddingBottom: dc.cellPy, paddingLeft: dc.cellPx, paddingRight: dc.cellPx };
                      const bgS = { paddingTop: dc.badgePy, paddingBottom: dc.badgePy, paddingLeft: dc.badgePx, paddingRight: dc.badgePx };
                      const btS = { padding: dc.btnP };
                      switch (colDef.key) {
                        case 'scenario':    return <td key="scenario"    style={tdS} className="border-r border-gray-100 text-center whitespace-nowrap overflow-hidden"><span style={bgS} className="rounded-none text-[8px] font-black uppercase border bg-blue-50 text-blue-700">{t.scenario || 'Real'}</span></td>;
                        case 'date':        return <td key="date"        style={tdS} className="text-[8px] font-mono text-gray-500 border-r border-gray-100 whitespace-nowrap overflow-hidden">{formatDateToMMAAAA(t.date)}</td>;
                        case 'tag0':        return <td key="tag0"        style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate">{t.tag0 || '-'}</td>;
                        case 'tag01':       return <td key="tag01"       style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate">{t.tag01 || '-'}</td>;
                        case 'tag02':       return <td key="tag02"       style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate">{t.tag02 || '-'}</td>;
                        case 'tag03':       return <td key="tag03"       style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate">{t.tag03 || '-'}</td>;
                        case 'category':    return <td key="category"    style={tdS} className="text-[8px] font-black text-[#F44C00] border-r border-gray-100 uppercase truncate">{t.conta_contabil}</td>;
                        case 'marca':       return <td key="marca"       style={tdS} className="text-[8px] font-black text-[#1B75BB] border-r border-gray-100 uppercase truncate">{t.marca || 'SAP'}</td>;
                        case 'filial':      return <td key="filial"      style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate">{t.filial}</td>;
                        case 'ticket':      return (
                          <td key="ticket" style={tdS} className="text-[8px] font-mono border-r border-gray-100 truncate">
                            {t.ticket ? (
                              <a href={`https://raizeducacao.zeev.it/report/main/?inpsearch=${t.ticket}`} target="_blank" rel="noopener noreferrer" className="text-[#1B75BB] font-black flex items-center gap-0.5 hover:underline active:scale-95">
                                {t.ticket} <ExternalLink size={8} />
                              </a>
                            ) : '-'}
                          </td>
                        );
                        case 'chave_id':    return <td key="chave_id"    style={tdS} className="text-[8px] font-black text-[#F44C00] border-r border-gray-100 uppercase truncate">{t.chave_id || '-'}</td>;
                        case 'vendor':      return <td key="vendor"      style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate" title={t.vendor}>{t.vendor || '-'}</td>;
                        case 'description': return <td key="description" style={tdS} className="text-[8px] font-bold text-gray-600 border-r border-gray-100 uppercase truncate" title={t.description}>{t.description}</td>;
                        case 'amount':      return (
                          <td key="amount" style={tdS} className={`text-[8px] font-mono font-black text-right border-r border-gray-100 ${t.type === 'REVENUE' ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                        case 'status':      return (
                          <td key="status" style={tdS} className="text-center border-r border-gray-100">
                            <span style={bgS} className={`rounded-none text-[8px] font-black uppercase border ${
                              t.status === 'Pendente' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              t.status === 'Ajustado' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              t.status === 'Rateado' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                              t.status === 'Excluído' ? 'bg-red-50 text-red-600 border-red-200' :
                              'bg-gray-50 text-gray-400 border-gray-200'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        );
                        case 'recurring': return (
                          <td key="recurring" style={tdS} className="text-center border-r border-gray-100">
                            <span style={bgS} className={`rounded-none text-[8px] font-black uppercase border ${
                              (t.recurring || 'Sim') === 'Sim'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-gray-50 text-gray-400 border-gray-200'
                            }`}>
                              {t.recurring || 'Sim'}
                            </span>
                          </td>
                        );
                        case 'acoes': {
                          const canEdit = activeTab === 'real' || userRole === 'admin';
                          return (
                          <td key="acoes" style={tdS} className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={canEdit ? () => setEditingTransaction(t) : undefined}
                                disabled={!canEdit}
                                title={canEdit ? 'Solicitar ajuste' : 'Apenas administradores podem solicitar ajustes em Orçado e A-1'}
                                style={btS}
                                className={canEdit
                                  ? "text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-100 active:scale-90 transition-all"
                                  : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60"}
                              ><Edit3 size={12}/></button>
                              <button
                                onClick={canEdit ? () => setRateioTransaction(t) : undefined}
                                disabled={!canEdit}
                                title={canEdit ? 'Rateio' : 'Apenas administradores podem fazer rateio em Orçado e A-1'}
                                style={btS}
                                className={canEdit
                                  ? "text-[#F44C00] bg-amber-50 hover:bg-amber-100 border border-amber-100 active:scale-90 transition-all"
                                  : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60"}
                              ><GitFork size={12}/></button>
                            </div>
                          </td>
                          );
                        }
                        default: return null;
                      }
                    })}
                  </tr>
                ))}
            </tbody>
          </table>

          <table className="w-full border-separate border-spacing-0 text-left table-fixed min-w-[900px]">
            <tfoot className="sticky bottom-0 z-50 bg-[#152e55] text-white">
              <tr className="h-10 border-t border-white/20 whitespace-nowrap">
                <td colSpan={visibleColDefs.length + 1} className="px-4 text-[10px] font-black uppercase tracking-widest bg-[#152e55]">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <ListOrdered size={14} className="text-[#4AC8F4]" />
                       <span>ITENS: <span className="text-[#4AC8F4]">{filteredAndSorted.length}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Calculator size={14} className="text-[#4AC8F4]" />
                       <span>TOTAL: <span className="text-[#4AC8F4]">R$ {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* --- MODAL DE SOLICITAÇÃO DE AJUSTE --- */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white shadow-2xl w-full h-full md:h-[80vh] md:max-w-5xl flex flex-col overflow-hidden rounded-none">
            <div className="bg-[#F44C00] p-3 md:p-4 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 min-w-0">
                 <Edit3 size={18} className="shrink-0" />
                 <h3 className="text-xs md:text-sm font-black uppercase truncate">Solicitar Ajuste: {editingTransaction.ticket || 'AVULSO'}</h3>
               </div>
               <button onClick={() => setEditingTransaction(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 rounded"><X size={20} /></button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="lg:w-1/3 bg-gray-50 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-y-auto space-y-4">
                 <div className="bg-white p-4 border border-gray-100 shadow-sm space-y-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Contexto do Lançamento</p>
                    <p className="text-[10px] font-bold text-gray-900 leading-tight">{editingTransaction.description}</p>
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                       <span className="text-[8px] font-black text-gray-400 uppercase">Valor Atual</span>
                       <span className="text-sm font-black text-[#F44C00]">R$ {editingTransaction.amount.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
              <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-white">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-black text-gray-500 uppercase">Nova Competência</label>
                        <DeParaVisualizer oldValue={editingTransaction.date} newValue={editForm.date} labelFormatter={formatDateToMMAAAA} />
                      </div>
                      <input type="month" value={editForm.date.substring(0, 7)} onChange={e => setEditForm({...editForm, date: `${e.target.value}-01`})} className="w-full border border-gray-200 p-2 text-[10px] font-black outline-none focus:border-[#F44C00] bg-gray-50/30" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-black text-gray-500 uppercase">Nova Unidade</label>
                        <DeParaVisualizer oldValue={editingTransaction.nome_filial || editingTransaction.filial} newValue={editForm.filial} />
                      </div>
                      <select value={editForm.filial} onChange={e => {
                        const selected = filterOptions.filiais.find(f => f.label === e.target.value);
                        setEditForm({...editForm, filial: e.target.value, filial_code: selected?.filialCodes[0] || editForm.filial_code, marca: selected?.cia || editForm.marca});
                      }} className="w-full border border-gray-200 p-2 text-[10px] font-black outline-none focus:border-[#F44C00] bg-gray-50/30">
                        <option value="">Selecionar unidade...</option>
                        {filterOptions.filiais.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-black text-gray-500 uppercase">Marca</label>
                        <DeParaVisualizer oldValue={editingTransaction.marca} newValue={editForm.marca} />
                      </div>
                      <input
                        type="text"
                        value={editForm.marca || ''}
                        readOnly
                        title="Marca atualizada automaticamente ao trocar a filial"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-black text-gray-500 uppercase">Nova Conta Contábil</label>
                        <DeParaVisualizer oldValue={editingTransaction.conta_contabil || editingTransaction.category} newValue={editForm.category} />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 border border-gray-200 p-2 text-[10px] font-black bg-gray-50/30 truncate min-h-[34px]">
                          {editForm.categoryLabel || editForm.category || '—'}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const data = await getContaContabilOptions();
                            setContaContabilData(data);
                            setContaSelectorOpen(true);
                          }}
                          className="px-3 py-2 bg-[#F44C00] text-white text-[9px] font-black uppercase whitespace-nowrap"
                        >
                          Selecionar
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-black text-gray-500 uppercase">Status de Recorrência</label>
                        <DeParaVisualizer oldValue={editingTransaction.recurring || 'Sim'} newValue={editForm.recurring} />
                      </div>
                      <select value={editForm.recurring} onChange={e => setEditForm({...editForm, recurring: e.target.value})} className="w-full border border-gray-200 p-2 text-[10px] font-black outline-none focus:border-[#F44C00] bg-gray-50/30">
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Chave ID</label>
                      <input
                        type="text"
                        value={editForm.chave_id || ''}
                        onChange={e => setEditForm({...editForm, chave_id: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        disabled={true}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1 pt-4">
                      <label className="text-[8px] font-black text-[#F44C00] uppercase">Justificativa da Solicitação (Obrigatório)</label>
                      <textarea value={editForm.justification} onChange={e => setEditForm({...editForm, justification: e.target.value})} placeholder="Explique o motivo deste ajuste para aprovação da diretoria..." className="w-full border border-gray-200 p-3 text-[10px] font-bold h-32 outline-none focus:border-[#F44C00] bg-gray-50/10" />
                    </div>
                 </div>
                 <div className="mt-6 md:mt-8 flex gap-3 md:gap-4">
                    <button onClick={() => setEditingTransaction(null)} className="flex-1 py-3 min-h-[44px] bg-gray-100 text-gray-500 font-black text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleSubmitAjuste} disabled={!editForm.justification.trim()} className="flex-[2] py-3 min-h-[44px] bg-[#F44C00] text-white font-black text-[10px] uppercase shadow-lg disabled:opacity-50">Enviar p/ Aprovação</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE RATEIO ESTRUTURAL --- */}
      {rateioTransaction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white shadow-2xl w-full h-full md:h-[80vh] md:max-w-5xl flex flex-col overflow-hidden rounded-none">
            <div className="bg-[#1B75BB] p-3 md:p-4 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2 min-w-0">
                 <Split size={18} className="shrink-0" />
                 <h3 className="text-xs md:text-sm font-black uppercase truncate">Rateio Estrutural: {rateioTransaction.ticket || 'AVULSO'}</h3>
               </div>
               <button onClick={() => setRateioTransaction(null)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 rounded"><X size={20} /></button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
               <div className="lg:w-1/4 bg-gray-50 p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-gray-100 space-y-4">
                  <div className="bg-white p-4 border border-gray-100 shadow-sm">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Montante Original</p>
                    <p className="text-xl font-black text-gray-900">R$ {rateioTransaction.amount.toLocaleString()}</p>
                  </div>
                  <div className={`p-4 border-2 transition-all ${isRateioFullyAllocated ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-rose-200'}`}>
                    <p className={`text-[8px] font-black uppercase mb-1 ${isRateioFullyAllocated ? 'text-emerald-700' : 'text-rose-700'}`}>Status do Saldo</p>
                    {isRateioFullyAllocated ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                         <CheckCircle2 size={14} />
                         <span className="text-[10px] font-black">100% DISTRIBUÍDO</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                         <p className="text-lg font-black text-rose-600">R$ {Math.abs(remainingRateio).toLocaleString()}</p>
                         <p className="text-[7px] font-black text-rose-400 uppercase">Pendente</p>
                      </div>
                    )}
                  </div>
               </div>
               <div className="flex-1 p-4 md:p-6 bg-white overflow-y-auto">
                  <div className="space-y-2">
                    {rateioParts.map((part) => (
                      <div key={part.id} className="grid grid-cols-6 md:grid-cols-12 gap-2 bg-gray-50 p-2 border border-gray-100 items-center">
                         <div className="col-span-3">
                           <select value={part.filial} onChange={e => {
                             const opt = filterOptions.filiais.find(f => f.label === e.target.value);
                             updateRateioPart(part.id, {
                               filial: e.target.value,
                               filial_code: opt?.filialCodes[0] || e.target.value,
                               marca: opt?.cia || part.marca,
                             });
                           }} className="w-full bg-white border border-gray-100 p-1.5 text-[8px] font-black outline-none focus:border-[#1B75BB]">
                             {filterOptions.filiais.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
                           </select>
                         </div>
                         <div className="col-span-3">
                            <input type="month" value={part.date.substring(0, 7)} onChange={e => updateRateioPart(part.id, { date: `${e.target.value}-01` })} className="w-full bg-white border border-gray-100 p-1.5 text-[8px] font-black outline-none focus:border-[#1B75BB]" />
                         </div>
                         <div className="col-span-3 relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[7px] text-gray-300 font-black">R$</span>
                            <input type="number" value={part.amount} onChange={e => {
                              const val = Number(e.target.value);
                              updateRateioPart(part.id, { amount: val, percent: Number(((val / rateioTransaction.amount) * 100).toFixed(2)) });
                            }} className="w-full bg-white border border-gray-100 p-1.5 pl-5 text-[8px] font-black outline-none focus:border-[#1B75BB]" />
                         </div>
                         <div className="col-span-2 relative">
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] text-gray-300 font-black">%</span>
                            <input type="number" value={part.percent} onChange={e => {
                              const perc = Number(e.target.value);
                              updateRateioPart(part.id, { percent: perc, amount: Number(((rateioTransaction.amount * perc) / 100).toFixed(2)) });
                            }} className="w-full bg-white border border-gray-100 p-1.5 text-[8px] font-black outline-none focus:border-[#1B75BB]" />
                         </div>
                         <div className="col-span-1 flex justify-center">
                            <button onClick={() => setRateioParts(prev => prev.filter(p => p.id !== part.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12}/></button>
                         </div>
                      </div>
                    ))}
                    <button onClick={() => {
                      const firstFilial = filterOptions.filiais[0];
                      setRateioParts([...rateioParts, {
                        id: `p-${Date.now()}`,
                        filial: firstFilial?.label || '',
                        filial_code: firstFilial?.filialCodes[0] || '',
                        marca: firstFilial?.cia || '',
                        amount: 0, percent: 0,
                        date: rateioTransaction.date,
                        category: rateioTransaction.category
                      }]);
                    }} className="w-full py-2.5 border-2 border-dashed border-gray-100 text-gray-300 hover:text-[#1B75BB] hover:border-[#1B75BB]/30 transition-all font-black text-[8px] uppercase flex items-center justify-center gap-2">
                      <PlusCircle size={12} /> Adicionar Linha
                    </button>
                    <div className="pt-6 space-y-2">
                       <label className="text-[8px] font-black text-blue-700 uppercase">Motivo do Rateio (Obrigatório)</label>
                       <textarea value={rateioJustification} onChange={e => setRateioJustification(e.target.value)} placeholder="Descreva o critério utilizado para este rateio..." className="w-full border border-gray-100 p-3 text-[10px] font-bold h-24 outline-none focus:border-[#1B75BB] bg-gray-50/20" />
                    </div>
                  </div>
                  <div className="mt-6 md:mt-8 flex gap-3 md:gap-4">
                    <button onClick={() => setRateioTransaction(null)} className="flex-1 py-3 min-h-[44px] bg-gray-100 text-gray-500 font-black text-[10px] uppercase">Cancelar</button>
                    <button onClick={handleSubmitRateio} disabled={!isRateioFullyAllocated || !rateioJustification.trim()} className="flex-[2] py-3 min-h-[44px] bg-[#1B75BB] text-white font-black text-[10px] uppercase shadow-lg disabled:opacity-50">Confirmar Rateio</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO "BUSCAR TUDO" --- */}
      {showSearchAllModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-[95vw] md:w-full p-4 md:p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 mb-2">
                  ⚠️ Buscar Todos os Dados?
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p className="font-bold">
                    Esta ação vai buscar <span className="text-amber-600 font-black">TODOS os registros</span> do banco de dados que correspondem aos filtros aplicados.
                  </p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                    <p className="text-xs font-bold text-amber-800">
                      <strong>⚠️ ATENÇÃO:</strong> Se você não aplicou filtros de período, marca ou filial, a busca pode retornar <strong>+100 mil registros</strong> e causar lentidão ou travamento!
                    </p>
                  </div>
                  <p className="text-xs font-semibold">
                    <strong>Recomendação:</strong> Aplique filtros (período, marca, filial) antes de buscar todos os dados para melhor performance.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs">
                    <p className="font-bold text-blue-900 mb-1">Filtros atualmente aplicados:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      {colFilters.monthFrom && <li>Período: {colFilters.monthFrom} a {colFilters.monthTo || 'hoje'}</li>}
                      {colFilters.marca && colFilters.marca.length > 0 && <li>Marca: {colFilters.marca.join(', ')}</li>}
                      {colFilters.nome_filial && colFilters.nome_filial.length > 0 && <li>Filial: {colFilters.nome_filial.join(', ')}</li>}
                      {!colFilters.monthFrom && (!colFilters.marca || colFilters.marca.length === 0) && (!colFilters.nome_filial || colFilters.nome_filial.length === 0) && (
                        <li className="text-amber-600 font-black">⚠️ Nenhum filtro aplicado!</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSearchAllModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSearchAll}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-black text-sm hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Confirmar Busca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Conta Contábil - fora dos modais para evitar stacking context do backdrop-blur */}
      <ContaContabilSelector
        isOpen={contaSelectorOpen}
        onClose={() => setContaSelectorOpen(false)}
        onSelect={(codConta, label) => {
          const conta = contaContabilData.find(c => c.cod_conta === codConta);
          setEditForm(prev => ({
            ...prev,
            category: codConta,
            categoryLabel: label,
            tag01: conta?.tag01 || '',
            tag02: conta?.tag02 || '',
            tag03: conta?.tag03 || '',
            nat_orc: conta?.tag03 || ''
          }));
        }}
        currentValue={editForm.category}
        contas={contaContabilData}
      />
    </div>
  );
};

const MultiSelectFilter = React.memo(({ id, label, options, selected, active, isOpen, onToggle, onClear, onToggleItem, onSelectMultiple }: {
  id: string; label: string; options: (string | { value: string; label: string })[]; selected: string[]; active: boolean;
  isOpen: boolean; onToggle: () => void; onClear: () => void; onToggleItem: (val: string) => void; onSelectMultiple: (vals: string[]) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalizar opções para { value, label }
  const normalizedOptions = useMemo(() =>
    options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt)
  , [options]);

  const summaryLabel = useMemo(() => {
    if (selected.length === 0) return "Todos";
    if (selected.length === 1) {
      const found = normalizedOptions.find(o => o.value === selected[0]);
      return found ? found.label : selected[0];
    }
    return `${selected.length} Sel.`;
  }, [selected, normalizedOptions]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Limpar busca ao fechar e focar ao abrir
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <div className="space-y-0.5 relative multi-select-container">
      <label className="text-[6.5px] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</label>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className={`w-full flex items-center justify-between border p-1 rounded-none text-[8px] font-black transition-all ${active ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-gray-50 border-gray-100'}`}
      >
        <span className="truncate pr-1 uppercase">{summaryLabel}</span>
        <ChevronDown size={8} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 z-[150] w-[calc(100vw-2rem)] sm:w-[220px] max-w-[220px] bg-white border border-gray-200 shadow-2xl mt-1 p-2 animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-50">
            <div className="flex items-center gap-1">
              <span className="text-[7px] font-black text-gray-400 uppercase">Filtro: {label}</span>
              {searchTerm && (
                <span className="text-[7px] font-bold text-[#1B75BB] bg-blue-50 px-1 rounded">
                  {filteredOptions.length}
                </span>
              )}
            </div>
            <button onMouseDown={(e) => { e.preventDefault(); onClear(); }} className="text-[7px] font-black text-rose-500 uppercase hover:underline">Limpar</button>
          </div>

          <div className="mb-1.5 relative">
            <div className="flex items-center gap-1 border border-gray-200 rounded-sm bg-gray-50 px-1.5 py-1 focus-within:border-[#1B75BB] focus-within:ring-1 focus-within:ring-[#1B75BB]">
              <Search size={10} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 text-[8px] font-bold bg-transparent outline-none"
              />
              {searchTerm && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setSearchTerm(''); searchInputRef.current?.focus(); }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {filteredOptions.length > 0 && filteredOptions.length < normalizedOptions.length && (
            <div className="mb-1 pb-1 border-b border-gray-50">
              <button
                onMouseDown={(e) => { e.preventDefault(); onSelectMultiple(filteredOptions.map(o => o.value)); }}
                className="w-full px-1.5 py-0.5 text-[7px] font-black text-[#1B75BB] hover:bg-blue-50 rounded-sm transition-colors uppercase"
              >
                Selecionar Resultados ({filteredOptions.length})
              </button>
            </div>
          )}

          <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-3 text-[8px] text-gray-400 font-bold">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onMouseDown={(e) => { e.preventDefault(); onToggleItem(opt.value); }}
                    className={`w-full flex items-center gap-2 px-1.5 py-1 text-left rounded-sm transition-colors ${isChecked ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className={isChecked ? 'text-yellow-600' : 'text-gray-300'}>
                      {isChecked ? <CheckSquare size={10} /> : <Square size={10} />}
                    </div>
                    <span className={`text-[8px] font-bold uppercase truncate ${isChecked ? 'text-yellow-800' : 'text-gray-600'}`}>{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const HeaderCell = ({ label, sortKey, config, setConfig, align = 'left', className = '', headerPy }: any) => {
  const isSorted = config.key === sortKey;
  const padStyle = headerPy !== undefined ? { paddingTop: headerPy, paddingBottom: headerPy } : undefined;
  return (
    <th
      onClick={() => setConfig({ key: sortKey, direction: isSorted && config.direction === 'asc' ? 'desc' : 'asc' })}
      style={padStyle}
      className={`sticky top-0 z-[60] bg-[#1B75BB] text-white text-left border-b border-white/10 border-r border-white/20 px-2 py-2.5 cursor-pointer hover:bg-[#152e55] transition-colors whitespace-nowrap ${className}`}
    >
      <div className={`flex items-center gap-0.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span className="text-[8px] font-black uppercase tracking-tighter truncate leading-none">{label}</span>
        <span className={`flex flex-col leading-none ${isSorted ? 'opacity-100' : 'opacity-30'}`}>
          <svg width="7" height="4" viewBox="0 0 7 4" className={`${isSorted && config.direction === 'asc' ? 'text-yellow-300' : 'text-white/60'}`}>
            <path d="M3.5 0L7 4H0L3.5 0Z" fill="currentColor"/>
          </svg>
          <svg width="7" height="4" viewBox="0 0 7 4" className={`${isSorted && config.direction === 'desc' ? 'text-yellow-300' : 'text-white/60'}`}>
            <path d="M3.5 4L0 0H7L3.5 4Z" fill="currentColor"/>
          </svg>
        </span>
      </div>
    </th>
  );
};

const FilterTextInput = ({ label, id, value, colFilters, setColFilters, className, debouncedSetFilter }: any) => (
  <div className={`space-y-0.5 ${className || ''}`}>
    <label className="text-[6.5px] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</label>
    <div className={`border p-1 rounded-none text-[8px] font-black transition-all ${value ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
      <input
        type="text"
        placeholder={label}
        className="w-full bg-transparent outline-none uppercase"
        defaultValue={value}
        onChange={e => debouncedSetFilter ? debouncedSetFilter(id, e.target.value) : setColFilters({...colFilters, [id]: e.target.value})}
      />
    </div>
  </div>
);

const SummaryCard: React.FC<{
  label: string;
  value: number;
  color: 'emerald' | 'orange' | 'blue' | 'teal' | 'rose';
  icon: React.ReactNode;
  change?: number;
}> = ({ label, value, color, icon, change }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700'
  };

  return (
    <div className={`border-2 rounded-lg p-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-black uppercase tracking-widest opacity-70">{label}</span>
        <div className="scale-75">{icon}</div>
      </div>
      <p className="text-base font-black mb-0">
        R$ {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-0.5 text-[8px] font-bold">
          {change >= 0 ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
