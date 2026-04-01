// =====================================================
// Teste automatizado do filtro de Marca usando Playwright
// =====================================================

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Iniciando teste automatizado do filtro de Marca...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar logs do console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🎯 [USER ACTION]') ||
        text.includes('🔄 [TRIGGER]') ||
        text.includes('🔍 [DEBUG FILTRO]') ||
        text.includes('✅ DRE carregada') ||
        text.includes('💰 Total geral')) {
      console.log('📱 CONSOLE:', text);
    }
  });

  try {
    // 1. Navegar para a aplicação
    console.log('📍 Navegando para http://localhost:5173');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    // 2. Clicar na guia DRE Gerencial
    console.log('📊 Clicando em DRE Gerencial...');
    await page.click('text=DRE Gerencial');
    await page.waitForTimeout(2000);

    // 3. Teste 1: Selecionar marca AP
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 1: Selecionando marca AP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const marcaSelect = await page.locator('select').filter({ hasText: 'Todas' }).first();
    await marcaSelect.selectOption('AP');
    await page.waitForTimeout(3000);

    // Capturar valor de uma linha da tabela
    const valorAP = await page.locator('table tr').first().textContent();
    console.log('📊 Primeira linha com AP:', valorAP);

    // 4. Teste 2: Selecionar marca GT
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 2: Selecionando marca GT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await marcaSelect.selectOption('GT');
    await page.waitForTimeout(3000);

    const valorGT = await page.locator('table tr').first().textContent();
    console.log('📊 Primeira linha com GT:', valorGT);

    // 5. Teste 3: Selecionar marca QI
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 3: Selecionando marca QI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await marcaSelect.selectOption('QI');
    await page.waitForTimeout(3000);

    const valorQI = await page.locator('table tr').first().textContent();
    console.log('📊 Primeira linha com QI:', valorQI);

    // 6. Análise
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ANÁLISE DOS RESULTADOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (valorAP === valorGT && valorGT === valorQI) {
      console.log('❌ PROBLEMA CONFIRMADO: Valores são IGUAIS para todas as marcas!');
      console.log('   → O filtro está travado');
    } else {
      console.log('✅ FILTRO FUNCIONANDO: Valores são DIFERENTES!');
      console.log('   AP:', valorAP.substring(0, 50));
      console.log('   GT:', valorGT.substring(0, 50));
      console.log('   QI:', valorQI.substring(0, 50));
    }

    // Manter navegador aberto para inspeção
    console.log('\n⏸️  Navegador vai ficar aberto por 30 segundos para inspeção...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);

    // Tirar screenshot do erro
    await page.screenshot({ path: 'erro-teste-marca.png', fullPage: true });
    console.log('📸 Screenshot salvo: erro-teste-marca.png');
  } finally {
    await browser.close();
    console.log('\n✅ Teste concluído!');
  }
})();
