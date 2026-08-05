import { bindMapView } from './mapViewBindings';

import type { MapViewElement } from '@features/maps/ui/map-view';
import type { Path } from '@features/paths/domain/types';
import type { Mark } from '@features/sounds/domain/types';

interface MapPageData {
  marks: Mark[];
  paths: Path[];
  imgWidth: number;
  imgHeight: number;
}

const MAP_VIEW_SELECTOR = 'map-view#main-map';
const MAP_DATA_ELEMENT_ID = 'map-data';

/**
 * Tracks the active page controller across Astro ClientRouter navigations.
 *
 * The bundled page script registers `astro:page-load` once; bundled modules
 * execute only once, so this module-level reference is the single source of
 * truth for disposing the previous element binding on every navigation.
 */
let disposeActiveController: (() => void) | undefined;

/**
 * Binds the current `<map-view id="main-map">` to the audio store.
 *
 * Binding is event-driven: it waits for the element's `map-composition-ready`
 * event, and handles the already-ready case synchronously. Cleanup is
 * element-scoped and idempotent, so repeated calls (one per `astro:page-load`)
 * never stack listeners or duplicate markers.
 *
 * Returns the element-scoped dispose function for explicit teardown.
 */
export function bindMapPage(): () => void {
  disposeActiveController?.();
  disposeActiveController = undefined;

  const mapView = document.querySelector<HTMLElement>(MAP_VIEW_SELECTOR);
  const data = readMapPageData();
  if (mapView === null || data === null) {
    return () => undefined;
  }

  let disposeBinding: (() => void) | undefined;
  let bound = false;

  const bindWhenReady = (): void => {
    if (bound) return;
    bound = true;
    disposeBinding = bindMapView({
      mapView: mapView as MapViewElement,
      ...data
    });
  };

  if (mapView.hasAttribute('data-ready')) {
    bindWhenReady();
  }
  mapView.addEventListener('map-composition-ready', bindWhenReady);

  disposeActiveController = (): void => {
    mapView.removeEventListener('map-composition-ready', bindWhenReady);
    disposeBinding?.();
    disposeBinding = undefined;
    bound = false;
  };

  return disposeActiveController;
}

function readMapPageData(): MapPageData | null {
  const dataScript = document.getElementById(MAP_DATA_ELEMENT_ID);
  if (dataScript?.textContent === undefined) return null;

  try {
    return JSON.parse(dataScript.textContent) as MapPageData;
  } catch {
    return null;
  }
}