/**
 * EYE Workflow Hub — Auth Tests: Logout
 * 
 * Tests:
 * ✅ Login → Logout → Login form is shown
 * ✅ After logout → accessing protected view shows login
 * ✅ Logout clears localStorage session
 */

import { test, expect } from '@playwright/test';
import { loginAs, logout, assertLoggedIn, assertLoggedOut, getCurrentUserFromStorage } from '../fixtures/auth.fixture';

test.describe('Authentication — Logout', () => {

  // ── Test 1: Successful Logout ─────────────────────────────────────────
  test('should logout and show login form', async ({ page }) => {
    await loginAs(page, 'member');
    await assertLoggedIn(page);

    // Click logout
    await logout(page);

    // Should be back to login screen
    await assertLoggedOut(page);
  });

  // ── Test 2: Logout Clears Session Storage ────────────────────────────
  test('should clear localStorage session on logout', async ({ page }) => {
    await loginAs(page, 'member');
    
    // Confirm session exists
    const before = await getCurrentUserFromStorage(page);
    expect(before).not.toBeNull();

    // Logout
    await logout(page);

    // Session should be cleared
    const after = await getCurrentUserFromStorage(page);
    expect(after).toBeNull();
  });

  // ── Test 3: After Logout → Protected Content Inaccessible ────────────
  test('should not show workspace after logout + refresh', async ({ page }) => {
    await loginAs(page, 'member');
    await assertLoggedIn(page);

    // Logout
    await logout(page);
    await assertLoggedOut(page);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should still show login form (not re-logged in)
    await assertLoggedOut(page);
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 5000 });
  });

  // ── Test 4: Admin Logout ──────────────────────────────────────────────
  test('admin should be able to logout successfully', async ({ page }) => {
    await loginAs(page, 'admin');
    await assertLoggedIn(page);
    await logout(page);
    await assertLoggedOut(page);
  });

  // ── Test 5: Re-Login After Logout ────────────────────────────────────
  test('should allow re-login after logout', async ({ page }) => {
    await loginAs(page, 'member');
    await logout(page);
    
    // Re-login
    await loginAs(page, 'member');
    await assertLoggedIn(page);
  });
});
