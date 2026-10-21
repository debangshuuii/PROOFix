'use client';

import React, { useState } from 'react';
import type {
  QueueMetrics,
  WorkerInfo,
  DeadLetterEntry,
  JobPriority,
} from '@/lib/types/queue-database';
import {
  Layers,
  Activity,
  Cpu,
  Server,
  RefreshCw,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Zap,
} from 'lucide-react';

export function DistributedQueueDashboard() {
  const [queues, setQueues] = useState<QueueMetrics[]>([
    {
      queueName: 'playwright-runs',
      pendingCount: 4,
      activeCount: 3,
      delayedCount: 1,
      completedCount: 142,
      failedCount: 2,
      dlqCount: 1,
      throughputPerSec: 18.5,
      averageLatencyMs: 38,
    },
    {
      queueName: 'semantic-vision-diffs',
      pendingCount: 2,
      activeCount: 2,
      delayedCount: 0,
      completedCount: 88,
      failedCount: 0,
      dlqCount: 0,
      throughputPerSec: 9.2,
      averageLatencyMs: 82,
    },
    {
      queueName: 'api-fuzz-probes',
      pendingCount: 0,
      activeCount: 1,
      delayedCount: 0,
      completedCount: 350,
      failedCount: 5,
      dlqCount: 2,
      throughputPerSec: 45.0,
      averageLatencyMs: 12,
    },
    {
      queueName: 'self-healing-prs',
      pendingCount: 1,
      activeCount: 0,
      delayedCount: 0,
      completedCount: 24,
      failedCount: 1,
      dlqCount: 0,
      throughputPerSec: 2.1,
      averageLatencyMs: 410,
    },
  ]);

  const [workers, setWorkers] = useState<WorkerInfo[]>([
    {
      id: 'wrk_playwright_1_a4f',
      queueName: 'playwright-runs',
      status: 'busy',
      currentJobId: 'job_172901_e2e_checkout',
      jobsProcessed: 64,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      lastHeartbeat: '2s ago',
    },
    {
      id: 'wrk_playwright_2_b9c',
      queueName: 'playwright-runs',
      status: 'idle',
      jobsProcessed: 78,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      lastHeartbeat: '1s ago',
    },
    {
      id: 'wrk_vision_1_c8d',
      queueName: 'semantic-vision-diffs',
      status: 'busy',
      currentJobId: 'job_172902_vis_header',
      jobsProcessed: 88,
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      lastHeartbeat: 'just now',
    },
  ]);

  const [dlqEntries, setDlqEntries] = useState<DeadLetterEntry[]>([
    {
      id: 'dlq_job_998_fatal',
      originalJob: {
        id: 'job_998',
        queueName: 'playwright-runs',
        tenantId: 'tenant-enterprise',
        data: { spec: 'payment-3ds-challenge.spec.ts' },
        priority: 'critical',
        state: 'quarantined_dlq',
        attempts: 3,
        maxRetries: 3,
        backoff: { type: 'exponential_jitter', baseDelayMs: 1000, maxDelayMs: 30000, maxRetries: 3 },
        createdAt: new Date(Date.now() - 1200000).toISOString(),
      },
      failedReason: 'Target closed: Browser crash / unhandled memory ceiling',
      quarantinedAt: new Date(Date.now() - 600000).toISOString(),
      replayedCount: 0,
    },
  ]);

  const [newJobQueue, setNewJobQueue] = useState<string>('playwright-runs');
  const [newJobPriority, setNewJobPriority] = useState<JobPriority>('high');
  const [newJobData, setNewJobData] = useState<string>('{"spec": "login-flow.spec.ts"}');
  const [dispatchStatus, setDispatchStatus] = useState<string>('');

  const handleDispatch = () => {
    try {
      const parsed = JSON.parse(newJobData);
      setQueues((prev) =>
        prev.map((q) => (q.queueName === newJobQueue ? { ...q, pendingCount: q.pendingCount + 1 } : q))
      );
      setDispatchStatus(`Job enqueued with ${newJobPriority} priority!`);
      setTimeout(() => setDispatchStatus(''), 3000);
    } catch {
      setDispatchStatus('Error: Payload must be valid JSON');
    }
  };

  const handleRedriveDlq = (dlqId: string) => {
    setDlqEntries((prev) => prev.filter((e) => e.id !== dlqId));
    setQueues((prev) =>
      prev.map((q) =>
        q.queueName === 'playwright-runs'
          ? { ...q, dlqCount: Math.max(0, q.dlqCount - 1), pendingCount: q.pendingCount + 1 }
          : q
      )
    );
  };

  const handlePurgeDlq = () => {
    setDlqEntries([]);
    setQueues((prev) => prev.map((q) => ({ ...q, dlqCount: 0 })));
  };

  const totalPending = queues.reduce((acc, q) => acc + q.pendingCount, 0);
  const totalActive = queues.reduce((acc, q) => acc + q.activeCount, 0);
  const totalDlq = queues.reduce((acc, q) => acc + q.dlqCount, 0);
  const totalThroughput = queues.reduce((acc, q) => acc + q.throughputPerSec, 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Distributed Queue & Database Architecture
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                At-Least-Once Delivery
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Priority FIFO queuing, transactional outbox relays, visibility timeouts, and DLQ quarantine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Cluster Sharding Active
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Queue Depth</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{totalPending} pending</div>
          <div className="text-xs text-slate-500 mt-1">{totalActive} in-flight active</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Throughput</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalThroughput.toFixed(1)} ops/s</div>
          <div className="text-xs text-slate-500 mt-1">Across 4 worker pools</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dead Letter Queue</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{totalDlq} quarantined</div>
          <div className="text-xs text-slate-500 mt-1">Exhausted max retries</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Latency</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">42 ms</div>
          <div className="text-xs text-slate-500 mt-1">Lease to ACK cycle</div>
        </div>
      </div>

      {/* Main Grid: Queue Matrix + Worker Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Multi-Queue Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Active Queue Pipeline</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3">Queue Name</th>
                    <th className="pb-3 text-right">Pending</th>
                    <th className="pb-3 text-right">Active</th>
                    <th className="pb-3 text-right">Completed</th>
                    <th className="pb-3 text-right">DLQ</th>
                    <th className="pb-3 text-right">Throughput</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {queues.map((q) => (
                    <tr key={q.queueName} className="hover:bg-slate-800/30">
                      <td className="py-3 font-semibold text-slate-200">{q.queueName}</td>
                      <td className="py-3 text-right text-blue-400">{q.pendingCount}</td>
                      <td className="py-3 text-right text-emerald-400">{q.activeCount}</td>
                      <td className="py-3 text-right text-slate-300">{q.completedCount}</td>
                      <td className="py-3 text-right text-amber-400">{q.dlqCount}</td>
                      <td className="py-3 text-right text-purple-400">{q.throughputPerSec} /s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dead Letter Queue Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Dead-Letter Queue Quarantine ({dlqEntries.length})
              </h2>
              {dlqEntries.length > 0 && (
                <button
                  onClick={handlePurgeDlq}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Purge All DLQ
                </button>
              )}
            </div>

            {dlqEntries.length > 0 ? (
              <div className="space-y-3">
                {dlqEntries.map((entry) => (
                  <div key={entry.id} className="p-3.5 bg-slate-950/60 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-300">{entry.id}</span>
                      <button
                        onClick={() => handleRedriveDlq(entry.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Redrive Job
                      </button>
                    </div>
                    <div className="text-xs text-red-300 mt-1 font-mono">{entry.failedReason}</div>
                    <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center gap-4">
                      <span>Queue: {entry.originalJob.queueName}</span>
                      <span>Attempts: {entry.originalJob.attempts} / {entry.originalJob.maxRetries}</span>
                      <span>Quarantined: {new Date(entry.quarantinedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No poisoned jobs quarantined in DLQ. All queue partitions healthy!
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Workers & Interactive Dispatcher */}
        <div className="space-y-6">
          {/* Worker Status Pool */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Worker Coordinator</h2>

            <div className="space-y-3">
              {workers.map((wrk) => (
                <div key={wrk.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-300">{wrk.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        wrk.status === 'busy'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {wrk.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 font-mono">
                    Queue: <span className="text-slate-400">{wrk.queueName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Processed: {wrk.jobsProcessed}</span>
                    <span>Heartbeat: {wrk.lastHeartbeat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Job Dispatcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              Enqueue Job Probe
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Queue</label>
                <select
                  value={newJobQueue}
                  onChange={(e) => setNewJobQueue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="playwright-runs">playwright-runs</option>
                  <option value="semantic-vision-diffs">semantic-vision-diffs</option>
                  <option value="api-fuzz-probes">api-fuzz-probes</option>
                  <option value="self-healing-prs">self-healing-prs</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Priority</label>
                <select
                  value={newJobPriority}
                  onChange={(e) => setNewJobPriority(e.target.value as JobPriority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="critical">Critical (P1)</option>
                  <option value="high">High (P2)</option>
                  <option value="normal">Normal (P3)</option>
                  <option value="low">Low (P4)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">JSON Payload</label>
                <textarea
                  value={newJobData}
                  onChange={(e) => setNewJobData(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <button
                onClick={handleDispatch}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow transition"
              >
                <Play className="w-3.5 h-3.5" />
                Dispatch to Queue
              </button>

              {dispatchStatus && (
                <div className="p-2 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-center rounded">
                  {dispatchStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
