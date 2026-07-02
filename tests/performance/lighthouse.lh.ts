import { playAudit } from 'playwright-lighthouse';
import { lighthouseTest } from './lighthouse-fixture';

/**
 * Lighthouse thresholds for static content pages.
 *
 * Home, proyecto, equipo, and datos are pure Astro pages with minimal JS.
 * They consistently score 95+ across all categories with optimized images.
 */
const STATIC_THRESHOLDS = {
  performance: 95,
  accessibility: 95,
  'best-practices': 95,
  seo: 95,
};

/**
 * Relaxed thresholds for interactive map pages.
 *
 * Map pages load Leaflet (~100 KB JS), React islands, audio engine, and
 * multiple SoundMarkers. A performance score of 80 is the realistic target;
 * the remaining categories stay at 95.
 */
const MAP_THRESHOLDS = {
  performance: 80,
  accessibility: 95,
  'best-practices': 95,
  seo: 95,
};

/**
 * Report output directory (relative to project root).
 */
const REPORT_DIR = 'test-results/lighthouse';

lighthouseTest.describe('Lighthouse audits', () => {
  lighthouseTest('home page', { tag: ['@perf', '@critical'] }, async ({ page, port }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await playAudit({
      page,
      port,
      thresholds: STATIC_THRESHOLDS,
      reports: {
        formats: { html: true, json: true },
        name: 'home',
        directory: REPORT_DIR,
      },
    });
  });

  lighthouseTest('proyecto page', { tag: ['@perf'] }, async ({ page, port }) => {
    await page.goto('/proyecto');
    await page.waitForLoadState('networkidle');

    await playAudit({
      page,
      port,
      thresholds: STATIC_THRESHOLDS,
      reports: {
        formats: { html: true },
        name: 'proyecto',
        directory: REPORT_DIR,
      },
    });
  });

  lighthouseTest('equipo page', { tag: ['@perf'] }, async ({ page, port }) => {
    await page.goto('/equipo');
    await page.waitForLoadState('networkidle');

    await playAudit({
      page,
      port,
      thresholds: STATIC_THRESHOLDS,
      reports: {
        formats: { html: true },
        name: 'equipo',
        directory: REPORT_DIR,
      },
    });
  });

  lighthouseTest('datos page', { tag: ['@perf'] }, async ({ page, port }) => {
    await page.goto('/datos');
    await page.waitForLoadState('networkidle');

    await playAudit({
      page,
      port,
      thresholds: STATIC_THRESHOLDS,
      reports: {
        formats: { html: true },
        name: 'datos',
        directory: REPORT_DIR,
      },
    });
  });

  lighthouseTest('map page', { tag: ['@perf', '@map'] }, async ({ page, port }) => {
    await page.goto('/avenida-de-aguirre-la-serena');
    await page.waitForLoadState('networkidle');

    await playAudit({
      page,
      port,
      thresholds: MAP_THRESHOLDS,
      reports: {
        formats: { html: true },
        name: 'map',
        directory: REPORT_DIR,
      },
    });
  });
});
