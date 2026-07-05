# Proposal: Path Engine, Sound-Aware Path Visuals & Home View Transitions

## Intent

Make the perceptual paths between sounds meaningful: show where sound is flowing, and smooth the jump between the home grid and the map page.

## Scope

### In Scope
- Path geometry engine for straight-segment polylines from percentage `(x,y)` points.
- Sound-aware visual states in `PathOverlay` driven by `useAudioStore`.
- Astro View Transitions wiring between home and map pages.
- Unit tests for the engine, `PathOverlay`, and `SoundTour`.
- `prefers-reduced-motion` fallback to static solid lines.

### Out of Scope
- Path click/hover interactions.
- Replacing mock data with real content.
- Audio engine changes.
- Leaflet replacement.

## Capabilities

> Contract with the specs phase: each new capability becomes a spec; each modified capability gets a delta spec.

### New Capabilities
- `path-engine`: Convert `Point[]` percentages into straight-segment SVG polylines, including reversible geometry for directional pulses.
- `path-overlay-states`: Render paths in three states: idle (dim solid line), single-sound playing (1.5s luminous pulse along the full polyline from the active endpoint), and both-sounds playing (steady high-intensity glow).
- `view-transitions-home-map`: Enable Astro `ClientRouter` with title morphing (active map) and thumbnail morphing (other maps into RightRail), plus fade animation between home and map pages.

### Modified Capabilities
- `map-page`: Add `transition:name` to the map title and `transition:animate="fade"` to the main container so the morphing contract is visible to Astro.

## Approach

Keep `PathOverlay` inside the existing `client:only` `MapCanvas` island so it can consume `MapContext` and share the Leaflet pane. Build a pure, React/Leaflet-free `src/features/paths/lib/pathEngine.ts` that produces straight-segment `d` strings and reversed variants.

Use **dependency inversion via props**: `PathOverlay` stays in `features/paths/` and remains a pure presentational component — it receives computed visual states as props, never imports the audio store. The composition layer `SoundTour` (in `views/sound-tour/`) subscribes to `useAudioStore`, classifies each path's state (idle / single-sound-pulse / both-sounds-glow), and passes `pathStates` down. This keeps `features/paths/` decoupled from the audio engine and from `features/sounds/`.

`PathOverlay` will:
- Accept `pathStates: PathVisualState[]` computed by `SoundTour`.
- Render solid SVG polylines using CSS transitions for opacity/glow changes.
- Animate the single-sound pulse with SVG `<animateMotion>` traveling the full polyline from the active endpoint at a fixed ~1.5s loop.
- Respect `prefers-reduced-motion` by disabling the pulse and keeping static solid lines.

For View Transitions:
- Add `<ClientRouter />` to `Layout.astro`.
- Apply `transition:animate="fade"` to `<main>` containers in `index.astro` and `MapPage.astro` for smooth crossfade.
- **Title morphing (active map)**: `transition:name={`map-title-${map.slug}`}` on `MapCard.astro`'s `<h2>` and `MapPage.astro`'s `<h2>`. Both are static server-rendered HTML — morphing is feasible.
- **Thumbnail morphing (other maps → RightRail)**: `transition:name={`map-thumb-${map.slug}`}` on `MapCard.astro`'s `<img>` and `RightRail.astro`'s `<img>`. Home MapCards for maps B and C morph into the RightRail sidebar thumbnails as the user navigates to map A. Both are static `<img>` tags — morphing is feasible.
- **No image morphing for the active map**: The Leaflet viewport renders the map image via `L.imageOverlay()` in JavaScript — the element does not exist at page-load snapshot time, so it cannot participate in a View Transition morph.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/paths/lib/pathEngine.ts` | New | Straight-segment polyline engine; reversible paths. |
| `src/features/paths/domain/PathVisualState.ts` | New | Type definitions for idle/single-pulse/both-glow states. |
| `src/features/paths/ui/PathOverlay.tsx` | Refactor | Presentational — receives `pathStates` as props, renders solid SVG + SMIL pulse. |
| `src/views/sound-tour/SoundTour.tsx` | Modified | Subscribes to `useAudioStore`, computes `pathStates`, passes to `PathOverlay`. |
| `src/styles/global.css` | New | Path state transitions, pulse keyframes, reduced-motion guard. |
| `src/layouts/Layout.astro` | Modified | Add `<ClientRouter />`. |
| `src/features/maps/ui/MapCard.astro` | Modified | Add `transition:name` on title and image. |
| `src/features/maps/ui/RightRail.astro` | Modified | Add `transition:name` on sidebar images. |
| `src/views/map/MapPage.astro` | Modified | Add `transition:name` to `h2` and `transition:animate` to `main`. |
| `src/pages/index.astro` | Modified | Add `transition:animate` to `main`. |
| `tests/paths/engine.test.ts` | New | Engine unit tests. |
| `tests/paths/PathOverlay.test.tsx` | New | Visual-state tests (pure component, no store mock needed). |
| `tests/views/SoundTour.test.tsx` | New | Composition test with store integration. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SMIL/animation support gaps | Low | CSS `prefers-reduced-motion` guard; fallback to static solid lines. |
| Per-path store subscriptions hurt performance | Med | Use per-sound selectors; avoid full-store reads. |
| View Transitions remount the `client:only` map island | Med | Acceptable for MVP; monitor Lighthouse map score ≥80. |
| E2E PNG-import harness stays broken | Med | Defer new E2E assertions until fixed. |

## Rollback Plan

1. Revert `PathOverlay.tsx` to the previous dashed-line renderer.
2. Remove `ClientRouter` and all `transition:*` directives.
3. Delete `pathEngine.ts`, the new tests, and the global path keyframes.

## Constraints

- **Atomic islands**: Client components must be as small and focused as possible. If two components need shared state but their common composer is a static `.astro` file, use a Zustand store — never pass state through Astro props across island boundaries.
- **No feature→feature imports**: `features/paths/` must not import from `features/sounds/`. Shared state flows through `views/` (composition layer) or `@shared/lib/` (stores).

## Dependencies

- `useAudioStore` exposes per-sound `playing` state (already implemented).
- `MapContext` provides `{ map, ready, width, height }` (already implemented).
- Astro 7+ built-in View Transitions support.

## Success Criteria

- [ ] Path engine unit tests pass.
- [ ] `PathOverlay` renders idle, single-sound pulse, and both-sounds states.
- [ ] Pulse follows the complete polyline from the active endpoint.
- [ ] Reduced motion shows static solid lines.
- [ ] Home↔map: active map title morphs; inactive map thumbnails morph into RightRail; fallback fade in unsupported browsers.
- [ ] `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.
