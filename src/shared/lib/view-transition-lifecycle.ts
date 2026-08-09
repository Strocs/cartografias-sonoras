const resolvedTransition = Promise.resolve()

let activeTransitionFinished: Promise<void> = resolvedTransition
let installed = false

/** Installs the public Astro View Transition bridge once per document. */
export function installViewTransitionLifecycle(): void {
  if (installed) return
  installed = true

  document.addEventListener('astro:before-swap', (event) => {
    const transitionEvent = event as Event & {
      viewTransition?: { finished: Promise<void> }
    }
    activeTransitionFinished = transitionEvent.viewTransition?.finished ?? resolvedTransition
  })
}

/** Returns the transition captured for the current document navigation. */
export function getActiveViewTransitionFinished(): Promise<void> {
  return activeTransitionFinished
}
