# Proposal: 04-optimization

## Intent

Reduce the map page's JS footprint, fix the monolithic-island anti-pattern, raise Lighthouse to ≥95, and add the missing quality gates (coverage, reliable E2E) without rewriting the audio engine, domain model, or Leaflet integration.

## Scope

### In Scope
- Atomic islands remediation: break `ActiveMapLayout`, move composition to `src/views/map/`, extract `RightRail`/title/`HoverCard` to `.astro`, replace Framer Motion with CSS, remove manual `useMemo`/`useCallback`, and justify every `client:*` directive.
- Cross-feature import enforcement: relocate the composition root, tighten ESLint `no-restricted-imports` to block relative sibling-feature imports.
- Image optimization: WebP/AVIF + `srcset`/`sizes`, lazy-load home `MapCard`s, and configure the Astro image service.
- Coverage: install `@vitest/coverage-v8` and configure thresholds (target aligned with `openspec/config.yaml` 80%).
- E2E reliability: add `webServer` to Playwright with `reuseExistingServer`.

### Out of Scope
- Home page motion/transitions, audio asset replacement, Leaflet replacement (kept as a conditional spike), and audio engine/domain rewrites.

## Capabilities

### New Capabilities
- `image-optimization`: responsive image formats and lazy loading for home and map assets.
- `coverage-instrumentation`: Vitest coverage-v8 with threshold gate.
- `e2e-reliability`: Playwright `webServer` and server-ready guard.
- `feature-boundaries`: ESLint rules and view-level composition conventions.
- `map-page-composition`: Astro shell for `/:slug` with atomic islands and progressive hydration.

### Modified Capabilities
- `bottom-player`: replace Motion animation with CSS and remove manual memoization.
- `sound-marker`: replace Motion state transitions with CSS; keep the store-driven progress ring.

## Approach

Astro owns the static shell; only `MapViewport` and the audio controls remain as justified client islands. Cross-island state continues through the existing Zustand audio store using primitive selectors. Images move to Astro `<Image />`/`getImage()` with Sharp. ESLint blocks `../(sounds|paths|sound-pieces)/` imports inside features. Coverage and Playwright config changes land in their own commits. Lighthouse thresholds are raised only after metrics confirm 95.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/views/map/MapPage.tsx` | New | Page-level composition root moved from `features/maps`. |
| `src/pages/[slug].astro` | Modified | Static Astro shell with atomic islands. |
| `src/features/maps/ui/ActiveMapLayout.tsx` | Modified | Becomes a thin composer or is removed. |
| `src/features/maps/ui/RightRail.astro` | New | Static `.astro` rail. |
| `src/features/sounds/ui/HoverCard.astro` | New | Static presentational card. |
| `src/features/maps/ui/MapCard.astro` | Modified | Astro Image, srcset, lazy loading. |
| `src/features/sound-pieces/ui/AudioBottomPlayer.tsx` | Modified | CSS animations, no manual memoization. |
| `src/features/sounds/ui/SoundMarker.tsx` | Modified | CSS transitions, no Motion. |
| `eslint.config.mjs` | Modified | Restrict relative cross-feature imports. |
| `astro.config.ts` | Modified | Image service adapter. |
| `vitest.config.ts` | Modified | Coverage config. |
| `playwright.config.ts` | Modified | `webServer` block. |
| `tests/performance/lighthouse.lh.ts` | Modified | Thresholds raised to 95. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Island split exposes MapContext/store lifecycle assumptions | Med | Keep `MapViewport` as the core island; verify with existing tests. |
| Source PNGs lack high-res variants for `srcset` | Med | Generate variants with Sharp at build time; keep originals as fallback. |
| CSS motion differs from approved Motion design | Low | Review against `design/visual-guidelines`. |
| Raising thresholds before optimization breaks CI | Med | Raise thresholds only in the final commit after verified metrics. |

## Rollback Plan

Revert affected source/config files to `main`. If the coverage dependency was added, remove `@vitest/coverage-v8` and lockfile changes. Temporarily lower Lighthouse thresholds if a rollback is needed mid-verification.

## Dependencies

- Sharp or Astro's image service for build-time optimization.
- Existing test suite must remain green before changes.

## Success Criteria

- [ ] Home and map pages score Lighthouse ≥95 in all categories.
- [ ] No monolithic `client:only` wrapper remains; each island has a single responsibility and a justified directive.
- [ ] ESLint fails relative cross-feature imports.
- [ ] `pnpm test:coverage` meets the configured threshold; `pnpm test:e2e` auto-starts the server.
- [ ] `pnpm build` passes and the total map-page gzipped JS stays within the 200 KB budget.

## Skill Resolution

`paths-injected` — loaded the exact skills requested by the orchestrator: `astro`, `astro-react-islands`, `islands-architecture`, `no-use-effect`, `react-19`, `tailwind-4`, `typescript`, `zustand-5`, `chained-pr`, `work-unit-commits`, plus `_shared/sdd-phase-common.md` and `_shared/openspec-convention.md`.
