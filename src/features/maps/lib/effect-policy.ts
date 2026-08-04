import { LAYER_EFFECT, type MapLayer } from '../domain';

export const RENDER_CONTEXT = {
  ACTIVE: 'active',
  HOME: 'home',
  MAP_CARD: 'map-card',
  RIGHT_RAIL: 'right-rail'
} as const;

export type RenderContext =
  (typeof RENDER_CONTEXT)[keyof typeof RENDER_CONTEXT];

export function enablesEffect(
  layer: MapLayer,
  context: RenderContext,
  reducedMotion: boolean
): boolean {
  return (
    context === RENDER_CONTEXT.ACTIVE &&
    !reducedMotion &&
    layer.effect !== LAYER_EFFECT.NONE
  );
}
