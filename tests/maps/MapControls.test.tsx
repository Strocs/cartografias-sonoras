import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const engineInstances = vi.hoisted(() => [] as Array<{
  zoomIn: ReturnType<typeof vi.fn>;
  zoomOut: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  getState: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}>);

vi.mock('../../src/features/maps/lib/viewport/engine', () => ({
  ViewportEngine: vi.fn(function () {
    const instance = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      getState: vi.fn(() => ({ scale: 1, x: 0, y: 0 })),
      subscribe: vi.fn(() => () => undefined),
    };
    engineInstances.push(instance);
    return instance;
  }),
}));

import '../../src/features/maps/ui/map-view';
import { MapControls } from '../../src/features/maps/ui/MapControls';
import type { MapViewElement } from '../../src/features/maps/ui/map-view';

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

async function waitForReady(el: MapViewElement, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (!el.hasAttribute('data-ready')) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for <map-view> to become ready');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function setupMapView(id?: string): Promise<MapViewElement> {
  const el = document.createElement('map-view') as MapViewElement;
  el.setAttribute('map-src', TEST_IMAGE_SRC);
  if (id) {
    el.id = id;
  }
  document.body.appendChild(el);
  await waitForReady(el);
  return el;
}

describe('MapControls', () => {
  let mapView: MapViewElement | null = null;
  let restoreDecode: (() => void) | null = null;

  beforeEach(() => {
    restoreDecode = mockImageDecode(800, 600);
    mapView = null;
  });

  afterEach(() => {
    restoreDecode?.();
    mapView?.remove();
  });

  it('calls zoomIn on <map-view> when the plus button is clicked', async () => {
    mapView = await setupMapView();
    const zoomIn = vi.spyOn(mapView, 'zoomIn');

    render(<MapControls />);
    await userEvent.click(screen.getByTestId('zoom-in'));

    expect(zoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls zoomOut on <map-view> when the minus button is clicked', async () => {
    mapView = await setupMapView();
    const zoomOut = vi.spyOn(mapView, 'zoomOut');

    render(<MapControls />);
    await userEvent.click(screen.getByTestId('zoom-out'));

    expect(zoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls resetView on <map-view> when the center button is clicked', async () => {
    mapView = await setupMapView();
    const resetView = vi.spyOn(mapView, 'resetView');

    render(<MapControls />);
    await userEvent.click(screen.getByTestId('center-map'));

    expect(resetView).toHaveBeenCalledTimes(1);
  });

  it('targets the map-view identified by mapViewId', async () => {
    const other = await setupMapView('other-map');
    mapView = await setupMapView('primary-map');
    const resetView = vi.spyOn(mapView, 'resetView');
    const otherReset = vi.spyOn(other, 'resetView');

    render(<MapControls mapViewId="primary-map" />);
    await userEvent.click(screen.getByTestId('center-map'));

    expect(resetView).toHaveBeenCalledTimes(1);
    expect(otherReset).not.toHaveBeenCalled();

    other.remove();
  });
});
