# Tasks: Custom Viewport Engine

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed files | 22–26 |
| Estimated changed lines | 2100–2900 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (engine core + pure/integration tests) → PR 2 (consumer migration + React islands + E2E) → PR 3 (cleanup + final verification) |
| Delivery strategy | ask-always |
| Chain strategy | pending |
| Dominant risks | Gesture edge cases, lifecycle leaks, alignment drift, Astro navigation, stale frames |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Engine core: types, geometry, transitions, scheduler, engine + unit/integration tests | PR 1 | `pnpm vitest run tests/maps/viewport-*.test.ts` | N/A — pure DOM/unit scope; no page integration yet | `src/features/maps/lib/viewport/` + its tests; removable without touching consumers |
| 2 | Consumer migration: map-view, MapControls, MapPage, bindings, SoundMarkers island, marker adaptation, E2E | PR 2 | `pnpm vitest run tests/maps/map-view.test.ts tests/sounds/soundMarkers.test.tsx && pnpm test:e2e --grep map` | `playwright-cli` manual: drag, pinch, wheel, reset, resize, navigation, alignment | `map-view.ts`, `MapControls.tsx`, `MapPage.astro`, `mapViewBindings.ts`, `SoundMarkers.tsx`, `SoundMarker.tsx`, `HoverCard.tsx`, E2E specs |
| 3 | Cleanup + final verification: delete Panzoom, mocks, shims; lockfile; full suite; lifecycle leak evidence | PR 3 | `pnpm test && pnpm test:e2e && pnpm build && pnpm astro check` | `playwright-cli` manual: 10× navigation cycle, resize, reconnect | `panzoom-setup.ts`, Panzoom mocks, `package.json` dep entry, lockfile entry |

## Phase 1: Foundation — Pure Geometry and Types

- [x] 1.1 RED: Create `tests/maps/viewport-geometry.test.ts` with failing tests for fit/center, strict projection (undersized/oversized), focal zoom math, elastic resistance `r(d)=sign(d)*48*(1-exp(-|d|/48))`, and bounds clamping.
- [x] 1.2 GREEN: Create `src/features/maps/lib/viewport/types.ts` with `ViewportState`, `ViewportPhase`, `ViewportSnapshot`, `ViewportConfig`, `ViewportEventDetail` types. Create `geometry.ts` implementing pure functions: `computeFit`, `computeStrictBounds`, `projectFocal`, `applyResistance`, `clampScale`. All functions throw on invalid config, reject NaN/Infinity.
- [x] 1.3 RED: Create `tests/maps/viewport-transitions.test.ts` with failing tests for 180ms `cubic-bezier(0.22,1,0.36,1)` interpolation, reduced-motion immediate settlement, and interruptible snap-back targeting strict bounds only.
- [x] 1.4 GREEN: Create `src/features/maps/lib/viewport/transitions.ts` implementing `createSnapBack`, `interpolate`, `isReducedMotion`. Snap-back targets strict projection, never velocity travel.

## Phase 2: Core Engine — Scheduler and State Machine

- [x] 2.1 RED: Create `tests/maps/viewport-scheduler.test.ts` with failing tests for epoch-guarded rAF scheduling, stale-frame cancellation, and teardown cancelling pending frames.
- [x] 2.2 GREEN: Create `src/features/maps/lib/viewport/scheduler.ts` with epoch-guarded `scheduleFrame`, `cancelAll`. Each new frame cancels the previous pending one.
- [x] 2.3 RED: Create `tests/maps/viewport-engine.test.ts` with failing tests covering: state authority (one `{x,y,scale}`), phase transitions (`initializing→idle↔dragging/pinching↔animating→destroyed`), pointer capture/cancel/lost-capture, wheel normalization (pixel/line/page), elastic snap-back, snap-back interrupt, reduced-motion snap-back, resize refit, invalid input rejection, subscribe/snapshot, and destroy idempotency.
- [x] 2.4 GREEN: Create `src/features/maps/lib/viewport/engine.ts` implementing `ViewportEngine` class: constructor takes config + scene element; manages authoritative state, pointer map, gesture tracking, wheel handler, rAF commit (measurement→mutation separation), `--viewport-inverse-scale` CSS variable, typed events (`viewport-change`, `viewport-ready`, `viewport-error`), `zoomIn`/`zoomOut`/`reset`/`resize`/`destroy`/`getState`/`subscribe`. Pointer-down cancels animation; release projects to strict bounds and snaps.

## Phase 3: Integration — Custom Element, Controls, and Markers

- [ ] 3.1 Modify `src/features/maps/ui/map-view.ts`: remove all Panzoom imports/calls; create engine in `connectedCallback` (idempotent); wire `viewport-ready`→`data-ready`; wire `viewport-change`→CustomEvent; destroy engine in `disconnectedCallback`; expose `zoomIn`/`zoomOut`/`reset`/`getState`/`subscribe`.
- [ ] 3.2 Modify `src/features/maps/ui/MapControls.tsx`: rename `resetView`→`reset`; disable buttons until `data-ready`; call engine API via `<map-view>` ref.
- [ ] 3.3 Modify `src/views/map/MapPage.astro`: gate controls on `data-ready`; mount `SoundMarkers client:load` collection island targeting `markerLayer`.
- [ ] 3.4 Create `src/features/sounds/ui/SoundMarkers.tsx`: one `client:load` React island; portal into engine's `markerLayer`; render one `SoundMarker` per sound from vanilla Zustand store; derive content coordinates from `sound.position`; consume `--viewport-inverse-scale` for constant size; NO viewport state subscription, NO rAF, NO Leaflet/MapContext.
- [ ] 3.5 Adapt `src/features/sounds/ui/SoundMarker.tsx` and `HoverCard.tsx`: preserve audio selection, playback, progress, hover, accessibility, cleanup; remove marker-local progress rAF; remove any transform scheduling.
- [ ] 3.6 Modify `src/views/map/mapViewBindings.ts`: consume engine `viewport-change` with `{x,y,scale}` payload; remove Panzoom adapter references.
- [ ] 3.7 Modify `src/features/maps/lib/layers.ts`: ensure shared scene with image, SVG path, and `markerLayer` children; engine commits one `translate3d+scale` transform on scene container.
- [ ] 3.8 Write `tests/maps/map-view.test.ts`: rewrite without Panzoom mocks; assert engine lifecycle, readiness, events, API delegation.
- [ ] 3.9 Write `tests/sounds/soundMarkers.test.tsx`: assert portal mount/unmount, per-sound rendering, no viewport subscription, cleanup on unmount.
- [ ] 3.10 Update `tests/pages/map/map.spec.ts` and `map-page.ts`: adapt selectors for `.map-scene`; verify drag, pinch (where supported), wheel focal zoom, bounds, overscroll+snap-back, reset, resize, marker alignment.

## Phase 4: Cleanup and Verification

- [ ] 4.1 Delete `src/features/maps/lib/panzoom-setup.ts`.
- [ ] 4.2 Delete all Panzoom mocks, adapters, shims, and temporary diagnostics from `tests/`.
- [ ] 4.3 Remove `@panzoom/panzoom` from `package.json` and run `pnpm install` to update lockfile.
- [ ] 4.4 Remove stale CSS classes (`.map-panzoom`→`.map-scene`), obsolete events, dead types/exports.
- [ ] 4.5 Run full suite: `pnpm test && pnpm test:e2e && pnpm astro check && pnpm build`. Verify zero Panzoom in bundle (`pnpm build && grep -r panzoom dist/ || echo clean`).
- [ ] 4.6 Lifecycle leak evidence: navigate away/back 10× via `playwright-cli`; assert stable listener/observer/rAF count. Resize repeatedly; assert no duplicate observers.
- [ ] 4.7 Manual `playwright-cli` verification: drag, pinch, wheel focal zoom, elastic overscroll, snap-back, snap-back interrupt, reduced-motion snap-back, reset, resize, readiness, navigation/reconnect, layer alignment.
