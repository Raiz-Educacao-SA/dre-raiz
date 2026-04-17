import { test } from '@playwright/test';

test('diagnose login after cache clear', async ({ page, context }) => {
  const logs: string[] = [];
  const networkErrors: { status: number; url: string; body?: string }[] = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // Capturar respostas HTTP do Supabase com body
  page.on('response', async response => {
    if (response.url().includes('supabase')) {
      const status = response.status();
      const url = response.url().replace(/https:\/\/[^/]+/, '[supabase]');
      if (!response.ok()) {
        let body = '';
        try { body = await response.text(); } catch {}
        networkErrors.push({ status, url, body });
      }
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('supabase')) {
      logs.push(`[network-fail] ${request.url()} — ${request.failure()?.errorText}`);
    }
  });

  console.log('\n=== Carregando página ===');
  await page.goto('https://dre-raiz.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('\n=== Erros de rede Supabase ===');
  if (networkErrors.length === 0) {
    console.log('Nenhum erro de rede');
  } else {
    networkErrors.forEach(e => {
      console.log(`HTTP ${e.status} → ${e.url}`);
      console.log(`  Body: ${e.body}`);
    });
  }

  console.log('\n=== Logs de console (erros/avisos) ===');
  const relevant = logs.filter(l =>
    l.includes('❌') || l.includes('⚠️') || l.includes('🔐') || l.includes('✅') ||
    l.includes('Erro') || l.includes('error') || l.includes('400') || l.includes('fail') ||
    l.includes('firebase') || l.includes('supabase') || l.includes('OIDC') || l.includes('auth')
  );
  if (relevant.length === 0) {
    console.log('Nenhum log relevante');
    logs.slice(0, 10).forEach(l => console.log(l));
  } else {
    relevant.forEach(l => console.log(l));
  }

  // Verificar estado da tela
  const hasError = await page.locator('[class*="red"]').first().isVisible().catch(() => false);
  const errorText = hasError
    ? await page.locator('[class*="red"]').first().textContent().catch(() => '')
    : '';
  const hasLoginBtn = await page.locator('button:has-text("Entrar com Google")').isVisible().catch(() => false);

  console.log('\n=== Estado da tela ===');
  console.log('Botão de login:', hasLoginBtn);
  console.log('Erro visível:', hasError, errorText ? `→ "${errorText}"` : '');

  await page.screenshot({ path: 'tests/screenshots/diagnose-fresh.png', fullPage: true });
  console.log('📸 Screenshot salvo');
});
