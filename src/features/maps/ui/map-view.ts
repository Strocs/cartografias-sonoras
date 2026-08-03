import { DEFAULT_MAX_ZOOM } from '../config';
import { createSvgLayer, createMarkerLayer } from '../lib/layers';
import { ViewportEngine } from '../lib/viewport/engine';

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
const MIN_ZOOM_ATTR = 'min-zoom';
const MAX_ZOOM_ATTR = 'max-zoom';
const START_ZOOM_ATTR = 'start-zoom';
const READY_ATTR = 'data-ready';

interface ZoomAttributes {
  minScale?: number;
  maxScale?: number;
  startScale?: number;
}

/**
 * `<map-view>` is a light-DOM custom element that renders a navigable map
 * image using Panzoom. It owns the Panzoom instance, the image layer, an SVG
 * overlay for paths, and a DOM marker layer.
 *
 * The element exposes a small public API so React islands (MapControls) and
 * page scripts can zoom and reset the view without touching the transform owner.
 */
export class MapView extends HTMLElement implements MapViewElement {
  private _lifecycle = 0;
  private _engine: ViewportEngine | null = null;
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

    const zoomAttributes = this._parseZoomAttributes();
    this._buildDom();
    void this._initialize(src, zoomAttributes, ++this._lifecycle);
  }

  disconnectedCallback() {
    this._cleanup();
  }

  /** Returns the visual scale compensation factor (1 / current zoom). */
  get scaleFactor(): number {
    const scale = this._engine?.getState().scale ?? 1;
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

  /** Returns the current viewport scale. */
  getScale(): number {
    return this._engine?.getState().scale ?? 1;
  }

  zoomIn(): void {
    this._engine?.zoomIn();
  }

  zoomOut(): void {
    this._engine?.zoomOut();
  }

  resetView(): void {
    this._engine?.reset();
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

  private async _initialize(src: string, zoomAttributes: ZoomAttributes, lifecycle: number) {
    const hiddenImg = this._hiddenImg;
    if (hiddenImg === null || this._container === null) {
      return;
    }

    hiddenImg.src = src;
    try {
      await hiddenImg.decode();
    } catch {
      if (this._isCurrentLifecycle(lifecycle, hiddenImg)) {
        this.dispatchEvent(new CustomEvent('viewport-error', { detail: { message: 'Map image failed to decode' } }));
      }
      return;
    }

    if (!this._isCurrentLifecycle(lifecycle, hiddenImg) || this._container === null) return;

    const { naturalWidth, naturalHeight } = hiddenImg;
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

    const startScale = zoomAttributes.startScale ?? this._computeStartScale();
    const minScale = zoomAttributes.minScale ?? startScale;
    const maxScale = zoomAttributes.maxScale ?? DEFAULT_MAX_ZOOM;

    this._assertZoomRange(minScale, startScale, maxScale);

    this._engine = new ViewportEngine(this._container, {
      content: { width: naturalWidth, height: naturalHeight },
      minScale,
      maxScale,
      zoomStep: 0.3,
    });

    this._viewportChangeHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { state?: { scale: number; x: number; y: number } } | undefined;
      const state = detail?.state;
      if (state === undefined) return;

      this.dispatchEvent(
        new CustomEvent('viewport-change', {
          bubbles: true,
          detail: { scale: state.scale, x: state.x, y: state.y },
        })
      );
    };

    this._container.addEventListener('viewport-change', this._viewportChangeHandler);

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

  private _parseZoomAttributes(): ZoomAttributes {
    const attributes = {
      minScale: this._parsePositiveNumberAttribute(MIN_ZOOM_ATTR),
      maxScale: this._parsePositiveNumberAttribute(MAX_ZOOM_ATTR),
      startScale: this._parsePositiveNumberAttribute(START_ZOOM_ATTR),
    };

    if (attributes.startScale !== undefined) {
      this._assertZoomRange(
        attributes.minScale ?? attributes.startScale,
        attributes.startScale,
        attributes.maxScale ?? DEFAULT_MAX_ZOOM
      );
    }

    return attributes;
  }

  private _parsePositiveNumberAttribute(name: string): number | undefined {
    const rawValue = this.getAttribute(name);
    if (rawValue === null) return undefined;

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `<map-view> "${name}" attribute must be a finite positive number; received "${rawValue}"`
      );
    }

    return value;
  }

  private _assertZoomRange(minScale: number, startScale: number, maxScale: number): void {
    if (minScale <= startScale && startScale <= maxScale) return;

    throw new Error(
      `<map-view> zoom configuration must satisfy ${MIN_ZOOM_ATTR} <= ${START_ZOOM_ATTR} <= ${MAX_ZOOM_ATTR}; resolved values were ${minScale} <= ${startScale} <= ${maxScale}`
    );
  }

  private _isCurrentLifecycle(lifecycle: number, hiddenImg: HTMLImageElement): boolean {
    return this.isConnected && this._lifecycle === lifecycle && this._hiddenImg === hiddenImg;
  }

  private _cleanup() {
    this._lifecycle += 1;
    if (this._viewportChangeHandler !== null && this._container !== null) {
      this._container.removeEventListener('viewport-change', this._viewportChangeHandler);
      this._viewportChangeHandler = null;
    }

    this._engine?.destroy();
    this._engine = null;

    this._svgLayer = null;
    this._markerLayer = null;
    this._visibleImg = null;
    this._hiddenImg = null;
    this._container = null;
    this._viewport = null;
    this.replaceChildren();

    this.removeAttribute(READY_ATTR);
  }
}

if (!customElements.get('map-view')) {
  customElements.define('map-view', MapView);
}
