export interface MapImage {
  src: string;
  width: number;
  height: number;
}

export interface Map {
  id: number;
  slug: string;
  title: string;
  image: MapImage;
  soundPieceId: number;
}
