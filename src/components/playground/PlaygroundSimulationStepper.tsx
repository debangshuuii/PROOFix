'use client';

import React from 'react';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { PLAYGROUND_SIMULATION_STAGES } from '@/lib/playground/constants';

interface PlaygroundSimulationStepperProps {
  currentStageIndex: number;
  failedStageIndex?: number;
  isComplete: boolean;
  className?: string;
}

export function PlaygroundSimulationStepper({
  currentStageIndex,
  failedStageIndex = 4, // Default failure stage
  isComplete,
  className = '',
}: PlaygroundSimulationStepperProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
        <span>Verification Pipeline Progress</span>
        <span>
          Stage {Math.min(currentStageIndex + 1, PLAYGROUND_SIMULATION_STAGES.length)} of{' '}
          {PLAYGROUND_SIMULATION_STAGES.length}
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            currentStageIndex >= failedStageIndex && !isComplete
              ? 'bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500'
              : 'bg-gradient-to-r from-sky-500 to-indigo-500'
          }`}
          style={{
            width: `${Math.min(
              100,
              ((currentStageIndex + 1) / PLAYGROUND_SIMULATION_STAGES.length) * 100
            )}%`,
          }}
        />
      </div>

      {/* Stages List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {PLAYGROUND_SIMULATION_STAGES.map((stageName, idx) => {
          let status: 'completed' | 'running' | 'failed' | 'pending' = 'pending';

          if (idx < currentStageIndex) {
            status = idx === failedStageIndex ? 'failed' : 'completed';
          } else if (idx === currentStageIndex) {
            status = idx === failedStageIndex ? 'failed' : 'running';
          }

          return (
            <div
              key={stageName}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                status === 'running'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 font-semibold shadow-sm'
                  : status === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                  : status === 'completed'
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-transparent border-transparent text-slate-600'
              }`}
            >
              {status === 'running' && (
                <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />
              )}
              {status === 'completed' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              {status === 'failed' && (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              {status === 'pending' && (
                <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <span className="truncate">{stageName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
