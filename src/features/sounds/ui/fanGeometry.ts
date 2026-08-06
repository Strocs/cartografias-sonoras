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

/**
 * Fan slot geometry for a Mark's sound buttons.
 *
 * Pure DOM-free math: given a slot count it returns group-local pixel offsets
 * (dx, dy) that fan the buttons out above (and around) the mark circle,
 * screen y-down.
 *
 * Slot k = i - (n-1)/2 and angle θ = (-90° + k·stepDeg)·π/180:
 *   dx = r·cos(θ), dy = r·sin(θ)
 * with -90° pointing up (top-center). Array order is left→right by
 * construction (k ascending), symmetric for both odd and even counts.
 *
 * The fan RADIUS is NOT a hidden default tied to the current mark/sound box
 * dimensions. It is derived explicitly from the mark radius, the sound disc
 * radius, and an accepted overlap: `computeFanRadius` = mark + sound − overlap.
 * The fan is static — no hover growth animation.
 */

/** The Mark's decorative disc radius (44px circle → 22px radius). */
export const MARK_RADIUS = 22;

/** Accepted disc overlap (px): the sound disc slightly overlaps the mark disc. */
export const SOUND_FAN_OVERLAP = -2;

export interface FanRadiusInput {
  markRadius?: number;
  soundRadius?: number;
  gap?: number;
}

/** Explicit relationship between mark/sound disc sizes and the fan radius. */
export const FAN_RADIUS_DEFAULTS: Required<FanRadiusInput> = {
  markRadius: MARK_RADIUS,
  soundRadius: 16,
  gap: -SOUND_FAN_OVERLAP
};

/**
 * Computes the ALWAYS-VISIBLE fan radius from the mark radius, the sound disc
 * radius and an explicit gap. The default gap is negative (a small overlap),
 * so 22 + 18 − 4 = 36px with the default sizes.
 */
export function computeFanRadius(input: FanRadiusInput = {}): number {
  const { markRadius, soundRadius, gap } = {
    ...FAN_RADIUS_DEFAULTS,
    ...input
  };
  return markRadius + soundRadius + gap;
}

export interface FanGeometryOptions {
  radius?: number;
  stepDeg?: number;
}

export interface FanSlot {
  dx: number;
  dy: number;
}

export const FAN_GEOMETRY_DEFAULTS: Required<FanGeometryOptions> = {
  radius: computeFanRadius(),
  stepDeg: 50
};

/** Layouts in the dataset never exceed four sounds per mark. */
export const FAN_LAYOUT_CAP = 4;

/**
 * Computes the fan slot offsets for `count` sounds.
 *
 * At the compact always-visible radius the sound discs may overlap each other
 * and the mark slightly (see `SOUND_FAN_OVERLAP`) — that is accepted (the mark
 * circle anchors the group and the discs surround it).
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
