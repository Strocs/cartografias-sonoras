import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFrameScheduler } from '../../src/features/maps/lib/viewport/scheduler';

describe('frame scheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('cancels a stale pending frame before scheduling its replacement', () => {
    const requestAnimationFrame = vi.fn(() => 7);
    const cancelAnimationFrame = vi.fn();
    const scheduler = createFrameScheduler({ requestAnimationFrame, cancelAnimationFrame });
    const first = vi.fn();
    const second = vi.fn();

    scheduler.scheduleFrame(first);
    scheduler.scheduleFrame(second);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('epoch-guards a callback that runs after cancellation', () => {
    let frame: FrameRequestCallback | undefined;
    const scheduler = createFrameScheduler({
      requestAnimationFrame: (callback) => {
        frame = callback;
        return 1;
      },
      cancelAnimationFrame: vi.fn(),
    });
    const callback = vi.fn();

    scheduler.scheduleFrame(callback);
    scheduler.cancelAll();
    frame?.(100);

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels its pending frame during teardown', () => {
    const cancelAnimationFrame = vi.fn();
    const scheduler = createFrameScheduler({ requestAnimationFrame: () => 12, cancelAnimationFrame });

    scheduler.scheduleFrame(vi.fn());
    scheduler.cancelAll();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(12);
  });
});
