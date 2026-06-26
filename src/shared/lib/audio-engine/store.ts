import { create } from 'zustand';

import {
  createInitialState,
  pausePiece as pausePieceEngine,
  pauseSound as pauseSoundEngine,
  pieceEnded as pieceEndedEngine,
  pieceError as pieceErrorEngine,
  pieceLoaded as pieceLoadedEngine,
  playPiece as playPieceEngine,
  playSound as playSoundEngine,
  resumePiece as resumePieceEngine,
  resumeSound as resumeSoundEngine,
  seekPiece as seekPieceEngine,
  seekSound as seekSoundEngine,
  soundEnded as soundEndedEngine,
  soundError as soundErrorEngine,
  soundLoaded as soundLoadedEngine,
  stopAllSounds as stopAllSoundsEngine,
  stopPiece as stopPieceEngine,
  stopSound as stopSoundEngine,
} from './engine';
import type { AudioStore } from './types';

export const useAudioStore = create<AudioStore>((set) => ({
  ...createInitialState(),

  playSound: (soundId, mapId) => {
    set((state) => playSoundEngine(state, soundId, mapId));
  },

  pauseSound: (soundId) => {
    set((state) => pauseSoundEngine(state, soundId));
  },

  resumeSound: (soundId) => {
    set((state) => resumeSoundEngine(state, soundId));
  },

  stopSound: (soundId) => {
    set((state) => stopSoundEngine(state, soundId));
  },

  stopAllSounds: () => {
    set((state) => stopAllSoundsEngine(state));
  },

  playPiece: (pieceId, mapId) => {
    set((state) => playPieceEngine(state, pieceId, mapId));
  },

  pausePiece: () => {
    set((state) => pausePieceEngine(state));
  },

  resumePiece: () => {
    set((state) => resumePieceEngine(state));
  },

  seekPiece: (time) => {
    set((state) => seekPieceEngine(state, time));
  },
}));

// Internal transition actions used by audio element event handlers.
// Kept outside the public AudioActions interface to keep the API focused,
// but exposed through the store for event wiring.
export const audioTransitions = {
  soundLoaded: (soundId: number) => {
    useAudioStore.setState((state) => soundLoadedEngine(state, soundId));
  },

  soundEnded: (soundId: number) => {
    useAudioStore.setState((state) => soundEndedEngine(state, soundId));
  },

  soundError: (soundId: number, error: string) => {
    useAudioStore.setState((state) => soundErrorEngine(state, soundId, error));
  },

  seekSound: (soundId: number, time: number) => {
    useAudioStore.setState((state) => seekSoundEngine(state, soundId, time));
  },

  pieceLoaded: () => {
    useAudioStore.setState((state) => pieceLoadedEngine(state));
  },

  pieceEnded: () => {
    useAudioStore.setState((state) => pieceEndedEngine(state));
  },

  pieceError: (error: string) => {
    useAudioStore.setState((state) => pieceErrorEngine(state, error));
  },

  stopPiece: () => {
    useAudioStore.setState((state) => stopPieceEngine(state));
  },
};
