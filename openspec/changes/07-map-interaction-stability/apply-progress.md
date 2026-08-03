# Apply Progress: Map Interaction Stability

**Change**: `07-map-interaction-stability`
**Mode**: Standard (strict TDD disabled)
**Delivery**: Work Unit 1, chained PR slice (`stacked-to-main`)
**Final status**: Stopped after Work Unit 1; superseded and not production-ready

> Work Unit 1 and its review findings are retained as experimental evidence only. They do not authorize PR2, PR3, or any other remaining task. This incomplete change must not be archived as successfully completed; see `closure.md`.

## Completed Tasks

- [x] 1.1 RED: Add table-driven transform-bound tests.
- [x] 1.2 GREEN: Add `PanInterval`, `BoundsMode`, and `constrainTransform`.
- [x] 1.3 RED: Add gesture-cap and release-mode tests.
- [x] 1.4 GREEN: Add gesture state handling and strict release correction.
- [x] 1.5 REFACTOR: Extract finite helpers and document public geometry contracts.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm test tests/maps/panzoom-setup.test.ts` — passed, 1 file / 9 tests. |
| Supporting integration command and exact result | `pnpm test tests/maps/map-view.test.ts` — passed, 1 file / 15 tests. |
| Typecheck | `pnpm typecheck` — passed (exit 0). |
| Focused lint | `pnpm exec eslint "src/features/maps/lib/panzoom-setup.ts" "tests/maps/panzoom-setup.test.ts"` — passed (exit 0). |
| Runtime harness command/scenario and exact result | N/A — this work unit is pure bounds coordination; browser lifecycle and interaction harnesses belong to Work Unit 2/Phase 2 and Phase 4. |
| Rollback boundary | Revert `src/features/maps/lib/panzoom-setup.ts` bounds-coordinator additions and `tests/maps/panzoom-setup.test.ts`; existing map lifecycle, marker/data, layout, and ClientRouter work remain untouched. |

## RED/GREEN Record

- RED: The expanded bounds and gesture tests failed before the coordinator exports/state behavior existed (8 failed).
- GREEN: The focused suite passed with 9 tests after implementation.
- REFACTOR: Public finite-geometry helpers and JSDoc were extracted without changing the tested behavior.

## Cancelled / Superseded Tasks

Phase 2 tasks 2.1–2.6, Phase 3 tasks 3.1–3.6, Phase 4 tasks 4.1–4.4, and Phase 5 tasks 5.1–5.3 are cancelled under this change, not completed. A successor change must start fresh for the custom viewport engine direction.
