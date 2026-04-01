// Verificar quais campos estão preenchidos na dre_fabric
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

async function checkFields() {
  console.log('🔍 Verificando campos na dre_fabric...\n');

  // Total de registros
  const { count: total } = await supabase
    .from('dre_fabric')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de registros: ${total}\n`);

  // Campos críticos
  const fields = ['chave_id', 'data', 'valor', 'chave', 'fornecedor_padrao', 'ticket'];

  for (const field of fields) {
    const { count } = await supabase
      .from('dre_fabric')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null);

    const percent = total > 0 ? ((count / total) * 100).toFixed(2) : 0;
    console.log(`   ${field.padEnd(20)} : ${count?.toString().padStart(6)} / ${total}  (${percent}%)`);
  }

  // Buscar amostra
  console.log('\n📋 Amostra de 3 registros:\n');
  const { data: sample } = await supabase
    .from('dre_fabric')
    .select('id, chave, chave_id, data, valor, fornecedor_padrao, ticket')
    .limit(3);

  sample?.forEach((row, i) => {
    console.log(`Registro ${i + 1}:`);
    console.log(`   id: ${row.id}`);
    console.log(`   chave: ${row.chave || '(null)'}`);
    console.log(`   chave_id: ${row.chave_id || '(null)'}`);
    console.log(`   data: ${row.data || '(null)'}`);
    console.log(`   valor: ${row.valor || '(null)'}`);
    console.log(`   fornecedor_padrao: ${row.fornecedor_padrao || '(null)'}`);
    console.log(`   ticket: ${row.ticket || '(null)'}`);
    console.log('');
  });
}

checkFields();
