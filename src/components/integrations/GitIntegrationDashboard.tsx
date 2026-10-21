'use client';

import React, { useState } from 'react';
import { GitProvider } from '@/lib/types/git-integrations';

interface CheckRunCard {
  id: string;
  provider: GitProvider;
  repo: string;
  prNumber: number;
  prTitle: string;
  author: string;
  sha: string;
  branch: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure';
  durationMs: number;
  timestamp: string;
  healingAvailable?: boolean;
  screenshotUrl?: string;
  diffSnippet?: string;
}

const INITIAL_RUNS: CheckRunCard[] = [
  {
    id: 'cr-101',
    provider: 'github',
    repo: 'acme/proofix-core',
    prNumber: 142,
    prTitle: 'fix(checkout): migrate cart button to accessible data-testid',
    author: 'alex-dev',
    sha: '9f2a4b8c1d3e',
    branch: 'fix/cart-btn',
    status: 'completed',
    conclusion: 'success',
    durationMs: 4120,
    timestamp: '2 mins ago',
  },
  {
    id: 'cr-102',
    provider: 'github',
    repo: 'acme/proofix-core',
    prNumber: 145,
    prTitle: 'feat(billing): overhaul stripe webhook reconciliation',
    author: 'sarah-eng',
    sha: '3c8e1a7b9d2f',
    branch: 'feat/reconciliation',
    status: 'completed',
    conclusion: 'failure',
    durationMs: 6840,
    timestamp: '8 mins ago',
    healingAvailable: true,
    screenshotUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    diffSnippet: '- await page.click("button.pay-btn");\n+ await page.click("button[data-testid=\'confirm-pay\']");',
  },
  {
    id: 'cr-103',
    provider: 'gitlab',
    repo: 'fintech-group/ledger-service',
    prNumber: 58,
    prTitle: 'refactor: parallelize database shard replication',
    author: 'michael-devops',
    sha: '8a1b2c3d4e5f',
    branch: 'perf/sharding',
    status: 'in_progress',
    durationMs: 2450,
    timestamp: 'Just now',
  },
];

export default function GitIntegrationDashboard() {
  const [runs, setRuns] = useState<CheckRunCard[]>(INITIAL_RUNS);
  const [activeTab, setActiveTab] = useState<'all' | 'github' | 'gitlab'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('cr-102');
  const [healingAlert, setHealingAlert] = useState<string | null>(null);

  const filteredRuns = runs.filter(
    (r) => activeTab === 'all' || r.provider === activeTab
  );

  const triggerSimulatedEvent = (provider: GitProvider) => {
    const newId = `cr-${Date.now().toString().slice(-4)}`;
    const randomSha = Math.random().toString(16).substring(2, 10);
    const newRun: CheckRunCard = {
      id: newId,
      provider,
      repo: provider === 'github' ? 'acme/proofix-core' : 'fintech-group/ledger-service',
      prNumber: Math.floor(Math.random() * 80) + 150,
      prTitle: `chore: automated webhook verification for ${randomSha}`,
      author: 'ai-bot',
      sha: randomSha,
      branch: `patch/${randomSha}`,
      status: 'completed',
      conclusion: 'success',
      durationMs: 3200 + Math.floor(Math.random() * 2000),
      timestamp: 'Just now',
    };

    setRuns([newRun, ...runs]);
    setHealingAlert(`Dispatched simulated ${provider.toUpperCase()} webhook event! Check Run created.`);
    setTimeout(() => setHealingAlert(null), 4000);
  };

  const applyHealingPatch = (run: CheckRunCard) => {
    setHealingAlert(`Applying 1-click self-healing patch to PR #${run.prNumber} (${run.branch})...`);
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === run.id
            ? { ...r, conclusion: 'success', healingAvailable: false }
            : r
        )
      );
      setHealingAlert(`✅ Self-healing patch merged to PR #${run.prNumber}. Check run re-verified as SUCCESS.`);
      setTimeout(() => setHealingAlert(null), 5000);
    }, 1200);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐙</span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Native Git Integrations & Webhook Ingestion
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                Active Webhook Listeners
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Real-time ingestion for GitHub Apps & GitLab Webhooks with automated Check Runs and 1-Click Self-Healing PR comments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerSimulatedEvent('github')}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              + Simulate GitHub PR
            </button>
            <button
              onClick={() => triggerSimulatedEvent('gitlab')}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-orange-950/40 hover:bg-orange-900/40 text-orange-300 border border-orange-800/60 transition"
            >
              + Simulate GitLab MR
            </button>
          </div>
        </div>

        {healingAlert && (
          <div className="p-4 rounded-xl bg-indigo-950/70 border border-indigo-700/80 text-indigo-200 text-sm flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-indigo-400">⚡</span>
              <span>{healingAlert}</span>
            </div>
            <button onClick={() => setHealingAlert(null)} className="text-indigo-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Inbound Webhook Rate</div>
            <div className="text-2xl font-bold text-white mt-1">99.98%</div>
            <div className="text-xs text-emerald-400 mt-1">Signature Verified (HMAC)</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Average Check Run Latency</div>
            <div className="text-2xl font-bold text-white mt-1">4.2s</div>
            <div className="text-xs text-indigo-400 mt-1">From push to Check Run conclusion</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">1-Click Healing Rate</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">94.2%</div>
            <div className="text-xs text-slate-400 mt-1">Deterministic selector resolution</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Merge Gates</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">12 Repos</div>
            <div className="text-xs text-slate-400 mt-1">Strict status checks enforced</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {(['all', 'github', 'gitlab'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredRuns.length} recent Check Run executions
          </span>
        </div>

        {/* Check Runs List */}
        <div className="space-y-3">
          {filteredRuns.map((run) => {
            const isExpanded = expandedId === run.id;
            return (
              <div
                key={run.id}
                className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden hover:border-slate-700 transition"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {run.provider === 'github' ? '🐙' : '🦊'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {run.repo}
                        </span>
                        <span className="text-xs text-slate-400">
                          #{run.prNumber}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {run.branch}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {run.prTitle} • by <span className="text-slate-300">@{run.author}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">{run.timestamp}</span>
                    <span className="text-xs font-mono text-slate-400">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>

                    {run.status === 'in_progress' ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                        In Progress
                      </span>
                    ) : run.conclusion === 'success' ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Passed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950 text-rose-400 border border-rose-800">
                        Failed
                      </span>
                    )}

                    <span className="text-slate-400 text-sm">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-4 text-slate-400">
                        <span>Commit SHA: <strong className="font-mono text-slate-200">{run.sha}</strong></span>
                        <span>Endpoint: <strong className="font-mono text-slate-200">/api/v1/integrations/{run.provider}/webhook</strong></span>
                      </div>

                      {run.healingAvailable && (
                        <button
                          onClick={() => applyHealingPatch(run)}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition flex items-center gap-2"
                        >
                          <span>⚡</span> 1-Click Apply Self-Healing Patch
                        </button>
                      )}
                    </div>

                    {run.diffSnippet && (
                      <div>
                        <div className="text-xs font-semibold text-slate-300 mb-1">
                          Synthesized Code Patch Diff:
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
                          {run.diffSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
