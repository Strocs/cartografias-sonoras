# Map Interaction Specification

## Purpose

Define bounded, stable pan/zoom behavior for the custom `<map-view>` viewport backed by `@panzoom/panzoom`.

## Requirements

### Requirement: Viewport-Bounded Panning

The system SHALL keep the map image inside the viewport according to the relative size of the image and viewport axes.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Undersized map movement | image is smaller than viewport on an axis | user drags along that axis | the image MAY move, but no image edge crosses the corresponding viewport edge |
| Oversized map containment | image is larger than viewport on an axis | user drags along that axis | the image edge stays at or inside the corresponding viewport edge; no blank viewport area is exposed |
| Four-edge coverage | image and viewport sizes differ | any pan input occurs | both X and Y axes are constrained independently |

### Requirement: Gesture Overscroll Cap

During a pointer-held gesture, the system MAY allow a bounded overscroll not exceeding the configured screen-pixel cap.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Drag overscroll | pointer is held and map is dragged past a resting bound | `panzoompan` fires | translation exceeds the strict bound by at most the gesture cap |
| Pinch overscroll | two-finger pinch passes `minZoom` or `maxZoom` | pinch event fires | scale exceeds the strict bound by at most the configured zoom allowance |
| Cap is finite | gesture mode is active | pointer remains held | overscroll SHALL NOT grow without bound |

### Requirement: Release Correction

On pointer release, the system SHALL animate the transform to strict bounds with one short smooth-back.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Snap-back after drag | pointer is released while pan is overscrolled | `panzoomend` fires | one animation returns pan to strict bounds; no further cap is allowed |
| Snap-back after pinch | pinch ends while scale is outside `[minZoom, maxZoom]` | `panzoomend` fires | one animation returns scale to the nearest strict bound |
| Release cancels gesture | pointer is released | `panzoomend` fires | subsequent frames use strict mode until the next gesture starts |

### Requirement: Input Equivalence

All transform sources SHALL use the same coordinator and bounds mode.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Wheel zoom | mouse wheel over map | zoom changes | strict bounds are applied immediately; no overscroll |
| Control buttons | zoom in/out/reset controls are activated | transform updates | strict bounds are applied immediately; reset is strict |
| Touch and pinch | touch drag or pinch occurs | transform updates | same finite cap and release correction as mouse |
| Programmatic API | `setTransform`, `zoomIn`, `zoomOut`, or `reset` is called | transform updates | strict bounds are applied immediately |
| Resize | viewport is resized | resize handler runs | strict bounds are applied; any pending gesture animation is cancelled |

### Requirement: Stable Initial Frame

The system SHALL hide the map until the first constrained transform is computed and reveal it without a visible jump.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| No visible jump | image is decoded and viewport size is known | initial transform is computed | map container remains hidden until `data-ready` is emitted |
| Skeleton coverage | map container is hidden | `data-ready` fires | skeleton is replaced by the visible map at the resting transform |
| Invalid geometry guard | image or viewport dimensions are zero/invalid | initialization runs | prior transform is preserved; `data-ready` is deferred until dimensions are valid |

### Requirement: Zoom Attribute Compatibility

The system SHALL honour `min-zoom`, `start-zoom`, and `max-zoom` attributes.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Start zoom applied | `start-zoom` attribute is present | Panzoom initializes | initial scale equals `start-zoom` clamped to `[min-zoom, max-zoom]` |
| Min/max enforced | user attempts to zoom beyond attribute bounds | zoom input occurs | scale stops at `min-zoom` or `max-zoom`; pinch cap is relative to these bounds |

### Requirement: Browser Regression Evidence

The system SHALL provide automated evidence for bounds, readiness, and release behavior.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| E2E bounds coverage | Playwright test suite runs | undersized and oversized maps are exercised | all four edges, reset, and resize pass pixel assertions |
| E2E release coverage | Playwright test suite runs | aggressive drag or pinch overshoots a bound | final settled position is within strict bounds and smooth-back duration is bounded |
| Unit coverage | Vitest suite runs | pure helpers are exercised | axis combinations, non-1 scale, cap/release/resize pass table-driven assertions |
