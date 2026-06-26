import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import { createElement } from 'react';

import L from 'leaflet';

import { MapViewport } from '../../src/shared/lib/viewport/MapViewport';

const mockPane = {
  style: {
    setProperty: vi.fn(),
  },
};

const mockMap = {
  createPane: vi.fn(() => mockPane),
  fitBounds: vi.fn(),
  getPane: vi.fn(() => mockPane),
  getZoom: vi.fn(() => 0),
  on: vi.fn(),
  off: vi.fn(),
  remove: vi.fn(),
  panTo: vi.fn(),
  setZoom: vi.fn(),
};

const mockImageOverlay = {
  addTo: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    CRS: { Simple: Symbol('CRS.Simple') },
    map: vi.fn(() => mockMap),
    imageOverlay: vi.fn(() => mockImageOverlay),
  },
}));

describe('MapViewport', () => {
  it('renders a container for the Leaflet map', () => {
    render(createElement(MapViewport, {
      imageUrl: '/maps/test.png',
      width: 1200,
      height: 800,
    }));

    expect(screen.getByTestId('map-viewport')).toBeTruthy();
  });

  it('initializes Leaflet with CRS.Simple', () => {
    render(createElement(MapViewport, {
      imageUrl: '/maps/test.png',
      width: 1200,
      height: 800,
    }));

    expect(L.map).toHaveBeenCalled();
    const calls = (L.map as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls.at(-1);
    expect(lastCall).toBeDefined();
    const config = lastCall![1];
    expect(config.crs).toBeDefined();
    expect(config.attributionControl).toBe(false);
    expect(config.zoomControl).toBe(false);
  });

  it('creates a custom path pane between image and marker panes', () => {
    render(createElement(MapViewport, {
      imageUrl: '/maps/test.png',
      width: 1200,
      height: 800,
    }));

    expect(mockMap.createPane).toHaveBeenCalledWith('pathPane');
    expect(mockPane.style.setProperty).toHaveBeenCalledWith('z-index', '350');
  });

  it('adds an image overlay matching the provided dimensions', () => {
    render(createElement(MapViewport, {
      imageUrl: '/maps/test.png',
      width: 1200,
      height: 800,
    }));

    expect(L.imageOverlay).toHaveBeenCalledWith('/maps/test.png', [
      [0, 0],
      [800, 1200],
    ], { className: '' });
  });

  it('marks the container as ready after initialization', () => {
    render(createElement(MapViewport, {
      imageUrl: '/maps/test.png',
      width: 1200,
      height: 800,
    }));

    const container = screen.getByTestId('map-viewport');
    expect(container.getAttribute('data-ready')).toBe('true');
  });
});
