'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';

import { cn } from '@shared/utils/cn';
import {
  AUDIO_STATUS,
  useAudioStore,
  type AudioEngineState,
  type AudioStatus,
  type SoundState,
} from '@shared/lib/audio-engine';

import type { SoundPiece } from '../domain/types';

export interface AudioBottomPlayerProps {
  mapImage?: { src: string; width?: number; height?: number };
  soundPiece?: SoundPiece | null;
}

const ACTIVE_STATUSES = new Set<AudioStatus>([
  AUDIO_STATUS.LOADING,
  AUDIO_STATUS.PLAYING,
  AUDIO_STATUS.PAUSED,
]);

interface PlayerState {
  isVisible: boolean;
  isPieceMode: boolean;
  isPlaying: boolean;
  title: string;
  subtitle: string;
  currentTime: number;
  duration: number;
  canScrub: boolean;
  volume: number;
  muted: boolean;
}

function selectPlayerState(
  state: AudioEngineState,
  soundPiece?: SoundPiece | null
): PlayerState {
  const pieceActive =
    state.activePieceId !== null && ACTIVE_STATUSES.has(state.piece.status);

  if (pieceActive) {
    return {
      isVisible: true,
      isPieceMode: true,
      isPlaying: state.piece.status === AUDIO_STATUS.PLAYING,
      title: soundPiece?.title ?? 'Obra sonora',
      subtitle: soundPiece?.author ?? '',
      currentTime: state.piece.currentTime,
      duration: state.piece.duration,
      canScrub: true,
      volume: state.volume,
      muted: state.muted,
    };
  }

  let activeSound: SoundState | undefined;
  let activeSoundId: number | null = null;
  state.activeSounds.forEach((sound, id) => {
    if (activeSound === undefined && ACTIVE_STATUSES.has(sound.status)) {
      activeSound = sound;
      activeSoundId = id;
    }
  });

  if (activeSound === undefined || activeSoundId === null) {
    return {
      isVisible: false,
      isPieceMode: false,
      isPlaying: false,
      title: '',
      subtitle: '',
      currentTime: 0,
      duration: 0,
      canScrub: false,
      volume: state.volume,
      muted: state.muted,
    };
  }

  return {
    isVisible: true,
    isPieceMode: false,
    isPlaying: activeSound.status === AUDIO_STATUS.PLAYING,
    title: 'Modo Exploración',
    subtitle: `Sonido ${activeSoundId}`,
    currentTime: activeSound.currentTime,
    duration: activeSound.duration,
    canScrub: false,
    volume: state.volume,
    muted: state.muted,
  };
}

function selectActiveSoundId(state: AudioEngineState): number | null {
  let id: number | null = null;
  state.activeSounds.forEach((sound, soundId) => {
    if (id === null && ACTIVE_STATUSES.has(sound.status)) {
      id = soundId;
    }
  });
  return id;
}

export function AudioBottomPlayer({
  mapImage,
  soundPiece,
}: AudioBottomPlayerProps) {
  const state = useAudioStore(
    useShallow((s) => selectPlayerState(s, soundPiece))
  );
  const activeSoundId = useAudioStore(selectActiveSoundId);
  const pausePiece = useAudioStore((s) => s.pausePiece);
  const resumePiece = useAudioStore((s) => s.resumePiece);
  const pauseSound = useAudioStore((s) => s.pauseSound);
  const resumeSound = useAudioStore((s) => s.resumeSound);
  const seekPiece = useAudioStore((s) => s.seekPiece);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const progress = useMemo(() => {
    if (state.duration <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, state.currentTime / state.duration));
  }, [state.currentTime, state.duration]);

  const handlePlayPause = () => {
    if (state.isPieceMode) {
      if (state.isPlaying) {
        pausePiece();
      } else {
        resumePiece();
      }
      return;
    }

    if (activeSoundId !== null) {
      if (state.isPlaying) {
        pauseSound(activeSoundId);
      } else {
        resumeSound(activeSoundId);
      }
    }
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!state.canScrub || state.duration <= 0) {
      return;
    }
    const value = Number(event.target.value);
    const time = (value / 100) * state.duration;
    seekPiece(time);
  };

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setVolume(Math.min(1, Math.max(0, value / 100)));
  };

  return (
    <AnimatePresence>
      {state.isVisible && (
        <motion.div
          key="audio-bottom-player"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed inset-x-4 bottom-4 z-[1001]',
            'rounded-3xl border border-secondary-sand/30',
            'bg-primary-teal text-white shadow-2xl'
          )}
          data-testid="audio-bottom-player"
          data-mode={state.isPieceMode ? 'piece' : 'exploration'}
        >
          <div className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
            {mapImage && (
              <div className="hidden shrink-0 overflow-hidden rounded-2xl sm:block">
                <img
                  src={mapImage.src}
                  alt=""
                  className="size-12 object-cover md:size-14"
                  width={mapImage.width}
                  height={mapImage.height}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handlePlayPause}
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                'size-10 bg-white text-primary-teal transition-transform',
                'hover:scale-105 active:scale-95',
                'focus:ring-2 focus:ring-white/50 focus:outline-none'
              )}
              aria-label={state.isPlaying ? 'Pausar' : 'Reproducir'}
              data-testid="bottom-play-pause"
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="min-w-0 shrink-0 flex-col">
              <span className="block max-w-[140px] truncate text-sm font-semibold md:max-w-[200px] md:text-base">
                {state.title}
              </span>
              {state.subtitle && (
                <span className="block max-w-[140px] truncate text-xs text-white/70 md:max-w-[200px]">
                  {state.subtitle}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Scrubber
                progress={progress}
                disabled={!state.canScrub}
                onChange={handleScrub}
              />
              <TimeDisplay
                currentTime={state.currentTime}
                duration={state.duration}
              />
            </div>

            <WaveVisualizer active={state.isPlaying} />

            <VolumeControl
              volume={state.volume}
              muted={state.muted}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolume}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ScrubberProps {
  progress: number;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Scrubber({ progress, disabled, onChange }: ScrubberProps) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={0.1}
      value={Math.round(progress * 1000) / 10}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'h-1.5 w-full cursor-pointer appearance-none rounded-full',
        'bg-white/20 accent-secondary-sand',
        disabled && 'cursor-default opacity-60'
      )}
      aria-label="Progreso de reproducción"
      data-testid="bottom-scrubber"
    />
  );
}

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  return (
    <span
      className="self-end text-xs text-white/80 tabular-nums"
      data-testid="bottom-time"
    >
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  );
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

interface WaveVisualizerProps {
  active: boolean;
}

function WaveVisualizer({ active }: WaveVisualizerProps) {
  return (
    <div
      className="hidden items-center gap-0.5 md:flex"
      aria-hidden="true"
      data-testid="bottom-wave"
      data-active={active ? 'true' : 'false'}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'w-1 origin-bottom rounded-full bg-secondary-sand',
            'h-4 animate-soundwave'
          )}
          style={{
            animationDelay: `${index * 100}ms`,
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
    </div>
  );
}

interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onVolumeChange,
}: VolumeControlProps) {
  const displayVolume = muted ? 0 : volume;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onToggleMute}
        className="text-white/80 transition-colors hover:text-white"
        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        data-testid="bottom-mute"
      >
        {muted ? <MutedIcon /> : <VolumeIcon />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(displayVolume * 100)}
        onChange={onVolumeChange}
        className="hidden h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20 accent-secondary-sand sm:block"
        aria-label="Volumen"
        data-testid="bottom-volume"
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
