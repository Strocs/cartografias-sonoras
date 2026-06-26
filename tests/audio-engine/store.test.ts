import { beforeEach, describe, expect, it } from 'vitest';

import { createInitialState } from '../../src/shared/lib/audio-engine/engine';
import {
  audioTransitions,
  useAudioStore,
} from '../../src/shared/lib/audio-engine/store';
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types';

describe('Audio store actions', () => {
  beforeEach(() => {
    useAudioStore.setState(createInitialState());
  });

  it('has safe initial state', () => {
    const state = useAudioStore.getState();

    expect(state.volume).toBe(1);
    expect(state.muted).toBe(false);
    expect(state._pendingSeeks.size).toBe(0);
    expect(state.activeSounds.size).toBe(0);
  });

  describe('volume and mute', () => {
    it('setVolume updates store volume', () => {
      useAudioStore.getState().setVolume(0.25);
      expect(useAudioStore.getState().volume).toBe(0.25);
    });

    it('toggleMute flips muted flag', () => {
      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().muted).toBe(true);

      useAudioStore.getState().toggleMute();
      expect(useAudioStore.getState().muted).toBe(false);
    });
  });

  describe('seek sound', () => {
    it('seekSound records a pending seek', () => {
      useAudioStore.getState().playSound(1, 10);
      useAudioStore.getState().seekSound(1, 42);

      const state = useAudioStore.getState();
      expect(state._pendingSeeks.get(1)).toBe(42);
      expect(state.activeSounds.get(1)?.currentTime).toBe(0);
    });

    it('audioTransitions.seekSound applies the seek and clears pending', () => {
      useAudioStore.getState().playSound(1, 10);
      useAudioStore.getState().seekSound(1, 42);

      audioTransitions.seekSound(1, 42);

      const state = useAudioStore.getState();
      expect(state.activeSounds.get(1)?.currentTime).toBe(42);
      expect(state._pendingSeeks.has(1)).toBe(false);
    });

    it('audioTransitions.soundLoaded sets duration and status', () => {
      useAudioStore.getState().playSound(1, 10);
      audioTransitions.soundLoaded(1, 60);

      const sound = useAudioStore.getState().activeSounds.get(1);
      expect(sound?.status).toBe(AUDIO_STATUS.PLAYING);
      expect(sound?.duration).toBe(60);
    });

    it('audioTransitions.soundTimeUpdated updates currentTime', () => {
      useAudioStore.getState().playSound(1, 10);
      audioTransitions.soundLoaded(1, 60);
      audioTransitions.soundTimeUpdated(1, 15);

      expect(useAudioStore.getState().activeSounds.get(1)?.currentTime).toBe(15);
    });
  });

  describe('piece transitions', () => {
    it('audioTransitions.pieceLoaded sets duration and status', () => {
      useAudioStore.getState().playPiece(100, 10);
      audioTransitions.pieceLoaded(180);

      const { piece } = useAudioStore.getState();
      expect(piece.status).toBe(AUDIO_STATUS.PLAYING);
      expect(piece.duration).toBe(180);
    });

    it('audioTransitions.pieceTimeUpdated updates currentTime', () => {
      useAudioStore.getState().playPiece(100, 10);
      audioTransitions.pieceLoaded(180);
      audioTransitions.pieceTimeUpdated(45);

      expect(useAudioStore.getState().piece.currentTime).toBe(45);
    });
  });
});
