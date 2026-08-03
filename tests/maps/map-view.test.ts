import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const engineInstances = vi.hoisted(() => [] as Array<{
  zoomIn: ReturnType<typeof vi.fn>;
  zoomOut: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  getState: ReturnType<typeof vi.fn>;
}>);

vi.mock('../../src/features/maps/lib/viewport/engine', () => ({
  ViewportEngine: vi.fn(function () {
    const instance = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      getState: vi.fn(() => ({ scale: 1, x: 0, y: 0 })),
    };
    engineInstances.push(instance);
    return instance;
  }),
}));

import { ViewportEngine } from '../../src/features/maps/lib/viewport/engine';
import { MapView } from '../../src/features/maps/ui/map-view';

const ViewportEngineMock = vi.mocked(ViewportEngine);

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
    ViewportEngineMock.mockClear();
    engineInstances.length = 0;
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

  it('routes engine viewport-change events through the public element', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    const handler = vi.fn();
    el.addEventListener('viewport-change', handler);

    el.querySelector('.map-panzoom')?.dispatchEvent(
      new CustomEvent('viewport-change', {
        detail: { state: { scale: 1.3, x: 12, y: 8 }, reason: 'wheel' },
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handler).toHaveBeenCalled();
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toHaveProperty('scale');
    expect(detail).toHaveProperty('x');
    expect(detail).toHaveProperty('y');
  });

  it('delegates public zoom and reset calls to its sole engine authority', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    el.zoomIn();
    el.zoomOut();
    el.resetView();

    expect(engineInstances[0]).toEqual(expect.objectContaining({
      zoomIn: expect.any(Function),
      zoomOut: expect.any(Function),
      reset: expect.any(Function),
    }));
    expect(engineInstances[0]?.zoomIn).toHaveBeenCalledOnce();
    expect(engineInstances[0]?.zoomOut).toHaveBeenCalledOnce();
    expect(engineInstances[0]?.reset).toHaveBeenCalledOnce();
  });

  it('cleans up when disconnected', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);
    el.remove();

    expect(el.hasAttribute('data-ready')).toBe(false);
    expect(engineInstances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it('ignores a stale decode after disconnect and initializes only the current connection', async () => {
    const decodes: Array<() => void> = [];
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', { value: 800, configurable: true });
      Object.defineProperty(this, 'naturalHeight', { value: 600, configurable: true });
      return new Promise<void>((resolve) => decodes.push(resolve));
    };
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);
    el.remove();
    wrapper.appendChild(el);

    decodes[0]?.();
    await Promise.resolve();
    expect(ViewportEngineMock).not.toHaveBeenCalled();

    decodes[1]?.();
    await waitForReady(el);

    expect(ViewportEngineMock).toHaveBeenCalledTimes(1);
    expect(engineInstances).toHaveLength(1);
  });

  it('throws when map-src is missing', () => {
    const el = document.createElement('map-view') as MapView;

    expect(() => wrapper.appendChild(el)).toThrow(
      '<map-view> requires a "map-src" attribute'
    );
  });

  it('constructs one engine with declarative zoom limits and decoded content dimensions', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(ViewportEngineMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      { content: { width: 800, height: 600 }, minScale: 1, maxScale: 4, zoomStep: 0.3 }
    );
  });

  it('passes declarative zoom overrides to engine initialization', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    el.setAttribute('min-zoom', '0.75');
    el.setAttribute('start-zoom', '1.25');
    el.setAttribute('max-zoom', '3.5');
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(ViewportEngineMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      { content: { width: 800, height: 600 }, minScale: 0.75, maxScale: 3.5, zoomStep: 0.3 }
    );

    el.resetView();
    expect(engineInstances[0]?.reset).toHaveBeenCalledOnce();
  });

  it.each(['', '0', '-1', 'Infinity', 'NaN', '1px'])(
    'throws for invalid zoom value "%s"',
    (value) => {
      const el = document.createElement('map-view') as MapView;
      el.setAttribute('map-src', TEST_IMAGE_SRC);
      el.setAttribute('start-zoom', value);

      expect(() => wrapper.appendChild(el)).toThrow(
        '<map-view> "start-zoom" attribute must be a finite positive number'
      );
    }
  );

  it('rejects zoom ranges that do not contain the resolved start scale', () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    el.setAttribute('min-zoom', '2');
    el.setAttribute('start-zoom', '1');
    el.setAttribute('max-zoom', '3');
    expect(() => wrapper.appendChild(el)).toThrow(
      '<map-view> zoom configuration must satisfy min-zoom <= start-zoom <= max-zoom'
    );
    expect(ViewportEngineMock).not.toHaveBeenCalled();
  });
});
