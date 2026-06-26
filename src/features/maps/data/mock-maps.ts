import type { Map } from '../domain/types';

export const mockMaps: Map[] = [
  {
    id: 1,
    slug: 'avenida-de-aguirre-la-serena',
    title: 'Avenida de Aguirre - La Serena',
    image: { src: '/maps/av-de-aguirre.png', width: 2289, height: 1636 },
    soundPieceId: 1
  },
  {
    id: 2,
    slug: 'plaza-de-armas-la-serena',
    title: 'Plaza de Armas - La Serena',
    image: { src: '/maps/locacion-2.png', width: 864, height: 1243 },
    soundPieceId: 2
  },
  {
    id: 3,
    slug: 'cruz-del-tercer-milenio-coquimbo',
    title: 'Cruz del Tercer Milenio - Coquimbo',
    image: { src: '/maps/locacion-3.png', width: 1160, height: 912 },
    soundPieceId: 3
  }
];
