export interface FrameSchedulerEnvironment {
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (handle: number) => void
}

export interface FrameScheduler {
  scheduleFrame: (callback: FrameRequestCallback) => void
  cancelAll: () => void
}

export function createFrameScheduler(environment: FrameSchedulerEnvironment = window): FrameScheduler {
  let pendingFrame: number | undefined
  let epoch = 0

  const cancelAll = (): void => {
    epoch += 1
    if (pendingFrame !== undefined) {
      environment.cancelAnimationFrame(pendingFrame)
      pendingFrame = undefined
    }
  }

  const scheduleFrame = (callback: FrameRequestCallback): void => {
    cancelAll()
    const callbackEpoch = epoch
    pendingFrame = environment.requestAnimationFrame((timestamp) => {
      if (callbackEpoch !== epoch) return
      pendingFrame = undefined
      callback(timestamp)
    })
  }

  return { scheduleFrame, cancelAll }
}
