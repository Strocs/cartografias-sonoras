import type { Path } from '../domain/types';

export const mockPaths: Path[] = [
  // Locación 1 — Plaza de Armas — La Serena
  {
    id: 1001,
    mapId: 1,
    points: [
      { x: 600, y: 400 },
      { x: 475, y: 325 },
      { x: 350, y: 250 },
    ],
    soundIds: [101, 102],
  },
  {
    id: 1002,
    mapId: 1,
    points: [
      { x: 900, y: 300 },
      { x: 825, y: 450 },
      { x: 750, y: 600 },
    ],
    soundIds: [103, 105],
  },
  {
    id: 1003,
    mapId: 1,
    points: [
      { x: 200, y: 550 },
      { x: 625, y: 525 },
      { x: 1050, y: 500 },
    ],
    soundIds: [104, 106],
  },

  // Locación 2 — Mercado — Coquimbo
  {
    id: 2001,
    mapId: 2,
    points: [
      { x: 300, y: 200 },
      { x: 500, y: 275 },
      { x: 700, y: 350 },
    ],
    soundIds: [201, 202],
  },
  {
    id: 2002,
    mapId: 2,
    points: [
      { x: 500, y: 600 },
      { x: 700, y: 575 },
      { x: 900, y: 550 },
    ],
    soundIds: [203, 204],
  },
  {
    id: 2003,
    mapId: 2,
    points: [
      { x: 150, y: 700 },
      { x: 225, y: 450 },
      { x: 300, y: 200 },
    ],
    soundIds: [205, 201],
  },

  // Locación 3 — Borde Costero
  {
    id: 3001,
    mapId: 3,
    points: [
      { x: 600, y: 650 },
      { x: 500, y: 475 },
      { x: 400, y: 300 },
    ],
    soundIds: [301, 302],
  },
  {
    id: 3002,
    mapId: 3,
    points: [
      { x: 950, y: 400 },
      { x: 850, y: 300 },
      { x: 750, y: 200 },
    ],
    soundIds: [303, 304],
  },
];
