import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../reports/html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
