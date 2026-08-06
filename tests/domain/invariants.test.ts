import { describe, expect, it } from 'vitest';

import type { Map } from '../../src/features/maps/domain';
import { checkMapInvariants, mapSchema } from '../../src/features/maps/domain';
import type { Path } from '../../src/features/paths/domain';
import {
  checkPathInvariants,
  pathSchema
} from '../../src/features/paths/domain';
import type { SoundPiece } from '../../src/features/sound-pieces/domain';
import {
  checkSoundPieceInvariants,
  soundPieceSchema
} from '../../src/features/sound-pieces/domain';
import type { Mark, Sound } from '../../src/features/sounds/domain';
import {
  checkMarkInvariants,
  checkSoundInvariants,
  markSchema,
  soundSchema
} from '../../src/features/sounds/domain';
import { validateDataset } from '../../src/shared/utils/validators';

const validMap: Map = {
  id: 1,
  slug: 'mapa-uno',
  title: 'Mapa Uno',
  images: [
    {
      id: 'base',
      src: '/mapa-uno.jpg',
      width: 800,
      height: 600,
      frame: { x: 0, y: 0, width: 100, height: 100 },
      optional: false,
      effect: 'none'
    }
  ],
  preview: { src: '/mapa-uno-preview.jpg', width: 800, height: 600 },
  soundPieceId: 10,
  soundPieceEnabled: true
};

const validSoundPiece: SoundPiece = {
  id: 10,
  mapId: 1,
  title: 'Obra Uno',
  author: 'Autor Uno',
  description: 'Descripción de la obra',
  audioUrl: 'https://cdn.com/obra-uno.wav'
};

const validSounds: Sound[] = [
  {
    id: 1001,
    title: 'Sonido Uno',
    description: 'Descripción del sonido',
    location: 'Test Location',
    audioUrl: 'https://cdn.com/sonido-uno.mp3'
  },
  {
    id: 1002,
    title: 'Sonido Dos',
    description: 'Descripción del sonido',
    location: 'Test Location',
    audioUrl: 'https://cdn.com/sonido-dos.mp3'
  }
];

const validMark: Mark = {
  id: 100,
  mapId: 1,
  title: 'Punto Uno',
  description: 'Descripción del punto',
  position: { x: 50, y: 50 },
  location: 'Test Location',
  sounds: validSounds
};

const validPath: Path = {
  id: 1000,
  mapId: 1,
  waypoints: [{ x: 50, y: 50 }],
  startMarkId: 100,
  endMarkId: 101
};

describe('Map invariants', () => {
  it('passes for a valid map', () => {
    expect(() => checkMapInvariants(validMap)).not.toThrow();
  });

  it('fails when soundPieceId is null', () => {
    const invalid: Map = {
      ...validMap,
      soundPieceId: null as unknown as number
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

  it('normalizes a legacy image input into the canonical base layer', () => {
    const legacyMap: Record<string, unknown> = { ...validMap };
    delete legacyMap.images;
    const normalized = mapSchema.parse({
      ...legacyMap,
      image: validMap.images[0]
    });

    expect(normalized).toMatchObject({
      images: [
        {
          id: 'base',
          src: validMap.images[0].src,
          frame: { x: 0, y: 0, width: 100, height: 100 },
          optional: false,
          effect: 'none'
        }
      ]
    });
    expect(normalized).not.toHaveProperty('image');
  });

  it('rejects invalid layers and preview dimensions', () => {
    expect(() =>
      checkMapInvariants({
        ...validMap,
        preview: { ...validMap.preview, width: 1 }
      })
    ).toThrow('preview');
    expect(() =>
      checkMapInvariants({
        ...validMap,
        images: [
          {
            ...validMap.images[0],
            frame: { x: 1, y: 0, width: 100, height: 100 }
          }
        ]
      })
    ).toThrow('full-frame');
    expect(() =>
      checkMapInvariants({
        ...validMap,
        images: [validMap.images[0], { ...validMap.images[0] }]
      })
    ).toThrow('unique');
    expect(mapSchema.safeParse({ ...validMap, images: [] }).success).toBe(
      false
    );
  });
});

describe('SoundPiece invariants', () => {
  it('passes for a valid sound piece', () => {
    expect(() => checkSoundPieceInvariants(validSoundPiece)).not.toThrow();
  });

  it('fails when mapId is null', () => {
    const invalid: SoundPiece = {
      ...validSoundPiece,
      mapId: null as unknown as number
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

describe('Mark invariants', () => {
  it('passes for a valid mark', () => {
    expect(() => checkMarkInvariants(validMark)).not.toThrow();
  });

  it('fails when mapId is null', () => {
    const invalid: Mark = {
      ...validMark,
      mapId: null as unknown as number
    };
    expect(() => checkMarkInvariants(invalid)).toThrow(
      'Mark must belong to a map'
    );
  });

  it('fails when position is not finite', () => {
    const invalid: Mark = {
      ...validMark,
      position: { x: Infinity, y: 200 }
    };
    expect(() => checkMarkInvariants(invalid)).toThrow(
      'Mark position must be finite'
    );
  });

  it('fails when position is outside the 0–100 percentage range', () => {
    const invalid: Mark = { ...validMark, position: { x: 50, y: 150 } };
    expect(() => checkMarkInvariants(invalid)).toThrow(
      'Mark position must be within 0–100'
    );
  });

  it('fails when sounds is empty', () => {
    const invalid: Mark = { ...validMark, sounds: [] };
    expect(() => checkMarkInvariants(invalid)).toThrow(
      'Mark must contain at least one sound'
    );
  });

  it('fails when sound ids are duplicated', () => {
    const invalid: Mark = {
      ...validMark,
      sounds: [validSounds[0], { ...validSounds[1], id: validSounds[0].id }]
    };
    expect(() => checkMarkInvariants(invalid)).toThrow(
      'Mark sounds must have unique ids'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validMark, mapId: null };
    expect(() => markSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(markSchema.parse(validMark)).toEqual(validMark);
  });
});

describe('Sound invariants', () => {
  it('passes for a valid sound', () => {
    expect(() => checkSoundInvariants(validSounds[0])).not.toThrow();
  });

  it('fails when id is not finite', () => {
    const invalid: Sound = { ...validSounds[0], id: Infinity };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound id must be a finite positive number'
    );
  });

  it('fails when id is not positive', () => {
    const invalid: Sound = { ...validSounds[0], id: -5 };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound id must be a finite positive number'
    );
  });

  it('fails when audioUrl is empty', () => {
    const invalid: Sound = { ...validSounds[0], audioUrl: '' };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound audioUrl must be a non-empty URL'
    );
  });

  it('fails when audioUrl is not a valid URL', () => {
    const invalid: Sound = { ...validSounds[0], audioUrl: 'not-a-url' };
    expect(() => checkSoundInvariants(invalid)).toThrow(
      'Sound audioUrl must be a non-empty URL'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validSounds[0], audioUrl: '' };
    expect(() => soundSchema.parse(invalid)).toThrow();
  });

  it('validates schema against valid data', () => {
    expect(soundSchema.parse(validSounds[0])).toEqual(validSounds[0]);
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

  it('fails when startMarkId equals endMarkId', () => {
    const invalid: Path = {
      ...validPath,
      endMarkId: validPath.startMarkId
    };
    expect(() => checkPathInvariants(invalid)).toThrow(
      'Path must connect to two different marks'
    );
  });

  it('validates schema against invalid data', () => {
    const invalid = { ...validPath, startMarkId: 'not-a-number' };
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
      marks: [
        { id: validMark.id, mapId: validMark.mapId },
        { id: 101, mapId: 1 }
      ],
      soundPieces: [validSoundPiece],
      paths: [validPath]
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when a map references a missing sound piece', () => {
    const result = validateDataset({
      maps: [{ ...validMap, soundPieceId: 99 }],
      marks: [],
      soundPieces: [validSoundPiece],
      paths: []
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Map 1 references missing sound piece 99'
    );
  });

  it('fails when a path references a mark from another map', () => {
    const result = validateDataset({
      maps: [validMap],
      marks: [{ id: validMark.id, mapId: 2 }],
      soundPieces: [validSoundPiece],
      paths: [validPath]
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Mark 100 in path 1000 does not belong to map 1'
    );
  });

  it('fails when a path references a missing mark', () => {
    const result = validateDataset({
      maps: [validMap],
      marks: [],
      soundPieces: [validSoundPiece],
      paths: [validPath]
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Path 1000 references missing mark 100');
  });
});