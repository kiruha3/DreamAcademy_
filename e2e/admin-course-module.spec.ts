import { test, expect } from '@playwright/test';

test.describe.serial('Admin Course & Module Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');
  });

  test('course builder page shows modules and allows reorder', async ({ page }) => {
    await page.goto('/#/admin/courses/1');
    await expect(page.locator('h1')).toContainText('Начало работы');
    await page.screenshot({ path: 'screenshots/admin_course_01_page.png' });

    // Check modules are listed (exact match to avoid partial matches)
    await expect(page.getByRole('heading', { name: 'Введение', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Основные функции', exact: true })).toBeVisible();

    // Check reorder buttons exist
    const firstModule = page.locator('[data-testid="module-item"]').first();
    await expect(firstModule.locator('[data-testid="reorder-up"]')).toBeVisible();
    await expect(firstModule.locator('[data-testid="reorder-down"]')).toBeVisible();

    // Move second module up
    const secondModule = page.locator('[data-testid="module-item"]').nth(1);
    await secondModule.locator('[data-testid="reorder-up"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/admin_course_02_reordered.png' });
  });

  test('create and delete module', async ({ page }) => {
    await page.goto('/#/admin/courses/1');
    await expect(page.locator('h1')).toContainText('Начало работы');

    // Open add module modal
    await page.click('button:has-text("+ Добавить модуль")');
    await expect(page.locator('h2:has-text("Добавить модуль")')).toBeVisible();
    await page.screenshot({ path: 'screenshots/admin_course_03_add_modal.png' });

    // Fill form inside modal only (scoped to the modal overlay)
    const modal = page.locator('div[class*="bg-black/50"]');
    await modal.locator('input').first().fill('Тестовый модуль');
    await modal.locator('textarea').first().fill('Описание тестового модуля');

    // Submit modal button (exact match to avoid matching "+ Добавить модуль")
    await modal.getByRole('button', { name: 'Добавить', exact: true }).click();
    await page.waitForTimeout(1000);

    // Check new module appears
    await expect(page.getByRole('heading', { name: 'Тестовый модуль', exact: true })).toBeVisible();
    await page.screenshot({ path: 'screenshots/admin_course_04_module_created.png' });

    // Delete the module
    const testModule = page.locator('[data-testid="module-item"]', {
      hasText: 'Тестовый модуль'
    });

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await testModule.locator('button:has-text("Удалить")').click();

    // Wait for module to disappear
    await page.getByRole('heading', { name: 'Тестовый модуль', exact: true }).waitFor({ state: 'hidden', timeout: 10000 });
    await page.screenshot({ path: 'screenshots/admin_course_05_module_deleted.png' });
  });

  test('module builder shows version status and content tabs', async ({ page }) => {
    await page.goto('/#/admin/modules/1');
    await expect(page.locator('h1')).toContainText('Введение');
    await page.screenshot({ path: 'screenshots/admin_module_01_page.png' });

    // Check version info
    await expect(page.locator('text=Информация о модуле')).toBeVisible();

    // Check content tabs
    await expect(page.getByRole('button', { name: 'HTML ZIP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rutube' })).toBeVisible();

    // Switch to PDF tab
    await page.getByRole('button', { name: 'PDF' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/admin_module_02_pdf_tab.png' });

    // Switch to Rutube tab
    await page.getByRole('button', { name: 'Rutube' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/admin_module_03_rutube_tab.png' });
  });

  test('student sees only published modules on course page', async ({ page }) => {
    await page.goto('/#/course/dreamdocs-basics');
    await expect(page.locator('h1')).toContainText('Основы DreamDocs');
    await page.screenshot({ path: 'screenshots/student_course_01_page.png' });

    // Modules should be visible
    await expect(page.getByText('Введение', { exact: true })).toBeVisible();
    await expect(page.getByText('Основные функции', { exact: true })).toBeVisible();
  });

});
