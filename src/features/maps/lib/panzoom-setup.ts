import Panzoom from '@panzoom/panzoom'
import type { PanzoomObject, PanzoomGlobalOptions } from '@panzoom/panzoom'
import { DEFAULT_MAX_ZOOM } from '../config'

export interface PanzoomInstance {
  panzoom: PanzoomObject
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  destroy: () => void
}

export interface PanPosition {
  x: number
  y: number
}

/** Inclusive screen-coordinate interval in which a content edge may rest. */
export interface PanInterval {
  min: number
  max: number
}

/** Constraint behavior for a transform source. Gesture frames get a finite allowance. */
export interface BoundsMode {
  allowancePx: number
  animate: boolean
}

export interface RectEdges {
  left: number
  right: number
  top: number
  bottom: number
}

export interface TransformBoundsInput {
  viewport: RectEdges
  content: RectEdges
  scale: number
  pan: PanPosition
}

export interface InitPanzoomOptions {
  minScale?: number
  maxScale?: number
  step?: number
  startScale?: number
  startX?: number
  startY?: number
}

const DEFAULT_MIN_SCALE = 0.5
const DEFAULT_STEP = 0.3
export const GESTURE_OVERSCROLL_PX = 48
export const GESTURE_OVERSCROLL_SCALE = 0.15
export const RELEASE_CORRECTION_DURATION_MS = 180

const STRICT_BOUNDS_MODE: BoundsMode = { allowancePx: 0, animate: false }
const RELEASE_BOUNDS_MODE: BoundsMode = { allowancePx: 0, animate: true }

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value)
}

function isValidRect(rect: RectEdges): boolean {
  return Object.values(rect).every(isFiniteNumber) && rect.right > rect.left && rect.bottom > rect.top
}

function normalizePan(pan: PanPosition): PanPosition {
  return { x: isFiniteNumber(pan.x) ? pan.x : 0, y: isFiniteNumber(pan.y) ? pan.y : 0 }
}

interface PointerSample {
  clientX: number
  clientY: number
}

interface PinchGesture {
  firstPointerId: number
  secondPointerId: number
  startDistance: number
  startPan: PanPosition
  startScale: number
  baseLeft: number
  baseTop: number
}

function getPointerDistance(first: PointerSample, second: PointerSample): number {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

function getPointerMidpoint(first: PointerSample, second: PointerSample): PointerSample {
  return {
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculates permitted screen positions for a content axis. Small content is
 * centred at rest; large content must cover the viewport. The allowance is
 * applied only by pointer gesture frames.
 */
export function getPanInterval(
  viewportStart: number,
  viewportEnd: number,
  contentSize: number,
  allowancePx = 0
): PanInterval | null {
  const viewportSize = viewportEnd - viewportStart
  const allowance = Math.max(0, isFiniteNumber(allowancePx) ? allowancePx : 0)

  if (![viewportStart, viewportEnd, contentSize].every(isFiniteNumber) || viewportSize <= 0 || contentSize <= 0) {
    return null
  }

  if (contentSize <= viewportSize) {
    const centeredStart = viewportStart + (viewportSize - contentSize) / 2
    return { min: centeredStart - allowance, max: centeredStart + allowance }
  }

  return {
    min: viewportEnd - contentSize - allowance,
    max: viewportStart + allowance
  }
}

function constrainAxis(currentStart: number, interval: PanInterval, scale: number, pan: number): number {
  const constrainedStart = Math.min(Math.max(currentStart, interval.min), interval.max)
  return pan + (constrainedStart - currentStart) / scale
}

/**
 * Converts a screen-space bounded rectangle back to Panzoom's pre-scale pan.
 * Invalid geometry preserves the prior finite transform so initialization can
 * retry after the next resize instead of propagating NaN into Panzoom.
 */
export function constrainTransform(input: TransformBoundsInput, mode: BoundsMode): PanPosition {
  const pan = normalizePan(input.pan)
  const allowancePx = Math.max(0, isFiniteNumber(mode.allowancePx) ? mode.allowancePx : 0)
  if (!isFiniteNumber(input.scale) || input.scale <= 0 || !isValidRect(input.viewport) || !isValidRect(input.content)) {
    return pan
  }

  const xInterval = getPanInterval(
    input.viewport.left,
    input.viewport.right,
    input.content.right - input.content.left,
    allowancePx
  )
  const yInterval = getPanInterval(
    input.viewport.top,
    input.viewport.bottom,
    input.content.bottom - input.content.top,
    allowancePx
  )
  if (xInterval === null || yInterval === null) return pan

  return {
    x: constrainAxis(input.content.left, xInterval, input.scale, pan.x),
    y: constrainAxis(input.content.top, yInterval, input.scale, pan.y)
  }
}

/** @deprecated Use constrainTransform with an explicit BoundsMode. */
export function getBoundedPan(viewport: RectEdges, content: RectEdges, scale: number, pan: PanPosition): PanPosition {
  return constrainTransform({ viewport, content, scale, pan }, STRICT_BOUNDS_MODE)
}

/**
 * Initializes a Panzoom instance on the given container.
 *
 * The container is the transformable element that wraps the map image and
 * overlays. Wheel zoom is bound to the container's parent so the cursor
 * position is used as the focal point.
 */
export function initPanzoom(
  container: HTMLElement,
  _imgElement: HTMLImageElement,
  options: InitPanzoomOptions = {}
): PanzoomInstance {
  const parent = container.parentElement
  if (parent === null) {
    throw new Error('Panzoom container must have a parent element')
  }

  const startScale = options.startScale ?? 1
  const minScale = Math.min(startScale, options.minScale ?? DEFAULT_MIN_SCALE)

  const panzoomOptions: PanzoomGlobalOptions = {
    cursor: 'grab',
    disablePan: false,
    disableZoom: false,
    noBind: true,
    minScale,
    maxScale: options.maxScale ?? DEFAULT_MAX_ZOOM,
    step: options.step ?? DEFAULT_STEP,
    startScale,
    startX: options.startX ?? 0,
    startY: options.startY ?? 0
  }

  const panzoom = Panzoom(container, panzoomOptions)
  const pointers = new Map<number, PointerSample>()
  let dragStart: PointerSample | null = null
  let dragStartPan: PanPosition | null = null
  let pinch: PinchGesture | null = null
  let destroyed = false
  const previousTouchAction = container.style.touchAction
  container.style.touchAction = 'none'

  const emitTransformEvent = (
    name: 'panzoomstart' | 'panzoomend' | 'panzoomzoom' | 'panzoomreset',
    originalEvent?: Event
  ) => {
    const pan = panzoom.getPan()
    container.dispatchEvent(
      new CustomEvent(name, {
        detail: { x: pan.x, y: pan.y, scale: panzoom.getScale(), originalEvent }
      })
    )
  }

  const getConstrainedPan = (requestedPan: PanPosition, targetScale: number, mode: BoundsMode): PanPosition => {
    const currentPan = panzoom.getPan()
    const currentScale = panzoom.getScale()
    const currentContent = container.getBoundingClientRect()
    if (!isFiniteNumber(currentScale) || currentScale <= 0 || !isFiniteNumber(targetScale) || targetScale <= 0) {
      return normalizePan(currentPan)
    }

    const unscaledWidth = (currentContent.right - currentContent.left) / currentScale
    const unscaledHeight = (currentContent.bottom - currentContent.top) / currentScale
    const baseLeft = currentContent.left - currentPan.x * currentScale
    const baseTop = currentContent.top - currentPan.y * currentScale
    const content = {
      left: baseLeft + requestedPan.x * targetScale,
      right: baseLeft + requestedPan.x * targetScale + unscaledWidth * targetScale,
      top: baseTop + requestedPan.y * targetScale,
      bottom: baseTop + requestedPan.y * targetScale + unscaledHeight * targetScale
    }

    return constrainTransform(
      {
        viewport: parent.getBoundingClientRect(),
        content,
        scale: targetScale,
        pan: requestedPan
      },
      mode
    )
  }

  const panTo = (requestedPan: PanPosition, targetScale: number, mode: BoundsMode, originalEvent?: Event) => {
    const bounded = getConstrainedPan(requestedPan, targetScale, mode)
    const currentScale = panzoom.getScale()
    if (targetScale !== currentScale) {
      panzoom.zoom(targetScale, { animate: false, force: true, silent: true })
    }
    panzoom.pan(bounded.x, bounded.y, {
      animate: mode.animate,
      duration: mode.animate ? RELEASE_CORRECTION_DURATION_MS : undefined,
      force: true
    })
    if (targetScale !== currentScale) emitTransformEvent('panzoomzoom', originalEvent)
  }

  const constrainCurrentTransform = (mode: BoundsMode = STRICT_BOUNDS_MODE) => {
    const currentPan = panzoom.getPan()
    const bounded = getConstrainedPan(currentPan, panzoom.getScale(), mode)
    if (bounded.x === currentPan.x && bounded.y === currentPan.y) return
    panzoom.pan(bounded.x, bounded.y, {
      animate: mode.animate,
      duration: mode.animate ? RELEASE_CORRECTION_DURATION_MS : undefined,
      force: true
    })
  }

  const beginPinch = () => {
    const entries = [...pointers.entries()]
    if (entries.length < 2) return
    const [[firstPointerId, first], [secondPointerId, second]] = entries
    const startDistance = getPointerDistance(first, second)
    const startScale = panzoom.getScale()
    const startPan = panzoom.getPan()
    const content = container.getBoundingClientRect()
    if (startDistance <= 0 || !isFiniteNumber(startScale) || startScale <= 0) return
    pinch = {
      firstPointerId,
      secondPointerId,
      startDistance,
      startScale,
      startPan,
      baseLeft: content.left - startPan.x * startScale,
      baseTop: content.top - startPan.y * startScale
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.preventDefault()
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
    try {
      container.setPointerCapture?.(event.pointerId)
    } catch {
      // Document-level move/end listeners remain the fallback for uncaptured pointers.
    }
    if (pointers.size === 1) {
      dragStart = { clientX: event.clientX, clientY: event.clientY }
      dragStartPan = panzoom.getPan()
      emitTransformEvent('panzoomstart', event)
      return
    }
    beginPinch()
  }

  const onPointerMove = (event: PointerEvent) => {
    const current = pointers.get(event.pointerId)
    if (current === undefined) return
    event.preventDefault()
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
    const gestureMode: BoundsMode = { allowancePx: GESTURE_OVERSCROLL_PX, animate: false }

    if (pointers.size === 1 && dragStart !== null && dragStartPan !== null) {
      const scale = panzoom.getScale()
      if (!isFiniteNumber(scale) || scale <= 0) return
      panTo(
        {
          x: dragStartPan.x + (event.clientX - dragStart.clientX) / scale,
          y: dragStartPan.y + (event.clientY - dragStart.clientY) / scale
        },
        scale,
        gestureMode,
        event
      )
      return
    }

    if (pinch === null) beginPinch()
    if (pinch === null) return
    const first = pointers.get(pinch.firstPointerId)
    const second = pointers.get(pinch.secondPointerId)
    if (first === undefined || second === undefined) return
    const distance = getPointerDistance(first, second)
    if (distance <= 0) return
    const targetScale = clamp(
      pinch.startScale * (distance / pinch.startDistance),
      minScale - GESTURE_OVERSCROLL_SCALE,
      (options.maxScale ?? DEFAULT_MAX_ZOOM) + GESTURE_OVERSCROLL_SCALE
    )
    const midpoint = getPointerMidpoint(first, second)
    const localX = (midpoint.clientX - pinch.baseLeft) / pinch.startScale - pinch.startPan.x
    const localY = (midpoint.clientY - pinch.baseTop) / pinch.startScale - pinch.startPan.y
    panTo(
      {
        x: (midpoint.clientX - pinch.baseLeft) / targetScale - localX,
        y: (midpoint.clientY - pinch.baseTop) / targetScale - localY
      },
      targetScale,
      gestureMode,
      event
    )
  }

  const endGesture = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return
    try {
      container.releasePointerCapture?.(event.pointerId)
    } catch {
      // A cancelled or uncaptured pointer has no capture to release.
    }
    if (pointers.size > 1) {
      beginPinch()
      return
    }
    if (pointers.size === 1) {
      const [remaining] = pointers.values()
      dragStart = remaining
      dragStartPan = panzoom.getPan()
      pinch = null
      return
    }
    dragStart = null
    dragStartPan = null
    pinch = null
    const currentScale = panzoom.getScale()
    const clampedScale = clamp(currentScale, minScale, options.maxScale ?? DEFAULT_MAX_ZOOM)
    panTo(panzoom.getPan(), clampedScale, RELEASE_BOUNDS_MODE, event)
    emitTransformEvent('panzoomend', event)
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const currentScale = panzoom.getScale()
    const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY
    const targetScale = clamp(currentScale * Math.exp(-delta * 0.002), minScale, options.maxScale ?? DEFAULT_MAX_ZOOM)
    const content = container.getBoundingClientRect()
    const currentPan = panzoom.getPan()
    const baseLeft = content.left - currentPan.x * currentScale
    const baseTop = content.top - currentPan.y * currentScale
    const localX = (event.clientX - baseLeft) / currentScale - currentPan.x
    const localY = (event.clientY - baseTop) / currentScale - currentPan.y
    panTo(
      {
        x: (event.clientX - baseLeft) / targetScale - localX,
        y: (event.clientY - baseTop) / targetScale - localY
      },
      targetScale,
      STRICT_BOUNDS_MODE,
      event
    )
  }

  const zoomAtViewportCenter = (factor: number) => {
    const viewport = parent.getBoundingClientRect()
    const currentScale = panzoom.getScale()
    const targetScale = clamp(currentScale * factor, minScale, options.maxScale ?? DEFAULT_MAX_ZOOM)
    const centerEvent = { clientX: viewport.left + viewport.width / 2, clientY: viewport.top + viewport.height / 2 }
    const content = container.getBoundingClientRect()
    const currentPan = panzoom.getPan()
    const baseLeft = content.left - currentPan.x * currentScale
    const baseTop = content.top - currentPan.y * currentScale
    const localX = (centerEvent.clientX - baseLeft) / currentScale - currentPan.x
    const localY = (centerEvent.clientY - baseTop) / currentScale - currentPan.y
    panTo(
      {
        x: (centerEvent.clientX - baseLeft) / targetScale - localX,
        y: (centerEvent.clientY - baseTop) / targetScale - localY
      },
      targetScale,
      STRICT_BOUNDS_MODE
    )
  }

  const reset = () => {
    panTo({ x: options.startX ?? 0, y: options.startY ?? 0 }, startScale, STRICT_BOUNDS_MODE)
    emitTransformEvent('panzoomreset')
  }

  const resizeObserver = new ResizeObserver(() => constrainCurrentTransform())
  resizeObserver.observe(parent)
  constrainCurrentTransform()

  container.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointermove', onPointerMove, { passive: false })
  document.addEventListener('pointerup', endGesture)
  document.addEventListener('pointercancel', endGesture)
  parent.addEventListener('wheel', onWheel, { passive: false })

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    resizeObserver.disconnect()
    container.style.touchAction = previousTouchAction
    container.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', endGesture)
    document.removeEventListener('pointercancel', endGesture)
    parent.removeEventListener('wheel', onWheel)
    panzoom.destroy()
  }

  return {
    panzoom,
    zoomIn: () => zoomAtViewportCenter(1 + (options.step ?? DEFAULT_STEP)),
    zoomOut: () => zoomAtViewportCenter(1 / (1 + (options.step ?? DEFAULT_STEP))),
    reset,
    destroy
  }
}
