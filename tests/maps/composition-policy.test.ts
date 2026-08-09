import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { resolveLayerGeometry } from '../../src/features/maps/lib/composition-geometry'
import { enablesEffect, RENDER_CONTEXT } from '../../src/features/maps/lib/effect-policy'

const layer = {
  id: 'overlay',
  src: '/overlay.png',
  width: 100,
  height: 100,
  frame: { x: 0, y: 0, width: 100, height: 50 },
  optional: true,
  effect: 'float'
} as const

describe('map composition policy', () => {
  it('keeps the transition participant on the contained preview image', () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), 'src/features/maps/ui/MapCompositionPreview.astro'),
      'utf8'
    )
    const mapCardSource = readFileSync(resolve(process.cwd(), 'src/features/maps/ui/MapCard.astro'), 'utf8')
    const rightRailSource = readFileSync(resolve(process.cwd(), 'src/features/maps/ui/RightRail.astro'), 'utf8')

    expect(previewSource).toContain("transitionRole?: 'source' | 'destination'")
    expect(previewSource).toContain("transitionRole = 'source'")
    expect(previewSource).toContain("transitionRole === 'destination'")
    expect(previewSource).toContain('transition:name={!isDestination ? `map-composition-${map.slug}` : undefined}')
    expect(previewSource).toContain('transition:name={isDestination ? `map-composition-${map.slug}` : undefined}')
    expect(previewSource).toContain('class={imageClass}')
    expect(previewSource).toContain('map-composition-destination-image')
    expect(previewSource).toContain('[data-map-composition-preview].map-composition-destination')
    expect(previewSource).toContain('max-width: 100%')
    expect(previewSource).toContain('max-height: 100%')
    expect(mapCardSource).toContain(
      'imageClass="size-full transition-transform duration-600 group-hover:scale-110 object-contain"'
    )
    expect(rightRailSource).toContain(
      'imageClass="object-contain aspect-auto transition-all duration-300 group-hover:scale-110"'
    )
  })

  it('contains and centers layers without stretching', () => {
    expect(resolveLayerGeometry(layer, { src: '/base.png', width: 200, height: 200 })).toEqual({
      x: 50,
      y: 0,
      width: 100,
      height: 100
    })
  })

  it('enables declared effects only for active motion', () => {
    expect(enablesEffect(layer, RENDER_CONTEXT.ACTIVE, false)).toBe(true)
    expect(enablesEffect(layer, RENDER_CONTEXT.HOME, false)).toBe(false)
    expect(enablesEffect(layer, RENDER_CONTEXT.ACTIVE, true)).toBe(false)
  })
})
