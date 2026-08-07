import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const engineInstances = vi.hoisted(
  () =>
    [] as Array<{
      zoomIn: ReturnType<typeof vi.fn>;
      zoomOut: ReturnType<typeof vi.fn>;
      reset: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
      getState: ReturnType<typeof vi.fn>;
      setRange: ReturnType<typeof vi.fn>;
      setContent: ReturnType<typeof vi.fn>;
      setViewportTransformScaleFactor: ReturnType<typeof vi.fn>;
    }>
);

vi.mock('../../src/features/maps/lib/viewport/engine', () => ({
  ViewportEngine: vi.fn(function () {
    const instance = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      getState: vi.fn(() => ({ scale: 1, x: 0, y: 0 })),
      setRange: vi.fn(),
      setContent: vi.fn(),
      setViewportTransformScaleFactor: vi.fn()
    };
    engineInstances.push(instance);
    return instance;
  })
}));

import { ViewportEngine } from '../../src/features/maps/lib/viewport/engine';
import { MapView } from '../../src/features/maps/ui/map-view';

const ViewportEngineMock = vi.mocked(ViewportEngine);

const TEST_IMAGE_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const LAYERS = [
  {
    id: 'base',
    src: TEST_IMAGE_SRC,
    width: 800,
    height: 600,
    frame: { x: 0, y: 0, width: 100, height: 100 },
    optional: false,
    effect: 'none'
  },
  {
    id: 'overlay',
    src: `${TEST_IMAGE_SRC}#overlay`,
    width: 200,
    height: 400,
    frame: { x: 25, y: 20, width: 50, height: 50 },
    optional: true,
    effect: 'float'
  }
] as const;

function setLayers(el: MapView, layers = LAYERS): void {
  el.setAttribute('map-layers', JSON.stringify(layers));
}

function mockImageDecode(width: number, height: number) {
  const originalDecode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    Object.defineProperty(this, 'naturalWidth', {
      value: width,
      configurable: true
    });
    Object.defineProperty(this, 'naturalHeight', {
      value: height,
      configurable: true
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

async function waitForStatus(
  el: MapView,
  status: string,
  timeout = 1000
): Promise<void> {
  const start = Date.now();
  while (el.getAttribute('data-composition-status') !== status) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for <map-view> status "${status}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Resolves every pending decode and waits a tick so chains of decodes (base
 * image followed by optional layers) settle before the next round.
 */
async function drainDecodes<T>(
  decodes: T[],
  resolveEntry: (entry: T) => void = (entry) => (entry as () => void)()
): Promise<void> {
  for (let i = 0; i < 10 && decodes.length > 0; i += 1) {
    decodes.splice(0).forEach((entry) => resolveEntry(entry));
    await new Promise((resolve) => setTimeout(resolve, 0));
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
    expect(el.getAttribute('data-composition-status')).toBe('ready');
    expect(el.querySelector('.map-viewport')).not.toBeNull();
    expect(el.querySelector('.map-panzoom')).not.toBeNull();
    expect(el.querySelector('.map-world')).not.toBeNull();
    expect(
      el.querySelector('.map-panzoom > .map-world > [data-map-layer] > img')
    ).not.toBeNull();
    expect(el.querySelector('.map-panzoom > .map-world > svg')).not.toBeNull();
    expect(el.querySelector('.map-panzoom > .map-world > div')).not.toBeNull();
  });

  it('publishes initializing on connect and clears ready until composition settles', async () => {
    const decodes: Array<() => void> = [];
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
      return new Promise<void>((resolve) => decodes.push(resolve));
    };
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    wrapper.appendChild(el);

    expect(el.getAttribute('data-composition-status')).toBe('initializing');
    expect(el.hasAttribute('data-ready')).toBe(false);

    await drainDecodes(decodes);
    await waitForReady(el);

    expect(el.getAttribute('data-composition-status')).toBe('ready');
    expect(el.hasAttribute('data-ready')).toBe(true);
  });

  it('clears ready and republishes initializing when the element reconnects', async () => {
    const decodes: Array<() => void> = [];
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
      return new Promise<void>((resolve) => decodes.push(resolve));
    };
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    wrapper.appendChild(el);
    await drainDecodes(decodes);
    await waitForReady(el);
    expect(el.getAttribute('data-composition-status')).toBe('ready');

    el.remove();
    expect(el.hasAttribute('data-ready')).toBe(false);

    wrapper.appendChild(el);
    expect(el.getAttribute('data-composition-status')).toBe('initializing');
    expect(el.hasAttribute('data-ready')).toBe(false);

    await drainDecodes(decodes);
    await waitForReady(el);
    expect(el.getAttribute('data-composition-status')).toBe('ready');
  });

  it('renders ordered decorative layer images in fixed-placement wrappers', async () => {
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    wrapper.appendChild(el);

    await waitForReady(el);

    const layers = Array.from(el.querySelectorAll('[data-map-layer]'));
    expect(layers.map((layer) => layer.getAttribute('data-map-layer'))).toEqual(
      ['base', 'overlay']
    );
    expect(layers.every((layer) => layer instanceof HTMLDivElement)).toBe(true);
    expect(layers[1]?.getAttribute('style')).toContain('left: 325px');
    expect(layers[1]?.getAttribute('style')).toContain('top: 120px');
    expect(layers[1]?.getAttribute('style')).toContain('width: 150px');
    expect(layers[1]?.getAttribute('style')).toContain('height: 300px');
    expect(layers[1]?.querySelector('img')).toMatchObject({ alt: '' });
    expect(layers[1]?.querySelector('img')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
  });

  it('emits ready after the base and all optional layers settle', async () => {
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    const ready = vi.fn();
    el.addEventListener('map-composition-ready', ready);
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(ready).toHaveBeenCalledOnce();
    expect((ready.mock.calls[0][0] as CustomEvent).detail).toEqual({
      status: 'ready'
    });
  });

  it('hands off in degraded mode after an optional layer decode failure', async () => {
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
      return this.src.includes('#overlay')
        ? Promise.reject(new Error('overlay failed'))
        : Promise.resolve();
    };
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    const error = vi.fn();
    const ready = vi.fn();
    el.addEventListener('map-composition-error', error);
    el.addEventListener('map-composition-ready', ready);
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(el.getAttribute('data-composition-status')).toBe('degraded');
    expect(el.querySelector('[data-map-layer="overlay"]')).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ layerId: 'overlay', optional: true })
      })
    );
    expect((ready.mock.calls[0][0] as CustomEvent).detail).toEqual({
      status: 'degraded'
    });
  });

  it('blocks readiness and exposes an accessible diagnostic after a base decode failure', async () => {
    HTMLImageElement.prototype.decode = () =>
      Promise.reject(new Error('base failed'));
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    const error = vi.fn();
    el.addEventListener('map-composition-error', error);
    wrapper.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(el.hasAttribute('data-ready')).toBe(false);
    expect(el.getAttribute('data-composition-status')).toBe('error');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Map image failed to decode'
    );
    expect(el.querySelector('.map-skeleton')).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ layerId: 'base', optional: false })
      })
    );
  });

  it('publishes error with an accessible diagnostic when the base image has invalid dimensions', async () => {
    mockImageDecode(0, 0);
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    const error = vi.fn();
    el.addEventListener('map-composition-error', error);
    wrapper.appendChild(el);

    await waitForStatus(el, 'error');

    expect(el.hasAttribute('data-ready')).toBe(false);
    expect(el.getAttribute('data-composition-status')).toBe('error');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'invalid dimensions'
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          message: expect.stringContaining('invalid dimensions')
        })
      })
    );
    expect(ViewportEngineMock).not.toHaveBeenCalled();
  });

  it('publishes error when the viewport engine construction fails', async () => {
    ViewportEngineMock.mockImplementationOnce(function () {
      throw new Error('engine failed to initialize');
    });
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    const error = vi.fn();
    el.addEventListener('map-composition-error', error);
    wrapper.appendChild(el);

    await waitForStatus(el, 'error');

    expect(el.hasAttribute('data-ready')).toBe(false);
    expect(el.getAttribute('data-composition-status')).toBe('error');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'engine failed to initialize'
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          message: 'engine failed to initialize'
        })
      })
    );
  });

  it('ignores stale layer callbacks after reconnecting with a new generation', async () => {
    const decodes: Array<() => void> = [];
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
      return new Promise<void>((resolve) => decodes.push(resolve));
    };
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    wrapper.appendChild(el);
    el.remove();
    wrapper.appendChild(el);

    decodes.slice(0, 2).forEach((resolve) => resolve());
    await Promise.resolve();
    expect(ViewportEngineMock).not.toHaveBeenCalled();

    decodes.slice(2).forEach((resolve) => resolve());
    await waitForReady(el);

    expect(el.querySelectorAll('[data-map-layer]')).toHaveLength(2);
    expect(ViewportEngineMock).toHaveBeenCalledTimes(1);
  });

  it('applies active effects unless reduced motion is requested without changing layer geometry', async () => {
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    el.setAttribute('render-context', 'active');
    wrapper.appendChild(el);
    await waitForReady(el);
    expect(
      el
        .querySelector('[data-map-layer="overlay"]')
        ?.getAttribute('data-effect-active')
    ).toBe('true');

    el.remove();
    const reduced = document.createElement('map-view') as MapView;
    setLayers(reduced);
    reduced.setAttribute('render-context', 'active');
    reduced.setAttribute('reduced-motion', 'true');
    wrapper.appendChild(reduced);
    await waitForReady(reduced);
    const overlay = reduced.querySelector(
      '[data-map-layer="overlay"]'
    ) as HTMLElement;
    expect(overlay.getAttribute('data-effect-active')).toBe('false');
    expect(overlay.style.left).toBe('325px');
    expect(overlay.style.top).toBe('120px');
  });

  it('renders a data-driven hover scale on non-base layers only', async () => {
    const hoverLayers = [
      {
        id: 'base',
        src: TEST_IMAGE_SRC,
        width: 800,
        height: 600,
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none',
        hoverScale: 1.05
      },
      {
        id: 'overlay',
        src: `${TEST_IMAGE_SRC}#overlay`,
        width: 200,
        height: 400,
        frame: { x: 25, y: 20, width: 50, height: 50 },
        optional: true,
        effect: 'float',
        hoverScale: 1.05
      }
    ] as const;
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-layers', JSON.stringify(hoverLayers));
    wrapper.appendChild(el);
    await waitForReady(el);

    const base = el.querySelector('[data-map-layer="base"]') as HTMLElement;
    expect(base.hasAttribute('data-hover-scale')).toBe(false);
    expect(base.style.pointerEvents).toBe('none');

    const overlay = el.querySelector(
      '[data-map-layer="overlay"]'
    ) as HTMLElement;
    expect(overlay.classList.contains('map-layer')).toBe(true);
    expect(overlay.getAttribute('data-hover-scale')).toBe('1.05');
    expect(overlay.style.getPropertyValue('--layer-hover-scale')).toBe('1.05');
    expect(overlay.style.pointerEvents).toBe('auto');
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
        detail: { state: { scale: 1.3, x: 12, y: 8 }, reason: 'wheel' }
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

    expect(engineInstances[0]).toEqual(
      expect.objectContaining({
        zoomIn: expect.any(Function),
        zoomOut: expect.any(Function),
        reset: expect.any(Function)
      })
    );
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
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
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

  it('ignores a stale initializer failure after the element reconnects', async () => {
    const decodes: Array<{
      resolve: () => void;
      reject: (error: Error) => void;
    }> = [];
    HTMLImageElement.prototype.decode = function () {
      Object.defineProperty(this, 'naturalWidth', {
        value: 800,
        configurable: true
      });
      Object.defineProperty(this, 'naturalHeight', {
        value: 600,
        configurable: true
      });
      return new Promise<void>((resolve, reject) =>
        decodes.push({ resolve, reject })
      );
    };
    const el = document.createElement('map-view') as MapView;
    setLayers(el);
    wrapper.appendChild(el);
    el.remove();
    wrapper.appendChild(el);
    expect(el.getAttribute('data-composition-status')).toBe('initializing');

    decodes[0]?.reject(new Error('stale failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(el.getAttribute('data-composition-status')).toBe('initializing');
    expect(el.hasAttribute('data-ready')).toBe(false);
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(ViewportEngineMock).not.toHaveBeenCalled();

    await drainDecodes(decodes, (decode) => decode.resolve());
    await waitForReady(el);

    expect(el.getAttribute('data-composition-status')).toBe('ready');
    expect(el.hasAttribute('data-ready')).toBe(true);
    expect(ViewportEngineMock).toHaveBeenCalledTimes(1);
  });

  it('throws when map-src is missing', () => {
    const el = document.createElement('map-view') as MapView;

    expect(() => wrapper.appendChild(el)).toThrow(
      '<map-view> requires a "map-src" attribute'
    );
  });

  it('constructs one engine with default factor zoom limits and decoded content dimensions', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    // The engine derives its content from the live viewport when omitted; the
    // world is at its fit scale and the container measures zero in the test
    // environment, so the fallback fit (1) makes the footprint the natural
    // image size (800x600).
    expect(ViewportEngineMock).toHaveBeenCalledWith(expect.any(HTMLElement), {
      content: { width: 800, height: 600 },
      transformTarget: expect.any(HTMLElement),
      transformScaleFactor: 1,
      startScale: 1,
      minScale: 0.8,
      maxScale: 3,
      zoomStep: 0.3
    });
  });

  it('passes declarative zoom overrides to engine initialization', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    el.setAttribute('min-zoom', '0.75');
    el.setAttribute('start-zoom', '1.25');
    el.setAttribute('max-zoom', '3.5');
    wrapper.appendChild(el);

    await waitForReady(el);

    expect(ViewportEngineMock).toHaveBeenCalledWith(expect.any(HTMLElement), {
      content: { width: 800, height: 600 },
      transformTarget: expect.any(HTMLElement),
      transformScaleFactor: 1,
      startScale: 1.25,
      minScale: 0.75,
      maxScale: 3.5,
      zoomStep: 0.3
    });

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

  it('resolves breakpoint-based zoom factors from the viewport width', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    // In the test environment the fit scale is 1; simulate a mobile width by
    // setting the wrapper to a narrow viewport and check the resolved range.
    wrapper.style.width = '375px';
    el.setAttribute(
      'min-zoom',
      '{"base":0.9,"md":0.8}'
    );
    el.setAttribute('max-zoom', '{"base":2.5,"md":3}');
    wrapper.appendChild(el);

    await waitForReady(el);

    // Narrow viewport (< md) => base factors apply.
    expect(ViewportEngineMock).toHaveBeenCalledWith(expect.any(HTMLElement), {
      content: { width: 800, height: 600 },
      transformTarget: expect.any(HTMLElement),
      transformScaleFactor: 1,
      startScale: 1,
      minScale: 0.9,
      maxScale: 2.5,
      zoomStep: 0.3
    });
  });

  it('hands the fitted footprint and matched scale bias to the engine when the fit changes', async () => {
    const el = document.createElement('map-view') as MapView;
    el.setAttribute('map-src', TEST_IMAGE_SRC);
    wrapper.appendChild(el);

    await waitForReady(el);

    const viewportEl = el.querySelector('.map-viewport') as HTMLElement;
    const worldEl = el.querySelector('.map-world') as HTMLElement;
    // Simulate a real layout that changes the world fit: a narrow viewport
    // (400x600) containing the 800x600 world => fit 0.5, footprint 400x300.
    Object.defineProperty(viewportEl, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(viewportEl, 'clientHeight', { value: 600, configurable: true });
    Object.defineProperty(worldEl, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(worldEl, 'clientHeight', { value: 600, configurable: true });

    el.querySelector('.map-panzoom')?.dispatchEvent(
      new CustomEvent('viewport-change', {
        detail: { state: { scale: 1, x: 0, y: 0 }, reason: 'resize' }
      })
    );

    // The world must not self-translate or re-scale: once the engine owns the
    // world transform, fit changes flow through the engine (content footprint
    // plus the emitted scale bias) instead of touching the world's style.
    expect(worldEl.style.transform).toBe('scale(1)');
    expect(engineInstances[0]?.setContent).toHaveBeenCalledWith({
      width: 400,
      height: 300
    });
    expect(engineInstances[0]?.setViewportTransformScaleFactor).toHaveBeenCalledWith(
      0.5
    );
  });
});
