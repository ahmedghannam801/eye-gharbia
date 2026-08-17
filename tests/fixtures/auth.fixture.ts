/**
 * EYE Workflow Hub — E2E Test Fixtures: Authentication
 *
 * Provides reusable login/logout helpers for all test users.
 * Uses dedicated test accounts defined in .env.test — never Production users.
 *
 * IMPORTANT: This app uses STATE-BASED routing (no URL navigation).
 * After login, the app shows the dashboard by checking state.
 * We navigate by clicking sidebar/nav items, NOT by changing URLs.
 */

import { Page, BrowserContext, expect } from '@playwright/test';

// ── Test User Credentials ─────────────────────────────────────────────────
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'test.admin@eye-test.org',
    password: process.env.E2E_ADMIN_PASSWORD || 'TestAdmin@EYE2026',
    role: 'Super Admin',
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL || 'test.member@eye-test.org',
    password: process.env.E2E_MEMBER_PASSWORD || 'TestMember@EYE2026',
    role: 'Member',
  },
  leader: {
    email: process.env.E2E_LEADER_EMAIL || 'test.leader@eye-test.org',
    password: process.env.E2E_LEADER_PASSWORD || 'TestLeader@EYE2026',
    role: 'Leader',
  },
  memberB: {
    email: process.env.E2E_MEMBER_B_EMAIL || 'test.memberb@eye-test.org',
    password: process.env.E2E_MEMBER_B_PASSWORD || 'TestMemberB@EYE2026',
    role: 'Member',
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

// ── Test Data Prefix ─────────────────────────────────────────────────────
export const TEST_PREFIX = process.env.E2E_TEST_DATA_PREFIX || '[E2E-TEST]';

// ── Core Login Helper ─────────────────────────────────────────────────────

/**
 * Logs in as a specific test user.
 * Waits for the dashboard to be fully loaded before returning.
 */
export async function loginAs(page: Page, userKey: TestUserKey): Promise<void> {
  const user = TEST_USERS[userKey];
  
  // Navigate to app
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait for auth screen to appear (login form)
  // The app shows the Auth component when not logged in
  await page.waitForSelector('[data-testid="login-form"], input[type="email"]', {
    timeout: 15000,
  });

  // Fill email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(user.email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(user.password);

  // Click login button
  const loginBtn = page.locator('button[type="submit"], button').filter({ hasText: /تسجيل الدخول|Login|Sign in/i }).first();
  await loginBtn.click();

  // Wait for dashboard to load (indicates successful login)
  // The dashboard renders after currentUser is set in state
  await page.waitForSelector('#eye-workspace-root', { timeout: 20000 });
  
  // Extra wait for realtime subscriptions to stabilize
  await page.waitForTimeout(1500);
}

/**
 * Logs out the current user.
 * Works by finding and clicking the logout button in the sidebar.
 */
export async function logout(page: Page): Promise<void> {
  // Try sidebar logout button
  try {
    const logoutBtn = page.locator('button').filter({ hasText: /تسجيل الخروج|Logout|Sign out/i }).first();
    await logoutBtn.click({ timeout: 5000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  } catch {
    // If sidebar is collapsed on mobile, try to open it first
    const menuBtn = page.locator('button[aria-label*="menu"], button[aria-label*="قائمة"]').first();
    if (await menuBtn.isVisible({ timeout: 2000 })) {
      await menuBtn.click();
      await page.waitForTimeout(500);
    }
    const logoutBtn = page.locator('button').filter({ hasText: /تسجيل الخروج|Logout/i }).first();
    await logoutBtn.click({ timeout: 5000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  }
}

/**
 * Verifies a user is currently logged in by checking for the workspace root element.
 */
export async function assertLoggedIn(page: Page): Promise<void> {
  await expect(page.locator('#eye-workspace-root')).toBeVisible({ timeout: 10000 });
}

/**
 * Verifies a user is NOT logged in (should see login form).
 */
export async function assertLoggedOut(page: Page): Promise<void> {
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Creates a fresh browser context for a second user (multi-user tests).
 * Returns page and context for cleanup.
 */
export async function createUserSession(
  context: BrowserContext,
  userKey: TestUserKey
): Promise<Page> {
  const page = await context.newPage();
  await loginAs(page, userKey);
  return page;
}

/**
 * Clears localStorage to force logout without clicking UI.
 * Useful for session tests.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('eye_current_user');
    localStorage.removeItem('supabase.auth.token');
    // Clear all eye_ prefixed keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith('eye_'));
    keys.forEach(k => localStorage.removeItem(k));
  });
}

/**
 * Gets the current user from localStorage (for assertions).
 */
export async function getCurrentUserFromStorage(page: Page): Promise<any> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('eye_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
}
