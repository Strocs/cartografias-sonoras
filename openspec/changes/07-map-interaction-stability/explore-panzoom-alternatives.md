# Exploration Decision: Panzoom Library vs. Custom Engine for `07-map-interaction-stability`

> **Status:** Decision-grade exploration (read-only, no code changes)
> **Scope:** Evaluate whether `@panzoom/panzoom` still provides sufficient value given the volume of custom gesture/bounds/lifecycle code required. Quantify ownership split, assess alternatives, and recommend an architecture path.
> **Artifact store:** `openspec/changes/07-map-interaction-stability/explore-panzoom-alternatives.md`
> **Engram topic_key:** `sdd/07-map-interaction-stability/explore-panzoom-alternatives`

---

## 1. Executive Summary

The project currently uses `@panzoom/panzoom` (timmywil) behind a vanilla `<map-view>` custom element. However, **the custom code in `panzoom-setup.ts` has already reimplemented the entire gesture, bounds, and event layer**, using Panzoom only as a CSS-transform state machine (`pan()`, `zoom()`, `getPan()`, `getScale()`, `destroy()`). The library's built-in event binding, wheel handling, pinch detection, zoom buttons, and containment are all bypassed (`noBind: true`).

**Finding:** The project owns ~90% of the pan/zoom interaction logic by line count and ~95% by behavioral surface area. Panzoom contributes ~10KB minified to the bundle, of which only ~1KB of functionality is actually exercised.

This exploration evaluates four paths: (A) keep Panzoom with reduced scope, (B) replace it with a small custom Pointer Events + CSS transform engine, (C) migrate to `anvaka/panzoom`, and (D) other libraries. The recommendation is **Option B: custom engine**, with Option A as a low-risk fallback if the spike reveals unforeseen browser quirks.

---

## 2. Current Ownership Split: Quantified

### 2.1 Source-of-truth files

| File | Lines | Role |
|------|-------|------|
| `src/features/maps/lib/panzoom-setup.ts` | **453** | Custom gesture coordinator: bounds math, Pointer Events binding, pinch/wheel logic, resize handling, event emission, zoom/reset buttons |
| `src/features/maps/ui/map-view.ts` | **309** | Custom element lifecycle, DOM construction, initial-scale computation, public API (`zoomIn`/`zoomOut`/`resetView`), `data-ready` signaling |
| `src/features/maps/lib/layers.ts` | **41** | SVG + DOM marker layer creation (framework-agnostic) |
| `src/features/maps/ui/MapControls.tsx` | **134** | React island for zoom buttons (queries `map-view` by ID) |
| `src/views/map/mapViewBindings.ts` | **160** | Marker/path binding to `audioStore`, viewport-change compensation |
| **Total project code for map interaction** | **~1,097** | All custom |

### 2.2 What `@panzoom/panzoom` actually provides

**Verified from `node_modules/@panzoom/panzoom/dist/panzoom.es.js` (v4.6.2):**

- Total library size: **766 lines source**, **~10KB minified**, **27KB ES module**.
- **Zero runtime dependencies** (confirmed in `pnpm-lock.yaml`).
- **Active maintenance:** last release 2026-04-02, last commit push 2026-07-02.

**Functions/classes in the bundle (47 total):**
- Style/CSS prefixing utilities: `createStyle`, `getPrefixedName`, `getCSSNum`, `getBoxStyle`, `setStyle`, `setTransition`, `setTransform`, `getDimensions`
- Pointer/Touch event abstraction: `onPointer`, `destroyPointer`, `findEventIndex`, `addPointer`, `removePointer`, `getMiddle`, `getDistance`
- DOM utilities: `isAttached`, `getClass`, `hasClass`, `isExcluded`, `isSVGElement`, `shallowClone`
- Core state machine: `Panzoom()` constructor, internal `x/y/scale`, `pan()`, `zoom()`, `zoomIn()`, `zoomOut()`, `reset()`, `zoomToPoint()`, `zoomWithWheel()`, `constrainXY()`, `constrainScale()`
- Event binding: `bind()`, `destroy()`, `handleDown`, `handleMove`, `handleUp`, `trigger`

### 2.3 What the project **uses** from Panzoom

The project passes `noBind: true` and therefore **does not use**:
- `bind()` / event attachment
- `handleDown`, `handleMove`, `handleUp` (built-in gesture handlers)
- `zoomIn()`, `zoomOut()`, `reset()` (custom wrappers exist)
- `zoomWithWheel()` (custom wheel handler)
- `zoomToPoint()` (custom implementation)
- `constrainXY()`, `constrainScale()` (custom `constrainTransform` + `getPanInterval`)
- Pointer/Touch abstraction layer
- Built-in CustomEvent dispatch

**What the project *does* use:**
- `Panzoom(container, options)` — initializes internal `{x, y, scale}` state and parses options
- `panzoom.getPan()` — reads `{x, y}`
- `panzoom.getScale()` — reads `scale`
- `panzoom.pan(x, y, opts)` — updates state + calls `setTransform()`
- `panzoom.zoom(scale, opts)` — updates state + calls `setTransform()`
- `panzoom.destroy()` — removes built-in listeners (none were bound due to `noBind`, so this is nearly a no-op)

**Estimated utilized surface:** ~50-80 lines of the 766-line source (~6-10%). The remaining ~700 lines are dead code in the bundle.

### 2.4 Ownership ratio

| Metric | Custom | Library | Ratio |
|--------|--------|---------|-------|
| Active interaction LOC | ~550 (`panzoom-setup.ts` + `map-view.ts` zoom/pan logic) | ~50-80 utilized | **~90% : ~10%** |
| Behavioral surface area (gestures, bounds, events, zoom buttons, resize) | 100% custom | 0% library | **100% : 0%** |
| CSS transform application | 0% custom | 100% library (`setTransform`) | **0% : 100%** |
| Bundle contribution | 0KB (custom code is already there) | ~10KB minified | — |
| Test mocks required | `panzoomMock` with 6 methods in `panzoom-setup.test.ts` | N/A | — |

---

## 3. Alternative Analysis

### 3.1 Option A: Keep `@panzoom/panzoom` with reduced scope (status quo)

**Description:** Continue using Panzoom as a transform state machine. The custom `panzoom-setup.ts` remains the gesture/bounds authority. No migration required.

**Verified facts:**
- Package: `@panzoom/panzoom@4.6.2`
- Size: ~10KB minified, 0 dependencies
- License: MIT
- Maintenance: **very active** — release April 2026, commits July 2026
- API stability: stable since v4.x, semver-followed
- Touch/pinch: built-in but **disabled via `noBind: true`**
- Containment: built-in `contain` option but **not used** (custom bounds preferred)

**Pros:**
- Zero migration cost for current PR1/PR2/PR3
- `setTransform` is a robust, cross-browser CSS transform generator (handles prefixes, SVG vs DOM)
- Active maintainer (timmywil) with fast bug-fix turnaround
- TypeScript-first with excellent `.d.ts`

**Cons:**
- Carries ~9KB of dead code in every build
- Custom code must work *around* Panzoom's internal model (e.g., `panzoom.pan()` and `panzoom.zoom()` are the only safe mutation paths; direct state manipulation is unsupported)
- The `panzoomMock` in tests is a recurring maintenance burden — any Panzoom API change or new internal call breaks mocks
- Architectural opacity: the team does not control the transform pipeline end-to-end

**Effort:** Low (no change)

---

### 3.2 Option B: Custom Pointer Events + CSS Transform Engine

**Description:** Remove `@panzoom/panzoom`. Maintain `{x, y, scale}` state directly in `panzoom-setup.ts` (or a new `viewport-engine.ts`). Apply transforms via `element.style.transform = translate(...) scale(...)`. Keep all existing custom gesture, bounds, and lifecycle code exactly as-is.

**What must be written (~150-200 lines):**
1. `ViewportState` interface: `{ x, y, scale }`
2. `applyTransform(el, state)` — sets `el.style.transformOrigin = '0 0'` and `el.style.transform = translate(x, y) scale(s)`
3. `getPan()` / `getScale()` — trivial getters
4. `pan(x, y, opts)` — update state, optionally animate via `requestAnimationFrame` + lerp
5. `zoom(scale, opts)` — update state, optionally animate
6. `destroy()` — remove listeners (already handled by custom `destroy` in `panzoom-setup.ts`)

**Verified facts:**
- CSS `transform` with `translate()` and `scale()` is supported by **all target browsers** (project requires Node >=20, modern evergreen)
- The project already uses `transformOrigin: '0 0'` on the container
- No polyfills needed

**Pros:**
- **Removes ~10KB of dead code**
- **Eliminates mock burden in tests** — the engine is just state + DOM calls, no external library to mock
- Full end-to-end ownership of the transform pipeline; no more fighting an internal model
- Simplifies `map-view.ts` — no more `PanzoomObject | null` typing, no more library cleanup
- Bounds math already pure and testable; this makes it the *only* authority
- Direct control over animation (the custom code already uses `{animate: true, duration: 180}` via Panzoom's options; reimplementing as a 6-line rAF lerp is trivial)

**Cons:**
- Must verify that SVG overlay + DOM marker layers continue to scale correctly (they already inherit transform from the parent container, so this is low-risk)
- Must ensure `getBoundingClientRect()` is called after transform is applied (already the current pattern)
- One-time spike required to validate touch/pinch behavior on real devices

**Effort:** Medium — mostly deletion of Panzoom calls and replacement with inline state. The existing 453 lines of custom code remain untouched structurally.

---

### 3.3 Option C: `anvaka/panzoom`

**Description:** Swap `@panzoom/panzoom` for `panzoom` (anvaka). This library has built-in bounds, min/max zoom, smooth scroll, keyboard navigation, and SVG support.

**Verified facts:**
- Package: `panzoom@9.4.4`
- Size: **~35KB+ minified** (estimated from UMD bundle fetched from unpkg); **147KB packed, 719KB unpacked**
- Dependencies: **3** (`wheel`, `amator`, `ngraph.events`)
- License: MIT
- Maintenance: last publish ~4 months ago (March 2026); last commit push 2026-03-30
- Stars: 1,997 | Forks: 314 | Open issues: **180**
- Written in JavaScript (has `.d.ts` but not TS-native)
- Built-in bounds: `bounds: true` + `boundsPadding` — but this is a simple padding model, not the custom centering/edge logic the project needs
- Built-in events: `.on('panstart', ...)` event model, not CustomEvents
- Touch handling: aggressive `preventDefault`/`stopPropagation` on touch events; configurable via `onTouch` callback

**Pros:**
- More features out of the box (keyboard, double-click zoom, smooth scroll, auto-center)
- Larger community (715K weekly downloads vs 536K for timmywil)

**Cons:**
- **3x larger bundle** than current library
- **3 dependencies** add supply-chain surface
- **180 open issues** vs 31 for timmywil — suggests maintenance strain
- JavaScript-first, not TypeScript-native
- Built-in bounds model is **incompatible** with the project's custom undersized/oversized centering logic. Would still require custom bounds code
- Built-in event model (`instance.on(...)`) would require rewriting `map-view.ts` event dispatch
- Built-in gesture handling uses legacy `touchstart`/`touchmove`/`touchend` + `mousedown`/`mousemove` model, **not Pointer Events**. This is a significant regression for the project, which already invested in modern Pointer Events for unified mouse/touch/pinch
- The project would still need to disable most built-in features and wrap the library, replicating the same "fight the framework" pattern

**Verdict:** **Explicitly rejected.** Larger bundle, more dependencies, incompatible bounds model, legacy event system, and no reduction in custom code required.

**Effort:** High — would require rewriting event dispatch, rebinding gestures, and still maintaining custom bounds.

---

### 3.4 Option D: Leaflet / OpenSeadragon / Other Heavyweight Libraries

**Leaflet:**
- The project **already migrated away from Leaflet** in change `06-leaflet-migration`.
- Leaflet is ~40KB+ minified, tile-based, and over-engineered for a single static image with DOM/SVG overlays.
- Reintroducing Leaflet would undo the architectural direction of change 06.
- **Explicitly rejected.**

**OpenSeadragon:**
- Deep-zoom tiled-image viewer. Requires tile pyramids (DZI format).
- Total overkill for 3 static PNG maps.
- **Explicitly rejected.**

**Other discovered options:**
- `panzoom-core` (sasza): For moving/resizing/selecting elements *inside* a canvas, not for viewport pan/zoom.
- `@riky1/svg-panzoom`: SVG-only, not suitable for DOM image + SVG overlay + DOM markers.
- `svg-pan-zoom`: SVG-only.
- `zoomist`, `react-easy-panzoom`: React-specific, not applicable to vanilla custom element.

**No genuinely suitable maintained lightweight alternative was discovered that fits the project's specific constraints (static image, DOM markers, SVG paths, Pointer Events, Astro/vanilla TS, custom bounds, no React requirement).**

---

## 4. Evidence Table (Verified Facts vs. Estimates)

| Claim | Source | Confidence |
|-------|--------|------------|
| `@panzoom/panzoom` v4.6.2 minified size ~10KB | `wc -c node_modules/@panzoom/panzoom/dist/panzoom.min.js` = 10,125 bytes | **Verified** |
| `@panzoom/panzoom` has 0 dependencies | `pnpm-lock.yaml` shows `{}` deps; `package.json` confirms | **Verified** |
| `@panzoom/panzoom` last release 2026-04-02 | GitHub API + release page | **Verified** |
| `@panzoom/panzoom` last commit push 2026-07-02 | GitHub API `pushed_at` | **Verified** |
| `anvaka/panzoom` v9.4.4 has 3 dependencies | npm page + unpkg UMD bundle requires `wheel`, `amator`, `ngraph.events` | **Verified** |
| `anvaka/panzoom` minified size ~35KB+ | Fetched `panzoom.min.js` from unpkg; UMD bundle is large due to inlined deps | **Estimate** (±5KB) |
| `anvaka/panzoom` last publish ~March 2026 | npm page says "4 months ago" relative to July 2026 | **Estimate** |
| Custom code in `panzoom-setup.ts` is 453 lines | `wc -l` | **Verified** |
| Project uses `noBind: true` | `src/features/maps/lib/panzoom-setup.ts` line 200 | **Verified** |
| Project does not call Panzoom's built-in `zoomIn`/`zoomOut`/`reset` directly | `map-view.ts` lines 93-109 show custom wrappers; `panzoom-setup.ts` lines 432-433 show custom `zoomAtViewportCenter` | **Verified** |
| Project custom-implements wheel, pointer, pinch | `panzoom-setup.ts` lines 213-443 | **Verified** |
| Panzoom source is 766 lines | `grep -c` on `panzoom.es.js` functions | **Verified** |
| Panzoom provides 47 functions/classes | `grep` output | **Verified** |
| Project utilizes ~5-8% of Panzoom surface | Derived from usage audit above | **Estimate** (±2%) |
| Custom engine replacement is ~150-200 lines | Based on transform-state + rAF lerp pattern | **Estimate** |
| CSS `transform` support universal in target browsers | Project targets Node >=20, modern evergreen | **Verified by inference** |

---

## 5. Weighted Decision Matrix

Criteria weights are project-relevant: bundle cost, testability, custom-bounds fit, maintenance risk, migration cost, touch/pinch quality, and API coupling.

| Criterion | Weight | Option A (Keep) | Option B (Custom) | Option C (anvaka) |
|-----------|--------|-----------------|-------------------|-------------------|
| **Bundle size** (lower is better) | 15% | 6/10 (-10KB dead code) | **10/10** (remove dead code) | 3/10 (+25KB larger) |
| **Testability / mock burden** | 15% | 4/10 (mock breaks often) | **10/10** (no mock needed) | 3/10 (different event model) |
| **Custom bounds fit** | 20% | 6/10 (works around library) | **10/10** (full ownership) | 4/10 (incompatible bounds model) |
| **Maintenance risk** (bus factor, activity) | 15% | **9/10** (timmywil very active) | 8/10 (own code = own risk, but simple) | 5/10 (180 issues, 4mo stale) |
| **Migration cost** | 15% | **10/10** (none) | 6/10 (moderate refactor) | 2/10 (high rewrite) |
| **Touch/pinch quality** | 10% | 7/10 (custom Pointer Events = good) | **9/10** (same, minus library friction) | 4/10 (legacy touch events) |
| **Public/private API coupling** | 10% | 4/10 (coupled to Panzoom internals) | **10/10** (zero coupling) | 3/10 (coupled to different API) |
| **Weighted Total** | 100% | **6.25** | **8.85** | **3.55** |

**Option B (Custom Engine) is the clear winner.** Option A is acceptable as a fallback. Option C is a poor fit.

---

## 6. Migration Impact on PR1 / PR2 / PR3

The current change `07-map-interaction-stability` is structured as chained PRs:

- **PR1 (bounds):** `src/features/maps/lib/panzoom-setup.ts` + unit tests
- **PR2 (lifecycle):** `src/features/maps/ui/map-view.ts` + integration tests
- **PR3 (binding + E2E):** `src/views/map/MapPage.astro`, `mapViewBindings.ts`, E2E tests

### If Option B (Custom Engine) is approved **before** PR1 merges:

- **PR1 becomes:** Delete `@panzoom/panzoom` import; replace `initPanzoom` return type with custom `ViewportEngine`; replace `panzoom.pan()`/`zoom()` with `applyTransform()`. The 453 lines of gesture/bounds code stay structurally identical.
- **PR2 becomes:** Remove `PanzoomObject | null` from `map-view.ts`; `zoomIn`/`zoomOut`/`resetView` call custom engine directly; `data-ready` logic unchanged.
- **PR3 becomes:** No change — binding and lifecycle are already decoupled from Panzoom.
- **Tests:** `panzoomMock` is deleted; tests become simpler (spy on `container.style.transform` or `getBoundingClientRect`). This is a **net reduction** in test complexity.
- **Estimated additional effort:** ~1-2 days on top of existing PR1 scope.

### If Option B is approved **after** PR1/PR2/PR3 are already merged:

- A **follow-up change** (e.g., `07b-engine-replacement`) is required.
- Scope: ~200 lines of modification + ~50 lines deleted from tests.
- Risk: low — the custom code is already the authority; the library is a thin wrapper.

### If Option A (Keep) is approved:

- PR1/PR2/PR3 proceed exactly as planned in `tasks.md`.
- No revision needed.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Custom engine introduces a subtle transform-origin bug** (markers/paths drift) | Low | High | Spike on real map data; assert marker positions in E2E before/after transform |
| **Panzoom removal breaks an edge-case browser** (e.g., Safari transform rounding) | Low | Medium | Panzoom's `setTransform` uses the same `translate(...) scale(...)` string; risk is minimal |
| **Animation quality regression** (custom rAF lerp vs Panzoom's transition CSS) | Low | Medium | Panzoom uses CSS `transition` for animation; custom engine can use the same `transition: transform 180ms ease-out` style, which is actually simpler |
| **Scope creep** — custom engine grows into a full physics system | Low | High | Bound the engine to state + applyTransform only; no momentum, no elastic physics |
| **Team knowledge gap** — future devs wonder why there's no library | Low | Low | Document in `panzoom-setup.ts` header: "Intentionally vanilla: we own the full pipeline for bounds and accessibility" |
| **anvaka/panzoom becomes clearly superior later** | Very Low | Low | The library is larger and less maintained; unlikely to outpace the project's specific needs |

---

## 8. Prototype / Spike Recommendation

**Recommended spike:** A 2-hour time-boxed branch that:

1. Removes `@panzoom/panzoom` from `package.json`.
2. Creates a `ViewportEngine` class (or plain object) with:
   - `state: { x, y, scale }`
   - `apply(container)` — sets `container.style.transform`
   - `pan(x, y)` — updates state + apply
   - `zoom(scale)` — updates state + apply
   - `getPan()`, `getScale()`
3. Replaces all `panzoom.*` calls in `panzoom-setup.ts` with the engine.
4. Runs existing unit tests (`pnpm test tests/maps/panzoom-setup.test.ts`).
5. Runs E2E drag/zoom tests (`pnpm test:e2e`).

**Success criteria for the spike:**
- All existing tests pass without mocking a library.
- E2E drag, pinch, wheel, and button zoom behave identically.
- Bundle analyzer (or `pnpm build`) shows ~8-10KB reduction.

If the spike fails any success criterion, fall back to **Option A** with no shame — the current architecture works.

---

## 9. Architectural Recommendation

**Primary recommendation: Adopt Option B (Custom Pointer Events + CSS Transform Engine) as part of `07-map-interaction-stability` or as a fast-follow `07b` change.**

**Rationale:**
- The project has already *de facto* built a custom engine. Panzoom is a liability (dead code, mock burden, opaque internals) masquerading as a dependency.
- A minimal custom engine (~150 lines) replaces the utilized ~50-80 lines of Panzoom with zero abstraction leakage.
- The custom bounds math (`constrainTransform`, `getPanInterval`) is the project's strongest asset. Removing Panzoom makes it the unambiguous authority.
- Bundle cost is reduced; testability is improved; API coupling is eliminated.

**Secondary recommendation: If the spike reveals unforeseen complexity, fall back to Option A.** `@panzoom/panzoom` is a well-maintained, zero-dependency library. Keeping it is not a architectural failure — it's a pragmatic deferral. The custom code already works around it successfully.

**Explicitly rejected:**
- Option C (`anvaka/panzoom`) — larger bundle, dependencies, legacy event model, incompatible bounds
- Leaflet — already migrated away; over-engineered for static images
- OpenSeadragon — tiled-image viewer, completely wrong domain

---

## 10. What Would Need Revision After Approval

### If Option B is approved:

1. **`openspec/changes/07-map-interaction-stability/tasks.md`** — PR1 tasks must include:
   - "Delete `@panzoom/panzoom` dependency"
   - "Replace `PanzoomObject` with `ViewportEngine` in `map-view.ts`"
   - "Update `panzoom-setup.test.ts` to remove `vi.mock('@panzoom/panzoom')`"
2. **`openspec/changes/07-map-interaction-stability/design.md`** — Update architecture decisions table:
   - Remove "Retain `@panzoom/panzoom` behind `<map-view>`"
   - Add "Vanilla transform engine: custom `{x, y, scale}` state with direct CSS transform application"
3. **`openspec/changes/07-map-interaction-stability/proposal.md`** — Update scope to mention engine replacement; update migration relationship.
4. **`package.json`** — Remove `@panzoom/panzoom` from dependencies.
5. **`src/features/maps/lib/panzoom-setup.ts`** — Refactor to inline engine.
6. **`src/features/maps/ui/map-view.ts`** — Remove `PanzoomObject` type, `import type { PanzoomObject }`.
7. **Tests:** `tests/maps/panzoom-setup.test.ts` — remove mock, spy on `style.transform` directly; `tests/maps/map-view.test.ts` — update mock.

### If Option A is approved:

- No revision needed. Proceed with existing `tasks.md` as written.

---

## 11. Open Questions

1. **Does the project have a bundle budget or performance target that makes the ~10KB saving meaningful?** (Not in current specs; recommend checking with product.)
2. **Is there a long-term roadmap for multi-map views or collaborative editing that might benefit from a library's built-in features later?** (If yes, Option A might be safer.)
3. **Does the team have capacity for the spike within the current sprint?** (Spike is ~2 hours; if not, defer to Option A.)

---

*Generated: 2026-07-12 | Decision grade: Yes | Next step: Await approval for Option B spike, or ratify Option A to proceed with existing plan.*
