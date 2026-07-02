# Spec: Image Assets

> Source: 04-optimization — Map Page Optimization (archived 2026-07-02)

## Requirements

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
