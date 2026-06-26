import type { Path } from './types';

export function checkPathInvariants(path: Path): void {
  if (path.mapId === null || path.mapId === undefined) {
    throw new Error('Path must belong to a map');
  }

  if (path.soundIds.length !== 2) {
    throw new Error('Path must connect exactly two sounds');
  }
}
