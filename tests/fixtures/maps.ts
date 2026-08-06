/**
 * E2E-safe map metadata fixture.
 *
 * Derived from the production layout declarations (`map-layouts.ts`), which
 * are kept free of image-asset imports so Playwright's Node-side test runner
 * can load them without a PNG/WebP transform. Any change to slugs or titles
 * flows into the suite automatically.
 */
import { mapLayouts } from '../../src/features/maps/data/map-layouts';

export interface MapFixture {
  id: number;
  slug: string;
  title: string;
  soundPieceEnabled: boolean;
}

export const mapFixtures: MapFixture[] = mapLayouts.map(
  ({ id, slug, title, soundPieceEnabled }) => ({
    id,
    slug,
    title,
    soundPieceEnabled
  })
);