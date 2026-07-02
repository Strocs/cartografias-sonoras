# Spec: E2E Reliability

> Source: 04-optimization — Map Page Optimization (archived 2026-07-02)

## Requirements

### Requirement: Playwright webServer Guard

`playwright.config.ts` MUST define a `webServer` block that auto-starts the dev server before E2E tests.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Local dev | no server running | `pnpm test:e2e` | dev server starts; tests run; server stops |
| Reuse server | server already running locally | `pnpm test:e2e` | existing server reused (`reuseExistingServer: true`) |
| CI | `CI=true` | `pnpm test:e2e` | server always started fresh (`reuseExistingServer: false`) |
