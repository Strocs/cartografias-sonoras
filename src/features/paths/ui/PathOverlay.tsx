'use client';

import L from 'leaflet';

import { useMap } from '@shared/lib/viewport/MapContext';
import { useMountEffect } from '@shared/hooks/useMountEffect';

import type { Path } from '../domain/types';

export interface PathOverlayProps {
  paths: Path[];
}

const STROKE_COLOR = '#1a2a3a';
const STROKE_OPACITY = 0.35;
const STROKE_WIDTH = 2;
const STROKE_DASHARRAY = '6 6';

export function PathOverlay({ paths }: PathOverlayProps) {
  const { map } = useMap();

  useMountEffect(() => {
    if (map === null) {
      return;
    }

    const mapInstance = map;
    const pane = mapInstance.getPane('pathPane');
    if (pane === undefined) {
      return;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'leaflet-zoom-animated');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute(
      'style',
      'position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible;'
    );

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(group);

    function renderPaths() {
      while (group.firstChild !== null) {
        group.removeChild(group.firstChild);
      }

      for (const path of paths) {
        if (path.points.length < 2) {
          continue;
        }

        const d = buildSmoothPath(path.points, mapInstance);
        const pathEl = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        );
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke', STROKE_COLOR);
        pathEl.setAttribute('stroke-opacity', String(STROKE_OPACITY));
        pathEl.setAttribute('stroke-width', String(STROKE_WIDTH));
        pathEl.setAttribute('stroke-dasharray', STROKE_DASHARRAY);
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        group.appendChild(pathEl);
      }
    }

    renderPaths();
    mapInstance.on('moveend zoomend', renderPaths);
    pane.appendChild(svg);

    return () => {
      mapInstance.off('moveend zoomend', renderPaths);
      svg.remove();
    };
  });

  return null;
}

function buildSmoothPath(
  points: Array<{ x: number; y: number }>,
  map: L.Map
): string {
  const layerPoints = points.map((p) =>
    map.latLngToLayerPoint(L.latLng(p.y, p.x))
  );

  if (layerPoints.length < 2) {
    return '';
  }

  const commands: Array<string> = [
    `M ${layerPoints[0].x} ${layerPoints[0].y}`,
  ];

  for (let i = 0; i < layerPoints.length - 1; i++) {
    const current = layerPoints[i];
    const next = layerPoints[i + 1];
    const prev = i > 0 ? layerPoints[i - 1] : current;
    const after = i + 2 < layerPoints.length ? layerPoints[i + 2] : next;

    const cp1 = L.point(
      current.x + (next.x - prev.x) * 0.2,
      current.y + (next.y - prev.y) * 0.2
    );
    const cp2 = L.point(
      next.x - (after.x - current.x) * 0.2,
      next.y - (after.y - current.y) * 0.2
    );

    commands.push(`C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${next.x} ${next.y}`);
  }

  return commands.join(' ');
}
