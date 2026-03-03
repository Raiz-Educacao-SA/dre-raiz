/**
 * Carga de De-Para Fornecedores via Excel → Supabase
 * Uso: node scripts/carga_depara_fornec.js
 */
const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FILE_PATH = path.join('C:', 'Users', 'edmilson.serafim', 'Downloads', 'DEPARA FORNEC.xlsx');
const BATCH_SIZE = 100;

async function main() {
  // 1. Ler Excel
  console.log(`Lendo: ${FILE_PATH}`);
  const wb = XLSX.readFile(FILE_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  console.log(`Total de linhas no Excel: ${rows.length}`);

  // 2. Mapear e validar
  const records = rows
    .map(r => ({
      fornecedor_de: String(r['Fornecedor De'] || '').trim(),
      fornecedor_para: String(r['Fornecedor Para'] || '').trim(),
    }))
    .filter(r => r.fornecedor_de && r.fornecedor_para);

  console.log(`Registros válidos: ${records.length}`);

  if (records.length === 0) {
    console.log('Nenhum registro para inserir.');
    return;
  }

  // 3. Autenticar como admin (service role não necessário — RLS permite insert para admin)
  // Usando anon key + login via email/password se necessário
  // Para carga inicial, vamos usar UPSERT para evitar duplicatas

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    const { data, error } = await supabase
      .from('depara_fornec')
      .upsert(batch, { onConflict: 'fornecedor_de', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error(`  Batch ${batchNum}/${totalBatches} ERRO:`, error.message);
      errors += batch.length;
    } else {
      inserted += (data?.length || 0);
      console.log(`  Batch ${batchNum}/${totalBatches} OK — ${data?.length || 0} registros`);
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log(`Inseridos: ${inserted}`);
  console.log(`Erros: ${errors}`);
  console.log('Concluído!');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
