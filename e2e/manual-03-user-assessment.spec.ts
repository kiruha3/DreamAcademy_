import { test, expect } from '@playwright/test';

const DIR = 'screenshots/manual-test';

test('03: user takes the published assessment', async ({ page, request }) => {
  test.setTimeout(120000);

  // Create user and assign program
  const loginRes = await request.post('/api/trpc/auth.login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ json: { email: 'admin@dreamdocs.ru', password: 'admin123' } })
  });
  const adminToken = (await loginRes.json()).result.data.json.token;

  const ts = Date.now();
  const email = `manualtest${ts}@example.com`;
  const password = 'testpass123';

  const createRes = await request.post('/api/trpc/admin.user.create', {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    data: JSON.stringify({ json: { name: 'Test User', email, password, role: 'employee' } })
  });
  const userId = (await createRes.json()).result.data.json.id;

  await request.post('/api/trpc/admin.user.assignProgram', {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    data: JSON.stringify({ json: { userId, programId: 1 } })
  });

  // Login as user
  await page.goto('/#/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');

  // Go to course and take assessment directly (seed assessment id=1)
  await page.goto('/#/course/dreamdocs-basics');
  await page.waitForSelector('text=Основы DreamDocs');
  await page.screenshot({ path: `${DIR}/13_course_with_test.png`, fullPage: true });

  await page.goto('/#/assessment/1');
  await page.waitForSelector('text=Итоговый тест');
  await page.screenshot({ path: `${DIR}/14_assessment_start.png`, fullPage: true });

  await page.click('text=Начать тест');
  await page.waitForSelector('text=Вопрос', { timeout: 10000 });
  await page.screenshot({ path: `${DIR}/15_assessment_active.png`, fullPage: true });

  // Answer questions (seed test has 2 questions)
  const options = await page.locator('label').all();
  for (const opt of options.slice(0, 2)) {
    await opt.click().catch(() => {});
  }

  await page.click('text=Завершить тест');
  await page.waitForSelector('text=Результат', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${DIR}/16_assessment_result.png`, fullPage: true });
});
