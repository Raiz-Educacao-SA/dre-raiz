import { supabase, DatabaseTransaction, DatabaseManualChange } from '../supabase';
import { Transaction, ManualChange, PaginationParams, PaginatedResponse, ContaContabilOption, DreAnalysis } from '../types';
import { addPermissionFiltersToObject, applyPermissionFilters } from './permissionsService';
import { debug } from '../utils/logger';
import { z } from 'zod';
import type { VariancePptMarcaEntry } from './variancePptTypes';

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
 * Retorna tag02 distintos apenas para os tag01s fornecidos (cascata via RPC DISTINCT)
 */
export const getTag02OptionsForTag01s = async (tags01: string[]): Promise<string[]> => {
  if (tags01.length === 0) return [];
  const { data, error } = await supabase.rpc('get_tag02_for_tag01s', { p_tag01s: tags01 });
  if (error || !data) return [];
  return data as string[];
};

/**
 * Retorna tag03 distintos apenas para os tag02s fornecidos (cascata via RPC DISTINCT)
 */
export const getTag03OptionsForTag02s = async (tags02: string[]): Promise<string[]> => {
  if (tags02.length === 0) return [];
  const { data, error } = await supabase.rpc('get_tag03_for_tag02s', { p_tag02s: tags02 });
  if (error || !data) return [];
  return data as string[];
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

/**
 * Busca valores distintos de uma coluna em uma tabela (para filtros)
 */
export const getDistinctColumn = async (table: string, column: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .not(column, 'is', null)
    .limit(1000);
  if (error) {
    console.error(`Erro ao buscar distinct ${column} de ${table}:`, error);
    return [];
  }
  return [...new Set((data || []).map((r: any) => r[column]).filter(Boolean))].sort() as string[];
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
    // Expandir todas as variações de case/acento para usar eq (indexável) em vez de ilike (full-scan)
    const allVariations: string[] = [];
    for (const val of filters.recurring) {
      const lower = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === 'sim') {
        allVariations.push('sim', 'Sim', 'SIM');
      } else if (lower === 'nao') {
        allVariations.push('nao', 'Nao', 'NAO', 'não', 'Não', 'NÃO');
      } else {
        allVariations.push(val);
      }
    }
    query = query.in('recurring', [...new Set(allVariations)]);
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
      query = query.or('scenario.is.null,scenario.eq.Real');
    } else {
      query = query.eq('scenario', filters.scenario);
    }
  }

  return query;
};

// ═══════════════════════════════════════════════════════════
// Cache de páginas — evita re-fetch ao navegar entre páginas já visitadas
// ═══════════════════════════════════════════════════════════
const _txPageCache: Record<string, { data: Transaction[]; totalCount: number; ts: number }> = {};
const TX_PAGE_TTL = 60_000; // 60s

const _buildTxPageCacheKey = (filters: TransactionFilters, page: number, pageSize: number, tableName: string): string => {
  const sortedFilters = Object.keys(filters).sort().reduce((acc, key) => {
    const val = (filters as any)[key];
    if (val !== undefined && val !== null) acc[key] = val;
    return acc;
  }, {} as Record<string, any>);
  return `${tableName}::p${page}::s${pageSize}::${JSON.stringify(sortedFilters)}`;
};

export const invalidateTxPageCache = () => {
  for (const key in _txPageCache) delete _txPageCache[key];
};

// Colunas selecionadas (evita SELECT * — transfere só o necessário)
const TX_SELECT_COLUMNS = 'id,date,description,conta_contabil,category,amount,type,scenario,status,filial,marca,tag0,tag01,tag02,tag03,recurring,ticket,vendor,nat_orc,chave_id,nome_filial,updated_at';

// ── Exportação genérica de tabelas (select * com filtros + paginação) ──────
// Mapeamento de colunas: coluna padrão → nome real na tabela
const TABLE_COLUMN_MAP: Record<string, Record<string, string>> = {
  transactions: {},
  transactions_orcado: {},
  transactions_ano_anterior: {},
  dre_fabric: {
    date: 'data',
    marca: 'cia',
    vendor: 'fornecedor_padrao',
    category: 'conta',
    description: 'complemento',
    tag01: 'tag1',
    tag02: 'tag2',
    tag03: 'tag3',
    chave_id: 'chave',
    amount: 'valor',
    nome_filial: 'nome_filial', // pode não existir
  },
};

// Coluna de data para cada tabela
const TABLE_DATE_COL: Record<string, string> = {
  transactions: 'date',
  transactions_orcado: 'date',
  transactions_ano_anterior: 'date',
  dre_fabric: 'data',
};

export type ExportableTable = 'transactions' | 'transactions_orcado' | 'transactions_ano_anterior' | 'dre_fabric';

export interface ExportTableFilters {
  year: string;
  months?: string[];
  marcas?: string[];
  filiais?: string[];
  tags01?: string[];
  tags02?: string[];
  tags03?: string[];
}

const PAGE_SIZE_EXPORT = 1000;

export const exportTableData = async (
  tableName: ExportableTable,
  filters: ExportTableFilters
): Promise<Record<string, unknown>[]> => {
  const colMap = TABLE_COLUMN_MAP[tableName] || {};
  const dateCol = TABLE_DATE_COL[tableName] || 'date';

  // Calcular range de datas
  const monthsArr = filters.months?.length ? [...filters.months].sort() : [];
  const monthFrom = monthsArr.length > 0 ? `${filters.year}-${monthsArr[0]}-01` : `${filters.year}-01-01`;
  const lastMonth = monthsArr.length > 0 ? monthsArr[monthsArr.length - 1] : '12';
  const lastDay = new Date(parseInt(filters.year), parseInt(lastMonth), 0).getDate();
  const monthTo = `${filters.year}-${lastMonth}-${String(lastDay).padStart(2, '0')}`;

  const allRows: Record<string, unknown>[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select('*')
      .gte(dateCol, monthFrom)
      .lte(dateCol, monthTo)
      .range(page * PAGE_SIZE_EXPORT, (page + 1) * PAGE_SIZE_EXPORT - 1);

    // Filtros dimensionais
    const marcaCol = colMap['marca'] || 'marca';
    const filialCol = colMap['nome_filial'] || 'nome_filial';
    const tag01Col = colMap['tag01'] || 'tag01';
    const tag02Col = colMap['tag02'] || 'tag02';
    const tag03Col = colMap['tag03'] || 'tag03';

    if (filters.marcas?.length)  query = query.in(marcaCol, filters.marcas);
    if (filters.filiais?.length) query = query.in(filialCol, filters.filiais);
    if (filters.tags01?.length)  query = query.in(tag01Col, filters.tags01);
    if (filters.tags02?.length)  query = query.in(tag02Col, filters.tags02);
    if (filters.tags03?.length)  query = query.in(tag03Col, filters.tags03);

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar ${tableName}: ${error.message}`);

    if (data && data.length > 0) {
      allRows.push(...data);
    }

    hasMore = (data?.length ?? 0) === PAGE_SIZE_EXPORT;
    page++;

    // Safety: max 200 pages (200k rows)
    if (page > 200) break;
  }

  return allRows;
};

export const getFilteredTransactions = async (
  filters: TransactionFilters,
  pagination?: PaginationParams,
  tableName: string = 'transactions',
  knownTotalCount?: number
): Promise<PaginatedResponse<Transaction>> => {
  // Validar filtros antes de enviar ao banco
  const parsed = transactionFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    console.error('❌ getFilteredTransactions: filtros inválidos', parsed.error.issues);
    return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
  }

  // Aplicar permissões nos filtros
  filters = addPermissionFiltersToObject(filters);
  debug('🔍 Buscando transações via RPC com filtros:', filters);

  // Expandir recurring para todas as variações de case/acento
  let expandedRecurring: string[] | null = null;
  if (filters.recurring && filters.recurring.length > 0) {
    const allVariations: string[] = [];
    for (const val of filters.recurring) {
      const lower = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === 'sim') allVariations.push('sim', 'Sim', 'SIM');
      else if (lower === 'nao') allVariations.push('nao', 'Nao', 'NAO', 'não', 'Não', 'NÃO');
      else allVariations.push(val);
    }
    expandedRecurring = [...new Set(allVariations)];
  }

  // Construir parâmetros para a RPC
  const buildRpcParams = (offset: number, limit: number, skipCount: boolean = false) => ({
    p_table_name: tableName,
    p_month_from: filters.monthFrom || null,
    p_month_to: filters.monthTo || null,
    p_scenario: filters.scenario || null,
    p_marcas: filters.marca?.length ? filters.marca : null,
    p_nome_filiais: filters.nome_filial?.length ? filters.nome_filial : null,
    p_tag0: filters.tag0?.length ? filters.tag0 : null,
    p_tags01: filters.tag01?.length ? filters.tag01 : null,
    p_tags02: filters.tag02?.length ? filters.tag02 : null,
    p_tags03: filters.tag03?.length ? filters.tag03 : null,
    p_categories: filters.category?.length ? filters.category : null,
    p_conta_contabils: filters.conta_contabil?.length ? filters.conta_contabil : null,
    p_recurring: expandedRecurring,
    p_statuses: filters.status?.length ? filters.status : null,
    p_ticket: filters.ticket || null,
    p_vendor: filters.vendor || null,
    p_description: filters.description || null,
    p_amount: filters.amount ? parseFloat(filters.amount) || null : null,
    p_chave_id: filters.chave_id || null,
    p_offset: offset,
    p_limit: limit,
    p_skip_count: skipCount,
  });

  try {
    if (pagination) {
      const { pageNumber, pageSize } = pagination;
      debug(`📄 Paginação: Página ${pageNumber}, ${pageSize} registros/página`);

      if (pageNumber < 1) return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
      if (pageSize < 1 || pageSize > 50000) return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };

      // Verificar cache de página
      const cacheKey = _buildTxPageCacheKey(filters, pageNumber, pageSize, tableName);
      const cached = _txPageCache[cacheKey];
      if (cached && (Date.now() - cached.ts) < TX_PAGE_TTL) {
        debug(`⚡ Cache hit página ${pageNumber} (${cached.data.length} registros)`);
        const totalPages = Math.ceil(cached.totalCount / pageSize);
        return { data: cached.data, totalCount: cached.totalCount, currentPage: pageNumber, totalPages, hasMore: pageNumber < totalPages };
      }

      const offset = (pageNumber - 1) * pageSize;
      // Primeira página: pular COUNT para carregar rápido (skip_count=true)
      // Páginas 2+: já temos knownTotalCount, também pular COUNT
      const skipCount = pageNumber === 1 && !knownTotalCount;
      debug(`📥 Buscando registros ${offset + 1} a ${offset + pageSize} via RPC (skipCount=${skipCount})...`);

      const { data, error } = await supabase.rpc('get_filtered_transactions_page', buildRpcParams(offset, pageSize, skipCount));

      if (error) {
        console.error('❌ Erro ao buscar transações via RPC:', error);
        throw new Error(error.message || 'Erro ao buscar transações');
      }

      if (!data || data.length === 0) {
        return { data: [], totalCount: 0, currentPage: pageNumber, totalPages: 0, hasMore: false };
      }

      // total_count: -1 significa COUNT foi pulado (skip_count=true)
      const serverCount = data[0]?.total_count;
      let totalCount: number;
      if (knownTotalCount) {
        totalCount = knownTotalCount;
      } else if (serverCount > 0) {
        totalCount = serverCount;
      } else if (data.length < pageSize) {
        // Menos que uma página = sabemos o total exato
        totalCount = offset + data.length;
      } else {
        // COUNT pulado e página cheia = há mais dados, estimar como "pelo menos"
        totalCount = offset + data.length + 1; // +1 indica "há mais"
      }
      debug(`📊 Total: ${totalCount} (${data.length} nesta página, serverCount=${serverCount})`);

      const tag0Map = await getTag0Map();
      const enriched = data.map((db: any) => {
        const t = dbToTransaction(db);
        if (!t.tag0 && t.tag01) t.tag0 = resolveTag0(t.tag01, tag0Map);
        return t;
      });

      const totalPages = Math.ceil(totalCount / pageSize);
      _txPageCache[cacheKey] = { data: enriched, totalCount, ts: Date.now() };

      return { data: enriched, totalCount, currentPage: pageNumber, totalPages, hasMore: pageNumber < totalPages };
    }

    // ═══════════════════════════════════════════════════════════
    // SEM PAGINAÇÃO: Busca em lotes via RPC
    // ═══════════════════════════════════════════════════════════
    const BATCH_SIZE = 1000;
    const PARALLEL_BATCHES = 3;

    // Primeiro lote
    const { data: firstBatch, error: firstError } = await supabase.rpc('get_filtered_transactions_page', buildRpcParams(0, BATCH_SIZE));
    if (firstError) {
      console.error('❌ Erro no primeiro lote via RPC:', firstError);
      throw new Error(firstError.message || 'Erro ao buscar transações');
    }

    if (!firstBatch || firstBatch.length === 0) {
      return { data: [], totalCount: 0, currentPage: 1, totalPages: 0, hasMore: false };
    }

    const totalCount = firstBatch[0]?.total_count || firstBatch.length;

    // Se tudo cabe no primeiro lote
    if (firstBatch.length < BATCH_SIZE) {
      const tag0Map = await getTag0Map();
      const enriched = firstBatch.map((db: any) => {
        const t = dbToTransaction(db);
        if (!t.tag0 && t.tag01) t.tag0 = resolveTag0(t.tag01, tag0Map);
        return t;
      });
      return { data: enriched, totalCount: enriched.length, currentPage: 1, totalPages: 1, hasMore: false };
    }

    // Múltiplos lotes
    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
    debug(`📦 Buscando ${totalCount} registros em ${totalBatches} lotes via RPC...`);

    const fetchBatch = async (batchIdx: number) => {
      const { data, error } = await supabase.rpc('get_filtered_transactions_page', buildRpcParams(batchIdx * BATCH_SIZE, BATCH_SIZE));
      if (error) {
        console.error(`❌ Erro no lote ${batchIdx + 1}:`, error);
        return [];
      }
      return data || [];
    };

    const allData: any[] = [...firstBatch];

    for (let i = 1; i < totalBatches; i += PARALLEL_BATCHES) {
      const batchIndices = Array.from({ length: Math.min(PARALLEL_BATCHES, totalBatches - i) }, (_, j) => i + j);
      const results = await Promise.all(batchIndices.map(fetchBatch));
      for (const result of results) allData.push(...result);

      const lastResult = results[results.length - 1];
      if (lastResult.length < BATCH_SIZE) break;
    }

    debug(`✅ ${allData.length} transações carregadas`);

    const tag0Map = await getTag0Map();
    const enriched = allData.map((db: any) => {
      const t = dbToTransaction(db);
      if (!t.tag0 && t.tag01) t.tag0 = resolveTag0(t.tag01, tag0Map);
      return t;
    });

    return { data: enriched, totalCount: enriched.length, currentPage: 1, totalPages: 1, hasMore: false };
  } catch (err: any) {
    throw err;
  }
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

// Inserção em massa na tabela transactions_manual (lançamentos manuais via Admin)
export const bulkAddTransactionsManual = async (transactions: Omit<Transaction, 'id'>[]): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions_manual')
    .insert(transactions.map(t => {
      const db = transactionToDb(t as Transaction);
      // Forçar scenario = 'Real' e status = 'Manual' para lançamentos manuais
      db.scenario = 'Real';
      db.status = 'Manual';
      return db;
    }))
    .select();

  if (error) {
    console.error('Error bulk adding transactions_manual:', error);
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
export const getPendingChangesCount = async (userEmail?: string, isApprover?: boolean): Promise<number> => {
  let query = supabase
    .from('manual_changes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pendente');

  // Se NÃO é approver/admin, contar apenas as solicitações do próprio usuário
  if (!isApprover && userEmail) {
    query = query.eq('requested_by', userEmail);
  }

  const { count, error } = await query;
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

/** Busca manual_changes de uma transação específica (para exibir justificativas no detalhe) */
export const getManualChangesByTransactionId = async (transactionId: string): Promise<ManualChange[]> => {
  const { data, error } = await supabase
    .from('manual_changes')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('requested_at', { ascending: false });
  if (error) {
    console.error('❌ Erro ao buscar manual_changes por transaction_id:', error);
    return [];
  }
  return (data || []).map(dbToManualChange);
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
    .order('fornecedor_de')
    .range(0, 999);
  if (error) {
    console.error('Erro ao buscar depara_fornec:', error);
    return [];
  }
  return data || [];
};

export const getDeparaFornecCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('depara_fornec')
    .select('fornecedor_de', { count: 'exact', head: true });
  if (error) {
    console.error('Erro ao contar depara_fornec:', error);
    return 0;
  }
  return count || 0;
};

export const searchDeparaFornec = async (term: string): Promise<DeparaFornec[]> => {
  const pattern = `%${term.trim()}%`;
  const { data, error } = await supabase
    .from('depara_fornec')
    .select('fornecedor_de, fornecedor_para, updated_at')
    .or(`fornecedor_de.ilike.${pattern},fornecedor_para.ilike.${pattern}`)
    .order('fornecedor_de')
    .limit(500);
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
// Override Contábil (substituição contábil → manual)
// ============================================

export interface OverrideContabil {
  id: number;
  tag01: string;
  marca: string | null;
  filial: string | null;
  mes_de: string | null;
  mes_ate: string | null;
  motivo: string;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const getOverrideContabil = async (): Promise<OverrideContabil[]> => {
  const { data, error } = await supabase
    .from('override_contabil')
    .select('*')
    .order('tag01')
    .order('marca');
  if (error) {
    console.error('Erro ao buscar override_contabil:', error);
    return [];
  }
  return data || [];
};

export const insertOverrideContabil = async (
  row: Omit<OverrideContabil, 'id' | 'created_at' | 'updated_at'>
): Promise<OverrideContabil | null> => {
  const { data, error } = await supabase
    .from('override_contabil')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('Erro ao inserir override_contabil:', error);
    return null;
  }
  return data;
};

export const updateOverrideContabil = async (
  id: number,
  updates: Partial<Omit<OverrideContabil, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ ok: boolean; error?: string }> => {
  const { data, error } = await supabase
    .from('override_contabil')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) {
    console.error('Erro ao atualizar override_contabil:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Nenhuma linha atualizada. Verifique permissões (RLS).' };
  }
  return { ok: true };
};

export const deleteOverrideContabil = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('override_contabil')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao deletar override_contabil:', error);
    return false;
  }
  return true;
};

export const subscribeOverrideContabil = (onChange: () => void) => {
  const channel = supabase
    .channel('override_contabil_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'override_contabil' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
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

// ============================================
// Tributos Config
// ============================================

export interface TributoConfig {
  id: number;
  marca: string;
  filial: string;
  tipo_receita: string;
  pis_cofins: number;
  iss: number;
  paa: number;
  created_at: string;
  updated_at: string;
}

export const TIPOS_RECEITA = [
  'Receitas Não Operacionais',
  'Material Didático',
  'Receitas Extras',
  'Integral',
  'Receita De Mensalidade',
] as const;

export const getTributosConfig = async (marca: string, filial: string): Promise<TributoConfig[]> => {
  const { data, error } = await supabase
    .from('tributos_config')
    .select('*')
    .eq('marca', marca)
    .eq('filial', filial)
    .order('tipo_receita');
  if (error) {
    console.error('Erro ao buscar tributos_config:', error);
    return [];
  }
  return data || [];
};

export const getAllTributosConfig = async (): Promise<TributoConfig[]> => {
  const { data, error } = await supabase
    .from('tributos_config')
    .select('*')
    .order('marca')
    .order('filial')
    .order('tipo_receita');
  if (error) {
    console.error('Erro ao buscar tributos_config (all):', error);
    return [];
  }
  return data || [];
};

export const upsertTributosConfig = async (
  rows: { marca: string; filial: string; tipo_receita: string; pis_cofins: number; iss: number; paa: number }[]
): Promise<{ ok: boolean; error?: string }> => {
  const { error } = await supabase
    .from('tributos_config')
    .upsert(rows, { onConflict: 'marca,filial,tipo_receita' });
  if (error) {
    console.error('Erro ao upsert tributos_config:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const updateTributoConfig = async (
  id: number,
  updates: Partial<Pick<TributoConfig, 'pis_cofins' | 'iss' | 'paa'>>
): Promise<{ ok: boolean; error?: string }> => {
  const { data, error } = await supabase
    .from('tributos_config')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) {
    console.error('Erro ao atualizar tributos_config:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Nenhuma linha atualizada. Verifique permissões (RLS).' };
  }
  return { ok: true };
};

export const deleteTributosConfigByFilial = async (marca: string, filial: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tributos_config')
    .delete()
    .eq('marca', marca)
    .eq('filial', filial);
  if (error) {
    console.error('Erro ao excluir tributos_config:', error);
    return false;
  }
  return true;
};

export const deleteTributoConfig = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('tributos_config')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir tributos_config row:', error);
    return false;
  }
  return true;
};

export const subscribeTributosConfig = (onChange: () => void) => {
  const channel = supabase
    .channel('tributos_config_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tributos_config' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ============================================
// Tributos — Pendências (receita sem config)
// ============================================

export interface TributoPendente {
  o_marca: string;
  o_filial: string;
  o_tipo_receita: string;
  o_meses: number;
  o_receita_total: number;
}

export async function getTributosPendentes(): Promise<TributoPendente[]> {
  try {
    const { data, error } = await supabase.rpc('get_tributos_pendentes');
    if (error) throw error;
    return (data || []) as TributoPendente[];
  } catch (err) {
    console.error('Erro ao buscar tributos pendentes:', err);
    return [];
  }
}

// ============================================
// Variance Justifications — Cobrança de Desvios
// ============================================

export interface VarianceJustification {
  id: number;
  year_month: string;
  marca: string;
  tag0: string;
  tag01: string;
  tag02: string | null;
  tag03: string | null;
  comparison_type: 'orcado' | 'a1';
  real_value: number;
  compare_value: number;
  variance_abs: number;
  variance_pct: number | null;
  status: 'pending' | 'notified' | 'justified' | 'approved' | 'rejected';
  owner_email: string | null;
  owner_name: string | null;
  justification: string | null;
  action_plan: string | null;
  ai_summary: string | null;
  ai_summary_at: string | null;
  justified_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  notified_at: string | null;
  version: number;
  snapshot_at: string | null;
  mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export interface VarianceThreshold {
  id: number;
  marca: string | null;
  tag0: string | null;
  min_abs_value: number;
  min_pct_value: number;
  active: boolean;
  created_at: string;
}

export interface VarianceFilters {
  year_month?: string;
  marca?: string;
  marcas?: string[];
  status?: string;
  owner_email?: string;
  comparison_type?: string;
  version?: number;
}

/**
 * Busca justificativas de desvios com filtros opcionais.
 */
export const getVarianceJustifications = async (
  filters?: VarianceFilters
): Promise<VarianceJustification[]> => {
  const PAGE = 1000;
  let offset = 0;
  let allData: VarianceJustification[] = [];
  let keepGoing = true;

  while (keepGoing) {
    let query = supabase
      .from('variance_justifications')
      .select('*')
      .order('tag0')
      .order('tag01')
      .order('tag02')
      .order('tag03')
      .range(offset, offset + PAGE - 1);

    if (filters?.year_month) query = query.eq('year_month', filters.year_month);
    if (filters?.marcas && filters.marcas.length > 0) {
      const marcaFilters = filters.marcas.map(m => `marca.eq.${m}`).join(',');
      query = query.or(`${marcaFilters},marca.is.null,marca.eq.`);
    } else if (filters?.marca) {
      query = query.or(`marca.eq.${filters.marca},marca.is.null,marca.eq.`);
    }
    if (filters?.version) query = query.eq('version', filters.version);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.owner_email) query = query.eq('owner_email', filters.owner_email);
    if (filters?.comparison_type) query = query.eq('comparison_type', filters.comparison_type);

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar variance_justifications:', error);
      return allData;
    }
    if (!data || data.length === 0) {
      keepGoing = false;
    } else {
      allData = allData.concat(data as VarianceJustification[]);
      keepGoing = data.length === PAGE;
      offset += PAGE;
    }
  }
  return allData;
};

/**
 * Retorna a versão mais recente de variance_justifications para um year_month.
 * Se marcas fornecidas, filtra por marca. Retorna 0 se nenhuma foto existe.
 */
export const getLatestVarianceVersion = async (
  yearMonth: string,
  marcas?: string[],
): Promise<number> => {
  let query = supabase
    .from('variance_justifications')
    .select('version')
    .eq('year_month', yearMonth)
    .order('version', { ascending: false })
    .limit(1);
  if (marcas && marcas.length > 0) {
    query = query.in('marca', marcas);
  }
  const { data } = await query;
  return data?.[0]?.version || 0;
};

/**
 * Busca justificativas de desvios para YTD (Jan até o mês selecionado).
 */
export const getVarianceYtdItems = async (
  yearStart: string,
  throughMonth: string,
  marca?: string,
  marcas?: string[]
): Promise<VarianceJustification[]> => {
  const PAGE = 1000;
  let offset = 0;
  let allData: VarianceJustification[] = [];
  let keepGoing = true;

  while (keepGoing) {
    let query = supabase
      .from('variance_justifications')
      .select('*')
      .gte('year_month', yearStart)
      .lte('year_month', throughMonth)
      .order('year_month')
      .order('tag0')
      .order('tag01')
      .range(offset, offset + PAGE - 1);

    if (marcas && marcas.length > 0) {
      const marcaFilters = marcas.map(m => `marca.eq.${m}`).join(',');
      query = query.or(`${marcaFilters},marca.is.null,marca.eq.`);
    } else if (marca) {
      query = query.or(`marca.eq.${marca},marca.is.null,marca.eq.`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar YTD:', error);
      return allData;
    }
    if (!data || data.length === 0) {
      keepGoing = false;
    } else {
      allData = allData.concat(data as VarianceJustification[]);
      keepGoing = data.length === PAGE;
      offset += PAGE;
    }
  }
  return allData;
};

/**
 * Busca dados LIVE do DRE (via RPCs) para gerar slides PPT com filtro de marca.
 * Usa mesmas fontes do DRE Gerencial: get_soma_tags + get_variance_snapshot.
 * Retorna VarianceJustification[] compatível com prepareVariancePptData.
 */
export async function fetchLiveDreForPpt(
  yearMonth: string,
  marca: string,
): Promise<VarianceJustification[]> {
  const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.']);
  const isDre = (t: string) => DRE_PREFIXES.has((t || '').slice(0, 3));
  const now = new Date().toISOString();

  // 1. get_soma_tags → tag0+tag01 (Real, Orçado, A-1)
  const { data: somaData, error: somaError } = await supabase.rpc('get_soma_tags', {
    p_month_from: yearMonth,
    p_month_to: yearMonth,
    p_marcas: [marca],
    p_nome_filiais: null,
    p_tags02: null,
    p_tags01: null,
    p_recurring: 'Sim',
    p_tags03: null,
  });
  if (somaError || !somaData?.length) return [];

  // 2. get_variance_snapshot → tag02 detail
  const PAGE_SIZE = 1000;
  let snapOffset = 0;
  let snapMore = true;
  const snapRows: any[] = [];
  while (snapMore) {
    const { data: snapPage, error: snapError } = await supabase
      .rpc('get_variance_snapshot', {
        p_year_month: yearMonth,
        p_marcas: [marca],
        p_recurring: 'Sim',
      })
      .range(snapOffset, snapOffset + PAGE_SIZE - 1);
    if (snapError || !snapPage?.length) { snapMore = false; break; }
    for (const r of snapPage) {
      if (isDre(r.tag0) && r.tag02) snapRows.push(r);
    }
    snapMore = snapPage.length === PAGE_SIZE;
    snapOffset += PAGE_SIZE;
  }

  // 3. Aggregate all data by (tag0, tag01, tag02, scenario)
  const aggMap = new Map<string, number>();
  const combos = new Set<string>();

  for (const r of (somaData as any[]).filter((r: any) => isDre(r.tag0))) {
    const key = `${r.tag0}|${r.tag01 || ''}||${r.scenario}`;
    aggMap.set(key, (aggMap.get(key) || 0) + Number(r.total || 0));
    combos.add(`${r.tag0}|${r.tag01 || ''}|`);
  }
  for (const r of snapRows) {
    const key = `${r.tag0}|${r.tag01 || ''}|${r.tag02}|${r.scenario}`;
    aggMap.set(key, (aggMap.get(key) || 0) + Number(r.total || 0));
    combos.add(`${r.tag0}|${r.tag01 || ''}|${r.tag02}`);
  }

  // 4. Build VarianceJustification items
  const items: VarianceJustification[] = [];
  let id = 1;

  const base: Omit<VarianceJustification, 'id' | 'tag0' | 'tag01' | 'tag02' | 'tag03' | 'comparison_type' | 'real_value' | 'compare_value' | 'variance_abs' | 'variance_pct'> = {
    year_month: yearMonth, marca, status: 'pending' as const,
    owner_email: null, owner_name: null, justification: null, action_plan: null,
    ai_summary: null, ai_summary_at: null, justified_at: null,
    reviewed_by: null, reviewed_at: null, review_note: null, notified_at: null,
    version: 1, snapshot_at: now, created_at: now, updated_at: now,
  };

  for (const combo of combos) {
    const [tag0, tag01, tag02] = combo.split('|');
    const real = aggMap.get(`${combo}|Real`) || 0;
    const orc = aggMap.get(`${combo}|Orçado`) || 0;
    const a1 = aggMap.get(`${combo}|A-1`) || 0;

    const addComp = (compareVal: number, compType: 'orcado' | 'a1') => {
      if (real === 0 && compareVal === 0) return;
      const varAbs = real - compareVal;
      const varPct = compareVal !== 0 ? Math.round(((real - compareVal) / Math.abs(compareVal)) * 1000) / 10 : null;
      items.push({ ...base, id: id++, tag0, tag01: tag01 || '', tag02: tag02 || null, tag03: null, comparison_type: compType, real_value: real, compare_value: compareVal, variance_abs: varAbs, variance_pct: varPct });
    };
    addComp(orc, 'orcado');
    addComp(a1, 'a1');
  }

  // 5. Calc rows (MARGEM, EBITDA)
  const prefixAgg = new Map<string, number>();
  for (const r of (somaData as any[]).filter((r: any) => isDre(r.tag0))) {
    const pk = `${(r.tag0 || '').slice(0, 3)}|${r.scenario}`;
    prefixAgg.set(pk, (prefixAgg.get(pk) || 0) + Number(r.total || 0));
  }
  const g = (p: string, s: string) => prefixAgg.get(`${p}|${s}`) || 0;

  const addCalc = (label: string, real: number, orc: number, a1: number) => {
    const addC = (cv: number, ct: 'orcado' | 'a1') => {
      if (real === 0 && cv === 0) return;
      const va = real - cv;
      const vp = cv !== 0 ? Math.round(((real - cv) / Math.abs(cv)) * 1000) / 10 : null;
      items.push({ ...base, id: id++, tag0: label, tag01: '', tag02: null, tag03: null, comparison_type: ct, real_value: real, compare_value: cv, variance_abs: va, variance_pct: vp });
    };
    addC(orc, 'orcado');
    addC(a1, 'a1');
  };

  const mR = g('01.','Real') + g('02.','Real') + g('03.','Real');
  const mO = g('01.','Orçado') + g('02.','Orçado') + g('03.','Orçado');
  const mA = g('01.','A-1') + g('02.','A-1') + g('03.','A-1');
  addCalc('MARGEM DE CONTRIBUIÇÃO', mR, mO, mA);

  const eR = mR + g('04.','Real'), eO = mO + g('04.','Orçado'), eA = mA + g('04.','A-1');
  addCalc('EBITDA (S/ RATEIO RAIZ CSC)', eR, eO, eA);
  addCalc('EBITDA TOTAL', eR + g('05.','Real'), eO + g('05.','Orçado'), eA + g('05.','A-1'));

  // 6. Merge justifications from snapshot (if any exist for this marca)
  const { data: justData } = await supabase
    .from('variance_justifications')
    .select('tag0,tag01,tag02,comparison_type,justification,ai_summary,status,owner_name')
    .eq('year_month', yearMonth)
    .or(`marca.eq.${marca},marca.is.null,marca.eq.`)
    .in('status', ['justified', 'approved']);
  if (justData) {
    const justMap = new Map<string, typeof justData[0]>();
    for (const j of justData) justMap.set(`${j.tag0}|${j.tag01 || ''}|${j.tag02 || ''}|${j.comparison_type}`, j);
    for (const item of items) {
      const j = justMap.get(`${item.tag0}|${item.tag01 || ''}|${item.tag02 || ''}|${item.comparison_type}`);
      if (j) {
        item.justification = j.justification;
        item.ai_summary = j.ai_summary;
        item.status = j.status as any;
        item.owner_name = j.owner_name;
      }
    }
  }

  return items;
}

/**
 * Gera snapshot de desvios a partir dos dados EXATOS exibidos na DRE Gerencial.
 * Chamado pelo botão "Gerar Foto" no SomaTagsView — garante foto = tela.
 */
export interface DreSnapshotGroup {
  tag0: string;
  real: number;
  orcado: number;
  a1: number;
  items: Array<{ tag01: string; real: number; orcado: number; a1: number }>;
}

export const generateSnapshotFromDre = async (
  yearMonth: string,
  groups: DreSnapshotGroup[],
  opts: {
    marca?: string;
    depth?: 1 | 2 | 3;
  } = {},
): Promise<{ created: number; updated: number; version: number; snapshot_at?: string; error?: string; diagnostics?: string }> => {
  try {
    const snapshotAt = new Date().toISOString();
    const marca = opts.marca;
    const depth = opts.depth || 2;
    debug(`📸 Gerando foto DRE para ${yearMonth}, marca=${marca || 'todas'}, depth=${depth} — snapshot_at=${snapshotAt}`);

    // Prefixos DRE (01.–06.)
    const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.', '06.']);
    const isDrePrefix = (tag0: string) => DRE_PREFIXES.has((tag0 || '').slice(0, 3));

    // 1. Converter groups da DRE → formato unificado (tag0+tag01, sem tag02)
    // Estes valores SÃO os da tela — zero chance de divergência
    const allAggData: any[] = [];
    for (const g of groups) {
      if (!isDrePrefix(g.tag0)) continue;
      for (const item of g.items) {
        // Real
        allAggData.push({ tag0: g.tag0, tag01: item.tag01, tag02: null, tag03: null, scenario: 'Real', total_amount: item.real, marca: marca || '' });
        // Orçado
        if (item.orcado !== 0) allAggData.push({ tag0: g.tag0, tag01: item.tag01, tag02: null, tag03: null, scenario: 'Orçado', total_amount: item.orcado, marca: marca || '' });
        // A-1
        if (item.a1 !== 0) allAggData.push({ tag0: g.tag0, tag01: item.tag01, tag02: null, tag03: null, scenario: 'A-1', total_amount: item.a1, marca: marca || '' });
      }
    }

    debug(`📸 DRE groups: ${allAggData.length} linhas de ${groups.length} tag0s`);

    if (allAggData.length === 0) {
      return { created: 0, updated: 0, version: 0, error: 'Nenhum dado na DRE para gerar foto.' };
    }

    // 2. DETALHE tag02+marca via get_variance_snapshot (se depth >= 2)
    if (depth >= 2) {
      const PAGE_SIZE = 1000;
      let snapOffset = 0;
      let snapMore = true;
      while (snapMore) {
        const { data: snapPage, error: snapError } = await supabase
          .rpc('get_variance_snapshot', {
            p_year_month: yearMonth,
            p_marcas: marca ? [marca] : null,
            p_recurring: 'Sim',
          })
          .range(snapOffset, snapOffset + PAGE_SIZE - 1);

        if (snapError) {
          debug(`⚠️ get_variance_snapshot falhou: ${snapError.message}`);
          break;
        }
        if (!snapPage || snapPage.length === 0) {
          snapMore = false;
        } else {
          for (const r of snapPage) {
            if (!isDrePrefix(r.tag0)) continue;
            if (r.tag02) {
              allAggData.push({
                tag0: r.tag0, tag01: r.tag01, tag02: r.tag02, tag03: null,
                scenario: r.scenario, total_amount: r.total, marca: r.marca || '',
              });
            }
          }
          snapMore = snapPage.length === PAGE_SIZE;
          snapOffset += PAGE_SIZE;
        }
      }
    }

    // 3. Buscar versão atual
    let versionQuery = supabase
      .from('variance_justifications')
      .select('version')
      .eq('year_month', yearMonth)
      .order('version', { ascending: false })
      .limit(1);
    if (marca) versionQuery = versionQuery.eq('marca', marca);
    const { data: versionData } = await versionQuery;
    const nextVersion = (versionData?.[0]?.version || 0) + 1;

    // 4. Buscar itens existentes com justificativa (para preservar)
    let existingQuery = supabase
      .from('variance_justifications')
      .select('*')
      .eq('year_month', yearMonth)
      .in('status', ['justified', 'approved', 'rejected']);
    if (marca) existingQuery = existingQuery.eq('marca', marca);
    const { data: existingItems } = await existingQuery;

    const existingMap = new Map<string, VarianceJustification>();
    if (existingItems) {
      for (const item of existingItems) {
        const pk = `${item.marca}||${item.tag0}|${item.tag01 || ''}|${item.tag02 || ''}|${item.tag03 || ''}|${item.comparison_type}`;
        existingMap.set(pk, item);
      }
    }

    // 5. Buscar owners via user_permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('user_id, permission_type, permission_value')
      .in('permission_type', ['centro_custo', 'cia']);
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, name');

    const userMap = new Map<string, { email: string; name: string }>();
    if (allUsers) allUsers.forEach(u => userMap.set(u.id, { email: u.email, name: u.name }));
    const tag01OwnerMap = new Map<string, { email: string; name: string }>();
    if (permissions) {
      for (const p of permissions) {
        if (p.permission_type === 'centro_custo' && p.permission_value) {
          const u = userMap.get(p.user_id);
          if (u) tag01OwnerMap.set(p.permission_value, u);
        }
      }
    }

    // 6. Buscar thresholds
    const { data: thresholdsData } = await supabase
      .from('variance_thresholds')
      .select('*')
      .eq('active', true);
    const activeThresholds = (thresholdsData || []) as VarianceThreshold[];

    const exceedsThreshold = (tag0: string, marcaVal: string, varAbsVal: number, varPctVal: number | null): boolean => {
      if (activeThresholds.length === 0) return true;
      let best: VarianceThreshold | null = null;
      for (const t of activeThresholds) {
        const matchMarca = !t.marca || t.marca === marcaVal;
        const matchTag0 = !t.tag0 || tag0.startsWith(t.tag0);
        if (!matchMarca || !matchTag0) continue;
        const specificity = (t.marca ? 2 : 0) + (t.tag0 ? 1 : 0);
        const bestSpec = best ? ((best.marca ? 2 : 0) + (best.tag0 ? 1 : 0)) : -1;
        if (specificity > bestSpec) best = t;
      }
      if (!best) return true;
      const absExceeds = best.min_abs_value > 0 && Math.abs(varAbsVal) >= best.min_abs_value;
      const pctExceeds = best.min_pct_value > 0 && varPctVal !== null && Math.abs(varPctVal) >= best.min_pct_value;
      if (best.min_abs_value > 0 && best.min_pct_value > 0) return absExceeds || pctExceeds;
      if (best.min_abs_value > 0) return absExceeds;
      if (best.min_pct_value > 0) return pctExceeds;
      return true;
    };

    // 7. Agregar e gerar rows
    const aggMap = new Map<string, number>();
    for (const row of allAggData) {
      const key = `${row.marca}||${row.tag0}|${row.tag01 || ''}|${row.tag02 || ''}|${row.tag03 || ''}|${row.scenario}`;
      aggMap.set(key, (aggMap.get(key) || 0) + Number(row.total_amount || 0));
    }
    const combos = new Set<string>();
    for (const row of allAggData) {
      combos.add(`${row.marca}||${row.tag0}|${row.tag01 || ''}|${row.tag02 || ''}|${row.tag03 || ''}`);
    }

    const newRows: any[] = [];
    const updateItems: any[] = [];

    for (const combo of combos) {
      const parts = combo.split('||');
      const comboMarca = parts[0];
      const tagParts = parts[1].split('|');
      const [tag0, tag01, tag02, tag03] = tagParts;
      const realVal = aggMap.get(`${combo}|Real`) || 0;
      const orcVal = aggMap.get(`${combo}|Orçado`) || 0;
      const a1Val = aggMap.get(`${combo}|A-1`) || 0;
      const owner = tag01 ? tag01OwnerMap.get(tag01) : undefined;

      const processComparison = (compareVal: number, compType: 'orcado' | 'a1') => {
        if (realVal === 0 && compareVal === 0) return;
        const varAbs = realVal - compareVal;
        const varPct = compareVal !== 0 ? Math.round(((realVal - compareVal) / Math.abs(compareVal)) * 1000) / 10 : null;
        const isLeaf = !!(comboMarca && comboMarca !== '' && (tag02 || depth === 1));
        // Threshold define se justificativa é obrigatória (fora do range) ou opcional (dentro)
        const isMandatory = isLeaf ? exceedsThreshold(tag0, comboMarca, varAbs, varPct) : false;

        const existKey = `${comboMarca || marca || ''}||${tag0}|${tag01 || ''}|${tag02 || ''}|${tag03 || ''}|${compType}`;
        const existing = existingMap.get(existKey);

        if (existing) {
          updateItems.push({
            id: existing.id, real_value: realVal, compare_value: compareVal,
            variance_abs: varAbs, variance_pct: varPct, version: nextVersion,
            owner_email: owner?.email || existing.owner_email,
            owner_name: owner?.name || existing.owner_name,
            mandatory: isMandatory,
          });
          existingMap.delete(existKey);
        } else {
          newRows.push({
            year_month: yearMonth, marca: comboMarca || marca || '',
            tag0, tag01: tag01 || '', tag02: tag02 || null, tag03: tag03 || null,
            comparison_type: compType, real_value: realVal, compare_value: compareVal,
            variance_abs: varAbs, variance_pct: varPct,
            owner_email: owner?.email || null, owner_name: owner?.name || null,
            version: nextVersion, snapshot_at: snapshotAt,
            mandatory: isMandatory,
          });
        }
      };
      processComparison(orcVal, 'orcado');
      processComparison(a1Val, 'a1');
    }

    // 8. CalcRows: MARGEM, EBITDA, EBITDA TOTAL (dos groups da tela)
    const prefixTotals = new Map<string, number>();
    for (const g of groups) {
      if (!isDrePrefix(g.tag0)) continue;
      const pfx = g.tag0.slice(0, 3);
      prefixTotals.set(`${pfx}|Real`, (prefixTotals.get(`${pfx}|Real`) || 0) + g.real);
      prefixTotals.set(`${pfx}|Orçado`, (prefixTotals.get(`${pfx}|Orçado`) || 0) + g.orcado);
      prefixTotals.set(`${pfx}|A-1`, (prefixTotals.get(`${pfx}|A-1`) || 0) + g.a1);
    }
    const get = (pfx: string, sc: string) => prefixTotals.get(`${pfx}|${sc}`) || 0;
    const margemR = get('01.', 'Real') + get('02.', 'Real') + get('03.', 'Real');
    const margemO = get('01.', 'Orçado') + get('02.', 'Orçado') + get('03.', 'Orçado');
    const margemA = get('01.', 'A-1') + get('02.', 'A-1') + get('03.', 'A-1');
    const ebitdaR = margemR + get('04.', 'Real'), ebitdaO = margemO + get('04.', 'Orçado'), ebitdaA = margemA + get('04.', 'A-1');
    const etR = ebitdaR + get('05.', 'Real') + get('06.', 'Real');
    const etO = ebitdaO + get('05.', 'Orçado') + get('06.', 'Orçado');
    const etA = ebitdaA + get('05.', 'A-1') + get('06.', 'A-1');

    const addCalcRow = (label: string, realV: number, orcV: number, a1V: number) => {
      const addComp = (compareVal: number, compType: 'orcado' | 'a1') => {
        if (realV === 0 && compareVal === 0) return;
        const varAbs = realV - compareVal;
        const varPct = compareVal !== 0 ? Math.round(((realV - compareVal) / Math.abs(compareVal)) * 1000) / 10 : null;
        newRows.push({
          year_month: yearMonth, marca: marca || '',
          tag0: label, tag01: '', tag02: null, tag03: null,
          comparison_type: compType, real_value: realV, compare_value: compareVal,
          variance_abs: varAbs, variance_pct: varPct,
          owner_email: null, owner_name: null,
          version: nextVersion, snapshot_at: snapshotAt,
        });
      };
      addComp(orcV, 'orcado');
      addComp(a1V, 'a1');
    };
    addCalcRow('MARGEM DE CONTRIBUIÇÃO', margemR, margemO, margemA);
    addCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', ebitdaR, ebitdaO, ebitdaA);
    addCalcRow('EBITDA TOTAL', etR, etO, etA);

    // 9. DELETE pendentes/notificados antigos
    let delQuery = supabase.from('variance_justifications').delete().eq('year_month', yearMonth);
    if (marca) delQuery = delQuery.eq('marca', marca);
    delQuery = delQuery.in('status', ['pending', 'notified']);
    await delQuery;

    // 9.5 DELETE calc rows antigos
    let delCalcQuery = supabase.from('variance_justifications').delete().eq('year_month', yearMonth)
      .in('tag0', ['MARGEM DE CONTRIBUIÇÃO', 'EBITDA', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
    if (marca) delCalcQuery = delCalcQuery.eq('marca', marca);
    await delCalcQuery;

    // 10. UPDATE existentes
    let totalUpdated = 0;
    for (const item of updateItems) {
      const { error: updErr } = await supabase
        .from('variance_justifications')
        .update({
          real_value: item.real_value, compare_value: item.compare_value,
          variance_abs: item.variance_abs, variance_pct: item.variance_pct,
          version: item.version, owner_email: item.owner_email, owner_name: item.owner_name,
          snapshot_at: snapshotAt, mandatory: item.mandatory,
        })
        .eq('id', item.id);
      if (!updErr) totalUpdated++;
    }

    // 11. INSERT novos em batches
    let totalCreated = 0;
    const BATCH_SIZE = 200;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const { data: inserted, error: insertErr } = await supabase
        .from('variance_justifications')
        .insert(batch)
        .select('id');
      if (insertErr) {
        console.error(`❌ INSERT batch ${i} falhou:`, insertErr);
        for (const row of batch) {
          const { error: singleErr } = await supabase.from('variance_justifications').insert(row);
          if (!singleErr) totalCreated++;
        }
      } else {
        totalCreated += inserted?.length || batch.length;
      }
    }

    debug(`📸 Foto v${nextVersion}: ${totalCreated} criados + ${totalUpdated} atualizados`);
    return { created: totalCreated, updated: totalUpdated, version: nextVersion, snapshot_at: snapshotAt };
  } catch (err: any) {
    console.error('❌ generateSnapshotFromDre:', err);
    return { created: 0, updated: 0, version: 0, error: err.message || String(err) };
  }
};

/**
 * Gera itens de desvio para um mês/marca.
 * FONTE PRINCIPAL: get_soma_tags RPC (mesma do DRE Gerencial) → tag0+tag01
 * DETALHE: dre_agg materialized view → tag02+tag03 (suplementar)
 * Cruza Real vs Orçado E Real vs A-1. Identifica owner via user_permissions.
 */
export const generateVarianceItems = async (
  yearMonth: string,
  marca?: string,
  depth: 1 | 2 | 3 = 2,
): Promise<{ created: number; updated: number; version: number; snapshot_at?: string; error?: string; diagnostics?: string }> => {
  try {
    const snapshotAt = new Date().toISOString();
    const depthLabels: Record<number, string> = { 1: 'tag01+marca', 2: 'tag02+marca', 3: 'tag03+marca' };
    debug(`📊 Gerando desvios para ${yearMonth}, marca=${marca || 'todas'}, depth=${depth} (${depthLabels[depth]}) — snapshot_at=${snapshotAt}`);

    // 1. FONTE PRINCIPAL — getSomaTags() (MESMA função usada pelo DRE Gerencial)
    // Usa a wrapper que o SomaTagsView usa, garantindo dados idênticos
    const somaData = await getSomaTags(
      yearMonth, yearMonth,
      marca ? [marca] : undefined,
      undefined, undefined, undefined,
      'Sim',     // Mesmo padrão do DRE Gerencial (recurring = 'Sim')
      undefined,
    );

    if (!somaData || somaData.length === 0) {
      return { created: 0, updated: 0, version: 0, error: 'Nenhum dado retornado por get_soma_tags para o período. Verifique se existem lançamentos.' };
    }

    // Corte até EBITDA TOTAL: prefixos 01.–06. (06. = Rateio Raiz, parte do EBITDA TOTAL)
    const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.', '06.']);
    const isDrePrefix = (tag0: string) => DRE_PREFIXES.has((tag0 || '').slice(0, 3));

    // Pré-agregar soma por (tag0, tag01, scenario) — EXATAMENTE como SomaTagsView faz
    // get_soma_tags retorna UNION ALL (pode ter 2 rows p/ mesmo tag0+tag01+scenario: transactions + transactions_manual)
    // SomaTagsView soma com += , aqui fazemos o mesmo antes de gerar os itens
    const somaAggMap = new Map<string, number>();
    for (const row of somaData) {
      if (!isDrePrefix(row.tag0)) continue;
      const key = `${row.tag0}|${row.tag01}|${row.scenario}`;
      somaAggMap.set(key, (somaAggMap.get(key) || 0) + Number(row.total || 0));
    }

    // Converter soma agregado → formato unificado
    const allAggData: any[] = [];
    for (const [key, total] of somaAggMap) {
      const [tag0, tag01, scenario] = key.split('|');
      allAggData.push({
        tag0, tag01,
        tag02: null, tag03: null,
        scenario,
        total_amount: total,
        marca: marca || '',
      });
    }

    debug(`📊 get_soma_tags: ${allAggData.length} linhas DRE para ${yearMonth}`);

    // 1.5 DETALHE via get_variance_snapshot — SEMPRE buscar para obter marcas
    // O get_soma_tags não retorna coluna marca, então usamos o snapshot para:
    // - depth=1: agregar por (tag0, tag01, marca) — ignora tag02
    // - depth=2: agregar por (tag0, tag01, tag02, marca) — padrão
    // - depth=3: agregar por (tag0, tag01, tag02, tag03, marca) — máximo
    const PAGE_SIZE = 1000;
    let snapOffset = 0;
    let snapMore = true;

    while (snapMore) {
      const { data: snapPage, error: snapError } = await supabase
        .rpc('get_variance_snapshot', {
          p_year_month: yearMonth,
          p_marcas: marca ? [marca] : null,
          p_recurring: 'Sim',
        })
        .range(snapOffset, snapOffset + PAGE_SIZE - 1);

      if (snapError) {
        debug(`⚠️ get_variance_snapshot falhou: ${snapError.message}. Continuando sem tag02/marca.`);
        break;
      }
      if (!snapPage || snapPage.length === 0) {
        snapMore = false;
      } else {
        for (const r of snapPage) {
          if (!isDrePrefix(r.tag0)) continue;
          if (depth === 1) {
            // depth=1: só marca, sem tag02 → agregar como tag0+tag01+marca
            allAggData.push({
              tag0: r.tag0,
              tag01: r.tag01,
              tag02: null,
              tag03: null,
              scenario: r.scenario,
              total_amount: r.total,
              marca: r.marca || '',
            });
          } else if (r.tag02) {
            // depth>=2: incluir tag02+marca
            allAggData.push({
              tag0: r.tag0,
              tag01: r.tag01,
              tag02: r.tag02,
              tag03: null,
              scenario: r.scenario,
              total_amount: r.total,
              marca: r.marca || '',
            });
          }
        }
        snapMore = snapPage.length === PAGE_SIZE;
        snapOffset += PAGE_SIZE;
      }
    }

    const tag02Count = allAggData.filter(r => r.tag02).length;
    const detailCount = tag02Count;
    const scenarioCounts: Record<string, number> = {};
    for (const row of allAggData) {
      scenarioCounts[row.scenario] = (scenarioCounts[row.scenario] || 0) + 1;
    }
    debug(`📊 Total: ${allAggData.length} linhas (${allAggData.length - tag02Count} soma + ${tag02Count} tag02+marca)`);

    // 2. Buscar versão atual e próxima
    let versionQuery = supabase
      .from('variance_justifications')
      .select('version')
      .eq('year_month', yearMonth)
      .order('version', { ascending: false })
      .limit(1);
    if (marca) versionQuery = versionQuery.eq('marca', marca);
    const { data: versionData } = await versionQuery;
    const nextVersion = (versionData?.[0]?.version || 0) + 1;
    debug(`📊 Versão atual: ${nextVersion - 1}, próxima: ${nextVersion}`);

    // 3. Buscar itens existentes que já têm justificativa (para preservar)
    let existingQuery = supabase
      .from('variance_justifications')
      .select('*')
      .eq('year_month', yearMonth)
      .in('status', ['justified', 'approved', 'rejected']);
    if (marca) existingQuery = existingQuery.eq('marca', marca);
    const { data: existingItems } = await existingQuery;

    // Indexar existentes por chave path+compType
    const existingMap = new Map<string, VarianceJustification>();
    if (existingItems) {
      for (const item of existingItems) {
        const pk = `${item.marca}||${item.tag0}|${item.tag01 || ''}|${item.tag02 || ''}|${item.tag03 || ''}|${item.comparison_type}`;
        existingMap.set(pk, item);
      }
    }
    debug(`📊 ${existingMap.size} itens existentes com justificativa preservados`);

    // 4. Buscar owners via user_permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('user_id, permission_type, permission_value')
      .in('permission_type', ['centro_custo', 'cia']);

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, name');

    const userMap = new Map<string, { email: string; name: string }>();
    if (allUsers) allUsers.forEach(u => userMap.set(u.id, { email: u.email, name: u.name }));

    const tag01OwnerMap = new Map<string, { email: string; name: string }>();
    if (permissions) {
      for (const p of permissions) {
        if (p.permission_type === 'centro_custo' && p.permission_value) {
          const u = userMap.get(p.user_id);
          if (u) tag01OwnerMap.set(p.permission_value, u);
        }
      }
    }

    // 4.5 Buscar thresholds ativos para filtrar desvios insignificantes
    const { data: thresholdsData } = await supabase
      .from('variance_thresholds')
      .select('*')
      .eq('active', true);
    const activeThresholds = (thresholdsData || []) as VarianceThreshold[];
    debug(`📊 ${activeThresholds.length} thresholds ativos`);

    // Helper: verifica se o desvio excede os limites configurados
    // Retorna true se NÃO há threshold ou se excede (deve gerar justificativa)
    const exceedsThreshold = (tag0: string, marcaVal: string, varAbsVal: number, varPctVal: number | null): boolean => {
      if (activeThresholds.length === 0) return true; // sem thresholds = gerar tudo

      // Encontrar threshold mais específico: por marca+tag0 > por tag0 > global (null/null)
      let best: VarianceThreshold | null = null;
      for (const t of activeThresholds) {
        const matchMarca = !t.marca || t.marca === marcaVal;
        const matchTag0 = !t.tag0 || tag0.startsWith(t.tag0);
        if (!matchMarca || !matchTag0) continue;
        // Mais específico ganha (mais campos preenchidos)
        const specificity = (t.marca ? 2 : 0) + (t.tag0 ? 1 : 0);
        const bestSpec = best ? ((best.marca ? 2 : 0) + (best.tag0 ? 1 : 0)) : -1;
        if (specificity > bestSpec) best = t;
      }

      if (!best) return true; // sem threshold aplicável = gerar

      const absExceeds = best.min_abs_value > 0 && Math.abs(varAbsVal) >= best.min_abs_value;
      const pctExceeds = best.min_pct_value > 0 && varPctVal !== null && Math.abs(varPctVal) >= best.min_pct_value;

      // Se ambos configurados, basta exceder UM deles (OR)
      if (best.min_abs_value > 0 && best.min_pct_value > 0) return absExceeds || pctExceeds;
      if (best.min_abs_value > 0) return absExceeds;
      if (best.min_pct_value > 0) return pctExceeds;
      return true; // threshold sem valores = gerar tudo
    };

    // 5. Agregar dados por chave
    const aggMap = new Map<string, number>();
    for (const row of allAggData) {
      const rowMarca = row.marca || '';
      const key = `${rowMarca}||${row.tag0}|${row.tag01 || ''}|${row.tag02 || ''}|${row.tag03 || ''}|${row.scenario}`;
      aggMap.set(key, (aggMap.get(key) || 0) + Number(row.total_amount || 0));
    }

    const combos = new Set<string>();
    for (const row of allAggData) {
      const rowMarca = row.marca || '';
      combos.add(`${rowMarca}||${row.tag0}|${row.tag01 || ''}|${row.tag02 || ''}|${row.tag03 || ''}`);
    }

    debug(`📊 ${combos.size} combos únicos encontrados`);

    // 6. Gerar rows e separar: INSERT (novos) vs UPDATE (existentes com justificativa)
    const newRows: any[] = [];
    const updateItems: { id: number; real_value: number; compare_value: number; variance_abs: number; variance_pct: number | null; version: number; owner_email: string | null; owner_name: string | null }[] = [];

    for (const combo of combos) {
      const parts = combo.split('||');
      const comboMarca = parts[0];
      const tagParts = parts[1].split('|');
      const [tag0, tag01, tag02, tag03] = tagParts;
      const realVal = aggMap.get(`${combo}|Real`) || 0;
      const orcVal  = aggMap.get(`${combo}|Orçado`) || 0;
      const a1Val   = aggMap.get(`${combo}|A-1`) || 0;

      const owner = tag01 ? tag01OwnerMap.get(tag01) : undefined;

      const processComparison = (compareVal: number, compType: 'orcado' | 'a1') => {
        if (realVal === 0 && compareVal === 0) return;
        const varAbs = realVal - compareVal;
        const varPct = compareVal !== 0 ? Math.round(((realVal - compareVal) / Math.abs(compareVal)) * 1000) / 10 : null;

        // Aplicar threshold apenas a itens folha (marca ou tag02) — pais (tag0/tag01) sempre são gerados
        // EXCEÇÃO: real > 0 sem orçado (compareVal === 0) SEMPRE gera justificativa — gasto sem orçamento
        const isLeaf = !!(comboMarca && comboMarca !== '' && (tag02 || depth === 1));
        const realSemOrcado = compType === 'orcado' && realVal !== 0 && compareVal === 0;
        if (isLeaf && !realSemOrcado && !exceedsThreshold(tag0, comboMarca, varAbs, varPct)) return;

        const existKey = `${comboMarca || marca || ''}||${tag0}|${tag01 || ''}|${tag02 || ''}|${tag03 || ''}|${compType}`;
        const existing = existingMap.get(existKey);

        if (existing) {
          // UPDATE: preserva justificativa, atualiza valores financeiros + versão
          updateItems.push({
            id: existing.id,
            real_value: realVal,
            compare_value: compareVal,
            variance_abs: varAbs,
            variance_pct: varPct,
            version: nextVersion,
            owner_email: owner?.email || existing.owner_email,
            owner_name: owner?.name || existing.owner_name,
          });
          existingMap.delete(existKey); // marcar como processado
        } else {
          // INSERT: novo item
          newRows.push({
            year_month: yearMonth,
            marca: comboMarca || marca || '',
            tag0,
            tag01: tag01 || '',
            tag02: tag02 || null,
            tag03: tag03 || null,
            comparison_type: compType,
            real_value: realVal,
            compare_value: compareVal,
            variance_abs: varAbs,
            variance_pct: varPct,
            owner_email: owner?.email || null,
            owner_name: owner?.name || null,
            version: nextVersion,
            snapshot_at: snapshotAt,
          });
        }
      };

      processComparison(orcVal, 'orcado');
      processComparison(a1Val, 'a1');
    }

    // 6.5 Linhas calculadas: MARGEM DE CONTRIBUIÇÃO e EBITDA
    // Agregar por prefixo tag0 + cenário — usa somaAggMap (já pré-agregado, idêntico à DRE)
    const prefixTotals = new Map<string, number>();
    for (const [key, total] of somaAggMap) {
      const [tag0, , scenario] = key.split('|');
      const prefix = (tag0 || '').slice(0, 3); // '01.', '02.', etc.
      const pfxKey = `${marca || ''}|${prefix}|${scenario}`;
      prefixTotals.set(pfxKey, (prefixTotals.get(pfxKey) || 0) + total);
    }

    const calcMarcas = [marca || ''];
    for (const m of calcMarcas) {
      const get = (prefix: string, scenario: string) => prefixTotals.get(`${m}|${prefix}|${scenario}`) || 0;

      // MARGEM = 01. + 02. + 03.
      const margemReal = get('01.', 'Real') + get('02.', 'Real') + get('03.', 'Real');
      const margemOrc = get('01.', 'Orçado') + get('02.', 'Orçado') + get('03.', 'Orçado');
      const margemA1 = get('01.', 'A-1') + get('02.', 'A-1') + get('03.', 'A-1');

      // EBITDA (S/ RATEIO RAIZ CSC) = MARGEM + 04.
      const ebitdaReal = margemReal + get('04.', 'Real');
      const ebitdaOrc = margemOrc + get('04.', 'Orçado');
      const ebitdaA1 = margemA1 + get('04.', 'A-1');

      // EBITDA TOTAL = EBITDA + 05. + 06. RATEIO RAIZ
      const ebitdaTotalReal = ebitdaReal + get('05.', 'Real') + get('06.', 'Real');
      const ebitdaTotalOrc = ebitdaOrc + get('05.', 'Orçado') + get('06.', 'Orçado');
      const ebitdaTotalA1 = ebitdaA1 + get('05.', 'A-1') + get('06.', 'A-1');

      const addCalcRow = (label: string, realV: number, orcV: number, a1V: number) => {
        const addComp = (compareVal: number, compType: 'orcado' | 'a1') => {
          if (realV === 0 && compareVal === 0) return;
          const varAbs = realV - compareVal;
          const varPct = compareVal !== 0 ? Math.round(((realV - compareVal) / Math.abs(compareVal)) * 1000) / 10 : null;
          newRows.push({
            year_month: yearMonth,
            marca: m || marca || '',
            tag0: label,
            tag01: '',
            tag02: null,
            tag03: null,
            comparison_type: compType,
            real_value: realV,
            compare_value: compareVal,
            variance_abs: varAbs,
            variance_pct: varPct,
            owner_email: null,
            owner_name: null,
            version: nextVersion,
            snapshot_at: snapshotAt,
          });
        };
        addComp(orcV, 'orcado');
        addComp(a1V, 'a1');
      };

      addCalcRow('MARGEM DE CONTRIBUIÇÃO', margemReal, margemOrc, margemA1);
      addCalcRow('EBITDA (S/ RATEIO RAIZ CSC)', ebitdaReal, ebitdaOrc, ebitdaA1);
      addCalcRow('EBITDA TOTAL', ebitdaTotalReal, ebitdaTotalOrc, ebitdaTotalA1);
    }

    debug(`📊 Calc rows adicionados: MARGEM + EBITDA S/RATEIO + EBITDA TOTAL para ${calcMarcas.length} marca(s)`);

    if (newRows.length === 0 && updateItems.length === 0) {
      return { created: 0, updated: 0, version: nextVersion, error: `Nenhum desvio gerado. get_soma_tags: ${somaData.length} linhas (${Object.entries(scenarioCounts).map(([k, v]) => `${k}:${v}`).join(', ')})` };
    }

    debug(`📊 ${newRows.length} novos + ${updateItems.length} atualizações`);

    // 7. Deletar pendentes/notificados antigos (serão re-inseridos com novos valores)
    let delQuery = supabase
      .from('variance_justifications')
      .delete()
      .eq('year_month', yearMonth);
    if (marca) delQuery = delQuery.eq('marca', marca);
    delQuery = delQuery.in('status', ['pending', 'notified']);

    const { error: delError, count: delCount } = await delQuery;
    if (delError) {
      console.error(`❌ DELETE variance_justifications falhou:`, delError);
    } else {
      console.log(`🗑️ DELETE pendentes/notificados: ${delCount ?? '?'} removidos`);
    }

    // 7.5 Deletar calc rows antigos (MARGEM/EBITDA) — sempre re-inseridos
    let delCalcQuery = supabase
      .from('variance_justifications')
      .delete()
      .eq('year_month', yearMonth)
      .in('tag0', ['MARGEM DE CONTRIBUIÇÃO', 'EBITDA', 'EBITDA (S/ RATEIO RAIZ CSC)', 'EBITDA TOTAL']);
    if (marca) delCalcQuery = delCalcQuery.eq('marca', marca);

    const { error: delCalcError } = await delCalcQuery;
    if (delCalcError) {
      debug(`⚠️ Erro ao limpar calc rows antigos (continuando): ${delCalcError.message}`);
    }

    // 8. UPDATE existentes (justificados/aprovados/rejeitados) com novos valores financeiros
    let totalUpdated = 0;
    for (const item of updateItems) {
      const { error: updErr } = await supabase
        .from('variance_justifications')
        .update({
          real_value: item.real_value,
          compare_value: item.compare_value,
          variance_abs: item.variance_abs,
          variance_pct: item.variance_pct,
          version: item.version,
          owner_email: item.owner_email,
          owner_name: item.owner_name,
          snapshot_at: snapshotAt,
        })
        .eq('id', item.id);

      if (!updErr) totalUpdated++;
      else debug(`⚠️ Erro update id=${item.id}: ${updErr.message}`);
    }

    // 9. INSERT novos em batches de 200
    let totalCreated = 0;
    const BATCH_SIZE = 200;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const { data: inserted, error: insertErr } = await supabase
        .from('variance_justifications')
        .insert(batch)
        .select('id');

      if (insertErr) {
        console.error(`❌ INSERT batch ${i} falhou:`, insertErr, '| Primeira row:', JSON.stringify(batch[0]));
        for (const row of batch) {
          const { error: singleErr } = await supabase
            .from('variance_justifications')
            .insert(row);
          if (!singleErr) totalCreated++;
        }
      } else {
        totalCreated += inserted?.length || batch.length;
      }
    }

    const diagParts = Object.entries(scenarioCounts).map(([k, v]) => `${k}:${v}`);
    const diagnostics = `soma_tags: ${somaData.length} + snapshot tag02: ${tag02Count} = ${allAggData.length} linhas (${diagParts.join(', ')})`;
    debug(`✅ v${nextVersion}: ${totalCreated} criados + ${totalUpdated} atualizados — snapshot_at=${snapshotAt} — ${diagnostics}`);
    return { created: totalCreated, updated: totalUpdated, version: nextVersion, snapshot_at: snapshotAt, diagnostics };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ generateVarianceItems:', msg);
    return { created: 0, updated: 0, version: 0, error: msg };
  }
};

/**
 * Pacoteiro submete justificativa para um item tag03.
 */
export const submitJustification = async (
  id: number,
  justification: string,
  actionPlan?: string
): Promise<{ ok: boolean; error?: string }> => {
  const updates: any = {
    justification,
    action_plan: actionPlan || null,
    status: 'justified',
    justified_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('variance_justifications')
    .update(updates)
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('Erro ao submeter justificativa:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Nenhuma linha atualizada. Verifique permissões (RLS).' };
  }
  return { ok: true };
};

/**
 * FP&A aprova ou rejeita uma justificativa.
 */
export const reviewJustification = async (
  id: number,
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<{ ok: boolean; error?: string }> => {
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .limit(1);

  const { data, error } = await supabase
    .from('variance_justifications')
    .update({
      status,
      reviewed_by: userData?.[0]?.email || null,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
    })
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('Erro ao revisar justificativa:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Nenhuma linha atualizada. Verifique permissões (RLS).' };
  }
  return { ok: true };
};

/**
 * Aprovar/rejeitar em massa.
 */
export const bulkReviewJustifications = async (
  ids: number[],
  status: 'approved' | 'rejected',
  reviewNote?: string
): Promise<{ ok: boolean; count: number; error?: string }> => {
  const { data, error } = await supabase
    .from('variance_justifications')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
    })
    .in('id', ids)
    .select('id');
  if (error) {
    console.error('Erro ao revisar em massa:', error);
    return { ok: false, count: 0, error: error.message };
  }
  return { ok: true, count: data?.length || 0 };
};

/**
 * Salva síntese IA em uma linha de justificativa.
 */
export const updateVarianceAiSummary = async (
  id: number,
  aiSummary: string
): Promise<{ ok: boolean; error?: string }> => {
  const { error } = await supabase
    .from('variance_justifications')
    .update({
      ai_summary: aiSummary,
      ai_summary_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    console.error('Erro ao salvar ai_summary:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

// ── Variance Thresholds ──

export const getVarianceThresholds = async (): Promise<VarianceThreshold[]> => {
  const { data, error } = await supabase
    .from('variance_thresholds')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Erro ao buscar variance_thresholds:', error);
    return [];
  }
  return (data || []) as VarianceThreshold[];
};

export const upsertVarianceThreshold = async (
  row: Omit<VarianceThreshold, 'id' | 'created_at'>
): Promise<{ ok: boolean; error?: string }> => {
  const { error } = await supabase
    .from('variance_thresholds')
    .upsert({
      marca: row.marca || null,
      tag0: row.tag0 || null,
      min_abs_value: row.min_abs_value,
      min_pct_value: row.min_pct_value,
      active: row.active,
    });
  if (error) {
    console.error('Erro ao upsert variance_thresholds:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const deleteVarianceThreshold = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('variance_thresholds')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir variance_thresholds:', error);
    return false;
  }
  return true;
};

// ── Variance Depth Config ──

export interface VarianceDepthConfig {
  id: number;
  tag0: string | null;
  tag01: string;
  depth: number;       // 1=tag01, 2=tag02, 3=marca
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const getVarianceDepthConfigs = async (): Promise<VarianceDepthConfig[]> => {
  const { data, error } = await supabase
    .from('variance_depth_config')
    .select('*')
    .order('tag01');
  if (error) {
    console.error('Erro ao buscar variance_depth_config:', error);
    return [];
  }
  return (data || []) as VarianceDepthConfig[];
};

export const upsertVarianceDepthConfig = async (
  row: { tag0: string | null; tag01: string; depth: number; active: boolean }
): Promise<{ ok: boolean; error?: string }> => {
  const { error } = await supabase
    .from('variance_depth_config')
    .upsert(
      { tag0: row.tag0 || null, tag01: row.tag01, depth: row.depth, active: row.active },
      { onConflict: 'tag0,tag01' }
    );
  if (error) {
    console.error('Erro ao salvar variance_depth_config:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const deleteVarianceDepthConfig = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('variance_depth_config')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir variance_depth_config:', error);
    return false;
  }
  return true;
};

/**
 * Retorna mapa tag01 → depth para uso na geração de desvios.
 * Se tag01 não estiver configurado, usa defaultDepth (2 = tag02).
 */
export const getDepthMap = async (): Promise<Map<string, number>> => {
  const configs = await getVarianceDepthConfigs();
  const map = new Map<string, number>();
  for (const c of configs) {
    if (c.active) map.set(c.tag01, c.depth);
  }
  return map;
};

/**
 * Realtime subscription para variance_justifications.
 */
export const subscribeVarianceJustifications = (onChange: () => void) => {
  const channel = supabase
    .channel('variance_justifications_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'variance_justifications' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ── Marca Breakdown for Variance PPT ──

/**
 * Busca breakdown por marca para slides de análise.
 * Usa RPC `get_soma_tags_by_marca` — UMA query que retorna (tag0, marca, scenario, total).
 * Retorna Record<tag0, VariancePptMarcaEntry[]> ordenado por |real| desc.
 */
export async function fetchMarcaBreakdown(
  yearMonth: string,
  allMarcas: string[],
  filterMarcas?: string[] | null,
): Promise<Record<string, VariancePptMarcaEntry[]>> {
  const marcas = filterMarcas && filterMarcas.length > 0 ? filterMarcas : allMarcas;
  if (marcas.length === 0) return {};

  const { data, error } = await supabase.rpc('get_soma_tags_by_marca', {
    p_month: yearMonth,
    p_marcas: marcas,
    p_recurring: 'Sim',
  });

  if (error) {
    console.error('fetchMarcaBreakdown RPC error:', error);
    return {};
  }
  if (!data || data.length === 0) return {};

  // Aggregate by (tag0, marca, scenario) — RPC já retorna agrupado, mas pode ter múltiplas rows por tag0_map
  const DRE_PREFIXES = new Set(['01.', '02.', '03.', '04.', '05.']);
  const agg = new Map<string, number>();

  for (const row of data as { tag0: string; marca: string; scenario: string; total: number }[]) {
    if (!DRE_PREFIXES.has((row.tag0 || '').slice(0, 3))) continue;
    const key = `${row.tag0}|${row.marca}|${row.scenario}`;
    agg.set(key, (agg.get(key) || 0) + Number(row.total || 0));
  }

  // Build result keyed by tag0
  const tag0Set = new Set<string>();
  for (const key of agg.keys()) {
    tag0Set.add(key.split('|')[0]);
  }

  const result: Record<string, VariancePptMarcaEntry[]> = {};
  for (const tag0 of tag0Set) {
    const entries: VariancePptMarcaEntry[] = marcas.map(marca => ({
      marca,
      real: agg.get(`${tag0}|${marca}|Real`) || 0,
      orcado: agg.get(`${tag0}|${marca}|Orçado`) || 0,
      a1: agg.get(`${tag0}|${marca}|A-1`) || 0,
    }));
    entries.sort((a, b) => Math.abs(b.real) - Math.abs(a.real));
    result[tag0] = entries;
  }

  return result;
}

// ============================================================
// SMTP Config — configuração global de email
// ============================================================

export interface SmtpConfig {
  id: number;
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  from_name: string;
  from_email: string;
  use_tls: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const getSmtpConfig = async (): Promise<SmtpConfig | null> => {
  const { data, error } = await supabase
    .from('smtp_config')
    .select('*')
    .eq('enabled', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    console.error('Erro ao buscar smtp_config:', error);
    return null;
  }
  return data;
};

export const upsertSmtpConfig = async (config: Omit<SmtpConfig, 'id' | 'created_at' | 'updated_at'>): Promise<SmtpConfig | null> => {
  // Busca registro existente
  const { data: existing } = await supabase
    .from('smtp_config')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('smtp_config')
      .update(config)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      console.error('Erro ao atualizar smtp_config:', error);
      throw error;
    }
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from('smtp_config')
      .insert(config)
      .select()
      .single();
    if (error) {
      console.error('Erro ao inserir smtp_config:', error);
      throw error;
    }
    return data;
  }
};

// ============================================
// Cronograma Financeiro
// ============================================

export interface CronogramaItem {
  id: string;
  month: number;
  year: number;
  date_label: string;
  area: string;
  area_color: string;
  deliverable: string;
  action_description: string;
  item_type: 'task' | 'meeting';
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_brand: string | null;
  meeting_obs: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CronogramaItemInsert = Omit<CronogramaItem, 'id' | 'created_at' | 'updated_at'>;

export const getCronogramaItems = async (month: number, year: number): Promise<CronogramaItem[]> => {
  const { data, error } = await supabase
    .from('cronograma_items')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .eq('is_active', true)
    .order('item_type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Erro ao carregar cronograma_items:', error);
    return [];
  }
  return data || [];
};

export const insertCronogramaItem = async (item: CronogramaItemInsert): Promise<CronogramaItem | null> => {
  const { data, error } = await supabase
    .from('cronograma_items')
    .insert(item)
    .select('*')
    .single();
  if (error) {
    console.error('Erro ao inserir cronograma_items:', error);
    return null;
  }
  return data;
};

export const updateCronogramaItem = async (id: string, updates: Partial<CronogramaItem>): Promise<{ ok: boolean; error?: string }> => {
  const { data, error } = await supabase
    .from('cronograma_items')
    .update(updates)
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('Erro ao atualizar cronograma_items:', error);
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    console.error('Update cronograma_items: 0 rows affected (RLS bloqueou)');
    return { ok: false, error: 'Sem permissão para editar (RLS)' };
  }
  return { ok: true };
};

export const deleteCronogramaItem = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('cronograma_items')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao excluir cronograma_items:', error);
    return false;
  }
  return true;
};

export const subscribeCronogramaItems = (onChange: () => void) => {
  const channel = supabase
    .channel('cronograma_items_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cronograma_items' }, () => {
      onChange();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const duplicateCronogramaMonth = async (
  fromMonth: number, fromYear: number,
  toMonth: number, toYear: number,
  createdBy: string
): Promise<{ ok: boolean; count: number; error?: string }> => {
  const { data: sourceItems, error: fetchErr } = await supabase
    .from('cronograma_items')
    .select('*')
    .eq('month', fromMonth)
    .eq('year', fromYear)
    .eq('is_active', true);
  if (fetchErr) return { ok: false, count: 0, error: fetchErr.message };
  if (!sourceItems || sourceItems.length === 0) return { ok: false, count: 0, error: 'Nenhum item no mês origem' };

  const newItems = sourceItems.map(({ id, created_at, updated_at, ...rest }: any) => ({
    ...rest,
    month: toMonth,
    year: toYear,
    created_by: createdBy,
  }));

  const { error: insertErr } = await supabase
    .from('cronograma_items')
    .insert(newItems);
  if (insertErr) return { ok: false, count: 0, error: insertErr.message };

  return { ok: true, count: newItems.length };
};

// =============================================
// SESSION TRACKING & ENGAGEMENT
// =============================================

export interface EngagementStat {
  user_id: string;
  email: string;
  name: string;
  photo_url: string | null;
  role: string;
  user_since: string;
  last_login: string | null;
  total_sessions_7d: number;
  total_minutes_7d: number;
  active_days_7d: number;
  last_session_at: string | null;
  days_since_last_access: number;
  last_engagement_email_at: string | null;
}

export interface WeeklyHistory {
  user_id: string;
  week_start: string;
  week_label: string;
  total_sessions: number;
  total_minutes: number;
  active_days: number;
}

/** Cria nova sessao ao fazer login (via RPC SECURITY DEFINER) */
export const createSession = async (userId: string, email: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('create_user_session', {
    p_user_id: userId,
    p_email: email,
  });

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }
  return data as string;
};

/** Heartbeat — atualiza last_heartbeat da sessao ativa (via RPC) */
export const updateSessionHeartbeat = async (sessionId: string) => {
  const { error } = await supabase.rpc('update_session_heartbeat', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Error updating session heartbeat:', error);
  }
};

/** Encerra sessao (logout ou beforeunload) (via RPC) */
export const endSession = async (sessionId: string) => {
  const { error } = await supabase.rpc('end_user_session', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Error ending session:', error);
  }
};

/** Busca estatisticas de engajamento (admin only) via RPC */
export const getEngagementStats = async (): Promise<EngagementStat[]> => {
  const { data, error } = await supabase.rpc('get_engagement_stats');

  if (error) {
    console.error('Error fetching engagement stats:', error);
    return [];
  }
  return (data || []) as EngagementStat[];
};

/** Busca historico semanal de engajamento (ultimas 5 semanas, admin only) */
export const getEngagementWeeklyHistory = async (): Promise<WeeklyHistory[]> => {
  const { data, error } = await supabase.rpc('get_engagement_weekly_history');

  if (error) {
    console.error('Error fetching weekly history:', error);
    return [];
  }
  return (data || []) as WeeklyHistory[];
};

/** Marca que email de engajamento foi enviado para o usuario */
export const markEngagementEmailSent = async (userId: string) => {
  const { error } = await supabase.rpc('mark_engagement_email_sent', { p_user_id: userId });
  if (error) {
    console.error('Error marking engagement email sent:', error);
  }
};

// ============================================
// Action Plans — Planos de Ação 5W1H
// ============================================

export interface ActionPlan {
  id: number;
  variance_justification_id: number | null;
  year_month: string;
  marca: string | null;
  tag0: string | null;
  tag01: string | null;
  tag02: string | null;
  comparison_type: 'orcado' | 'a1';
  real_value: number | null;
  compare_value: number | null;
  variance_abs: number | null;
  variance_pct: number | null;
  what: string;
  why: string;
  how: string | null;
  who_responsible: string;
  who_email: string | null;
  deadline: string;
  expected_impact: string | null;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'atrasado' | 'cancelado';
  justification: string | null;
  progress_note: string | null;
  completed_at: string | null;
  ai_generated: boolean;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanFilters {
  year_month?: string;
  marcas?: string[];
  status?: string[];
  who_email?: string;
  tag0?: string;
  tag01?: string;
}

export type ActionPlanInsert = Omit<ActionPlan, 'id' | 'created_at' | 'updated_at'>;
export type ActionPlanUpdate = Partial<Pick<ActionPlan, 'what' | 'why' | 'how' | 'who_responsible' | 'who_email' | 'deadline' | 'expected_impact' | 'status' | 'justification' | 'progress_note' | 'completed_at'>>;

export const getActionPlans = async (filters?: ActionPlanFilters): Promise<ActionPlan[]> => {
  const PAGE = 1000;
  let offset = 0;
  let allData: ActionPlan[] = [];
  let keepGoing = true;

  while (keepGoing) {
    let query = supabase
      .from('action_plans')
      .select('*')
      .order('deadline', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (filters?.year_month) query = query.eq('year_month', filters.year_month);
    if (filters?.marcas && filters.marcas.length > 0) {
      query = query.in('marca', filters.marcas);
    }
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.who_email) query = query.eq('who_email', filters.who_email);
    if (filters?.tag0) query = query.eq('tag0', filters.tag0);
    if (filters?.tag01) query = query.eq('tag01', filters.tag01);

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar action_plans:', error);
      return allData;
    }
    if (!data || data.length === 0) {
      keepGoing = false;
    } else {
      allData = allData.concat(data as ActionPlan[]);
      keepGoing = data.length === PAGE;
      offset += PAGE;
    }
  }

  // Auto-mark overdue on client side (in case pg_cron hasn't run yet)
  const today = new Date().toISOString().slice(0, 10);
  for (const plan of allData) {
    if (['aberto', 'em_andamento'].includes(plan.status) && plan.deadline < today) {
      plan.status = 'atrasado';
    }
  }

  return allData;
};

export const getActionPlansByVariance = async (varianceId: number): Promise<ActionPlan[]> => {
  const { data, error } = await supabase
    .from('action_plans')
    .select('*')
    .eq('variance_justification_id', varianceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar action_plans por variance:', error);
    return [];
  }
  return (data || []) as ActionPlan[];
};

export const createActionPlan = async (plan: ActionPlanInsert): Promise<ActionPlan | null> => {
  const { data, error } = await supabase
    .from('action_plans')
    .insert(plan)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar action_plan:', error);
    throw new Error(error.message);
  }
  return data as ActionPlan;
};

export const updateActionPlan = async (id: number, updates: ActionPlanUpdate): Promise<ActionPlan | null> => {
  const { data, error } = await supabase
    .from('action_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar action_plan:', error);
    throw new Error(error.message);
  }
  return data as ActionPlan;
};

export const deleteActionPlan = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('action_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar action_plan:', error);
    throw new Error(error.message);
  }
};

export const getActionPlanKpis = async (filters?: ActionPlanFilters): Promise<{
  total: number;
  aberto: number;
  em_andamento: number;
  concluido: number;
  atrasado: number;
  cancelado: number;
}> => {
  const plans = await getActionPlans(filters);
  return {
    total: plans.length,
    aberto: plans.filter(p => p.status === 'aberto').length,
    em_andamento: plans.filter(p => p.status === 'em_andamento').length,
    concluido: plans.filter(p => p.status === 'concluido').length,
    atrasado: plans.filter(p => p.status === 'atrasado').length,
    cancelado: plans.filter(p => p.status === 'cancelado').length,
  };
};

export const subscribeActionPlans = (callback: () => void) => {
  const channel = supabase
    .channel('action_plans_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'action_plans' }, () => {
      callback();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};
