'use client';

import React, { useState } from 'react';
import { FixProposal } from '@/lib/types/proposal';
import { DiffViewer } from '@/components/DiffViewer';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode,
  AlertTriangle,
  Loader2,
  Download,
  GitBranch,
} from 'lucide-react';

interface PatchReviewModalProps {
  proposal: FixProposal;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: (updated: FixProposal) => void;
}

export function PatchReviewModal({
  proposal,
  isOpen,
  onClose,
  onActionComplete,
}: PatchReviewModalProps) {
  const [currentProposal, setCurrentProposal] = useState<FixProposal>(proposal);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReview = async (action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/proposals/${currentProposal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Review request failed.');
      }
      setCurrentProposal(data.proposal);
      if (onActionComplete) onActionComplete(data.proposal);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Fix Proposal Review</h2>
              <p className="text-xs text-slate-400">Proposal ID: {currentProposal.id} • Target Commit: {currentProposal.commitSha}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Grounded Fix Rationale</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                {currentProposal.confidenceScore}% Confidence
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{currentProposal.explanation}</p>
          </div>

          {/* Affected Files */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Affected Files ({currentProposal.affectedFiles.length})</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentProposal.affectedFiles.map((file) => (
                <div key={file} className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-sky-300">
                  <FileCode className="w-3.5 h-3.5 text-sky-400" />
                  <span>{file}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diff Viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unified Patch Diff Preview</span>
              <span className="text-[11px] text-slate-400">Safe preview • Repository checkout untouched</span>
            </div>
            <DiffViewer diff={currentProposal.proposedChanges} />
          </div>

          {/* Status Message */}
          {currentProposal.validationStatus !== 'valid' && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800">
              {currentProposal.validationStatus === 'applied' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {currentProposal.validationStatus === 'rejected' && <XCircle className="w-4 h-4 text-rose-400" />}
              <span className="text-slate-300">
                Current Proposal Status:{' '}
                <strong className="text-white uppercase">{currentProposal.validationStatus}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            {currentProposal.validationStatus === 'rejected' ? (
              <span className="text-rose-400">This patch was rejected. No repository files were modified.</span>
            ) : (
              <span>Inspecting patch does not mutate workspace files.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>

            {currentProposal.validationStatus !== 'rejected' && (
              <button
                onClick={() => handleReview('reject')}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject Patch
              </button>
            )}

            {currentProposal.validationStatus !== 'applied' && currentProposal.validationStatus !== 'rejected' && (
              <button
                onClick={() => handleReview('approve')}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md shadow-sky-600/20 transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve Patch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
