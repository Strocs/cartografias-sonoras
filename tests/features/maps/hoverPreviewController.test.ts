import { afterEach, describe, expect, it } from 'vitest'

import { installHoverPreviewController } from '../../../src/features/maps/ui/hoverPreviewController'

const PROFILE = {
  src: '/_astro/preview-1600.hash.webp',
  srcset: '/_astro/preview-640.hash.webp 640w, /_astro/preview-1600.hash.webp 1600w',
  sizes: '100vw'
} as const

const RAIL_THUMBNAIL_PROFILE = {
  src: '/_astro/preview-620.hash.webp',
  srcset: '/_astro/preview-620.hash.webp 620w',
  sizes: '(min-width: 768px) 9rem, 7rem'
} as const

function createMapCard(profile = PROFILE): HTMLAnchorElement {
  const card = document.createElement('a')
  card.dataset.previewSrc = profile.src
  card.dataset.previewSrcset = profile.srcset
  card.dataset.previewSizes = profile.sizes
  document.body.append(card)
  return card
}

function enter(card: Element): void {
  card.dispatchEvent(new Event('pointerenter', { bubbles: false }))
}

function focus(card: Element): void {
  card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

function previewPreloads(): HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[data-hover-preview-preload]'))
}

afterEach(() => {
  document.body.replaceChildren()
  document.head
    .querySelectorAll('[data-hover-preview-preload], [data-unrelated-preload]')
    .forEach((element) => element.remove())
})

describe('installHoverPreviewController', () => {
  it('captures pointerenter and creates a native responsive image preload', () => {
    installHoverPreviewController()
    const card = createMapCard()

    enter(card)

    expect(previewPreloads()).toHaveLength(1)
    expect(previewPreloads()[0]).toMatchObject({
      rel: 'preload',
      as: 'image',
      href: new URL(PROFILE.src, window.location.href).href
    })
    expect(previewPreloads()[0]?.getAttribute('imagesrcset')).toBe(PROFILE.srcset)
    expect(previewPreloads()[0]?.getAttribute('imagesizes')).toBe(PROFILE.sizes)
  })

  it('preloads the destination profile on keyboard focus, not the 620w rail thumbnail profile', () => {
    installHoverPreviewController()
    const card = createMapCard(PROFILE)

    focus(card)

    expect(previewPreloads()).toHaveLength(1)
    expect(previewPreloads()[0]).toMatchObject({
      href: new URL(PROFILE.src, window.location.href).href,
      imageSrcset: PROFILE.srcset,
      imageSizes: PROFILE.sizes
    })
    expect(previewPreloads()[0]?.getAttribute('imagesrcset')).not.toBe(RAIL_THUMBNAIL_PROFILE.srcset)
  })

  it('does not preload a destination before pointer or keyboard intent', () => {
    installHoverPreviewController()
    createMapCard()

    expect(previewPreloads()).toHaveLength(0)
  })

  it('ignores incomplete card metadata', () => {
    installHoverPreviewController()
    const card = document.createElement('a')
    card.dataset.previewSrc = PROFILE.src
    document.body.append(card)

    enter(card)

    expect(previewPreloads()).toHaveLength(0)
  })

  it('deduplicates repeated entry and re-rendered cards without touching unrelated preloads', () => {
    installHoverPreviewController()
    const unrelated = document.createElement('link')
    unrelated.rel = 'preload'
    unrelated.as = 'font'
    unrelated.dataset.unrelatedPreload = 'true'
    document.head.append(unrelated)

    const firstCard = createMapCard()
    enter(firstCard)
    enter(firstCard)
    enter(firstCard)
    firstCard.remove()

    enter(createMapCard())

    expect(previewPreloads()).toHaveLength(1)
    expect(document.head.querySelectorAll('[data-unrelated-preload]')).toHaveLength(1)
  })

  it('installs only one capture listener', () => {
    installHoverPreviewController()
    installHoverPreviewController()

    enter(createMapCard())

    expect(previewPreloads()).toHaveLength(1)
  })
})
