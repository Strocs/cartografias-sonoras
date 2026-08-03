# Proposal: Custom Viewport Engine

## Intent and Product Outcome

Replace the split custom/Panzoom pipeline with one project-owned engine. Interaction must feel natural, deterministic, interruption-safe, observable, and aligned across all visual layers.

The first stable frame fits and centers the map. Drag/pinch may elastically resist beyond resting bounds; on release a short, deterministic, interruptible elastic snap-back returns to strict bounds. No momentum, inertia, or release-velocity travel. Programmatic zoom uses viewport center. Visible zoom and reset controls ship first.

## Scope

### In Scope
- One authoritative `{x, y, scale}` state and finite bounds for every transform source.
- Pointer Events, wheel normalization, focal gesture zoom, center-focused programmatic zoom, interruption-safe scheduling, and reduced motion.
- Controlled elastic overscroll resistance and a short deterministic interruptible elastic snap-back to strict bounds.
- Readiness after valid geometry, fitted/centered transform, and coherent layers; typed API/events and diagnostics.
- Allocation-conscious rendering, measurement/mutation discipline, idempotent Astro lifecycle/cleanup, and tests.
- Mandatory cleanup of Panzoom, duplicate state, mocks, and obsolete instrumentation.

### Out of Scope
- Momentum, inertia, release-velocity travel, keyboard panning, content, redesign, or a general-purpose library.
- Predecessor PR2/PR3. Work Unit 1 remains experimental evidence only.

## Capabilities

### New Capabilities
- `viewport-engine`: State, inputs, bounds, rendering, lifecycle, API, observability, alignment, and verification.

### Modified Capabilities
- `map-page`: First-frame readiness, viewport controls, consumer binding, and Astro navigation lifecycle migrate to the engine.

## Migration and Approach

Backward compatibility is not required. Breaks must be documented and migrated across all consumers/tests; no parallel pathway or unjustified shim may remain. Refactor reusable evidence into state/geometry, input, rendering, lifecycle, and integration boundaries. Astro retains the static shell; React controls remain one focused island.

## Affected Consumers

| Area | Impact |
|---|---|
| `src/features/maps/{lib,ui}` | Replace Panzoom pipeline |
| `src/views/map/{MapPage.astro,mapViewBindings.ts}` | Readiness, controls, events, navigation cleanup |
| `src/features/{sounds,paths}` | Preserve marker/path alignment contracts |
| `tests/{maps,pages/map}` | Engine, browser, lifecycle, performance evidence |
| `package.json`, `pnpm-lock.yaml` | Remove Panzoom |

## Risks and Containment

| Risk | Mitigation |
|---|---|
| Gesture/alignment regression | Geometry, pixel assertions, real-browser pinch checks |
| Stale frames or Astro leaks | Cancellable scheduler; idempotent teardown and repeated-navigation tests |
| Scope/performance growth | Narrow contract, hot-path budgets, mandatory cleanup |

Rollback the migration as one slice, restoring the prior dependency and consumers. No data migration exists; predecessor PR2/PR3 stay cancelled.

## Success Criteria

- [ ] First ready frame fits/centers the map with zero jump or layer drift.
- [ ] All inputs share finite deterministic bounds; overscroll applies elastic resistance, release performs a short deterministic interruptible snap-back, and interruption leaves no stale frame.
- [ ] Controls/reset work visibly; programmatic zoom remains center-focused; keyboard pan is absent.
- [ ] Navigation, reconnect, resize, and teardown leave one authority and zero duplicate resources.
- [ ] Tests, E2E, typecheck, lint, build, dependency/bundle checks, and performance guidance pass with Panzoom absent.
