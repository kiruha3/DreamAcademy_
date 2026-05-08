import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('h1')).toContainText('DreamDocs Academy');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Войти');
  });

  test('login with valid credentials redirects to home', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    // Wait for navigation
    await page.waitForURL('http://localhost:3000/#/');
    // Check localStorage has token
    const token = await page.evaluate(() => localStorage.getItem('dreamdocs_auth'));
    expect(token).toBeTruthy();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Неверный email или пароль')).toBeVisible();
  });

  test('accept invitation page loads', async ({ page }) => {
    await page.goto('/#/accept-invitation?token=test123');
    await expect(page.locator('h1')).toContainText('Активация аккаунта');
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirm')).toBeVisible();
  });
});
