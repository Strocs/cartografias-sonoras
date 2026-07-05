# Spec: View Transitions

> Delta for 05-paths-home — Path Visual States & View Transitions

## ADDED Requirements

### Requirement: ClientRouter Registration

The app MUST register Astro's `<ClientRouter />` in the shared layout `<head>` to enable view transitions across page navigations.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| ClientRouter rendered | Layout.astro head | page loads | `<ClientRouter />` present in `<head>` |

### Requirement: Map Title Morphing

The map title element MUST morph between the home page MapCard and the map detail page using `transition:name`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| MapCard title | MapCard.astro renders | `transition:name={`map-title-${map.slug}`}` | applied on `<h2>` |
| MapPage title | MapPage.astro renders | `transition:name={`map-title-${map.slug}`}` | applied on `<h2>` |

### Requirement: Thumbnail Morphing

The map thumbnail image MUST morph between the home page MapCard and the RightRail sidebar using `transition:name`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| MapCard thumbnail | MapCard.astro renders | `transition:name={`map-thumb-${map.slug}`}` | applied on `<img>` |
| RightRail thumbnail | RightRail.astro renders | `transition:name={`map-thumb-${map.slug}`}` | applied on each `<img>` |
| No Leaflet image morph | L.imageOverlay is JS-created | navigation | no transition:name on map pane (out of scope) |

### Requirement: Page Fade Transition

The `<main>` container on both the home page and map detail page MUST use `transition:animate="fade"` for a crossfade effect.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Home fade | index.astro | navigates away | `<main transition:animate="fade">` |
| Map page fade | MapPage.astro | navigates away | `<main transition:animate="fade">` |
