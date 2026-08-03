# Tasks: Map Interaction Stability

> **Status: Stopped and superseded.** Work Unit 1 (1.1-1.5) is preserved as experimental history, not production acceptance or authorization to continue. All remaining work is cancelled under this change; see `closure.md`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 610-810 |
| 800-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (bounds) → PR 2 (lifecycle) → PR 3 (binding + E2E) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (resolved: auto-chain)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
800-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Bounds coordinator with unit tests | PR 1 | `pnpm test tests/maps/panzoom-setup.test.ts` | `playwright-cli` held-drag regression | `src/features/maps/lib/panzoom-setup.ts`, control delegation, and focused tests |
| 2 | Map lifecycle with integration tests | PR 2 | `pnpm test tests/maps/map-view.test.ts` | `pnpm dev` + manual verify | `src/features/maps/ui/map-view.ts` + integration tests |
| 3 | ClientRouter binding with E2E | PR 3 | `pnpm test:e2e tests/pages/map/map.spec.ts` | `pnpm test:e2e` | `src/views/map/MapPage.astro`, `mapViewBindings.ts` + E2E tests |

## Phase 1: Bounds Coordinator (Foundation)

- [x] 1.1 RED: Create `tests/maps/panzoom-setup.test.ts` with table-driven tests for `constrainTransform` covering undersized/oversized axes, four edges, non-1 scale
- [x] 1.2 GREEN: Implement `PanInterval`, `BoundsMode`, and `constrainTransform` in `src/features/maps/lib/panzoom-setup.ts`
- [x] 1.3 RED: Add tests for gesture cap (drag/pinch) and release correction modes
- [x] 1.4 GREEN: Implement `noBind: true` manual Pointer Events with a finite cap and strict release
- [x] 1.5 REFACTOR: Extract pure helpers, ensure all inputs/outputs are finite, add JSDoc

## Phase 2: Map Lifecycle (Core)

**Disposition:** Cancelled and superseded. Do not continue as PR2.

- [ ] 2.1 RED: Create `tests/maps/map-view.test.ts` with integration tests for precomputed initial transform before reveal
- [ ] 2.2 GREEN: Modify `src/features/maps/ui/map-view.ts` to compute `startScale/startX/startY` and hide until `data-ready`
- [ ] 2.3 RED: Add tests for hidden-to-ready sequencing and invalid geometry guard
- [ ] 2.4 GREEN: Implement `data-ready` emission after first constrained transform, defer on zero/invalid dimensions
- [ ] 2.5 RED: Add tests for idempotent destroy and observer cleanup
- [ ] 2.6 GREEN: Implement cleanup logic, retain one active unbind/observer, cancel pending animations on resize

## Phase 3: ClientRouter Binding (Integration)

**Disposition:** Cancelled and superseded. Do not continue as PR3.

- [ ] 3.1 RED: Create `tests/views/map/mapViewBindings.test.ts` with unit tests for idempotent unbind
- [ ] 3.2 GREEN: Modify `src/views/map/mapViewBindings.ts` to make unbind idempotent and safe for swap/teardown
- [ ] 3.3 RED: Add tests for single subscription/binding guarantee across A→B→A navigation
- [ ] 3.4 GREEN: Modify `src/views/map/MapPage.astro` to add idempotent ClientRouter lifecycle controller with `astro:before-swap` and `astro:after-swap` hooks
- [ ] 3.5 RED: Modify `tests/pages/map/map.spec.ts` to add E2E tests for RightRail A→B→A navigation preserving markers/paths
- [ ] 3.6 GREEN: Wire up `bindMapView()` after `data-ready`, ensure exactly one active binding and no subscription accumulation

## Phase 4: E2E Verification (Testing)

**Disposition:** Cancelled and superseded.

- [ ] 4.1 Add E2E tests for undersized/oversized bounds, four-edge coverage, reset, and resize in `tests/pages/map/map.spec.ts`
- [ ] 4.2 Add E2E tests for drag/pinch overscroll cap and snap-back animation in `tests/pages/map/map.spec.ts`
- [ ] 4.3 Add E2E test for single-subscription diagnostic after RightRail round-trip
- [ ] 4.4 Verify all E2E tests pass with `pnpm test:e2e`

## Phase 5: Cleanup

**Disposition:** Cancelled and superseded.

- [ ] 5.1 Update JSDoc comments in modified files
- [ ] 5.2 Verify `pnpm test` and `pnpm test:e2e` pass
- [ ] 5.3 Confirm no regression in existing uncommitted Panzoom/zoom/marker changes
