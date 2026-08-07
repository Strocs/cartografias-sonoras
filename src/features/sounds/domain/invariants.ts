import type { Mark, Sound } from './types'

export function checkMarkInvariants(mark: Mark): void {
  if (mark.mapId === null || mark.mapId === undefined) {
    throw new Error('Mark must belong to a map')
  }

  if (!Number.isFinite(mark.position.x) || !Number.isFinite(mark.position.y)) {
    throw new Error('Mark position must be finite')
  }

  if (mark.position.x < 0 || mark.position.x > 100 || mark.position.y < 0 || mark.position.y > 100) {
    throw new Error('Mark position must be within 0–100 (percentage of map dimensions)')
  }

  if (mark.sounds.length === 0) {
    throw new Error('Mark must contain at least one sound')
  }

  const ids = mark.sounds.map((sound) => sound.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('Mark sounds must have unique ids')
  }
}

export function checkSoundInvariants(sound: Sound): void {
  if (!Number.isFinite(sound.id) || sound.id <= 0) {
    throw new Error('Sound id must be a finite positive number')
  }

  if (typeof sound.audioUrl !== 'string' || sound.audioUrl.length === 0 || !/^https?:\/\//.test(sound.audioUrl)) {
    throw new Error('Sound audioUrl must be a non-empty URL')
  }
}
