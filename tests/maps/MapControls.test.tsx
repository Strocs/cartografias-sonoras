import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
