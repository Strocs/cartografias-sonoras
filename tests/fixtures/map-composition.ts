/**
 * E2E composition fixture.
 *
 * Derived from the production layout declarations (`map-layouts.ts`) instead
 * of a hand-mirrored copy: layer ids and the base frame follow the data the
 * app actually renders, so adding a layer never requires touching this file.
 * The base layer is guaranteed to exist by the layout's tuple type.
 */
import { mapLayouts } from '../../src/features/maps/data/map-layouts';

export interface MapCompositionFixture {
  slug: string;
  title: string;
  previewCount: number;
  layerIds: string[];
  baseFrame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const mapCompositionFixtures: MapCompositionFixture[] = mapLayouts.map(
  ({ slug, title, layers }) => {
    const [base] = layers;
    return {
      slug,
      title,
      previewCount: 1,
      layerIds: layers.map((layer) => layer.id),
      baseFrame: {
        x: base.frame.x,
        y: base.frame.y,
        width: base.frame.width,
        height: base.frame.height
      }
    };
  }
);