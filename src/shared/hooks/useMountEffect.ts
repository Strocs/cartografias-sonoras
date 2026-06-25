import { useEffect } from 'react';

/**
 * Runs an effect once on mount and cleans up on unmount.
 *
 * This is the only allowed direct use of `useEffect` in the codebase.
 * It is reserved for true one-time external system setup (DOM integration,
 * third-party widgets, browser API subscriptions) where no other React
 * primitive fits.
 */
export function useMountEffect(
  effect: () => void | (() => void)
): void {
  // Intentionally empty dependency array: this hook is reserved for one-time
  // external system setup on mount, not for reactive synchronization.
  useEffect(effect, []);
}
