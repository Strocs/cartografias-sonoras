import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { renderPaths, clearPaths } from '../../src/features/paths/ui/pathRenderer'

import { DEFAULT_CORNER_RADIUS } from '../../src/features/paths/lib/pathEngine'

import type { PathVisualState } from '../../src/features/paths/domain/PathVisualState'

function createSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
}

function twoPointState(overrides: Partial<PathVisualState> = {}): PathVisualState {
  return {
    pathId: 1,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    ],
    variant: 'idle',
    ...overrides
  }
}

describe('renderPaths', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    svg = createSvg()
  })

  afterEach(() => {
    svg.remove()
  })

  it('creates a path element with rounded geometry', () => {
    const state: PathVisualState = {
      pathId: 1,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ],
      variant: 'idle'
    }

    renderPaths([state], svg, 100, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path).not.toBeNull()
    const cornerRadius = DEFAULT_CORNER_RADIUS
    expect(path?.getAttribute('d')).toBe(`M 0 0 L ${100 - cornerRadius} 0 Q 100 0 100 ${cornerRadius} L 100 100`)
  })

  it('applies vector-effect="non-scaling-stroke" to every path', () => {
    renderPaths([twoPointState()], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
  })

  it('applies legacy and BEM CSS classes for each variant', () => {
    const states: PathVisualState[] = [
      twoPointState({ pathId: 1 }),
      twoPointState({ pathId: 2, variant: 'single', activeEndpoint: 'start' }),
      twoPointState({ pathId: 3, variant: 'both' })
    ]

    renderPaths(states, svg, 100, 100)

    const idle = svg.querySelector('path[data-path-id="1"]')
    const single = svg.querySelector('path[data-path-id="2"]')
    const both = svg.querySelector('path[data-path-id="3"]')

    expect(idle?.classList.contains('path-idle')).toBe(true)
    expect(idle?.classList.contains('path--idle')).toBe(true)

    expect(single?.classList.contains('path-single')).toBe(true)
    expect(single?.classList.contains('path--single')).toBe(true)

    expect(both?.classList.contains('path-both')).toBe(true)
    expect(both?.classList.contains('path--both')).toBe(true)
  })

  it('reuses existing path elements instead of recreating them', () => {
    renderPaths([twoPointState()], svg, 200, 100)
    const first = svg.querySelector('path[data-path-id="1"]')

    renderPaths([twoPointState()], svg, 200, 100)
    const second = svg.querySelector('path[data-path-id="1"]')

    expect(first).toBe(second)
    expect(svg.querySelectorAll('path[data-path-id="1"]').length).toBe(1)
  })

  it('removes path elements that are no longer in the visual state list', () => {
    renderPaths([twoPointState()], svg, 200, 100)
    renderPaths([], svg, 200, 100)

    expect(svg.querySelectorAll('path[data-path-id]').length).toBe(0)
  })

  it('does not render paths with fewer than two points', () => {
    renderPaths([twoPointState({ points: [{ x: 50, y: 50 }] })], svg, 100, 100)

    expect(svg.querySelector('path[data-path-id="1"]')).toBeNull()
  })

  it('sets the 14/8 dash pattern at any scale', () => {
    const state = twoPointState({ variant: 'single', activeEndpoint: 'start' })

    renderPaths([state], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('stroke-dasharray')).toBe('14 8')
    expect(path?.style.getPropertyValue('--path-dash-period')).toBe('22px')
  })

  it('keeps the dash pattern stable across repeated renders', () => {
    const state = twoPointState({ variant: 'single', activeEndpoint: 'start' })
    const path = () => svg.querySelector('path[data-path-id="1"]')

    renderPaths([state], svg, 200, 100)
    renderPaths([state], svg, 200, 100)
    renderPaths([state], svg, 200, 100)

    expect(path()?.getAttribute('stroke-dasharray')).toBe('14 8')
    expect(path()?.style.getPropertyValue('--path-dash-period')).toBe('22px')
  })

  it('marks the dash direction forward when the start endpoint is playing', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'start' })], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('data-path-direction')).toBe('forward')
  })

  it('marks the dash direction backward when the end endpoint is playing', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'end' })], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('data-path-direction')).toBe('backward')
  })

  it('keeps the direction attribute when the path leaves the single state', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'start' })], svg, 200, 100)
    renderPaths([twoPointState({ variant: 'both' })], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('data-path-direction')).toBe('forward')
  })

  it('keeps the backward direction attribute across single → idle → both', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'end' })], svg, 200, 100)
    renderPaths([twoPointState({ variant: 'idle' })], svg, 200, 100)
    renderPaths([twoPointState({ variant: 'both' })], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('data-path-direction')).toBe('backward')
  })

  it('preserves the direction and dash pattern across single → both → single', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'start' })], svg, 200, 100)
    const path = () => svg.querySelector('path[data-path-id="1"]')

    expect(path()?.getAttribute('data-path-direction')).toBe('forward')
    expect(path()?.getAttribute('stroke-dasharray')).toBe('14 8')
    expect(path()?.style.getPropertyValue('--path-dash-period')).toBe('22px')

    renderPaths([twoPointState({ variant: 'both' })], svg, 200, 100)
    expect(path()?.getAttribute('data-path-direction')).toBe('forward')
    expect(path()?.getAttribute('stroke-dasharray')).toBe('14 8')
    expect(path()?.style.getPropertyValue('--path-dash-period')).toBe('22px')

    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'start' })], svg, 200, 100)
    expect(path()?.getAttribute('data-path-direction')).toBe('forward')
    expect(path()?.getAttribute('stroke-dasharray')).toBe('14 8')
    expect(path()?.style.getPropertyValue('--path-dash-period')).toBe('22px')
  })

  it('defaults the direction attribute to forward when first rendered outside single', () => {
    renderPaths([twoPointState({ variant: 'both' })], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('data-path-direction')).toBe('forward')
  })

  it('renders no pulse circles or animateMotion nodes for the single variant', () => {
    renderPaths([twoPointState({ variant: 'single', activeEndpoint: 'start' })], svg, 200, 100)

    expect(svg.querySelectorAll('.path-pulse').length).toBe(0)
    expect(svg.querySelectorAll('circle').length).toBe(0)
    expect(svg.querySelectorAll('animateMotion').length).toBe(0)
    expect(svg.querySelectorAll('mpath').length).toBe(0)
  })

  it('leaves the both variant static: same dashes, direction defaults to forward', () => {
    const state: PathVisualState = {
      pathId: 1,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ],
      variant: 'both'
    }

    renderPaths([state], svg, 100, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path).not.toBeNull()
    expect(path?.getAttribute('data-path-direction')).toBe('forward')
    expect(svg.querySelectorAll('.path-pulse').length).toBe(0)
  })

  it('uses the same rounded geometry for every variant (no route jump)', () => {
    const roundedPoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 }
    ]

    renderPaths(
      [
        { pathId: 1, points: roundedPoints, variant: 'idle' },
        { pathId: 2, points: roundedPoints, variant: 'single', activeEndpoint: 'start' },
        { pathId: 3, points: roundedPoints, variant: 'both' }
      ],
      svg,
      100,
      100
    )

    const shapes = new Set(
      Array.from(svg.querySelectorAll('path[data-path-id]')).map((pathEl) => pathEl.getAttribute('d'))
    )
    expect(shapes.size).toBe(1)
    expect(shapes.values().next().value).toBe(
      `M 0 0 L ${100 - DEFAULT_CORNER_RADIUS} 0 Q 100 0 100 ${DEFAULT_CORNER_RADIUS} L 100 100`
    )
  })

  it('applies explicit style overrides when provided', () => {
    const state = twoPointState({
      variant: 'idle',
      style: {
        strokeColor: '#ff0000',
        strokeWidth: 5,
        dashArray: '4 2'
      }
    })

    renderPaths([state], svg, 200, 100)

    const path = svg.querySelector('path[data-path-id="1"]')
    expect(path?.getAttribute('stroke')).toBe('#ff0000')
    expect(path?.getAttribute('stroke-width')).toBe('5')
    expect(path?.getAttribute('stroke-dasharray')).toBe('4 2')
    expect(path?.style.getPropertyValue('--path-dash-period')).toBe('6px')
  })
})

describe('clearPaths', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    svg = createSvg()
  })

  afterEach(() => {
    svg.remove()
  })

  it('removes all paths', () => {
    const states: PathVisualState[] = [twoPointState({ variant: 'single', activeEndpoint: 'start' })]

    renderPaths(states, svg, 200, 100)
    clearPaths(svg)

    expect(svg.querySelectorAll('path').length).toBe(0)
  })
})
