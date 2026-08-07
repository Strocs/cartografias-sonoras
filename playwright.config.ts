import { defineConfig, devices } from '@playwright/test'

const PREVIEW_URL = 'http://127.0.0.1:4322'

export default defineConfig({
  testDir: 'tests',
  testMatch: 'tests/**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'lighthouse',
      testMatch: 'tests/**/*.lh.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1
    }
  ],
  webServer: {
    // Build the real artifact, then serve `dist/` with `astro preview` in the
    // foreground. `url` (not `port`) gates readiness on an HTTP response from
    // the exact deterministic host:port the preview binds to, so the tests run
    // against the same artifact a production deploy would serve.
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4322',
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: 120_000
  }
})
