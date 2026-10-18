'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Project, ProjectVersion, VerificationRun } from '@/lib/types';
import {
  FolderGit2,
  Play,
  RefreshCw,
  Layers,
  Route,
  History,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Clock,
  ArrowRight,
  GitBranch,
  FileCode,
  Zap,
} from 'lucide-react';

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'history' | 'config'>('overview');
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}`);
      const json = await res.json();
      if (res.ok) {
        setProject(json.project);
        setVersions(json.versions || []);
      }

      const runsRes = await fetch(`/api/v1/projects/${projectId}/runs`);
      const runsJson = await runsRes.json();
      if (runsRes.ok) {
        setRuns(runsJson.runs || []);
      }
    } catch (err) {
      console.error('Failed fetching project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchProjectData();
  }, [projectId]);

  const handleStartRun = async () => {
    try {
      setIsStartingRun(true);
      const res = await fetch(`/api/v1/projects/${projectId}/runs`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.run?.id) {
        router.push(`/projects/${projectId}/runs/${json.run.id}`);
      }
    } catch (err) {
      console.error('Error starting verification run:', err);
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      await fetch(`/api/v1/projects/${projectId}/analyze`, { method: 'POST' });
      await fetchProjectData();
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
          Loading project telemetry...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white">Project Not Found</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">The requested project ID does not exist.</p>
          <Link href="/dashboard" className="text-xs px-4 py-2 bg-sky-600 rounded-md text-white font-medium">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const latestVersion = versions[0];
  const analysis = latestVersion?.analysis;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {project.repoProvider}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                {project.description || 'Application verification testbed.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  Branch: <strong className="text-slate-300">{project.defaultBranch}</strong>
                </span>
                {latestVersion && (
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    Commit: <strong className="text-slate-300">{latestVersion.commitHash}</strong>
                  </span>
                )}
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline truncate max-w-xs"
                  >
                    {project.repoUrl}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Re-Inspect Stack'}
              </button>

              <button
                onClick={handleStartRun}
                disabled={isStartingRun}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/25 inline-flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isStartingRun ? 'Starting Run...' : 'Start Verification Run'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 mb-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'overview'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Stack & Inspection Overview
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'routes'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            Discovered Routes ({analysis?.routes.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'history'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Verification History ({runs.length})
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'config'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Execution & Sandbox Policy
          </button>
        </div>

        {/* TAB 1: OVERVIEW & STACK */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Tech Stack Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Framework
                </span>
                <div className="text-base font-bold text-white mt-1">
                  {analysis?.framework || 'Next.js 15'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Runtime
                </span>
                <div className="text-base font-bold text-white mt-1">
                  {analysis?.runtime || 'Node.js v24.x'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Package Manager
                </span>
                <div className="text-base font-bold text-white mt-1 uppercase">
                  {analysis?.packageManager || 'npm'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                  Existing Test Suite
                </span>
                <div className="text-base font-bold text-white mt-1">
                  {analysis?.existingTests?.length ? analysis.existingTests.join(', ') : 'None detected'}
                </div>
              </div>
            </div>

            {/* Inferred Strategy & Potential Blockers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inferred Strategy */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Inferred Startup Strategy</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-800/60 text-sky-400 font-semibold uppercase">
                    Confidence: {analysis?.inferredStartup.confidence || 'High'}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Launch Command:</span>
                    <code className="text-sky-300 font-mono bg-slate-950 px-2 py-0.5 rounded">
                      {analysis?.inferredStartup.command || 'npm run dev'}
                    </code>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Assigned Port:</span>
                    <span className="text-slate-200 font-mono">{analysis?.inferredStartup.port || 4173}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Readiness Probe:</span>
                    <span className="text-slate-200 font-mono">
                      {analysis?.inferredStartup.readinessPath || '/'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 italic">
                  Rationale: {analysis?.inferredStartup.rationale || 'Standard web configuration detected.'}
                </p>
              </div>

              {/* Blockers & Advisories */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Potential Blockers & Advisories
                </h3>

                {analysis?.blockers && analysis.blockers.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.blockers.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300/90"
                      >
                        <div className="font-semibold text-amber-200">{b.message}</div>
                        <div className="text-[11px] text-amber-400/80 mt-1">
                          Suggested: {b.suggestedResolution}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No critical blockers detected. Ready for verification.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Package Scripts */}
            {analysis?.scripts && Object.keys(analysis.scripts).length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Available Package Scripts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(analysis.scripts).map(([name, cmd]) => (
                    <div key={name} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div className="font-bold text-sky-400 mb-1">{name}</div>
                      <code className="text-slate-400 font-mono text-[11px] truncate block">{cmd}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DISCOVERED ROUTES */}
        {activeTab === 'routes' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Route Path</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">File Source</th>
                  <th className="py-3 px-4">Properties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analysis?.routes.map((route, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {route.path}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          route.type === 'api'
                            ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                            : 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                        }`}
                      >
                        {route.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{route.fileSource}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {route.isDynamic ? (
                        <span className="text-amber-400">Dynamic Params</span>
                      ) : (
                        <span>Static</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: VERIFICATION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Select any run to inspect evidence or compare changes.</span>
              {runs.length >= 2 && (
                <Link
                  href={`/projects/${projectId}/compare`}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Compare Runs for Regressions
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Run #</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Checks Summary</th>
                    <th className="py-3 px-4">Commit</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Executed At</th>
                    <th className="py-3 px-4 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        #{run.runNumber}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 font-medium">
                          {run.summary.passed} Passed
                        </span>
                        {run.summary.failed > 0 && (
                          <span className="text-rose-400 font-medium ml-1.5">
                            &bull; {run.summary.failed} Failed
                          </span>
                        )}
                        {run.summary.inconclusive > 0 && (
                          <span className="text-amber-400 font-medium ml-1.5">
                            &bull; {run.summary.inconclusive} Inconclusive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {run.commitHash.substring(0, 7)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/projects/${projectId}/runs/${run.id}`}
                          className="font-medium text-sky-400 hover:text-sky-300"
                        >
                          View Report &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURATION & POLICY */}
        {activeTab === 'config' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Execution Sandbox Policy</h3>
              <p className="text-xs text-slate-400">
                Security constraints applied during the execution lifecycle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Isolation Mode</span>
                <span className="text-slate-400">
                  Local Process Sandbox (unprivileged user context, child process tree termination on timeout).
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Execution Timeout</span>
                <span className="text-slate-400">
                  {project.config.timeoutSecs || 45} seconds maximum runtime before forced process kill.
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Dedicated Port</span>
                <span className="text-slate-400 font-mono">
                  Port {project.config.port || 4173} (Isolated dynamic port allocation).
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block mb-1">Secret Redaction</span>
                <span className="text-slate-400">
                  Sensitive environment variables are stripped and redacted before passing to child processes.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 border border-dashed border-slate-800 text-xs text-slate-400">
              <strong className="text-slate-200">Security Disclaimer:</strong> PROOFix local sandbox runs in an unprivileged child process context on the host machine. Full cgroup memory/CPU limits and network isolation require running inside a containerized execution worker with Docker daemon.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-8 flex items-center justify-center">Loading project...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
