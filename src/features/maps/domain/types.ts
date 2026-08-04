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

export const LAYER_EFFECT = {
  NONE: 'none',
  FLOAT: 'float',
  PARALLAX: 'parallax'
} as const;

export type LayerEffectIntent =
  (typeof LAYER_EFFECT)[keyof typeof LAYER_EFFECT];

export interface NormalizedFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapLayer extends MapImage {
  id: string;
  frame: NormalizedFrame;
  optional: boolean;
  effect: LayerEffectIntent;
}

export interface Map {
  id: number;
  slug: string;
  title: string;
  /** @deprecated Remove after Astro consumers migrate in PR 3. */
  image: MapImage;
  images: readonly [MapLayer, ...MapLayer[]];
  preview: MapImage;
  soundPieceId: number;
}
