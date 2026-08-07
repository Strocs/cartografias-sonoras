export interface Point {
  x: number
  y: number
}

export interface Path {
  id: number
  mapId: number
  /** Intermediate waypoints between the two connected marks.
   *  Endpoints are derived from the start/end mark positions at runtime. */
  waypoints: Array<Point>
  startMarkId: number
  endMarkId: number
}

/**
 * Minimal mark shape needed by path visual-state computation. Only the
 * geometry and the sound ids are used; keeps `features/paths` decoupled from
 * `features/sounds` (features cannot import sibling features).
 */
export interface PathMarkLike {
  position: Point
  sounds: Array<{ id: number }>
}
