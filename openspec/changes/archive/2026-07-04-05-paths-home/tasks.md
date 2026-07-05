# Tasks: 05-paths-home — Path Visual States & View Transitions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~170 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Domain & Geometry

- [x] 1.1 Create `src/features/paths/domain/PathVisualState.ts` — discriminated union: `idle`, `single`, `both` variants with `pathId`, `points`, optional `activeEndpoint`
- [x] 1.2 Create `src/features/paths/lib/pathEngine.ts` — `buildPolylineD(points, w, h)` returns straight-segment SVG `d` string; `reversePoints(points)` returns reversed copy
- [x] 1.3 Create `tests/paths/engine.test.ts` — unit tests: 0/1/2/N points, percentage→pixel conversion, reverse immutability, deterministic output

## Phase 2: Path Overlay Visual States

- [x] 2.1 Update `src/styles/global.css` — add `.path-base`, `.path-idle`, `.path-single`, `.path-both`, `.path-pulse` classes + `@media (prefers-reduced-motion: reduce)` guard
- [x] 2.2 Refactor `src/features/paths/ui/PathOverlay.tsx` — accept `pathStates: PathVisualState[]`, render straight segments, apply state-dependent CSS classes, add `<circle>` + `<animateMotion>` with `<mpath>` for `single` variant, use `keyPoints="1;0"` for reversed direction
- [x] 2.3 Create `tests/paths/PathOverlay.test.tsx` — verifies correct CSS class per variant, animateMotion present for `single`, omitted for `idle`/`both`

## Phase 3: SoundTour Integration

- [x] 3.1 Modify `src/views/sound-tour/SoundTour.tsx` — subscribe to `useAudioStore` selector `s.activeSounds`, compute `PathVisualState[]` from `paths` + sound status, pass to `<PathOverlay pathStates={...}>`
- [x] 3.2 Create `tests/views/SoundTour.test.tsx` — mock `useAudioStore`, verify correct state for each sound-status combination (idle/idle, playing/idle, idle/playing, playing/playing)

## Phase 4: View Transitions

- [x] 4.1 Modify `src/layouts/Layout.astro` — import and render `<ClientRouter />` from `astro:transitions/client` in `<head>`
- [x] 4.2 Modify `src/features/maps/ui/MapCard.astro` — add `transition:name={`map-title-${map.slug}`}` on `<h2>` and `transition:name={`map-thumb-${map.slug}`}` on `<Picture>`/`<img>`
- [x] 4.3 Modify `src/features/maps/ui/RightRail.astro` — add `transition:name={`map-thumb-${map.slug}`}` on each `<img>`
- [x] 4.4 Modify `src/views/map/MapPage.astro` — add `transition:name={`map-title-${map.slug}`}` on `<h2>`, `transition:animate="fade"` on `<main>`
- [x] 4.5 Modify `src/pages/index.astro` — add `transition:animate="fade"` on `<main>` container

## Implementation Order

Phase 1 (domain types + pure engine) must come first — both PathOverlay and SoundTour depend on `PathVisualState`. Phase 2 (PathOverlay refactor) and Phase 3 (SoundTour integration) depend on Phase 1. Phase 4 (View Transitions) is completely independent — can be done at any point or in parallel. Tests accompany their corresponding implementation tasks per work-unit-commits pattern.
