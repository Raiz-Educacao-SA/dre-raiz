// Script para listar TODAS as políticas RLS em TODAS as tabelas
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vafmufhlompwsdrlhkfz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZm11Zmhsb21wd3Nkcmxoa2Z6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMjI5MSwiZXhwIjoyMDg1MDA4MjkxfQ.m0viLArNl57ExdNlRoEuNNZH0n_0iKSaa81Fyj2ekpA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listAllRLS() {
  try {
    console.log('🔍 LISTANDO TODAS AS POLÍTICAS RLS');
    console.log('═══════════════════════════════════════\n');

    // Listar todas as tabelas com RLS
    console.log('📊 TABELAS COM RLS HABILITADO:');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .order('tablename');

    if (tablesError) {
      console.error('❌ Erro ao listar tabelas:', tablesError);
    } else {
      const tablesWithRLS = tables.filter(t => t.rowsecurity);
      console.table(tablesWithRLS);
      console.log(`Total: ${tablesWithRLS.length} tabelas com RLS\n`);
    }

    // Listar TODAS as políticas RLS
    console.log('📋 TODAS AS POLÍTICAS RLS:');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .order('tablename', { ascending: true });

    if (policiesError) {
      console.error('❌ Erro ao listar políticas:', policiesError);
    } else {
      console.log(`Total: ${policies?.length || 0} políticas encontradas\n`);

      // Agrupar por tabela
      const grouped = {};
      policies?.forEach(p => {
        if (!grouped[p.tablename]) grouped[p.tablename] = [];
        grouped[p.tablename].push(p);
      });

      Object.keys(grouped).forEach(tablename => {
        console.log(`\n📌 Tabela: ${tablename}`);
        console.log('─'.repeat(60));
        grouped[tablename].forEach(p => {
          console.log(`  • ${p.policyname}`);
          console.log(`    Tipo: ${p.cmd} | Permissivo: ${p.permissive}`);
          console.log(`    Roles: ${p.roles || 'todos'}`);
          if (p.qual) {
            console.log(`    Condição: ${p.qual.substring(0, 100)}...`);
          }
        });
      });
    }

    // Listar funções que podem aplicar filtros
    console.log('\n\n📦 FUNÇÕES QUE PODEM APLICAR FILTROS:');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', '%permission%')
      .order('proname');

    if (!functionsError && functions?.length > 0) {
      console.table(functions);
    } else {
      console.log('Nenhuma função de permissão encontrada');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ ANÁLISE CONCLUÍDA');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

listAllRLS();
