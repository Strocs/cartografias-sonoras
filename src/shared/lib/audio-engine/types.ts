export const AUDIO_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
} as const;

export type AudioStatus = (typeof AUDIO_STATUS)[keyof typeof AUDIO_STATUS];

export type AudioElementId = number;

export interface SoundState {
  status: AudioStatus;
  currentTime: number;
  duration: number;
  error: string | null;
}

export interface PieceState {
  status: AudioStatus;
  currentTime: number;
  duration: number;
  error: string | null;
}

export interface AudioEngineState {
  activeSounds: Map<number, SoundState>;
  activePieceId: number | null;
  piece: PieceState;
  mapId: number | null;
  volume: number;
  muted: boolean;
  _pendingSeeks: Map<number, number>;
}

export interface AudioActions {
  playSound: (soundId: number, mapId: number) => void;
  pauseSound: (soundId: number) => void;
  resumeSound: (soundId: number) => void;
  stopSound: (soundId: number) => void;
  stopAllSounds: () => void;
  playPiece: (pieceId: number, mapId: number) => void;
  pausePiece: () => void;
  resumePiece: () => void;
  seekPiece: (time: number) => void;
  seekSound: (soundId: number, time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export interface AudioTransitions {
  soundLoaded: (soundId: number, duration: number) => void;
  soundEnded: (soundId: number) => void;
  soundError: (soundId: number, error: string) => void;
  seekSound: (soundId: number, time: number) => void;
  soundTimeUpdated: (soundId: number, time: number) => void;
  pieceLoaded: (duration: number) => void;
  pieceEnded: () => void;
  pieceError: (error: string) => void;
  pieceTimeUpdated: (time: number) => void;
  stopPiece: () => void;
}

export interface AudioStore extends AudioEngineState, AudioActions {}
