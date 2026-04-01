// TESTE SIMPLES - Adicione no console do browser
// Cole isso no console e execute para testar

// 1. Ver estados atuais
console.log('=== ESTADOS ATUAIS ===');
console.log('sessionStorage.dreBrands:', sessionStorage.getItem('dreBrands'));
console.log('sessionStorage.dreBranches:', sessionStorage.getItem('dreBranches'));
console.log('sessionStorage.dreTags01:', sessionStorage.getItem('dreTags01'));

// 2. Limpar estados
console.log('\n=== LIMPANDO ESTADOS ===');
sessionStorage.removeItem('dreBrands');
sessionStorage.removeItem('dreBranches');
sessionStorage.removeItem('dreTags01');
console.log('✅ Estados limpos - recarregue a página');

// 3. Testar RPC diretamente
console.log('\n=== TESTANDO RPC ===');
const { createClient } = supabase;
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_KEY'
);

// Teste sem filtros
supabase.rpc('get_dre_summary', {
  p_month_from: '2026-01',
  p_month_to: '2026-12',
  p_marcas: null,
  p_filiais: null,
  p_tags01: null
}).then(({ data, error }) => {
  console.log('Sem filtros:', data?.length, 'linhas');
  if (error) console.error('Erro:', error);
});

// Teste COM filtro de marca (ajuste 'QI' para uma marca real)
supabase.rpc('get_dre_summary', {
  p_month_from: '2026-01',
  p_month_to: '2026-12',
  p_marcas: ['QI'],
  p_filiais: null,
  p_tags01: null
}).then(({ data, error }) => {
  console.log('Com marca QI:', data?.length, 'linhas');
  if (error) console.error('Erro:', error);
});
