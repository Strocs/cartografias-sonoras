# Delta for Cross-Feature Imports

## ADDED Requirements

### Requirement: Panzoom Import Boundary

ONLY `features/maps` MAY import `@panzoom/panzoom`. No other feature, shared module, or view MAY import Panzoom directly. ESLint MUST enforce this boundary.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Maps imports Panzoom | `features/maps/` imports `@panzoom/panzoom` | ESLint runs | no error |
| Sound imports Panzoom | `features/sounds/` imports `@panzoom/panzoom` | ESLint runs | error reported; build fails |
| Shared imports Panzoom | `shared/` imports `@panzoom/panzoom` | ESLint runs | error reported; build fails |

### Requirement: Vanilla Feature Import Rules

Vanilla features (`sounds`, `paths`) MUST import only from `shared/` (coordinates, store, types). They MUST NOT import from `features/maps/` internals. Features MUST NOT import from sibling features' internals.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Shared import | `features/sounds/` imports `@shared/lib/coordinates` | ESLint runs | no error |
| Store import | `features/paths/` imports `@shared/lib/audio-engine` | ESLint runs | no error |
| Cross-feature block | `features/sounds/` imports `../maps/ui/MapView` | ESLint runs | error reported; build fails |

## Unchanged Requirements

The following requirements from the baseline spec are UNCHANGED:

- **ESLint Import Boundary Enforcement** — existing cross-feature import rules remain; Panzoom boundary is additive.
- **Composition Root Location** — map page composition root remains in `src/views/map/`.
