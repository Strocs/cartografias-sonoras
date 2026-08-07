import type { Mark, Sound } from '../domain/types'
import { createPauseIcon, createPlayIcon } from './icons'

const BUTTON_CLASS = 'sound-button'
const PLAY_ICON_CLASS = 'sound-button__icon--play'
const PAUSE_ICON_CLASS = 'sound-button__icon--pause'

/** Target button diameter (hit area); the progress ring renders at this perimeter. */
export const SOUND_BUTTON_SIZE = 30

/**
 * GLOBAL configurable size (px) of the visible sound disc, independent of the
 * mark size. Exposed to the button's DOM as `--disc-size`; the stylesheet
 * renders the disc from it (replacing the old fixed `inset` derivation).
 * The hit area/ring remain `SOUND_BUTTON_SIZE = 30`.
 */
export const SOUND_VISIBLE_SIZE = 30

export type SoundButtonStatus = 'idle' | 'playing' | 'paused' | 'loading'

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
  button.style.setProperty('--progress', '0%')
  button.style.width = `${SOUND_BUTTON_SIZE}px`
  button.style.height = `${SOUND_BUTTON_SIZE}px`
  button.style.setProperty('--disc-size', `${SOUND_VISIBLE_SIZE}px`)

  button.appendChild(createIconSpan(PLAY_ICON_CLASS, createPlayIcon()))
  button.appendChild(createIconSpan(PAUSE_ICON_CLASS, createPauseIcon()))

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
export function updateSoundButton(
  button: HTMLButtonElement,
  state: { status?: SoundButtonStatus; progress?: number }
): void {
  if (state.status !== undefined) {
    button.setAttribute('data-state', state.status)
  }
  if (state.progress !== undefined) {
    button.style.setProperty('--progress', `${state.progress}%`)
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
