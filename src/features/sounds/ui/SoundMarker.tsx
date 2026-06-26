'use client';

import L from 'leaflet';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@shared/utils/cn';
import { useAudioStore } from '@shared/lib/audio-engine';
import { useMap } from '@shared/lib/viewport/MapContext';
import { useMountEffect } from '@shared/hooks/useMountEffect';

import type { Sound } from '../domain/types';
import { HoverCard } from './HoverCard';

export interface SoundMarkerProps {
  sound: Sound;
  location?: string;
}

const MARKER_SIZE = 56;
const ICON_SIZE = 48;
const PLAYING_SIZE = 56;
const RING_RADIUS = 24;
const RING_STROKE = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function SoundMarker({ sound, location }: SoundMarkerProps) {
  const { map } = useMap();
  const [portalContainer, setPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const soundState = useAudioStore((state) =>
    state.activeSounds.get(sound.id)
  );
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

  const status = soundState?.status ?? 'idle';
  const isPlaying = status === 'playing' || status === 'loading';
  const isPaused = status === 'paused';
  const isActive = isPlaying || isPaused;

  const progress =
    soundState && soundState.duration > 0
      ? soundState.currentTime / soundState.duration
      : 0;

  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  function handleClick() {
    if (isPlaying) {
      pauseSound(sound.id);
    } else {
      playSound(sound.id, sound.mapId);
    }
  }

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'absolute top-1/2 left-1/2 -translate-1/2',
        'flex items-center justify-center rounded-full border-0',
        'bg-charcoal text-white shadow-lg transition-all duration-200',
        'focus:ring-2 focus:ring-white/50 focus:outline-none',
        isActive
          ? 'size-14 shadow-white/30'
          : 'size-12 hover:shadow-white/20'
      )}
      style={{
        width: isActive ? PLAYING_SIZE : ICON_SIZE,
        height: isActive ? PLAYING_SIZE : ICON_SIZE,
      }}
      aria-label={isPlaying ? 'Pausar sonido' : 'Reproducir sonido'}
      data-testid="sound-marker"
      data-sound-id={sound.id}
      data-status={isPlaying ? 'playing' : isPaused ? 'paused' : 'idle'}
    >
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
        {isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </span>

      {isHovered && <HoverCard sound={sound} location={location} />}
    </button>,
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
