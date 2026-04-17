import { test } from '@playwright/test';

test('clear Firebase cache from dre-raiz.vercel.app', async ({ page, context }) => {
  console.log('🧹 Acessando o site...');
  await page.goto('https://dre-raiz.vercel.app', { waitUntil: 'domcontentloaded', timeout: 20000 });

  console.log('🧹 Limpando localStorage...');
  await page.evaluate(() => localStorage.clear());

  console.log('🧹 Limpando sessionStorage...');
  await page.evaluate(() => sessionStorage.clear());

  console.log('🧹 Limpando IndexedDB (Firebase)...');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.deleteDatabase(db.name!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
          req.onblocked = () => resolve(); // continuar mesmo se bloqueado
        });
        console.log(`Deletado: ${db.name}`);
      }
    }
  });

  console.log('🧹 Limpando cookies...');
  await context.clearCookies();

  console.log('🔄 Recarregando...');
  await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  const hasError = await page.locator('[class*="red"]').isVisible().catch(() => false);
  const hasLoginBtn = await page.locator('button:has-text("Entrar com Google")').isVisible().catch(() => false);

  console.log('✅ Cache limpo!');
  console.log('Botão de login visível:', hasLoginBtn);
  console.log('Erro visível:', hasError);

  await page.screenshot({ path: 'tests/screenshots/after-clear.png', fullPage: true });
  console.log('📸 Screenshot salvo em tests/screenshots/after-clear.png');
});
