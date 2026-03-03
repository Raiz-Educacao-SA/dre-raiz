import { supabase, DatabaseTransaction, DatabaseManualChange } from '../supabase';
import { Transaction, ManualChange, PaginationParams, PaginatedResponse, ContaContabilOption, DreAnalysis } from '../types';
import { addPermissionFiltersToObject, applyPermissionFilters } from './permissionsService';
import { debug } from '../utils/logger';
import { z } from 'zod';

// ── Zod schemas para validação de parâmetros RPC ──────────────────────────────
const MAX_ARRAY_LENGTH = 500;
const monthPattern = /^\d{4}-\d{2}$/;

const optionalMonth = z.string().regex(monthPattern).optional();
const optionalStringArray = z.array(z.string().max(200)).max(MAX_ARRAY_LENGTH).optional();
const optionalRecurring = z.enum(['Sim', 'Não']).optional();

const somaTagsParamsSchema = z.object({
  monthFrom: optionalMonth,
  monthTo: optionalMonth,
  marcas: optionalStringArray,
  nomeFiliais: optionalStringArray,
  tags02: optionalStringArray,
  tags01: optionalStringArray,
  recurring: optionalRecurring,
  tags03: optionalStringArray,
});

const transactionFiltersSchema = z.object({
  monthFrom: optionalMonth,
  monthTo: optionalMonth,
  marca: optionalStringArray,
  filial: optionalStringArray,
  nome_filial: optionalStringArray,
  tag0: optionalStringArray,
  tag01: optionalStringArray,
  tag02: optionalStringArray,
  tag03: optionalStringArray,
  category: optionalStringArray,
  conta_contabil: optionalStringArray,
  ticket: z.string().max(200).optional(),
  chave_id: z.string().max(200).optional(),
  vendor: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  amount: z.string().max(50).optional(),
  recurring: z.array(z.string().max(10)).max(10).optional(),
  status: z.array(z.string().max(30)).max(10).optional(),
  scenario: z.string().max(30).optional(),
}).passthrough();

// Converter Transaction do app para formato do banco
// Remove campos que não existem na tabela: ticket, vendor, recurring, justification
const transactionToDb = (t: Transaction): DatabaseTransaction => {
  const dbTransaction: any = {
    id: t.id,
    date: t.date,
    description: t.description,
    conta_contabil: t.conta_contabil,  // Campo que popula coluna "Conta" na UI
    amount: t.amount,
    type: t.type,
    scenario: t.scenario || 'Orçado',
    status: t.status,
    filial: t.filial
  };

  // Adicionar campos opcionais apenas se existirem
  if (t.category) dbTransaction.category = t.category;  // Reservado para futuro
  if (t.marca) dbTransaction.marca = t.marca;
  // tag0 NÃO existe na tabela transactions (resolvido via tag0_map JOIN)
  if (t.tag01) dbTransaction.tag01 = t.tag01;
  if (t.tag02) dbTransaction.tag02 = t.tag02;
  if (t.tag03) dbTransaction.tag03 = t.tag03;
  if (t.recurring) dbTransaction.recurring = t.recurring;
  if (t.ticket) dbTransaction.ticket = t.ticket;
  if (t.vendor) dbTransaction.vendor = t.vendor;
  if (t.nat_orc) dbTransaction.nat_orc = t.nat_orc;
  if (t.chave_id) dbTransaction.chave_id = t.chave_id;

  return dbTransaction;
};

// Converter Transaction do banco para formato do app
const dbToTransaction = (db: DatabaseTransaction): Transaction => ({
  id: db.id,
  date: db.date,
  description: db.description,
  conta_contabil: db.conta_contabil,  // Campo que popula coluna "Conta" na UI
  category: db.category || undefined,  // Reservado para futuro
  amount: db.amount,
  type: db.type as any,
  scenario: db.scenario,
  status: db.status,
  filial: db.filial,
  marca: db.marca || undefined,
  tag0: db.tag0 || undefined,
  tag01: db.tag01 || undefined,
  tag02: db.tag02 || undefined,
  tag03: db.tag03 || undefined,
  recurring: db.recurring || undefined,  // Mantém o valor do banco (comparação case-insensitive no filtro)
  ticket: db.ticket || undefined,
  vendor: db.vendor || undefined,
  nat_orc: db.nat_orc || undefined,
  chave_id: db.chave_id || undefined,
  nome_filial: db.nome_filial || undefined,
  updated_at: db.updated_at || new Date().toISOString()  // Campo obrigatório para sync
});

// Converter ManualChange para formato do banco
const manualChangeToDb = (mc: ManualChange): DatabaseManualChange => {
  // Extrair justificativa - se não estiver direta, tentar extrair do newValue (para RATEIO)
  let justification = mc.justification || mc.description || '';

  debug('🔄 manualChangeToDb - Justification inicial:', {
    mcJustification: mc.justification,
    mcDescription: mc.description,
    justification
  });

  // Para RATEIO, a justificativa pode estar dentro do JSON do newValue
  if (!justification && mc.type === 'RATEIO') {
    try {
      const parsed = JSON.parse(mc.newValue);
      justification = parsed.justification || '';
      debug('🔄 manualChangeToDb - Justification extraída do newValue:', justification);
    } catch (e) {
      console.warn('⚠️ manualChangeToDb - Falha ao fazer parsing do newValue:', e);
    }
  }

  const finalJustification = justification || 'Sem justificativa';
  debug('✅ manualChangeToDb - Justification final:', finalJustification);

  return {
    id: mc.id,
    transaction_id: mc.transactionId,
    type: mc.type,
    field_changed: mc.fieldChanged || null,
    old_value: mc.oldValue || null,
    new_value: mc.newValue,
    justification: finalJustification,  // Garantir que nunca seja vazio
    status: mc.status,
    requested_at: mc.requestedAt,
    requested_by: mc.requestedBy,
    requested_by_name: mc.requestedByName,
    approved_at: mc.approvedAt || null,
    approved_by: mc.approvedBy || null,
    approved_by_name: mc.approvedByName,
    original_transaction: mc.originalTransaction
  };
};

// Converter ManualChange do banco para formato do app
const dbToManualChange = (db: DatabaseManualChange): ManualChange => ({
  id: db.id,
  transactionId: db.transaction_id,
  type: db.type as any,
  description: db.justification,  // Mapear justification para description
  fieldChanged: db.field_changed || undefined,
  oldValue: db.old_value || '',
  newValue: db.new_value,
  justification: db.justification,
  status: db.status as any,
  requestedAt: db.requested_at,
  requestedBy: db.requested_by,
  requestedByName: db.requested_by_name,
  approvedAt: db.approved_at || undefined,
  approvedBy: db.approved_by || undefined,
  approvedByName: db.approved_by_name,
  originalTransaction: db.original_transaction
});

// ========== LOOKUP TABLES (Filial + Tags) ==========

export interface FilialOption {
  cia: string;          // marca
  filialCodes: string[]; // todos os códigos de filial para esse grupo (vincula com transactions.filial)
  nomefilial: string;   // nome
  label: string;        // "CIA - NomeFilial" (pré-computado, unique)
}

export interface TagRecord {
  tag1: string;
  tag2: string;
  tag3: string;
}

// ========== TAG0 MAP (tag01 → tag0) ==========

export interface Tag0MapEntry {
  tag1_norm: string;
  tag0: string;
  tag1_raw: string;
}

let cachedTag0Map: Map<string, string> | null = null;

/**
 * Carrega tag0_map do Supabase e retorna Map<tag01_normalizado, tag0>
 * Normaliza: lowercase + trim para matching robusto
 */
export const getTag0Map = async (): Promise<Map<string, string>> => {
  if (cachedTag0Map) return cachedTag0Map;

  debug('🏷️ Carregando tag0_map...');
  const { data, error } = await supabase
    .from('tag0_map')
    .select('tag1_norm, tag0, tag1_raw');

  if (error) {
    console.error('❌ Erro ao carregar tag0_map:', error);
    return new Map();
  }

  cachedTag0Map = new Map();
  for (const row of data || []) {
    // Mapear tanto pela versão normalizada quanto pela raw
    if (row.tag1_norm) cachedTag0Map.set(row.tag1_norm.toLowerCase().trim(), row.tag0);
    if (row.tag1_raw) cachedTag0Map.set(row.tag1_raw.toLowerCase().trim(), row.tag0);
  }

  debug(`✅ ${cachedTag0Map.size} entradas de tag0_map carregadas`);
  return cachedTag0Map;
};

/**
 * Resolve tag0 a partir de tag01 usando o tag0_map cacheado
 */
export const resolveTag0 = (tag01: string | undefined | null, tag0Map: Map<string, string>): string | undefined => {
  if (!tag01 || tag0Map.size === 0) return undefined;
  const normalized = tag01.toLowerCase().trim();
  return tag0Map.get(normalized);
};

// Cache em variável do módulo (evita re-fetch desnecessário)
let cachedFiliais: FilialOption[] | null = null;
let cachedTagRecords: TagRecord[] | null = null;
let cachedTag0Options: string[] | null = null;

/**
 * 🔄 LIMPAR TODOS OS CACHES
 * Use depois de atualizar dados no banco (tag0_map, etc)
 */
export const clearAllCaches = () => {
  cachedFiliais = null;
  cachedTagRecords = null;
  cachedTag0Map = null;
  cachedTag0Options = null;
  cachedTag01Options = null;
  cachedTag02Options = null;
  cachedTag03Options = null;
  debug('🔄 TODOS OS CACHES LIMPOS - Próxima busca vai buscar do banco');
};

/**
 * Busca todas as opções de Tag0 disponíveis no banco (via tag0_map)
 * Retorna lista única e ordenada
 */
export const getTag0Options = async (): Promise<string[]> => {
  if (cachedTag0Options) return cachedTag0Options;

  debug('🏷️ Carregando opções de Tag0...');
  const { data, error } = await supabase
    .from('tag0_map')
    .select('tag0');

  if (error) {
    console.error('❌ Erro ao carregar tag0 options:', error);
    return [];
  }

  // Extrair valores únicos
  const uniqueTag0s = [...new Set(data?.map(row => row.tag0).filter(Boolean))].sort();
  cachedTag0Options = uniqueTag0s;

  debug(`✅ ${cachedTag0Options.length} opções de Tag0 carregadas`);
  return cachedTag0Options;
};

// Caches para opções de tags individuais
let cachedTag01Options: string[] | null = null;
let cachedTag02Options: string[] | null = null;
let cachedTag03Options: string[] | null = null;

/**
 * 🚀 RPC UNIFICADA — Busca DISTINCT tag01/tag02/tag03 em 1 chamada server-side
 * Substitui 3 full-table-scans (50K+ rows cada) por 1 RPC leve (~300-500 valores)
 */
export const getTransactionFilterOptions = async (): Promise<{
  tag01Options: string[];
  tag02Options: string[];
  tag03Options: string[];
}> => {
  // Se todos já estão cacheados, retornar direto
  if (cachedTag01Options && cachedTag02Options && cachedTag03Options) {
    return {
      tag01Options: cachedTag01Options,
      tag02Options: cachedTag02Options,
      tag03Options: cachedTag03Options,
    };
  }

  debug('🚀 RPC: Carregando filtros tag01/tag02/tag03 via get_transaction_filter_options...');
  const { data, error } = await supabase.rpc('get_transaction_filter_options');

  if (error) {
    console.error('❌ Erro na RPC get_transaction_filter_options:', error);
    return { tag01Options: [], tag02Options: [], tag03Options: [] };
  }

  cachedTag01Options = (data?.tag01 as string[]) || [];
  cachedTag02Options = (data?.tag02 as string[]) || [];
  cachedTag03Options = (data?.tag03 as string[]) || [];

  debug(`✅ RPC filtros: ${cachedTag01Options.length} tag01, ${cachedTag02Options.length} tag02, ${cachedTag03Options.length} tag03`);
  return {
    tag01Options: cachedTag01Options,
    tag02Options: cachedTag02Options,
    tag03Options: cachedTag03Options,
  };
};

/**
 * Busca todas as opções de Tag01 disponíveis no banco
 * Delega à RPC unificada (retrocompatível com SomaTagsView e AdminPanel)
 */
export const getTag01Options = async (): Promise<string[]> => {
  if (cachedTag01Options) return cachedTag01Options;
  const result = await getTransactionFilterOptions();
  return result.tag01Options;
};

/**
 * Busca todas as opções de Tag02 disponíveis no banco
 * Delega à RPC unificada (retrocompatível com SomaTagsView e AdminPanel)
 */
export const getTag02Options = async (): Promise<string[]> => {
  if (cachedTag02Options) return cachedTag02Options;
  const result = await getTransactionFilterOptions();
  return result.tag02Options;
};

/**
 * Retorna tag01 distintos que possuem os tag02s fornecidos (cascata reversa)
 */
export const getTag01sForTag02s = async (tags02: string[]): Promise<string[]> => {
  if (tags02.length === 0) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('tag01')
    .in('tag02', tags02)
    .not('tag01', 'is', null);
  if (error || !data) return [];
  return [...new Set(data.map(r => r.tag01).filter(Boolean) as string[])].sort();
};

/**
 * Retorna tag02 distintos apenas para os tag01s fornecidos (cascata)
 */
export const getTag02OptionsForTag01s = async (tags01: string[]): Promise<string[]> => {
  if (tags01.length === 0) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('tag02')
    .in('tag01', tags01)
    .not('tag02', 'is', null)
    .limit(10000);
  if (error || !data) return [];
  return [...new Set(data.map(r => r.tag02).filter(Boolean) as string[])].sort();
};

/**
 * Retorna tag03 distintos apenas para os tag02s fornecidos (cascata)
 */
export const getTag03OptionsForTag02s = async (tags02: string[]): Promise<string[]> => {
  if (tags02.length === 0) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('tag03')
    .in('tag02', tags02)
    .not('tag03', 'is', null)
    .limit(10000);
  if (error || !data) return [];
  return [...new Set(data.map(r => r.tag03).filter(Boolean) as string[])].sort();
};

/**
 * Busca todas as opções de Tag03 disponíveis no banco
 * Delega à RPC unificada (retrocompatível com SomaTagsView e AdminPanel)
 */
export const getTag03Options = async (): Promise<string[]> => {
  if (cachedTag03Options) return cachedTag03Options;
  const result = await getTransactionFilterOptions();
  return result.tag03Options;
};

/**
 * Retorna tag03 distintos para um array de tag01 (cascata tag01→tag03 via RPC)
 */
export const getTag03OptionsForTag01s = async (tags01: string[]): Promise<string[]> => {
  if (tags01.length === 0) return [];
  const { data, error } = await supabase.rpc('get_tag03_for_tag01s', { p_tag01s: tags01 });
  if (error) {
    console.error('❌ Erro na RPC get_tag03_for_tag01s:', error);
    return [];
  }
  return (data as string[]) || [];
};

export const getFiliais = async (): Promise<FilialOption[]> => {
  debug('🔍 [MARCA] getFiliais() CHAMADO');

  if (cachedFiliais) {
    debug('🔍 [MARCA] Retornando cache:', cachedFiliais.length, 'filiais');
    return cachedFiliais;
  }

  debug('🏢 [MARCA] Buscando tabela FILIAL no banco...');
  const { data, error } = await supabase
    .from('filial')
    .select('cia, filial, nomefilial')
    .order('cia', { ascending: true })
    .order('nomefilial', { ascending: true });

  if (error) {
    console.error('❌ [MARCA] ERRO ao carregar filiais:', error);
    return [];
  }

  debug('🔍 [MARCA] Dados brutos recebidos:', data?.length, 'registros');
  debug('🔍 [MARCA] Sample:', data?.slice(0, 3));

  // Agrupar por cia+nomefilial (label) → coletar todos os códigos de filial do grupo
  const groupMap = new Map<string, FilialOption>();
  for (const row of data || []) {
    const cia = row.cia || '';
    const nomefilial = row.nomefilial || '';
    const filialCode = row.filial || '';
    const label = `${cia} - ${nomefilial}`;

    if (!filialCode) continue;

    const existing = groupMap.get(label);
    if (existing) {
      if (!existing.filialCodes.includes(filialCode)) {
        existing.filialCodes.push(filialCode);
      }
    } else {
      groupMap.set(label, { cia, filialCodes: [filialCode], nomefilial, label });
    }
  }
  cachedFiliais = Array.from(groupMap.values());

  debug(`✅ [MARCA] ${cachedFiliais.length} filiais processadas`);
  debug('✅ [MARCA] CIAs únicas:', [...new Set(cachedFiliais.map(f => f.cia))]);
  return cachedFiliais;
};

export const getTagRecords = async (): Promise<TagRecord[]> => {
  if (cachedTagRecords) return cachedTagRecords;

  debug('🏷️ Carregando combinações de tags de transactions...');

  // Buscar DISTINCT tag01/tag02/tag03 direto da tabela transactions
  // (tabela tags está vazia — os dados vivem em transactions)
  const { data, error } = await supabase
    .from('transactions')
    .select('tag01, tag02, tag03')
    .not('tag01', 'is', null);

  if (error) {
    console.error('❌ Erro ao carregar tags:', error);
    return [];
  }

  // Extrair combinações únicas
  const seen = new Set<string>();
  cachedTagRecords = [];
  for (const row of data || []) {
    const key = `${row.tag01 || ''}|${row.tag02 || ''}|${row.tag03 || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      cachedTagRecords.push({
        tag1: row.tag01 || '',
        tag2: row.tag02 || '',
        tag3: row.tag03 || ''
      });
    }
  }

  debug(`✅ ${cachedTagRecords.length} combinações de tags carregadas`);
  return cachedTagRecords;
};

// ========== DRE AGGREGATED DATA (RPC) ==========

export interface DRESummaryRow {
  scenario: string;
  conta_contabil: string;
  year_month: string;  // 'YYYY-MM'
  tag0: string;
  tag01: string;
  tag02: string;
  tag03: string;
  tipo: string;        // type (REVENUE, FIXED_COST, etc.)
  marca: string;
  nome_filial: string;
  total_amount: number;
  tx_count: number;
}

export interface DREDimensionRow {
  dimension_value: string;
  year_month: string;
  total_amount: number;
}

export interface DREFilterOptions {
  marcas: string[];
  nome_filiais: string[];
  tags01: string[];
}

// ─── Dashboard RPC ────────────────────────────────────────────────────────────

/** Uma linha do retorno de get_dashboard_summary() */
export interface DashboardSummaryRow {
  marca: string;
  filial: string;
  scenario: string;
  tag0: string;
  tag01: string;
  month: number;       // 0 = Jan … 11 = Dez
  total_amount: number;
}

/**
 * Busca dados agregados do Dashboard no servidor via RPC.
 * Substitui o carregamento de 119k transações brutas por ~3-5k linhas agregadas.
 * Resultado é convertido em Transaction[] sintéticas para compatibilidade com
 * DashboardEnhanced sem necessidade de alterar o componente.
 */
export const getDashboardSummary = async (params: {
  year?: number;
  marcas?: string[];
  filiais?: string[];
}): Promise<DashboardSummaryRow[]> => {
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_year:    params.year    ?? new Date().getFullYear(),
    p_marcas:  params.marcas  && params.marcas.length  > 0 ? params.marcas  : null,
    p_filiais: params.filiais && params.filiais.length > 0 ? params.filiais : null,
  });

  if (error) {
    console.error('❌ getDashboardSummary RPC error:', error);
    throw error;
  }

  return (data as DashboardSummaryRow[]) || [];
};

/**
 * Converte DashboardSummaryRow[] em Transaction[] sintéticas.
 * Permite que o DashboardEnhanced receba dados agregados (RPC)
 * sem necessidade de qualquer mudança no componente.
 *
 * Cada linha vira uma Transaction com:
 *   - date  = primeiro dia do mês correspondente
 *   - amount = total_amount já somado no servidor
 *   - type  = inferido pelo prefixo de tag0
 */
export function dashboardSummaryToTransactions(
  rows: DashboardSummaryRow[],
  year: number = new Date().getFullYear()
): Transaction[] {
  return rows.map((row, idx) => {
    const monthStr = String(row.month + 1).padStart(2, '0');
    const date = `${year}-${monthStr}-01`;

    // Mapear tag0 → TransactionType
    let type: Transaction['type'] = 'FIXED_COST';
    if (row.tag0.startsWith('01.'))      type = 'REVENUE';
    else if (row.tag0.startsWith('02.')) type = 'VARIABLE_COST';
    else if (row.tag0.startsWith('03.')) type = 'FIXED_COST';
    else if (row.tag0.startsWith('04.')) type = 'SGA';
    else if (row.tag0.startsWith('05.')) type = 'RATEIO';

    return {
      id: `synthetic-${idx}`,
      date,
      amount: row.total_amount,
      type,
      scenario: row.scenario,
      marca: row.marca || undefined,
      filial: row.filial || '',
      tag0: row.tag0 || undefined,
      tag01: row.tag01 || undefined,
      description: '',
      conta_contabil: '',
      status: 'Normal',
      updated_at: new Date().toISOString(),
    } as Transaction;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buscar resumo DRE agregado no servidor (1 API call, ~500-2000 linhas)
 * Substitui o carregamento de 119k transações brutas
 */
export const getDRESummary = async (params: {
  monthFrom?: string;
  monthTo?: string;
  marcas?: string[];
  nomeFiliais?: string[];  // ✅ Labels completas: ["GT - Bosque", "QI - Central"]
  tags01?: string[];
}): Promise<DRESummaryRow[]> => {
  debug('📊 getDRESummary: Buscando dados agregados...', params);

  const rpcParams = {
    p_month_from: params.monthFrom || null,
    p_month_to: params.monthTo || null,
    p_marcas: params.marcas && params.marcas.length > 0 ? params.marcas : null,
    p_nome_filiais: params.nomeFiliais && params.nomeFiliais.length > 0 ? params.nomeFiliais : null,
    p_tags01: params.tags01 && params.tags01.length > 0 ? params.tags01 : null,
  };

  debug('🔍 RPC params sendo enviados:', rpcParams);

  // ⏱️ Adicionar timeout de 30 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const { data, error } = await supabase
      .rpc('get_dre_summary', rpcParams)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      console.error('❌ Erro ao buscar DRE summary:', error);
      return [];
    }

    debug(`✅ getDRESummary: ${data?.length || 0} linhas agregadas retornadas`);

    // Se retornou 0 linhas com filtros, pode ser problema de matching
    if (data?.length === 0 && (rpcParams.p_marcas || rpcParams.p_nome_filiais || rpcParams.p_tags01)) {
      console.warn('⚠️ ATENÇÃO: Filtros aplicados mas nenhum resultado retornado!');
      console.warn('🔍 Verifique se os valores dos filtros correspondem exatamente ao banco de dados');
    }

    return (data || []) as DRESummaryRow[];
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('❌ TIMEOUT: Consulta demorou mais de 30 segundos!');
      alert('⏱️ Timeout: A consulta está demorando muito. Tente aplicar mais filtros (Marca ou Filial) para reduzir a quantidade de dados.');
    } else {
      console.error('❌ Erro ao buscar DRE summary:', err);
    }
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export interface SomaTagsRow {
  tag0: string;
  tag01: string;
  scenario: string;
  month: string;   // 'YYYY-MM'
  total: number;
}

/**
 * Busca soma por tag0+tag01+scenario (RPC leve para diagnóstico)
 * Muito mais rápido que get_dre_summary pois agrupa menos colunas
 * Cache com TTL de 60s para evitar re-fetches repetidos
 */
const _somaTagsCache: Record<string, { data: SomaTagsRow[]; ts: number }> = {};
const SOMA_TAGS_TTL = 60_000; // 60 segundos

export const getSomaTags = async (
  monthFrom?: string,
  monthTo?: string,
  marcas?: string[],
  nomeFiliais?: string[],
  tags02?: string[],
  tags01?: string[],
  recurring?: string,
  tags03?: string[],
): Promise<SomaTagsRow[]> => {
  // Validar parâmetros antes de enviar ao RPC
  const parsed = somaTagsParamsSchema.safeParse({ monthFrom, monthTo, marcas, nomeFiliais, tags02, tags01, recurring, tags03 });
  if (!parsed.success) {
    console.error('❌ getSomaTags: parâmetros inválidos', parsed.error.issues);
    return [];
  }
  // Cache: gerar chave determinística a partir dos params
  const cacheKey = JSON.stringify([monthFrom, monthTo, marcas?.sort(), nomeFiliais?.sort(), tags02?.sort(), tags01?.sort(), recurring, tags03?.sort()]);
  const cached = _somaTagsCache[cacheKey];
  if (cached && Date.now() - cached.ts < SOMA_TAGS_TTL) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s para evitar abort prematuro
  try {
    const { data, error } = await supabase
      .rpc('get_soma_tags', {
        p_month_from:   monthFrom   || null,
        p_month_to:     monthTo     || null,
        p_marcas:       marcas      && marcas.length      > 0 ? marcas      : null,
        p_nome_filiais: nomeFiliais && nomeFiliais.length > 0 ? nomeFiliais : null,
        p_tags02:       tags02      && tags02.length      > 0 ? tags02      : null,
        p_tags01:       tags01      && tags01.length      > 0 ? tags01      : null,
        p_recurring:    recurring   || null,
        p_tags03:       tags03      && tags03.length      > 0 ? tags03      : null,
      })
      .abortSignal(controller.signal);
    clearTimeout(timeoutId);
    if (error) {
      console.error('❌ Erro ao buscar soma tags:', error);
      throw new Error(error.message || 'Erro ao buscar dados da DRE');
    }
    const result = (data || []) as SomaTagsRow[];
    // Só cachear resultados com dados (evita cachear resposta vazia por erro)
    if (result.length > 0) {
      _somaTagsCache[cacheKey] = { data: result, ts: Date.now() };
    }
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.error('❌ getSomaTags timeout (45s)');
      throw new Error('A consulta demorou demais. Tente novamente.');
    }
    console.error('❌ getSomaTags error:', err);
    throw err;
  }
};

/** Invalida o cache do getSomaTags (usar após edição de dados) */
export const invalidateSomaTagsCache = () => {
  for (const key in _somaTagsCache) delete _somaTagsCache[key];
};

// ── DRE ANALYSES ─────────────────────────────────────────────────────────────

export const getDreAnalyses = async (filterHash: string): Promise<DreAnalysis[]> => {
  const { data, error } = await supabase
    .from('dre_analyses')
    .select('*')
    .eq('filter_hash', filterHash)
    .order('created_at', { ascending: false });
  if (error) { console.error('❌ getDreAnalyses:', error); return []; }
  return (data || []) as DreAnalysis[];
};

export const saveDreAnalysis = async (
  analysis: Omit<DreAnalysis, 'id' | 'created_at' | 'updated_at'>
): Promise<DreAnalysis | null> => {
  const { data, error } = await supabase
    .from('dre_analyses').insert(analysis).select().single();
  if (error) { console.error('❌ saveDreAnalysis:', error); return null; }
  return data as DreAnalysis;
};

export const updateDreAnalysis = async (
  id: string, updates: Pick<DreAnalysis, 'title' | 'content'>
): Promise<boolean> => {
  const { error } = await supabase
    .from('dre_analyses').update(updates).eq('id', id);
  if (error) { console.error('❌ updateDreAnalysis:', error); return false; }
  return true;
};

export const deleteDreAnalysis = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('dre_analyses').delete().eq('id', id);
  if (error) { console.error('❌ deleteDreAnalysis:', error); return false; }
  return true;
};

export const getAllDreAnalyses = async (): Promise<DreAnalysis[]> => {
  const { data, error } = await supabase
    .from('dre_analyses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('❌ getAllDreAnalyses:', error); return []; }
  return (data || []) as DreAnalysis[];
};

/**
 * Calcular Receita Líquida usando a mesma lógica da DRE
 * Soma todos os valores onde tag0 começa com "01." (Receita)
 */
export const getReceitaLiquidaDRE = async (params: {
  monthFrom?: string;
  monthTo?: string;
  marcas?: string[];
  nomeFiliais?: string[];
  scenario?: string;
}): Promise<number> => {
  debug('💰 getReceitaLiquidaDRE: Calculando receita líquida...', params);

  // Buscar dados agregados usando getDRESummary
  const summaryRows = await getDRESummary({
    monthFrom: params.monthFrom,
    monthTo: params.monthTo,
    marcas: params.marcas,
    nomeFiliais: params.nomeFiliais,
    // Não filtramos por tags01 aqui - queremos TODAS as tags que estão no tag0 de receita
  });

  // Filtrar pelo cenário (se especificado)
  const filteredRows = params.scenario
    ? summaryRows.filter(row => row.scenario === params.scenario)
    : summaryRows;

  // Somar todos os valores onde tag0 começa com "01." (Receita)
  const totalReceita = filteredRows
    .filter(row => row.tag0 && row.tag0.match(/^01\./i))
    .reduce((sum, row) => sum + Number(row.total_amount), 0);

  debug(`✅ Receita Líquida calculada: R$ ${totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  return totalReceita;
};

/**
 * Buscar detalhe por dimensão dinâmica (1 API call, ~50-200 linhas)
 * Usado quando o usuário expande um drill-down na DRE
 */
export const getDREDimension = async (params: {
  monthFrom?: string;
  monthTo?: string;
  contaContabils?: string[];
  scenario?: string;
  dimension: string;
  marcas?: string[];
  nomeFiliais?: string[];
  tags01?: string[];
  tags02?: string[];
  tags03?: string[];
  tag0?: string;  // fallback: inclui contas vazias do mesmo tag0 no A-1
  recurring?: string;
}): Promise<DREDimensionRow[]> => {
  debug('📊 getDREDimension: Buscando dimensão', params.dimension, {
    tags01: params.tags01,
    tags02: params.tags02,
    tags03: params.tags03,
    tag0: params.tag0
  });

  const { data, error } = await supabase.rpc('get_dre_dimension', {
    p_month_from: params.monthFrom || null,
    p_month_to: params.monthTo || null,
    p_conta_contabils: params.contaContabils && params.contaContabils.length > 0 ? params.contaContabils : null,
    p_scenario: params.scenario || null,
    p_dimension: params.dimension,
    p_marcas: params.marcas && params.marcas.length > 0 ? params.marcas : null,
    p_nome_filiais: params.nomeFiliais && params.nomeFiliais.length > 0 ? params.nomeFiliais : null,
    p_tags01: params.tags01 && params.tags01.length > 0 ? params.tags01 : null,
    p_tags02: params.tags02 && params.tags02.length > 0 ? params.tags02 : null,
    p_tags03: params.tags03 && params.tags03.length > 0 ? params.tags03 : null,
    p_tag0: params.tag0 || null,
    p_recurring: params.recurring || null,
  });

  if (error) {
    console.error('❌ Erro ao buscar DRE dimension:', error);
    return [];
  }

  debug(`✅ getDREDimension: ${data?.length || 0} linhas retornadas`);
  return (data || []) as DREDimensionRow[];
};

/**
 * Buscar opções de filtro disponíveis (1 API call)
 * Retorna listas de marcas, filiais e tags01 disponíveis no período
 */
export const getDREFilterOptions = async (params: {
  monthFrom?: string;
  monthTo?: string;
}): Promise<DREFilterOptions> => {
  debug('📊 getDREFilterOptions: Buscando opções de filtro...');

  const { data, error } = await supabase.rpc('get_dre_filter_options', {
    p_month_from: params.monthFrom || null,
    p_month_to: params.monthTo || null,
  });

  if (error) {
    console.error('❌ Erro ao buscar opções de filtro DRE:', error);
    return { marcas: [], nome_filiais: [], tags01: [] };
  }

  const result = data?.[0] || { marcas: [], nome_filiais: [], tags01: [] };
  debug(`✅ getDREFilterOptions: ${result.marcas?.length || 0} marcas, ${result.nome_filiais?.length || 0} filiais, ${result.tags01?.length || 0} tags01`);
  return result as DREFilterOptions;
};

/**
 * 🆕 Buscar TODAS as tag01 com seus tag0 (para mostrar sempre, mesmo zeradas)
 * Retorna lista completa de tag01 do banco com mapeamento tag0
 */
export const getAllTag01WithTag0 = async (): Promise<Array<{ tag0: string; tag01: string }>> => {
  debug('🏷️ Buscando TODAS as tag01 com tag0 do banco...');

  const { data, error } = await supabase.rpc('get_all_tag01_with_tag0');

  if (error) {
    console.error('❌ Erro ao buscar tag01:', error);
    return [];
  }

  debug(`✅ getAllTag01WithTag0: ${data?.length || 0} tag01 encontradas`);
  return data || [];
};

/**
 * ✅ Busca estrutura de Marcas e Filiais da tabela TRANSACTIONS
 * Garante que labels são EXATAMENTE as mesmas dos dados
 * Retorna: { marcas: string[], filiais: Array<{marca, label}> }
 */
export const getMarcasEFiliais = async (): Promise<{
  marcas: string[];
  filiais: Array<{ marca: string; label: string }>;
}> => {
  debug('🏢 Buscando marcas e filiais (DISTINCT via RPC)...');

  // Usa RPC com SELECT DISTINCT — retorna dezenas de rows em vez de 50K+
  const { data, error } = await supabase.rpc('get_distinct_marcas_filiais');

  if (error) {
    console.error('❌ Erro ao buscar marcas e filiais:', error);
    // Fallback: query direta com dedup client-side
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('transactions')
      .select('marca, nome_filial')
      .not('marca', 'is', null)
      .not('nome_filial', 'is', null);
    if (fallbackError) return { marcas: [], filiais: [] };
    const seen = new Set<string>();
    const arr: Array<{ marca: string; label: string }> = [];
    for (const row of fallbackData || []) {
      const key = `${row.marca}|${row.nome_filial}`;
      if (!seen.has(key)) { seen.add(key); arr.push({ marca: row.marca, label: row.nome_filial }); }
    }
    arr.sort((a, b) => a.marca !== b.marca ? a.marca.localeCompare(b.marca) : a.label.localeCompare(b.label));
    return { marcas: [...new Set(arr.map(f => f.marca))].sort(), filiais: arr };
  }

  const filiaisArray = (data || []).map((row: any) => ({ marca: row.marca, label: row.nome_filial }));
  const marcasUnicas = [...new Set(filiaisArray.map(f => f.marca))].sort();

  debug(`✅ Encontradas ${marcasUnicas.length} marcas e ${filiaisArray.length} filiais`);

  return { marcas: marcasUnicas, filiais: filiaisArray };
};

// ========== TRANSACTIONS ==========

export const getAllTransactions = async (monthsBack: number = 3): Promise<Transaction[]> => {
  // VERSÃO OTIMIZADA: Carrega apenas últimos X meses (padrão: 3)
  debug(`🔄 Carregando últimos ${monthsBack} meses de transações...`);

  // Calcular data de início (X meses atrás)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const startDateStr = startDate.toISOString().split('T')[0];

  debug(`📅 Buscando transações desde: ${startDateStr}`);

  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .gte('date', startDateStr)
    .order('date', { ascending: false })
    .limit(10000); // Limite de segurança

  if (error) {
    console.error('❌ Erro ao carregar transações:', error);
    // Em caso de erro, retornar array vazio em vez de quebrar
    return [];
  }

  if (!data || data.length === 0) {
    debug('⚠️ Nenhuma transação encontrada no período');
    return [];
  }

  debug(`✅ ${data.length} transações carregadas (de ${count} no período)!`);

  // Debug: Verificar campos na primeira transação
  if (data.length > 0) {
    debug('🔍 DEBUG - Primeira transação ANTES do mapeamento (do banco):', {
      id: data[0].id,
      chave_id: data[0].chave_id,
      ticket: data[0].ticket,
      vendor: data[0].vendor,
      description: data[0].description?.substring(0, 50)
    });
  }

  // Enriquecer com tag0 via tag0_map
  const tag0Map = await getTag0Map();
  const mapped = data.map(db => {
    const t = dbToTransaction(db);
    if (!t.tag0 && t.tag01) {
      t.tag0 = resolveTag0(t.tag01, tag0Map);
    }
    return t;
  });

  // Debug: Verificar após mapeamento
  if (mapped.length > 0) {
    debug('🔍 DEBUG - Primeira transação DEPOIS do mapeamento (para o app):', {
      id: mapped[0].id,
      tag0: mapped[0].tag0,
      tag01: mapped[0].tag01,
      description: mapped[0].description?.substring(0, 50)
    });
  }

  return mapped;
};

// Nova função: Buscar transações com filtros aplicados
export interface TransactionFilters {
  monthFrom?: string;      // YYYY-MM
  monthTo?: string;        // YYYY-MM
  marca?: string[];
  filial?: string[];
  nome_filial?: string[];  // "CIA - NomeFilial" (coluna calculada no banco)
  tag0?: string[];
  tag01?: string[];
  tag02?: string[];
  tag03?: string[];
  category?: string[];
  conta_contabil?: string[];
  ticket?: string;
  chave_id?: string;
  vendor?: string;
  description?: string;
  amount?: string;
  recurring?: string[];
  status?: string[];
  scenario?: string;       // Para filtrar por aba (Real, Orçamento, etc)
}

// Helper para aplicar filtros em uma query (reutilizado em paginação)
const applyTransactionFilters = (query: any, filters: TransactionFilters) => {
  debug('🔧 applyTransactionFilters chamado com:', JSON.stringify(filters, null, 2));

  // ═══════════════════════════════════════════════════════════════
  // 🔐 APLICAR PERMISSÕES AUTOMATICAMENTE
  // ═══════════════════════════════════════════════════════════════
  filters = addPermissionFiltersToObject(filters);
  debug('🔐 Filtros após aplicar permissões:', JSON.stringify(filters, null, 2));

  // Filtros de data (período)
  if (filters.monthFrom) {
    const startDate = `${filters.monthFrom}-01`;
    query = query.gte('date', startDate);
    debug('  ✅ Filtro monthFrom aplicado:', startDate);
  }

  if (filters.monthTo) {
    const [year, month] = filters.monthTo.split('-');
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${filters.monthTo}-${lastDay}`;
    query = query.lte('date', endDate);
    debug('  ✅ Filtro monthTo aplicado:', endDate);
  }

  // Filtros de array (marca, filial, tags, category, etc)
  if (filters.marca && filters.marca.length > 0) {
    query = query.in('marca', filters.marca);
    debug('  🔒 Filtro MARCA aplicado:', filters.marca);
  } else {
    debug('  ⚠️ Filtro marca NÃO aplicado (vazio ou undefined)');
  }
  if (filters.filial && filters.filial.length > 0) query = query.in('filial', filters.filial);
  if (filters.nome_filial && filters.nome_filial.length > 0) query = query.in('nome_filial', filters.nome_filial);
  // tag0 NÃO existe na tabela (resolvido via tag0_map) — filtro aplicado client-side após fetch
  if (filters.tag01 && filters.tag01.length > 0) query = query.in('tag01', filters.tag01);
  if (filters.tag02 && filters.tag02.length > 0) query = query.in('tag02', filters.tag02);
  if (filters.tag03 && filters.tag03.length > 0) query = query.in('tag03', filters.tag03);
  if (filters.category && filters.category.length > 0) query = query.in('category', filters.category);
  if (filters.conta_contabil && filters.conta_contabil.length > 0) query = query.in('conta_contabil', filters.conta_contabil);
  if (filters.chave_id && filters.chave_id.trim() !== '') query = query.ilike('chave_id', `%${filters.chave_id.trim()}%`);
  if (filters.recurring && filters.recurring.length > 0) {
    // Expandir variações com/sem acento para busca case-insensitive
    const recurringPatterns: string[] = [];
    for (const val of filters.recurring) {
      const lower = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === 'sim') {
        recurringPatterns.push('recurring.ilike.sim', 'recurring.ilike.Sim', 'recurring.ilike.SIM');
      } else if (lower === 'nao') {
        recurringPatterns.push(
          'recurring.ilike.nao', 'recurring.ilike.Nao', 'recurring.ilike.NAO',
          'recurring.ilike.não', 'recurring.ilike.Não', 'recurring.ilike.NÃO'
        );
      } else {
        recurringPatterns.push(`recurring.ilike.${val}`);
      }
    }
    query = query.or(recurringPatterns.join(','));
  }

  // Filtros de texto (LIKE)
  if (filters.ticket && filters.ticket.trim() !== '') query = query.ilike('ticket', `%${filters.ticket.trim()}%`);
  if (filters.vendor && filters.vendor.trim() !== '') query = query.ilike('vendor', `%${filters.vendor.trim()}%`);
  if (filters.description && filters.description.trim() !== '') query = query.ilike('description', `%${filters.description.trim()}%`);

  // Filtro de valor (amount)
  if (filters.amount && filters.amount.trim() !== '') {
    const amountValue = parseFloat(filters.amount.trim());
    if (!isNaN(amountValue)) query = query.eq('amount', amountValue);
  }

  // Filtro de status
  if (filters.status && filters.status.length > 0) query = query.in('status', filters.status);

  // Filtro de cenário (aba ativa)
  // Real: scenario IS NULL ou 'Real' (DRE usa COALESCE(scenario, 'Real'))
  if (filters.scenario) {
    if (filters.scenario === 'Real') {
      query = query.or('scenario.is.null,scenario.ilike.Real');
    } else {
      query = query.ilike('scenario', filters.scenario);
    }
  }

  return query;
};

export const getFilteredTransactions = async (
  filters: TransactionFilters,
  pagination?: PaginationParams,
  tableName: string = 'transactions'
): Promise<PaginatedResponse<Transaction>> => {
  // Validar filtros antes de enviar ao banco
  const parsed = transactionFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    console.error('❌ getFilteredTransactions: filtros inválidos', parsed.error.issues);
    return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
  }

  debug('🔍 Buscando transações com filtros:', filters);

  if (pagination) {
    debug(`📄 Paginação: Página ${pagination.pageNumber}, ${pagination.pageSize} registros/página`);

    // Iniciar query com contagem
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    query = applyTransactionFilters(query, filters);
    query = query.order('date', { ascending: false }).order('id', { ascending: true });

    const { pageNumber, pageSize } = pagination;

    if (pageNumber < 1) {
      console.error('❌ Erro: pageNumber deve ser >= 1');
      return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }
    if (pageSize < 1 || pageSize > 50000) {
      console.error('❌ Erro: pageSize deve estar entre 1 e 50000');
      return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }

    const offset = (pageNumber - 1) * pageSize;
    const rangeEnd = offset + pageSize - 1;
    query = query.range(offset, rangeEnd);

    debug(`📥 Buscando registros ${offset + 1} a ${offset + pageSize} (range: ${offset}-${rangeEnd})...`);

    const { data, count, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }

    const totalCount = count || 0;
    debug(`📊 Total de registros filtrados: ${totalCount}`);

    if (!data || data.length === 0) {
      return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }

    const tag0Map = await getTag0Map();
    const enriched = data.map(db => {
      const t = dbToTransaction(db);
      if (!t.tag0 && t.tag01) t.tag0 = resolveTag0(t.tag01, tag0Map);
      return t;
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      data: enriched,
      totalCount,
      currentPage: pageNumber,
      totalPages,
      hasMore: pageNumber < totalPages
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SEM PAGINAÇÃO: Busca em lotes PARALELOS para contornar limite do Supabase
  // O Supabase tem limite de ~1000 linhas por request (server-side).
  // Buscamos em lotes de 10000 usando .range(), 6 lotes em paralelo.
  // ═══════════════════════════════════════════════════════════
  const BATCH_SIZE = 1000;   // Limite real do Supabase server (max-rows)
  const PARALLEL_BATCHES = 3; // REDUZIDO: 3 requests simultâneos para evitar sobrecarga

  // Primeiro: obter contagem total
  let countQuery = supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  countQuery = applyTransactionFilters(countQuery, filters);
  const { count: totalCountRaw, error: countError } = await countQuery;

  if (countError) {
    console.error('❌ Erro ao contar transações:', countError);
    return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
  }

  const totalCount = totalCountRaw || 0;
  debug(`📊 Total de registros filtrados: ${totalCount}`);

  if (totalCount === 0) {
    return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
  }

  // Criar todas as promises de lotes
  const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
  debug(`📦 Buscando ${totalCount} registros em ${totalBatches} lotes de ${BATCH_SIZE} (${PARALLEL_BATCHES} em paralelo)...`);

  const fetchBatch = async (batchIdx: number) => {
    const from = batchIdx * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    let batchQuery = supabase.from(tableName).select('*');
    batchQuery = applyTransactionFilters(batchQuery, filters);
    batchQuery = batchQuery.order('date', { ascending: false }).order('id', { ascending: true });
    batchQuery = batchQuery.range(from, to);

    const { data, error } = await batchQuery;
    if (error) {
      console.error(`❌ Erro no lote ${batchIdx + 1}/${totalBatches}:`, error);
      return [];
    }
    return data || [];
  };

  // Executar lotes em paralelo (grupos de PARALLEL_BATCHES)
  const allData: any[] = [];
  for (let i = 0; i < totalBatches; i += PARALLEL_BATCHES) {
    const batchIndices = Array.from(
      { length: Math.min(PARALLEL_BATCHES, totalBatches - i) },
      (_, j) => i + j
    );

    const results = await Promise.all(batchIndices.map(fetchBatch));
    for (const result of results) {
      allData.push(...result);
    }
    debug(`  ✅ Lotes ${i + 1}-${i + batchIndices.length}/${totalBatches}: acumulado ${allData.length} registros`);
  }

  debug(`✅ ${allData.length} transações carregadas de ${totalCount} total`);

  // Enriquecer com tag0
  const tag0Map = await getTag0Map();
  const enriched = allData.map(db => {
    const t = dbToTransaction(db);
    if (!t.tag0 && t.tag01) t.tag0 = resolveTag0(t.tag01, tag0Map);
    return t;
  });

  return {
    data: enriched,
    totalCount,
    currentPage: 1,
    totalPages: 1,
    hasMore: false
  };
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transactionToDb(transaction as Transaction)])
    .select()
    .single();

  if (error) {
    console.error('Error adding transaction:', error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No data returned from insert');
  }

  return dbToTransaction(data);
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<boolean> => {
  debug('updateTransaction called with:', { id, updates });

  // Remover campos null/undefined e campos vazios
  const cleanedUpdates: any = {};
  Object.keys(updates).forEach(key => {
    const value = (updates as any)[key];
    if (value !== null && value !== undefined && value !== '') {
      cleanedUpdates[key] = value;
    }
  });

  debug('cleanedUpdates:', cleanedUpdates);

  // Se não há nada para atualizar, retornar sucesso
  if (Object.keys(cleanedUpdates).length === 0) {
    debug('No fields to update, returning success');
    return true;
  }

  const { error } = await supabase
    .from('transactions')
    .update(cleanedUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating transaction:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    return false;
  }

  return true;
};

export const bulkUpdateTransactions = async (
  ids: string[],
  updates: Partial<Transaction>
): Promise<{ updated: number; error?: string }> => {
  if (ids.length === 0) return { updated: 0 };
  const clean: Record<string, any> = {};
  Object.entries(updates).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') clean[k] = v;
  });
  if (!Object.keys(clean).length) return { updated: 0 };

  const { error } = await supabase
    .from('transactions')
    .update(clean)
    .in('id', ids);

  return error ? { updated: 0, error: error.message } : { updated: ids.length };
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }

  return true;
};

export const bulkAddTransactions = async (transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactions.map(t => transactionToDb(t as Transaction)))
    .select();

  if (error) {
    console.error('Error bulk adding transactions:', error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No data returned from bulk insert');
  }

  return data.map(dbToTransaction);
};

// Atualização em massa da coluna recurring por chave_id
export const bulkUpdateRecurring = async (
  items: { chave_id: string; recurring: string }[]
): Promise<{ updated: number; notFound: string[] }> => {
  let updated = 0;
  const notFound: string[] = [];

  for (const item of items) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ recurring: item.recurring })
      .eq('chave_id', item.chave_id)
      .select('id');

    if (error) throw new Error(error.message);
    if (data && data.length > 0) {
      updated += data.length;
    } else {
      notFound.push(item.chave_id);
    }
  }

  return { updated, notFound };
};

// ========== MANUAL CHANGES ==========

/** Query leve: apenas COUNT de pendentes — para badge do Sidebar no boot (<100ms) */
export const getPendingChangesCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('manual_changes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pendente');
  if (error) {
    console.error('❌ Erro ao contar pendentes:', error);
    return 0;
  }
  return count || 0;
};

export const getAllManualChanges = async (): Promise<ManualChange[]> => {
  debug('🟦 getAllManualChanges INICIADO');

  // Buscar pendentes (todas) + últimas 500 processadas em paralelo
  const [pendingRes, recentRes] = await Promise.all([
    supabase
      .from('manual_changes')
      .select('*')
      .eq('status', 'Pendente')
      .order('requested_at', { ascending: false }),
    supabase
      .from('manual_changes')
      .select('*')
      .neq('status', 'Pendente')
      .order('requested_at', { ascending: false })
      .limit(500),
  ]);

  if (pendingRes.error) {
    console.error('❌ Error fetching pending manual changes:', pendingRes.error);
  }
  if (recentRes.error) {
    console.error('❌ Error fetching recent manual changes:', recentRes.error);
  }

  // Unificar e deduplicar por ID
  const allData = [...(pendingRes.data || []), ...(recentRes.data || [])];
  const seen = new Set<string>();
  const unique = allData.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  // Ordenar por requested_at DESC (pendentes ficam no topo por serem mais recentes ou mesclados)
  unique.sort((a, b) => (b.requested_at || '').localeCompare(a.requested_at || ''));

  debug('🟦 Resposta do Supabase:', {
    pending: pendingRes.data?.length || 0,
    recent: recentRes.data?.length || 0,
    total: unique.length
  });

  const converted = unique.map(dbToManualChange);
  debug('✅ Dados convertidos:', {
    total: converted.length,
    pendentes: converted.filter(c => c.status === 'Pendente').length
  });

  return converted;
};

export const addManualChange = async (change: ManualChange): Promise<boolean> => {
  debug('🟦 addManualChange INICIADO:', {
    id: change.id,
    type: change.type,
    transactionId: change.transactionId,
    justification: change.justification,
    hasOriginalTransaction: !!change.originalTransaction
  });

  try {
    const dbChange = manualChangeToDb(change);

    debug('🟦 Após manualChangeToDb:', {
      id: dbChange.id,
      type: dbChange.type,
      transaction_id: dbChange.transaction_id,
      justification: dbChange.justification,
      original_transaction_type: typeof dbChange.original_transaction,
      original_transaction_preview: typeof dbChange.original_transaction === 'string'
        ? dbChange.original_transaction.substring(0, 100)
        : 'object'
    });

    // Garantir que original_transaction é um objeto válido
    if (typeof dbChange.original_transaction === 'string') {
      debug('🟦 Convertendo original_transaction de string para objeto');
      dbChange.original_transaction = JSON.parse(dbChange.original_transaction);
    }

    // Remover campos null/undefined para evitar erro de headers
    const cleanedChange: any = {};
    Object.keys(dbChange).forEach(key => {
      const value = (dbChange as any)[key];
      if (value !== null && value !== undefined) {
        cleanedChange[key] = value;
      }
    });

    debug('🟦 Campos após limpeza:', Object.keys(cleanedChange));
    debug('🟦 Dados limpos (resumo):', {
      id: cleanedChange.id,
      type: cleanedChange.type,
      transaction_id: cleanedChange.transaction_id,
      justification: cleanedChange.justification,
      status: cleanedChange.status,
      requested_at: cleanedChange.requested_at,
      requested_by: cleanedChange.requested_by,
      requested_by_name: cleanedChange.requested_by_name,
      has_original_transaction: !!cleanedChange.original_transaction,
      has_new_values: !!cleanedChange.new_values
    });

    debug('🔄 Iniciando INSERT no Supabase...');
    const { error, data } = await supabase
      .from('manual_changes')
      .insert([cleanedChange])
      .select();

    debug('🟦 Resposta do Supabase:', {
      error: error,
      data: data,
      hasError: !!error,
      hasData: !!data,
      dataLength: data ? data.length : 0
    });

    if (error) {
      console.error('❌ ERRO ao salvar manual change:', error);
      console.error('❌ Código do erro:', error.code);
      console.error('❌ Mensagem do erro:', error.message);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      console.error('❌ Dados enviados (completo):', JSON.stringify(cleanedChange, null, 2));
      return false;
    }

    debug('✅ Manual change salvo com SUCESSO!');
    debug('✅ Dados retornados:', data);
    return true;
  } catch (err) {
    console.error('❌ EXCEPTION in addManualChange:', err);
    console.error('❌ Tipo do erro:', (err as Error).name);
    console.error('❌ Mensagem:', (err as Error).message);
    console.error('❌ Stack:', (err as Error).stack);
    return false;
  }
};

export const updateManualChange = async (id: string, updates: Partial<ManualChange>): Promise<boolean> => {
  const dbUpdates: any = {};

  if (updates.status) dbUpdates.status = updates.status;
  if (updates.approvedAt) dbUpdates.approved_at = updates.approvedAt;
  if (updates.approvedBy) dbUpdates.approved_by = updates.approvedBy;
  if (updates.approvedByName) dbUpdates.approved_by_name = updates.approvedByName;

  // Remover campos null/undefined
  const cleanedUpdates: any = {};
  Object.keys(dbUpdates).forEach(key => {
    const value = dbUpdates[key];
    if (value !== null && value !== undefined) {
      cleanedUpdates[key] = value;
    }
  });

  const { error } = await supabase
    .from('manual_changes')
    .update(cleanedUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating manual change:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }

  return true;
};

// ========== USERS ==========

export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }

  return data;
};

export const createUser = async (userData: { email: string; name: string; photoURL: string; role: string }) => {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email: userData.email,
      name: userData.name,
      photo_url: userData.photoURL,
      role: userData.role
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
};

export const updateUserLastLogin = async (userId: string) => {
  const { error } = await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating last login:', error);
  }
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }

  return data;
};

export const updateUserRole = async (userId: string, role: 'admin' | 'manager' | 'viewer' | 'pending') => {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return false;
  }

  return true;
};

export const deleteUser = async (userId: string) => {
  try {
    // Primeiro, deletar todas as permissões do usuário
    const { error: permError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    if (permError) {
      console.error('Error deleting user permissions:', permError);
      // Continuar mesmo se falhar - pode ser que não tenha permissões
    }

    // Depois, deletar o usuário
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('Error deleting user:', userError);
      return false;
    }

    debug(`User ${userId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Exception in deleteUser:', error);
    return false;
  }
};

export const getUserPermissions = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data;
};

export const addUserPermission = async (userId: string, permissionType: 'centro_custo' | 'cia' | 'filial' | 'tag01' | 'tag02' | 'tag03', permissionValue: string) => {
  const { error } = await supabase
    .from('user_permissions')
    .insert([{
      user_id: userId,
      permission_type: permissionType,
      permission_value: permissionValue
    }]);

  if (error) {
    console.error('Error adding user permission:', error);
    return false;
  }

  return true;
};

export const removeUserPermission = async (permissionId: string) => {
  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('id', permissionId);

  if (error) {
    console.error('Error removing user permission:', error);
    return false;
  }

  return true;
};

// ========== SYNC ==========

/**
 * Atualiza transação com verificação de conflito (Optimistic Locking)
 *
 * Verifica se o updated_at da transação no servidor corresponde ao esperado.
 * Se não corresponder, retorna conflito ao invés de sobrescrever.
 *
 * @param id ID da transação
 * @param updates Campos a atualizar
 * @param expectedUpdatedAt Timestamp esperado (versão local)
 * @returns { success: boolean, conflict?: Transaction }
 */
export const updateTransactionWithConflictCheck = async (
  id: string,
  updates: Partial<Transaction>,
  expectedUpdatedAt: string
): Promise<{ success: boolean; conflict?: Transaction; error?: string }> => {
  try {
    debug(`🔍 Verificando conflito para transação ${id}`);
    debug(`   Expected updated_at: ${expectedUpdatedAt}`);

    // 1. Buscar versão atual do servidor
    const { data: current, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      console.error('❌ Erro ao buscar transação atual:', fetchError);
      return {
        success: false,
        error: fetchError?.message || 'Transação não encontrada'
      };
    }

    debug(`   Server updated_at: ${current.updated_at}`);

    // 2. Verificar conflito (comparar updated_at)
    if (current.updated_at !== expectedUpdatedAt) {
      console.warn('⚠️ Conflito detectado! Versões divergiram.');
      return {
        success: false,
        conflict: dbToTransaction(current)
      };
    }

    // 3. Não há conflito - prosseguir com update
    // Adicionar novo timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Limpar campos vazios
    const cleanedUpdates: any = {};
    Object.keys(updatesWithTimestamp).forEach(key => {
      const value = (updatesWithTimestamp as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedUpdates[key] = value;
      }
    });

    // 4. Executar update COM condição no updated_at (optimistic locking)
    const { error: updateError } = await supabase
      .from('transactions')
      .update(cleanedUpdates)
      .eq('id', id)
      .eq('updated_at', expectedUpdatedAt); // ← Condição crítica para optimistic locking

    if (updateError) {
      console.error('❌ Erro ao atualizar transação:', updateError);
      return {
        success: false,
        error: updateError.message
      };
    }

    debug('✅ Transação atualizada com sucesso (sem conflito)');

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro inesperado no conflict check:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
};

// Migrar dados do localStorage para Supabase (executar uma vez)
export const migrateFromLocalStorage = async () => {
  const STORAGE_KEY = 'sap_financial_data_v6';
  const CHANGES_KEY = 'sap_approvals_v6';

  try {
    // Migrar transações
    const savedTransactions = localStorage.getItem(STORAGE_KEY);
    if (savedTransactions) {
      const transactions: Transaction[] = JSON.parse(savedTransactions);
      const success = await bulkAddTransactions(transactions);
      if (success) {
        debug(`Migrated ${transactions.length} transactions to Supabase`);
      }
    }

    // Migrar mudanças manuais
    const savedChanges = localStorage.getItem(CHANGES_KEY);
    if (savedChanges) {
      const changes: ManualChange[] = JSON.parse(savedChanges);
      for (const change of changes) {
        await addManualChange(change);
      }
      debug(`Migrated ${changes.length} manual changes to Supabase`);
    }

    return true;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
};

/**
 * Subscribe to real-time changes in transactions table (FASE 3)
 *
 * Configura Supabase Realtime para escutar mudanças na tabela transactions.
 * Filtra eventos por marca, filial e período (se fornecidos).
 *
 * @param filters Filtros para aplicar na subscription
 * @param callbacks Callbacks para eventos INSERT/UPDATE/DELETE
 * @returns RealtimeChannel instance (use .unsubscribe() para parar)
 */
export const subscribeToTransactionChanges = (
  filters: Partial<TransactionFilters>,
  callbacks: {
    onInsert?: (transaction: Transaction) => void;
    onUpdate?: (transaction: Transaction) => void;
    onDelete?: (id: string) => void;
    onError?: (error: Error) => void;
  }
): any => {
  debug('📡 Iniciando subscription Realtime com filtros:', filters);

  // Construir filtro Realtime
  // Nota: Supabase Realtime tem limitações - filtros complexos são aplicados no cliente
  let channelName = 'transactions-changes';

  // Criar channel
  const channel = supabase.channel(channelName);

  // Configurar listener para INSERT
  if (callbacks.onInsert) {
    channel.on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      },
      (payload: any) => {
        debug('📥 Realtime INSERT:', payload.new.id);

        const transaction = dbToTransaction(payload.new);

        // Aplicar filtros no cliente (Realtime não suporta filtros complexos)
        if (shouldIncludeTransaction(transaction, filters)) {
          callbacks.onInsert!(transaction);
        } else {
          debug('⏭️ Transação filtrada (não corresponde aos critérios)');
        }
      }
    );
  }

  // Configurar listener para UPDATE
  if (callbacks.onUpdate) {
    channel.on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions'
      },
      (payload: any) => {
        debug('📝 Realtime UPDATE:', payload.new.id);

        const transaction = dbToTransaction(payload.new);

        if (shouldIncludeTransaction(transaction, filters)) {
          callbacks.onUpdate!(transaction);
        } else {
          debug('⏭️ Transação filtrada (não corresponde aos critérios)');
        }
      }
    );
  }

  // Configurar listener para DELETE
  if (callbacks.onDelete) {
    channel.on(
      'postgres_changes' as any,
      {
        event: 'DELETE',
        schema: 'public',
        table: 'transactions'
      },
      (payload: any) => {
        debug('🗑️ Realtime DELETE:', payload.old.id);
        callbacks.onDelete!(payload.old.id);
      }
    );
  }

  // Subscribe ao channel
  channel.subscribe((status: string) => {
    debug(`📡 Realtime status: ${status}`);

    if (status === 'SUBSCRIBED') {
      debug('✅ Realtime conectado com sucesso!');
    } else if (status === 'CLOSED') {
      debug('⚠️ Realtime desconectado');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Erro no canal Realtime');
      if (callbacks.onError) {
        callbacks.onError(new Error('Realtime channel error'));
      }
    }
  });

  return channel;
};

/**
 * Helper: Verifica se transação deve ser incluída baseado nos filtros
 */
const shouldIncludeTransaction = (
  transaction: Transaction,
  filters: Partial<TransactionFilters>
): boolean => {
  // Filtro de marca
  if (filters.marca && filters.marca.length > 0) {
    if (!transaction.marca || !filters.marca.includes(transaction.marca)) {
      return false;
    }
  }

  // Filtro de filial
  if (filters.filial && filters.filial.length > 0) {
    if (!transaction.filial || !filters.filial.includes(transaction.filial)) {
      return false;
    }
  }

  // Filtro de período (monthFrom/monthTo)
  if (filters.monthFrom || filters.monthTo) {
    const transactionDate = new Date(transaction.date);

    if (filters.monthFrom) {
      const [year, month] = filters.monthFrom.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      if (transactionDate < startDate) {
        return false;
      }
    }

    if (filters.monthTo) {
      const [year, month] = filters.monthTo.split('-');
      const endDate = new Date(parseInt(year), parseInt(month), 0); // Último dia do mês
      if (transactionDate > endDate) {
        return false;
      }
    }
  }

  // Filtro de cenário
  if (filters.scenario) {
    if (!transaction.scenario || !transaction.scenario.toLowerCase().includes(filters.scenario.toLowerCase())) {
      return false;
    }
  }

  return true;
};

// ============================================
// Conta Contábil - Hierarquia
// ============================================

let contaContabilCache: ContaContabilOption[] | null = null;

export const getContaContabilOptions = async (): Promise<ContaContabilOption[]> => {
  if (contaContabilCache && contaContabilCache.length > 0) return contaContabilCache;

  try {
    // Tenta RPC server-side (filtro LENGTH=14 no servidor)
    debug('📋 RPC: Carregando contas via get_conta_contabil_options...');
    const { data, error } = await supabase.rpc('get_conta_contabil_options');

    if (!error && data && data.length > 0) {
      contaContabilCache = (data as any[]).map(row => ({
        cod_conta: row.cod_conta,
        nome_nat_orc: row.nome_nat_orc || null,
        tag0:  row.tag0  || null,
        tag01: row.tag01 || null,
        tag02: row.tag02 || null,
        tag03: row.tag03 || null,
      }));
      debug(`✅ RPC: ${contaContabilCache.length} contas carregadas (14 chars)`);
      return contaContabilCache;
    }

    // Fallback: busca direta da tabela tags (caso RPC não exista ainda)
    if (error) {
      debug('⚠️ RPC indisponível, usando fallback direto...');
    }
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('tags')
      .select('cod_conta, tag0, tag1, tag2, tag3, tag4, nome_nat_orc, nat_orc')
      .order('cod_conta', { ascending: true });

    if (fallbackError) {
      console.error('❌ Erro ao buscar tabela tags:', fallbackError.message);
      return [];
    }

    const filtered = (fallbackData || []).filter(row => row.cod_conta && row.cod_conta.length === 14);

    contaContabilCache = filtered.map(row => ({
      cod_conta: row.cod_conta,
      nome_nat_orc: row.nome_nat_orc || row.nat_orc || null,
      tag0:  row.tag0  || null,
      tag01: row.tag1  || null,
      tag02: row.tag2  || null,
      tag03: row.tag3  || null,
    }));

    debug(`✅ Fallback: ${contaContabilCache.length} contas carregadas da tabela tags (14 chars)`);
    return contaContabilCache;
  } catch (e) {
    console.error('❌ EXCEPTION:', e);
    return [];
  }
};

// ============================================
// Multi-Company Intelligence — Holding Functions
// ============================================

import type { CompanyFinancialSnapshot } from '../core/holdingTypes';

/**
 * Busca o holding do usuário logado via user_holdings.
 * Retorna null se o usuário não pertence a nenhum holding.
 */
export const getUserHolding = async (): Promise<{ id: string; name: string; description: string | null } | null> => {
  try {
    const { data, error } = await supabase
      .from('user_holdings')
      .select('holding_id, holdings(id, name, description)')
      .limit(1)
      .single();

    if (error || !data) return null;

    const h = (data as any).holdings;
    return h ? { id: h.id, name: h.name, description: h.description } : null;
  } catch {
    return null;
  }
};

/**
 * Busca todas as empresas ativas do holding do usuário,
 * com o snapshot financeiro mais recente de cada.
 */
export const getHoldingCompanies = async (holdingId: string): Promise<CompanyFinancialSnapshot[]> => {
  try {
    // 1. Buscar empresas ativas do holding
    const { data: companies, error: compErr } = await supabase
      .from('holding_companies')
      .select('organization_id, display_name, portfolio_weight, is_active')
      .eq('holding_id', holdingId)
      .eq('is_active', true);

    if (compErr || !companies || companies.length === 0) return [];

    // 2. Para cada empresa, buscar o snapshot mais recente
    const orgIds = companies.map((c) => c.organization_id);

    const { data: snapshots, error: snapErr } = await supabase
      .from('company_financial_snapshots')
      .select('*')
      .in('organization_id', orgIds)
      .order('period', { ascending: false });

    if (snapErr) {
      console.error('❌ Erro ao buscar snapshots:', snapErr);
      return [];
    }

    // 3. Pegar o snapshot mais recente de cada empresa
    const latestByOrg = new Map<string, any>();
    for (const s of (snapshots || [])) {
      if (!latestByOrg.has(s.organization_id)) {
        latestByOrg.set(s.organization_id, s);
      }
    }

    // 4. Montar CompanyFinancialSnapshot[]
    return companies.map((c) => {
      const snap = latestByOrg.get(c.organization_id);
      return {
        organization_id: c.organization_id,
        display_name: c.display_name,
        period: snap?.period || '—',
        receita_real: Number(snap?.receita_real || 0),
        receita_orcado: Number(snap?.receita_orcado || 0),
        custos_variaveis_real: Number(snap?.custos_variaveis_real || 0),
        custos_fixos_real: Number(snap?.custos_fixos_real || 0),
        sga_real: Number(snap?.sga_real || 0),
        rateio_real: Number(snap?.rateio_real || 0),
        ebitda: Number(snap?.ebitda || 0),
        margem_contribuicao_pct: Number(snap?.margem_contribuicao_pct || 0),
        health_score: Number(snap?.health_score || 0),
        growth_yoy: Number(snap?.growth_yoy || 0),
        portfolio_weight: Number(c.portfolio_weight),
        headcount: snap?.headcount ? Number(snap.headcount) : undefined,
      };
    });
  } catch (e) {
    console.error('❌ Erro ao buscar holding companies:', e);
    return [];
  }
};

// ============================================
// Share PDD
// ============================================

export interface SharePdd {
  id: number;
  marca: string;
  valor: number;
  updated_at: string;
}

export const getSharePdd = async (): Promise<SharePdd[]> => {
  const { data, error } = await supabase
    .from('share_pdd')
    .select('id, marca, valor, updated_at')
    .order('marca');
  if (error) {
    console.error('Erro ao buscar share_pdd:', error);
    return [];
  }
  return data || [];
};

export const updateSharePdd = async (id: number, valor: number): Promise<{ ok: boolean; error?: string }> => {
  const { data, error, count } = await supabase
    .from('share_pdd')
    .update({ valor })
    .eq('id', id)
    .select();
  if (error) {
    console.error('Erro ao atualizar share_pdd:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    console.error('share_pdd update: nenhuma row afetada — RLS bloqueando?');
    return { ok: false, error: 'Nenhuma linha atualizada. Verifique permissões (RLS).' };
  }
  return { ok: true };
};

export const insertSharePdd = async (marca: string, valor: number): Promise<SharePdd | null> => {
  const { data, error } = await supabase
    .from('share_pdd')
    .insert({ marca: marca.toUpperCase().trim(), valor })
    .select('id, marca, valor, updated_at')
    .single();
  if (error) {
    console.error('Erro ao inserir share_pdd:', error);
    return null;
  }
  return data;
};

export const deleteSharePdd = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('share_pdd')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir share_pdd:', error);
    return false;
  }
  return true;
};

export const subscribeSharePdd = (onChange: () => void) => {
  const channel = supabase
    .channel('share_pdd_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'share_pdd' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ============================================
// PDD Contas (contas base para cálculo)
// ============================================

export interface PddConta {
  id: number;
  tag0: string;
  tag01: string;
}

export const getPddContas = async (): Promise<PddConta[]> => {
  const { data, error } = await supabase
    .from('pdd_contas')
    .select('id, tag0, tag01')
    .order('tag0')
    .order('tag01');
  if (error) {
    console.error('Erro ao buscar pdd_contas:', error);
    return [];
  }
  return data || [];
};

export const addPddConta = async (tag0: string, tag01: string): Promise<PddConta | null> => {
  const { data, error } = await supabase
    .from('pdd_contas')
    .insert({ tag0, tag01 })
    .select('id, tag0, tag01')
    .single();
  if (error) {
    console.error('Erro ao inserir pdd_contas:', error);
    return null;
  }
  return data;
};

export const removePddConta = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('pdd_contas')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir pdd_contas:', error);
    return false;
  }
  return true;
};

export const subscribePddContas = (onChange: () => void) => {
  const channel = supabase
    .channel('pdd_contas_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pdd_contas' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ============================================
// De-Para Fornecedores
// ============================================

export interface DeparaFornec {
  fornecedor_de: string;
  fornecedor_para: string;
  updated_at: string;
}

export const getDeparaFornec = async (): Promise<DeparaFornec[]> => {
  const { data, error } = await supabase
    .from('depara_fornec')
    .select('fornecedor_de, fornecedor_para, updated_at')
    .order('fornecedor_de');
  if (error) {
    console.error('Erro ao buscar depara_fornec:', error);
    return [];
  }
  return data || [];
};

export const insertDeparaFornec = async (fornecedor_de: string, fornecedor_para: string): Promise<DeparaFornec | null> => {
  const { data, error } = await supabase
    .from('depara_fornec')
    .insert({ fornecedor_de: fornecedor_de.trim(), fornecedor_para: fornecedor_para.trim() })
    .select('fornecedor_de, fornecedor_para, updated_at')
    .single();
  if (error) {
    console.error('Erro ao inserir depara_fornec:', error);
    return null;
  }
  return data;
};

export const updateDeparaFornec = async (fornecedor_de_old: string, fornecedor_de: string, fornecedor_para: string): Promise<{ ok: boolean; error?: string }> => {
  if (fornecedor_de_old !== fornecedor_de.trim()) {
    // PK mudou: deletar antigo + inserir novo
    const { error: delErr } = await supabase.from('depara_fornec').delete().eq('fornecedor_de', fornecedor_de_old);
    if (delErr) return { ok: false, error: delErr.message };
    const { error: insErr } = await supabase.from('depara_fornec')
      .insert({ fornecedor_de: fornecedor_de.trim(), fornecedor_para: fornecedor_para.trim() });
    if (insErr) return { ok: false, error: insErr.message };
    return { ok: true };
  }
  const { error } = await supabase
    .from('depara_fornec')
    .update({ fornecedor_para: fornecedor_para.trim() })
    .eq('fornecedor_de', fornecedor_de_old);
  if (error) {
    console.error('Erro ao atualizar depara_fornec:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const deleteDeparaFornec = async (fornecedor_de: string): Promise<boolean> => {
  const { error } = await supabase
    .from('depara_fornec')
    .delete()
    .eq('fornecedor_de', fornecedor_de);
  if (error) {
    console.error('Erro ao deletar depara_fornec:', error);
    return false;
  }
  return true;
};

export const subscribeDeparaFornec = (onChange: () => void) => {
  const channel = supabase
    .channel('depara_fornec_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'depara_fornec' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const upsertDeparaFornecBatch = async (
  rows: { fornecedor_de: string; fornecedor_para: string }[]
): Promise<{ inserted: number; error?: string }> => {
  const { data, error } = await supabase
    .from('depara_fornec')
    .upsert(
      rows.map(r => ({ fornecedor_de: r.fornecedor_de.trim(), fornecedor_para: r.fornecedor_para.trim() })),
      { onConflict: 'fornecedor_de' }
    )
    .select('fornecedor_de');
  if (error) {
    console.error('Erro ao upsert depara_fornec:', error);
    return { inserted: 0, error: error.message };
  }
  return { inserted: data?.length || 0 };
};

export const runNormalizarFornecedores = async (): Promise<{ ok: boolean; data?: any; error?: string }> => {
  const { data, error } = await supabase.rpc('normalizar_fornecedores');
  if (error) {
    console.error('Erro ao normalizar fornecedores:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
};

// ============================================
// Rateio Raiz Log
// ============================================

export interface RateioLog {
  year_month: string;
  calculated_at: string;
  filial: string;
  nome_filial: string | null;
  marca: string | null;
  rz_ebitda: number;
  receita_bruta: number;
  receita_total: number;
  share_pct: number;
  valor_rateado: number;
}

export const getRateioLog = async (): Promise<RateioLog[]> => {
  const { data, error } = await supabase
    .from('rateio_raiz_log')
    .select('*')
    .order('year_month', { ascending: false })
    .order('valor_rateado', { ascending: true });
  if (error) {
    console.error('Erro ao buscar rateio_raiz_log:', error);
    return [];
  }
  return data || [];
};
