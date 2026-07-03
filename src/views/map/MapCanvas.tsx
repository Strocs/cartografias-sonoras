'use client';

import { AudioPool } from '@shared/lib/audio-engine';
import { MapViewport } from '@shared/lib/viewport';
import { SoundTour } from '@views/sound-tour';
import { MapControls } from '@features/maps/ui/MapControls';

import type { Sound } from '@features/sounds/domain/types';
import type { Path } from '@features/paths/domain/types';
import type { SoundPiece } from '@features/sound-pieces/domain/types';

/** Sanitized map shape for client islands — only plain-serializable fields. */
interface SerializableMap {
  id: number;
  slug: string;
  title: string;
  image: {
    src: string;
    width: number;
    height: number;
  };
  soundPieceId: number;
}

export interface MapCanvasProps {
  map: SerializableMap;
  sounds: Sound[];
  paths: Path[];
  soundPiece?: SoundPiece | null;
}

/**
 * Interactive cartography canvas — the client:only React island that composes
 * the Leaflet viewport with sound markers, perceptual paths, zoom controls,
 * and the hidden audio element pool. Lives in views/ because it orchestrates
 * three features: maps (viewport + controls), sounds (markers), and paths.
 */
export function MapCanvas({ map, sounds, paths, soundPiece }: MapCanvasProps) {
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
    </div>
  );
}
