# Tasks: Leaflet → DOM/SVG + Panzoom Migration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500–1,800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (store) → PR 2a (engine) → PR 2b (renderers) → PR 3 (pages) → PR 4 (cleanup) |
| Delivery strategy | ask-always |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Audio store → zustand/vanilla | PR 1 | ~50 lines, prerequisite |
| 2 | map-view, Panzoom, layers | PR 2a | ~350 lines + MapControls |
| 3 | soundMarker, pathRenderer, bindings | PR 2b | ~450 lines, needs PR 2a |
| 4 | MapPage.astro + AudioPool | PR 3 | ~100 lines, needs PR 2b |
| 5 | Delete Leaflet + E2E tests | PR 4 | ~800 lines deleted, gated on manual validation |

## Phase 1: Audio Store Refactor — PR 1

- [x] 1.1 `store.ts`: `createStore()` from `zustand/vanilla`; export `audioStore` + `useAudioStore` wrapper [audio-engine]
- [x] 1.2 `index.ts`: add `audioStore` to barrel exports
- [x] 1.3 Tests: `getState()`, `subscribe()`, `useStore` re-render

## Phase 2: Map Engine — PR 2a

- [x] 2.1 `panzoom-setup.ts`: `initPanzoom()` with contain, min/maxScale, wheel, destroy [map-engine]
- [x] 2.2 `layers.ts`: `createSvgLayer()`, `createMarkerLayer()` [map-engine]
- [x] 2.3 `map-view.ts`: custom element — connectedCallback → img decode → Panzoom → layers; public API (scaleFactor, zoomIn/Out, resetView); ResizeObserver; disconnectedCallback [map-engine]
- [x] 2.4 `MapControls.tsx`: remove Leaflet/MapContext; query `<map-view>`; call public methods [cross-feature]

## Phase 3: Vanilla Renderers + Bindings — PR 2b

- [x] 3.1 `soundMarker.ts`: `<button>` via `relativeToPixel`, `data-state`, `marker:activate` event, keyboard a11y [sound-marker]
- [x] 3.2 `marker-styles.css`: `@property --progress` + CSS transition; ripple; hover/focus [sound-marker]
- [x] 3.3 `pathRenderer.ts`: `<path>` via `buildPolylineD`, `vector-effect="non-scaling-stroke"`, CSS classes, animateMotion pulse [path-overlay]
- [x] 3.4 `pathStateEngine.ts`: extract `computePathVisualStates` from SoundTour [design]
- [x] 3.5 `mapViewBindings.ts`: subscribe store → update markers/paths; handle `marker:activate` → `playSound()` [design]
- [x] 3.6 Tests: pure fn + DOM output [testing]

## Phase 4: Page Integration — PR 3

- [x] 4.1 `MapPage.astro`: replace `<MapCanvas client:only>` with `<map-view>` + `<script>` + `<AudioPool client:idle>` [map-page]
- [x] 4.2 Skeleton fade: `.leaflet-container` → `map-view[data-ready]` [design]
- [x] 4.3 Verify AudioBottomPlayer via `useAudioStore` wrapper [bottom-player]

## PR 3 Bug Fixes

- [x] Bug 1: Map too large — fit Panzoom container to viewport on initial load
- [x] Bug 2: Cannot pause playing sound by clicking marker — toggle play/pause/resume in `marker:activate` handler
- [x] Bug 3: Progress ring not appearing — use percentage values for `--progress` and thicken ring mask
- [x] Bug 4: Right rail missing — add `shrink-0` and accept `class` prop so rail stays visible
- [x] Bug 5: Sounds not correctly positioned — use decoded natural image dimensions from `<map-view>`
- [x] Bug 6: Paths not correctly positioned — use decoded natural image dimensions from `<map-view>`

## Phase 5: Legacy Cleanup + E2E — PR 4

- [ ] 5.1 Delete: MapViewport, MapContext, types.ts, MapCanvas, SoundTour, SoundMarker, PathOverlay [design]
- [ ] 5.2 `package.json`: add `@panzoom/panzoom`; rm `leaflet` + `@types/leaflet`
- [ ] 5.3 ESLint rule: only `features/maps` imports Panzoom [cross-feature]
- [ ] 5.4 E2E: pan, zoom, marker click, audio via Playwright [testing]
