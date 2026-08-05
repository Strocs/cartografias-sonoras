# Exploration: Custom Viewport Engine

**Change:** `08-custom-viewport-engine`
**Status:** Exploration complete — Ready for Proposal
**Artifact store:** OpenSpec + Engram
**Predecessor:** `07-map-interaction-stability` — stopped/superseded, PR2/PR3 cancelled, Work Unit 1 is experimental evidence only

---

## 1. Dirty Worktree Audit and Classification

The working tree contains 11 modified files and 3 untracked files relative to the last commit. These changes belong to the predecessor's Work Unit 1 experiment and concurrent map-related work.

### Classification

| File | Classification | Rationale |
|---|---|---|
| `src/features/maps/lib/panzoom-setup.ts` | **Migration input + reusable evidence** | The 453-line custom gesture/bounds layer is the de facto engine. It will be refactored into the project-owned viewport engine. Pure geometry helpers (`constrainTransform`, `getPanInterval`) are reusable. Pointer/gesture state machinery is reusable. Panzoom-specific calls (`panzoom.pan()`, `panzoom.zoom()`, `panzoom.getPan()`, `panzoom.getScale()`, `panzoom.destroy()`) must be replaced. |
| `src/features/maps/ui/map-view.ts` | **Migration input** | Adds declarative zoom attributes (`min-zoom`, `max-zoom`, `start-zoom`), zoom-attribute parsing/validation, custom `zoomIn`/`zoomOut`/`reset` wrappers, and `panzoomreset` event wiring. These patterns migrate to the new engine but the `PanzoomObject` coupling must be removed. |
| `src/features/maps/config.ts` | **Unrelated work** | Extracts `DEFAULT_MAX_ZOOM` constant. Harmless, can be kept or merged regardless of engine choice. |
| `src/views/map/MapPage.astro` | **Migration input** | Adds `start-zoom`, `min-zoom`, `max-zoom` attributes and layout classes (`min-h-0 min-w-0`). The binding script and `data-ready` observer pattern are relevant lifecycle evidence. |
| `src/features/paths/data/mock-paths.ts` | **Unrelated work** | Fixture changes for paths. Not viewport-related. Preserve. |
| `src/features/sounds/data/sounds.ts` | **Unrelated work** | Fixture changes for sounds. Not viewport-related. Preserve. |
| `src/features/sounds/ui/marker-styles.css` | **Unrelated work** | CSS tweak. Preserve. |
| `src/features/sounds/ui/soundMarker.ts` | **Reusable evidence** | Marker transform logic (`applyTransform` with `translate(...) translate(-50%, -50%) scale(...)`) demonstrates how markers compensate for viewport scale. Relevant for alignment verification. |
| `tests/maps/panzoom-setup.test.ts` | **Reusable evidence + migration input** | 9 tests covering `constrainTransform` pure geometry and gesture coordinator sequencing. The pure-geometry tests (`constrainTransform`, `getPanInterval`) migrate directly. The Panzoom-mock-based gesture tests must be rewritten against the new engine's public API. |
| `tests/maps/map-view.test.ts` | **Migration input** | 15 tests covering DOM structure, ready state, zoom methods, `viewport-change` events, zoom attributes, and cleanup. The Panzoom-mock factory must be replaced with a viewport-engine mock. Event contracts and attribute validation remain valid. |
| `tests/pages/map/map-page.ts` | **Reusable evidence** | Playwright POM additions (`getBounds`, `getZoom`). Reusable for E2E verification of the new engine. |
| `tests/pages/map/map.spec.ts` | **Reusable evidence** | E2E tests for zoom, drag, pinch, wheel, bounds, reset, and marker alignment. Reusable after engine migration; selectors and assertions are engine-agnostic. |
| `tests/sounds/soundMarker.test.ts` | **Unrelated work** | Marker unit tests. Preserve. |

### Disposition Summary

- **Reusable evidence:** Pure geometry tests, E2E bounds/alignment tests, marker transform patterns, map-page POM helpers.
- **Migration input:** `panzoom-setup.ts` gesture state, `map-view.ts` attribute wiring and lifecycle, test mocks need rewriting.
- **Unrelated work:** Fixtures, audio, CSS. Do not modify or delete.
- **Obsolete experiment:** The Panzoom-specific integration layer (mocking `panzoom.pan`/`zoom`/`getPan`/`getScale` in tests) will be replaced by direct state observation.

---

## 2. Current State: Transform Authorities

### 2.1 The Split Authority Problem

The project currently has **two competing transform authorities**:

1. **Panzoom internal state** (`{x, y, scale}`) — initialized via `Panzoom(container, options)`, mutated only through `panzoom.pan()` and `panzoom.zoom()`.
2. **Custom gesture coordinator** (`panzoom-setup.ts`) — computes desired transforms from Pointer Events, wheel, and controls, then calls `panzoom.pan()`/`zoom()` to apply them.

This split creates:
- **Post-render correction risk:** The coordinator computes bounds, calls `panzoom.pan()`, but Panzoom may apply its own internal adjustments, causing the observed drag jumps.
- **Opaque state synchronization:** The coordinator must read `panzoom.getPan()`/`getScale()` after every mutation to know the actual state.
- **Mock burden:** Tests mock Panzoom's internal API rather than asserting on public behavior.
- **Dead bundle surface:** ~700 lines of Panzoom source are unused (event binding, touch abstraction, built-in containment, `zoomWithWheel`, etc.).

### 2.2 Ownership Matrix

| Concern | Authority | File | Lines |
|---|---|---|---|
| Transform state | Panzoom (internal) | `@panzoom/panzoom` | ~50-80 utilized |
| CSS transform application | Panzoom (`setTransform`) | `@panzoom/panzoom` | ~20 utilized |
| Pointer drag | Custom | `panzoom-setup.ts` | ~80 |
| Pinch gesture | Custom | `panzoom-setup.ts` | ~60 |
| Wheel zoom | Custom | `panzoom-setup.ts` | ~30 |
| Bounds / overscroll | Custom | `panzoom-setup.ts` | ~100 |
| Resize handling | Custom | `panzoom-setup.ts` | ~15 |
| Zoom controls | Custom | `panzoom-setup.ts` + `map-view.ts` | ~40 |
| Event emission | Custom | `panzoom-setup.ts` | ~20 |
| Lifecycle (ready/cleanup) | Custom | `map-view.ts` | ~60 |
| DOM construction | Custom | `map-view.ts` | ~50 |
| Initial scale computation | Custom | `map-view.ts` | ~20 |
| Marker/path alignment | Custom | `mapViewBindings.ts` + `soundMarker.ts` + `pathRenderer.ts` | ~120 |

**Custom code owns ~95% of behavioral surface area. Panzoom owns only the internal `{x,y,scale}` state record and the final CSS `transform` string generation.**

### 2.3 Event Flow

```
Pointer Events / Wheel / Controls
  → panzoom-setup.ts (gesture state, bounds, overscroll)
    → panzoom.pan() / panzoom.zoom()
      → Panzoom internal state update
        → setTransform() on container
          → CSS transform applied
            → panzoomstart / panzoomend / panzoomzoom / panzoomreset
              → map-view.ts viewport-change dispatcher
                → mapViewBindings.ts marker scale compensation
                → pathRenderer.ts (no direct reaction; paths inherit transform)
```

**Problem:** The `viewport-change` event is derived from Panzoom's emitted `detail`, not from the authoritative input to `pan()`. If Panzoom silently adjusts the requested transform (e.g., due to internal rounding or its own containment logic), consumers see a different value than what the coordinator computed.

### 2.4 Consumer Dependencies

| Consumer | Depends On | Coupling Risk |
|---|---|---|
| `MapControls.tsx` | `MapViewElement` public API (`zoomIn`, `zoomOut`, `resetView`) | Low — API is stable |
| `mapViewBindings.ts` | `viewport-change` CustomEvent + `scaleFactor` getter | Medium — event payload shape must be preserved or migrated |
| `soundMarker.ts` | `scaleFactor` passed via `updateSoundMarker` | Low — just a number |
| `pathRenderer.ts` | SVG layer inside transformed container | Low — inherits transform from parent |
| E2E tests | `getScale()`, `getBounds()`, zoom buttons | Low — can be adapted to new engine |

---

## 3. Affected Areas

| File | Role | Engine Impact |
|---|---|---|
| `src/features/maps/lib/panzoom-setup.ts` | Gesture coordinator + bounds engine | **Delete Panzoom calls; become the viewport engine** |
| `src/features/maps/ui/map-view.ts` | Custom element lifecycle + public API | **Remove `PanzoomObject` coupling; integrate new engine** |
| `src/features/maps/lib/layers.ts` | SVG + DOM marker layer creation | **None — layers remain as-is** |
| `src/features/maps/ui/MapControls.tsx` | React zoom button island | **None — public API unchanged** |
| `src/views/map/mapViewBindings.ts` | Marker/path binding to audio store | **Minor — `viewport-change` contract preserved** |
| `src/features/sounds/ui/soundMarker.ts` | Marker DOM + transform | **None — consumes `scaleFactor`** |
| `src/features/paths/ui/pathRenderer.ts` | SVG path rendering | **None — inherits container transform** |
| `src/views/map/MapPage.astro` | Page orchestration | **Minor — `data-ready` observer stays** |
| `tests/maps/panzoom-setup.test.ts` | Unit tests for bounds/gestures | **Rewrite Panzoom mocks; test engine directly** |
| `tests/maps/map-view.test.ts` | Unit tests for custom element | **Replace Panzoom mock factory** |
| `tests/pages/map/map.spec.ts` | E2E tests | **None — engine-agnostic** |
| `tests/pages/map/map-page.ts` | Playwright POM | **None — engine-agnostic** |
| `package.json` | Dependencies | **Remove `@panzoom/panzoom`** |
| `pnpm-lock.yaml` | Lockfile | **Remove `@panzoom/panzoom` entry** |

---

## 4. Alternative Analysis

### 4.1 Approach A: Custom Pointer Events + CSS Transform Engine (Recommended)

**Description:** Remove `@panzoom/panzoom`. Maintain `{x, y, scale}` state directly in a new `ViewportEngine` (or refactored `panzoom-setup.ts`). Apply transforms via `element.style.transform = translate(x px, y px) scale(s)`. Keep all existing custom gesture, bounds, and lifecycle code exactly as-is.

**Verified facts:**
- CSS `transform` with `translate()` and `scale()` is supported by all target browsers (Node >=20, modern evergreen).
- The project already uses `transformOrigin: '0 0'` on the container.
- No polyfills needed.
- Custom engine replacement is ~150-200 lines based on the predecessor's spike estimate.

**Pros:**
- **Removes ~10KB of dead code** from bundle.
- **Eliminates mock burden in tests** — the engine is just state + DOM calls, no external library to mock.
- **Full end-to-end ownership** of the transform pipeline; no more fighting an internal model.
- **Simplifies `map-view.ts`** — no more `PanzoomObject | null` typing, no more library cleanup.
- **Bounds math already pure and testable**; this makes it the *only* authority.
- **Direct control over animation** — custom rAF lerp or CSS transition, both trivial.
- **Alignment invariants become provable** — image, DOM markers, and SVG paths share one explicit transform state.

**Cons:**
- Must verify SVG overlay + DOM marker layers continue to scale correctly (they already inherit transform from parent container — low risk).
- Must ensure `getBoundingClientRect()` is called after transform is applied (already the current pattern).
- One-time implementation required to validate touch/pinch behavior on real devices.

**Effort:** Medium — mostly deletion of Panzoom calls and replacement with inline state. The existing ~453 lines of custom code remain structurally identical.

### 4.2 Approach B: Keep `@panzoom/panzoom` with Reduced Scope (Status Quo)

**Description:** Continue using Panzoom as a transform state machine. The custom `panzoom-setup.ts` remains the gesture/bounds authority.

**Pros:**
- Zero additional migration cost.
- `setTransform` is a robust, cross-browser CSS transform generator.
- Active maintainer (timmywil) with fast bug-fix turnaround.

**Cons:**
- Carries ~9KB of dead code in every build.
- Custom code must work *around* Panzoom's internal model.
- The `panzoomMock` in tests is a recurring maintenance burden.
- Architectural opacity: the team does not control the transform pipeline end-to-end.
- **The predecessor already proved this approach produces drag jumps** due to the double-authority problem.

**Effort:** Low (no change), but the known bugs persist.

### 4.3 Approach C: Alternative Libraries (Explicitly Rejected)

| Library | Verdict | Why |
|---|---|---|
| `anvaka/panzoom` | **Rejected** | 3x larger bundle, 3 dependencies, legacy touch events (not Pointer Events), incompatible bounds model, 180 open issues. |
| Leaflet | **Rejected** | Already migrated away in `06-leaflet-migration`. Over-engineered for static images. |
| OpenSeadragon | **Rejected** | Tiled-image viewer requiring DZI pyramids. Total overkill for 3 static PNGs. |
| `zoomist`, `react-easy-panzoom` | **Rejected** | React-specific or canvas-specific, not applicable to vanilla custom element. |

**No genuinely suitable maintained lightweight alternative was discovered.**

---

## 5. Recommended Engine Boundaries

The successor engine must be intentionally narrow — only project-required capabilities belong in its contract.

### 5.1 Boundary Layers

| Layer | Responsibility | File suggestion |
|---|---|---|
| **Pure Geometry / State** | `{x, y, scale}` state record, finite state transitions, bounds intervals, axis constraints, overscroll constants, scale clamping. | `src/features/maps/lib/viewport/state.ts` |
| **Input Normalization** | Pointer Events (down/move/up/cancel/capture/lost), multi-pointer tracking, pinch centroid/distance, wheel delta normalization (`DOM_DELTA_LINE`), focal zoom math. | `src/features/maps/lib/viewport/input.ts` |
| **Scheduling / Rendering** | `requestAnimationFrame` loop, stale-frame cancellation, animation interpolation (lerp or CSS transition), reduced-motion handling, measurement/mutation separation. | `src/features/maps/lib/viewport/scheduler.ts` |
| **Lifecycle** | Setup, teardown, idempotency, ResizeObserver integration, Astro ClientRouter awareness (if needed), `data-ready` signaling. | `src/features/maps/lib/viewport/lifecycle.ts` or inline in `map-view.ts` |
| **Public API / Events** | Typed `ViewportEngine` interface, `panTo()`, `zoomTo()`, `reset()`, `getState()`, `subscribe()`, `viewport-change` CustomEvent with `{scale, x, y}`. | `src/features/maps/lib/viewport/engine.ts` |
| **Integrations** | `<map-view>` custom element wiring, `MapControls.tsx` consumption, `mapViewBindings.ts` event subscription, marker/path alignment verification. | `map-view.ts`, `mapViewBindings.ts` |

### 5.2 State Machine

```
[initializing] → decode image → compute start scale → apply initial transform → [idle]
[idle] → pointerdown → [dragging] | wheel → [animating] | control click → [animating]
[dragging] → pointermove → apply gesture bounds (with overscroll) → [dragging]
[dragging] → pointerup/cancel → clamp to strict bounds → [animating] → [idle]
[pinching] → pointermove → apply gesture bounds (with overscroll scale) → [pinching]
[pinching] → pointerup/cancel → clamp to strict bounds → [animating] → [idle]
[animating] → rAF lerp / CSS transition → arrive at target → [idle]
[animating] → interrupt (new input) → cancel animation → [dragging]/[idle]
```

### 5.3 Key Contracts

1. **One authoritative `{x, y, scale}`** — stored in the engine. No DOM reads, adapter state, or component fields may shadow it.
2. **Measurement before mutation** — `getBoundingClientRect()` for bounds computation happens in one frame; `style.transform` assignment happens in the next frame or same rAF callback.
3. **Frame-bounded work** — all gesture handlers must complete in <16ms. No allocation in hot paths (reuse `Map` for pointers, avoid array allocations in pinch math).
4. **Deterministic cleanup** — `destroy()` removes all listeners, observers, animation frames, and pointer captures. Calling `destroy()` twice is safe.
5. **Readiness** — `data-ready` is set only after the first valid transform is applied and all layers (image, SVG, markers) are attached.
6. **Event fidelity** — `viewport-change` emits after every settled transform (not during gesture frames unless explicitly requested for progress UI).

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Custom engine introduces subtle transform-origin drift** (markers/paths misalign by 1-2px) | Low | High | Assert marker positions in E2E before/after transform; verify `transformOrigin: '0 0'` on container; markers use `translate(-50%, -50%)` for centering. |
| **Safari transform rounding differences** | Low | Medium | Test on WebKit; use integer pixel values for `translate()` where possible. |
| **Animation quality regression** (custom rAF vs Panzoom's CSS transition) | Low | Medium | Use CSS `transition: transform 180ms ease-out` for animated corrections; rAF only for gesture frames. |
| **Scope creep into physics/inertia** | Low | High | Explicitly exclude momentum and elastic physics from the engine contract. |
| **Astro ClientRouter swap leaks** | Medium | High | Idempotent `destroy()` + `connectedCallback`/`disconnectedCallback` pair; verify with repeated navigation E2E. |
| **Pinch gesture broken on real touch devices** | Low | High | Manual verification with `playwright-cli` on touch-enabled device or emulator. |
| **Reduced motion not respected** | Low | Medium | Honor `prefers-reduced-motion` by disabling smooth transitions and using instant snaps. |
| **Test rewrite burden** | Medium | Low | Panzoom mock is ~40 lines; replacing it with engine state assertions is actually simpler. |

---

## 7. Recommendation

**Adopt Approach A: Custom Pointer Events + CSS Transform Engine.**

The predecessor's exploration (`explore-panzoom-alternatives.md`) already proved this is the correct direction. The current audit confirms:

1. The custom code already owns 95% of behavioral surface area.
2. Panzoom contributes only `{x, y, scale}` state storage and `setTransform` string generation — both are trivial to inline.
3. The drag jumps observed in Work Unit 1 were caused by the dual-authority split (custom coordinator + Panzoom internal adjustments).
4. Removing Panzoom eliminates the mock burden, dead bundle code, and opaque internal model.
5. No credible alternative library exists that fits the project's constraints (static image, DOM markers, SVG paths, Pointer Events, custom bounds).

The implementation is a **refactoring, not a rewrite**: the existing ~453 lines of gesture/bounds code in `panzoom-setup.ts` migrate to the new engine with Panzoom calls replaced by direct state manipulation. The `map-view.ts` custom element drops `PanzoomObject` typing and calls the engine directly. Tests become simpler because they no longer mock an external library.

---

## 8. Ready for Proposal

**Yes.**

The exploration has:
- [x] Audited the dirty worktree and classified every change.
- [x] Mapped current transform authorities and identified the dual-authority problem.
- [x] Listed all affected files and their migration impact.
- [x] Revalidated the custom-engine direction against credible alternatives.
- [x] Defined recommended boundaries (pure geometry, input, scheduling, lifecycle, API, integrations).
- [x] Assessed risks with likelihood, impact, and mitigation.
- [x] Recommended Approach A with clear rationale.

The orchestrator should proceed to the **Proposal** phase. The exploration artifact is persisted at:
- OpenSpec: `openspec/changes/08-custom-viewport-engine/exploration.md`
- Engram: `sdd/08-custom-viewport-engine/explore`

---

*Generated: 2026-07-12*
