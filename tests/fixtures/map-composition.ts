import { mapFixtures } from './maps';

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

export const mapCompositionFixtures: MapCompositionFixture[] = mapFixtures.map(
  ({ slug, title }) => ({
    slug,
    title,
    previewCount: 1,
    layerIds: ['base'],
    baseFrame: { x: 0, y: 0, width: 100, height: 100 }
  })
);
