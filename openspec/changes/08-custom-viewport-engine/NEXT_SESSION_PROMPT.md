# Next Session Prompt: `08-custom-viewport-engine`

Copy the prompt below into the next SDD orchestrator/agent session.

```text
Continue the named SDD change `08-custom-viewport-engine` in `/home/strocs/dev/cartografias-sonoras/cartografias-sonoras` from:

- `openspec/changes/08-custom-viewport-engine/init.md`
- `openspec/changes/08-custom-viewport-engine/NEXT_SESSION_PROMPT.md`

This is a change-level successor handoff, NOT project-level `sdd-init`. Do not recreate or alter the existing project initialization. Recover the existing SDD/Engram context and proceed phase by phase. Do not delegate unless the active SDD orchestration protocol explicitly requires a phase executor; preserve each phase gate and do not collapse phases.

Mission:
Design and deliver a project-owned professional custom viewport engine inspired by Panzoom's proven performance and optimization patterns. Do not copy Panzoom source, depend on its internals, or treat its behavior as an undocumented contract. The engine must own transform state, inputs, bounds, rendering, lifecycle, public API, observability, and tests while preserving alignment among the map image, DOM markers, and SVG paths.

Non-negotiable context:
- `07-map-interaction-stability` is stopped/superseded and was not successfully archived.
- Do NOT continue its old PR2/PR3 or any remaining predecessor task.
- Its Work Unit 1/PR1 and passing focused tests are experimental evidence only, not production-ready implementation.
- The working tree contains extensive uncommitted experimental and concurrent work. Audit it before planning; preserve unrelated changes and never erase work merely because it is uncommitted.
- The project is not in production. Backward compatibility is not required during this migration.
- Existing APIs/data flows may be deliberately broken or replaced for a cleaner, safer engine, but every break must be documented, all consumers/tests migrated, and no unjustified compatibility shim or dead path may remain.
- Keep all technical artifacts, code, comments, JSDoc, and tests in English.
- Use `playwright-cli` exactly for manual browser verification. NEVER use `npx playwright`. Repository test scripts may run the configured Playwright E2E runner.
- Do not commit, push, or open a PR unless the user later explicitly requests it.

Required sequence and gates:

1. Preflight and session recovery
   - Detect the actual project, load relevant current skills/instructions, recover Engram context, review active memories, inspect `openspec/config.yaml`, and inspect `git status` plus the full relevant diff.
   - Confirm this is the named change `08-custom-viewport-engine`, not a new project initialization.

2. Read authoritative init and predecessor evidence
   - Read the successor `init.md` first.
   - Then read `openspec/changes/07-map-interaction-stability/closure.md`, `apply-progress.md`, `explore-panzoom-alternatives.md`, and relevant predecessor proposal/spec/design/tasks/review evidence.
   - Explicitly record that predecessor PR2/PR3 are cancelled and PR1 is experimental.

3. Audit the existing uncommitted implementation
   - Trace the actual current viewport pipeline, transform authorities, gesture handling, bounds, rendering, readiness, Astro lifecycle, events, subscriptions, consumers, tests, CSS, types, fixtures, and dependency usage.
   - Classify relevant dirty-worktree changes as reusable evidence, migration input, unrelated work, or obsolete experiment. Do not silently preserve or delete them.
   - Identify duplicate state, post-render corrections, listener/subscription ownership, layout reads/writes, animation scheduling, and image/marker/path alignment assumptions.

4. Exploration and alternatives confirmation
   - Create only the named-change exploration artifact for this phase.
   - Revalidate the custom-engine direction against the real current code. Compare a narrow project-owned engine with any credible alternative or reduced-scope fallback; do not reopen rejected options without new evidence.
   - Define recommended boundaries among pure state/geometry, input normalization, scheduling/rendering, lifecycle, API/events, and integrations.
   - Finish with risks, affected areas, recommendation, and an explicit Ready for Proposal gate. Stop if evidence is insufficient.

5. Proposal
   - Create the proposal only after exploration is accepted/ready.
   - State intent, scope/non-scope, migration/breakage policy, affected consumers, rollback/containment strategy, risks, and success outcomes.
   - Do not present the experimental PR1 as an accepted starting implementation.

6. Specifications
   - Write delta specs with RFC 2119 language and Given/When/Then scenarios.
   - Specify one authoritative transform state; image/DOM-marker/SVG-path alignment; Pointer Events drag/pinch; pointer capture/cancel/lost-capture; wheel normalization and focal zoom; finite scale/pan bounds; undersized/oversized content; controlled overscroll and deterministic smooth return; reset/control APIs; resize; reduced motion; animation interruption; readiness/first stable frame; Astro navigation/reconnection/teardown; observability; performance; and tests.
   - Include deliberate migration of broken/replaced consumers and explicit absence of compatibility shims unless justified.

7. Design
   - Define the state machine, coordinate spaces, transform convention/order, pure transition/geometry contracts, frame scheduler, measurement/mutation discipline, input ownership, public API, event payloads, error/invariant handling, lifecycle sequence, and teardown ownership.
   - Use one authoritative `{x, y, scale}` transform state plus explicitly modeled gesture/animation state. DOM style, component state, adapters, and consumers must never become competing authorities.
   - Detail allocation/layout performance strategy, stale-frame cancellation, animation interruption, and how all visual layers share the transform.
   - Document every intentional API/event/type/data-flow break and its consumer migration.

8. Tasks and review forecast
   - Produce phased, testable tasks only after design approval.
   - Include RED/GREEN/refactor where useful, consumer migration, E2E/manual verification, observability, performance evidence, and mandatory Cleanup.
   - Forecast changed lines/files and reviewer burden. Split implementation into reviewable work units with explicit dependencies, verification, and rollback boundaries. Do not resurrect the predecessor PR numbering or scope.

9. Implementation in reviewable work units
   - Implement only approved tasks, one bounded work unit at a time.
   - Keep tests and migrated consumers with the behavior they validate. Preserve unrelated dirty-worktree changes.
   - Treat architecture simplification and deletion of replaced paths as part of the migration, not deferred cleanup.

10. Bounded review
   - Run focused code review after each meaningful work unit and a final integrated review.
   - Prioritize correctness, state-authority violations, geometry/alignment, gesture edge cases, lifecycle leaks, performance regressions, accessibility/reduced motion, and missing tests.
   - Bound review/fix cycles using the active review protocol; do not loop indefinitely or broaden scope without a new decision.

11. Independent verification
   - Use an independent verification phase/agent where supported; verification must evaluate approved proposal/specs/design/tasks against the actual diff, not rely on implementation claims.
   - Run unit/integration tests, E2E, typecheck, lint, production build, and targeted performance/leak checks.
   - Use `playwright-cli` exactly for manual browser scenarios: drag, pinch where supported, wheel focal zoom, bounds, overscroll/release, smooth return/interruption, reset, resize, readiness, Astro navigation/reconnection, and layer alignment. Never use `npx playwright`.

12. Mandatory final Cleanup phase
   - Remove `@panzoom/panzoom` from application dependencies and lockfile when no longer transitively required.
   - Remove dead Panzoom adapters, mocks, compatibility shims, temporary diagnostics, debug events, and instrumentation.
   - Remove/update stale specs/tasks and obsolete CSS, events, types, exports, tests, and data flows.
   - Verify the dependency lockfile and production bundle contain no unintended Panzoom code or duplicate viewport engine.
   - Update architecture documentation and public JSDoc to match the final API, state, event, readiness, and lifecycle contracts.
   - Run the full test/integration suite, full E2E suite, typecheck, lint, and production build after cleanup.
   - Prove repeated initialization, Astro navigation, custom-element reconnect, resize, and teardown create no duplicate subscriptions, observers, animation frames/loops, pointer/wheel handlers, or other listeners. Record exact evidence.
   - Cleanup failure blocks verification completion and archive.

13. Archive
   - Archive only after implementation, bounded review, independent verification, and Cleanup all pass.
   - Confirm final specs reflect actual behavior, all task dispositions are accurate, evidence is recorded, and the predecessor remains marked stopped/superseded rather than successfully archived.

Professional engine requirements that no phase may weaken:
- One authoritative transform state and deterministic state transitions.
- Correct Pointer Events drag/pinch semantics, pointer capture, cancellation, and multi-pointer tracking.
- Normalized wheel handling, focal zoom, finite bounds, controlled overscroll, and smooth deterministic return.
- Stable readiness and first frame; interruption-safe rendering with no stale scheduled frame.
- Leak-free Astro/custom-element lifecycle and provably idempotent setup/teardown.
- Allocation-conscious hot paths, separated measurement/mutation, no avoidable layout thrashing, and testable performance expectations.
- Typed public API and observability without exposing private mutable state.
- Permanent alignment of map image, DOM markers, and SVG paths.
- Comprehensive pure, integration, E2E, lifecycle/leak, migration, and performance-sensitive tests.

At every phase, persist the corresponding OpenSpec artifact and equivalent Engram topic according to project conventions. Stop at phase gates when approval or missing evidence requires it. Do not jump directly from this bootstrap to application implementation.
```
