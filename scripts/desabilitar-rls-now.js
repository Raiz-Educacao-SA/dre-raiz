// Script para desabilitar RLS via HTTP direto
const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

async function disableRLS() {
  console.log('⚠️  DESABILITANDO RLS NA TABELA TRANSACTIONS');
  console.log('═══════════════════════════════════════\n');

  try {
    // Tentar via SQL direto (pode não funcionar se não tiver endpoint)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;'
      })
    });

    if (response.ok) {
      console.log('✅ RLS DESABILITADO COM SUCESSO!\n');
    } else {
      const error = await response.text();
      console.log('❌ Não foi possível via API');
      console.log('Resposta:', error);
      console.log('\n📋 EXECUTE MANUALMENTE NO SQL EDITOR:');
      console.log('═══════════════════════════════════════');
      console.log('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');
      console.log('═══════════════════════════════════════\n');
    }

    // Verificar status via query
    console.log('📍 Verificando status da tabela...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql?query=SELECT * FROM pg_tables WHERE tablename='transactions'`,
      {
        method: 'GET',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('Status:', data);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('🧪 AGORA TESTE NO NAVEGADOR:');
    console.log('═══════════════════════════════════════');
    console.log('1. Hard Refresh (Ctrl+Shift+R)');
    console.log('2. Login como Admin');
    console.log('3. Abrir DRE Gerencial');
    console.log('4. Aguardar...\n');
    console.log('✅ Se carregar RÁPIDO: Problema é RLS');
    console.log('❌ Se ainda ficar lento: Problema é código/dados\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.log('\n📋 EXECUTE MANUALMENTE:');
    console.log('Arquivo: DESABILITAR_RLS_TESTE.sql');
  }
}

disableRLS();
