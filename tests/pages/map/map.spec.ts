import { expect, test } from '@playwright/test';

import { mockMaps } from '../../../src/features/maps/data/mock-maps';
import { mockPaths } from '../../../src/features/paths/data/mock-paths';
import { mockSounds } from '../../../src/features/sounds/data/mock-sounds';
import { HomePage } from '../home/home-page';
import { MapPage } from './map-page';

test.describe('Map', () => {
  test(
    'map page loads with viewport and navigation',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];

      await mapPage.goto(map.slug);

      await expect(mapPage.viewport).toBeVisible();
      await mapPage.waitForViewportReady();
      await expect(mapPage.navTitle).toBeVisible();
    }
  );

  test(
    'sidebar navigation returns to home',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mockMaps[0].slug);

      await page.getByRole('link', { name: 'Inicio' }).click();

      await expect(page).toHaveURL('/');
      const homePage = new HomePage(page);
      await expect(homePage.heading).toBeVisible();
    }
  );

  test(
    'renders all sound markers for the active map',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];
      const expectedSounds = mockSounds.filter((sound) => sound.mapId === map.id);

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.markers).toHaveCount(expectedSounds.length);
      for (const sound of expectedSounds) {
        await expect(mapPage.getMarkerBySoundId(sound.id)).toBeVisible();
      }
    }
  );

  test(
    'shows hover card with sound title and description',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];
      const sound = mockSounds.find((s) => s.mapId === map.id);

      if (!sound) {
        throw new Error(`No sounds found for map ${map.slug}`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      // Leaflet divIcon portals prevent CSS :hover from propagating in
      // Playwright. Force the hover card into a visible state so we can
      // verify its content without relying on real mouse hover.
      const hoverCard = mapPage.hoverCards.first();
      await hoverCard.evaluate((el) => {
        el.classList.remove('hidden', 'opacity-0');
        el.classList.add('block', 'opacity-100');
      });

      await expect(hoverCard).toBeVisible();
      await expect(hoverCard).toContainText(sound.title);
      await expect(hoverCard).toContainText(sound.description);
    }
  );

  test(
    'zoom buttons change the map zoom',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mockMaps[0].slug);
      await mapPage.waitForViewportReady();

      const initialZoom = await mapPage.getZoom();

      await mapPage.zoomInButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBeGreaterThan(initialZoom);
      }).toPass({ timeout: 2000 });

      await mapPage.zoomOutButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBe(initialZoom);
      }).toPass({ timeout: 2000 });
    }
  );

  test(
    'center button resets the map view',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mockMaps[0].slug);
      await mapPage.waitForViewportReady();

      const initialZoom = await mapPage.getZoom();
      await mapPage.zoomInButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBeGreaterThan(initialZoom);
      }).toPass({ timeout: 2000 });

      await mapPage.centerMapButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBe(initialZoom);
      }).toPass({ timeout: 2000 });
    }
  );

  test(
    'right rail shows inactive maps and navigates on click',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const activeMap = mockMaps[0];
      const inactiveMaps = mockMaps.filter((m) => m.slug !== activeMap.slug);

      await mapPage.goto(activeMap.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.rightRail).toBeVisible();
      await expect(mapPage.railLinks).toHaveCount(inactiveMaps.length);

      const target = inactiveMaps[0];
      await mapPage.getRailLink(target.slug).click();
      await expect(page).toHaveURL(`/${target.slug}`);
    }
  );

  test(
    'renders dashed path lines between connected sounds',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];
      const expectedPaths = mockPaths.filter((path) => path.mapId === map.id);

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const paths = page.locator('.leaflet-path-pane path');
      await expect(paths).toHaveCount(expectedPaths.length);

      const firstPath = paths.first();
      await expect(firstPath).toHaveAttribute('stroke-dasharray');
    }
  );

  test(
    'clicking a marker starts playback and shows the progress ring',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];
      const sound = mockSounds.find((s) => s.mapId === map.id);

      if (!sound) {
        throw new Error(`No sounds found for map ${map.slug}`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const marker = mapPage.getMarkerBySoundId(sound.id);
      await marker.click();

      await expect(marker).toHaveAttribute('data-status', 'playing', {
        timeout: 5000,
      });
      await expect(marker.locator('[data-testid="progress-ring"]')).toBeVisible();
    }
  );

  test(
    'bottom player renders and stays in idle mode for regular sounds',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mockMaps[0];
      const sound = mockSounds.find((s) => s.mapId === map.id);

      if (!sound) {
        throw new Error(`No sounds found for map ${map.slug}`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      // Player is always rendered as part of the layout; starts idle.
      await expect(mapPage.bottomPlayer).toBeVisible();
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle');

      const marker = mapPage.getMarkerBySoundId(sound.id);
      await marker.click();

      // Clicking a regular sound keeps the player in idle mode
      // (only SoundPiece triggers switch to "piece" mode).
      await expect(mapPage.bottomPlayer).toBeVisible();
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle');
    }
  );
});
