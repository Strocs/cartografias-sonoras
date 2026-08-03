# Design: Custom Viewport Engine

## Technical Approach

Replace Panzoom with pure geometry, browser input, and one rAF renderer owned by `<map-view>`. Image, SVG, and markers share one scene.

## Architecture Decisions

| Decision | Choice and rationale | Rejected |
|---|---|---|
| Authority | One internal `ViewportState {x,y,scale}` plus phase, gesture, and animation records. Public snapshots are frozen copies; consumers never shadow transform state. | Panzoom/DOM-derived state |
| Coordinates | Content coordinates use natural-image pixels; viewport and `x/y` use CSS pixels from viewport top-left. `screen = {x,y} + content * scale`; render `translate3d(xpx,ypx,0) scale(scale)` with origin `0 0` (scale is applied first mathematically). Drag is explicitly inverse: `delta = startPointer-currentPointer`; moving right 50 px changes `x` by `-50`, resolving the spec example. | Pre-scale pan coordinates; implicit sign |
| Boundary motion | Strict bounds define rest; gesture excess uses `r(d)=sign(d)*48*(1-exp(-abs(d)/48))`. Release targets strict projection only—never velocity travel. Snap-back is 180 ms `cubic-bezier(0.22,1,0.36,1)` interpolation, interruptible and immediate under reduced motion. | Momentum, springs with variable settling, instant normal-motion clamp |
| Marker composition | Restore the proven React `SoundMarker` presentation behind one `SoundMarkers client:load` collection island. With 5–10 markers per page, one root/portal is simpler to mount, test, and clean up than per-marker roots. React owns marker audio interaction, progress, and hover UI only. | Vanilla marker factory; one island per marker; React viewport wrapper |
| Transform ownership | The engine alone commits the shared scene transform and engine-owned inverse-scale CSS variable. Markers provide content coordinates and consume that CSS variable for constant-size presentation; they never store/subscribe to `{x,y,scale}` or schedule viewport frames. | `viewport-change` marker loops; React transform state |

## State, Geometry, and Data Flow

Phases are `initializing → idle ↔ dragging/pinching ↔ animating → destroyed`. Pointer-down cancels animation and enters drag/pinch from committed state. Release/cancel/lost-capture removes the pointer; one survivor rebases drag, zero project to strict bounds and snap.

Pure functions without DOM access implement fit, bounds, strict projection, resistance, focal zoom, and transitions. For each axis, scaled content `C` and viewport `V`: if `C<=V`, strict position is `(V-C)/2`; otherwise `[V-C,0]`. Focal zoom preserves `c=(f-x)/scale` via `x'=f-c*scale'`. Invalid configuration throws; non-finite samples emit `viewport-error` and are ignored.

```text
Pointer/wheel/API → pure transition → authoritative state → rAF commit
                                                     ├→ scene transform
                                                     ├→ inverse-scale CSS variable
                                                     └→ frozen snapshot/event
```

Astro owns the page and `<map-view>` shell. On `viewport-ready`, `SoundMarkers` portals one React tree into `markerLayer`; each child derives natural-image pixel coordinates from `sound.position` and subscribes only to its sound slice in the vanilla Zustand store. `MapControls` remains independent. No React parent wraps image, SVG, engine, controls, or paths.

## Input, Frames, and Lifecycle

The scene owns Pointer Events and `touch-action:none`; accepted pointers are captured in a reused map. Capture failure uses window move/up fallback. Cancel/lost-capture share release logic; teardown releases captures.

Wheel deltas normalize pixel/line/page modes; exponential scaling is cursor-focused. Prevent default only when finite geometry would change; otherwise allow page scroll.

Handlers update reusable pending fields. One-rAF scheduling epoch-guards callbacks. Each frame measures, computes, writes the scene transform and `--viewport-inverse-scale`, then emits; no reads follow writes. This keeps marker visuals screen-sized without React mirroring scale. Evidence emphasizes frame duration and forced-layout absence, not bespoke marker allocation optimization.

`connectedCallback` idempotently builds layers, decodes, fits, commits, and emits readiness. The marker island mounts only against the current ready layer and cleans its portal/store subscriptions on replacement or unmount. Disconnect aborts decode, releases engine resources, and destroys once; reconnect creates fresh engine and layer ownership.

## Interfaces and Migration

`ViewportEngine` exposes state/subscription, zoom, reset, resize, and destroy methods. Readonly snapshots include transform, phase, readiness, and revision. Typed events are `viewport-change {state,reason}`, `viewport-ready`, and `viewport-error`.

| Files | Change |
|---|---|
| `src/features/maps/lib/viewport/{types,geometry,transitions,scheduler,engine}.ts` | Create engine boundaries |
| `src/features/maps/ui/map-view.ts`, `MapControls.tsx` | Engine API, readiness, disabled controls |
| `src/views/map/{MapPage.astro,mapViewBindings.ts}` | Mount marker collection separately; retain framework-neutral path/audio orchestration |
| `src/features/sounds/ui/{SoundMarkers,SoundMarker,HoverCard}.tsx` | Adapt prior React marker UI to portal collection and vanilla store |
| `src/features/maps/lib/layers.ts`, path renderer, marker CSS | Shared scene layers and engine-owned inverse-scale contract |
| `panzoom-setup.ts`, Panzoom mocks/dependency/lock entry | Delete mandatory dead path |

Intentional breaks: `resetView→reset`, `detail→detail.state`, `.map-panzoom→.map-scene`, and Panzoom APIs removed. `createSoundMarker`/`updateSoundMarker` and their scale-event loop are replaced. The adapted React marker preserves audio selection, playback, progress, hover, accessibility, and cleanup; Leaflet/MapContext and marker-local rAF are excluded.

## Testing Strategy

Vitest covers geometry, resistance, snap-back, reduced motion, epochs, and invalid input. React tests cover per-sound selection, playback, progress, hover, portal cleanup, and absence of viewport scheduling. DOM tests cover pointer lifecycle, one-rAF discipline, inverse scale, resize, and reconnect. E2E covers gestures, interruption, navigation, and layer alignment.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Replace the pipeline as one reversible slice; cleanup blocks verification.
