import type { Sound } from '../domain/types';

const getSoundUrl = (mapId: number, markId: number, soundId: number) => {
  return `https://mapasonoro.frijolmagico.cl/1/sonidos/Ruta_${mapId}_Punto_${markId}_Sonido_${soundId}_Binaural_norm.wav`;
};

const MAP_01_SOUNDS = [
  { point: 1, sounds: [1, 2, 3, 4] },
  { point: 2, sounds: [1, 2, 3, 4] },
  { point: 3, sounds: [1, 2, 3] },
  { point: 4, sounds: [1, 2, 3] },
  { point: 5, sounds: [1, 2, 3] }
];

const MAP_02_SOUNDS = [
  { point: 1, sounds: [1] },
  { point: 2, sounds: [1, 2] },
  { point: 3, sounds: [1, 2, 3] },
  { point: 4, sounds: [1, 2] },
  { point: 5, sounds: [1, 2, 3] }
];

const MAP_03_SOUNDS = [
  { point: 1, sounds: [1, 2, 3, 4] },
  { point: 2, sounds: [1, 2] },
  { point: 3, sounds: [1, 2] },
  { point: 4, sounds: [1, 2] }
];

export const SOUNDS: Sound[] = [
  // Mapa 1 — Avenida de Aguirre — La Serena (2289×1636)
  {
    id: 101,
    title: 'Fuente central',
    description:
      'Murmullo constante del agua cayendo en la pileta principal de la plaza.',
    audioUrl: MAP_01_SOUNDS[0].sounds.map((soundId) =>
      getSoundUrl(1, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 17, y: 8 },
    mapId: 1
  },
  {
    id: 102,
    title: 'Conversaciones en bancas',
    description:
      'Fragmentos de diálogos entre personas que descansan en las bancas de la plaza.',

    audioUrl: MAP_01_SOUNDS[1].sounds.map((soundId) =>
      getSoundUrl(1, 2, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 26, y: 20 },
    mapId: 1
  },
  {
    id: 103,
    title: 'Vendedores ambulantes',
    description:
      'Voces de vendedores ofreciendo productos y el sonido de sus carros moviéndose por las veredas.',
    audioUrl: MAP_01_SOUNDS[2].sounds.map((soundId) =>
      getSoundUrl(1, 3, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 42, y: 40 },
    mapId: 1
  },
  {
    id: 104,
    title: 'Tráfico peatonal',
    description:
      'Pasos dispersos, conversaciones breves y el vaivén de la gente transitando por la plaza.',
    audioUrl: MAP_01_SOUNDS[3].sounds.map((soundId) =>
      getSoundUrl(1, 4, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 59, y: 60 },
    mapId: 1
  },
  {
    id: 105,
    title: 'Palomas',
    description:
      'Aleteos y arrullos de palomas concentradas cerca de los bordes de la plaza.',
    audioUrl: MAP_01_SOUNDS[4].sounds.map((soundId) =>
      getSoundUrl(1, 5, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 76, y: 80 },
    mapId: 1
  },

  // Mapa 2 — Plaza de Armas — La Serena (864×1243, portrait)
  {
    id: 201,
    title: 'Pescadores',
    description:
      'Voces de pescadores descargando la jornada y el golpe seco de las cajas de pescado.',
    audioUrl: MAP_02_SOUNDS[0].sounds.map((soundId) =>
      getSoundUrl(2, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 25.0, y: 24.94 },
    mapId: 2
  },
  {
    id: 202,
    title: 'Cajas registradoras',
    description:
      'Sonidos mecánicos y digitales de las cajas registradoras en los puestos del mercado.',
    audioUrl: MAP_02_SOUNDS[1].sounds.map((soundId) =>
      getSoundUrl(2, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 58.33, y: 43.68 },
    mapId: 2
  },
  {
    id: 203,
    title: 'Conversaciones de clientes',
    description:
      'Diálogos animados entre compradores y vendedores regateando precios y eligiendo productos.',
    audioUrl: MAP_02_SOUNDS[2].sounds.map((soundId) =>
      getSoundUrl(2, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 41.67, y: 74.82 },
    mapId: 2
  },
  {
    id: 204,
    title: 'Música del local',
    description:
      'Cumbia y boleros que salen de un pequeño radio en uno de los puestos de víveres.',
    audioUrl: MAP_02_SOUNDS[3].sounds.map((soundId) =>
      getSoundUrl(2, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 75.0, y: 68.62 },
    mapId: 2
  },
  {
    id: 205,
    title: 'Pasos en pasillos',
    description:
      'Eco de pasos sobre el piso húmedo de los pasillos centrales del mercado.',
    audioUrl: MAP_02_SOUNDS[4].sounds.map((soundId) =>
      getSoundUrl(2, 1, soundId)
    )[0],
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
    audioUrl: MAP_03_SOUNDS[0].sounds.map((soundId) =>
      getSoundUrl(3, 1, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 50.0, y: 81.25 },
    mapId: 3
  },
  {
    id: 302,
    title: 'Gaviotas',
    description: 'Gritos y vuelo de gaviotas sobrevolando la línea de costa.',
    audioUrl: MAP_03_SOUNDS[1].sounds.map((soundId) =>
      getSoundUrl(3, 2, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 33.36, y: 37.5 },
    mapId: 3
  },
  {
    id: 303,
    title: 'Viento en los postes',
    description:
      'Viento costero que golpea los postes y cables de la avenida del borde.',
    audioUrl: MAP_03_SOUNDS[2].sounds.map((soundId) =>
      getSoundUrl(3, 3, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 79.22, y: 50.0 },
    mapId: 3
  },
  {
    id: 304,
    title: 'Pasos en la arena',
    description:
      'Pasos amortiguados de personas caminando por la arena húmeda cerca del agua.',
    audioUrl: MAP_03_SOUNDS[3].sounds.map((soundId) =>
      getSoundUrl(3, 4, soundId)
    )[0],
    location: 'Avenida de Aguirre',
    position: { x: 62.5, y: 25.0 },
    mapId: 3
  }
];
