# Map Engine

## Purpose

The `<map-view>` custom element replaces the Leaflet-based `MapViewport` React island. It owns Panzoom initialization, image loading, SVG path overlay, DOM marker layer, navigation bounds, viewport state, and resize handling. It is the ONLY module that interacts with `@panzoom/panzoom` directly.

## Requirements

### Requirement: Custom Element Lifecycle

The system MUST provide a `<map-view>` custom element registered via `customElements.define('map-view', MapView)`. `connectedCallback` MUST initialize Panzoom and all layers. `disconnectedCallback` MUST destroy Panzoom and remove all listeners.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Mount | `<map-view>` inserted into DOM | `connectedCallback` fires | Panzoom instance created, image loaded, layers ready |
| Unmount | `<map-view>` removed from DOM | `disconnectedCallback` fires | Panzoom destroyed, all listeners removed, no memory leaks |
| SPA navigation | ClientRouter transitions away | `disconnectedCallback` fires | cleanup completes without manual event wiring |
| SPA return | ClientRouter navigates back | `connectedCallback` fires | fresh Panzoom instance created |

### Requirement: Image Loading and Dimension Detection

The system MUST load the map image via `<img>` and wait for `img.decode()` before reading `naturalWidth`/`naturalHeight`. Panzoom MUST be instantiated on a container wrapping the image, SVG layer, and marker layer.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Image ready | `<img>` decode resolves | dimensions read | Panzoom container sized to natural dimensions |
| Layout shift avoided | image not yet decoded | container rendered | no premature Panzoom init with zero dimensions |

### Requirement: Panzoom Navigation

The system MUST configure Panzoom with `contain: 'outside'`, configurable `minScale`/`maxScale`. Wheel zoom MUST use `zoomWithWheel`. Pinch zoom MUST work via Panzoom's native gesture handling. `zoomToPoint` MUST center zoom on cursor position.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Wheel zoom | user scrolls mouse wheel | `zoomWithWheel` handler | zoom level changes centered on cursor |
| Pinch zoom | user pinches on touch device | Panzoom gesture handler | zoom level changes between min/max scale |
| Pan drag | user drags map | Panzoom pan handler | map pans within contain bounds |
| Bounds containment | user drags past edge | contain: 'outside' active | map edge does not leave viewport |

### Requirement: Public API

The custom element MUST expose: read-only viewport state (scale, pan), `zoomIn()`, `zoomOut()`, `resetView()`, and a `scaleFactor` getter (1/currentZoom) for visual compensation.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Read viewport | external code reads `el.scaleFactor` | value accessed | returns `1 / currentZoom` |
| Zoom in | `el.zoomIn()` called | Panzoom zooms | scale increases by configured delta |
| Reset | `el.resetView()` called | Panzoom resets | map returns to initial fit bounds |

### Requirement: Resize Handling

On container resize, the system MUST preserve current center and zoom. Panzoom `setOptions` MUST be called to update containment bounds.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Window resize | viewport dimensions change | ResizeObserver fires | center and zoom preserved, bounds updated |

### Requirement: Animation Constraints

All animations MUST use only `transform`, `opacity`, and `filter`. The system MUST NOT animate `top`, `left`, `width`, or `height`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Marker scale | scale compensation applied | CSS transition runs | only `transform` property animated |
| Path pulse | playback animation | CSS @keyframes runs | only `opacity`/`filter`/`stroke-dashoffset` animated |

### Requirement: Panzoom Encapsulation

ONLY `features/maps` MUST interact with the Panzoom instance directly. No other feature, component, or module MAY import or access Panzoom.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Encapsulation | any code outside `features/maps` | inspected | zero imports of `@panzoom/panzoom` |
