# Spec: Coverage

> Source: 04-optimization — Map Page Optimization (archived 2026-07-02)

## Requirements

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
