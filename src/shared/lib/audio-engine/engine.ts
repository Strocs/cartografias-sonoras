import {
  AUDIO_STATUS,
  type AudioEngineState,
  type AudioStatus,
  type BufferedRange,
  type PieceState,
  type SoundState
} from './types'

export { AUDIO_STATUS } from './types'
export type { AudioEngineState, AudioStatus, BufferedRange, PieceState, SoundState } from './types'

export function createIdleSoundState(): SoundState {
  return {
    status: AUDIO_STATUS.IDLE,
    currentTime: 0,
    duration: 0,
    error: null,
    buffered: []
  }
}

export function createIdlePieceState(): PieceState {
  return {
    status: AUDIO_STATUS.IDLE,
    currentTime: 0,
    duration: 0,
    error: null,
    buffered: []
  }
}

export function createInitialState(): AudioEngineState {
  return {
    activeSounds: new Map(),
    activePieceId: null,
    piece: createIdlePieceState(),
    mapId: null,
    volume: 1,
    muted: false,
    _pendingSeeks: new Map(),
    _pendingPieceSeek: null
  }
}

function setSound(
  state: AudioEngineState,
  soundId: number,
  update: Partial<SoundState> | ((current: SoundState) => Partial<SoundState>)
): AudioEngineState {
  const sounds = new Map(state.activeSounds)
  const current = sounds.get(soundId) ?? createIdleSoundState()
  const next = typeof update === 'function' ? update(current) : update
  sounds.set(soundId, { ...current, ...next })
  return { ...state, activeSounds: sounds }
}

function updatePiece(state: AudioEngineState, update: Partial<PieceState>): AudioEngineState {
  return { ...state, piece: { ...state.piece, ...update } }
}

function canBuffer(status: AudioStatus): boolean {
  return (
    status === AUDIO_STATUS.LOADING ||
    status === AUDIO_STATUS.READY ||
    status === AUDIO_STATUS.PLAYING ||
    status === AUDIO_STATUS.BUFFERING
  )
}

function clearSoundPendingSeek(state: AudioEngineState, soundId: number): AudioEngineState {
  if (!state._pendingSeeks.has(soundId)) return state
  const pending = new Map(state._pendingSeeks)
  pending.delete(soundId)
  return { ...state, _pendingSeeks: pending }
}

export function normalizeBufferedRanges(ranges: BufferedRange[]): BufferedRange[] {
  const sorted = ranges
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && start <= end)
    .sort((left, right) => left.start - right.start || left.end - right.end)
  return sorted.reduce<BufferedRange[]>((merged, range) => {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else {
      merged.push({ ...range })
    }
    return merged
  }, [])
}

function rangesEqual(left: BufferedRange[], right: BufferedRange[]): boolean {
  return (
    left.length === right.length &&
    left.every((range, index) => range.start === right[index]?.start && range.end === right[index]?.end)
  )
}

function canStartPlayback(status: AudioStatus): boolean {
  return (
    status === AUDIO_STATUS.IDLE ||
    status === AUDIO_STATUS.PAUSED ||
    status === AUDIO_STATUS.ENDED ||
    status === AUDIO_STATUS.ERROR
  )
}

export function playSound(state: AudioEngineState, soundId: number, mapId: number): AudioEngineState {
  // SoundPiece has priority over individual sounds only while actively playing/loading.
  // When paused, individual sounds are allowed.
  if (state.activePieceId !== null && canBuffer(state.piece.status)) {
    return state
  }

  let next = state

  // Sounds from different maps cannot play simultaneously.
  if (next.mapId !== null && next.mapId !== mapId && next.activeSounds.size > 0) {
    next = stopAllSounds(next)
  }

  next = { ...next, mapId }

  const current = next.activeSounds.get(soundId) ?? createIdleSoundState()

  if (!canStartPlayback(current.status)) {
    return next
  }

  return setSound(next, soundId, {
    status: AUDIO_STATUS.LOADING,
    currentTime: 0,
    duration: 0,
    error: null,
    buffered: []
  })
}

export function soundLoaded(state: AudioEngineState, soundId: number, duration?: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current || duration === undefined) {
    return state
  }
  return setSound(state, soundId, { duration })
}

export function soundLoadStarted(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  return current && canStartPlayback(current.status) ? playSound(state, soundId, state.mapId ?? 0) : state
}

export function soundReady(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  return current &&
    (current.status === AUDIO_STATUS.LOADING ||
      current.status === AUDIO_STATUS.BUFFERING ||
      current.status === AUDIO_STATUS.READY)
    ? setSound(state, soundId, { status: AUDIO_STATUS.READY })
    : state
}

export function soundPlaying(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  return current && canBuffer(current.status) ? setSound(state, soundId, { status: AUDIO_STATUS.PLAYING }) : state
}

export function soundBuffering(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  return current && canBuffer(current.status) ? setSound(state, soundId, { status: AUDIO_STATUS.BUFFERING }) : state
}

export function soundBuffered(state: AudioEngineState, soundId: number, ranges: BufferedRange[]): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current || (current.status !== AUDIO_STATUS.PAUSED && !canBuffer(current.status))) return state
  const buffered = normalizeBufferedRanges(ranges)
  return rangesEqual(current.buffered, buffered) ? state : setSound(state, soundId, { buffered })
}

export function pauseSound(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current || !canBuffer(current.status)) {
    return state
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.PAUSED })
}

export function resumeSound(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (current?.status !== AUDIO_STATUS.PAUSED) {
    return state
  }
  return setSound(state, soundId, { status: AUDIO_STATUS.PLAYING })
}

export function stopSound(state: AudioEngineState, soundId: number): AudioEngineState {
  const sounds = new Map(state.activeSounds)
  sounds.delete(soundId)

  const hasActiveSound = Array.from(sounds.values()).some((sound) => sound.status !== AUDIO_STATUS.IDLE)

  return {
    ...state,
    activeSounds: sounds,
    mapId: hasActiveSound ? state.mapId : null,
    _pendingSeeks: clearSoundPendingSeek(state, soundId)._pendingSeeks
  }
}

export function stopAllSounds(state: AudioEngineState): AudioEngineState {
  return {
    ...state,
    activeSounds: new Map(),
    mapId: null,
    _pendingSeeks: new Map()
  }
}

export function pauseAllSounds(state: AudioEngineState): AudioEngineState {
  let next = state
  state.activeSounds.forEach((sound, id) => {
    if (canBuffer(sound.status)) {
      next = setSound(next, id, { status: AUDIO_STATUS.PAUSED })
    }
  })
  return next
}

export function soundEnded(state: AudioEngineState, soundId: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (
    current?.status !== AUDIO_STATUS.READY &&
    current?.status !== AUDIO_STATUS.PLAYING &&
    current?.status !== AUDIO_STATUS.BUFFERING
  ) {
    return state
  }
  return setSound(state, soundId, {
    status: AUDIO_STATUS.ENDED,
    currentTime: current.duration,
    buffered: []
  })
}

export function soundError(state: AudioEngineState, soundId: number, error: string): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  return current && current.status !== AUDIO_STATUS.ERROR
    ? clearSoundPendingSeek(setSound(state, soundId, { status: AUDIO_STATUS.ERROR, error, buffered: [] }), soundId)
    : state
}

export function seekSound(state: AudioEngineState, soundId: number, time: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current) {
    return state
  }
  const pending = new Map(state._pendingSeeks)
  pending.delete(soundId)
  return { ...setSound(state, soundId, { currentTime: time }), _pendingSeeks: pending }
}

export function pendingSeek(state: AudioEngineState, soundId: number, time: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current) {
    return state
  }
  const pending = new Map(state._pendingSeeks)
  pending.set(soundId, time)
  return { ...state, _pendingSeeks: pending }
}

export function setVolume(state: AudioEngineState, volume: number): AudioEngineState {
  return { ...state, volume }
}

export function toggleMute(state: AudioEngineState): AudioEngineState {
  return { ...state, muted: !state.muted }
}

export function soundTimeUpdated(state: AudioEngineState, soundId: number, time: number): AudioEngineState {
  const current = state.activeSounds.get(soundId)
  if (!current) {
    return state
  }
  return setSound(state, soundId, { currentTime: time })
}

export function pieceTimeUpdated(state: AudioEngineState, time: number): AudioEngineState {
  return updatePiece(state, { currentTime: time })
}

export function playPiece(state: AudioEngineState, pieceId: number, mapId: number): AudioEngineState {
  const paused = pauseAllSounds(state)
  return {
    ...paused,
    mapId,
    activePieceId: pieceId,
    piece: { ...createIdlePieceState(), status: AUDIO_STATUS.LOADING }
  }
}

export function pieceLoaded(state: AudioEngineState, duration?: number): AudioEngineState {
  if (state.activePieceId === null || duration === undefined) {
    return state
  }
  return updatePiece(state, { duration })
}

export function pieceLoadStarted(state: AudioEngineState): AudioEngineState {
  return state.activePieceId !== null && canStartPlayback(state.piece.status)
    ? { ...state, piece: { ...createIdlePieceState(), status: AUDIO_STATUS.LOADING } }
    : state
}

export function pieceReady(state: AudioEngineState): AudioEngineState {
  return state.piece.status === AUDIO_STATUS.LOADING ||
    state.piece.status === AUDIO_STATUS.BUFFERING ||
    state.piece.status === AUDIO_STATUS.READY
    ? updatePiece(state, { status: AUDIO_STATUS.READY })
    : state
}

export function piecePlaying(state: AudioEngineState): AudioEngineState {
  return canBuffer(state.piece.status) ? updatePiece(state, { status: AUDIO_STATUS.PLAYING }) : state
}

export function pieceBuffering(state: AudioEngineState): AudioEngineState {
  return canBuffer(state.piece.status) ? updatePiece(state, { status: AUDIO_STATUS.BUFFERING }) : state
}

export function pieceBuffered(state: AudioEngineState, ranges: BufferedRange[]): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.PAUSED && !canBuffer(state.piece.status)) return state
  const buffered = normalizeBufferedRanges(ranges)
  return rangesEqual(state.piece.buffered, buffered) ? state : updatePiece(state, { buffered })
}

export function pausePiece(state: AudioEngineState): AudioEngineState {
  if (!canBuffer(state.piece.status)) {
    return state
  }
  return updatePiece(state, { status: AUDIO_STATUS.PAUSED })
}

export function resumePiece(state: AudioEngineState): AudioEngineState {
  if (state.piece.status !== AUDIO_STATUS.PAUSED) {
    return state
  }
  // Re-establish priority: pause all individual sounds when resuming the piece.
  const paused = pauseAllSounds(state)
  return updatePiece(paused, { status: AUDIO_STATUS.PLAYING })
}

export function stopPiece(state: AudioEngineState): AudioEngineState {
  return {
    ...state,
    activePieceId: null,
    piece: createIdlePieceState()
  }
}

export function pieceEnded(state: AudioEngineState): AudioEngineState {
  if (
    state.piece.status !== AUDIO_STATUS.READY &&
    state.piece.status !== AUDIO_STATUS.PLAYING &&
    state.piece.status !== AUDIO_STATUS.BUFFERING
  ) {
    return state
  }
  return {
    ...state,
    activePieceId: null,
    piece: { ...state.piece, status: AUDIO_STATUS.ENDED, currentTime: state.piece.duration, buffered: [] },
    _pendingPieceSeek: null
  }
}

export function pieceError(state: AudioEngineState, error: string): AudioEngineState {
  return state.piece.status === AUDIO_STATUS.ERROR
    ? state
    : { ...updatePiece(state, { status: AUDIO_STATUS.ERROR, error, buffered: [] }), _pendingPieceSeek: null }
}

export function seekPiece(state: AudioEngineState, time: number): AudioEngineState {
  return updatePiece(state, { currentTime: time })
}

export function pendingPieceSeek(state: AudioEngineState, time: number): AudioEngineState {
  return {
    ...updatePiece(state, { currentTime: time }),
    _pendingPieceSeek: time
  }
}

export function applyPieceSeek(state: AudioEngineState, time: number): AudioEngineState {
  return {
    ...updatePiece(state, { currentTime: time }),
    _pendingPieceSeek: null
  }
}
