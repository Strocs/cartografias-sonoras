'use client';

import { MapViewport } from '@shared/lib/viewport';
/*
 * Composition root exception: ActiveMapLayout is the assembly point for all
 * interactive map components. It must import PathOverlay (paths feature) and
 * SoundMarker (sounds feature) to compose the full cartography experience.
 * This is a recognized architecture pattern — the composition root owns the
 * dependency graph. Feature-level isolation is preserved everywhere else.
 */
// eslint-disable-next-line no-restricted-imports
import { PathOverlay } from '../../paths/ui';
// eslint-disable-next-line no-restricted-imports
import { SoundMarker } from '../../sounds/ui';

import type { Map, MapImage } from '../domain/types';
import type { Sound } from '../../sounds/domain/types';
import type { Path } from '../../paths/domain/types';
import { MapControls } from './MapControls';
import { RightRail } from './RightRail';

export interface ActiveMapLayoutProps {
  slug: string;
  mapImage: MapImage;
  sounds: Sound[];
  paths: Path[];
  inactiveMaps: Map[];
}

export function ActiveMapLayout({
  slug,
  mapImage,
  sounds,
  paths,
  inactiveMaps,
}: ActiveMapLayoutProps) {
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [mapImage.height, mapImage.width],
  ];

  return (
    <div className="relative flex size-full">
      <div
        className="relative flex-1"
        style={{ backgroundColor: '#F5F2ED' }}
        data-testid="map-canvas"
      >
        <MapViewport
          imageUrl={mapImage.src}
          width={mapImage.width}
          height={mapImage.height}
          className="size-full"
        >
          <PathOverlay paths={paths} />
          {sounds.map((sound) => (
            <SoundMarker key={sound.id} sound={sound} />
          ))}
          <MapControls bounds={bounds} />
        </MapViewport>
      </div>
      <RightRail maps={inactiveMaps} activeSlug={slug} />
    </div>
  );
}
