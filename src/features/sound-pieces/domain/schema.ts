import { z } from 'zod';

export const soundPieceSchema = z.object(
  {
    id: z.number().int().positive(),
    mapId: z.number().int().positive(),
    title: z.string().min(1),
    author: z.string().min(1),
    description: z.string().min(1),
    audioUrl: z.string(),
  },
  { error: 'Invalid sound piece' }
);
