import Panzoom from '@panzoom/panzoom';
import type { PanzoomObject, PanzoomGlobalOptions } from '@panzoom/panzoom';

export interface PanzoomInstance {
  panzoom: PanzoomObject;
  destroy: () => void;
}

export interface InitPanzoomOptions {
  minScale?: number;
  maxScale?: number;
  step?: number;
  startScale?: number;
  startX?: number;
  startY?: number;
}

const DEFAULT_MIN_SCALE = 0.5;
const DEFAULT_MAX_SCALE = 4;
const DEFAULT_STEP = 0.3;

/**
 * Initializes a Panzoom instance on the given container.
 *
 * The container is the transformable element that wraps the map image and
 * overlays. Wheel zoom is bound to the container's parent so the cursor
 * position is used as the focal point.
 */
export function initPanzoom(
  container: HTMLElement,
  _imgElement: HTMLImageElement,
  options: InitPanzoomOptions = {}
): PanzoomInstance {
  const parent = container.parentElement;
  if (parent === null) {
    throw new Error('Panzoom container must have a parent element');
  }

  const startScale = options.startScale ?? 1;
  const minScale = Math.min(
    startScale,
    options.minScale ?? DEFAULT_MIN_SCALE
  );

  const panzoomOptions: PanzoomGlobalOptions = {
    contain: 'outside',
    cursor: 'grab',
    disablePan: false,
    disableZoom: false,
    minScale,
    maxScale: options.maxScale ?? DEFAULT_MAX_SCALE,
    step: options.step ?? DEFAULT_STEP,
    startScale,
    startX: options.startX ?? 0,
    startY: options.startY ?? 0,
  };

  const panzoom = Panzoom(container, panzoomOptions);

  const wheelHandler = (event: WheelEvent) => {
    panzoom.zoomWithWheel(event);
  };

  parent.addEventListener('wheel', wheelHandler);

  const destroy = () => {
    parent.removeEventListener('wheel', wheelHandler);
    panzoom.destroy();
  };

  return { panzoom, destroy };
}
