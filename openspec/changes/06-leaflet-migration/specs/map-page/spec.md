# Delta for Map Page

## MODIFIED Requirements

### Requirement: Atomic React Islands

Each React island MUST have exactly ONE interactive responsibility. Every `client:*` directive MUST be individually justified.

| Island | Directive | Responsibility |
|--------|-----------|----------------|
| `<map-view>` | N/A (custom element) | Map rendering via Panzoom; no React island needed |
| AudioPool | `client:idle` | Hidden `<audio>` elements for playback; idle-priority hydration |
| AudioControls | `client:visible` | play/pause/seek; hydrates when scrolled into view |

(Previously: MapViewport was a `client:only` React island using Leaflet; SoundMarker was a `client:visible` React island. Both replaced by vanilla custom element and DOM renderers.)

## Unchanged Requirements

The following requirements from the baseline spec are UNCHANGED and remain in full force:

- **Astro Static Shell** — `/:slug` page remains a static `.astro` file; React does not own the page wrapper.
- **Static Markup Extraction** — RightRail, map title, and HoverCard remain `.astro` components with zero JS.
- **CSS Transitions Over Framer Motion** — Framer Motion MUST NOT be used.
- **No Manual Memoization** — React 19 Compiler handles optimization.
- **View Transition Directives on Map Page** — `transition:name` and `transition:animate` remain.
