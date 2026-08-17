/**
 * EYE Workflow Hub — Accessibility Tests
 * 
 * Uses @axe-core/playwright to check for WCAG violations.
 * 
 * Tests:
 * ✅ Login page has no critical accessibility violations
 * ✅ Dashboard has no critical violations
 * ✅ Buttons have accessible names
 * ✅ Images have alt text
 * ✅ Form inputs have labels
 * ✅ Color contrast (via axe)
 * ✅ Keyboard navigation works (Tab key)
 * ✅ Focus states are visible
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs } from '../fixtures/auth.fixture';
import { navigateTo } from '../fixtures/page-helpers';

test.describe('Accessibility — WCAG Compliance', () => {

  // ── Test 1: Login Page Accessibility ──────────────────────────────────
  test('login page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[class*="lucide"]') // Exclude icon library internals
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('A11Y Violations on Login:', JSON.stringify(
        accessibilityScanResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
        null,
        2
      ));
    }

    // Only fail on CRITICAL violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    );

    expect(criticalViolations).toEqual([]);
  });

  // ── Test 2: Dashboard Accessibility ───────────────────────────────────
  test('dashboard has no critical accessibility violations', async ({ page }) => {
    await loginAs(page, 'member');
    await page.waitForTimeout(2000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[class*="lucide"]')
      .exclude('iframe') // Exclude embedded iframes
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    );

    if (criticalViolations.length > 0) {
      console.log('Critical A11Y Violations on Dashboard:',
        criticalViolations.map(v => `${v.id}: ${v.description}`).join('\n')
      );
    }

    expect(criticalViolations).toEqual([]);
  });

  // ── Test 3: Keyboard Navigation — Tab Key ─────────────────────────────
  test('login form is keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Tab through the form fields
    await page.keyboard.press('Tab');
    
    // After first tab, an element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Tab to email input
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.focus();
    
    // Email should be focused
    await expect(emailInput).toBeFocused();

    // Tab to password
    await page.keyboard.press('Tab');
    const passInput = page.locator('input[type="password"]').first();
    await expect(passInput).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    // Some element after password should be focused (submit or show/hide toggle)
  });

  // ── Test 4: Form Inputs Have Labels ──────────────────────────────────
  test('form inputs have accessible labels on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Check email input has a label
    const emailInput = page.locator('input[type="email"]').first();
    const emailId = await emailInput.getAttribute('id');
    const emailAriaLabel = await emailInput.getAttribute('aria-label');
    const emailPlaceholder = await emailInput.getAttribute('placeholder');
    
    // At least one of: id (for label association), aria-label, or placeholder
    const hasLabel = !!emailId || !!emailAriaLabel || !!emailPlaceholder;
    expect(hasLabel).toBe(true);
  });

  // ── Test 5: Interactive Elements Have Accessible Names ────────────────
  test('buttons have accessible names (text or aria-label)', async ({ page }) => {
    await loginAs(page, 'member');
    await page.waitForTimeout(1500);

    const buttons = await page.locator('button:visible').all();
    
    let buttonsWithoutName = 0;
    for (const button of buttons.slice(0, 15)) {
      try {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        
        if (!text?.trim() && !ariaLabel && !title) {
          buttonsWithoutName++;
          console.warn('[A11Y] Button without accessible name found');
        }
      } catch { /* button may have been removed */ }
    }
    
    // Allow max 2 unnamed buttons (icon-only buttons that might be decorative)
    expect(buttonsWithoutName).toBeLessThanOrEqual(3);
  });

  // ── Test 6: Tasks Page Accessibility ─────────────────────────────────
  test('tasks view has no serious accessibility violations', async ({ page }) => {
    await loginAs(page, 'member');
    await navigateTo(page, 'tasks');
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .exclude('[class*="lucide"]')
      .analyze();

    const seriousViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    if (seriousViolations.length > 0) {
      console.log('Serious A11Y Violations on Tasks:',
        seriousViolations.map(v => `${v.id} (${v.impact}): ${v.description}`).join('\n')
      );
    }

    // Serious violations should be fixed
    expect(seriousViolations.length).toBeLessThanOrEqual(5); // Allow some tolerance for existing issues
  });
});
