# Proposal: Leaflet to DOM/SVG + Panzoom Migration

## Intent

Replace Leaflet (CRS.Simple) with a native DOM/SVG map layer powered by `@panzoom/panzoom`. This removes a heavy dependency, reduces bundle size, and keeps the map accessible and performant for the project's small data volume (≤10 markers, ~50 path points). All existing domain models and audio behavior remain unchanged.

## Scope

### In Scope
- Vanilla `<map-view>` custom element as the map viewport.
- `@panzoom/panzoom` integration for pan, zoom, wheel, and pinch.
- SVG path layer with `vector-effect="non-scaling-stroke"` and state-driven CSS classes.
- Vanilla DOM marker layer with keyboard accessibility and hover/focus states.
- Refactor shared audio store to `zustand/vanilla` (`createStore`) with a React `useStore` wrapper.
- Extract `AudioPool` from the map island and render it in `MapPage.astro` as a separate `client:idle` island.
- Rewrite `SoundMarker` / `PathOverlay` as vanilla renderers.
- Keep `HoverCard` in `features/sounds/ui`.

### Out of Scope
- `smoothPoints` / Catmull-Rom spline interpolation.
- Web Audio API `AnalyserNode` audio-path reactivity enhancement.
- CSS Anchor Positioning polyfill; ~91% browser coverage accepted with JS fallback.
- Separate `features/tooltip` feature.
- Any React/Vue/Canvas/WebGL inside the map layer.
- Pan inertia — prototype first, decide after (conditional task).

## Capabilities

### New Capabilities
- `map-engine`: extend existing `features/maps` with a vanilla `<map-view>` custom element; owns Panzoom, image loading, SVG overlay, marker layer, limits, and viewport state. Replaces the Leaflet `MapViewport` React island.

### Modified Capabilities
- `map-page`: replace `MapViewport` React island with `<map-view>`; extract `AudioPool` to a `client:idle` island in `MapPage.astro`.
- `sound-marker`: rewrite as vanilla DOM renderer; dispatch activation events; consume visual scale factor.
- `path-overlay`: rewrite as vanilla SVG renderer using `PathVisualState` and `vector-effect="non-scaling-stroke"`.
- `audio-engine`: refactor store to `zustand/vanilla` with a React `useStore` wrapper; preserve audio event sync and pool behavior.
- `bottom-player`: consume the vanilla store via `useStore`; no behavior change.

## Approach

Use a single feature-owned custom element for the map. The migration proceeds in two phases: first, build and validate the new implementation alongside the existing Leaflet code; second, once the new map is manually verified, remove all legacy Leaflet artifacts.

### Phase 1 — Build & Validate
Implement the custom element, vanilla renderers, and store refactor. At this stage the legacy Leaflet code still coexists in the repo but is no longer imported or rendered.

### Phase 2 — Legacy Cleanup (gated on manual validation)
After manual verification confirms the new map behaves correctly across devices and interactions, remove: `MapViewport.tsx`, `MapContext.tsx`, `viewport/types.ts`, unused Leaflet-related types/imports, `leaflet` and `@types/leaflet` from `package.json`, and all Leaflet-coupled test files and selectors. This cleanup is a **single atomic commit** — never delete legacy code before the new implementation is verified.

Panzoom applies CSS transforms to a container holding the image, SVG path layer, and DOM marker layer. Percent coordinates convert to pixels via existing shared helpers. Marker scale is compensated on `panzoomend`/`panzoomzoom` only. Audio state flows through the vanilla Zustand store, subscribed to by vanilla map code and wrapped for React islands.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/maps/` | Modified | Extend with `<map-view>` custom element (Panzoom, layers, limits); adapt `MapControls` to drive Panzoom |
| `src/features/sounds/ui/` | Modified | Vanilla `SoundMarker`, `HoverCard` kept |
| `src/features/paths/ui/` | Modified | Vanilla SVG `PathOverlay` |
| `src/shared/audio/store.ts` | Modified | `zustand/vanilla` refactor + `useStore` wrapper |
| `src/pages/[slug].astro` | Modified | `<map-view>` + `AudioPool` island composition |
| `package.json` | Modified | Add `@panzoom/panzoom`; remove Leaflet deps |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pan inertia missing in Panzoom | Med | Prototype early; implement custom friction loop if needed |
| CSS Anchor Positioning inside transformed container | Med | Prototype early; fallback to `getBoundingClientRect` + scale |
| Test rewrite scope (React → vanilla/custom element) | Med | Rewrite unit tests incrementally; keep E2E coverage |
| Browser coverage of Anchor Positioning | Low | Accept ~91%; provide JS fallback for unsupported browsers |

## Rollback Plan

Revert the migration commit and restore the previous `MapViewport` React island and Leaflet dependencies. If the change is large, gate it behind a feature flag that lets `MapPage.astro` render either `<map-view>` or the legacy island.

## Dependencies

- Refactor shared audio store to `zustand/vanilla` before map work begins.
- Install `@panzoom/panzoom` (^4.x).

## Success Criteria

- [ ] Map renders image and supports pan, wheel zoom, pinch zoom, and bounds.
- [ ] Markers are keyboard-accessible, clickable, and scale-corrected at all zoom levels.
- [ ] Paths react visually to playback via existing `PathVisualState` CSS classes.
- [ ] Audio store still syncs `AudioPool`, `AudioBottomPlayer`, and marker progress rings.
- [ ] Legacy cleanup: `MapViewport`, `MapContext`, `viewport/types`, Leaflet deps, and Leaflet-coupled tests are removed after manual validation.
- [ ] Existing E2E/map tests pass or are updated with equivalent coverage.
