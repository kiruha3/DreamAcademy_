import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('loads for superadmin', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');

    await page.goto('/#/admin');
    await expect(page.locator('text=Панель суперадминистратора')).toBeVisible();
    await expect(page.locator('text=База пользователей')).toBeVisible();
    await expect(page.locator('input[placeholder="Поиск по email..."]')).toBeVisible();
  });
});
