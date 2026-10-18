'use client';

import React from 'react';
import { VisualDiffStatistics } from '@/lib/types/visual-regression';
import { ShieldAlert, CheckCircle2, AlertCircle, Info, Sliders } from 'lucide-react';

export interface VisualDiffStatsCardProps {
  stats: VisualDiffStatistics;
  className?: string;
}

export const VisualDiffStatsCard: React.FC<VisualDiffStatsCardProps> = ({
  stats,
  className = '',
}) => {
  const getBadgeStyle = () => {
    switch (stats.classification) {
      case 'visual_match':
        return {
          bg: 'bg-emerald-950/40 border-emerald-800 text-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case 'minor_visual_difference':
        return {
          bg: 'bg-amber-950/40 border-amber-800 text-amber-300',
          icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
        };
      case 'significant_visual_difference':
        return {
          bg: 'bg-indigo-950/40 border-indigo-800 text-indigo-300',
          icon: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-300',
          icon: <Info className="w-4 h-4 text-slate-400" />,
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className={`flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800 p-5 ${className}`}>
      {/* Title & Classification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Image Difference Metrics
          </span>
          <h3 className="text-base font-bold text-white mt-0.5">
            Pixel Variance Telemetry
          </h3>
        </div>

        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${badge.bg}`}>
          {badge.icon}
          <span>{stats.label}</span>
        </div>
      </div>

      {/* Grid of Telemetry Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Changed Pixels
          </span>
          <div className="text-xl font-mono font-bold text-sky-400 mt-1">
            {stats.changedPixels.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            of {stats.totalPixels.toLocaleString()} px
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Difference Ratio
          </span>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {stats.differencePercentage}%
          </div>
          <span className="text-[10px] text-slate-400">
            area variance
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Threshold
          </span>
          <div className="text-xl font-mono font-bold text-indigo-400 mt-1">
            {stats.threshold.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-400">
            tolerance parameter
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Masked Exclusions
          </span>
          <div className="text-xl font-mono font-bold text-amber-400 mt-1">
            {stats.maskedPixelsExcluded.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">
            pixels bypassed
          </span>
        </div>
      </div>

      {/* Required Developer Semantic Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            Visual Difference Evaluation (Not Confirmed Bugs)
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {stats.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};
