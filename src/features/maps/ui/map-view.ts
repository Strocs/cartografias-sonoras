import { DEFAULT_MIN_ZOOM_FACTOR, DEFAULT_MAX_ZOOM_FACTOR, DEFAULT_START_ZOOM_FACTOR } from '../config'
import type { MapLayer } from '../domain'
import { RENDER_CONTEXT, enablesEffect, type RenderContext } from '../lib/effect-policy'
import { createImageLayer, createSvgLayer, createMarkerLayer } from '../lib/layers'
import { ViewportEngine } from '../lib/viewport/engine'
import type { ViewportSize } from '../lib/viewport/types'
import { isZoomFactorMap, resolveZoomFactor, type ZoomFactorInput } from '../lib/viewport/zoom-factors'

export interface MapViewElement extends HTMLElement {
  readonly scaleFactor: number
  readonly imageWidth: number
  readonly imageHeight: number
  readonly svgLayer: SVGSVGElement | null
  readonly markerLayer: HTMLDivElement | null
  zoomIn(): void
  zoomOut(): void
  resetView(): void
  getScale(): number
  /**
   * Reveals the rendered live world and marks the full scene as ready.
   *
   * This is the explicit post-binding scene-ready boundary: callers that have
   * synchronously built the overlays (marks, sound buttons, paths) signal the
   * element here so the live map never becomes visible before its scene is
   * complete. Idempotent — safe to call from multiple bindings.
   */
  revealScene(): void
  setTransitionFinished(transitionFinished: Promise<void>): void
}

const MAP_SRC_ATTR = 'map-src'
const MAP_LAYERS_ATTR = 'map-layers'
const MAP_TITLE_ATTR = 'map-title'
const RENDER_CONTEXT_ATTR = 'render-context'
const REDUCED_MOTION_ATTR = 'reduced-motion'
const MIN_ZOOM_ATTR = 'min-zoom'
const MAX_ZOOM_ATTR = 'max-zoom'
const START_ZOOM_ATTR = 'start-zoom'
const READY_ATTR = 'data-ready'
const SCENE_READY_ATTR = 'data-scene-ready'

const COMPOSITION_STATUS = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  DEGRADED: 'degraded',
  ERROR: 'error'
} as const

type CompositionStatus = (typeof COMPOSITION_STATUS)[keyof typeof COMPOSITION_STATUS]

interface ZoomAttributes {
  minScale?: ZoomFactorInput
  maxScale?: ZoomFactorInput
  startScale?: ZoomFactorInput
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
  private _lifecycle = 0
  private _engine: ViewportEngine | null = null
  private _viewport: HTMLDivElement | null = null
  private _container: HTMLDivElement | null = null
  private _world: HTMLDivElement | null = null
  private _worldFit = 1
  private _naturalSize: ViewportSize | null = null
  private _declaredSize: ViewportSize | null = null
  private _visibleImg: HTMLImageElement | null = null
  private _hiddenImg: HTMLImageElement | null = null
  private _svgLayer: SVGSVGElement | null = null
  private _markerLayer: HTMLDivElement | null = null
  private _viewportChangeHandler: ((event: Event) => void) | null = null
  private _zoomResizeObserver: ResizeObserver | null = null
  private _zoomAttributes: ZoomAttributes = {}
  private _mapTitle: string | null = null
  private _overlayReady = false
  private _baseReady = false
  private _baseFailed = false
  private _imagesSettled = false
  private _transitionFinished = false
  private _frameId: number | null = null

  connectedCallback() {
    this._setStatus(COMPOSITION_STATUS.INITIALIZING)

    const layers = this._readLayers()
    const zoomAttributes = this._parseZoomAttributes()
    this._zoomAttributes = zoomAttributes
    this._mapTitle = this.getAttribute(MAP_TITLE_ATTR)
    this._buildDom()
    void this._initialize(layers, zoomAttributes, ++this._lifecycle)
  }

  disconnectedCallback() {
    this._cleanup()
  }

  /** Returns the visual scale compensation factor (1 / current zoom). */
  get scaleFactor(): number {
    return 1 / this.getScale()
  }

  /** Returns the natural width of the decoded map image. */
  get imageWidth(): number {
    return this._visibleImg?.naturalWidth || this._declaredSize?.width || 0
  }

  /** Returns the natural height of the decoded map image. */
  get imageHeight(): number {
    return this._visibleImg?.naturalHeight || this._declaredSize?.height || 0
  }

  /** Returns the current viewport scale (worldFit × engine factor). */
  getScale(): number {
    const scale = this._engine?.getState().scale ?? 1
    return this._worldFit * scale
  }

  zoomIn(): void {
    this._engine?.zoomIn()
  }

  zoomOut(): void {
    this._engine?.zoomOut()
  }

  resetView(): void {
    this._engine?.reset()
  }

  /** The SVG layer used for path overlays. */
  get svgLayer(): SVGSVGElement | null {
    return this._svgLayer
  }

  /** The DOM layer used for markers. */
  get markerLayer(): HTMLDivElement | null {
    return this._markerLayer
  }

  private _buildDom() {
    this.style.display = 'block'
    this.style.position = 'relative'
    this.style.overflow = 'hidden'

    const hiddenImg = document.createElement('img')
    hiddenImg.style.position = 'absolute'
    hiddenImg.style.width = '0'
    hiddenImg.style.height = '0'
    hiddenImg.style.opacity = '0'
    hiddenImg.style.pointerEvents = 'none'
    hiddenImg.decoding = 'async'
    // Invisible decode probe: never announced, so its alt is explicitly empty.
    hiddenImg.alt = ''
    this.appendChild(hiddenImg)
    this._hiddenImg = hiddenImg

    const viewport = document.createElement('div')
    viewport.className = 'map-viewport'
    viewport.style.position = 'relative'
    viewport.style.width = '100%'
    viewport.style.height = '100%'
    viewport.style.overflow = 'hidden'
    this.appendChild(viewport)
    this._viewport = viewport

    const container = document.createElement('div')
    container.className = 'map-panzoom'
    container.style.position = 'relative'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.overflow = 'hidden'
    container.style.transformOrigin = '0 0'
    viewport.appendChild(container)
    this._container = container

    // The rendering world: it carries the map content at its natural pixel size
    // and is the transform target for the interaction engine. The engine's
    // transform (translate3d + scale) is written here, while the container
    // above stays a static, viewport-sized interaction surface.
    const world = document.createElement('div')
    world.className = 'map-world'
    world.style.position = 'absolute'
    world.style.left = '0'
    world.style.top = '0'
    world.style.transformOrigin = '0 0'
    // Keep the live world invisible until renderers have added the image
    // layers and the binder has synchronously built the overlays (marks, sound
    // buttons, paths). The scene is revealed through `revealScene()` or, as a
    // failure fallback, through `_setWorldVisible()` — never by a delay.
    world.style.visibility = 'hidden'
    container.appendChild(world)
    this._world = world
  }

  private async _initialize(layers: readonly MapLayer[], zoomAttributes: ZoomAttributes, lifecycle: number) {
    const hiddenImg = this._hiddenImg
    const world = this._world
    const container = this._container
    const [base, ...optionalLayers] = layers
    if (hiddenImg === null || world === null || container === null || base === undefined) return

    try {
      // Legacy single-image callers have no declared geometry. Keep their
      // decode-derived dimensions while map compositions construct immediately.
      if (this.getAttribute(MAP_LAYERS_ATTR) === null) {
        hiddenImg.src = base.src
        await hiddenImg.decode()
        if (!this._isCurrentLifecycle(lifecycle, hiddenImg)) return
        if (hiddenImg.naturalWidth === 0 || hiddenImg.naturalHeight === 0) {
          throw new Error(`Map image has invalid dimensions: ${hiddenImg.naturalWidth}x${hiddenImg.naturalHeight}`)
        }
        base = { ...base, width: hiddenImg.naturalWidth, height: hiddenImg.naturalHeight }
      }
      this._declaredSize = { width: base.width, height: base.height }
      this._naturalSize = this._declaredSize
      world.style.width = `${base.width}px`
      world.style.height = `${base.height}px`
      const worldFit = this._computeWorldFit()
      this._worldFit = worldFit
      this._applyWorldFit(world, worldFit)

      this._visibleImg = createImageLayer(
        world,
        base,
        base,
        false,
        this._mapTitle === null ? undefined : `Mapa de ${this._mapTitle}`
      )
      const effectContext = this._renderContext()
      const reducedMotion = this._prefersReducedMotion()
      const optionalImages = optionalLayers.map((layer) => ({
        layer,
        image: createImageLayer(world, layer, base, enablesEffect(layer, effectContext, reducedMotion))
      }))
      this._svgLayer = createSvgLayer(world)
      this._markerLayer = createMarkerLayer(world)

      const viewportWidth = this._viewport?.clientWidth ?? 0
      const startFactor = resolveZoomFactor(zoomAttributes.startScale ?? DEFAULT_START_ZOOM_FACTOR, viewportWidth)
      const minFactor = resolveZoomFactor(zoomAttributes.minScale ?? DEFAULT_MIN_ZOOM_FACTOR, viewportWidth)
      const maxFactor = resolveZoomFactor(zoomAttributes.maxScale ?? DEFAULT_MAX_ZOOM_FACTOR, viewportWidth)
      this._engine = new ViewportEngine(container, {
        content: { width: base.width * worldFit, height: base.height * worldFit },
        transformTarget: world,
        transformScaleFactor: worldFit,
        startScale: startFactor,
        minScale: minFactor,
        maxScale: maxFactor,
        zoomStep: 0.3
      })
      this._watchZoomBreakpoints(zoomAttributes)

      this._viewportChangeHandler = (event: Event) => {
        const detail = (event as CustomEvent).detail as
          { state?: { scale: number; x: number; y: number }; reason?: string } | undefined
        const state = detail?.state
        const reason = detail?.reason
        if (state === undefined) return

        // Re-fit the rendering world only when the container resized: that is
        // the only event that changes the world-fit, and the layout reads in
        // _refreshWorldFit would force a synchronous reflow on every gesture
        // frame if they ran during drag/pinch/wheel.
        if (reason === 'resize') {
          this._refreshWorldFit()
        }

        this.dispatchEvent(
          new CustomEvent('viewport-change', {
            bubbles: true,
            detail: { scale: state.scale, x: state.x, y: state.y }
          })
        )
      }

      container.addEventListener('viewport-change', this._viewportChangeHandler)
      this._setStatus(COMPOSITION_STATUS.READY)
      this.dispatchEvent(
        new CustomEvent('map-composition-ready', {
          bubbles: true,
          detail: { status: COMPOSITION_STATUS.READY }
        })
      )

      const outcomes = await Promise.all([
        this._visibleImg.decode().then(
          () => ({ layer: base, failed: false }),
          () => ({ layer: base, failed: true })
        ),
        ...optionalImages.map(({ layer, image }) =>
          image.decode().then(
            () => ({ layer, failed: false, image }),
            () => ({ layer, failed: true, image })
          )
        )
      ])
      if (!this._isCurrentLifecycle(lifecycle, hiddenImg)) return

      const [baseOutcome, ...optionalOutcomes] = outcomes
      for (const outcome of optionalOutcomes) {
        if (!outcome.failed) continue
        outcome.image.parentElement?.remove()
        this._reportFailure(outcome.layer, `Map layer "${outcome.layer.id}" failed to decode`)
      }
      this._imagesSettled = true
      this._baseFailed = baseOutcome?.failed ?? true
      if (this._baseFailed) {
        this._fail(new Error('Map image failed to decode'), base, true)
        return
      }
      this._baseReady = true
      if (optionalOutcomes.some((outcome) => outcome.failed)) this._setStatus(COMPOSITION_STATUS.DEGRADED)
      this._scheduleRelease(lifecycle)
    } catch (error) {
      if (!this._isCurrentLifecycle(lifecycle, hiddenImg)) return
      this._fail(this._toError(error, 'Map initialization failed'))
    }
  }

  /**
   * Observes viewport size changes so breakpoint-based zoom factors can be
   * re-resolved and pushed to the engine without recreating it. A number factor
   * never changes, so the observer is only mounted when at least one attribute
   * uses a breakpoint map.
   */
  private _watchZoomBreakpoints(attributes: ZoomAttributes): void {
    const usesBreakpoints = [attributes.minScale, attributes.maxScale, attributes.startScale].some(isZoomFactorMap)
    if (!usesBreakpoints) return
    if (typeof ResizeObserver === 'undefined' || this._viewport === null) return

    this._zoomResizeObserver = new ResizeObserver(() => this._syncZoomRange())
    this._zoomResizeObserver.observe(this._viewport)
  }

  private _syncZoomRange(): void {
    const engine = this._engine
    const viewport = this._viewport
    if (engine === null || viewport === null) return

    const viewportWidth = viewport.clientWidth
    const minFactor = resolveZoomFactor(this._zoomAttributes.minScale ?? DEFAULT_MIN_ZOOM_FACTOR, viewportWidth)
    const maxFactor = resolveZoomFactor(this._zoomAttributes.maxScale ?? DEFAULT_MAX_ZOOM_FACTOR, viewportWidth)

    engine.setRange(minFactor, maxFactor)
  }

  private _readLayers(): readonly MapLayer[] {
    const rawLayers = this.getAttribute(MAP_LAYERS_ATTR)
    if (rawLayers === null) {
      const src = this.getAttribute(MAP_SRC_ATTR)
      if (!src) throw new Error(`<map-view> requires a "${MAP_SRC_ATTR}" attribute when "${MAP_LAYERS_ATTR}" is absent`)
      return [
        {
          id: 'base',
          src,
          width: 1,
          height: 1,
          frame: { x: 0, y: 0, width: 100, height: 100 },
          optional: false,
          effect: 'none'
        }
      ]
    }
    const parsed: unknown = JSON.parse(rawLayers)
    if (!Array.isArray(parsed) || !parsed.every(isMapLayer)) {
      throw new Error(`<map-view> "${MAP_LAYERS_ATTR}" must contain valid layers`)
    }
    return parsed
  }

  private _renderContext(): RenderContext {
    const context = this.getAttribute(RENDER_CONTEXT_ATTR)
    return Object.values(RENDER_CONTEXT).includes(context as RenderContext)
      ? (context as RenderContext)
      : RENDER_CONTEXT.ACTIVE
  }

  private _prefersReducedMotion(): boolean {
    if (this.getAttribute(REDUCED_MOTION_ATTR) === 'true') return true
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  }

  private _reportFailure(layer: MapLayer, message: string): void {
    this.dispatchEvent(new CustomEvent('viewport-error', { bubbles: true, detail: { message } }))
    this.dispatchEvent(
      new CustomEvent('map-composition-error', {
        bubbles: true,
        detail: { layerId: layer.id, optional: layer.optional, message }
      })
    )
  }

  private _setStatus(status: CompositionStatus): void {
    this.setAttribute('data-composition-status', status)
    if (status === COMPOSITION_STATUS.READY || status === COMPOSITION_STATUS.DEGRADED) {
      this.setAttribute(READY_ATTR, 'true')
    } else {
      this.removeAttribute(READY_ATTR)
    }
  }

  /**
   * Reveals the live world and records the full scene as ready.
   *
   * Must be invoked by the scene binder after its synchronous initial render
   * (`bindMapView` creating marks, sound buttons, and paths) so nothing from
   * the live map is visible before the overlays exist. Idempotent.
   */
  revealScene(): void {
    this._overlayReady = true
    this._setWorldVisible()
    this._scheduleRelease(this._lifecycle)
  }

  setTransitionFinished(transitionFinished: Promise<void>): void {
    const lifecycle = this._lifecycle
    this._transitionFinished = false
    void transitionFinished.then(
      () => this._finishTransition(lifecycle),
      () => this._finishTransition(lifecycle)
    )
  }

  private _finishTransition(lifecycle: number): void {
    if (!this.isConnected || this._lifecycle !== lifecycle) return
    this._transitionFinished = true
    this._setWorldVisible()
    this._scheduleRelease(lifecycle)
  }

  /** Failure fallback: never leave the live world permanently hidden. */
  private _setWorldVisible(): void {
    const world = this._world
    if (world === null || !this._overlayReady || !this._transitionFinished) return
    world.style.visibility = 'visible'
  }

  private _scheduleRelease(lifecycle: number): void {
    if (
      !this._overlayReady ||
      !this._transitionFinished ||
      !this._baseReady ||
      !this._imagesSettled ||
      this._baseFailed ||
      this._frameId !== null ||
      this.hasAttribute(SCENE_READY_ATTR)
    ) {
      return
    }
    const hiddenImg = this._hiddenImg
    if (hiddenImg === null) return

    this._frameId = requestAnimationFrame(() => {
      if (!this._isCurrentLifecycle(lifecycle, hiddenImg) || this.hasAttribute(SCENE_READY_ATTR)) return
      this._frameId = requestAnimationFrame(() => {
        this._frameId = null
        if (!this._isCurrentLifecycle(lifecycle, hiddenImg) || this._baseFailed) return
        this.setAttribute(SCENE_READY_ATTR, 'true')
      })
    })
  }

  private _fail(error: Error, layer?: MapLayer, keepComposition = false): void {
    if (!this.isConnected) return

    if (!keepComposition) this._setWorldVisible()
    this._setStatus(COMPOSITION_STATUS.ERROR)
    if (keepComposition) this.setAttribute(READY_ATTR, 'true')
    this.dispatchEvent(
      new CustomEvent('viewport-error', {
        bubbles: true,
        detail: { message: error.message }
      })
    )
    this.dispatchEvent(
      new CustomEvent('map-composition-error', {
        bubbles: true,
        detail: {
          layerId: layer?.id,
          optional: layer?.optional ?? false,
          message: error.message
        }
      })
    )
    this._addAlert(error.message)
  }

  private _addAlert(message: string): void {
    const existing = Array.from(this.querySelectorAll('[role="alert"]'))
    if (existing.some((element) => element.textContent === message)) return

    const diagnostic = document.createElement('p')
    diagnostic.setAttribute('role', 'alert')
    diagnostic.textContent = message
    this.appendChild(diagnostic)
  }

  private _toError(error: unknown, fallback: string): Error {
    return error instanceof Error ? error : new Error(fallback)
  }

  private _computeWorldFit(): number {
    if (this._viewport === null || this._world === null) {
      return 1
    }

    const viewportWidth = this._viewport.clientWidth
    const viewportHeight = this._viewport.clientHeight
    const worldWidth = this._world.clientWidth
    const worldHeight = this._world.clientHeight

    if (worldWidth === 0 || worldHeight === 0) {
      return 1
    }

    return Math.min(1, viewportWidth / worldWidth, viewportHeight / worldHeight)
  }

  /**
   * Initial placeholder fitting of the world before the engine exists. The
   * engine constructor's first commit overwrites this with the matching
   * `translate3d(...) scale(worldFit)` on the same element, so there is no
   * visible flash. Once the engine owns the world transform, fit changes must
   * NOT re-apply this (that would double the scale).
   */
  private _applyWorldFit(world: HTMLDivElement, fit: number): void {
    world.style.transform = `scale(${fit})`
  }

  /**
   * Re-fits the world when the container resizes; no-op when nothing changed.
   * When the fit changes, the engine's content footprint and its emitted scale
   * bias must follow so the rendered world keeps matching the pan bounds and
   * centering. The engine owns the world transform, so this never touches the
   * world's style directly.
   */
  private _refreshWorldFit(): void {
    const world = this._world
    if (world === null) return
    const fit = this._computeWorldFit()
    if (fit !== this._worldFit) {
      this._worldFit = fit
      this._engine?.setContent(this._fittedContent())
      this._engine?.setViewportTransformScaleFactor(fit)
    }
  }

  /** The engine-facing content footprint: the world at its fitted scale. */
  private _fittedContent(): ViewportSize | undefined {
    const natural = this._naturalSize
    if (natural === null) return undefined
    return {
      width: natural.width * this._worldFit,
      height: natural.height * this._worldFit
    }
  }

  private _parseZoomAttributes(): ZoomAttributes {
    const attributes = {
      minScale: this._parseZoomFactorAttribute(MIN_ZOOM_ATTR),
      maxScale: this._parseZoomFactorAttribute(MAX_ZOOM_ATTR),
      startScale: this._parseZoomFactorAttribute(START_ZOOM_ATTR)
    }

    return attributes
  }

  private _parseZoomFactorAttribute(name: string): ZoomFactorInput | undefined {
    const rawValue = this.getAttribute(name)
    if (rawValue === null) return undefined

    const parsed: unknown = (() => {
      try {
        return JSON.parse(rawValue)
      } catch {
        return undefined
      }
    })()

    if (typeof parsed === 'number') {
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`<map-view> "${name}" attribute must be a finite positive number; received "${rawValue}"`)
      }
      return parsed
    }

    if (isZoomFactorMap(parsed)) {
      const map: Record<string, unknown> = parsed
      for (const [bp, value] of Object.entries(map)) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          throw new Error(
            `<map-view> "${name}" breakpoint "${bp}" must be a finite positive number; received "${String(value)}"`
          )
        }
      }
      return parsed
    }

    // Malformed or non-numeric input (e.g. "1px", "Infinity", "").
    const fallbackNumber = Number(rawValue)
    if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) {
      return fallbackNumber
    }
    throw new Error(`<map-view> "${name}" attribute must be a finite positive number; received "${rawValue}"`)
  }

  private _isCurrentLifecycle(lifecycle: number, hiddenImg: HTMLImageElement): boolean {
    return this.isConnected && this._lifecycle === lifecycle && this._hiddenImg === hiddenImg
  }

  private _cleanup() {
    this._lifecycle += 1
    if (this._frameId !== null) cancelAnimationFrame(this._frameId)
    this._frameId = null
    if (this._viewportChangeHandler !== null && this._container !== null) {
      this._container.removeEventListener('viewport-change', this._viewportChangeHandler)
      this._viewportChangeHandler = null
    }

    this._zoomResizeObserver?.disconnect()
    this._zoomResizeObserver = null

    this._engine?.destroy()
    this._engine = null

    this._svgLayer = null
    this._markerLayer = null
    this._visibleImg = null
    this._hiddenImg = null
    this._naturalSize = null
    this._declaredSize = null
    this._container = null
    this._world = null
    this._worldFit = 1
    this._viewport = null
    this._overlayReady = false
    this._baseReady = false
    this._baseFailed = false
    this._imagesSettled = false
    this._transitionFinished = false
    this.querySelectorAll('img').forEach((image) => image.removeAttribute('src'))
    this.replaceChildren()

    this.removeAttribute(READY_ATTR)
    this.removeAttribute(SCENE_READY_ATTR)
    this.removeAttribute('data-composition-status')
  }
}

function isMapLayer(value: unknown): value is MapLayer {
  if (typeof value !== 'object' || value === null) return false
  const layer = value as Record<string, unknown>
  return (
    typeof layer.id === 'string' &&
    typeof layer.src === 'string' &&
    typeof layer.width === 'number' &&
    typeof layer.height === 'number' &&
    typeof layer.optional === 'boolean' &&
    typeof layer.effect === 'string' &&
    typeof layer.frame === 'object' &&
    layer.frame !== null
  )
}

if (!customElements.get('map-view')) {
  customElements.define('map-view', MapView)
}
