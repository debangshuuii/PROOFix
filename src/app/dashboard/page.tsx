'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Project, VerificationRun } from '@/lib/types';
import {
  FolderGit2,
  Play,
  Plus,
  Search,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<VerificationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'github' | 'local_upload' | 'sample_fixture'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'archive' | 'sample'>('github');

  // Form states
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const projRes = await fetch('/api/v1/projects');
      const projJson = await projRes.json();
      setProjects(projJson.projects || []);

      // Fetch runs for first project or all
      if (projJson.projects?.length > 0) {
        const runsRes = await fetch(`/api/v1/projects/${projJson.projects[0].id}/runs`);
        const runsJson = await runsRes.json();
        setRuns(runsJson.runs || []);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (importType === 'sample') {
        const res = await fetch('/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName || 'PROOFix Multi-Route Testbed',
            description: 'Controlled verification fixture with known deterministic test conditions.',
            repoProvider: 'sample_fixture',
            localPath: 'src/fixtures/sample-app',
            config: { port: 4173, timeoutSecs: 30 },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed creating sample project');
        setShowImportModal(false);
        fetchData();
      } else if (importType === 'github') {
        const res = await fetch('/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName || repoUrl.split('/').pop() || 'Imported GitHub Project',
            repoUrl,
            repoProvider: 'github',
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed creating project');

        // Trigger GitHub import metadata fetch
        await fetch(`/api/v1/projects/${json.project.id}/imports/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
        });

        setShowImportModal(false);
        fetchData();
      } else if (importType === 'archive') {
        if (!archiveFile) throw new Error('Please select a .zip archive to upload');
        const projRes = await fetch('/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName || archiveFile.name.replace(/\.zip$/i, ''),
            repoProvider: 'local_upload',
          }),
        });
        const projJson = await projRes.json();
        if (!projRes.ok) throw new Error(projJson.error || 'Failed creating project');

        const formData = new FormData();
        formData.append('file', archiveFile);

        const uploadRes = await fetch(`/api/v1/projects/${projJson.project.id}/imports/archive`, {
          method: 'POST',
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || 'Archive extraction failed');

        setShowImportModal(false);
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.repoUrl && p.repoUrl.toLowerCase().includes(search.toLowerCase()));
    const matchesProvider =
      providerFilter === 'all' || p.repoProvider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.summary?.failed === 0 && r.status === 'completed').length;
  const failedRuns = runs.filter((r) => (r.summary?.failed || 0) > 0 || r.status === 'failed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Verification Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Active testbeds, execution telemetry, and persistent verification reports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setImportType('sample');
                setProjectName('Interactive Verification Testbed');
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-950 border border-indigo-800/60 hover:bg-indigo-900/60 text-indigo-300 font-medium text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Import Sample Testbed
            </button>

            <button
              onClick={() => {
                setImportType('github');
                setProjectName('');
                setRepoUrl('');
                setShowImportModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-md shadow-sky-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Monitored Projects</span>
              <FolderGit2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{projects.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Configured for execution sandbox</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Total Verification Runs</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{totalRuns}</div>
            <div className="text-[11px] text-slate-400 mt-1">Persistent Playwright test runs</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Passing Runs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{passedRuns}</div>
            <div className="text-[11px] text-slate-400 mt-1">Zero failures or uncaught errors</div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Failing Runs</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{failedRuns}</div>
            <div className="text-[11px] text-rose-400/80 mt-1">Requires evidence inspection & fixes</div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Active Projects</h2>
              <div className="flex items-center gap-1.5 mt-2">
                {[
                  { id: 'all', label: 'All Projects' },
                  { id: 'github', label: 'GitHub' },
                  { id: 'local_upload', label: 'Archives' },
                  { id: 'sample_fixture', label: 'Sample Testbeds' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProviderFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      providerFilter === tab.id
                        ? 'bg-slate-800 text-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64 self-start sm:self-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20">
              <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-medium text-slate-300">No matching projects found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Try refining your search keyword or clearing the provider filter.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setProviderFilter('all');
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const projectRuns = runs.filter((r) => r.projectId === project.id);
                const latestRun = projectRuns[0];

                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-base hover:text-sky-400 transition-colors">
                          <Link href={`/projects/${project.id}`}>{project.name}</Link>
                        </h3>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                          {project.repoProvider}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {project.description || 'No description provided.'}
                      </p>

                      {/* Latest run outcome */}
                      <div className="flex items-center gap-2 mb-3 text-xs">
                        <span className="text-[11px] text-slate-500">Last Check:</span>
                        {latestRun ? (
                          <StatusBadge status={latestRun.status} size="sm" />
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No runs yet</span>
                        )}
                      </div>

                      {project.repoUrl && (
                        <div className="text-[11px] text-slate-400 truncate font-mono mb-4 flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{project.repoUrl}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Runs: <strong className="text-slate-300">{projectRuns.length}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Verification Runs Table */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Verification Runs</h2>
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
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No verification runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        #{run.runNumber}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-medium">
                            {run.summary.passed} Passed
                          </span>
                          {run.summary.failed > 0 && (
                            <span className="text-rose-400 font-medium">
                              &bull; {run.summary.failed} Failed
                            </span>
                          )}
                          {run.summary.inconclusive > 0 && (
                            <span className="text-amber-400 font-medium">
                              &bull; {run.summary.inconclusive} Inconclusive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {run.commitHash.substring(0, 7)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/projects/${run.projectId}/runs/${run.id}`}
                          className="font-medium text-sky-400 hover:text-sky-300"
                        >
                          View Report &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Import / Create Project Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Import or Create Project</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-md bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Import Type Tabs */}
            <div className="grid grid-cols-3 gap-2 my-4 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setImportType('github')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  importType === 'github' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                GitHub
              </button>

              <button
                type="button"
                onClick={() => setImportType('archive')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  importType === 'archive' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Archive (.zip)
              </button>

              <button
                type="button"
                onClick={() => setImportType('sample')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  importType === 'sample' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sample Testbed
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder={importType === 'sample' ? 'PROOFix Multi-Route Testbed' : 'e.g. My Next.js Web App'}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {importType === 'github' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Public repositories do not require authentication. For private repositories, configure a GitHub token in Settings.
                  </p>
                </div>
              )}

              {importType === 'archive' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Project Archive (.zip)
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    required
                    onChange={(e) => setArchiveFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Maximum 50MB. Path traversal, unsafe symlinks, and zip bombs are strictly validated and rejected.
                  </p>
                </div>
              )}

              {importType === 'sample' && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  <div className="font-semibold text-slate-200 mb-1">Included Verification Benchmarks:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Root URL & interactive counter checks (Passing)</li>
                    <li>Navigation & multi-page router checks (Passing)</li>
                    <li>Dead link 404 detector (/broken-route) (Failing)</li>
                    <li>Backend API 500 error handler (/api/data) (Failing)</li>
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Create & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
