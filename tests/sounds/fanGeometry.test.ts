import { describe, expect, it } from 'vitest'

import {
  computeFanRadius,
  computeFanSlots,
  computeFanStepDeg,
  FAN_GEOMETRY_DEFAULTS,
  FAN_RADIUS_DEFAULTS
} from '../../src/features/sounds/ui/fanGeometry'
import { SOUND_VISIBLE_SIZE } from '../../src/features/sounds/ui/soundButton'

const R = 100
const S = 90
// Magnitude of the dx/dy offsets in the slanted layouts (r·cos(45°)).
const D = Math.cos((Math.PI / 180) * 45) * R

describe('computeFanRadius', () => {
  it('derives the radius from mark radius + sound radius + explicit head gap', () => {
    expect(computeFanRadius({ markRadius: 22, soundRadius: 18, headGap: -4 })).toBe(36)
  })

  it('uses defaults: mark radius + default sound radius + accepted head gap', () => {
    const { markRadius, soundRadius, headGap } = FAN_RADIUS_DEFAULTS
    expect(computeFanRadius()).toBe(markRadius + soundRadius + headGap)
    expect(computeFanRadius()).toBe(35)
  })

  it('recomputes when the sound disc size changes (independent of mark)', () => {
    const bigger = computeFanRadius({ soundRadius: 24 })
    const smaller = computeFanRadius({ soundRadius: 12 })
    expect(bigger).toBeGreaterThan(smaller)
    expect(bigger - smaller).toBe(12)
  })
})

describe('computeFanSlots', () => {
  it('places a single slot on the top-center axis', () => {
    const slots = computeFanSlots(1, { radius: R, stepDeg: S })

    expect(slots).toHaveLength(1)
    expect(slots[0].dx).toBeCloseTo(0, 6)
    expect(slots[0].dy).toBeCloseTo(-R, 6)
  })

  it('splits two slots symmetrically about the top-center axis (± stepDeg/2)', () => {
    const slots = computeFanSlots(2, { radius: R, stepDeg: S })

    expect(slots).toHaveLength(2)
    // k = ±0.5 → θ = -135° / -45°: dx = ±(r·cos(45°)), dy = -(r·cos(45°)).
    expect(slots[0].dx).toBeCloseTo(-D, 6)
    expect(slots[1].dx).toBeCloseTo(D, 6)
    expect(slots[0].dy).toBeCloseTo(-D, 6)
    expect(slots[1].dy).toBeCloseTo(-D, 6)
  })

  it('lays out three slots left→right at -s, 0, +s', () => {
    const slots = computeFanSlots(3, { radius: R, stepDeg: S })

    expect(slots).toHaveLength(3)
    // k = -1, 0, 1 → θ = -180°, -90°, 0°.
    expect(slots[0].dx).toBeCloseTo(-R, 6)
    expect(slots[0].dy).toBeCloseTo(0, 6)
    expect(slots[1].dx).toBeCloseTo(0, 6)
    expect(slots[1].dy).toBeCloseTo(-R, 6)
    expect(slots[2].dx).toBeCloseTo(R, 6)
    expect(slots[2].dy).toBeCloseTo(0, 6)
  })

  it('lays out four slots symmetrically (± s/2, ± 3s/2 offset)', () => {
    const slots = computeFanSlots(4, { radius: R, stepDeg: S })

    expect(slots).toHaveLength(4)
    // k = -1.5, -0.5, 0.5, 1.5 → dx = ±(r·cos(45°)); dy mirrors around top-center.
    const dxs = slots.map((slot) => slot.dx)
    const dys = slots.map((slot) => slot.dy)

    // Left→right (non-decreasing dx) order must be preserved.
    for (let i = 1; i < dxs.length; i++) {
      expect(dxs[i]).toBeGreaterThanOrEqual(dxs[i - 1])
    }

    // Symmetric magnitudes around the vertical axis.
    expect(slots[0].dx).toBeCloseTo(-D, 6)
    expect(slots[1].dx).toBeCloseTo(-D, 6)
    expect(slots[2].dx).toBeCloseTo(D, 6)
    expect(slots[3].dx).toBeCloseTo(D, 6)
    expect(dys[0]).toBeCloseTo(D, 6)
    expect(dys[1]).toBeCloseTo(-D, 6)
    expect(dys[2]).toBeCloseTo(-D, 6)
    expect(dys[3]).toBeCloseTo(D, 6)
  })

  it('preserves the array order left→right for larger layouts (default step)', () => {
    const slots = computeFanSlots(5)
    const dxs = slots.map((slot) => slot.dx)

    for (let i = 1; i < dxs.length; i++) {
      expect(dxs[i]).toBeGreaterThanOrEqual(dxs[i - 1])
    }
  })

  it('is symmetric around the vertical axis (odd and even)', () => {
    const slots = computeFanSlots(4, { radius: R, stepDeg: S })
    expect(slots[0].dx).toBeCloseTo(-slots[3].dx, 6)
    expect(slots[1].dx).toBeCloseTo(-slots[2].dx, 6)
  })

  it('uses the derived default radius and soundGap-derived step when options are omitted', () => {
    const slots = computeFanSlots(1)

    expect(slots[0].dx).toBeCloseTo(0, 6)
    expect(slots[0].dy).toBeCloseTo(-computeFanRadius(), 6)
  })

  it('rejects a count below one', () => {
    expect(() => computeFanSlots(0)).toThrow('at least one slot')
    expect(() => computeFanSlots(-1)).toThrow('at least one slot')
  })
})

describe('computeFanStepDeg', () => {
  it('converts a chord equal to the radius into a 60 degree step', () => {
    // chord = r → 2·asin(1/2) = 60°.
    expect(computeFanStepDeg(100, 100)).toBeCloseTo(60, 6)
  })

  it('degrades an oversized chord toward 180 degrees without NaN', () => {
    expect(computeFanStepDeg(10, 2000)).toBeCloseTo(180, 6)
  })
})

describe('decoupled head gap vs sound gap', () => {
  it('changing the head gap moves the radius but not the angular step', () => {
    const small = computeFanRadius({ headGap: 0 }) // 15 + 16 + 0 = 31
    const large = computeFanRadius({ headGap: 20 }) // 15 + 16 + 20 = 51
    expect(large).toBeGreaterThan(small)

    const step = 50
    const a = computeFanSlots(3, { radius: small, stepDeg: step })
    const b = computeFanSlots(3, { radius: large, stepDeg: step })
    for (let i = 0; i < 3; i++) {
      // Same angular step, radius scaled linearly.
      expect(b[i].dx).toBeCloseTo((a[i].dx / small) * large, 6)
      expect(b[i].dy).toBeCloseTo((a[i].dy / small) * large, 6)
    }
  })

  it('changing the sound gap changes the angular step but not the radius', () => {
    const radius = 60
    const tight = computeFanSlots(2, { radius, soundGap: 10 })
    const wide = computeFanSlots(2, { radius, soundGap: 80 })

    // Both stay on the ring of radius `radius` (no radius change).
    expect(Math.hypot(tight[0].dx, tight[0].dy)).toBeCloseTo(radius, 6)
    expect(Math.hypot(wide[0].dx, wide[0].dy)).toBeCloseTo(radius, 6)
    // Wider chord → wider spread along dx.
    expect(Math.abs(wide[0].dx)).toBeGreaterThan(Math.abs(tight[0].dx))
  })

  it('a single sound stays stable on the top-center axis regardless of gaps', () => {
    for (const options of [{ radius: R, soundGap: 10 }, { radius: R, soundGap: 90 }, { radius: 40 }]) {
      const [slot] = computeFanSlots(1, options)
      expect(slot.dx).toBeCloseTo(0, 6)
      expect(slot.dy).toBeCloseTo(-(options.radius ?? R), 6)
    }
  })

  it('defaults the sound gap to the visible sound diameter', () => {
    expect(FAN_GEOMETRY_DEFAULTS.soundGap).toBe(SOUND_VISIBLE_SIZE)
  })
})
