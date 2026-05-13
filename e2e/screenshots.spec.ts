import { test } from '@playwright/test';

test.describe('Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');
  });

  test('screenshot courses page', async ({ page }) => {
    await page.goto('/#/courses');
    await page.waitForSelector('h1');
    await page.screenshot({ path: 'screenshots/01_courses.png', fullPage: true });
  });

  test('screenshot course detail', async ({ page }) => {
    await page.goto('/#/course/dreamdocs-basics');
    await page.waitForSelector('h1');
    await page.screenshot({ path: 'screenshots/02_course_detail.png', fullPage: true });
  });

  test('screenshot module page', async ({ page }) => {
    await page.goto('/#/module/1');
    await page.waitForSelector('iframe');
    await page.screenshot({ path: 'screenshots/03_module.png', fullPage: true });
  });

  test('screenshot assessment page', async ({ page }) => {
    await page.goto('/#/assessment/1');
    await page.waitForSelector('h1');
    await page.screenshot({ path: 'screenshots/04_assessment.png', fullPage: true });
  });

  test('screenshot profile', async ({ page }) => {
    await page.goto('/#/profile');
    await page.waitForSelector('h1');
    await page.screenshot({ path: 'screenshots/05_profile.png', fullPage: true });
  });
});
