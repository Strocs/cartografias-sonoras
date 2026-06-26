import { create } from 'zustand';

import {
  applyPieceSeek as applyPieceSeekEngine,
  createInitialState,
  pauseAllSounds as pauseAllSoundsEngine,
  pausePiece as pausePieceEngine,
  pauseSound as pauseSoundEngine,
  pendingPieceSeek as pendingPieceSeekEngine,
  pendingSeek as pendingSeekEngine,
  pieceEnded as pieceEndedEngine,
  pieceError as pieceErrorEngine,
  pieceLoaded as pieceLoadedEngine,
  pieceTimeUpdated as pieceTimeUpdatedEngine,
  playPiece as playPieceEngine,
  playSound as playSoundEngine,
  resumePiece as resumePieceEngine,
  resumeSound as resumeSoundEngine,
  seekSound as seekSoundEngine,
  setVolume as setVolumeEngine,
  soundEnded as soundEndedEngine,
  soundError as soundErrorEngine,
  soundLoaded as soundLoadedEngine,
  soundTimeUpdated as soundTimeUpdatedEngine,
  stopAllSounds as stopAllSoundsEngine,
  stopPiece as stopPieceEngine,
  stopSound as stopSoundEngine,
  toggleMute as toggleMuteEngine
} from './engine';
import type { AudioStore, AudioTransitions } from './types';

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

  pauseAllSounds: () => {
    set((state) => pauseAllSoundsEngine(state));
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

  stopPiece: () => {
    set((state) => stopPieceEngine(state));
  },

  seekPiece: (time) => {
    set((state) => pendingPieceSeekEngine(state, time));
  },

  seekSound: (soundId, time) => {
    set((state) => pendingSeekEngine(state, soundId, time));
  },

  setVolume: (volume) => {
    set((state) => setVolumeEngine(state, volume));
  },

  toggleMute: () => {
    set((state) => toggleMuteEngine(state));
  }
}));

// Internal transition actions used by audio element event handlers.
// Kept outside the public AudioActions interface to keep the API focused,
// but exposed through the store for event wiring.
export const audioTransitions: AudioTransitions = {
  soundLoaded: (soundId: number, duration: number) => {
    useAudioStore.setState((state) =>
      soundLoadedEngine(state, soundId, duration)
    );
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

  soundTimeUpdated: (soundId: number, time: number) => {
    useAudioStore.setState((state) =>
      soundTimeUpdatedEngine(state, soundId, time)
    );
  },

  pieceLoaded: (duration: number) => {
    useAudioStore.setState((state) => pieceLoadedEngine(state, duration));
  },

  pieceEnded: () => {
    useAudioStore.setState((state) => pieceEndedEngine(state));
  },

  pieceError: (error: string) => {
    useAudioStore.setState((state) => pieceErrorEngine(state, error));
  },

  pieceTimeUpdated: (time: number) => {
    useAudioStore.setState((state) => pieceTimeUpdatedEngine(state, time));
  },

  seekPiece: (time: number) => {
    useAudioStore.setState((state) => applyPieceSeekEngine(state, time));
  },

  stopPiece: () => {
    useAudioStore.setState((state) => stopPieceEngine(state));
  }
};
