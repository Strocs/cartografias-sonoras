import type { Path } from '../domain/types'

// Waypoints are intermediate points between start and end marks.
// Endpoints are derived from the mark positions at runtime.
// All values are percentages relative to the map image:
//   (0, 0) = top-left corner, (100, 100) = bottom-right corner.

export const PATHS: Path[] = [
  // Ruta 1 — Cruz del Tercer Milenio — Coquimbo
  {
    id: 1001,
    mapId: 1,
    waypoints: [],
    startMarkId: 101,
    endMarkId: 102
  },
  {
    id: 1002,
    mapId: 1,
    waypoints: [],
    startMarkId: 102,
    endMarkId: 103
  },
  {
    id: 1003,
    mapId: 1,
    waypoints: [],
    startMarkId: 103,
    endMarkId: 104
  },
  {
    id: 1004,
    mapId: 1,
    waypoints: [],
    startMarkId: 104,
    endMarkId: 105
  },

  // Ruta 2 — Avenida de Aguirre — La Serena
  {
    id: 2001,
    mapId: 2,
    waypoints: [
      {
        x: 76.7,
        y: 20
      }
    ],
    startMarkId: 201,
    endMarkId: 202
  },
  {
    id: 2002,
    mapId: 2,
    waypoints: [],
    startMarkId: 202,
    endMarkId: 203
  },
  {
    id: 2003,
    mapId: 2,
    waypoints: [],
    startMarkId: 203,
    endMarkId: 204
  },
  {
    id: 2004,
    mapId: 2,
    waypoints: [
      { x: 26.7, y: 69 },
      { x: 28.9, y: 71.5 }
    ],
    startMarkId: 204,
    endMarkId: 205
  },

  // Ruta 3 — Plaza de Armas — La Serena
  {
    id: 3001,
    mapId: 3,
    waypoints: [],
    startMarkId: 301,
    endMarkId: 302
  },
  {
    id: 3002,
    mapId: 3,
    waypoints: [],
    startMarkId: 302,
    endMarkId: 303
  },
  {
    id: 3003,
    mapId: 3,
    waypoints: [],
    startMarkId: 303,
    endMarkId: 304
  }
]
