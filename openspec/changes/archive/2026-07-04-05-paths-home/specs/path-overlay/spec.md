# Spec: Path Overlay

> Delta for 05-paths-home — Path Visual States & View Transitions

## ADDED Requirements

### Requirement: PathVisualState Discriminated Union

The domain MUST define a `PathVisualState` discriminated union type with three variants:

- `idle`: Both sounds stopped — path rendered at low opacity (~0.2)
- `single`: Exactly one sound playing — path rendered at medium opacity (~0.6) with a luminous pulse (SMIL `animateMotion` circle traversing the polyline)
- `both`: Both sounds playing — path rendered at full opacity (~0.8–1.0) with glow, no pulse

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle variant | both sounds stopped | state computed | `{ variant: 'idle', pathId, points }` |
| Single variant | exactly one sound playing | state computed | `{ variant: 'single', pathId, points, activeEndpoint }` |
| Both variant | both sounds playing | state computed | `{ variant: 'both', pathId, points }` |
| Transition both→single | both playing, one stops | state recomputed | reverts to `single` with directional pulse |
| Direction from endpoint | active sound is second | `activeEndpoint: 'end'` | animateMotion has `keyPoints="1;0"` for reversed direction |

### Requirement: PathOverlay State-Driven Rendering

`PathOverlay` MUST accept `pathStates: PathVisualState[]` as props and render each path in Leaflet's `pathPane` with state-dependent CSS classes and optional SMIL animation.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle CSS class | `variant: 'idle'` | rendered | `<path>` has `path-idle` class (opacity ~0.2) |
| Single CSS + animateMotion | `variant: 'single'` | rendered | `<path>` has `path-single` class + `<circle>` with `<animateMotion>` |
| Both CSS class | `variant: 'both'` | rendered | `<path>` has `path-both` class (opacity ~0.9, glow) |
| No animateMotion for idle/both | `variant: 'idle'` or `'both'` | rendered | no `<circle>` or `<animateMotion>` elements |
| Reduced motion | `prefers-reduced-motion: reduce` | rendered | pulse circles hidden, opacity reset |
| Re-render on map move | map panned/zoomed | `moveend`/`zoomend` fires | paths redrawn with new dimensions |

### Requirement: Dependency Inversion

`PathOverlay` MUST NOT import or reference the audio store. Visual state computation MUST happen at the view layer (SoundTour) and be passed as props.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No store import | PathOverlay.tsx | inspected | no import from audio store or Zustand |
| Props-driven | SoundTour computes states | passes to PathOverlay | component renders based only on props |
