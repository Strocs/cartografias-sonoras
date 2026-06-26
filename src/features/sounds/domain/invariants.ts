import type { Sound } from './types';

export function checkSoundInvariants(sound: Sound): void {
  if (sound.mapId === null || sound.mapId === undefined) {
    throw new Error('Sound must belong to a map');
  }

  if (
    !Number.isFinite(sound.position.x) ||
    !Number.isFinite(sound.position.y)
  ) {
    throw new Error('Sound position must be finite');
  }
}
