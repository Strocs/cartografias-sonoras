/**
 * Fan slot geometry for a Mark's sound buttons.
 *
 * Pure DOM-free math — given a slot count it returns group-local pixel offsets
 * (dx, dy) that fan the buttons out above (and around) the mark circle,
 * screen y-down.
 *
 * Slot k = i - (n-1)/2 and angle θ = (-90° + k·stepDeg)·π/180:
 *   dx = r·cos(θ), dy = r·sin(θ)
 * with -90° pointing up (top-center). Array order is left→right by
 * construction (k ascending), symmetric for both odd and even counts.
 *
 * The fan RADIUS and the angular STEP are DECOUPLED controls:
 *
 * - Radius (`computeFanRadius`) fixes the head-to-sound separation through an
 *   explicit `headGap` — the perpendicular distance between the mark head edge
 *   and each sound disc edge. Changing it moves the whole ring out/in.
 * - Angular step (`computeFanSlots`) fixes the spacing BETWEEN adjacent sound
 *   centers through `soundGap` — a desired CHORD distance that is converted to
 *   an angular step via the chord relationship `chord = 2·r·sin(θ/2)`. Changing
 *   `soundGap` re-fans the buttons without moving the ring radius.
 *
 * The default `soundGap` equals the visible sound disc diameter
 * (`SOUND_VISIBLE_SIZE`) so adjacent visible discs just touch by default.
 */

import { SOUND_VISIBLE_SIZE } from './soundButton';

/** The Mark's decorative head size; CSS receives this same value. */
export const MARK_SIZE = 30;

/** The Mark's decorative head radius, derived from its shared size. */
export const MARK_RADIUS = MARK_SIZE / 2;

/**
 * Accepted disc overlap (px): the sound disc slightly overlaps the mark disc.
 * Its negated value is the default head gap, so the default fan radius keeps
 * the historical mark-to-sound distance while using a positive gap.
 */
export const SOUND_FAN_OVERLAP = -4;

export interface FanRadiusInput {
  markRadius?: number;
  soundRadius?: number;
  /** Perpendicular gap (px) between the mark head edge and the sound disc edge. */
  headGap?: number;
}

/** Explicit relationship between mark/sound disc sizes and the fan radius. */
export const FAN_RADIUS_DEFAULTS: Required<FanRadiusInput> = {
  markRadius: MARK_RADIUS,
  soundRadius: 16,
  headGap: -SOUND_FAN_OVERLAP
};

/**
 * Computes the ALWAYS-VISIBLE fan radius from the mark head radius, the sound
 * disc radius and an explicit head gap: `computeFanRadius` = mark + sound +
 * headGap. With the defaults that is 15 + 16 + 4 = 35px.
 */
export function computeFanRadius(input: FanRadiusInput = {}): number {
  const { markRadius, soundRadius, headGap } = {
    ...FAN_RADIUS_DEFAULTS,
    ...input
  };
  return markRadius + soundRadius + headGap;
}

export interface FanGeometryOptions {
  radius?: number;
  /**
   * Angular step (degrees) between adjacent sound slots. When provided it wins
   * over `soundGap`; otherwise the step is derived from `soundGap`.
   */
  stepDeg?: number;
  /**
   * Desired chord distance (px) between adjacent sound centers, converted to
   * the angular step at the fan radius. Defaults to the visible sound diameter
   * (`SOUND_VISIBLE_SIZE`) — adjacent visible discs just touch by default.
   */
  soundGap?: number;
}

export interface FanSlot {
  dx: number;
  dy: number;
}

export const FAN_GEOMETRY_DEFAULTS: Readonly<{
  radius: number;
  soundGap: number;
}> = {
  radius: computeFanRadius(),
  soundGap: SOUND_VISIBLE_SIZE
};

/**
 * Converts a desired CHORD distance (straight-line gap between adjacent sound
 * centers) into the angular step in degrees for a fan of radius `radius`.
 *
 * For a circle of radius r, an arc step θ subtends a chord of length
 * `chord = 2·r·sin(θ/2)`, so θ = 2·asin(chord / (2r)). The chord is clamped to
 * the circle's diameter so an oversized `soundGap` degrades gracefully toward
 * 180° instead of producing NaN. The radius is untouched by this conversion.
 */
export function computeFanStepDeg(radius: number, soundGap: number): number {
  const safeRadius = radius > 0 ? radius : Number.EPSILON;
  const ratio = Math.min(1, Math.max(0, soundGap / 2 / safeRadius));
  return (2 * Math.asin(ratio) * 180) / Math.PI;
}

/** Layouts in the dataset never exceed four sounds per mark. */
export const FAN_LAYOUT_CAP = 5;

/**
 * Computes the fan slot offsets for `count` sounds.
 *
 * At the compact always-visible radius the sound discs may overlap each other
 * and the mark slightly (see `SOUND_FAN_OVERLAP`) — that is accepted (the mark
 * circle anchors the group and the discs surround it).
 *
 * The angular step defaults to the chord derived from `soundGap`
 * (`FAN_GEOMETRY_DEFAULTS.soundGap` = visible sound diameter) at the given
 * radius, so adjacent sound centers are spaced `soundGap` px apart while the
 * ring radius stays fixed.
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
  const stepDeg =
    options.stepDeg ??
    computeFanStepDeg(
      radius,
      options.soundGap ?? FAN_GEOMETRY_DEFAULTS.soundGap
    );

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
