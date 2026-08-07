import type { Mark, Sound } from '../domain/types'

const getSoundUrl = (mapId: number, point: number, soundNumber: number) => {
  return `https://mapasonoro.frijolmagico.cl/1/sonidos/Ruta_${mapId}_Punto_${point}_Sonido_${soundNumber}_Binaural_norm.wav`
}

// Per map, one point per map grid. Each entry carries the point metadata (title,
// description, location, position) and the per-point sound count. The first
// sound of each point keeps the legacy flat id (mapId*100+point); sounds 2..k get
// derived dataset-unique ids (mapId*100 + point*10 + soundIdx).
interface PointEntry {
  point: number
  soundCount: number
  mark: {
    title: string
    description: string | null
    location: string
    position: { x: number; y: number }
  }
}

// Mapa 1 — Cruz del Tercer Milenio — Coquimbo
const MAP_01_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 4,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 47.5, y: 67 }
    }
  },
  {
    point: 2,
    soundCount: 4,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 53, y: 57 }
    }
  },
  {
    point: 3,
    soundCount: 3,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 36.6, y: 43 }
    }
  },
  {
    point: 4,
    soundCount: 3,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 40.3, y: 24.8 }
    }
  },
  {
    point: 5,
    soundCount: 3,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 62.7, y: 26.2 }
    }
  }
]

// Mapa 2 — Avenida de Aguirre — La Serena
const MAP_02_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 1,
    mark: {
      title: '',
      description: null,
      location: 'Faro Monumental de La Serena',
      position: { x: 79.07, y: 23 }
    }
  },
  {
    point: 2,
    soundCount: 2,
    mark: {
      title: '',
      description: null,
      location: 'Fco. de Aguirre con Av. del Mar',
      position: { x: 73.5, y: 23 }
    }
  },
  {
    point: 3,
    soundCount: 3,
    mark: {
      title: '',
      description: null,
      location: 'INACAP La Serena',
      position: { x: 56, y: 40 }
    }
  },
  {
    point: 4,
    soundCount: 2,
    mark: {
      title: '',
      description: null,
      location: 'Universidad Central',
      position: { x: 39, y: 57 }
    }
  },
  {
    point: 5,
    soundCount: 3,
    mark: {
      title: '',
      description: null,
      location: 'Av. de Aguirre',
      position: { x: 18, y: 82 }
    }
  }
]

// Mapa 3 — Plaza de Armas — La Serena (864×1243, portrait)
const MAP_03_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 4,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 66.75, y: 25.4 }
    }
  },
  {
    point: 2,
    soundCount: 2,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 66.75, y: 37 }
    }
  },
  {
    point: 3,
    soundCount: 2,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 47, y: 55.5 }
    }
  },
  {
    point: 4,
    soundCount: 2,
    mark: {
      title: '',
      description: null,
      location: '',
      position: { x: 20, y: 81 }
    }
  }
]

/** Derives a sound id: legacy mark id for the first sound, deterministic overwise. */
const soundIdFor = (mapId: number, point: number, soundIdx: number, legacyMarkId: number): number =>
  soundIdx === 1 ? legacyMarkId : mapId * 100 + point * 10 + soundIdx

function buildMark(mapId: number, entry: PointEntry): Mark {
  const legacyMarkId = mapId * 100 + entry.point
  const firstSound = entry.mark

  const sounds: Sound[] = Array.from({ length: entry.soundCount }, (_, i) => {
    const soundIdx = i + 1
    return {
      id: soundIdFor(mapId, entry.point, soundIdx, legacyMarkId),
      title: firstSound.title,
      description: firstSound.description,
      location: firstSound.location,
      audioUrl: getSoundUrl(mapId, entry.point, soundIdx)
    }
  })

  return {
    id: legacyMarkId,
    mapId,
    title: firstSound.title,
    description: firstSound.description,
    position: firstSound.position,
    location: firstSound.location,
    sounds
  }
}

function buildMarks(mapId: number, points: PointEntry[]): Mark[] {
  return points.map((entry) => buildMark(mapId, entry))
}

export const MARKS: Mark[] = [
  ...buildMarks(1, MAP_01_POINTS),
  ...buildMarks(2, MAP_02_POINTS),
  ...buildMarks(3, MAP_03_POINTS)
]
