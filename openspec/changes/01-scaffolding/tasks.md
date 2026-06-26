# Tasks: 01-scaffolding — Project Bootstrap

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–1800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Config) → PR 2 (Types) → PR 3 (Data) ∥ PR 4 (Libs) → PR 5 (Pages) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main (resolved by user: PR 1 targets main) |

Decision needed before apply: Yes — resolved by user
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Config + tooling + folder structure | PR 1 | main | pnpm, Astro 7, TS strict, all configs, folder tree, global.css |
| 2 | Domain types + invariants + validators + tests | PR 2 | main | 4 entity types, invariants, dataset validator, domain tests |
| 3 | Mock data + barrel exports | PR 3 | main | JSON data per feature, central dataset export, invariant passing |
| 4 | Audio engine + Leaflet viewport + tests | PR 4 | main | State machine, CRS.Simple island, lib tests (parallel to PR 2/3) |
| 5 | Pages + E2E + perf scripts | PR 5 | main | 5 routes, E2E smoke, lighthouse/bundle perf check |

PRs 2/3 and PR 4 are parallelizable — both depend only on PR 1. Stacked-to-main avoids artificial merge conflicts.

## Phase 1: Configuration & Tooling

- [x] 1.1 Init pnpm, install all deps — package.json with Astro 7, React 19, TS strict, Vitest, Playwright, ESLint, Prettier
- [x] 1.2 Create astro.config.ts — React integration, `output: 'static'`, strict TS
- [x] 1.3 Create tsconfig.json — extends astro/tsconfigs/strict, `@features/*`, `@shared/*`, `@styles/*` path aliases
- [x] 1.4 Create vitest.config.ts — vite-tsconfig-paths + happy-dom
- [x] 1.5 Create playwright.config.ts — baseURL `localhost:4321`, no webServer
- [x] 1.6 Create eslint.config.js — flat config, astro-eslint-parser, `no-restricted-imports` for dep rules
- [x] 1.7 Create .prettierrc — prettier-plugin-astro
- [x] 1.8 Create folder tree: src/{pages,features/{maps,sounds,sound-pieces,paths}/{domain,data,ui,services,lib},shared/lib/{audio-engine,viewport},styles,utils}
- [x] 1.9 Verify: `pnpm install && pnpm typecheck && pnpm build` exits 0

## Phase 2: Domain Model

- [x] 2.1 Create Map, SoundPiece, Sound, Path types in features/*/domain/types.ts (per SPEC.md entities)
- [x] 2.2 Create invariant check per entity in features/*/domain/invariants.ts
- [x] 2.3 Create cross-reference dataset validator in src/shared/utils/validators.ts
- [x] 2.4 Write domain invariant tests in tests/domain/invariants.test.ts
- [x] 2.5 Verify: `pnpm typecheck && pnpm test` both pass

## Phase 3: Mock Data

- [x] 3.1 Create mock TypeScript data for 3 maps with placeholders in features/maps/data/mock-maps.ts
- [x] 3.2 Create mock TypeScript data for ≥6 sounds with positions in features/sounds/data/mock-sounds.ts
- [x] 3.3 Create mock TypeScript data for 3 sound pieces in features/sound-pieces/data/mock-sound-pieces.ts
- [x] 3.4 Create mock TypeScript data for ≥3 paths in features/paths/data/mock-paths.ts
- [x] 3.5 Create barrel exports (data/index.ts) per feature
- [x] 3.6 Write mock data validation test — dataset passes all invariants
- [x] 3.7 Verify: all cross-references valid, `pnpm test` passes

## Phase 4: Shared Libraries

- [x] 4.1 Create audio engine types (6 states) + state machine in shared/lib/audio-engine/{types,engine,store,index}.ts
- [x] 4.2 Write audio engine state machine tests in tests/audio-engine/engine.test.ts
- [x] 4.3 Create Leaflet CRS.Simple viewport React island in shared/lib/viewport/{MapViewport.tsx,MapViewport.astro,index.ts} — SSR guard, no domain logic
- [x] 4.4 Create global.css with Tailwind theme colors (from SPEC.md) and import via root layout
- [x] 4.5 Verify: `pnpm typecheck`, `pnpm test`, no cross-feature imports

## Phase 5: Pages & Integration

- [ ] 5.1 Create index.astro — 3 map cards, static import from data
- [ ] 5.2 Create map/[slug].astro — dynamic route with viewport island
- [ ] 5.3 Create proyecto.astro, datos.astro, equipo.astro — placeholder pages
- [ ] 5.4 Write E2E smoke test (e2e/smoke.spec.ts) — page loads, route navigations
- [ ] 5.5 Create perf budget script — Lighthouse ≥95 all, JS bundle <200KB
- [ ] 5.6 Final verify: `pnpm build && pnpm test && pnpm exec playwright test && pnpm perf` all pass
