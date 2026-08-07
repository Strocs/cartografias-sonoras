import type { ViewportState } from './types'

export const SNAP_BACK_DURATION_MS = 180
export const SNAP_BACK_EASING = 'cubic-bezier(0.22,1,0.36,1)'
export const WHEEL_SCALE_COEFFICIENT = 0.002
export const MAX_WHEEL_EVENT_DELTA = 120
export const WHEEL_INPUT_DURATION_MS = 96
export const WHEEL_SETTLE_DEBOUNCE_MS = 80
export const WHEEL_SETTLE_DURATION_MS = 140
export const MAX_SCALE_OVERSHOOT_RATIO = 1.08

export const WHEEL_STAGE = {
  SMOOTHING: 'smoothing',
  WAITING: 'waiting',
  SETTLING: 'settling'
} as const

export type WheelStage = (typeof WHEEL_STAGE)[keyof typeof WHEEL_STAGE]

export interface ViewportTransition {
  from: ViewportState
  to: ViewportState
  durationMs: number
  easing: typeof SNAP_BACK_EASING
}

function assertState(state: ViewportState): void {
  if (![state.x, state.y, state.scale].every(Number.isFinite) || state.scale <= 0) {
    throw new Error('transition state must be finite with a positive scale')
  }
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3
}

export function clampWheelDelta(delta: number): number {
  if (!Number.isFinite(delta)) return 0
  return Math.min(Math.max(delta, -MAX_WHEEL_EVENT_DELTA), MAX_WHEEL_EVENT_DELTA)
}

export function createSnapBack(from: ViewportState, to: ViewportState, reducedMotion: boolean): ViewportTransition {
  assertState(from)
  assertState(to)
  return {
    from: { ...from },
    to: { ...to },
    durationMs: reducedMotion ? 0 : SNAP_BACK_DURATION_MS,
    easing: SNAP_BACK_EASING
  }
}

export function createWheelTransition(from: ViewportState, to: ViewportState, durationMs: number): ViewportTransition {
  assertState(from)
  assertState(to)
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('durationMs must be finite and non-negative')
  return { from: { ...from }, to: { ...to }, durationMs, easing: SNAP_BACK_EASING }
}

export function interpolate(transition: ViewportTransition, elapsedMs: number): ViewportState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('elapsedMs must be finite and non-negative')
  if (transition.durationMs === 0 || elapsedMs >= transition.durationMs) return { ...transition.to }
  const progress = easeOutCubic(elapsedMs / transition.durationMs)
  return {
    x: transition.from.x + (transition.to.x - transition.from.x) * progress,
    y: transition.from.y + (transition.to.y - transition.from.y) * progress,
    scale: transition.from.scale + (transition.to.scale - transition.from.scale) * progress
  }
}

export function isReducedMotion(mediaQuery = '(prefers-reduced-motion: reduce)'): boolean {
  return (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(mediaQuery).matches
  )
}
