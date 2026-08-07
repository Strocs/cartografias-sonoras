import { z } from 'zod'

export const positionSchema = z.object(
  {
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100)
  },
  { error: 'Invalid position' }
)

export const soundSchema = z.object(
  {
    id: z.number().int().positive().finite(),
    title: z.string().optional(),
    description: z.string().min(1).nullable(),
    location: z.string(),
    audioUrl: z
      .string()
      .min(1)
      .refine((value) => /^https?:\/\//.test(value), {
        message: 'audioUrl must be a non-empty URL'
      }),
    geoReferenceUrl: z
      .string()
      .min(1)
      .refine((value) => /^https?:\/\//.test(value), {
        message: 'geoReferenceUrl must be a non-empty URL'
      })
      .optional()
  },
  { error: 'Invalid sound' }
)

export const markSchema = z
  .object(
    {
      id: z.number().int().positive().finite(),
      mapId: z.number().int().positive().finite(),
      title: z.string().optional(),
      description: z.string().min(1).nullable(),
      position: positionSchema,
      location: z.string(),
      sounds: z.array(soundSchema).min(1, {
        error: 'Mark must contain at least one sound'
      })
    },
    { error: 'Invalid mark' }
  )
  .superRefine((mark, ctx) => {
    const ids = mark.sounds.map((s) => s.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mark sounds must have unique ids',
        path: ['sounds']
      })
    }
  })
