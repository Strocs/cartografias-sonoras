import { describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { SoundMarker } from '../../src/features/sounds/ui/SoundMarker';
import { MapContext } from '../../src/shared/lib/viewport/MapContext';
import { mockSounds } from '../../src/features/sounds/data/mock-sounds';

const sound = mockSounds[0];

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

const playSound = vi.fn();
const pauseSound = vi.fn();

vi.mock('@shared/lib/audio-engine', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/audio-engine')>(
    '@shared/lib/audio-engine'
  );
  return {
    ...actual,
    useAudioStore: vi.fn((selector) => {
      const state = {
        activeSounds: new Map(),
        activePieceId: null,
        playSound,
        pauseSound,
      };
      return selector(state as never);
    }),
  };
});

describe('SoundMarker', () => {
  it('renders at the correct sound position via Leaflet marker', async () => {
    render(
      <MapContext.Provider value={{ map: mockMap, ready: true }}>
        <SoundMarker sound={sound} />
      </MapContext.Provider>
    );

    const { default: L } = await import('leaflet');

    await waitFor(() => {
      expect(L.marker).toHaveBeenCalledWith(
        [sound.position.y, sound.position.x],
        expect.any(Object)
      );
    });
  });

  it('renders in idle state by default', async () => {
    render(
      <MapContext.Provider value={{ map: mockMap, ready: true }}>
        <SoundMarker sound={sound} />
      </MapContext.Provider>
    );

    const marker = await screen.findByTestId('sound-marker');
    expect(marker).toHaveAttribute('data-status', 'idle');
  });

  it('plays the sound when clicked in idle state', async () => {
    render(
      <MapContext.Provider value={{ map: mockMap, ready: true }}>
        <SoundMarker sound={sound} />
      </MapContext.Provider>
    );

    const marker = await screen.findByTestId('sound-marker');
    await userEvent.click(marker);

    expect(playSound).toHaveBeenCalledWith(sound.id, sound.mapId);
  });
});
