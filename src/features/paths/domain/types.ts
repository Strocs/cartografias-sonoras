export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: number;
  mapId: number;
  /** Intermediate waypoints between the two connected sounds.
   *  Endpoints are derived from the start/end sound positions at runtime. */
  waypoints: Array<Point>;
  startSoundId: number;
  endSoundId: number;
}
