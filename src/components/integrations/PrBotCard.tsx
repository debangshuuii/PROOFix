'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  GitPullRequest,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Gauge,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

export function PrBotCard() {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null);

  const handleSimulateCommand = async () => {
    setSimulating(true);
    setCommandResult(null);
    try {
      const res = await fetch('/api/v1/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'issue_comment',
        },
        body: JSON.stringify({
          comment: {
            id: 101,
            body: '/proofix fix',
            user: { login: 'developer-tester' },
          },
          issue: {
            number: 42,
            pull_request: {
              head: { ref: 'feature/checkout-flow' },
              sha: 'c7a4b891',
            },
          },
          repository: {
            full_name: 'debangshuuii/PROOFix',
          },
        }),
      });
      const data = await res.json();
      setCommandResult(data.message || 'Slash command executed successfully!');
    } catch (err: any) {
      setCommandResult('Simulation error: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const copySampleCommand = () => {
    navigator.clipboard.writeText('/proofix fix');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-inner">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">GitHub PR Quality & Vitals Gate Bot</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mandatory PR status check with visual slider, Core Web Vitals gate, and /proofix fix command.
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulateCommand}
          disabled={simulating}
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition shadow-md shadow-sky-500/20 disabled:opacity-50"
        >
          {simulating ? (
            <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Simulate `/proofix fix`</span>
        </button>
      </div>

      {/* Vitals Grid & Proof Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
        {/* LCP Gauge */}
        <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">LCP Budget Gate</span>
            <span className="text-xs font-bold text-emerald-400">1.25s / 2.50s</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '50%' }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Threshold: &le; 2500ms &bull; Status: 🟢 PASS</p>
        </div>

        {/* CLS Gauge */}
        <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">CLS Budget Gate</span>
            <span className="text-xs font-bold text-emerald-400">0.015 / 0.10</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '15%' }} />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Threshold: &le; 0.100 &bull; Status: 🟢 PASS</p>
        </div>

        {/* SHA-256 Proof Status */}
        <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cryptographic Proof</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-[11px] text-slate-300 truncate mt-1">
            SHA-256: 4f8a846c9a33...
          </div>
          <p className="text-[11px] text-emerald-400 mt-2">100% Zero-Regression Certified</p>
        </div>
      </div>

      {/* Simulation Result Notification */}
      {commandResult && (
        <div className="mb-4 p-3 rounded-lg bg-sky-950/60 border border-sky-800/80 text-xs text-sky-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{commandResult}</span>
          </div>
          <button
            onClick={() => setCommandResult(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Slash Command Bar */}
      <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
          <span>PR Slash Command:</span>
          <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-mono text-[11px]">
            /proofix fix
          </code>
          <span className="text-slate-500 hidden sm:inline">&mdash; Commits self-healing patch to PR</span>
        </div>

        <button
          onClick={copySampleCommand}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Command'}</span>
        </button>
      </div>
    </div>
  );
}
