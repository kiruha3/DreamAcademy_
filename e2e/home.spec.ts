import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads for guest', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('text=DreamDocs Academy')).toBeVisible();
    await expect(page.locator('text=Доступные программы')).toBeVisible();
  });

  test('loads for authenticated user', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');

    await expect(page.locator('text=Мои программы обучения')).toBeVisible();
    await expect(page.locator('text=Основы DreamDocs')).toBeVisible();
  });
});
