# Spec: Cross-Feature Imports

> Source: 04-optimization — Map Page Optimization (archived 2026-07-02)

## Requirements

### Requirement: ESLint Import Boundary Enforcement

ESLint MUST block relative imports that cross feature boundaries. The `no-restricted-imports` rule MUST deny `../sounds/*`, `../paths/*`, and `../sound-pieces/*` from within any feature folder.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Cross-feature import | `src/features/maps/` imports `../sounds/ui/SoundCard` | ESLint runs | error reported; build fails |
| Shared import | feature imports from `@shared/*` | ESLint runs | no error |
| Intra-feature import | feature imports own files | ESLint runs | no error |

### Requirement: Composition Root Location

The map page composition root MUST live in `src/views/map/`. Feature folders MUST NOT import from sibling features.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| View composition | map page needs sounds + maps | `src/views/map/MapPage.tsx` composes | imports from both features via `@shared` or feature entry points |
