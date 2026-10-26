'use client';

import React from 'react';
import { ShieldCheck, X, Copy, Check, FileCode } from 'lucide-react';
import { ProofCertificate } from '@/lib/types/prover';

interface ProofCertificateModalProps {
  certificate: ProofCertificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProofCertificateModal({ certificate, isOpen, onClose }: ProofCertificateModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !certificate) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(certificate, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cryptographic Proof Certificate</h3>
              <p className="text-[11px] text-slate-400 font-mono">{certificate.certificateId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Status</span>
              <span className="text-emerald-400 font-bold text-sm">PROVEN 100%</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Scenario</span>
              <span className="text-white font-medium">{certificate.scenarioId}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">SHA-256 Integrity Fingerprint</span>
              <code className="text-[11px] font-mono text-sky-400 break-all select-all block bg-slate-900 p-2 rounded border border-slate-800">
                {certificate.sha256Fingerprint}
              </code>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">Patch Hash</span>
              <code className="text-[11px] font-mono text-slate-300 break-all select-all block bg-slate-900 p-2 rounded border border-slate-800">
                {certificate.patchHash}
              </code>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300">
            <span className="font-semibold block mb-0.5">Dual-Pass Shadow Sandbox Guarantee</span>
            Re-executed target defect (EXTINGUISHED) and verified {certificate.pass2Verification.passedRegressionCount} baseline checks with zero side-effects.
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">Certified by {certificate.certifiedBy}</span>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
