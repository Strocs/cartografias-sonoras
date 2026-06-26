'use client';

import { AudioPool } from '@shared/lib/audio-engine';
import { MapViewport } from '@shared/lib/viewport';
import { SoundTour } from '@views/sound-tour';

import type { Map, MapImage } from '../domain/types';
import type { Sound } from '../../sounds/domain/types';
import type { Path } from '../../paths/domain/types';
import type { SoundPiece } from '../../sound-pieces/domain/types';
import { AudioBottomPlayer } from '../../sound-pieces/ui/AudioBottomPlayer';
import { MapControls } from './MapControls';
import { RightRail } from './RightRail';

export interface ActiveMapLayoutProps {
  slug: string;
  mapTitle: string;
  mapImage: MapImage;
  sounds: Sound[];
  paths: Path[];
  inactiveMaps: Map[];
  soundPiece?: SoundPiece | null;
}

export function ActiveMapLayout({
  slug,
  mapTitle,
  mapImage,
  sounds,
  paths,
  inactiveMaps,
  soundPiece
}: ActiveMapLayoutProps) {
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [mapImage.height, mapImage.width]
  ];

  const audioPoolSounds = sounds.map((sound) => ({
    id: sound.id,
    audioUrl: sound.audioUrl
  }));

  const audioPoolPiece = soundPiece
    ? { id: soundPiece.id, audioUrl: soundPiece.audioUrl }
    : null;

  return (
    <div className="relative flex size-full">
      <div className="relative flex-1" data-testid="map-canvas">
        <MapViewport
          imageUrl={mapImage.src}
          width={mapImage.width}
          height={mapImage.height}
          className="size-full"
        >
          <SoundTour sounds={sounds} paths={paths} />
          <MapControls bounds={bounds} />
        </MapViewport>
        <AudioPool sounds={audioPoolSounds} soundPiece={audioPoolPiece} />

        <div className="absolute right-8 bottom-4 left-8 z-[1001] flex items-center justify-between gap-8">
          <h2 className="text-charcoal/60 block text-3xl font-black uppercase">
            {mapTitle}
          </h2>
          <AudioBottomPlayer mapImage={mapImage} soundPiece={soundPiece} />
        </div>
      </div>

      <RightRail maps={inactiveMaps} activeSlug={slug} />
    </div>
  );
}
