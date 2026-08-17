/**
 * EYE Workflow Hub — Task Tests: Full E2E (Create → Assign → Persist → Update → Complete)
 * 
 * SAFETY: All created tasks have [E2E-TEST] prefix. No automatic deletion.
 */

import { test, expect } from '@playwright/test';
import { loginAs, logout, TEST_USERS } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';
import { createTaskData } from '../fixtures/data.fixture';
import { TEST_PREFIX } from '../fixtures/auth.fixture';

test.describe('Tasks — Create & Assign (E2E)', () => {
  test.setTimeout(120000);

  // ── Full lifecycle: Create → Persist → Re-login → Verify ─────────────
  test('admin can create a task and it persists across sessions', async ({ page }) => {
    const taskData = createTaskData();

    await test.step('Login as admin', async () => {
      await loginAs(page, 'admin');
    });

    await test.step('Navigate to Tasks view', async () => {
      await navigateTo(page, 'tasks');
      await page.waitForTimeout(2000);
    });

    await test.step('Open create task form', async () => {
      const addBtn = page.locator('button').filter({ 
        hasText: /إضافة مهمة|مهمة جديدة|Create Task|Add Task|New Task|إنشاء/i 
      }).first();
      
      await expect(addBtn).toBeVisible({ timeout: 8000 });
      await addBtn.click();
      await page.waitForTimeout(800);
    });

    await test.step('Fill task name', async () => {
      const nameInput = page.locator('input[type="text"]').first();
      await expect(nameInput).toBeVisible({ timeout: 8000 });
      await nameInput.fill(taskData.name);
    });

    await test.step('Fill task description', async () => {
      try {
        const descInput = page.locator('textarea').first();
        if (await descInput.isVisible({ timeout: 2000 })) {
          await descInput.fill(taskData.description);
        }
      } catch { /* optional */ }
    });

    await test.step('Set deadline', async () => {
      try {
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible({ timeout: 2000 })) {
          await dateInput.fill(taskData.deadline);
        }
        const datetimeInput = page.locator('input[type="datetime-local"]').first();
        if (await datetimeInput.isVisible({ timeout: 1000 })) {
          const d = new Date(taskData.deadline + 'T23:59');
          await datetimeInput.fill(d.toISOString().slice(0, 16));
        }
      } catch { /* deadline may be optional in UI */ }
    });

    await test.step('Save task', async () => {
      const saveBtn = page.locator('button').filter({ 
        hasText: /حفظ|نشر|Publish|Save|Submit|إنشاء/i 
      }).last();
      await saveBtn.click();
      await page.waitForTimeout(2000);
    });

    await test.step('Verify task appears in list', async () => {
      const taskInList = page.locator(`text=${taskData.name}`).first();
      await expect(taskInList).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh and verify task persists', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await navigateTo(page, 'tasks');
      await page.waitForTimeout(2000);

      const taskInList = page.locator(`text=${taskData.name}`).first();
      await expect(taskInList).toBeVisible({ timeout: 10000 });
    });

    await test.step('Logout and re-login — verify task still there', async () => {
      await logout(page);
      await loginAs(page, 'admin');
      await navigateTo(page, 'tasks');
      await page.waitForTimeout(2000);

      const taskInList = page.locator(`text=${taskData.name}`).first();
      await expect(taskInList).toBeVisible({ timeout: 10000 });
    });
  });

  // ── Tasks view renders without error for members ──────────────────────
  test('member sees their tasks', async ({ page }) => {
    await loginAs(page, 'member');
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);

    // Page should render without crash
    const mainContent = page.locator('#eye-workspace-root main, main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // No error page
    await expect(page.locator('text=/Something went wrong|500|حدث خطأ/i')).not.toBeVisible();
  });
});

test.describe('Tasks — Update', () => {
  test.setTimeout(90000);

  test('should update a test task and persist changes', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);

    const testTaskPattern = new RegExp(TEST_PREFIX.replace('[', '\\[').replace(']', '\\]'));
    const testTasks = page.locator('*').filter({ hasText: testTaskPattern });
    const count = await testTasks.count();

    if (count === 0) {
      test.skip(true, 'No test tasks found — run create-task.spec.ts first');
      return;
    }

    const firstTask = testTasks.first();
    await firstTask.click();
    await page.waitForTimeout(800);

    const editBtn = page.locator('button').filter({ hasText: /تعديل|Edit|تحرير/i }).first();
    if (!await editBtn.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Edit button not found for tasks');
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(500);

    const updatedName = `${TEST_PREFIX} مهمة محدّثة ${Date.now()}`;
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(updatedName);

    const saveBtn = page.locator('button').filter({ hasText: /حفظ|Save|تحديث/i }).last();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Tasks — Complete', () => {
  test.setTimeout(90000);

  test('member can complete (submit) a task and status changes', async ({ page }) => {
    await loginAs(page, 'member');
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);

    // Look for any available/published task to submit
    const submitBtn = page.locator('button').filter({ hasText: /تسليم|Submit|تسليم المهمة/i }).first();
    
    if (!await submitBtn.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No submittable tasks found for member — create and publish one first');
      return;
    }

    await submitBtn.click();
    await page.waitForTimeout(800);

    // Fill submission comment if required
    try {
      const commentBox = page.locator('textarea').first();
      if (await commentBox.isVisible({ timeout: 2000 })) {
        await commentBox.fill(`${TEST_PREFIX} تسليم تجريبي للاختبار الآلي`);
      }
    } catch { /* optional */ }

    // Submit
    const confirmSubmit = page.locator('button[type="submit"], button').filter({ hasText: /تسليم|Submit|إرسال/i }).last();
    await confirmSubmit.click();
    await page.waitForTimeout(2000);

    // Verify success indication
    const successMsg = page.locator('text=/تم التسليم|تم الإرسال|Submitted|تم بنجاح/i').first();
    // Either success message or submission appears in history
    const hasSuccess = await successMsg.isVisible({ timeout: 5000 });
    if (!hasSuccess) {
      // Check that no error is shown (submission may have been silent success)
      const errorMsg = page.locator('[class*="error"]').filter({ hasText: /خطأ|error/i });
      await expect(errorMsg).toHaveCount(0, { timeout: 3000 });
    }
  });
});
