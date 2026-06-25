'use client';

import { cn } from '@shared/utils/cn';
import { useAudioStore } from '@shared/lib/audio-engine';

import type { SoundPiece } from '../domain/types';

export interface SoundPieceTriggerProps {
  soundPiece: SoundPiece;
  mapId: number;
}

export function SoundPieceTrigger({ soundPiece, mapId }: SoundPieceTriggerProps) {
  const activePieceId = useAudioStore((state) => state.activePieceId);
  const pieceStatus = useAudioStore((state) => state.piece.status);
  const playPiece = useAudioStore((state) => state.playPiece);
  const stopPiece = useAudioStore((state) => state.stopPiece);

  const isActive =
    activePieceId === soundPiece.id &&
    (pieceStatus === 'loading' ||
      pieceStatus === 'playing' ||
      pieceStatus === 'paused');
  const isPlaying = pieceStatus === 'playing';

  const handleClick = () => {
    if (isActive) {
      stopPiece();
    } else {
      playPiece(soundPiece.id, mapId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex flex-col gap-1 rounded-xl border p-2 text-left transition-all',
        'border-secondary-sand/40 bg-white/90 text-charcoal',
        'hover:bg-white hover:shadow-md',
        'focus:ring-2 focus:ring-secondary-sand/50 focus:outline-none',
        isActive && 'border-secondary-sand bg-secondary-sand/10'
      )}
      aria-label={
        isActive
          ? `Detener ${soundPiece.title}`
          : `Reproducir ${soundPiece.title}`
      }
      data-testid="sound-piece-trigger"
      data-active={isActive ? 'true' : 'false'}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="line-clamp-1 text-xs font-semibold">
          {soundPiece.title}
        </span>
        <span className="shrink-0 text-secondary-sand">
          {isActive && isPlaying ? <PauseIcon /> : <PlayIcon />}
        </span>
      </span>
      <span className="line-clamp-2 text-[10px] leading-tight text-charcoal/70">
        {soundPiece.description}
      </span>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
