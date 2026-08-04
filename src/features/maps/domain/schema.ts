import { z } from 'zod';

import { LAYER_EFFECT } from './types';

export const mapImageSchema = z.object(
  {
    src: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    asset: z
      .custom<import('astro').ImageMetadata>(
        (value) =>
          value === undefined ||
          (typeof value === 'object' &&
            value !== null &&
            'src' in value &&
            'width' in value &&
            'height' in value)
      )
      .optional()
  },
  { error: 'Invalid map image' }
);

export const normalizedFrameSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  width: z.number().finite().positive().max(100),
  height: z.number().finite().positive().max(100)
});

export const mapLayerSchema = mapImageSchema.extend({
  id: z.string().min(1),
  frame: normalizedFrameSchema,
  optional: z.boolean(),
  effect: z.enum(LAYER_EFFECT)
});

export const mapSchema = z.object(
  {
    id: z.number().int().positive(),
    slug: z.string().min(1),
    title: z.string().min(1),
    image: mapImageSchema,
    images: z.array(mapLayerSchema).min(1),
    preview: mapImageSchema,
    soundPieceId: z.number().int().positive()
  },
  { error: 'Invalid map' }
);
