import { test, expect } from '@playwright/test';

const DIR = 'screenshots/manual-test';

test('01: new user login and complete module', async ({ page, request }) => {
  test.setTimeout(120000);

  // Create user via API
  const loginRes = await request.post('/api/trpc/auth.login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ json: { email: 'admin@dreamdocs.ru', password: 'admin123' } })
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.result.data.json.token;

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

  // User login
  await page.goto('/#/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');
  await page.screenshot({ path: `${DIR}/01_user_home.png`, fullPage: true });

  // Courses page
  await page.goto('/#/courses');
  await page.waitForSelector('text=Курсы обучения');
  await page.screenshot({ path: `${DIR}/02_courses_list.png`, fullPage: true });

  // Course detail
  await page.click('text=Подробнее');
  await page.waitForURL('http://localhost:3000/#/course/dreamdocs-basics');
  await page.waitForSelector('text=Основы DreamDocs');
  await page.screenshot({ path: `${DIR}/03_course_detail.png`, fullPage: true });

  // Start first module
  await page.getByRole('button', { name: 'Начать' }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/04_module_page.png`, fullPage: true });

  // Complete module
  await page.click('text=Завершить');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/05_module_completed.png`, fullPage: true });

  // Back to course
  await page.goto('/#/course/dreamdocs-basics');
  await page.waitForSelector('text=Основы DreamDocs');
  await page.screenshot({ path: `${DIR}/06_course_after_completion.png`, fullPage: true });
});
