import { AUDIO_STATUS, type AudioStatus } from '@shared/lib/audio-engine';

import type { Path, Point } from '@features/paths/domain/types';
import type { PathVisualState } from '@features/paths/domain/PathVisualState';
import type { Sound } from '@features/sounds/domain/types';

export interface ActiveSoundLike {
  status: AudioStatus;
}

/**
 * Builds the full point list for a path by combining the start and end sound
 * positions with the intermediate waypoints. Endpoints are derived from the
 * sound data at runtime so markers and paths stay aligned.
 */
function buildFullPoints(path: Path, soundsById: Map<number, Sound>): Point[] {
  const startSound = soundsById.get(path.startSoundId);
  const endSound = soundsById.get(path.endSoundId);
  if (!startSound || !endSound) {
    return [];
  }
  return [startSound.position, ...path.waypoints, endSound.position];
}

/**
 * Computes the visual state for every perceptual path based on which connected
 * sounds are currently playing.
 *
 * Returns a Map so callers can perform O(1) lookups by `pathId` when diffing
 * against existing SVG elements.
 */
export function computePathVisualStates(
  paths: Path[],
  soundsById: Map<number, Sound>,
  activeSounds: Map<number, ActiveSoundLike>
): Map<number, PathVisualState> {
  const result = new Map<number, PathVisualState>();

  for (const path of paths) {
    const aPlaying =
      activeSounds.get(path.startSoundId)?.status === AUDIO_STATUS.PLAYING;
    const bPlaying =
      activeSounds.get(path.endSoundId)?.status === AUDIO_STATUS.PLAYING;

    const points = buildFullPoints(path, soundsById);
    if (points.length < 2) continue;

    if (aPlaying && bPlaying) {
      result.set(path.id, { pathId: path.id, points, variant: 'both' });
    } else if (aPlaying) {
      result.set(path.id, {
        pathId: path.id,
        points,
        variant: 'single',
        activeEndpoint: 'start'
      });
    } else if (bPlaying) {
      result.set(path.id, {
        pathId: path.id,
        points,
        variant: 'single',
        activeEndpoint: 'end'
      });
    } else {
      result.set(path.id, { pathId: path.id, points, variant: 'idle' });
    }
  }

  return result;
}
