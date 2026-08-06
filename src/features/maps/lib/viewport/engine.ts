import {
  applyBoundsResistance,
  applyScaleResistance,
  clampScale,
  computeFit,
  computeStrictBounds,
  projectFocal,
  projectToStrictBounds,
  projectToStrictTranslation,
} from './geometry';
import { createFrameScheduler } from './scheduler';
import {
  WHEEL_INPUT_DURATION_MS,
  WHEEL_SCALE_COEFFICIENT,
  WHEEL_SETTLE_DEBOUNCE_MS,
  WHEEL_SETTLE_DURATION_MS,
  WHEEL_STAGE,
  clampWheelDelta,
  createSnapBack,
  createWheelTransition,
  interpolate,
  isReducedMotion,
  type ViewportTransition,
  type WheelStage,
} from './transitions';
import { VIEWPORT_PHASE, type ViewportConfig, type ViewportEventDetail, type ViewportPhase, type ViewportPoint, type ViewportSize, type ViewportSnapshot, type ViewportState, type ViewportSubscriber } from './types';

interface PointerSample extends ViewportPoint { pointerId: number; }
interface DragGesture { pointer: ViewportPoint; state: ViewportState; }
interface PinchGesture { firstPointerId: number; secondPointerId: number; center: ViewportPoint; distance: number; state: ViewportState; }
interface AnimationRecord { transition: ViewportTransition; startedAt: number | undefined; reason: string; }
interface WheelTransitionRecord { stage: WheelStage; transition: ViewportTransition; latestFocal: ViewportPoint; lastInputAt: number; startedAt: number | undefined; crossedBound: boolean; }

function isFinitePoint(point: ViewportPoint): boolean { return Number.isFinite(point.x) && Number.isFinite(point.y); }
function statesEqual(first: ViewportState, second: ViewportState): boolean { return first.x === second.x && first.y === second.y && first.scale === second.scale; }

export class ViewportEngine {
  private readonly scheduler = createFrameScheduler();
  private readonly pointers = new Map<number, PointerSample>();
  private readonly subscribers = new Set<ViewportSubscriber>();
  private readonly viewport: HTMLElement;
  private readonly resizeObserver: ResizeObserver | undefined;
  private minScale: number;
  private maxScale: number;
  private state: ViewportState;
  private phase: ViewportPhase = VIEWPORT_PHASE.INITIALIZING;
  private revision = 0;
  private ready = false;
  private drag: DragGesture | undefined;
  private pinch: PinchGesture | undefined;
  private animation: AnimationRecord | undefined;
  private wheel: WheelTransitionRecord | undefined;
  private destroyed = false;
  private usingWindowPointerFallback = false;

  public constructor(private readonly scene: HTMLElement, private readonly config: ViewportConfig) {
    this.assertConfig();
    if (scene.parentElement === null) throw new Error('Viewport scene must have a viewport parent');
    this.viewport = scene.parentElement;
    this.minScale = this.config.minScale;
    this.maxScale = this.config.maxScale;
    this.state = this.getFitState();
    this.scene.style.touchAction = 'none';
    this.scene.addEventListener('pointerdown', this.onPointerDown);
    this.scene.addEventListener('pointermove', this.onPointerMove);
    this.scene.addEventListener('pointerup', this.onPointerRelease);
    this.scene.addEventListener('pointercancel', this.onPointerRelease);
    this.scene.addEventListener('lostpointercapture', this.onPointerRelease);
    this.scene.addEventListener('wheel', this.onWheel, { passive: false });
    if (typeof ResizeObserver !== 'undefined') { this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.viewport); }
    this.phase = VIEWPORT_PHASE.IDLE; this.ready = true; this.commit('initialization');
    this.scene.dispatchEvent(new CustomEvent('viewport-ready', { detail: this.getState() }));
  }

  public getState(): ViewportSnapshot { return Object.freeze({ ...this.state, phase: this.phase, ready: this.ready, revision: this.revision }); }
  public subscribe(subscriber: ViewportSubscriber): () => void { if (this.destroyed) return () => undefined; this.subscribers.add(subscriber); return () => this.subscribers.delete(subscriber); }
  public zoomIn(): void { this.zoomAtCenter(1 + (this.config.zoomStep ?? 0.25), 'zoom-in'); }
  public zoomOut(): void { this.zoomAtCenter(1 / (1 + (this.config.zoomStep ?? 0.25)), 'zoom-out'); }
  public reset(): void { if (!this.destroyed) { this.cancelAnimation(); this.setState(this.getFitState(), VIEWPORT_PHASE.IDLE, 'reset'); } }
  public resize(): void { if (!this.destroyed) { this.cancelAnimation(); this.setState(this.getFitState(), VIEWPORT_PHASE.IDLE, 'resize'); } }
  /**
   * Reconfigures the zoom bounds without recreating the engine or interrupting
   * ongoing pointer gestures. The current scale is re-projected strictly into
   * the new range so the visible view always respects the updated bounds.
   */
  public setRange(minScale: number, maxScale: number): void {
    if (this.destroyed) return;
    if (!Number.isFinite(minScale) || !Number.isFinite(maxScale)) return;
    this.minScale = Math.max(0, minScale);
    this.maxScale = Math.max(this.minScale, maxScale);
    this.cancelAnimation();
    this.projectCurrentStrictly();
  }
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; this.cancelAnimation(); this.resizeObserver?.disconnect();
    for (const pointer of this.pointers.values()) this.releasePointer(pointer.pointerId);
    this.pointers.clear(); this.subscribers.clear();
    this.scene.removeEventListener('pointerdown', this.onPointerDown); this.scene.removeEventListener('pointermove', this.onPointerMove); this.scene.removeEventListener('pointerup', this.onPointerRelease); this.scene.removeEventListener('pointercancel', this.onPointerRelease); this.scene.removeEventListener('lostpointercapture', this.onPointerRelease); this.scene.removeEventListener('wheel', this.onWheel); this.removeWindowPointerFallback(); this.phase = VIEWPORT_PHASE.DESTROYED;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.destroyed || (event.pointerType === 'mouse' && event.button !== 0) || !this.isFiniteEventPoint(event) || this.isInteractiveTarget(event.target)) return;
    this.cancelAnimation(); this.projectCurrentStrictly();
    const pointer = this.toPointer(event); this.pointers.set(event.pointerId, pointer);
    try { this.scene.setPointerCapture(event.pointerId); } catch { this.addWindowPointerFallback(); }
    this.drag = { pointer, state: { ...this.state } };
    if (this.pointers.size === 2) this.beginPinch();
    this.phase = this.pointers.size > 1 ? VIEWPORT_PHASE.PINCHING : VIEWPORT_PHASE.DRAGGING;
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.destroyed || !this.pointers.has(event.pointerId)) return;
    if (!this.isFiniteEventPoint(event)) { this.emitError('Ignored non-finite pointer sample'); return; }
    this.pointers.set(event.pointerId, this.toPointer(event));
    if (this.pointers.size > 1 && this.pinch !== undefined) { this.movePinch(event); return; }
    if (this.pointers.size !== 1 || this.drag === undefined) return;
    const requested = { x: this.drag.state.x + event.clientX - this.drag.pointer.x, y: this.drag.state.y + event.clientY - this.drag.pointer.y, scale: this.drag.state.scale };
    const bounds = computeStrictBounds(this.getViewportSize(), this.getContentSize(), requested.scale);
    this.setState(applyBoundsResistance(requested, bounds), VIEWPORT_PHASE.DRAGGING, 'drag'); event.preventDefault();
  };

  private readonly onPointerRelease = (event: PointerEvent): void => {
    if (this.destroyed || !this.pointers.delete(event.pointerId)) return;
    this.releasePointer(event.pointerId);
    if (this.pointers.size > 0) { const remaining = this.pointers.values().next().value as PointerSample; this.drag = { pointer: remaining, state: { ...this.state } }; this.pinch = undefined; this.phase = VIEWPORT_PHASE.DRAGGING; return; }
    this.drag = undefined; this.pinch = undefined; this.removeWindowPointerFallback(); this.snapToStrictBounds('release');
  };
  private readonly onWindowPointerMove = (event: PointerEvent): void => { if (!this.isSceneEvent(event)) this.onPointerMove(event); };
  private readonly onWindowPointerRelease = (event: PointerEvent): void => { if (!this.isSceneEvent(event)) this.onPointerRelease(event); };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.destroyed || !this.isFiniteEventPoint(event) || !Number.isFinite(event.deltaY)) return;
    this.cancelAnimation();
    const focal = this.localPoint(event);
    const requestedScale = this.state.scale * Math.exp(-clampWheelDelta(this.normalizeWheelDelta(event)) * WHEEL_SCALE_COEFFICIENT);
    const crossedBound = requestedScale < this.minScale || requestedScale > this.maxScale;
    const renderedScale = crossedBound ? applyScaleResistance(requestedScale, this.minScale, this.maxScale) : requestedScale;
    if (this.shouldReduceMotion()) { this.commitFocalZoom(clampScale(requestedScale, this.minScale, this.maxScale), focal, VIEWPORT_PHASE.IDLE, 'wheel'); event.preventDefault(); return; }
    const target = this.focalState(this.state, focal, renderedScale);
    this.wheel = { stage: WHEEL_STAGE.SMOOTHING, transition: createWheelTransition(this.state, target, WHEEL_INPUT_DURATION_MS), latestFocal: focal, lastInputAt: performance.now(), startedAt: undefined, crossedBound };
    this.phase = VIEWPORT_PHASE.ANIMATING; this.scheduler.scheduleFrame(this.advanceWheel); event.preventDefault();
  };

  private zoomAtCenter(factor: number, reason: string): void {
    if (this.destroyed) return;
    this.cancelAnimation(); const viewport = this.getViewportSize(); const scale = clampScale(this.state.scale * factor, this.minScale, this.maxScale);
    this.setState(this.focalState(this.state, { x: viewport.width / 2, y: viewport.height / 2 }, scale), VIEWPORT_PHASE.IDLE, reason);
  }

  private snapToStrictBounds(reason: string): void {
    const target = this.strictState(this.state);
    const transition = createSnapBack(this.state, target, this.shouldReduceMotion());
    if (statesEqual(transition.from, transition.to) || transition.durationMs === 0) { this.setState(target, VIEWPORT_PHASE.IDLE, reason); return; }
    this.animation = { transition, startedAt: undefined, reason }; this.phase = VIEWPORT_PHASE.ANIMATING; this.scheduler.scheduleFrame(this.advanceAnimation);
  }
  private readonly advanceAnimation = (timestamp: number): void => {
    if (this.destroyed || this.animation === undefined) return;
    this.animation.startedAt ??= timestamp; const elapsed = timestamp - this.animation.startedAt; const completed = elapsed >= this.animation.transition.durationMs;
    this.setState(interpolate(this.animation.transition, elapsed), completed ? VIEWPORT_PHASE.IDLE : VIEWPORT_PHASE.ANIMATING, completed ? 'snap-complete' : this.animation.reason);
    if (completed) { this.animation = undefined; return; } this.scheduler.scheduleFrame(this.advanceAnimation);
  };
  private readonly advanceWheel = (timestamp: number): void => {
    const wheel = this.wheel; if (this.destroyed || wheel === undefined) return;
    if (wheel.stage === WHEEL_STAGE.WAITING) {
      if (timestamp - wheel.lastInputAt < WHEEL_SETTLE_DEBOUNCE_MS) { this.scheduler.scheduleFrame(this.advanceWheel); return; }
      const strictScale = clampScale(this.state.scale, this.minScale, this.maxScale);
      wheel.transition = createWheelTransition(this.state, this.focalState(this.state, wheel.latestFocal, strictScale), WHEEL_SETTLE_DURATION_MS); wheel.stage = WHEEL_STAGE.SETTLING; wheel.startedAt = timestamp;
    }
    wheel.startedAt ??= timestamp; const elapsed = timestamp - wheel.startedAt; const completed = elapsed >= wheel.transition.durationMs;
    const terminal = completed && (wheel.stage === WHEEL_STAGE.SETTLING || !wheel.crossedBound);
    this.setState(interpolate(wheel.transition, elapsed), terminal ? VIEWPORT_PHASE.IDLE : VIEWPORT_PHASE.ANIMATING, wheel.stage === WHEEL_STAGE.SMOOTHING ? 'wheel' : 'wheel-settle');
    if (!completed) { this.scheduler.scheduleFrame(this.advanceWheel); return; }
    if (wheel.stage === WHEEL_STAGE.SMOOTHING && wheel.crossedBound) { wheel.stage = WHEEL_STAGE.WAITING; wheel.startedAt = undefined; this.scheduler.scheduleFrame(this.advanceWheel); return; }
    this.wheel = undefined; this.phase = VIEWPORT_PHASE.IDLE;
  };

  private cancelAnimation(): void { this.animation = undefined; this.wheel = undefined; this.scheduler.cancelAll(); }
  private movePinch(event: PointerEvent): void {
    const first = this.pointers.get(this.pinch!.firstPointerId); const second = this.pointers.get(this.pinch!.secondPointerId); if (first === undefined || second === undefined) return;
    const distance = Math.hypot(second.x - first.x, second.y - first.y); if (distance <= 0 || !Number.isFinite(distance)) return;
    const center = this.toLocalPoint({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }); const scale = clampScale(this.pinch!.state.scale * distance / this.pinch!.distance, this.minScale, this.maxScale);
    const focalState = projectFocal(this.pinch!.state, this.pinch!.center, scale); const translated = { ...focalState, x: focalState.x + center.x - this.pinch!.center.x, y: focalState.y + center.y - this.pinch!.center.y };
    this.setState(applyBoundsResistance(translated, computeStrictBounds(this.getViewportSize(), this.getContentSize(), scale)), VIEWPORT_PHASE.PINCHING, 'pinch'); event.preventDefault();
  }
  private beginPinch(): void { const values = [...this.pointers.values()]; const [first, second] = values; if (first === undefined || second === undefined) return; const distance = Math.hypot(second.x - first.x, second.y - first.y); if (distance <= 0 || !Number.isFinite(distance)) return; this.pinch = { firstPointerId: first.pointerId, secondPointerId: second.pointerId, center: this.toLocalPoint({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }), distance, state: { ...this.state } }; }
  private setState(state: ViewportState, phase: ViewportPhase, reason: string): void { this.state = state; this.phase = phase; this.commit(reason); }
  private commit(reason: string): void { if (this.destroyed) return; this.revision += 1; this.scene.style.transformOrigin = '0 0'; this.scene.style.transform = `translate3d(${this.state.x}px, ${this.state.y}px, 0) scale(${this.state.scale})`; this.scene.style.setProperty('--viewport-inverse-scale', String(1 / this.state.scale)); const detail: ViewportEventDetail = { state: this.getState(), reason }; for (const subscriber of this.subscribers) subscriber(detail.state); this.scene.dispatchEvent(new CustomEvent<ViewportEventDetail>('viewport-change', { detail })); }
  private focalState(from: ViewportState, focal: ViewportPoint, scale: number): ViewportState { const focalState = projectFocal(from, focal, scale); return projectToStrictTranslation(focalState, computeStrictBounds(this.getViewportSize(), this.getContentSize(), scale)); }
  private strictState(state: ViewportState): ViewportState { const scale = clampScale(state.scale, this.minScale, this.maxScale); return projectToStrictBounds({ ...state, scale }, computeStrictBounds(this.getViewportSize(), this.getContentSize(), scale), this.minScale, this.maxScale); }
  private projectCurrentStrictly(): void { const strict = this.strictState(this.state); if (!statesEqual(strict, this.state)) this.setState(strict, VIEWPORT_PHASE.IDLE, 'interrupt'); }
  private commitFocalZoom(scale: number, focal: ViewportPoint, phase: ViewportPhase, reason: string): void { this.setState(this.focalState(this.state, focal, scale), phase, reason); }
  private getFitState(): ViewportState {
    const viewport = this.getViewportSize();
    const content = this.getContentSize();
    const fitScale = computeFit(viewport, content).scale;
    const scale = clampScale(this.config.startScale ?? fitScale, this.minScale, this.maxScale);
    return {
      x: (viewport.width - content.width * scale) / 2,
      y: (viewport.height - content.height * scale) / 2,
      scale,
    };
  }
  private getViewportSize(): { width: number; height: number } { const rect = this.viewport.getBoundingClientRect(); if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) throw new Error('Viewport dimensions must be finite and positive'); return { width: rect.width, height: rect.height }; }
  private localPoint(event: MouseEvent): ViewportPoint { return this.toLocalPoint({ x: event.clientX, y: event.clientY }); }
  private toPointer(event: PointerEvent): PointerSample { return { x: event.clientX, y: event.clientY, pointerId: event.pointerId }; }
  private toLocalPoint(point: ViewportPoint): ViewportPoint { const rect = this.viewport.getBoundingClientRect(); return { x: point.x - rect.left, y: point.y - rect.top }; }
  private isFiniteEventPoint(event: MouseEvent): boolean { return isFinitePoint({ x: event.clientX, y: event.clientY }); }
  private normalizeWheelDelta(event: WheelEvent): number { if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16; if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * this.getViewportSize().height; return event.deltaY; }
  private shouldReduceMotion(): boolean { return this.config.reducedMotion ?? isReducedMotion(); }
  private releasePointer(pointerId: number): void { try { this.scene.releasePointerCapture(pointerId); } catch { /* unavailable capture keeps release semantics */ } }
  private addWindowPointerFallback(): void { if (this.usingWindowPointerFallback) return; window.addEventListener('pointermove', this.onWindowPointerMove); window.addEventListener('pointerup', this.onWindowPointerRelease); window.addEventListener('pointercancel', this.onWindowPointerRelease); this.usingWindowPointerFallback = true; }
  private removeWindowPointerFallback(): void { if (!this.usingWindowPointerFallback) return; window.removeEventListener('pointermove', this.onWindowPointerMove); window.removeEventListener('pointerup', this.onWindowPointerRelease); window.removeEventListener('pointercancel', this.onWindowPointerRelease); this.usingWindowPointerFallback = false; }
  private isSceneEvent(event: Event): boolean { const target = event.target; return target instanceof Node && this.scene.contains(target); }
  private isInteractiveTarget(target: EventTarget | null): boolean { return target instanceof Element && target.closest('button, a, input, select, textarea, [contenteditable="true"], [role="button"]') !== null; }
  /**
   * The natural size of the transformed scene. Container-space mode (scene
   * fills the viewport) omits `content`, so the engine derives it from the live
   * viewport on every operation — always fresh across resizes.
   */
  private getContentSize(): ViewportSize { return this.config.content ?? this.getViewportSize(); }
  private assertConfig(): void { if (this.config.content !== undefined && (!Number.isFinite(this.config.content.width) || !Number.isFinite(this.config.content.height) || this.config.content.width <= 0 || this.config.content.height <= 0)) throw new Error('Content dimensions must be finite and positive'); clampScale(this.config.minScale, this.config.minScale, this.config.maxScale); }
  private emitError(message: string): void { this.scene.dispatchEvent(new CustomEvent('viewport-error', { detail: { message } })); }
}
