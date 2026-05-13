import { test, expect } from '@playwright/test';

test('debug cover upload', async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleLogs: string[] = [];
  const responses: any[] = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    else consoleLogs.push(text);
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('response', async (response) => {
    if (response.status() >= 400) {
      responses.push({
        url: response.url(),
        status: response.status(),
        body: await response.text().catch(() => ''),
      });
    }
  });

  // Login
  await page.goto('/#/login');
  await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');

  // Go to program builder
  await page.goto('/#/admin/programs/1');
  await page.waitForSelector('text=Информация о программе');

  // Upload
  const fileInput = page.locator('input[type="file"][accept*="image"]');
  await fileInput.setInputFiles('test-content/test-cover.png');
  await page.waitForTimeout(5000);

  console.log('Error responses:', JSON.stringify(responses, null, 2));
  console.log('Console errors:', consoleErrors);

  await page.screenshot({ path: 'screenshots/cover-upload-debug.png', fullPage: true });
});
