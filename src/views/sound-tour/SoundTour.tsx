'use client';

import { PathOverlay } from '@features/paths/ui';
import { SoundMarker } from '@features/sounds/ui';

import type { Path } from '@features/paths/domain/types';
import type { Sound } from '@features/sounds/domain/types';

export interface SoundTourProps {
  sounds: Sound[];
  paths: Path[];
}

/**
 * Orchestrates the relationship between sound markers and perceptual paths
 * for a single cartography. Lives in views/ because it composes two features
 * (sounds + paths) into a cohesive use case: the sound-tour experience.
 */
export function SoundTour({ sounds, paths }: SoundTourProps) {
  return (
    <>
      <PathOverlay paths={paths} />
      {sounds.map((sound) => (
        <SoundMarker key={sound.id} sound={sound} />
      ))}
    </>
  );
}
