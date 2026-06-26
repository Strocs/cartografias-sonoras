import { describe, expect, it } from 'vitest';

import {
  AUDIO_STATUS,
  createInitialState,
  pausePiece,
  pauseSound,
  pieceEnded,
  pieceError,
  pieceLoaded,
  playPiece,
  playSound,
  resumePiece,
  resumeSound,
  seekPiece,
  seekSound,
  soundEnded,
  soundError,
  soundLoaded,
  stopAllSounds,
  stopPiece,
  stopSound,
} from '../../src/shared/lib/audio-engine/engine';

describe('Audio engine state machine', () => {
  it('starts in an idle state', () => {
    const state = createInitialState();

    expect(state.activeSounds.size).toBe(0);
    expect(state.activePieceId).toBeNull();
    expect(state.piece.status).toBe(AUDIO_STATUS.IDLE);
    expect(state.mapId).toBeNull();
  });

  describe('individual sounds', () => {
    it('transitions a sound from idle to loading on play', () => {
      const next = playSound(createInitialState(), 1, 10);

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.LOADING);
      expect(next.mapId).toBe(10);
    });

    it('transitions a sound from loading to playing', () => {
      const state = playSound(createInitialState(), 1, 10);
      const next = soundLoaded(state, 1);

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING);
    });

    it('pauses a playing sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1);
      const next = pauseSound(state, 1);

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PAUSED);
    });

    it('resumes a paused sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1);
      const paused = pauseSound(state, 1);
      const next = resumeSound(paused, 1);

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING);
    });

    it('stops a sound and removes it from active sounds', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1);
      const next = stopSound(state, 1);

      expect(next.activeSounds.has(1)).toBe(false);
      expect(next.mapId).toBeNull();
    });

    it('transitions a playing sound to ended', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1);
      const next = soundEnded(state, 1);

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.ENDED);
    });

    it('transitions a sound to error', () => {
      const state = playSound(createInitialState(), 1, 10);
      const next = soundError(state, 1, 'network-error');

      expect(next.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.ERROR);
      expect(next.activeSounds.get(1)?.error).toBe('network-error');
    });

    it('seeks a sound', () => {
      const state = soundLoaded(playSound(createInitialState(), 1, 10), 1);
      const next = seekSound(state, 1, 42);

      expect(next.activeSounds.get(1)?.currentTime).toBe(42);
    });

    it('allows multiple sounds to play simultaneously on the same map', () => {
      let state = createInitialState();
      state = playSound(state, 1, 10);
      state = playSound(state, 2, 10);
      state = soundLoaded(state, 1);
      state = soundLoaded(state, 2);

      expect(state.activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING);
      expect(state.activeSounds.get(2)?.status).toBe(AUDIO_STATUS.PLAYING);
      expect(state.mapId).toBe(10);
    });

    it('stops all sounds when switching to a different map', () => {
      let state = createInitialState();
      state = playSound(state, 1, 10);
      state = soundLoaded(state, 1);
      state = playSound(state, 2, 20);

      expect(state.activeSounds.has(1)).toBe(false);
      expect(state.activeSounds.get(2)?.status).toBe(AUDIO_STATUS.LOADING);
      expect(state.mapId).toBe(20);
    });

    it('stops all sounds and clears the active map', () => {
      let state = createInitialState();
      state = playSound(state, 1, 10);
      state = soundLoaded(state, 1);
      state = stopAllSounds(state);

      expect(state.activeSounds.size).toBe(0);
      expect(state.mapId).toBeNull();
    });
  });

  describe('sound pieces', () => {
    it('starts a piece and stops all individual sounds', () => {
      let state = createInitialState();
      state = playSound(state, 1, 10);
      state = soundLoaded(state, 1);
      state = playPiece(state, 100, 10);

      expect(state.activeSounds.size).toBe(0);
      expect(state.activePieceId).toBe(100);
      expect(state.piece.status).toBe(AUDIO_STATUS.LOADING);
      expect(state.mapId).toBe(10);
    });

    it('transitions a piece from loading to playing', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));

      expect(state.piece.status).toBe(AUDIO_STATUS.PLAYING);
    });

    it('pauses a playing piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      const next = pausePiece(state);

      expect(next.piece.status).toBe(AUDIO_STATUS.PAUSED);
    });

    it('resumes a paused piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      const paused = pausePiece(state);
      const next = resumePiece(paused);

      expect(next.piece.status).toBe(AUDIO_STATUS.PLAYING);
    });

    it('stops a piece and clears the active piece id', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      const next = stopPiece(state);

      expect(next.activePieceId).toBeNull();
      expect(next.piece.status).toBe(AUDIO_STATUS.IDLE);
    });

    it('transitions a playing piece to ended', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      const next = pieceEnded(state);

      expect(next.piece.status).toBe(AUDIO_STATUS.ENDED);
    });

    it('transitions a piece to error', () => {
      const state = playPiece(createInitialState(), 100, 10);
      const next = pieceError(state, 'decode-error');

      expect(next.piece.status).toBe(AUDIO_STATUS.ERROR);
      expect(next.piece.error).toBe('decode-error');
    });

    it('seeks a piece', () => {
      const state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      const next = seekPiece(state, 33);

      expect(next.piece.currentTime).toBe(33);
    });

    it('ignores individual sound playback while a piece is active', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      state = playSound(state, 1, 10);

      expect(state.activeSounds.size).toBe(0);
      expect(state.activePieceId).toBe(100);
    });

    it('allows only one piece at a time', () => {
      let state = pieceLoaded(playPiece(createInitialState(), 100, 10));
      state = playPiece(state, 200, 20);

      expect(state.activePieceId).toBe(200);
      expect(state.piece.status).toBe(AUDIO_STATUS.LOADING);
    });
  });
});
