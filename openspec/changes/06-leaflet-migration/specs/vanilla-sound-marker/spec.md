# Vanilla Sound Marker

## Purpose

Vanilla DOM marker replacing the Leaflet `L.marker`-based `SoundMarker` React component. Renders as native `<button>` elements with full keyboard accessibility, visual scale compensation, and activation events. Consumes marker model data and viewport scale factor; never accesses Panzoom.

## Requirements

### Requirement: DOM Button Rendering

The system MUST render each sound marker as a `<button>` element with `aria-label` describing the sound. Position MUST be set via `transform: translate(xpx, ypx)` using `relativeToPixel()` from `shared/lib/coordinates`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Marker rendered | sound model with position `{x:50,y:25}` | marker created | `<button>` at pixel position from `relativeToPixel` |
| Accessible label | marker rendered | inspected | `aria-label` contains sound title |
| Keyboard focus | user tabs through markers | focus reaches marker | `:focus-visible` styles applied |

### Requirement: Visual Scale Compensation

The system MUST apply `transform: scale(1/currentZoom)` on `panzoomend` and `panzoomzoom` events only. Scale compensation MUST NOT run during active drag or pinch gestures.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Zoom end | user finishes zoom gesture | `panzoomend` fires | marker scale set to `1/currentZoom` |
| During drag | user drags map | pan in progress | no scale recalculation triggered |
| Visual size preserved | zoomed to 2x | scale compensation applied | marker appears same visual size on screen |

### Requirement: Activation Events

On click, tap, or Enter key press, the marker MUST dispatch a `CustomEvent('marker:activate')` with `detail: { soundId }`. The event bubbles from the marker button element.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Click | user clicks marker | click event fires | `marker:activate` dispatched with soundId |
| Enter key | marker focused, user presses Enter | keydown event | `marker:activate` dispatched with soundId |
| Tap | user taps on touch device | pointer event | `marker:activate` dispatched with soundId |

### Requirement: Hover and Focus States

The marker MUST support `:hover` and `:focus-visible` states via CSS classes. Transitions MUST use only `transform`, `opacity`, and `filter`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hover | pointer enters marker | `:hover` active | scale/opacity transition via CSS |
| Focus | keyboard focus arrives | `:focus-visible` active | visible focus ring + same visual treatment as hover |

### Requirement: Selection State

The marker MUST reflect selection state via `data-state` attribute with values `idle`, `playing`, or `paused`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle | sound not active | `data-state="idle"` | default marker appearance |
| Playing | sound playing | `data-state="playing"` | playing visual state (progress ring, icon change) |
| Paused | sound paused | `data-state="paused"` | paused visual state |

### Requirement: Animation Constraints

All marker animations MUST use `transition` or `@keyframes` on `transform`, `opacity`, `filter` only. The system MUST NOT animate `top`, `left`, `width`, or `height`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| State transition | `data-state` changes idle→playing | CSS transition fires | smooth transform/opacity animation |
| Ripple | playing state active | @keyframes runs | ripple uses transform: scale() + opacity |

### Requirement: Panzoom Isolation

The marker module MUST NOT import or reference Panzoom. It MUST receive the scale factor as a value from the map engine.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| No Panzoom import | vanilla-sound-marker source | inspected | zero imports of `@panzoom/panzoom` |
| Scale factor | map engine publishes scaleFactor | marker reads value | applies `1/scaleFactor` compensation |
