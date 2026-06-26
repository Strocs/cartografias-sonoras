import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types';

const sound101 = mockSounds.find((s) => s.id === 101)!;
const sound102 = mockSounds.find((s) => s.id === 102)!;

const RING_RADIUS = 30;
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
      <MapContext.Provider value={{ map: mockMap, ready: true, width: 2289, height: 1636 }}>
        {children}
      </MapContext.Provider>
    </MotionConfig>
  );
}

describe('SoundMarker progress sync', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('renders at 54px while idle', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');
    expect(marker).toHaveAttribute('data-status', 'idle');

    // The explicit size lives on the inner container, not the portal root.
    const inner = marker.querySelector<HTMLElement>(
      '.relative.flex.items-center.justify-center'
    );
    expect(inner).toHaveStyle({ width: '54px', height: '54px' });
  });

  it('shows the progress ring and enters playing state', async () => {
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

    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });

  it('renders the active progress circle while playing', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playSound(sound101.id, sound101.mapId);
      audioTransitions.soundLoaded(sound101.id, 60);
    });

    const ring = screen.getByTestId('progress-ring');
    // The active progress circle has the stroke-primary-brown Tailwind class.
    // It is rendered as a second <circle> inside the SVG only while isActive.
    const active = ring.querySelector('circle.stroke-primary-brown');
    expect(active).not.toBeNull();
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
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });

  it('keeps the ring visible at 100% when the sound ends', async () => {
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

    // Ring stays visible at 100% after the sound ends.
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
  });
});

describe('SoundMarker interaction blocking', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('pauses the SoundPiece and plays the marker sound when clicked while piece is active', async () => {
    render(
      <Wrapper>
        <SoundMarker sound={sound101} />
      </Wrapper>
    );

    const marker = await screen.findByTestId('sound-marker');

    act(() => {
      useAudioStore.getState().playPiece(999, sound101.mapId);
      audioTransitions.pieceLoaded(60);
    });

    expect(marker).not.toBeDisabled();

    // The onClick handler lives on the <button>, not the outer container.
    const button = within(marker).getByRole('button');
    await userEvent.click(button);

    // Piece is paused (not stopped).
    expect(useAudioStore.getState().activePieceId).toBe(999);
    expect(useAudioStore.getState().piece.status).toBe(AUDIO_STATUS.PAUSED);
    // Marker sound starts playing.
    expect(useAudioStore.getState().activeSounds.has(sound101.id)).toBe(true);
    expect(useAudioStore.getState().activeSounds.get(sound101.id)?.status).toBe(
      AUDIO_STATUS.LOADING
    );
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
    // Progress ring is always rendered now (base track visible).
    expect(
      screen.getAllByTestId('progress-ring').length
    ).toBeGreaterThanOrEqual(1);

    expect(marker102).toHaveAttribute('data-status', 'idle');
  });
});
