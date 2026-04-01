// Verificar dados da coluna filial
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const envContent = readFileSync('.env', 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFilial() {
  console.log('🔍 Verificando coluna filial...\n');

  // Total de registros
  const { count: total } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de registros: ${total}\n`);

  // Com filial preenchida
  const { count: comFilial } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .not('filial', 'is', null)
    .neq('filial', '');

  console.log(`✅ Com filial: ${comFilial} (${((comFilial/total)*100).toFixed(2)}%)`);
  console.log(`❌ Sem filial: ${total - comFilial} (${(((total-comFilial)/total)*100).toFixed(2)}%)\n`);

  // Amostra de 5 registros
  console.log('📋 Amostra de 5 registros:\n');
  const { data: sample } = await supabase
    .from('transactions')
    .select('id, filial, marca, vendor, chave_id')
    .limit(5);

  sample?.forEach((row, i) => {
    console.log(`Registro ${i + 1}:`);
    console.log(`   ID: ${row.id.substring(0, 8)}...`);
    console.log(`   FILIAL: "${row.filial || '(vazio)'}"`);
    console.log(`   MARCA: "${row.marca || '(vazio)'}"`);
    console.log(`   VENDOR: "${row.vendor?.substring(0, 30) || '(vazio)'}"`);
    console.log(`   CHAVE_ID: "${row.chave_id || '(vazio)'}"`);
    console.log('');
  });

  // Verificar se dre_fabric tem filial
  console.log('🔍 Verificando dre_fabric...\n');
  const { count: totalFabric } = await supabase
    .from('dre_fabric')
    .select('*', { count: 'exact', head: true });

  const { count: comFilialFabric } = await supabase
    .from('dre_fabric')
    .select('*', { count: 'exact', head: true })
    .not('filial', 'is', null)
    .neq('filial', '');

  console.log(`📊 dre_fabric total: ${totalFabric}`);
  console.log(`✅ dre_fabric com filial: ${comFilialFabric} (${((comFilialFabric/totalFabric)*100).toFixed(2)}%)\n`);

  // Amostra dre_fabric
  const { data: sampleFabric } = await supabase
    .from('dre_fabric')
    .select('id, filial, cia, chave_id')
    .limit(3);

  console.log('📋 Amostra de dre_fabric:\n');
  sampleFabric?.forEach((row, i) => {
    console.log(`Registro ${i + 1}:`);
    console.log(`   ID: ${row.id}`);
    console.log(`   FILIAL: "${row.filial || '(vazio)'}"`);
    console.log(`   CIA: "${row.cia || '(vazio)'}"`);
    console.log(`   CHAVE_ID: "${row.chave_id || '(vazio)'}"`);
    console.log('');
  });
}

checkFilial();
