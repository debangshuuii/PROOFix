'use client';

import React, { useState } from 'react';

interface MockSpanView {
  id: string;
  name: string;
  kind: 'SERVER' | 'PRODUCER' | 'CONSUMER' | 'INTERNAL' | 'CLIENT';
  offsetMs: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, string | number>;
  events: Array<{ name: string; offsetMs: number }>;
}

interface MockTrace {
  traceId: string;
  testSuite: string;
  totalDurationMs: number;
  hasErrors: boolean;
  target: 'jaeger' | 'datadog' | 'tempo';
  spans: MockSpanView[];
}

const INITIAL_TRACES: MockTrace[] = [
  {
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    testSuite: 'E2E Checkout Flow',
    totalDurationMs: 412.5,
    hasErrors: false,
    target: 'jaeger',
    spans: [
      {
        id: 'span-001',
        name: 'hop:api_trigger',
        kind: 'SERVER',
        offsetMs: 0,
        durationMs: 45.2,
        status: 'OK',
        attributes: { 'http.method': 'POST', 'http.status_code': 202, 'http.route': '/api/v1/runs' },
        events: [{ name: 'payload_validated', offsetMs: 12 }],
      },
      {
        id: 'span-002',
        name: 'hop:outbox_publisher',
        kind: 'PRODUCER',
        offsetMs: 38.0,
        durationMs: 32.1,
        status: 'OK',
        attributes: { 'db.system': 'postgresql', 'messaging.destination': 'test_jobs_outbox' },
        events: [{ name: 'wal_flushed', offsetMs: 25 }],
      },
      {
        id: 'span-003',
        name: 'hop:queue_worker',
        kind: 'CONSUMER',
        offsetMs: 65.0,
        durationMs: 68.4,
        status: 'OK',
        attributes: { 'queue.partition': 2, 'worker.id': 'worker-us-east-1a' },
        events: [{ name: 'lease_renewed', offsetMs: 30 }],
      },
      {
        id: 'span-004',
        name: 'hop:sandbox_spawn',
        kind: 'INTERNAL',
        offsetMs: 128.0,
        durationMs: 95.0,
        status: 'OK',
        attributes: { 'sandbox.cgroup.memory_mb': 512, 'sandbox.cgroup.cpu_quota': '2.0' },
        events: [{ name: 'jail_mounted', offsetMs: 40 }],
      },
      {
        id: 'span-005',
        name: 'hop:playwright_run',
        kind: 'CLIENT',
        offsetMs: 215.0,
        durationMs: 197.5,
        status: 'OK',
        attributes: { 'browser.type': 'chromium', 'web_vitals.lcp_ms': 1180, 'web_vitals.cls': 0.015 },
        events: [
          { name: 'dom_content_loaded', offsetMs: 80 },
          { name: 'largest_contentful_paint', offsetMs: 140 },
        ],
      },
    ],
  },
];

export default function DistributedTraceWaterfall() {
  const [traces, setTraces] = useState<MockTrace[]>(INITIAL_TRACES);
  const [selectedTraceId, setSelectedTraceId] = useState<string>(INITIAL_TRACES[0].traceId);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>('span-005');
  const [exportTarget, setExportTarget] = useState<'jaeger' | 'datadog' | 'tempo'>('jaeger');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const activeTrace = traces.find((t) => t.traceId === selectedTraceId) || traces[0];
  const activeSpan = activeTrace?.spans.find((s) => s.id === selectedSpanId);

  const triggerLiveTraceSimulation = () => {
    setIsSimulating(true);
    const newTraceId = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const newTrace: MockTrace = {
      traceId: newTraceId,
      testSuite: 'Synthetic Chaos Monkey Audit',
      totalDurationMs: 520.0,
      hasErrors: false,
      target: exportTarget,
      spans: [
        {
          id: `s-${Date.now()}-1`,
          name: 'hop:api_trigger',
          kind: 'SERVER',
          offsetMs: 0,
          durationMs: 48,
          status: 'OK',
          attributes: { 'http.status_code': 200, 'w3c.traceparent': `00-${newTraceId}-01` },
          events: [],
        },
        {
          id: `s-${Date.now()}-2`,
          name: 'hop:outbox_publisher',
          kind: 'PRODUCER',
          offsetMs: 42,
          durationMs: 35,
          status: 'OK',
          attributes: { 'outbox.status': 'emitted' },
          events: [],
        },
        {
          id: `s-${Date.now()}-3`,
          name: 'hop:queue_worker',
          kind: 'CONSUMER',
          offsetMs: 72,
          durationMs: 75,
          status: 'OK',
          attributes: { 'queue.job': 'chaos-sweep' },
          events: [],
        },
        {
          id: `s-${Date.now()}-4`,
          name: 'hop:sandbox_spawn',
          kind: 'INTERNAL',
          offsetMs: 140,
          durationMs: 110,
          status: 'OK',
          attributes: { 'sandbox.mode': 'ephemeral_jail' },
          events: [],
        },
        {
          id: `s-${Date.now()}-5`,
          name: 'hop:playwright_run',
          kind: 'CLIENT',
          offsetMs: 245,
          durationMs: 275,
          status: 'OK',
          attributes: { 'browser.pages': 3, 'web_vitals.lcp_ms': 1420 },
          events: [{ name: 'dom_ready', offsetMs: 95 }],
        },
      ],
    };

    setTimeout(() => {
      setTraces([newTrace, ...traces]);
      setSelectedTraceId(newTraceId);
      setSelectedSpanId(newTrace.spans[4].id);
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔭</span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                OpenTelemetry Distributed Tracing Waterfall
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/80">
                W3C Trace Context Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Trace test execution across all 5 hops: API Trigger → Outbox Publisher → Queue Worker → Sandbox Spawn → Playwright Run.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={exportTarget}
              onChange={(e) => setExportTarget(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
            >
              <option value="jaeger">Jaeger OTLP (:4318)</option>
              <option value="datadog">Datadog APM</option>
              <option value="tempo">Grafana Tempo</option>
            </select>

            <button
              onClick={triggerLiveTraceSimulation}
              disabled={isSimulating}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2"
            >
              <span>{isSimulating ? '⏳' : '⚡'}</span> Simulate 5-Hop Test Trace
            </button>
          </div>
        </div>

        {/* Trace Metadata Bar */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Trace ID:</span>
            <span className="text-indigo-400 font-bold">{activeTrace.traceId}</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Suite: <strong className="text-white font-sans">{activeTrace.testSuite}</strong></span>
            <span>Duration: <strong className="text-emerald-400">{activeTrace.totalDurationMs}ms</strong></span>
            <span>Spans: <strong className="text-white">{activeTrace.spans.length}</strong></span>
            <span>Exported: <strong className="text-indigo-400 uppercase">{activeTrace.target}</strong></span>
          </div>
        </div>

        {/* Gantt Waterfall Visualizer */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>SPAN HIERARCHY & TIMELINE</span>
            <div className="flex items-center gap-8 font-mono">
              <span>0ms</span>
              <span>150ms</span>
              <span>300ms</span>
              <span>450ms</span>
              <span>{Math.round(activeTrace.totalDurationMs)}ms</span>
            </div>
          </div>

          <div className="space-y-3">
            {activeTrace.spans.map((span) => {
              const isSelected = selectedSpanId === span.id;
              const leftPercent = Math.min(95, (span.offsetMs / activeTrace.totalDurationMs) * 100);
              const widthPercent = Math.max(5, (span.durationMs / activeTrace.totalDurationMs) * 100);

              const kindColor =
                span.kind === 'SERVER'
                  ? 'bg-blue-500'
                  : span.kind === 'PRODUCER'
                  ? 'bg-purple-500'
                  : span.kind === 'CONSUMER'
                  ? 'bg-amber-500'
                  : span.kind === 'CLIENT'
                  ? 'bg-emerald-500'
                  : 'bg-cyan-500';

              return (
                <div
                  key={span.id}
                  onClick={() => setSelectedSpanId(span.id)}
                  className={`p-3 rounded-lg cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-800 border border-indigo-500'
                      : 'bg-slate-950/60 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className="w-64 shrink-0 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${kindColor}`} />
                    <span className="font-mono text-xs font-semibold text-white">
                      {span.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {span.kind}
                    </span>
                  </div>

                  {/* Waterfall Bar */}
                  <div className="flex-1 relative h-6 bg-slate-900/80 rounded-md overflow-hidden flex items-center">
                    <div
                      style={{
                        marginLeft: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      className={`h-4 rounded ${kindColor} opacity-90 transition-all flex items-center justify-end px-2`}
                    >
                      <span className="text-[10px] font-mono text-slate-950 font-bold">
                        {span.durationMs}ms
                      </span>
                    </div>

                    {span.events.map((ev, i) => (
                      <div
                        key={i}
                        title={ev.name}
                        style={{
                          left: `${leftPercent + (ev.offsetMs / activeTrace.totalDurationMs) * 100}%`,
                        }}
                        className="absolute w-2 h-2 rounded-full bg-white border border-slate-950 shadow"
                      />
                    ))}
                  </div>

                  <div className="w-20 text-right font-mono text-xs text-slate-400">
                    +{span.offsetMs}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Span Inspector Drawer */}
        {activeSpan && (
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white text-base">{activeSpan.name}</h3>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 font-mono">
                  {activeSpan.id}
                </span>
                <span className="px-2 py-0.5 text-xs rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  STATUS {activeSpan.status}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Duration: <strong className="text-white">{activeSpan.durationMs} ms</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Attributes (OTel Semantic Conventions)</h4>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs space-y-1 border border-slate-800/80">
                  {Object.entries(activeSpan.attributes).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-indigo-400">{k}:</span>
                      <span className="text-slate-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Span Events & Timestamps</h4>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs space-y-1 border border-slate-800/80">
                  {activeSpan.events.length > 0 ? (
                    activeSpan.events.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between text-slate-300">
                        <span>• {ev.name}</span>
                        <span className="text-slate-500">+{ev.offsetMs}ms</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600">No custom events recorded on this span.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
