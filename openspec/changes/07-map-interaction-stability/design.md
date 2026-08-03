# Design: Map Interaction Stability

## Technical Approach

Retain `@panzoom/panzoom` behind `<map-view>`, but make one geometry pipeline authoritative for initialisation, gestures, zoom/reset, and resize. It computes finite pan intervals, allows a bounded pointer-only overscroll, then strictly corrects on release. This replaces reactive per-event hard-centering that can fight Panzoom and oscillate.

`MapPage.astro` will own page-data bindings and a single ClientRouter lifecycle controller. This keeps map rendering separate from audio-store subscriptions.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Constraint ownership | Panzoom containment overrides declarative zoom; hard reactive clamp is sticky. | Pure coordinator in `panzoom-setup.ts`: one testable authority preserving `min-zoom`. |
| Axis semantics | Center undersized axes (WIP) vs finite interval. | Keep undersized image edges inside the viewport; oversized images cover viewport edges. Both are finite and movable. |
| Overscroll | Hard clamp vs elastic physics. | Fixed screen-pixel cap only during drag/pinch; one animated strict correction on `panzoomend`. All other sources are strict. |
| First frame | Reveal then correct vs precompute. | Hidden container receives computed `startScale/startX/startY`, silent strict correction, then `data-ready` and reveal under the skeleton. |
| ClientRouter binding | Bind in element vs page orchestration. | Keep external `bindMapView()`. One controller retains one unbind/observer, cleans at `astro:before-swap`, then re-queries page data/map at `astro:after-swap`. |

## Data Flow

```text
pointer gesture ─┐
wheel/control/reset/resize ──> Bounds coordinator ──> Panzoom transform
decoded image + viewport ────> initial transform ────┘
pointer release ─────────────> strict target + one smooth pan-back

astro:before-swap -> unbind store/listeners -> DOM swap -> astro:after-swap
                                                        -> wait data-ready -> bind markers/paths
```

The coordinator derives screen-coordinate intervals, converts corrections to Panzoom pre-scale translation, and accepts `gesture` (cap) or `strict` (zero allowance). It ignores its silent correction and performs at most one correction per source event/frame. `panzoomstart` enables gesture mode; `panzoompan`/pinch applies the cap; `panzoomend` performs the sole animated strict correction. Resize/reset are strict without animation. `viewport-change` follows the settled transform.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/maps/lib/panzoom-setup.ts` | Modify | Export pure interval/cap helpers; centralise gesture state, strict correction, release animation, resize cleanup. |
| `src/features/maps/ui/map-view.ts` | Modify | Compute initial pan before reveal; coordinate ready/cleanup and settled viewport events. |
| `src/views/map/MapPage.astro` | Modify | Add idempotent ClientRouter binding controller with deterministic observer/unsubscribe cleanup and rebind. |
| `src/views/map/mapViewBindings.ts` | Modify | Make unbind idempotent so swap and element teardown are safe. |
| `tests/maps/{panzoom-setup,map-view}.test.ts` | Modify | Test geometry/event modes and hidden-to-ready/destruction sequencing. |
| `tests/views/map/mapViewBindings.test.ts` | Create | Test one subscription/binding and idempotent unbind. |
| `tests/pages/map/{map-page.ts,map.spec.ts}` | Modify | Add geometry, release, and RightRail rebind coverage. |

## Interfaces / Contracts

```ts
interface PanInterval { min: number; max: number; }
interface BoundsMode { allowancePx: number; animate: boolean; }
// `allowancePx` is 0 for strict sources; gesture mode uses one finite constant.
function constrainTransform(input: TransformBoundsInput, mode: BoundsMode): PanPosition;
```

All inputs and output coordinates must be finite. An invalid/zero geometry frame must leave the prior transform intact and defer correction to the next resize, never emit `data-ready` early.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Axis combinations, four edges, non-1 scale, cap/release/resize | Pure helper tables and mocked Panzoom sequencing; RED first. |
| Integration | Precomputed hidden-to-ready transform; repeat-safe destroy/unbind | Vitest spies for observers, Panzoom, and `audioStore.subscribe`. |
| E2E | Ready stability, capped release recovery, reset/resize, RightRail A→B→A | Existing POM, browser geometry, console errors, test-only subscription diagnostics. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable classification | N/A | N/A |
| Git repository selection | N/A — no VCS integration | N/A | N/A |
| Commit state | N/A — planning does not commit | N/A | N/A |
| Push state | N/A — no push operation | N/A | N/A |
| PR commands | N/A — ask-always PR strategy is orchestration only | N/A | N/A |

## Migration / Rollout

No data migration or feature flag. Implement on top of the existing uncommitted Panzoom, zoom-attribute, marker, fixture, and E2E edits; do not fold unrelated marker/data changes into this scope. Roll back by reverting this change; no persisted state needs repair. PR creation remains ask-always.

## Open Questions

- [ ] Confirm the exact visual overscroll cap and smooth-back duration with product/design; tests will assert the named constants rather than an implicit feel.
