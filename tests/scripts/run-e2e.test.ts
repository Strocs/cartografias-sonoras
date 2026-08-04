import { describe, expect, it } from 'vitest';

import { buildPlaywrightArgs } from '../../scripts/run-e2e.mjs';

describe('buildPlaywrightArgs', () => {
  it('defaults to the chromium project when no args are given', () => {
    expect(buildPlaywrightArgs([])).toEqual(['--project=chromium']);
  });

  it('strips a leading literal -- separator added by pnpm', () => {
    expect(buildPlaywrightArgs(['--', 'tests/pages/map/map.spec.ts'])).toEqual([
      '--project=chromium',
      'tests/pages/map/map.spec.ts'
    ]);
  });

  it('forwards file filters after a literal -- separator', () => {
    expect(
      buildPlaywrightArgs(['--', 'tests/a.spec.ts', 'tests/b.spec.ts'])
    ).toEqual(['--project=chromium', 'tests/a.spec.ts', 'tests/b.spec.ts']);
  });

  it('preserves other playwright flags like --grep and --workers', () => {
    expect(buildPlaywrightArgs(['--', '--grep', 'map', '--workers=1'])).toEqual(
      ['--project=chromium', '--grep', 'map', '--workers=1']
    );
  });

  it('keeps an explicit --project flag when provided', () => {
    expect(buildPlaywrightArgs(['--', '--project=lighthouse'])).toEqual([
      '--project=lighthouse'
    ]);
  });

  it('keeps an explicit space-separated --project flag when provided', () => {
    expect(buildPlaywrightArgs(['--', '--project', 'lighthouse'])).toEqual([
      '--project',
      'lighthouse'
    ]);
  });
});
