import { describe, expect, it } from 'vitest'

import { computePathVisualStates } from '../../src/features/paths/services/pathStateEngine'
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine'

import type { Path } from '../../src/features/paths/domain/types'
import type { Mark } from '../../src/features/sounds/domain/types'

const markA: Mark = {
  id: 1,
  mapId: 1,
  title: 'A',
  description: 'Mark A',
  location: 'Start',
  position: { x: 0, y: 0 },
  sounds: [
    { id: 11, title: 'A1', description: '', location: '', audioUrl: '/a1.mp3' },
    { id: 12, title: 'A2', description: '', location: '', audioUrl: '/a2.mp3' }
  ]
}

const markB: Mark = {
  id: 2,
  mapId: 1,
  title: 'B',
  description: 'Mark B',
  location: 'End',
  position: { x: 100, y: 100 },
  sounds: [{ id: 21, title: 'B1', description: '', location: '', audioUrl: '/b1.mp3' }]
}

const path: Path = {
  id: 10,
  mapId: 1,
  waypoints: [{ x: 50, y: 50 }],
  startMarkId: 1,
  endMarkId: 2
}

const marks: Mark[] = [markA, markB]
const marksById = new Map(marks.map((m) => [m.id, m]))

describe('computePathVisualStates', () => {
  it('builds points from mark.position and returns idle when nothing plays', () => {
    const activeSounds = new Map()

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.size).toBe(1)
    expect(result.get(10)?.variant).toBe('idle')
    expect(result.get(10)?.points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ])
  })

  it('treats a mark as playing when ANY of its sounds is playing', () => {
    const activeSounds = new Map([[12, { status: AUDIO_STATUS.PLAYING }]])

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.get(10)?.variant).toBe('single')
    expect(result.get(10)).toMatchObject({
      pathId: 10,
      variant: 'single',
      activeEndpoint: 'start'
    })
  })

  it('returns single with end endpoint when only the end mark has a playing sound', () => {
    const activeSounds = new Map([[21, { status: AUDIO_STATUS.PLAYING }]])

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.get(10)).toMatchObject({
      variant: 'single',
      activeEndpoint: 'end'
    })
  })

  it('returns both when each endpoint mark has a playing sound', () => {
    const activeSounds = new Map([
      [12, { status: AUDIO_STATUS.PLAYING }],
      [21, { status: AUDIO_STATUS.PLAYING }]
    ])

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.get(10)?.variant).toBe('both')
  })

  it('ignores loading and paused statuses when computing visual state', () => {
    const activeSounds = new Map([
      [11, { status: AUDIO_STATUS.LOADING }],
      [21, { status: AUDIO_STATUS.PAUSED }]
    ])

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.get(10)?.variant).toBe('idle')
  })

  it('is idle when playing status only belongs to a non-endpoint sound', () => {
    // markA has two sounds; the endpoint is only "active" when its own sounds
    // are PLAYING. A stray LOADING sound is not enough.
    const activeSounds = new Map([[11, { status: AUDIO_STATUS.LOADING }]])

    const result = computePathVisualStates([path], marksById, activeSounds)

    expect(result.get(10)?.variant).toBe('idle')
  })

  it('skips paths whose endpoint marks are missing', () => {
    const partialMarks = new Map([[1, marks[0]]])
    const activeSounds = new Map()

    const result = computePathVisualStates([path], partialMarks, activeSounds)

    expect(result.size).toBe(0)
  })

  it('maps multiple paths independently', () => {
    const pathB: Path = {
      id: 20,
      mapId: 1,
      waypoints: [],
      startMarkId: 1,
      endMarkId: 2
    }

    const activeSounds = new Map([[12, { status: AUDIO_STATUS.PLAYING }]])

    const result = computePathVisualStates([path, pathB], marksById, activeSounds)

    expect(result.size).toBe(2)
    expect(result.get(10)?.variant).toBe('single')
    expect(result.get(20)?.variant).toBe('single')
  })
})
