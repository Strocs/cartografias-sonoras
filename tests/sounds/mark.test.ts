import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { createMark, insertFanButton, removeMark, updateMark } from '../../src/features/sounds/ui/mark'
import { createSoundButton, SOUND_VISIBLE_SIZE } from '../../src/features/sounds/ui/soundButton'
import { computeFanRadius, computeFanSlots } from '../../src/features/sounds/ui/fanGeometry'
import { buildSoundAudioAssetUrls } from '../../src/shared/lib/audio-sources'

import type { Mark } from '../../src/features/sounds/domain/types'

const mark: Mark = {
  id: 101,
  mapId: 1,
  title: 'Fuente central',
  description: 'Agua cayendo',
  location: 'Avenida de Aguirre',
  position: { x: 50, y: 25 },
  sounds: [
    {
      id: 101,
      title: 'Fuente',
      description: null,
      location: '',
      audioSources: buildSoundAudioAssetUrls(1, 1, 1)!.audioSources
    },
    {
      id: 112,
      title: 'Fuente',
      description: null,
      location: '',
      audioSources: buildSoundAudioAssetUrls(1, 1, 2)!.audioSources
    }
  ]
}

function createContainer(): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

describe('createMark', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    container.remove()
  })

  it('returns a group div positioned with translate/scale from mark.position', () => {
    const group = createMark(mark, 800, 600, 0.75)

    expect(group.tagName).toBe('DIV')
    expect(group.classList.contains('sound-mark')).toBe(true)
    expect(group.getAttribute('data-testid')).toBe('sound-mark')
    expect(group.getAttribute('data-mark-id')).toBe('101')
    expect(group.getAttribute('data-map-id')).toBe('1')
    expect(group.getAttribute('data-state')).toBe('idle')
    expect(group.style.transform).toContain('translate(400px, 150px)')
    expect(group.style.transform).toContain('scale(0.75)')
  })

  it('renders a decorative circle disc (no toggle button)', () => {
    const group = createMark(mark, 800, 600)

    const circle = group.querySelector<HTMLElement>('.sound-mark__circle')
    expect(circle).not.toBeNull()
    expect(circle?.tagName).toBe('DIV')
    expect(circle?.getAttribute('aria-hidden')).toBe('true')
    expect(circle?.hasAttribute('aria-expanded')).toBe(false)
    expect(circle?.hasAttribute('aria-controls')).toBe(false)
  })

  it('renders an always-visible fan with one slot per sound and a tooltip below', () => {
    const group = createMark(mark, 800, 600)

    const fan = group.querySelector('.sound-mark__fan')
    expect(fan).not.toBeNull()
    expect(fan?.getAttribute('role')).toBe('group')
    expect(fan?.id).toBe('fan-101')
    expect(fan?.getAttribute('aria-label')).toBe(mark.title)
    expect(fan?.hasAttribute('aria-hidden')).toBe(false)
    expect(fan?.querySelectorAll('.sound-mark__fan-item')).toHaveLength(2)

    // Each slot centers itself on the fan slot: the item box is shifted by
    // half of its own size so the button center lands on (dx, dy) — the fan
    // pivots on the mark circle center at its final (always-visible) radius.
    const firstSlot = fan?.querySelector<HTMLElement>('.sound-mark__fan-item')
    expect(firstSlot?.getAttribute('style')).toContain('translate(-50%, -50%)')
    const expected = computeFanSlots(mark.sounds.length, {
      radius: computeFanRadius({ soundRadius: SOUND_VISIBLE_SIZE / 2 }),
      soundGap: SOUND_VISIBLE_SIZE + 8
    })[0].dx
    expect(firstSlot?.getAttribute('style')).toContain(`translate(${expected}px`)

    const tooltip = group.querySelector<HTMLElement>('.sound-mark__tooltip')
    expect(tooltip).not.toBeNull()
    expect(tooltip?.getAttribute('role')).toBe('tooltip')
    expect(tooltip?.querySelector('.sound-mark__tooltip-title')?.textContent).toBe(mark.title)
    expect(tooltip?.querySelector('.sound-mark__tooltip-description')?.textContent).toBe(mark.description)
    expect(tooltip?.querySelector('.sound-mark__tooltip-location')?.textContent).toBe(mark.location)
  })

  it('circle is inert: a click does not dispatch mark:activate', () => {
    const group = createMark(mark, 800, 600)
    container.appendChild(group)

    const circle = group.querySelector<HTMLElement>('.sound-mark__circle')
    circle?.click()

    // The mark is a passive anchor: no activation event is dispatched.
    expect(group.querySelector('.sound-mark__fan')).not.toBeNull()
  })

  it('does NOT render a tooltip when the mark has no title and no location', () => {
    // Legacy/placeholder marks may carry only sounds (and even a description):
    // without a title or a location there is nothing to show on hover.
    const titleless: Mark = { ...mark, title: '', location: '', description: 'Solo un punto' }
    const group = createMark(titleless, 800, 600)

    expect(group.querySelector('.sound-mark__tooltip')).toBeNull()
    expect(group.querySelector('[role="tooltip"]')).toBeNull()
    // The fan is unaffected.
    expect(group.querySelector('.sound-mark__fan')).not.toBeNull()
  })

  it('renders the tooltip when the mark has only a location (no title)', () => {
    const locationOnly: Mark = { ...mark, title: '', description: null }
    const group = createMark(locationOnly, 800, 600)

    const tooltip = group.querySelector<HTMLElement>('.sound-mark__tooltip')
    expect(tooltip).not.toBeNull()
    expect(tooltip?.querySelector('.sound-mark__tooltip-title')).toBeNull()
    expect(tooltip?.querySelector('.sound-mark__tooltip-location')?.textContent).toBe(mark.location)
    expect(tooltip?.querySelector('.sound-mark__tooltip-description')).toBeNull()
  })
})

describe('updateMark', () => {
  it('applies the group scaleFactor once and toggles active state', () => {
    const group = createMark(mark, 800, 600, 1)

    updateMark(group, { scaleFactor: 0.5, active: true })

    expect(group.style.transform).toContain('scale(0.5)')
    expect(group.style.transform).toContain('translate(400px, 150px)')
    expect(group.getAttribute('data-state')).toBe('active')

    updateMark(group, { active: false })
    expect(group.getAttribute('data-state')).toBe('idle')
  })
})

describe('insertFanButton', () => {
  it('places a sound button into the matching fan slot', () => {
    const group = createMark(mark, 800, 600)
    const fan = group.querySelector<HTMLDivElement>('.sound-mark__fan')
    const button = createSoundButton(mark.sounds[0], mark)

    expect(fan).not.toBeNull()
    if (fan === null) return

    insertFanButton(fan, 0, button)

    expect(fan.children[0]?.contains(button)).toBe(true)
  })
})

describe('removeMark', () => {
  it('removes the group from the DOM', () => {
    const container = createContainer()
    const group = createMark(mark, 800, 600)
    container.appendChild(group)

    removeMark(group)

    expect(container.contains(group)).toBe(false)
  })
})
