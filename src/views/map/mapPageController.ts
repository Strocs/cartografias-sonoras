import { bindMapView } from './mapViewBindings';

import type { MapViewElement } from '@features/maps/ui/map-view';
import type { Path } from '@features/paths/domain/types';
import type { Sound } from '@features/sounds/domain/types';

interface MapPageData {
  sounds: Sound[];
  paths: Path[];
  imgWidth: number;
  imgHeight: number;
}

let disposeCurrentBinding: (() => void) | undefined;
let readyObserver: MutationObserver | undefined;

export function bindMapPage(): void {
  disposeMapPage();

  const mapView = document.querySelector('map-view#main-map');
  const data = readMapPageData();
  if (!(mapView instanceof HTMLElement) || data === null) return;

  const bindWhenReady = (): void => {
    if (!mapView.hasAttribute('data-ready')) return;
    readyObserver?.disconnect();
    readyObserver = undefined;
    disposeCurrentBinding = bindMapView({
      mapView: mapView as MapViewElement,
      ...data
    });
  };

  readyObserver = new MutationObserver(bindWhenReady);
  readyObserver.observe(mapView, {
    attributes: true,
    attributeFilter: ['data-ready']
  });
  bindWhenReady();
}

function disposeMapPage(): void {
  readyObserver?.disconnect();
  readyObserver = undefined;
  disposeCurrentBinding?.();
  disposeCurrentBinding = undefined;
}

function readMapPageData(): MapPageData | null {
  const dataScript = document.getElementById('map-data');
  if (dataScript?.textContent === undefined) return null;

  try {
    return JSON.parse(dataScript.textContent) as MapPageData;
  } catch {
    return null;
  }
}
