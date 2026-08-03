import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/features/maps/lib/panzoom-setup', () => ({
  initPanzoom: vi.fn((container: HTMLElement) => {
    const panzoom = {
      zoomIn: vi.fn(() => {
        container.dispatchEvent(
          new CustomEvent('panzoomzoom', {
            detail: { scale: 1.3, x: 0, y: 0, isSVG: false, originalEvent: new Event('zoom') },
          })
        );
        return { x: 0, y: 0, scale: 1.3 };
      }),
      zoomOut: vi.fn(() => ({ x: 0, y: 0, scale: 1 })),
      reset: vi.fn(() => ({ x: 0, y: 0, scale: 1 })),
      getScale: vi.fn(() => 1.3),
      getPan: vi.fn(() => ({ x: 0, y: 0 })),
      setOptions: vi.fn(),
      destroy: vi.fn(),
      bind: vi.fn(),
      eventNames: { down: 'pointerdown', move: 'pointermove', up: 'pointerup' },
      handleDown: vi.fn(),
      handleMove: vi.fn(),
      handleUp: vi.fn(),
      pan: vi.fn(),
      resetStyle: vi.fn(),
      setStyle: vi.fn(),
      zoom: vi.fn(),
      zoomToPoint: vi.fn(),
      zoomWithWheel: vi.fn(),
    };
    return { panzoom, destroy: vi.fn() };
  }),
}));

import { MapView } from '../../src/features/maps/ui/map-view';

const TEST_IMAGE_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function mockImageDecode(width: number, height: number) {
  const originalDecode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    Object.defineProperty(this, 'naturalWidth', {
      value: width,
      configurable: true,
    });
    Object.defineProperty(this, 'naturalHeight', {
      value: height,
      configurable: true,
    });
    return Promise.resolve();
  };
  return () => {
    HTMLImageElement.prototype.decode = originalDecode;
  };
}

async function waitForReady(el: MapView, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (!el.hasAttribute('data-ready')) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for <map-view> to become ready');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('MapView custom element', () => {
  let wrapper: HTMLDivElement;
  let restoreDecode: (() => void) | null = null;

  beforeEach(() => {
    restoreDecode = mockImageDecode(800, 600);
    wrapper = document.createElement('div');
    wrapper.style.width = '400px';
    wrapper.style.height = '300px';
    document.body.appendChild(wrapper);
  });

  afterEach(() => {
    restoreDecode?.();
    wrapper.remove();
  });

  it('registers the <map-view> custom element', () => {
    expect(customElements.get('map-view')).toBe(MapView);
  });

  it('creates the expected DOM structure and marks itself ready', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(el.hasAttribute('data-ready')).toBe(true);
    expect(el.querySelector('.map-viewport')).not.toBeNull();
    expect(el.querySelector('.map-panzoom')).not.toBeNull();
    expect(el.querySelector('.map-panzoom > img')).not.toBeNull();
    expect(el.querySelector('.map-panzoom > svg')).not.toBeNull();
    expect(el.querySelector('.map-panzoom > div')).not.toBeNull();
  });

  it('exposes public zoom and reset methods', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(() => el.zoomIn()).not.toThrow();
    expect(() => el.zoomOut()).not.toThrow();
    expect(() => el.resetView()).not.toThrow();
    expect(el.getScale()).toBeGreaterThan(0);
    expect(el.scaleFactor).toBeGreaterThan(0);
  });

  it('dispatches viewport-change events when Panzoom emits zoom events', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    const handler = vi.fn();
    el.addEventListener('viewport-change', handler);

    el.zoomIn();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('scale');
    expect(detail).toHaveProperty('x');
    expect(detail).toHaveProperty('y');
  });

  it('cleans up when disconnected', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);
    el.remove();

    expect(el.hasAttribute('data-ready')).toBe(false);
  });

  it('throws when map-src is missing', () => {
    const el = document.createElement('map-view') as MapView;

    expect(() => wrapper.appendChild(el)).toThrow(
      '<map-view> requires a "map-src" attribute'
    );
  });
});
