import { relativeToPixel } from '@shared/lib/coordinates'

import type { Point } from '../domain/types'

/** Default geometric corner radius, in map pixel units. */
export const DEFAULT_CORNER_RADIUS = 42

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
 * Builds an SVG `d` attribute whose interior corners (waypoints) are rounded.
 *
 * Every corner is trimmed to a tangent point `r` back along the incoming
 * segment and `r` forward along the outgoing one, then connected with a
 * quadratic curve whose control point is the waypoint itself. The result hugs
 * the original apex so dashes flow smoothly around corners.
 *
 * Rules:
 * - Endpoints stay exactly on the first and last points.
 * - The corner radius is capped by half the length of each adjacent segment,
 *   so short segments are never over-trimmed.
 * - Straight paths are kept straight: two points, collinear segments and
 *   degenerate (zero-length) segments produce plain `L` commands.
 *
 * Returns an empty string for fewer than two points.
 */
export function buildRoundedPathD(
  points: Point[],
  width: number,
  height: number,
  radius: number = DEFAULT_CORNER_RADIUS
): string {
  if (points.length < 2) {
    return ''
  }

  const pixels = points.map((point) => relativeToPixel(point, width, height))

  if (pixels.length === 2) {
    return `M ${pixels[0].x} ${pixels[0].y} L ${pixels[1].x} ${pixels[1].y}`
  }

  const commands: string[] = [`M ${pixels[0].x} ${pixels[0].y}`]

  for (let i = 1; i < pixels.length - 1; i++) {
    const corner = roundedCorner(pixels[i - 1], pixels[i], pixels[i + 1], radius)

    if (corner === null) {
      commands.push(`L ${pixels[i].x} ${pixels[i].y}`)
    } else {
      commands.push(
        `L ${corner.start.x} ${corner.start.y}`,
        `Q ${corner.control.x} ${corner.control.y} ${corner.end.x} ${corner.end.y}`
      )
    }
  }

  commands.push(`L ${pixels[pixels.length - 1].x} ${pixels[pixels.length - 1].y}`)

  return commands.join(' ')
}

interface RoundedCorner {
  start: Point
  control: Point
  end: Point
}

/**
 * Computes the tangent/control points that round the corner at `vertex`.
 *
 * Returns `null` when the corner is collinear (or degenerate), in which case
 * the caller falls back to a straight `L` through the vertex.
 */
function roundedCorner(prev: Point, vertex: Point, next: Point, radius: number): RoundedCorner | null {
  const incoming = { x: prev.x - vertex.x, y: prev.y - vertex.y }
  const outgoing = { x: next.x - vertex.x, y: next.y - vertex.y }
  const incomingLength = Math.hypot(incoming.x, incoming.y)
  const outgoingLength = Math.hypot(outgoing.x, outgoing.y)

  if (incomingLength === 0 || outgoingLength === 0) {
    return null
  }

  const uIn = { x: incoming.x / incomingLength, y: incoming.y / incomingLength }
  const uOut = { x: outgoing.x / outgoingLength, y: outgoing.y / outgoingLength }

  // Collinear (same or opposite direction): there is no corner to round.
  const dot = uIn.x * uOut.x + uIn.y * uOut.y
  if (Math.abs(dot) >= 1 - Number.EPSILON) {
    return null
  }

  const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2)
  if (cornerRadius <= 0) {
    return null
  }

  return {
    start: { x: vertex.x + uIn.x * cornerRadius, y: vertex.y + uIn.y * cornerRadius },
    control: { x: vertex.x, y: vertex.y },
    end: { x: vertex.x + uOut.x * cornerRadius, y: vertex.y + uOut.y * cornerRadius }
  }
}

/**
 * Returns a reversed copy of the point array without mutating the original.
 */
export function reversePoints(points: Point[]): Point[] {
  return [...points].reverse()
}
