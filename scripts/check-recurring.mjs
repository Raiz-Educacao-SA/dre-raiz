// Script para verificar a coluna recurring
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

async function checkRecurring() {
  console.log('🔍 Verificando coluna recurring...\n');

  // Total de registros
  const { count: total } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de registros: ${total}\n`);

  // Com recurring = 'Sim'
  const { count: comSim } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('recurring', 'Sim');

  console.log(`✅ recurring = 'Sim': ${comSim} (${((comSim/total)*100).toFixed(2)}%)`);

  // Com recurring IS NULL
  const { count: comNull } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .is('recurring', null);

  console.log(`⚪ recurring IS NULL: ${comNull} (${((comNull/total)*100).toFixed(2)}%)`);

  // Com recurring = 'Não'
  const { count: comNao } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('recurring', 'Não');

  console.log(`❌ recurring = 'Não': ${comNao} (${((comNao/total)*100).toFixed(2)}%)\n`);

  // Verificar registros de Janeiro a Março com recurring = 'Sim'
  const { count: janMarSim } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2026-01-01')
    .lte('date', '2026-03-31')
    .eq('recurring', 'Sim');

  console.log(`🗓️  Janeiro-Março com recurring = 'Sim': ${janMarSim}`);

  // Verificar registros de Janeiro a Março TOTAL
  const { count: janMarTotal } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2026-01-01')
    .lte('date', '2026-03-31');

  console.log(`🗓️  Janeiro-Março TOTAL: ${janMarTotal}`);
  console.log(`📊 Diferença: ${janMarTotal - janMarSim} registros filtrados pelo recurring!\n`);

  // Amostra de registros com diferentes valores de recurring
  console.log('📋 Amostra de registros:\n');
  const { data: sample } = await supabase
    .from('transactions')
    .select('id, date, recurring, description, amount')
    .limit(10);

  sample?.forEach((row, i) => {
    console.log(`Registro ${i + 1}:`);
    console.log(`   DATE: ${row.date}`);
    console.log(`   RECURRING: "${row.recurring || '(null)'}"`);
    console.log(`   AMOUNT: ${row.amount}`);
    console.log('');
  });
}

checkRecurring();
