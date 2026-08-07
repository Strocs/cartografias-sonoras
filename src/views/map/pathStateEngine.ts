import { AUDIO_STATUS, type AudioStatus } from '@shared/lib/audio-engine'

import type { Path, Point } from '@features/paths/domain/types'
import type { PathVisualState } from '@features/paths/domain/PathVisualState'
import type { Mark } from '@features/sounds/domain/types'

export interface ActiveSoundLike {
  status: AudioStatus
}

/**
 * Builds the full point list for a path by combining the start and end mark
 * positions with the intermediate waypoints. Endpoints are derived from
 * `mark.position` at runtime so markers and paths stay aligned.
 */
function buildFullPoints(path: Path, marksById: Map<number, Mark>): Point[] {
  const startMark = marksById.get(path.startMarkId)
  const endMark = marksById.get(path.endMarkId)
  if (!startMark || !endMark) {
    return []
  }
  return [startMark.position, ...path.waypoints, endMark.position]
}

/**
 * A mark endpoint counts as playing when ANY of its sounds is playing.
 */
function endpointPlaying(
  markId: number,
  marksById: Map<number, Mark>,
  activeSounds: Map<number, ActiveSoundLike>
): boolean {
  const mark = marksById.get(markId)
  if (mark === undefined) return false
  return mark.sounds.some((sound) => activeSounds.get(sound.id)?.status === AUDIO_STATUS.PLAYING)
}

/**
 * Computes the visual state for every perceptual path based on which connected
 * marks currently have a sound playing.
 *
 * Returns a Map so callers can perform O(1) lookups by `pathId` when diffing
 * against existing SVG elements.
 */
export function computePathVisualStates(
  paths: Path[],
  marksById: Map<number, Mark>,
  activeSounds: Map<number, ActiveSoundLike>
): Map<number, PathVisualState> {
  const result = new Map<number, PathVisualState>()

  for (const path of paths) {
    const aPlaying = endpointPlaying(path.startMarkId, marksById, activeSounds)
    const bPlaying = endpointPlaying(path.endMarkId, marksById, activeSounds)

    const points = buildFullPoints(path, marksById)
    if (points.length < 2) continue

    if (aPlaying && bPlaying) {
      result.set(path.id, { pathId: path.id, points, variant: 'both' })
    } else if (aPlaying) {
      result.set(path.id, {
        pathId: path.id,
        points,
        variant: 'single',
        activeEndpoint: 'start'
      })
    } else if (bPlaying) {
      result.set(path.id, {
        pathId: path.id,
        points,
        variant: 'single',
        activeEndpoint: 'end'
      })
    } else {
      result.set(path.id, { pathId: path.id, points, variant: 'idle' })
    }
  }

  return result
}
