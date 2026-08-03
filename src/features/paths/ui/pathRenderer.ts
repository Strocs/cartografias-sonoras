import { buildPolylineD } from '../lib/pathEngine';

import type { PathVisualState } from '../domain/PathVisualState';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PULSE_DURATION = '1.5s';
const PULSE_RADIUS = '4';
const PATH_CLASS_BASE = 'path-base';

/** Maps a PathVisualState variant to the legacy CSS class used by PathOverlay. */
const VARIANT_LEGACY_CLASS: Record<PathVisualState['variant'], string> = {
  idle: 'path-idle',
  single: 'path-single',
  both: 'path-both'
};

/** Maps a PathVisualState variant to the BEM-style CSS class used by pathRenderer. */
const VARIANT_BEM_CLASS: Record<PathVisualState['variant'], string> = {
  idle: 'path--idle',
  single: 'path--single',
  both: 'path--both'
};

/**
 * Renders or updates SVG `<path>` elements for the supplied visual states.
 *
 * Existing path elements are reused (identified by `data-path-id`) so geometry
 * is only computed once per path model. Pulse animations are recreated when the
 * variant changes because their `<animateMotion>` nodes reference the path.
 */
export function renderPaths(
  pathStates: PathVisualState[],
  svgElement: SVGSVGElement,
  imgWidth: number,
  imgHeight: number
): void {
  const existingPaths = new Map<number, SVGPathElement>();
  for (const pathEl of svgElement.querySelectorAll('path[data-path-id]')) {
    const id = Number(pathEl.getAttribute('data-path-id'));
    if (!Number.isNaN(id)) {
      existingPaths.set(id, pathEl as SVGPathElement);
    }
  }

  // Remove all pulse groups before re-rendering; they are cheap to recreate and
  // this avoids stale animations when a path changes variant.
  for (const pulse of svgElement.querySelectorAll('.path-pulse')) {
    pulse.remove();
  }

  const activeIds = new Set<number>();

  for (const state of pathStates) {
    if (state.points.length < 2) continue;

    activeIds.add(state.pathId);

    const d = buildPolylineD(state.points, imgWidth, imgHeight);
    if (d === '') continue;

    const pathEl = existingPaths.get(state.pathId) ?? createPathElement();
    if (pathEl.parentNode !== svgElement) {
      svgElement.appendChild(pathEl);
    }

    const legacyClass = VARIANT_LEGACY_CLASS[state.variant];
    const bemClass = VARIANT_BEM_CLASS[state.variant];
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('data-path-id', String(state.pathId));
    pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
    pathEl.setAttribute('class', `${PATH_CLASS_BASE} ${legacyClass} ${bemClass}`);

    // Remove inline overrides so CSS classes take effect, then re-apply any
    // explicit style config if present.
    pathEl.removeAttribute('stroke');
    pathEl.removeAttribute('stroke-opacity');
    pathEl.removeAttribute('stroke-width');
    pathEl.removeAttribute('fill');

    if (state.style !== undefined) {
      applyPathStyle(pathEl, state.style);
    }

    if (state.variant === 'single') {
      createPulseGroup(svgElement, state.pathId, state.activeEndpoint, state.style);
    }
  }

  // Drop paths that are no longer present in the visual state list.
  for (const [id, pathEl] of existingPaths) {
    if (!activeIds.has(id)) {
      pathEl.remove();
    }
  }
}

/** Removes every path and pulse element from the SVG layer. */
export function clearPaths(svgElement: SVGSVGElement): void {
  for (const pathEl of svgElement.querySelectorAll('path[data-path-id]')) {
    pathEl.remove();
  }
  for (const pulse of svgElement.querySelectorAll('.path-pulse')) {
    pulse.remove();
  }
}

function createPathElement(): SVGPathElement {
  return document.createElementNS(SVG_NS, 'path');
}

function applyPathStyle(
  pathEl: SVGPathElement,
  style: NonNullable<PathVisualState['style']>
): void {
  if (style.strokeColor !== undefined) {
    pathEl.setAttribute('stroke', style.strokeColor);
  }
  if (style.strokeWidth !== undefined) {
    pathEl.setAttribute('stroke-width', String(style.strokeWidth));
  }
  if (style.dashArray !== undefined) {
    pathEl.setAttribute('stroke-dasharray', style.dashArray);
  }
}

function createPulseGroup(
  svgElement: SVGSVGElement,
  pathId: number,
  activeEndpoint: 'start' | 'end',
  style?: PathVisualState['style']
): void {
  const routeId = `path-${pathId}`;

  const pulseGroup = document.createElementNS(SVG_NS, 'g');
  pulseGroup.setAttribute('class', 'path-pulse');

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('r', PULSE_RADIUS);

  if (style?.strokeColor !== undefined) {
    circle.setAttribute('fill', style.strokeColor);
  }

  const animateMotion = document.createElementNS(SVG_NS, 'animateMotion');
  animateMotion.setAttribute('dur', PULSE_DURATION);
  animateMotion.setAttribute('repeatCount', 'indefinite');

  if (activeEndpoint === 'end') {
    animateMotion.setAttribute('keyPoints', '1;0');
    animateMotion.setAttribute('keyTimes', '0;1');
    animateMotion.setAttribute('calcMode', 'linear');
  }

  const mpath = document.createElementNS(SVG_NS, 'mpath');
  mpath.setAttribute('href', `#${routeId}`);

  animateMotion.appendChild(mpath);
  circle.appendChild(animateMotion);
  pulseGroup.appendChild(circle);

  svgElement.appendChild(pulseGroup);
}
