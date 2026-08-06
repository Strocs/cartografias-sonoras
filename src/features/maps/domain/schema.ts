import { z } from 'zod';

import { normalizeMapInput } from './normalize';
import { LAYER_EFFECT } from './types';

export const mapImageSchema = z.object(
  {
    src: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.string('webp').optional(),
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
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive().max(100),
  height: z.number().positive().max(100)
});

export const mapLayerSchema = mapImageSchema.extend({
  id: z.string().min(1),
  frame: normalizedFrameSchema,
  optional: z.boolean(),
  effect: z.enum(LAYER_EFFECT),
  hoverScale: z.number().positive().optional(),
  className: z.string().min(1).optional(),
  pointerEvents: z.boolean().optional()
});

export const mapSchema = z.preprocess(
  normalizeMapInput,
  z.object(
    {
      id: z.number().int().positive(),
      slug: z.string().min(1),
      title: z.string().min(1),
      images: z.array(mapLayerSchema).min(1),
      preview: mapImageSchema,
      soundPieceId: z.number().int().positive()
    },
    { error: 'Invalid map' }
  )
);
