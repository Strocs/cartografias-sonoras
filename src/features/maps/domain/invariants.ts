import type { Map } from './types';

export function checkMapInvariants(map: Map): void {
  if (map.soundPieceId === null || map.soundPieceId === undefined) {
    throw new Error('Map must have a sound piece');
  }
}
