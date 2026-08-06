/**
 * Breakpoint-aware zoom factor resolution.
 *
 * `<map-view>` zoom attributes (`min-zoom`, `max-zoom`, `start-zoom`) may be
 * expressed either as a single factor (applied at every size) or as an object
 * mapping a Tailwind-aligned breakpoint name to a factor, e.g.:
 *
 *   min-zoom="0.8"
 *   min-zoom='{"base":0.8,"md":0.5}'
 *
 * Factors are relative to the fitted scale (fit = 1x, the state where the whole
 * map fits the viewport). The breakpoint with the largest width whose factor is
 * declared wins; absent keys fall through to the nearest narrower declared one,
 * or to `base` when declared, otherwise to `1`.
 */

export const ZOOM_BREAKPOINTS = [
  { name: 'base', width: 0 },
  { name: 'sm', width: 640 },
  { name: 'md', width: 768 },
  { name: 'lg', width: 1024 },
  { name: 'xl', width: 1280 },
  { name: '2xl', width: 1536 }
] as const satisfies readonly { name: string; width: number }[];

export type ZoomBreakpointName = (typeof ZOOM_BREAKPOINTS)[number]['name'];

export type ZoomFactorMap = Partial<Record<ZoomBreakpointName, number>>;

/** A zoom factor is either a plain number or a breakpoint-keyed map. */
export type ZoomFactorInput = number | ZoomFactorMap;

/** A zoom factor is either a plain number or a breakpoint-keyed map. */
export function isZoomFactorMap(value: unknown): value is ZoomFactorMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the breakpoint name currently active for a given viewport width
 * (the largest declared breakpoint whose min-width is satisfied).
 */
export function activeBreakpointName(width: number): ZoomBreakpointName {
  let active: ZoomBreakpointName = 'base';
  for (const bp of ZOOM_BREAKPOINTS) {
    if (width >= bp.width) active = bp.name as ZoomBreakpointName;
  }
  return active;
}

/**
 * Resolves a factor input to a concrete number for the given viewport width.
 *
 * Plain numbers pass through untouched. Maps are resolved to the factor of the
 * active (or nearest narrower) declared breakpoint, defaulting to `1`.
 */
export function resolveZoomFactor(
  value: ZoomFactorInput | undefined,
  width: number,
  fallback = 1
): number {
  if (typeof value === 'number') return value;
  if (!isZoomFactorMap(value)) return fallback;

  const activeIndex = ZOOM_BREAKPOINTS.findIndex(
    (bp) => bp.name === activeBreakpointName(width)
  );
  if (activeIndex < 0) return fallback;

  // Walk downward from the active breakpoint looking for a declared factor.
  for (let i = activeIndex; i >= 0; i -= 1) {
    const name = ZOOM_BREAKPOINTS[i].name as ZoomBreakpointName;
    const declared = value[name];
    if (typeof declared === 'number') return declared;
  }
  return fallback;
}