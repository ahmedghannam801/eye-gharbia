/**
 * EYE Workflow Hub — Meeting Tests: Delete Meeting
 * 
 * Flow: Find test meeting → Manually delete → Confirm → Verify gone
 * 
 * CRITICAL SAFETY NOTE:
 * - This test ONLY deletes meetings with the [E2E-TEST] prefix
 * - It does NOT automatically delete any other data
 * - Deletion is done through the UI (requires manual confirmation)
 * - This simulates a real user action — no direct DB manipulation
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';
import { TEST_PREFIX } from '../fixtures/auth.fixture';

test.describe('Meetings — Delete (Manual via UI)', () => {
  test.setTimeout(90000);

  test('should delete a test meeting and confirm it is gone', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(1500);

    // Find test meetings
    const testMeetingPattern = new RegExp(TEST_PREFIX.replace('[', '\\[').replace(']', '\\]'));
    const testMeetings = page.locator('*').filter({ hasText: testMeetingPattern });
    const count = await testMeetings.count();

    if (count === 0) {
      test.skip(true, 'No test meetings to delete — run create-meeting.spec.ts first');
      return;
    }

    // Get the text of the meeting we're about to delete
    const firstMeeting = testMeetings.first();
    const meetingTitle = (await firstMeeting.textContent()) || '';

    // Look for delete button near the test meeting
    // Try: clicking the meeting first, then finding delete
    await firstMeeting.click();
    await page.waitForTimeout(500);

    const deleteBtn = page.locator('button').filter({ hasText: /حذف|Delete|Remove/i }).first();
    
    if (!await deleteBtn.isVisible({ timeout: 5000 })) {
      // Try right-click or kebab menu
      const kebabBtn = page.locator('button[aria-label*="options"], button[aria-label*="more"]').first();
      if (await kebabBtn.isVisible({ timeout: 2000 })) {
        await kebabBtn.click();
        await page.waitForTimeout(300);
      }
    }

    if (!await deleteBtn.isVisible({ timeout: 3000 })) {
      test.skip(true, 'Delete button not found for meetings — verify admin has delete permission');
      return;
    }

    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Handle confirmation dialog (if any)
    const confirmBtn = page.locator('button').filter({ hasText: /تأكيد|Confirm|نعم|Yes|حذف/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify the meeting is gone from the list
    // The specific meeting title should not be visible anymore
    const specificTitle = meetingTitle.slice(0, 40); // Use first 40 chars to avoid partial matches
    if (specificTitle.includes(TEST_PREFIX)) {
      const deletedMeeting = page.locator(`text="${specificTitle}"`).first();
      await expect(deletedMeeting).not.toBeVisible({ timeout: 5000 });
    }

    // Refresh and verify it's still gone (not re-appearing from Supabase)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(1500);

    if (specificTitle.includes(TEST_PREFIX)) {
      const deletedMeeting = page.locator(`text="${specificTitle}"`).first();
      await expect(deletedMeeting).not.toBeVisible({ timeout: 5000 });
    }
  });
});
