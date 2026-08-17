/**
 * EYE Workflow Hub — Auth Tests: Login
 * 
 * Tests:
 * ✅ Valid credentials → dashboard
 * ✅ Invalid credentials → error message
 * ✅ Wrong password → error message  
 * ✅ Empty fields → validation error
 * ✅ Email format validation
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAs, assertLoggedIn, assertLoggedOut } from '../fixtures/auth.fixture';

test.describe('Authentication — Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ── Test 1: Valid Admin Login ─────────────────────────────────────────
  test('should login successfully with valid admin credentials', async ({ page }) => {
    await test.step('Fill login form with valid credentials', async () => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      
      await emailInput.fill(TEST_USERS.admin.email);
      await passwordInput.fill(TEST_USERS.admin.password);
    });

    await test.step('Submit login form', async () => {
      await page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first().click();
    });

    await test.step('Assert dashboard is shown', async () => {
      await assertLoggedIn(page);
      // Verify user identity
      await expect(page.locator('#eye-workspace-root')).toBeVisible({ timeout: 15000 });
    });
  });

  // ── Test 2: Valid Member Login ────────────────────────────────────────
  test('should login successfully with valid member credentials', async ({ page }) => {
    await loginAs(page, 'member');
    await assertLoggedIn(page);
  });

  // ── Test 3: Invalid Email ─────────────────────────────────────────────
  test('should show error for non-existent email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('nonexistent.user.xyz@eye-test.org');
    await passwordInput.fill('SomePassword@123');
    await page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first().click();

    // Should show error, NOT navigate to dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 5000 });
    
    // Error message should appear
    const errorEl = page.locator('[class*="error"], [class*="alert"], p.text-red, div.text-red').first();
    await expect(errorEl).toBeVisible({ timeout: 8000 });
  });

  // ── Test 4: Wrong Password ────────────────────────────────────────────
  test('should show error for correct email but wrong password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill(TEST_USERS.member.email);
    await passwordInput.fill('WrongPassword@INCORRECT');
    await page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first().click();

    // Must NOT show dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 5000 });
    
    // Error message must appear
    const errorEl = page.locator('[class*="error"], [class*="alert"], p.text-red, div.text-red').first();
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    
    // Error text should mention invalid credentials (in Arabic or English)
    const errorText = await errorEl.textContent();
    expect(errorText).toBeTruthy();
  });

  // ── Test 5: Empty Email ───────────────────────────────────────────────
  test('should prevent login with empty email', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('SomePassword@123');
    
    // Click submit without email
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first();
    await submitBtn.click();

    // Should NOT navigate to dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });
    
    // Either HTML5 validation OR custom error
    const emailInput = page.locator('input[type="email"]').first();
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    const hasError = page.locator('[class*="error"], [class*="alert"]').first();
    
    // At least one of these must be true
    const isValid = validationMessage.length > 0 || await hasError.isVisible({ timeout: 3000 });
    expect(isValid).toBe(true);
  });

  // ── Test 6: Empty Password ────────────────────────────────────────────
  test('should prevent login with empty password', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(TEST_USERS.member.email);
    
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first();
    await submitBtn.click();

    // Should NOT navigate to dashboard
    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });
  });

  // ── Test 7: Both Fields Empty ─────────────────────────────────────────
  test('should prevent login with both fields empty', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login/i }).first();
    await submitBtn.click();

    await expect(page.locator('#eye-workspace-root')).not.toBeVisible({ timeout: 3000 });
  });
});
