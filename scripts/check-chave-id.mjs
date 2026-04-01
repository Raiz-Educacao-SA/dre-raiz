// Script para verificar se chave_id tem dados
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

async function checkChaveId() {
  console.log('🔍 Verificando coluna chave_id...\n');

  // Buscar 10 registros
  const { data, error } = await supabase
    .from('transactions')
    .select('id, chave_id, ticket, vendor, description')
    .limit(10);

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log('📊 Amostra de 10 transações:\n');

  let countChaveId = 0;
  let countTicket = 0;
  let countVendor = 0;

  data.forEach((row, index) => {
    console.log(`\n--- Registro ${index + 1} ---`);
    console.log(`ID: ${row.id}`);
    console.log(`CHAVE_ID: ${row.chave_id || '❌ NULL/VAZIO'}`);
    console.log(`TICKET: ${row.ticket || '❌ NULL/VAZIO'}`);
    console.log(`VENDOR: ${row.vendor || '❌ NULL/VAZIO'}`);
    console.log(`Descrição: ${row.description?.substring(0, 50)}`);

    if (row.chave_id) countChaveId++;
    if (row.ticket) countTicket++;
    if (row.vendor) countVendor++;
  });

  console.log('\n\n📈 Resumo:');
  console.log(`✅ Registros com CHAVE_ID: ${countChaveId}/10`);
  console.log(`✅ Registros com TICKET: ${countTicket}/10`);
  console.log(`✅ Registros com VENDOR: ${countVendor}/10`);

  if (countChaveId === 0) {
    console.log('\n⚠️ PROBLEMA: Coluna CHAVE_ID está vazia!');
    console.log('Solução: Precisa popular a coluna chave_id no banco.');
  }
}

checkChaveId();
