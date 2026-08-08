import { describe, expect, it } from 'vitest'

import { MAPS_DATA } from '../../src/features/maps/data/maps'
import { mapSchema } from '../../src/features/maps/domain'
import { PATHS } from '../../src/features/paths/data/paths'
import { SOUND_PIECES } from '../../src/features/sound-pieces/data/sound-pieces'
import { MARKS } from '../../src/features/sounds/data/sounds'
import { datasetSchema } from '../../src/shared/data/dataset-schema'

const DATASET = { maps: MAPS_DATA, marks: MARKS, soundPieces: SOUND_PIECES, paths: PATHS }

describe('Dataset validation', () => {
  it('validates the whole dataset through the dataset schema', () => {
    expect(() => datasetSchema.parse(DATASET)).not.toThrow()
  })

  it('defines the base layer first and preview matching the base image size', () => {
    for (const map of MAPS_DATA) {
      expect(map.images[0]).toMatchObject({ id: 'base', optional: false })
      expect(map.preview).toMatchObject({
        width: map.images[0].width,
        height: map.images[0].height
      })
    }
  })

  it('has exactly one sound piece per map', () => {
    for (const map of MAPS_DATA) {
      const pieces = SOUND_PIECES.filter((p) => p.mapId === map.id)
      expect(pieces).toHaveLength(1)
      expect(pieces[0].id).toBe(map.soundPieceId)
    }
  })

  it('yields exactly one mark per point: 5/5/4 marks per map', () => {
    expect(MARKS.filter((m) => m.mapId === 1)).toHaveLength(5)
    expect(MARKS.filter((m) => m.mapId === 2)).toHaveLength(5)
    expect(MARKS.filter((m) => m.mapId === 3)).toHaveLength(4)
  })

  it('yields total sounds 17/11/10 per map', () => {
    const soundsPerMap = (mapId: number): number =>
      MARKS.filter((m) => m.mapId === mapId).reduce((acc, mark) => acc + mark.sounds.length, 0)

    expect(soundsPerMap(1)).toBe(17)
    expect(soundsPerMap(2)).toBe(11)
    expect(soundsPerMap(3)).toBe(10)
  })

  it('keeps legacy first-sound ids as mark ids (101–105/201–205/301–304)', () => {
    const ids = MARKS.map((m) => m.id)
    expect(ids).toContain(101)
    expect(ids).toContain(105)
    expect(ids).toContain(201)
    expect(ids).toContain(205)
    expect(ids).toContain(301)
    expect(ids).toContain(304)
  })

  it('has exactly N-1 paths per map (one per connected pair of marks)', () => {
    for (const map of MAPS_DATA) {
      const marks = MARKS.filter((m) => m.mapId === map.id)
      const paths = PATHS.filter((p) => p.mapId === map.id)
      expect(paths.length).toBe(marks.length - 1)
    }
  })

  it('emits per-point dual streaming audio URLs including MAP_02 (spec req 15)', () => {
    for (const mark of MARKS) {
      // Mark id encodes the point: mapId*100 + point.
      const point = mark.id % 100

      for (const [index, sound] of mark.sounds.entries()) {
        const soundIdx = index + 1
        const baseUrl = `https://mapasonoro.frijolmagico.cl/1/${mark.mapId}/sonidos/${point}`
        const filename = `Ruta_${mark.mapId}_Punto_${point}_Sonido_${soundIdx}_Binaural_norm`

        expect(sound.audioSources.primary.url).toBe(`${baseUrl}/streaming/${filename}.m4a`)
        expect(sound.audioSources.fallback.url).toBe(`${baseUrl}/streaming/${filename}.opus`)
      }
    }
  })

  it('has non-empty slugs for all maps', () => {
    const slugs = MAPS_DATA.map((m) => m.slug)
    for (const slug of slugs) {
      expect(slug).toBeTruthy()
      expect(typeof slug).toBe('string')
    }
  })

  it('keeps hoverScale optional per layer: both absent and present forms stay valid', () => {
    // hoverScale is an optional capability, never a requirement: the dataset
    // may omit it everywhere, and adding it to any overlay must keep the whole
    // map pipeline (schema parse) working.
    for (const map of MAPS_DATA) {
      for (const layer of map.images) {
        if (layer.hoverScale !== undefined) {
          expect(layer.hoverScale).toBeGreaterThan(0)
        }
      }
    }

    // Absent form: the dataset currently declares no hoverScale anywhere, and
    // that shape must round-trip through the schema untouched.
    const first = MAPS_DATA[0]!
    expect(mapSchema.parse(first)).toEqual(first)

    // Present form: adding hoverScale to an overlay stays valid end-to-end.
    expect(() =>
      mapSchema.parse({
        ...first,
        images: [first.images[0], { ...first.images[1], hoverScale: 1.05 }]
      })
    ).not.toThrow()
  })

  it('validates and rejects layer hoverScale in the map schema', () => {
    const map1 = MAPS_DATA.find((m) => m.id === 1)
    expect(map1).toBeDefined()
    expect(mapSchema.parse(map1!)).toEqual(map1)

    const layer = map1!.images[1]
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: 0 }]
      })
    ).toThrow()
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: -1 }]
      })
    ).toThrow()
    expect(() =>
      mapSchema.parse({
        ...map1,
        images: [map1!.images[0], { ...layer, hoverScale: 1.05 }]
      })
    ).not.toThrow()
  })
})
