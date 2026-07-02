export interface MapImage {
  src: string;
  width: number;
  height: number;
  /**
   * Imported image metadata for Astro's asset pipeline.
   * Present for local maps that are processed into responsive formats.
   */
  asset?: import('astro').ImageMetadata;
}

export interface Map {
  id: number;
  slug: string;
  title: string;
  image: MapImage;
  soundPieceId: number;
}
