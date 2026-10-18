'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight, Eye, ShieldAlert } from 'lucide-react';

export interface VisualDiffSliderProps {
  baselineUrl: string;
  targetUrl: string;
  diffOverlayUrl?: string;
  baselineLabel?: string;
  targetLabel?: string;
  initialPosition?: number; // 0 to 100
  className?: string;
  onPositionChange?: (position: number) => void;
  aspectRatio?: string;
}

/**
 * Calculates clamped slider percentage (0 to 100) from an event clientX and container DOM rect.
 */
export function calculateSliderPercentage(
  clientX: number,
  containerRect: { left: number; width: number }
): number {
  if (containerRect.width <= 0) return 50;
  const offsetX = clientX - containerRect.left;
  const percentage = (offsetX / containerRect.width) * 100;
  return Math.max(0, Math.min(100, Number(percentage.toFixed(2))));
}

export const VisualDiffSlider: React.FC<VisualDiffSliderProps> = ({
  baselineUrl,
  targetUrl,
  diffOverlayUrl,
  baselineLabel = 'Baseline (Before)',
  targetLabel = 'Current Run (After)',
  initialPosition = 50,
  className = '',
  onPositionChange,
  aspectRatio = '16/9',
}) => {
  const [sliderPos, setSliderPos] = useState<number>(initialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showDiffGlow, setShowDiffGlow] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = calculateSliderPercentage(clientX, rect);
      setSliderPos(newPos);
      if (onPositionChange) onPositionChange(newPos);
    },
    [onPositionChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        setIsDragging(true);
        updatePosition(e.touches[0].clientX);
      }
    },
    [updatePosition]
  );

  // Global mousemove/mouseup listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updatePosition]);

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -2;
    else if (e.key === 'ArrowRight') delta = 2;
    else if (e.key === 'Home') delta = -sliderPos;
    else if (e.key === 'End') delta = 100 - sliderPos;

    if (delta !== 0) {
      e.preventDefault();
      const nextPos = Math.max(0, Math.min(100, sliderPos + delta));
      setSliderPos(nextPos);
      if (onPositionChange) onPositionChange(nextPos);
    }
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      {/* Slider Viewport Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuenow={sliderPos}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Before and after visual comparison slider"
        className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        style={{ aspectRatio }}
      >
        {/* Under layer: Target / Current (Right side) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={targetUrl}
            alt={targetLabel}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Top layer: Baseline (Left side), clipped to slider position */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
        >
          <img
            src={baselineUrl}
            alt={baselineLabel}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Optional Diff Highlight Glow Overlay */}
        {showDiffGlow && diffOverlayUrl && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-70"
            style={{
              clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
            }}
          >
            <img
              src={diffOverlayUrl}
              alt="Pixel difference highlight"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/90 text-sky-400 border border-sky-500/30 backdrop-blur-md shadow-lg">
            {baselineLabel}
          </span>
        </div>

        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-md shadow-lg">
            {targetLabel}
          </span>
        </div>

        {/* Draggable Divider Line & Handle */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Vertical Glowing Line */}
          <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />

          {/* Central Handle Pill */}
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border-2 border-sky-400 text-sky-400 shadow-xl shadow-sky-500/30 transition-transform active:scale-95 pointer-events-auto">
            <ChevronsLeftRight className="w-5 h-5 animate-pulse" />
          </div>

          {/* Position Tooltip readout */}
          <div className="absolute bottom-3 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-slate-300 pointer-events-none whitespace-nowrap shadow-md">
            {Math.round(sliderPos)}%
          </div>
        </div>
      </div>

      {/* Auxiliary Controls Below Slider */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-3 px-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Divider:</span>
          <button
            type="button"
            onClick={() => setSliderPos(0)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono hover:text-slate-200 transition-colors"
          >
            0% (After)
          </button>
          <button
            type="button"
            onClick={() => setSliderPos(50)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono hover:text-slate-200 transition-colors"
          >
            50% (Split)
          </button>
          <button
            type="button"
            onClick={() => setSliderPos(100)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono hover:text-slate-200 transition-colors"
          >
            100% (Before)
          </button>
        </div>

        {diffOverlayUrl && (
          <button
            type="button"
            onClick={() => setShowDiffGlow((prev) => !prev)}
            className={`px-2.5 py-1 rounded border text-[11px] flex items-center gap-1.5 transition-colors ${
              showDiffGlow
                ? 'bg-rose-950/40 border-rose-600 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Highlight Diff Pixels
          </button>
        )}
      </div>
    </div>
  );
};
