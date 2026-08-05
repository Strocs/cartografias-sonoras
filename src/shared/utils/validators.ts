export interface DatasetMap {
  id: number;
  soundPieceId: number;
}

/** A mark cross-reference record as expected by the dataset validator. */
export interface DatasetMark {
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
  startMarkId: number;
  endMarkId: number;
}

export interface Dataset<
  M extends DatasetMap,
  Mk extends DatasetMark,
  P extends DatasetSoundPiece,
  Pa extends DatasetPath,
> {
  maps: M[];
  marks: Mk[];
  soundPieces: P[];
  paths: Pa[];
}

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

export function validateDataset<
  M extends DatasetMap,
  Mk extends DatasetMark,
  P extends DatasetSoundPiece,
  Pa extends DatasetPath,
>(dataset: Dataset<M, Mk, P, Pa>): ValidationResult {
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

  for (const mark of dataset.marks) {
    const map = dataset.maps.find((m) => m.id === mark.mapId);
    if (!map) {
      errors.push(`Mark ${mark.id} references missing map ${mark.mapId}`);
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

    for (const markId of [path.startMarkId, path.endMarkId]) {
      const mark = dataset.marks.find((m) => m.id === markId);
      if (!mark) {
        errors.push(`Path ${path.id} references missing mark ${markId}`);
      } else if (mark.mapId !== path.mapId) {
        errors.push(
          `Mark ${markId} in path ${path.id} does not belong to map ${path.mapId}`
        );
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}