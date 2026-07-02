'use client';

import { useRef, type RefObject } from 'react';

import { useMountEffect } from '@shared/hooks/useMountEffect';

export interface UseSmoothProgressRingOptions {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  circleRef: RefObject<SVGCircleElement | null>;
  circumference: number;
}

export interface UseSmoothProgressRingResult {
  /** Raw progress (0-1) derived from the last known `currentTime`. */
  progress: number;
  /** Smoothed progress (0-1) as of the most recent animation frame. */
  displayProgress: number;
}

/**
 * Smooths a low-frequency `currentTime` value (e.g. audio store updates) to a
 * 60fps progress ring by writing `strokeDashoffset` directly to an SVG circle
 * ref on every `requestAnimationFrame` tick.
 *
 * Unlike the previous Framer Motion solution, this hook does not create a
 * MotionValue and does not rely on React re-rendering every frame. The DOM
 * update happens inside the rAF loop while React only re-renders when the
 * store emits a new `currentTime`.
 */
export function useSmoothProgressRing({
  currentTime,
  duration,
  isPlaying,
  circleRef,
  circumference
}: UseSmoothProgressRingOptions): UseSmoothProgressRingResult {
  // Live values read by the rAF loop without closing over render state.
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const circumferenceRef = useRef(circumference);

  // Last authoritative store value and play state, used to detect changes.
  const prevCurrentTimeRef = useRef(currentTime);
  const prevIsPlayingRef = useRef(isPlaying);

  // Interpolation base: the last store time plus the wall-clock timestamp at
  // which it was recorded. Reset whenever the store pushes a new currentTime
  // or when the play/pause state changes.
  const baseRef = useRef({ time: currentTime, wall: performance.now() });

  // Most recent smoothed progress, exposed for consumers/tests.
  const displayProgressRef = useRef(
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  );

  // Sync refs with the latest props on every render (store updates are low
  // frequency, so this is cheap). Detect authoritative changes and reset the
  // interpolation base so the rAF loop snaps or continues smoothly from the
  // correct point.
  durationRef.current = duration;
  isPlayingRef.current = isPlaying;
  circumferenceRef.current = circumference;

  if (
    currentTime !== prevCurrentTimeRef.current ||
    isPlaying !== prevIsPlayingRef.current
  ) {
    prevCurrentTimeRef.current = currentTime;
    prevIsPlayingRef.current = isPlaying;
    baseRef.current = { time: currentTime, wall: performance.now() };
  }

  useMountEffect(() => {
    let rafId: number;

    const writeRing = (progress: number) => {
      displayProgressRef.current = progress;

      const circle = circleRef.current;
      if (circle === null) {
        return;
      }

      const offset = circumferenceRef.current * (1 - progress);
      circle.style.strokeDashoffset = String(offset);
    };

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      if (!isPlayingRef.current) {
        // When paused, keep the ring at the last authoritative store value
        // so it does not drift.
        writeRing(
          durationRef.current > 0
            ? Math.min(1, Math.max(0, prevCurrentTimeRef.current / durationRef.current))
            : 0
        );
        return;
      }

      const { time, wall } = baseRef.current;
      const elapsedSeconds = (performance.now() - wall) / 1000;
      const estimatedTime = Math.min(time + elapsedSeconds, durationRef.current);
      const progress =
        durationRef.current > 0
          ? Math.min(1, Math.max(0, estimatedTime / durationRef.current))
          : 0;

      writeRing(progress);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  const rawProgress =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return {
    progress: rawProgress,
    displayProgress: displayProgressRef.current
  };
}
