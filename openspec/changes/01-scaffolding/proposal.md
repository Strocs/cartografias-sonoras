# Proposal: 01-scaffolding

## status

success

## executive_summary

Bootstrap `cartografias-sonoras` from an empty workspace into a strict-TypeScript Astro 7 project with React islands, Vitest, Playwright CLI, ESLint/Prettier, Screaming Architecture folders, domain types, and mock data for three Coquimbo/La Serena locations.

## problem_statement

The project directory is empty; Fases 2–6 need a stable foundation that enforces strict TypeScript, feature-scoped architecture, data/UI separation, and no hardcoded assets. Without scaffolding, later phases will duplicate conventions, couple features, and break the non-negotiables in SPEC.md lines 1009–1025.

## proposed_solution

Use the Astro CLI strict-TypeScript template, add React via `astro add react`, then manually create the feature-first folder structure, domain types, JSON/TS mock data, and test harness. Enforce feature→shared-only dependencies with an ESLint `no-restricted-imports` rule, validate domain invariants in tests, and keep initial client islands to a minimum.

## Scope

### In Scope
- pnpm + Astro 7 + React + TypeScript strict
- ESLint (astro-eslint-parser + TS) + Prettier (prettier-plugin-astro)
- Vitest via `getViteConfig()` + Testing Library with `happy-dom`
- Playwright CLI config without `webServer`
- Screaming Architecture folders + path aliases `@features/`, `@shared/`
- Domain types for Map, SoundPiece, Sound, Path
- Mock data for 3 maps with invariant validation
- Leaflet `CRS.Simple` placeholder component
- Audio engine scaffold (idle/loading/playing/paused/ended/error)
- Performance-budget measurement scripts

### Out of Scope
- Real assets (images/audio) — placeholders only
- Full audio playback or Leaflet interaction UI
- Motion/animation implementation
- Static content pages beyond empty routes

## Capabilities

### New Capabilities
- `project-bootstrap`: tooling, config, and project skeleton
- `domain-model`: types and invariants for Map, SoundPiece, Sound, Path
- `mock-data`: placeholder repository for 3 maps
- `map-viewport`: client-only Leaflet `CRS.Simple` scaffold
- `audio-engine`: audio state-machine scaffold

### Modified Capabilities
- None

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `cartografias-sonoras/package.json` | New | Scripts and dev dependencies |
| `cartografias-sonoras/astro.config.mjs` | New | React integration, static output |
| `cartografias-sonoras/tsconfig.json` | New | Strict TS + path aliases |
| `src/features/**` | New | Feature folders and domain types |
| `src/shared/**` | New | Shared utils, styles, types |
| `tests/**` | New | Domain invariant tests |
| `e2e/**` | New | Playwright smoke tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tooling friction (Astro 7 + React 19 + strict TS) | Med | Pin versions; run `pnpm typecheck` after each install |
| Leaflet SSR crash | Med | Wrap in `'use client'` island; guard `window` access |
| Feature dependency violations | Med | ESLint `no-restricted-imports` rule + periodic dependency-cruiser check |
| Playwright CLI ambiguity | Low | Document `@playwright/test` CLI against manually started `pnpm dev` |
| Mock data invariant drift | Low | Central validator exercised by tests on every data change |

## Rollback Plan

Delete `src/`, `tests/`, `e2e/`, `public/`, all config files, and `package.json` to return to the empty workspace. Preserve `openspec/changes/01-scaffolding/` artifacts.

## Dependencies

- Node v26+ and pnpm 11+ available
- Astro 7 strict TypeScript template accessible
- Playwright browsers installable via `pnpm exec playwright install`

## Success Criteria

- [ ] `pnpm install && pnpm typecheck && pnpm test && pnpm build` pass
- [ ] Mock data passes domain invariant tests
- [ ] ESLint + Prettier run cleanly
- [ ] Feature→shared dependency rule is enforced
- [ ] Lighthouse performance budget baseline measured

## skill_resolution

Skills loaded from the project skill registry: `sdd-propose`, `_shared/sdd-phase-common.md`, `_shared/openspec-convention.md`, `typescript`, `react-19`, `no-use-effect`, `tailwind-4`, `playwright`.

## Proposal question round

Assumptions to confirm or correct before specs:
1. The three mock maps correspond to the three Coquimbo/La Serena locaciones; titles and descriptions can be placeholder text.
2. `astro.config.mjs` can be renamed to `.ts` for strict TypeScript consistency.
3. Path aliases use `@features/*` and `@shared/*` from `tsconfig.json`.
4. "Playwright CLI" means installing `@playwright/test` and invoking `pnpm exec playwright test` against an already-running `pnpm dev` server (no `webServer` block).
