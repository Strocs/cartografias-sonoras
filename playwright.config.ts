import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'tests/**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'lighthouse',
      testMatch: 'tests/**/*.lh.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
  ],
  webServer: {
    command: 'ASTRO_DEV_BACKGROUND=0 pnpm dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
