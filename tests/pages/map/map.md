### E2E Tests: Map composition handoff

**Suite ID:** `MAP-E2E`
**Feature:** Static preview and live multi-layer map composition.

---

## Test Case: `MAP-E2E-001` - Preview handoff parity

**Priority:** `critical`

**Description/Objective:** Verify the prerendered labelled preview remains the only accessible composition while the live layers take over.

### Flow Steps:
1. Open a map route.
2. Confirm one labelled supplied preview is available before waiting for readiness.
3. Wait for the live map and compare fixture layer order and base geometry.

### Expected Result:
- Preview and live layers have one accessible map entity and decorative child images.
- The base layer is full-frame and ordered first.

## Test Case: `MAP-E2E-002` to `MAP-E2E-004` - Navigation, failure, and motion

**Priority:** `high`

**Description/Objective:** Exercise ClientRouter rebinding, base fallback, optional degraded settlement, keyboard markers, and reduced-motion policy.

### Expected Result:
- Navigation creates only the destination markers.
- Base errors retain the preview and announce an alert; optional errors allow degraded readiness.
- Keyboard markers work and reduced motion does not activate declared effects.
