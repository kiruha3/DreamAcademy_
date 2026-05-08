import { test, expect, request as playwrightRequest } from '@playwright/test';

async function getAdminToken(request: any): Promise<string> {
  const loginRes = await request.post('/api/trpc/auth.login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ json: { email: 'admin@dreamdocs.ru', password: 'admin123' } })
  });
  const loginData = await loginRes.json();
  return loginData.result.data.json.token;
}

async function getOrCreateUser(request: any, adminToken: string, email: string, password: string): Promise<{ id: number; token: string }> {
  const loginRes = await request.post('/api/trpc/auth.login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ json: { email, password } })
  });
  const loginData = await loginRes.json();
  if (loginData.result?.data?.json?.token) {
    return {
      id: loginData.result.data.json.user.id,
      token: loginData.result.data.json.token
    };
  }

  const createRes = await request.post('/api/trpc/admin.user.create', {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    data: JSON.stringify({ json: { name: 'Test User', email, password, role: 'employee' } })
  });
  const createData = await createRes.json();

  const newLoginRes = await request.post('/api/trpc/auth.login', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ json: { email, password } })
  });
  const newLoginData = await newLoginRes.json();
  return {
    id: createData.result.data.json.id,
    token: newLoginData.result.data.json.token
  };
}

test.describe('Phase 3 — Learning Completion', () => {
  test('test beforeunload warning during active attempt', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/#/');

    await page.goto('/#/assessment/1');
    await page.waitForSelector('button:has-text("Начать тест")');
    await page.click('button:has-text("Начать тест")');
    await page.waitForTimeout(500);

    const dialogPromise = page.waitForEvent('dialog');
    await page.close({ runBeforeUnload: true });
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe('beforeunload');
  });

  test('user sees only enrolled programs', async ({ browser }) => {
    const adminRequest = await playwrightRequest.newContext();
    const adminToken = await getAdminToken(adminRequest);

    const email = `enrolltest-${Date.now()}@example.com`;
    const { id: userId } = await getOrCreateUser(adminRequest, adminToken, email, 'testpass123');

    // Re-login admin to restore admin cookie (getOrCreateUser overwrote it)
    await adminRequest.post('/api/trpc/auth.login', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ json: { email: 'admin@dreamdocs.ru', password: 'admin123' } })
    });

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.goto('/#/login');
    await userPage.fill('input[type="email"]', email);
    await userPage.fill('input[type="password"]', 'testpass123');
    await userPage.click('button[type="submit"]');
    await userPage.waitForURL('http://localhost:3000/#/');

    await userPage.goto('/#/courses');
    await expect(userPage.locator('text=Нет доступных программ')).toBeVisible();

    const assignRes = await adminRequest.post('/api/trpc/admin.user.assignProgram', {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      data: JSON.stringify({ json: { userId, programId: 1 } })
    });
    expect(assignRes.status()).toBe(200);

    await userPage.reload();
    await userPage.goto('/#/courses');
    await expect(userPage.getByRole('heading', { name: 'Основы DreamDocs' }).first()).toBeVisible();

    await userContext.close();
  });

  test('modules are not locked by default for new user', async ({ browser }) => {
    const adminRequest = await playwrightRequest.newContext();
    const adminToken = await getAdminToken(adminRequest);

    const { id: userId } = await getOrCreateUser(adminRequest, adminToken, 'notlocked@example.com', 'testpass123');
    await adminRequest.post('/api/trpc/admin.user.assignProgram', {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      data: JSON.stringify({ json: { userId, programId: 1 } })
    });

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.goto('/#/login');
    await userPage.fill('input[type="email"]', 'notlocked@example.com');
    await userPage.fill('input[type="password"]', 'testpass123');
    await userPage.click('button[type="submit"]');
    await userPage.waitForURL('http://localhost:3000/#/');

    await userPage.goto('/#/course/dreamdocs-basics');
    await expect(userPage.locator('h1')).toContainText('Основы DreamDocs');

    // All modules should have active "Начать" buttons (not locked by default)
    await expect(userPage.getByText('Основные функции', { exact: true })).toBeVisible();
    const module2Row = userPage.locator('[data-testid="module-row"]', {
      hasText: 'Основные функции'
    });
    await expect(module2Row.locator('button')).toContainText('Начать');

    await expect(userPage.getByText('Введение', { exact: true })).toBeVisible();
    const module1Row = userPage.locator('[data-testid="module-row"]', {
      hasText: 'Введение'
    }).first();
    await expect(module1Row.locator('button')).toContainText('Начать');

    await userContext.close();
  });
});
