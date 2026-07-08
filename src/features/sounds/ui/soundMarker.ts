import { relativeToPixel } from '@shared/lib/coordinates';

import type { Sound } from '../domain/types';

export interface SoundMarkerState {
  status: 'idle' | 'playing' | 'paused';
  progress: number;
  scaleFactor: number;
}

const MARKER_CLASS = 'sound-marker';
const SELECTED_CLASS = 'sound-marker--selected';
const TOOLTIP_CLASS = 'sound-marker__tooltip';
const PLAY_ICON_CLASS = 'sound-marker__icon--play';
const PAUSE_ICON_CLASS = 'sound-marker__icon--pause';
const DEFAULT_DURATION_LABEL = '1:42';
const SIZE = 54;

/**
 * Creates an accessible, vanilla DOM marker for a sound.
 *
 * The marker is a native `<button>` positioned with `transform: translate(...)`
 * and scale-compensated with `scale(...)`. It dispatches a bubbling
 * `marker:activate` CustomEvent on click, tap, or Enter key press.
 *
 * Note on signature: the implementation receives the image dimensions so it can
 * convert the sound's percentage-based position to pixels via `relativeToPixel`.
 */
export function createSoundMarker(
  sound: Sound,
  imgWidth: number,
  imgHeight: number,
  scaleFactor = 1
): HTMLButtonElement {
  const pixel = relativeToPixel(sound.position, imgWidth, imgHeight);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = MARKER_CLASS;
  button.setAttribute('aria-label', sound.title);
  button.setAttribute('data-sound-id', String(sound.id));
  button.setAttribute('data-map-id', String(sound.mapId));
  button.setAttribute('data-state', 'idle');
  button.style.setProperty('--progress', '0%');
  button.style.width = `${SIZE}px`;
  button.style.height = `${SIZE}px`;

  applyTransform(button, pixel.x, pixel.y, scaleFactor);

  // Inner content: play/pause icons + vanilla tooltip.
  button.appendChild(createIconSpan(PLAY_ICON_CLASS, createPlayIcon()));
  button.appendChild(createIconSpan(PAUSE_ICON_CLASS, createPauseIcon()));
  button.appendChild(createTooltip(sound));

  const activate = (event?: Event) => {
    event?.stopPropagation();
    button.dispatchEvent(
      new CustomEvent('marker:activate', {
        bubbles: true,
        detail: { soundId: sound.id, mapId: sound.mapId }
      })
    );
  };

  button.addEventListener('click', activate);
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(event);
    }
  });

  return button;
}

/**
 * Updates the visual state of an existing marker.
 *
 * `progress` is expected in the 0–100 range and drives the CSS conic-gradient
 * ring via the `--progress` custom property.
 */
export function updateSoundMarker(
  button: HTMLButtonElement,
  state: Partial<SoundMarkerState>
): void {
  if (state.status !== undefined) {
    button.setAttribute('data-state', state.status);
    button.classList.toggle(SELECTED_CLASS, state.status !== 'idle');
  }

  if (state.progress !== undefined) {
    button.style.setProperty('--progress', `${state.progress}%`);
  }

  if (state.scaleFactor !== undefined) {
    const x = Number.parseFloat(button.style.getPropertyValue('--marker-x'));
    const y = Number.parseFloat(button.style.getPropertyValue('--marker-y'));
    applyTransform(button, x, y, state.scaleFactor);
  }
}

/** Removes a marker from the DOM and cleans up its listeners. */
export function removeSoundMarker(button: HTMLButtonElement): void {
  button.remove();
}

function applyTransform(
  button: HTMLButtonElement,
  x: number,
  y: number,
  scaleFactor: number
): void {
  button.style.setProperty('--marker-x', String(x));
  button.style.setProperty('--marker-y', String(y));
  button.style.transform = `translate(${x}px, ${y}px) scale(${scaleFactor})`;
}

function createIconSpan(className: string, svg: SVGSVGElement): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = `sound-marker__icon ${className}`;
  span.setAttribute('aria-hidden', 'true');
  span.appendChild(svg);
  return span;
}

function createTooltip(sound: Sound): HTMLDivElement {
  const tooltip = document.createElement('div');
  tooltip.className = TOOLTIP_CLASS;
  tooltip.setAttribute('role', 'tooltip');

  const header = document.createElement('div');
  header.className = 'sound-marker__tooltip-header';

  const title = document.createElement('h3');
  title.className = 'sound-marker__tooltip-title';
  title.textContent = sound.title;

  const duration = document.createElement('span');
  duration.className = 'sound-marker__tooltip-duration';
  duration.textContent = DEFAULT_DURATION_LABEL;

  header.appendChild(title);
  header.appendChild(duration);
  tooltip.appendChild(header);

  if (sound.location) {
    const location = document.createElement('div');
    location.className = 'sound-marker__tooltip-location';
    location.textContent = sound.location;
    tooltip.appendChild(location);
  }

  const description = document.createElement('p');
  description.className = 'sound-marker__tooltip-description';
  description.textContent = sound.description;
  tooltip.appendChild(description);

  return tooltip;
}

function createPlayIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M8 5v14l11-7z');
  svg.appendChild(path);

  return svg;
}

function createPauseIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
  svg.appendChild(path);

  return svg;
}
