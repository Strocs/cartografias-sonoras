import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { MapPage } from '../../src/views/map/MapPage';
import { mockMaps } from '../../src/features/maps/data/mock-maps';
import { mockSounds } from '../../src/features/sounds/data/mock-sounds';
import { mockPaths } from '../../src/features/paths/data/mock-paths';

vi.mock('@shared/lib/viewport', () => ({
  MapViewport: ({
    children,
    className
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-testid="mock-viewport" className={className}>
      {children}
    </div>
  )
}));

vi.mock('@views/sound-tour', () => ({
  SoundTour: ({
    sounds,
    paths
  }: {
    sounds: { id: number }[];
    paths: unknown[];
  }) => (
    <>
      <div data-testid="path-overlay" data-path-count={paths.length} />
      {sounds.map((s) => (
        <div key={s.id} data-testid="sound-marker" data-sound-id={s.id} />
      ))}
    </>
  )
}));

vi.mock('@features/maps/ui/MapControls', () => ({
  MapControls: () => <div data-testid="map-controls" />
}));

vi.mock('@shared/lib/audio-engine', () => ({
  AudioPool: () => <div data-testid="audio-pool" />
}));

const map = mockMaps[0];
const sounds = mockSounds.filter((s) => s.mapId === map.id).slice(0, 2);
const paths = mockPaths.filter((p) => p.mapId === map.id).slice(0, 1);

describe('MapPage', () => {
  it('renders the viewport with the given image dimensions', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    expect(screen.getByTestId('mock-viewport')).toHaveClass('size-full');
  });

  it('renders a sound marker for each sound', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    const markers = screen.getAllByTestId('sound-marker');
    expect(markers).toHaveLength(sounds.length);
    expect(markers[0]).toHaveAttribute('data-sound-id', String(sounds[0].id));
    expect(markers[1]).toHaveAttribute('data-sound-id', String(sounds[1].id));
  });

  it('renders path overlay with the provided paths', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    expect(screen.getByTestId('path-overlay')).toHaveAttribute(
      'data-path-count',
      String(paths.length)
    );
  });

  it('renders map controls', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    expect(screen.getByTestId('map-controls')).toBeInTheDocument();
  });

  it('renders the audio pool', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    expect(screen.getByTestId('audio-pool')).toBeInTheDocument();
  });

  it('renders the map canvas container', () => {
    render(
      <MapPage map={map} sounds={sounds} paths={paths} soundPiece={null} />
    );

    const canvas = screen.getByTestId('map-canvas');
    expect(canvas).toBeInTheDocument();
  });
});
