import type { SoundPiece } from '../domain/types';

export const mockSoundPieces: SoundPiece[] = [
  {
    id: 1,
    mapId: 1,
    title: 'Paisaje de la plaza',
    author: 'Colectivo Marcasonora',
    description:
      'Composición sonora construida a partir del registro cotidiano de la Plaza de Armas de La Serena. Entre fuentes, pasos y conversaciones, la obra propone una escucha atenta del centro cívico como espacio de encuentro.',
    audioUrl: '/sound-pieces/locacion-1/paisaje-de-la-plaza.mp3',
  },
  {
    id: 2,
    mapId: 2,
    title: 'Ritmos del mercado',
    author: 'Colectivo Marcasonora',
    description:
      'Pieza que navega entre los puestos del mercado de Coquimbo, entrelazando voces, cajas registradoras y música de los locales para revelar el pulso sonoro del comercio local.',
    audioUrl: '/sound-pieces/locacion-2/ritmos-del-mercado.mp3',
  },
  {
    id: 3,
    mapId: 3,
    title: 'Línea de costa',
    author: 'Colectivo Marcasonora',
    description:
      'Obra inspirada en el borde costero, donde el oleaje, las gaviotas y el viento construyen una narrativa sonora sobre el encuentro entre la ciudad y el mar.',
    audioUrl: '/sound-pieces/locacion-3/linea-de-costa.mp3',
  },
];
