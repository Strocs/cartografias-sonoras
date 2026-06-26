'use client';

import L from 'leaflet';

import { cn } from '@shared/utils/cn';
import { useMap } from '@shared/lib/viewport/MapContext';

export interface MapControlsProps {
  bounds?: L.LatLngBoundsExpression;
  className?: string;
}

export function MapControls({ bounds, className }: MapControlsProps) {
  const { map } = useMap();

  return (
    <div
      className={cn(
        'absolute top-4 right-4 z-[1000] flex flex-col gap-2',
        className
      )}
      data-testid="map-controls"
    >
      <ControlButton
        onClick={() => map?.zoomIn()}
        label="Acercar mapa"
        data-testid="zoom-in"
      >
        <PlusIcon />
      </ControlButton>
      <ControlButton
        onClick={() => map?.zoomOut()}
        label="Alejar mapa"
        data-testid="zoom-out"
      >
        <MinusIcon />
      </ControlButton>
      <ControlButton
        onClick={() => (bounds !== undefined ? map?.fitBounds(bounds) : undefined)}
        label="Centrar mapa"
        data-testid="center-map"
      >
        <CenterIcon />
      </ControlButton>
    </div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

function ControlButton({
  onClick,
  label,
  children,
  'data-testid': testId,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex size-10 items-center justify-center rounded-full',
        'bg-white text-charcoal shadow-md transition-all',
        'hover:scale-105 hover:shadow-lg',
        'focus:ring-2 focus:ring-charcoal/30 focus:outline-none',
        'active:scale-95'
      )}
      aria-label={label}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function CenterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}
