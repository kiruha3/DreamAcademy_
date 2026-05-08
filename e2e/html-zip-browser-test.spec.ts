import { test, expect } from '@playwright/test';

test('browser visual test: admin uploads ZIP and student views it', async ({ page }) => {
  // 1. Login as admin
  await page.goto('/#/login');
  await page.fill('input[type="email"]', 'admin@dreamdocs.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/#/');
  await page.screenshot({ path: 'screenshots/01_login.png' });

  // 2. Go to admin module builder
  await page.goto('/#/admin/modules/1');
  await expect(page.locator('h1')).toContainText('Введение');
  await page.screenshot({ path: 'screenshots/02_admin_module_before_upload.png' });

  // 3. Upload ZIP file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-content/html-module.zip');

  // Wait for upload to complete
  await expect(page.locator('text=Загружено')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/03_admin_module_after_upload.png' });

  // 4. View as student
  await page.goto('/#/module/1');
  await expect(page.locator('h1')).toContainText('Введение');

  // Check iframe is present
  const iframe = page.locator('iframe[sandbox="allow-scripts"]');
  await expect(iframe).toBeVisible();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/04_student_module_with_iframe.png' });

  // 5. Check iframe content loaded
  const iframeElement = await iframe.elementHandle();
  if (iframeElement) {
    const iframeBox = await iframeElement.boundingBox();
    if (iframeBox) {
      await page.screenshot({
        path: 'screenshots/05_student_module_full.png',
        fullPage: true,
      });

      // Try to interact with iframe content
      const frame = await iframeElement.contentFrame();
      if (frame) {
        await frame.waitForLoadState('networkidle');

        // Check if the interactive quiz is present
        const quizButton = frame.locator('button.quiz-option').first();
        if (await quizButton.isVisible().catch(() => false)) {
          await quizButton.click();
          await frame.waitForTimeout(500);
        }
      }
    }
  }
});
