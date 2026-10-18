'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface PanOffset {
  x: number;
  y: number;
}

export interface ZoomPanState {
  zoom: number; // e.g. 1.0 to 5.0
  pan: PanOffset;
  isPanning: boolean;
}

export const MIN_ZOOM = 1.0;
export const MAX_ZOOM = 5.0;
export const ZOOM_STEP = 0.5;

/**
 * Calculates pan offset clamped within image boundaries according to zoom level.
 */
export function clampPanOffset(
  offset: PanOffset,
  zoom: number,
  containerWidth: number = 800,
  containerHeight: number = 450
): PanOffset {
  if (zoom <= 1.0) {
    return { x: 0, y: 0 };
  }

  // Maximum allowed pan distance is half the overflow dimension
  const maxPanX = ((zoom - 1) * containerWidth) / (2 * zoom);
  const maxPanY = ((zoom - 1) * containerHeight) / (2 * zoom);

  const clampedX = Math.max(-maxPanX, Math.min(maxPanX, offset.x));
  const clampedY = Math.max(-maxPanY, Math.min(maxPanY, offset.y));

  return {
    x: Number(clampedX.toFixed(2)),
    y: Number(clampedY.toFixed(2)),
  };
}

/**
 * Builds CSS transform string that preserves synchronous alignment across baseline and target layers.
 */
export function getSynchronizedTransform(zoom: number, pan: PanOffset): string {
  return `scale(${zoom.toFixed(2)}) translate(${pan.x.toFixed(2)}px, ${pan.y.toFixed(2)}px)`;
}

export function useZoomPan(initialZoom = 1.0) {
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; initialPan: PanOffset } | null>(null);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(1))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(1)));
      if (next <= 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    setZoom(clamped);
    if (clamped <= 1.0) setPan({ x: 0, y: 0 });
  }, []);

  const resetZoomPan = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, []);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      if (zoom > 1.0) {
        setIsPanning(true);
        panStartRef.current = {
          clientX,
          clientY,
          initialPan: { ...pan },
        };
      }
    },
    [zoom, pan]
  );

  const updatePan = useCallback(
    (clientX: number, clientY: number, containerWidth?: number, containerHeight?: number) => {
      if (!isPanning || !panStartRef.current || zoom <= 1.0) return;

      const deltaX = (clientX - panStartRef.current.clientX) / zoom;
      const deltaY = (clientY - panStartRef.current.clientY) / zoom;

      const rawOffset: PanOffset = {
        x: panStartRef.current.initialPan.x + deltaX,
        y: panStartRef.current.initialPan.y + deltaY,
      };

      const clamped = clampPanOffset(rawOffset, zoom, containerWidth || 800, containerHeight || 450);
      setPan(clamped);
    },
    [isPanning, zoom]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const transform = getSynchronizedTransform(zoom, pan);

  return {
    zoom,
    pan,
    isPanning,
    transform,
    zoomIn,
    zoomOut,
    setZoomLevel,
    resetZoomPan,
    startPan,
    updatePan,
    endPan,
  };
}
