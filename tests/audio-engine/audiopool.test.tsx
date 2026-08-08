import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioPool, audioStore, audioTransitions } from '../../src/shared/lib/audio-engine'
import { createInitialState } from '../../src/shared/lib/audio-engine/engine'
import { AUDIO_STATUS } from '../../src/shared/lib/audio-engine/types'

const ONE_SOURCES = {
  primary: { url: 'https://audio.test/one.m4a', mimeType: 'audio/mp4' as const },
  fallback: { url: 'https://audio.test/one.opus', mimeType: 'audio/ogg; codecs=opus' as const }
}
const SOUNDS = [
  { id: 1, audioSources: ONE_SOURCES },
  {
    id: 2,
    audioSources: {
      primary: { url: 'https://audio.test/two.m4a', mimeType: 'audio/mp4' as const },
      fallback: { url: 'https://audio.test/two.opus', mimeType: 'audio/ogg; codecs=opus' as const }
    }
  }
]

const PIECE = { id: 100, audioSources: ONE_SOURCES }

interface TestRange {
  start: number
  end: number
}

function setBufferedRanges(audio: HTMLAudioElement, ranges: TestRange[]): void {
  Object.defineProperty(audio, 'buffered', {
    configurable: true,
    value: {
      length: ranges.length,
      start: (index: number) => ranges[index]?.start ?? 0,
      end: (index: number) => ranges[index]?.end ?? 0
    }
  })
}

function findAudio(container: HTMLElement, primaryUrl: string): HTMLAudioElement {
  const audio = Array.from(container.querySelectorAll('audio')).find(
    (element) => element.querySelector('source')?.getAttribute('src') === primaryUrl
  )
  if (!audio) throw new Error(`Audio element not found for ${primaryUrl}`)
  return audio
}

function setSoundStatus(status: (typeof AUDIO_STATUS)[keyof typeof AUDIO_STATUS]): void {
  audioStore.setState((state) => {
    const activeSounds = new Map(state.activeSounds)
    const sound = activeSounds.get(1)
    if (sound) activeSounds.set(1, { ...sound, status })
    return { ...state, activeSounds }
  })
}

describe('AudioPool subscription', () => {
  beforeEach(() => {
    audioStore.setState(createInitialState())
    vi.restoreAllMocks()
  })

  it('renders no audio elements when nothing is active', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)
    expect(container.querySelectorAll('audio')).toHaveLength(0)
  })

  it('renders an audio element and plays when a sound starts', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, 'play')

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audios = container.querySelectorAll('audio')
    expect(audios).toHaveLength(1)
    expect(audios[0]).not.toHaveAttribute('src')
    expect(audios[0]).toHaveAttribute('preload', 'metadata')
    expect(audios[0].querySelectorAll('source')).toHaveLength(2)
    expect(audios[0].querySelectorAll('source')[0]).toHaveAttribute('src', ONE_SOURCES.primary.url)
    expect(audios[0].querySelectorAll('source')[0]).toHaveAttribute('type', ONE_SOURCES.primary.mimeType)
    expect(audios[0].querySelectorAll('source')[1]).toHaveAttribute('src', ONE_SOURCES.fallback.url)
    expect(audios[0].querySelectorAll('source')[1]).toHaveAttribute('type', ONE_SOURCES.fallback.mimeType)
    expect(playSpy).toHaveBeenCalled()
  })

  it('pauses and resumes a sound via the subscription', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)
    const playSpy = vi.spyOn(HTMLAudioElement.prototype, 'play')
    const pauseSpy = vi.spyOn(HTMLAudioElement.prototype, 'pause')

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = container.querySelector('audio')
    act(() => {
      fireEvent.loadedMetadata(audio!)
      fireEvent.canPlay(audio!)
      fireEvent.playing(audio!)
    })

    act(() => {
      audioStore.getState().pauseSound(1)
    })
    expect(pauseSpy).toHaveBeenCalledTimes(1)

    act(() => {
      audioStore.getState().resumeSound(1)
    })
    expect(playSpy).toHaveBeenCalled()

    expect(container.querySelectorAll('audio')).toHaveLength(1)
  })

  it('removes the audio element when a sound ends', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()

    act(() => {
      fireEvent.loadedMetadata(audio!)
      fireEvent.canPlay(audio!)
      fireEvent.playing(audio!)
    })

    act(() => {
      fireEvent.ended(audio!)
    })

    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.ENDED)
    expect(container.querySelectorAll('audio')).toHaveLength(0)
  })

  it('routes loadedmetadata to the store with duration', () => {
    render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()

    Object.defineProperty(audio!, 'duration', { value: 60, configurable: true })

    act(() => {
      setSoundStatus(AUDIO_STATUS.LOADING)
      fireEvent.loadedMetadata(audio!)
    })

    const sound = audioStore.getState().activeSounds.get(1)
    expect(sound?.status).toBe(AUDIO_STATUS.LOADING)
    expect(sound?.duration).toBe(60)

    act(() => {
      fireEvent.canPlay(audio!)
    })
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.READY)

    act(() => {
      fireEvent.playing(audio!)
    })
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
  })

  it('routes timeupdate to the store currentTime', () => {
    render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()

    Object.defineProperty(audio!, 'currentTime', {
      value: 12.5,
      configurable: true
    })

    act(() => {
      fireEvent.timeUpdate(audio!)
    })

    expect(audioStore.getState().activeSounds.get(1)?.currentTime).toBe(12.5)
  })

  it('refreshes stale sound buffered ranges from live TimeRanges during timeupdate', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)
    setBufferedRanges(audio, [{ start: 0, end: 20 }])
    act(() => {
      fireEvent.progress(audio)
    })

    Object.defineProperty(audio, 'currentTime', { configurable: true, value: 30 })
    setBufferedRanges(audio, [{ start: 0, end: 100 }])
    act(() => {
      fireEvent.timeUpdate(audio)
    })

    expect(audioStore.getState().activeSounds.get(1)).toMatchObject({
      currentTime: 30,
      buffered: [{ start: 0, end: 100 }]
    })
  })

  it('applies volume and mute to active audio elements', () => {
    render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.volume).toBe(1)
    expect(audio.muted).toBe(false)

    act(() => {
      audioStore.getState().setVolume(0.5)
    })
    expect(audio.volume).toBe(0.5)

    act(() => {
      audioStore.getState().toggleMute()
    })
    expect(audio.muted).toBe(true)
  })

  it('lets new sounds inherit the current volume and mute state', () => {
    render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().setVolume(0.25)
      audioStore.getState().toggleMute()
    })

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.volume).toBe(0.25)
    expect(audio.muted).toBe(true)
  })

  it('applies pending seek to the audio element and updates the store', () => {
    render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    const audio = document.querySelector('audio') as HTMLAudioElement

    act(() => {
      audioStore.getState().seekSound(1, 42)
    })

    expect(audio.currentTime).toBe(42)
    expect(audioStore.getState().activeSounds.get(1)?.currentTime).toBe(42)
    expect(audioStore.getState()._pendingSeeks.has(1)).toBe(false)
  })

  it('renders a piece audio element when a piece is active', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} soundPiece={PIECE} />)

    act(() => {
      audioStore.getState().playPiece(100, 10)
    })

    const audios = container.querySelectorAll('audio')
    expect(audios).toHaveLength(1)
    expect(audios[0]).not.toHaveAttribute('src')
    expect(audios[0].querySelectorAll('source')[0]).toHaveAttribute('src', ONE_SOURCES.primary.url)
  })

  it('routes piece events to the store', () => {
    render(<AudioPool sounds={SOUNDS} soundPiece={PIECE} />)

    act(() => {
      audioStore.getState().playPiece(100, 10)
    })

    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()

    Object.defineProperty(audio!, 'duration', { value: 180, configurable: true })

    act(() => {
      audioStore.setState((state) => ({ ...state, piece: { ...state.piece, status: AUDIO_STATUS.LOADING } }))
      fireEvent.loadedMetadata(audio!)
    })

    const { piece } = audioStore.getState()
    expect(piece.status).toBe(AUDIO_STATUS.LOADING)
    expect(piece.duration).toBe(180)
  })

  it('maps sound loadstart, waiting, stalled, and playing recovery transitions', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)

    act(() => {
      fireEvent.loadStart(audio)
      fireEvent.canPlay(audio)
      fireEvent.waiting(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.BUFFERING)

    act(() => {
      fireEvent.playing(audio)
      fireEvent.stalled(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.BUFFERING)

    act(() => {
      fireEvent.playing(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
  })

  it('maps piece waiting and stalled recovery through playing', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} soundPiece={PIECE} />)

    act(() => {
      audioStore.getState().playPiece(100, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)

    act(() => {
      fireEvent.canPlay(audio)
      fireEvent.waiting(audio)
      fireEvent.playing(audio)
      fireEvent.stalled(audio)
      fireEvent.playing(audio)
    })
    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.PLAYING)
  })

  it('serializes buffered TimeRanges on progress, loadedmetadata, and seeked', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)

    setBufferedRanges(audio, [{ start: 0, end: 10 }])
    act(() => {
      fireEvent.progress(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 10 }])

    setBufferedRanges(audio, [{ start: 0, end: 20 }])
    act(() => {
      fireEvent.loadedMetadata(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 20 }])

    setBufferedRanges(audio, [{ start: 5, end: 30 }])
    act(() => {
      fireEvent.seeked(audio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 5, end: 30 }])
  })

  it('passes discontinuous TimeRanges to the adapter before the store merges them', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)
    const bufferedSpy = vi.spyOn(audioTransitions, 'soundBuffered')

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)
    const ranges = [
      { start: 10, end: 15 },
      { start: 0, end: 5 },
      { start: 4, end: 12 }
    ]
    setBufferedRanges(audio, ranges)

    act(() => {
      fireEvent.progress(audio)
    })

    expect(bufferedSpy).toHaveBeenCalledWith(1, ranges)
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 15 }])
  })

  it('updates buffered ranges while paused without changing currentTime', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)
    Object.defineProperty(audio, 'currentTime', { configurable: true, value: 12 })
    act(() => {
      fireEvent.canPlay(audio)
      fireEvent.playing(audio)
      fireEvent.timeUpdate(audio)
      audioStore.getState().pauseSound(1)
      setBufferedRanges(audio, [{ start: 0, end: 40 }])
      fireEvent.progress(audio)
    })

    const sound = audioStore.getState().activeSounds.get(1)
    expect(sound?.status).toBe(AUDIO_STATUS.PAUSED)
    expect(sound?.currentTime).toBe(12)
    expect(sound?.buffered).toEqual([{ start: 0, end: 40 }])
  })

  it('preserves existing buffered ranges when TimeRanges access fails', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })
    const audio = findAudio(container, ONE_SOURCES.primary.url)
    setBufferedRanges(audio, [{ start: 0, end: 20 }])
    act(() => {
      fireEvent.progress(audio)
    })

    Object.defineProperty(audio, 'buffered', {
      configurable: true,
      get: () => {
        throw new Error('buffered unavailable')
      }
    })
    expect(() => {
      act(() => {
        fireEvent.progress(audio)
      })
    }).not.toThrow()
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 20 }])

    expect(() => {
      act(() => {
        fireEvent.timeUpdate(audio)
      })
    }).not.toThrow()
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 20 }])
  })

  it('clears only a detached source-set buffer while another sound remains active', () => {
    const { container, rerender } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
      audioStore.getState().playSound(2, 10)
    })
    const firstAudio = findAudio(container, ONE_SOURCES.primary.url)
    const secondAudio = findAudio(container, SOUNDS[1].audioSources.primary.url)
    setBufferedRanges(firstAudio, [{ start: 0, end: 10 }])
    setBufferedRanges(secondAudio, [{ start: 0, end: 20 }])
    act(() => {
      fireEvent.progress(firstAudio)
      fireEvent.progress(secondAudio)
    })

    rerender(
      <AudioPool
        sounds={[
          {
            id: 1,
            audioSources: { ...ONE_SOURCES, primary: { ...ONE_SOURCES.primary, url: 'https://audio.test/new.m4a' } }
          },
          SOUNDS[1]
        ]}
      />
    )

    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([])
    expect(audioStore.getState().activeSounds.get(2)?.buffered).toEqual([{ start: 0, end: 20 }])
  })

  it('keeps independent sound elements from cross-updating buffered state', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} />)

    act(() => {
      audioStore.getState().playSound(1, 10)
      audioStore.getState().playSound(2, 10)
    })
    const firstAudio = findAudio(container, ONE_SOURCES.primary.url)
    const secondAudio = findAudio(container, SOUNDS[1].audioSources.primary.url)
    setBufferedRanges(firstAudio, [{ start: 0, end: 10 }])
    setBufferedRanges(secondAudio, [{ start: 20, end: 30 }])

    act(() => {
      fireEvent.progress(firstAudio)
    })
    expect(audioStore.getState().activeSounds.get(1)?.buffered).toEqual([{ start: 0, end: 10 }])
    expect(audioStore.getState().activeSounds.get(2)?.buffered).toEqual([])

    act(() => {
      fireEvent.progress(secondAudio)
    })
    expect(audioStore.getState().activeSounds.get(2)?.buffered).toEqual([{ start: 20, end: 30 }])
  })

  it('stops a stale active piece on mount when soundPiece prop is absent', () => {
    act(() => {
      audioStore.getState().playPiece(100, 10)
    })
    expect(audioStore.getState().activePieceId).toBe(100)

    const { container } = render(<AudioPool sounds={SOUNDS} />)

    expect(audioStore.getState().activePieceId).toBeNull()
    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.IDLE)

    act(() => {
      audioStore.getState().playSound(1, 10)
    })

    expect(audioStore.getState().activePieceId).toBeNull()
    expect(container.querySelectorAll('audio')).toHaveLength(1)
    expect(audioStore.getState().activeSounds.get(1)?.status).toBe(AUDIO_STATUS.PLAYING)
  })

  it('clears a piece without a url that entered LOADING', () => {
    const { container } = render(<AudioPool sounds={SOUNDS} soundPiece={{ id: 100, audioSources: null }} />)

    act(() => {
      audioStore.getState().playPiece(100, 10)
    })

    expect(audioStore.getState().activePieceId).toBeNull()
    expect(audioStore.getState().piece.status).toBe(AUDIO_STATUS.IDLE)
    expect(container.querySelectorAll('audio')).toHaveLength(0)
  })

  it('stops a stale active piece without a url on mount', () => {
    act(() => {
      audioStore.getState().playPiece(100, 1)
    })

    const { container } = render(<AudioPool sounds={SOUNDS} soundPiece={{ id: 100, audioSources: null }} />)

    expect(audioStore.getState().activePieceId).toBeNull()
    expect(container.querySelectorAll('audio')).toHaveLength(0)
  })
})
