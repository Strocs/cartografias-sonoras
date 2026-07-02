# Delta Spec: 04-optimization

## map-page (MODIFIED)

### Requirement: Astro Static Shell

The `/:slug` page MUST be a static `.astro` file that renders the full page layout as static HTML. React MUST NOT own the page wrapper.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Static render | `/[slug].astro` request | page loads | full HTML shell (layout, RightRail, title) served with zero JS |
| Progressive enhancement | JS disabled | user visits map page | static map info and rail visible; only interactive controls unavailable |

Previously: `ActiveMapLayout.tsx` wrapped the entire page as a single `client:only` React island.

### Requirement: Atomic React Islands

Each React island MUST have exactly ONE interactive responsibility. Every `client:*` directive MUST be individually justified.

| Island | Directive | Responsibility |
|--------|-----------|----------------|
| MapViewport | `client:only` | Leaflet map rendering; requires DOM, breaks SSR |
| AudioControls | `client:visible` | play/pause/seek; hydrates when scrolled into view |
| SoundMarker | `client:visible` | marker interaction + progress ring |

Previously: `ActiveMapLayout` was a monolithic `client:only` wrapper containing all interactive behavior.

### Requirement: Static Markup Extraction

RightRail, map title, and HoverCard content MUST be `.astro` components. They MUST render as static HTML with zero JS.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| RightRail | map page loads | Astro renders | RightRail HTML present without JS |
| HoverCard | sound hovered | Astro renders card | card content is static markup; CSS handles transition |

### Requirement: CSS Transitions Over Framer Motion

Framer Motion MUST NOT be used in map-page components. Animations MUST use CSS transitions or `@keyframes`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| HoverCard appear | card enters viewport | CSS transition fires | smooth opacity/transform without Motion runtime |

### Requirement: No Manual Memoization

React 19 Compiler handles optimization. `useMemo` and `useCallback` MUST NOT appear in map-page islands.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Derived value | component needs filtered list | renders | computed inline; no `useMemo` |
| Event handler | component defines onClick | renders | plain function; no `useCallback` |

---

## image-assets (ADDED)

### Requirement: Optimized Image Formats

Map card images MUST be served in WebP or AVIF with PNG fallback. The Astro image service with Sharp MUST generate variants at build time.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Modern browser | browser supports WebP | `<Image>` renders | WebP served |
| Legacy browser | no WebP support | `<Image>` renders | PNG fallback served |

### Requirement: Responsive Images

Map card images MUST include `srcset` and `sizes` attributes via Astro `<Image />` or `getImage()`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Mobile viewport | 320px width | card renders | smallest variant selected |
| Desktop viewport | 1200px width | card renders | larger variant selected |

### Requirement: Lazy Loading

Below-fold map card images MUST set `loading="lazy"`. Above-fold images MAY use `loading="eager"`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Home page cards | cards below viewport | page loads | images not fetched until scrolled into view |

### Requirement: Lighthouse Performance Threshold

After optimization, Lighthouse Performance score MUST be >= 95 on both home and map pages.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| CI verification | production build | Lighthouse audit runs | score >= 95 in all categories |

---

## cross-feature-imports (ADDED)

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

---

## coverage (ADDED)

### Requirement: Coverage Instrumentation

`@vitest/coverage-v8` MUST be installed and configured in `vitest.config.ts`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Coverage run | `pnpm test:coverage` executed | tests complete | coverage report generated |

### Requirement: Coverage Thresholds

All thresholds MUST be >= 70%: branches, functions, lines, statements.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Threshold met | coverage >= 70% all metrics | `pnpm test:coverage` | exit 0 |
| Threshold failed | any metric < 70% | `pnpm test:coverage` | exit 1 |

---

## e2e-reliability (ADDED)

### Requirement: Playwright webServer Guard

`playwright.config.ts` MUST define a `webServer` block that auto-starts the dev server before E2E tests.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Local dev | no server running | `pnpm test:e2e` | dev server starts; tests run; server stops |
| Reuse server | server already running locally | `pnpm test:e2e` | existing server reused (`reuseExistingServer: true`) |
| CI | `CI=true` | `pnpm test:e2e` | server always started fresh (`reuseExistingServer: false`) |

---

## bottom-player (MODIFIED)

### Requirement: Persistent Bottom Bar

The system MUST render a fixed bottom bar when ANY audio is active. The bar MUST NOT render when all audio is idle. Background: teal `#073942`, border: bronze `#C2A576/30`, rounded-3xl. Entry/exit animations MUST use CSS transitions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Bar appears | no audio active | user plays a sound | bottom bar slides in via CSS transition |
| Bar hides | sound is playing | user stops last sound | bottom bar slides out via CSS transition |
| Piece mode | piece is playing | bar renders | shows piece title, author, map thumbnail |

(Previously: bar used Framer Motion for entry/exit animations.)

---

## sound-marker (MODIFIED)

### Requirement: Marker Visual States

The marker MUST animate between idle, playing, and paused states using CSS transitions.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Idle to playing | marker is idle | user clicks | marker scales to 56px via CSS transition; progress ring appears; icon changes to pause |
| Playing to paused | marker is playing | user clicks | marker stays 56px; ring holds; icon changes to play via CSS transition |
| Paused to playing | marker is paused | user clicks | ring resumes; icon changes to pause via CSS transition |

(Previously: marker used Framer Motion for state transitions.)
