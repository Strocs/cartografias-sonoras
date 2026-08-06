import { describe, expect, it } from 'vitest';

import {
  computeFanRadius,
  computeFanSlots,
  FAN_RADIUS_DEFAULTS
} from '../../src/features/sounds/ui/fanGeometry';

const R = 100;
const S = 90;
// Magnitude of the dx/dy offsets in the slanted layouts (r·cos(45°)).
const D = Math.cos((Math.PI / 180) * 45) * R;

describe('computeFanRadius', () => {
  it('derives the radius from mark radius + sound radius + explicit gap', () => {
    expect(computeFanRadius({ markRadius: 22, soundRadius: 18, gap: -4 })).toBe(
      36
    );
  });

  it('uses defaults: mark radius + default sound radius + accepted overlap', () => {
    const { markRadius, soundRadius, gap } = FAN_RADIUS_DEFAULTS;
    expect(computeFanRadius()).toBe(markRadius + soundRadius + gap);
    expect(computeFanRadius()).toBe(36);
  });

  it('recomputes when the sound disc size changes (independent of mark)', () => {
    const bigger = computeFanRadius({ soundRadius: 24 });
    const smaller = computeFanRadius({ soundRadius: 12 });
    expect(bigger).toBeGreaterThan(smaller);
    expect(bigger - smaller).toBe(12);
  });
});

describe('computeFanSlots', () => {
  it('places a single slot on the top-center axis', () => {
    const slots = computeFanSlots(1, { radius: R, stepDeg: S });

    expect(slots).toHaveLength(1);
    expect(slots[0].dx).toBeCloseTo(0, 6);
    expect(slots[0].dy).toBeCloseTo(-R, 6);
  });

  it('splits two slots symmetrically about the top-center axis (± stepDeg/2)', () => {
    const slots = computeFanSlots(2, { radius: R, stepDeg: S });

    expect(slots).toHaveLength(2);
    // k = ±0.5 → θ = -135° / -45°: dx = ±(r·cos(45°)), dy = -(r·cos(45°)).
    expect(slots[0].dx).toBeCloseTo(-D, 6);
    expect(slots[1].dx).toBeCloseTo(D, 6);
    expect(slots[0].dy).toBeCloseTo(-D, 6);
    expect(slots[1].dy).toBeCloseTo(-D, 6);
  });

  it('lays out three slots left→right at -s, 0, +s', () => {
    const slots = computeFanSlots(3, { radius: R, stepDeg: S });

    expect(slots).toHaveLength(3);
    // k = -1, 0, 1 → θ = -180°, -90°, 0°.
    expect(slots[0].dx).toBeCloseTo(-R, 6);
    expect(slots[0].dy).toBeCloseTo(0, 6);
    expect(slots[1].dx).toBeCloseTo(0, 6);
    expect(slots[1].dy).toBeCloseTo(-R, 6);
    expect(slots[2].dx).toBeCloseTo(R, 6);
    expect(slots[2].dy).toBeCloseTo(0, 6);
  });

  it('lays out four slots symmetrically (± s/2, ± 3s/2 offset)', () => {
    const slots = computeFanSlots(4, { radius: R, stepDeg: S });

    expect(slots).toHaveLength(4);
    // k = -1.5, -0.5, 0.5, 1.5 → dx = ±(r·cos(45°)); dy mirrors around top-center.
    const dxs = slots.map((slot) => slot.dx);
    const dys = slots.map((slot) => slot.dy);

    // Left→right (non-decreasing dx) order must be preserved.
    for (let i = 1; i < dxs.length; i++) {
      expect(dxs[i]).toBeGreaterThanOrEqual(dxs[i - 1]);
    }

    // Symmetric magnitudes around the vertical axis.
    expect(slots[0].dx).toBeCloseTo(-D, 6);
    expect(slots[1].dx).toBeCloseTo(-D, 6);
    expect(slots[2].dx).toBeCloseTo(D, 6);
    expect(slots[3].dx).toBeCloseTo(D, 6);
    expect(dys[0]).toBeCloseTo(D, 6);
    expect(dys[1]).toBeCloseTo(-D, 6);
    expect(dys[2]).toBeCloseTo(-D, 6);
    expect(dys[3]).toBeCloseTo(D, 6);
  });

  it('preserves the array order left→right for larger layouts (default step)', () => {
    const slots = computeFanSlots(5);
    const dxs = slots.map((slot) => slot.dx);

    for (let i = 1; i < dxs.length; i++) {
      expect(dxs[i]).toBeGreaterThanOrEqual(dxs[i - 1]);
    }
  });

  it('is symmetric around the vertical axis (odd and even)', () => {
    const slots = computeFanSlots(4, { radius: R, stepDeg: S });
    expect(slots[0].dx).toBeCloseTo(-slots[3].dx, 6);
    expect(slots[1].dx).toBeCloseTo(-slots[2].dx, 6);
  });

  it('uses the derived default radius and step 50 when options are omitted', () => {
    const slots = computeFanSlots(1);

    expect(slots[0].dx).toBeCloseTo(0, 6);
    expect(slots[0].dy).toBeCloseTo(-computeFanRadius(), 6);
  });

  it('rejects a count below one', () => {
    expect(() => computeFanSlots(0)).toThrow('at least one slot');
    expect(() => computeFanSlots(-1)).toThrow('at least one slot');
  });
});