import { expect, test } from '@playwright/test';
import { mapFixtures } from '../../fixtures/maps';

const map = mapFixtures[0];

test('debug mobile layout chain', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/${map.slug}`);
  await page.waitForSelector('map-view#main-map[data-ready="true"]', { timeout: 15000 });
  await page.waitForTimeout(500);

  // Smoke check of the layout chain at mobile size: the map viewport renders
  // its interaction surface and the world layer inside the page shell.
  await expect(page.locator('.map-viewport')).toBeVisible();
  await expect(page.locator('.map-panzoom')).toBeVisible();
  await expect(page.locator('.map-world img').first()).toBeVisible();
});
