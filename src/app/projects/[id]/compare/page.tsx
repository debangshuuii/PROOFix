'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { VerificationRun, RunComparison } from '@/lib/types';
import {
  ScreenshotPair,
  VisualDiffResult,
  MaskRegion,
  BaselineRecord,
} from '@/lib/types/visual-regression';
import { ComparisonModeViewer } from '@/components/visual/ComparisonModeViewer';
import { VisualDiffStatsCard } from '@/components/visual/VisualDiffStatsCard';
import { ZoomPanToolbar } from '@/components/visual/ZoomPanToolbar';
import { DynamicRegionMaskEditor } from '@/components/visual/DynamicRegionMaskEditor';
import { useZoomPan } from '@/components/visual/useZoomPan';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GitCompare,
  Clock,
  FileCode,
  Sliders,
  Camera,
  ShieldCheck,
  History,
  Layers,
  ChevronRight,
  Eye,
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

  // Tab: 'outcomes' | 'visual' | 'audit'
  const [activeTab, setActiveTab] = useState<'visual' | 'outcomes' | 'audit'>('visual');

  // Visual regression state
  const [pairs, setPairs] = useState<ScreenshotPair[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [diffResults, setDiffResults] = useState<Record<string, VisualDiffResult>>({});
  const [masks, setMasks] = useState<MaskRegion[]>([]);
  const [activeBaseline, setActiveBaseline] = useState<BaselineRecord | null>(null);
  const [baselineHistory, setBaselineHistory] = useState<BaselineRecord[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approverName, setApproverName] = useState('Senior QA Lead');
  const [approverEmail, setApproverEmail] = useState('lead.qa@proofix.dev');
  const [approvalComment, setApprovalComment] = useState('Approved visual changes as new baseline.');
  const [approving, setApproving] = useState(false);

  // Zoom & Pan hook
  const {
    zoom,
    transform,
    isPanning,
    zoomIn,
    zoomOut,
    setZoomLevel,
    resetZoomPan,
  } = useZoomPan(1.0);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [runsRes, baselineRes, masksRes] = await Promise.all([
          fetch(`/api/v1/projects/${projectId}/runs`),
          fetch(`/api/v1/projects/${projectId}/baseline`),
          fetch(`/api/v1/projects/${projectId}/masks`),
        ]);

        const runsJson = await runsRes.json();
        const baselineJson = await baselineRes.json();
        const masksJson = await masksRes.json();

        const runList: VerificationRun[] = runsJson.runs || [];
        setRuns(runList);
        setActiveBaseline(baselineJson.activeBaseline || null);
        setBaselineHistory(baselineJson.history || []);
        setMasks(masksJson.masks || []);

        if (runList.length >= 2) {
          const defaultBase = baselineJson.activeBaseline?.runId || runList[1].id;
          setBaseRunId(defaultBase);
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
    if (projectId) loadInitialData();
  }, [projectId]);

  // Fetch comparison telemetry & matched screenshot pairs
  useEffect(() => {
    async function fetchComparisonData() {
      if (!baseRunId || !targetRunId) return;
      try {
        setComparing(true);
        const [compRes, pairsRes] = await Promise.all([
          fetch(`/api/v1/projects/${projectId}/compare?baseRunId=${baseRunId}&targetRunId=${targetRunId}`),
          fetch(`/api/v1/projects/${projectId}/compare/pairs?baseRunId=${baseRunId}&targetRunId=${targetRunId}`),
        ]);

        const compJson = await compRes.json();
        const pairsJson = await pairsRes.json();

        if (compRes.ok) setComparison(compJson.comparison);
        if (pairsRes.ok) {
          const list: ScreenshotPair[] = pairsJson.allPairs || [];
          setPairs(list);
          if (list.length > 0 && !selectedPairId) {
            setSelectedPairId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Comparison error:', err);
      } finally {
        setComparing(false);
      }
    }
    fetchComparisonData();
  }, [baseRunId, targetRunId, projectId]);

  // Generate visual diff when selected pair changes
  const activePair = pairs.find((p) => p.id === selectedPairId) || pairs[0];

  useEffect(() => {
    async function computeDiff() {
      if (!activePair || activePair.status !== 'matched' || diffResults[activePair.id]) {
        return;
      }
      try {
        setDiffLoading(true);
        const routeMasks = masks.filter((m) => !m.route || m.route === '*' || m.route === activePair.route);
        const res = await fetch(`/api/v1/projects/${projectId}/compare/diff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pair: activePair,
            threshold: 0.1,
            maskedRegions: routeMasks,
          }),
        });
        const json = await res.json();
        if (res.ok && json.diffResult) {
          setDiffResults((prev) => ({ ...prev, [activePair.id]: json.diffResult }));
        }
      } catch (err) {
        console.error('Diff computation error:', err);
      } finally {
        setDiffLoading(false);
      }
    }
    computeDiff();
  }, [activePair, masks, projectId]);

  // Mask operations
  const handleAddMask = async (newMask: Omit<MaskRegion, 'id'>) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/masks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMask),
      });
      const json = await res.json();
      if (res.ok && json.mask) {
        setMasks((prev) => [...prev, json.mask]);
        // Invalidate active diff to recompute with new mask
        if (activePair) {
          setDiffResults((prev) => {
            const copy = { ...prev };
            delete copy[activePair.id];
            return copy;
          });
        }
      }
    } catch (err) {
      console.error('Failed to add mask:', err);
    }
  };

  const handleDeleteMask = async (maskId: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/masks?maskId=${maskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMasks((prev) => prev.filter((m) => m.id !== maskId));
        if (activePair) {
          setDiffResults((prev) => {
            const copy = { ...prev };
            delete copy[activePair.id];
            return copy;
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete mask:', err);
    }
  };

  // Baseline Approval Handler
  const handleApproveBaseline = async () => {
    if (!targetRunId) return;
    try {
      setApproving(true);
      const res = await fetch(`/api/v1/projects/${projectId}/baseline/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: targetRunId,
          approverName,
          approverEmail,
          comment: approvalComment,
        }),
      });
      const json = await res.json();
      if (res.ok && json.baseline) {
        setActiveBaseline(json.baseline);
        setBaselineHistory((prev) => [json.baseline, ...prev]);
        setShowApprovalModal(false);
        // Set new baseline as baseRunId
        setBaseRunId(json.baseline.runId);
      }
    } catch (err) {
      console.error('Failed to approve baseline:', err);
    } finally {
      setApproving(false);
    }
  };

  const activeDiff = activePair ? diffResults[activePair.id] : null;

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
          <span className="text-slate-200 font-medium">Visual Regression Slider & Comparison</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <GitCompare className="w-6 h-6 text-sky-400" />
              Interactive Visual Regression Slider
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Inspect pixel-level visual changes across runs with before/after slider, synchronized zoom/pan, and dynamic masks.
            </p>
          </div>

          {/* Baseline Indicator & Approval CTA */}
          <div className="flex items-center gap-3">
            {activeBaseline && (
              <div className="hidden md:flex flex-col items-end text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Baseline</span>
                <span className="font-mono text-sky-400 font-semibold">
                  Run #{activeBaseline.runNumber} ({activeBaseline.commitHash.slice(0, 7)})
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowApprovalModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Approve Baseline
            </button>
          </div>
        </div>

        {/* Run Selector Bar */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Baseline Run (Benchmark)</span>
                {activeBaseline?.runId === baseRunId && (
                  <span className="text-[10px] text-emerald-400 font-normal">Active Official Baseline</span>
                )}
              </label>
              <select
                value={baseRunId}
                onChange={(e) => setBaseRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run #{r.runNumber} ({r.commitHash.substring(0, 7)}) &mdash; {new Date(r.startedAt).toLocaleDateString()} {r.id === activeBaseline?.runId ? '★ (Official Baseline)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Run (Evaluation Build)
              </label>
              <select
                value={targetRunId}
                onChange={(e) => setTargetRunId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run #{r.runNumber} ({r.commitHash.substring(0, 7)}) &mdash; {new Date(r.startedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-6 mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('visual')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'visual'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Visual Regression Slider ({pairs.length} Pairs)
          </button>

          <button
            onClick={() => setActiveTab('outcomes')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'outcomes'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Outcome Regressions & Telemetry
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'audit'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Baseline Approval History ({baselineHistory.length})
          </button>
        </div>

        {/* TAB 1: VISUAL REGRESSION SLIDER & MULTI-MODE VIEWER */}
        {activeTab === 'visual' && (
          <div className="space-y-6">
            {pairs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 text-xs text-slate-400">
                No screenshot pairs matched between Run #{baseRunId} and #{targetRunId}. Verify both runs have completed Playwright visual checkpoints.
              </div>
            ) : (
              <>
                {/* Route selector pills */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold mr-1">Select Checkpoint:</span>
                    {pairs.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPairId(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                          activePair?.id === p.id
                            ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span>{p.route}</span>
                        {p.status !== 'matched' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" title={p.status} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Zoom Pan Toolbar */}
                  <ZoomPanToolbar
                    zoom={zoom}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onReset={resetZoomPan}
                    onSetZoom={setZoomLevel}
                    isPanning={isPanning}
                  />
                </div>

                {/* Main Comparison Viewer in transformed coordinate container */}
                {activePair && (
                  <div
                    className="overflow-hidden rounded-2xl transition-transform duration-75"
                    style={{ transform: zoom > 1.0 ? transform : undefined }}
                  >
                    <ComparisonModeViewer
                      pair={activePair}
                      diffResult={activeDiff}
                      aspectRatio="16/9"
                    />
                  </div>
                )}

                {/* Difference Statistics Scorecard */}
                {activeDiff ? (
                  <VisualDiffStatsCard stats={activeDiff.stats} />
                ) : diffLoading ? (
                  <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    Computing pixel difference telemetry...
                  </div>
                ) : null}

                {/* Dynamic Region Masks Management */}
                <DynamicRegionMaskEditor
                  projectId={projectId}
                  route={activePair?.route}
                  masks={masks.filter((m) => !m.route || m.route === '*' || m.route === activePair?.route)}
                  onAddMask={handleAddMask}
                  onDeleteMask={handleDeleteMask}
                />
              </>
            )}
          </div>
        )}

        {/* TAB 2: OUTCOME REGRESSIONS */}
        {activeTab === 'outcomes' && comparison && (
          <div className="space-y-6">
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
                <span>Source commits differ between runs. Outcome changes stem from code changes.</span>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Newly Introduced Failures
              </h2>
              {comparison.newFailures.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-400">
                  Zero new regressions detected between these runs.
                </div>
              ) : (
                <div className="space-y-3">
                  {comparison.newFailures.map((test) => (
                    <div key={test.id} className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs">
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
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL & BASELINE HISTORY */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-1">
                Authorized Baseline Audit Trail
              </h3>
              <p className="text-xs text-slate-400">
                Cryptographically signed audit log recording authorized baseline elevations, timestamps, and approvers.
              </p>
            </div>

            <div className="space-y-3">
              {baselineHistory.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    rec.isActive
                      ? 'bg-emerald-950/20 border-emerald-800/80'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Run #{rec.runNumber} ({rec.commitHash.slice(0, 7)})
                      </span>
                      {rec.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold uppercase border border-emerald-500/30">
                          Active Baseline
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-500 font-mono uppercase">
                          Superseded
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 mt-1">
                      Approved by <strong className="text-slate-200">{rec.approvedBy || rec.setBy}</strong> on{' '}
                      {new Date(rec.approvedAt || rec.setAt).toLocaleString()}
                    </div>
                    {rec.approvalComment && (
                      <p className="text-slate-300 mt-1 italic">&ldquo;{rec.approvalComment}&rdquo;</p>
                    )}
                  </div>

                  <div className="text-right font-mono text-[10px] text-slate-500">
                    <div>Sig: {rec.auditSignature?.slice(0, 18)}...</div>
                    <div className="text-slate-400">{rec.branch}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Baseline Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Approve Target Run as New Baseline
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elevating Run #{targetRunId} replaces the existing active baseline. All future visual regression comparisons will evaluate against this build.
              </p>

              <div className="space-y-4 my-5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Approver Name *
                  </label>
                  <input
                    type="text"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Approver Email
                  </label>
                  <input
                    type="email"
                    value={approverEmail}
                    onChange={(e) => setApproverEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Approval Reason / Sign-off Comment
                  </label>
                  <textarea
                    rows={2}
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approving || !approverName}
                  onClick={handleApproveBaseline}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {approving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Confirm Sign-Off
                </button>
              </div>
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
