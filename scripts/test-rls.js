// Script para testar RLS temporariamente
const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('🔍 TESTE RLS - Início');
    console.log('═══════════════════════════════════════\n');

    // PASSO 1: Desabilitar RLS
    console.log('📍 PASSO 1: Desabilitando RLS em transactions...');
    await executeSQL('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS DESABILITADO\n');

    // PASSO 2: Verificar status
    console.log('📍 PASSO 2: Verificando status...');
    const status = await executeSQL(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'transactions'
    `);
    console.log('Status:', status);
    console.log('');

    // PASSO 3: Testar query
    console.log('📍 PASSO 3: Testando query DRE (Admin sem filtros)...');
    const startTime = Date.now();

    const result = await executeSQL(`
      SELECT COUNT(*) as total
      FROM get_dre_summary('2026-01', '2026-12')
    `);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Query executada em ${elapsed}s`);
    console.log(`Total de linhas agregadas: ${result[0]?.total || 'N/A'}`);
    console.log('');

    // PASSO 4: Reabilitar RLS
    console.log('📍 PASSO 4: Reabilitando RLS...');
    await executeSQL('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS REABILITADO\n');

    // RESULTADO
    console.log('═══════════════════════════════════════');
    console.log('📊 RESULTADO DO TESTE:');
    console.log('═══════════════════════════════════════');

    if (parseFloat(elapsed) < 10) {
      console.log('✅ PROBLEMA É RLS!');
      console.log('   Query rodou rápido com RLS desabilitado.');
      console.log('   Solução: Criar política RLS específica para Admin.');
      console.log('   Executar: FIX_RLS_ADMIN_ACESSO_TOTAL.sql');
    } else {
      console.log('⚠️ PROBLEMA É VOLUME DE DADOS!');
      console.log(`   Query demorou ${elapsed}s mesmo com RLS desabilitado.`);
      console.log('   Solução: Cache materializado ou limite de período.');
      console.log('   Executar: USAR_CACHE_MATERIALIZADO.sql');
    }

  } catch (error) {
    console.error('❌ ERRO:', error.message);

    // Tentar reabilitar RLS em caso de erro
    try {
      console.log('\n⚠️ Tentando reabilitar RLS...');
      await executeSQL('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
      console.log('✅ RLS reabilitado com sucesso');
    } catch (err) {
      console.error('❌ Não foi possível reabilitar RLS automaticamente.');
      console.error('⚠️ EXECUTE MANUALMENTE: ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    }
  }
}

main();
