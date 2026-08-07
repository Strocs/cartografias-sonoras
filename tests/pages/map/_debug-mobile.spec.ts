import { test } from '@playwright/test';

import { mapFixtures } from '../../fixtures/maps';

const map = mapFixtures[0]; // avenida-de-aguirre-la-serena

test('capture mobile screenshot of the map at fit', async ({ page }) => {
  // Force mobile viewport at runtime (overrides the project's Desktop Chrome config)
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`/${map.slug}`);
  await page.waitForSelector('map-view#main-map[data-ready="true"]', {
    timeout: 15000,
  });
  // Let layout settle (resize observer, world-fit recompute)
  await page.waitForTimeout(1000);

  // Full diagnostic dump
  const diag = await page.evaluate(() => {
    const mv  = document.querySelector('map-view#main-map') as HTMLElement;
    const vp  = mv?.querySelector('.map-viewport')  as HTMLElement;
    const sc  = mv?.querySelector('.map-panzoom')    as HTMLElement;
    const w   = mv?.querySelector('.map-world')      as HTMLElement;
    const img = w?.querySelector('img');
    const r = (el: Element | null) => el?.getBoundingClientRect();
    return {
      mapEl:    r(mv),
      viewport: r(vp),
      scene:    r(sc),
      world:    r(w),
      image:    r(img),
      sceneTransform: sc?.style.transform ?? 'N/A',
      worldTransform: w?.style.transform  ?? 'N/A',
      zoom: (mv as unknown as { getScale(): number })?.getScale?.(),
      natural: { w: (mv as unknown as { imageWidth: number })?.imageWidth, h: (mv as unknown as { imageHeight: number })?.imageHeight },
    };
  });
  console.log('MOBILE_DIAG ' + JSON.stringify(diag, null, 2));

  await page.screenshot({ path: '/tmp/map-mobile-fit.png', fullPage: false });
});
