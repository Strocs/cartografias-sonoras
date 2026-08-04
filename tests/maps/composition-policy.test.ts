import { describe, expect, it } from 'vitest';

import { resolveLayerGeometry } from '../../src/features/maps/lib/composition-geometry';
import {
  enablesEffect,
  RENDER_CONTEXT
} from '../../src/features/maps/lib/effect-policy';

const layer = {
  id: 'overlay',
  src: '/overlay.png',
  width: 100,
  height: 100,
  frame: { x: 0, y: 0, width: 100, height: 50 },
  optional: true,
  effect: 'float'
} as const;

describe('map composition policy', () => {
  it('contains and centers layers without stretching', () => {
    expect(
      resolveLayerGeometry(layer, { src: '/base.png', width: 200, height: 200 })
    ).toEqual({ x: 50, y: 0, width: 100, height: 100 });
  });

  it('enables declared effects only for active motion', () => {
    expect(enablesEffect(layer, RENDER_CONTEXT.ACTIVE, false)).toBe(true);
    expect(enablesEffect(layer, RENDER_CONTEXT.HOME, false)).toBe(false);
    expect(enablesEffect(layer, RENDER_CONTEXT.ACTIVE, true)).toBe(false);
  });
});
