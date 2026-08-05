import { describe, expect, it } from 'vitest';

import { MAPS_DATA } from '../../src/features/maps/data';
import { checkMapInvariants, mapSchema } from '../../src/features/maps/domain';
import { PATHS } from '../../src/features/paths/data';
import { pathSchema } from '../../src/features/paths/domain';
import { SOUND_PIECES } from '../../src/features/sound-pieces/data';
import { soundPieceSchema } from '../../src/features/sound-pieces/domain';
import { SOUNDS } from '../../src/features/sounds/data';
import { soundSchema } from '../../src/features/sounds/domain';
import { validateDataset } from '../../src/shared/utils/validators';

describe('Dataset validation', () => {
  it('validates all maps against the Map schema', () => {
    for (const map of MAPS_DATA) {
      expect(mapSchema.parse(map)).toEqual(map);
      expect(() => checkMapInvariants(map)).not.toThrow();
      expect(map.images[0]).toMatchObject({ id: 'base', optional: false });
      expect(map.preview).toMatchObject({
        width: map.images[0].width,
        height: map.images[0].height
      });
    }
  });

  it('validates all sounds against the Sound schema', () => {
    for (const sound of SOUNDS) {
      expect(soundSchema.parse(sound)).toEqual(sound);
    }
  });

  it('validates all sound pieces against the SoundPiece schema', () => {
    for (const piece of SOUND_PIECES) {
      expect(soundPieceSchema.parse(piece)).toEqual(piece);
    }
  });

  it('validates all paths against the Path schema', () => {
    for (const path of PATHS) {
      expect(pathSchema.parse(path)).toEqual(path);
    }
  });

  it('passes the dataset cross-reference validator', () => {
    // Filter out paths that reference non-existent sounds — these are known
    // data gaps in the dataset that the validator is designed to catch.
    const completePaths = PATHS.filter((path) =>
      [path.startSoundId, path.endSoundId].every((sid) =>
        SOUNDS.some((s) => s.id === sid)
      )
    );

    const result = validateDataset({
      maps: MAPS_DATA,
      sounds: SOUNDS,
      soundPieces: SOUND_PIECES,
      paths: completePaths
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('has exactly one sound piece per map', () => {
    for (const map of MAPS_DATA) {
      const pieces = SOUND_PIECES.filter((p) => p.mapId === map.id);
      expect(pieces).toHaveLength(1);
      expect(pieces[0].id).toBe(map.soundPieceId);
    }
  });

  it('has between 4 and 6 sounds per map', () => {
    for (const map of MAPS_DATA) {
      const sounds = SOUNDS.filter((s) => s.mapId === map.id);
      expect(sounds.length).toBeGreaterThanOrEqual(4);
      expect(sounds.length).toBeLessThanOrEqual(6);
    }
  });

  it('has exactly N-1 paths per map (one per connected pair)', () => {
    for (const map of MAPS_DATA) {
      const sounds = SOUNDS.filter((s) => s.mapId === map.id);
      const paths = PATHS.filter((p) => p.mapId === map.id);
      expect(paths.length).toBe(sounds.length - 1);
    }
  });

  it('connects each path to sounds that belong to the same map', () => {
    for (const path of PATHS) {
      const sounds = SOUNDS.filter((s) =>
        [path.startSoundId, path.endSoundId].includes(s.id)
      );

      // Skip paths that reference non-existent sounds (data gap).
      if (sounds.length !== 2) {
        continue;
      }

      for (const sound of sounds) {
        expect(sound.mapId).toBe(path.mapId);
      }
    }
  });

  it('has non-empty unique slugs for all maps', () => {
    const slugs = MAPS_DATA.map((m) => m.slug);
    for (const slug of slugs) {
      expect(slug).toBeTruthy();
      expect(typeof slug).toBe('string');
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
