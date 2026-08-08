import type { Mark, Sound } from '../domain/types'
import { createErrorIcon, createPauseIcon, createPlayIcon, createSpinnerIcon } from './icons'

const BUTTON_CLASS = 'sound-button'
const PLAY_ICON_CLASS = 'sound-button__icon--play'
const PAUSE_ICON_CLASS = 'sound-button__icon--pause'
const SPINNER_ICON_CLASS = 'sound-button__icon--spinner'
const ERROR_ICON_CLASS = 'sound-button__icon--error'
const RING_SVG_NS = 'http://www.w3.org/2000/svg'

/** Target button diameter (hit area); the progress ring renders at this perimeter. */
export const SOUND_BUTTON_SIZE = 30

/**
 * GLOBAL configurable size (px) of the visible sound disc, independent of the
 * mark size. Exposed to the button's DOM as `--disc-size`; the stylesheet
 * renders the disc from it (replacing the old fixed `inset` derivation).
 * The hit area/ring remain `SOUND_BUTTON_SIZE = 30`.
 */
export const SOUND_VISIBLE_SIZE = 30
export const SOUND_BUTTON_RING_STROKE = 3
export const SOUND_BUTTON_RING_RADIUS = 12

export const SOUND_BUTTON_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  BUFFERING: 'buffering',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error'
} as const

export type SoundButtonStatus = (typeof SOUND_BUTTON_STATUS)[keyof typeof SOUND_BUTTON_STATUS]

export interface SoundButtonUpdate {
  status?: SoundButtonStatus
  progress?: number
  bufferProgress?: number
}

export interface SoundButtonPlaybackValues {
  currentTime: number
  duration: number
  buffered: readonly { start: number; end: number }[]
}

/**
 * Creates a playable sound button inside a Mark's fan.
 *
 * The button carries no tooltip (the Mark group owns the tooltip) and no
 * scale compensation (the group holds the single scaleFactor — design D5).
 * Clicking bubbles `sound:activate {soundId, mapId}`.
 */
export function createSoundButton(sound: Sound, mark: Mark): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = BUTTON_CLASS
  button.setAttribute('data-testid', 'sound-button')
  button.setAttribute('data-sound-id', String(sound.id))
  button.setAttribute('data-map-id', String(mark.mapId))
  button.setAttribute('data-state', 'idle')
  button.setAttribute('aria-label', sound.title)
  button.setAttribute('data-status', 'idle')
  button.setAttribute('data-sound-title', sound.title)
  button.style.setProperty('--progress', '0%')
  button.style.setProperty('--buffer-progress', '0%')
  button.style.width = `${SOUND_BUTTON_SIZE}px`
  button.style.height = `${SOUND_BUTTON_SIZE}px`
  button.style.setProperty('--disc-size', `${SOUND_VISIBLE_SIZE}px`)

  button.appendChild(createProgressRings())
  button.appendChild(createIconSpan(PLAY_ICON_CLASS, createPlayIcon()))
  button.appendChild(createIconSpan(PAUSE_ICON_CLASS, createPauseIcon()))
  button.appendChild(createIconSpan(SPINNER_ICON_CLASS, createSpinnerIcon()))
  button.appendChild(createIconSpan(ERROR_ICON_CLASS, createErrorIcon()))

  const activate = () => {
    button.dispatchEvent(
      new CustomEvent('sound:activate', {
        bubbles: true,
        detail: { soundId: sound.id, mapId: mark.mapId }
      })
    )
  }

  button.addEventListener('click', activate)
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  })

  return button
}

/**
 * Updates a sound button's playback state and progress ring.
 *
 * No scaleFactor — size is constant (the group transform scales the whole fan).
 */
export function updateSoundButton(button: HTMLButtonElement, state: SoundButtonUpdate): void {
  if (state.status !== undefined) {
    button.setAttribute('data-state', state.status)
    button.setAttribute('data-status', state.status)
    button.setAttribute('aria-label', soundButtonAriaLabel(button, state.status))
  }
  if (state.progress !== undefined) {
    const progress = clampPercentage(state.progress)
    button.style.setProperty('--progress', `${progress}%`)
    setRingProgress(button, 'progress', progress)
  }
  if (state.bufferProgress !== undefined) {
    const bufferProgress = clampPercentage(state.bufferProgress)
    button.style.setProperty('--buffer-progress', `${bufferProgress}%`)
    setRingProgress(button, 'buffer', bufferProgress)
  }
}

export function getSoundButtonProgress({ currentTime, duration, buffered }: SoundButtonPlaybackValues): {
  progress: number
  bufferProgress: number
} {
  if (!Number.isFinite(duration) || duration <= 0) return { progress: 0, bufferProgress: 0 }

  const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0
  const bufferedRange = buffered.find(
    ({ start, end }) =>
      Number.isFinite(start) && Number.isFinite(end) && start <= safeCurrentTime && safeCurrentTime <= end
  )

  return {
    progress: clampPercentage((safeCurrentTime / duration) * 100),
    bufferProgress: clampPercentage(((bufferedRange?.end ?? 0) / duration) * 100)
  }
}

/** Removes a sound button from the DOM. */
export function removeSoundButton(button: HTMLButtonElement): void {
  button.remove()
}

function createIconSpan(className: string, svg: SVGSVGElement): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = `sound-button__icon ${className}`
  span.setAttribute('aria-hidden', 'true')
  span.appendChild(svg)
  return span
}

function createProgressRings(): SVGSVGElement {
  const svg = document.createElementNS(RING_SVG_NS, 'svg')
  svg.classList.add('sound-button__rings')
  svg.setAttribute('viewBox', `0 0 ${SOUND_BUTTON_SIZE} ${SOUND_BUTTON_SIZE}`)
  svg.setAttribute('aria-hidden', 'true')
  svg.append(createRing('base'), createRing('buffer'), createRing('progress'))
  return svg
}

function createRing(role: 'base' | 'buffer' | 'progress'): SVGCircleElement {
  const circle = document.createElementNS(RING_SVG_NS, 'circle')
  circle.classList.add('sound-button__ring', `sound-button__ring--${role}`)
  circle.setAttribute('data-role', role)
  circle.setAttribute('cx', String(SOUND_BUTTON_SIZE / 2))
  circle.setAttribute('cy', String(SOUND_BUTTON_SIZE / 2))
  circle.setAttribute('r', String(SOUND_BUTTON_RING_RADIUS))
  circle.setAttribute('pathLength', '100')
  circle.setAttribute('stroke-width', String(SOUND_BUTTON_RING_STROKE))
  circle.setAttribute('transform', `rotate(-90 ${SOUND_BUTTON_SIZE / 2} ${SOUND_BUTTON_SIZE / 2})`)
  if (role !== 'base') circle.setAttribute('stroke-dasharray', '0 100')
  return circle
}

function setRingProgress(button: HTMLButtonElement, role: 'buffer' | 'progress', value: number): void {
  button
    .querySelector<SVGCircleElement>(`.sound-button__ring--${role}`)
    ?.setAttribute('stroke-dasharray', `${value} 100`)
}

function clampPercentage(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
}

function soundButtonAriaLabel(button: HTMLButtonElement, status: SoundButtonStatus): string {
  const title = button.getAttribute('data-sound-title') ?? ''
  const labels: Record<SoundButtonStatus, string> = {
    idle: title,
    loading: `Cargando sonido ${title}`,
    ready: `Sonido listo ${title}`,
    playing: `Reproduciendo sonido ${title}`,
    buffering: `Almacenando sonido ${title}`,
    paused: `Sonido pausado ${title}`,
    ended: title,
    error: `Error al reproducir sonido ${title}`
  }
  return labels[status]
}
