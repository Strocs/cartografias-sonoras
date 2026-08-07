import { test } from '@playwright/test'

import { mapFixtures } from '../../fixtures/maps'

const map = mapFixtures[0] // avenida-de-aguirre-la-serena

test('capture mobile screenshot of the map at fit', async ({ page }) => {
  // Force mobile viewport at runtime (overrides the project's Desktop Chrome config)
  await page.setViewportSize({ width: 375, height: 812 })

  await page.goto(`/${map.slug}`)
  await page.waitForSelector('map-view#main-map[data-ready="true"]', {
    timeout: 15000
  })
  // Let layout settle (resize observer, world-fit recompute)
  await page.waitForTimeout(1000)

  await page.screenshot({ path: '/tmp/map-mobile-fit.png', fullPage: false })
})
