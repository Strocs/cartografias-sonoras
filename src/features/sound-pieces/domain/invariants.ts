import type { SoundPiece } from './types';

export function checkSoundPieceInvariants(soundPiece: SoundPiece): void {
  if (soundPiece.mapId === null || soundPiece.mapId === undefined) {
    throw new Error('Sound piece must belong to a map');
  }
}
