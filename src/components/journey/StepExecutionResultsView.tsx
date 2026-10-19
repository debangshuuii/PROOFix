'use client';

import React, { useState } from 'react';
import {
  JourneyRunResult,
  StepExecutionResult,
  StepExecutionStatus,
} from '@/lib/types/journey';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MinusCircle,
  Loader2,
  Camera,
  Eye,
  ChevronDown,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

interface StepExecutionResultsViewProps {
  runResult: JourneyRunResult;
  onViewScreenshot?: (path: string) => void;
}

export function StepExecutionResultsView({
  runResult,
  onViewScreenshot,
}: StepExecutionResultsViewProps) {
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (stepId: string) => {
    setExpandedStepIds((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const getStatusBadge = (status: StepExecutionStatus) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" /> Passed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/60 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
          </span>
        );
      case 'timeout':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-800/60">
            <AlertTriangle className="w-3.5 h-3.5" /> Timeout
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <MinusCircle className="w-3.5 h-3.5" /> Skipped
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-500 border border-slate-800">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">{runResult.journeyTitle}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Run ID: <span className="font-mono text-slate-300">{runResult.runId}</span> • Duration: {(runResult.durationMs / 1000).toFixed(2)}s
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-3">
              <span className="text-emerald-400 font-semibold">{runResult.passedSteps} Passed</span>
              <span className="text-slate-600">|</span>
              <span className={runResult.failedSteps > 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                {runResult.failedSteps} Failed
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{runResult.skippedSteps} Skipped</span>
            </div>
            {getStatusBadge(runResult.status as StepExecutionStatus)}
          </div>
        </div>

        {runResult.errorSummary && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            <strong>Run Stopped on Failure:</strong> {runResult.errorSummary}
          </div>
        )}
      </div>

      {/* Per-Step Result Cards */}
      <div className="space-y-2.5">
        {runResult.stepResults.map((step) => {
          const isExpanded = expandedStepIds[step.stepId] ?? (step.status === 'failed' || step.status === 'timeout');
          const isFailed = step.status === 'failed' || step.status === 'timeout';

          return (
            <div
              key={step.stepId}
              className={`rounded-xl border transition-all ${
                isFailed
                  ? 'bg-rose-950/20 border-rose-800/80 shadow-md'
                  : step.status === 'passed'
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/60 opacity-80'
              }`}
            >
              {/* Step Summary Bar */}
              <div
                onClick={() => toggleExpand(step.stepId)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-xs font-mono font-bold text-slate-500 text-center">
                    {step.order}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{step.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {step.action}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      {step.status === 'skipped' ? (
                        <span>Skipped because an earlier step failed</span>
                      ) : (
                        <span>Duration: {step.durationMs}ms</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(step.status)}
                  <button className="text-slate-500 hover:text-slate-300">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Step Expanded Details & Error Context */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 text-xs space-y-3">
                  {/* Detailed Error Context */}
                  {step.error && (
                    <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Execution Error Details</span>
                      </div>
                      <p className="font-mono text-[11px] whitespace-pre-wrap">{step.error}</p>
                    </div>
                  )}

                  {/* Assertion Comparison Context */}
                  {(step.expectedResult || step.observedResult) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {step.expectedResult && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                            Expected
                          </span>
                          <span className="text-slate-200 font-mono text-[11px]">{step.expectedResult}</span>
                        </div>
                      )}
                      {step.observedResult && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                            Observed Result
                          </span>
                          <span className="text-slate-200 font-mono text-[11px]">{step.observedResult}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step Screenshot Attachment */}
                  {step.screenshotPath && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Camera className="w-3.5 h-3.5 text-pink-400" />
                          Step Screenshot
                        </span>
                        {onViewScreenshot && (
                          <button
                            onClick={() => onViewScreenshot(step.screenshotPath!)}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3 h-3" /> Inspect Full Size
                          </button>
                        )}
                      </div>
                      <div
                        onClick={() => onViewScreenshot && onViewScreenshot(step.screenshotPath!)}
                        className="cursor-pointer group relative max-w-sm aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800"
                      >
                        <img
                          src={step.screenshotPath}
                          alt={step.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
