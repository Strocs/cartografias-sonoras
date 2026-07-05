# Design: 05-paths-home — Path Visual States & View Transitions

## Technical Approach

Two independent workstreams:
1. **Path visual states**: Extract pure geometry into `pathEngine.ts`, introduce `PathVisualState` discriminated union, refactor `PathOverlay` to presentational component driven by `pathStates[]` props, lift audio-store subscription into `SoundTour`. Path pulses use SVG `<animateMotion>`.
2. **View Transitions**: Wire Astro `ClientRouter` into `Layout.astro`, add `transition:name` on static elements, `transition:animate="fade"` on `<main>` containers.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PathVisualState carries `points` vs pre-computed `d` | Carry `points`; PathOverlay computes `d` via pathEngine with MapContext width/height | `d` requires container dimensions only available inside PathOverlay. Preserves dependency inversion. |
| animateMotion element | `<circle>` with `<mpath>` referencing route `<path>` | SMIL is GPU-composited, works inside Leaflet SVG pane, degrades cleanly with prefers-reduced-motion. |
| Reversed pulse direction | `keyPoints="1;0" keyTimes="0;1"` on animateMotion | Avoids computing second `d` string. One `<path>` per route, simpler DOM. |
| Straight segments vs curves | Straight `M/L` per spec | Simpler pathEngine, predictable animateMotion timing. |
| CSS strategy | Tailwind + custom @keyframes in global.css + prefers-reduced-motion guard | Consistent with existing pattern (soundwave-active, marker-ripple in global.css). |

## Component Design

### PathEngine (`src/features/paths/lib/pathEngine.ts`)
Pure module. Zero framework imports.
- `buildPolylineD(points, width, height)` — percentage→pixel, `M x0 y0 L x1 y1 ...`, returns `""` for < 2 points
- `reversePoints(points)` — returns new reversed array

### PathVisualState (`src/features/paths/domain/PathVisualState.ts`)
```ts
type PathVisualState =
  | { pathId: number; points: Point[]; variant: 'idle' }
  | { pathId: number; points: Point[]; variant: 'single'; activeEndpoint: 'start' | 'end' }
  | { pathId: number; points: Point[]; variant: 'both' };
```

### PathOverlay (`src/features/paths/ui/PathOverlay.tsx`)
Props: `{ pathStates: PathVisualState[] }`. Inside useMountEffect, same Leaflet pathPane pattern:
1. Compute `d = buildPolylineD(points, width, height)` per state
2. Base `<path>` with CSS class: `path-idle` (0.2 opacity), `path-single` (0.6, blue), `path-both` (0.9, blue glow)
3. For `single`: append `<circle>` with `<animateMotion dur="1.5s" repeatCount="indefinite">` + `<mpath>`. If `activeEndpoint === 'end'`: `keyPoints="1;0" keyTimes="0;1"` to reverse.
4. Re-render on moveend/zoomend

### SoundTour (`src/views/sound-tour/SoundTour.tsx`)
Subscribes to `useAudioStore((s) => s.activeSounds)`. Maps each path's soundIds to playing states → computes PathVisualState[]. Passes to PathOverlay. SoundMarker unchanged.

## View Transitions

| File | Element | Directive |
|------|---------|-----------|
| Layout.astro | `<head>` | `<ClientRouter />` from astro:transitions/client |
| MapCard.astro | `<h2>` | `transition:name={`map-title-${map.slug}`}` |
| MapCard.astro | Picture/img | `transition:name={`map-thumb-${map.slug}`}` |
| RightRail.astro | `<img>` | `transition:name={`map-thumb-${map.slug}`}` |
| MapPage.astro | `<h2>` | `transition:name={`map-title-${map.slug}`}` |
| MapPage.astro | `<main>` | `transition:animate="fade"` |
| index.astro | `<main>` | `transition:animate="fade"` |

## Data Flow

```
AudioStore (activeSounds) → SoundTour (computes pathStates[]) → PathOverlay (pathEngine + SVG)
                                                                  ↓
                                                          Leaflet pathPane
                                                          <path> + <animateMotion>
AudioBottomPlayer (client:idle) ←→ Zustand store ←→ SoundTour (separate island)
```

## Files

| File | Action |
|------|--------|
| `src/features/paths/lib/pathEngine.ts` | Create |
| `src/features/paths/domain/PathVisualState.ts` | Create |
| `src/features/paths/ui/PathOverlay.tsx` | Modify |
| `src/views/sound-tour/SoundTour.tsx` | Modify |
| `src/layouts/Layout.astro` | Modify |
| `src/features/maps/ui/MapCard.astro` | Modify |
| `src/features/maps/ui/RightRail.astro` | Modify |
| `src/views/map/MapPage.astro` | Modify |
| `src/pages/index.astro` | Modify |
| `src/styles/global.css` | Modify |

## CSS

Path state classes in global.css: `.path-idle` (0.2), `.path-single` (0.6, blue), `.path-both` (0.9, blue glow). `.path-pulse circle` with drop-shadow glow. `@media (prefers-reduced-motion: reduce)` hides pulse circles and resets opacity.

## Testing

- Unit: pathEngine (pure, no deps), PathOverlay (mock MapContext), SoundTour (mock store)
- E2E: Home→map navigation morph (may be blocked by PNG-import harness issue)

## Open Questions

- E2E harness PNG-import issue may block navigation assertions
