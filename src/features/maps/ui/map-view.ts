import { initPanzoom } from '../lib/panzoom-setup';
import { createSvgLayer, createMarkerLayer } from '../lib/layers';
import type { PanzoomObject } from '@panzoom/panzoom';

export interface MapViewElement extends HTMLElement {
  readonly scaleFactor: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly svgLayer: SVGSVGElement | null;
  readonly markerLayer: HTMLDivElement | null;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  getScale(): number;
}

const MAP_SRC_ATTR = 'map-src';
const READY_ATTR = 'data-ready';

/**
 * `<map-view>` is a light-DOM custom element that renders a navigable map
 * image using Panzoom. It owns the Panzoom instance, the image layer, an SVG
 * overlay for paths, and a DOM marker layer.
 *
 * The element exposes a small public API so React islands (MapControls) and
 * page scripts can zoom and reset the view without touching Panzoom directly.
 */
export class MapView extends HTMLElement implements MapViewElement {
  private _panzoom: PanzoomObject | null = null;
  private _destroyPanzoom: (() => void) | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _viewport: HTMLDivElement | null = null;
  private _container: HTMLDivElement | null = null;
  private _visibleImg: HTMLImageElement | null = null;
  private _hiddenImg: HTMLImageElement | null = null;
  private _svgLayer: SVGSVGElement | null = null;
  private _markerLayer: HTMLDivElement | null = null;
  private _viewportChangeHandler: ((event: Event) => void) | null = null;

  connectedCallback() {
    const src = this.getAttribute(MAP_SRC_ATTR);
    if (!src) {
      throw new Error(`<map-view> requires a "${MAP_SRC_ATTR}" attribute`);
    }

    this._buildDom();
    void this._initialize(src);
  }

  disconnectedCallback() {
    this._cleanup();
  }

  /** Returns the visual scale compensation factor (1 / current zoom). */
  get scaleFactor(): number {
    const scale = this._panzoom?.getScale() ?? 1;
    return 1 / scale;
  }

  /** Returns the natural width of the decoded map image. */
  get imageWidth(): number {
    return this._visibleImg?.naturalWidth ?? 0;
  }

  /** Returns the natural height of the decoded map image. */
  get imageHeight(): number {
    return this._visibleImg?.naturalHeight ?? 0;
  }

  /** Returns the current Panzoom scale. */
  getScale(): number {
    return this._panzoom?.getScale() ?? 1;
  }

  zoomIn(): void {
    this._panzoom?.zoomIn();
  }

  zoomOut(): void {
    this._panzoom?.zoomOut();
  }

  resetView(): void {
    this._panzoom?.reset();
  }

  /** The SVG layer used for path overlays. */
  get svgLayer(): SVGSVGElement | null {
    return this._svgLayer;
  }

  /** The DOM layer used for markers. */
  get markerLayer(): HTMLDivElement | null {
    return this._markerLayer;
  }

  private _buildDom() {
    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.overflow = 'hidden';

    const hiddenImg = document.createElement('img');
    hiddenImg.style.position = 'absolute';
    hiddenImg.style.width = '0';
    hiddenImg.style.height = '0';
    hiddenImg.style.opacity = '0';
    hiddenImg.style.pointerEvents = 'none';
    hiddenImg.decoding = 'async';
    this.appendChild(hiddenImg);
    this._hiddenImg = hiddenImg;

    const viewport = document.createElement('div');
    viewport.className = 'map-viewport';
    viewport.style.position = 'relative';
    viewport.style.width = '100%';
    viewport.style.height = '100%';
    viewport.style.overflow = 'hidden';
    this.appendChild(viewport);
    this._viewport = viewport;

    const container = document.createElement('div');
    container.className = 'map-panzoom';
    container.style.position = 'relative';
    container.style.transformOrigin = '0 0';
    viewport.appendChild(container);
    this._container = container;
  }

  private async _initialize(src: string) {
    if (this._hiddenImg === null || this._container === null) {
      return;
    }

    this._hiddenImg.src = src;
    await this._hiddenImg.decode();

    const { naturalWidth, naturalHeight } = this._hiddenImg;
    if (naturalWidth === 0 || naturalHeight === 0) {
      throw new Error(`Map image has invalid dimensions: ${naturalWidth}x${naturalHeight}`);
    }

    this._container.style.width = `${naturalWidth}px`;
    this._container.style.height = `${naturalHeight}px`;

    const visibleImg = document.createElement('img');
    visibleImg.src = src;
    visibleImg.alt = '';
    visibleImg.decoding = 'async';
    visibleImg.draggable = false;
    visibleImg.style.display = 'block';
    visibleImg.style.width = '100%';
    visibleImg.style.height = '100%';
    this._container.appendChild(visibleImg);
    this._visibleImg = visibleImg;

    this._svgLayer = createSvgLayer(this._container);
    this._markerLayer = createMarkerLayer(this._container);

    const startScale = this._computeStartScale();
    const { panzoom, destroy } = initPanzoom(this._container, visibleImg, {
      startScale,
      minScale: startScale,
    });
    this._panzoom = panzoom;
    this._destroyPanzoom = destroy;

    this._viewportChangeHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { scale: number; x: number; y: number } | undefined;
      if (detail === undefined) return;

      this.dispatchEvent(
        new CustomEvent('viewport-change', {
          bubbles: true,
          detail: { scale: detail.scale, x: detail.x, y: detail.y },
        })
      );
    };

    this._container.addEventListener('panzoomend', this._viewportChangeHandler);
    this._container.addEventListener('panzoomzoom', this._viewportChangeHandler);

    this._setupResizeObserver();

    this.setAttribute(READY_ATTR, 'true');
  }

  private _computeStartScale(): number {
    if (this._viewport === null || this._container === null) {
      return 1;
    }

    const viewportWidth = this._viewport.clientWidth;
    const viewportHeight = this._viewport.clientHeight;
    const containerWidth = this._container.clientWidth;
    const containerHeight = this._container.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) {
      return 1;
    }

    return Math.min(
      1,
      viewportWidth / containerWidth,
      viewportHeight / containerHeight
    );
  }

  private _setupResizeObserver() {
    if (this._viewport === null || this._panzoom === null) return;

    this._resizeObserver = new ResizeObserver(() => {
      this._panzoom?.setOptions({});
    });

    this._resizeObserver.observe(this._viewport);
  }

  private _cleanup() {
    if (this._viewportChangeHandler !== null && this._container !== null) {
      this._container.removeEventListener('panzoomend', this._viewportChangeHandler);
      this._container.removeEventListener('panzoomzoom', this._viewportChangeHandler);
      this._viewportChangeHandler = null;
    }

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._destroyPanzoom?.();
    this._destroyPanzoom = null;
    this._panzoom = null;

    this._svgLayer = null;
    this._markerLayer = null;
    this._visibleImg = null;
    this._hiddenImg = null;
    this._container = null;
    this._viewport = null;

    this.removeAttribute(READY_ATTR);
  }
}

if (!customElements.get('map-view')) {
  customElements.define('map-view', MapView);
}
