import { beforeEach, describe, expect, it, vi } from 'vitest';

const panzoomMock = vi.hoisted(() => ({
  getPan: vi.fn(),
  getScale: vi.fn(),
  pan: vi.fn(),
  zoom: vi.fn(),
  destroy: vi.fn(),
  zoomWithWheel: vi.fn(),
}));

vi.mock('@panzoom/panzoom', () => ({ default: vi.fn(() => panzoomMock) }));

import {
  GESTURE_OVERSCROLL_PX,
  constrainTransform,
  initPanzoom,
  type TransformBoundsInput,
} from '../../src/features/maps/lib/panzoom-setup';

const viewport = { left: 0, right: 400, top: 0, bottom: 300 };
const oversized = { left: -100, right: 700, top: -100, bottom: 500 };

function bounds(
  content: TransformBoundsInput['content'],
  scale = 1,
  pan = { x: 0, y: 0 }
): TransformBoundsInput {
  return { viewport, content, scale, pan };
}

describe('constrainTransform', () => {
  it.each([
    ['undersized left/top', { left: -50, right: 150, top: -50, bottom: 50 }, 1, { x: 160, y: 130 }],
    ['undersized right/bottom', { left: 250, right: 450, top: 250, bottom: 350 }, 1, { x: -140, y: -170 }],
    ['oversized left/top', { left: 50, right: 850, top: 50, bottom: 650 }, 1, { x: -40, y: -70 }],
    ['oversized right/bottom', { left: -450, right: 350, top: -350, bottom: 250 }, 1, { x: 60, y: 30 }],
    ['non-1 scale', { left: 25, right: 825, top: -350, bottom: 250 }, 2, { x: -2.5, y: 5 }],
  ])('strictly constrains %s', (_name, content, scale, expected) => {
    expect(constrainTransform(bounds(content, scale, { x: 10, y: -20 }), { allowancePx: 0, animate: false })).toEqual(
      expected
    );
  });

  it('caps pointer gesture overscroll in screen pixels', () => {
    expect(
      constrainTransform(bounds({ left: 100, right: 900, top: -100, bottom: 500 }), {
        allowancePx: GESTURE_OVERSCROLL_PX,
        animate: false,
      })
    ).toEqual({ x: GESTURE_OVERSCROLL_PX - 100, y: 0 });
  });

  it('preserves the prior finite pan when geometry is invalid', () => {
    expect(
      constrainTransform(bounds({ left: 0, right: 0, top: 0, bottom: 300 }, 1, { x: 12, y: -8 }), {
        allowancePx: 0,
        animate: false,
      })
    ).toEqual({ x: 12, y: -8 });
  });

  it('normalizes non-finite prior pan values to finite output', () => {
    expect(
      constrainTransform(bounds(oversized, 1, { x: Number.NaN, y: Number.POSITIVE_INFINITY }), {
        allowancePx: 0,
        animate: false,
      })
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('gesture coordinator', () => {
  let parent: HTMLDivElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    parent = document.createElement('div');
    container = document.createElement('div');
    parent.appendChild(container);
    document.body.appendChild(parent);
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(viewport as DOMRect);
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(oversized as DOMRect);
    panzoomMock.getScale.mockReturnValue(1);
    panzoomMock.getPan.mockReturnValue({ x: 0, y: 0 });
  });

  it('constrains the requested pointer pan before Panzoom receives it and smooths back once on release', () => {
    let currentPan = { x: 0, y: 0 };
    panzoomMock.getPan.mockImplementation(() => currentPan);
    panzoomMock.pan.mockImplementation((x: number, y: number) => {
      currentPan = { x, y };
    });
    vi.spyOn(container, 'getBoundingClientRect').mockImplementation(
      () => ({
        left: -100 + currentPan.x,
        right: 700 + currentPan.x,
        top: -100 + currentPan.y,
        bottom: 500 + currentPan.y,
      }) as DOMRect
    );

    const { destroy } = initPanzoom(container, document.createElement('img'));
    panzoomMock.pan.mockClear();

    container.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 200, clientY: 150 })
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 2200, clientY: 150 })
    );

    expect(panzoomMock.pan).toHaveBeenCalledOnce();
    expect(panzoomMock.pan).toHaveBeenCalledWith(
      100 + GESTURE_OVERSCROLL_PX,
      0,
      expect.objectContaining({ animate: false })
    );

    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 2200, clientY: 150 })
    );
    expect(panzoomMock.pan).toHaveBeenLastCalledWith(
      100,
      0,
      expect.objectContaining({ animate: true })
    );
    expect(panzoomMock.pan).toHaveBeenCalledTimes(2);

    destroy();
    destroy();
    parent.remove();
  });

  it('does not reactively correct Panzoom post-render events', () => {
    const { destroy } = initPanzoom(container, document.createElement('img'));
    panzoomMock.pan.mockClear();
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ ...oversized, left: 100, right: 900 } as DOMRect);

    container.dispatchEvent(new Event('panzoomstart'));
    container.dispatchEvent(new Event('panzoompan'));
    container.dispatchEvent(new Event('panzoomzoom'));
    container.dispatchEvent(new Event('panzoomend'));
    expect(panzoomMock.pan).not.toHaveBeenCalled();
    destroy();
    parent.remove();
  });

  it('clamps scale to strict bounds on pinch release and constrains pan', () => {
    let currentPan = { x: 0, y: 0 };
    let currentScale = 1;
    panzoomMock.getPan.mockImplementation(() => currentPan);
    panzoomMock.getScale.mockImplementation(() => currentScale);
    panzoomMock.pan.mockImplementation((x: number, y: number) => {
      currentPan = { x, y };
    });
    panzoomMock.zoom.mockImplementation((scale: number) => {
      currentScale = scale;
    });

    const maxScale = 4;
    const { destroy } = initPanzoom(container, document.createElement('img'), { maxScale });

    // Simulate pinch that exceeds maxScale via overscroll allowance
    currentScale = maxScale + 0.1; // overscrolled beyond strict max
    container.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 150, clientY: 150 })
    );
    container.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 250, clientY: 150 })
    );
    panzoomMock.pan.mockClear();
    panzoomMock.zoom.mockClear();

    // Release all pointers — scale must be clamped to maxScale
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 150, clientY: 150 })
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: 250, clientY: 150 })
    );

    expect(panzoomMock.zoom).toHaveBeenCalledWith(
      maxScale,
      expect.objectContaining({ animate: false, force: true, silent: true })
    );
    expect(panzoomMock.pan).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ animate: true })
    );

    destroy();
    parent.remove();
  });
});
