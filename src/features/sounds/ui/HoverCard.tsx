import type { Sound } from '../domain/types';

export interface HoverCardProps {
  sound: Sound;
  duration?: string;
}

export function HoverCard({ sound, duration = '1:42' }: HoverCardProps) {
  return (
    <div
      className="bg-canvas border-secondary-sand/60 absolute top-full z-100 mt-3 hidden w-42 rounded-2xl border px-4 py-3 opacity-0 shadow-lg transition-all duration-200 group-hover:block group-hover:opacity-100"
      data-testid="hover-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-primary-brown text-sm font-bold">{sound.title}</h3>
        <span className="shrink-0 font-mono text-xs text-gray-500">
          {duration}
        </span>
      </div>

      {sound.location && (
        <div className="text-primary-brown/60 flex items-center gap-1 font-mono text-xs">
          <span>{sound.location}</span>
        </div>
      )}

      <p className="text-charcoal/80 mt-2 text-xs">{sound.description}</p>
    </div>
  );
}
