import type { Path } from './types';

export function checkPathInvariants(path: Path): void {
  if (path.mapId === null || path.mapId === undefined) {
    throw new Error('Path must belong to a map');
  }

  if (path.startSoundId === path.endSoundId) {
    throw new Error('Path must connect two different sounds');
  }
}
