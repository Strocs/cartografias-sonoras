# Design: 01-scaffolding

## Technical Approach

Bootstrap a greenfield Astro 7 + React project from the empty `cartografias-sonoras/` directory. Use `create astro` with the strict-TypeScript template, add React integration, then manually create the Screaming Architecture folder tree, domain types, JSON mock data, Leaflet viewport scaffold, audio engine state machine, and test harness. All data flows statically: JSON → barrel exports → Astro pages → React island props. No client-side fetching.

## Architecture Decisions

### Decision: Config File Format

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `astro.config.mjs` | Default from CLI, but inconsistent with strict-TS goal | **Rejected** |
| `astro.config.ts` | Aligns with strict-TS principle; Astro supports it natively | **Chosen** |

### Decision: Mock Data Format

| Option | Tradeoff | Decision |
|--------|----------|----------|
| TypeScript files with typed objects | Type-safe but verbose, harder for non-dev editors | **Rejected** |
| JSON files + barrel TS exports | Type-checked at import boundary, portable, replaceable | **Chosen** |

### Decision: Audio Engine Location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Feature-scoped (sounds/) | Can't serve sound-pieces without cross-feature import | **Rejected** |
| `shared/lib/audio-engine/` | Cross-cutting service used by sounds + sound-pieces | **Chosen** |

### Decision: Leaflet Abstraction

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Direct Leaflet in maps feature | Couples domain to Leaflet API | **Rejected** |
| `shared/lib/viewport/` wrapper | Isolates Leaflet as swappable viewport engine | **Chosen** |

### Decision: Test File Location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Co-located (`*.test.ts` next to source) | Standard but mixes test with domain | **Rejected** |
| Root `tests/` directory | Clean separation; domain tests validate data, not components | **Chosen** |

## Data Flow

```
mock-*.json ──→ features/*/data/index.ts (barrel)
                         │
                         ▼
              src/pages/index.astro (static import)
                         │
                    props pass-down
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
    MapViewport.tsx         AudioEngine (shared)
    (client:only=react)     (state machine)
    shared/lib/viewport/    shared/lib/audio-engine/
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `cartografias-sonoras/package.json` | Create | pnpm project with Astro 7, React 19, Vitest, Playwright, ESLint, Prettier |
| `cartografias-sonoras/astro.config.ts` | Create | React integration, static output, strict TS |
| `cartografias-sonoras/tsconfig.json` | Create | Extends `astro/tsconfigs/strict`, path aliases |
| `cartografias-sonoras/vitest.config.ts` | Create | `vite-tsconfig-paths`, `happy-dom` environment |
| `cartografias-sonoras/playwright.config.ts` | Create | No `webServer`; baseURL `http://localhost:4321` |
| `cartografias-sonoras/eslint.config.js` | Create | Flat config, `no-restricted-imports` for dependency rules |
| `cartografias-sonoras/.prettierrc` | Create | `prettier-plugin-astro` |
| `src/pages/index.astro` | Create | Home — 3 map cards |
| `src/pages/map/[slug].astro` | Create | Dynamic map route |
| `src/pages/proyecto.astro` | Create | Placeholder |
| `src/pages/datos.astro` | Create | Placeholder |
| `src/pages/equipo.astro` | Create | Placeholder |
| `src/features/maps/domain/types.ts` | Create | `Map` type |
| `src/features/maps/domain/invariants.ts` | Create | Map invariant checks |
| `src/features/maps/data/mock-maps.json` | Create | 3 placeholder maps |
| `src/features/maps/data/index.ts` | Create | Barrel export |
| `src/features/sounds/domain/types.ts` | Create | `Sound` type |
| `src/features/sounds/domain/invariants.ts` | Create | Sound invariant checks |
| `src/features/sounds/data/mock-sounds.json` | Create | ≥6 sounds (2 per map) |
| `src/features/sounds/data/index.ts` | Create | Barrel export |
| `src/features/sound-pieces/domain/types.ts` | Create | `SoundPiece` type |
| `src/features/sound-pieces/domain/invariants.ts` | Create | SoundPiece invariant checks |
| `src/features/sound-pieces/data/mock-sound-pieces.json` | Create | 3 sound pieces (1 per map) |
| `src/features/sound-pieces/data/index.ts` | Create | Barrel export |
| `src/features/paths/domain/types.ts` | Create | `Path` type |
| `src/features/paths/domain/invariants.ts` | Create | Path invariant checks |
| `src/features/paths/data/mock-paths.json` | Create | ≥3 paths (1 per map) |
| `src/features/paths/data/index.ts` | Create | Barrel export |
| `src/shared/lib/audio-engine/types.ts` | Create | `AudioState`, `AudioEngine` interface |
| `src/shared/lib/audio-engine/machine.ts` | Create | State machine + transition validation |
| `src/shared/lib/audio-engine/index.ts` | Create | Barrel export |
| `src/shared/lib/viewport/MapViewport.tsx` | Create | Leaflet CRS.Simple client island |
| `src/shared/lib/viewport/index.ts` | Create | Barrel export |
| `src/shared/utils/validators.ts` | Create | Cross-reference dataset validator |
| `src/styles/global.css` | Create | CSS variables for color palette |
| `tests/domain/invariants.test.ts` | Create | Domain invariant validation tests |
| `tests/audio-engine/machine.test.ts` | Create | State machine transition tests |
| `e2e/smoke.spec.ts` | Create | Page load + navigation smoke tests |

## Interfaces / Contracts

### Domain Types (from SPEC.md)

```ts
// features/maps/domain/types.ts
export type Map = {
  id: number;
  slug: string;
  title: string;
  image: { src: string; width: number; height: number };
  soundPieceId: number;
};

// features/sounds/domain/types.ts
export type Sound = {
  id: number;
  title: string;
  description: string;
  audioUrl: string;
  geoReferenceUrl?: string;
  position: { x: number; y: number };
  mapId: number;
};

// features/sound-pieces/domain/types.ts
export type SoundPiece = {
  id: number;
  mapId: number;
  title: string;
  author: string;
  description: string;
  audioUrl: string;
};

// features/paths/domain/types.ts
export type Path = {
  id: number;
  mapId: number;
  points: Array<{ x: number; y: number }>;
  soundIds: [number, number];
};
```

### Audio Engine

```ts
// shared/lib/audio-engine/types.ts
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export type AudioTarget = { id: number; type: 'sound' | 'soundPiece' };

export interface AudioEngine {
  play(target: AudioTarget): void;
  pause(id: number): void;
  stop(id: number): void;
  seek(id: number, time: number): void;
  getState(id: number): AudioState;
  subscribe(listener: (id: number, state: AudioState) => void): () => void;
}
```

### Dataset Validator

```ts
// shared/utils/validators.ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDataset(
  maps: Map[], sounds: Sound[], soundPieces: SoundPiece[], paths: Path[]
): ValidationResult;
```

### Leaflet Viewport

```ts
// shared/lib/viewport/MapViewport.tsx
interface MapViewportProps {
  imageSrc: string;
  width: number;
  height: number;
  isActive: boolean;
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Domain invariants, audio state machine | Vitest + happy-dom. `tests/domain/`, `tests/audio-engine/` |
| Integration | Data barrel exports compose correctly | Vitest. Import barrels, validate shape |
| E2E | Page loads, route navigation, no console errors | Playwright CLI against `pnpm dev`. `e2e/smoke.spec.ts` |

**Vitest config**: Uses `vite-tsconfig-paths` plugin so `@features/*` aliases resolve in tests. No `getViteConfig` needed — standalone `vitest.config.ts` with matching aliases.

**Playwright config**: No `webServer` block. Developer runs `pnpm dev` manually, then `pnpm exec playwright test`. `baseURL: 'http://localhost:4321'`.

## Dependency Rule Enforcement

ESLint flat config with `no-restricted-imports`:

```js
// eslint.config.js — key rule
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@features/*'], message: 'Features cannot import from other features. Use @shared instead.' }
      ]
    }]
  }
}
```

This applies globally. Each feature's own internal imports use relative paths (not `@features/self/...`), so the restriction only blocks cross-feature imports. `@shared/*` imports are unrestricted.

## Performance Budget Implementation

| Tool | Purpose | Script |
|------|---------|--------|
| `lighthouse` CLI | Measure Lighthouse scores | `pnpm perf:lighthouse` |
| Custom Node script | Check JS bundle size < 200KB from `dist/` | `pnpm perf:bundle` |
| Combined | Full budget check | `pnpm perf` |

Run after `pnpm build`. No CI integration at scaffold stage — add in a later change.

## Migration / Rollout

No migration required. Greenfield project.

## Open Questions

- [ ] Confirm Astro 7 is published (fall back to Astro 5 if not available at install time)
- [ ] Confirm `@astrojs/ts-plugin` is needed or if `astro/tsconfigs/strict` suffices for editor support
