import type { Map } from '../domain/types';

export const mockMaps: Map[] = [
  {
    id: 1,
    slug: 'locacion-1',
    title: 'Plaza de Armas — La Serena',
    image: { src: '/maps/locacion-1.png', width: 1216, height: 864 },
    soundPieceId: 1,
  },
  {
    id: 2,
    slug: 'locacion-2',
    title: 'Mercado — Coquimbo',
    image: { src: '/maps/locacion-2.png', width: 864, height: 1243 },
    soundPieceId: 2,
  },
  {
    id: 3,
    slug: 'locacion-3',
    title: 'Borde Costero',
    image: { src: '/maps/locacion-3.png', width: 1160, height: 912 },
    soundPieceId: 3,
  },
];
