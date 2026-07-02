'use client';

import { AudioPool } from '@shared/lib/audio-engine';
import { MapViewport } from '@shared/lib/viewport';
import { SoundTour } from '@views/sound-tour';
import { MapControls } from '@features/maps/ui/MapControls';
import { AudioBottomPlayer } from '@features/sound-pieces/ui/AudioBottomPlayer';

import type { Map } from '@features/maps/domain/types';
import type { Sound } from '@features/sounds/domain/types';
import type { Path } from '@features/paths/domain/types';
import type { SoundPiece } from '@features/sound-pieces/domain/types';

export interface MapPageProps {
  map: Map;
  sounds: Sound[];
  paths: Path[];
  soundPiece?: SoundPiece | null;
}

export function MapPage({ map, sounds, paths, soundPiece }: MapPageProps) {
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [map.image.height, map.image.width]
  ];

  const audioPoolSounds = sounds.map((sound) => ({
    id: sound.id,
    audioUrl: sound.audioUrl
  }));

  const audioPoolPiece = soundPiece
    ? { id: soundPiece.id, audioUrl: soundPiece.audioUrl }
    : null;

  return (
    <div className="relative flex-1" data-testid="map-canvas">
      <MapViewport
        imageUrl={map.image.src}
        width={map.image.width}
        height={map.image.height}
        className="size-full"
      >
        <SoundTour sounds={sounds} paths={paths} />
        <MapControls bounds={bounds} />
      </MapViewport>
      <AudioPool sounds={audioPoolSounds} soundPiece={audioPoolPiece} />

      <div className="absolute right-8 bottom-4 z-[1001]">
        <AudioBottomPlayer mapImage={map.image} soundPiece={soundPiece} />
      </div>
    </div>
  );
}
