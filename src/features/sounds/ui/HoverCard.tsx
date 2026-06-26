import type { Sound } from '../domain/types';

export interface HoverCardProps {
  sound: Sound;
  duration?: string;
  location?: string;
}

export function HoverCard({
  sound,
  duration = '0:30',
  location,
}: HoverCardProps) {
  return (
    <div
      className="absolute top-full left-1/2 z-50 mt-3 w-72 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lg transition-opacity duration-200"
      data-testid="hover-card"
    >
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="border-8 border-transparent border-b-white" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-charcoal">{sound.title}</h3>
        <span className="shrink-0 text-xs text-gray-500">{duration}</span>
      </div>

      {location && (
        <div className="mt-1 flex items-center gap-1 text-xs text-secondary-sand">
          <span aria-hidden="true">📍</span>
          <span>{location}</span>
        </div>
      )}

      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-700">
        {sound.description}
      </p>
    </div>
  );
}
