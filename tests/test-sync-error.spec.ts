import { test, expect } from '@playwright/test';

test.describe('Diagnóstico de Erro de Sincronização', () => {
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capturar erros do console
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log('❌ CONSOLE ERROR:', text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log('⚠️ CONSOLE WARNING:', text);
      } else if (text.includes('❌') || text.includes('Error') || text.includes('Failed')) {
        console.log('🔍 LOG:', text);
      }
    });

    // Capturar erros de página
    page.on('pageerror', error => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
      console.log('❌ PAGE ERROR:', error.message);
      console.log('Stack:', error.stack);
    });

    // Capturar falhas de requisição
    page.on('requestfailed', request => {
      const failure = request.failure();
      const errorText = `${request.url()} - ${failure?.errorText || 'Unknown error'}`;
      networkErrors.push(errorText);
      console.log('🌐 REQUEST FAILED:', errorText);
    });

    // Capturar respostas com erro
    page.on('response', response => {
      if (response.status() >= 400) {
        const errorText = `${response.status()} ${response.url()}`;
        networkErrors.push(errorText);
        console.log('🌐 HTTP ERROR:', errorText);
      }
    });
  });

  test('1. Acessar localhost e verificar carregamento', async ({ page }) => {
    console.log('\n📊 === TESTE 1: Carregamento Inicial ===\n');

    // Navegar para a aplicação
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });

    // Aguardar um pouco para JS executar
    await page.waitForTimeout(3000);

    // Fazer screenshot
    await page.screenshot({ path: 'screenshot-inicial.png', fullPage: true });
    console.log('📸 Screenshot salvo: screenshot-inicial.png');

    // Verificar se há elementos na página
    const bodyText = await page.textContent('body');
    console.log('\n📄 Texto na página:', bodyText?.substring(0, 200) + '...');

    // Verificar se aparece tela branca
    const hasContent = await page.locator('div#root > *').count();
    console.log(`\n🎨 Elementos dentro de #root: ${hasContent}`);

    if (hasContent === 0) {
      console.log('⚠️ TELA BRANCA DETECTADA! #root está vazio.');
    }

    // Tentar encontrar mensagens de erro visíveis
    const errorMessages = await page.locator('text=/error|erro|failed|falhou/i').all();
    if (errorMessages.length > 0) {
      console.log(`\n🚨 ${errorMessages.length} mensagens de erro visíveis na tela`);
      for (const msg of errorMessages) {
        const text = await msg.textContent();
        console.log('   -', text);
      }
    }
  });

  test('2. Verificar autenticação e estado do app', async ({ page }) => {
    console.log('\n🔐 === TESTE 2: Estado da Aplicação ===\n');

    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verificar se há tela de login
    const hasLoginButton = await page.locator('button:has-text("Entrar"), button:has-text("Login")').count();
    console.log(`🔐 Botão de login encontrado: ${hasLoginButton > 0 ? 'SIM' : 'NÃO'}`);

    // Verificar se há menu de navegação (indicando que está logado)
    const hasNavigation = await page.locator('nav, [role="navigation"]').count();
    console.log(`🧭 Menu de navegação encontrado: ${hasNavigation > 0 ? 'SIM' : 'NÃO'}`);

    // Verificar se há guias (Lançamentos, DRE, Admin, etc)
    const tabs = await page.locator('button, a').filter({ hasText: /Lançamentos|DRE|Admin|Análise/i }).all();
    console.log(`📑 Guias encontradas: ${tabs.length}`);
    for (const tab of tabs) {
      const text = await tab.textContent();
      console.log('   -', text?.trim());
    }
  });

  test('3. Tentar acessar guia DRE Gerencial', async ({ page }) => {
    console.log('\n📊 === TESTE 3: DRE Gerencial ===\n');

    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Procurar botão/link da DRE
    const dreButton = page.locator('button, a').filter({ hasText: /DRE|Demonstrativo/i }).first();
    const dreExists = await dreButton.count() > 0;

    if (dreExists) {
      console.log('✅ Botão DRE encontrado, clicando...');
      await dreButton.click();
      await page.waitForTimeout(2000);

      // Screenshot da DRE
      await page.screenshot({ path: 'screenshot-dre.png', fullPage: true });
      console.log('📸 Screenshot salvo: screenshot-dre.png');

      // Verificar se carregou
      const dreContent = await page.locator('text=/Receita|Custos|Despesas/i').count();
      console.log(`📊 Conteúdo da DRE carregado: ${dreContent > 0 ? 'SIM' : 'NÃO'}`);
    } else {
      console.log('❌ Botão DRE não encontrado');
    }
  });

  test('4. Tentar acessar AdminPanel → Estrutura DRE', async ({ page }) => {
    console.log('\n⚙️ === TESTE 4: AdminPanel ===\n');

    await page.goto('http://localhost:5176', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Procurar botão Admin
    const adminButton = page.locator('button, a').filter({ hasText: /Admin|Configurações/i }).first();
    const adminExists = await adminButton.count() > 0;

    if (adminExists) {
      console.log('✅ Botão Admin encontrado, clicando...');
      await adminButton.click();
      await page.waitForTimeout(2000);

      // Procurar aba "Estrutura DRE"
      const dreStructureTab = page.locator('button, a').filter({ hasText: /Estrutura DRE/i }).first();
      const tabExists = await dreStructureTab.count() > 0;

      if (tabExists) {
        console.log('✅ Aba "Estrutura DRE" encontrada, clicando...');
        await dreStructureTab.click();
        await page.waitForTimeout(2000);

        // Screenshot
        await page.screenshot({ path: 'screenshot-admin-dre.png', fullPage: true });
        console.log('📸 Screenshot salvo: screenshot-admin-dre.png');

        // Verificar se carregou a hierarquia
        const hierarchyContent = await page.locator('text=/RECEITA|CUSTOS|RATEIO CSC/i').count();
        console.log(`📊 Hierarquia DRE carregada: ${hierarchyContent > 0 ? 'SIM' : 'NÃO'}`);
      } else {
        console.log('❌ Aba "Estrutura DRE" não encontrada');
      }
    } else {
      console.log('❌ Botão Admin não encontrado');
    }
  });

  test.afterEach(async () => {
    // Resumo dos erros
    console.log('\n\n📋 === RESUMO DE ERROS ===\n');

    if (consoleErrors.length > 0) {
      console.log(`❌ ${consoleErrors.length} erros de console:`);
      consoleErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    } else {
      console.log('✅ Nenhum erro de console');
    }

    if (networkErrors.length > 0) {
      console.log(`\n🌐 ${networkErrors.length} erros de rede:`);
      networkErrors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    } else {
      console.log('\n✅ Nenhum erro de rede');
    }

    if (consoleWarnings.length > 0) {
      console.log(`\n⚠️ ${consoleWarnings.length} warnings:`);
      consoleWarnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }

    // Limpar arrays para próximo teste
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];
  });
});
