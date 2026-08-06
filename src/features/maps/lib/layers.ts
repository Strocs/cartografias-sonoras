import type { MapImage, MapLayer } from '../domain';
import { resolveLayerGeometry } from './composition-geometry';

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
  // Let pointer events reach image layers in empty map areas. Interactive
  // marks opt back in explicitly through `.sound-mark`.
  markerLayer.style.pointerEvents = 'none';
  container.appendChild(markerLayer);
  return markerLayer;
}

export function createImageLayer(
  container: HTMLElement,
  layer: MapLayer,
  base: MapImage,
  effectActive: boolean
): HTMLImageElement {
  const geometry = resolveLayerGeometry(layer, base);
  const wrapper = document.createElement('div');
  wrapper.classList.add(LAYER_CLASS);
  wrapper.dataset.mapLayer = layer.id;
  wrapper.dataset.effectActive = String(effectActive);
  if (layer.className) {
    wrapper.classList.add(...layer.className.trim().split(/\s+/));
  }
  wrapper.style.position = 'absolute';
  wrapper.style.left = `${geometry.x}px`;
  wrapper.style.top = `${geometry.y}px`;
  wrapper.style.width = `${geometry.width}px`;
  wrapper.style.height = `${geometry.height}px`;

  const hoverScale = layer.optional ? layer.hoverScale : undefined;
  if (hoverScale !== undefined) {
    wrapper.dataset.hoverScale = String(hoverScale);
    wrapper.style.setProperty('--layer-hover-scale', String(hoverScale));
  }
  wrapper.style.pointerEvents =
    layer.pointerEvents || hoverScale !== undefined ? 'auto' : 'none';

  const image = document.createElement('img');
  image.src = layer.src;
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.decoding = 'async';
  image.draggable = false;
  image.style.display = 'block';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'contain';
  if (effectActive) {
    image.style.animationName = `map-layer-${layer.effect}`;
    image.dataset.layerEffect = layer.effect;
  }
  wrapper.appendChild(image);
  container.appendChild(wrapper);
  return image;
}
