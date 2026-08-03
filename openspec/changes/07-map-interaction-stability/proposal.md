# Proposal: Map Interaction Stability

## Intent

Complete the interaction hardening deferred after `06-leaflet-migration`: predictable map movement, a stable first visible frame, and leak-free RightRail navigation. Users must retain control without exposing blank space or losing markers and paths after client-side navigation.

## Scope

### In Scope
- Define finite pan bounds: undersized maps move only within the viewport; oversized maps remain constrained to viewport edges.
- Allow a small, capped overscroll only during drag/pinch; return to valid bounds on release with a short smooth-back.
- Pre-compute and apply the initial transform, keeping the map hidden until its first valid constrained frame is ready.
- Bind, unbind, and rebind map data across Astro ClientRouter swaps so markers and paths persist without listener leaks.
- Add unit and E2E coverage for bounds, readiness, release behavior, and RightRail navigation.

### Out of Scope
- Momentum/inertia, elastic physics beyond the finite release-only allowance, or a Panzoom replacement.
- Audio behavior, marker/path visual redesign, and hover-card improvements.

## Capabilities

### New Capabilities
- `map-interaction`: bounded Panzoom transforms, release-only capped overscroll recovery, and stable ready-state initialization.

### Modified Capabilities
- `map-page`: ClientRouter lifecycle MUST clean up and restore map bindings, markers, and paths across RightRail navigation.

## Approach

Extend the custom `<map-view>` introduced by `06-leaflet-migration`; retain centralized bounds math rather than Panzoom containment. Separate gesture-time allowance from release-time correction. Initialize with computed scale/translation and reveal only after the first constraint. Keep bindings external in `MapPage.astro`, unregistering before swap and rebinding after swap.

## Migration Relationship

`06-leaflet-migration` remains the completed platform migration. This change stabilizes its DOM/SVG + Panzoom runtime; it does not restore Leaflet or alter its audio/store contracts.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/features/maps/lib/panzoom-setup.ts` | Modified | Bounds, finite gesture cap, release recovery |
| `src/features/maps/ui/map-view.ts` | Modified | Precomputed ready transform and lifecycle cleanup |
| `src/views/map/{MapPage.astro,mapViewBindings.ts}` | Modified | ClientRouter bind/unbind/rebind |
| `tests/{maps,pages/map}` | Modified | Unit and E2E regressions |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gesture jitter or excessive elastic motion | Med | Single finite cap; smooth-back only on release |
| Cached Astro scripts rebind twice | Med | Register hooks once; retain one active unbind |
| First-frame flash during image load | Low | Hide until computed transform is constrained |

## Rollback Plan

Revert this change to restore the current hard-clamp map interaction and page binding. No persisted-data migration is involved; `06` remains intact.

## Dependencies

- Completed `06-leaflet-migration` DOM/SVG + Panzoom map platform.
- Astro ClientRouter swap events and existing vanilla audio store bindings.

## Success Criteria

- [ ] Under- and oversized maps obey their respective bounds; drag overshoot never exceeds the defined finite cap and settles only after release.
- [ ] `data-ready` is emitted only after the initial transform is stable; no visible position jump occurs.
- [ ] RightRail navigation preserves rendered markers/paths and leaves exactly one active map subscription/binding.
- [ ] Unit and Playwright tests cover all four bounds directions, initial readiness, and round-trip navigation.
