'use client';

import React, { useState } from 'react';
import { ShieldCheck, Play, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { ProofBadge } from './ProofBadge';
import { ProofCertificateModal } from './ProofCertificateModal';
import { ProofCertificate, ProofStatus } from '@/lib/types/prover';

export function DualPassProverCard() {
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState('ecommerce_checkout');
  const [status, setStatus] = useState<ProofStatus>('PROVEN');
  const [certificate, setCertificate] = useState<ProofCertificate | null>({
    certificateId: 'cert_shadow_ecommerce_01',
    timestamp: new Date().toISOString(),
    status: 'PROVEN',
    scenarioId: 'ecommerce_checkout',
    sha256Fingerprint: '4f8a846c9a3341c2c2f88b0a94b3c95972583ec8972df7a5f644b92b67f1854e',
    patchHash: '8b94f1c93a0279a37e5ec0a8c2db2183e9b14f6b219b13904a29c138f28b76e2',
    pass1Failure: { checkId: 'chk_api_checkout', errorSummary: 'HTTP 404 missing route /api/checkout' },
    pass2Verification: { targetCheckPassed: true, regressionCount: 4, passedRegressionCount: 4, passRate: 1.0, latencyMs: 1420 },
    certifiedBy: 'PROOFix-Shadow-Prover-v1'
  });
  const [modalOpen, setModalOpen] = useState(false);

  const handleProve = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/v1/prover/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: scenario })
      });
      const json = await res.json();
      if (json.certificate) {
        setCertificate(json.certificate);
        setStatus(json.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Dual-Pass Shadow Prover</h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                  Zero-Regression
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Spawns an ephemeral worktree, verifies the defect resolution, and proves 0 side-effects.
              </p>
            </div>
          </div>
          <ProofBadge status={status} onClick={() => setModalOpen(true)} />
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Target Scenario:</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ecommerce_checkout">E-Commerce Checkout 404</option>
              <option value="ssr_hydration_drift">Next.js SSR Hydration Drift</option>
              <option value="sqli_preflight_gate">SQL Injection AST Gate</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              Inspect Certificate
            </button>
            <button
              onClick={handleProve}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition disabled:opacity-50"
            >
              {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{running ? 'Verifying in Shadow...' : 'Run Shadow Proof'}</span>
            </button>
          </div>
        </div>
      </div>

      <ProofCertificateModal
        certificate={certificate}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
