// Script Node.js para verificar tamanho do banco
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Carregar .env
dotenv.config();

// Ler .env manualmente se dotenv não funcionar
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
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
  } catch (e) {
    console.error('Erro ao ler .env:', e);
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSize() {
  console.log('🔍 Verificando tamanho do banco de dados...\n');

  try {
    // Contar total de transações
    const { count: transactionsCount, error: transactionsError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (transactionsError) {
      console.error('❌ Erro ao contar transações:', transactionsError);
    } else {
      console.log(`📊 Total de transações: ${transactionsCount?.toLocaleString() || 0}`);
    }

    // Contar total de mudanças
    const { count: changesCount, error: changesError } = await supabase
      .from('manual_changes')
      .select('*', { count: 'exact', head: true });

    if (changesError) {
      console.error('❌ Erro ao contar mudanças:', changesError);
    } else {
      console.log(`📝 Total de mudanças: ${changesCount?.toLocaleString() || 0}`);
    }

    // Buscar range de datas
    const { data: dateRange, error: dateError } = await supabase
      .from('transactions')
      .select('date')
      .order('date', { ascending: true })
      .limit(1);

    const { data: dateRangeMax, error: dateErrorMax } = await supabase
      .from('transactions')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    if (!dateError && !dateErrorMax && dateRange && dateRangeMax && dateRange.length > 0 && dateRangeMax.length > 0) {
      console.log(`\n📅 Data mais antiga: ${dateRange[0]?.date}`);
      console.log(`📅 Data mais recente: ${dateRangeMax[0]?.date}`);
    }

    // Contar por cenário
    console.log('\n📊 Por cenário:');
    const scenarios = ['Real', 'Orçado', 'A-1'];
    for (const scenario of scenarios) {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('scenario', scenario);

      if (!error) {
        console.log(`   ${scenario}: ${count?.toLocaleString() || 0}`);
      }
    }

    console.log('\n✅ Verificação concluída!');
    console.log('\n💡 Recomendações:');

    if (transactionsCount && transactionsCount > 10000) {
      console.log('   ⚠️ Muitos dados! Recomendado:');
      console.log('   - Implementar paginação');
      console.log('   - Carregar apenas últimos 3-6 meses inicialmente');
      console.log('   - Adicionar filtros de data antes de carregar');
    } else if (transactionsCount && transactionsCount > 5000) {
      console.log('   ⚠️ Base média. Recomendado:');
      console.log('   - Carregar com limite de 5000 registros');
      console.log('   - Implementar lazy loading');
    } else {
      console.log('   ✅ Base pequena, pode carregar tudo de uma vez');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  }
}

checkDatabaseSize();
