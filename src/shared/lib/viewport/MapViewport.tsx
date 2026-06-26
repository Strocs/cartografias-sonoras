'use client';

import L from 'leaflet';
import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import 'leaflet/dist/leaflet.css';

import { cn } from '@shared/utils/cn';

import type { MapViewportConfig, MapViewportRef } from './types';
import { MapContext } from './MapContext';

export interface MapViewportProps {
  imageUrl: string;
  width: number;
  height: number;
  config?: MapViewportConfig;
  className?: string;
  ref?: React.Ref<MapViewportRef>;
  children?: ReactNode;
}

export function MapViewport({
  imageUrl,
  width,
  height,
  config,
  className,
  ref,
  children,
}: MapViewportProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapState, setMapState] = useState<L.Map | null>(null);
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

      const container = node;
      function updateZoomAttribute() {
        container.setAttribute('data-zoom', String(map.getZoom()));
      }
      map.on('zoomend', updateZoomAttribute);
      updateZoomAttribute();

      mapRef.current = map;
      setMapState(map);
      setIsReady(true);

      return () => {
        map.off('zoomend', updateZoomAttribute);
        map.remove();
        mapRef.current = null;
        setMapState(null);
        setIsReady(false);
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
    <MapContext.Provider value={{ map: mapState, ready: isReady }}>
      <div className={cn('relative size-full', className)}>
        <div
          ref={initContainer}
          className="size-full"
          data-testid="map-viewport"
          data-ready={isReady}
          data-zoom="0"
        />
        {isReady && children}
      </div>
    </MapContext.Provider>
  );
}
