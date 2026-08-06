import { describe, expect, it, vi } from 'vitest';

import {
  createSoundButton,
  removeSoundButton,
  updateSoundButton,
  SOUND_BUTTON_SIZE,
  SOUND_VISIBLE_SIZE
} from '../../src/features/sounds/ui/soundButton';
import { createMark } from '../../src/features/sounds/ui/mark';

import type { Mark, Sound } from '../../src/features/sounds/domain/types';

const sound: Sound = {
  id: 112,
  title: 'Fuente 2',
  description: '',
  location: '',
  audioUrl: '/b.mp3'
};

const mark: Mark = {
  id: 101,
  mapId: 1,
  title: 'Fuente central',
  description: 'Agua cayendo',
  location: 'Avenida de Aguirre',
  position: { x: 50, y: 25 },
  sounds: [sound]
};

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function appendButton() {
  const container = createContainer();
  const button = createSoundButton(sound, mark);
  container.appendChild(button);
  return { container, button };
}

describe('createSoundButton', () => {
  it('creates a 54px play button with identification attributes', () => {
    const { container, button } = appendButton();

    expect(button.tagName).toBe('BUTTON');
    expect(button.classList.contains('sound-button')).toBe(true);
    expect(button.style.width).toBe(`${SOUND_BUTTON_SIZE}px`);
    expect(button.style.height).toBe(`${SOUND_BUTTON_SIZE}px`);
    expect(button.getAttribute('data-testid')).toBe('sound-button');
    expect(button.getAttribute('data-sound-id')).toBe('112');
    expect(button.getAttribute('data-map-id')).toBe('1');
    expect(button.getAttribute('data-state')).toBe('idle');
    expect(button.getAttribute('data-state')).toBe('idle');
    expect(container.contains(button)).toBe(true);

    container.remove();
  });

  it('exposes the global sound disc size as --disc-size on the button', () => {
    const { container, button } = appendButton();

    expect(button.style.getPropertyValue('--disc-size')).toBe(
      `${SOUND_VISIBLE_SIZE}px`
    );

    container.remove();
  });

  it('renders play and pause icons', () => {
    const { container, button } = appendButton();

    expect(button.querySelector('.sound-button__icon--play')).not.toBeNull();
    expect(button.querySelector('.sound-button__icon--pause')).not.toBeNull();

    container.remove();
  });

  it('does NOT render a tooltip (the Mark group owns it)', () => {
    const { container, button } = appendButton();

    expect(button.querySelector('.sound-mark__tooltip')).toBeNull();
    expect(button.querySelector('[role="tooltip"]')).toBeNull();

    container.remove();
  });

  it('exposes no scale factor API (constant screen size)', () => {
    const { container, button } = appendButton();

    expect(button.style.transform).toBe('');
    expect(button.style.getPropertyValue('--mark-x')).toBe('');

    container.remove();
  });

  it('bubbles sound:activate on click with sound and map ids', () => {
    const { container, button } = appendButton();

    const handler = vi.fn();
    container.addEventListener('sound:activate', handler);

    button.click();

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ soundId: 112, mapId: 1 });
    expect(event.bubbles).toBe(true);

    container.remove();
  });

  it('bubbles sound:activate on Enter and Space key presses', () => {
    const { container, button } = appendButton();

    const handler = vi.fn();
    container.addEventListener('sound:activate', handler);

    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );

    expect(handler).toHaveBeenCalledTimes(2);

    container.remove();
  });
});

describe('updateSoundButton', () => {
  it('updates data-state and the progress ring custom property', () => {
    const { container, button } = appendButton();

    updateSoundButton(button, { status: 'playing', progress: 75 });

    expect(button.getAttribute('data-state')).toBe('playing');
    expect(button.style.getPropertyValue('--progress')).toBe('75%');

    container.remove();
  });

  it('never rewrites the transform on update (no scale compensation)', () => {
    const { container, button } = appendButton();
    button.style.transform = 'scale(1.5)';

    updateSoundButton(button, { status: 'paused' });

    expect(button.style.transform).toBe('scale(1.5)');

    container.remove();
  });
});

describe('removeSoundButton', () => {
  it('removes the button from the DOM', () => {
    const { container, button } = appendButton();

    removeSoundButton(button);

    expect(container.contains(button)).toBe(false);
  });
});

describe('integration with Mark', () => {
  it('a fan container can host a button', () => {
    const group = createMark(mark, 800, 600);
    const button = createSoundButton(sound, mark);

    const slot = group.querySelector<HTMLDivElement>('.sound-mark__fan-item');
    expect(slot).not.toBeNull();
    slot?.appendChild(button);
    expect(slot?.contains(button)).toBe(true);
  });
});