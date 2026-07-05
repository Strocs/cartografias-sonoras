'use client';

import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { useEffect, useRef } from 'react';

import { relativeToPixel } from '@shared/lib/coordinates';
import { useMap } from '@shared/lib/viewport/MapContext';
import { useMountEffect } from '@shared/hooks/useMountEffect';

import type { PathStyleConfig, PathVisualState } from '../domain';
import type { Point } from '../domain/types';

import '../styles/path-styles.css';

export interface PathOverlayProps {
  pathStates: PathVisualState[];
}

const PULSE_DURATION = '1.5s';
const PULSE_RADIUS = '4';

function pointsToLatLngs(
  points: Point[],
  width: number,
  height: number
): LatLngExpression[] {
  return points.map((p) => {
    const pixel = relativeToPixel(p, width, height);
    return L.latLng(pixel.y, pixel.x);
  });
}

/** Applies per-path style overrides as inline SVG attributes on the <path>. */
function applyPathStyle(
  pathEl: SVGPathElement,
  style?: PathStyleConfig
): void {
  if (style === undefined) return;
  if (style.strokeColor !== undefined) {
    pathEl.setAttribute('stroke', style.strokeColor);
  }
  if (style.strokeWidth !== undefined) {
    pathEl.setAttribute('stroke-width', String(style.strokeWidth));
  }
  if (style.dashArray !== undefined) {
    pathEl.setAttribute('stroke-dasharray', style.dashArray);
  }
}

export function PathOverlay({ pathStates }: PathOverlayProps) {
  const { map, width, height } = useMap();

  const pathStatesRef = useRef(pathStates);
  pathStatesRef.current = pathStates;

  const mapRef = useRef<L.Map | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const pulseGroupsRef = useRef<SVGGElement[]>([]);

  function renderPaths() {
    const mapInstance = mapRef.current;
    if (mapInstance === null) return;

    for (const pl of polylinesRef.current) pl.remove();
    for (const pg of pulseGroupsRef.current) pg.remove();
    polylinesRef.current = [];
    pulseGroupsRef.current = [];

    const current = pathStatesRef.current;

    for (const state of current) {
      if (state.points.length < 2) continue;

      const latlngs = pointsToLatLngs(state.points, width, height);
      const routeId = `path-${state.pathId}`;

      const polyline = L.polyline(latlngs, {
        className: `path-base path-${state.variant}`,
      }).addTo(mapInstance);
      polylinesRef.current.push(polyline);

      const pathEl = polyline.getElement();
      if (pathEl instanceof SVGPathElement) {
        pathEl.setAttribute('id', routeId);
        pathEl.removeAttribute('stroke');
        pathEl.removeAttribute('stroke-opacity');
        pathEl.removeAttribute('stroke-width');
        pathEl.removeAttribute('fill');
        applyPathStyle(pathEl, state.style);
      }

      if (state.variant === 'single' && pathEl instanceof SVGPathElement) {
        const pulseGroup = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'g'
        );
        pulseGroup.setAttribute('class', 'path-pulse');
        pulseGroupsRef.current.push(pulseGroup);

        const circle = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle'
        );
        circle.setAttribute('r', PULSE_RADIUS);

        const animateMotion = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'animateMotion'
        );
        animateMotion.setAttribute('dur', PULSE_DURATION);
        animateMotion.setAttribute('repeatCount', 'indefinite');

        if (state.activeEndpoint === 'end') {
          animateMotion.setAttribute('keyPoints', '1;0');
          animateMotion.setAttribute('keyTimes', '0;1');
          animateMotion.setAttribute('calcMode', 'linear');
        }

        const mpath = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'mpath'
        );
        mpath.setAttribute('href', `#${routeId}`);

        animateMotion.appendChild(mpath);
        circle.appendChild(animateMotion);
        pulseGroup.appendChild(circle);

        if (state.style?.strokeColor !== undefined) {
          circle.setAttribute('fill', state.style.strokeColor);
        }

        const parent = pathEl.parentNode;
        if (parent !== null) {
          parent.appendChild(pulseGroup);
        }
      }
    }
  }

  useMountEffect(() => {
    if (map === null) return;

    const mapInstance = map;
    mapRef.current = mapInstance;

    mapInstance.whenReady(() => {
      if (mapRef.current !== mapInstance) return;
      renderPaths();
    });

    mapInstance.on('moveend zoomend', renderPaths);

    return () => {
      mapInstance.off('moveend zoomend', renderPaths);
      for (const pl of polylinesRef.current) pl.remove();
      for (const pg of pulseGroupsRef.current) pg.remove();
    };
  });

  useEffect(() => {
    if (mapRef.current !== null) {
      renderPaths();
    }
  }, [pathStates]);

  return null;
}
