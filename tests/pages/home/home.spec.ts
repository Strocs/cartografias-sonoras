import { expect, test } from '@playwright/test';

import { mapFixtures } from '../../fixtures/maps';
import { HomePage } from './home-page';

test.describe('Home', () => {
  test(
    'home page loads',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await expect(homePage.heading).toBeVisible();
      await expect(homePage.nav).toBeVisible();
    }
  );

  test(
    '3 map cards visible',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await expect(homePage.mapCards).toHaveCount(3);

      for (const map of mapFixtures) {
        await expect(homePage.getMapCard(map.title)).toBeVisible();
      }
    }
  );

  test(
    'navigation links present',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await expect(homePage.proyectoLink).toBeVisible();
      await expect(homePage.datosLink).toBeVisible();
      await expect(homePage.equipoLink).toBeVisible();
    }
  );

  test(
    'clicking a map navigates to /:slug',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.getMapCard(homePage.firstMapTitle).click();

      await expect(page).toHaveURL(`/${homePage.firstMapSlug}`);
    }
  );
});
