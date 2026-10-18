'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { MIN_ZOOM, MAX_ZOOM } from './useZoomPan';

export interface ZoomPanToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onSetZoom: (level: number) => void;
  isPanning?: boolean;
  className?: string;
}

export const ZoomPanToolbar: React.FC<ZoomPanToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onSetZoom,
  isPanning = false,
  className = '',
}) => {
  const zoomPercentages = [1.0, 1.5, 2.0, 3.0];

  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-lg ${className}`}
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM}
        title="Zoom Out"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <span className="font-mono text-xs font-bold text-sky-400 px-1 min-w-[42px] text-center">
        {Math.round(zoom * 100)}%
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM}
        title="Zoom In"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-slate-800 mx-1" />

      {/* Preset Buttons */}
      <div className="hidden sm:flex items-center gap-1">
        {zoomPercentages.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onSetZoom(lvl)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              zoom === lvl
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {lvl}x
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-slate-800 mx-1" />

      <button
        type="button"
        onClick={onReset}
        title="Reset Zoom & Pan (100%)"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {zoom > 1.0 && (
        <span className="ml-1 text-[10px] font-mono text-slate-400 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
          <Move className="w-3 h-3 text-sky-400" />
          Drag to Pan
        </span>
      )}
    </div>
  );
};
