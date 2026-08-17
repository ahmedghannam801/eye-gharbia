/**
 * EYE Workflow Hub — REGRESSION SUITE
 * Bug #4: Push Infrastructure Regression Guard
 */

import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('🔴 REGRESSION — Bug #4: Push Infrastructure', () => {

  test('[BUG#4] sw.js is always accessible (push requires it)', async ({ page }) => {
    const res = await page.request.get('/sw.js');
    expect(res.status()).toBe(200);
    const body = await res.text();
    // SW must have actual content (not empty file)
    expect(body.length).toBeGreaterThan(50);
    // Must be valid JavaScript (contains common SW keywords)
    const hasSWContent = body.includes('self') || body.includes('addEventListener') || body.includes('cache');
    expect(hasSWContent).toBe(true);
  });

  test('[BUG#4] manifest.json is valid for PWA push', async ({ page }) => {
    const res = await page.request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name || manifest.short_name).toBeTruthy();
  });

  test('[BUG#4] No unhandled errors in push initialization after login', async ({ page }) => {
    const unhandledErrors: string[] = [];
    page.on('pageerror', err => unhandledErrors.push(err.message));

    // Grant notification permission so push code runs fully
    await page.context().grantPermissions(['notifications']);
    await loginAs(page, 'member');
    await page.waitForTimeout(4000); // Allow full push init

    // Filter out known benign errors
    const criticalPushErrors = unhandledErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error')
    );

    if (criticalPushErrors.length > 0) {
      console.error('[BUG#4 REGRESSION] Push errors:', criticalPushErrors);
    }
    expect(criticalPushErrors.length).toBe(0);
  });
});
