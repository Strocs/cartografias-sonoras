import { describe, expect, it } from 'vitest'

import { buildPolylineD, reversePoints } from '../../src/features/paths/lib/pathEngine'

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
