export interface DatasetMap {
  id: number;
  soundPieceId: number;
}

export interface DatasetSound {
  id: number;
  mapId: number;
}

export interface DatasetSoundPiece {
  id: number;
  mapId: number;
}

export interface DatasetPath {
  id: number;
  mapId: number;
  soundIds: [number, number];
}

export interface Dataset<
  M extends DatasetMap,
  S extends DatasetSound,
  P extends DatasetSoundPiece,
  Pa extends DatasetPath,
> {
  maps: M[];
  sounds: S[];
  soundPieces: P[];
  paths: Pa[];
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

export function validateDataset<
  M extends DatasetMap,
  S extends DatasetSound,
  P extends DatasetSoundPiece,
  Pa extends DatasetPath,
>(dataset: Dataset<M, S, P, Pa>): ValidationResult {
  const errors: string[] = [];

  for (const map of dataset.maps) {
    const piece = dataset.soundPieces.find((p) => p.id === map.soundPieceId);
    if (!piece) {
      errors.push(
        `Map ${map.id} references missing sound piece ${map.soundPieceId}`
      );
    } else if (piece.mapId !== map.id) {
      errors.push(`Sound piece ${piece.id} does not belong to map ${map.id}`);
    }
  }

  for (const sound of dataset.sounds) {
    const map = dataset.maps.find((m) => m.id === sound.mapId);
    if (!map) {
      errors.push(`Sound ${sound.id} references missing map ${sound.mapId}`);
    }
  }

  for (const piece of dataset.soundPieces) {
    const map = dataset.maps.find((m) => m.id === piece.mapId);
    if (!map) {
      errors.push(
        `Sound piece ${piece.id} references missing map ${piece.mapId}`
      );
    }
  }

  for (const path of dataset.paths) {
    const map = dataset.maps.find((m) => m.id === path.mapId);
    if (!map) {
      errors.push(`Path ${path.id} references missing map ${path.mapId}`);
      continue;
    }

    for (const soundId of path.soundIds) {
      const sound = dataset.sounds.find((s) => s.id === soundId);
      if (!sound) {
        errors.push(`Path ${path.id} references missing sound ${soundId}`);
      } else if (sound.mapId !== path.mapId) {
        errors.push(
          `Sound ${soundId} in path ${path.id} does not belong to map ${path.mapId}`
        );
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
