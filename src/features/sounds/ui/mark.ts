import { relativeToPixel } from '@shared/lib/coordinates';

import type { Mark } from '../domain/types';
import {
  computeFanRadius,
  computeFanSlots,
  MARK_RADIUS,
  MARK_SIZE,
  SOUND_FAN_OVERLAP
} from './fanGeometry';
import { SOUND_VISIBLE_SIZE } from './soundButton';

const MARK_CLASS = 'sound-mark';
const HEAD_CLASS = 'sound-mark__circle';
const TAIL_CLASS = 'sound-mark__tail';
const FAN_CLASS = 'sound-mark__fan';

/**
 * Distance (px) between the pin TIP (group origin == mark.position) and the
 * CENTER of the pin HEAD disc. The head — not the tip — is the pivot for the
 * sound fan radius and the tooltip. The tail begins at the head center and is
 * one-and-a-half head diameters long.
 */
export const PIN_TAIL_HEIGHT = MARK_SIZE * 1.5;
export const PIN_TAIL_OVERLAP = 0;
// The tail begins at the head center and ends at the geographic tip.
export const PIN_HEAD_OFFSET = PIN_TAIL_HEIGHT;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates a Mark group container.
 *
 * The group is positioned with a single transform:
 *   translate(xpx, ypx) scale(f)
 * where the pixel translation is derived from `mark.position` (0–100 % of the
 * image) via `relativeToPixel`. The group origin IS the pin TIP — the tip stays
 * glued to the geographic coordinate.
 *
 * The pin is drawn as a teardrop: a circular head (`.sound-mark__circle`,
 * 30px, 1px var(--color-secondary-sand) border) plus a triangular tail
 * (`.sound-mark__tail`) whose base starts at the head center and tapers down to
 * the tip at the group origin. The head CENTER sits PIN_HEAD_OFFSET px above the tip
 * and remains the pivot for the sound fan radius and the tooltip — the fan
 * radiates from the head, never from the tip.
 *
 * The mark is a LONG-TERM visual anchor, NOT a toggle: the fan of sound
 * buttons is ALWAYS visible around the head. No hover growth animation.
 *
 * DOM contract:
 * - group: `.sound-mark`, data-testid="sound-mark", data-mark-id, data-map-id,
 *   data-state (idle | active), style var --pin-offset = PIN_HEAD_OFFSET
 * - head: `.sound-mark__circle` `<div aria-hidden="true">` — decorative red
 *   head disc (the pin teardrop's head); the Mark-only tooltip is triggered by
 *   :hover on this disc alone
 * - tail: `.sound-mark__tail` `<svg aria-hidden="true">` — the teardrop tail
 *   whose bottom-centre tip sits on the group origin (mark.position)
 * - fan: `.sound-mark__fan` role=group, aria-label=mark.title, id=fan-{id},
 *   one `.sound-mark__fan-item` per sound at head-relative dx/dy offsets
 * - tooltip: `.sound-mark__tooltip` role=tooltip below the head
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
  group.style.setProperty('--head-size', `${MARK_SIZE}px`);
  group.style.setProperty('--head-radius', `${MARK_RADIUS}px`);
  group.style.setProperty('--pin-tail-height', `${PIN_TAIL_HEIGHT}px`);
  group.style.setProperty('--pin-tail-overlap', `${PIN_TAIL_OVERLAP}px`);
  group.style.setProperty('--pin-offset', `${PIN_HEAD_OFFSET}px`);
  group.style.setProperty('--mark-x', String(pixel.x));
  group.style.setProperty('--mark-y', String(pixel.y));
  applyTransform(group, pixel.x, pixel.y, scaleFactor);

  const head = document.createElement('div');
  head.className = HEAD_CLASS;
  head.setAttribute('aria-hidden', 'true');
  group.appendChild(head);

  group.appendChild(createTail());

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
  // circle radius via an explicit head gap (computeFanRadius), not hardcoded.
  // The angular step is derived from the visible sound diameter (SOUND_VISIBLE_SIZE)
  // so adjacent sound discs are spaced one visible diameter apart.
  const fanRadius = computeFanRadius({
    markRadius: MARK_RADIUS,
    soundRadius: SOUND_VISIBLE_SIZE / 2,
    headGap: -SOUND_FAN_OVERLAP
  });
  const slots = computeFanSlots(mark.sounds.length, {
    radius: fanRadius,
    soundGap: SOUND_VISIBLE_SIZE + 8
  });
  fan.style.transform = `translateY(calc(-1 * var(--pin-offset)))`;
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

function createTail(): SVGSVGElement {
  const tail = document.createElementNS(SVG_NS, 'svg');
  tail.setAttribute('class', TAIL_CLASS);
  tail.setAttribute('aria-hidden', 'true');
  tail.setAttribute('viewBox', `0 0 ${MARK_SIZE} ${PIN_TAIL_HEIGHT}`);
  tail.setAttribute('preserveAspectRatio', 'none');
  tail.setAttribute('width', String(MARK_SIZE));
  tail.setAttribute('height', String(PIN_TAIL_HEIGHT));

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    `M 0 0 H ${MARK_SIZE} L ${MARK_SIZE / 2} ${PIN_TAIL_HEIGHT} Z`
  );
  path.setAttribute('fill', 'firebrick');
  tail.appendChild(path);

  // Draw only the two sloped sides. Leaving the base open lets the tail sit
  // over the head without creating a visible seam between the two shapes.
  const border = document.createElementNS(SVG_NS, 'path');
  border.setAttribute(
    'd',
    `M 0 0 L ${MARK_SIZE / 2} ${PIN_TAIL_HEIGHT} L ${MARK_SIZE} 0`
  );
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', 'var(--color-secondary-sand)');
  border.setAttribute('stroke-width', '1');
  border.setAttribute('stroke-linejoin', 'round');
  tail.appendChild(border);

  return tail;
}
