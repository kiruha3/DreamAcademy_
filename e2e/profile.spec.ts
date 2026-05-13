import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('loads with user info and stats', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');

    await page.goto('/#/profile');
    await expect(page.locator('text=Super Admin')).toBeVisible();
    await expect(page.locator('text=admin@dreamdocs.ru')).toBeVisible();
    await expect(page.getByTestId('stat-programs')).toBeVisible();
    await expect(page.getByTestId('stat-progress')).toBeVisible();
  });
});
