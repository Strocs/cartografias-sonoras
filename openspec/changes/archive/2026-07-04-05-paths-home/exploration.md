# Exploration: 05-paths-home

## Current State

### Paths
- Domain, mock data, and UI are scaffolded under `src/features/paths/`.
- `PathOverlay.tsx` renders a decorative dashed SVG path layer inside Leaflet's `pathPane`.
- Mock paths are filtered by `mapId` in `src/pages/[slug].astro` and passed into `MapPage.astro` → `MapCanvas.tsx` → `SoundTour.tsx` → `PathOverlay.tsx`.
- `MapViewport.tsx` already creates the `pathPane` and exposes `{ map, ready, width, height }` via `MapContext`.
- An E2E test already asserts that the correct number of dashed paths is rendered for the active map.
- There are **no unit tests** for `PathOverlay.tsx` or `SoundTour.tsx`.

### Home page / View Transitions
- `src/pages/index.astro` is a static Astro page that renders `MapCard.astro` for each map.
- `src/layouts/Layout.astro` has **no** `ClientRouter` / View Transitions setup.
- No `transition:name` or `transition:animate` directives exist anywhere in the codebase.
- Astro config is `output: 'static'` and does not declare any view-transition settings.

### Bundle baseline (latest `dist/_astro`)
- `MapCanvas.*.js`: ~156 KB (the main map island chunk).
- `client.*.js`: ~176 KB.
- `AudioBottomPlayer.*.js`: ~5 KB.
- No view-transition runtime is currently shipped.

### Tooling constraints
- ESLint blocks feature→feature imports; `views/` may compose features (already used by `SoundTour` and `MapCanvas`).
- TypeScript strict mode is enabled; `tsc --noEmit` currently passes.
- Vitest + Testing Library suite passes (126 tests).
- `no-use-effect` skill is active; `PathOverlay` already uses the approved `useMountEffect` helper.

## Gap Analysis

1. **Path composition is already wired** — the missing piece is verification/hardening, not plumbing.
2. **No dedicated unit test** covers `PathOverlay` rendering the correct SVG attributes or reacting to map events.
3. **No E2E assertion** verifies that path endpoints visually align with sound markers.
4. **View Transitions are not enabled** in the shared layout.
5. **No morphing targets** (`transition:name`) are defined on `MapCard` / map page heading.
6. **E2E harness risk**: running Playwright from source files that import `mock-maps.ts` (which imports PNG assets) currently throws a `SyntaxError` on the PNG file in this environment, blocking any new E2E assertions until the spec files stop importing asset-bearing source modules (or a transform is configured).

## Affected Areas

- `src/features/paths/ui/PathOverlay.tsx` — decorative path layer; may need event/cleanup tests.
- `src/views/sound-tour/SoundTour.tsx` — already composes `PathOverlay`; candidate for a focused unit test.
- `src/views/map/MapCanvas.tsx` — passes `paths` down; already covered by mock-based tests.
- `src/layouts/Layout.astro` — needs `ClientRouter` from `astro:transitions`.
- `src/features/maps/ui/MapCard.astro` — needs `transition:name` on title/image for morphing.
- `src/views/map/MapPage.astro` — needs matching `transition:name` on the map title heading.
- `tests/paths/` — new unit-test directory (does not exist).
- `tests/pages/home/home.spec.ts` and `tests/pages/map/map.spec.ts` — should add navigation/transition assertions once the PNG-import issue is resolved.

## Approaches

### 1. Keep current path composition, add focused tests + Astro ClientRouter
- **Description**: Leave `PathOverlay` inside `SoundTour` inside the single `client:only` `MapCanvas` island. Add unit tests for `PathOverlay` and `SoundTour`. Enable Astro's `ClientRouter` in `Layout.astro`, then add `transition:name={`map-title-${map.slug}`}` on `MapCard` title and on `MapPage.astro`'s heading, plus `transition:animate="fade"` on the main containers.
- **Pros**: Minimal code churn; respects existing Screaming Architecture; uses Astro's built-in View Transitions support; keeps MapContext sharing intact.
- **Cons**: `ClientRouter` adds a small JS runtime to every page; map island re-initializes on each navigation (acceptable for MVP).
- **Effort**: Low

### 2. Refactor `PathOverlay` into a separate Astro island
- **Description**: Extract `PathOverlay` from `SoundTour` and render it as a second `client:only` island next to `MapCanvas`.
- **Pros**: Conceptually separates the decorative path layer from the sound-marker tour.
- **Cons**: Breaks `MapContext` sharing (each island is an independent React tree) unless `MapContext` is lifted to a global store — a large refactor. Also ships a second React island, increasing bundle complexity.
- **Effort**: High

### 3. Manual native `document.startViewTransition` instead of Astro ClientRouter
- **Description**: Write a small inline script that intercepts link clicks and calls the native View Transitions API directly.
- **Pros**: Full control over animation; no Astro router runtime.
- **Cons**: Reinvents what Astro already provides; loses fallback animations for unsupported browsers; harder to maintain.
- **Effort**: Medium

## Recommendation

Use **Approach 1**.

- Path composition is already correct: `PathOverlay` must live inside the same `client:only` island as `MapViewport` so it can consume `useMap()`. Moving it out would force a major `MapContext` refactor.
- Astro's `ClientRouter` is the intended way to enable View Transitions in Astro 7 and provides native morphing where supported plus CSS fallbacks elsewhere.
- The change is small, stays within the 400-line review budget, and can be delivered in a single PR.

## Risks

- **E2E harness currently broken for source imports that touch PNG assets**. Any new Playwright assertions must either avoid importing `mock-maps.ts` or the harness must be fixed first.
- **View Transitions may cause the `client:only` map island to remount** on every navigation, which could produce a brief flash or re-fetch of audio assets. Monitor Lighthouse map-page performance (threshold 80).
- **Home page currently ships zero JS**; adding `ClientRouter` adds a runtime that could nudge the Lighthouse performance score. Keep an eye on the 95 threshold for static pages.
- **`transition:name` IDs must be stable across pages**; using `map.slug` is safe because it is URL-stable.

## Recommended Implementation Order

1. **Harden paths**:
   - Add `tests/paths/PathOverlay.test.tsx` with mocked `MapContext`/`Leaflet` to assert SVG path count and attributes.
   - Add `tests/views/SoundTour.test.tsx` to assert it passes `paths` to `PathOverlay` and renders `SoundMarker`s.
   - Optionally add an E2E visual assertion that path endpoints overlap sound-marker positions (blocked until PNG-import issue is fixed).
2. **Enable View Transitions**:
   - Import and add `<ClientRouter />` to `src/layouts/Layout.astro` `<head>`.
   - Add `transition:animate="fade"` to the `<main>` elements of `index.astro` and `MapPage.astro`.
   - Add `transition:name={`map-title-${map.slug}`}` to the title in `MapCard.astro` and to the `h2` title in `MapPage.astro`.
3. **Verify**:
   - `pnpm test`, `pnpm typecheck`, `pnpm build`.
   - Run home→map navigation in the browser and confirm the title morphs.
   - Re-run Lighthouse home + map audits.

## Estimated Changed Lines

- Path tests: ~80–120 lines
- View Transitions wiring: ~15–25 lines across `Layout.astro`, `MapCard.astro`, `MapPage.astro`
- Optional `PathOverlay` tweaks (cleanup/robustness): ~10–20 lines
- **Total forecast: ~120–170 changed lines** — well under the 800-line budget.

## Ready for Proposal

**Yes.** The scope is clear, the path plumbing is already in place, and the View Transitions work is a small, self-contained addition. The orchestrator should tell the user that the main gap is testing + transitions, not path composition, and that the existing E2E harness needs a quick fix before new navigation assertions can be added.
