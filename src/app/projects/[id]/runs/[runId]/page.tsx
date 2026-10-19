'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { DiffViewer } from '@/components/DiffViewer';
import { PatchReviewModal } from '@/components/PatchReviewModal';
import { VerificationRun, TestResult, Finding, Project } from '@/lib/types';
import { FixProposal } from '@/lib/types/proposal';
import { ViewportMatrixReport } from '@/components/viewport/ViewportMatrixReport';
import { deriveViewportRecordsFromResults } from '@/lib/viewport/derive-records';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  Camera,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Layers,
  StopCircle,
  FileCode,
  ArrowLeft,
  Activity,
  Globe,
  Sliders,
} from 'lucide-react';

function VerificationRunContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const runId = params.runId as string;

  const [run, setRun] = useState<VerificationRun | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tests' | 'viewport' | 'evidence' | 'ai' | 'errors' | 'logs' | 'coverage'>('tests');
  const [testFilter, setTestFilter] = useState<'all' | 'passed' | 'failed' | 'inconclusive'>('all');
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<FixProposal | null>(null);

  // Streaming logs state
  const [logs, setLogs] = useState<string[]>([]);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchRunData = async () => {
    try {
      const res = await fetch(`/api/v1/runs/${runId}`);
      const json = await res.json();
      if (res.ok) {
        setRun(json.run);
        setProject(json.project);
        setTestResults(json.testResults || []);
        setFindings(json.findings || []);
        setLogs(json.run.logs || []);

        const isRunning =
          json.run.status !== 'completed' &&
          json.run.status !== 'failed' &&
          json.run.status !== 'cancelled';
        setIsLiveRunning(isRunning);
      }
    } catch (err) {
      console.error('Error fetching run data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runId) {
      fetchRunData();
    }
  }, [runId]);

  // Connect to SSE stream if run is actively running
  useEffect(() => {
    if (!runId || !isLiveRunning) return;

    const eventSource = new EventSource(`/api/v1/runs/${runId}/stream`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'log') {
          setLogs((prev) => [...prev, data.message]);
        } else if (data.type === 'status') {
          setRun((prev) => (prev ? { ...prev, status: data.status } : null));
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            setIsLiveRunning(false);
            eventSource.close();
            fetchRunData();
          }
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, isLiveRunning]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCancel = async () => {
    try {
      await fetch(`/api/v1/runs/${runId}/cancel`, { method: 'POST' });
      fetchRunData();
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const toggleTestExpanded = (id: string) => {
    setExpandedTests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
          Loading verification report telemetry...
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white">Verification Run Not Found</h2>
          <Link href={`/projects/${projectId}`} className="text-xs px-4 py-2 mt-4 bg-sky-600 rounded-md text-white">
            Return to Project
          </Link>
        </div>
      </div>
    );
  }

  const stages = [
    { key: 'importing', label: 'Importing Source' },
    { key: 'analyzing', label: 'Inspecting Repo' },
    { key: 'preparing', label: 'Sandbox Init' },
    { key: 'starting', label: 'Starting App' },
    { key: 'testing', label: 'Playwright Tests' },
    { key: 'analyzing_ai', label: 'AI Diagnosis' },
    { key: 'completed', label: 'Report Generated' },
  ];

  const currentStageIdx = stages.findIndex((s) => s.key === run.status);

  const filteredTests = testResults.filter((t) => {
    if (testFilter === 'all') return true;
    return t.status === testFilter;
  });

  const allConsoleErrors = testResults.flatMap((t) => t.evidence.consoleErrors);
  const allNetworkFailures = testResults.flatMap((t) => t.evidence.networkFailures);
  const viewportRecords = deriveViewportRecordsFromResults(testResults, runId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Link href={`/projects/${projectId}`} className="hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            {project?.name || 'Project'}
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">Run #{run.runNumber}</span>
          <span className="text-slate-500 font-mono">({run.id})</span>
        </div>

        {/* ACTIVE LIVE EXECUTION BANNER */}
        {isLiveRunning && (
          <div className="rounded-xl border border-sky-800/80 bg-sky-950/30 p-6 mb-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Verification Run in Progress
                  </h2>
                  <StatusBadge status={run.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active Playwright Chromium browser execution and evidence collection on port {run.executionConfig.port}.
                </p>
              </div>

              <button
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors self-start md:self-auto"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Cancel Run
              </button>
            </div>

            {/* Stage tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
              {stages.map((stage, idx) => {
                const isPassed = currentStageIdx > idx || run.status === 'completed';
                const isCurrent = currentStageIdx === idx;
                return (
                  <div
                    key={stage.key}
                    className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                      isPassed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 font-medium'
                        : isCurrent
                        ? 'bg-sky-950/70 border-sky-600 text-sky-300 font-bold animate-pulse'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider mb-0.5">Stage {idx + 1}</div>
                    <div className="truncate">{stage.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Streaming Terminal */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  Live Execution Telemetry
                </span>
                <span className="text-[11px] text-slate-500">Auto-streaming stdout / stderr</span>
              </div>
              <div ref={terminalRef} className="p-4 h-64 overflow-y-auto space-y-1 text-slate-300 leading-relaxed">
                {logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VERIFICATION REPORT HEADER (When Completed/Failed) */}
        {!isLiveRunning && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Verification Report #{run.runNumber}
                  </h1>
                  <StatusBadge status={run.status} size="md" />
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                  <span>
                    Commit: <code className="text-slate-300 font-mono">{run.commitHash.substring(0, 7)}</code>
                  </span>
                  <span>&bull;</span>
                  <span>Branch: <strong className="text-slate-300">{run.branch}</strong></span>
                  <span>&bull;</span>
                  <span>Duration: <strong className="text-slate-300">{(run.durationMs ? run.durationMs / 1000 : 0).toFixed(1)}s</strong></span>
                  <span>&bull;</span>
                  <span>Started: <strong className="text-slate-300">{new Date(run.startedAt).toLocaleString()}</strong></span>
                </div>

                <p className="text-xs text-slate-400 mt-2 italic">
                  {run.isolationDisclaimer}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/api/v1/runs/${runId}/export?format=html`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export HTML
                </a>

                <a
                  href={`/api/v1/runs/${runId}/export?format=json`}
                  download
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Export JSON
                </a>

                <Link
                  href={`/projects/${projectId}/compare`}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 inline-flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Compare Runs
                </Link>
              </div>
            </div>

            {/* Metric Scorecards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Checks</span>
                <div className="text-xl font-bold text-white mt-1">{run.summary.total}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Passed</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">{run.summary.passed}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">Failed</span>
                <div className="text-xl font-bold text-rose-400 mt-1">{run.summary.failed}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Inconclusive</span>
                <div className="text-xl font-bold text-amber-400 mt-1">{run.summary.inconclusive}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Blocked</span>
                <div className="text-xl font-bold text-slate-400 mt-1">{run.summary.blocked}</div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Skipped</span>
                <div className="text-xl font-bold text-slate-400 mt-1">{run.summary.skipped}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'tests'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Checks & Test Results ({testResults.length})
          </button>

          <button
            onClick={() => setActiveTab('viewport')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'viewport'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Viewport Matrix ({viewportRecords.length})
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'evidence'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Screenshots & Visual Evidence
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'ai'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI Diagnosis & Patch Previews ({findings.length})
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'errors'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Console & Network Errors ({allConsoleErrors.length + allNetworkFailures.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'logs'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Execution Logs ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('coverage')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'coverage'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Boundaries & Limitations
          </button>
        </div>

        {/* TAB 1: CHECKS & TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 text-xs">
              {(['all', 'passed', 'failed', 'inconclusive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTestFilter(filter)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${
                    testFilter === filter
                      ? 'bg-slate-800 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Test Cards Accordion */}
            <div className="space-y-3">
              {filteredTests.map((test) => {
                const isExpanded = expandedTests[test.id];
                return (
                  <div
                    key={test.id}
                    className={`rounded-xl border transition-all ${
                      test.status === 'failed'
                        ? 'border-rose-900/60 bg-rose-950/10'
                        : test.status === 'passed'
                        ? 'border-slate-800 bg-slate-900/30'
                        : 'border-amber-900/60 bg-amber-950/10'
                    }`}
                  >
                    {/* Header */}
                    <div
                      onClick={() => toggleTestExpanded(test.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <div className="font-semibold text-sm text-white">{test.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{test.actualResult}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">{test.durationMs}ms</span>
                        <StatusBadge status={test.status} />
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 text-xs space-y-3">
                        {test.errorDetails && (
                          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300">
                            <div className="font-semibold">Error Message: {test.errorDetails.message}</div>
                            {test.errorDetails.url && (
                              <div className="mt-1 font-mono text-[11px] text-rose-400">
                                Target: {test.errorDetails.url}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step Breakdown */}
                        {test.evidence.steps && test.evidence.steps.length > 0 && (
                          <div>
                            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                              Execution Step Breakdown
                            </div>
                            <div className="space-y-1.5">
                              {test.evidence.steps.map((step, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300"
                                >
                                  <div className="flex items-center gap-2">
                                    {step.status === 'passed' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    )}
                                    <span>{step.name}</span>
                                    {step.error && (
                                      <span className="text-rose-400 text-[11px] font-mono">({step.error})</span>
                                    )}
                                  </div>
                                  <span className="text-slate-500 font-mono text-[11px]">{step.durationMs}ms</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Screenshot thumbnail if available */}
                        {test.evidence.screenshotPath && (
                          <div>
                            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                              Captured Screenshot Checkpoint
                            </div>
                            <div
                              onClick={() => setSelectedScreenshot(test.evidence.screenshotPath!)}
                              className="relative inline-block rounded-lg overflow-hidden border border-slate-700 cursor-pointer group"
                            >
                              <img
                                src={test.evidence.screenshotPath}
                                alt={test.name}
                                className="w-64 h-36 object-cover bg-slate-900 group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs">
                                <Maximize2 className="w-3.5 h-3.5" /> Expand
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: VIEWPORT MATRIX */}
        {activeTab === 'viewport' && (
          <ViewportMatrixReport
            records={viewportRecords}
            allTests={testResults}
            onSelectScreenshot={(path) => setSelectedScreenshot(path)}
          />
        )}

        {/* TAB 2: VISUAL EVIDENCE & SCREENSHOTS */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              High-resolution snapshots captured by Playwright Chromium during genuine browser execution.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testResults
                .filter((t) => t.evidence.screenshotPath)
                .map((test) => (
                  <div
                    key={test.id}
                    onClick={() => setSelectedScreenshot(test.evidence.screenshotPath!)}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden cursor-pointer group hover:border-slate-700 transition-all"
                  >
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      <img
                        src={test.evidence.screenshotPath}
                        alt={test.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <StatusBadge status={test.status} />
                      </div>
                    </div>
                    <div className="p-3 text-xs">
                      <div className="font-semibold text-white truncate">{test.name}</div>
                      <div className="text-slate-500 mt-1 text-[11px] font-mono">
                        {test.evidence.screenshotPath}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: AI DIAGNOSIS & PATCH PREVIEWS */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>Evidence-Based Failure Analysis:</strong> The diagnoses below are grounded strictly in the captured test evidence. Observed Facts are distinguished from AI Probabilistic Hypotheses. Patches require manual developer review before applying.
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                Zero failure findings detected. All executed checks completed cleanly.
              </div>
            ) : (
              findings.map((fnd) => (
                <div
                  key={fnd.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={fnd.severity} />
                        <h3 className="font-bold text-white text-base">{fnd.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{fnd.description}</p>
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-semibold self-start sm:self-auto">
                      Confidence: {fnd.confidenceScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <strong className="text-slate-300 block mb-1">Observed Fact (Evidence):</strong>
                      <span className="text-slate-400 leading-relaxed">{fnd.observedEvidence}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <strong className="text-slate-300 block mb-1">AI Probabilistic Hypothesis:</strong>
                      <span className="text-slate-400 leading-relaxed">{fnd.aiHypothesis}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <strong className="text-emerald-400 block mb-1">Recommended Solution:</strong>
                    <p className="text-slate-300 leading-relaxed">{fnd.suggestedFix}</p>
                  </div>

                  {/* Patch Diff Preview */}
                  {fnd.patchPreview && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Proposed Code Patch Preview
                      </div>
                      <DiffViewer
                        diff={fnd.patchPreview}
                        fileName={fnd.affectedFiles?.[0] || 'Proposed Patch'}
                      />
                      <button
                        onClick={() =>
                          setSelectedProposal({
                            id: fnd.id,
                            projectId,
                            runId,
                            failureId: fnd.testResultId || fnd.id,
                            commitSha: run?.commitHash || 'a1b2c3d4e5f6',
                            explanation: fnd.suggestedFix,
                            proposedChanges: fnd.patchPreview!,
                            affectedFiles: fnd.affectedFiles || ['src/fixtures/sample-app/src/app/page.tsx'],
                            confidenceScore: fnd.confidenceScore,
                            validationStatus: 'valid',
                            createdAt: fnd.createdAt,
                            updatedAt: fnd.createdAt,
                          })
                        }
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white font-medium text-xs shadow-sm shadow-sky-600/20 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Review & Test Patch in Sandbox
                      </button>
                    </div>
                  )}

                  {fnd.verificationStep && (
                    <div className="text-[11px] text-slate-500 italic">
                      Verification Step: {fnd.verificationStep}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: CONSOLE & NETWORK ERRORS */}
        {activeTab === 'errors' && (
          <div className="space-y-6">
            {/* Console Errors */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Captured Browser Console Errors</h3>
              {allConsoleErrors.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800 text-xs text-slate-500">
                  Zero console errors recorded during verification.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Error Message</th>
                        <th className="py-2.5 px-4">Source Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {allConsoleErrors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-4 text-slate-500">{err.timestamp}</td>
                          <td className="py-2.5 px-4 text-rose-400 font-bold uppercase">{err.type}</td>
                          <td className="py-2.5 px-4 text-rose-300">{err.text}</td>
                          <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">{err.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Network Failures */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Failed Network Requests (4xx / 5xx)</h3>
              {allNetworkFailures.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800 text-xs text-slate-500">
                  Zero HTTP 4xx/5xx network failures recorded.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">URL</th>
                        <th className="py-2.5 px-4">Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {allNetworkFailures.map((req, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-4 text-sky-400 font-bold">{req.method}</td>
                          <td className="py-2.5 px-4 text-rose-400 font-bold">{req.status || 'FAILED'}</td>
                          <td className="py-2.5 px-4 text-slate-300 truncate max-w-md">{req.url}</td>
                          <td className="py-2.5 px-4 text-slate-400">{req.failureReason || req.statusText || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: EXECUTION LOGS */}
        {activeTab === 'logs' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400">
              <span>Recorded Stdout & Stderr Logs</span>
              <span>{logs.length} line(s)</span>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-1 text-slate-300">
              {logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: COVERAGE & LIMITATIONS */}
        {activeTab === 'coverage' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Test Coverage & Safety Boundaries</h3>
              <p className="text-slate-400 leading-relaxed">
                PROOFix operates under a strict verification policy: Never declare an application bug-free merely because the selected tests passed.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  1. Destructive Form Submissions Policy
                </span>
                <span className="text-slate-400">
                  Payments, account deletions, password resets, and irreversible state mutations are blocked by the Safe Test Engine unless an authorized mock test plan is explicitly defined.
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  2. Dynamic Route Parameters
                </span>
                <span className="text-slate-400">
                  Routes requiring dynamic parameters (e.g. <code>/users/[id]</code>) are audited only when seed data or route manifests provide sample parameter values.
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-1">
                  3. Sandbox Isolation Model
                </span>
                <span className="text-slate-400">
                  Current execution operates in unprivileged local process sandbox mode. Full cgroup memory quotas and virtual networking require a containerized execution worker with host Docker daemon.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Screenshot Zoom Modal */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out"
        >
          <div className="max-w-5xl max-h-[90vh] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl relative">
            <img src={selectedScreenshot} alt="Evidence View" className="w-full h-auto object-contain" />
            <div className="p-3 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
              <span>{selectedScreenshot}</span>
              <span>Click anywhere to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Patch Review Modal */}
      {selectedProposal && (
        <PatchReviewModal
          proposal={selectedProposal}
          isOpen={!!selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onActionComplete={(updated) => setSelectedProposal(updated)}
        />
      )}
    </div>
  );
}

export default function VerificationRunPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Loading verification run...</div>}>
      <VerificationRunContent />
    </Suspense>
  );
}
