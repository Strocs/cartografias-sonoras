import { expect, test } from '@playwright/test';

import { mapFixtures } from '../../fixtures/maps';
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
      const map = mapFixtures[0];

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
      await mapPage.goto(mapFixtures[0].slug);

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
      const map = mapFixtures[0];
      const expectedSounds = mockSounds.filter(
        (sound) => sound.mapId === map.id
      );

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.markers).toHaveCount(expectedSounds.length);
      for (const sound of expectedSounds) {
        await expect(mapPage.getMarkerBySoundId(sound.id)).toBeVisible();
      }

      const sound = expectedSounds[0];
      const marker = mapPage.getMarkerBySoundId(sound.id);
      const coordinates = await marker.evaluate((element) => {
        const mapView = document.querySelector('map-view#main-map') as
          (HTMLElement & { imageWidth: number; imageHeight: number }) | null;
        return {
          x: element.style.getPropertyValue('--marker-x'),
          y: element.style.getPropertyValue('--marker-y'),
          transform: element.style.transform,
          imageWidth: mapView?.imageWidth ?? 0,
          imageHeight: mapView?.imageHeight ?? 0
        };
      });
      expect(coordinates.x).toBe(
        String(Math.round((sound.position.x / 100) * coordinates.imageWidth))
      );
      expect(coordinates.y).toBe(
        String(Math.round((sound.position.y / 100) * coordinates.imageHeight))
      );
      expect(coordinates.transform).toContain('translate(-50%, -50%)');
    }
  );

  test(
    'shows tooltip with sound title and description on hover',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const sound = mockSounds.find((s) => s.mapId === map.id);

      if (!sound) {
        throw new Error(`No sounds found for map ${map.slug}`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const marker = mapPage.getMarkerBySoundId(sound.id);
      const tooltip = marker.locator('.sound-marker__tooltip');

      await marker.hover();

      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(sound.title);
      await expect(tooltip).toContainText(sound.description);
    }
  );

  test(
    'zoom buttons change the map scale',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      const initialZoom = await mapPage.getZoom();

      await mapPage.zoomInButton.click();
      let zoomedInZoom = initialZoom;
      await expect(async () => {
        zoomedInZoom = await mapPage.getZoom();
        expect(zoomedInZoom).toBeGreaterThan(initialZoom);
      }).toPass({ timeout: 2000 });

      await mapPage.zoomOutButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBeLessThan(zoomedInZoom);
      }).toPass({ timeout: 2000 });
    }
  );

  test(
    'declared minimum zoom leaves valid empty viewport space for undersized content',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      for (let click = 0; click < 10; click += 1) {
        await mapPage.zoomOutButton.click();
      }

      await expect.poll(() => mapPage.getZoom()).toBeCloseTo(0.2, 5);
      const bounds = await mapPage.getBounds();
      expect(bounds.image.left).toBeGreaterThanOrEqual(bounds.viewport.left - 1);
      expect(bounds.image.right).toBeLessThanOrEqual(bounds.viewport.right + 1);
      expect(bounds.image.top).toBeGreaterThanOrEqual(bounds.viewport.top - 1);
      expect(bounds.image.bottom).toBeLessThanOrEqual(bounds.viewport.bottom + 1);
    }
  );

  test(
    'off-center wheel zoom keeps layers aligned and clamps only at viewport edges',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      const initialZoom = await mapPage.getZoom();
      const viewportBox = await mapPage.viewport.boundingBox();
      expect(viewportBox).not.toBeNull();
      const cursor = {
        x: viewportBox!.x + viewportBox!.width * 0.75,
        y: viewportBox!.y + viewportBox!.height * 0.3,
      };
      await page.mouse.move(cursor.x, cursor.y);
      await page.mouse.wheel(0, -400);

      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(initialZoom);
      const alignment = await page.evaluate(() => {
        const scene = document.querySelector('.map-panzoom');
        const image = scene?.querySelector('img');
        const marker = document.querySelector('[data-testid="sound-marker"]');
        const path = document.querySelector('.path-base');
        const svg = path?.closest('svg');
        return {
          sceneTransform: scene?.getAttribute('style') ?? '',
          sharedSceneContainment: [image, marker?.parentElement, marker, svg, path]
            .every((element) => element !== null && element !== undefined && scene?.contains(element) === true),
        };
      });
      expect(alignment.sceneTransform).toContain('translate3d');
      expect(alignment.sharedSceneContainment).toBe(true);
    }
  );

  test(
    'wheel zoom and pointer drag keep an oversized map within viewport edges',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      const viewportBox = await mapPage.viewport.boundingBox();
      expect(viewportBox).not.toBeNull();
      const center = {
        x: viewportBox!.x + viewportBox!.width / 2,
        y: viewportBox!.y + viewportBox!.height / 2,
      };
      await page.mouse.move(center.x, center.y);
      for (let wheel = 0; wheel < 12; wheel += 1) {
        await page.mouse.wheel(0, -1200);
      }
      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(0.9);

      await page.mouse.move(center.x, center.y);
      await page.mouse.down();
      await page.mouse.move(center.x + 2000, center.y + 2000, { steps: 5 });
      await page.mouse.up();

      await expect.poll(async () => {
        const bounds = await mapPage.getBounds();
        return {
          coversLeft: bounds.image.left <= bounds.viewport.left + 1,
          coversTop: bounds.image.top <= bounds.viewport.top + 1,
        };
      }).toEqual({ coversLeft: true, coversTop: true });
    }
  );

  test(
    'center button resets the map view',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      const initialZoom = await mapPage.getZoom();
      let zoomedInZoom = initialZoom;
      await mapPage.zoomInButton.click();
      await expect(async () => {
        zoomedInZoom = await mapPage.getZoom();
        expect(zoomedInZoom).toBeGreaterThan(initialZoom);
      }).toPass({ timeout: 2000 });

      await mapPage.centerMapButton.click();
      await expect(async () => {
        const zoom = await mapPage.getZoom();
        expect(zoom).toBeLessThan(zoomedInZoom);
      }).toPass({ timeout: 2000 });
    }
  );

  test(
    'right rail shows inactive maps and navigates on click',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const activeMap = mapFixtures[0];
      const inactiveMaps = mapFixtures.filter((m) => m.slug !== activeMap.slug);

      await mapPage.goto(activeMap.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.rightRail).toBeVisible();
      await expect(mapPage.railLinks).toHaveCount(inactiveMaps.length);
      const railBounds = await mapPage.rightRail.boundingBox();
      const viewport = page.viewportSize();
      expect(railBounds).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(railBounds!.x + railBounds!.width).toBeLessThanOrEqual(
        viewport!.width
      );

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
      const map = mapFixtures[0];
      const expectedPaths = mockPaths.filter((path) => path.mapId === map.id);

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.pathSvg).toHaveCount(expectedPaths.length);

      const firstPath = mapPage.pathSvg.first();
      await expect(firstPath).toHaveClass(/path-base/);
    }
  );

  test(
    'clicking a marker starts playback and updates marker state',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const sound = mockSounds.find((s) => s.mapId === map.id);

      if (!sound) {
        throw new Error(`No sounds found for map ${map.slug}`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const marker = mapPage.getMarkerBySoundId(sound.id);
      await marker.click();

      await expect(marker).toHaveAttribute('data-state', 'playing', {
        timeout: 5000
      });
      await expect
        .poll(() =>
          marker.evaluate((element) => {
            element.style.setProperty('--progress', '50%');
            const ring = getComputedStyle(element, '::after');
            return {
              backgroundImage: ring.backgroundImage,
              opacity: ring.opacity,
              width: ring.width,
              height: ring.height
            };
          })
        )
        .toEqual({
          backgroundImage: expect.stringContaining('50%'),
          opacity: '1',
          width: '54px',
          height: '54px'
        });
    }
  );

  test(
    'bottom player renders and stays in idle mode for regular sounds',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
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
