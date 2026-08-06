import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { renderPaths, clearPaths } from '../../src/features/paths/ui/pathRenderer';

import type { PathVisualState } from '../../src/features/paths/domain/PathVisualState';

function createSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

describe('renderPaths', () => {
  let svg: SVGSVGElement;

  beforeEach(() => {
    svg = createSvg();
  });

  afterEach(() => {
    svg.remove();
  });

  it('creates a path element with geometry from buildPolylineD', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 }
        ],
        variant: 'idle'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const path = svg.querySelector('path[data-path-id="1"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBe('M 0 0 L 200 100');
  });

  it('applies vector-effect="non-scaling-stroke" to every path', () => {
    const states: PathVisualState[] = [
      {
        pathId: 2,
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 }
        ],
        variant: 'idle'
      }
    ];

    renderPaths(states, svg, 100, 100);

    const path = svg.querySelector('path[data-path-id="2"]');
    expect(path?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('applies legacy and BEM CSS classes for each variant', () => {
    const states: PathVisualState[] = [
      { pathId: 1, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], variant: 'idle' },
      {
        pathId: 2,
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
        variant: 'single',
        activeEndpoint: 'start'
      },
      { pathId: 3, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], variant: 'both' }
    ];

    renderPaths(states, svg, 100, 100);

    const idle = svg.querySelector('path[data-path-id="1"]');
    const single = svg.querySelector('path[data-path-id="2"]');
    const both = svg.querySelector('path[data-path-id="3"]');

    expect(idle?.classList.contains('path-idle')).toBe(true);
    expect(idle?.classList.contains('path--idle')).toBe(true);

    expect(single?.classList.contains('path-single')).toBe(true);
    expect(single?.classList.contains('path--single')).toBe(true);

    expect(both?.classList.contains('path-both')).toBe(true);
    expect(both?.classList.contains('path--both')).toBe(true);
  });

  it('reuses existing path elements instead of recreating them', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'idle'
      }
    ];

    renderPaths(states, svg, 200, 100);
    const first = svg.querySelector('path[data-path-id="1"]');

    renderPaths(states, svg, 200, 100);
    const second = svg.querySelector('path[data-path-id="1"]');

    expect(first).toBe(second);
    expect(svg.querySelectorAll('path[data-path-id="1"]').length).toBe(1);
  });

  it('removes path elements that are no longer in the visual state list', () => {
    renderPaths(
      [{ pathId: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], variant: 'idle' }],
      svg,
      200,
      100
    );

    renderPaths([], svg, 200, 100);

    expect(svg.querySelectorAll('path[data-path-id]').length).toBe(0);
  });

  it('creates a pulse animation for the single variant', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const pulseGroup = svg.querySelector('.path-pulse');
    expect(pulseGroup).not.toBeNull();

    const animateMotion = svg.querySelector('animateMotion');
    expect(animateMotion).not.toBeNull();
    expect(animateMotion?.getAttribute('repeatCount')).toBe('indefinite');
  });

  it('reverses pulse direction when activeEndpoint is "end"', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'end'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const animateMotion = svg.querySelector('animateMotion');
    expect(animateMotion?.getAttribute('keyPoints')).toBe('1;0');
  });

  it('gives the path a real id that matches the animateMotion reference', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const path = svg.querySelector('path[data-path-id="1"]');
    expect(path?.getAttribute('id')).toBe('path-1');

    const mpath = svg.querySelector('mpath');
    expect(mpath?.getAttribute('href')).toBe('#path-1');
  });

  it('renders multiple staggered particles for the single variant', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const particles = svg.querySelectorAll('.path-pulse circle');
    expect(particles.length).toBeGreaterThanOrEqual(2);

    const begins = Array.from(
      svg.querySelectorAll('.path-pulse circle animateMotion')
    ).map((motion) => motion.getAttribute('begin'));
    const uniqueBegins = new Set(begins);
    expect(uniqueBegins.size).toBe(particles.length);
  });

  it('travels start->end for activeEndpoint "start" and end->start for "end"', () => {
    const startStates: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];
    const endStates: PathVisualState[] = [
      {
        pathId: 2,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'end'
      }
    ];

    renderPaths([...startStates, ...endStates], svg, 200, 100);

    const startMotions = svg.querySelectorAll(
      '.path-pulse circle animateMotion'
    );
    const endMotion = Array.from(startMotions).find((motion) =>
      motion
        .closest('g')
        ?.querySelector('mpath')
        ?.getAttribute('href')
        ?.includes('path-2')
    );
    const startMotion = Array.from(startMotions).find((motion) =>
      motion
        .closest('g')
        ?.querySelector('mpath')
        ?.getAttribute('href')
        ?.includes('path-1')
    );

    expect(startMotion?.getAttribute('keyPoints')).toBeNull();
    expect(endMotion?.getAttribute('keyPoints')).toBe('1;0');
  });

  it('renders no travelling particles for the "both" variant', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'both'
      }
    ];

    renderPaths(states, svg, 200, 100);

    expect(svg.querySelector('.path-pulse')).toBeNull();
    expect(svg.querySelectorAll('.path-pulse circle').length).toBe(0);
    expect(svg.querySelector('path[data-path-id="1"]')).not.toBeNull();
  });

  it('uses the full polyline geometry including waypoint breaks for motion', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 20 },
          { x: 100, y: 100 }
        ],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];

    renderPaths(states, svg, 200, 100);

    const path = svg.querySelector('path[data-path-id="1"]');
    expect(path?.getAttribute('d')).toBe('M 0 0 L 100 20 L 200 100');

    const mpath = svg.querySelector('mpath');
    expect(mpath?.getAttribute('href')).toBe(`#${path?.getAttribute('id')}`);
    expect(svg.querySelectorAll('path[id="path-1"]').length).toBe(1);
  });

  it('does not render paths with fewer than two points', () => {
    const states: PathVisualState[] = [
      { pathId: 1, points: [{ x: 50, y: 50 }], variant: 'idle' }
    ];

    renderPaths(states, svg, 100, 100);

    expect(svg.querySelector('path[data-path-id="1"]')).toBeNull();
  });

  it('applies explicit style overrides when provided', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'idle',
        style: {
          strokeColor: '#ff0000',
          strokeWidth: 5,
          dashArray: '4 2'
        }
      }
    ];

    renderPaths(states, svg, 200, 100);

    const path = svg.querySelector('path[data-path-id="1"]');
    expect(path?.getAttribute('stroke')).toBe('#ff0000');
    expect(path?.getAttribute('stroke-width')).toBe('5');
    expect(path?.getAttribute('stroke-dasharray')).toBe('4 2');
  });
});

describe('clearPaths', () => {
  let svg: SVGSVGElement;

  beforeEach(() => {
    svg = createSvg();
  });

  afterEach(() => {
    svg.remove();
  });

  it('removes all paths and pulse groups', () => {
    const states: PathVisualState[] = [
      {
        pathId: 1,
        points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
        variant: 'single',
        activeEndpoint: 'start'
      }
    ];

    renderPaths(states, svg, 200, 100);
    clearPaths(svg);

    expect(svg.querySelectorAll('path').length).toBe(0);
    expect(svg.querySelectorAll('.path-pulse').length).toBe(0);
  });
});
