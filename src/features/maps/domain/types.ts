export interface MapImage {
  src: string;
  width: number;
  format?: string;
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
  width?: number;
  height?: number;
}

export interface MapLayerOptions extends MapImage {
  frame?: NormalizedFrame;
  optional: boolean;
  effect: LayerEffectIntent;
  /**
   * Hover scale factor for non-base layers (e.g. 1.05). A positive value
   * opts the layer into a data-driven hover animation; the base layer never
   * carries one.
   */
  hoverScale?: number;
  className?: string;
  pointerEvents?: boolean;
}

export interface MapLayer extends Omit<MapLayerOptions, 'frame'> {
  id: string;
  /**
   * Bound layers always carry a concrete normalized frame; only the
   * pre-binding declaration (`MapLayerOptions`) may omit it.
   */
  frame: Required<NormalizedFrame>;
}

export interface Map {
  id: number;
  slug: string;
  title: string;
  images: readonly [MapLayer, ...MapLayer[]];
  preview: MapImage;
  soundPieceId: number;
}
