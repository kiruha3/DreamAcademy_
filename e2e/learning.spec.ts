import { test, expect } from '@playwright/test';

test.describe('Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');
  });

  test('courses page shows available programs', async ({ page }) => {
    await page.goto('/#/courses');
    await expect(page.locator('h1')).toContainText('Доступные программы');
    await expect(page.getByRole('heading', { name: 'Основы DreamDocs' }).first()).toBeVisible();
  });

  test('course detail page shows modules', async ({ page }) => {
    await page.goto('/#/course/dreamdocs-basics');
    await expect(page.locator('h1')).toContainText('Основы DreamDocs');
    await expect(page.locator('text=Начало работы')).toBeVisible();
    await expect(page.getByText('Введение', { exact: true })).toBeVisible();
    await expect(page.locator('text=Основные функции')).toBeVisible();
  });

  test('module page shows content', async ({ page }) => {
    await page.goto('/#/module/1');
    await expect(page.locator('h1')).toContainText('Введение');
    await expect(page.locator('button', { hasText: 'Завершить модуль' })).toBeVisible();
  });

  test('complete module and see progress update', async ({ page }) => {
    await page.goto('/#/module/1');
    await expect(page.locator('button', { hasText: 'Завершить модуль' })).toBeVisible();
    await page.click('button:has-text("Завершить модуль")');
    // After completion, should show "✓ Пройдено" or "Следующий модуль"
    await expect(page.locator('text=Пройдено')).toBeVisible({ timeout: 5000 });
  });

  test('prev/next navigation between modules', async ({ page }) => {
    // Module 3 should have "← Предыдущий модуль" button
    await page.goto('/#/module/3');
    await expect(page.locator('h1')).toContainText('HTML-урок: Введение');
    await expect(page.locator('button', { hasText: 'Предыдущий модуль' })).toBeVisible();
  });

  test('assessment page loads', async ({ page }) => {
    await page.goto('/#/assessment/1');
    await expect(page.locator('h1')).toContainText('Итоговый тест');
    await expect(page.locator('button', { hasText: 'Начать тест' })).toBeVisible();
  });

  test('take assessment and see result', async ({ page }) => {
    await page.goto('/#/assessment/1');
    await page.waitForSelector('button:has-text("Начать тест")');
    await page.click('button:has-text("Начать тест")');
    await page.waitForTimeout(1000);

    // Wait for questions to appear
    await expect(page.locator('text=Вопрос 1')).toBeVisible({ timeout: 10000 });

    // Answer question 1 (single choice) — correct answer is "Платформа для работы с документами"
    await page.click('label:has-text("Платформа для работы с документами")');

    // Answer question 2 (multiple choice) — correct answers are "Создание документов" and "Совместное редактирование"
    await page.click('label:has-text("Создание документов")');
    await page.click('label:has-text("Совместное редактирование")');

    // Submit
    await page.click('button:has-text("Завершить тест")');

    // Wait for result screen
    await expect(page.locator('text=Тест пройден!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Результат:')).toBeVisible();
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/#/profile');
    await expect(page.locator('h1')).toContainText('Профиль');
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
  });

  test('admin uploads HTML ZIP and student views it', async ({ page }) => {
    // Go to admin module builder
    await page.goto('/#/admin/modules/1');
    await expect(page.locator('h1')).toContainText('Введение');

    // Ensure HTML ZIP tab is active
    await expect(page.getByRole('button', { name: 'HTML ZIP' })).toBeVisible();

    // Upload ZIP file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-content/html-module.zip');

    // Wait for upload to complete
    await expect(page.locator('text=Загружено')).toBeVisible({ timeout: 15000 });

    // Now view as student
    await page.goto('/#/module/1');
    await expect(page.locator('h1')).toContainText('Введение');

    // Check iframe is present and loaded
    const iframe = page.locator('iframe[sandbox="allow-scripts"]');
    await expect(iframe).toBeVisible();
  });
});
