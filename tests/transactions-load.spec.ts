import { test, expect } from '@playwright/test';

test.describe('Guia Lançamentos - Carregamento', () => {

  test('deve carregar a página e exibir dados ou mensagem', async ({ page }) => {
    // Capturar erros de console
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'log') consoleLogs.push(msg.text());
    });

    // Capturar erros de rede (500, etc)
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url().substring(0, 120)}`);
      }
    });

    // Ir para a página
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

    // Screenshot da página inicial
    await page.screenshot({ path: 'tests/screenshots/01-home.png', fullPage: false });
    console.log('📸 Screenshot 01-home.png salva');

    // Verificar se a página carregou
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Página carregou');

    // Procurar link/botão de Lançamentos na sidebar
    const lancamentosLink = page.locator('text=Lançamentos').first();
    const lancamentosExists = await lancamentosLink.isVisible().catch(() => false);

    if (!lancamentosExists) {
      // Pode precisar de login - tirar screenshot e reportar
      await page.screenshot({ path: 'tests/screenshots/02-no-lancamentos.png', fullPage: false });
      console.log('⚠️ Link "Lançamentos" não encontrado - pode precisar de login');
      console.log('📸 Screenshot 02-no-lancamentos.png salva');

      // Listar todos os textos visíveis para debug
      const bodyText = await page.locator('body').innerText();
      console.log('📄 Conteúdo da página:', bodyText.substring(0, 500));
      return;
    }

    // Clicar em Lançamentos
    await lancamentosLink.click();
    console.log('🖱️ Clicou em Lançamentos');

    // Aguardar carregamento (até 20s)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/03-lancamentos-loading.png', fullPage: false });
    console.log('📸 Screenshot 03-lancamentos-loading.png salva');

    // Aguardar mais para auto-load completar
    await page.waitForTimeout(15000);
    await page.screenshot({ path: 'tests/screenshots/04-lancamentos-loaded.png', fullPage: false });
    console.log('📸 Screenshot 04-lancamentos-loaded.png salva');

    // Verificar se há tabela com dados
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count().catch(() => 0);
    console.log(`📊 Rows na tabela: ${rowCount}`);

    // Verificar se há mensagem de "nenhum dado" ou similar
    const bodyText = await page.locator('body').innerText();
    const hasNoData = bodyText.includes('Nenhum') || bodyText.includes('nenhum') || bodyText.includes('vazio');
    console.log(`📄 Tem mensagem "nenhum dado": ${hasNoData}`);

    // Verificar botão "Buscar"
    const buscarBtn = page.locator('button:has-text("Buscar")').first();
    const buscarExists = await buscarBtn.isVisible().catch(() => false);
    console.log(`🔍 Botão Buscar visível: ${buscarExists}`);

    // Se não carregou dados automaticamente, tentar clicar em Buscar
    if (rowCount === 0 && buscarExists) {
      console.log('🔄 Tentando clicar no botão Buscar manualmente...');
      await buscarBtn.click();
      await page.waitForTimeout(10000);
      await page.screenshot({ path: 'tests/screenshots/05-lancamentos-after-buscar.png', fullPage: false });
      console.log('📸 Screenshot 05-lancamentos-after-buscar.png salva');

      const rowCountAfter = await tableRows.count().catch(() => 0);
      console.log(`📊 Rows após Buscar: ${rowCountAfter}`);
    }

    // Report final
    console.log('\n═══ RELATÓRIO FINAL ═══');
    console.log(`🔴 Erros de rede: ${networkErrors.length}`);
    networkErrors.forEach(e => console.log(`   ${e}`));
    console.log(`🔴 Erros de console: ${consoleErrors.length}`);
    consoleErrors.filter(e => e.includes('timeout') || e.includes('Error') || e.includes('500'))
      .forEach(e => console.log(`   ${e.substring(0, 200)}`));
    console.log(`📊 Rows finais: ${rowCount}`);
    console.log(`📝 Logs relevantes:`);
    consoleLogs.filter(l => l.includes('✅') || l.includes('❌') || l.includes('📊') || l.includes('Busca'))
      .slice(-10)
      .forEach(l => console.log(`   ${l.substring(0, 200)}`));
  });
});
