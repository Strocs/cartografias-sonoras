import { z } from 'zod'

import { audioSourcesSchema } from '@shared/lib/audio-sources'

export const soundPieceSchema = z.object(
  {
    id: z.number().int().positive(),
    mapId: z.number().int().positive(),
    title: z.string().min(1),
    author: z.string().min(1),
    description: z.string().min(1),
    audioSources: audioSourcesSchema.nullable()
  },
  { error: 'Invalid sound piece' }
)
