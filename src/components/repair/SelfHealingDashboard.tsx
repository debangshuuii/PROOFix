'use client';

import React, { useState } from 'react';
import {
  SelfHealingSession,
  SelfHealingMode,
} from '@/lib/types/self-healing';
import {
  Sparkles,
  ShieldCheck,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  FileCode,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface SelfHealingDashboardProps {
  session?: SelfHealingSession;
  onApproveAndPublish?: () => Promise<void>;
  onReject?: () => void;
}

export function SelfHealingDashboard({
  session,
  onApproveAndPublish,
  onReject,
}: SelfHealingDashboardProps) {
  const [selectedIteration, setSelectedIteration] = useState<number>(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Default benchmark session for rich presentation
  const currentSession: SelfHealingSession = session || {
    id: 'heal_sess_demo_01',
    runId: 'run_sample_100',
    projectId: 'proj_sample_01',
    failureId: 'fail_null_deref',
    status: 'completed',
    currentIteration: 1,
    maxIterations: 3,
    config: {
      enabled: true,
      mode: 'semi_autonomous',
      maxIterations: 3,
      minConfidenceScore: 75,
      allowedFileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      protectedFilePatterns: ['.env*'],
      requireGreenRegressionSuite: true,
      createDraftPullRequest: true,
      targetBranchPrefix: 'proofix/heal-',
      githubTokenEnvVar: 'GITHUB_TOKEN',
    },
    iterations: [
      {
        iterationNumber: 1,
        proposalId: 'prop_92_opt_chain',
        diffSummary: 'Add defensive optional chaining (?.) on line 42 to prevent uncaught null/undefined dereferencing.',
        verificationStatus: 'passed',
        verificationDurationMs: 1420,
        failingChecksResolved: ['Checkout Flow Verification'],
        newFailuresIntroduced: [],
        diagnostics: 'Patch successfully verified: "Checkout Flow Verification" passed and all 6 regression checks passed.',
        timestamp: new Date().toISOString(),
      },
    ],
    gitBranch: 'proofix/heal-run_sample_100-optchain',
    pullRequestUrl: 'https://github.com/debangshuuii/PROOFix/pull/42',
    pullRequestNumber: 42,
    finalOutcome: 'verified_fix',
    logs: [
      'Provisioned ephemeral sandbox workspace at data/workspaces/heal_sess_demo_01',
      'Synthesized failure context: TypeError: Cannot read properties of undefined',
      'Generated surgical patch with 92% confidence score',
      'Applied patch atomically with zero merge conflicts',
      'Reran Playwright verification: target check passed in 1.42s',
      'Adjacent regression checks: 6/6 passed cleanly',
      'Autonomous fix verified successfully!',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const activeRecord =
    currentSession.iterations.find((i) => i.iterationNumber === selectedIteration) ||
    currentSession.iterations[currentSession.iterations.length - 1];

  const handleApprove = async () => {
    setIsPublishing(true);
    try {
      if (onApproveAndPublish) {
        await onApproveAndPublish();
      }
      setApprovalStatus('approved');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRejectClick = () => {
    setApprovalStatus('rejected');
    if (onReject) onReject();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-bold text-2xl ${
              currentSession.finalOutcome === 'verified_fix'
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            }`}
          >
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                Autonomous Self-Healing & Verified PR Loop
              </h2>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Fix Proved
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl">
              Surgically repairs failing browser checks in an isolated sandbox, proves the fix with zero regressions, and prepares an authorized pull request.
            </p>
          </div>
        </div>

        {/* PR Link Banner */}
        {currentSession.pullRequestUrl && (
          <a
            href={currentSession.pullRequestUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition"
          >
            <GitPullRequest className="w-4 h-4" />
            View PR #{currentSession.pullRequestNumber || 42} on GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* 5-Stage Pipeline Tracker */}
      <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
          Self-Healing Execution Pipeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1. Context
            </div>
            <span className="text-[11px] text-neutral-400">Stack & DOM parsed</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 2. Patch Gen
            </div>
            <span className="text-[11px] text-neutral-400">Surgical diff formed</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 3. Sandboxing
            </div>
            <span className="text-[11px] text-neutral-400">Isolated workspace</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 4. Prover
            </div>
            <span className="text-[11px] text-neutral-400">0 regressions verified</span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5" /> 5. Pull Request
            </div>
            <span className="text-[11px] text-neutral-400">Branch & PR created</span>
          </div>
        </div>
      </div>

      {/* Iteration Timeline & Patch Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Iteration history */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Iteration Timeline ({currentSession.iterations.length} / {currentSession.maxIterations})
          </h3>
          <div className="space-y-2">
            {currentSession.iterations.map((iter) => (
              <div
                key={iter.iterationNumber}
                onClick={() => setSelectedIteration(iter.iterationNumber)}
                className={`p-3 rounded-lg border cursor-pointer transition text-xs ${
                  selectedIteration === iter.iterationNumber
                    ? 'border-indigo-500/50 bg-indigo-950/20'
                    : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-neutral-200">Iteration #{iter.iterationNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      iter.verificationStatus === 'passed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : iter.verificationStatus === 'regression'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {iter.verificationStatus}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2">{iter.diffSummary}</p>
                <div className="mt-2 text-[10px] text-neutral-500 flex items-center justify-between">
                  <span>Duration: {iter.verificationDurationMs}ms</span>
                  <span>Resolved: {iter.failingChecksResolved.length}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mode Badge & Controls */}
          <div className="pt-4 border-t border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Operating Mode:</span>
              <span className="font-semibold text-neutral-200 capitalize">
                {currentSession.config.mode.replace(/_/g, ' ')}
              </span>
            </div>

            {approvalStatus === 'pending' ? (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={isPublishing}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Approve Fix
                </button>
                <button
                  onClick={handleRejectClick}
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
                >
                  Reject
                </button>
              </div>
            ) : approvalStatus === 'approved' ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Patch Approved & Published
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Patch Rejected
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Patch Diff & Diagnostics */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              Verified Surgical Patch Diff (Iteration #{activeRecord?.iterationNumber || 1})
            </h3>
            <div className="p-3 rounded-lg bg-neutral-950 font-mono text-xs overflow-x-auto border border-neutral-800/80 text-neutral-300 space-y-0.5">
              <div className="text-neutral-500">--- a/src/app/checkout/page.tsx</div>
              <div className="text-neutral-500">+++ b/src/app/checkout/page.tsx</div>
              <div className="text-cyan-400">@@ -40,4 +40,4 @@</div>
              <div className="text-neutral-400">   const handleCheckout = () =&gt; &#123;</div>
              <div className="text-rose-400 bg-rose-950/30 px-1 rounded">-    const total = user.cart.calculateTotal();</div>
              <div className="text-emerald-400 bg-emerald-950/30 px-1 rounded">+    const total = user?.cart?.calculateTotal() ?? 0;</div>
              <div className="text-neutral-400">     setAmount(total);</div>
            </div>
          </div>

          {/* Sandbox Telemetry Log */}
          <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 font-mono text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2 font-sans">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Prover Execution Telemetry
            </h3>
            <div className="space-y-1 text-slate-300 max-h-48 overflow-y-auto">
              {currentSession.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
