import { z } from 'zod';

export const positionSchema = z.object(
  {
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
  },
  { error: 'Invalid position' }
);

export const soundSchema = z.object(
  {
    id: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    audioUrl: z.string(),
    geoReferenceUrl: z.string().optional(),
    position: positionSchema,
    mapId: z.number().int().positive(),
  },
  { error: 'Invalid sound' }
);
