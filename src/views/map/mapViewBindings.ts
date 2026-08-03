import {
  createSoundMarker,
  removeSoundMarker,
  updateSoundMarker,
  type SoundMarkerState
} from '@features/sounds/ui/soundMarker';
import { clearPaths, renderPaths } from '@features/paths/ui/pathRenderer';
import { audioStore, AUDIO_STATUS } from '@shared/lib/audio-engine';

import type { Path } from '@features/paths/domain/types';
import type { Sound } from '@features/sounds/domain/types';
import type { MapViewElement } from '@features/maps/ui/map-view';

import { computePathVisualStates } from './pathStateEngine';

export interface MapViewBindingOptions {
  mapView: MapViewElement;
  sounds: Sound[];
  paths: Path[];
  imgWidth: number;
  imgHeight: number;
}

/**
 * Wires a `<map-view>` custom element to the vanilla audio store.
 *
 * Responsibilities:
 * - Create vanilla sound markers inside the marker layer.
 * - Render SVG paths based on the current audio playback state.
 * - Update marker selection + progress ring when the store changes.
 * - Activate sounds when a marker dispatches `marker:activate`.
 * - Keep marker visual size constant via the scale factor from `viewport-change`.
 */
export function bindMapView({
  mapView,
  sounds,
  paths,
  imgWidth,
  imgHeight
}: MapViewBindingOptions): () => void {
  const markerLayer = mapView.markerLayer;
  const svgLayer = mapView.svgLayer;

  if (markerLayer === null || svgLayer === null) {
    throw new Error('<map-view> layers are not ready');
  }

  const svg = svgLayer;
  const soundsById = new Map(sounds.map((sound) => [sound.id, sound]));
  const markersById = new Map<number, HTMLButtonElement>();

  const imageWidth = mapView.imageWidth || imgWidth;
  const imageHeight = mapView.imageHeight || imgHeight;
  let currentScaleFactor = mapView.scaleFactor;

  // Initial render.
  for (const sound of sounds) {
    const marker = createSoundMarker(
      sound,
      imageWidth,
      imageHeight,
      currentScaleFactor
    );
    markerLayer.appendChild(marker);
    markersById.set(sound.id, marker);
  }

  updatePaths();

  // React to audio state changes: selection, progress, and path visuals.
  const unsubscribe = audioStore.subscribe(
    (state) => state.activeSounds,
    () => {
      updateMarkers();
      updatePaths();
    }
  );

  // Marker activation toggles playback.
  const markerActivateHandler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail as
      | { soundId: number; mapId: number }
      | undefined;
    if (detail === undefined) return;

    const state = audioStore.getState().activeSounds.get(detail.soundId);
    const status = state?.status ?? AUDIO_STATUS.IDLE;

    if (status === AUDIO_STATUS.PLAYING || status === AUDIO_STATUS.LOADING) {
      audioStore.getState().pauseSound(detail.soundId);
    } else if (status === AUDIO_STATUS.PAUSED) {
      audioStore.getState().resumeSound(detail.soundId);
    } else {
      audioStore.getState().playSound(detail.soundId, detail.mapId);
    }
  };

  // Viewport scale changes require compensating marker size.
  const viewportChangeHandler = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | { scale: number }
      | undefined;
    if (detail === undefined) return;

    currentScaleFactor = 1 / detail.scale;
    for (const marker of markersById.values()) {
      updateSoundMarker(marker, { scaleFactor: currentScaleFactor });
    }
  };

  mapView.addEventListener('marker:activate', markerActivateHandler);
  mapView.addEventListener('viewport-change', viewportChangeHandler);

  function updateMarkers(): void {
    const activeSounds = audioStore.getState().activeSounds;

    for (const [soundId, marker] of markersById) {
      const state = activeSounds.get(soundId);
      const status = state?.status ?? AUDIO_STATUS.IDLE;

      const markerStatus: SoundMarkerState['status'] =
        status === AUDIO_STATUS.PLAYING || status === AUDIO_STATUS.LOADING
          ? 'playing'
          : status === AUDIO_STATUS.PAUSED
            ? 'paused'
            : 'idle';

      const progress =
        state !== undefined && state.duration > 0
          ? Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100))
          : 0;

      updateSoundMarker(marker, {
        status: markerStatus,
        progress,
        scaleFactor: currentScaleFactor
      });
    }
  }

  function updatePaths(): void {
    const activeSounds = audioStore.getState().activeSounds;
    const pathStates = computePathVisualStates(paths, soundsById, activeSounds);
    renderPaths(Array.from(pathStates.values()), svg, imageWidth, imageHeight);
  }

  return function unbind(): void {
    unsubscribe();
    mapView.removeEventListener('marker:activate', markerActivateHandler);
    mapView.removeEventListener('viewport-change', viewportChangeHandler);

    for (const marker of markersById.values()) {
      removeSoundMarker(marker);
    }
    markersById.clear();

    clearPaths(svg);
  };
}
