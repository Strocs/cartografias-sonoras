import { expect, test } from '@playwright/test';

import { mockMaps } from '../../../src/features/maps/data/mock-maps';
import { HomePage } from '../home/home-page';
import { MapPage } from './map-page';

test.describe('Map', () => {
  test(
    'map page loads with viewport',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];

      await mapPage.goto(map.slug);

      await expect(mapPage.heading).toHaveText(map.title);
      await expect(mapPage.viewport).toBeVisible();
      await mapPage.waitForViewportReady();
    }
  );

  test(
    'back navigation works',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mockMaps[0].slug);

      await mapPage.backLink.click();

      await expect(page).toHaveURL('/');
      const homePage = new HomePage(page);
      await expect(homePage.heading).toBeVisible();
    }
  );
});
