'use client'

import { useRef } from 'react'

import { useMountEffect } from '@shared/hooks/useMountEffect'
import type { AudioSources } from '@shared/lib/audio-sources'
import { AUDIO_STATUS, audioStore, audioTransitions, useAudioStore } from '../'
import type { AudioElementId, AudioEngineState, AudioStatus, BufferedRange } from '../types'

/** A sound from a mark: audio is always present. */
interface AudioPoolSound {
  id: number
  audioSources: AudioSources
}

/** A background sound piece: audio may be absent (null = not played). */
interface AudioPoolPiece {
  id: number
  audioSources: AudioSources | null
}

interface AudioPoolProps {
  sounds: AudioPoolSound[]
  soundPiece?: AudioPoolPiece | null
}

/** True when the current piece cannot render an <audio> source, so any LOADING on it must be cleared. */
function pieceHasNoSource(soundPiece: AudioPoolProps['soundPiece']): boolean {
  return !soundPiece || !soundPiece.audioSources
}

const ACTIVE_ELEMENT_STATUSES = new Set<AudioStatus>([
  AUDIO_STATUS.LOADING,
  AUDIO_STATUS.READY,
  AUDIO_STATUS.PLAYING,
  AUDIO_STATUS.BUFFERING,
  AUDIO_STATUS.PAUSED
])

function selectActiveSoundIds(state: AudioEngineState): string {
  const ids: number[] = []
  state.activeSounds.forEach((sound, id) => {
    if (ACTIVE_ELEMENT_STATUSES.has(sound.status)) {
      ids.push(id)
    }
  })
  return ids.sort((a, b) => a - b).join(',')
}

function selectPieceActive(state: AudioEngineState): boolean {
  return state.activePieceId !== null && ACTIVE_ELEMENT_STATUSES.has(state.piece.status)
}

function findSoundSources(sounds: AudioPoolSound[], soundId: number): AudioSources | undefined {
  return sounds.find((sound) => sound.id === soundId)?.audioSources
}

function serializeBuffered(audio: HTMLAudioElement): BufferedRange[] | undefined {
  try {
    const ranges: BufferedRange[] = []
    for (let index = 0; index < audio.buffered.length; index += 1) {
      ranges.push({ start: audio.buffered.start(index), end: audio.buffered.end(index) })
    }
    return ranges
  } catch {
    return undefined
  }
}

export function AudioPool({ sounds, soundPiece }: AudioPoolProps) {
  const audioRefs = useRef(new Map<AudioElementId, HTMLAudioElement>())
  const audioRefCallbacks = useRef(new Map<string, (element: HTMLAudioElement | null) => void>())
  const prevStatuses = useRef(new Map<AudioElementId, AudioStatus>())
  const prevVolume = useRef<number>(1)
  const prevMuted = useRef<boolean>(false)

  const activeSoundIdsStr = useAudioStore(selectActiveSoundIds)
  const activeSoundIds: number[] = activeSoundIdsStr ? activeSoundIdsStr.split(',').map(Number) : []
  const pieceActive = useAudioStore(selectPieceActive)

  const syncAudioElement = (id: AudioElementId, audio: HTMLAudioElement, state: AudioEngineState): void => {
    const status = state.activeSounds.get(id)?.status ?? (state.activePieceId === id ? state.piece.status : undefined)

    if (status === undefined) {
      return
    }

    const prevStatus = prevStatuses.current.get(id)
    if (prevStatus !== status) {
      if (status === AUDIO_STATUS.LOADING) {
        audio.load()
        void audio.play()
      } else if (status === AUDIO_STATUS.PLAYING) {
        void audio.play()
      } else if (status === AUDIO_STATUS.PAUSED) {
        audio.pause()
      }
      prevStatuses.current.set(id, status)
    }
  }

  const applyGlobalVolume = (state: AudioEngineState): void => {
    if (state.volume === prevVolume.current && state.muted === prevMuted.current) {
      return
    }
    audioRefs.current.forEach((audio) => {
      audio.volume = state.volume
      audio.muted = state.muted
    })
    prevVolume.current = state.volume
    prevMuted.current = state.muted
  }

  const applyPendingSeeks = (state: AudioEngineState): void => {
    state._pendingSeeks.forEach((time, id) => {
      const audio = audioRefs.current.get(id)
      if (audio) {
        audio.currentTime = time
        audioTransitions.seekSound(id, time)
      }
    })

    if (state._pendingPieceSeek !== null && state.activePieceId !== null) {
      const pieceAudio = audioRefs.current.get(state.activePieceId)
      if (pieceAudio) {
        const time = state._pendingPieceSeek
        pieceAudio.currentTime = time
        audioTransitions.seekPiece(time)
      }
    }
  }

  const syncAllActiveAudio = (): void => {
    const state = audioStore.getState()

    applyGlobalVolume(state)
    applyPendingSeeks(state)

    state.activeSounds.forEach((sound, id) => {
      const audio = audioRefs.current.get(id)
      if (audio) {
        syncAudioElement(id, audio, state)
      }
    })

    if (state.activePieceId !== null) {
      // A piece without a url never mounts an <audio> element, so a LOADING
      // status for one must be cleared to IDLE instead of hanging.
      if (state.piece.status === AUDIO_STATUS.LOADING && pieceHasNoSource(soundPiece)) {
        audioTransitions.stopPiece()
        return
      }
      const pieceAudio = audioRefs.current.get(state.activePieceId)
      if (pieceAudio) {
        syncAudioElement(state.activePieceId, pieceAudio, state)
      }
    }

    // Clean up status entries for IDs that are no longer active.
    const activeIds = new Set<AudioElementId>()
    state.activeSounds.forEach((_, id) => activeIds.add(id))
    if (state.activePieceId !== null) {
      activeIds.add(state.activePieceId)
    }
    prevStatuses.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        prevStatuses.current.delete(id)
      }
    })
  }

  useMountEffect(() => {
    // On mount, stop a stale active piece that has no audio element: either the
    // soundPiece prop is absent or the piece is configured without a url.
    if (pieceHasNoSource(soundPiece) && audioStore.getState().activePieceId !== null) {
      audioTransitions.stopPiece()
    }
    syncAllActiveAudio()
    const unsubscribe = audioStore.subscribe(syncAllActiveAudio)
    return unsubscribe
  })

  const registerAudio = (id: AudioElementId, isPiece: boolean) => {
    const callbackKey = `${isPiece ? 'piece' : 'sound'}:${id}`
    const existingCallback = audioRefCallbacks.current.get(callbackKey)
    if (existingCallback) return existingCallback

    const callback = (element: HTMLAudioElement | null) => {
      if (element === null) {
        audioRefs.current.delete(id)
        prevStatuses.current.delete(id)
        if (isPiece) audioTransitions.pieceBuffered([])
        else audioTransitions.soundBuffered(id, [])
        return
      }

      element.volume = prevVolume.current
      element.muted = prevMuted.current
      audioRefs.current.set(id, element)
      syncAudioElement(id, element, audioStore.getState())
    }
    audioRefCallbacks.current.set(callbackKey, callback)
    return callback
  }

  const handleLoadedMetadata =
    (id: AudioElementId, isPiece: boolean) => (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget
      if (isPiece) {
        audioTransitions.pieceLoaded(audio.duration)
        const ranges = serializeBuffered(audio)
        if (ranges) audioTransitions.pieceBuffered(ranges)
      } else {
        audioTransitions.soundLoaded(id, audio.duration)
        const ranges = serializeBuffered(audio)
        if (ranges) audioTransitions.soundBuffered(id, ranges)
      }
    }

  const handleCanPlay = (id: AudioElementId, isPiece: boolean) => () => {
    if (isPiece) audioTransitions.pieceReady()
    else audioTransitions.soundReady(id)
  }

  const handlePlaying = (id: AudioElementId, isPiece: boolean) => () => {
    if (isPiece) audioTransitions.piecePlaying()
    else audioTransitions.soundPlaying(id)
  }

  const handleBuffering = (id: AudioElementId, isPiece: boolean) => () => {
    if (isPiece) audioTransitions.pieceBuffering()
    else audioTransitions.soundBuffering(id)
  }

  const handleBuffered = (id: AudioElementId, isPiece: boolean) => (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const ranges = serializeBuffered(event.currentTarget)
    if (!ranges) return
    if (isPiece) audioTransitions.pieceBuffered(ranges)
    else audioTransitions.soundBuffered(id, ranges)
  }

  const handleTimeUpdate =
    (id: AudioElementId, isPiece: boolean) => (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget
      if (isPiece) {
        audioTransitions.pieceTimeUpdated(audio.currentTime)
      } else {
        audioTransitions.soundTimeUpdated(id, audio.currentTime)
      }
      const ranges = serializeBuffered(audio)
      if (!ranges) return
      if (isPiece) audioTransitions.pieceBuffered(ranges)
      else audioTransitions.soundBuffered(id, ranges)
    }

  const handleEnded = (id: AudioElementId, isPiece: boolean) => () => {
    if (isPiece) {
      audioTransitions.pieceEnded()
    } else {
      audioTransitions.soundEnded(id)
    }
  }

  const handleError = (id: AudioElementId, isPiece: boolean) => () => {
    const message = isPiece ? 'piece-audio-error' : 'sound-audio-error'
    if (isPiece) {
      audioTransitions.pieceError(message)
    } else {
      audioTransitions.soundError(id, message)
    }
  }

  return (
    <div aria-hidden="true" className="sr-only">
      {activeSoundIds.map((soundId) => {
        const audioSources = findSoundSources(sounds, soundId)
        if (!audioSources) {
          return null
        }
        return (
          <audio
            key={`${soundId}-${audioSources.primary.url}-${audioSources.fallback.url}`}
            ref={registerAudio(soundId, false)}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata(soundId, false)}
            onLoadStart={() => audioTransitions.soundLoadStarted(soundId)}
            onCanPlay={handleCanPlay(soundId, false)}
            onPlaying={handlePlaying(soundId, false)}
            onWaiting={handleBuffering(soundId, false)}
            onStalled={handleBuffering(soundId, false)}
            onProgress={handleBuffered(soundId, false)}
            onSeeked={handleBuffered(soundId, false)}
            onTimeUpdate={handleTimeUpdate(soundId, false)}
            onEnded={handleEnded(soundId, false)}
            onError={handleError(soundId, false)}
          >
            <source src={audioSources.primary.url} type={audioSources.primary.mimeType} />
            <source src={audioSources.fallback.url} type={audioSources.fallback.mimeType} />
          </audio>
        )
      })}
      {pieceActive && soundPiece?.audioSources && (
        <audio
          key={`piece-${soundPiece.id}-${soundPiece.audioSources.primary.url}-${soundPiece.audioSources.fallback.url}`}
          ref={registerAudio(soundPiece.id, true)}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata(soundPiece.id, true)}
          onLoadStart={() => audioTransitions.pieceLoadStarted()}
          onCanPlay={handleCanPlay(soundPiece.id, true)}
          onPlaying={handlePlaying(soundPiece.id, true)}
          onWaiting={handleBuffering(soundPiece.id, true)}
          onStalled={handleBuffering(soundPiece.id, true)}
          onProgress={handleBuffered(soundPiece.id, true)}
          onSeeked={handleBuffered(soundPiece.id, true)}
          onTimeUpdate={handleTimeUpdate(soundPiece.id, true)}
          onEnded={handleEnded(soundPiece.id, true)}
          onError={handleError(soundPiece.id, true)}
        >
          <source src={soundPiece.audioSources.primary.url} type={soundPiece.audioSources.primary.mimeType} />
          <source src={soundPiece.audioSources.fallback.url} type={soundPiece.audioSources.fallback.mimeType} />
        </audio>
      )}
    </div>
  )
}
