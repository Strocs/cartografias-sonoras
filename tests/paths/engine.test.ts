import { describe, expect, it } from 'vitest'

import { buildPolylineD, buildRoundedPathD, reversePoints } from '../../src/features/paths/lib/pathEngine'

describe('pathEngine', () => {
  describe('buildPolylineD', () => {
    it('returns an empty string for zero points', () => {
      expect(buildPolylineD([], 100, 100)).toBe('')
    })

    it('returns an empty string for a single point', () => {
      expect(buildPolylineD([{ x: 50, y: 50 }], 100, 100)).toBe('')
    })

    it('converts percentage points to pixel coordinates', () => {
      const d = buildPolylineD(
        [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ],
        200,
        100
      )

      expect(d).toBe('M 0 0 L 200 100')
    })

    it('produces straight-line commands for multiple points', () => {
      const d = buildPolylineD(
        [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
          { x: 50, y: 60 }
        ],
        100,
        100
      )

      expect(d).toBe('M 10 20 L 30 40 L 50 60')
    })

    it('rounds fractional pixel coordinates', () => {
      const d = buildPolylineD(
        [
          { x: 33.33, y: 66.67 },
          { x: 66.67, y: 33.33 }
        ],
        300,
        300
      )

      expect(d).toBe('M 100 200 L 200 100')
    })

    it('is deterministic for the same input', () => {
      const points = [
        { x: 12.5, y: 87.5 },
        { x: 25.0, y: 50.0 },
        { x: 37.5, y: 12.5 }
      ]

      const first = buildPolylineD(points, 800, 600)
      const second = buildPolylineD(points, 800, 600)

      expect(first).toBe(second)
    })
  })

  describe('buildRoundedPathD', () => {
    it('returns an empty string for fewer than two points', () => {
      expect(buildRoundedPathD([], 100, 100)).toBe('')
      expect(buildRoundedPathD([{ x: 50, y: 50 }], 100, 100)).toBe('')
    })

    it('keeps a two-point path straight', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ],
        200,
        100
      )

      expect(d).toBe('M 0 0 L 200 100')
    })

    it('keeps collinear segments straight (no corner rounding)', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 }
        ],
        100,
        100
      )

      expect(d).toBe('M 0 0 L 50 50 L 100 100')
    })

    it('rounds interior corners, keeping the endpoints exactly on the marks', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ],
        100,
        100
      )

      expect(d).toBe('M 0 0 L 88 0 Q 100 0 100 12 L 100 100')
      expect(d.startsWith('M 0 0 ')).toBe(true)
      expect(d.endsWith('L 100 100')).toBe(true)
    })

    it('limits the corner radius to half the shortest adjacent segment', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 20 }
        ],
        100,
        100
      )

      // Default radius 12 but the outgoing segment is 20px long, so the corner
      // is trimmed to a 10px radius.
      expect(d).toBe('M 0 0 L 70 0 Q 80 0 80 10 L 80 20')
    })

    it('honours an explicit corner radius', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ],
        100,
        100,
        4
      )

      expect(d).toBe('M 0 0 L 96 0 Q 100 0 100 4 L 100 100')
    })

    it('stays straight when the corner radius is zero', () => {
      const d = buildRoundedPathD(
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 }
        ],
        100,
        100,
        0
      )

      expect(d).toBe('M 0 0 L 100 0 L 100 100')
    })

    it('is deterministic for the same input', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 30, y: 0 },
        { x: 60, y: 60 }
      ]

      expect(buildRoundedPathD(points, 100, 100)).toBe(buildRoundedPathD(points, 100, 100))
    })
  })

  describe('reversePoints', () => {
    it('returns a reversed copy without mutating the original', () => {
      const original = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 }
      ]

      const reversed = reversePoints(original)

      expect(reversed).toEqual([
        { x: 5, y: 6 },
        { x: 3, y: 4 },
        { x: 1, y: 2 }
      ])
      expect(original).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 }
      ])
    })

    it('returns an empty array when given an empty array', () => {
      expect(reversePoints([])).toEqual([])
    })
  })
})
