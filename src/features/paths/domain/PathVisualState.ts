import type { Point } from './types';

/**
 * Optional per-path style overrides.  When provided they are applied as
 * inline SVG attributes, taking precedence over the default CSS classes.
 * Omitted (or partial) fields fall back to the CSS defaults.
 */
export interface PathStyleConfig {
  /** Stroke width in SVG units (default: 2, from .path-base). */
  strokeWidth?: number;
  /** Stroke colour (any valid SVG colour). */
  strokeColor?: string;
  /** Dash pattern, e.g. "6 3" for dashed lines. */
  dashArray?: string;
}

/**
 * Discriminated union that describes how a perceptual path should be rendered.
 *
 * The type deliberately carries percentage-based `points` and the map
 * dimensions live in `MapContext`; that keeps `features/paths` decoupled from
 * the audio engine and from Leaflet-specific coordinate math.
 */
export type PathVisualState =
  | {
      pathId: number;
      points: Point[];
      variant: 'idle';
      style?: PathStyleConfig;
    }
  | {
      pathId: number;
      points: Point[];
      variant: 'single';
      activeEndpoint: 'start' | 'end';
      style?: PathStyleConfig;
    }
  | {
      pathId: number;
      points: Point[];
      variant: 'both';
      style?: PathStyleConfig;
    };
