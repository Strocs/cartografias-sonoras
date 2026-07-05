import { z } from 'zod';

export const pointSchema = z.object(
  {
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
  },
  { error: 'Invalid point' }
);

export const pathSchema = z.object(
  {
    id: z.number().int().positive(),
    mapId: z.number().int().positive(),
    waypoints: z.array(pointSchema),
    startSoundId: z.number().int().positive(),
    endSoundId: z.number().int().positive(),
  },
  { error: 'Invalid path' }
);
