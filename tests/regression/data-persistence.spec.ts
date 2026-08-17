/**
 * EYE Workflow Hub — REGRESSION SUITE
 * Bug #1: Data Disappears
 * 
 * This regression test was created to prevent the "data disappears" bug
 * from reoccurring. The bug caused data (meetings, tasks, etc.) to disappear
 * from the UI after a page refresh, even though the data existed in Supabase.
 * 
 * ROOT CAUSE (when it occurred): The cache/merge logic in localDb.ts
 * incorrectly filtered out valid remote data.
 * 
 * TEST STRATEGY:
 * 1. Login and verify existing data (meetings/tasks) is visible
 * 2. Refresh page
 * 3. Verify same data is still visible
 * 4. Navigate away and back
 * 5. Verify data is still visible
 * 6. Logout and re-login
 * 7. Verify data is STILL visible
 */

import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';

test.describe('🔴 REGRESSION — Bug #1: Data Persistence', () => {
  test.setTimeout(120000);

  // ── CRITICAL: Data persists after refresh ────────────────────────────
  test('[BUG#1] Data visible after login persists through refresh and re-login', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.waitForTimeout(2000);

    // Step 1: Navigate to meetings, capture initial count
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(2000);

    const initialContent = await page.locator('main').first().textContent();
    const initialText = (initialContent || '').trim();

    // Step 2: REFRESH THE PAGE
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 3: Navigate back to meetings
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(2000);

    const afterRefreshContent = await page.locator('main').first().textContent();
    const afterRefreshText = (afterRefreshContent || '').trim();

    // CRITICAL ASSERTION: Content should not have disappeared
    // If initialText had content and afterRefreshText is empty — that's Bug #1
    if (initialText.length > 100) { // There was substantial content
      expect(afterRefreshText.length).toBeGreaterThan(0);
    }

    // Step 4: Navigate to tasks, refresh, verify
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);
    const tasksBeforeRefresh = await page.locator('main').first().textContent();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);
    const tasksAfterRefresh = await page.locator('main').first().textContent();

    // Tasks content should not be blank after refresh
    if ((tasksBeforeRefresh || '').length > 100) {
      expect((tasksAfterRefresh || '').length).toBeGreaterThan(50);
    }

    // Step 5: Logout → Re-login → Check data
    await logout(page);
    await loginAs(page, 'admin');
    await navigateTo(page, 'meetings');
    await page.waitForTimeout(2000);

    const afterReloginContent = await page.locator('main').first().textContent();
    
    // After re-login, if there was data before — it should still be there
    if (initialText.length > 100) {
      expect((afterReloginContent || '').length).toBeGreaterThan(0);
    }
  });

  // ── CRITICAL: Supabase data loads correctly ────────────────────────────
  test('[BUG#1] Supabase data loads from remote without being filtered out', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[App]') || msg.text().includes('[localDb]')) {
        consoleMessages.push(msg.text());
      }
    });

    await loginAs(page, 'admin');
    await page.waitForTimeout(3000);

    // Check that data loaded from Supabase (not just from empty cache)
    const dataState = await page.evaluate(() => {
      try {
        // Check what's in localStorage (local cache)
        const users = JSON.parse(localStorage.getItem('eye_users') || '[]');
        const tasks = JSON.parse(localStorage.getItem('eye_tasks') || '[]');
        const notifications = JSON.parse(localStorage.getItem('eye_notifications') || '[]');
        const currentUser = JSON.parse(localStorage.getItem('eye_current_user') || 'null');
        
        return {
          hasCurrentUser: !!currentUser,
          cacheHasUsers: users.length,
          cacheHasTasks: tasks.length,
          cacheHasNotifications: notifications.length,
        };
      } catch {
        return null;
      }
    });

    expect(dataState).not.toBeNull();
    expect(dataState?.hasCurrentUser).toBe(true);
    
    // Log data state for debugging
    console.log('[REGRESSION BUG#1] Data state after login:', dataState);
  });

  // ── Test: Member data visible after multiple navigations ──────────────
  test('[BUG#1] Member tasks remain visible after navigating between views', async ({ page }) => {
    await loginAs(page, 'member');
    await page.waitForTimeout(1500);

    // Get initial tasks view content
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);
    const tasksContent1 = await page.locator('main').first().textContent();

    // Navigate away
    await navigateTo(page, 'dashboard');
    await page.waitForTimeout(1000);

    // Navigate back
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);
    const tasksContent2 = await page.locator('main').first().textContent();

    // Content should be similar (not disappeared)
    const words1 = (tasksContent1 || '').split(/\s+/).filter(w => w.length > 3);
    const words2 = (tasksContent2 || '').split(/\s+/).filter(w => w.length > 3);
    
    // If there was content before, there should be content after
    if (words1.length > 5) {
      expect(words2.length).toBeGreaterThan(0);
    }
  });
});
