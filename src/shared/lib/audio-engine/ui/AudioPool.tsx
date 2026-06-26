'use client';

import { useRef } from 'react';

import { useMountEffect } from '@shared/hooks/useMountEffect';
import { AUDIO_STATUS, audioTransitions, useAudioStore } from '../';
import type { AudioElementId, AudioEngineState, AudioStatus } from '../types';

interface AudioPoolItem {
  id: number;
  audioUrl: string;
}

interface AudioPoolProps {
  sounds: AudioPoolItem[];
  soundPiece?: AudioPoolItem | null;
}

const ACTIVE_ELEMENT_STATUSES = new Set<AudioStatus>([
  AUDIO_STATUS.LOADING,
  AUDIO_STATUS.PLAYING,
  AUDIO_STATUS.PAUSED,
]);

function selectActiveSoundIds(state: AudioEngineState): string {
  const ids: number[] = [];
  state.activeSounds.forEach((sound, id) => {
    if (ACTIVE_ELEMENT_STATUSES.has(sound.status)) {
      ids.push(id);
    }
  });
  return ids.sort((a, b) => a - b).join(',');
}

function selectPieceActive(state: AudioEngineState): boolean {
  return (
    state.activePieceId !== null &&
    ACTIVE_ELEMENT_STATUSES.has(state.piece.status)
  );
}

function findSoundUrl(
  sounds: AudioPoolItem[],
  soundId: number
): string | undefined {
  return sounds.find((sound) => sound.id === soundId)?.audioUrl;
}

export function AudioPool({ sounds, soundPiece }: AudioPoolProps) {
  const audioRefs = useRef(new Map<AudioElementId, HTMLAudioElement>());
  const prevStatuses = useRef(new Map<AudioElementId, AudioStatus>());
  const prevVolume = useRef<number>(1);
  const prevMuted = useRef<boolean>(false);

  const activeSoundIdsStr = useAudioStore(selectActiveSoundIds);
  const activeSoundIds: number[] = activeSoundIdsStr
    ? activeSoundIdsStr.split(',').map(Number)
    : [];
  const pieceActive = useAudioStore(selectPieceActive);

  const syncAudioElement = (
    id: AudioElementId,
    audio: HTMLAudioElement,
    state: AudioEngineState
  ): void => {
    const status =
      state.activeSounds.get(id)?.status ??
      (state.activePieceId === id ? state.piece.status : undefined);

    if (status === undefined) {
      return;
    }

    const prevStatus = prevStatuses.current.get(id);
    if (prevStatus !== status) {
      if (status === AUDIO_STATUS.LOADING) {
        audio.load();
        void audio.play();
      } else if (status === AUDIO_STATUS.PLAYING) {
        void audio.play();
      } else if (status === AUDIO_STATUS.PAUSED) {
        audio.pause();
      }
      prevStatuses.current.set(id, status);
    }
  };

  const applyGlobalVolume = (state: AudioEngineState): void => {
    if (state.volume === prevVolume.current && state.muted === prevMuted.current) {
      return;
    }
    audioRefs.current.forEach((audio) => {
      audio.volume = state.volume;
      audio.muted = state.muted;
    });
    prevVolume.current = state.volume;
    prevMuted.current = state.muted;
  };

  const applyPendingSeeks = (state: AudioEngineState): void => {
    state._pendingSeeks.forEach((time, id) => {
      const audio = audioRefs.current.get(id);
      if (audio) {
        audio.currentTime = time;
        audioTransitions.seekSound(id, time);
      }
    });

    if (state._pendingPieceSeek !== null && state.activePieceId !== null) {
      const pieceAudio = audioRefs.current.get(state.activePieceId);
      if (pieceAudio) {
        const time = state._pendingPieceSeek;
        pieceAudio.currentTime = time;
        audioTransitions.seekPiece(time);
      }
    }
  };

  const syncAllActiveAudio = (): void => {
    const state = useAudioStore.getState();

    applyGlobalVolume(state);
    applyPendingSeeks(state);

    state.activeSounds.forEach((sound, id) => {
      const audio = audioRefs.current.get(id);
      if (audio) {
        syncAudioElement(id, audio, state);
      }
    });

    if (state.activePieceId !== null) {
      const pieceAudio = audioRefs.current.get(state.activePieceId);
      if (pieceAudio) {
        syncAudioElement(state.activePieceId, pieceAudio, state);
      }
    }

    // Clean up status entries for IDs that are no longer active.
    const activeIds = new Set<AudioElementId>();
    state.activeSounds.forEach((_, id) => activeIds.add(id));
    if (state.activePieceId !== null) {
      activeIds.add(state.activePieceId);
    }
    prevStatuses.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        prevStatuses.current.delete(id);
      }
    });
  };

  useMountEffect(() => {
    syncAllActiveAudio();
    const unsubscribe = useAudioStore.subscribe(syncAllActiveAudio);
    return unsubscribe;
  });

  const registerAudio = (id: AudioElementId) => (element: HTMLAudioElement | null) => {
    if (element === null) {
      audioRefs.current.delete(id);
      prevStatuses.current.delete(id);
      return;
    }

    element.volume = prevVolume.current;
    element.muted = prevMuted.current;
    audioRefs.current.set(id, element);
    syncAudioElement(id, element, useAudioStore.getState());
  };

  const handleLoadedMetadata =
    (id: AudioElementId, isPiece: boolean) =>
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      if (isPiece) {
        audioTransitions.pieceLoaded(audio.duration);
      } else {
        audioTransitions.soundLoaded(id, audio.duration);
      }
    };

  const handleTimeUpdate =
    (id: AudioElementId, isPiece: boolean) =>
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      if (isPiece) {
        audioTransitions.pieceTimeUpdated(audio.currentTime);
      } else {
        audioTransitions.soundTimeUpdated(id, audio.currentTime);
      }
    };

  const handleEnded = (id: AudioElementId, isPiece: boolean) => () => {
    if (isPiece) {
      audioTransitions.pieceEnded();
    } else {
      audioTransitions.soundEnded(id);
    }
  };

  const handleError = (id: AudioElementId, isPiece: boolean) => () => {
    const message = isPiece ? 'piece-audio-error' : 'sound-audio-error';
    if (isPiece) {
      audioTransitions.pieceError(message);
    } else {
      audioTransitions.soundError(id, message);
    }
  };

  return (
    <div aria-hidden="true" className="sr-only">
      {activeSoundIds.map((soundId) => {
        const src = findSoundUrl(sounds, soundId);
        if (!src) {
          return null;
        }
        return (
          <audio
            key={soundId}
            ref={registerAudio(soundId)}
            src={src}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata(soundId, false)}
            onTimeUpdate={handleTimeUpdate(soundId, false)}
            onEnded={handleEnded(soundId, false)}
            onError={handleError(soundId, false)}
          />
        );
      })}
      {pieceActive && soundPiece && (
        <audio
          key={`piece-${soundPiece.id}`}
          ref={registerAudio(soundPiece.id)}
          src={soundPiece.audioUrl}
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata(soundPiece.id, true)}
          onTimeUpdate={handleTimeUpdate(soundPiece.id, true)}
          onEnded={handleEnded(soundPiece.id, true)}
          onError={handleError(soundPiece.id, true)}
        />
      )}
    </div>
  );
}
