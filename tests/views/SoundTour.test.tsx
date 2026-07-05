import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { SoundTour } from '../../src/views/sound-tour/SoundTour';
import type { Path } from '../../src/features/paths/domain/types';
import type { PathVisualState } from '../../src/features/paths/domain/PathVisualState';
import type { Sound } from '../../src/features/sounds/domain/types';
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types';

const sounds: Sound[] = [
  { id: 101, title: 'A', position: { x: 77, y: 20 }, mapId: 1 } as Sound,
  { id: 102, title: 'B', position: { x: 68.4, y: 30 }, mapId: 1 } as Sound,
];

const path: Path = {
  id: 1001,
  mapId: 1,
  waypoints: [{ x: 72.7, y: 25 }],
  startSoundId: 101,
  endSoundId: 102,
};

let mockActiveSounds = new Map<number, { status: string }>();

vi.mock('@shared/lib/audio-engine', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/audio-engine')>(
    '@shared/lib/audio-engine'
  );
  return {
    ...actual,
    useAudioStore: vi.fn((selector) => {
      const state = {
        activeSounds: mockActiveSounds,
        activePieceId: null,
        piece: { status: AUDIO_STATUS.IDLE },
        playSound: vi.fn(),
        pauseSound: vi.fn(),
      };
      return selector(state as never);
    }),
  };
});

function PathOverlayCapture({ pathStates }: { pathStates: PathVisualState[] }): ReactElement {
  return <div data-testid="path-overlay" data-path-states={JSON.stringify(pathStates)} />;
}

vi.mock('@features/paths/ui', () => ({ PathOverlay: PathOverlayCapture }));

vi.mock('@features/sounds/ui', () => ({
  SoundMarker: ({ sound }: { sound: { id: number } }) => (
    <div data-testid="sound-marker" data-sound-id={sound.id} />
  ),
}));

describe('SoundTour', () => {
  beforeEach(() => {
    mockActiveSounds = new Map();
  });

  it('renders a sound marker for each sound', () => {
    render(<SoundTour sounds={sounds} paths={[path]} />);
    expect(screen.getAllByTestId('sound-marker')).toHaveLength(sounds.length);
  });

  it('computes idle state when neither sound is playing', () => {
    render(<SoundTour sounds={sounds} paths={[path]} />);
    const states: PathVisualState[] = JSON.parse(
      screen.getByTestId('path-overlay').getAttribute('data-path-states')!
    );
    expect(states[0]).toMatchObject({ pathId: path.id, variant: 'idle' });
  });

  it('computes single/start state when start sound is playing', () => {
    mockActiveSounds.set(path.startSoundId, { status: AUDIO_STATUS.PLAYING });
    render(<SoundTour sounds={sounds} paths={[path]} />);
    const states: PathVisualState[] = JSON.parse(
      screen.getByTestId('path-overlay').getAttribute('data-path-states')!
    );
    expect(states[0]).toMatchObject({ pathId: path.id, variant: 'single', activeEndpoint: 'start' });
  });

  it('computes single/end state when end sound is playing', () => {
    mockActiveSounds.set(path.endSoundId, { status: AUDIO_STATUS.PLAYING });
    render(<SoundTour sounds={sounds} paths={[path]} />);
    const states: PathVisualState[] = JSON.parse(
      screen.getByTestId('path-overlay').getAttribute('data-path-states')!
    );
    expect(states[0]).toMatchObject({ pathId: path.id, variant: 'single', activeEndpoint: 'end' });
  });

  it('computes both state when both sounds are playing', () => {
    mockActiveSounds.set(path.startSoundId, { status: AUDIO_STATUS.PLAYING });
    mockActiveSounds.set(path.endSoundId, { status: AUDIO_STATUS.PLAYING });
    render(<SoundTour sounds={sounds} paths={[path]} />);
    const states: PathVisualState[] = JSON.parse(
      screen.getByTestId('path-overlay').getAttribute('data-path-states')!
    );
    expect(states[0]).toMatchObject({ pathId: path.id, variant: 'both' });
  });

  it('builds full points from sound positions and waypoints', () => {
    render(<SoundTour sounds={sounds} paths={[path]} />);
    const states: PathVisualState[] = JSON.parse(
      screen.getByTestId('path-overlay').getAttribute('data-path-states')!
    );
    // startSound position + waypoint + endSound position
    expect(states[0].points).toEqual([
      { x: 77, y: 20 },       // sound 101 position
      { x: 72.7, y: 25 },     // waypoint
      { x: 68.4, y: 30 },     // sound 102 position
    ]);
  });
});
