import type { Sound } from '../domain/types';

// 4 WAV files cycled across 15 sound slots:
//   marker-short.mp3  (0.8s, C5+E5)
//   marker-mid.mp3    (1.5s, G4+C5)
//   marker-long.mp3   (2.5s, E4+G4)
//   piece-drone.mp3   (5.0s, A2+C#3+A3)

const BEACH = '/sounds/mock/beach.mp3';
const BIRD = '/sounds/mock/bird.mp3';
const NIGHT = '/sounds/mock/night.mp3';
const PEOPLE = '/sounds/mock/people.mp3';
const TRAFFIC = '/sounds/mock/traffic.mp3';

export const mockSounds: Sound[] = [
  // Locación 1 — Plaza de Armas — La Serena (1216×864)
  {
    id: 101,
    title: 'Fuente central',
    description:
      'Murmullo constante del agua cayendo en la pileta principal de la plaza.',
    audioUrl: BEACH,
    position: { x: 608, y: 432 },
    mapId: 1
  },
  {
    id: 102,
    title: 'Tráfico peatonal',
    description:
      'Pasos dispersos, conversaciones breves y el vaivén de la gente transitando por la plaza.',
    audioUrl: BIRD,
    position: { x: 365, y: 270 },
    mapId: 1
  },
  {
    id: 103,
    title: 'Vendedores ambulantes',
    description:
      'Voces de vendedores ofreciendo productos y el sonido de sus carros moviéndose por las veredas.',
    audioUrl: NIGHT,
    position: { x: 912, y: 324 },
    mapId: 1
  },
  {
    id: 104,
    title: 'Palomas',
    description:
      'Aleteos y arrullos de palomas concentradas cerca de los bordes de la plaza.',
    audioUrl: PEOPLE,
    position: { x: 203, y: 594 },
    mapId: 1
  },
  {
    id: 105,
    title: 'Conversaciones en bancas',
    description:
      'Fragmentos de diálogos entre personas que descansan en las bancas de la plaza.',
    audioUrl: TRAFFIC,
    position: { x: 760, y: 648 },
    mapId: 1
  },

  // Locación 2 — Mercado — Coquimbo (864×1243, portrait)
  {
    id: 201,
    title: 'Pescadores',
    description:
      'Voces de pescadores descargando la jornada y el golpe seco de las cajas de pescado.',
    audioUrl: BEACH,
    position: { x: 216, y: 310 },
    mapId: 2
  },
  {
    id: 202,
    title: 'Cajas registradoras',
    description:
      'Sonidos mecánicos y digitales de las cajas registradoras en los puestos del mercado.',
    audioUrl: BIRD,
    position: { x: 504, y: 543 },
    mapId: 2
  },
  {
    id: 203,
    title: 'Conversaciones de clientes',
    description:
      'Diálogos animados entre compradores y vendedores regateando precios y eligiendo productos.',
    audioUrl: NIGHT,
    position: { x: 360, y: 930 },
    mapId: 2
  },
  {
    id: 204,
    title: 'Música del local',
    description:
      'Cumbia y boleros que salen de un pequeño radio en uno de los puestos de víveres.',
    audioUrl: PEOPLE,
    position: { x: 648, y: 853 },
    mapId: 2
  },
  {
    id: 205,
    title: 'Pasos en pasillos',
    description:
      'Eco de pasos sobre el piso húmedo de los pasillos centrales del mercado.',
    audioUrl: TRAFFIC,
    position: { x: 108, y: 1085 },
    mapId: 2
  },

  // Locación 3 — Borde Costero (1160×912)
  {
    id: 301,
    title: 'Olas rompiendo',
    description:
      'Oleaje mediano que rompe contra las rocas y la orilla de la playa.',
    audioUrl: BIRD,
    position: { x: 580, y: 741 },
    mapId: 3
  },
  {
    id: 302,
    title: 'Gaviotas',
    description: 'Gritos y vuelo de gaviotas sobrevolando la línea de costa.',
    audioUrl: BEACH,
    position: { x: 387, y: 342 },
    mapId: 3
  },
  {
    id: 303,
    title: 'Viento en los postes',
    description:
      'Viento costero que golpea los postes y cables de la avenida del borde.',
    audioUrl: NIGHT,
    position: { x: 919, y: 456 },
    mapId: 3
  },
  {
    id: 304,
    title: 'Pasos en la arena',
    description:
      'Pasos amortiguados de personas caminando por la arena húmeda cerca del agua.',
    audioUrl: PEOPLE,
    position: { x: 725, y: 228 },
    mapId: 3
  }
];
