'use client';

import { createContext, useContext } from 'react';

import type { LeafletMap } from './types';

export interface MapContextValue {
  /** The Leaflet map instance, or null when the viewport is not ready. */
  map: LeafletMap | null;
  /** Whether the map has finished initialization. */
  ready: boolean;
}

export const MapContext = createContext<MapContextValue>({
  map: null,
  ready: false,
});

/**
 * Returns the current Leaflet map instance from the nearest MapViewport.
 * Consumers MUST handle the `null` case while the map is initializing.
 */
export function useMap(): MapContextValue {
  return useContext(MapContext);
}
