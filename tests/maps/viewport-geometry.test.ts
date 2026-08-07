import { describe, expect, it } from 'vitest'

import {
  MAX_SCALE_OVERSHOOT_RATIO,
  applyScaleResistance,
  clampScale,
  computeFit,
  computeStrictBounds,
  projectFocal,
  projectToStrictTranslation
} from '../../src/features/maps/lib/viewport/geometry'

describe('viewport geometry', () => {
  it('fits content and preserves a focal content point', () => {
    expect(computeFit({ width: 400, height: 300 }, { width: 800, height: 400 })).toEqual({ x: 0, y: 50, scale: 0.5 })
    expect(projectFocal({ x: -100, y: -50, scale: 1 }, { x: 200, y: 150 }, 2)).toEqual({ x: -400, y: -250, scale: 2 })
  })

  it('uses symmetric bounded logarithmic scale resistance', () => {
    const min = 0.5
    const max = 4
    expect(applyScaleResistance(2, min, max)).toBe(2)
    expect(applyScaleResistance(Number.MAX_VALUE, min, max)).toBeLessThanOrEqual(max * MAX_SCALE_OVERSHOOT_RATIO)
    expect(applyScaleResistance(Number.MIN_VALUE, min, max)).toBeGreaterThanOrEqual(min / MAX_SCALE_OVERSHOOT_RATIO)
    expect(applyScaleResistance(max * 1.04, min, max) / max).toBeCloseTo(
      min / applyScaleResistance(min / 1.04, min, max)
    )
  })

  it('keeps temporary overscale while strictly projecting translation only', () => {
    const state = { x: 100, y: -500, scale: 4.1 }
    const bounds = computeStrictBounds({ width: 400, height: 300 }, { width: 800, height: 600 }, state.scale)
    expect(projectToStrictTranslation(state, bounds)).toEqual({ x: 0, y: -500, scale: 4.1 })
    expect(clampScale(9, 0.5, 4)).toBe(4)
  })
})
