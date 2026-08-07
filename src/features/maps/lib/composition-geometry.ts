import type { MapImage, MapLayer } from '../domain'

export interface LayerGeometry {
  x: number
  y: number
  width: number
  height: number
}

export function resolveLayerGeometry(layer: MapLayer, base: MapImage): LayerGeometry {
  const frame = {
    x: (base.width * layer.frame.x) / 100,
    y: (base.height * layer.frame.y) / 100,
    width: (base.width * layer.frame.width) / 100,
    height: (base.height * layer.frame.height) / 100
  }
  const scale = Math.min(frame.width / layer.width, frame.height / layer.height)
  const width = layer.width * scale
  const height = layer.height * scale
  return {
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
    width,
    height
  }
}
