import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import L from 'leaflet';

import { PathOverlay } from '../../src/features/paths/ui/PathOverlay';
import {
  MapContext,
  type MapContextValue,
} from '../../src/shared/lib/viewport/MapContext';
import type { PathVisualState } from '../../src/features/paths/domain/PathVisualState';

const mockPane = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

// Stub L.polyline — Leaflet creates its own SVG within the pane.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(L, 'polyline').mockImplementation(((latlngs: any, options: any) => {
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (options?.className) {
    pathEl.setAttribute('class', String(options.className));
  }
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.appendChild(pathEl);
  return {
    _latlngs: latlngs,
    _path: pathEl,
    options,
    addTo() {
      mockPane.appendChild(container);
      return this;
    },
    remove() {
      container.remove();
    },
    getElement() {
      return pathEl;
    },
    on() {},
    off() {},
  } as unknown as L.Polyline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any);

const mockMap = {
  getPane: vi.fn(() => mockPane),
  addLayer: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  whenReady: vi.fn((cb: () => void) => { cb(); }),
} as unknown as L.Map;

const mockContext: MapContextValue = {
  map: mockMap,
  ready: true,
  width: 200,
  height: 200,
};

function renderWithContext(element: ReactElement) {
  return render(
    <MapContext.Provider value={mockContext}>{element}</MapContext.Provider>
  );
}

describe('PathOverlay', () => {
  beforeEach(() => {
    while (mockPane.firstChild !== null) {
      mockPane.removeChild(mockPane.firstChild);
    }
    document.body.innerHTML = '';
    document.body.appendChild(mockPane);
    vi.clearAllMocks();
  });

  it('calls L.polyline for idle state', () => {
    const states: PathVisualState[] = [
      { pathId: 1, points: [{x:0,y:0},{x:100,y:100}], variant: 'idle' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    const calls = (L.polyline as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('applies idle CSS class', () => {
    const states: PathVisualState[] = [
      { pathId: 1, points: [{x:0,y:0},{x:100,y:100}], variant: 'idle' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    const path = mockPane.querySelector('path');
    expect(path).toHaveClass('path-base', 'path-idle');
  });

  it('adds animateMotion pulse for single variant', () => {
    const states: PathVisualState[] = [
      { pathId: 2, points: [{x:0,y:0},{x:100,y:100}], variant: 'single', activeEndpoint: 'start' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    expect(mockPane.querySelector('.path-pulse')).toBeInTheDocument();
    const mpath = mockPane.querySelector('mpath');
    expect(mpath).toHaveAttribute('href', '#path-2');
  });

  it('reverses pulse for end endpoint', () => {
    const states: PathVisualState[] = [
      { pathId: 3, points: [{x:0,y:0},{x:100,y:100}], variant: 'single', activeEndpoint: 'end' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    const am = mockPane.querySelector('animateMotion');
    expect(am).toHaveAttribute('keyPoints', '1;0');
  });

  it('no pulse for idle', () => {
    const states: PathVisualState[] = [
      { pathId: 4, points: [{x:0,y:0},{x:100,y:100}], variant: 'idle' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    expect(mockPane.querySelector('.path-pulse')).not.toBeInTheDocument();
  });

  it('no pulse for both', () => {
    const states: PathVisualState[] = [
      { pathId: 5, points: [{x:0,y:0},{x:100,y:100}], variant: 'both' },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    expect(mockPane.querySelector('.path-pulse')).not.toBeInTheDocument();
    expect(mockPane.querySelector('path')).toHaveClass('path-both');
  });

  it('applies per-path style overrides to the polyline element', () => {
    const states: PathVisualState[] = [
      {
        pathId: 7,
        points: [{x:0,y:0},{x:100,y:100}],
        variant: 'idle',
        style: { strokeColor: '#ff0000', strokeWidth: 5, dashArray: '8 4' },
      },
    ];
    renderWithContext(<PathOverlay pathStates={states} />);
    const path = mockPane.querySelector('.path-idle');
    expect(path).toHaveAttribute('stroke', '#ff0000');
    expect(path).toHaveAttribute('stroke-width', '5');
    expect(path).toHaveAttribute('stroke-dasharray', '8 4');
  });
});
