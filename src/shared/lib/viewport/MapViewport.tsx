'use client';

import L from 'leaflet';
import { useCallback, useImperativeHandle, useRef, useState } from 'react';

import 'leaflet/dist/leaflet.css';

import type { MapViewportConfig, MapViewportRef } from './types';

export interface MapViewportProps {
  imageUrl: string;
  width: number;
  height: number;
  config?: MapViewportConfig;
  className?: string;
  ref?: React.Ref<MapViewportRef>;
}

export function MapViewport({
  imageUrl,
  width,
  height,
  config,
  className,
  ref,
}: MapViewportProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  const initContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null || mapRef.current !== null) {
        return;
      }

      const bounds: L.LatLngBoundsExpression = [
        [0, 0],
        [height, width],
      ];

      const map = L.map(node, {
        crs: L.CRS.Simple,
        minZoom: config?.minZoom ?? -2,
        maxZoom: config?.maxZoom ?? 4,
        zoomControl: config?.zoomControl ?? false,
        attributionControl: config?.attributionControl ?? false,
      });

      map.createPane('pathPane');
      map.getPane('pathPane')?.style.setProperty('z-index', '350');

      L.imageOverlay(imageUrl, bounds).addTo(map);
      map.fitBounds(bounds);

      mapRef.current = map;
      setIsReady(true);

      return () => {
        map.remove();
        mapRef.current = null;
      };
    },
    [
      imageUrl,
      width,
      height,
      config?.minZoom,
      config?.maxZoom,
      config?.zoomControl,
      config?.attributionControl,
    ]
  );

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    panTo: (x, y) => {
      mapRef.current?.panTo([y, x]);
    },
    setZoom: (zoom) => {
      mapRef.current?.setZoom(zoom);
    },
    fitBounds: () => {
      if (mapRef.current === null) {
        return;
      }
      const bounds: L.LatLngBoundsExpression = [
        [0, 0],
        [height, width],
      ];
      mapRef.current.fitBounds(bounds);
    },
  }));

  return (
    <div
      ref={initContainer}
      className={className}
      data-testid="map-viewport"
      data-ready={isReady}
    />
  );
}
