// =====================================================
// LIMPAR CACHE DO FILTRO DE MARCA
// Cole este código no Console do navegador (F12)
// =====================================================

console.log('🧹 Limpando cache do filtro de marca...');

// 1. Limpar sessionStorage
sessionStorage.removeItem('dreMarca');
console.log('✅ sessionStorage.dreMarca removido');

// 2. Limpar localStorage se existir
localStorage.removeItem('dreMarca');
console.log('✅ localStorage.dreMarca removido (se existia)');

// 3. Mostrar o que estava armazenado
console.log('📦 Valores antes da limpeza:');
console.log('   sessionStorage:', sessionStorage.getItem('dreMarca'));
console.log('   localStorage:', localStorage.getItem('dreMarca'));

// 4. Recarregar a página
console.log('🔄 Recarregando página em 2 segundos...');
setTimeout(() => {
  location.reload();
}, 2000);
