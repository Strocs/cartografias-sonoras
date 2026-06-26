'use client';

import { useRef } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';

import { useMountEffect } from './useMountEffect';

/**
 * Smooths a discrete value that updates at low frequency by linearly
 * interpolating it at 60fps using the wall clock.
 *
 * Useful for values like `currentTime` from audio/video playback, where
 * the store updates at ~4Hz but the UI needs to appear fluid.
 *
 * @param value - Current authoritative value (updates at low frequency).
 *                When it changes, the interpolation base resets to it.
 * @param max - Maximum expected value. The result never exceeds this.
 * @param isActive - When `false`, interpolation stops and the MotionValue
 *                   holds at `value`. Pass `false` when the underlying
 *                   process is not actively progressing (e.g., paused).
 *
 * @returns A Framer Motion `MotionValue<number>` that updates every
 *          `requestAnimationFrame` frame. Does not trigger React re-renders.
 *
 * @example
 * ```tsx
 * function AudioProgress({ currentTime, duration, isPlaying }) {
 *   const smoothTime = useSmoothTimedValue(currentTime, duration, isPlaying);
 *   const progress = useTransform(smoothTime, (t) =>
 *     duration > 0 ? (t / duration) * 100 : 0
 *   );
 *   return <motion.div style={{ width: progress }} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // SVG ring dashoffset:
 * const smoothTime = useSmoothTimedValue(currentTime, duration, isPlaying);
 * const dashoffset = useTransform(smoothTime, (t) => {
 *   const pct = duration > 0 ? (t / duration) * 100 : 0;
 *   return circumference - (pct / 100) * circumference;
 * });
 * <motion.circle style={{ strokeDashoffset: dashoffset }} />
 * ```
 */
export function useSmoothTimedValue(
  value: number,
  max: number,
  isActive: boolean
): MotionValue<number> {
  const mv = useMotionValue(value);

  // Ref para detectar cambios del store en tiempo de render.
  const prevStoreValueRef = useRef(value);
  // Ref para detectar transiciones active/inactive.
  const prevActiveRef = useRef(isActive);
  // Base de interpolación: último valor autoritativo + timestamp de pared.
  const baseRef = useRef({ time: value, wall: performance.now() });

  // Refs para que el rAF lea los valores más recientes sin closures
  // (se actualizan en CADA render, antes de cualquier lectura del rAF).
  const maxRef = useRef(max);
  const isActiveRef = useRef(isActive);

  // ── Sincronización en tiempo de render (sin effects) ────────────
  // Corre en cada render. Detecta si el store empujó un valor nuevo
  // o si cambió el estado activo. En ambos casos, resetea la base de
  // la interpolación al valor autoritativo actual.
  maxRef.current = max;
  isActiveRef.current = isActive;

  if (value !== prevStoreValueRef.current || isActive !== prevActiveRef.current) {
    prevStoreValueRef.current = value;
    prevActiveRef.current = isActive;

    if (isActive) {
      baseRef.current = { time: value, wall: performance.now() };
    }
  }
  // ────────────────────────────────────────────────────────────────

  // rAF loop: arranca al montar, corre hasta desmontar.
  // Usa refs para leer los valores más recientes sin depender
  // del closure ni causar re-renders.
  useMountEffect(() => {
    let rafId: number;

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      if (!isActiveRef.current) {
        // Cuando no está activo, aseguramos que el MotionValue
        // tenga el último valor conocido del store (por si
        // alguien lo lee estando pausado).
        mv.set(prevStoreValueRef.current);
        return;
      }

      const { time, wall } = baseRef.current;
      const elapsedMs = performance.now() - wall;
      const estimated = Math.min(time + elapsedMs / 1000, maxRef.current);

      mv.set(estimated);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  return mv;
}
