# Spec: Map Page

> Source: 04-optimization — Map Page Optimization (archived 2026-07-02)

## Requirements

### Requirement: Astro Static Shell

The `/:slug` page MUST be a static `.astro` file that renders the full page layout as static HTML. React MUST NOT own the page wrapper.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Static render | `/[slug].astro` request | page loads | full HTML shell (layout, RightRail, title) served with zero JS |
| Progressive enhancement | JS disabled | user visits map page | static map info and rail visible; only interactive controls unavailable |

Previously: `ActiveMapLayout.tsx` wrapped the entire page as a single `client:only` React island.

### Requirement: Atomic React Islands

Each React island MUST have exactly ONE interactive responsibility. Every `client:*` directive MUST be individually justified.

| Island | Directive | Responsibility |
|--------|-----------|----------------|
| MapViewport | `client:only` | Leaflet map rendering; requires DOM, breaks SSR |
| AudioControls | `client:visible` | play/pause/seek; hydrates when scrolled into view |
| SoundMarker | `client:visible` | marker interaction + progress ring |

Previously: `ActiveMapLayout` was a monolithic `client:only` wrapper containing all interactive behavior.

### Requirement: Static Markup Extraction

RightRail, map title, and HoverCard content MUST be `.astro` components. They MUST render as static HTML with zero JS.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| RightRail | map page loads | Astro renders | RightRail HTML present without JS |
| HoverCard | sound hovered | Astro renders card | card content is static markup; CSS handles transition |

### Requirement: CSS Transitions Over Framer Motion

Framer Motion MUST NOT be used in map-page components. Animations MUST use CSS transitions or `@keyframes`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| HoverCard appear | card enters viewport | CSS transition fires | smooth opacity/transform without Motion runtime |

### Requirement: No Manual Memoization

React 19 Compiler handles optimization. `useMemo` and `useCallback` MUST NOT appear in map-page islands.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Derived value | component needs filtered list | renders | computed inline; no `useMemo` |
| Event handler | component defines onClick | renders | plain function; no `useCallback` |

### Requirement: View Transition Directives on Map Page

The map detail page MUST include Astro view transition directives to enable smooth page-to-page morphing.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Map title morph source | MapPage.astro renders | `<h2>` inspected | has `transition:name={`map-title-${map.slug}`}` |
| Main fade transition | MapPage.astro renders | `<main>` inspected | has `transition:animate="fade"` |
