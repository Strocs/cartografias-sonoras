import {
  AUDIO_STATUS,
  type AudioEngineState,
  type AudioStatus,
  type PieceState,
  type SoundState,
} from './types';

export { AUDIO_STATUS } from './types';
export type {
  AudioEngineState,
  AudioStatus,
  PieceState,
  SoundState,
} from './types';

export function createIdleSoundState(): SoundState {
  return {
    status: AUDIO_STATUS.IDLE,
    currentTime: 0,
    duration: 0,
    error: null,
  };
}

export function createIdlePieceState(): PieceState {
  return {
    status: AUDIO_STATUS.IDLE,
    currentTime: 0,
    duration: 0,
    error: null,
  };
}

export function createInitialState(): AudioEngineState {
  return {
    activeSounds: new Map(),
    activePieceId: null,
    piece: createIdlePieceState(),
    mapId: null,
  };
}

function setSound(
  state: AudioEngineState,
  soundId: number,
  update: Partial<SoundState> | ((current: SoundState) => Partial<SoundState>)
): AudioEngineState {
  const sounds = new Map(state.activeSounds);
  const current = sounds.get(soundId) ?? createIdleSoundState();
  const next = typeof update === 'function' ? update(current) : update;
  sounds.set(soundId, { ...current, ...next });
  return { ...state, activeSounds: sounds };
}

function updatePiece(
  state: AudioEngineState,
  update: Partial<PieceState>
): AudioEngineState {
  return { ...state, piece: { ...state.piece, ...update } };
}

function canStartPlayback(status: AudioStatus): boolean {
  return (
    status === AUDIO_STATUS.IDLE ||
    status === AUDIO_STATUS.PAUSED ||
    status === AUDIO_STATUS.ENDED ||
    status === AUDIO_STATUS.ERROR
  );
}

export function playSound(
  state: AudioEngineState,
  soundId: number,
  mapId: number
): AudioEngineState {
  // SoundPiece has priority over individual sounds.
  if (state.activePieceId !== null) {
    return state;
  }

  let next = state;

  // Sounds from different maps cannot play simultaneously.
  if (
    next.mapId !== null &&
    next.mapId !== mapId &&
    next.activeSounds.size > 0
  ) {
    next = stopAllSounds(next);
  }

  next = { ...next, mapId };

  const current = next.activeSounds.get(soundId) ?? createIdleSoundState();

  if (!canStartPlayback(current.status)) {
    return next;
  }

  return setSound(next, soundId, {
    status: AUDIO_STATUS.LOADING,
    error: null,
  });
}

export function soundLoaded(
  state: AudioEngineState,
  soundId: number
): AudioEngineState {
  const current = state.activeSounds.get(soundId);
  if (current?.status !== AUDIO_STATUS.LOADING) {
    return state;
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.PLAYING });
}

export function pauseSound(
  state: AudioEngineState,
  soundId: number
): AudioEngineState {
  const current = state.activeSounds.get(soundId);
  if (current?.status !== AUDIO_STATUS.PLAYING) {
    return state;
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.PAUSED });
}

export function resumeSound(
  state: AudioEngineState,
  soundId: number
): AudioEngineState {
  const current = state.activeSounds.get(soundId);
  if (current?.status !== AUDIO_STATUS.PAUSED) {
    return state;
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.PLAYING });
}

export function stopSound(
  state: AudioEngineState,
  soundId: number
): AudioEngineState {
  const sounds = new Map(state.activeSounds);
  sounds.delete(soundId);

  const hasActiveSound = Array.from(sounds.values()).some(
    (sound) => sound.status !== AUDIO_STATUS.IDLE
  );

  return {
    ...state,
    activeSounds: sounds,
    mapId: hasActiveSound ? state.mapId : null,
  };
}

export function stopAllSounds(state: AudioEngineState): AudioEngineState {
  return {
    ...state,
    activeSounds: new Map(),
    mapId: null,
  };
}

export function soundEnded(
  state: AudioEngineState,
  soundId: number
): AudioEngineState {
  const current = state.activeSounds.get(soundId);
  if (current?.status !== AUDIO_STATUS.PLAYING) {
    return state;
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.ENDED });
}

export function soundError(
  state: AudioEngineState,
  soundId: number,
  error: string
): AudioEngineState {
  return setSound(state, soundId, { status: AUDIO_STATUS.ERROR, error });
}

export function seekSound(
  state: AudioEngineState,
  soundId: number,
  time: number
): AudioEngineState {
  const current = state.activeSounds.get(soundId);
  if (!current) {
    return state;
  }
  return setSound(state, soundId, { currentTime: time });
}

export function playPiece(
  state: AudioEngineState,
  pieceId: number,
  mapId: number
): AudioEngineState {
  const stopped = stopAllSounds(state);
  return {
    ...stopped,
    mapId,
    activePieceId: pieceId,
    piece: { ...createIdlePieceState(), status: AUDIO_STATUS.LOADING },
  };
}

export function pieceLoaded(state: AudioEngineState): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.LOADING) {
    return state;
  }
  return updatePiece(state, { status: AUDIO_STATUS.PLAYING });
}

export function pausePiece(state: AudioEngineState): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.PLAYING) {
    return state;
  }
  return updatePiece(state, { status: AUDIO_STATUS.PAUSED });
}

export function resumePiece(state: AudioEngineState): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.PAUSED) {
    return state;
  }
  return updatePiece(state, { status: AUDIO_STATUS.PLAYING });
}

export function stopPiece(state: AudioEngineState): AudioEngineState {
  return {
    ...state,
    activePieceId: null,
    piece: createIdlePieceState(),
  };
}

export function pieceEnded(state: AudioEngineState): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.PLAYING) {
    return state;
  }
  return updatePiece(state, { status: AUDIO_STATUS.ENDED });
}

export function pieceError(
  state: AudioEngineState,
  error: string
): AudioEngineState {
  return updatePiece(state, { status: AUDIO_STATUS.ERROR, error });
}

export function seekPiece(
  state: AudioEngineState,
  time: number
): AudioEngineState {
  return updatePiece(state, { currentTime: time });
}
