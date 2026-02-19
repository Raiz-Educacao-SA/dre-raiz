// Script Playwright para debugar loop de carregamento
const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Iniciando análise do loop com Playwright...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Contadores
  let fetchCount = 0;
  let useEffectAutoSelectCount = 0;
  let useEffectLoadingCount = 0;
  let setFilterOptionsCount = 0;
  let apiCallCount = 0;

  // Arrays para armazenar timestamps
  const fetchTimestamps = [];
  const apiTimestamps = [];

  // Monitorar logs do console
  page.on('console', msg => {
    const text = msg.text();
    const timestamp = new Date().toISOString();

    if (text.includes('🚀🚀🚀 fetchDREData() CHAMADO!')) {
      fetchCount++;
      fetchTimestamps.push(timestamp);
      console.log(`[${timestamp}] 📊 fetchDREData chamado (${fetchCount}x)`);
    }

    if (text.includes('[useEffect AUTO-SELECT] DISPARADO')) {
      useEffectAutoSelectCount++;
      console.log(`[${timestamp}] 🔄 useEffect AUTO-SELECT disparado (${useEffectAutoSelectCount}x)`);
    }

    if (text.includes('[useEffect LOADING] DISPARADO')) {
      useEffectLoadingCount++;
      console.log(`[${timestamp}] 🔄 useEffect LOADING disparado (${useEffectLoadingCount}x)`);
    }

    if (text.includes('setFilterOptions será chamado')) {
      setFilterOptionsCount++;
      console.log(`[${timestamp}] 📝 setFilterOptions chamado (${setFilterOptionsCount}x)`);
    }

    // Log de erros em vermelho
    if (msg.type() === 'error') {
      console.error(`[${timestamp}] ❌ ERRO:`, text);
    }
  });

  // Monitorar requests de rede (API calls ao Supabase)
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') && url.includes('rpc')) {
      apiCallCount++;
      const timestamp = new Date().toISOString();
      apiTimestamps.push(timestamp);
      console.log(`[${timestamp}] 🌐 API Call #${apiCallCount}: ${request.method()} ${url.split('?')[0]}`);
    }
  });

  // Abrir a página
  console.log('🌐 Navegando para http://localhost:5179...\n');
  await page.goto('http://localhost:5179', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Aguardar login se necessário
  console.log('⏳ Aguardando 3 segundos para possível tela de login...\n');
  await page.waitForTimeout(3000);

  // Clicar na guia DRE Gerencial se existir
  try {
    const dreButton = await page.locator('text=DRE Gerencial').first();
    if (await dreButton.isVisible()) {
      console.log('🖱️ Clicando em "DRE Gerencial"...\n');
      await dreButton.click();
    }
  } catch (e) {
    console.log('ℹ️ Já está na DRE Gerencial ou botão não encontrado\n');
  }

  // Monitorar por 15 segundos
  console.log('⏱️ Monitorando por 15 segundos...\n');
  console.log('═══════════════════════════════════════════════\n');

  await page.waitForTimeout(15000);

  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 RELATÓRIO FINAL:\n');
  console.log(`🚀 fetchDREData chamado: ${fetchCount}x`);
  console.log(`🔄 useEffect AUTO-SELECT disparado: ${useEffectAutoSelectCount}x`);
  console.log(`🔄 useEffect LOADING disparado: ${useEffectLoadingCount}x`);
  console.log(`📝 setFilterOptions chamado: ${setFilterOptionsCount}x`);
  console.log(`🌐 API Calls ao banco: ${apiCallCount}x`);

  // Análise de padrões
  console.log('\n📈 ANÁLISE DE PADRÕES:\n');

  if (fetchCount > 2) {
    console.log(`⚠️ LOOP DETECTADO! fetchDREData foi chamado ${fetchCount}x (esperado: 1-2x)`);

    // Calcular intervalo entre chamadas
    if (fetchTimestamps.length > 1) {
      const intervals = [];
      for (let i = 1; i < fetchTimestamps.length; i++) {
        const diff = new Date(fetchTimestamps[i]) - new Date(fetchTimestamps[i-1]);
        intervals.push(diff);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`⏱️ Intervalo médio entre chamadas: ${Math.round(avgInterval)}ms`);
    }
  } else {
    console.log('✅ Comportamento normal - sem loop detectado');
  }

  if (apiCallCount > 5) {
    console.log(`⚠️ Muitas chamadas ao banco! ${apiCallCount} requests em 15 segundos`);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('🔍 Pressione Ctrl+C para encerrar ou aguarde 5 segundos...');

  await page.waitForTimeout(5000);
  await browser.close();

  console.log('\n✅ Análise concluída!');
  process.exit(0);
})();
