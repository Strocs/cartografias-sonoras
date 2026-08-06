import type { LayerEffectIntent, NormalizedFrame } from '../domain/types';

/**
 * Pure map composition declarations, free of any image-asset imports.
 *
 * Keeping this module Node-safe is what lets Playwright's test runner derive
 * its map fixtures directly from the same source of truth the app consumes,
 * instead of maintaining a hand-mirrored copy that drifts when a layer is
 * added or a frame changes. `maps.ts` is the only place that binds these
 * declarations to the imported WebP assets.
 */
export interface MapLayoutLayer {
  id: string;
  /** Normalized 0-100 frame relative to the base image. */
  frame: Required<NormalizedFrame>;
  optional: boolean;
  effect: LayerEffectIntent;
  /** Hover scale factor for non-base layers; absent layers stay static. */
  hoverScale?: number;
}

export interface MapLayout {
  id: number;
  slug: string;
  title: string;
  soundPieceId: number;
  layers: readonly [MapLayoutLayer, ...MapLayoutLayer[]];
}

export const mapLayouts: MapLayout[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena',
    soundPieceId: 1,
    layers: [
      {
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      },
      {
        id: 'layer-0',
        frame: { x: 69.35, y: 2.7, width: 19.5, height: 19.5 },
        optional: true,
        effect: 'parallax',
        hoverScale: 1.05
      }
    ]
  },
  {
    id: 2,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena',
    soundPieceId: 2,
    layers: [
      {
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      },
      {
        id: 'layer-0',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: true,
        effect: 'parallax'
      }
    ]
  },
  {
    id: 3,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo',
    soundPieceId: 3,
    layers: [
      {
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      },
      {
        id: 'layer-0',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: true,
        effect: 'parallax'
      }
    ]
  }
];
