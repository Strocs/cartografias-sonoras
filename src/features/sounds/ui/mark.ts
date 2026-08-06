import { relativeToPixel } from '@shared/lib/coordinates';

import type { Mark } from '../domain/types';
import { computeFanRadius, computeFanSlots } from './fanGeometry';
import { SOUND_VISIBLE_SIZE } from './soundButton';

const MARK_CLASS = 'sound-mark';
const CIRCLE_CLASS = 'sound-mark__circle';
const FAN_CLASS = 'sound-mark__fan';

/**
 * Creates a Mark group container.
 *
 * The group is positioned with a single transform:
 *   translate(xpx, ypx) scale(f)
 * where the pixel translation is derived from `mark.position` (0–100 % of the
 * image) via `relativeToPixel`. The group origin IS the circle center — the
 * circle centers itself via margins, and fan items radiate from the same
 * origin (design D5).
 *
 * The mark is a LONG-TERM visual anchor, NOT a toggle: the fan of sound
 * buttons is ALWAYS visible around the circle. No hover growth animation —
 * the fan sits at its final radius (mark radius + 12px) at all times.
 *
 * DOM contract:
 * - group: `.sound-mark`, data-testid="sound-mark", data-mark-id, data-map-id,
 *   data-state (idle | active)
 * - circle: `.sound-mark__circle` `<div aria-hidden="true">` — decorative red
 *   disc; the Mark-only tooltip is triggered by :hover on this disc alone
 * - fan: `.sound-mark__fan` role=group, aria-label=mark.title, id=fan-{id},
 *   one `.sound-mark__fan-item` per sound at group-local dx/dy offsets
 * - tooltip: `.sound-mark__tooltip` role=tooltip below the circle
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

  const circle = document.createElement('div');
  circle.className = CIRCLE_CLASS;
  circle.setAttribute('aria-hidden', 'true');
  group.appendChild(circle);

  const fan = document.createElement('div');
  fan.className = FAN_CLASS;
  fan.setAttribute('role', 'group');
  fan.id = `fan-${mark.id}`;
  fan.setAttribute('aria-label', mark.title);
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

  // Pre-create the fan slot items; bindings inject the sound buttons so the
  // button factory stays owned by soundButton.ts. The trailing
  // translate(-50%, -50%) shifts each item by half of ITS OWN box (the item
  // shrink-wraps the 54px button), so the button center lands exactly on the
  // slot position (dx, dy) computed by fanGeometry — the mark circle center is
  // the fan's pivot.
  //
  // The fan radius is derived from the global sound disc size and the mark
  // circle radius via an explicit overlap (computeFanRadius), not hardcoded.
  const fanRadius = computeFanRadius({
    soundRadius: SOUND_VISIBLE_SIZE / 2
  });
  const slots = computeFanSlots(mark.sounds.length, { radius: fanRadius });
  mark.sounds.forEach((_sound, index) => {
    const item = document.createElement('div');
    item.className = 'sound-mark__fan-item';
    item.style.transform = `translate(${slots[index].dx}px, ${slots[index].dy}px) translate(-50%, -50%)`;
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
  group.style.transform = `translate(${x}px, ${y}px) scale(${scaleFactor})`;
}
