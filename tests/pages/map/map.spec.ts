import { expect, test, type CDPSession, type Page } from '@playwright/test'

import { mapCompositionFixtures } from '../../fixtures/map-composition'
import { mapFixtures } from '../../fixtures/maps'
import { PATHS } from '../../../src/features/paths/data/paths'
import { MARKS } from '../../../src/features/sounds/data/sounds'
import { HomePage } from '../home/home-page'
import { MapPage } from './map-page'

/** Marks for a map id in data order. */
function marksFor(mapId: number) {
  return MARKS.filter((mark) => mark.mapId === mapId)
}

interface NetworkRequestEvent {
  requestId: string
  request: { url: string }
}

interface NetworkResponseEvent {
  requestId: string
  response: { fromDiskCache?: boolean; fromPrefetchCache?: boolean; fromServiceWorker?: boolean }
}

interface NetworkFinishedEvent {
  requestId: string
  encodedDataLength: number
}

interface CacheCandidateEvidence {
  servedFromCache: boolean
  response?: NetworkResponseEvent['response']
  encodedDataLength?: number
}

class ChromiumNetworkTrace {
  private readonly requests: Array<NetworkRequestEvent & { sequence: number }> = []
  private readonly servedFromCache = new Set<string>()
  private readonly responses = new Map<string, NetworkResponseEvent['response']>()
  private readonly finished = new Map<string, number>()
  private sequence = 0

  constructor(private readonly session: CDPSession) {}

  async enable(cacheDisabled: boolean): Promise<void> {
    this.session.on('Network.requestWillBeSent', (event: NetworkRequestEvent) => {
      this.requests.push({ ...event, sequence: this.sequence++ })
    })
    this.session.on('Network.requestServedFromCache', (event: { requestId: string }) => {
      this.servedFromCache.add(event.requestId)
    })
    this.session.on('Network.responseReceived', (event: NetworkResponseEvent) => {
      this.responses.set(event.requestId, event.response)
    })
    this.session.on('Network.loadingFinished', (event: NetworkFinishedEvent) => {
      this.finished.set(event.requestId, event.encodedDataLength)
    })
    await this.session.send('Network.enable')
    await this.session.send('Network.setCacheDisabled', { cacheDisabled })
  }

  cursor(): number {
    return this.sequence
  }

  async waitForCandidate(urls: Set<string>): Promise<NetworkRequestEvent> {
    await expect.poll(() => this.requests.find((request) => urls.has(request.request.url))).toBeTruthy()
    const request = this.requests.find((candidate) => urls.has(candidate.request.url))
    if (!request) throw new Error('Timed out waiting for the exact responsive candidate request')
    return request
  }

  candidateRequestsAfter(urls: Set<string>, cursor: number): NetworkRequestEvent[] {
    return this.requests.filter((request) => request.sequence >= cursor && urls.has(request.request.url))
  }

  evidenceFor(requestId: string): CacheCandidateEvidence {
    return {
      servedFromCache: this.servedFromCache.has(requestId),
      response: this.responses.get(requestId),
      encodedDataLength: this.finished.get(requestId)
    }
  }
}

function isBrowserCacheZeroTransfer(evidence: CacheCandidateEvidence): boolean {
  const browserCache =
    evidence.servedFromCache ||
    evidence.response?.fromDiskCache === true ||
    evidence.response?.fromPrefetchCache === true
  return browserCache && evidence.response?.fromServiceWorker !== true && evidence.encodedDataLength === 0
}

async function destinationLayerUrls(page: Page, slug: string): Promise<Set<string>> {
  const response = await page.request.get(new URL(`/${slug}`, page.url()).href)
  const html = await response.text()
  const serialized = html.match(/map-layers="([^"]+)"/)?.[1]
  if (!serialized) throw new Error(`Missing map layers for ${slug}`)
  const layers = JSON.parse(serialized.replaceAll('&quot;', '"')) as Array<{ src: string }>
  return new Set(layers.map((layer) => new URL(layer.src, page.url()).href))
}

function responsiveCandidates(profile: { srcset: string; sizes: string }, page: Page): Set<string> {
  expect(profile.sizes).toBe('100vw')
  return new Set(profile.srcset.split(',').map((candidate) => new URL(candidate.trim().split(' ')[0], page.url()).href))
}

const transitionName = (prefix: string, slug: string) => `${prefix}-${slug}`

test.describe('Map', () => {
  test('map page loads with viewport and navigation', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    const map = mapFixtures[0]

    await mapPage.goto(map.slug)

    await expect(mapPage.viewport).toBeVisible()
    await mapPage.waitForViewportReady()
    await expect(mapPage.navTitle).toBeVisible()
  })

  test(
    'keeps one labelled static preview through the live composition handoff',
    { tag: ['@critical', '@e2e', '@MAP-E2E-001'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const fixture = mapCompositionFixtures[0]

      await mapPage.goto(fixture.slug)

      const preview = mapPage.getCompositionPreview(fixture.slug)
      await expect(preview).toBeVisible()
      await expect(preview).toHaveAccessibleName(fixture.title)
      await expect(preview).toHaveCount(fixture.previewCount)
      await mapPage.waitForViewportReady()
      await mapPage.expectCompositionParity(fixture)

      const layerImages = mapPage.viewport.locator('[data-map-layer] img')
      const layerImageCount = await layerImages.count()
      expect(layerImageCount).toBeGreaterThan(0)
      for (let index = 0; index < layerImageCount; index += 1) {
        // The first layer is the base map: it carries a descriptive alt and
        // stays in the accessibility tree. Optional overlays are decorative.
        const isBase = index === 0
        await expect(layerImages.nth(index)).toHaveAttribute('alt', isBase ? `Mapa de ${fixture.title}` : '')
        if (isBase) {
          await expect(layerImages.nth(index)).not.toHaveAttribute('aria-hidden')
        } else {
          await expect(layerImages.nth(index)).toHaveAttribute('aria-hidden', 'true')
        }
      }
    }
  )

  test(
    'rebinds the composition after client-side navigation without duplicating marks',
    { tag: ['@critical', '@e2e', '@MAP-E2E-002'] },
    async ({ page }) => {
      const homePage = new HomePage(page)
      const mapPage = new MapPage(page)
      const firstMap = mapFixtures[0]
      const nextMap = mapFixtures[1]

      await homePage.goto()
      await expect(homePage.compositionPreviews).toHaveCount(mapFixtures.length)
      await expect(homePage.compositionPreviews.first()).toHaveCSS(
        'view-transition-name',
        transitionName('map-composition', firstMap.slug)
      )
      await homePage.getMapCard(firstMap.title).click()
      await expect(page).toHaveURL(`/${firstMap.slug}`)
      await mapPage.waitForViewportReady()
      await expect(mapPage.marks).toHaveCount(marksFor(firstMap.id).length)
      await expect(mapPage.getCompositionPreview(firstMap.slug).locator('img')).toHaveCSS(
        'view-transition-name',
        transitionName('map-composition', firstMap.slug)
      )
      await expect(page.getByRole('heading', { name: firstMap.title, exact: true })).toHaveCSS(
        'view-transition-name',
        transitionName('map-title', firstMap.slug)
      )

      await expect(mapPage.getRailLink(nextMap.slug).locator('[data-map-composition-preview]')).toHaveCSS(
        'view-transition-name',
        transitionName('map-composition', nextMap.slug)
      )
      await mapPage.getRailLink(nextMap.slug).click()
      await expect(page).toHaveURL(`/${nextMap.slug}`)
      await mapPage.waitForViewportReady()
      await expect(mapPage.marks).toHaveCount(marksFor(nextMap.id).length)
      await expect(mapPage.getCompositionPreview(nextMap.slug).locator('img')).toHaveCSS(
        'view-transition-name',
        transitionName('map-composition', nextMap.slug)
      )
      await expect(page.getByRole('heading', { name: nextMap.title, exact: true })).toHaveCSS(
        'view-transition-name',
        transitionName('map-title', nextMap.slug)
      )
    }
  )

  test(
    'keeps the destination preview and usable overlays visible while cold target layers are delayed',
    { tag: ['@critical', '@e2e', '@MAP-E2E-COLD'] },
    async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      const session = await context.newCDPSession(page)
      const trace = new ChromiumNetworkTrace(session)
      let releaseLayers: (() => void) | undefined
      const layersReleased = new Promise<void>((resolve) => {
        releaseLayers = resolve
      })

      try {
        await trace.enable(true)
        const mapPage = new MapPage(page)
        const target = mapFixtures[1]
        await mapPage.goto(mapFixtures[0].slug)
        await mapPage.waitForViewportReady()
        const targetLayers = await destinationLayerUrls(page, target.slug)
        const delayedUrls = new Set<string>()
        await page.route('**/*', async (route) => {
          if (targetLayers.has(route.request().url())) {
            delayedUrls.add(route.request().url())
            await layersReleased
          }
          await route.continue()
        })
        await mapPage.getRailLink(target.slug).click({ noWaitAfter: true })
        await expect(page).toHaveURL(`/${target.slug}`)
        await expect.poll(() => delayedUrls.size).toBeGreaterThan(0)

        const preview = mapPage.getCompositionPreview(target.slug)
        await expect(preview).toBeVisible()
        await expect(mapPage.marks.first().locator('.sound-mark__circle')).toBeVisible()
        await expect(mapPage.pathSvg.first()).toBeVisible()
        await expect(mapPage.viewport).not.toHaveAttribute('data-scene-ready', 'true')

        releaseLayers?.()
        await expect(mapPage.viewport).toHaveAttribute('data-scene-ready', 'true')
        await expect(preview).toHaveCSS('opacity', '0')
      } finally {
        releaseLayers?.()
        await session.detach().catch(() => undefined)
        await context.close()
      }
    }
  )

  test(
    'accepts warm destination reuse only with correlated Chromium browser-cache zero-byte evidence',
    { tag: ['@critical', '@e2e', '@MAP-E2E-WARM'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const session = await page.context().newCDPSession(page)
      const trace = new ChromiumNetworkTrace(session)

      try {
        await trace.enable(false)
        const target = mapFixtures[1]
        await mapPage.goto(mapFixtures[0].slug)
        await mapPage.waitForViewportReady()
        const profile = await mapPage.getRailPreviewProfile(target.slug)
        const candidates = responsiveCandidates(profile, page)

        await mapPage.getRailLink(target.slug).hover()
        const warmed = await trace.waitForCandidate(candidates)
        const navigationCursor = trace.cursor()
        await mapPage.getRailLink(target.slug).click({ noWaitAfter: true })
        await expect(page).toHaveURL(`/${target.slug}`)
        await expect(mapPage.viewport).toHaveAttribute('data-scene-ready', 'true')

        const destinationCurrentSrc = await mapPage
          .getCompositionPreview(target.slug)
          .locator('img')
          .evaluate((image) => (image as HTMLImageElement).currentSrc)
        expect(destinationCurrentSrc).toBe(warmed.request.url)

        const postNavigation = trace.candidateRequestsAfter(candidates, navigationCursor)
        const invalidCandidateRequests = postNavigation.filter(
          (request) => !isBrowserCacheZeroTransfer(trace.evidenceFor(request.requestId))
        )
        if (postNavigation.length === 0) {
          expect(postNavigation, 'the destination profile was reused without a second browser request').toHaveLength(0)
        } else {
          expect(
            invalidCandidateRequests,
            'every destination-profile request must be browser-cached with zero bytes'
          ).toEqual([])
        }
      } finally {
        await session.detach().catch(() => undefined)
      }
    }
  )

  test('rejects CDN or Vercel HIT headers without Chromium browser-cache evidence', () => {
    expect(
      isBrowserCacheZeroTransfer({
        servedFromCache: false,
        response: { fromServiceWorker: false },
        encodedDataLength: 0
      })
    ).toBe(false)
  })

  test(
    'preserves preview fallback and usable overlays after base failure',
    { tag: ['@high', '@e2e', '@MAP-E2E-003'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const target = mapFixtures[1]
      await mapPage.goto(mapFixtures[0].slug)
      await mapPage.waitForViewportReady()
      const [baseUrl] = await destinationLayerUrls(page, target.slug)
      await page.route(baseUrl!, (route) =>
        route.fulfill({ status: 200, contentType: 'image/webp', body: 'invalid image' })
      )
      await mapPage.getRailLink(target.slug).click({ noWaitAfter: true })
      await expect(page).toHaveURL(`/${target.slug}`)
      await expect(mapPage.viewport).toHaveAttribute('data-composition-status', 'error')
      await expect(mapPage.compositionErrors).toContainText('Map image failed to decode')
      await expect(mapPage.getCompositionPreview(target.slug)).toBeVisible()
      await expect(mapPage.marks.first().locator('.sound-mark__circle')).toBeVisible()
      await expect(mapPage.pathSvg.first()).toBeVisible()
    }
  )

  test(
    'keyboard focus reaches a sound button and plays it (fan is always visible)',
    { tag: ['@high', '@e2e', '@MAP-E2E-004'] },
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id)[0]

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const group = mapPage.getSoundMark(mark.id)

      // The mark circle is a decorative disc (not focusable); the sound
      // buttons are the interactive elements and are reachable directly.
      await expect(group.locator('.sound-mark__circle')).toHaveAttribute('aria-hidden', 'true')
      await expect(group).not.toHaveAttribute('data-open')

      // The first sound button takes focus; Space plays the sound.
      const button = mapPage.getSoundButton(mark.id, mark.sounds[0].id)
      await button.focus()
      await expect(button).toBeFocused()
      await button.press('Space')
      await expect(button).toHaveAttribute('data-state', /playing|paused|buffering/, {
        timeout: 5000
      })

      const effectActive = await page.evaluate(async () => {
        const base =
          'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>')
        const view = document.createElement('map-view')
        // The engine derives its viewport size from the live host, so a bare
        // element appended to <body> needs explicit dimensions (the real page
        // provides them via the flex layout of .map-wrapper).
        view.style.width = '400px'
        view.style.height = '300px'
        view.setAttribute('reduced-motion', 'true')
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
        )
        // With declared `map-layers`, composition is built synchronously: the
        // ready event fires during `appendChild`, so the listener must be
        // registered before the element is connected.
        const ready = new Promise<void>((resolve) =>
          view.addEventListener('map-composition-ready', () => resolve(), { once: true })
        )
        document.body.appendChild(view)
        await ready
        return view.querySelector('[data-map-layer="effect"]')?.getAttribute('data-effect-active')
      })
      expect(effectActive).toBe('false')
    }
  )

  test('sidebar navigation returns to home', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    await mapPage.goto(mapFixtures[0].slug)

    await page.getByRole('link', { name: 'Inicio' }).click()

    await expect(page).toHaveURL('/')
    const homePage = new HomePage(page)
    await expect(homePage.heading).toBeVisible()
  })

  test(
    'renders all marks for the active map with mark-coordinate geometry',
    { tag: ['@critical', '@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const marks = marksFor(map.id)

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      await expect(mapPage.marks).toHaveCount(marks.length)
      await expect(mapPage.soundButtons).toHaveCount(marks.reduce((acc, m) => acc + m.sounds.length, 0))

      for (const mark of marks) {
        // The group div is a zero-size positioning container; the visible
        // element is the 56px circle button inside it.
        await expect(mapPage.getSoundMark(mark.id).locator('.sound-mark__circle')).toBeVisible()
      }

      // Coordinate assert on the group CSS vars.
      const mark = marks[0]
      const position = await mapPage.getMarkPosition(mark.id)
      expect(position.x).toBe(Math.round((mark.position.x / 100) * position.imageWidth))
      expect(position.y).toBe(Math.round((mark.position.y / 100) * position.imageHeight))
    }
  )

  test(
    'tooltip follows the rule: rendered iff the mark has a title or a location, shown below the mark',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const marks = marksFor(map.id)

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      // Business rule (data-agnostic): the mark renders its tooltip exactly
      // when it has a title or a location — legacy/placeholder marks with
      // neither must not produce an empty hover box.
      for (const mark of marks) {
        const tooltip = mapPage.getSoundMark(mark.id).locator('.sound-mark__tooltip')
        const expected = mark.title || mark.location ? 1 : 0
        await expect(tooltip).toHaveCount(expected)
      }

      // On a mark that has content, hovering the pin shows the tooltip below
      // the mark's geometric centre-bottom, with the present fields included.
      const informative = marks.find((mark) => mark.title || mark.location)
      if (!informative) return

      const group = mapPage.getSoundMark(informative.id)
      const tooltip = group.locator('.sound-mark__tooltip')

      // Hover the pin: the tooltip activates from either the head or the tail
      // (the tail reaches lower than the group origin and would otherwise
      // intercept the head's hover zone).
      await group.locator('.sound-mark__tail').hover()

      await expect(tooltip).toBeVisible()
      if (informative.title) {
        await expect(tooltip).toContainText(informative.title)
      }
      if (informative.location) {
        await expect(tooltip).toContainText(informative.location)
      }
      // Description is optional: only render/assert when present.
      if (informative.description) {
        await expect(tooltip).toContainText(informative.description)
      }

      const groupBox = await group.boundingBox()
      const tooltipBox = await tooltip.boundingBox()
      expect(groupBox).not.toBeNull()
      expect(tooltipBox).not.toBeNull()
      expect(tooltipBox!.y).toBeGreaterThanOrEqual(groupBox!.y + groupBox!.height / 2)

      await expect(group).not.toHaveAttribute('data-open')
    }
  )

  test('zoom buttons change the map scale', { tag: ['@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    await mapPage.goto(mapFixtures[0].slug)
    await mapPage.waitForViewportReady()

    const initialZoom = await mapPage.getZoom()

    await mapPage.zoomInButton.click()
    let zoomedInZoom = initialZoom
    await expect(async () => {
      zoomedInZoom = await mapPage.getZoom()
      expect(zoomedInZoom).toBeGreaterThan(initialZoom)
    }).toPass({ timeout: 2000 })

    await mapPage.zoomOutButton.click()
    await expect(async () => {
      const zoom = await mapPage.getZoom()
      expect(zoom).toBeLessThan(zoomedInZoom)
    }).toPass({ timeout: 2000 })
  })

  test(
    'declared minimum zoom leaves valid empty viewport space for undersized content',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      await mapPage.goto(mapFixtures[0].slug)
      await mapPage.waitForViewportReady()

      for (let click = 0; click < 10; click += 1) {
        await mapPage.zoomOutButton.click()
      }

      // The minimum zoom is fit-relative: `md` factor (0.8) × fit scale.
      const viewportBox = (await mapPage.viewport.boundingBox())!
      const image = await mapPage.getImageSize()
      const fit = Math.min(viewportBox.width / image.width, viewportBox.height / image.height)
      const mdFactor = 0.8
      await expect.poll(() => mapPage.getZoom()).toBeCloseTo(mdFactor * fit, 5)
      const bounds = await mapPage.getBounds()
      expect(bounds.image.left).toBeGreaterThanOrEqual(bounds.viewport.left - 1)
      expect(bounds.image.right).toBeLessThanOrEqual(bounds.viewport.right + 1)
      expect(bounds.image.top).toBeGreaterThanOrEqual(bounds.viewport.top - 1)
      expect(bounds.image.bottom).toBeLessThanOrEqual(bounds.viewport.bottom + 1)
    }
  )

  test(
    'off-center wheel zoom keeps layers aligned and clamps only at viewport edges',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      await mapPage.goto(mapFixtures[0].slug)
      await mapPage.waitForViewportReady()

      const initialZoom = await mapPage.getZoom()
      const viewportBox = await mapPage.viewport.boundingBox()
      expect(viewportBox).not.toBeNull()
      const cursor = {
        x: viewportBox!.x + viewportBox!.width * 0.75,
        y: viewportBox!.y + viewportBox!.height * 0.3
      }
      await page.mouse.move(cursor.x, cursor.y)
      await page.mouse.wheel(0, -400)

      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(initialZoom)
      const alignment = await page.evaluate(() => {
        const scene = document.querySelector('.map-panzoom')
        const world = document.querySelector('.map-world')
        const image = scene?.querySelector('img')
        const mark = document.querySelector('[data-testid="sound-mark"]')
        const path = document.querySelector('.path-base')
        const svg = path?.closest('svg')
        return {
          sceneTransform: scene?.getAttribute('style') ?? '',
          worldTransform: world?.getAttribute('style') ?? '',
          sharedSceneContainment: [image, mark?.parentElement, mark, svg, path].every(
            (element) => element !== null && element !== undefined && scene?.contains(element) === true
          )
        }
      })
      // The static interaction surface stays untransformed; the pan/zoom
      // transform (and thus the zoomed alignment) now lives on the world.
      expect(alignment.sceneTransform).not.toContain('translate3d')
      expect(alignment.worldTransform).toContain('translate3d')
      expect(alignment.sharedSceneContainment).toBe(true)
    }
  )

  test(
    'wheel zoom and pointer drag keep an oversized map within viewport edges',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      await mapPage.goto(mapFixtures[0].slug)
      await mapPage.waitForViewportReady()

      const viewportBox = await mapPage.viewport.boundingBox()
      expect(viewportBox).not.toBeNull()
      const center = {
        x: viewportBox!.x + viewportBox!.width / 2,
        y: viewportBox!.y + viewportBox!.height / 2
      }
      await page.mouse.move(center.x, center.y)
      for (let wheel = 0; wheel < 12; wheel += 1) {
        await page.mouse.wheel(0, -1200)
      }
      // Zoom caps are per-breakpoint factors over the fitted scale (the map
      // page caps `md` at 1.5×fit), so an absolute ceiling like 0.9 is wrong
      // for desktop. Assert the wheel zoomed the map beyond the fit baseline
      // (the map becomes oversized), which is what the drag/clamp checks
      // afterwards require.
      const image = await mapPage.getImageSize()
      const fit = Math.min(viewportBox!.width / image.width, viewportBox!.height / image.height)
      await expect.poll(() => mapPage.getZoom()).toBeGreaterThan(fit)

      await page.mouse.move(center.x, center.y)
      await page.mouse.down()
      await page.mouse.move(center.x + 2000, center.y + 2000, { steps: 5 })
      await page.mouse.up()

      await expect
        .poll(async () => {
          const bounds = await mapPage.getBounds()
          return {
            coversLeft: bounds.image.left <= bounds.viewport.left + 1,
            coversTop: bounds.image.top <= bounds.viewport.top + 1
          }
        })
        .toEqual({ coversLeft: true, coversTop: true })
    }
  )

  test(
    'max zoom keeps sound buttons collision-free and drags never activate audio',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)

      for (const map of mapFixtures) {
        await mapPage.goto(map.slug)
        await mapPage.waitForViewportReady()
        const resetCounters = await mapPage.installGestureCounters()

        // All interactions happen at the maximum zoom level: that is the
        // user's intuitive way to separate marks that collide at fit zoom.
        const maxScale = await mapPage.zoomToMax()
        const boxes = await mapPage.getSoundButtonBoxes()

        // Invariant: at max zoom no two sound buttons may overlap. If they
        // still collide at max zoom, zooming cannot separate them — a severe
        // UI/data error.
        const overlaps: string[] = []
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i]
            const b = boxes[j]
            const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
            const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
            if (ox > 0 && oy > 0) {
              overlaps.push(`button#${i} and button#${j}: ${ox.toFixed(1)}x${oy.toFixed(1)}px`)
            }
          }
        }
        expect(
          overlaps,
          `map ${map.slug} at max zoom (${maxScale.toFixed(2)}): ${overlaps.join('; ') || 'none'}`
        ).toEqual([])

        // Every sound button visible and not covered by chrome at max zoom
        // must pan the map when dragged and never activate audio. Buttons
        // under the nav/rail/controls strips are not reachable by the user at
        // this zoom level, so they are excluded from the interaction probe
        // (their collision state is still asserted above).
        const viewportBox = await mapPage.getViewportBox()
        const railBox = await mapPage.rightRail.boundingBox()
        const navBox = await page.locator('aside').first().boundingBox()
        const controlsBox = await mapPage.mapControls.boundingBox()
        const isInside = (
          x: number,
          y: number,
          box: { x: number; y: number; width: number; height: number } | null,
          pad = 0
        ): boolean =>
          box !== null &&
          x >= box.x - pad &&
          x <= box.x + box.width + pad &&
          y >= box.y - pad &&
          y <= box.y + box.height + pad
        const visible = boxes
          .map((box, index) => ({ box, index }))
          .filter(({ box }) => {
            const cx = box.x + box.w / 2
            const cy = box.y + box.h / 2
            return (
              cx >= viewportBox.x &&
              cx <= viewportBox.x + viewportBox.w &&
              cy >= viewportBox.y &&
              cy <= viewportBox.y + viewportBox.h &&
              !isInside(cx, cy, railBox, 4) &&
              !isInside(cx, cy, navBox, 4) &&
              !isInside(cx, cy, controlsBox, 4)
            )
          })
        expect(visible.length).toBeGreaterThan(0)

        for (const { box, index } of visible) {
          await resetCounters()
          const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
          await page.mouse.move(center.x, center.y)
          await page.mouse.down()
          await page.mouse.move(center.x + 50, center.y + 40, { steps: 6 })
          await page.mouse.up()

          await expect
            .poll(() => mapPage.getViewportDrags(), {
              message: `map ${map.slug} button #${index}: drag must pan the map`
            })
            .toBeGreaterThan(0)

          const activations = await mapPage.getSoundActivations()
          expect(activations, `map ${map.slug} button #${index}: drag must not activate audio`).toBe(0)
        }
      }
    }
  )

  test('center button resets the map view', { tag: ['@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    await mapPage.goto(mapFixtures[0].slug)
    await mapPage.waitForViewportReady()

    const initialZoom = await mapPage.getZoom()
    let zoomedInZoom = initialZoom
    await mapPage.zoomInButton.click()
    await expect(async () => {
      zoomedInZoom = await mapPage.getZoom()
      expect(zoomedInZoom).toBeGreaterThan(initialZoom)
    }).toPass({ timeout: 2000 })

    await mapPage.centerMapButton.click()
    await expect(async () => {
      const zoom = await mapPage.getZoom()
      expect(zoom).toBeLessThan(zoomedInZoom)
    }).toPass({ timeout: 2000 })
  })

  test('right rail shows inactive maps and navigates on click', { tag: ['@critical', '@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    const activeMap = mapFixtures[0]
    const inactiveMaps = mapFixtures.filter((m) => m.slug !== activeMap.slug)

    await mapPage.goto(activeMap.slug)
    await mapPage.waitForViewportReady()

    await expect(mapPage.rightRail).toBeVisible()
    await expect(mapPage.railLinks).toHaveCount(inactiveMaps.length)
    const railBounds = await mapPage.rightRail.boundingBox()
    const viewport = page.viewportSize()
    expect(railBounds).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(railBounds!.x + railBounds!.width).toBeLessThanOrEqual(viewport!.width)

    const target = inactiveMaps[0]
    await mapPage.getRailLink(target.slug).click()
    await expect(page).toHaveURL(`/${target.slug}`)
  })

  test('connects marks with dashed path lines by mark ids', { tag: ['@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    const map = mapFixtures[0]
    const expectedPaths = PATHS.filter((path) => path.mapId === map.id)

    await mapPage.goto(map.slug)
    await mapPage.waitForViewportReady()

    await expect(mapPage.pathSvg).toHaveCount(expectedPaths.length)

    const firstPath = mapPage.pathSvg.first()
    await expect(firstPath).toHaveClass(/path-base/)
  })

  test(
    'the sound button toggles playback while the fan stays always visible',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id)[0]
      const firstSound = mark.sounds[0]

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const group = mapPage.getSoundMark(mark.id)
      const button = mapPage.getSoundButton(mark.id, firstSound.id)

      // No fan toggle: the button is directly interactive.
      await expect(group).not.toHaveAttribute('data-open')

      // The sound button toggles playback without any mark toggle.
      await button.click()
      await expect(button).toHaveAttribute('data-state', /playing|paused|buffering/, {
        timeout: 5000
      })

      // The mark paints its active accent while any sound plays.
      await expect(group).toHaveAttribute('data-state', 'active')
    }
  )

  test(
    'mark shows an active accent only when one of its sounds is engaged in playback',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const marks = marksFor(map.id)
      const selected = marks[0]
      const sibling = marks[1]
      const selectedSound = selected.sounds[0]

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const selectedGroup = mapPage.getSoundMark(selected.id)
      const siblingGroup = mapPage.getSoundMark(sibling.id)

      await expect(selectedGroup).toHaveAttribute('data-state', 'idle')
      await expect(siblingGroup).toHaveAttribute('data-state', 'idle')

      await mapPage.getSoundButton(selected.id, selectedSound.id).click()
      await expect(selectedGroup).toHaveAttribute('data-state', 'active')
      await expect(siblingGroup).toHaveAttribute('data-state', 'idle')
    }
  )

  test('mark aria contract: decorative disc + labelled always-visible fan', { tag: ['@e2e'] }, async ({ page }) => {
    const mapPage = new MapPage(page)
    const map = mapFixtures[0]
    const mark = marksFor(map.id)[0]

    await mapPage.goto(map.slug)
    await mapPage.waitForViewportReady()

    const group = mapPage.getSoundMark(mark.id)
    const circle = group.locator('.sound-mark__circle')
    const fan = group.locator('.sound-mark__fan')

    // New contract: the disc is decorative (aria-hidden) and the fan is a
    // labelled group that is always exposed — no open/closed aria state.
    await expect(circle).toHaveAttribute('aria-hidden', 'true')
    await expect(circle).not.toHaveAttribute('aria-expanded')
    await expect(circle).not.toHaveAttribute('aria-controls')
    await expect(fan).toHaveAttribute('role', 'group')
    await expect(fan).toHaveAttribute('aria-label', mark.title)
    await expect(fan).not.toHaveAttribute('aria-hidden')
    await expect(group).not.toHaveAttribute('data-open')
  })

  test(
    'sound buttons copy the mark title label and expose the 30px progress ring',
    { tag: ['@e2e'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id).find((m) => m.sounds.length > 1)

      if (!mark) {
        throw new Error(`Map ${map.slug} has no mark with multiple sounds`)
      }

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const group = mapPage.getSoundMark(mark.id)

      // The fan needs no toggle — buttons are visible and interactive.
      await expect(group).not.toHaveAttribute('data-open')

      // Design D7: sounds 2..n reuse the mark title/description/location as
      // the default copy (product copy pending); aria-label = mark.title so
      // labels are never empty.
      for (const sound of mark.sounds) {
        const button = mapPage.getSoundButton(mark.id, sound.id)
        await expect(button).toBeVisible()
        await expect(button).toHaveAttribute('aria-label', mark.title)
      }

      // The progress ring targets the 30px sound button perimeter.
      const firstSound = mark.sounds[0]
      const ring = await mapPage.getSoundButton(mark.id, firstSound.id).evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          progress: Number.parseFloat(style.getPropertyValue('--progress')),
          width: style.width,
          height: style.height
        }
      })
      expect(ring.progress).toBeGreaterThanOrEqual(0)
      expect(ring.progress).toBeLessThanOrEqual(100)
      expect(ring.width).toBe('30px')
      expect(ring.height).toBe('30px')
    }
  )

  test(
    'bottom player renders only when the sound piece system is enabled and stays in idle mode',
    { tag: ['@e2e', '@audio'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id)[0]

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      if (!map.soundPieceEnabled) {
        await expect(mapPage.bottomPlayer).toHaveCount(0)
        return
      }

      await expect(mapPage.bottomPlayer).toBeVisible()
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle')

      // The fan needs no toggle — the sound button is directly clickable.
      await mapPage.getSoundButton(mark.id, mark.sounds[0].id).click()

      await expect(mapPage.bottomPlayer).toBeVisible()
      await expect(mapPage.bottomPlayer).toHaveAttribute('data-mode', 'idle')
    }
  )

  test(
    'streams map sounds through native lifecycle states and retries with reset ring geometry',
    { tag: ['@high', '@e2e', '@audio', '@AUDIO-E2E-001'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id).find((candidate) => candidate.sounds.length > 1)

      if (!mark) {
        throw new Error(`Map ${map.slug} has no mark with independent sound buttons`)
      }

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const firstButton = mapPage.getSoundButton(mark.id, mark.sounds[0].id)
      const secondButton = mapPage.getSoundButton(mark.id, mark.sounds[1].id)
      await firstButton.click()

      const audio = page.locator('audio')
      await expect(audio).toHaveCount(1)

      await audio.dispatchEvent('waiting')
      await expect(firstButton).toHaveAttribute('data-status', 'buffering')
      await expect(firstButton.locator('.sound-button__rings')).toHaveCSS('opacity', '1')
      await expect(firstButton.locator('.sound-button__icon--spinner')).toHaveCSS('opacity', '1')

      await audio.dispatchEvent('playing')
      await expect(firstButton).toHaveAttribute('data-status', 'playing')

      await firstButton.click()
      await expect(firstButton).toHaveAttribute('data-status', 'paused')
      await expect(firstButton.locator('.sound-button__rings')).toHaveCSS('opacity', '1')

      await audio.dispatchEvent('error')
      await expect(firstButton).toHaveAttribute('data-status', 'error')
      await expect(firstButton.locator('.sound-button__rings')).toHaveCSS('opacity', '0')
      await expect(firstButton.locator('.sound-button__icon--error')).toHaveCSS('opacity', '1')

      await firstButton.evaluate((button) => {
        const transitions: Array<{ status: string; progress: string; bufferProgress: string }> = []
        new MutationObserver(() => {
          const status = button.getAttribute('data-status')
          if (status !== null) {
            transitions.push({
              status,
              progress: button.style.getPropertyValue('--progress'),
              bufferProgress: button.style.getPropertyValue('--buffer-progress')
            })
          }
        }).observe(button, { attributes: true, attributeFilter: ['data-status', 'style'] })
        ;(
          window as Window & {
            __audioStatusTransitions?: Array<{ status: string; progress: string; bufferProgress: string }>
          }
        ).__audioStatusTransitions = transitions
      })
      await firstButton.click()
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                window as Window & {
                  __audioStatusTransitions?: Array<{ status: string; progress: string; bufferProgress: string }>
                }
              ).__audioStatusTransitions
          )
        )
        .toContainEqual({ status: 'loading', progress: '0%', bufferProgress: '0%' })

      await secondButton.click()
      await expect(audio).toHaveCount(2)
      await audio.first().dispatchEvent('ended')
      await expect(firstButton).toHaveAttribute('data-status', 'ended')
      await expect(audio).toHaveCount(1)
      await audio.dispatchEvent('waiting')
      await expect(secondButton).toHaveAttribute('data-status', 'buffering')
      await expect(firstButton).toHaveAttribute('data-status', 'ended')
    }
  )

  test(
    'serves bounded byte ranges for the deployed AAC and Opus streaming assets',
    { tag: ['@high', '@e2e', '@audio', '@external', '@AUDIO-E2E-002'] },
    async ({ request }) => {
      const assets = [
        {
          name: 'AAC',
          url: 'https://cdn.marcasonora.cl/1/1/sonidos/1/streaming/Ruta_1_Punto_1_Sonido_1_Binaural_norm.m4a',
          contentType: /^audio\/(mp4|x-m4a)$/
        },
        {
          name: 'Opus',
          url: 'https://cdn.marcasonora.cl/1/1/sonidos/1/streaming/Ruta_1_Punto_1_Sonido_1_Binaural_norm.opus',
          contentType: /^audio\/(ogg|opus)$/
        }
      ]

      for (const asset of assets) {
        const response = await request.get(asset.url, { headers: { Range: 'bytes=0-1023' } })
        const contentRange = response.headers()['content-range']
        const acceptRanges = response.headers()['accept-ranges']
        const body = await response.body()

        expect(response.status(), `${asset.name} must honor the Range request`).toBe(206)
        expect(contentRange).toMatch(/^bytes 0-(?:1023|\d{1,3})\/\d+$/)
        if (acceptRanges !== undefined) expect(acceptRanges).toBe('bytes')
        expect(response.headers()['content-type']).toMatch(asset.contentType)

        const rangeMatch = contentRange.match(/^bytes (\d+)-(\d+)\/(\d+)$/)
        expect(rangeMatch).not.toBeNull()
        expect(body).toHaveLength(Number(rangeMatch![2]) - Number(rangeMatch![1]) + 1)
      }
    }
  )

  test(
    'uses native ordered fallback from an unsupported primary to the deployed Opus source',
    { tag: ['@high', '@e2e', '@audio', '@AUDIO-E2E-003'] },
    async ({ page }) => {
      const fallbackUrl =
        'https://cdn.marcasonora.cl/1/1/sonidos/1/streaming/Ruta_1_Punto_1_Sonido_1_Binaural_norm.opus'

      // Chromium supports the real AAC source. This fixture proves native ordered
      // fallback mechanics under an unsupported primary; DOM tests prove AAC-first/Opus-second production order.
      const outcome = await page.evaluate(async (fallback) => {
        const audio = document.createElement('audio')
        const unsupportedPrimary = document.createElement('source')
        const opusFallback = document.createElement('source')
        const unsupportedMime = 'audio/x-unsupported'

        audio.preload = 'metadata'
        audio.style.display = 'none'
        unsupportedPrimary.src = 'https://example.invalid/unsupported-primary.audio'
        unsupportedPrimary.type = unsupportedMime
        opusFallback.src = fallback
        opusFallback.type = 'audio/ogg; codecs=opus'
        audio.append(unsupportedPrimary, opusFallback)
        document.body.append(audio)

        try {
          const event = await new Promise<'canplay' | 'error'>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error('Timed out waiting for audio fallback')), 15_000)
            const cleanup = (): void => {
              window.clearTimeout(timeout)
              audio.removeEventListener('canplay', onCanPlay)
              audio.removeEventListener('error', onError)
            }
            const onCanPlay = (): void => {
              cleanup()
              resolve('canplay')
            }
            const onError = (): void => {
              cleanup()
              resolve('error')
            }

            audio.addEventListener('canplay', onCanPlay, { once: true })
            audio.addEventListener('error', onError, { once: true })
            audio.load()
          })

          return {
            event,
            unsupportedCanPlayType: audio.canPlayType(unsupportedMime),
            currentSrc: audio.currentSrc,
            readyState: audio.readyState
          }
        } finally {
          audio.remove()
        }
      }, fallbackUrl)

      expect(outcome.unsupportedCanPlayType).toBe('')
      expect(outcome.event).toBe('canplay')
      expect(outcome.currentSrc).toBe(fallbackUrl)
      expect(outcome.readyState).toBeGreaterThanOrEqual(3)
    }
  )

  test(
    'renders the S9 ring colors, caps, full buffer, and spinner motion',
    { tag: ['@high', '@e2e', '@audio', '@AUDIO-E2E-004'] },
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const mapPage = new MapPage(page)
      const map = mapFixtures[0]
      const mark = marksFor(map.id)[0]

      await mapPage.goto(map.slug)
      await mapPage.waitForViewportReady()

      const button = mapPage.getSoundButton(mark.id, mark.sounds[0].id)
      const outcome = await button.evaluate(async (element) => {
        const ringStyle = (role: string) => getComputedStyle(element.querySelector(`[data-role="${role}"]`)!)
        const spinner = element.querySelector<HTMLElement>('.sound-button__icon--spinner')!
        const spinnerTransforms: Record<string, [string, string]> = {}

        for (const status of ['loading', 'ready', 'buffering']) {
          element.setAttribute('data-state', status)
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          const before = getComputedStyle(spinner).transform
          await new Promise((resolve) => window.setTimeout(resolve, 150))
          spinnerTransforms[status] = [before, getComputedStyle(spinner).transform]
        }

        const buffer = element.querySelector<SVGCircleElement>('[data-role="buffer"]')!
        buffer.setAttribute('stroke-dasharray', '100 100')
        return {
          base: { stroke: ringStyle('base').stroke, linecap: ringStyle('base').strokeLinecap },
          buffer: {
            stroke: ringStyle('buffer').stroke,
            linecap: ringStyle('buffer').strokeLinecap,
            dasharray: buffer.getAttribute('stroke-dasharray')
          },
          progress: { stroke: ringStyle('progress').stroke, linecap: ringStyle('progress').strokeLinecap },
          spinnerTransforms
        }
      })

      expect(outcome.progress).toEqual({ stroke: 'rgb(178, 34, 34)', linecap: 'round' })
      expect(outcome.base).toEqual({ stroke: 'rgba(255, 255, 255, 0.25)', linecap: 'butt' })
      expect(outcome.buffer).toEqual({
        stroke: 'rgba(255, 255, 255, 0.45)',
        linecap: 'butt',
        dasharray: '100 100'
      })
      for (const transforms of Object.values(outcome.spinnerTransforms)) {
        expect(transforms[1]).not.toBe(transforms[0])
      }
    }
  )

  test(
    'headphones notice shows on first visit, dismisses on tap and never reappears',
    { tag: ['@critical', '@e2e', '@NOTICE-E2E-001'] },
    async ({ page }) => {
      const mapPage = new MapPage(page)
      const homePage = new HomePage(page)
      const firstMap = mapFixtures[0]
      const nextMap = mapFixtures[1]

      await homePage.goto()
      const destinationTextOpacity = page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            document.addEventListener(
              'astro:after-swap',
              () => {
                const text = document.querySelector<HTMLElement>('[data-headphones-notice-text]')
                resolve(text ? getComputedStyle(text).opacity : 'missing')
              },
              { once: true }
            )
          })
      )
      await homePage.getMapCard(firstMap.title).click()
      await expect(page).toHaveURL(`/${firstMap.slug}`)

      const notice = page.locator('#headphones-notice')
      await expect(notice).toBeVisible()
      await expect(notice).toContainText('Se recomienda el uso de audífonos')
      const noticeText = notice.locator('[data-headphones-notice-text]')
      await expect.poll(() => destinationTextOpacity).toBe('0')
      await expect.poll(() => notice.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')

      await noticeText.evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished))
      })
      await expect(noticeText).toHaveCSS('opacity', '1')

      // Tapping anywhere on the overlay dismisses it and persists the flag.
      await notice.click()
      await expect(notice).toHaveCount(0)
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem('cartografias:headphones-notice')))
        .toBe('dismissed')

      // Navigating to another map never shows the notice again.
      await mapPage.getRailLink(nextMap.slug).click()
      await expect(page.locator('#headphones-notice')).toHaveCount(0)
      await expect(mapPage.viewport).toHaveAttribute('data-ready', 'true')
    }
  )
})
