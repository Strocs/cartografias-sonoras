import { test } from '@playwright/test';
import { mapFixtures } from '../../fixtures/maps';

const map = mapFixtures[0];

test('debug mobile layout chain', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/${map.slug}`);
  await page.waitForSelector('map-view#main-map[data-ready="true"]', { timeout: 15000 });
  await page.waitForTimeout(500);

  const chain = await page.evaluate(() => {
    const r = (el: Element | null) => {
      const b = el?.getBoundingClientRect();
      const cs = el ? getComputedStyle(el) : null;
      return b ? {
        top: b.top, left: b.left, width: b.width, height: b.height, bottom: b.bottom,
        display: cs?.display, position: cs?.position, overflow: cs?.overflow,
        flex: cs?.flex, flexDirection: cs?.flexDirection,
        marginTop: cs?.marginTop, marginBottom: cs?.marginBottom,
        paddingTop: cs?.paddingTop, paddingBottom: cs?.paddingBottom,
      } : null;
    };
    return {
      body:         r(document.body),
      nav:          r(document.querySelector('aside')),
      main:         r(document.querySelector('main')),
      flexContainer:r(document.querySelector('main > div')),
      mapWrapper:   r(document.querySelector('.map-wrapper')),
      compositionPreview: r(document.querySelector('[data-map-composition-preview]')),
      mapView:      r(document.querySelector('map-view#main-map')),
      mapViewport:  r(document.querySelector('.map-viewport')),
      scene:        r(document.querySelector('.map-panzoom')),
      world:        r(document.querySelector('.map-world')),
      title:        r(document.querySelector('h2')),
      bottomPlayer: r(document.querySelector('[data-testid="audio-bottom-player"]')),
      rightRail:    r(document.querySelector('[data-testid="right-rail"]')),
    };
  });

  console.log('LAYOUT_CHAIN ' + JSON.stringify(chain, null, 2));
  test.skip();
});
