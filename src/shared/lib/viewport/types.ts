export interface MapViewportConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
  attributionControl?: boolean;
}

export interface MapViewportRef {
  /** Returns the underlying Leaflet map instance, or null if not ready. */
  getMap: () => L.Map | null;
  /** Pans the viewport to the given image coordinate. */
  panTo: (x: number, y: number) => void;
  /** Sets the zoom level. */
  setZoom: (zoom: number) => void;
  /** Fits the viewport to the image bounds. */
  fitBounds: () => void;
}

// Re-export Leaflet types used by consumers so they do not need to import
// Leaflet directly outside of the viewport module.
export type { Map as LeafletMap } from 'leaflet';
