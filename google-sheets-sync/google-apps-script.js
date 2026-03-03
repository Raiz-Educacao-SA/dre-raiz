/**
 * Google Apps Script — Google Sheets -> Supabase (REST / PostgREST)
 * - Sincroniza 3 tabelas: tags, filial, Fornecedor_Tags
 * - TAGS (A:K): IGNORA linhas onde coluna B = "N/A"
 * - Usa UPSERT (não DELETE+INSERT) para segurança
 * - Batches de 50 registros para não estourar limite
 *
 * Cole este arquivo inteiro no editor do Apps Script (Código.gs)
 */

// =========================
// CONFIG
// =========================
const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

const BATCH_SIZE = 50;

// =========================
// MAPEAMENTOS
// =========================

// Mapeamento para tabela TAGS (colunas A:K)
const TAGS_MAPPING = {
  'CODCONTA': 'cod_conta',
  'Tag1': 'tag1',
  'Tag2': 'tag2',
  'Tag3': 'tag3',
  'TAG4': 'tag4',
  'TagOrc': 'tag_orc',
  'GER': 'ger',
  'BP/DRE': 'BP/DRE',
  'Nat. Orc': 'nat_orc',
  'Nome Nat.Orc': 'nome_nat_orc',
  'Responsável': 'responsavel'
};

// Mapeamento para tabela FILIAL (colunas M:S)
const FILIAL_MAPPING = {
  'Cia': 'codcoligada',
  'Filial': 'codfilial',
  'Cia+Filial': 'chave_coligadafilial',
  'Nome_Cia': 'cia',
  'Nome_Marca': 'nomemarca',
  'Nome_Filial': 'nomefilial',
  'Red_Filial': 'filial'
};

// Mapeamento para tabela FORNECEDOR_TAGS (colunas A:J na guia "de para fornecedor")
const FORNECEDOR_MAPPING = {
  'Cód. Forn': 'cod_forn',
  'Fornecedor Original': 'fornecedor_original',
  'Cód. Forn Novo': 'cod_forn_novo',
  'Fornecedor Novo': 'fornecedor_novo',
  'Conta': 'conta',
  'Tag1': 'tag1',
  'Tag2': 'tag2',
  'Tag3': 'tag3',
  'Tag4': 'tag4',
  'Tag_Orc': 'tag_orc'
};

// =========================
// HELPERS
// =========================
function _norm(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// =========================
// SINCRONIZAÇÕES
// =========================

// Sincronizar TAGS (A:K) com filtro: ignora linhas onde coluna B = "N/A"
function sincronizarTags() {
  try {
    Logger.log('=== Iniciando sincronização de TAGS ===');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      Logger.log('Tags: Planilha vazia');
      return;
    }

    const range = sheet.getRange('A1:K' + lastRow);
    const data = range.getValues();
    const headers = data[0].map(h => _norm(h));
    const rows = data.slice(1);

    const records = [];

    for (let i = 0; i < rows.length; i++) {
      // FILTRO: Coluna B (index 1) = "N/A" → pular
      const colB = _norm(rows[i][1]);
      if (colB.toUpperCase() === 'N/A') continue;

      const record = {};
      let hasData = false;
      let hasCodConta = false;

      for (let j = 0; j < headers.length; j++) {
        const sheetCol = headers[j];
        const dbCol = TAGS_MAPPING[sheetCol];
        const value = rows[i][j];

        if (!dbCol) continue;

        if (value !== null && value !== undefined && value !== '') {
          record[dbCol] = String(value);
          hasData = true;
          if (dbCol === 'cod_conta') hasCodConta = true;
        } else {
          record[dbCol] = null;
        }
      }

      if (hasData && hasCodConta) {
        record['synced_at'] = new Date().toISOString();
        records.push(record);
      }
    }

    if (records.length > 0) {
      upsertDados('tags', records, 'cod_conta');
    }

    Logger.log('Tags sincronizadas: ' + records.length + ' registros');
    Logger.log('=== Fim sincronização de TAGS ===');
  } catch (error) {
    Logger.log('ERRO ao sincronizar tags: ' + error);
    throw error;
  }
}

// Sincronizar FILIAL (M:S)
function sincronizarFilial() {
  try {
    Logger.log('=== Iniciando sincronização de FILIAL ===');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      Logger.log('Filial: Planilha vazia');
      return;
    }

    const range = sheet.getRange('M1:S' + lastRow);
    const data = range.getValues();
    const headers = data[0].map(h => _norm(h));
    const rows = data.slice(1);

    const records = [];
    for (let i = 0; i < rows.length; i++) {
      const record = {};
      let hasData = false;
      let hasChave = false;

      for (let j = 0; j < headers.length; j++) {
        const sheetCol = headers[j];
        const dbCol = FILIAL_MAPPING[sheetCol];
        const value = rows[i][j];

        if (!dbCol) continue;

        if (value !== null && value !== undefined && value !== '') {
          record[dbCol] = String(value);
          hasData = true;
          if (dbCol === 'chave_coligadafilial') hasChave = true;
        } else {
          record[dbCol] = null;
        }
      }

      if (hasData && hasChave) records.push(record);
    }

    if (records.length > 0) {
      upsertDados('filial', records, 'chave_coligadafilial');
    }

    Logger.log('Filial sincronizada: ' + records.length + ' registros');
    Logger.log('=== Fim sincronização de FILIAL ===');
  } catch (error) {
    Logger.log('ERRO ao sincronizar filial: ' + error);
    throw error;
  }
}

// Sincronizar FORNECEDOR_TAGS (A:J na guia "de para fornecedor")
function sincronizarFornecedor() {
  try {
    Logger.log('=== Iniciando sincronização de FORNECEDOR ===');

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('de para fornecedor');

    if (!sheet) {
      Logger.log('Fornecedor: Guia "de para fornecedor" não encontrada');
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Logger.log('Fornecedor: Planilha vazia');
      return;
    }

    const range = sheet.getRange('A1:J' + lastRow);
    const data = range.getValues();
    const headers = data[0].map(h => _norm(h));
    const rows = data.slice(1);

    const records = [];
    for (let i = 0; i < rows.length; i++) {
      const record = {};
      let hasData = false;
      let hasCodForn = false;

      for (let j = 0; j < headers.length; j++) {
        const sheetCol = headers[j];
        const dbCol = FORNECEDOR_MAPPING[sheetCol];
        const value = rows[i][j];

        if (!dbCol) continue;

        if (value !== null && value !== undefined && value !== '') {
          record[dbCol] = String(value);
          hasData = true;
          if (dbCol === 'cod_forn') hasCodForn = true;
        } else {
          record[dbCol] = null;
        }
      }

      if (hasData && hasCodForn) records.push(record);
    }

    if (records.length > 0) {
      upsertDados('Fornecedor_Tags', records, 'cod_forn');
    }

    Logger.log('Fornecedor sincronizado: ' + records.length + ' registros');
    Logger.log('=== Fim sincronização de FORNECEDOR ===');
  } catch (error) {
    Logger.log('ERRO ao sincronizar fornecedor: ' + error);
    throw error;
  }
}

// Sincronizar TODAS as tabelas
function sincronizarComSupabase() {
  const erros = [];
  const sucessos = [];

  Logger.log('========== INICIANDO SINCRONIZAÇÃO COMPLETA ==========');

  try { sincronizarTags(); sucessos.push('tags'); }
  catch (error) { erros.push('tags: ' + (error.message || error)); }

  try { sincronizarFilial(); sucessos.push('filial'); }
  catch (error) { erros.push('filial: ' + (error.message || error)); }

  try { sincronizarFornecedor(); sucessos.push('fornecedor'); }
  catch (error) { erros.push('fornecedor: ' + (error.message || error)); }

  Logger.log('========== FIM SINCRONIZAÇÃO COMPLETA ==========');
  Logger.log('Sucessos: ' + sucessos.join(', '));
  if (erros.length > 0) Logger.log('Erros: ' + erros.join(' | '));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (erros.length > 0) {
    ss.toast('Sincronizado: ' + sucessos.join(', ') + '. Erros: ' + erros.length, 'Supabase', 6);
  } else {
    ss.toast('Todas as tabelas sincronizadas!', 'Supabase', 4);
  }
}

// =========================
// SUPABASE REST — UPSERT em batches
// =========================

function upsertDados(tableName, records, conflictColumn) {
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    const url = SUPABASE_URL + '/rest/v1/' + tableName;

    const options = {
      method: 'post',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      payload: JSON.stringify(batch),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const status = response.getResponseCode();

    if (status !== 201 && status !== 200) {
      const body = response.getContentText();
      Logger.log('Erro batch ' + (i + 1) + '/' + totalBatches + ' em ' + tableName + ': ' + body);
      throw new Error('Erro ao upsert em ' + tableName + ': ' + body);
    }

    Logger.log('Batch ' + (i + 1) + '/' + totalBatches + ' em ' + tableName + ': OK (' + batch.length + ' registros)');
  }
}

// =========================
// TRIGGERS
// =========================
function onEdit(e) {
  sincronizarComSupabase();
}

function onChange(e) {
  sincronizarComSupabase();
}

// =========================
// MENU
// =========================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sincronização Supabase')
    .addItem('Sincronizar Tudo Agora', 'sincronizarComSupabase')
    .addItem('Apenas Tags', 'sincronizarTags')
    .addItem('Apenas Filial', 'sincronizarFilial')
    .addItem('Apenas Fornecedor', 'sincronizarFornecedor')
    .addToUi();
}
