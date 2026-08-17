/**
 * EYE Workflow Hub — Meeting Tests: Create Meeting (End-to-End)
 * 
 * Full E2E flow:
 * Admin Login → Navigate to Meetings → Create Meeting → Fill Form →
 * Save → Verify success → Verify meeting appears in list →
 * Refresh → Verify still exists → Logout → Login again → Verify still exists
 * 
 * SAFETY: Only creates meetings with [E2E-TEST] prefix in the title.
 * Does NOT delete anything automatically.
 */

import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';
import { createMeetingData } from '../fixtures/data.fixture';

test.describe('Meetings — Create (E2E)', () => {
  test.setTimeout(90000);

  // ── Full E2E: Create → Persist → Re-login → Verify ───────────────────
  test('admin can create a meeting and it persists across sessions', async ({ page }) => {
    const meetingData = createMeetingData();
    let createdMeetingTitle = meetingData.title;

    await test.step('Login as admin', async () => {
      await loginAs(page, 'admin');
    });

    await test.step('Navigate to Meetings view', async () => {
      await navigateTo(page, 'meetings');
      // Wait for meetings view to load
      await page.waitForTimeout(1500);
    });

    await test.step('Click create/add meeting button', async () => {
      // Look for "add meeting" or "إضافة اجتماع" button
      const addBtn = page.locator('button').filter({ 
        hasText: /إضافة|جديد|Create|Add|New|اجتماع جديد/i 
      }).first();
      
      await expect(addBtn).toBeVisible({ timeout: 8000 });
      await addBtn.click();
      await page.waitForTimeout(500);
    });

    await test.step('Fill meeting title', async () => {
      const titleInput = page.locator('input[type="text"]').first();
      await expect(titleInput).toBeVisible({ timeout: 8000 });
      await titleInput.fill(meetingData.title);
    });

    await test.step('Fill meeting description (if available)', async () => {
      try {
        const descInput = page.locator('textarea').first();
        if (await descInput.isVisible({ timeout: 2000 })) {
          await descInput.fill(meetingData.description);
        }
      } catch { /* description field might not exist */ }
    });

    await test.step('Set meeting date/time', async () => {
      // Try datetime-local input
      const datetimeInput = page.locator('input[type="datetime-local"]').first();
      if (await datetimeInput.isVisible({ timeout: 2000 })) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        const datetimeLocal = tomorrow.toISOString().slice(0, 16);
        await datetimeInput.fill(datetimeLocal);
      } else {
        // Try separate date + time inputs
        try {
          const dateInput = page.locator('input[type="date"]').first();
          if (await dateInput.isVisible({ timeout: 1000 })) {
            await dateInput.fill(meetingData.date);
          }
          const timeInput = page.locator('input[type="time"]').first();
          if (await timeInput.isVisible({ timeout: 1000 })) {
            await timeInput.fill(meetingData.time);
          }
        } catch { /* skip date if not required */ }
      }
    });

    await test.step('Save the meeting', async () => {
      const saveBtn = page.locator('button').filter({ 
        hasText: /حفظ|إنشاء|Submit|Save|إضافة/i 
      }).last();
      await saveBtn.click();
      await page.waitForTimeout(2000);
    });

    await test.step('Verify meeting appears in the list', async () => {
      // The meeting title should appear somewhere on the page
      const meetingInList = page.locator('text=' + meetingData.title).first();
      await expect(meetingInList).toBeVisible({ timeout: 10000 });
    });

    await test.step('Refresh page and verify meeting still exists', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Navigate back to meetings
      await navigateTo(page, 'meetings');
      await page.waitForTimeout(1500);

      const meetingInList = page.locator('text=' + meetingData.title).first();
      await expect(meetingInList).toBeVisible({ timeout: 10000 });
    });

    await test.step('Logout and re-login', async () => {
      await logout(page);
      await loginAs(page, 'admin');
    });

    await test.step('Verify meeting still exists after re-login', async () => {
      await navigateTo(page, 'meetings');
      await page.waitForTimeout(2000);

      const meetingInList = page.locator('text=' + meetingData.title).first();
      await expect(meetingInList).toBeVisible({ timeout: 10000 });
    });
  });

  // ── Verify meeting type is visible ───────────────────────────────────
  test('meetings view shows meeting cards/list', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(1500);

    // The meetings view should render without errors
    // (even if empty, it should show the page structure)
    const mainContent = page.locator('#eye-workspace-root main, main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    
    // No crash / error page
    const errorPage = page.locator('text=/500|حدث خطأ|Something went wrong/i');
    await expect(errorPage).not.toBeVisible({ timeout: 3000 });
  });
});
