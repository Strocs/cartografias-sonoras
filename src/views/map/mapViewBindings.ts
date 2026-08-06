import {
  clearPaths,
  renderPaths
} from '@features/paths/ui/pathRenderer';
import { audioStore, AUDIO_STATUS } from '@shared/lib/audio-engine';

import {
  createMark,
  insertFanButton,
  removeMark,
  updateMark,
  createSoundButton,
  removeSoundButton,
  updateSoundButton,
  type SoundButtonStatus
} from '@features/sounds/ui';
import type { Mark } from '@features/sounds/domain/types';
import type { Path } from '@features/paths/domain/types';
import type { MapViewElement } from '@features/maps/ui/map-view';

import { computePathVisualStates } from './pathStateEngine';

export interface MapViewBindingOptions {
  mapView: MapViewElement;
  marks: Mark[];
  paths: Path[];
  imgWidth: number;
  imgHeight: number;
}

/**
 * Wires a `<map-view>` custom element to the vanilla audio store.
 *
 * Responsibilities:
 * - Create a Mark group per mark (`.sound-mark`) with its fan of sound buttons
 *   (the fan is always visible; there is no open/close toggle).
 * - Render SVG paths based on the current audio playback state.
 * - Toggle playback from `sound:activate`.
 * - React to store changes: update each sound button, paint the mark accent when
 *   any of its sounds is active, and re-derive path visuals.
 * - Apply one `scaleFactor` per group on `viewport-change`.
 */
export function bindMapView({
  mapView,
  marks,
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
  const imageWidth = mapView.imageWidth || imgWidth;
  const imageHeight = mapView.imageHeight || imgHeight;
  let currentScaleFactor = mapView.scaleFactor;

  const marksById = new Map<number, HTMLDivElement>();
  const soundButtonsById = new Map<number, HTMLButtonElement>();

  // Initial render.
  for (const mark of marks) {
    const group = createMark(mark, imageWidth, imageHeight, currentScaleFactor);
    markerLayer.appendChild(group);
    marksById.set(mark.id, group);

    const fan = group.querySelector<HTMLDivElement>('.sound-mark__fan');
    if (fan !== null) {
      mark.sounds.forEach((sound, index) => {
        const button = createSoundButton(sound, mark);
        insertFanButton(fan, index, button);
        soundButtonsById.set(sound.id, button);
      });
    }
  }

  updatePaths();

  // React to audio state changes: sound button state, mark accent, path visuals.
  const unsubscribe = audioStore.subscribe(
    (state) => state.activeSounds,
    () => {
      updateSoundButtons();
      updateMarkAccents();
      updatePaths();
    }
  );

  // Sound activation toggles playback (play/pause/resume) by soundId + mapId.
  const soundActivateHandler = (event: Event) => {
    const detail = (event as CustomEvent).detail as
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

  // Viewport scale changes apply a single scale factor to each group.
  const viewportChangeHandler = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | { scale: number }
      | undefined;
    if (detail === undefined) return;

    currentScaleFactor = 1 / detail.scale;
    for (const group of marksById.values()) {
      updateMark(group, { scaleFactor: currentScaleFactor });
    }
  };

  mapView.addEventListener('sound:activate', soundActivateHandler);
  mapView.addEventListener('viewport-change', viewportChangeHandler);

  function soundStatusOf(soundId: number): SoundButtonStatus {
    const state = audioStore.getState().activeSounds.get(soundId);
    const status = state?.status ?? AUDIO_STATUS.IDLE;
    if (status === AUDIO_STATUS.PLAYING) return 'playing';
    if (status === AUDIO_STATUS.LOADING) return 'loading';
    if (status === AUDIO_STATUS.PAUSED) return 'paused';
    return 'idle';
  }

  function updateSoundButtons(): void {
    const activeSounds = audioStore.getState().activeSounds;

    for (const [soundId, button] of soundButtonsById) {
      const state = activeSounds.get(soundId);
      const progress =
        state !== undefined && state.duration > 0
          ? Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100))
          : 0;

      updateSoundButton(button, { status: soundStatusOf(soundId), progress });
    }
  }

  function updateMarkAccents(): void {
    const activeSounds = audioStore.getState().activeSounds;

    for (const mark of marks) {
      const group = marksById.get(mark.id);
      if (group === undefined) continue;

      const anySoundActive = mark.sounds.some((sound) => {
        const status = activeSounds.get(sound.id)?.status;
        return status === AUDIO_STATUS.PLAYING || status === AUDIO_STATUS.LOADING;
      });

      updateMark(group, { active: anySoundActive });
    }
  }

  function updatePaths(): void {
    const activeSounds = audioStore.getState().activeSounds;
    const marksByIdMap = new Map(marks.map((mark) => [mark.id, mark]));
    const pathStates = computePathVisualStates(paths, marksByIdMap, activeSounds);
    renderPaths(Array.from(pathStates.values()), svg, imageWidth, imageHeight);
  }

  return function unbind(): void {
    unsubscribe();
    mapView.removeEventListener('sound:activate', soundActivateHandler);
    mapView.removeEventListener('viewport-change', viewportChangeHandler);

    for (const button of soundButtonsById.values()) {
      removeSoundButton(button);
    }
    soundButtonsById.clear();

    for (const group of marksById.values()) {
      removeMark(group);
    }
    marksById.clear();

    clearPaths(svg);
  };
}