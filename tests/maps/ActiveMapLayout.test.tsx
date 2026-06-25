import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ActiveMapLayout } from '../../src/features/maps/ui/ActiveMapLayout';
import { mockMaps } from '../../src/features/maps/data/mock-maps';
import { mockSounds } from '../../src/features/sounds/data/mock-sounds';
import { mockPaths } from '../../src/features/paths/data/mock-paths';

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

vi.mock('@views/sound-tour', () => ({
  SoundTour: ({
    sounds,
    paths,
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
  ),
}));

const mapImage = mockMaps[0].image;
const sounds = mockSounds.filter((s) => s.mapId === 1).slice(0, 2);
const paths = mockPaths.filter((p) => p.mapId === 1).slice(0, 1);
const inactiveMaps = mockMaps.filter((m) => m.slug !== 'locacion-1').slice(0, 1);

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
    expect(screen.getByText(inactiveMaps[0].title)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: new RegExp(inactiveMaps[0].title) });
    expect(link).toHaveAttribute('href', `/${inactiveMaps[0].slug}`);
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
