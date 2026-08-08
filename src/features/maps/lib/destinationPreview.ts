import { getImage } from 'astro:assets'

import type { Map } from '../domain/types'

export const MAP_DESTINATION_PREVIEW_WIDTHS = [640, 960, 1280, 1600] as const
export const MAP_DESTINATION_PREVIEW_SIZES = '100vw'

export interface DestinationPreview {
  src: string
  srcset: string
  sizes: string
  width: number
  height: number
}

export async function getMapDestinationPreview(map: Map): Promise<DestinationPreview> {
  if (!map.preview.asset) {
    throw new Error(`Map "${map.slug}" has no preview asset`)
  }

  const image = await getImage({
    src: map.preview.asset,
    widths: [...MAP_DESTINATION_PREVIEW_WIDTHS],
    sizes: MAP_DESTINATION_PREVIEW_SIZES
  })

  if (!image.srcSet) {
    throw new Error(`Map "${map.slug}" did not generate a responsive preview profile`)
  }

  return {
    src: image.src,
    srcset: image.srcSet.attribute,
    sizes: MAP_DESTINATION_PREVIEW_SIZES,
    width: map.preview.width,
    height: map.preview.height
  }
}
