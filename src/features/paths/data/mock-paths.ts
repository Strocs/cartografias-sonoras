import type { Path } from '../domain/types';

export const mockPaths: Path[] = [
  // Locación 1 — Plaza de Armas — La Serena (1216×864)
  {
    id: 1001,
    mapId: 1,
    points: [
      { x: 608, y: 432 },
      { x: 486, y: 351 },
      { x: 365, y: 270 },
    ],
    soundIds: [101, 102],
  },
  {
    id: 1002,
    mapId: 1,
    points: [
      { x: 912, y: 324 },
      { x: 836, y: 486 },
      { x: 760, y: 648 },
    ],
    soundIds: [103, 105],
  },
  {
    id: 1003,
    mapId: 1,
    points: [
      { x: 203, y: 594 },
      { x: 635, y: 567 },
      { x: 1067, y: 540 },
    ],
    soundIds: [104, 106],
  },

  // Locación 2 — Mercado — Coquimbo (864×1243, portrait)
  {
    id: 2001,
    mapId: 2,
    points: [
      { x: 216, y: 310 },
      { x: 360, y: 426 },
      { x: 504, y: 543 },
    ],
    soundIds: [201, 202],
  },
  {
    id: 2002,
    mapId: 2,
    points: [
      { x: 360, y: 930 },
      { x: 504, y: 891 },
      { x: 648, y: 853 },
    ],
    soundIds: [203, 204],
  },
  {
    id: 2003,
    mapId: 2,
    points: [
      { x: 108, y: 1085 },
      { x: 162, y: 697 },
      { x: 216, y: 310 },
    ],
    soundIds: [205, 201],
  },

  // Locación 3 — Borde Costero (1160×912)
  {
    id: 3001,
    mapId: 3,
    points: [
      { x: 580, y: 741 },
      { x: 483, y: 541 },
      { x: 387, y: 342 },
    ],
    soundIds: [301, 302],
  },
  {
    id: 3002,
    mapId: 3,
    points: [
      { x: 919, y: 456 },
      { x: 822, y: 342 },
      { x: 725, y: 228 },
    ],
    soundIds: [303, 304],
  },
];
