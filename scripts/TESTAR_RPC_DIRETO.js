// =====================================================
// TESTAR RPC DIRETAMENTE DO NAVEGADOR
// Cole este código no Console do navegador (F12)
// =====================================================

// Importar o supabase client (deve estar disponível globalmente)
// Se não estiver, você precisa estar na página do app

console.log('🧪 Testando RPC get_dre_summary diretamente...');

// Função auxiliar para testar
async function testarRPC(marca) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 Testando marca: ${marca || 'TODAS'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const params = {
    month_from: '2026-01',
    month_to: '2026-12',
    marcas: marca ? [marca] : null,
    nome_filiais: null,
    tags01: null
  };

  console.log('📤 Parâmetros:', params);

  try {
    // Chamar o RPC (ajuste o supabase se necessário)
    const { data, error } = await supabase
      .rpc('get_dre_summary', {
        p_month_from: params.month_from,
        p_month_to: params.month_to,
        p_marcas: params.marcas,
        p_nome_filiais: params.nome_filiais,
        p_tags01: params.tags01
      });

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    console.log(`✅ Retornou ${data.length} linhas`);

    // Contar por marca
    const porMarca = data.reduce((acc, row) => {
      const m = row.marca || 'null';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Linhas por marca:', porMarca);

    // Calcular total
    const total = data.reduce((sum, row) => sum + Number(row.total_amount), 0);
    console.log('💰 Total:', total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

    return data;

  } catch (err) {
    console.error('❌ Exceção:', err);
  }
}

// Testar as 3 marcas
(async () => {
  console.log('\n🚀 Iniciando testes...\n');

  await testarRPC(null);  // Todas
  await testarRPC('AP');  // AP
  await testarRPC('GT');  // GT
  await testarRPC('QI');  // QI

  console.log('\n✅ Testes concluídos!');
  console.log('📋 ANÁLISE:');
  console.log('   - Se os totais forem IGUAIS → RPC não está filtrando (BUG NO BANCO)');
  console.log('   - Se os totais forem DIFERENTES → RPC OK, problema no FRONTEND');
})();
