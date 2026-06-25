import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MapControls } from '../../src/features/maps/ui/MapControls';
import { MapContext } from '../../src/shared/lib/viewport/MapContext';

function setup(map: Partial<L.Map>) {
  return render(
    <MapContext.Provider value={{ map: map as L.Map, ready: true }}>
      <MapControls bounds={[
        [0, 0],
        [100, 100],
      ]} />
    </MapContext.Provider>
  );
}

describe('MapControls', () => {
  it('calls zoomIn when the plus button is clicked', async () => {
    const zoomIn = vi.fn();
    const map = { zoomIn } as unknown as L.Map;

    setup(map);
    await userEvent.click(screen.getByTestId('zoom-in'));

    expect(zoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls zoomOut when the minus button is clicked', async () => {
    const zoomOut = vi.fn();
    const map = { zoomOut } as unknown as L.Map;

    setup(map);
    await userEvent.click(screen.getByTestId('zoom-out'));

    expect(zoomOut).toHaveBeenCalledTimes(1);
  });

  it('calls fitBounds with provided bounds when the center button is clicked', async () => {
    const fitBounds = vi.fn();
    const map = { fitBounds } as unknown as L.Map;
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [100, 100],
    ];

    render(
      <MapContext.Provider value={{ map, ready: true }}>
        <MapControls bounds={bounds} />
      </MapContext.Provider>
    );

    await userEvent.click(screen.getByTestId('center-map'));

    expect(fitBounds).toHaveBeenCalledTimes(1);
    expect(fitBounds).toHaveBeenCalledWith(bounds);
  });

  it('does not call fitBounds when bounds are not provided', async () => {
    const fitBounds = vi.fn();
    const map = { fitBounds } as unknown as L.Map;

    render(
      <MapContext.Provider value={{ map, ready: true }}>
        <MapControls />
      </MapContext.Provider>
    );

    await userEvent.click(screen.getByTestId('center-map'));

    expect(fitBounds).not.toHaveBeenCalled();
  });
});
