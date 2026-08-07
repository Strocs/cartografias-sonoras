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
  /** Whether the map route renders the bottom sound-piece player. */
  soundPieceEnabled: boolean;
  layers: readonly [MapLayoutLayer, ...MapLayoutLayer[]];
}

export const mapLayouts: MapLayout[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena',
    soundPieceId: 1,
    soundPieceEnabled: false,
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
        effect: 'float'
      }
    ]
  },
  {
    id: 2,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo',
    soundPieceId: 2,
    soundPieceEnabled: false,
    layers: [
      {
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      },
      {
        id: 'layer-0',
        frame: { x: 50.6, y: 1.8, width: 24.1, height: 24.1 },
        optional: true,
        effect: 'float'
      }
    ]
  },
  {
    id: 3,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena',
    soundPieceId: 3,
    soundPieceEnabled: false,
    layers: [
      {
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      },
      {
        id: 'layer-0',
        frame: { x: 58.74, y: 9.3, width: 16, height: 16 },
        optional: true,
        effect: 'float'
      },
      {
        id: 'layer-1',
        frame: { x: 65.6, y: 24.8, width: 14.9, height: 14.9 },
        optional: true,
        effect: 'float'
      },
      {
        id: 'layer-2',
        frame: { x: 10.27, y: 64.35, width: 14.9, height: 14.9 },
        optional: true,
        effect: 'float'
      }
    ]
  }
];
