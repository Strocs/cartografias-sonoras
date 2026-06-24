import type { Sound } from '../domain/types';

export const mockSounds: Sound[] = [
  // Locación 1 — Plaza de Armas — La Serena
  {
    id: 101,
    title: 'Fuente central',
    description:
      'Murmullo constante del agua cayendo en la pileta principal de la plaza.',
    audioUrl: '/sounds/locacion-1/fuente-central.mp3',
    position: { x: 600, y: 400 },
    mapId: 1,
  },
  {
    id: 102,
    title: 'Tráfico peatonal',
    description:
      'Pasos dispersos, conversaciones breves y el vaivén de la gente transitando por la plaza.',
    audioUrl: '/sounds/locacion-1/trafico-peatonal.mp3',
    position: { x: 350, y: 250 },
    mapId: 1,
  },
  {
    id: 103,
    title: 'Vendedores ambulantes',
    description:
      'Voces de vendedores ofreciendo productos y el sonido de sus carros moviéndose por las veredas.',
    audioUrl: '/sounds/locacion-1/vendedores-ambulantes.mp3',
    position: { x: 900, y: 300 },
    mapId: 1,
  },
  {
    id: 104,
    title: 'Palomas',
    description:
      'Aleteos y arrullos de palomas concentradas cerca de los bordes de la plaza.',
    audioUrl: '/sounds/locacion-1/palomas.mp3',
    position: { x: 200, y: 550 },
    mapId: 1,
  },
  {
    id: 105,
    title: 'Conversaciones en bancas',
    description:
      'Fragmentos de diálogos entre personas que descansan en las bancas de la plaza.',
    audioUrl: '/sounds/locacion-1/conversaciones-bancas.mp3',
    position: { x: 750, y: 600 },
    mapId: 1,
  },
  {
    id: 106,
    title: 'Música de organillero',
    description:
      'Melodía lejana de un organillero que se detiene en una esquina de la plaza.',
    audioUrl: '/sounds/locacion-1/organillero.mp3',
    position: { x: 1050, y: 500 },
    mapId: 1,
  },

  // Locación 2 — Mercado — Coquimbo
  {
    id: 201,
    title: 'Pescadores',
    description:
      'Voces de pescadores descargando la jornada y el golpe seco de las cajas de pescado.',
    audioUrl: '/sounds/locacion-2/pescadores.mp3',
    position: { x: 300, y: 200 },
    mapId: 2,
  },
  {
    id: 202,
    title: 'Cajas registradoras',
    description:
      'Sonidos mecánicos y digitales de las cajas registradoras en los puestos del mercado.',
    audioUrl: '/sounds/locacion-2/cajas-registradoras.mp3',
    position: { x: 700, y: 350 },
    mapId: 2,
  },
  {
    id: 203,
    title: 'Conversaciones de clientes',
    description:
      'Diálogos animados entre compradores y vendedores regateando precios y eligiendo productos.',
    audioUrl: '/sounds/locacion-2/conversaciones-clientes.mp3',
    position: { x: 500, y: 600 },
    mapId: 2,
  },
  {
    id: 204,
    title: 'Música del local',
    description:
      'Cumbia y boleros que salen de un pequeño radio en uno de los puestos de víveres.',
    audioUrl: '/sounds/locacion-2/musica-local.mp3',
    position: { x: 900, y: 550 },
    mapId: 2,
  },
  {
    id: 205,
    title: 'Pasos en pasillos',
    description:
      'Eco de pasos sobre el piso húmedo de los pasillos centrales del mercado.',
    audioUrl: '/sounds/locacion-2/pasos-pasillos.mp3',
    position: { x: 150, y: 700 },
    mapId: 2,
  },

  // Locación 3 — Borde Costero
  {
    id: 301,
    title: 'Olas rompiendo',
    description:
      'Oleaje mediano que rompe contra las rocas y la orilla de la playa.',
    audioUrl: '/sounds/locacion-3/olas-rompiendo.mp3',
    position: { x: 600, y: 650 },
    mapId: 3,
  },
  {
    id: 302,
    title: 'Gaviotas',
    description:
      'Gritos y vuelo de gaviotas sobrevolando la línea de costa.',
    audioUrl: '/sounds/locacion-3/gaviotas.mp3',
    position: { x: 400, y: 300 },
    mapId: 3,
  },
  {
    id: 303,
    title: 'Viento en los postes',
    description:
      'Viento costero que golpea los postes y cables de la avenida del borde.',
    audioUrl: '/sounds/locacion-3/viento-postes.mp3',
    position: { x: 950, y: 400 },
    mapId: 3,
  },
  {
    id: 304,
    title: 'Pasos en la arena',
    description:
      'Pasos amortiguados de personas caminando por la arena húmeda cerca del agua.',
    audioUrl: '/sounds/locacion-3/pasos-arena.mp3',
    position: { x: 750, y: 200 },
    mapId: 3,
  },
];
