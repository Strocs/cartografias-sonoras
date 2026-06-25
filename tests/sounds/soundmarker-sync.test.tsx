import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { SoundMarker } from '../../src/features/sounds/ui/SoundMarker';
import { MapContext } from '../../src/shared/lib/viewport/MapContext';
import { mockSounds } from '../../src/features/sounds/data/mock-sounds';
import { createInitialState } from '../../src/shared/lib/audio-engine/engine';
import {
  audioTransitions,
  useAudioStore,
} from '../../src/shared/lib/audio-engine/store';

const sound101 = mockSounds.find((s) => s.id === 101)!;
const sound102 = mockSounds.find((s) => s.id === 102)!;

const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const mockMap = {
  createPane: vi.fn(),
  getPane: vi.fn(),
} as unknown as L.Map;

const mockMarker = {
  addTo: vi.fn(() => mockMarker),
  remove: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({ options: {} })),
    marker: vi.fn(() => mockMarker),
    latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
    point: vi.fn((x: number, y: number) => ({ x, y })),
  },
}));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (children: ReactNode) => children,
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="always">
      <MapContext.Provider value={{ map: mockMap, ready: true }}>
        {children}
      </MapContext.Provider>
    </MotionConfig>
  );
}

describe('SoundMarker progress sync', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('renders at 40px while idle', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');
    expect(marker).toHaveAttribute('data-status', 'idle');
    expect(marker).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('scales to 56px and shows the progress ring when playing', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
    });

    await waitFor(() => {
      expect(marker).toHaveAttribute('data-status', 'playing');
    });

    expect(marker).toHaveStyle({ width: '56px', height: '56px' });
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });

  it('updates the progress ring offset from currentTime / duration', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
      audioTransitions.soundTimeUpdated(sound101.id, 15);
    });

    const ring = await screen.findByTestId('progress-ring');
    const circle = ring.querySelector('circle');
    const expectedOffset = RING_CIRCUMFERENCE * (1 - 15 / 60);

    expect(circle).toHaveAttribute(
      'stroke-dashoffset',
      String(expectedOffset)
    );
  });

  it('keeps the progress ring visible while paused', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
      audioTransitions.soundTimeUpdated(sound101.id, 20);
      useAudioStore.getState().pauseSound(sound101.id);
    });

    const marker = await screen.findByTestId('sound-marker');
    expect(marker).toHaveAttribute('data-status', 'paused');
    expect(marker).toHaveStyle({ width: '56px', height: '56px' });
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });

  it('returns to idle and hides the ring when the sound ends', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
      audioTransitions.soundEnded(sound101.id);
    });

    await waitFor(() => {
      expect(marker).toHaveAttribute('data-status', 'idle');
    });

    expect(marker).toHaveStyle({ width: '40px', height: '40px' });
    expect(screen.queryByTestId('progress-ring')).not.toBeInTheDocument();
  });
});

describe('SoundMarker interaction blocking', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('disables the marker and ignores clicks when a SoundPiece is active', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playPiece(999, sound101.mapId);
    });

    await waitFor(() => {
      expect(marker).toHaveAttribute('data-disabled', 'true');
    });

    expect(marker).toBeDisabled();

    await userEvent.click(marker);

    expect(useAudioStore.getState().activeSounds.has(sound101.id)).toBe(false);
  });
});

describe('SoundMarker render isolation', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('only updates the marker whose sound receives a timeupdate', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
        <SoundMarker sound={sound102} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('sound-marker')).toHaveLength(2);
    });

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
      audioTransitions.soundTimeUpdated(sound101.id, 5);
    });

    await waitFor(() => {
      const marker101 = screen
        .getAllByTestId('sound-marker')
        .find(
          (el) => el.getAttribute('data-sound-id') === String(sound101.id)
        );
      expect(marker101).toHaveAttribute('data-status', 'playing');
    });

    const marker101 = screen
      .getAllByTestId('sound-marker')
      .find((el) => el.getAttribute('data-sound-id') === String(sound101.id))!;
    const marker102 = screen
      .getAllByTestId('sound-marker')
      .find((el) => el.getAttribute('data-sound-id') === String(sound102.id))!;

    expect(marker101).toHaveAttribute('data-status', 'playing');
    expect(marker101).toHaveStyle({ width: '56px', height: '56px' });
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();

    expect(marker102).toHaveAttribute('data-status', 'idle');
    expect(marker102).toHaveStyle({ width: '40px', height: '40px' });
  });
});
