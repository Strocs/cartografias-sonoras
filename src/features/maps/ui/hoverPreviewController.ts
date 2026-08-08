const CARD_SELECTOR = '[data-preview-src][data-preview-srcset][data-preview-sizes]'
const PRELOAD_SELECTOR = 'link[data-hover-preview-preload]'

let installed = false

export function installHoverPreviewController(): void {
  if (installed) return

  installed = true
  document.addEventListener('pointerenter', preloadHoveredCard, true)
}

function preloadHoveredCard(event: Event): void {
  const card = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(CARD_SELECTOR) : null
  if (!card) return

  const { previewSrc: src, previewSrcset: srcset, previewSizes: sizes } = card.dataset
  if (!src || !srcset || !sizes || hasPreloadedProfile(srcset, sizes)) return

  const preload = document.createElement('link')
  preload.rel = 'preload'
  preload.as = 'image'
  preload.href = src
  preload.imageSrcset = srcset
  preload.imageSizes = sizes
  preload.setAttribute('imagesrcset', srcset)
  preload.setAttribute('imagesizes', sizes)
  preload.dataset.hoverPreviewPreload = 'true'
  preload.dataset.hoverPreviewProfile = `${srcset}\n${sizes}`
  document.head.append(preload)
}

function hasPreloadedProfile(srcset: string, sizes: string): boolean {
  const profile = `${srcset}\n${sizes}`
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>(PRELOAD_SELECTOR)).some(
    (preload) => preload.dataset.hoverPreviewProfile === profile
  )
}
