import { z } from 'zod'

import { mapSchema } from '../../features/maps/domain/schema'
import { pathSchema } from '../../features/paths/domain/schema'
import { soundPieceSchema } from '../../features/sound-pieces/domain/schema'
import { markSchema } from '../../features/sounds/domain/schema'

/**
 * Single schema for the whole static dataset: composes the per-entity
 * schemas and validates the cross-references and uniqueness rules that
 * hold between them. Parsing the real dataset through this schema is the
 * dataset validation net (used by the test suite; can also be wired into
 * the data modules for fail-fast at load time).
 */
export const datasetSchema = z
  .object(
    {
      maps: z.array(mapSchema),
      marks: z.array(markSchema),
      soundPieces: z.array(soundPieceSchema),
      paths: z.array(pathSchema)
    },
    { error: 'Invalid dataset' }
  )
  .superRefine((dataset, ctx) => {
    const issue = (path: string, message: string) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
    }

    const mapById = new Map(dataset.maps.map((map) => [map.id, map]))
    const markById = new Map(dataset.marks.map((mark) => [mark.id, mark]))
    const soundPieceById = new Map(dataset.soundPieces.map((piece) => [piece.id, piece]))

    // Cross-references: map -> sound piece (1:1 by id and ownership).
    for (const map of dataset.maps) {
      const piece = soundPieceById.get(map.soundPieceId)
      if (!piece) {
        issue('maps', `Map ${map.id} references missing sound piece ${map.soundPieceId}`)
      } else if (piece.mapId !== map.id) {
        issue('maps', `Sound piece ${piece.id} does not belong to map ${map.id}`)
      }
    }

    // Cross-references: marks must belong to an existing map.
    for (const mark of dataset.marks) {
      if (!mapById.has(mark.mapId)) {
        issue('marks', `Mark ${mark.id} references missing map ${mark.mapId}`)
      }
    }

    // Cross-references: sound pieces must belong to an existing map.
    for (const piece of dataset.soundPieces) {
      if (!mapById.has(piece.mapId)) {
        issue('soundPieces', `Sound piece ${piece.id} references missing map ${piece.mapId}`)
      }
    }

    // Cross-references: paths must exist within a map and connect two marks
    // of the same map.
    for (const path of dataset.paths) {
      if (!mapById.has(path.mapId)) {
        issue('paths', `Path ${path.id} references missing map ${path.mapId}`)
        continue
      }
      for (const markId of [path.startMarkId, path.endMarkId]) {
        const mark = markById.get(markId)
        if (!mark) {
          issue('paths', `Path ${path.id} references missing mark ${markId}`)
        } else if (mark.mapId !== path.mapId) {
          issue('paths', `Mark ${markId} in path ${path.id} does not belong to map ${path.mapId}`)
        }
      }
    }

    // Uniqueness: map slugs.
    const slugs = dataset.maps.map((map) => map.slug)
    if (new Set(slugs).size !== slugs.length) {
      issue('maps', 'Map slugs must be unique')
    }

    // Uniqueness: mark and path ids across the dataset.
    const markIds = dataset.marks.map((mark) => mark.id)
    if (new Set(markIds).size !== markIds.length) {
      issue('marks', 'Mark ids must be unique')
    }
    const pathIds = dataset.paths.map((path) => path.id)
    if (new Set(pathIds).size !== pathIds.length) {
      issue('paths', 'Path ids must be unique')
    }

    // Uniqueness: derived sound ids within each map.
    const soundsByMap = new Map<number, number[]>()
    for (const mark of dataset.marks) {
      const ids = soundsByMap.get(mark.mapId) ?? []
      for (const sound of mark.sounds) ids.push(sound.id)
      soundsByMap.set(mark.mapId, ids)
    }
    for (const [mapId, ids] of soundsByMap) {
      if (new Set(ids).size !== ids.length) {
        issue('marks', `Sound ids must be unique within map ${mapId}`)
      }
    }
  })

export type Dataset = z.infer<typeof datasetSchema>
