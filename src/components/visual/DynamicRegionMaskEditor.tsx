'use client';

import React, { useState } from 'react';
import { MaskRegion } from '@/lib/types/visual-regression';
import { ShieldCheck, Plus, Trash2, Eye, EyeOff, Sparkles, Layers } from 'lucide-react';

export interface DynamicRegionMaskEditorProps {
  projectId: string;
  route?: string;
  masks: MaskRegion[];
  onAddMask: (mask: Omit<MaskRegion, 'id'>) => Promise<void>;
  onDeleteMask: (maskId: string) => Promise<void>;
  className?: string;
}

export const DynamicRegionMaskEditor: React.FC<DynamicRegionMaskEditorProps> = ({
  projectId,
  route,
  masks,
  onAddMask,
  onDeleteMask,
  className = '',
}) => {
  const [showMasks, setShowMasks] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newMaskName, setNewMaskName] = useState<string>('');
  const [newMaskPreset, setNewMaskPreset] = useState<'timestamp' | 'banner' | 'counter'>('timestamp');

  const handleCreatePreset = async (presetType: 'timestamp' | 'banner' | 'counter') => {
    let preset: Omit<MaskRegion, 'id'>;

    if (presetType === 'timestamp') {
      preset = {
        name: 'Live Header Clock / Timestamp',
        route,
        x: 75,
        y: 2,
        width: 23,
        height: 6,
        unit: 'percent',
        comment: 'Excludes live clock or dynamic date renderers',
      };
    } else if (presetType === 'banner') {
      preset = {
        name: 'Rotating Promotional Banner',
        route,
        x: 10,
        y: 12,
        width: 80,
        height: 15,
        unit: 'percent',
        comment: 'Excludes dynamic marketing carousel',
      };
    } else {
      preset = {
        name: 'Dynamic Session Counter',
        route,
        x: 40,
        y: 45,
        width: 20,
        height: 10,
        unit: 'percent',
        comment: 'Excludes live incrementing test counter',
      };
    }

    await onAddMask(preset);
  };

  return (
    <div className={`flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800 p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white tracking-wide">
              Dynamic Region Masks ({masks.length})
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exclude approved non-deterministic areas (e.g. timestamps, carousels) from visual regression checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMasks((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showMasks
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {showMasks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showMasks ? 'Masks Visible' : 'Masks Hidden'}
          </button>
        </div>
      </div>

      {/* Preset Quick Add Bar */}
      <div className="flex flex-wrap items-center gap-2 my-4">
        <span className="text-xs text-slate-400">Add Mask Preset:</span>
        <button
          type="button"
          onClick={() => handleCreatePreset('timestamp')}
          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3 text-amber-400" /> Timestamp (Top-Right)
        </button>
        <button
          type="button"
          onClick={() => handleCreatePreset('banner')}
          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3 text-amber-400" /> Rotating Banner
        </button>
        <button
          type="button"
          onClick={() => handleCreatePreset('counter')}
          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3 text-amber-400" /> Counter Area
        </button>
      </div>

      {/* Active Masks List */}
      {masks.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
          No dynamic region masks configured for this route. Add a preset above to exclude volatile regions.
        </div>
      ) : (
        <div className="space-y-2">
          {masks.map((mask) => (
            <div
              key={mask.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <div>
                  <div className="font-semibold text-slate-200">{mask.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    x:{mask.x}{mask.unit === 'percent' ? '%' : 'px'}, y:{mask.y}{mask.unit === 'percent' ? '%' : 'px'} &bull; {mask.width}x{mask.height} {mask.unit}
                    {mask.comment && ` &mdash; ${mask.comment}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteMask(mask.id)}
                title="Delete Mask"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
