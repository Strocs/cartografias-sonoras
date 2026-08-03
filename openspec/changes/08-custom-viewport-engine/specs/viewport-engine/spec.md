# Spec: Viewport Engine

## Purpose

One project-owned transform authority for map image, DOM markers, and SVG paths.

## Requirements

### Requirement: Authoritative state and alignment

Engine MUST own one `{x, y, scale}` state shared by image, markers, and paths; no consumer may shadow it.

- **State authority**: GIVEN engine running; WHEN input occurs; THEN style transform reflects committed state.
- **Layer alignment**: GIVEN scale = 2; WHEN measuring layers; THEN image/marker/path share origin and scale.

### Requirement: Pointer gestures

Engine MUST support drag, pinch, pointer capture, `lostpointercapture`, and `pointercancel`.

- **Drag**: GIVEN pointerdown and move 50px; WHEN pointermove; THEN content pans -50px and pointer is captured.
- **Pinch**: GIVEN two pointers down; WHEN distance doubles; THEN scale doubles around centroid.
- **Cancel/lost**: GIVEN active gesture; WHEN pointercancel or lostpointercapture; THEN gesture ends and content clamps to bounds.

### Requirement: Zoom inputs

Engine MUST normalize wheel deltas, zoom around cursor, and center programmatic zoom.

- **Wheel focal**: GIVEN wheel at (200,150); WHEN positive delta; THEN point under cursor stays fixed.
- **Control center**: GIVEN zoomIn() called; THEN scale rises around viewport center.

### Requirement: Bounds and overscroll

Engine MUST compute finite scale/pan bounds; gestures past strict bounds MUST apply controlled elastic resistance, and on release MUST perform a short, deterministic, interruptible elastic snap-back to strict bounds.

(Previously: gestures may resist, but release clamps instantly.)

- **Undersized**: GIVEN content smaller than viewport; WHEN fitted; THEN scale=min and centered.
- **Oversized edge**: GIVEN content larger than viewport; WHEN panned to edge; THEN pan equals boundary.
- **Elastic resistance**: GIVEN content at boundary; WHEN pointer moves 20px past boundary; THEN content moves less than 20px.
- **Release snap-back**: GIVEN overscrolled; WHEN pointer released; THEN engine performs a short deterministic elastic snap-back to strict bound.
- **No momentum travel**: GIVEN high release velocity past boundary; WHEN pointer released; THEN no post-release velocity travel occurs; only snap-back.
- **Snap-back interrupt**: GIVEN snap-back running; WHEN pointerdown; THEN snap-back stops immediately and gesture resumes from current state.

### Requirement: Controls and keyboard

Engine MUST expose `reset()`, `zoomIn()`, `zoomOut()`, and state; MUST NOT handle keyboard panning.

- **Reset**: GIVEN panned/zoomed; WHEN reset invoked; THEN returns to fitted/centered state.
- **Keyboard ignored**: GIVEN map focused; WHEN arrow key pressed; THEN no pan; page scrolls normally.

### Requirement: Readiness and resize

Engine MUST refit on resize and set `data-ready` after valid geometry and attached layers.

- **Resize**: GIVEN viewport width halves; WHEN resize completes; THEN transform stays inside new bounds.
- **Readiness**: GIVEN image decoded and layers attached; WHEN first valid transform applied; THEN `data-ready` set and `viewport-change` emitted.

### Requirement: Animation and frames

Transitions, including snap-back, MUST respect reduced motion; user input MUST interrupt snap-back immediately; pending frames MUST cancel on teardown, and stale scheduled frames MUST be cancelled before new ones begin.

(Previously: transitions MUST respect reduced motion; input interrupts animation; pending frames cancel on teardown.)

- **Reduced motion reset**: GIVEN reduced motion set; WHEN reset invoked; THEN transform changes instantly.
- **Reduced motion snap-back**: GIVEN reduced motion set and overscrolled; WHEN pointer released; THEN transform settles to strict bounds without animation.
- **Input interrupts snap-back**: GIVEN snap-back running; WHEN pointerdown; THEN animation cancels immediately and new gesture starts from current state.
- **Teardown cancels frames**: GIVEN pending animation/frame; WHEN destroy() called; THEN animation/frame stops and DOM unchanged.
- **Stale frame cancellation**: GIVEN scheduled frame; WHEN new frame scheduled; THEN previous frame cancels before new one runs.

### Requirement: Lifecycle

Setup and teardown MUST be idempotent; reconnect must not duplicate listeners, observers, or frames.

- **Reconnect**: GIVEN element reconnected; WHEN setup runs; THEN one observer and one rAF token.
- **Teardown**: GIVEN engine running; WHEN destroy() called; THEN listeners/observers/captures/frames released.

### Requirement: Observability and invariants

Engine MUST expose typed `getState()`, `subscribe()`, and emit `{x,y,scale}`; diagnostic events MAY surface errors/invariants; invalid config throws; NaN/Infinity rejected.

- **Subscribe**: GIVEN subscriber added; WHEN state changes; THEN typed state delivered per frame.
- **Invalid/NaN**: GIVEN bad config or NaN coords; WHEN processed; THEN error thrown or event ignored.

### Requirement: Performance

Hot-path handlers MUST NOT allocate per frame; measurement and mutation MUST be separated.

- **Drag frame**: GIVEN repeated pointermove; WHEN profiled; THEN no arrays/closures allocated per frame.

### Requirement: Migration and tests

Engine MUST replace Panzoom and be covered by pure, integration, E2E, leak, migration, and performance tests.

- **Dependency check**: GIVEN lockfile inspected; THEN no `@panzoom/panzoom` entry.
- **Tests**: GIVEN bounds inputs and 10 reconnect cycles; WHEN tested; THEN expected outputs and stable listener count.
