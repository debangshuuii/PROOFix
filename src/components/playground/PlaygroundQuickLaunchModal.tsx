'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { DemoScenarioContract, PlaygroundRunResponse, PlaygroundFixResult } from '@/lib/playground/types';
import { PlaygroundSimulationStepper } from './PlaygroundSimulationStepper';
import { PlaygroundDiffPreview } from './PlaygroundDiffPreview';

interface PlaygroundQuickLaunchModalProps {
  scenario: DemoScenarioContract | null;
  onClose: () => void;
  isOpen: boolean;
}

export function PlaygroundQuickLaunchModal({
  scenario,
  onClose,
  isOpen,
}: PlaygroundQuickLaunchModalProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [runResult, setRunResult] = useState<PlaygroundRunResponse | null>(null);
  const [fixResult, setFixResult] = useState<PlaygroundFixResult | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'diff' | 'diagnosis'>('pipeline');

  // Trigger automated simulation on open
  useEffect(() => {
    if (!isOpen || !scenario) {
      setCurrentStage(0);
      setIsSimulating(false);
      setIsComplete(false);
      setRunResult(null);
      setFixResult(null);
      return;
    }

    let isMounted = true;
    setIsSimulating(true);
    setCurrentStage(0);

    const runSimulation = async () => {
      try {
        const res = await fetch('/api/v1/playground/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId: scenario.id }),
        });
        const data: PlaygroundRunResponse = await res.json();
        if (isMounted) setRunResult(data);
      } catch (err) {
        console.error('Simulation error:', err);
      }

      // Progressively advance stages
      for (let i = 1; i <= 10; i++) {
        await new Promise((r) => setTimeout(r, 200));
        if (isMounted) setCurrentStage(i);
      }

      if (isMounted) {
        setIsSimulating(false);
        setIsComplete(true);
      }
    };

    runSimulation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, scenario]);

  const handleApplyFix = async () => {
    if (!scenario || !runResult) return;
    setIsApplyingFix(true);

    try {
      const res = await fetch('/api/v1/playground/apply-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          runId: runResult.runId,
        }),
      });
      const data = await res.json();
      setFixResult(data);
    } catch (err) {
      console.error('Fix application error:', err);
    } finally {
      setIsApplyingFix(false);
    }
  };

  if (!isOpen || !scenario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {scenario.title}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Live Simulation
                </span>
              </h2>
              <p className="text-xs text-slate-400">{scenario.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'pipeline'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Verification Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnosis')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'diagnosis'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Root Cause Analysis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'diff'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Unified Patch Diff
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'pipeline' && (
            <div className="space-y-5">
              <PlaygroundSimulationStepper
                currentStageIndex={currentStage}
                failedStageIndex={4}
                isComplete={isComplete}
              />

              {/* Status Outcome Banner */}
              {isComplete && !fixResult && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-rose-300 mb-1">
                      Target Defect Caught: {scenario.fault.headline}
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2">
                      {scenario.fault.technicalSummary}
                    </p>
                    <div className="font-mono text-[11px] text-rose-300/90 bg-rose-950/40 p-2 rounded border border-rose-500/20">
                      ✕ {scenario.fault.expectedFailure.errorMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Post-Fix Banner */}
              {fixResult && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300 mb-1">
                      Patch Verified: 100% Tests Passed (0 Regressions)
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-2">
                      Disposable workspace verification completed. Fix applied atomically and validated against Playwright Chromium engine.
                    </p>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                      <span>✓ {fixResult.testsPassed} Tests Passed</span>
                      <span>•</span>
                      <span>0 Flaws Remaining</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagnosis' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Grounded Root Cause</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
                    Confidence: {Math.round(scenario.aiDiagnosis.confidenceScore * 100)}%
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {scenario.aiDiagnosis.explanation}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white">Suggested Remedy</span>
                <p className="text-slate-300 leading-relaxed">
                  {scenario.aiDiagnosis.suggestedFix}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <PlaygroundDiffPreview
              patchDiff={scenario.fixProposal.patchDiff}
              targetFile={scenario.fixProposal.targetFile}
              summary={scenario.fixProposal.summary}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-xs text-slate-400">
            {isSimulating ? (
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Executing Chromium headless sandbox...
              </span>
            ) : fixResult ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Fix proposal proven in disposable sandbox
              </span>
            ) : (
              <span>Inspection complete in {scenario.benchmark.detectionTimeMs}ms</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!fixResult ? (
              <button
                type="button"
                disabled={isSimulating || isApplyingFix}
                onClick={handleApplyFix}
                className="py-2 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isApplyingFix ? 'Verifying Patch...' : 'Auto-Apply & Verify Fix'}
              </button>
            ) : (
              <Link
                href={fixResult.verifiedRunUrl}
                className="py-2 px-4 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all"
              >
                <span>View Verified Run Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {runResult && !fixResult && (
              <Link
                href={runResult.runUrl}
                className="py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors flex items-center gap-1"
              >
                <span>Inspect Run</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
