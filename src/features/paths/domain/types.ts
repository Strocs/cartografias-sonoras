export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: number;
  mapId: number;
  /** Intermediate waypoints between the two connected marks.
   *  Endpoints are derived from the start/end mark positions at runtime. */
  waypoints: Array<Point>;
  startMarkId: number;
  endMarkId: number;
}