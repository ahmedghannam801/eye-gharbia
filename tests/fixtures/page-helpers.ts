/**
 * EYE Workflow Hub — E2E Test Fixtures: Page Helpers
 *
 * Navigation and view helpers for the state-based routing system.
 * 
 * CRITICAL: This app does NOT use URL-based routing.
 * All navigation is done via sidebar clicks, NOT page.goto('/meetings').
 * 
 * Navigation happens by clicking sidebar links which call setCurrentView().
 */

import { Page, expect, Locator } from '@playwright/test';
import { TEST_PREFIX } from './auth.fixture';

// ── Navigation Helpers ────────────────────────────────────────────────────

/**
 * Navigate to a view using the sidebar.
 * Maps view names to Arabic/English sidebar link text.
 */
export async function navigateTo(page: Page, view: string): Promise<void> {
  const viewMap: Record<string, string[]> = {
    dashboard: ['الرئيسية', 'Dashboard', 'Home'],
    tasks: ['المهام', 'Tasks'],
    meetings: ['الاجتماعات', 'Meetings'],
    announcements: ['الإعلانات', 'الإشعارات', 'Announcements', 'Notifications'],
    disciplinary: ['لفتات النظر', 'Disciplinary', 'السجلات التأديبية', 'التأديب'],
    profile: ['حسابي', 'Profile'],
    settings: ['الإعدادات', 'Settings'],
    leaderboard: ['الصدارة', 'Leaderboard', 'Ranks'],
    workplans: ['خطط العمل', 'Work Plans'],
    feedback: ['التقييم', 'Feedback'],
    ideabank: ['بنك الأفكار', 'Idea Bank'],
    members: ['الأعضاء', 'Members'],
  };

  const searchTerms = viewMap[view] || [view];
  
  for (const term of searchTerms) {
    try {
      // Try sidebar link first
      const sidebarLink = page.locator('nav a, nav button, aside button, aside a, [role="navigation"] button')
        .filter({ hasText: new RegExp(term, 'i') })
        .first();
      
      if (await sidebarLink.isVisible({ timeout: 2000 })) {
        await sidebarLink.click();
        await page.waitForTimeout(800);
        return;
      }
    } catch { /* try next term */ }
  }

  // Fallback: try any button with matching text
  for (const term of searchTerms) {
    try {
      await page.getByText(new RegExp(term, 'i')).first().click({ timeout: 3000 });
      await page.waitForTimeout(800);
      return;
    } catch { /* continue */ }
  }

  throw new Error(`Could not navigate to view: ${view}. Tried: ${searchTerms.join(', ')}`);
}

/**
 * Wait for a view to be rendered by looking for a heading or content indicator.
 */
export async function waitForView(page: Page, viewIndicator: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(viewIndicator, { timeout });
}

// ── Form Helpers ──────────────────────────────────────────────────────────

/**
 * Fill a form field by label text (for Arabic forms).
 */
export async function fillByLabel(page: Page, labelText: string, value: string): Promise<void> {
  // Try to find input near the label
  const label = page.locator('label').filter({ hasText: new RegExp(labelText, 'i') }).first();
  
  if (await label.isVisible({ timeout: 3000 })) {
    const forAttr = await label.getAttribute('for');
    if (forAttr) {
      await page.locator(`#${forAttr}`).fill(value);
      return;
    }
    // Try sibling input
    await label.locator('~ input, ~ textarea').first().fill(value);
    return;
  }

  // Try placeholder matching
  await page.locator(`input[placeholder*="${labelText}"], textarea[placeholder*="${labelText}"]`).first().fill(value);
}

/**
 * Click a button by its text (supports Arabic).
 */
export async function clickButton(page: Page, buttonText: string): Promise<void> {
  await page.locator('button').filter({ hasText: new RegExp(buttonText, 'i') }).first().click();
}

/**
 * Select from a dropdown/select element.
 */
export async function selectOption(page: Page, selectLocator: string, value: string): Promise<void> {
  const select = page.locator(selectLocator).first();
  
  // Try native select
  if (await select.evaluate(el => el.tagName === 'SELECT')) {
    await select.selectOption({ value });
    return;
  }
  
  // Try custom dropdown
  await select.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"], li, .option').filter({ hasText: new RegExp(value, 'i') }).first().click();
}

// ── Data Helpers ──────────────────────────────────────────────────────────

/**
 * Generate a unique test data name with prefix and timestamp.
 * Example: "[E2E-TEST] Meeting 1723456789"
 */
export function testDataName(entityType: string): string {
  return `${TEST_PREFIX} ${entityType} ${Date.now()}`;
}

/**
 * Generate a future date string in YYYY-MM-DD format (default: tomorrow).
 */
export function futureDateString(daysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

/**
 * Generate a future datetime-local string (for input[type="datetime-local"]).
 */
export function futureDatetimeLocal(hoursAhead = 24): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  // Format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

// ── Assertion Helpers ─────────────────────────────────────────────────────

/**
 * Assert a success message is visible.
 */
export async function assertSuccess(page: Page): Promise<void> {
  const successIndicators = [
    page.locator('.success, [data-type="success"]').first(),
    page.locator('text=/تم بنجاح|تم الحفظ|تمت العملية|نجح|تم الإنشاء/i').first(),
    page.locator('[role="alert"]').filter({ hasText: /success|تم/i }).first(),
  ];
  
  for (const indicator of successIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: 5000 });
      return;
    } catch { /* try next */ }
  }
  
  // If no explicit success message, check that no error is shown
  const errorIndicators = page.locator('[class*="error"], [role="alert"]').filter({ hasText: /خطأ|error|failed|فشل/i });
  await expect(errorIndicators).toHaveCount(0, { timeout: 3000 });
}

/**
 * Assert an error message is visible.
 */
export async function assertError(page: Page, expectedText?: string): Promise<void> {
  if (expectedText) {
    await expect(page.locator('text=/' + expectedText + '/i').first()).toBeVisible({ timeout: 5000 });
  } else {
    const errorEl = page.locator('[class*="error"], [class*="alert"], [role="alert"]').first();
    await expect(errorEl).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Wait for a toast/notification to appear and optionally assert its text.
 */
export async function waitForToast(page: Page, expectedText?: string, timeout = 8000): Promise<Locator> {
  const toastSelectors = [
    '[role="status"]',
    '[class*="toast"]',
    '[class*="snack"]',
    '[class*="notification-popup"]',
    '.fixed.top-',
  ];
  
  for (const selector of toastSelectors) {
    try {
      const el = page.locator(selector).filter({ hasText: expectedText ? new RegExp(expectedText, 'i') : /./});
      await expect(el.first()).toBeVisible({ timeout });
      return el.first();
    } catch { /* try next */ }
  }
  
  throw new Error(`Toast with text "${expectedText}" not found within ${timeout}ms`);
}

// ── Mobile Helpers ────────────────────────────────────────────────────────

/**
 * Check if mobile bottom nav is visible.
 */
export async function assertMobileNavVisible(page: Page): Promise<void> {
  // Mobile nav is shown on lg: breakpoint (< 1024px)
  const mobileNav = page.locator('.fixed.bottom-0').first();
  await expect(mobileNav).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate using mobile bottom nav.
 */
export async function mobileNavigateTo(page: Page, itemId: string): Promise<void> {
  const itemLabels: Record<string, string[]> = {
    dashboard: ['الرئيسية', 'Home'],
    tasks: ['المهام', 'Tasks'],
    leaderboard: ['الصدارة', 'Ranks'],
    announcements: ['الإشعارات', 'Notifs'],
    profile: ['حسابي', 'Profile'],
  };
  
  const labels = itemLabels[itemId] || [itemId];
  const mobileNav = page.locator('.fixed.bottom-0');
  
  for (const label of labels) {
    const btn = mobileNav.locator('button').filter({ hasText: new RegExp(label, 'i') }).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      await page.waitForTimeout(600);
      return;
    }
  }
  
  throw new Error(`Mobile nav item "${itemId}" not found`);
}

/**
 * Check for horizontal overflow (mobile responsiveness test).
 * Returns true if page has horizontal scroll (bad).
 */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/**
 * Get notification badge count from mobile nav.
 */
export async function getMobileNotifBadgeCount(page: Page): Promise<number> {
  const mobileNav = page.locator('.fixed.bottom-0');
  const badge = mobileNav.locator('[class*="badge"], span.rounded-full.bg-red').first();
  
  if (!await badge.isVisible({ timeout: 2000 })) return 0;
  
  const text = await badge.textContent();
  if (!text) return 0;
  if (text.includes('+')) return 10; // "9+" means more than 9
  return parseInt(text, 10) || 0;
}

// ── Notification Helpers ──────────────────────────────────────────────────

/**
 * Open the notification panel (click bell icon in header).
 */
export async function openNotificationPanel(page: Page): Promise<void> {
  // Find bell icon button in header
  const bellBtn = page.locator('header button, [role="banner"] button')
    .filter({ has: page.locator('[class*="bell"], svg[data-lucide="bell"]') })
    .first();
  
  if (await bellBtn.isVisible({ timeout: 3000 })) {
    await bellBtn.click();
  } else {
    // Try by aria-label or title
    await page.locator('[aria-label*="notification"], [title*="إشعار"], [title*="Notification"]').first().click();
  }
  
  await page.waitForTimeout(500);
}

/**
 * Get the count of unread notifications shown in the header badge.
 */
export async function getHeaderNotifBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('header .rounded-full.bg-red, [role="banner"] span.animate-pulse').first();
  
  if (!await badge.isVisible({ timeout: 2000 })) return 0;
  
  const text = await badge.textContent();
  if (!text) return 0;
  return parseInt(text, 10) || 0;
}
