import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialState } from '../../src/shared/lib/audio-engine/engine'
import { audioStore, audioTransitions, useAudioStore } from '../../src/shared/lib/audio-engine/store'
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types'

describe('Audio store actions', () => {
  beforeEach(() => {
    audioStore.setState(createInitialState())
  })

  it('has safe initial state', () => {
    const state = audioStore.getState()

    expect(state.volume).toBe(1)
    expect(state.muted).toBe(false)
    expect(state._pendingSeeks.size).toBe(0)
    expect(state.activeSounds.size).toBe(0)
  })

  describe('volume and mute', () => {
    it('setVolume updates store volume', () => {
      audioStore.getState().setVolume(0.25)
      expect(audioStore.getState().volume).toBe(0.25)
    })

    it('toggleMute flips muted flag', () => {
      audioStore.getState().toggleMute()
      expect(audioStore.getState().muted).toBe(true)

      audioStore.getState().toggleMute()
      expect(audioStore.getState().muted).toBe(false)
    })
  })

  describe('seek sound', () => {
    it('seekSound records a pending seek', () => {
      audioStore.getState().playSound(1, 10)
      audioStore.getState().seekSound(1, 42)

      const state = audioStore.getState()
      expect(state._pendingSeeks.get(1)).toBe(42)
      expect(state.activeSounds.get(1)?.currentTime).toBe(0)
    })

    it('audioTransitions.seekSound applies the seek and clears pending', () => {
      audioStore.getState().playSound(1, 10)
      audioStore.getState().seekSound(1, 42)

      audioTransitions.seekSound(1, 42)

      const state = audioStore.getState()
      expect(state.activeSounds.get(1)?.currentTime).toBe(42)
      expect(state._pendingSeeks.has(1)).toBe(false)
    })

    it('audioTransitions.soundLoaded sets duration and status', () => {
      audioStore.getState().playSound(1, 10)
      audioTransitions.soundLoaded(1, 60)

      const sound = audioStore.getState().activeSounds.get(1)
      expect(sound?.status).toBe(AUDIO_STATUS.PLAYING)
      expect(sound?.duration).toBe(60)
    })

    it('audioTransitions.soundTimeUpdated updates currentTime', () => {
      audioStore.getState().playSound(1, 10)
      audioTransitions.soundLoaded(1, 60)
      audioTransitions.soundTimeUpdated(1, 15)

      expect(audioStore.getState().activeSounds.get(1)?.currentTime).toBe(15)
    })
  })

  describe('piece transitions', () => {
    it('audioTransitions.pieceLoaded sets duration and status', () => {
      audioStore.getState().playPiece(100, 10)
      audioTransitions.pieceLoaded(180)

      const { piece } = audioStore.getState()
      expect(piece.status).toBe(AUDIO_STATUS.PLAYING)
      expect(piece.duration).toBe(180)
    })

    it('audioTransitions.pieceTimeUpdated updates currentTime', () => {
      audioStore.getState().playPiece(100, 10)
      audioTransitions.pieceLoaded(180)
      audioTransitions.pieceTimeUpdated(45)

      expect(audioStore.getState().piece.currentTime).toBe(45)
    })
  })

  describe('vanilla store API', () => {
    it('getState returns the current state', () => {
      audioStore.getState().setVolume(0.5)
      expect(audioStore.getState().volume).toBe(0.5)
    })

    it('subscribe fires callback on state changes', () => {
      const listener = vi.fn()
      const unsubscribe = audioStore.subscribe(listener)

      audioStore.getState().setVolume(0.75)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ volume: 0.75 }),
        expect.objectContaining({ volume: 1 })
      )

      unsubscribe()
    })

    it('subscribe can target a selector', () => {
      const listener = vi.fn()
      const unsubscribe = audioStore.subscribe((state) => state.muted, listener)

      audioStore.getState().toggleMute()
      expect(listener).toHaveBeenCalledWith(true, false)

      // Volume changes should not trigger the muted selector listener.
      audioStore.getState().setVolume(0.2)
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
    })
  })

  describe('React hook wrapper', () => {
    it('re-renders when selected state changes', () => {
      const { result } = renderHook(() => useAudioStore((state) => state.volume))

      expect(result.current).toBe(1)

      act(() => {
        audioStore.getState().setVolume(0.4)
      })

      expect(result.current).toBe(0.4)
    })

    it('does not re-render when unrelated state changes', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount += 1
        return useAudioStore((state) => state.muted)
      })

      expect(result.current).toBe(false)
      const countAfterFirstRender = renderCount

      act(() => {
        audioStore.getState().setVolume(0.3)
      })

      expect(result.current).toBe(false)
      expect(renderCount).toBe(countAfterFirstRender)
    })
  })
})
