import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ActiveMapLayout } from '../../src/features/maps/ui/ActiveMapLayout';
import type { Map } from '../../src/features/maps/domain/types';
import type { Path } from '../../src/features/paths/domain/types';
import type { Sound } from '../../src/features/sounds/domain/types';

vi.mock('../../src/shared/lib/viewport/MapViewport', () => ({
  MapViewport: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-testid="mock-viewport" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('../../src/features/sounds/ui/SoundMarker', () => ({
  SoundMarker: ({ sound }: { sound: Sound }) => (
    <div data-testid="sound-marker" data-sound-id={sound.id} />
  ),
}));

vi.mock('../../src/features/paths/ui/PathOverlay', () => ({
  PathOverlay: ({ paths }: { paths: Path[] }) => (
    <div data-testid="path-overlay" data-path-count={paths.length} />
  ),
}));

const mapImage: Map['image'] = {
  src: '/maps/locacion-1.png',
  width: 1216,
  height: 864,
};

const sounds: Sound[] = [
  {
    id: 101,
    title: 'Fuente central',
    description: 'Murmullo del agua.',
    audioUrl: '/sounds/locacion-1/fuente-central.mp3',
    position: { x: 608, y: 432 },
    mapId: 1,
  },
  {
    id: 102,
    title: 'Tráfico peatonal',
    description: 'Pasos dispersos.',
    audioUrl: '/sounds/locacion-1/trafico-peatonal.mp3',
    position: { x: 365, y: 270 },
    mapId: 1,
  },
];

const paths: Path[] = [
  {
    id: 1001,
    mapId: 1,
    points: [
      { x: 608, y: 432 },
      { x: 365, y: 270 },
    ],
    soundIds: [101, 102],
  },
];

const inactiveMaps: Map[] = [
  {
    id: 2,
    slug: 'locacion-2',
    title: 'Mercado — Coquimbo',
    image: { src: '/maps/locacion-2.png', width: 864, height: 1243 },
    soundPieceId: 2,
  },
];

describe('ActiveMapLayout', () => {
  it('renders the viewport with the given image dimensions', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    expect(screen.getByTestId('mock-viewport')).toHaveClass('size-full');
  });

  it('renders a sound marker for each sound', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    const markers = screen.getAllByTestId('sound-marker');
    expect(markers).toHaveLength(sounds.length);
    expect(markers[0]).toHaveAttribute('data-sound-id', String(sounds[0].id));
    expect(markers[1]).toHaveAttribute('data-sound-id', String(sounds[1].id));
  });

  it('renders path overlay with the provided paths', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    expect(screen.getByTestId('path-overlay')).toHaveAttribute(
      'data-path-count',
      String(paths.length)
    );
  });

  it('renders map controls', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    expect(screen.getByTestId('map-controls')).toBeInTheDocument();
  });

  it('renders the right rail with inactive maps', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    expect(screen.getByTestId('right-rail')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /mercado/i });
    expect(link).toHaveAttribute('href', '/locacion-2');
  });

  it('renders the warm cream canvas background', () => {
    render(
      <ActiveMapLayout
        slug="locacion-1"
        mapImage={mapImage}
        sounds={sounds}
        paths={paths}
        inactiveMaps={inactiveMaps}
      />
    );

    const canvas = screen.getByTestId('map-canvas');
    expect(canvas).toHaveStyle({ backgroundColor: '#F5F2ED' });
  });
});
