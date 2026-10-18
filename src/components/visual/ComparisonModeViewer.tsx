'use client';

import React, { useState } from 'react';
import { VisualDiffSlider } from './VisualDiffSlider';
import { ScreenshotPair, VisualDiffResult } from '@/lib/types/visual-regression';
import {
  Columns2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react';

export type ComparisonViewMode = 'slider' | 'side-by-side' | 'overlay';

export interface ComparisonModeViewerProps {
  pair: ScreenshotPair;
  diffResult?: VisualDiffResult | null;
  initialMode?: ComparisonViewMode;
  className?: string;
  aspectRatio?: string;
}

/**
 * Calculates onion skin opacity blend values for overlay comparison.
 */
export function calculateOverlayOpacity(sliderValue: number): {
  baselineOpacity: number;
  targetOpacity: number;
} {
  const clamped = Math.max(0, Math.min(100, sliderValue));
  const targetOpacity = Number((clamped / 100).toFixed(2));
  const baselineOpacity = Number((1 - targetOpacity).toFixed(2));
  return { baselineOpacity, targetOpacity };
}

export const ComparisonModeViewer: React.FC<ComparisonModeViewerProps> = ({
  pair,
  diffResult,
  initialMode = 'slider',
  className = '',
  aspectRatio = '16/9',
}) => {
  const [viewMode, setViewMode] = useState<ComparisonViewMode>(initialMode);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(50); // 0 = baseline, 100 = target
  const [blendMode, setBlendMode] = useState<'normal' | 'difference' | 'exclusion'>('normal');

  const baselineUrl = pair.baseline?.filePath || '/artifacts/placeholder_baseline.png';
  const targetUrl = pair.target?.filePath || '/artifacts/placeholder_target.png';
  const diffUrl = diffResult?.diffImagePath;

  const { baselineOpacity, targetOpacity } = calculateOverlayOpacity(overlayOpacity);

  return (
    <div className={`flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800 p-5 ${className}`}>
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white tracking-wide">
              {pair.route}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {pair.baseline?.browser || 'chromium'} &bull; {pair.baseline?.viewport.width}x{pair.baseline?.viewport.height}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inspecting matched screenshot pair across runs.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'slider'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Slider
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            Side-by-Side
          </button>

          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'overlay'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Onion Skin Overlay
          </button>
        </div>
      </div>

      {/* MODE 1: Interactive Before/After Slider */}
      {viewMode === 'slider' && (
        <VisualDiffSlider
          baselineUrl={baselineUrl}
          targetUrl={targetUrl}
          diffOverlayUrl={diffUrl}
          aspectRatio={aspectRatio}
        />
      )}

      {/* MODE 2: Synchronized Side-by-Side Inspection */}
      {viewMode === 'side-by-side' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Column */}
            <div className="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Baseline (Before)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {pair.baseline?.runId}
                </span>
              </div>
              <div className="relative overflow-hidden bg-slate-950" style={{ aspectRatio }}>
                <img
                  src={baselineUrl}
                  alt="Baseline screenshot"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Target Column */}
            <div className="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Current Run (After)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {pair.target?.runId}
                </span>
              </div>
              <div className="relative overflow-hidden bg-slate-950" style={{ aspectRatio }}>
                <img
                  src={targetUrl}
                  alt="Target screenshot"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Side-by-side mode displays corresponding viewports concurrently for direct peripheral comparison.
            </span>
          </div>
        </div>
      )}

      {/* MODE 3: Onion Skin Transparent Overlay Mode */}
      {viewMode === 'overlay' && (
        <div className="space-y-4">
          <div
            className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl"
            style={{ aspectRatio }}
          >
            {/* Baseline layer */}
            <div className="absolute inset-0 w-full h-full">
              <img
                src={baselineUrl}
                alt="Baseline layer"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Target layer with variable opacity and CSS blend mode */}
            <div
              className="absolute inset-0 w-full h-full transition-opacity duration-75"
              style={{
                opacity: targetOpacity,
                mixBlendMode: blendMode,
              }}
            >
              <img
                src={targetUrl}
                alt="Target overlay layer"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Difference highlight layer if blend is active */}
            {diffUrl && blendMode === 'difference' && (
              <div className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-50">
                <img src={diffUrl} alt="Diff highlight" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Floating Info Pill */}
            <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900/90 text-white border border-slate-700 backdrop-blur-md">
                Target Opacity: {overlayOpacity}%
              </span>
            </div>
          </div>

          {/* Overlay Opacity Slider Bar & Blend Mode Controls */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-sky-400 font-semibold shrink-0">Baseline (0%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-800 accent-sky-400 cursor-pointer"
              />
              <span className="text-xs text-amber-400 font-semibold shrink-0">Target (100%)</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Blend:</span>
              {(['normal', 'difference', 'exclusion'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBlendMode(mode)}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] font-mono transition-colors ${
                    blendMode === mode
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
