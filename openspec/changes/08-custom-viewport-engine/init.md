# Change Bootstrap: Custom Viewport Engine

**Change name:** `08-custom-viewport-engine`  
**Status:** Initialized for successor exploration; no proposal, specification, design, tasks, or implementation is authorized by this file  
**Reference phrase:** `Continue SDD change 08-custom-viewport-engine from its init and NEXT_SESSION_PROMPT.md`

## Start Here

This is the authoritative starting context for a fresh SDD change that will replace the current Panzoom-backed map interaction pipeline with a project-owned professional viewport engine. The engine may learn from Panzoom's proven performance and optimization patterns, but it MUST NOT copy Panzoom source, depend on Panzoom internals, or preserve the existing adapter merely for compatibility.

The next session MUST read this file before creating any successor artifact or modifying application code.

## Predecessor Relationship

`07-map-interaction-stability` is stopped and superseded. It was not successfully completed or archived.

- Work Unit 1 and tasks 1.1-1.5 are retained only as experimental evidence.
- Planned PR2, PR3, and all remaining predecessor tasks are cancelled. They MUST NOT continue.
- Passing focused predecessor tests does not establish production readiness or architectural acceptance.
- The predecessor's proposal, specs, design, tasks, implementation, review findings, and alternative analysis are inputs to audit, not requirements to inherit.
- Read `../07-map-interaction-stability/closure.md`, `apply-progress.md`, and `explore-panzoom-alternatives.md` before exploration.

## Experimental Workspace Warning

The working tree contains extensive uncommitted application and test changes, including the predecessor's experimental Work Unit 1 and other concurrent map, marker, path, fixture, CSS, Astro, and E2E work. The next session MUST inspect the actual worktree and diff before planning.

Do not assume that uncommitted code is approved, internally consistent, production-ready, owned by this change, or safe to delete. Preserve unrelated work. Classify every relevant existing change as reusable evidence, migration input, unrelated work, or obsolete experiment before editing it.

## Problem Statement

The project currently owns most gesture, bounds, event, lifecycle, and integration behavior while delegating transform state and rendering through `@panzoom/panzoom`. This split creates competing authorities, post-render correction risk, opaque state synchronization, mock burden, dead bundle surface, and fragile map-image/DOM-marker/SVG-path coordination.

The successor must establish one coherent viewport system that owns transform state, input processing, bounds, rendering, lifecycle, public API, observability, and tests. It must keep the map image, DOM sound markers, and SVG paths geometrically aligned through initialization, navigation, resize, pan, zoom, pinch, release, reset, and teardown.

## Hard Architectural Constraints

- Use one authoritative transform state for `x`, `y`, `scale`, gesture phase, and any animation target. No DOM reads, adapter state, component fields, or event consumers may become a second authority.
- Build a project-owned engine with explicit boundaries between pure geometry/state transitions, input normalization, scheduling/rendering, lifecycle, and integrations.
- Use Pointer Events professionally: pointer capture, multi-pointer tracking, cancellation/lost capture handling, stable pinch centroid/distance calculations, and deterministic release.
- Normalize wheel input and zoom around the intended focal point. Prevent browser scrolling only when the viewport deliberately consumes the gesture.
- Define finite scale and pan bounds for undersized and oversized content, resize, focal zoom, gestures, and programmatic commands.
- Define controlled overscroll and deterministic smooth return to strict bounds. No correction jump, unbounded drift, or conflicting animation may survive gesture release.
- Specify animation interruption, reduced-motion behavior, frame scheduling, stale-frame cancellation, and avoidance of layout thrashing.
- Render image, DOM marker, and SVG path layers from the same transform so their alignment is invariant.
- Expose a deliberate typed public API and observable state/events. Consumers MUST NOT depend on private mutable state or implementation timing.
- Define readiness as a stable first render with valid geometry and transform. Do not emit readiness before all required dimensions and layers are coherent.
- Integrate safely with Astro client navigation/custom-element lifecycle. Setup and teardown MUST be idempotent and leave no duplicate subscriptions, observers, animation frames, or listeners.
- Keep hot-path work allocation-light and frame-bounded. Separate measurement from mutation and prove behavior under sustained pointer, pinch, and wheel input.
- Test pure geometry/state transitions, input/lifecycle integration, consumer migration, visual alignment invariants, browser interactions, cleanup, and performance-sensitive behavior.
- Use `playwright-cli` exactly for manual browser verification. Never use `npx playwright` for that purpose. Repository E2E scripts may still execute the configured Playwright test runner.
- Keep all technical artifacts, code identifiers, comments, documentation, and test descriptions in English.

## Migration Policy

The project is not in production. Backward compatibility is not required for this migration.

The implementation MAY intentionally replace existing APIs, events, types, adapters, tests, and data flows when that produces a cleaner and safer engine. Every break MUST be deliberate, documented in SDD artifacts, migrated across all consumers and tests, and verified. Do not leave compatibility shims, parallel pathways, or dead code unless the design records a concrete justification and removal plan.

## Scope

### In Scope

- Audit and disposition of the current uncommitted Panzoom experiment and all viewport consumers.
- A project-owned transform and interaction engine.
- Pointer drag, pinch, wheel, controls, reset, bounds, overscroll, smooth return, resize, interruption, and reduced motion.
- Readiness, Astro lifecycle, public API, observability, listener/subscription ownership, and teardown.
- Image, DOM marker, and SVG path alignment.
- Unit, integration, E2E, lifecycle/leak, and relevant performance tests.
- Dependency, bundle, documentation, and cleanup work required to complete the migration.

### Out of Scope Unless Exploration Proves Necessary

- New map content, product features, visual redesign, inertia/physics, collaborative editing, or a general-purpose published library.
- Continuing predecessor PR2/PR3 or treating Work Unit 1 as an approved production slice.
- Copying Panzoom source or reproducing unrelated Panzoom features.

## Explicit Assumptions

- Modern evergreen browsers and the repository's current Node/pnpm toolchain remain the target.
- CSS transforms remain suitable for the static image plus DOM/SVG overlay model.
- The custom engine can be intentionally narrow: only project-required capabilities belong in its contract.
- Existing tests and implementation are evidence to evaluate, not immutable compatibility contracts.
- Exploration may revise module boundaries and public APIs, but it may not weaken the single-authority, lifecycle, alignment, input, bounds, readiness, or cleanup constraints.
- No application implementation begins until proposal, specs, design, and tasks have passed their respective gates.

## Required SDD Sequence

1. Recover session/project context and inspect repository status.
2. Read this init and predecessor closure/evidence.
3. Audit the existing uncommitted implementation and consumers without treating it as a baseline.
4. Perform named-change exploration and confirm alternatives and engine boundaries.
5. Create and approve proposal.
6. Create and approve delta specs.
7. Create and approve design.
8. Create tasks with a review workload forecast and reviewable work units.
9. Implement in reviewable work units with migrated consumers and tests.
10. Run bounded review with explicit fix/re-review limits.
11. Run independent verification against approved artifacts.
12. Complete the mandatory Cleanup phase.
13. Archive only after all gates and cleanup evidence pass.

## Mandatory Final Cleanup Phase

Cleanup is a first-class implementation phase, not optional polish. Before archive, the change MUST:

- Remove `@panzoom/panzoom` from source and dependencies, including its lockfile entry when no longer transitively required.
- Remove dead Panzoom adapters, mocks, compatibility shims, temporary diagnostics, debug events, and instrumentation.
- Remove or update stale successor specs/tasks and any obsolete CSS, events, types, exports, tests, and data flows.
- Verify the dependency lockfile and production bundle contain no unintended Panzoom code or duplicate viewport implementation.
- Update architecture/user-facing documentation and public JSDoc for the final API and lifecycle contracts.
- Run the full unit/integration suite, E2E suite, typecheck, lint, and production build.
- Prove repeated initialization, Astro navigation, reconnection, resize, and teardown create no duplicate subscriptions, observers, animation loops, or DOM/event listeners.
- Record exact commands, results, bundle/dependency evidence, and any justified residual code in the verification/archive evidence.

## Entry Criteria

Exploration may begin only when the next agent has:

- Recovered Engram/project context and inspected current repository status/diff.
- Read this file and `NEXT_SESSION_PROMPT.md`.
- Read predecessor `closure.md`, `apply-progress.md`, and `explore-panzoom-alternatives.md`.
- Confirmed `07-map-interaction-stability` will not continue or be archived as successful.
- Identified all relevant uncommitted files without modifying or discarding unrelated work.
- Confirmed technical artifacts will remain in English and manual browser verification will use `playwright-cli` exactly.

Proposal may begin only after exploration documents current state, alternatives, recommendation, affected consumers, migration risks, and readiness for proposal. Implementation may begin only after approved proposal, specs, design, and tasks exist.

## Next Reference

Use `NEXT_SESSION_PROMPT.md` verbatim or reference:

> Continue SDD change `08-custom-viewport-engine` from its `init.md` and `NEXT_SESSION_PROMPT.md`.
