# Design: 04-optimization

## Technical Approach

Decompose the monolithic `ActiveMapLayout` `client:only` island into a static Astro shell with two justified React islands. Move composition from `features/maps/ui/` to `views/map/` (Screaming Architecture). Replace all Framer Motion with CSS transitions. Remove manual memoization (React 19 Compiler). Add image optimization via Astro `<Image />`, coverage via `@vitest/coverage-v8`, and E2E reliability via Playwright `webServer`.

## Architecture Decisions

### Decision: Island Decomposition Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Split every component into separate Astro islands | Maximum JS reduction, but breaks MapContext (React Context cannot cross island boundaries) | **Rejected** |
| Keep single monolithic island | Simple, but ships all JS upfront | **Rejected** |
| Two islands: MapViewport+children (`client:only`) and AudioBottomPlayer (`client:idle`) | MapContext stays intact; AudioBottomPlayer hydrates independently | **Chosen** |

**Rationale**: `MapContext` is a React Context created inside `MapViewport`. `SoundMarker`, `PathOverlay`, and `MapControls` all consume `useMap()`. React Context cannot cross Astro island boundaries — each island is an independent React tree. Splitting them requires refactoring `MapContext` into a global store, which is a major change out of scope. `AudioBottomPlayer` only needs the Zustand store (module singleton), so it can be a separate island.

### Decision: MapViewport Directive

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `client:load` | Hydrates immediately on page load; Leaflet needs DOM which may not be ready during SSR | **Rejected** |
| `client:only="react"` | Skips SSR entirely; Leaflet requires DOM APIs and breaks SSR | **Chosen** |

**Rationale**: Leaflet's `L.map()` constructor accesses `document` and DOM elements. It cannot be server-rendered. `client:only` is the correct directive.

### Decision: AudioPool Placement

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate `client:idle` island | More isolation, but AudioPool is tightly coupled to map lifecycle (sounds are map-scoped) | **Rejected** |
| Inside MapViewport's React tree | Hidden `<audio>` elements; shares props (sound URLs) from the page data | **Chosen** |

**Rationale**: AudioPool receives `sounds` and `soundPiece` as props derived from the map page data. Keeping it inside the MapViewport tree avoids prop duplication and a second hydration boundary for a component that renders zero visible UI.

### Decision: HoverCard Static Extraction

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extract HoverCard to `.astro` | Zero-JS card content, but HoverCard is rendered inside a Leaflet `DivIcon` via React portal — `.astro` components cannot exist inside React portals | **Rejected** |
| Keep HoverCard as React (already CSS-only) | No Framer Motion usage; CSS transitions handle hover. Portal mechanism requires React | **Chosen** |

**Rationale**: HoverCard already uses CSS transitions (`group-hover:opacity-100`). It has zero Framer Motion dependency. The portal constraint (rendered inside `L.divIcon` container) makes `.astro` extraction impractical.

### Decision: Framer Motion Removal — Progress Ring

| Option | Tradeoff | Decision |
|--------|----------|----------|
| React state at 60fps | Causes re-renders on every frame; poor performance | **Rejected** |
| `useSmoothTimedValue` returning ref-based DOM updater | Same rAF interpolation, but writes directly to `style.strokeDashoffset` via ref; zero re-renders | **Chosen** |

**Rationale**: The current `useSmoothTimedValue` returns a Framer Motion `MotionValue`. We replace it with `useSmoothProgressRing` that accepts a `ref<SVGCircleElement>` and updates `strokeDashoffset` directly via `requestAnimationFrame`. Same performance, zero Motion dependency.

### Decision: Image Optimization Approach

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Sharp pre-processing scripts | Manual pipeline, more config | **Rejected** |
| Astro `getImage()` + `<Image />` with Sharp image service | Build-time optimization, automatic `srcset`, format negotiation | **Chosen** |

### Decision: ESLint Relative Cross-Feature Import Block

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Only block `@features/*` alias (current) | Misses relative imports like `../../sounds/...` | **Insufficient** |
| Block both `@features/*` AND relative `../(sounds\|paths\|sound-pieces\|maps)/*` | Catches all cross-feature boundary violations | **Chosen** |

## Data Flow

```
[slug].astro (static shell)
    │
    ├── Navigation.astro              (static)
    ├── RightRail.astro               (static — zero JS)
    ├── <h2> map title                (static — zero JS)
    │
    ├── MapPage.tsx (client:only)     ← composition root
    │   ├── MapViewport               ← creates MapContext
    │   │   ├── SoundTour
    │   │   │   ├── PathOverlay       ← reads MapContext
    │   │   │   └── SoundMarker[]     ← reads MapContext, Zustand
    │   │   │       └── HoverCard     ← CSS-only, inside portal
    │   │   └── MapControls           ← reads MapContext
    │   └── AudioPool                 ← reads Zustand (hidden audio)
    │
    └── AudioBottomPlayer (client:idle) ← separate island, reads Zustand
```

Cross-island communication: Zustand store (`useAudioStore`) is a module-level singleton accessible from any React tree. Both islands read from it independently.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/views/map/MapPage.astro` | Create | Static shell: layout, Navigation, RightRail.astro, title, composes MapPage.tsx + AudioBottomPlayer as separate islands |
| `src/views/map/MapPage.tsx` | Create | Thin React composer: wires data to MapViewport+SoundTour+MapControls+AudioPool. No UI of its own |
| `src/pages/[slug].astro` | Modify | Replace `ActiveMapLayout` import with `MapPage.astro` from views |
| `src/features/maps/ui/ActiveMapLayout.tsx` | Delete | Composition moves to views/map/ |
| `src/features/maps/ui/RightRail.tsx` | Delete | Replaced by RightRail.astro |
| `src/features/maps/ui/RightRail.astro` | Create | Static `.astro` with CSS `:hover` for overlay effect |
| `src/features/maps/ui/MapControls.tsx` | Modify | Remove `useCallback` (React 19); keep `useMap()` |
| `src/features/sounds/ui/SoundMarker.tsx` | Modify | Remove Framer Motion; CSS `@keyframes` ripple; CSS icon swap; `useSmoothProgressRing` ref-based hook |
| `src/features/sound-pieces/ui/AudioBottomPlayer.tsx` | Modify | Remove `motion.div` → `div` + CSS transition; remove `useMemo`; becomes own `client:idle` island |
| `src/features/maps/ui/MapCard.astro` | Modify | Use Astro `<Image />` with `widths`, `sizes`, `loading="lazy"` |
| `src/features/maps/ui/index.ts` | Modify | Remove RightRail export; add RightRail.astro re-export if needed |
| `src/shared/hooks/useSmoothTimedValue.ts` | Delete | Replaced by useSmoothProgressRing |
| `src/shared/hooks/useSmoothProgressRing.ts` | Create | rAF loop that writes `strokeDashoffset` directly to SVG circle ref |
| `astro.config.ts` | Modify | Add `image.service` config (Sharp) |
| `eslint.config.mjs` | Modify | Add relative cross-feature patterns to `no-restricted-imports` |
| `vitest.config.ts` | Modify | Add coverage: provider `v8`, thresholds ≥70% |
| `playwright.config.ts` | Modify | Add `webServer` block with `reuseExistingServer` |
| `package.json` | Modify | Add `@vitest/coverage-v8`; add `test:coverage` script |

## Interfaces / Contracts

### MapPage.tsx Composer

```ts
// src/views/map/MapPage.tsx
export interface MapPageProps {
  slug: string;
  mapTitle: string;
  mapImage: MapImage;
  sounds: Sound[];
  paths: Path[];
  soundPiece?: SoundPiece | null;
}
```

### useSmoothProgressRing

```ts
// src/shared/hooks/useSmoothProgressRing.ts
// Replaces useSmoothTimedValue. No Framer Motion dependency.
export function useSmoothProgressRing(
  circleRef: React.RefObject<SVGCircleElement | null>,
  currentTime: number,
  duration: number,
  isActive: boolean,
  circumference: number
): void;
// Internally: rAF loop → computes dashoffset → sets circleRef.current.style.strokeDashoffset
```

### RightRail.astro Props

```ts
// src/features/maps/ui/RightRail.astro
interface Props {
  maps: Map[];
  activeSlug: string;
}
```

### ESLint Rule Addition

```js
// eslint.config.mjs — feature isolation block
{
  files: ['src/features/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['@features/*'], message: '...' },
        { group: ['../sounds/*', '../paths/*', '../sound-pieces/*', '../maps/*'],
          message: 'Relative cross-feature import. Use @shared or move composition to views/.' }
      ]
    }]
  }
}
```

### Vitest Coverage Config

```ts
// vitest.config.ts addition
coverage: {
  provider: 'v8',
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['**/*.test.*', '**/tests/**', '**/mock-*', '**/*.d.ts'],
  thresholds: { branches: 70, functions: 70, lines: 70, statements: 70 }
}
```

### Playwright webServer

```ts
// playwright.config.ts addition
webServer: {
  command: 'pnpm dev',
  port: 4321,
  reuseExistingServer: !process.env.CI,
}
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `useSmoothProgressRing` rAF logic | Vitest + fake timers; verify dashoffset computation |
| Unit | CSS animation keyframes presence | Verify `@keyframes` exist in global CSS |
| Integration | MapPage.tsx composer renders all children | Vitest + Testing Library; verify MapViewport + AudioPool + AudioBottomPlayer mount |
| Integration | ESLint blocks cross-feature imports | Run ESLint on fixture files with violations |
| E2E | Map page loads, marker plays, bottom player appears | Playwright against dev server |
| E2E | Lighthouse ≥95 on home + map pages | Playwright lighthouse project |
| Coverage | `pnpm test:coverage` ≥70% all metrics | Vitest coverage-v8 |

## Migration / Rollout

No data migration. Changes are purely structural (file moves, component extraction, config additions). Rollout via single PR with chained commits:

1. Config changes (vitest, playwright, astro image service, eslint) — green CI
2. Create `views/map/` + `MapPage.astro` + `MapPage.tsx` — new files, no breakage
3. Extract `RightRail.astro` — delete `RightRail.tsx`
4. Modify `[slug].astro` to use `MapPage.astro` — switch composition root
5. Delete `ActiveMapLayout.tsx` — remove monolithic wrapper
6. CSS animation replacements (SoundMarker, AudioBottomPlayer) — remove Framer Motion
7. Image optimization (MapCard.astro) — Astro `<Image />`
8. Raise Lighthouse thresholds — final commit after metrics verified

## Open Questions

- [ ] Confirm Sharp is available as Astro image service dependency (may need `sharp` in `package.json`)
- [ ] Verify `client:idle` on AudioBottomPlayer does not cause visible delay when user plays audio immediately (may need `client:load` as fallback)
- [ ] Confirm existing source PNGs have sufficient resolution for `srcset` generation at 2x
