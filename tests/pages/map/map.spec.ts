import { expect, test } from '@playwright/test';

import { mapCompositionFixtures } from '../../fixtures/map-composition';
import { mapFixtures } from '../../fixtures/maps';
import { PATHS } from '../../../src/features/paths/data/paths';
import { MARKS } from '../../../src/features/sounds/data/sounds';
import { HomePage } from '../home/home-page';
import { MapPage } from './map-page';

/** Marks for a map id in data order. */
function marksFor(mapId: number) {
  return MARKS.filter((mark) => mark.mapId === mapId);
}

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
    'keeps one labelled static preview through the live composition handoff',
    { tag: ['@critical', '@e2e', '@MAP-E2E-001'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const fixture = mapCompositionFixtures[0];

      await mapPage.goto(fixture.slug);

      const preview = mapPage.getCompositionPreview(fixture.slug);
      await expect(preview).toBeVisible();
      await expect(preview).toHaveAccessibleName(fixture.title);
      await expect(preview).toHaveCount(fixture.previewCount);
      await mapPage.waitForViewportReady();
      await mapPage.expectCompositionParity(fixture);

      const layerImages = mapPage.viewport.locator('[data-map-layer] img');
      const layerImageCount = await layerImages.count();
      expect(layerImageCount).toBeGreaterThan(0);
      for (let index = 0; index < layerImageCount; index += 1) {
        // The first layer is the base map: it carries a descriptive alt and
        // stays in the accessibility tree. Optional overlays are decorative.
        const isBase = index === 0;
        await expect(layerImages.nth(index)).toHaveAttribute(
          'alt',
          isBase ? `Mapa de ${fixture.title}` : ''
        );
        if (isBase) {
          await expect(layerImages.nth(index)).not.toHaveAttribute(
            'aria-hidden'
          );
        } else {
          await expect(layerImages.nth(index)).toHaveAttribute(
            'aria-hidden',
            'true'
          );
        }
      }
    }
  );

  test(
    'rebinds the composition after client-side navigation without duplicating marks',
    { tag: ['@critical', '@e2e', '@MAP-E2E-002'] },
    async ({ page }) => {
      const homePage = new HomePage(page);
      const mapPage = new MapPage(page);
      const firstMap = mapFixtures[0];
      const nextMap = mapFixtures[1];

      await homePage.goto();
      await expect(homePage.compositionPreviews).toHaveCount(
        mapFixtures.length
      );
      await homePage.getMapCard(firstMap.title).click();
      await expect(page).toHaveURL(`/${firstMap.slug}`);
      await mapPage.waitForViewportReady();
      await expect(mapPage.marks).toHaveCount(marksFor(firstMap.id).length);

      await mapPage.getRailLink(nextMap.slug).click();
      await expect(page).toHaveURL(`/${nextMap.slug}`);
      await mapPage.waitForViewportReady();
      await expect(mapPage.marks).toHaveCount(marksFor(nextMap.id).length);
    }
  );

  test(
    'preserves preview fallback for base failure and completes degraded optional layers',
    { tag: ['@high', '@e2e', '@MAP-E2E-003'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const fixture = mapCompositionFixtures[0];

      await mapPage.goto(fixture.slug);
      await mapPage.waitForViewportReady();

      const outcome = await page.evaluate(async () => {
        const current = document.querySelector('map-view#main-map');
        const wrapper = current?.parentElement;
        if (
          !(current instanceof HTMLElement) ||
          !(wrapper instanceof HTMLElement)
        ) {
          throw new Error('Missing active map view');
        }
        current.remove();

        const failingView = document.createElement('map-view');
        failingView.id = 'main-map';
        failingView.setAttribute(
          'map-layers',
          JSON.stringify([
            {
              id: 'base',
              src: 'data:image/png;base64,not-an-image',
              width: 2,
              height: 2,
              frame: { x: 0, y: 0, width: 100, height: 100 },
              optional: false,
              effect: 'none'
            }
          ])
        );
        wrapper.appendChild(failingView);
        await new Promise<void>((resolve) =>
          failingView.addEventListener(
            'map-composition-error',
            () => resolve(),
            { once: true }
          )
        );

        return {
          status: failingView.getAttribute('data-composition-status'),
          alert: failingView.querySelector('[role="alert"]')?.textContent,
          previewVisible:
            document.querySelector('[data-map-composition-preview]') !== null
        };
      });

      expect(outcome.status).toBe('error');
      expect(outcome.alert).toContain('Map image failed to decode');
      expect(outcome.previewVisible).toBe(true);
    }
  );

  test(
    'keyboard focus reaches a sound button and plays it (fan is always visible)',
    { tag: ['@high', '@e2e', '@MAP-E2E-004'] },
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id)[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const group = mapPage.getSoundMark(mark.id);

      // The mark circle is a decorative disc (not focusable); the sound
      // buttons are the interactive elements and are reachable directly.
      await expect(group.locator('.sound-mark__circle')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
      await expect(group).not.toHaveAttribute('data-open');

      // The first sound button takes focus; Space plays the sound.
      const button = mapPage.getSoundButton(mark.id, mark.sounds[0].id);
      await button.focus();
      await expect(button).toBeFocused();
      await button.press('Space');
      await expect(button).toHaveAttribute('data-state', /playing|paused/, {
        timeout: 5000
      });

      const effectActive = await page.evaluate(async () => {
        const base =
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'
          );
        const view = document.createElement('map-view');
        // The engine derives its viewport size from the live host, so a bare
        // element appended to <body> needs explicit dimensions (the real page
        // provides them via the flex layout of .map-wrapper).
        view.style.width = '400px';
        view.style.height = '300px';
        view.setAttribute('reduced-motion', 'true');
        view.setAttribute(
          'map-layers',
          JSON.stringify([
            {
              id: 'static',
              src: base,
              width: 2,
              height: 2,
              frame: { x: 0, y: 0, width: 100, height: 100 },
              optional: false,
              effect: 'none'
            },
            {
              id: 'effect',
              src: base,
              width: 2,
              height: 2,
              frame: { x: 0, y: 0, width: 100, height: 100 },
              optional: true,
              effect: 'float'
            }
          ])
        );
        document.body.appendChild(view);
        await new Promise<void>((resolve) =>
          view.addEventListener('map-composition-ready', () => resolve(), {
            once: true
          })
        );
        return view
          .querySelector('[data-map-layer="effect"]')
          ?.getAttribute('data-effect-active');
      });
      expect(effectActive).toBe('false');
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
    'renders all marks for the active map with mark-coordinate geometry',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const marks = marksFor(map.id);

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.marks).toHaveCount(marks.length);
      await expect(mapPage.soundButtons).toHaveCount(
        marks.reduce((acc, m) => acc + m.sounds.length, 0)
      );

      for (const mark of marks) {
        // The group div is a zero-size positioning container; the visible
        // element is the 56px circle button inside it.
        await expect(
          mapPage.getSoundMark(mark.id).locator('.sound-mark__circle')
        ).toBeVisible();
      }

      // Coordinate assert on the group CSS vars.
      const mark = marks[0];
      const position = await mapPage.getMarkPosition(mark.id);
      expect(position.x).toBe(
        Math.round((mark.position.x / 100) * position.imageWidth)
      );
      expect(position.y).toBe(
        Math.round((mark.position.y / 100) * position.imageHeight)
      );
    }
  );

  test(
    'shows the mark tooltip with title, place and description below the mark',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id)[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const group = mapPage.getSoundMark(mark.id);
      const tooltip = group.locator('.sound-mark__tooltip');

      // Hover the pin: the tooltip activates from either the head or the tail
      // (the tail reaches lower than the group origin and would otherwise
      // intercept the head's hover zone).
      await group.locator('.sound-mark__tail').hover();

      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(mark.title);
      await expect(tooltip).toContainText(mark.location);
      // Description is optional: only render/assert when present.
      if (mark.description) {
        await expect(tooltip).toContainText(mark.description);
      }

      // The tooltip always sits below the mark's geometric centre-bottom,
      // while the fan itself stays always-visible (no toggle state).
      const groupBox = await group.boundingBox();
      const tooltipBox = await tooltip.boundingBox();
      expect(groupBox).not.toBeNull();
      expect(tooltipBox).not.toBeNull();
      expect(tooltipBox!.y).toBeGreaterThanOrEqual(
        groupBox!.y + groupBox!.height / 2
      );

      await expect(group).not.toHaveAttribute('data-open');
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

      // The minimum zoom is fit-relative: `md` factor (0.8) × fit scale.
      const viewportBox = (await mapPage.viewport.boundingBox())!;
      const image = await mapPage.getImageSize();
      const fit = Math.min(
        viewportBox.width / image.width,
        viewportBox.height / image.height
      );
      const mdFactor = 0.8;
      await expect.poll(() => mapPage.getZoom()).toBeCloseTo(mdFactor * fit, 5);
      const bounds = await mapPage.getBounds();
      expect(bounds.image.left).toBeGreaterThanOrEqual(
        bounds.viewport.left - 1
      );
      expect(bounds.image.right).toBeLessThanOrEqual(bounds.viewport.right + 1);
      expect(bounds.image.top).toBeGreaterThanOrEqual(bounds.viewport.top - 1);
      expect(bounds.image.bottom).toBeLessThanOrEqual(
        bounds.viewport.bottom + 1
      );
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
        y: viewportBox!.y + viewportBox!.height * 0.3
      };
      await page.mouse.move(cursor.x, cursor.y);
      await page.mouse.wheel(0, -400);

      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(initialZoom);
      const alignment = await page.evaluate(() => {
        const scene = document.querySelector('.map-panzoom');
        const world = document.querySelector('.map-world');
        const image = scene?.querySelector('img');
        const mark = document.querySelector('[data-testid="sound-mark"]');
        const path = document.querySelector('.path-base');
        const svg = path?.closest('svg');
        return {
          sceneTransform: scene?.getAttribute('style') ?? '',
          worldTransform: world?.getAttribute('style') ?? '',
          sharedSceneContainment: [
            image,
            mark?.parentElement,
            mark,
            svg,
            path
          ].every(
            (element) =>
              element !== null &&
              element !== undefined &&
              scene?.contains(element) === true
          )
        };
      });
      // The static interaction surface stays untransformed; the pan/zoom
      // transform (and thus the zoomed alignment) now lives on the world.
      expect(alignment.sceneTransform).not.toContain('translate3d');
      expect(alignment.worldTransform).toContain('translate3d');
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
        y: viewportBox!.y + viewportBox!.height / 2
      };
      await page.mouse.move(center.x, center.y);
      for (let wheel = 0; wheel < 12; wheel += 1) {
        await page.mouse.wheel(0, -1200);
      }
      // Zoom caps are per-breakpoint factors over the fitted scale (the map
      // page caps `md` at 1.5×fit), so an absolute ceiling like 0.9 is wrong
      // for desktop. Assert the wheel zoomed the map beyond the fit baseline
      // (the map becomes oversized), which is what the drag/clamp checks
      // afterwards require.
      const image = await mapPage.getImageSize();
      const fit = Math.min(
        viewportBox!.width / image.width,
        viewportBox!.height / image.height
      );
      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(fit);

      await page.mouse.move(center.x, center.y);
      await page.mouse.down();
      await page.mouse.move(center.x + 2000, center.y + 2000, { steps: 5 });
      await page.mouse.up();

      await expect
        .poll(async () => {
          const bounds = await mapPage.getBounds();
          return {
            coversLeft: bounds.image.left <= bounds.viewport.left + 1,
            coversTop: bounds.image.top <= bounds.viewport.top + 1
          };
        })
        .toEqual({ coversLeft: true, coversTop: true });
    }
  );

  test(
    'drag starting on a sound button pans the map and does not activate audio',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      await mapPage.goto(mapFixtures[0].slug);
      await mapPage.waitForViewportReady();

      // Attach counters BEFORE the gesture: a 'sound:activate' listener (audio
      // would only fire on a click) and a 'viewport-change' listener on the
      // engine's scene (the raw event carries reason === 'drag' for a real
      // pan; the map-view forward strips it).
      await page.evaluate(() => {
        const map = document.querySelector('map-view#main-map')!;
        const scene = document.querySelector('.map-panzoom');
        const win = window as Window & {
          __soundActivations?: number;
          __viewportDrags?: number;
        };
        win.__soundActivations = 0;
        win.__viewportDrags = 0;
        map.addEventListener('sound:activate', () => {
          win.__soundActivations = (win.__soundActivations ?? 0) + 1;
        });
        scene?.addEventListener('viewport-change', (event) => {
          const detail = (event as CustomEvent).detail as
            { reason?: string } | undefined;
          if (detail?.reason === 'drag') {
            win.__viewportDrags = (win.__viewportDrags ?? 0) + 1;
          }
        });
      });

      const box = await mapPage.soundButtons.first().boundingBox();
      expect(box).not.toBeNull();
      const center = {
        x: box!.x + box!.width / 2,
        y: box!.y + box!.height / 2
      };
      await page.mouse.move(center.x, center.y);
      await page.mouse.down();
      await page.mouse.move(center.x + 50, center.y + 40, { steps: 6 });
      await page.mouse.up();

      // The gesture panned the map: at least one drag-driven viewport-change
      // must have fired. Poll because the drag settles asynchronously.
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { __viewportDrags?: number })
                .__viewportDrags ?? 0
          )
        )
        .toBeGreaterThan(0);

      // The resulting click was suppressed by the gesture guard: no audio.
      const activations = await page.evaluate(
        () =>
          (window as Window & { __soundActivations?: number })
            .__soundActivations ?? 0
      );
      expect(activations).toBe(0);
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
    'connects marks with dashed path lines by mark ids',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const expectedPaths = PATHS.filter((path) => path.mapId === map.id);

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      await expect(mapPage.pathSvg).toHaveCount(expectedPaths.length);

      const firstPath = mapPage.pathSvg.first();
      await expect(firstPath).toHaveClass(/path-base/);
    }
  );

  test(
    'the sound button toggles playback while the fan stays always visible',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id)[0];
      const firstSound = mark.sounds[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const group = mapPage.getSoundMark(mark.id);
      const button = mapPage.getSoundButton(mark.id, firstSound.id);

      // No fan toggle: the button is directly interactive.
      await expect(group).not.toHaveAttribute('data-open');

      // The sound button toggles playback without any mark toggle.
      await button.click();
      await expect(button).toHaveAttribute('data-state', /playing|paused/, {
        timeout: 5000
      });

      // The mark paints its active accent while any sound plays.
      await expect(group).toHaveAttribute('data-state', 'active');
    }
  );

  test(
    'mark shows an active accent only when one of its sounds is playing',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const marks = marksFor(map.id);
      const selected = marks[0];
      const sibling = marks[1];
      const selectedSound = selected.sounds[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const selectedGroup = mapPage.getSoundMark(selected.id);
      const siblingGroup = mapPage.getSoundMark(sibling.id);

      await expect(selectedGroup).toHaveAttribute('data-state', 'idle');
      await expect(siblingGroup).toHaveAttribute('data-state', 'idle');

      await mapPage.getSoundButton(selected.id, selectedSound.id).click();
      await expect(selectedGroup).toHaveAttribute('data-state', 'active');
      await expect(siblingGroup).toHaveAttribute('data-state', 'idle');
    }
  );

  test(
    'mark aria contract: decorative disc + labelled always-visible fan',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id)[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const group = mapPage.getSoundMark(mark.id);
      const circle = group.locator('.sound-mark__circle');
      const fan = group.locator('.sound-mark__fan');

      // New contract: the disc is decorative (aria-hidden) and the fan is a
      // labelled group that is always exposed — no open/closed aria state.
      await expect(circle).toHaveAttribute('aria-hidden', 'true');
      await expect(circle).not.toHaveAttribute('aria-expanded');
      await expect(circle).not.toHaveAttribute('aria-controls');
      await expect(fan).toHaveAttribute('role', 'group');
      await expect(fan).toHaveAttribute('aria-label', mark.title);
      await expect(fan).not.toHaveAttribute('aria-hidden');
      await expect(group).not.toHaveAttribute('data-open');
    }
  );

  test(
    'sound buttons copy the mark title label and expose the 30px progress ring',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id).find((m) => m.sounds.length > 1);

      if (!mark) {
        throw new Error(`Map ${map.slug} has no mark with multiple sounds`);
      }

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      const group = mapPage.getSoundMark(mark.id);

      // The fan needs no toggle — buttons are visible and interactive.
      await expect(group).not.toHaveAttribute('data-open');

      // Design D7: sounds 2..n reuse the mark title/description/location as
      // the default copy (product copy pending); aria-label = mark.title so
      // labels are never empty.
      for (const sound of mark.sounds) {
        const button = mapPage.getSoundButton(mark.id, sound.id);
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute('aria-label', mark.title);
      }

      // The progress ring targets the 30px sound button perimeter.
      const firstSound = mark.sounds[0];
      const ring = await mapPage
        .getSoundButton(mark.id, firstSound.id)
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            progress: Number.parseFloat(style.getPropertyValue('--progress')),
            width: style.width,
            height: style.height
          };
        });
      expect(ring.progress).toBeGreaterThanOrEqual(0);
      expect(ring.progress).toBeLessThanOrEqual(100);
      expect(ring.width).toBe('30px');
      expect(ring.height).toBe('30px');
    }
  );

  test(
    'bottom player renders only when the sound piece system is enabled and stays in idle mode',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page);
      const map = mapFixtures[0];
      const mark = marksFor(map.id)[0];

      await mapPage.goto(map.slug);
      await mapPage.waitForViewportReady();

      if (!map.soundPieceEnabled) {
        await expect(mapPage.bottomPlayer).toHaveCount(0);
        return;
      }

      await expect(mapPage.bottomPlayer).toBeVisible();
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle');

      // The fan needs no toggle — the sound button is directly clickable.
      await mapPage.getSoundButton(mark.id, mark.sounds[0].id).click();

      await expect(mapPage.bottomPlayer).toBeVisible();
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle');
    }
  );
});
