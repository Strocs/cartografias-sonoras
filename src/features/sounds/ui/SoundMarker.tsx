'use client';

import L from 'leaflet';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@shared/utils/cn';
import {
  AUDIO_STATUS,
  useAudioStore,
  type AudioEngineState
} from '@shared/lib/audio-engine';
import { relativeToPixel } from '@shared/lib/coordinates';
import { useSmoothProgressRing } from '@shared/lib/motion';
import { useMap } from '@shared/lib/viewport/MapContext';
import { useMountEffect } from '@shared/hooks/useMountEffect';

import type { Sound } from '../domain/types';
import { HoverCard } from './HoverCard';

export interface SoundMarkerProps {
  sound: Sound;
}

export function SoundMarker({ sound }: SoundMarkerProps) {
  const { map, width, height } = useMap();
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );
  const progressCircleRef = useRef<SVGCircleElement>(null);

  // Primitive selectors — Object.is comparison works natively, no useShallow needed.
  const status = useAudioStore(
    (state: AudioEngineState) =>
      state.activeSounds.get(sound.id)?.status ?? AUDIO_STATUS.IDLE
  );
  const currentTime = useAudioStore(
    (state: AudioEngineState) =>
      state.activeSounds.get(sound.id)?.currentTime ?? 0
  );
  const duration = useAudioStore(
    (state: AudioEngineState) => state.activeSounds.get(sound.id)?.duration ?? 0
  );
  const activePieceId = useAudioStore((state) => state.activePieceId);
  const pieceStatus = useAudioStore((state) => state.piece.status);
  const playSound = useAudioStore((state) => state.playSound);
  const pauseSound = useAudioStore((state) => state.pauseSound);
  const resumeSound = useAudioStore((state) => state.resumeSound);
  const pausePiece = useAudioStore((state) => state.pausePiece);

  const SIZE = 54;
  const CENTER = SIZE / 2;
  // Ring positioned outside the marker with a visible gap.
  const RING_STROKE = 4;
  const RING_RADIUS = CENTER - RING_STROKE / 2 - 1.5;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // Piece blocks marker interaction only while actively playing/loading, not when paused.
  const isPiecePlaying =
    activePieceId !== null &&
    (pieceStatus === AUDIO_STATUS.PLAYING ||
      pieceStatus === AUDIO_STATUS.LOADING);
  const isPlaying =
    status === AUDIO_STATUS.PLAYING || status === AUDIO_STATUS.LOADING;
  const isPaused = status === AUDIO_STATUS.PAUSED;
  const isActive = isPlaying || isPaused;

  // Smooth progress ring: interpolates currentTime at 60fps between store updates
  // by writing strokeDashoffset directly to the SVG circle ref.
  useSmoothProgressRing({
    currentTime,
    duration,
    isPlaying,
    circleRef: progressCircleRef,
    circumference: RING_CIRCUMFERENCE
  });

  useMountEffect(() => {
    if (map === null) {
      return;
    }

    const container = document.createElement('div');

    const icon = L.divIcon({
      html: container,
      className: '',
      iconSize: [SIZE, SIZE],
      iconAnchor: [CENTER, CENTER]
    });

    const pixel = relativeToPixel(sound.position, width, height);
    const marker = L.marker([pixel.y, pixel.x], {
      icon,
      keyboard: false
    }).addTo(map);

    setPortalContainer(container);

    return () => {
      marker.remove();
      container.remove();
      setPortalContainer(null);
    };
  });

  if (portalContainer === null) {
    return null;
  }

  function handleClick() {
    // If piece is actively playing, pause it first, then play this sound.
    if (isPiecePlaying) {
      pausePiece();
    }

    if (isPlaying) {
      pauseSound(sound.id);
    } else if (isPaused) {
      resumeSound(sound.id);
    } else {
      playSound(sound.id, sound.mapId);
    }
  }

  const ariaLabel = isPlaying ? 'Pausar sonido' : 'Reproducir sonido';

  return createPortal(
    <div
      id={`sound-marker-container-${sound.id}`}
      className={cn(
        'group absolute top-1/2 left-1/2 z-50 -translate-1/2 select-none'
      )}
      aria-label={ariaLabel}
      data-testid="sound-marker"
      data-sound-id={sound.id}
      data-status={isPlaying ? 'playing' : isPaused ? 'paused' : 'idle'}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `${SIZE}px`,
          height: `${SIZE}px`
        }}
      >
        {/* Playback Ripple Ring (when active) - Keeps the pulse of our project */}
        {isPlaying && (
          <span
            id={`sound-ripple-${sound.id}`}
            className="absolute animate-marker-ripple rounded-full border-2 border-charcoal opacity-40"
            style={{
              width: `${SIZE + 22}px`,
              height: `${SIZE + 22}px`
            }}
            aria-hidden="true"
          />
        )}

        {/* Scalable Container for Seamless Transition Animation */}
        <div
          className={cn(
            'absolute inset-0 flex origin-center items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110',
            isActive && 'scale-140 group-hover:scale-135'
          )}
        >
          {/* Circular Progress Playback Ring */}
          <svg
            className="pointer-events-none absolute z-10 origin-center -rotate-90"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden="true"
            data-testid="progress-ring"
          >
            {/* Base track — always visible */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_RADIUS}
              fill="none"
              className="stroke-white/80"
              strokeWidth={RING_STROKE - 1}
              opacity="0.8"
            />
            {/* Active progress — only while active */}
            {isActive && (
              <circle
                ref={progressCircleRef}
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                fill="none"
                className="stroke-primary-brown"
                strokeWidth={RING_STROKE}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
                strokeLinecap="round"
              />
            )}
          </svg>

          <button
            id={`sound-marker-btn-${sound.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="relative z-10 flex cursor-pointer items-center justify-center rounded-full transition-colors duration-200 outline-none"
            style={{
              width: `${SIZE}px`,
              height: `${SIZE}px`
            }}
            title={sound.title}
          >
            <div
              className="flex origin-center items-center justify-center rounded-full bg-red-400/90 text-white transition-all duration-300"
              style={{
                width: `${SIZE - 18}px`,
                height: `${SIZE - 18}px`
              }}
            >
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-150',
                  isPlaying
                    ? 'pointer-events-none scale-60 opacity-0'
                    : 'scale-100 opacity-100'
                )}
                aria-hidden={isPlaying}
              >
                <PlayIcon />
              </span>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-150',
                  isPlaying
                    ? 'scale-100 opacity-100'
                    : 'pointer-events-none scale-60 opacity-0'
                )}
                aria-hidden={!isPlaying}
              >
                <PauseIcon />
              </span>
            </div>
          </button>
        </div>

        <HoverCard sound={sound} />
      </div>
    </div>,
    portalContainer
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
