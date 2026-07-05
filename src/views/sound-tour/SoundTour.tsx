'use client';

import { PathOverlay } from '@features/paths/ui';
import { SoundMarker } from '@features/sounds/ui';
import { AUDIO_STATUS, useAudioStore } from '@shared/lib/audio-engine';

import type { Path } from '@features/paths/domain/types';
import type { PathVisualState } from '@features/paths/domain/PathVisualState';
import type { Sound } from '@features/sounds/domain/types';
import type { Point } from '@features/paths/domain/types';

export interface SoundTourProps {
  sounds: Sound[];
  paths: Path[];
}

/**
 * Builds the full point list for a path by combining the start and end sound
 * positions with the intermediate waypoints. Endpoints are never defined
 * manually — they come from the sound data, guaranteeing alignment.
 */
function buildFullPoints(path: Path, soundsById: Map<number, Sound>): Point[] {
  const startSound = soundsById.get(path.startSoundId);
  const endSound = soundsById.get(path.endSoundId);
  if (!startSound || !endSound) {
    return [];
  }
  return [startSound.position, ...path.waypoints, endSound.position];
}

function computePathVisualStates(
  paths: Path[],
  soundsById: Map<number, Sound>,
  activeSounds: Map<number, { status: string }>
): PathVisualState[] {
  return paths.map((path) => {
    const aPlaying =
      activeSounds.get(path.startSoundId)?.status === AUDIO_STATUS.PLAYING;
    const bPlaying =
      activeSounds.get(path.endSoundId)?.status === AUDIO_STATUS.PLAYING;

    const points = buildFullPoints(path, soundsById);

    if (aPlaying && bPlaying) {
      return { pathId: path.id, points, variant: 'both' };
    }

    if (aPlaying) {
      return { pathId: path.id, points, variant: 'single', activeEndpoint: 'start' };
    }

    if (bPlaying) {
      return { pathId: path.id, points, variant: 'single', activeEndpoint: 'end' };
    }

    return { pathId: path.id, points, variant: 'idle' };
  });
}

/**
 * Orchestrates the relationship between sound markers and perceptual paths
 * for a single cartography. Lives in views/ because it composes two features
 * (sounds + paths) into a cohesive use case: the sound-tour experience.
 *
 * Audio-store subscription lives here so that `features/paths` remains a
 * presentational, framework-agnostic feature and never imports the audio
 * engine or `features/sounds` internals.
 */
export function SoundTour({ sounds, paths }: SoundTourProps) {
  const activeSounds = useAudioStore((s) => s.activeSounds);

  const soundsById = new Map(sounds.map((s) => [s.id, s]));
  const pathStates = computePathVisualStates(paths, soundsById, activeSounds);

  return (
    <>
      <PathOverlay pathStates={pathStates} />
      {sounds.map((sound) => (
        <SoundMarker key={sound.id} sound={sound} />
      ))}
    </>
  );
}
