# Delta for Map Page

## ADDED Requirements

### Requirement: First-frame readiness

Map page MUST wait for engine readiness before enabling controls.

- **Controls disabled**: GIVEN page loads; WHEN `data-ready` absent; THEN zoom/reset controls disabled.
- **Ready enable**: GIVEN `data-ready` set; THEN controls enabled.

### Requirement: Viewport controls binding

Static shell MUST expose engine public API to React controls island without leaking mutable state.

- **Zoom in click**: GIVEN controls mounted; WHEN user clicks +; THEN engine `zoomIn()` runs.
- **Reset click**: GIVEN map panned; WHEN user clicks reset; THEN engine `reset()` returns to fitted view.

### Requirement: Astro navigation lifecycle

`<map-view>` custom element MUST teardown engine on `disconnectedCallback` and rebuild on reconnect.

- **Navigation away/back**: GIVEN user navigates away and returns; WHEN element reconnects; THEN fresh engine runs and no stale listeners.

### Requirement: Migration and cleanup

Map page MUST migrate from Panzoom-backed `MapViewport` to the new engine and remove dead imports, mocks, and shims.

- **No Panzoom imports**: GIVEN source inspected; THEN no `@panzoom/panzoom` import remains.
- **Event contract**: GIVEN `mapViewBindings.ts` consumes `viewport-change`; WHEN engine emits; THEN payload uses engine `{x,y,scale}`.

## MODIFIED Requirements

### Requirement: Atomic React Islands

Each React island MUST have exactly ONE interactive responsibility. Every `client:*` directive MUST be individually justified.

(Previously: the island table retained a per-marker label without defining how React markers compose with the custom viewport.)

| Island | Directive | Responsibility |
|---|---|---|
| MapControls | `client:visible` | zoom/reset buttons |
| SoundMarkers | `client:load` | render and operate the current map's 5–10 sound markers as one collection |

- **Single responsibility**: GIVEN controls island inspected; THEN it only handles zoom/reset clicks.
- **Marker collection**: GIVEN map page loads; WHEN the marker layer is ready; THEN one `SoundMarkers` island renders one React `SoundMarker` per sound into that layer.
- **No monolithic wrapper**: GIVEN page source inspected; THEN no React component wraps the whole viewport.
- **Transform authority**: GIVEN markers render inside the shared scene; WHEN viewport state changes; THEN markers move with the scene without storing `{x,y,scale}`, subscribing to viewport frames, or scheduling viewport work.
- **Marker lifecycle**: GIVEN Astro navigation removes or reconnects the map; WHEN the island or target layer unmounts; THEN its portal/subscriptions detach without owning engine teardown.
