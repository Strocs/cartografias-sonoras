import type { Sound } from '../domain/types';

// 4 WAV files cycled across 15 sound slots:
//   marker-short.mp3  (0.8s, C5+E5)
//   marker-mid.mp3    (1.5s, G4+C5)
//   marker-long.mp3   (2.5s, E4+G4)
//   piece-drone.mp3   (5.0s, A2+C#3+A3)
//
// Positions are percentages relative to the map image:
//   (0, 0) = top-left corner, (100, 100) = bottom-right corner.

const BEACH = '/sounds/mock/beach.mp3';
const BIRD = '/sounds/mock/bird.mp3';
const NIGHT = '/sounds/mock/night.mp3';
const PEOPLE = '/sounds/mock/people.mp3';
const TRAFFIC = '/sounds/mock/traffic.mp3';

export const mockSounds: Sound[] = [
  // Mapa 1 — Avenida de Aguirre — La Serena (2289×1636)
  {
    id: 101,
    title: 'Fuente central',
    description:
      'Murmullo constante del agua cayendo en la pileta principal de la plaza.',
    audioUrl: BEACH,
    location: 'Avenida de Aguirre',
    position: { x: 77, y: 20 },
    mapId: 1
  },
  {
    id: 102,
    title: 'Conversaciones en bancas',
    description:
      'Fragmentos de diálogos entre personas que descansan en las bancas de la plaza.',

    audioUrl: BIRD,
    location: 'Avenida de Aguirre',
    position: { x: 68.4, y: 30 },
    mapId: 1
  },
  {
    id: 103,
    title: 'Vendedores ambulantes',
    description:
      'Voces de vendedores ofreciendo productos y el sonido de sus carros moviéndose por las veredas.',
    audioUrl: NIGHT,
    location: 'Avenida de Aguirre',
    position: { x: 51.2, y: 50 },
    mapId: 1
  },
  {
    id: 104,
    title: 'Tráfico peatonal',
    description:
      'Pasos dispersos, conversaciones breves y el vaivén de la gente transitando por la plaza.',
    audioUrl: PEOPLE,
    location: 'Avenida de Aguirre',
    position: { x: 27, y: 80 },
    mapId: 1
  },
  {
    id: 105,
    title: 'Palomas',
    description:
      'Aleteos y arrullos de palomas concentradas cerca de los bordes de la plaza.',
    audioUrl: TRAFFIC,
    location: 'Avenida de Aguirre',
    position: { x: 14.5, y: 96 },
    mapId: 1
  },

  // Mapa 2 — Plaza de Armas — La Serena (864×1243, portrait)
  {
    id: 201,
    title: 'Pescadores',
    description:
      'Voces de pescadores descargando la jornada y el golpe seco de las cajas de pescado.',
    audioUrl: BEACH,
    location: 'Avenida de Aguirre',
    position: { x: 25.0, y: 24.94 },
    mapId: 2
  },
  {
    id: 202,
    title: 'Cajas registradoras',
    description:
      'Sonidos mecánicos y digitales de las cajas registradoras en los puestos del mercado.',
    audioUrl: BIRD,
    location: 'Avenida de Aguirre',
    position: { x: 58.33, y: 43.68 },
    mapId: 2
  },
  {
    id: 203,
    title: 'Conversaciones de clientes',
    description:
      'Diálogos animados entre compradores y vendedores regateando precios y eligiendo productos.',
    audioUrl: NIGHT,
    location: 'Avenida de Aguirre',
    position: { x: 41.67, y: 74.82 },
    mapId: 2
  },
  {
    id: 204,
    title: 'Música del local',
    description:
      'Cumbia y boleros que salen de un pequeño radio en uno de los puestos de víveres.',
    audioUrl: PEOPLE,
    location: 'Avenida de Aguirre',
    position: { x: 75.0, y: 68.62 },
    mapId: 2
  },
  {
    id: 205,
    title: 'Pasos en pasillos',
    description:
      'Eco de pasos sobre el piso húmedo de los pasillos centrales del mercado.',
    audioUrl: TRAFFIC,
    location: 'Avenida de Aguirre',
    position: { x: 12.5, y: 87.29 },
    mapId: 2
  },

  // Mapa 3 — Cruz del Tercer Milenio — Coquimbo (1160×912)
  {
    id: 301,
    title: 'Olas rompiendo',
    description:
      'Oleaje mediano que rompe contra las rocas y la orilla de la playa.',
    audioUrl: BIRD,
    location: 'Avenida de Aguirre',
    position: { x: 50.0, y: 81.25 },
    mapId: 3
  },
  {
    id: 302,
    title: 'Gaviotas',
    description: 'Gritos y vuelo de gaviotas sobrevolando la línea de costa.',
    audioUrl: BEACH,
    location: 'Avenida de Aguirre',
    position: { x: 33.36, y: 37.5 },
    mapId: 3
  },
  {
    id: 303,
    title: 'Viento en los postes',
    description:
      'Viento costero que golpea los postes y cables de la avenida del borde.',
    audioUrl: NIGHT,
    location: 'Avenida de Aguirre',
    position: { x: 79.22, y: 50.0 },
    mapId: 3
  },
  {
    id: 304,
    title: 'Pasos en la arena',
    description:
      'Pasos amortiguados de personas caminando por la arena húmeda cerca del agua.',
    audioUrl: PEOPLE,
    location: 'Avenida de Aguirre',
    position: { x: 62.5, y: 25.0 },
    mapId: 3
  }
];
