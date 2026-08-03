const LAYER_CLASS = 'map-layer';

function applyLayerStyles(element: HTMLElement | SVGElement): void {
  element.classList.add(LAYER_CLASS);
  element.style.position = 'absolute';
  element.style.inset = '0';
  element.style.width = '100%';
  element.style.height = '100%';
  element.style.pointerEvents = 'none';
}

/**
 * Creates an absolutely-positioned SVG overlay inside the Panzoom container.
 *
 * The SVG matches the container dimensions and is used for path/polylines that
 * share the map's coordinate system.
 */
export function createSvgLayer(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  applyLayerStyles(svg);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.overflow = 'visible';
  container.appendChild(svg);
  return svg;
}

/**
 * Creates an absolutely-positioned DOM container for markers inside the
 * Panzoom container.
 *
 * Marker elements are appended to this layer and positioned via transforms.
 */
export function createMarkerLayer(container: HTMLElement): HTMLDivElement {
  const markerLayer = document.createElement('div');
  applyLayerStyles(markerLayer);
  markerLayer.style.pointerEvents = 'auto';
  container.appendChild(markerLayer);
  return markerLayer;
}
