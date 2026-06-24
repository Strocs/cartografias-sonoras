import { describe, expect, it } from 'vitest';

import type { Map } from '../../src/features/maps/domain';
import { checkMapInvariants, mapSchema } from '../../src/features/maps/domain';
import type { Path } from '../../src/features/paths/domain';
import {
  checkPathInvariants,
  pathSchema,
} from '../../src/features/paths/domain';
import type { SoundPiece } from '../../src/features/sound-pieces/domain';
import {
  checkSoundPieceInvariants,
  soundPieceSchema,
} from '../../src/features/sound-pieces/domain';
import type { Sound } from '../../src/features/sounds/domain';
import {
  checkSoundInvariants,
  soundSchema,
} from '../../src/features/sounds/domain';
import { validateDataset } from '../../src/shared/utils/validators';

const validMap: Map = {
  id: 1,
  slug: 'mapa-uno',
  title: 'Mapa Uno',
  image: { src: '/mapa-uno.jpg', width: 800, height: 600 },
  soundPieceId: 10,
};

const validSoundPiece: SoundPiece = {
  id: 10,
  mapId: 1,
  title: 'Obra Uno',
  author: 'Autor Uno',
  description: 'Descripción de la obra',
  audioUrl: '/obra-uno.mp3',
};

const validSound: Sound = {
  id: 100,
  title: 'Sonido Uno',
  description: 'Descripción del sonido',
  audioUrl: '/sonido-uno.mp3',
  position: { x: 100, y: 200 },
  mapId: 1,
};

const validPath: Path = {
  id: 1000,
  mapId: 1,
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 200 },
  ],
  soundIds: [100, 101],
};

describe('Map invariants', () => {
  it('passes for a valid map', () => {
    expect(() => checkMapInvariants(validMap)).not.toThrow();
  });

  it('fails when soundPieceId is null', () => {
    const invalid: Map = {
      ...validMap,
      soundPieceId: null as unknown as number,
    };
    expect(() => checkMapInvariants(invalid)).toThrow(
      'Map must have a sound piece'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validMap, soundPieceId: null };
    expect(() => mapSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(mapSchema.parse(validMap)).toEqual(validMap);
  });
});

describe('SoundPiece invariants', () => {
  it('passes for a valid sound piece', () => {
    expect(() => checkSoundPieceInvariants(validSoundPiece)).not.toThrow();
  });

  it('fails when mapId is null', () => {
    const invalid: SoundPiece = {
      ...validSoundPiece,
      mapId: null as unknown as number,
    };
    expect(() => checkSoundPieceInvariants(invalid)).toThrow(
      'Sound piece must belong to a map'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validSoundPiece, mapId: null };
    expect(() => soundPieceSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(soundPieceSchema.parse(validSoundPiece)).toEqual(validSoundPiece);
  });
});

describe('Sound invariants', () => {
  it('passes for a valid sound', () => {
    expect(() => checkSoundInvariants(validSound)).not.toThrow();
  });

  it('fails when mapId is null', () => {
    const invalid: Sound = { ...validSound, mapId: null as unknown as number };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound must belong to a map'
    );
  });

  it('fails when position is not finite', () => {
    const invalid: Sound = { ...validSound, position: { x: Infinity, y: 200 } };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound position must be finite'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validSound, mapId: null };
    expect(() => soundSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(soundSchema.parse(validSound)).toEqual(validSound);
  });
});

describe('Path invariants', () => {
  it('passes for a valid path', () => {
    expect(() => checkPathInvariants(validPath)).not.toThrow();
  });

  it('fails when mapId is null', () => {
    const invalid: Path = { ...validPath, mapId: null as unknown as number };
    expect(() => checkPathInvariants(invalid)).toThrow(
      'Path must belong to a map'
    );
  });

  it('fails when soundIds does not have exactly two elements', () => {
    const invalid: Path = {
      ...validPath,
      soundIds: [100] as unknown as [number, number],
    };
    expect(() => checkPathInvariants(invalid)).toThrow(
      'Path must connect exactly two sounds'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validPath, soundIds: [100] };
    expect(() => pathSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(pathSchema.parse(validPath)).toEqual(validPath);
  });
});

describe('Dataset cross-reference validator', () => {
  it('passes for a consistent dataset', () => {
    const result = validateDataset({
      maps: [validMap],
      sounds: [validSound, { ...validSound, id: 101 }],
      soundPieces: [validSoundPiece],
      paths: [validPath],
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when a map references a missing sound piece', () => {
    const result = validateDataset({
      maps: [{ ...validMap, soundPieceId: 99 }],
      sounds: [validSound],
      soundPieces: [validSoundPiece],
      paths: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Map 1 references missing sound piece 99');
  });

  it('fails when a sound references a missing map', () => {
    const result = validateDataset({
      maps: [],
      sounds: [validSound],
      soundPieces: [],
      paths: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Sound 100 references missing map 1');
  });

  it('fails when a path references a sound from another map', () => {
    const result = validateDataset({
      maps: [validMap],
      sounds: [{ ...validSound, mapId: 2 }],
      soundPieces: [validSoundPiece],
      paths: [validPath],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Sound 100 in path 1000 does not belong to map 1'
    );
  });
});
