/**
 * Converts a relative position (0–100 % of image dimensions) to absolute
 * pixel coordinates for a given map image size.
 *
 * (0, 0) = top-left corner, (100, 100) = bottom-right corner.
 */
export function relativeToPixel(
  pos: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: Math.round((pos.x / 100) * width),
    y: Math.round((pos.y / 100) * height),
  };
}

/**
 * Inverse of `relativeToPixel`. Converts absolute pixel coordinates back
 * to a percentage-based position. Useful for migrations and tooling.
 */
export function pixelToRelative(
  pos: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: (pos.x / width) * 100,
    y: (pos.y / height) * 100,
  };
}
