import { describe, expect, it } from 'vitest';

import {
  MAX_SCALE_OVERSHOOT_RATIO,
  MAX_WHEEL_EVENT_DELTA,
  WHEEL_INPUT_DURATION_MS,
  WHEEL_SCALE_COEFFICIENT,
  WHEEL_SETTLE_DEBOUNCE_MS,
  WHEEL_SETTLE_DURATION_MS,
  WHEEL_STAGE,
  clampWheelDelta,
  createSnapBack,
  interpolate,
} from '../../src/features/maps/lib/viewport/transitions';

describe('viewport transitions', () => {
  const current = { x: 60, y: -400, scale: 5 };
  const strict = { x: 0, y: -300, scale: 4 };

  it('creates an interruptible deterministic snap-back', () => {
    const transition = createSnapBack(current, strict, false);
    expect(transition.durationMs).toBe(180);
    expect(interpolate(transition, 180)).toEqual(strict);
    expect(interpolate(createSnapBack(current, strict, true), 0)).toEqual(strict);
  });

  it('exports finite wheel stages and corrected deterministic constants', () => {
    expect(WHEEL_STAGE).toEqual({ SMOOTHING: 'smoothing', WAITING: 'waiting', SETTLING: 'settling' });
    expect(WHEEL_SCALE_COEFFICIENT).toBe(0.002);
    expect(MAX_WHEEL_EVENT_DELTA).toBe(120);
    expect(WHEEL_INPUT_DURATION_MS).toBe(96);
    expect(WHEEL_SETTLE_DEBOUNCE_MS).toBe(80);
    expect(WHEEL_SETTLE_DURATION_MS).toBe(140);
    expect(MAX_SCALE_OVERSHOOT_RATIO).toBe(1.08);
    expect(clampWheelDelta(999)).toBe(120);
  });
});
