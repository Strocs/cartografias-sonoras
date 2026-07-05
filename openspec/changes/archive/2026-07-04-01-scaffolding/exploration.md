# Exploration: 01-scaffolding

## status

success

## executive_summary

The cartografias-sonoras project is an empty Astro workspace (only `openspec/` exists). The scaffolding change must bootstrap Astro 7+ with React, TypeScript strict, Vitest, Playwright CLI, ESLint/Prettier, the Screaming Architecture folder structure, domain types, and mock data for three maps. The work is straightforward but must establish non-negotiable constraints (strict TS, feature dependency rules, minimal hydration, CRS.Simple viewport) from day one. Exploration confirms the stack is viable and the next step is `sdd-propose`.

## domain_understanding

### Entities

- **Map** — represents one studied locación.
  - `id`, `slug`, `title`, `image` (src/width/height), `soundPieceId`
  - One Map has exactly one SoundPiece, many Sounds, many Paths.
- **SoundPiece** — autonomous sound composition associated with a single Map.
  - `id`, `mapId`, `title`, `author`, `description`, `audioUrl`
  - Not a grouping of Sounds; independent artwork.
- **Sound** — a georeferenced sound mark inside one Map.
  - `id`, `title`, `description`, `audioUrl`, optional `geoReferenceUrl`, `position` (x,y), `mapId`
  - Can play simultaneously with other Sounds of the same Map.
- **Path** — perceptual route between two Sounds in one Map.
  - `id`, `mapId`, `points: {x,y}[]`, `soundIds: [number, number]`
  - Must connect exactly two Sounds.

### Invariants

- Every Map has exactly one SoundPiece (`soundPieceId !== null`).
- Every SoundPiece belongs to exactly one Map (`mapId !== null`).
- Every Sound belongs to exactly one Map (`mapId !== null`).
- Every Path belongs to exactly one Map and connects exactly two Sounds (`soundIds.length === 2`).
- Only one Map can be active at any moment.
- Coordinates are visual (x,y) relative to the map image, not geographic.

### Audio engine states

`idle | loading | playing | paused | ended | error`

- Priority: SoundPiece > individual Sounds.
- Starting a SoundPiece stops all active Sounds.
- Multiple Sounds of the same Map may play together.
- Sounds from different Maps cannot play simultaneously.

## tech_stack_analysis

| Technology | Role in scaffolding | Integration notes |
|------------|--------------------|-------------------|
| **Astro 7+** | Static-first site builder, islands architecture, file-based routing. | Use `pnpm create astro@latest` with strict TypeScript template; add React via `astro add react`; static output default. |
| **React 19** | Only for interactive islands (map viewport, audio player, motion). | React Compiler removes need for `useMemo`/`useCallback`; follow `no-use-effect` skill (event handlers / `useMountEffect`). |
| **TypeScript strict** | Compile-time enforcement of domain invariants and zero `any`. | Extend `astro/tsconfigs/strictest`; enable `noUncheckedIndexedAccess` if compatible. |
| **Vitest** | Unit/integration tests for domain logic and React islands. | Use `getViteConfig()` from `astro/config` so tests share Vite/TS config; DOM environment `happy-dom`. |
| **Testing Library** | Render React islands and assert user-facing behavior. | `@testing-library/react` + `@testing-library/jest-dom` + `happy-dom`. |
| **Playwright CLI** | E2E tests against already-running dev server. | `pnpm exec playwright test` (CLI usage of `@playwright/test`); config sets `baseURL: 'http://localhost:4321'` and **omits** `webServer` because user requires server to be started manually with `pnpm dev`. |
| **Leaflet** | Viewport engine only: zoom, pan, coordinate system. | Use `CRS.Simple` with `ImageOverlay`; wrap in client island; abstract behind `features/maps/services` to avoid domain leakage. |
| **Motion** | Focus transitions, playback animations, path drawing. | Installed as dev/runtime dependency; used inside React islands. |
| **ESLint + Prettier** | Code quality and formatting. | `@astrojs/ts-plugin`, `astro-eslint-parser`, `prettier-plugin-astro`; flat config (`eslint.config.mjs`). |

### Important clarification: "playwright-cli"

The user explicitly prohibits the programmatic `@playwright/test` API and wants tests run against an already-running dev server. The modern, supported way is to install `@playwright/test` and invoke it through its CLI (`pnpm exec playwright test`). The standalone `playwright-cli` package is deprecated/merged into `@playwright/test`. The proposal should document this decision.

## file_plan

### Project root / config

- `package.json` — scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `format`, `typecheck`; all dev dependencies.
- `astro.config.mjs` — React integration, static output, default dev port 4321.
- `tsconfig.json` — extends `astro/tsconfigs/strictest`.
- `vitest.config.ts` — `getViteConfig()` from `astro/config`, `environment: 'happy-dom'`.
- `playwright.config.ts` — `baseURL`, chromium project, no `webServer` block.
- `eslint.config.mjs` — TypeScript + Astro + React hooks rules.
- `.prettierrc.mjs` — Prettier with `prettier-plugin-astro`.
- `.gitignore` — standard Astro/Node ignores.

### Source structure (Screaming Architecture)

```txt
src/
├─ pages/
│  ├─ index.astro              # home — three maps visible
│  ├─ map/[slug].astro         # active map view
│  ├─ proyecto.astro           # project info
│  ├─ datos.astro              # research info
│  └─ equipo.astro             # team info
├─ features/
│  ├─ maps/
│  │  ├─ domain/
│  │  │  └─ types.ts           # Map type + image type
│  │  ├─ data/
│  │  │  ├─ maps.ts            # mock array of 3 maps
│  │  │  └─ index.ts           # public repository
│  │  ├─ ui/
│  │  ├─ services/
│  │  └─ lib/
│  ├─ sounds/
│  │  ├─ domain/
│  │  │  └─ types.ts           # Sound type
│  │  ├─ data/
│  │  │  ├─ sounds.ts          # mock sounds per map
│  │  │  └─ index.ts
│  │  ├─ ui/
│  │  ├─ services/
│  │  └─ lib/
│  ├─ sound-pieces/
│  │  ├─ domain/
│  │  │  └─ types.ts           # SoundPiece type
│  │  ├─ data/
│  │  │  ├─ sound-pieces.ts    # mock pieces
│  │  │  └─ index.ts
│  │  ├─ ui/
│  │  ├─ services/
│  │  └─ lib/
│  └─ paths/
│     ├─ domain/
│     │  └─ types.ts           # Path type
│     ├─ data/
│     │  ├─ paths.ts           # mock paths per map
│     │  └─ index.ts
│     ├─ ui/
│     ├─ services/
│     └─ lib/
├─ shared/
│  ├─ ui/                      # truly shared components (layout, nav)
│  ├─ lib/                     # shared utilities (cn, type helpers)
│  └─ styles/
│     └─ global.css            # color tokens, base styles
└─ styles/                     # SPEC-required top-level styles folder
   └─ (re-export or theme files)
```

### Tests

- `tests/unit/features/maps/domain/types.test.ts` — invariant checks for mock maps.
- `tests/unit/features/sounds/domain/types.test.ts` — Sound invariants.
- `tests/unit/features/paths/domain/types.test.ts` — Path `soundIds.length === 2`.
- `tests/integration/shared/lib/cn.test.ts` — if `cn()` utility added.
- `e2e/home.spec.ts` — Playwright CLI smoke test against dev server.
- `e2e/map.spec.ts` — map route smoke test.

### Public assets (placeholders)

- `public/maps/map-1.jpg`, `map-2.jpg`, `map-3.jpg` — placeholder cartography images.
- `public/audio/...` — placeholder audio files.

### Domain validation

- Add a shared invariant validator (e.g., `src/shared/lib/validate-domain.ts`) that asserts:
  - every Map has a matching SoundPiece,
  - every Sound/Path belongs to an existing Map,
  - every Path connects two Sounds of the same Map.
- Run this validator as part of mock-data tests so domain rules fail fast.

## approaches

1. **Astro CLI bootstrap + manual feature folders**
   - Use `pnpm create astro@latest` with strict TS template, then `astro add react`.
   - Manually create `features/`, `shared/`, `styles/` folders and all domain/data files.
   - Pros: follows official Astro conventions; strictest TypeScript from the start; clean separation.
   - Cons: many small files to create; risk of missing a config file.
   - Effort: Medium

2. **Manual package.json and config files (no Astro CLI)**
   - Write `package.json`, `astro.config.mjs`, `tsconfig.json`, etc. from scratch.
   - Pros: total control over versions and structure.
   - Cons: high risk of misconfiguring Astro/Vite/TS integration; slower; not recommended.
   - Effort: High

3. **Use Astro starter with Vitest example as base**
   - Clone Astro's `with-vitest` example and add React + Playwright + feature folders.
   - Pros: Vitest config already correct.
   - Cons: example may not use strictest TS or latest Astro 7; still requires significant restructuring.
   - Effort: Medium

### Recommendation

Use **Approach 1**: Astro CLI bootstrap with strict TypeScript template, add React integration, then manually create the Screaming Architecture folders, domain types, mock data, and test infrastructure. This balances correctness, maintainability, and speed.

## risks

- **Empty-project convention risk**: No existing patterns to copy. Every file sets a precedent; a wrong early decision propagates through Fases 2–6.
- **Tooling compatibility**: Astro 7 + React 19 + TypeScript strict + Vitest latest may produce type friction (e.g., JSX runtime, React Compiler, Astro types). Must verify `pnpm typecheck` passes after each install.
- **"Playwright CLI" ambiguity**: The deprecated `playwright-cli` package must not be used. Proposal needs to confirm we use `@playwright/test` invoked via CLI and run against a manually started dev server.
- **Leaflet SSR/client-only mismatch**: Leaflet assumes `window`/`document`. The placeholder map must be wrapped in a client island (`'use client'`) and guarded from server rendering.
- **CRS.Simple coordinate mapping**: Visual map images have arbitrary pixel dimensions. We must normalize data coordinates to image bounds and avoid hardcoding dimensions.
- **Feature dependency enforcement**: Without a tool, feature→feature or shared→feature imports can be introduced accidentally. Consider adding `dependency-cruiser` or an ESLint `no-restricted-imports` rule early.
- **Performance budget from day one**: Every React island and library added risks the <200kb JS budget. Keep initial scaffolding islands to a minimum (only Leaflet viewport placeholder).
- **Mock data integrity**: All invariants must hold in mock data. A single missing `soundPieceId` or malformed `soundIds` tuple will break type assumptions and tests.
- **No Tailwind v4 stable docs verified**: Tailwind 4 is installed as a skill but was not deeply researched here; verify configuration against Astro 7 before applying.

## skill_resolution

Skills loaded and applied:

- `sdd-explore` (phase skill) — primary workflow.
- `_shared/sdd-phase-common.md` + `openspec-convention.md` — persistence and return envelope.
- `typescript` — strict patterns, const types, flat interfaces, no `any`.
- `react-19` — React Compiler, no manual memoization, named imports, server components first.
- `no-use-effect` — derive state, event handlers, `useMountEffect`, callback refs.
- `tailwind-4` — `cn()` utility, no `var()` in className, no hex colors in className.
- `playwright` — Page Object Model, selector priority (`getByRole` first), CLI commands.

Resolved as `paths-injected` from orchestrator / registry context.

## next_recommended

proposal
