// Script para verificar a distribuição de datas
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

async function checkDates() {
  console.log('🔍 Verificando distribuição de datas...\n');

  // Total de registros
  const { count: total } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de registros: ${total}\n`);

  // Data mínima e máxima
  const { data: minMax } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: true })
    .limit(1);

  const { data: maxData } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);

  if (minMax && minMax.length > 0) {
    console.log(`📅 Data mínima: ${minMax[0].date}`);
  }
  if (maxData && maxData.length > 0) {
    console.log(`📅 Data máxima: ${maxData[0].date}\n`);
  }

  // Contar por mês
  console.log('📊 Distribuição por mês:\n');

  const months = [
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    '2025-12', '2025-11', '2025-10'
  ];

  for (const month of months) {
    const [year, monthNum] = month.split('-');
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${lastDay}`;

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDate)
      .lte('date', endDate);

    if (count > 0) {
      console.log(`   ${month}: ${count.toLocaleString()} registros`);
    }
  }

  // Janeiro a Março de 2026
  console.log('\n🎯 Janeiro a Março de 2026:\n');

  const { count: janMar } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2026-01-01')
    .lte('date', '2026-03-31');

  console.log(`   Total: ${janMar.toLocaleString()} registros`);

  // Amostra de datas
  console.log('\n📋 Amostra de 20 datas únicas:\n');
  const { data: sampleDates } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: false })
    .limit(100);

  const uniqueDates = [...new Set(sampleDates?.map(r => r.date))].slice(0, 20);
  uniqueDates.forEach((date, i) => {
    console.log(`   ${i + 1}. ${date}`);
  });
}

checkDates();
