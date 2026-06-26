export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: number;
  mapId: number;
  points: Array<Point>;
  soundIds: [number, number];
}
