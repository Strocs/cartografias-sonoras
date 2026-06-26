import { playAudit } from 'playwright-lighthouse';
import { lighthouseTest } from './lighthouse-fixture';

/**
 * Lighthouse thresholds.
 *
 * Accessibility, best-practices, and SEO are set high — static Astro pages
 * consistently hit 99-100. Performance is set to 50 because the dev server
 * and unoptimized 3MB PNG map assets prevent higher scores. Production
 * images should be converted to WebP/AVIF and resized before raising this.
 */
const THRESHOLDS = {
  performance: 50,
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
      thresholds: THRESHOLDS,
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
      thresholds: THRESHOLDS,
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
      thresholds: THRESHOLDS,
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
      thresholds: THRESHOLDS,
      reports: {
        formats: { html: true },
        name: 'datos',
        directory: REPORT_DIR,
      },
    });
  });
});
