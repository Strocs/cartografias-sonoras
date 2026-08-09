import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getActiveViewTransitionFinished,
  installViewTransitionLifecycle
} from '../../src/shared/lib/view-transition-lifecycle'

describe('view-transition lifecycle bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('installs once, captures the public finished promise, and falls back when absent', async () => {
    const addEventListener = vi.spyOn(document, 'addEventListener')

    installViewTransitionLifecycle()
    installViewTransitionLifecycle()

    expect(addEventListener).toHaveBeenCalledTimes(1)
    const listener = addEventListener.mock.calls[0]?.[1] as ((event: Event) => void) | undefined
    expect(listener).toBeTypeOf('function')

    const finished = Promise.resolve()
    listener?.(new CustomEvent('astro:before-swap', { detail: undefined }) as unknown as Event)
    listener?.({
      viewTransition: { finished }
    } as unknown as Event)
    expect(getActiveViewTransitionFinished()).toBe(finished)

    listener?.(new Event('astro:before-swap'))
    await expect(getActiveViewTransitionFinished()).resolves.toBeUndefined()
  })
})
