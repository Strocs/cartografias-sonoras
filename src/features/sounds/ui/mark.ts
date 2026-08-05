import { relativeToPixel } from '@shared/lib/coordinates';

import type { Mark } from '../domain/types';
import { computeFanSlots } from './fanGeometry';
import { createPlayIcon } from './icons';

const MARK_CLASS = 'sound-mark';
const CIRCLE_CLASS = 'sound-mark__circle';
const FAN_CLASS = 'sound-mark__fan';

/**
 * Creates a Mark as an accessible group container.
 *
 * The group is positioned with a single transform:
 *   translate(xpx, ypx) translate(-50%, -50%) scale(f)
 * where the pixel translation is derived from `mark.position` (0–100 % of the
 * image) via `relativeToPixel`. Children (circle, fan, tooltip) live at
 * group-local offsets so a single `scaleFactor` keeps sound buttons at a
 * constant screen size (design D5).
 *
 * DOM contract:
 * - group: `.sound-mark`, data-testid="sound-mark", data-mark-id, data-map-id,
 *   data-state (idle | active)
 * - circle: `.sound-mark__circle` `<button>` — aria-label=mark.title,
 *   aria-expanded, aria-controls=fan-{id}; bubbles `mark:activate`
 *   {markId, mapId} on click/Enter/Space (keyboard handled by bindings too)
 * - fan: `.sound-mark__fan` role=group, id=fan-{id}, aria-hidden, one
 *   `.sound-mark__fan-item` per sound at group-local dx/dy offsets
 * - tooltip: `.sound-mark__tooltip` role=tooltip at top: calc(100% + 12px)
 */
export function createMark(
  mark: Mark,
  imgWidth: number,
  imgHeight: number,
  scaleFactor = 1
): HTMLDivElement {
  const pixel = relativeToPixel(mark.position, imgWidth, imgHeight);

  const group = document.createElement('div');
  group.className = MARK_CLASS;
  group.setAttribute('data-testid', 'sound-mark');
  group.setAttribute('data-mark-id', String(mark.id));
  group.setAttribute('data-map-id', String(mark.mapId));
  group.setAttribute('data-state', 'idle');
  group.style.setProperty('--mark-x', String(pixel.x));
  group.style.setProperty('--mark-y', String(pixel.y));
  applyTransform(group, pixel.x, pixel.y, scaleFactor);

  const circle = document.createElement('button');
  circle.type = 'button';
  circle.className = CIRCLE_CLASS;
  circle.setAttribute('aria-label', mark.title);
  circle.setAttribute('aria-expanded', 'false');
  circle.setAttribute('aria-controls', `fan-${mark.id}`);
  circle.appendChild(createIconSpan(createPlayIcon()));
  group.appendChild(circle);

  const fan = document.createElement('div');
  fan.className = FAN_CLASS;
  fan.setAttribute('role', 'group');
  fan.id = `fan-${mark.id}`;
  fan.setAttribute('aria-hidden', 'true');
  group.appendChild(fan);

  const tooltip = document.createElement('div');
  tooltip.className = 'sound-mark__tooltip';
  tooltip.setAttribute('role', 'tooltip');

  const tooltipTitle = document.createElement('p');
  tooltipTitle.className = 'sound-mark__tooltip-title';
  tooltipTitle.textContent = mark.title;
  tooltip.appendChild(tooltipTitle);

  if (mark.location) {
    const tooltipLocation = document.createElement('p');
    tooltipLocation.className = 'sound-mark__tooltip-location';
    tooltipLocation.textContent = mark.location;
    tooltip.appendChild(tooltipLocation);
  }

  if (mark.description) {
    const tooltipDescription = document.createElement('p');
    tooltipDescription.className = 'sound-mark__tooltip-description';
    tooltipDescription.textContent = mark.description;
    tooltip.appendChild(tooltipDescription);
  }

  group.appendChild(tooltip);

  const activate = () => {
    group.dispatchEvent(
      new CustomEvent('mark:activate', {
        bubbles: true,
        detail: { markId: mark.id, mapId: mark.mapId }
      })
    );
  };

  circle.addEventListener('click', activate);
  circle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });

  // Pre-create the fan slot items; bindings inject the sound buttons so the
  // button factory stays owned by soundButton.ts.
  const slots = computeFanSlots(mark.sounds.length);
  mark.sounds.forEach((_sound, index) => {
    const item = document.createElement('div');
    item.className = 'sound-mark__fan-item';
    item.style.transform = `translate(${slots[index].dx}px, ${slots[index].dy}px)`;
    fan.appendChild(item);
  });

  return group;
}

/**
 * Inserts a sound button into the fan slot at `slotIndex` (0-based, matching
 * the order of `mark.sounds` and of `computeFanSlots`).
 */
export function insertFanButton(
  fan: HTMLDivElement,
  slotIndex: number,
  button: HTMLButtonElement
): void {
  const item = fan.children[slotIndex] as HTMLDivElement | undefined;
  if (item === undefined) return;
  item.appendChild(button);
}

/**
 * Updates an existing Mark group.
 *
 * `scaleFactor` is applied once to the whole group (per-sound compensation is
 * removed) and `active` drives the `data-state` accent used by CSS.
 */
export function updateMark(
  group: HTMLDivElement,
  state: { scaleFactor?: number; active?: boolean }
): void {
  if (state.active !== undefined) {
    group.setAttribute('data-state', state.active ? 'active' : 'idle');
  }
  if (state.scaleFactor !== undefined) {
    const x = Number.parseFloat(group.style.getPropertyValue('--mark-x'));
    const y = Number.parseFloat(group.style.getPropertyValue('--mark-y'));
    applyTransform(group, x, y, state.scaleFactor);
  }
}

/**
 * Mirrors fan open/closed state into the a11y surface: `aria-expanded` on the
 * circle and `data-open` on the group (CSS shows the fan via `[data-open]`).
 */
export function setFanOpen(group: HTMLDivElement, open: boolean): void {
  const circle = group.querySelector<HTMLButtonElement>(`.${CIRCLE_CLASS}`);
  circle?.setAttribute('aria-expanded', String(open));
  if (open) {
    group.setAttribute('data-open', 'true');
  } else {
    group.removeAttribute('data-open');
  }
}

/** Removes a Mark group from the DOM. */
export function removeMark(group: HTMLDivElement): void {
  group.remove();
}

function applyTransform(
  group: HTMLDivElement,
  x: number,
  y: number,
  scaleFactor: number
): void {
  group.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scaleFactor})`;
}

function createIconSpan(svg: SVGSVGElement): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'sound-mark__icon sound-mark__icon--play';
  span.setAttribute('aria-hidden', 'true');
  span.appendChild(svg);
  return span;
}