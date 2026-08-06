import { describe, expect, it } from 'vitest';

import { MAPS_DATA } from '../../src/features/maps/data';
import { checkMapInvariants, mapSchema } from '../../src/features/maps/domain';
import { PATHS } from '../../src/features/paths/data';
import { pathSchema } from '../../src/features/paths/domain';
import { SOUND_PIECES } from '../../src/features/sound-pieces/data';
import { soundPieceSchema } from '../../src/features/sound-pieces/domain';
import { MARKS } from '../../src/features/sounds/data';
import { markSchema } from '../../src/features/sounds/domain';
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

  it('validates all marks against the Mark schema', () => {
    for (const mark of MARKS) {
      expect(markSchema.parse(mark)).toEqual(mark);
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
    const result = validateDataset({
      maps: MAPS_DATA,
      marks: MARKS.map((m) => ({ id: m.id, mapId: m.mapId })),
      soundPieces: SOUND_PIECES,
      paths: PATHS
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

  it('yields exactly one mark per point: 5/5/4 marks per map', () => {
    expect(MARKS.filter((m) => m.mapId === 1)).toHaveLength(5);
    expect(MARKS.filter((m) => m.mapId === 2)).toHaveLength(5);
    expect(MARKS.filter((m) => m.mapId === 3)).toHaveLength(4);
  });

  it('yields total sounds 17/11/10 per map', () => {
    const soundsPerMap = (mapId: number): number =>
      MARKS.filter((m) => m.mapId === mapId).reduce(
        (acc, mark) => acc + mark.sounds.length,
        0
      );

    expect(soundsPerMap(1)).toBe(17);
    expect(soundsPerMap(2)).toBe(11);
    expect(soundsPerMap(3)).toBe(10);
  });

  it('keeps legacy first-sound ids as mark ids (101–105/201–205/301–304)', () => {
    const ids = MARKS.map((m) => m.id);
    expect(ids).toContain(101);
    expect(ids).toContain(105);
    expect(ids).toContain(201);
    expect(ids).toContain(205);
    expect(ids).toContain(301);
    expect(ids).toContain(304);
  });

  it('keeps every derived sound id unique within its map', () => {
    for (const map of MAPS_DATA) {
      const ids = MARKS.filter((m) => m.mapId === map.id).flatMap((m) =>
        m.sounds.map((s) => s.id)
      );
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has exactly N-1 paths per map (one per connected pair of marks)', () => {
    for (const map of MAPS_DATA) {
      const marks = MARKS.filter((m) => m.mapId === map.id);
      const paths = PATHS.filter((p) => p.mapId === map.id);
      expect(paths.length).toBe(marks.length - 1);
    }
  });

  it('connects each path to marks that belong to the same map', () => {
    for (const path of PATHS) {
      const marks = MARKS.filter((m) =>
        [path.startMarkId, path.endMarkId].includes(m.id)
      );

      expect(marks).toHaveLength(2);

      for (const mark of marks) {
        expect(mark.mapId).toBe(path.mapId);
      }
    }
  });

  it('emits per-point distinct audio URLs including MAP_02 (spec req 15)', () => {
    for (const mark of MARKS) {
      // Mark id encodes the point: mapId*100 + point.
      const point = mark.id % 100;
      const expectedSegment = `Punto_${point}_`;

      for (const sound of mark.sounds) {
        expect(sound.audioUrl).toContain(expectedSegment);
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

  it('declares a hover scale of 1.05 for map 1 layer-0 only', () => {
    const map1 = MAPS_DATA.find((m) => m.id === 1);
    expect(map1?.images[1]).toMatchObject({ id: 'layer-0', hoverScale: 1.05 });

    for (const map of MAPS_DATA) {
      const [base, ...overlays] = map.images;
      expect(base.hoverScale).toBeUndefined();
      for (const overlay of overlays) {
        if (map.id === 1 && overlay.id === 'layer-0') {
          expect(overlay.hoverScale).toBe(1.05);
        } else {
          expect(overlay.hoverScale).toBeUndefined();
        }
      }
    }
  });

  it('validates and rejects layer hoverScale in the map schema', () => {
    const map1 = MAPS_DATA.find((m) => m.id === 1);
    expect(map1).toBeDefined();
    expect(mapSchema.parse(map1!)).toEqual(map1);

    const layer = map1!.images[1];
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: 0 }]
      })
    ).toThrow();
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: -1 }]
      })
    ).toThrow();
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: 1.05 }]
      })
    ).not.toThrow();
  });
});
