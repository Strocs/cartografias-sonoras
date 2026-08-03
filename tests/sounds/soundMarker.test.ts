import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  createSoundMarker,
  removeSoundMarker,
  updateSoundMarker
} from '../../src/features/sounds/ui/soundMarker';

import type { Sound } from '../../src/features/sounds/domain/types';

const mockSound: Sound = {
  id: 42,
  title: 'Río Mapocho',
  description: 'Grabación fluvial',
  location: 'Santiago',
  audioUrl: '/audio/rio.mp3',
  position: { x: 50, y: 25 },
  mapId: 7
};

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

describe('createSoundMarker', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('returns a button element positioned with translate and scale', () => {
    const marker = createSoundMarker(mockSound, 800, 600, 0.75);

    expect(marker.tagName).toBe('BUTTON');
    expect(marker.classList.contains('sound-marker')).toBe(true);
    expect(marker.style.transform).toContain('translate(400px, 150px)');
    expect(marker.style.transform).toContain('translate(-50%, -50%)');
    expect(marker.style.transform).toContain('scale(0.75)');
  });

  it('maps x to image width and y to image height', () => {
    const marker = createSoundMarker(
      { ...mockSound, position: { x: 25, y: 75 } },
      800,
      600
    );

    expect(marker.style.getPropertyValue('--marker-x')).toBe('200');
    expect(marker.style.getPropertyValue('--marker-y')).toBe('450');
    expect(marker.style.transform).toContain('translate(200px, 450px)');
  });

  it('sets accessibility and identification attributes', () => {
    const marker = createSoundMarker(mockSound, 800, 600);

    expect(marker.getAttribute('aria-label')).toBe(mockSound.title);
    expect(marker.getAttribute('data-testid')).toBe('sound-marker');
    expect(marker.getAttribute('data-sound-id')).toBe(String(mockSound.id));
    expect(marker.getAttribute('data-map-id')).toBe(String(mockSound.mapId));
    expect(marker.getAttribute('data-state')).toBe('idle');
  });

  it('dispatches marker:activate on click with sound and map ids', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    container.appendChild(marker);

    const handler = vi.fn();
    container.addEventListener('marker:activate', handler);

    marker.click();

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      soundId: mockSound.id,
      mapId: mockSound.mapId
    });
    expect(event.bubbles).toBe(true);
  });

  it('dispatches marker:activate on Enter key press', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    container.appendChild(marker);

    const handler = vi.fn();
    container.addEventListener('marker:activate', handler);

    marker.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches marker:activate on Space key press', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    container.appendChild(marker);

    const handler = vi.fn();
    container.addEventListener('marker:activate', handler);

    marker.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );

    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders a vanilla tooltip with sound metadata', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    const tooltip = marker.querySelector('.sound-marker__tooltip');

    expect(tooltip).not.toBeNull();
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(tooltip?.textContent).toContain(mockSound.title);
    expect(tooltip?.textContent).toContain(mockSound.location);
    expect(tooltip?.textContent).toContain(mockSound.description);
  });

  it('exposes a play and pause icon inside the button', () => {
    const marker = createSoundMarker(mockSound, 800, 600);

    expect(marker.querySelector('.sound-marker__icon--play')).not.toBeNull();
    expect(marker.querySelector('.sound-marker__icon--pause')).not.toBeNull();
  });
});

describe('updateSoundMarker', () => {
  it('updates data-state, selected class, and progress custom property', () => {
    const marker = createSoundMarker(mockSound, 800, 600);

    updateSoundMarker(marker, { status: 'playing', progress: 75 });

    expect(marker.getAttribute('data-state')).toBe('playing');
    expect(marker.classList.contains('sound-marker--selected')).toBe(true);
    expect(marker.style.getPropertyValue('--progress')).toBe('75%');
  });

  it('removes the selected class when status returns to idle', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    updateSoundMarker(marker, { status: 'playing' });
    updateSoundMarker(marker, { status: 'idle' });

    expect(marker.classList.contains('sound-marker--selected')).toBe(false);
    expect(marker.getAttribute('data-state')).toBe('idle');
  });

  it('updates the scale factor while preserving pixel translation', () => {
    const marker = createSoundMarker(mockSound, 800, 600, 1);

    updateSoundMarker(marker, { scaleFactor: 0.5 });

    expect(marker.style.transform).toContain('scale(0.5)');
    expect(marker.style.transform).toContain('translate(400px, 150px)');
  });
});

describe('removeSoundMarker', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    container.remove();
  });

  it('removes the marker from the DOM', () => {
    const marker = createSoundMarker(mockSound, 800, 600);
    container.appendChild(marker);

    removeSoundMarker(marker);

    expect(container.contains(marker)).toBe(false);
  });
});
