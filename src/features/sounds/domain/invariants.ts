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

  if (
    sound.position.x < 0 ||
    sound.position.x > 100 ||
    sound.position.y < 0 ||
    sound.position.y > 100
  ) {
    throw new Error(
      'Sound position must be within 0–100 (percentage of map dimensions)'
    );
  }
}
