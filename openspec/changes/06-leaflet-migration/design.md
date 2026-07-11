# Design: Leaflet → DOM/SVG + Panzoom Migration

## Technical Approach

Replace the Leaflet-based `MapViewport` React island (`client:only`) with a vanilla `<map-view>` custom element powered by `@panzoom/panzoom`. The custom element owns a single transform container wrapping three layers: `<img>`, SVG `<path>` overlay, and DOM marker `<button>` elements. Audio state flows through a `zustand/vanilla` store shared between vanilla map code and React islands. The migration proceeds in four atomic steps: store refactor → new map implementation → integration switch → legacy cleanup.

## Architecture Decisions

### Decision: Light DOM over Shadow DOM for `<map-view>`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Shadow DOM | Style isolation, but blocks Tailwind/CSS inheritance, complicates HoverCard anchor positioning | **Rejected** |
| Light DOM | Shares page styles, simpler CSS anchor positioning, easier debugging | **Chosen** |

**Rationale**: Markers and paths need Tailwind utility classes and CSS custom properties from the page theme. Shadow DOM would require duplicating the entire stylesheet inside the shadow root.

### Decision: Progress ring via CSS custom property + store subscribe

| Option | Tradeoff | Decision |
|--------|----------|----------|
| rAF loop per marker | Smooth 60fps, but N loops for N markers | **Rejected** |
| CSS `--progress` property + `transition` | One store subscribe callback updates all markers; CSS interpolates visually | **Chosen** |

**Rationale**: Audio `timeupdate` fires ~4Hz. A CSS `transition: --progress 250ms linear` on each marker smooths this to perceptually 60fps without per-marker rAF loops. Uses `@property --progress { syntax: '<number>'; inherits: false; initial-value: 0; }` for animatable custom property.

### Decision: MapControls communicates via DOM reference, not store

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Store actions for zoom | Adds viewport state to audio store, couples concerns | **Rejected** |
| Direct `el.zoomIn()` / `el.zoomOut()` calls | Simple, matches custom element public API, no store pollution | **Chosen** |

**Rationale**: MapControls queries `document.querySelector('map-view')` and calls public methods. Viewport state stays encapsulated in the custom element; audio store stays audio-only.

### Decision: HoverCard as vanilla DOM tooltip inside marker

| Option | Tradeoff | Decision |
|--------|----------|----------|
| React HoverCard island | Extra hydration cost, event bridge complexity | **Rejected** |
| Vanilla tooltip in marker factory | Zero JS cost, same visual markup as template literal | **Chosen** |

**Rationale**: HoverCard is pure presentational markup (title, location, description). The vanilla marker factory renders an identical tooltip `<div>` inside the marker button's parent, shown via CSS `:hover`/`:focus-visible`. `HoverCard.tsx` is preserved as the React reference but not imported by vanilla code.

### Decision: Path visual state computed in a vanilla orchestrator

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep SoundTour.tsx as React island | Requires React hydration for path state computation | **Rejected** |
| Extract `computePathVisualStates` to vanilla module | Pure function, subscribes to store, updates SVG classes directly | **Chosen** |

**Rationale**: `computePathVisualStates` is already a pure function (in `SoundTour.tsx`). Extract it to `views/map/pathStateEngine.ts` (vanilla TS). The `<map-view>` custom element calls it on store changes and applies CSS classes to existing `<path>` elements.

## Data Flow

```
MapPage.astro
├── <map-view> (custom element, no React)
│   ├── connectedCallback → load img → decode → init Panzoom
│   ├── creates: img layer + SVG layer + marker layer
│   ├── subscribes to audioStore → updates marker data-state + path CSS classes
│   └── dispatches: marker:activate CustomEvent
│
├── <script> (Astro-bundled)
│   ├── imports audioStore, sets el.paths / el.markers on <map-view>
│   └── listens marker:activate → calls audioStore.playSound()
│
├── AudioPool (client:idle React island)
│   └── renders <audio> elements, wires events to audioTransitions
│
├── AudioBottomPlayer (client:idle React island)
│   └── reads audioStore via useStore wrapper
│
└── MapControls (client:visible React island)
    └── calls el.zoomIn() / zoomOut() / resetView() on <map-view>
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/lib/audio-engine/store.ts` | Modify | Change `create` → `createStore` from `zustand/vanilla`; export `audioStore` (vanilla) + `useAudioStore` (React wrapper via `useStore`) |
| `src/shared/lib/audio-engine/index.ts` | Modify | Update barrel exports for new store shape |
| `src/features/maps/ui/map-view.ts` | Create | Custom element class: Panzoom init, image decode, layer creation, public API (`zoomIn`, `zoomOut`, `resetView`, `scaleFactor`) |
| `src/features/maps/lib/panzoom-setup.ts` | Create | Panzoom factory: `initPanzoom(container, opts)` → `{ instance, destroy }`; configures `contain`, `minScale`, `maxScale`, wheel binding |
| `src/features/maps/lib/layers.ts` | Create | Layer helpers: `createSvgLayer(container, w, h)`, `createMarkerLayer(container)` |
| `src/features/sounds/lib/soundMarker.ts` | Create | `createSoundMarker(sound, imgW, imgH)` → `HTMLButtonElement`; progress ring via `--progress` CSS property; `data-state` attribute; dispatches `marker:activate` |
| `src/features/sounds/styles/marker-styles.css` | Create | Marker button styles, progress ring, ripple animation, hover/focus states |
| `src/features/paths/lib/pathRenderer.ts` | Create | `renderPaths(pathStates, svgEl, imgW, imgH)` → creates/updates `<path>` elements; reuses `buildPolylineD()`; applies `vector-effect="non-scaling-stroke"` + CSS classes |
| `src/views/map/pathStateEngine.ts` | Create | Extract `computePathVisualStates` from `SoundTour.tsx`; pure function, no React |
| `src/views/map/mapViewBindings.ts` | Create | Wires `<map-view>` to store: subscribes to audio state, updates markers/paths, handles `marker:activate` events |
| `src/features/maps/ui/MapControls.tsx` | Modify | Remove Leaflet/MapContext imports; query `<map-view>` via DOM; call public methods |
| `src/views/map/MapPage.astro` | Modify | Replace `<MapCanvas client:only>` with `<map-view>` + `<AudioPool client:idle>` + `<script>` for bindings; update skeleton fade selector |
| `src/pages/[slug].astro` | Modify | No structural change; passes data that MapPage.astro serializes into `<script>` |
| `src/shared/lib/viewport/MapViewport.tsx` | Delete | Legacy Leaflet viewport |
| `src/shared/lib/viewport/MapContext.tsx` | Delete | Legacy React context |
| `src/shared/lib/viewport/types.ts` | Delete | Legacy Leaflet types |
| `src/views/map/MapCanvas.tsx` | Delete | Legacy React orchestrator |
| `src/views/sound-tour/SoundTour.tsx` | Delete | Logic extracted to `pathStateEngine.ts`; rendering moves to vanilla |
| `src/features/sounds/ui/SoundMarker.tsx` | Delete | Replaced by vanilla `soundMarker.ts` |
| `src/features/paths/ui/PathOverlay.tsx` | Delete | Replaced by vanilla `pathRenderer.ts` |

## Interfaces / Contracts

### Vanilla store exports (store.ts)

```typescript
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

// Vanilla instance — framework-agnostic
export const audioStore = createStore<AudioStore>((set) => ({ ... }));

// React hook wrapper
export const useAudioStore = <T>(selector: (s: AudioStore) => T) =>
  useStore(audioStore, selector);

// audioTransitions unchanged — calls audioStore.setState()
```

### `<map-view>` public API

```typescript
interface MapViewElement extends HTMLElement {
  readonly scaleFactor: number;  // 1 / currentZoom
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  // Properties set by outer <script>
  set markers(value: SoundModel[]);
  set paths(value: PathModel[]);
}
```

### Marker activation event

```typescript
// Dispatched from marker <button> on click/Enter/tap
new CustomEvent('marker:activate', {
  bubbles: true,
  detail: { soundId: number, mapId: number }
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `computePathVisualStates`, `buildPolylineD`, `relativeToPixel` | Pure function tests ( Vitest ) |
| Unit | `createSoundMarker` DOM output, event dispatch | jsdom: create marker, simulate click, assert CustomEvent |
| Unit | Store refactor: `audioStore.getState()`, `subscribe()` | Verify vanilla API works; verify React wrapper re-renders |
| Integration | `<map-view>` lifecycle | Mount/unmount in test container; assert Panzoom created/destroyed |
| E2E | Map pan, zoom, marker click, audio playback | Playwright: existing E2E tests updated for new selectors |

## Migration / Rollout

**Step 1 — Store refactor**: Change `create` → `createStore` in `store.ts`. Add `useAudioStore` wrapper. No map changes. All existing React consumers continue working via the wrapper.

**Step 2 — New map implementation**: Create `<map-view>`, vanilla renderers, bindings. Leaflet code still present but unused.

**Step 3 — Integration switch**: Update `MapPage.astro` to use `<map-view>` + separate islands. Remove `<MapCanvas>` import.

**Step 4 — Legacy cleanup**: Delete Leaflet components, viewport module, `SoundTour`, `SoundMarker`, `PathOverlay`. Remove `leaflet` + `@types/leaflet` from `package.json`. Single atomic commit.

## Open Questions

- [ ] Pan inertia: `@panzoom/panzoom` may not have native deceleration. Prototype early; implement custom friction rAF loop on `panzoomend` if UX requires it.
- [ ] CSS Anchor Positioning inside Panzoom-transformed container: prototype early. Fallback: `getBoundingClientRect()` + `panzoom.getScale()`.
- [ ] `ResizeObserver` on the map container: verify Panzoom's `setOptions` correctly updates containment bounds without resetting view.
