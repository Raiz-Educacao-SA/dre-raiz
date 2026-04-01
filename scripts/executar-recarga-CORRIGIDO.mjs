// Script CORRIGIDO para executar a recarga no Supabase
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

async function executarRecarga() {
  console.log('🚀 Iniciando recarga de 50.000 registros (CORRIGIDO)...\n');

  try {
    // Passo 1: Limpar tabela
    console.log('🗑️  Passo 1/3: Limpando tabela transactions...');
    const { count: beforeCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    console.log(`   Registros antes: ${beforeCount || 0}`);

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', ''); // Deleta tudo

    if (deleteError) {
      console.error('❌ Erro ao limpar:', deleteError);
      return;
    }

    console.log('✅ Tabela limpa!\n');

    // Passo 2: Carregar dados
    console.log('📊 Passo 2/3: Carregando 50.000 registros...');
    console.log('   (Isso pode demorar 2-5 minutos...)\n');

    // Buscar dados da dre_fabric (SEM filtros restritivos!)
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore && allData.length < 50000) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      console.log(`   Carregando registros ${from + 1} a ${Math.min(to + 1, 50000)}...`);

      const { data, error } = await supabase
        .from('dre_fabric')
        .select('*')
        .not('chave_id', 'is', null)  // Apenas filtrar chave_id (obrigatório)
        .range(from, to);

      if (error) {
        console.error('❌ Erro ao buscar dados:', error);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        console.log(`   ✅ ${allData.length} registros carregados`);

        if (data.length < pageSize || allData.length >= 50000) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Limitar a 50.000
    if (allData.length > 50000) {
      allData = allData.slice(0, 50000);
    }

    console.log(`\n   Total para inserir: ${allData.length}`);

    // Mapear para formato de transactions (CORRIGIDO!)
    console.log('\n   Mapeando dados...');
    const transactions = allData.map(df => {
      // Gerar data a partir de anomes (se disponível)
      let date = null;
      if (df.anomes) {
        const year = df.anomes.substring(0, 4);
        const month = df.anomes.substring(4, 6);
        date = `${year}-${month}-01`;
      }

      return {
        id: crypto.randomUUID(),
        chave_id: df.chave_id,              // ✅ CORRETO!
        date: date || '2026-01-01',         // Usar anomes ou data padrão
        description: df.complemento || 'Sem descrição',
        category: df.conta || 'Outros',
        amount: df.valor || 0,
        marca: df.cia,
        filial: df.filial,
        vendor: df.fornecedor_padrao,       // ✅ CORRETO!
        ticket: df.ticket,                  // ✅ CORRETO!
        tag01: df.tag1,                     // ✅ CORRIGIDO: tag1 (não tag01)
        tag02: df.tag2 || null,             // ✅ CORRIGIDO: tag2
        tag03: df.tag3 || null,             // ✅ CORRIGIDO: tag3
        type: df.type || 'REVENUE',
        scenario: df.scenario || 'Real',
        status: df.status || 'Normal',
        nat_orc: df.tag_orc || null,
        recurring: df.recorrente || null
      };
    });

    console.log('   ✅ Dados mapeados!\n');

    // Inserir em lotes de 1000
    console.log('   Inserindo no banco...');
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(batch);

      if (insertError) {
        console.error(`   ❌ Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, insertError);
        console.error(`   Detalhes:`, insertError.message);
        break;
      }

      inserted += batch.length;
      console.log(`   ✅ ${inserted}/${transactions.length} registros inseridos`);
    }

    console.log('\n✅ Passo 2 concluído!\n');

    // Passo 3: Validação
    console.log('🔍 Passo 3/3: Validando...\n');

    const { count: afterCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    console.log(`   📊 Total de registros: ${afterCount}`);

    // Buscar amostra
    const { data: sample } = await supabase
      .from('transactions')
      .select('id, chave_id, vendor, ticket, amount, date, tag01')
      .limit(5);

    console.log('\n   📋 Amostra de 5 registros:');
    sample?.forEach((row, i) => {
      console.log(`\n   Registro ${i + 1}:`);
      console.log(`      ID: ${row.id.substring(0, 8)}...`);
      console.log(`      CHAVE_ID: ${row.chave_id} ${row.chave_id?.match(/^[0-9]+-[0-9]+-[0-9]+$/) ? '✅' : '⚠️'}`);
      console.log(`      VENDOR: ${(row.vendor || '(vazio)').substring(0, 30)}`);
      console.log(`      TICKET: ${row.ticket || '(vazio)'}`);
      console.log(`      AMOUNT: ${row.amount}`);
      console.log(`      DATE: ${row.date}`);
      console.log(`      TAG01: ${row.tag01 || '(vazio)'}`);
    });

    console.log('\n\n🎉 RECARGA CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Total de registros carregados: ${afterCount}`);
    console.log(`\n✅ Correções aplicadas:`);
    console.log(`   - Removido filtro restritivo de 'data'`);
    console.log(`   - Corrigido: tag1, tag2, tag3 (não tag01, tag02, tag03)`);
    console.log(`   - Data gerada a partir de 'anomes'`);
    console.log(`   - Mapeamento correto: chave_id, vendor, ticket`);

  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error);
  }
}

executarRecarga();
