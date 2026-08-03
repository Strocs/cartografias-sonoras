# Delta for Map Page

## ADDED Requirements

### Requirement: ClientRouter Map Binding Lifecycle

Map page bindings SHALL survive Astro ClientRouter RightRail navigation without listener leaks or duplicate subscriptions.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Before-swap cleanup | map page is active and bound | `astro:before-swap` fires | the stored `unbind()` is called exactly once; all markers and paths are detached from the outgoing DOM |
| After-swap rebind | new map page DOM is inserted | `astro:after-swap` fires | `bindMapView()` is called exactly once for the new `<map-view>` after it emits `data-ready` |
| Idempotent round-trip | user navigates A → B → A via RightRail | each swap occurs | at most one active `unbind()` and one active binding exist at any time; `audioStore` subscriptions do not accumulate |
| Module-script caching guard | inline module script may be cached by ClientRouter | lifecycle hooks are registered | hooks are registered once; stale unbind references are replaced on every bind |

### Requirement: Single-Subscription Diagnostic

The system SHOULD expose a test-only diagnostic so E2E tests can verify subscription count.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Subscriber count | E2E test queries store diagnostics | after RightRail round-trip | active marker/path subscription count equals one per map page instance |
