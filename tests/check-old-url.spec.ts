import { test } from '@playwright/test';

test('check dre-raiz.vercel.app status', async ({ page }) => {
  const logs: string[] = [];
  const networkErrors: { status: number; url: string; body: string }[] = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  page.on('response', async response => {
    if (response.url().includes('supabase') && !response.ok()) {
      let body = '';
      try { body = await response.text(); } catch {}
      networkErrors.push({ status: response.status(), url: response.url(), body });
    }
  });

  await page.goto('https://dre-raiz.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const hasError = await page.locator('[class*="red"]').first().isVisible().catch(() => false);
  const errorText = hasError ? await page.locator('[class*="red"]').first().textContent().catch(() => '') : '';
  const hasLoginBtn = await page.locator('button:has-text("Entrar com Google")').isVisible().catch(() => false);

  console.log('=== dre-raiz.vercel.app ===');
  console.log('Botão de login:', hasLoginBtn);
  console.log('Erro na tela:', hasError, errorText ? `→ "${errorText}"` : '');

  if (networkErrors.length > 0) {
    console.log('\n=== Erros Supabase ===');
    networkErrors.forEach(e => console.log(`HTTP ${e.status}: ${e.body}`));
  }

  const relevant = logs.filter(l =>
    l.includes('❌') || l.includes('⚠️') || l.includes('✅') || l.includes('Erro') ||
    l.includes('OIDC') || l.includes('unauthorized') || l.includes('firebase')
  );
  if (relevant.length > 0) {
    console.log('\n=== Logs relevantes ===');
    relevant.forEach(l => console.log(l));
  }

  await page.screenshot({ path: 'tests/screenshots/old-url.png', fullPage: true });
  console.log('📸 Screenshot salvo');
});
