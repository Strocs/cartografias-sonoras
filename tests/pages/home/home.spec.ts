import { expect, test } from '@playwright/test'

import { mapFixtures } from '../../fixtures/maps'
import { HomePage } from './home-page'

test.describe('Home', () => {
  test('home page loads', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(homePage.heading).toBeVisible()
    await expect(homePage.nav).toBeVisible()
  })

  test('3 map cards visible', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(homePage.mapCards).toHaveCount(3)

    for (const map of mapFixtures) {
      await expect(homePage.getMapCard(map.title)).toBeVisible()
    }
  })

  test('navigation links present', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await expect(homePage.proyectoLink).toBeVisible()
    await expect(homePage.datosLink).toBeVisible()
    await expect(homePage.equipoLink).toBeVisible()
  })

  test('clicking a map navigates to /:slug', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await homePage.getMapCard(homePage.firstMapTitle).click()

    await expect(page).toHaveURL(`/${homePage.firstMapSlug}`)
  })

  for (const deviceScaleFactor of [1, 2]) {
    test(
      `hover preview reuses the destination candidate at DPR ${deviceScaleFactor}`,
      { tag: ['@high', '@e2e', '@hover-preview'] },
      async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          deviceScaleFactor
        })
        const page = await context.newPage()
        const session = await page.context().newCDPSession(page)
        const responses: PreviewResponseEvent[] = []
        const finishedRequests: NetworkLoadingFinishedEvent[] = []
        session.on('Network.responseReceived', (event: PreviewResponseEvent) => responses.push(event))
        session.on('Network.loadingFinished', (event: NetworkLoadingFinishedEvent) => finishedRequests.push(event))
        await session.send('Network.enable')

        try {
          const homePage = new HomePage(page)
          await homePage.goto()
          await page.waitForLoadState('networkidle')
          const serializedProfile = await homePage.getMapCard(homePage.firstMapTitle).evaluate((card) => ({
            src: card.getAttribute('data-preview-src'),
            srcset: card.getAttribute('data-preview-srcset'),
            sizes: card.getAttribute('data-preview-sizes')
          }))
          expect(serializedProfile.sizes).toBe('100vw')
          const profileUrls = new Set(
            serializedProfile.srcset
              ?.split(',')
              .map((candidate) => new URL(candidate.trim().split(' ')[0], page.url()).href)
          )
          const responseStart = responses.length

          for (let entry = 0; entry < 3; entry += 1) {
            await homePage.hoverMapCard(homePage.firstMapTitle)
            await page.mouse.move(0, 0)
          }

          await expect(page.locator('link[data-hover-preview-preload]')).toHaveCount(1)
          const hoverResponse = await waitForResponse(() =>
            responses.slice(responseStart).find((event) => profileUrls.has(event.response.url))
          )
          const previewUrl = hoverResponse.response.url
          const hoverResponses = responses.slice(responseStart)
          const previewResponses = hoverResponses.filter((event) => event.response.url === previewUrl)
          const unrelatedAstroAssetResponses = hoverResponses.filter(
            (event) => isAstroAsset(event.response.url) && event.response.url !== previewUrl
          )

          expect(getHeader(hoverResponse.response.headers, 'cache-control')).toBe('public, max-age=31536000, immutable')
          expect(previewResponses).toHaveLength(1)
          expect(
            unrelatedAstroAssetResponses,
            'pointerleave must not preload RightRail, base-layer, or live-map assets'
          ).toEqual([])

          const postNavigationResponseStart = responses.length
          const postNavigationFinishedStart = finishedRequests.length
          await homePage.getMapCard(homePage.firstMapTitle).click({ noWaitAfter: true })
          await expect(page).toHaveURL(`/${homePage.firstMapSlug}`)

          const destinationCurrentSrc = await page
            .locator('.map-layer > [data-map-composition-preview] img')
            .evaluate((image: HTMLImageElement) => image.currentSrc)
          expect(destinationCurrentSrc).toBe(previewUrl)
          expect(
            responses.slice(postNavigationResponseStart).filter((event) => event.response.url === previewUrl)
          ).toHaveLength(0)
          expect(
            finishedRequests
              .slice(postNavigationFinishedStart)
              .filter((event) => event.requestId === hoverResponse.requestId)
              .reduce((total, event) => total + event.encodedDataLength, 0)
          ).toBe(0)
        } finally {
          await session.detach().catch(() => undefined)
          await context.close()
        }
      }
    )
  }
})

async function waitForResponse(getResponse: () => PreviewResponseEvent | undefined): Promise<PreviewResponseEvent> {
  await expect.poll(getResponse, { timeout: 10_000 }).toBeTruthy()
  const response = getResponse()
  if (!response) throw new Error('Timed out waiting for a hover preview response')
  return response
}

interface PreviewResponse {
  url: string
  headers: Record<string, string>
}

interface PreviewResponseEvent {
  requestId: string
  response: PreviewResponse
}

interface NetworkLoadingFinishedEvent {
  requestId: string
  encodedDataLength: number
}

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1]
}

function isAstroAsset(url: string): boolean {
  return new URL(url).pathname.startsWith('/_astro/')
}
