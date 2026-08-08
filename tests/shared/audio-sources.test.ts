import { describe, expect, it } from 'vitest'

import { AUDIO_MIME_TYPES, audioSourcesSchema, buildSoundAudioAssetUrls } from '@shared/lib/audio-sources'

describe('buildSoundAudioAssetUrls', () => {
  it('builds the A3 master contract and ordered streaming sources', () => {
    expect(buildSoundAudioAssetUrls(2, 3, 4)).toEqual({
      masterUrl: 'https://mapasonoro.frijolmagico.cl/1/2/sonidos/3/master/Ruta_2_Punto_3_Sonido_4_Binaural_norm.wav',
      audioSources: {
        primary: {
          url: 'https://mapasonoro.frijolmagico.cl/1/2/sonidos/3/streaming/Ruta_2_Punto_3_Sonido_4_Binaural_norm.m4a',
          mimeType: AUDIO_MIME_TYPES.AAC
        },
        fallback: {
          url: 'https://mapasonoro.frijolmagico.cl/1/2/sonidos/3/streaming/Ruta_2_Punto_3_Sonido_4_Binaural_norm.opus',
          mimeType: AUDIO_MIME_TYPES.OPUS
        }
      }
    })
  })

  it.each([0, -1, 1.5])('returns null for invalid ID segment %d', (invalidId) => {
    expect(buildSoundAudioAssetUrls(invalidId, 1, 1)).toBeNull()
    expect(buildSoundAudioAssetUrls(1, invalidId, 1)).toBeNull()
    expect(buildSoundAudioAssetUrls(1, 1, invalidId)).toBeNull()
  })
})

describe('audioSourcesSchema', () => {
  const validSources = {
    primary: { url: 'https://cdn.example/audio.m4a', mimeType: AUDIO_MIME_TYPES.AAC },
    fallback: { url: 'https://cdn.example/audio.opus', mimeType: AUDIO_MIME_TYPES.OPUS }
  }

  it('accepts complete HTTP(S) AAC and Opus sources', () => {
    expect(audioSourcesSchema.safeParse(validSources).success).toBe(true)
  })

  it('rejects non-HTTP(S) source URLs', () => {
    expect(
      audioSourcesSchema.safeParse({
        ...validSources,
        fallback: { ...validSources.fallback, url: 'ftp://cdn.example/audio.opus' }
      }).success
    ).toBe(false)
  })

  it('rejects missing sources and MIME types outside their source role', () => {
    const { primary } = validSources

    expect(audioSourcesSchema.safeParse(primary).success).toBe(false)
    expect(
      audioSourcesSchema.safeParse({
        ...validSources,
        primary: { ...validSources.primary, mimeType: AUDIO_MIME_TYPES.OPUS }
      }).success
    ).toBe(false)
  })
})
