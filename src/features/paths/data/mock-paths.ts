import type { Path } from '../domain/types';

// Waypoints are intermediate points between start and end sounds.
// Endpoints are derived from the sound positions at runtime.
// All values are percentages relative to the map image:
//   (0, 0) = top-left corner, (100, 100) = bottom-right corner.

export const mockPaths: Path[] = [
  // Mapa 1 — Avenida de Aguirre — La Serena (2289×1636)
  // Start (77,20) → Waypoint desviado hacia abajo → End (68.4,30)
  {
    id: 1001,
    mapId: 1,
    waypoints: [
      { x: 70, y: 30 },
    ],
    startSoundId: 101,
    endSoundId: 102,
  },
  // Start (51.2,50) → Waypoint desviado hacia la derecha → End (14.5,96)
  {
    id: 1002,
    mapId: 1,
    waypoints: [
      { x: 40, y: 75 },
      { x: 25, y: 82 },
    ],
    startSoundId: 103,
    endSoundId: 105,
  },
  // Start (27,80) → Waypoint desviado hacia la izquierda → End (14.5,96)
  {
    id: 1003,
    mapId: 1,
    waypoints: [
      { x: 15, y: 85 },
    ],
    startSoundId: 104,
    endSoundId: 105,
  },

  // Mapa 2 — Plaza de Armas — La Serena (864×1243, portrait)
  // Start (25,24.94) → Waypoint desviado hacia arriba → End (58.33,43.68)
  {
    id: 2001,
    mapId: 2,
    waypoints: [
      { x: 42, y: 22 },
    ],
    startSoundId: 201,
    endSoundId: 202,
  },
  // Start (41.67,74.82) → Waypoint desviado hacia abajo → End (75,68.62)
  {
    id: 2002,
    mapId: 2,
    waypoints: [
      { x: 58, y: 80 },
    ],
    startSoundId: 203,
    endSoundId: 204,
  },
  // Start (12.5,87.29) → Waypoint desviado hacia la derecha → End (25,24.94)
  {
    id: 2003,
    mapId: 2,
    waypoints: [
      { x: 28, y: 55 },
      { x: 36, y: 38 },
    ],
    startSoundId: 205,
    endSoundId: 201,
  },

  // Mapa 3 — Cruz del Tercer Milenio — Coquimbo (1160×912)
  // Start (50,81.25) → Waypoint desviado hacia la derecha → End (33.36,37.5)
  {
    id: 3001,
    mapId: 3,
    waypoints: [
      { x: 52, y: 55 },
    ],
    startSoundId: 301,
    endSoundId: 302,
  },
  // Start (79.22,50) → Waypoint desviado hacia abajo → End (62.5,25)
  {
    id: 3002,
    mapId: 3,
    waypoints: [
      { x: 70, y: 45 },
    ],
    startSoundId: 303,
    endSoundId: 304,
  },
];
