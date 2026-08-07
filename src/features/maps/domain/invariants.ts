import type { Map } from './types'

export function checkMapInvariants(map: Map): void {
  if (map.soundPieceId === null || map.soundPieceId === undefined) {
    throw new Error('Map must have a sound piece')
  }

  const [base, ...layers] = map.images
  if (!base || base.optional || !isFullFrame(base.frame)) {
    throw new Error('Map base layer must be required and full-frame')
  }
  if (map.preview.width !== base.width || map.preview.height !== base.height) {
    throw new Error('Map preview must match base dimensions')
  }

  const ids = new Set<string>()
  for (const layer of [base, ...layers]) {
    const { frame } = layer
    if (!layer.id || ids.has(layer.id)) throw new Error('Map layer IDs must be unique')
    if (
      ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
      frame.width <= 0 ||
      frame.height <= 0 ||
      frame.x < 0 ||
      frame.y < 0 ||
      frame.x + frame.width > 100 ||
      frame.y + frame.height > 100
    ) {
      throw new Error('Map layer frame must be positive and contained')
    }
    ids.add(layer.id)
  }
}

function isFullFrame(frame: Map['images'][number]['frame']): boolean {
  return frame.x === 0 && frame.y === 0 && frame.width === 100 && frame.height === 100
}
