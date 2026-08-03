export const VIEWPORT_PHASE = {
  INITIALIZING: 'initializing',
  IDLE: 'idle',
  DRAGGING: 'dragging',
  PINCHING: 'pinching',
  ANIMATING: 'animating',
  DESTROYED: 'destroyed',
} as const;

export type ViewportPhase = (typeof VIEWPORT_PHASE)[keyof typeof VIEWPORT_PHASE];

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface ViewportSnapshot extends ViewportState {
  phase: ViewportPhase;
  ready: boolean;
  revision: number;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ViewportConfig {
  content: ViewportSize;
  minScale: number;
  maxScale: number;
  zoomStep?: number;
  reducedMotion?: boolean;
}

export interface ViewportEventDetail {
  state: ViewportSnapshot;
  reason: string;
}

export type ViewportSubscriber = (snapshot: ViewportSnapshot) => void;
