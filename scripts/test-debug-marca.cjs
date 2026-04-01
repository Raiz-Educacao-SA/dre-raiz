// =====================================================
// Teste automatizado do DEBUG do filtro de Marca
// =====================================================

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Iniciando teste DEBUG do filtro de Marca...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down para ver o que está acontecendo
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capturar TODOS os logs do console
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('📱 CONSOLE:', text);
  });

  try {
    // 1. Navegar para a aplicação
    console.log('📍 Navegando para http://localhost:5173\n');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 2. Verificar se precisa fazer login
    const needsLogin = await page.locator('text=Verificando autenticação').isVisible().catch(() => false);

    if (needsLogin) {
      console.log('🔐 Página requer autenticação - aguarde 10 segundos para login manual...\n');
      await page.waitForTimeout(10000);
    }

    // 3. Tentar encontrar a guia DRE Gerencial
    console.log('📊 Procurando guia DRE Gerencial...\n');

    const dreTab = page.locator('text=DRE').or(page.locator('text=Gerencial')).or(page.locator('button:has-text("DRE")')).first();
    const dreExists = await dreTab.isVisible({ timeout: 5000 }).catch(() => false);

    if (dreExists) {
      console.log('✅ Encontrou guia DRE, clicando...\n');
      await dreTab.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️ Guia DRE não encontrada, continuando mesmo assim...\n');
    }

    // 4. Procurar o botão de DEBUG
    console.log('🔍 Procurando botão DEBUG...\n');
    const debugButton = page.locator('button:has-text("DEBUG")').or(page.locator('button:has-text("🔍")'));
    const debugExists = await debugButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!debugExists) {
      console.log('❌ Botão DEBUG não encontrado!\n');
      console.log('📸 Tirando screenshot...\n');
      await page.screenshot({ path: 'sem-botao-debug.png', fullPage: true });
      return;
    }

    // 5. Testar com marca AP
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 1: Marca AP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const marcaSelect = page.locator('select').filter({ hasText: /Todas|AP|GT|QI/ }).first();
    const selectExists = await marcaSelect.isVisible({ timeout: 5000 }).catch(() => false);

    if (selectExists) {
      await marcaSelect.selectOption('AP');
      await page.waitForTimeout(2000);
      console.log('✅ Selecionou marca AP\n');
    } else {
      console.log('⚠️ Dropdown de marca não encontrado\n');
    }

    // Limpar logs anteriores
    logs.length = 0;

    // Clicar no DEBUG
    await debugButton.click();
    await page.waitForTimeout(2000);

    console.log('\n📋 LOGS DO DEBUG (AP):');
    const logsAP = [...logs];
    logsAP.forEach(log => console.log(log));

    // 6. Testar com marca GT
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 2: Marca GT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (selectExists) {
      await marcaSelect.selectOption('GT');
      await page.waitForTimeout(2000);
      console.log('✅ Selecionou marca GT\n');
    }

    logs.length = 0;
    await debugButton.click();
    await page.waitForTimeout(2000);

    console.log('\n📋 LOGS DO DEBUG (GT):');
    const logsGT = [...logs];
    logsGT.forEach(log => console.log(log));

    // 7. Testar com marca QI
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE 3: Marca QI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (selectExists) {
      await marcaSelect.selectOption('QI');
      await page.waitForTimeout(2000);
      console.log('✅ Selecionou marca QI\n');
    }

    logs.length = 0;
    await debugButton.click();
    await page.waitForTimeout(2000);

    console.log('\n📋 LOGS DO DEBUG (QI):');
    const logsQI = [...logs];
    logsQI.forEach(log => console.log(log));

    // 8. Análise
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ANÁLISE DOS RESULTADOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Extrair marcas dos logs
    const extractMarcas = (logs) => {
      const marcasLine = logs.find(l => l.includes('Marcas em summaryRows:'));
      return marcasLine || 'Não encontrado';
    };

    console.log('AP:', extractMarcas(logsAP));
    console.log('GT:', extractMarcas(logsGT));
    console.log('QI:', extractMarcas(logsQI));

    // Manter navegador aberto para inspeção
    console.log('\n⏸️  Navegador vai ficar aberto por 30 segundos para inspeção...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    await page.screenshot({ path: 'erro-debug-marca.png', fullPage: true });
    console.log('📸 Screenshot salvo: erro-debug-marca.png\n');
  } finally {
    await browser.close();
    console.log('\n✅ Teste concluído!');
  }
})();
