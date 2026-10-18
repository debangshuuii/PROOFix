'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { VerificationRun, RunComparison } from '@/lib/types';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GitCompare,
  Clock,
  FileCode,
} from 'lucide-react';

function CompareContent() {
  const params = useParams();
  const projectId = params.id as string;

  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [baseRunId, setBaseRunId] = useState<string>('');
  const [targetRunId, setTargetRunId] = useState<string>('');
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/projects/${projectId}/runs`);
        const json = await res.json();
        const runList: VerificationRun[] = json.runs || [];
        setRuns(runList);

        if (runList.length >= 2) {
          setBaseRunId(runList[1].id);
          setTargetRunId(runList[0].id);
        } else if (runList.length === 1) {
          setBaseRunId(runList[0].id);
          setTargetRunId(runList[0].id);
        }
      } catch (err) {
        console.error('Error loading runs for comparison:', err);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) loadRuns();
  }, [projectId]);

  useEffect(() => {
    async function fetchComparison() {
      if (!baseRunId || !targetRunId) return;
      try {
        setComparing(true);
        const res = await fetch(
          `/api/v1/projects/${projectId}/compare?baseRunId=${baseRunId}&targetRunId=${targetRunId}`
        );
        const json = await res.json();
        if (res.ok) {
          setComparison(json.comparison);
        }
      } catch (err) {
        console.error('Comparison error:', err);
      } finally {
        setComparing(false);
      }
    }
    fetchComparison();
  }, [baseRunId, targetRunId, projectId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Link href={`/projects/${projectId}`} className="hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Project Overview
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">Regression Analysis</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <GitCompare className="w-6 h-6 text-sky-400" />
              Verification Run Regression Detector
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Compare two verification runs to detect newly introduced failures, regressions, or resolved checks.
            </p>
          </div>
        </div>

        {/* Run Selector Bar */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Base Run (Previous Benchmark)
              </label>
              <select
                value={baseRunId}
                onChange={(e) => setBaseRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run #{r.runNumber} ({r.commitHash.substring(0, 7)}) &mdash; {new Date(r.startedAt).toLocaleDateString()} ({r.summary.passed} Passed, {r.summary.failed} Failed)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Run (Latest Evaluation)
              </label>
              <select
                value={targetRunId}
                onChange={(e) => setTargetRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run #{r.runNumber} ({r.commitHash.substring(0, 7)}) &mdash; {new Date(r.startedAt).toLocaleDateString()} ({r.summary.passed} Passed, {r.summary.failed} Failed)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {comparing ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-sky-400" />
            Computing regression telemetry and diffing test outcomes...
          </div>
        ) : !comparison ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
            Please select two runs above to compute regression analysis.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metric Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  New Failures (Regressions)
                </span>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {comparison.newFailures.length}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Resolved Checks (Fixed)
                </span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {comparison.fixedTests.length}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Duration Delta
                </span>
                <div className="text-2xl font-bold text-white mt-1">
                  {comparison.durationDeltaMs > 0 ? `+` : ''}
                  {(comparison.durationDeltaMs / 1000).toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Commit differences notification */}
            {!comparison.isSameCommit && (
              <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-800/40 text-xs text-sky-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Source commits differ between runs. Outcome changes may stem from repository source modifications.
                </span>
              </div>
            )}

            {/* New Failures Section */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Newly Introduced Failures (Action Required)
              </h2>

              {comparison.newFailures.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-400">
                  Zero new regressions detected between these runs.
                </div>
              ) : (
                <div className="space-y-3">
                  {comparison.newFailures.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">{test.name}</span>
                        <StatusBadge status="failed" />
                      </div>
                      <p className="text-rose-400/90 mt-1">{test.actualResult}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resolved Checks Section */}
            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Resolved Checks (Previously Failing, Now Passed)
              </h2>

              {comparison.fixedTests.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
                  No previously failing checks were resolved in this run.
                </div>
              ) : (
                <div className="space-y-3">
                  {comparison.fixedTests.map((test) => (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">{test.name}</span>
                        <StatusBadge status="passed" />
                      </div>
                      <p className="text-emerald-400/90 mt-1">{test.actualResult}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CompareRunsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  );
}
