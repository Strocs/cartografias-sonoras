/**
 * Shared play/pause SVG icon assets for the Mark circle and sound buttons.
 *
 * Each factory returns a fresh `<svg>` element so callers can adopt it without
 * worrying about document ownership across repeated creation (e.g. per mark or
 * per sound button in a fan).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function createSvgIcon(pathData: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'currentColor')
  svg.setAttribute('aria-hidden', 'true')

  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', pathData)
  svg.appendChild(path)

  return svg
}

export function createPlayIcon(): SVGSVGElement {
  return createSvgIcon('M8 5v14l11-7z')
}

export function createPauseIcon(): SVGSVGElement {
  return createSvgIcon('M6 19h4V5H6v14zm8-14v14h4V5h-4z')
}

export function createSpinnerIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')

  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '12')
  circle.setAttribute('r', '8')
  circle.setAttribute('stroke', 'currentColor')
  circle.setAttribute('stroke-width', '3')
  circle.setAttribute('stroke-linecap', 'round')
  circle.setAttribute('stroke-dasharray', '32 18')
  svg.appendChild(circle)
  return svg
}

export function createErrorIcon(): SVGSVGElement {
  return createSvgIcon('M12 2 1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z')
}
