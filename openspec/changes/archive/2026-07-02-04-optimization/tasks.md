# Tasks: 04-optimization — Map Page Optimization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~630 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: config & quality gates | PR 1 | No behavior changes. ESLint rules, coverage, E2E webServer, lighthouse thresholds. |
| 2 | Islands refactor: static shell | PR 2 | RightRail.astro, MapPage.astro/tsx, update [slug].astro, delete ActiveMapLayout. |
| 3 | Motion → CSS: replace Framer Motion | PR 3 | useSmoothProgressRing, SoundMarker, AudioBottomPlayer, MapViewport cleanup. |
| 4 | Image optimization + Lighthouse | PR 4 | Sharp config, MapCard.astro Image + srcset + lazy, verify thresholds. |

## Phase 1: Foundation — Config & Quality Gates

- [x] 1.1 Add `@vitest/coverage-v8` to devDependencies in `package.json`; add `test:coverage` script
- [x] 1.2 Add `coverage` block with v8 provider and ≥70% thresholds to `vitest.config.ts`
- [x] 1.3 Add `webServer` block with `reuseExistingServer: !CI` to `playwright.config.ts`
- [x] 1.4 Raise Lighthouse thresholds in `tests/performance/lighthouse.lh.ts` to ≥95 all categories
- [x] 1.5 Add `no-restricted-imports` with `../(sounds|paths|sound-pieces|maps)/*` patterns to `eslint.config.mjs`

## Phase 2: Islands Refactor — Static Shell Extraction

- [x] 2.1 Create `src/features/maps/ui/RightRail.astro` — extract RightRail.tsx to static Astro markup with Tailwind
- [x] 2.2 Create `src/views/map/MapPage.astro` — static shell with Layout, Navigation, title, RightRail; AudioBottomPlayer as `client:idle`
- [x] 2.3 Create `src/views/map/MapPage.tsx` — thin React composer wrapping MapViewport + SoundTour + MapControls + AudioPool; `client:only`
- [x] 2.4 Update `src/pages/[slug].astro` — import MapPage instead of ActiveMapLayout; render MapPage.astro with data
- [x] 2.5 Delete `src/features/maps/ui/ActiveMapLayout.tsx` and `src/features/maps/ui/RightRail.tsx`

## Phase 3: Motion → CSS — Replace Framer Motion

- [x] 3.1 Create `src/shared/lib/motion/useSmoothProgressRing.ts` — ref-based rAF hook that writes strokeDashoffset directly to SVG circle ref; no MotionValue dependency
- [x] 3.2 Update `src/features/sounds/ui/SoundMarker.tsx` — replace AnimatePresence/motion/useTransform with CSS transitions + useSmoothProgressRing; keep DivIcon portal intact
- [x] 3.3 Update `src/features/sound-pieces/ui/AudioBottomPlayer.tsx` — replace motion.div entrance with CSS transform/opacity; remove useMemo; add `client:idle` directive in MapPage.astro
- [x] 3.4 Update `src/shared/lib/viewport/MapViewport.tsx` — remove useCallback from initContainer (React 19 Compiler handles optimization)
- [x] 3.5 Verify `src/features/sounds/ui/HoverCard.tsx` — confirm no Framer Motion imports; already CSS-only
- [x] 3.6 Verify `src/features/paths/ui/PathOverlay.tsx` — confirm no useCallback or Framer Motion; leave as-is
- [x] 3.7 Delete `src/shared/hooks/useSmoothTimedValue.ts` — replaced by useSmoothProgressRing

## Phase 4: Image Optimization + Lighthouse

- [x] 4.1 Add `image: { service: { entrypoint: 'astro/assets/services/sharp' } }` to `astro.config.ts`
- [x] 4.2 Update `src/features/maps/ui/MapCard.astro` — use Astro `<Image />` with width/srcset/lazy/loading attributes; add loading="lazy" for below-fold cards
- [x] 4.3 Verify Lighthouse thresholds ≥95 after all changes in `tests/performance/lighthouse.lh.ts`

## Dependency Graph

```
Phase 1 (Foundation) ─┐
                       ├── Phase 2 (Islands) ── Phase 3 (Motion→CSS) ── Phase 4 (Images)
Unit 1 (PR 1) ────────┘    Unit 2 (PR 2)         Unit 3 (PR 3)           Unit 4 (PR 4)
```

Each phase can be a stacked PR to main: PR 1 → merge → PR 2 → merge → PR 3 → merge → PR 4 → merge.
