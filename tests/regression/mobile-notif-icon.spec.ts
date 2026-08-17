/**
 * EYE Workflow Hub — REGRESSION SUITE
 * Mobile Navigation Icon - Dedicated Regression Guard
 * 
 * Mirrors the check in notification-delivery.spec.ts but runs specifically
 * under the mobile-chrome and mobile-safari projects.
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('🔴 REGRESSION — Bug #3: Mobile Notif Icon (Mobile Project)', () => {

  test('[BUG#3] Mobile notification icon visible on login', async ({ page }) => {
    await loginAs(page, 'member');
    await page.waitForTimeout(1500);

    // Fixed bottom nav
    const mobileNav = page.locator('.fixed.bottom-0').first();
    await expect(mobileNav).toBeVisible({ timeout: 8000 });

    // Notification/Announcements tab
    const notifBtn = mobileNav.locator('button').filter({
      hasText: /الإشعارات|Notifs|إشعار/i,
    }).first();
    await expect(notifBtn).toBeVisible({ timeout: 5000 });

    // Bell SVG icon must be in the button
    const svgIcon = notifBtn.locator('svg').first();
    await expect(svgIcon).toBeVisible({ timeout: 3000 });
  });

  test('[BUG#3] Mobile nav notification button stays visible after tab switching', async ({ page }) => {
    await loginAs(page, 'member');
    await page.waitForTimeout(1000);

    const mobileNav = page.locator('.fixed.bottom-0');
    const notifBtn = mobileNav.locator('button').filter({ hasText: /الإشعارات|Notifs/i }).first();

    // Click each tab and verify notification button remains
    const tabs = ['المهام|Tasks', 'الصدارة|Ranks', 'الرئيسية|Home'];
    for (const tabText of tabs) {
      const tabBtn = mobileNav.locator('button').filter({ hasText: new RegExp(tabText) }).first();
      if (await tabBtn.isVisible({ timeout: 1000 })) {
        await tabBtn.click();
        await page.waitForTimeout(600);

        // Notification icon should ALWAYS be visible
        await expect(notifBtn).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
