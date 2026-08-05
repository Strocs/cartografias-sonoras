import type { LegacySound, Mark, Sound } from '../domain/types';

const getSoundUrl = (mapId: number, point: number, soundNumber: number) => {
  return `https://mapasonoro.frijolmagico.cl/1/sonidos/Ruta_${mapId}_Punto_${point}_Sonido_${soundNumber}_Binaural_norm.wav`;
};

// Per map, one point per map grid. Each entry carries the point metadata (title,
// description, location, position) and the per-point sound count. The first
// sound of each point keeps the legacy flat id (mapId*100+point); sounds 2..k get
// derived dataset-unique ids (mapId*100 + point*10 + soundIdx).
interface PointEntry {
  point: number;
  soundCount: number;
  mark: {
    title: string;
    description: string;
    location: string;
    position: { x: number; y: number };
  };
}

// Mapa 1 — Avenida de Aguirre — La Serena (2289×1636)
const MAP_01_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 4,
    mark: {
      title: 'Fuente central',
      description:
        'Murmullo constante del agua cayendo en la pileta principal de la plaza.',
      location: 'Avenida de Aguirre',
      position: { x: 17, y: 8 }
    }
  },
  {
    point: 2,
    soundCount: 4,
    mark: {
      title: 'Conversaciones en bancas',
      description:
        'Fragmentos de diálogos entre personas que descansan en las bancas de la plaza.',
      location: 'Avenida de Aguirre',
      position: { x: 26, y: 20 }
    }
  },
  {
    point: 3,
    soundCount: 3,
    mark: {
      title: 'Vendedores ambulantes',
      description:
        'Voces de vendedores ofreciendo productos y el sonido de sus carros moviéndose por las veredas.',
      location: 'Avenida de Aguirre',
      position: { x: 42, y: 40 }
    }
  },
  {
    point: 4,
    soundCount: 3,
    mark: {
      title: 'Tráfico peatonal',
      description:
        'Pasos dispersos, conversaciones breves y el vaivén de la gente transitando por la plaza.',
      location: 'Avenida de Aguirre',
      position: { x: 59, y: 60 }
    }
  },
  {
    point: 5,
    soundCount: 3,
    mark: {
      title: 'Palomas',
      description:
        'Aleteos y arrullos de palomas concentradas cerca de los bordes de la plaza.',
      location: 'Avenida de Aguirre',
      position: { x: 76, y: 80 }
    }
  }
];

// Mapa 2 — Plaza de Armas — La Serena (864×1243, portrait)
const MAP_02_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 1,
    mark: {
      title: 'Pescadores',
      description:
        'Voces de pescadores descargando la jornada y el golpe seco de las cajas de pescado.',
      location: 'Avenida de Aguirre',
      position: { x: 25.0, y: 24.94 }
    }
  },
  {
    point: 2,
    soundCount: 2,
    mark: {
      title: 'Cajas registradoras',
      description:
        'Sonidos mecánicos y digitales de las cajas registradoras en los puestos del mercado.',
      location: 'Avenida de Aguirre',
      position: { x: 58.33, y: 43.68 }
    }
  },
  {
    point: 3,
    soundCount: 3,
    mark: {
      title: 'Conversaciones de clientes',
      description:
        'Diálogos animados entre compradores y vendedores regateando precios y eligiendo productos.',
      location: 'Avenida de Aguirre',
      position: { x: 41.67, y: 74.82 }
    }
  },
  {
    point: 4,
    soundCount: 2,
    mark: {
      title: 'Música del local',
      description:
        'Cumbia y boleros que salen de un pequeño radio en uno de los puestos de víveres.',
      location: 'Avenida de Aguirre',
      position: { x: 75.0, y: 68.62 }
    }
  },
  {
    point: 5,
    soundCount: 3,
    mark: {
      title: 'Pasos en pasillos',
      description:
        'Eco de pasos sobre el piso húmedo de los pasillos centrales del mercado.',
      location: 'Avenida de Aguirre',
      position: { x: 12.5, y: 87.29 }
    }
  }
];

// Mapa 3 — Cruz del Tercer Milenio — Coquimbo (1160×912)
const MAP_03_POINTS: PointEntry[] = [
  {
    point: 1,
    soundCount: 4,
    mark: {
      title: 'Olas rompiendo',
      description:
        'Oleaje mediano que rompe contra las rocas y la orilla de la playa.',
      location: 'Avenida de Aguirre',
      position: { x: 50.0, y: 81.25 }
    }
  },
  {
    point: 2,
    soundCount: 2,
    mark: {
      title: 'Gaviotas',
      description: 'Gritos y vuelo de gaviotas sobrevolando la línea de costa.',
      location: 'Avenida de Aguirre',
      position: { x: 33.36, y: 37.5 }
    }
  },
  {
    point: 3,
    soundCount: 2,
    mark: {
      title: 'Viento en los postes',
      description:
        'Viento costero que golpea los postes y cables de la avenida del borde.',
      location: 'Avenida de Aguirre',
      position: { x: 79.22, y: 50.0 }
    }
  },
  {
    point: 4,
    soundCount: 2,
    mark: {
      title: 'Pasos en la arena',
      description:
        'Pasos amortiguados de personas caminando por la arena húmeda cerca del agua.',
      location: 'Avenida de Aguirre',
      position: { x: 62.5, y: 25.0 }
    }
  }
];

/** Derives a sound id: legacy mark id for the first sound, deterministic overwise. */
const soundIdFor = (
  mapId: number,
  point: number,
  soundIdx: number,
  legacyMarkId: number
): number => (soundIdx === 1 ? legacyMarkId : mapId * 100 + point * 10 + soundIdx);

function buildMark(mapId: number, entry: PointEntry): Mark {
  const legacyMarkId = mapId * 100 + entry.point;
  const firstSound = entry.mark;

  const sounds: Sound[] = Array.from({ length: entry.soundCount }, (_, i) => {
    const soundIdx = i + 1;
    return {
      id: soundIdFor(mapId, entry.point, soundIdx, legacyMarkId),
      title: firstSound.title,
      description: firstSound.description,
      location: firstSound.location,
      audioUrl: getSoundUrl(mapId, entry.point, soundIdx)
    };
  });

  return {
    id: legacyMarkId,
    mapId,
    title: firstSound.title,
    description: firstSound.description,
    position: firstSound.position,
    location: firstSound.location,
    sounds
  };
}

function buildMarks(mapId: number, points: PointEntry[]): Mark[] {
  return points.map((entry) => buildMark(mapId, entry));
}

export const MARKS: Mark[] = [
  ...buildMarks(1, MAP_01_POINTS),
  ...buildMarks(2, MAP_02_POINTS),
  ...buildMarks(3, MAP_03_POINTS)
];

/**
 * Legacy flat marker list (one sound per point) kept so the pre-migration UI
 * stack ([slug].astro + mapViewBindings/soundMarker/pathStateEngine) keeps
 * resolving `position`/`mapId` from the running data. Removed when slice B
 * switches the UI to the Mark-group model.
 */
export const SOUNDS: LegacySound[] = MARKS.map((mark) => ({
  id: mark.id,
  title: mark.title,
  description: mark.description,
  location: mark.location,
  audioUrl: mark.sounds[0].audioUrl,
  position: mark.position,
  mapId: mark.mapId
}));