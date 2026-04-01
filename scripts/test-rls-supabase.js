// Script para testar RLS usando @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testWithoutRLS() {
  try {
    console.log('🔍 TESTE: Query DRE com SERVICE_ROLE (ignora RLS)');
    console.log('═══════════════════════════════════════\n');

    // SERVICE_ROLE ignora RLS automaticamente
    console.log('📍 Testando query get_dre_summary...');
    const startTime = Date.now();

    const { data, error } = await supabase.rpc('get_dre_summary', {
      p_month_from: '2026-01',
      p_month_to: '2026-12',
      p_marcas: null,
      p_nome_filiais: null,
      p_tags01: null
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (error) {
      console.error('❌ ERRO:', error);
      return;
    }

    console.log(`✅ Query executada em ${elapsed}s`);
    console.log(`Total de linhas agregadas: ${data?.length || 0}`);
    console.log('');

    // Mostrar primeiras linhas
    if (data && data.length > 0) {
      console.log('📊 Primeiras 5 linhas:');
      console.table(data.slice(0, 5));
    }

    // RESULTADO
    console.log('\n═══════════════════════════════════════');
    console.log('📊 DIAGNÓSTICO:');
    console.log('═══════════════════════════════════════');

    if (parseFloat(elapsed) < 10) {
      console.log(`✅ Query RÁPIDA (${elapsed}s)`);
      console.log('   Problema provavelmente é RLS ou filtros.');
      console.log('   Admin com ANON_KEY pode estar sendo bloqueado.');
    } else {
      console.log(`⚠️ Query LENTA (${elapsed}s)`);
      console.log('   Problema é VOLUME DE DADOS (125k registros).');
      console.log('   Solução: Cache materializado.');
      console.log('   Executar: USAR_CACHE_MATERIALIZADO.sql');
    }

    // Testar contagem de transações
    console.log('\n📍 Testando contagem total de transações...');
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar:', countError);
    } else {
      console.log(`Total de registros: ${count?.toLocaleString() || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testWithoutRLS();
