import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AUDIO_STATUS, audioStore } from '../../../src/shared/lib/audio-engine'
import { createInitialState } from '../../../src/shared/lib/audio-engine/engine'
import { buildSoundAudioAssetUrls } from '../../../src/shared/lib/audio-sources'
import { bindMapView } from '../../../src/views/map/mapViewBindings'

import type { MapViewElement } from '../../../src/features/maps/ui/map-view'
import type { Mark } from '../../../src/features/sounds/domain/types'
import type { SoundState } from '../../../src/shared/lib/audio-engine'

const mark: Mark = {
  id: 101,
  mapId: 1,
  title: 'Fuente central',
  description: 'Agua cayendo',
  location: 'Avenida de Aguirre',
  position: { x: 50, y: 25 },
  sounds: [
    {
      id: 110,
      title: 'Fuente',
      description: null,
      location: '',
      audioSources: buildSoundAudioAssetUrls(1, 1, 1)!.audioSources
    }
  ]
}

const IDLE_SOUND: Omit<SoundState, 'status'> = {
  currentTime: 0,
  duration: 0,
  error: null,
  buffered: []
}

function setSoundStatus(soundId: number, status: SoundState['status']): void {
  audioStore.setState((state) => {
    const activeSounds = new Map(state.activeSounds)
    activeSounds.set(soundId, { ...IDLE_SOUND, status })
    return { ...state, activeSounds }
  })
}

function createStubMapView(): MapViewElement {
  const element = document.createElement('div')
  const markerLayer = document.createElement('div')
  const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  Object.defineProperty(element, 'markerLayer', { value: markerLayer, configurable: true })
  Object.defineProperty(element, 'svgLayer', { value: svgLayer, configurable: true })
  Object.defineProperty(element, 'imageWidth', { value: 800, configurable: true })
  Object.defineProperty(element, 'imageHeight', { value: 600, configurable: true })
  Object.defineProperty(element, 'scaleFactor', { value: 1, configurable: true })

  return element as unknown as MapViewElement
}

function findMarkGroup(mapView: MapViewElement): HTMLElement {
  const group = mapView.markerLayer?.querySelector<HTMLElement>('[data-testid="sound-mark"]')
  if (group === null || group === undefined) throw new Error('Mark group not found')
  return group
}

describe('bindMapView mark engagement', () => {
  let unbind: () => void

  beforeEach(() => {
    audioStore.setState(createInitialState())
  })

  afterEach(() => {
    unbind?.()
  })

  it('keeps the mark engaged while its sound is BUFFERING', () => {
    const mapView = createStubMapView()
    unbind = bindMapView({ mapView, marks: [mark], paths: [], imgWidth: 800, imgHeight: 600 })
    const group = findMarkGroup(mapView)

    setSoundStatus(mark.sounds[0]!.id, AUDIO_STATUS.PLAYING)
    expect(group.getAttribute('data-state')).toBe('active')

    setSoundStatus(mark.sounds[0]!.id, AUDIO_STATUS.BUFFERING)
    expect(group.getAttribute('data-state')).toBe('active')
  })

  it('drops the mark engagement once the only sound pauses', () => {
    const mapView = createStubMapView()
    unbind = bindMapView({ mapView, marks: [mark], paths: [], imgWidth: 800, imgHeight: 600 })
    const group = findMarkGroup(mapView)

    setSoundStatus(mark.sounds[0]!.id, AUDIO_STATUS.BUFFERING)
    expect(group.getAttribute('data-state')).toBe('active')

    setSoundStatus(mark.sounds[0]!.id, AUDIO_STATUS.PAUSED)
    expect(group.getAttribute('data-state')).toBe('idle')
  })
})
