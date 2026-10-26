'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { ProofStatus } from '@/lib/types/prover';

interface ProofBadgeProps {
  status: ProofStatus;
  passRate?: number;
  onClick?: () => void;
}

export function ProofBadge({ status, passRate = 1.0, onClick }: ProofBadgeProps) {
  if (status === 'PROVEN') {
    return (
      <button
        onClick={onClick}
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900/60 transition shadow-sm"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>PROVEN ({(passRate * 100).toFixed(0)}% Zero-Regression)</span>
      </button>
    );
  }

  if (status === 'REFUTED' || status === 'FLAKY_REGRESSION') {
    return (
      <button
        onClick={onClick}
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 hover:bg-rose-900/60 transition"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>REFUTED (Regressions Detected)</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800"
    >
      <Clock className="w-3.5 h-3.5 text-slate-500" />
      <span>PENDING PROOF</span>
    </button>
  );
}
