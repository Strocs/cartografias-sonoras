# Vanilla Path Overlay

## Purpose

Vanilla SVG path renderer replacing the Leaflet `L.polyline`-based `PathOverlay` React component. Renders `<path>` elements using existing `buildPolylineD()` from `pathEngine.ts`, with `vector-effect="non-scaling-stroke"` for constant visual stroke width. Reacts to audio playback state via CSS classes. Never accesses Panzoom.

## Requirements

### Requirement: SVG Path Rendering

The system MUST render `<path>` SVG elements using `buildPolylineD(points, width, height)` from `pathEngine.ts` for geometry. Each `<path>` MUST include `vector-effect="non-scaling-stroke"`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Path rendered | path model with 5 points | SVG created | `<path d="M...L...">` with `vector-effect="non-scaling-stroke"` |
| Geometry reuse | same points as existing engine | `buildPolylineD` called | identical `d` string output |
| Stroke invariant | Panzoom zooms to 3x | `vector-effect` active | stroke width visually unchanged |

### Requirement: PathVisualState CSS Classes

The system MUST consume `PathVisualState` and apply CSS classes: `path-idle` (opacity ~0.2), `path-single` (opacity ~0.6 + pulse), `path-both` (opacity ~0.9 + glow).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle class | `variant: 'idle'` | rendered | `path-idle` class applied, low opacity |
| Single class + pulse | `variant: 'single'` | rendered | `path-single` class, animateMotion pulse circle |
| Both class + glow | `variant: 'both'` | rendered | `path-both` class, drop-shadow glow |
| Direction | `activeEndpoint: 'end'` | animateMotion created | `keyPoints="1;0"` for reversed direction |

### Requirement: No Geometric Recalculation on Zoom

The system MUST NOT recalculate path geometry on zoom or pan events. `vector-effect="non-scaling-stroke"` handles stroke width natively. Path `d` attribute is computed once from model data.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Zoom event | Panzoom zooms | `panzoomend` fires | no `buildPolylineD` call, no `d` attribute update |
| Pan event | user drags map | pan in progress | no geometry recalculation |

### Requirement: Reduced Motion

When `prefers-reduced-motion: reduce` is active, the system MUST hide pulse circles and reset opacity.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Reduced motion | OS preference set | media query matches | pulse circles hidden, opacity reset to base |

### Requirement: Panzoom Isolation

The path overlay module MUST NOT import or reference Panzoom. It MUST receive path models and visual state from the view layer or store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No Panzoom import | vanilla-path-overlay source | inspected | zero imports of `@panzoom/panzoom` |
| Store subscription | audio state changes | path subscribes via vanilla store | CSS class updates without Panzoom access |
