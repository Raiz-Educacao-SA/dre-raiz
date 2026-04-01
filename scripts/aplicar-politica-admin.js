// Script para criar política RLS que permite Admin ver tudo
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createAdminPolicy() {
  try {
    console.log('🔧 CRIANDO POLÍTICA RLS PARA ADMIN');
    console.log('═══════════════════════════════════════\n');

    // PASSO 1: Ver políticas atuais
    console.log('📍 PASSO 1: Verificando políticas atuais...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, permissive, roles, cmd
        FROM pg_policies
        WHERE tablename = 'transactions'
        ORDER BY policyname;
      `
    });

    if (policiesError) {
      console.log('⚠️ Não foi possível listar políticas (não tem RPC exec_sql)');
      console.log('Vou criar a política diretamente...\n');
    } else {
      console.log('Políticas atuais:', policies);
      console.log('');
    }

    // PASSO 2: Remover política antiga de admin (se existir)
    console.log('📍 PASSO 2: Removendo política antiga (se existir)...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;`
    });

    if (dropError) {
      console.log('⚠️ Não foi possível remover via RPC');
      console.log('Você precisará executar manualmente no SQL Editor');
      console.log('SQL: DROP POLICY IF EXISTS "allow_admin_full_access" ON transactions;\n');
    } else {
      console.log('✅ Política antiga removida\n');
    }

    // PASSO 3: Criar nova política permissiva para Admin
    console.log('📍 PASSO 3: Criando política permissiva para Admin...');

    const createPolicySQL = `
      CREATE POLICY "allow_admin_full_access"
        ON transactions
        FOR SELECT
        TO public
        USING (
          EXISTS (
            SELECT 1
            FROM users
            WHERE users.email = auth.jwt() ->> 'email'
              AND users.role = 'admin'
          )
        );
    `;

    console.log('SQL:', createPolicySQL);

    const { error: createError } = await supabase.rpc('exec_sql', {
      query: createPolicySQL
    });

    if (createError) {
      console.log('\n⚠️ Não foi possível criar via RPC (função não existe)');
      console.log('\n📋 EXECUTE MANUALMENTE NO SQL EDITOR:');
      console.log('═══════════════════════════════════════');
      console.log(createPolicySQL);
      console.log('═══════════════════════════════════════\n');
    } else {
      console.log('✅ Política criada com sucesso!\n');
    }

    // PASSO 4: Verificar usuários admin
    console.log('📍 PASSO 4: Verificando usuários com role admin...');
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('email, role')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('❌ Erro:', adminsError);
    } else {
      console.log('Admins cadastrados:');
      console.table(admins);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ PRÓXIMOS PASSOS:');
    console.log('═══════════════════════════════════════');
    console.log('1. Executar SQL manualmente no SQL Editor (se RPC falhou)');
    console.log('2. Hard Refresh no navegador (Ctrl+Shift+R)');
    console.log('3. Login como Admin');
    console.log('4. Abrir DRE Gerencial');
    console.log('5. ✅ Deve carregar em < 2 segundos!');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

createAdminPolicy();
