import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/**
 * EYE Workflow Hub — Playwright E2E Configuration
 * 
 * Runs against localhost:3000 (npm run dev must be running before tests).
 * Test users are defined in .env.test — never uses Production user accounts.
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in parallel */
  fullyParallel: false, // Sequential for realtime tests to avoid conflicts
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers — reduce to 1 for realtime tests that need sequential execution */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter: HTML + JUnit (for CI) */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list'],
  ],
  
  /* Global test settings */
  use: {
    /* Base URL for all tests */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace only on failure */
    trace: 'on-first-retry',
    
    /* Screenshot only on failure */
    screenshot: 'only-on-failure',
    
    /* Video only on failure */
    video: 'on-first-retry',
    
    /* Global timeout per action */
    actionTimeout: 15000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Locale (Arabic UI) */
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  },

  /* Test timeout */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Output folder for test artifacts (screenshots, videos, traces) */
  outputDir: 'test-results',

  /* Configure projects for major browsers + mobile */
  projects: [
    // ─── Desktop Browsers ───────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    
    // ─── Mobile Browsers ─────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // 390px width (iPhone 14 Pro size)
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },
    {
      name: 'mobile-small',
      use: {
        ...devices['Galaxy S8'],
        // 360px width — small Android
      },
    },
    
    // ─── Regression suite — Chromium only for speed ───────────────────
    {
      name: 'regression',
      testMatch: '**/regression/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
