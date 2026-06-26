import { describe, expect, it } from 'vitest';

import { mockMaps } from '../../src/features/maps/data';
import { mapSchema } from '../../src/features/maps/domain';
import { mockPaths } from '../../src/features/paths/data';
import { pathSchema } from '../../src/features/paths/domain';
import { mockSoundPieces } from '../../src/features/sound-pieces/data';
import { soundPieceSchema } from '../../src/features/sound-pieces/domain';
import { mockSounds } from '../../src/features/sounds/data';
import { soundSchema } from '../../src/features/sounds/domain';
import { validateDataset } from '../../src/shared/utils/validators';

describe('Mock data validation', () => {
  it('validates all mock maps against the Map schema', () => {
    for (const map of mockMaps) {
      expect(mapSchema.parse(map)).toEqual(map);
    }
  });

  it('validates all mock sounds against the Sound schema', () => {
    for (const sound of mockSounds) {
      expect(soundSchema.parse(sound)).toEqual(sound);
    }
  });

  it('validates all mock sound pieces against the SoundPiece schema', () => {
    for (const piece of mockSoundPieces) {
      expect(soundPieceSchema.parse(piece)).toEqual(piece);
    }
  });

  it('validates all mock paths against the Path schema', () => {
    for (const path of mockPaths) {
      expect(pathSchema.parse(path)).toEqual(path);
    }
  });

  it('passes the dataset cross-reference validator', () => {
    const result = validateDataset({
      maps: mockMaps,
      sounds: mockSounds,
      soundPieces: mockSoundPieces,
      paths: mockPaths,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('has exactly one sound piece per map', () => {
    for (const map of mockMaps) {
      const pieces = mockSoundPieces.filter((p) => p.mapId === map.id);
      expect(pieces).toHaveLength(1);
      expect(pieces[0].id).toBe(map.soundPieceId);
    }
  });

  it('has between 4 and 6 sounds per map', () => {
    for (const map of mockMaps) {
      const sounds = mockSounds.filter((s) => s.mapId === map.id);
      expect(sounds.length).toBeGreaterThanOrEqual(4);
      expect(sounds.length).toBeLessThanOrEqual(6);
    }
  });

  it('has between 2 and 3 paths per map', () => {
    for (const map of mockMaps) {
      const paths = mockPaths.filter((p) => p.mapId === map.id);
      expect(paths.length).toBeGreaterThanOrEqual(2);
      expect(paths.length).toBeLessThanOrEqual(3);
    }
  });

  it('connects each path to sounds that belong to the same map', () => {
    for (const path of mockPaths) {
      const sounds = mockSounds.filter((s) => path.soundIds.includes(s.id));
      expect(sounds).toHaveLength(2);
      for (const sound of sounds) {
        expect(sound.mapId).toBe(path.mapId);
      }
    }
  });

  it('has the expected slugs for the three locaciones', () => {
    const slugs = mockMaps.map((m) => m.slug);
    expect(slugs).toContain('locacion-1');
    expect(slugs).toContain('locacion-2');
    expect(slugs).toContain('locacion-3');
  });
});
