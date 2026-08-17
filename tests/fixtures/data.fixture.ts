/**
 * EYE Workflow Hub — E2E Test Fixtures: Data Factories
 * 
 * Factory functions for creating test data objects.
 * All data created by tests uses the E2E_TEST_DATA_PREFIX
 * to distinguish it from real data.
 * 
 * SAFETY: Test cleanup only targets records with the test prefix
 * in their title/name field. Never touches production data.
 */

import { TEST_PREFIX } from './auth.fixture';
import { testDataName } from './page-helpers';

export { testDataName };

// ── Meeting Factory ────────────────────────────────────────────────────────

export function createMeetingData(overrides: Partial<{
  title: string;
  description: string;
  date: string;
  time: string;
  type: string;
  committee: string;
}> = {}) {
  const now = new Date();
  now.setDate(now.getDate() + 1); // Tomorrow
  now.setHours(14, 0, 0, 0); // 2 PM

  return {
    title: `${TEST_PREFIX} اجتماع تجريبي ${Date.now()}`,
    description: 'اجتماع تجريبي لأغراض الاختبار الآلي فقط. يُرجى تجاهله.',
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    time: '14:00',
    type: 'General',
    committee: 'All',
    ...overrides,
  };
}

// ── Task Factory ─────────────────────────────────────────────────────────

export function createTaskData(overrides: Partial<{
  name: string;
  description: string;
  deadline: string;
  priority: string;
  committee: string;
}> = {}) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // 1 week from now

  return {
    name: `${TEST_PREFIX} مهمة تجريبية ${Date.now()}`,
    description: 'مهمة تجريبية لأغراض الاختبار الآلي فقط. يُرجى تجاهلها.',
    deadline: deadline.toISOString().split('T')[0],
    priority: 'Medium',
    committee: 'All',
    ...overrides,
  };
}

// ── Warning/Disciplinary Factory ──────────────────────────────────────────

export function createWarningData(memberId?: string) {
  return {
    type: 'لفتة نظر',
    reason: `${TEST_PREFIX} سبب تجريبي للاختبار الآلي`,
    penaltyPoints: 5,
    severity: 'Notice',
    memberId,
  };
}

export function createAlertData(memberId?: string) {
  return {
    type: 'إنذار',
    reason: `${TEST_PREFIX} سبب إنذار تجريبي للاختبار الآلي`,
    penaltyPoints: 10,
    severity: 'Warning',
    memberId,
  };
}

// ── Test Data Markers ─────────────────────────────────────────────────────

/**
 * Check if a piece of text belongs to test data (has the test prefix).
 */
export function isTestData(text: string): boolean {
  return text.startsWith(TEST_PREFIX);
}

/**
 * Get a CSS selector that matches test data items in a list.
 */
export function testDataSelector(): string {
  return `[data-testid], tr, li, .card, .item`;
}
