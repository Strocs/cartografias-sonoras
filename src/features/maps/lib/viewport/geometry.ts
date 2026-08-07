import type { ViewportBounds, ViewportPoint, ViewportSize, ViewportState } from './types'

const RESISTANCE_DISTANCE_PX = 48
export const MAX_SCALE_OVERSHOOT_RATIO = 1.08

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`)
}

function assertSize(size: ViewportSize, name: string): void {
  assertFinite(size.width, `${name}.width`)
  assertFinite(size.height, `${name}.height`)
  if (size.width <= 0 || size.height <= 0) throw new Error(`${name} dimensions must be positive`)
}

function assertScaleRange(minScale: number, maxScale: number): void {
  assertFinite(minScale, 'minScale')
  assertFinite(maxScale, 'maxScale')
  if (minScale <= 0 || maxScale < minScale) throw new Error('scale bounds are invalid')
}

function assertState(state: ViewportState): void {
  assertFinite(state.x, 'state.x')
  assertFinite(state.y, 'state.y')
  assertFinite(state.scale, 'state.scale')
  if (state.scale <= 0) throw new Error('state.scale must be positive')
}

export function computeFit(viewport: ViewportSize, content: ViewportSize): ViewportState {
  assertSize(viewport, 'viewport')
  assertSize(content, 'content')

  const scale = Math.min(viewport.width / content.width, viewport.height / content.height)
  return {
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
    scale
  }
}

export function computeStrictBounds(viewport: ViewportSize, content: ViewportSize, scale: number): ViewportBounds {
  assertSize(viewport, 'viewport')
  assertSize(content, 'content')
  assertFinite(scale, 'scale')
  if (scale <= 0) throw new Error('scale must be positive')

  const scaledWidth = content.width * scale
  const scaledHeight = content.height * scale
  const horizontalDifference = viewport.width - scaledWidth
  const verticalDifference = viewport.height - scaledHeight

  return {
    minX: Math.min(0, horizontalDifference),
    maxX: Math.max(0, horizontalDifference),
    minY: Math.min(0, verticalDifference),
    maxY: Math.max(0, verticalDifference)
  }
}

export function clampScale(scale: number, minScale: number, maxScale: number): number {
  assertFinite(scale, 'scale')
  assertScaleRange(minScale, maxScale)
  return Math.min(Math.max(scale, minScale), maxScale)
}

export function projectFocal(state: ViewportState, focal: ViewportPoint, scale: number): ViewportState {
  assertState(state)
  assertFinite(focal.x, 'focal.x')
  assertFinite(focal.y, 'focal.y')
  assertFinite(scale, 'scale')
  if (scale <= 0) throw new Error('scale must be positive')

  const contentX = (focal.x - state.x) / state.scale
  const contentY = (focal.y - state.y) / state.scale
  return { x: focal.x - contentX * scale, y: focal.y - contentY * scale, scale }
}

export function applyResistance(distance: number): number {
  assertFinite(distance, 'distance')
  return Math.sign(distance) * RESISTANCE_DISTANCE_PX * (1 - Math.exp(-Math.abs(distance) / RESISTANCE_DISTANCE_PX))
}

export function applyBoundsResistance(state: ViewportState, bounds: ViewportBounds): ViewportState {
  assertState(state)
  return {
    x:
      state.x < bounds.minX
        ? bounds.minX + applyResistance(state.x - bounds.minX)
        : state.x > bounds.maxX
          ? bounds.maxX + applyResistance(state.x - bounds.maxX)
          : state.x,
    y:
      state.y < bounds.minY
        ? bounds.minY + applyResistance(state.y - bounds.minY)
        : state.y > bounds.maxY
          ? bounds.maxY + applyResistance(state.y - bounds.maxY)
          : state.y,
    scale: state.scale
  }
}

export function applyScaleResistance(requested: number, minScale: number, maxScale: number): number {
  assertFinite(requested, 'requested scale')
  assertScaleRange(minScale, maxScale)
  if (requested >= minScale && requested <= maxScale) return requested

  const bound = requested < minScale ? minScale : maxScale
  const distance = Math.log(requested / bound)
  const limit = Math.log(MAX_SCALE_OVERSHOOT_RATIO)
  return bound * Math.exp(Math.sign(distance) * limit * (1 - Math.exp(-Math.abs(distance) / limit)))
}

export function projectToStrictTranslation(state: ViewportState, bounds: ViewportBounds): ViewportState {
  assertState(state)
  return {
    x: Math.min(Math.max(state.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(state.y, bounds.minY), bounds.maxY),
    scale: state.scale
  }
}

export function projectToStrictBounds(
  state: ViewportState,
  bounds: ViewportBounds,
  minScale: number,
  maxScale: number
): ViewportState {
  assertState(state)
  const scale = clampScale(state.scale, minScale, maxScale)
  return {
    x: Math.min(Math.max(state.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(state.y, bounds.minY), bounds.maxY),
    scale
  }
}
