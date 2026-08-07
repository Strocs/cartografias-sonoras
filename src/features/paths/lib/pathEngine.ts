import { relativeToPixel } from '@shared/lib/coordinates'

import type { Point } from '../domain/types'

/**
 * Builds a straight-segment SVG `d` attribute from percentage-based points.
 *
 * Output is in pixel coordinates relative to the supplied map dimensions:
 * `M x0 y0 L x1 y1 L x2 y2 ...`. Returns an empty string for fewer than two
 * points.
 */
export function buildPolylineD(points: Point[], width: number, height: number): string {
  if (points.length < 2) {
    return ''
  }

  const commands: string[] = []

  for (let i = 0; i < points.length; i++) {
    const { x, y } = relativeToPixel(points[i], width, height)
    commands.push(i === 0 ? 'M' : 'L', `${x}`, `${y}`)
  }

  return commands.join(' ')
}

/**
 * Returns a reversed copy of the point array without mutating the original.
 */
export function reversePoints(points: Point[]): Point[] {
  return [...points].reverse()
}
