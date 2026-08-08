'use client'

import { cn } from '@shared/utils/cn'
import { VolumeControl } from '@shared/ui/VolumeControl'
import {
  AUDIO_STATUS,
  useAudioStore,
  type AudioEngineState,
  type AudioStatus,
  type BufferedRange
} from '@shared/lib/audio-engine'

import type { SoundPiece } from '../domain/types'

export interface AudioBottomPlayerProps {
  soundPiece?: SoundPiece | null
  enabled?: boolean
}

const ACTIVE_STATUSES = new Set<AudioStatus>([
  AUDIO_STATUS.LOADING,
  AUDIO_STATUS.READY,
  AUDIO_STATUS.PLAYING,
  AUDIO_STATUS.BUFFERING,
  AUDIO_STATUS.PAUSED
])

// Primitive selectors — Object.is comparison works natively, no useShallow needed.

function selectIsPieceMode(state: AudioEngineState): boolean {
  return state.activePieceId !== null && ACTIVE_STATUSES.has(state.piece.status)
}

function selectIsPiecePlaying(state: AudioEngineState): boolean {
  return state.piece.status === AUDIO_STATUS.PLAYING
}

export function AudioBottomPlayer({ soundPiece, enabled = true }: AudioBottomPlayerProps) {
  const isPieceMode = useAudioStore(selectIsPieceMode)
  const isPiecePlaying = useAudioStore(selectIsPiecePlaying)
  const pieceCurrentTime = useAudioStore((s) => s.piece.currentTime)
  const pieceDuration = useAudioStore((s) => s.piece.duration)
  const pieceStatus = useAudioStore((s) => s.piece.status)
  const pieceBuffered = useAudioStore((s) => s.piece.buffered)
  const volume = useAudioStore((s) => s.volume)
  const muted = useAudioStore((s) => s.muted)

  const playPiece = useAudioStore((s) => s.playPiece)
  const pausePiece = useAudioStore((s) => s.pausePiece)
  const resumePiece = useAudioStore((s) => s.resumePiece)
  const seekPiece = useAudioStore((s) => s.seekPiece)
  const setVolume = useAudioStore((s) => s.setVolume)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  if (!enabled) {
    return null
  }

  const isIdle = !isPieceMode

  const playedPercentage = toPercentage(pieceCurrentTime, pieceDuration)
  const bufferGeometry = getBufferGeometry(pieceCurrentTime, pieceDuration, pieceBuffered)
  const isTransient = pieceStatus === AUDIO_STATUS.LOADING || pieceStatus === AUDIO_STATUS.BUFFERING

  const handlePlayPause = () => {
    if (isIdle && soundPiece?.audioSources) {
      playPiece(soundPiece.id, soundPiece.mapId)
      return
    }

    if (isPiecePlaying) {
      pausePiece()
    } else {
      resumePiece()
    }
  }

  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (pieceDuration <= 0) return
    const time = (Number(event.target.value) / 100) * pieceDuration
    seekPiece(time)
  }

  const handleVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Math.min(1, Math.max(0, Number(event.target.value) / 100)))
  }

  const title = soundPiece?.title ?? 'Obra sonora'
  const subtitle = soundPiece?.author ?? ''

  return (
    <div
      className={cn(
        'w-full animate-slide-up rounded-3xl shadow-lg',
        'max-w-2xl border border-charcoal bg-primary-teal text-white shadow-2xl'
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
            'size-10 bg-white text-primary-teal transition-transform',
            'hover:scale-105 active:scale-95',
            'focus:ring-2 focus:ring-white/50 focus:outline-none'
          )}
          aria-label={
            pieceStatus === AUDIO_STATUS.LOADING
              ? 'Cargando audio'
              : pieceStatus === AUDIO_STATUS.BUFFERING
                ? 'Recuperando audio'
                : isPiecePlaying
                  ? 'Pausar'
                  : 'Reproducir'
          }
          data-testid="bottom-play-pause"
          data-status={pieceStatus}
        >
          {isTransient ? <LoadingSpinner status={pieceStatus} /> : isPiecePlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="min-w-0 shrink-0 flex-col">
          <span className="block max-w-35 truncate text-sm font-semibold md:max-w-50 md:text-base">{title}</span>
          {subtitle && <span className="block max-w-35 truncate text-xs text-white/70 md:max-w-50">{subtitle}</span>}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Scrubber
            playedPercentage={playedPercentage}
            bufferGeometry={bufferGeometry}
            disabled={isIdle}
            onChange={handleScrub}
          />
          <TimeDisplay currentTime={pieceCurrentTime} duration={pieceDuration} />
        </div>

        <WaveVisualizer active={isPiecePlaying} />

        <VolumeControl volume={volume} muted={muted} onToggleMute={toggleMute} onVolumeChange={handleVolume} />
      </div>
    </div>
  )
}

interface ScrubberProps {
  playedPercentage: number
  bufferGeometry: BufferGeometry
  disabled: boolean
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

interface BufferGeometry {
  start: number
  width: number
}

function Scrubber({ playedPercentage, bufferGeometry, disabled, onChange }: ScrubberProps) {
  return (
    <div className="relative h-1.5 w-full" data-testid="bottom-scrubber-track">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-white/20"
        data-testid="bottom-scrubber-base"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 rounded-full bg-white/40"
        data-testid="bottom-scrubber-buffered"
        data-buffer-start={bufferGeometry.start}
        data-buffer-width={bufferGeometry.width}
        style={{ left: `${bufferGeometry.start}%`, width: `${bufferGeometry.width}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-secondary-sand"
        data-testid="bottom-scrubber-played"
        data-played-percentage={playedPercentage}
        style={{ width: `${playedPercentage}%` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={Math.round(playedPercentage * 10) / 10}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'relative z-10 h-1.5 w-full cursor-pointer appearance-none rounded-full',
          'bg-transparent accent-secondary-sand',
          disabled && 'cursor-default opacity-60'
        )}
        aria-label="Progreso de reproducción"
        data-testid="bottom-scrubber"
      />
    </div>
  )
}

function toPercentage(value: number, duration: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) return 0
  return Math.min(100, Math.max(0, (value / duration) * 100))
}

function getBufferGeometry(currentTime: number, duration: number, ranges: BufferedRange[]): BufferGeometry {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return { start: 0, width: 0 }
  }

  const containingRange = ranges.find(
    (range) =>
      Number.isFinite(range.start) &&
      Number.isFinite(range.end) &&
      range.start <= currentTime &&
      currentTime <= range.end
  )
  if (!containingRange) return { start: 0, width: 0 }

  const start = toPercentage(currentTime, duration)
  const end = toPercentage(containingRange.end, duration)
  return { start, width: Math.max(0, end - start) }
}

interface TimeDisplayProps {
  currentTime: number
  duration: number
}

function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  return (
    <span className="self-end text-xs text-white/80 tabular-nums" data-testid="bottom-time">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  )
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

interface WaveVisualizerProps {
  active: boolean
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
          className={cn('w-1 origin-bottom rounded-full bg-secondary-sand', 'h-4 animate-soundwave')}
          style={{
            animationDelay: `${index * 100}ms`,
            animationPlayState: active ? 'running' : 'paused'
          }}
        />
      ))}
    </div>
  )
}

function LoadingSpinner({ status }: { status: AudioStatus }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 animate-spin"
      data-status={status}
      data-testid="bottom-spinner"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" fill="none" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}
