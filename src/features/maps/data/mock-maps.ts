import type { Map } from '../domain/types';

import avDeAguirre from '../../../assets/maps/av-de-aguirre.png';
import locacion2 from '../../../assets/maps/locacion-2.png';
import locacion3 from '../../../assets/maps/locacion-3.png';

const composition = <T extends import('astro').ImageMetadata>(asset: T) => {
  const image = {
    src: asset.src,
    width: asset.width,
    height: asset.height,
    asset
  };
  return {
    images: [
      {
        ...image,
        id: 'base',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        optional: false,
        effect: 'none'
      }
    ] as const,
    preview: image
  };
};

export const mockMaps: Map[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena',
    ...composition(avDeAguirre),
    soundPieceId: 1
  },
  {
    id: 2,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena',
    ...composition(locacion2),
    soundPieceId: 2
  },
  {
    id: 3,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo',
    ...composition(locacion3),
    soundPieceId: 3
  }
];
