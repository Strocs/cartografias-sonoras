import { describe, expect, it } from 'vitest'

import {
  applyPieceSeek,
  AUDIO_STATUS,
  createInitialState,
  pausePiece,
  pauseSound,
  pendingPieceSeek,
  pendingSeek,
  pieceEnded,
  pieceBuffered,
  pieceBuffering,
  pieceError,
  pieceLoaded as metadataPieceLoaded,
  piecePlaying,
  pieceReady,
  pieceTimeUpdated,
  playPiece,
  playSound,
  resumePiece,
  resumeSound,
  seekPiece,
  seekSound,
  setVolume,
  soundEnded,
  soundBuffered,
  soundBuffering,
  soundError,
  soundLoaded as metadataSoundLoaded,
  soundPlaying,
  soundReady,
  soundTimeUpdated,
  stopAllSounds,
  stopPiece,
  stopSound,
  toggleMute
} from '../../src/shared/lib/audio-engine/engine'
import type { AudioEngineState } from '../../src/shared/lib/audio-engine/types'

function soundLoaded(state: AudioEngineState, soundId: number, duration?: number): AudioEngineState {
  return soundPlaying(soundReady(metadataSoundLoaded(state, soundId, duration), soundId), soundId)
}

function pieceLoaded(state: AudioEngineState, duration?: number): AudioEngineState {
  return piecePlaying(pieceReady(metadataPieceLoaded(state, duration)))
}

describe('Audio engine state machine', () => {
  it('starts in an idle state', () => {
    const state = createInitialState()

    expect(state.activeSounds.size).toBe(0)
    expect(state.activePieceId).toBeNull()
    expect(state.piece.status).toBe(AUDIO_STATUS.IDLE)
    expect(state.mapId).toBeNull()
  })

  describe('individual sounds', () => {
    it('transitions a sound from idle to loading on play', () => {
      const next = playSound(createInitialState(), 1, 10)

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.LOADING)
      expect(next.mapId).toBe(10)
    })

    it('keeps metadata duration-only while native transitions expose ready and playing', () => {
      const state = playSound(createInitialState(), 1, 10)
      const ready = soundReady(state, 1)
      const next = soundPlaying(ready, 1)

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
      expect(metadataSoundLoaded(state, 1, 60).activeSounds.get(1)).toMatchObject({
        status: AUDIO_STATUS.LOADING,
        duration: 60
      })
    })

    it('pauses a playing sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const next = pauseSound(state, 1)

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED)
    })

    it('resumes a paused sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const paused = pauseSound(state, 1)
      const next = resumeSound(paused, 1)

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
    })

    it('stops a sound and removes it from active sounds', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const next = stopSound(state, 1)

      expect(next.activeSounds.has(1)).toBe(false)
      expect(next.mapId).toBeNull()
    })

    it('transitions a playing sound to ended and sets currentTime = duration', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1, 45)
      const next = soundEnded(state, 1)

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.ENDED)
      expect(next.activeSounds.get(1)?.currentTime).toBe(45)
    })

    it('transitions a sound to error', () => {
      const state = playSound(createInitialState(), 1, 10)
      const next = soundError(state, 1, 'network-error')

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.ERROR)
      expect(next.activeSounds.get(1)?.error).toBe('network-error')
    })

    it('seeks a sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const next = seekSound(state, 1, 42)

      expect(next.activeSounds.get(1)?.currentTime).toBe(42)
    })

    it('allows multiple sounds to play simultaneously on the same map', () => {
      let state = createInitialState()
      state = playSound(state, 1, 10)
      state = playSound(state, 2, 10)
      state = soundLoaded(state, 1)
      state = soundLoaded(state, 2)

      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
      expect(state.activeSounds.get(2)?.status).toBe(AUDIO_STATUS.PLAYING)
      expect(state.mapId).toBe(10)
    })

    it('keeps simultaneous sounds independent through buffering and recovery', () => {
      let state = playSound(createInitialState(), 1, 10)
      state = playSound(state, 2, 10)
      state = soundPlaying(soundReady(state, 1), 1)
      state = soundPlaying(soundReady(state, 2), 2)
      state = soundBuffering(state, 1)

      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.BUFFERING)
      expect(state.activeSounds.get(2)?.status).toBe(AUDIO_STATUS.PLAYING)
      expect(soundPlaying(state, 1).activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
    })

    it('normalizes ranges, suppresses equal updates, and accepts paused buffered progress', () => {
      const playing = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const buffered = soundBuffered(playing, 1, [
        { start: 10, end: 15 },
        { start: 0, end: 10 },
        { start: Number.NaN, end: 2 },
        { start: 4, end: 3 }
      ])
      const paused = pauseSound(buffered, 1)
      const next = soundBuffered(paused, 1, [{ start: 0, end: 20 }])

      expect(buffered.activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 15 }])
      expect(soundBuffered(buffered, 1, [{ start: 0, end: 15 }])).toBe(buffered)
      expect(next.activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 20 }])
      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED)
    })

    it('clears sound ranges on fresh play, ended, error, and stop cleanup', () => {
      let state = soundBuffered(playSound(createInitialState(), 1, 10), 1, [{ start: 0, end: 5 }])
      state = playSound(soundError(state, 1, 'network'), 1, 10)
      expect(state.activeSounds.get(1)?.buffered).toEqual([])
      state = soundLoaded(state, 1, 10)
      expect(soundEnded(soundBuffered(state, 1, [{ start: 0, end: 10 }]), 1).activeSounds.get(1)?.buffered).toEqual([])
      expect(stopSound(state, 1).activeSounds.has(1)).toBe(false)
    })

    it('stops all sounds when switching to a different map', () => {
      let state = createInitialState()
      state = playSound(state, 1, 10)
      state = soundLoaded(state, 1)
      state = playSound(state, 2, 20)

      expect(state.activeSounds.has(1)).toBe(false)
      expect(state.activeSounds.get(2)?.status).toBe(AUDIO_STATUS.LOADING)
      expect(state.mapId).toBe(20)
    })

    it('stops all sounds and clears the active map', () => {
      let state = createInitialState()
      state = playSound(state, 1, 10)
      state = soundLoaded(state, 1)
      state = stopAllSounds(state)

      expect(state.activeSounds.size).toBe(0)
      expect(state.mapId).toBeNull()
    })
  })

  describe('sound pieces', () => {
    it('starts a piece and pauses all individual sounds', () => {
      let state = createInitialState()
      state = playSound(state, 1, 10)
      state = soundLoaded(state, 1)
      state = playPiece(state, 100, 10)

      // Sounds are paused, not stopped: they stay in the map with PAUSED status.
      expect(state.activeSounds.size).toBe(1)
      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED)
      expect(state.activePieceId).toBe(100)
      expect(state.piece.status).toBe(AUDIO_STATUS.LOADING)
      expect(state.mapId).toBe(10)
    })

    it('transitions a piece through ready, buffering, and playing', () => {
      let state = pieceReady(playPiece(createInitialState(), 100, 10))
      expect(state.piece.status).toBe(AUDIO_STATUS.READY)
      state = pieceBuffering(state)
      expect(state.piece.status).toBe(AUDIO_STATUS.BUFFERING)
      state = piecePlaying(state)

      expect(state.piece.status).toBe(AUDIO_STATUS.PLAYING)
    })

    it('pauses a playing piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const next = pausePiece(state)

      expect(next.piece.status).toBe(AUDIO_STATUS.PAUSED)
    })

    it('resumes a paused piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const paused = pausePiece(state)
      const next = resumePiece(paused)

      expect(next.piece.status).toBe(AUDIO_STATUS.PLAYING)
    })

    it('resuming a piece pauses all active individual sounds', () => {
      // Start a sound, play the piece (pauses the sound), pause the piece,
      // resume the sound, then resume the piece — sound should be paused again.
      let state = createInitialState()
      state = playSound(state, 1, 10)
      state = soundLoaded(state, 1)
      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)

      // Play piece — pauses the sound.
      state = playPiece(state, 100, 10)
      state = pieceLoaded(state)
      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED)
      expect(state.piece.status).toBe(AUDIO_STATUS.PLAYING)

      // Pause piece, resume sound.
      state = pausePiece(state)
      expect(state.piece.status).toBe(AUDIO_STATUS.PAUSED)
      state = resumeSound(state, 1)
      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)

      // Resume piece — should pause the sound again.
      state = resumePiece(state)
      expect(state.piece.status).toBe(AUDIO_STATUS.PLAYING)
      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED)
    })

    it('stops a piece and clears the active piece id', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const next = stopPiece(state)

      expect(next.activePieceId).toBeNull()
      expect(next.piece.status).toBe(AUDIO_STATUS.IDLE)
    })

    it.each([
      ['ready', pieceReady],
      ['playing', piecePlaying],
      ['buffering', pieceBuffering]
    ])('ends a %s piece with complete playback cleanup', (_, transition) => {
      let state = metadataPieceLoaded(playPiece(createInitialState(), 100, 10), 45)
      state = pieceBuffered(transition(pieceReady(state)), [{ start: 0, end: 45 }])
      state = pendingPieceSeek(state, 12)
      const next = pieceEnded(state)

      expect(next).toMatchObject({ activePieceId: null, _pendingPieceSeek: null })
      expect(next.piece).toMatchObject({
        status: AUDIO_STATUS.ENDED,
        currentTime: 45,
        duration: 45,
        buffered: []
      })
    })

    it.each([
      ['idle', createInitialState],
      ['loading', () => playPiece(createInitialState(), 100, 10)],
      ['paused', () => pausePiece(pieceLoaded(playPiece(createInitialState(), 100, 10)))],
      ['error', () => pieceError(playPiece(createInitialState(), 100, 10), 'network')],
      ['ended', () => pieceEnded(pieceLoaded(playPiece(createInitialState(), 100, 10)))]
    ])('does not end a %s piece', (_, createState) => {
      const state = createState()

      expect(pieceEnded(state)).toBe(state)
    })

    it('transitions a piece to error', () => {
      const state = playPiece(createInitialState(), 100, 10)
      const next = pieceError(state, 'decode-error')

      expect(next.piece.status).toBe(AUDIO_STATUS.ERROR)
      expect(next.piece.error).toBe('decode-error')
    })

    it('seeks a piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const next = seekPiece(state, 33)

      expect(next.piece.currentTime).toBe(33)
    })

    it('records a pending piece seek', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const next = pendingPieceSeek(state, 77)

      expect(next.piece.currentTime).toBe(77)
      expect(next._pendingPieceSeek).toBe(77)
    })

    it('applies a pending piece seek and clears the flag', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      state = pendingPieceSeek(state, 77)
      const next = applyPieceSeek(state, 77)

      expect(next.piece.currentTime).toBe(77)
      expect(next._pendingPieceSeek).toBeNull()
    })

    it('ignores individual sound playback while a piece is active', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      state = playSound(state, 1, 10)

      expect(state.activeSounds.size).toBe(0)
      expect(state.activePieceId).toBe(100)
    })

    it('blocks sounds while a piece is loading, ready, playing, or buffering but allows paused pieces', () => {
      let state = playPiece(createInitialState(), 100, 10)
      for (const transition of [(current: typeof state) => current, pieceReady, piecePlaying, pieceBuffering]) {
        state = transition(state)
        expect(playSound(state, 1, 10)).toBe(state)
      }
      state = pausePiece(piecePlaying(state))
      expect(playSound(state, 1, 10).activeSounds.get(1)?.status).toBe(AUDIO_STATUS.LOADING)
    })

    it('updates paused piece ranges and clears them after error or ended cleanup', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      state = pausePiece(state)
      state = pieceBuffered(state, [
        { start: 5, end: 8 },
        { start: 0, end: 5 }
      ])
      expect(state.piece.buffered).toEqual([{ start: 0, end: 8 }])
      expect(pieceError(state, 'network').piece.buffered).toEqual([])
      state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      expect(pieceEnded(pieceBuffered(state, [{ start: 0, end: 10 }])).piece.buffered).toEqual([])
    })

    it('allows only one piece at a time', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      state = playPiece(state, 200, 20)

      expect(state.activePieceId).toBe(200)
      expect(state.piece.status).toBe(AUDIO_STATUS.LOADING)
    })
  })

  describe('volume and mute', () => {
    it('sets volume on the state', () => {
      const next = setVolume(createInitialState(), 0.5)
      expect(next.volume).toBe(0.5)
    })

    it('toggles muted on the state', () => {
      const muted = toggleMute(createInitialState())
      expect(muted.muted).toBe(true)

      const unmuted = toggleMute(muted)
      expect(unmuted.muted).toBe(false)
    })
  })

  describe('pending seek', () => {
    it('records a pending seek for an active sound', () => {
      const state = playSound(createInitialState(), 1, 10)
      const next = pendingSeek(state, 1, 42)

      expect(next._pendingSeeks.get(1)).toBe(42)
    })

    it('ignores pending seek for an unknown sound', () => {
      const next = pendingSeek(createInitialState(), 1, 42)
      expect(next._pendingSeeks.has(1)).toBe(false)
    })

    it('clears the pending seek when applying a real seek', () => {
      let state = playSound(createInitialState(), 1, 10)
      state = pendingSeek(state, 1, 42)
      const next = seekSound(state, 1, 42)

      expect(next.activeSounds.get(1)?.currentTime).toBe(42)
      expect(next._pendingSeeks.has(1)).toBe(false)
    })
  })

  describe('time updates', () => {
    it('updates sound currentTime without changing status', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1)
      const next = soundTimeUpdated(state, 1, 12.5)

      expect(next.activeSounds.get(1)?.currentTime).toBe(12.5)
      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
    })

    it('updates piece currentTime without changing status', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10))
      const next = pieceTimeUpdated(state, 12.5)

      expect(next.piece.currentTime).toBe(12.5)
      expect(next.piece.status).toBe(AUDIO_STATUS.PLAYING)
    })
  })

  describe('duration from metadata', () => {
    it('sets sound duration when loaded', () => {
      const state = playSound(createInitialState(), 1, 10)
      const next = metadataSoundLoaded(state, 1, 60)

      expect(next.activeSounds.get(1)?.duration).toBe(60)
      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.LOADING)
    })

    it('sets piece duration when loaded', () => {
      const state = playPiece(createInitialState(), 100, 10)
      const next = metadataPieceLoaded(state, 180)

      expect(next.piece.duration).toBe(180)
      expect(next.piece.status).toBe(AUDIO_STATUS.LOADING)
    })
  })
})
