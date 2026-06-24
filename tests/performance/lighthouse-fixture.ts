import { chromium, test as base } from '@playwright/test';
import type { Browser } from '@playwright/test';
import getPort from 'get-port';

type LighthouseFixtures = {
  port: number;
  browser: Browser;
};

/**
 * Extended test fixture that launches Chromium with a unique
 * remote debugging port per worker, required by Lighthouse.
 *
 * Each worker gets its own port to support parallel runs.
 */
export const lighthouseTest = base.extend<{}, LighthouseFixtures>({
  port: [
    async ({}, use) => {
      const port = await getPort();
      await use(port);
    },
    { scope: 'worker' },
  ],

  browser: [
    async ({ port }, use) => {
      const browser = await chromium.launch({
        headless: true,
        args: [`--remote-debugging-port=${port}`],
      });
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],
});
