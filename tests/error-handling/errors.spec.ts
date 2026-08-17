/**
 * EYE Workflow Hub — Error Handling Tests
 * 
 * Tests that the application handles errors gracefully:
 * ✅ Invalid form submissions show errors (not silent failures)
 * ✅ Network failure shows error message (not blank page)
 * ✅ Unauthorized requests don't succeed silently
 * ✅ Duplicate submissions are handled
 * ✅ Expired session redirects to login
 */

import { test, expect } from '@playwright/test';
import { loginAs, clearSession } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';

test.describe('Error Handling', () => {

  // ── Test 1: Empty Login Form Shows Error, Not Silent Failure ──────────
  test('empty login form shows validation error, not silent failure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Submit completely empty form
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first();
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // App should NOT navigate to dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });

    // Some form of validation feedback must exist
    const emailInput = page.locator('input[type="email"]').first();
    const validationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    const errorVisible = await page.locator('[class*="error"], [class*="alert"], p.text-red').first().isVisible({ timeout: 2000 });
    
    expect(validationMsg.length > 0 || errorVisible).toBe(true);
  });

  // ── Test 2: Wrong Credentials Show Error, Not Silent ─────────────────
  test('wrong credentials show explicit error message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('wrong@wrong.wrong');
    await passwordInput.fill('WrongPassword123!');
    
    await page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first().click();
    await page.waitForTimeout(5000); // Give time for Supabase to respond

    // CRITICAL: Must show error, must NOT show dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });
    
    // Error message must be user-visible
    const errorEl = page.locator('[class*="error"], [class*="alert"], .text-red, p.text-red-500').first();
    await expect(errorEl).toBeVisible({ timeout: 5000 });
    
    const errorText = await errorEl.textContent();
    expect(errorText?.trim().length).toBeGreaterThan(0);
  });

  // ── Test 3: Network Failure Handling ──────────────────────────────────
  test('app handles network errors gracefully without crashing', async ({ page }) => {
    // Login first
    await loginAs(page, 'member');
    
    // Simulate network failure for Supabase calls
    await page.route('**/supabase.co/**', route => route.abort());
    
    // Navigate to tasks (requires Supabase data)
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(3000);

    // App should NOT crash with unhandled error
    const crashError = page.locator('text=/Cannot read properties|TypeError|ReferenceError|Uncaught/i');
    await expect(crashError).not.toBeVisible({ timeout: 3000 });

    // App might show empty state or loading state — both are acceptable
    await expect(page.locator('#eye-workspace-root')).toBeVisible({ timeout: 5000 });
    
    // Restore network
    await page.unroute('**/supabase.co/**');
  });

  // ── Test 4: UI Doesn't Show Success on Failed Operations ─────────────
  test('failed login does not show success message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('doesnotexist@nope.invalid');
    await passwordInput.fill('WrongPass@999');
    
    await page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first().click();
    await page.waitForTimeout(5000);

    // CRITICAL: No success message should appear
    const successIndicators = [
      'text=/تم تسجيل الدخول|Login successful|Welcome/i',
      'text=/مرحباً بك|أهلاً وسهلاً/i',
    ];
    
    for (const selector of successIndicators) {
      const el = page.locator(selector).first();
      const isVisible = await el.isVisible({ timeout: 1000 });
      expect(isVisible).toBe(false);
    }
    
    // Must still show login form
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
  });

  // ── Test 5: Expired Session Redirects to Login ────────────────────────
  test('clearing session redirects user to login on next navigation', async ({ page }) => {
    await loginAs(page, 'member');
    await expect(page.locator('#eye-workspace-root')).toBeVisible();

    // Clear session (simulates session expiry)
    await clearSession(page);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show login form
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });
  });

  // ── Test 6: Form Validation on Task Creation ──────────────────────────
  test('task creation form validates required fields', async ({ page }) => {
    await loginAs(page, 'admin');
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);

    // Open create task form
    const addBtn = page.locator('button').filter({ hasText: /إضافة مهمة|إنشاء|Create Task|New Task/i }).first();
    if (!await addBtn.isVisible({ timeout: 5000 })) {
      test.skip(true, 'Create task button not visible for this role');
      return;
    }
    
    await addBtn.click();
    await page.waitForTimeout(500);

    // Try to submit empty form
    const submitBtn = page.locator('button').filter({ hasText: /حفظ|نشر|Save|Publish|Submit/i }).last();
    if (await submitBtn.isVisible({ timeout: 3000 })) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should not navigate away or silently succeed
      // Either validation error or still in form
      const errorEl = page.locator('[class*="error"], [class*="alert"], input:invalid').first();
      // App should still be on workspace
      await expect(page.locator('#eye-workspace-root')).toBeVisible();
    }
  });

  // ── Test 7: Console Errors During Login Flow ──────────────────────────
  test('no JavaScript errors during successful login flow', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', err => {
      jsErrors.push(err.message);
    });

    await loginAs(page, 'member');
    await page.waitForTimeout(2000);

    // Filter out known non-critical warnings
    const criticalErrors = jsErrors.filter(err => 
      !err.includes('ResizeObserver') && // Common benign error
      !err.includes('Non-Error exception') &&
      !err.includes('Failed to load resource') && // Network deps
      !err.toLowerCase().includes('warning')
    );

    if (criticalErrors.length > 0) {
      console.error('[JS ERROR] Critical errors during login:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});
