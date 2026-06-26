export interface Position {
  x: number;
  y: number;
}

export interface Sound {
  id: number;
  title: string;
  description: string;
  audioUrl: string;
  geoReferenceUrl?: string;
  position: Position;
  mapId: number;
}
