export const AUDIO_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
} as const;

export type AudioStatus = (typeof AUDIO_STATUS)[keyof typeof AUDIO_STATUS];

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
}

export interface AudioStore extends AudioEngineState, AudioActions {}
