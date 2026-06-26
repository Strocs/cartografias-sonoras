'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@shared/utils/cn';
import { VolumeControl } from '@shared/ui/VolumeControl';
import {
  AUDIO_STATUS,
  useAudioStore,
  type AudioEngineState,
  type AudioStatus
} from '@shared/lib/audio-engine';

import type { SoundPiece } from '../domain/types';

export interface AudioBottomPlayerProps {
  mapImage?: { src: string; width?: number; height?: number };
  soundPiece?: SoundPiece | null;
}

const ACTIVE_STATUSES = new Set<AudioStatus>([
  AUDIO_STATUS.LOADING,
  AUDIO_STATUS.PLAYING,
  AUDIO_STATUS.PAUSED
]);

// Primitive selectors — Object.is comparison works natively, no useShallow needed.

function selectIsPieceMode(state: AudioEngineState): boolean {
  return (
    state.activePieceId !== null && ACTIVE_STATUSES.has(state.piece.status)
  );
}

function selectIsPiecePlaying(state: AudioEngineState): boolean {
  return state.piece.status === AUDIO_STATUS.PLAYING;
}

export function AudioBottomPlayer({
  mapImage,
  soundPiece
}: AudioBottomPlayerProps) {
  const isPieceMode = useAudioStore(selectIsPieceMode);
  const isPiecePlaying = useAudioStore(selectIsPiecePlaying);
  const pieceCurrentTime = useAudioStore((s) => s.piece.currentTime);
  const pieceDuration = useAudioStore((s) => s.piece.duration);
  const volume = useAudioStore((s) => s.volume);
  const muted = useAudioStore((s) => s.muted);

  const playPiece = useAudioStore((s) => s.playPiece);
  const pausePiece = useAudioStore((s) => s.pausePiece);
  const resumePiece = useAudioStore((s) => s.resumePiece);
  const seekPiece = useAudioStore((s) => s.seekPiece);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const isIdle = !isPieceMode;

  const progress = useMemo(() => {
    if (pieceDuration <= 0) return 0;
    return Math.min(1, Math.max(0, pieceCurrentTime / pieceDuration));
  }, [pieceCurrentTime, pieceDuration]);

  const handlePlayPause = () => {
    if (isIdle && soundPiece) {
      playPiece(soundPiece.id, soundPiece.mapId);
      return;
    }

    if (isPiecePlaying) {
      pausePiece();
    } else {
      resumePiece();
    }
  };

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (pieceDuration <= 0) return;
    const time = (Number(event.target.value) / 100) * pieceDuration;
    seekPiece(time);
  };

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Math.min(1, Math.max(0, Number(event.target.value) / 100)));
  };

  const title = soundPiece?.title ?? 'Obra sonora';
  const subtitle = soundPiece?.author ?? '';

  return (
    <motion.div
      key="audio-bottom-player"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'w-full rounded-3xl shadow-lg',
        'bg-primary-teal border-charcoal max-w-2xl border text-white shadow-2xl'
      )}
      data-testid="audio-bottom-player"
      data-mode={isIdle ? 'idle' : 'piece'}
    >
      <div className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
        <button
          type="button"
          onClick={handlePlayPause}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            'text-primary-teal size-10 bg-white transition-transform',
            'hover:scale-105 active:scale-95',
            'focus:ring-2 focus:ring-white/50 focus:outline-none'
          )}
          aria-label={isPiecePlaying ? 'Pausar' : 'Reproducir'}
          data-testid="bottom-play-pause"
        >
          {isPiecePlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="min-w-0 shrink-0 flex-col">
          <span className="block max-w-[140px] truncate text-sm font-semibold md:max-w-[200px] md:text-base">
            {title}
          </span>
          {subtitle && (
            <span className="block max-w-[140px] truncate text-xs text-white/70 md:max-w-[200px]">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Scrubber
            progress={progress}
            disabled={isIdle}
            onChange={handleScrub}
          />
          <TimeDisplay
            currentTime={pieceCurrentTime}
            duration={pieceDuration}
          />
        </div>

        <WaveVisualizer active={isPiecePlaying} />

        <VolumeControl
          volume={volume}
          muted={muted}
          onToggleMute={toggleMute}
          onVolumeChange={handleVolume}
        />
      </div>
    </motion.div>
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
        'accent-secondary-sand bg-white/20',
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
            'bg-secondary-sand w-1 origin-bottom rounded-full',
            'animate-soundwave h-4'
          )}
          style={{
            animationDelay: `${index * 100}ms`,
            animationPlayState: active ? 'running' : 'paused'
          }}
        />
      ))}
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
