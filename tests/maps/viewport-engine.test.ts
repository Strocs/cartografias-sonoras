import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeStrictBounds } from '../../src/features/maps/lib/viewport/geometry';
import { ViewportEngine } from '../../src/features/maps/lib/viewport/engine';
import type { ViewportEventDetail, ViewportPoint, ViewportSnapshot } from '../../src/features/maps/lib/viewport/types';

const rect = { left: 40, top: 20, width: 400, height: 300, right: 440, bottom: 320 };
const config = { content: { width: 800, height: 600 }, minScale: 0.5, maxScale: 4 };

function wheel(deltaY: number, x = rect.left + 200, y = rect.top + 150): WheelEvent {
  const event = new Event('wheel', { bubbles: true, cancelable: true }) as WheelEvent;
  Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y }, deltaY: { value: deltaY }, deltaMode: { value: WheelEvent.DOM_DELTA_PIXEL } });
  return event;
}

function contentAt(state: ViewportSnapshot, focal: ViewportPoint): ViewportPoint {
  return { x: (focal.x - state.x) / state.scale, y: (focal.y - state.y) / state.scale };
}

describe('ViewportEngine corrected interaction semantics', () => {
  let viewport: HTMLDivElement;
  let scene: HTMLDivElement;
  let frames: FrameRequestCallback[];
  let pendingFrames: Map<number, FrameRequestCallback>;
  let nextFrame: number;

  beforeEach(() => {
    viewport = document.createElement('div');
    scene = document.createElement('div');
    viewport.appendChild(scene);
    document.body.appendChild(viewport);
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    frames = [];
    pendingFrames = new Map();
    nextFrame = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const frame = nextFrame++;
      frames.push(callback);
      pendingFrames.set(frame, callback);
      return frame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => pendingFrames.delete(frame));
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  function runPendingFrame(timestamp: number): void {
    const pending = Array.from(pendingFrames.entries()).at(-1);
    expect(pending).toBeDefined();
    if (pending === undefined) return;
    pendingFrames.delete(pending[0]);
    pending[1](timestamp);
  }

  function expectStrict(state: ViewportSnapshot): void {
    const bounds = computeStrictBounds({ width: rect.width, height: rect.height }, config.content, state.scale);
    expect(state.scale).toBeGreaterThanOrEqual(config.minScale);
    expect(state.scale).toBeLessThanOrEqual(config.maxScale);
    expect(state.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(state.x).toBeLessThanOrEqual(bounds.maxX);
    expect(state.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(state.y).toBeLessThanOrEqual(bounds.maxY);
  }

  it('derives content from the live viewport when omitted (container-space mode)', () => {
    // No `content` in config: the engine treats the scene as filling the
    // container, so 1x fits the viewport exactly (scale 1, centred at origin).
    const engine = new ViewportEngine(scene, { minScale: 0.5, maxScale: 4 });
    const initial = engine.getState();
    expect(initial.scale).toBe(1);
    expect(initial.x).toBe(0);
    expect(initial.y).toBe(0);

    // At zoom-in the pan bounds derive from the container (viewport) size, not
    // from any external content size.
    engine.zoomIn();
    const zoomed = engine.getState();
    const bounds = computeStrictBounds(
      { width: rect.width, height: rect.height },
      { width: rect.width, height: rect.height },
      zoomed.scale
    );
    expect(zoomed.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(zoomed.x).toBeLessThanOrEqual(bounds.maxX);
    expect(zoomed.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(zoomed.y).toBeLessThanOrEqual(bounds.maxY);
    engine.destroy();
  });

  it('respects startScale as the initial centred zoom when provided', () => {
    const engine = new ViewportEngine(scene, {
      minScale: 0.5,
      maxScale: 4,
      startScale: 2
    });
    const initial = engine.getState();
    // Container 400x300 at scale 2, centred: content fills 800x600.
    expect(initial.scale).toBe(2);
    expect(initial.x).toBe((rect.width - rect.width * 2) / 2);
    expect(initial.y).toBe((rect.height - rect.height * 2) / 2);
    engine.destroy();
  });

  it('keeps an offset viewport zero-delta stable and maps an in-range client delta exactly', () => {
    const engine = new ViewportEngine(scene, config);
    engine.zoomIn();
    const start = engine.getState();

    scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 150 }));
    scene.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 100, clientY: 150 }));
    expect(engine.getState()).toEqual(expect.objectContaining({ x: start.x, y: start.y }));

    scene.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 124, clientY: 132 }));
    expect(engine.getState()).toEqual(expect.objectContaining({ x: start.x + 24, y: start.y - 18, phase: 'dragging' }));
    engine.destroy();
  });

  it('reconfigures the zoom range via setRange and reprojects the current scale', () => {
    const engine = new ViewportEngine(scene, config);
    engine.zoomIn();
    const before = engine.getState();
    expect(before.scale).toBeGreaterThan(config.minScale);

    // Shrink the range below the current scale: setRange must clamp strictly.
    engine.setRange(config.minScale, config.minScale * 1.1);
    const after = engine.getState();
    expect(after.scale).toBeLessThanOrEqual(config.minScale * 1.1);
    expect(after.scale).toBeGreaterThanOrEqual(config.minScale);
    expectStrict(after);

    // A scale already inside the new range is left untouched.
    engine.setRange(0.4, 3);
    expect(engine.getState().scale).toBe(after.scale);
    engine.destroy();
  });

  it('resists active overscroll, snaps strictly, and publishes neither drag coast nor inertial reasons after release', () => {
    const engine = new ViewportEngine(scene, config);
    engine.zoomIn();
    const changes: ViewportEventDetail[] = [];
    scene.addEventListener('viewport-change', (event) => changes.push((event as CustomEvent<ViewportEventDetail>).detail));
    const start = engine.getState();

    scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 150 }));
    scene.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 600, clientY: 150 }));
    const resisted = engine.getState().x;
    expect(resisted).toBeGreaterThan(0);
    expect(resisted).toBeLessThan(48);
    scene.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 600, clientY: 150 }));
    expect(engine.getState().phase).toBe('animating');
    runPendingFrame(0);
    runPendingFrame(180);
    expect(engine.getState()).toEqual(expect.objectContaining({ phase: 'idle', x: 0 }));

    scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 100, clientY: 150 }));
    scene.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: 76, clientY: 150 }));
    const inRange = engine.getState();
    scene.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: 76, clientY: 150 }));
    expect(pendingFrames.size).toBe(0);
    frames.forEach((frame) => frame(999));
    expect(engine.getState()).toEqual({ ...inRange, phase: 'idle', revision: inRange.revision + 1 });
    expect(changes.map(({ reason }) => reason)).not.toEqual(expect.arrayContaining([expect.stringMatching(/momentum|inertia|coast/i)]));
    expect(changes.at(-1)).toEqual(expect.objectContaining({ reason: 'release', state: engine.getState() }));
    expect(start.revision).toBeLessThan(inRange.revision);
    engine.destroy();
  });

  it('smooths each bound elastically then settles min and max scale plus translation strictly', () => {
    const minEngine = new ViewportEngine(scene, config);
    scene.dispatchEvent(wheel(120));
    runPendingFrame(0);
    runPendingFrame(96);
    const minOverscale = minEngine.getState();
    expect(minOverscale.scale).toBeLessThan(config.minScale);
    expect(minOverscale.scale).toBeGreaterThanOrEqual(config.minScale / 1.08);
    runPendingFrame(96);
    runPendingFrame(236);
    expect(minEngine.getState()).toEqual(expect.objectContaining({ phase: 'idle', scale: config.minScale, x: 0, y: 0 }));
    expectStrict(minEngine.getState());
    minEngine.destroy();

    const maxEngine = new ViewportEngine(scene, config);
    for (let index = 0; index < 10; index += 1) maxEngine.zoomIn();
    scene.dispatchEvent(wheel(-120));
    runPendingFrame(0);
    runPendingFrame(96);
    const maxOverscale = maxEngine.getState();
    expect(maxOverscale.scale).toBeGreaterThan(config.maxScale);
    expect(maxOverscale.scale).toBeLessThanOrEqual(config.maxScale * 1.08);
    runPendingFrame(96);
    runPendingFrame(236);
    expect(maxEngine.getState()).toEqual(expect.objectContaining({ phase: 'idle', scale: config.maxScale }));
    expectStrict(maxEngine.getState());
    maxEngine.destroy();
  });

  it('preserves the focal content point at permitted min and max anchors and publishes one strict terminal wheel state', () => {
    const focal = { x: 200, y: 150 };
    const engine = new ViewportEngine(scene, config);
    const details: ViewportEventDetail[] = [];
    scene.addEventListener('viewport-change', (event) => details.push((event as CustomEvent<ViewportEventDetail>).detail));
    const minAnchor = contentAt(engine.getState(), focal);

    scene.dispatchEvent(wheel(120));
    runPendingFrame(0);
    runPendingFrame(96);
    expect(contentAt(engine.getState(), focal).x).toBeCloseTo(minAnchor.x);
    expect(contentAt(engine.getState(), focal).y).toBeCloseTo(minAnchor.y);
    runPendingFrame(96);
    runPendingFrame(236);
    expect(contentAt(engine.getState(), focal).x).toBeCloseTo(minAnchor.x);
    expect(contentAt(engine.getState(), focal).y).toBeCloseTo(minAnchor.y);
    expect(details.filter(({ reason, state }) => reason === 'wheel-settle' && state.phase === 'idle')).toHaveLength(1);

    for (let index = 0; index < 10; index += 1) engine.zoomIn();
    const maxAnchor = contentAt(engine.getState(), focal);
    scene.dispatchEvent(wheel(-120));
    runPendingFrame(300);
    runPendingFrame(396);
    expect(contentAt(engine.getState(), focal).x).toBeCloseTo(maxAnchor.x);
    expect(contentAt(engine.getState(), focal).y).toBeCloseTo(maxAnchor.y);
    runPendingFrame(396);
    runPendingFrame(536);
    const terminal = engine.getState();
    expectStrict(terminal);
    expect(contentAt(terminal, focal).x).toBeCloseTo(maxAnchor.x);
    expect(contentAt(terminal, focal).y).toBeCloseTo(maxAnchor.y);
    const terminalPublications = details.filter(({ reason, state }) => reason === 'wheel-settle' && state.phase === 'idle' && state.scale === config.maxScale);
    expect(terminalPublications).toEqual([{ reason: 'wheel-settle', state: terminal }]);
    engine.destroy();
  });

  it('rebases rapid wheel bursts from the rendered state and latest cursor without jumps or concurrent loops', () => {
    const engine = new ViewportEngine(scene, config);
    const firstFocal = { x: 100, y: 80 };
    const latestFocal = { x: 300, y: 220 };
    scene.dispatchEvent(wheel(-16, rect.left + firstFocal.x, rect.top + firstFocal.y));
    runPendingFrame(0);
    runPendingFrame(48);
    const rendered = engine.getState();
    const stale = frames.at(-1)!;

    scene.dispatchEvent(wheel(-16, rect.left + latestFocal.x, rect.top + latestFocal.y));
    expect(engine.getState()).toEqual(expect.objectContaining({ x: rendered.x, y: rendered.y, scale: rendered.scale, phase: rendered.phase }));
    expect(pendingFrames.size).toBe(1);
    stale(96);
    expect(engine.getState()).toEqual(rendered);
    runPendingFrame(48);
    expect(engine.getState()).toEqual(expect.objectContaining({ x: rendered.x, y: rendered.y, scale: rendered.scale, phase: rendered.phase }));
    expect(engine.getState().revision).toBeGreaterThan(rendered.revision);
    expect(pendingFrames.size).toBe(1);
    runPendingFrame(144);
    const settled = engine.getState();
    expect(settled).toEqual(expect.objectContaining({ phase: 'idle', scale: rendered.scale * Math.exp(16 * 0.002) }));
    expect(contentAt(settled, latestFocal).x).toBeCloseTo(contentAt(rendered, latestFocal).x);
    expect(contentAt(settled, latestFocal).y).toBeCloseTo(contentAt(rendered, latestFocal).y);
    expect(pendingFrames.size).toBe(0);
    engine.destroy();
  });

  it('blocks stale scheduled wheel callbacks after every public interruption path', () => {
    const interruptions: Array<{ name: string; interrupt: (engine: ViewportEngine) => void }> = [
      { name: 'zoomIn', interrupt: (engine) => engine.zoomIn() },
      { name: 'zoomOut', interrupt: (engine) => engine.zoomOut() },
      { name: 'reset', interrupt: (engine) => engine.reset() },
      { name: 'resize', interrupt: (engine) => engine.resize() },
      { name: 'pointerdown', interrupt: () => scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 })) },
      { name: 'destroy', interrupt: (engine) => engine.destroy() },
    ];

    for (const { name, interrupt } of interruptions) {
      const engine = new ViewportEngine(scene, config);
      scene.dispatchEvent(wheel(-16));
      const stale = frames.at(-1)!;
      interrupt(engine);
      const afterInterrupt = engine.getState();
      stale(96);
      expect(engine.getState(), name).toEqual(afterInterrupt);
      if (name !== 'destroy') engine.destroy();
    }
  });

  it('keeps every wheel frame observably identical across DOM, snapshot, subscriber, event, revision, phase, and reason', () => {
    const engine = new ViewportEngine(scene, config);
    for (let index = 0; index < 10; index += 1) engine.zoomIn();
    const events: ViewportEventDetail[] = [];
    const snapshots: ViewportSnapshot[] = [];
    scene.addEventListener('viewport-change', (event) => events.push((event as CustomEvent<ViewportEventDetail>).detail));
    engine.subscribe((state) => snapshots.push(state));
    const assertObservableFrame = (reason: string): void => {
      const state = engine.getState();
      expect(scene.style.transform).toBe(`translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`);
      expect(scene.style.getPropertyValue('--viewport-inverse-scale')).toBe(String(1 / state.scale));
      expect(snapshots.at(-1)).toEqual(state);
      expect(events.at(-1)).toEqual({ state, reason });
      expect(events.at(-1)?.state).toEqual(expect.objectContaining({ revision: state.revision, phase: state.phase }));
    };

    scene.dispatchEvent(wheel(-120));
    runPendingFrame(0);
    assertObservableFrame('wheel');
    runPendingFrame(96);
    assertObservableFrame('wheel');
    runPendingFrame(96);
    assertObservableFrame('wheel-settle');
    runPendingFrame(236);
    assertObservableFrame('wheel-settle');
    expect(engine.getState().phase).toBe('idle');
    engine.destroy();
  });

  it('preserves pinch, interactive marker, public controls, and reduced-motion compatibility', () => {
    const marker = document.createElement('button');
    scene.appendChild(marker);
    const engine = new ViewportEngine(scene, config);
    const initial = engine.getState();
    marker.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 }));
    expect(engine.getState()).toEqual(initial);

    scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 100, clientY: 100 }));
    scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: 200, clientY: 100 }));
    scene.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientX: 260, clientY: 100 }));
    expect(engine.getState()).toEqual(expect.objectContaining({ phase: 'pinching' }));
    expect(Number.isFinite(engine.getState().scale)).toBe(true);
    scene.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: 100, clientY: 100 }));
    scene.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: 260, clientY: 100 }));
    engine.zoomIn();
    engine.zoomOut();
    engine.reset();
    expectStrict(engine.getState());
    engine.destroy();

    const reduced = new ViewportEngine(scene, { ...config, reducedMotion: true });
    const frameCount = frames.length;
    scene.dispatchEvent(wheel(-999));
    expect(frames).toHaveLength(frameCount);
    expectStrict(reduced.getState());
    expect(reduced.getState().phase).toBe('idle');
    reduced.destroy();
  });
});
