# Tasks: 02-cartography — Interactive Isometric Cartography

## Phase 1: Foundation

- [x] 1.1 Copy `refs/maps/map{1,2,3}.png` to `public/maps/locacion-{1,2,3}.png`
- [x] 1.2 Update `mock-maps.ts` — dimensions: 1216×864, 864×1243, 1160×912
- [x] 1.3 Reconcile `mock-sounds.ts` coordinates to real image pixel bounds
- [x] 1.4 Reconcile `mock-paths.ts` points to real image pixel bounds
- [x] 1.5 Add `--color-canvas: #F5F2ED`, `--color-charcoal: #1A2A3A` to `global.css`
- [x] 1.6 Modify `MapViewport.tsx`: default `zoomControl: false`, create `pathPane` at zIndex 350, expose `getMap()` for feature components
- [x] 1.7 Update `Navigation.astro`: serif title + bronze subtitle + wave divider; icons before labels; active=teal left border; institutional logos (ULS, Innova Creativa, Escuela) in footer

## Phase 2: Interactive Components

- [x] 2.1 Create `MapContext.tsx` — React context to share L.Map instance
- [x] 2.2 Create `SoundMarker.tsx` — L.divIcon + React portal, idle/playing/hover states, progress ring
- [x] 2.3 Create `HoverCard.tsx` — floating info card with title, duration, location pin, description
- [x] 2.4 Create `PathOverlay.tsx` — SVG dashed curves in Leaflet pathPane, cubic bezier
- [x] 2.5 Create `MapControls.tsx` — zoom+/zoom-/center float buttons, top-right
- [x] 2.6 Create `RightRail.tsx` — inactive map thumbnails, hover scale, title reveal

## Phase 3: Layout, Integration and Tests

- [ ] 3.1 Create `ActiveMapLayout.tsx`
- [ ] 3.2 Create `ActiveMapLayout.astro`
- [ ] 3.3 Update `[slug].astro`
- [ ] 3.4 Update `map-page.ts`
- [ ] 3.5 Update `map.spec.ts`

## Review Workload Forecast

- Estimated changed lines: ~700-900
- Review budget: 800 lines
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Chain strategy: stacked-to-main
- Delivery strategy: auto-forecast (auto-chain)
- PRs: 3
  - PR 1: Foundation (assets, data, viewport, nav)
  - PR 2: Interactive Components (context, markers, hover cards, paths, controls, rail)
  - PR 3: Layout, Integration and Tests
