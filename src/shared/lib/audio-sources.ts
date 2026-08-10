import { z } from 'zod'

const AUDIO_CDN_BASE_URL = 'https://cdn.marcasonora.cl/1'

export const AUDIO_MIME_TYPES = {
  AAC: 'audio/mp4',
  OPUS: 'audio/ogg; codecs=opus'
} as const

export type AudioMimeType = (typeof AUDIO_MIME_TYPES)[keyof typeof AUDIO_MIME_TYPES]

export interface AudioSource {
  readonly url: string
  readonly mimeType: AudioMimeType
}

export interface AudioSources {
  readonly primary: AudioSource
  readonly fallback: AudioSource
}

export interface AudioAssetUrls {
  readonly masterUrl: string
  readonly audioSources: AudioSources
}

const httpUrlSchema = z.url().refine((value) => /^https?:\/\//.test(value), {
  message: 'Audio source URL must use HTTP(S)'
})

export const audioSourceSchema = z
  .object({
    url: httpUrlSchema,
    mimeType: z.enum([AUDIO_MIME_TYPES.AAC, AUDIO_MIME_TYPES.OPUS])
  })
  .strict()

export const audioSourcesSchema = z
  .object({
    primary: audioSourceSchema.extend({ mimeType: z.literal(AUDIO_MIME_TYPES.AAC) }),
    fallback: audioSourceSchema.extend({ mimeType: z.literal(AUDIO_MIME_TYPES.OPUS) })
  })
  .strict()

export const audioAssetUrlsSchema = z
  .object({
    masterUrl: httpUrlSchema,
    audioSources: audioSourcesSchema
  })
  .strict()

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

export function buildSoundAudioAssetUrls(routeId: number, pointId: number, soundId: number): AudioAssetUrls | null {
  if (![routeId, pointId, soundId].every(isPositiveInteger)) {
    return null
  }

  const filename = `Ruta_${routeId}_Punto_${pointId}_Sonido_${soundId}_Binaural_norm`
  const baseUrl = `${AUDIO_CDN_BASE_URL}/${routeId}/sonidos/${pointId}`

  return {
    masterUrl: `${baseUrl}/master/${filename}.wav`,
    audioSources: {
      primary: {
        url: `${baseUrl}/streaming/${filename}.m4a`,
        mimeType: AUDIO_MIME_TYPES.AAC
      },
      fallback: {
        url: `${baseUrl}/streaming/${filename}.opus`,
        mimeType: AUDIO_MIME_TYPES.OPUS
      }
    }
  }
}
