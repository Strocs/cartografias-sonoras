import type { Map, MapImage, MapLayer } from '../domain/types'
import { mapLayouts, type MapLayout } from './map-layouts'

import ROUTE_1_BASE from '@assets/maps/route_1/base.webp'
import ROUTE_1_PREVIEW from '@assets/maps/route_1/preview.webp'
import ROUTE_1_BASE_LAYER_1 from '@assets/maps/route_1/layers/icon.webp'
import ROUTE_2_BASE from '@assets/maps/route_2/base.webp'
import ROUTE_2_PREVIEW from '@assets/maps/route_2/preview.webp'
import ROUTE_2_BASE_LAYER_1 from '@assets/maps/route_2/layers/icon.webp'
import ROUTE_3_BASE from '@assets/maps/route_3/base.webp'
import ROUTE_3_PREVIEW from '@assets/maps/route_3/preview.webp'
import ROUTE_3_BASE_LAYER_1 from '@assets/maps/route_3/layers/icon.webp'

type AstroImage = import('astro').ImageMetadata

interface MapAssets {
  base: AstroImage
  preview: AstroImage
  overlays: Record<string, AstroImage>
}

/**
 * Asset binding per layout slug. The composition itself (ids, frames,
 * optional, effect) lives in `map-layouts.ts`; this is the single place
 * where declarations are paired with the actual image files.
 */
const assetsBySlug: Record<string, MapAssets> = {
  'avenida-de-aguirre-la-serena': {
    base: ROUTE_1_BASE,
    preview: ROUTE_1_PREVIEW,
    overlays: { 'layer-0': ROUTE_1_BASE_LAYER_1 }
  },
  'cruz-del-tercer-milenio-coquimbo': {
    base: ROUTE_2_BASE,
    preview: ROUTE_2_PREVIEW,
    overlays: { 'layer-0': ROUTE_2_BASE_LAYER_1 }
  },

  'plaza-de-armas-la-serena': {
    base: ROUTE_3_BASE,
    preview: ROUTE_3_PREVIEW,
    overlays: {
      'layer-0': ROUTE_3_BASE_LAYER_1,
      'layer-1': ROUTE_3_BASE_LAYER_1,
      'layer-2': ROUTE_3_BASE_LAYER_1
    }
  }
}

function toMapImage(image: AstroImage): MapImage {
  return {
    src: image.src,
    width: image.width,
    height: image.height,
    format: image.format,
    asset: image
  }
}

function bindAssets(layout: MapLayout, assets: MapAssets): Map {
  const [baseLayer, ...overlayLayers] = layout.layers
  const overlayImages: MapLayer[] = overlayLayers.map((layer) => {
    const asset = assets.overlays[layer.id]
    if (!asset) {
      throw new Error(`No overlay asset bound for layout "${layout.slug}" layer "${layer.id}"`)
    }
    return { ...layer, ...toMapImage(asset) }
  })

  return {
    id: layout.id,
    slug: layout.slug,
    title: layout.title,
    soundPieceId: layout.soundPieceId,
    soundPieceEnabled: layout.soundPieceEnabled,
    preview: toMapImage(assets.preview),
    images: [{ ...baseLayer, ...toMapImage(assets.base) }, ...overlayImages]
  }
}

export const MAPS_DATA: Map[] = mapLayouts.map((layout) => {
  const assets = assetsBySlug[layout.slug]
  if (!assets) {
    throw new Error(`No assets bound for map layout "${layout.slug}"`)
  }
  return bindAssets(layout, assets)
})
