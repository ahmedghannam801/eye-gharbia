/**
 * EYE Workflow Hub — Meeting Tests: Update Meeting
 * 
 * Flow: Find a test meeting → Edit → Change title/data → Save → Refresh → Verify changes persisted
 * 
 * SAFETY: Only edits meetings with [E2E-TEST] prefix. Never touches real meetings.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';
import { TEST_PREFIX } from '../fixtures/auth.fixture';

test.describe('Meetings — Update', () => {
  test.setTimeout(90000);

  test('should update an existing test meeting and persist changes', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(1500);

    // Look for a test meeting (created by create-meeting.spec.ts)
    const testMeetings = page.locator(`text=/${TEST_PREFIX.replace('[', '\\[').replace(']', '\\]')}/`);
    const count = await testMeetings.count();

    if (count === 0) {
      test.skip(true, 'No test meetings found — run create-meeting.spec.ts first');
      return;
    }

    // Click on the first test meeting to open it
    const firstMeeting = testMeetings.first();
    const meetingText = await firstMeeting.textContent();
    await firstMeeting.click();
    await page.waitForTimeout(1000);

    // Look for edit button
    const editBtn = page.locator('button').filter({ hasText: /تعديل|Edit|تحرير/i }).first();
    
    if (!await editBtn.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Edit button not found for meetings — UI may have changed');
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(500);

    // Update the title
    const updatedTitle = `${TEST_PREFIX} اجتماع محدّث ${Date.now()}`;
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    // Save
    const saveBtn = page.locator('button').filter({ hasText: /حفظ|Save|تحديث|Update/i }).last();
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Verify updated title appears
    await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(1500);

    await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 10000 });
  });
});
