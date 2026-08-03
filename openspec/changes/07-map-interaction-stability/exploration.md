# Exploration: 07-map-interaction-stability

## Current State

Change `06-leaflet-migration` replaced the Leaflet viewport with a vanilla `<map-view>` custom element backed by `@panzoom/panzoom`. The current working tree contains uncommitted improvements that already address some stability gaps:

- `panzoom-setup.ts` now implements `getBoundedPan` and synchronous clamping on every `panzoompan`, `panzoomzoom`, and `panzoomreset` event.
- `map-view.ts` now accepts declarative `min-zoom`, `start-zoom`, and `max-zoom` attributes and computes a fitted initial scale.
- `MapPage.astro` declares a small starting scale (`start-zoom="0.3"`, `min-zoom="0.2"`) and uses `min-w-0 min-h-0 flex-1` to prevent the RightRail from being crushed.
- New Vitest and Playwright assertions verify that an undersized map is centered and that an oversized map cannot be dragged out of the viewport.

However, four diagnosed issues remain unresolved or incomplete:

1. **Undersized-map finite movement.** The current `constrainAxis` centers the map when it is smaller than the viewport, but the constraint runs inside `panzoompan` during a drag, which can make the map feel "sticky" or jittery.
2. **Hard drag limits vs. bounded overscroll.** The current implementation clamps the transform immediately. There is no allowance for a small overscroll with a smooth snap-back, which is the typical premium map UX.
3. **Stable initial scale/position.** Panzoom is initialized, then `constrainToBounds` is called immediately. Because the visible image is already in the DOM before the first constraint, users can see a one-frame jump or flash.
4. **ClientRouter lifecycle.** `MapPage.astro` discards the `unbind()` function returned by `bindMapView`. When the user navigates via the RightRail, the old `<map-view>` is disconnected but its `audioStore.subscribe` listener leaks; a new instance subscribes on the next page, accumulating subscriptions and potentially duplicating marker/path updates.

No `astro:before-swap` or `astro:after-swap` listeners exist today.

## Affected Areas

- `src/features/maps/lib/panzoom-setup.ts` — bounds math, constraint timing, resize handling, and `destroy()` cleanup.
- `src/features/maps/ui/map-view.ts` — initial transform computation, `connectedCallback`/`disconnectedCallback` symmetry, and public viewport API.
- `src/views/map/mapViewBindings.ts` — subscription cleanup contract and marker/path lifecycle.
- `src/views/map/MapPage.astro` — inline module script binding timing and Astro view-transition lifecycle hooks.
- `tests/maps/panzoom-setup.test.ts` — unit coverage for `getBoundedPan` edge cases.
- `tests/maps/map-view.test.ts` — lifecycle and initial-state tests.
- `tests/pages/map/map.spec.ts` — E2E coverage for drag limits, wheel zoom, centering, and RightRail navigation.

## Approaches

### 1. Map bounds and undersized-map behavior

#### Option A — Hard synchronous constraints (current/WIP direction)
Clamp the pan on every `panzoompan`/`panzoomzoom`/`panzoomreset` using `getBoundedPan`.

- **Pros:** Deterministic, easy to unit-test, no overshoot, minimal code.
- **Cons:** Can fight the user's pointer during a drag; on undersized maps the map snaps to center while the finger is still moving, which feels sticky.
- **Effort:** Low

#### Option B — Bounded overscroll with snap-back
Allow the user to drag or zoom slightly past the edge during the gesture, then animate back to the bounded position on `panzoomend`.

- **Pros:** Premium feel, less fighting with Panzoom's pointer handling.
- **Cons:** Harder to test deterministically; requires a small tween/animation loop; must handle wheel zoom and pinch consistently; risk of scope creep into a full pan-physics system.
- **Effort:** Medium

#### Option C — Re-enable Panzoom `contain: 'outside'`
Use the library's built-in containment instead of custom bounds.

- **Pros:** Less custom code.
- **Cons:** This was the original implementation and was removed because it did not handle undersized maps or a fitted initial scale correctly; gives up control over the exact constraint behavior.
- **Effort:** Low, but not recommended.

**Recommendation:** Start with Option A as the baseline. Add Option B only if user testing shows the sticky feel is unacceptable, and gate it behind a small internal flag so the constraint math can be unit-tested in both modes.

### 2. Stable initial scale and position

#### Option A — Hide until ready
Keep the panzoom container invisible (`opacity: 0` or `visibility: hidden`) until the image is decoded, Panzoom is initialized, and `constrainToBounds` has run once. Then reveal it, optionally with a short CSS fade. The skeleton already covers the loading phase.

- **Pros:** Eliminates any visible jump regardless of internal timing; simple and robust.
- **Cons:** Slightly longer perceived "blank" interval; needs careful coordination with the skeleton fade.
- **Effort:** Low

#### Option B — Pre-compute transform before DOM insertion
Decode the hidden image, compute the fitted `startScale` and the centered `startX`/`startY`, and pass them directly to `Panzoom(container, { startScale, startX, startY })` before the visible image is appended. Then run a single silent constraint.

- **Pros:** No flash if dimensions are available; Panzoom starts at the correct state.
- **Cons:** Requires knowing the viewport size before decode; still needs a fallback for when the viewport changes during load.
- **Effort:** Medium

#### Option C — Inline initial CSS transform
Set `transform: translate(...) scale(...)` on the container during `_buildDom`, before Panzoom takes over.

- **Pros:** First paint already has the right transform.
- **Cons:** The inline transform will be overwritten by Panzoom immediately after; risk of double-layout; hard to keep in sync.
- **Effort:** Medium, fragile.

**Recommendation:** Combine Option A (hide until ready) with Option B (pre-compute start values). The skeleton already provides visual coverage, so hiding the real map until the constraint is stable is low-risk and high-reward.

### 3. Astro ClientRouter lifecycle and cleanup

#### Option A — External lifecycle orchestration in `MapPage.astro` (minimal change)
Store the `unbind()` function returned by `bindMapView`. Register `astro:before-swap` and `astro:after-swap` listeners once at the module level: before swap, call `unbind()` for the current map; after swap, query the new `map-view` and bind it.

- **Pros:** Keeps `<map-view>` a pure viewport engine; minimal architectural change; explicit cleanup.
- **Cons:** Inline module scripts may be cached by ClientRouter, so the guard must ensure listeners are registered only once; relies on global Astro events.
- **Effort:** Low–Medium

#### Option B — Move binding into `<map-view>`
Make the custom element subscribe to `audioStore` directly in `connectedCallback` and unsubscribe in `disconnectedCallback`. Data (`sounds`, `paths`, image dimensions) can be passed via a JSON attribute or by setting properties from the page script.

- **Pros:** Self-contained lifecycle; no external script coordination; survives any navigation pattern.
- **Cons:** Blurs the custom element's responsibility (it becomes both viewport engine and audio-visual orchestrator); harder to test in isolation; conflicts with the current architecture where bindings live in `views/map`.
- **Effort:** Medium–High

#### Option C — WeakMap-based registry
Keep bindings external, but maintain a `WeakMap<MapViewElement, () => void>` keyed by the element. A single `astro:before-swap` listener walks the registry and unbinds every tracked element.

- **Pros:** Supports multiple map views on one page; no risk of stale references because of `WeakMap`.
- **Cons:** Slightly more indirection; still needs global lifecycle hooks.
- **Effort:** Medium

**Recommendation:** Adopt Option A for this change. It preserves the existing separation of concerns and fixes the leak with the smallest surface area. Option C is a reasonable future refactor if the project ever renders multiple maps on the same page.

## Test Strategy

- **Unit — bounds:** Extend `tests/maps/panzoom-setup.test.ts` with cases for oversized on X only, oversized on Y only, exact fit, undersized on both axes, and non-1 scale compensation.
- **Unit — lifecycle:** In `tests/maps/map-view.test.ts`, assert that `disconnectedCallback` removes all listeners and observers, and that no `ResizeObserver` callbacks fire after destruction.
- **Unit — binding cleanup:** Add a spy/fake for `audioStore.subscribe` and assert the returned unsubscribe is called when the element is removed.
- **E2E — initial stability:** Take a bounding-box snapshot of `.map-panzoom` after `data-ready` is set and assert it equals the expected centered, fitted position within one pixel.
- **E2E — drag limits:** Reuse the existing aggressive-drag test and assert all four edges remain inside the viewport.
- **E2E — RightRail navigation:** Click a rail card, wait for the new page, assert the new map's markers and paths are present, navigate back, and assert the original map is rebound without console errors or leaked subscriptions (can be checked by counting marker elements or spying on store subscribers via a page.evaluate helper).

## Scope Boundaries

**In scope for `07-map-interaction-stability`:**
- Finalizing and hardening the bounds constraint math.
- Ensuring the initial map transform is stable (no visible jump).
- Cleaning up subscriptions and listeners on ClientRouter navigation.
- Adding unit and E2E coverage for the above.

**Out of scope (defer to later changes):**
- Pan inertia / momentum physics.
- Smooth overscroll snap-back animation (investigated but not implemented unless explicitly approved).
- Hover-card / anchor-positioning improvements.
- Audio engine behavior changes.
- Replacing `@panzoom/panzoom` with another library.

## Recommendation

1. Keep **hard synchronous constraints** as the default behavior; add an internal test flag only if overscroll is requested later.
2. Combine **pre-computed initial Panzoom options** with **hiding the map until the first constraint has run**, leveraging the existing skeleton.
3. Fix the ClientRouter leak by **storing `bindMapView`'s `unbind()` in `MapPage.astro` and calling it on `astro:before-swap`**, then re-binding on `astro:after-swap`.
4. Add focused unit and E2E tests for bounds edge cases, initial stability, and navigation cleanup.

## Risks

- **Panzoom event timing:** Clamping inside `panzoompan` while the user is still dragging can produce small oscillations if Panzoom fires the event multiple times per frame.
- **Module script caching:** Astro ClientRouter may not re-execute inline module scripts on every navigation; lifecycle hooks must be registered once and must find the correct element on swap.
- **Scale compensation drift:** Marker DOM transforms and SVG `vector-effect="non-scaling-stroke"` are updated on `viewport-change`, but if that event is missed during a fast swap the markers may render at the wrong size.
- **RightRail view transitions:** `transition:name` on rail thumbnails plus the map fade may compete for the main thread, making it harder to detect a one-frame initial-position jump in E2E.
- **Scope creep on overscroll:** A smooth snap-back animation can grow into a general animation/utilities change if not tightly bounded.

## Ready for Proposal

**Yes.** The orchestrator can proceed to `sdd-propose`. The proposal should ratify:

- Hard constraints as the default, with overscroll deferred.
- Hide-until-ready + pre-computed initial transform for stability.
- External lifecycle cleanup in `MapPage.astro` using Astro swap events.
- The scope boundaries listed above.
