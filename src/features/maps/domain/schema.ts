import { z } from 'zod';

export const mapImageSchema = z.object(
  {
    src: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  },
  { error: 'Invalid map image' }
);

export const mapSchema = z.object(
  {
    id: z.number().int().positive(),
    slug: z.string().min(1),
    title: z.string().min(1),
    image: mapImageSchema,
    soundPieceId: z.number().int().positive(),
  },
  { error: 'Invalid map' }
);
