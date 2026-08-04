import type { MapImage, MapLayer } from './types';

const FULL_FRAME = { x: 0, y: 0, width: 100, height: 100 } as const;

interface LegacyMapInput {
  image?: MapImage;
  images?: unknown;
}

export function normalizeMapInput(input: unknown): unknown {
  if (!isLegacyMapInput(input) || input.images !== undefined || !input.image) {
    return input;
  }

  const { image, ...map } = input;
  const base: MapLayer = {
    ...image,
    id: 'base',
    frame: FULL_FRAME,
    optional: false,
    effect: 'none'
  };
  return { ...map, images: [base] };
}

function isLegacyMapInput(value: unknown): value is LegacyMapInput {
  return typeof value === 'object' && value !== null;
}
