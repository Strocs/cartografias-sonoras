import type { Path } from '../domain/types';

// Points are percentages relative to the map image:
//   (0, 0) = top-left corner, (100, 100) = bottom-right corner.

export const mockPaths: Path[] = [
  // Mapa 1 — Avenida de Aguirre — La Serena (2289×1636)
  {
    id: 1001,
    mapId: 1,
    points: [
      { x: 26.56, y: 26.41 },
      { x: 21.23, y: 21.45 },
      { x: 15.95, y: 16.50 },
    ],
    soundIds: [101, 102],
  },
  {
    id: 1002,
    mapId: 1,
    points: [
      { x: 39.84, y: 19.80 },
      { x: 36.52, y: 29.71 },
      { x: 33.20, y: 39.61 },
    ],
    soundIds: [103, 105],
  },
  {
    id: 1003,
    mapId: 1,
    points: [
      { x: 8.87, y: 36.31 },
      { x: 27.74, y: 34.66 },
      { x: 46.62, y: 33.01 },
    ],
    soundIds: [104, 106],
  },

  // Mapa 2 — Plaza de Armas — La Serena (864×1243, portrait)
  {
    id: 2001,
    mapId: 2,
    points: [
      { x: 25.00, y: 24.94 },
      { x: 41.67, y: 34.27 },
      { x: 58.33, y: 43.68 },
    ],
    soundIds: [201, 202],
  },
  {
    id: 2002,
    mapId: 2,
    points: [
      { x: 41.67, y: 74.82 },
      { x: 58.33, y: 71.68 },
      { x: 75.00, y: 68.62 },
    ],
    soundIds: [203, 204],
  },
  {
    id: 2003,
    mapId: 2,
    points: [
      { x: 12.50, y: 87.29 },
      { x: 18.75, y: 56.07 },
      { x: 25.00, y: 24.94 },
    ],
    soundIds: [205, 201],
  },

  // Mapa 3 — Cruz del Tercer Milenio — Coquimbo (1160×912)
  {
    id: 3001,
    mapId: 3,
    points: [
      { x: 50.00, y: 81.25 },
      { x: 41.64, y: 59.32 },
      { x: 33.36, y: 37.50 },
    ],
    soundIds: [301, 302],
  },
  {
    id: 3002,
    mapId: 3,
    points: [
      { x: 79.22, y: 50.00 },
      { x: 70.86, y: 37.50 },
      { x: 62.50, y: 25.00 },
    ],
    soundIds: [303, 304],
  },
];
