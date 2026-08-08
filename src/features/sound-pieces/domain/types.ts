import type { AudioSources } from '@shared/lib/audio-sources'

export interface SoundPiece {
  id: number
  mapId: number
  title: string
  author: string
  description: string
  audioSources: AudioSources | null
}
