import { test, expect } from '@playwright/test';

test.describe('HTML Content Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');
  });

  test('new HTML module renders correctly', async ({ page }) => {
    await page.goto('/#/module/3');
    await page.waitForSelector('h1');
    await expect(page.locator('h1')).toContainText('HTML-урок: Введение');

    // Wait for iframe to load
    await page.waitForSelector('iframe');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/06_html_module.png', fullPage: true });

    // Verify action button exists (either "Завершить модуль" or "Пройдено")
    await expect(page.locator('button', { hasText: /Завершить модуль|Следующий модуль|К программе/ })).toBeVisible();
  });

  test('HTML content inside iframe is visible', async ({ page }) => {
    await page.goto('/#/module/3');
    await page.waitForSelector('iframe');

    // Get iframe content
    const iframe = page.locator('iframe').contentFrame();
    await expect(iframe.locator('h1')).toContainText('Добро пожаловать в DreamDocs!');
    await expect(iframe.locator('text=Урок 1 из 5')).toBeVisible();
    await expect(iframe.locator('text=Что такое DreamDocs')).toBeVisible();
  });
});
