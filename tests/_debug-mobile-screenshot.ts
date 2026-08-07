import { chromium } from '@playwright/test';
import { mapFixtures } from './fixtures/maps';

const MAP_URL = `/maps/${mapFixtures[0].slug}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },  // iPhone 13
    deviceScaleFactor: 3
  });

  await page.goto(MAP_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('map-view#main-map[data-ready="true"]', { timeout: 10000 });

  // Wait a bit for layout to settle
  await page.waitForTimeout(500);

  const screenshotPath = '/tmp/map-mobile.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Also grab diagnostic info
  const diag = await page.evaluate(() => {
    const mapView = document.querySelector('map-view#main-map') as HTMLElement;
    const vp = mapView?.querySelector('.map-viewport') as HTMLElement;
    const world = mapView?.querySelector('.map-world') as HTMLElement;
    const scene = mapView?.querySelector('.map-panzoom') as HTMLElement;
    const img = world?.querySelector('img');

    const vpBox = vp?.getBoundingClientRect();
    const worldBox = world?.getBoundingClientRect();
    const sceneBox = scene?.getBoundingClientRect();
    const imgBox = img?.getBoundingClientRect();
    const mvBox = mapView?.getBoundingClientRect();

    return {
      mapView: mvBox ? { top: mvBox.top, left: mvBox.left, width: mvBox.width, height: mvBox.height } : null,
      viewport: vpBox ? { top: vpBox.top, left: vpBox.left, width: vpBox.width, height: vpBox.height } : null,
      scene: sceneBox ? { top: sceneBox.top, left: sceneBox.left, width: sceneBox.width, height: sceneBox.height } : null,
      world: worldBox ? { top: worldBox.top, left: worldBox.left, width: worldBox.width, height: worldBox.height } : null,
      image: imgBox ? { top: imgBox.top, left: imgBox.left, width: imgBox.width, height: imgBox.height } : null,
      sceneTransform: scene?.style.transform ?? 'N/A',
      worldTransform: world?.style.transform ?? 'N/A',
      zoom: (mapView as unknown as { getScale(): number })?.getScale?.() ?? 'N/A',
    };
  });

  console.log('MAP_DEBUG ' + JSON.stringify(diag, null, 2));
  await browser.close();
})();
