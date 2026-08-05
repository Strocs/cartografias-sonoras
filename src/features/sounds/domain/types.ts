export interface Position {
  x: number;
  y: number;
}

/**
 * A single playable audio clip belonging to a {@link Mark}.
 *
 * position and mapId intentionally live on the Mark, not here: a point on a
 * map may host many sounds, so geometry only needs to be expressed once.
 */
export interface Sound {
  id: number;
  title: string;
  description: string;
  location: string;
  audioUrl: string;
  geoReferenceUrl?: string;
}

/**
 * A map point embedding `sounds: Sound[]`. One point = one Mark; the point's
 * position drives both rendering and path endpoints.
 */
export interface Mark {
  id: number;
  mapId: number;
  title: string;
  description: string;
  position: Position;
  location: string;
  sounds: Sound[];
}

/**
 * Legacy flat marker shape retained so the pre-migration UI rendering stack
 * (soundMarker/mapViewBindings/pathStateEngine) keeps resolving sound position
 * and mapId from data that still carries them. Removed when slice B switches
 * the UI to the Mark-group model.
 */
export interface LegacySound extends Sound {
  position: Position;
  mapId: number;
}