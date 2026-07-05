import { relativeToPixel } from '@shared/lib/coordinates';

import type { Point } from '../domain/types';

/**
 * Builds a straight-segment SVG `d` attribute from percentage-based points.
 *
 * Output is in pixel coordinates relative to the supplied map dimensions:
 * `M x0 y0 L x1 y1 L x2 y2 ...`. Returns an empty string for fewer than two
 * points.
 */
export function buildPolylineD(
  points: Point[],
  width: number,
  height: number
): string {
  if (points.length < 2) {
    return '';
  }

  const commands: string[] = [];

  for (let i = 0; i < points.length; i++) {
    const { x, y } = relativeToPixel(points[i], width, height);
    commands.push(i === 0 ? 'M' : 'L', `${x}`, `${y}`);
  }

  return commands.join(' ');
}

/**
 * Smooths a point sequence using Catmull–Rom interpolation so that
 * `L.polyline` renders fluid curves instead of sharp angles.
 *
 * The original endpoints are preserved exactly.  Each pair of consecutive
 * segments gets `density` interpolated points; higher values produce
 * smoother curves at a negligible rendering cost (the SVG <path> stays a
 * single element regardless of how many points it contains).
 *
 * Fewer than 3 points are returned as-is — you need at least a start, a
 * waypoint, and an end for a curve to exist.
 *
 * `density` controls how many interpolated points are inserted around each
 * corner.  Low values (2–4) produce subtle corner-rounding that affects only
 * a handful of pixels near the intersection; higher values create full splines.
 */
export function smoothPoints(points: Point[], density = 3): Point[] {
  if (points.length < 3) {
    return points;
  }

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    for (let t = 1; t <= density; t++) {
      const s = t / density;
      const s2 = s * s;
      const s3 = s2 * s;

      // Catmull–Rom basis (tension = 0.5).  Generates a smooth curve
      // that passes through every control point.
      result.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * s +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - (points[i + 2]?.x ?? p2.x)) *
              s2 +
            (-p0.x +
              3 * p1.x -
              3 * p2.x +
              (points[i + 2]?.x ?? p2.x)) *
              s3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * s +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - (points[i + 2]?.y ?? p2.y)) *
              s2 +
            (-p0.y +
              3 * p1.y -
              3 * p2.y +
              (points[i + 2]?.y ?? p2.y)) *
              s3),
      });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Returns a reversed copy of the point array without mutating the original.
 */
export function reversePoints(points: Point[]): Point[] {
  return [...points].reverse();
}
