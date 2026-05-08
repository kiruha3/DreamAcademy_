import { test, expect } from '@playwright/test';

test.describe.serial('Admin Assessment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');
  });

  test('create assessment in course builder, add question, and publish', async ({ page }) => {
    await page.goto('/#/admin/courses/1');
    await expect(page.locator('h1')).toContainText('Начало работы');

    // Open add assessment modal
    await page.click('button:has-text("+ Добавить тест")');
    await expect(page.locator('h2:has-text("Добавить тест")')).toBeVisible();

    const modal = page.locator('div[class*="bg-black/50"]');
    await modal.locator('input').first().fill('Тестовый финальный тест');
    await modal.locator('textarea').first().fill('Описание теста');

    // Submit
    await modal.getByRole('button', { name: 'Добавить', exact: true }).click();

    // Should navigate to assessment builder
    await page.waitForURL(/.*\/admin\/assessments\/\d+/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Тестовый финальный тест');
    await page.screenshot({ path: 'screenshots/admin_assessment_01_builder.png' });

    // Add a question
    await page.click('button:has-text("+ Добавить вопрос")');
    const questionModal = page.locator('div[class*="bg-black/50"]');
    await questionModal.locator('textarea').first().fill('Какой ответ верный?');
    await questionModal.locator('input[placeholder*="Вариант 1"]').fill('Вариант А');
    await questionModal.locator('input[placeholder*="Вариант 2"]').fill('Вариант Б');

    // Mark first option as correct
    const checkboxes = questionModal.locator('input[type="checkbox"]');
    await checkboxes.first().check();

    await questionModal.getByRole('button', { name: 'Добавить', exact: true }).click();

    // Question should appear
    await expect(page.locator('text=Какой ответ верный?')).toBeVisible();
    await page.screenshot({ path: 'screenshots/admin_assessment_02_question_added.png' });

    // Publish assessment
    await page.click('button:has-text("Опубликовать")');
    await expect(page.locator('text=Опубликовано')).toBeVisible();
    await page.screenshot({ path: 'screenshots/admin_assessment_03_published.png' });
  });

  test('create module-level assessment', async ({ page }) => {
    await page.goto('/#/admin/modules/1');
    await expect(page.locator('h1')).toContainText('Введение');

    // Open add assessment modal
    await page.click('button:has-text("+ Добавить тест")');
    await expect(page.locator('h2:has-text("Добавить тест")')).toBeVisible();

    const modal = page.locator('div[class*="bg-black/50"]');
    await modal.locator('input').first().fill('Мини-тест по введению');

    // Submit
    await modal.getByRole('button', { name: 'Добавить', exact: true }).click();

    // Should navigate to assessment builder
    await page.waitForURL(/.*\/admin\/assessments\/\d+/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Мини-тест по введению');
    await page.screenshot({ path: 'screenshots/admin_assessment_04_module_test.png' });
  });
});
