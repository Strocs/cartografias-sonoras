import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  createMark,
  insertFanButton,
  removeMark,
  setFanOpen,
  updateMark
} from '../../src/features/sounds/ui/mark';
import { createSoundButton } from '../../src/features/sounds/ui/soundButton';

import type { Mark } from '../../src/features/sounds/domain/types';

const mark: Mark = {
  id: 101,
  mapId: 1,
  title: 'Fuente central',
  description: 'Agua cayendo',
  location: 'Avenida de Aguirre',
  position: { x: 50, y: 25 },
  sounds: [
    { id: 101, title: 'Fuente', description: '', location: '', audioUrl: '/a.mp3' },
    { id: 112, title: 'Fuente', description: '', location: '', audioUrl: '/b.mp3' }
  ]
};

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

describe('createMark', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('returns a group div positioned with translate/scale from mark.position', () => {
    const group = createMark(mark, 800, 600, 0.75);

    expect(group.tagName).toBe('DIV');
    expect(group.classList.contains('sound-mark')).toBe(true);
    expect(group.getAttribute('data-testid')).toBe('sound-mark');
    expect(group.getAttribute('data-mark-id')).toBe('101');
    expect(group.getAttribute('data-map-id')).toBe('1');
    expect(group.getAttribute('data-state')).toBe('idle');
    expect(group.style.transform).toContain('translate(400px, 150px)');
    expect(group.style.transform).toContain('translate(-50%, -50%)');
    expect(group.style.transform).toContain('scale(0.75)');
  });

  it('renders the circle button with aria contract', () => {
    const group = createMark(mark, 800, 600);

    const circle = group.querySelector<HTMLButtonElement>('.sound-mark__circle');
    expect(circle).not.toBeNull();
    expect(circle?.getAttribute('aria-label')).toBe(mark.title);
    expect(circle?.getAttribute('aria-expanded')).toBe('false');
    expect(circle?.getAttribute('aria-controls')).toBe('fan-101');
    expect(circle?.type).toBe('button');
  });

  it('renders a fan with one slot per sound and a tooltip below', () => {
    const group = createMark(mark, 800, 600);

    const fan = group.querySelector('.sound-mark__fan');
    expect(fan).not.toBeNull();
    expect(fan?.getAttribute('role')).toBe('group');
    expect(fan?.id).toBe('fan-101');
    expect(fan?.getAttribute('aria-hidden')).toBe('true');
    expect(fan?.querySelectorAll('.sound-mark__fan-item')).toHaveLength(2);

    const tooltip = group.querySelector<HTMLElement>('.sound-mark__tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(group.querySelector('.sound-mark__tooltip')?.textContent).toBe(
      mark.title
    );
  });

  it('bubbles mark:activate on circle click', () => {
    const group = createMark(mark, 800, 600);
    container.appendChild(group);

    const handler = vi.fn();
    container.addEventListener('mark:activate', handler);

    const circle = group.querySelector<HTMLButtonElement>('.sound-mark__circle');
    circle?.click();

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ markId: 101, mapId: 1 });
    expect(event.bubbles).toBe(true);
  });

  it('bubbles mark:activate on Enter key press', () => {
    const group = createMark(mark, 800, 600);
    container.appendChild(group);

    const handler = vi.fn();
    container.addEventListener('mark:activate', handler);

    const circle = group.querySelector<HTMLButtonElement>('.sound-mark__circle');
    circle?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('setFanOpen', () => {
  it('mirrors open state into aria-expanded and data-open', () => {
    const group = createMark(mark, 800, 600);

    setFanOpen(group, true);
    const circle = group.querySelector<HTMLButtonElement>('.sound-mark__circle');
    expect(circle?.getAttribute('aria-expanded')).toBe('true');
    expect(group.getAttribute('data-open')).toBe('true');

    setFanOpen(group, false);
    expect(circle?.getAttribute('aria-expanded')).toBe('false');
    expect(group.getAttribute('data-open')).toBeNull();
  });
});

describe('updateMark', () => {
  it('applies the group scaleFactor once and toggles active state', () => {
    const group = createMark(mark, 800, 600, 1);

    updateMark(group, { scaleFactor: 0.5, active: true });

    expect(group.style.transform).toContain('scale(0.5)');
    expect(group.style.transform).toContain('translate(400px, 150px)');
    expect(group.getAttribute('data-state')).toBe('active');

    updateMark(group, { active: false });
    expect(group.getAttribute('data-state')).toBe('idle');
  });
});

describe('insertFanButton', () => {
  it('places a sound button into the matching fan slot', () => {
    const group = createMark(mark, 800, 600);
    const fan = group.querySelector<HTMLDivElement>('.sound-mark__fan');
    const button = createSoundButton(mark.sounds[0], mark);

    expect(fan).not.toBeNull();
    if (fan === null) return;

    insertFanButton(fan, 0, button);

    expect(fan.children[0]?.contains(button)).toBe(true);
  });
});

describe('removeMark', () => {
  it('removes the group from the DOM', () => {
    const container = createContainer();
    const group = createMark(mark, 800, 600);
    container.appendChild(group);

    removeMark(group);

    expect(container.contains(group)).toBe(false);
  });
});