# Apply Progress: Custom Viewport Engine — Work Unit 1

## Status

Completed Work Unit 1 only: engine foundation/core slice. Tasks `1.1` through `2.4` are complete; consumer migration and cleanup remain out of scope for this slice.

## Completed Tasks

- [x] 1.1 RED geometry tests
- [x] 1.2 GREEN viewport types and geometry
- [x] 1.3 RED transition tests
- [x] 1.4 GREEN deterministic snap-back transitions
- [x] 2.1 RED scheduler tests
- [x] 2.2 GREEN epoch-guarded scheduler
- [x] 2.3 RED engine tests
- [x] 2.4 GREEN viewport engine

## Pending Tasks

`3.1`–`3.10`, `4.1`–`4.7`.

## Verification

| Evidence | Result |
|---|---|
| Focused test command | `pnpm vitest run tests/maps/viewport-*.test.ts` — exit 0; 4 files, 19 tests passed. |
| TypeScript | `pnpm typecheck` — exit 0. |
| Runtime harness | N/A — this work unit is pure geometry plus DOM/unit engine scope; map-page integration is Work Unit 2. |
| Rollback boundary | Remove `src/features/maps/lib/viewport/` and `tests/maps/viewport-*.test.ts`; no consumer files were changed. |

## RED/GREEN Record

| Task | RED evidence | GREEN evidence |
|---|---|---|
| 1.1–1.2 | Geometry test import failed before the module existed. | Geometry suite passed. |
| 1.3–1.4 | Transition test import failed before the module existed. | Transition suite passed. |
| 2.1–2.2 | Scheduler test import failed before the module existed. | Scheduler suite passed. |
| 2.3–2.4 | Engine test import failed before the module existed. | Engine suite passed. |

## Worktree Preservation

Pre-existing dirty changes in Panzoom, map-view, page, marker, path, fixture, and legacy test files were preserved without edits. This slice adds only the new viewport core files/tests and marks its assigned task checkboxes.

## Delivery Boundary

Stacked-to-main slice 1 / PR 1: viewport core and tests only. No commit, push, or PR was created.
