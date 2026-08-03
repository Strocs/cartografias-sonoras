'use client';

import { cn } from '@shared/utils/cn';
import type { MapViewElement } from './map-view';

export interface MapControlsProps {
  /** Optional id of the `<map-view>` element to control. Falls back to the first `<map-view>` on the page. */
  mapViewId?: string;
  className?: string;
}

export function MapControls({ mapViewId, className }: MapControlsProps) {
  const getMapView = (): MapViewElement | null => {
    if (typeof document === 'undefined') return null;
    const selector = mapViewId ? `map-view#${CSS.escape(mapViewId)}` : 'map-view';
    return document.querySelector(selector) as MapViewElement | null;
  };

  return (
    <div
      className={cn(
        'absolute top-4 right-4 z-[1000] flex flex-col gap-2',
        className
      )}
      data-testid="map-controls"
    >
      <ControlButton
        onClick={() => getMapView()?.zoomIn()}
        label="Acercar mapa"
        data-testid="zoom-in"
      >
        <PlusIcon />
      </ControlButton>
      <ControlButton
        onClick={() => getMapView()?.zoomOut()}
        label="Alejar mapa"
        data-testid="zoom-out"
      >
        <MinusIcon />
      </ControlButton>
      <ControlButton
        onClick={() => getMapView()?.resetView()}
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
  'data-testid': testId
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex size-10 cursor-pointer items-center justify-center rounded-full border border-secondary-sand/60',
        'bg-canvas text-charcoal shadow-md transition-all',
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
