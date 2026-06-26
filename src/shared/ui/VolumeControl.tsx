'use client';

/**
 * Global volume control — owned by the audio engine domain.
 * Rendered inside the bottom player for UI composition only,
 * NOT coupled to the sound-pieces feature domain.
 */
export interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function VolumeControl({
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
