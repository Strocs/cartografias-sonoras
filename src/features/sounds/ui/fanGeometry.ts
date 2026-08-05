/**
 * Fan slot geometry for a Mark's sound buttons.
 *
 * Pure DOM-free math: given a slot count it returns group-local pixel offsets
 * (dx, dy) that fan the buttons out above the mark circle, screen y-down.
 *
 * Slot k = i - (n-1)/2 and angle θ = (-90° + k·stepDeg)·π/180:
 *   dx = r·cos(θ), dy = r·sin(θ)
 * with -90° pointing up (top-center) so the fan opens upward from the mark.
 * Array order is left→right by construction (k ascending), symmetric for both
 * odd and even counts.
 */

export interface FanGeometryOptions {
  radius?: number;
  stepDeg?: number;
}

export interface FanSlot {
  dx: number;
  dy: number;
}

export const FAN_GEOMETRY_DEFAULTS: Required<FanGeometryOptions> = {
  radius: 64,
  stepDeg: 50
};

/** Layouts in the dataset never exceed four sounds per mark. */
export const FAN_LAYOUT_CAP = 4;

/**
 * Computes the fan slot offsets for `count` sounds.
 *
 * `stepDeg` must satisfy the overlap rule stepDeg(rad) ≥ 2·asin(d/(2r)) with
 * d = 54 (button diameter); the defaults (r=64, stepDeg=50) yield
 * 2·asin(54/128) ≈ 49.87° ≤ 50 ✓.
 *
 * @throws when `count` is below one.
 */
export function computeFanSlots(
  count: number,
  options: FanGeometryOptions = {}
): FanSlot[] {
  if (count < 1) {
    throw new RangeError('Fan layout needs at least one slot');
  }

  const radius = options.radius ?? FAN_GEOMETRY_DEFAULTS.radius;
  const stepDeg = options.stepDeg ?? FAN_GEOMETRY_DEFAULTS.stepDeg;

  const slots: FanSlot[] = [];
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    const theta = ((-90 + k * stepDeg) * Math.PI) / 180;
    slots.push({
      dx: radius * Math.cos(theta),
      dy: radius * Math.sin(theta)
    });
  }
  return slots;
}
