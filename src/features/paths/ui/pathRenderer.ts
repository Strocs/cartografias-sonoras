import { buildRoundedPathD } from '../lib/pathEngine'

import type { PathVisualState } from '../domain/PathVisualState'

const SVG_NS = 'http://www.w3.org/2000/svg'
/** Dash length in screen pixels for the segmented path stroke. */
const DASH_LENGTH = 14
/** Gap between consecutive dashes, in screen pixels. */
const DASH_GAP = 8
const PATH_CLASS_BASE = 'path-base'
const DIRECTION_ATTR = 'data-path-direction'
const DASH_PERIOD_VAR = '--path-dash-period'

/** Maps a PathVisualState variant to the legacy CSS class used by the React PathOverlay. */
const VARIANT_LEGACY_CLASS: Record<PathVisualState['variant'], string> = {
  idle: 'path-idle',
  single: 'path-single',
  both: 'path-both'
}

/** Maps a PathVisualState variant to the BEM-style CSS class used by pathRenderer. */
const VARIANT_BEM_CLASS: Record<PathVisualState['variant'], string> = {
  idle: 'path--idle',
  single: 'path--single',
  both: 'path--both'
}

/**
 * Renders or updates SVG `<path>` elements for the supplied visual states.
 *
 * Existing path elements are reused (identified by `data-path-id`) so geometry
 * is computed once per path model. A path is a single dashed stroke whose
 * geometry (rounded corners) is shared by every state (`idle`, `single`,
 * `both`), so switching states never jumps the route line.
 *
 * `scaleFactor` is the inverse of the current viewport zoom. `vector-effect`
 * only normalizes stroke-width: dash lengths are always resolved in the
 * current user coordinate system, so the dash pattern is scaled by
 * `scaleFactor` to keep it visually constant (14px dashes, 4px gaps) at any
 * zoom, mirroring the stroke compensation the marker layer already uses.
 *
 * Direction is carried by `data-path-direction` (`forward`/`backward`) so the
 * CSS animation can slide the dashes toward the non-playing endpoint while the
 * `both` variant stays static.
 */
export function renderPaths(
  pathStates: PathVisualState[],
  svgElement: SVGSVGElement,
  imgWidth: number,
  imgHeight: number,
  scaleFactor: number = 1
): void {
  const existingPaths = new Map<number, SVGPathElement>()
  for (const pathEl of svgElement.querySelectorAll('path[data-path-id]')) {
    const id = Number(pathEl.getAttribute('data-path-id'))
    if (!Number.isNaN(id)) {
      existingPaths.set(id, pathEl as SVGPathElement)
    }
  }

  const activeIds = new Set<number>()

  for (const state of pathStates) {
    if (state.points.length < 2) continue

    activeIds.add(state.pathId)

    const d = buildRoundedPathD(state.points, imgWidth, imgHeight)
    if (d === '') continue

    const pathEl = existingPaths.get(state.pathId) ?? createPathElement()
    if (pathEl.parentNode !== svgElement) {
      svgElement.appendChild(pathEl)
    }

    const legacyClass = VARIANT_LEGACY_CLASS[state.variant]
    const bemClass = VARIANT_BEM_CLASS[state.variant]
    pathEl.setAttribute('d', d)
    pathEl.setAttribute('data-testid', 'map-path')
    pathEl.setAttribute('data-path-id', String(state.pathId))
    pathEl.setAttribute('vector-effect', 'non-scaling-stroke')
    pathEl.setAttribute('class', `${PATH_CLASS_BASE} ${legacyClass} ${bemClass}`)

    // Remove inline overrides so CSS classes take effect, then re-apply any
    // explicit style config if present.
    pathEl.removeAttribute('stroke')
    pathEl.removeAttribute('stroke-opacity')
    pathEl.removeAttribute('stroke-width')
    pathEl.removeAttribute('fill')

    if (state.style !== undefined) {
      applyPathStyle(pathEl, state.style)
    }

    const { dashArray, period } = resolveDashPattern(state.style, scaleFactor)
    pathEl.setAttribute('stroke-dasharray', dashArray)
    pathEl.style.setProperty(DASH_PERIOD_VAR, `${period}px`)

    if (state.variant === 'single') {
      pathEl.setAttribute(DIRECTION_ATTR, state.activeEndpoint === 'start' ? 'forward' : 'backward')
    } else {
      pathEl.removeAttribute(DIRECTION_ATTR)
    }
  }

  // Drop paths that are no longer present in the visual state list.
  for (const [id, pathEl] of existingPaths) {
    if (!activeIds.has(id)) {
      pathEl.remove()
    }
  }
}

/** Removes every path element from the SVG layer. */
export function clearPaths(svgElement: SVGSVGElement): void {
  for (const pathEl of svgElement.querySelectorAll('path[data-path-id]')) {
    pathEl.remove()
  }
}

function createPathElement(): SVGPathElement {
  return document.createElementNS(SVG_NS, 'path')
}

function applyPathStyle(pathEl: SVGPathElement, style: NonNullable<PathVisualState['style']>): void {
  if (style.strokeColor !== undefined) {
    pathEl.setAttribute('stroke', style.strokeColor)
  }
  if (style.strokeWidth !== undefined) {
    pathEl.setAttribute('stroke-width', String(style.strokeWidth))
  }
}

interface DashPattern {
  dashArray: string
  period: number
}

/**
 * Resolves the dash pattern. The default keeps dashes visually constant
 * (14px/4px) by scaling the pattern with `scaleFactor`; an explicit
 * `style.dashArray` is honored as-is (user units, caller-controlled).
 */
function resolveDashPattern(style: PathVisualState['style'], scaleFactor: number): DashPattern {
  if (style?.dashArray !== undefined) {
    const values = style.dashArray
      .trim()
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    const period = values.reduce((sum, value) => sum + value, 0)
    if (period > 0) {
      return { dashArray: style.dashArray, period: round2(period) }
    }
  }

  const factor = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1
  return {
    dashArray: `${round2(DASH_LENGTH * factor)} ${round2(DASH_GAP * factor)}`,
    period: round2((DASH_LENGTH + DASH_GAP) * factor)
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}
