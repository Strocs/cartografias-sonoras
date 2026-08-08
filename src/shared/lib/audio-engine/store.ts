import { useStore } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

import {
  applyPieceSeek as applyPieceSeekEngine,
  createInitialState,
  pauseAllSounds as pauseAllSoundsEngine,
  pausePiece as pausePieceEngine,
  pauseSound as pauseSoundEngine,
  pendingPieceSeek as pendingPieceSeekEngine,
  pendingSeek as pendingSeekEngine,
  pieceEnded as pieceEndedEngine,
  pieceBuffered as pieceBufferedEngine,
  pieceBuffering as pieceBufferingEngine,
  pieceError as pieceErrorEngine,
  pieceLoadStarted as pieceLoadStartedEngine,
  pieceLoaded as pieceLoadedEngine,
  piecePlaying as piecePlayingEngine,
  pieceReady as pieceReadyEngine,
  pieceTimeUpdated as pieceTimeUpdatedEngine,
  playPiece as playPieceEngine,
  playSound as playSoundEngine,
  resumePiece as resumePieceEngine,
  resumeSound as resumeSoundEngine,
  seekSound as seekSoundEngine,
  setVolume as setVolumeEngine,
  soundEnded as soundEndedEngine,
  soundBuffered as soundBufferedEngine,
  soundBuffering as soundBufferingEngine,
  soundError as soundErrorEngine,
  soundLoadStarted as soundLoadStartedEngine,
  soundLoaded as soundLoadedEngine,
  soundPlaying as soundPlayingEngine,
  soundReady as soundReadyEngine,
  soundTimeUpdated as soundTimeUpdatedEngine,
  stopAllSounds as stopAllSoundsEngine,
  stopPiece as stopPieceEngine,
  stopSound as stopSoundEngine,
  toggleMute as toggleMuteEngine
} from './engine'
import type { AudioStore, AudioTransitions } from './types'

// Framework-agnostic vanilla store instance.
// subscribeWithSelector gives vanilla code `subscribe(selector, listener)`.
export const audioStore = createStore<AudioStore>()(
  subscribeWithSelector((set) => ({
    ...createInitialState(),

    playSound: (soundId, mapId) => {
      set((state) => playSoundEngine(state, soundId, mapId))
    },

    pauseSound: (soundId) => {
      set((state) => pauseSoundEngine(state, soundId))
    },

    resumeSound: (soundId) => {
      set((state) => resumeSoundEngine(state, soundId))
    },

    stopSound: (soundId) => {
      set((state) => stopSoundEngine(state, soundId))
    },

    stopAllSounds: () => {
      set((state) => stopAllSoundsEngine(state))
    },

    pauseAllSounds: () => {
      set((state) => pauseAllSoundsEngine(state))
    },

    playPiece: (pieceId, mapId) => {
      set((state) => playPieceEngine(state, pieceId, mapId))
    },

    pausePiece: () => {
      set((state) => pausePieceEngine(state))
    },

    resumePiece: () => {
      set((state) => resumePieceEngine(state))
    },

    stopPiece: () => {
      set((state) => stopPieceEngine(state))
    },

    seekPiece: (time) => {
      set((state) => pendingPieceSeekEngine(state, time))
    },

    seekSound: (soundId, time) => {
      set((state) => pendingSeekEngine(state, soundId, time))
    },

    setVolume: (volume) => {
      set((state) => setVolumeEngine(state, volume))
    },

    toggleMute: () => {
      set((state) => toggleMuteEngine(state))
    }
  }))
)

// React hook wrapper for consuming the vanilla store in components.
export const useAudioStore = <T>(selector: (state: AudioStore) => T): T => useStore(audioStore, selector)

// Internal transition actions used by audio element event handlers.
// Kept outside the public AudioActions interface to keep the API focused,
// but exposed through the store for event wiring.
export const audioTransitions: AudioTransitions = {
  soundLoadStarted: (soundId) => audioStore.setState((state) => soundLoadStartedEngine(state, soundId)),
  soundReady: (soundId) => audioStore.setState((state) => soundReadyEngine(state, soundId)),
  soundPlaying: (soundId) => audioStore.setState((state) => soundPlayingEngine(state, soundId)),
  soundBuffering: (soundId) => audioStore.setState((state) => soundBufferingEngine(state, soundId)),
  soundBuffered: (soundId, ranges) => audioStore.setState((state) => soundBufferedEngine(state, soundId, ranges)),
  soundLoaded: (soundId: number, duration: number) => {
    audioStore.setState((state) => soundLoadedEngine(state, soundId, duration))
  },

  soundEnded: (soundId: number) => {
    audioStore.setState((state) => soundEndedEngine(state, soundId))
  },

  soundError: (soundId: number, error: string) => {
    audioStore.setState((state) => soundErrorEngine(state, soundId, error))
  },

  seekSound: (soundId: number, time: number) => {
    audioStore.setState((state) => seekSoundEngine(state, soundId, time))
  },

  soundTimeUpdated: (soundId: number, time: number) => {
    audioStore.setState((state) => soundTimeUpdatedEngine(state, soundId, time))
  },

  pieceLoaded: (duration: number) => {
    audioStore.setState((state) => pieceLoadedEngine(state, duration))
  },

  pieceLoadStarted: () => audioStore.setState(pieceLoadStartedEngine),
  pieceReady: () => audioStore.setState(pieceReadyEngine),
  piecePlaying: () => audioStore.setState(piecePlayingEngine),
  pieceBuffering: () => audioStore.setState(pieceBufferingEngine),
  pieceBuffered: (ranges) => audioStore.setState((state) => pieceBufferedEngine(state, ranges)),

  pieceEnded: () => {
    audioStore.setState((state) => pieceEndedEngine(state))
  },

  pieceError: (error: string) => {
    audioStore.setState((state) => pieceErrorEngine(state, error))
  },

  pieceTimeUpdated: (time: number) => {
    audioStore.setState((state) => pieceTimeUpdatedEngine(state, time))
  },

  seekPiece: (time: number) => {
    audioStore.setState((state) => applyPieceSeekEngine(state, time))
  },

  stopPiece: () => {
    audioStore.setState((state) => stopPieceEngine(state))
  }
}
