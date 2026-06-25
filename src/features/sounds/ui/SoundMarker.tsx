'use client';

import L from 'leaflet';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';

import { cn } from '@shared/utils/cn';
import {
  AUDIO_STATUS,
  useAudioStore,
  type AudioEngineState,
  type AudioStatus,
} from '@shared/lib/audio-engine';
import { useMap } from '@shared/lib/viewport/MapContext';
import { useMountEffect } from '@shared/hooks/useMountEffect';

import type { Sound } from '../domain/types';
import { HoverCard } from './HoverCard';

export interface SoundMarkerProps {
  sound: Sound;
  location?: string;
}

const MARKER_SIZE = 56;
const IDLE_SIZE = 40;
const PLAYING_SIZE = 56;
const RING_RADIUS = 24;
const RING_STROKE = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SoundSlice {
  status: AudioStatus;
  currentTime: number;
  duration: number;
}

function selectSoundSlice(
  state: AudioEngineState,
  soundId: number
): SoundSlice {
  const sound = state.activeSounds.get(soundId);
  return {
    status: sound?.status ?? AUDIO_STATUS.IDLE,
    currentTime: sound?.currentTime ?? 0,
    duration: sound?.duration ?? 0,
  };
}

const markerVariants = {
  idle: { width: IDLE_SIZE, height: IDLE_SIZE },
  active: { width: PLAYING_SIZE, height: PLAYING_SIZE },
};

const haloVariants = {
  idle: { opacity: 0, scale: 0.8 },
  active: { opacity: 1, scale: 1 },
};

export function SoundMarker({ sound, location }: SoundMarkerProps) {
  const { map } = useMap();
  const [portalContainer, setPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { status, currentTime, duration } = useAudioStore(
    useShallow((state) => selectSoundSlice(state, sound.id))
  );
  const activePieceId = useAudioStore((state) => state.activePieceId);
  const playSound = useAudioStore((state) => state.playSound);
  const pauseSound = useAudioStore((state) => state.pauseSound);

  useMountEffect(() => {
    if (map === null) {
      return;
    }

    const container = document.createElement('div');
    container.style.width = `${MARKER_SIZE}px`;
    container.style.height = `${MARKER_SIZE}px`;

    const icon = L.divIcon({
      html: container,
      className: '',
      iconSize: [MARKER_SIZE, MARKER_SIZE],
      iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    });

    const marker = L.marker([sound.position.y, sound.position.x], {
      icon,
      keyboard: false,
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

  const isPiecePlaying = activePieceId !== null;
  const isPlaying =
    status === AUDIO_STATUS.PLAYING || status === AUDIO_STATUS.LOADING;
  const isPaused = status === AUDIO_STATUS.PAUSED;
  const isActive = isPlaying || isPaused;

  const progress = duration > 0 ? currentTime / duration : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  function handleClick() {
    if (isPiecePlaying) {
      return;
    }

    if (isPlaying) {
      pauseSound(sound.id);
    } else {
      playSound(sound.id, sound.mapId);
    }
  }

  const ariaLabel = isPiecePlaying
    ? 'Reproducción bloqueada por modo obra'
    : isPlaying
      ? 'Pausar sonido'
      : 'Reproducir sonido';

  return createPortal(
    <motion.button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isPiecePlaying}
      animate={isActive ? 'active' : 'idle'}
      variants={markerVariants}
      initial={false}
      whileTap={isPiecePlaying ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'absolute top-1/2 left-1/2 -translate-1/2',
        'flex items-center justify-center rounded-full border-0',
        'bg-charcoal text-white shadow-lg',
        'focus:ring-2 focus:ring-white/50 focus:outline-none',
        isActive ? 'shadow-white/30' : 'hover:shadow-white/20',
        isPiecePlaying && 'cursor-not-allowed opacity-50'
      )}
      aria-label={ariaLabel}
      data-testid="sound-marker"
      data-sound-id={sound.id}
      data-status={isPlaying ? 'playing' : isPaused ? 'paused' : 'idle'}
      data-disabled={isPiecePlaying ? 'true' : 'false'}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full"
        variants={haloVariants}
        initial={false}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.25)',
        }}
        aria-hidden="true"
      />

      {isActive && (
        <svg
          className="pointer-events-none absolute inset-0 -rotate-90"
          width={PLAYING_SIZE}
          height={PLAYING_SIZE}
          viewBox={`0 0 ${PLAYING_SIZE} ${PLAYING_SIZE}`}
          aria-hidden="true"
          data-testid="progress-ring"
        >
          <circle
            cx={PLAYING_SIZE / 2}
            cy={PLAYING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            className="transition-all duration-100 ease-linear"
          />
        </svg>
      )}

      <span className="relative z-10 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isPlaying ? (
            <motion.span
              key="pause"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
            >
              <PauseIcon />
            </motion.span>
          ) : (
            <motion.span
              key="play"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
            >
              <PlayIcon />
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {isHovered && <HoverCard sound={sound} location={location} />}
    </motion.button>,
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
