import { test, expect } from '@playwright/test';

const DIR = 'screenshots/manual-test';

test('02: admin creates and publishes assessment', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('/#/login');
  await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');

  // Course builder
  await page.goto('/#/admin/courses/1');
  await page.waitForSelector('text=Начало работы');
  await page.screenshot({ path: `${DIR}/07_admin_course_builder.png`, fullPage: true });

  // Add assessment
  await page.click('text=+ Добавить тест');
  await page.waitForSelector('text=Добавить тест');
  const modal = page.locator('div[class*="bg-black/50"]').last();
  await modal.locator('input').first().fill('Ручной тест проверки');
  await modal.locator('textarea').first().fill('Тест создан вручную через браузер');
  await modal.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.waitForURL(/.*\/admin\/assessments\/\d+/);
  await page.screenshot({ path: `${DIR}/08_assessment_builder.png`, fullPage: true });

  // Add question
  await page.click('text=+ Добавить вопрос');
  await page.waitForSelector('text=Добавить вопрос');
  const qModal = page.locator('div[class*="bg-black/50"]').last();
  await qModal.locator('textarea').first().fill('Какой цвет у неба?');
  await qModal.locator('input[placeholder*="Вариант 1"]').fill('Синий');
  await qModal.locator('input[placeholder*="Вариант 2"]').fill('Зелёный');
  await qModal.locator('input[type="checkbox"]').first().check();
  await qModal.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.waitForSelector('text=Какой цвет у неба?');
  await page.screenshot({ path: `${DIR}/09_question_added.png`, fullPage: true });

  // Publish
  await page.click('text=Опубликовать');
  await page.waitForSelector('text=Опубликовано');
  await page.screenshot({ path: `${DIR}/10_assessment_published.png`, fullPage: true });

  // Module-level assessment
  await page.goto('/#/admin/modules/1');
  await page.waitForSelector('text=Введение');
  await page.screenshot({ path: `${DIR}/11_module_builder.png`, fullPage: true });

  await page.click('text=+ Добавить тест');
  await page.waitForSelector('text=Добавить тест');
  const mModal = page.locator('div[class*="bg-black/50"]').last();
  await mModal.locator('input').first().fill('Мини-тест модуля');
  await mModal.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.waitForURL(/.*\/admin\/assessments\/\d+/);
  await page.screenshot({ path: `${DIR}/12_module_assessment_created.png`, fullPage: true });
});
