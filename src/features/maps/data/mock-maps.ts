import type { Map } from '../domain/types';

import avDeAguirre from '../../../assets/maps/av-de-aguirre.png';
import locacion2 from '../../../assets/maps/locacion-2.png';
import locacion3 from '../../../assets/maps/locacion-3.png';

export const mockMaps: Map[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena',
    image: {
      src: avDeAguirre.src,
      width: avDeAguirre.width,
      height: avDeAguirre.height,
      asset: avDeAguirre,
    },
    soundPieceId: 1
  },
  {
    id: 2,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena',
    image: {
      src: locacion2.src,
      width: locacion2.width,
      height: locacion2.height,
      asset: locacion2,
    },
    soundPieceId: 2
  },
  {
    id: 3,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo',
    image: {
      src: locacion3.src,
      width: locacion3.width,
      height: locacion3.height,
      asset: locacion3,
    },
    soundPieceId: 3
  }
];
