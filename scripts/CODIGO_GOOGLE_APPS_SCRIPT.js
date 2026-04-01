// =====================================================
// GOOGLE APPS SCRIPT - Sincronização Conta Contábil
// =====================================================
// COPIE TODO ESTE CÓDIGO E COLE NO GOOGLE APPS SCRIPT
// Extensões → Apps Script
// =====================================================

const CONFIG = {
  SUPABASE_URL: "https://vafmufhlompwsdrlhkfz.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA",
  SHEET_NAME: "Conta Cont",
  TABLE_NAME: "conta_contabil",
  AUTO_SYNC_ON_EDIT: true
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔄 Sincronização")
    .addItem("✅ Sincronizar Tudo Agora", "syncAll")
    .addItem("🧪 Testar Conexão", "testConnection")
    .addItem("📊 Ver Status", "showStatus")
    .addSeparator()
    .addItem("🗑️ Limpar Tabela Supabase", "clearSupabaseTable")
    .addToUi();
}

function syncAll() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("Aba não encontrada: " + CONFIG.SHEET_NAME);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const colMap = {
    codConta: headers.indexOf("CODCONTA"),
    tag1: headers.indexOf("Tag1"),
    tag2: headers.indexOf("Tag2"),
    tag3: headers.indexOf("Tag3"),
    tag4: headers.indexOf("TAG4"),
    tagOrc: headers.indexOf("TagOrc"),
    ger: headers.indexOf("GER"),
    bpDre: headers.indexOf("BP/DRE"),
    natOrc: headers.indexOf("Nat. Orc"),
    nomeNatOrc: headers.indexOf("Nome Nat.Orc"),
    responsavel: headers.indexOf("Responsável")
  };

  let sucessos = 0;
  let erros = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!row[colMap.codConta]) continue;

    const payload = {
      cod_conta: String(row[colMap.codConta]),
      tag1: row[colMap.tag1] ? String(row[colMap.tag1]) : null,
      tag2: row[colMap.tag2] ? String(row[colMap.tag2]) : null,
      tag3: row[colMap.tag3] ? String(row[colMap.tag3]) : null,
      tag4: row[colMap.tag4] ? String(row[colMap.tag4]) : null,
      tag_orc: row[colMap.tagOrc] ? String(row[colMap.tagOrc]) : null,
      ger: row[colMap.ger] ? String(row[colMap.ger]) : null,
      bp_dre: row[colMap.bpDre] ? String(row[colMap.bpDre]) : null,
      nat_orc: row[colMap.natOrc] ? String(row[colMap.natOrc]) : null,
      nome_nat_orc: row[colMap.nomeNatOrc] ? String(row[colMap.nomeNatOrc]) : null,
      responsavel: row[colMap.responsavel] ? String(row[colMap.responsavel]) : null
    };

    try {
      upsertToSupabase(payload);
      sucessos++;
    } catch (error) {
      Logger.log("Erro na linha " + (i + 1) + ": " + error);
      erros++;
    }
  }

  const msg = "Sincronização concluída!\n\nSucessos: " + sucessos + "\nErros: " + erros;

  SpreadsheetApp.getUi().alert(msg);
  Logger.log(msg);
}

function syncRow(rowNumber) {
  if (!CONFIG.AUTO_SYNC_ON_EDIT) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];

  const colMap = {
    codConta: headers.indexOf("CODCONTA"),
    tag1: headers.indexOf("Tag1"),
    tag2: headers.indexOf("Tag2"),
    tag3: headers.indexOf("Tag3"),
    tag4: headers.indexOf("TAG4"),
    tagOrc: headers.indexOf("TagOrc"),
    ger: headers.indexOf("GER"),
    bpDre: headers.indexOf("BP/DRE"),
    natOrc: headers.indexOf("Nat. Orc"),
    nomeNatOrc: headers.indexOf("Nome Nat.Orc"),
    responsavel: headers.indexOf("Responsável")
  };

  if (!row[colMap.codConta]) return;

  const payload = {
    cod_conta: String(row[colMap.codConta]),
    tag1: row[colMap.tag1] ? String(row[colMap.tag1]) : null,
    tag2: row[colMap.tag2] ? String(row[colMap.tag2]) : null,
    tag3: row[colMap.tag3] ? String(row[colMap.tag3]) : null,
    tag4: row[colMap.tag4] ? String(row[colMap.tag4]) : null,
    tag_orc: row[colMap.tagOrc] ? String(row[colMap.tagOrc]) : null,
    ger: row[colMap.ger] ? String(row[colMap.ger]) : null,
    bp_dre: row[colMap.bpDre] ? String(row[colMap.bpDre]) : null,
    nat_orc: row[colMap.natOrc] ? String(row[colMap.natOrc]) : null,
    nome_nat_orc: row[colMap.nomeNatOrc] ? String(row[colMap.nomeNatOrc]) : null,
    responsavel: row[colMap.responsavel] ? String(row[colMap.responsavel]) : null
  };

  try {
    upsertToSupabase(payload);
    Logger.log("Linha " + rowNumber + " sincronizada: " + payload.cod_conta);
  } catch (error) {
    Logger.log("Erro ao sincronizar linha " + rowNumber + ": " + error);
  }
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;

  const row = e.range.getRow();
  if (row === 1) return;

  syncRow(row);
}

function upsertToSupabase(payload) {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/" + CONFIG.TABLE_NAME;

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200 && statusCode !== 201) {
    throw new Error("Erro HTTP " + statusCode + ": " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

function testConnection() {
  try {
    const url = CONFIG.SUPABASE_URL + "/rest/v1/" + CONFIG.TABLE_NAME + "?select=count";

    const options = {
      method: "get",
      headers: {
        "apikey": CONFIG.SUPABASE_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_KEY
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      const data = JSON.parse(response.getContentText());
      SpreadsheetApp.getUi().alert("Conexão OK!\n\nTabela: " + CONFIG.TABLE_NAME + "\nRegistros: " + data.length);
    } else {
      SpreadsheetApp.getUi().alert("Erro: " + statusCode + "\n\n" + response.getContentText());
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert("Erro ao conectar:\n\n" + error);
  }
}

function showStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const linhasSheets = sheet ? sheet.getLastRow() - 1 : 0;

  const msg = "STATUS DA SINCRONIZAÇÃO\n\n" +
              "Linhas no Google Sheets: " + linhasSheets + "\n" +
              "Sincronização automática: " + (CONFIG.AUTO_SYNC_ON_EDIT ? "Ativada" : "Desativada") + "\n\n" +
              "Use Sincronizar Tudo Agora para forçar sincronização completa.";

  SpreadsheetApp.getUi().alert(msg);
}

function clearSupabaseTable() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "ATENÇÃO",
    "Isso vai DELETAR todos os dados da tabela no Supabase!\n\nTem certeza?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert("Operação cancelada.");
    return;
  }

  try {
    const url = CONFIG.SUPABASE_URL + "/rest/v1/" + CONFIG.TABLE_NAME + "?id=neq.00000000-0000-0000-0000-000000000000";

    const options = {
      method: "delete",
      headers: {
        "apikey": CONFIG.SUPABASE_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_KEY
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode === 200 || statusCode === 204) {
      ui.alert("Tabela limpa com sucesso!\n\nAgora você pode executar Sincronizar Tudo Agora.");
    } else {
      ui.alert("Erro: " + statusCode + "\n\n" + response.getContentText());
    }
  } catch (error) {
    ui.alert("Erro ao limpar tabela:\n\n" + error);
  }
}
