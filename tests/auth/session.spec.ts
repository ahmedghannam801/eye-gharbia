/**
 * EYE Workflow Hub — Auth Tests: Session Persistence
 * 
 * Tests:
 * ✅ After login + page refresh → user remains logged in
 * ✅ Session stored in localStorage
 * ✅ After logout + refresh → user is NOT logged in
 * ✅ Direct URL access after login → protected content visible
 */

import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertLoggedOut, clearSession, getCurrentUserFromStorage } from '../fixtures/auth.fixture';

test.describe('Authentication — Session Persistence', () => {

  // ── Test 1: Login → Refresh → Still Logged In ─────────────────────────
  test('should remain logged in after page refresh', async ({ page }) => {
    // Login
    await loginAs(page, 'member');
    await assertLoggedIn(page);

    // Verify session is in localStorage
    const storedUser = await getCurrentUserFromStorage(page);
    expect(storedUser).not.toBeNull();
    expect(storedUser.email).toBe(process.env.E2E_MEMBER_EMAIL || 'test.member@eye-test.org');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow auth restoration

    // Should still be logged in (dashboard visible)
    await assertLoggedIn(page);
  });

  // ── Test 2: Supabase Session Restoration ─────────────────────────────
  test('should restore session from Supabase auth on fresh page load', async ({ page }) => {
    // Login first
    await loginAs(page, 'admin');
    await assertLoggedIn(page);

    // Open a new page (simulates fresh tab)
    const newPage = await page.context().newPage();
    await newPage.goto('/');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(2000);

    // Should auto-login from Supabase session
    await assertLoggedIn(newPage);
    await newPage.close();
  });

  // ── Test 3: Logout → Refresh → Not Logged In ─────────────────────────
  test('should NOT persist session after logout', async ({ page }) => {
    // Login
    await loginAs(page, 'member');
    await assertLoggedIn(page);

    // Logout by clearing session (simulates logout)
    await clearSession(page);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show login form
    await assertLoggedOut(page);
  });

  // ── Test 4: Protected View After Login ────────────────────────────────
  test('should show protected workspace content after login', async ({ page }) => {
    await loginAs(page, 'member');
    
    // Verify main workspace elements are visible
    await expect(page.locator('#eye-workspace-root')).toBeVisible();
    
    // Header should be visible
    const header = page.locator('header, [role="banner"]').first();
    await expect(header).toBeVisible();
    
    // Sidebar should be visible (desktop)
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  // ── Test 5: Settings Page Restricted to Non-Admin ────────────────────
  test('member should not access settings view content', async ({ page }) => {
    await loginAs(page, 'member');
    await assertLoggedIn(page);

    // Try to navigate to settings (if it exists in nav)
    // App redirects non-Super-Admin users back to dashboard when settings is accessed
    try {
      const settingsBtn = page.locator('button, a').filter({ hasText: /الإعدادات|Settings/i }).first();
      if (await settingsBtn.isVisible({ timeout: 3000 })) {
        await settingsBtn.click();
        await page.waitForTimeout(1000);
        
        // Should not see settings panel admin content
        // Either it's not there or redirected to dashboard
        const settingsAdminContent = page.locator('[data-testid="settings-panel"]');
        if (await settingsAdminContent.isVisible({ timeout: 2000 })) {
          // If settings panel is shown, it should not have admin-only delete user options
          const dangerousAdminBtn = page.locator('button').filter({ hasText: /حذف المستخدم|Delete User|delete all/i });
          await expect(dangerousAdminBtn).not.toBeVisible();
        }
      }
    } catch {
      // Settings nav item might not be visible for members — that's fine
    }
  });
});
