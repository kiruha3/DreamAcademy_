import { test, expect } from '@playwright/test';

test('admin uploads cover image for program', async ({ page }) => {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // 1. Login as admin
  await page.goto('/#/login');
  await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');

  // 2. Go to program builder
  await page.goto('/#/admin/programs/1');
  await page.waitForSelector('text=Информация о программе');

  // 3. Upload cover image
  const fileInput = page.locator('input[type="file"][accept*="image"]');
  await fileInput.setInputFiles('test-content/test-cover.png');

  // 4. Wait for preview to appear
  const previewImg = page.locator('img[alt="Cover"]');
  await expect(previewImg).toBeVisible({ timeout: 15000 });

  // 5. Screenshot
  await page.screenshot({ path: 'screenshots/cover-upload-success.png', fullPage: true });

  console.log('Console errors:', consoleErrors);
});
