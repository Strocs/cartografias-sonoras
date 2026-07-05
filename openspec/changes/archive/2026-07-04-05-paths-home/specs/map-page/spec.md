# Spec: Map Page

> Delta for 05-paths-home — Path Visual States & View Transitions

## ADDED Requirements

### Requirement: View Transition Directives on Map Page

The map detail page MUST include Astro view transition directives to enable smooth page-to-page morphing.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Map title morph source | MapPage.astro renders | `<h2>` inspected | has `transition:name={`map-title-${map.slug}`}` |
| Main fade transition | MapPage.astro renders | `<main>` inspected | has `transition:animate="fade"` |
