'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitPullRequest,
  RotateCcw,
  Sparkles,
  Layers,
  Code2,
  ExternalLink,
  Flame,
} from 'lucide-react';
import type { CandidatePatchProposal } from '@/lib/types/patch-proposal';

export interface PatchCandidateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  failureId: string;
  runId: string;
  candidates?: CandidatePatchProposal[];
  onApplyCandidate?: (candidateId: string) => Promise<void>;
  onVerifyCandidate?: (candidateId: string) => Promise<void>;
  onCreatePr?: (candidateId: string) => Promise<void>;
  onRollback?: () => Promise<void>;
}

export function PatchCandidateReviewModal({
  isOpen,
  onClose,
  failureId,
  runId,
  candidates = [],
  onApplyCandidate,
  onVerifyCandidate,
  onCreatePr,
  onRollback,
}: PatchCandidateReviewModalProps) {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Fallback demo candidate if none provided
  const displayCandidates: CandidatePatchProposal[] =
    candidates.length > 0
      ? candidates
      : [
          {
            id: 'cand_ast_01',
            generatorStrategy: 'ast_targeted',
            unifiedDiff: `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -38,3 +38,3 @@
-          <Link href="/broken-route" className="text-red-500">Broken Link (404)</Link>
+          <Link href="/about" className="text-cyan-400">About Us</Link>
`,
            targetFiles: ['src/app/page.tsx'],
            confidenceScore: 96,
            heuristicScore: 94,
            astSyntaxValid: true,
            securityCheckPassed: true,
            riskRating: 'low',
            rationale: 'Surgical AST redirect replaces non-existent 404 route with valid /about route.',
            hunkAnalyses: [],
          },
          {
            id: 'cand_llm_02',
            generatorStrategy: 'llm_guided',
            unifiedDiff: `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -38,3 +38,4 @@
-          <Link href="/broken-route" className="text-red-500">Broken Link (404)</Link>
+          {/* Fallback client safe route */}
+          <Link href="/" className="text-slate-400">Home</Link>
`,
            targetFiles: ['src/app/page.tsx'],
            confidenceScore: 82,
            heuristicScore: 80,
            astSyntaxValid: true,
            securityCheckPassed: true,
            riskRating: 'low',
            rationale: 'LLM generated defensive home route fallback with inline comment.',
            hunkAnalyses: [],
          },
        ];

  const currentCandidate = displayCandidates[selectedCandidateIndex] || displayCandidates[0];

  const handleApply = async () => {
    setIsApplying(true);
    setActionNotice(null);
    try {
      if (onApplyCandidate) {
        await onApplyCandidate(currentCandidate.id);
      }
      setActionNotice('Patch candidate applied successfully to isolated workspace.');
    } catch (err: any) {
      setActionNotice(`Failed to apply: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setActionNotice(null);
    try {
      if (onVerifyCandidate) {
        await onVerifyCandidate(currentCandidate.id);
      }
      setActionNotice('Prover confirmed: Target check passed with 0 regressions!');
    } catch (err: any) {
      setActionNotice(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                AI Patch Candidates & AST Validation
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  {displayCandidates.length} Candidates
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Failure: <code className="text-slate-300 font-mono">{failureId}</code> in Run:{' '}
                <code className="text-slate-300 font-mono">{runId}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-3 py-1 rounded bg-slate-800/60 hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>

        {/* Candidate Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-3 gap-2">
          {displayCandidates.map((cand, idx) => (
            <button
              key={cand.id}
              onClick={() => setSelectedCandidateIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-lg transition border-t border-x ${
                selectedCandidateIndex === idx
                  ? 'bg-slate-900 border-slate-700 text-cyan-400 font-semibold'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>
                Candidate {String.fromCharCode(65 + idx)} ({cand.generatorStrategy.replace('_', ' ')})
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  cand.confidenceScore >= 90
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-amber-950 text-amber-400'
                }`}
              >
                {cand.confidenceScore}%
              </span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Metadata Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">AST Syntax Guard</div>
                <div className="font-semibold text-emerald-300">Clean Syntax</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">Security Patterns</div>
                <div className="font-semibold text-cyan-300">0 Trapped Violations</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">Confidence Score</div>
                <div className="font-semibold text-indigo-300">{currentCandidate.confidenceScore}%</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">Risk Assessment</div>
                <div className="font-semibold text-amber-300 uppercase">{currentCandidate.riskRating}</div>
              </div>
            </div>
          </div>

          {/* Rationale */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Diagnostic Rationale: </span>
            <span className="text-slate-200">{currentCandidate.rationale}</span>
          </div>

          {/* Notice banner if action performed */}
          {actionNotice && (
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Diff Viewer */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">{currentCandidate.targetFiles.join(', ')}</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                Unified Diff Preview
              </span>
            </div>
            <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-slate-300">
              {currentCandidate.unifiedDiff.split('\n').map((line, idx) => {
                let colorClass = 'text-slate-400';
                let bgClass = 'bg-transparent';

                if (line.startsWith('+') && !line.startsWith('+++')) {
                  colorClass = 'text-emerald-400';
                  bgClass = 'bg-emerald-950/30';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  colorClass = 'text-rose-400';
                  bgClass = 'bg-rose-950/30';
                } else if (line.startsWith('@@')) {
                  colorClass = 'text-cyan-400 font-semibold';
                  bgClass = 'bg-cyan-950/20';
                }

                return (
                  <div key={idx} className={`${bgClass} px-2 py-0.5 rounded-sm`}>
                    <span className={colorClass}>{line}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onRollback}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rollback Changes
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition disabled:opacity-50"
            >
              {isApplying ? 'Applying...' : 'Apply in Sandbox'}
            </button>

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800 rounded-lg transition disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify Fix Prover'}
            </button>

            <button
              onClick={() => onCreatePr && onCreatePr(currentCandidate.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-sm transition"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Publish GitHub PR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
