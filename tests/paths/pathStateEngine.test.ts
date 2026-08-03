import { describe, expect, it } from 'vitest';

import { computePathVisualStates } from '../../src/views/map/pathStateEngine';
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine';

import type { Path } from '../../src/features/paths/domain/types';
import type { Sound } from '../../src/features/sounds/domain/types';

const sounds: Sound[] = [
  {
    id: 1,
    title: 'A',
    description: 'Sound A',
    location: 'Start',
    audioUrl: '/a.mp3',
    position: { x: 0, y: 0 },
    mapId: 1
  },
  {
    id: 2,
    title: 'B',
    description: 'Sound B',
    location: 'End',
    audioUrl: '/b.mp3',
    position: { x: 100, y: 100 },
    mapId: 1
  }
];

const path: Path = {
  id: 10,
  mapId: 1,
  waypoints: [{ x: 50, y: 50 }],
  startSoundId: 1,
  endSoundId: 2
};

const soundsById = new Map(sounds.map((s) => [s.id, s]));

describe('computePathVisualStates', () => {
  it('returns idle when neither endpoint sound is playing', () => {
    const activeSounds = new Map();

    const result = computePathVisualStates([path], soundsById, activeSounds);

    expect(result.size).toBe(1);
    expect(result.get(10)?.variant).toBe('idle');
    expect(result.get(10)?.points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 }
    ]);
  });

  it('returns single with start endpoint when only the start sound is playing', () => {
    const activeSounds = new Map([
      [1, { status: AUDIO_STATUS.PLAYING }]
    ]);

    const result = computePathVisualStates([path], soundsById, activeSounds);

    expect(result.get(10)?.variant).toBe('single');
    expect(result.get(10)).toMatchObject({
      pathId: 10,
      variant: 'single',
      activeEndpoint: 'start'
    });
  });

  it('returns single with end endpoint when only the end sound is playing', () => {
    const activeSounds = new Map([
      [2, { status: AUDIO_STATUS.PLAYING }]
    ]);

    const result = computePathVisualStates([path], soundsById, activeSounds);

    expect(result.get(10)?.variant).toBe('single');
    expect(result.get(10)).toMatchObject({
      variant: 'single',
      activeEndpoint: 'end'
    });
  });

  it('returns both when both endpoint sounds are playing', () => {
    const activeSounds = new Map([
      [1, { status: AUDIO_STATUS.PLAYING }],
      [2, { status: AUDIO_STATUS.PLAYING }]
    ]);

    const result = computePathVisualStates([path], soundsById, activeSounds);

    expect(result.get(10)?.variant).toBe('both');
  });

  it('ignores loading and paused statuses when computing visual state', () => {
    const activeSounds = new Map([
      [1, { status: AUDIO_STATUS.LOADING }],
      [2, { status: AUDIO_STATUS.PAUSED }]
    ]);

    const result = computePathVisualStates([path], soundsById, activeSounds);

    expect(result.get(10)?.variant).toBe('idle');
  });

  it('skips paths whose endpoint sounds are missing', () => {
    const partialSounds = new Map([[1, sounds[0]]]);
    const activeSounds = new Map([[1, { status: AUDIO_STATUS.PLAYING }]]);

    const result = computePathVisualStates([path], partialSounds, activeSounds);

    expect(result.size).toBe(0);
  });

  it('maps multiple paths independently', () => {
    const pathB: Path = {
      id: 20,
      mapId: 1,
      waypoints: [],
      startSoundId: 1,
      endSoundId: 2
    };

    const activeSounds = new Map([
      [1, { status: AUDIO_STATUS.PLAYING }]
    ]);

    const result = computePathVisualStates([path, pathB], soundsById, activeSounds);

    expect(result.size).toBe(2);
    expect(result.get(10)?.variant).toBe('single');
    expect(result.get(20)?.variant).toBe('single');
  });
});
