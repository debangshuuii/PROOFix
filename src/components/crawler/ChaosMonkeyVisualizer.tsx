'use client';

import React, { useState } from 'react';

interface MockGraphNode {
  id: string;
  url: string;
  title: string;
  depth: number;
  anomaliesCount: number;
}

interface MockGraphEdge {
  from: string;
  to: string;
  action: string;
}

interface MockAnomaly {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  url: string;
  action: string;
}

const INITIAL_NODES: MockGraphNode[] = [
  { id: 'node-home', url: 'https://demo.proofix.dev/', title: 'Landing Page', depth: 0, anomaliesCount: 0 },
  { id: 'node-pricing', url: 'https://demo.proofix.dev/pricing', title: 'Pricing Matrix', depth: 1, anomaliesCount: 1 },
  { id: 'node-checkout', url: 'https://demo.proofix.dev/checkout', title: 'Checkout Drawer', depth: 2, anomaliesCount: 1 },
  { id: 'node-docs', url: 'https://demo.proofix.dev/docs', title: 'Documentation Hub', depth: 1, anomaliesCount: 0 },
];

const INITIAL_EDGES: MockGraphEdge[] = [
  { from: 'node-home', to: 'node-pricing', action: 'click a[href="/pricing"]' },
  { from: 'node-pricing', to: 'node-checkout', action: 'click button.choose-pro' },
  { from: 'node-home', to: 'node-docs', action: 'click a[href="/docs"]' },
];

const INITIAL_ANOMALIES: MockAnomaly[] = [
  {
    id: 'anom-01',
    type: 'layout_overflow',
    severity: 'high',
    message: 'Horizontal layout overflow: scrollWidth (1420px) exceeds innerWidth (1280px) by 140px',
    url: 'https://demo.proofix.dev/pricing',
    action: 'trigger_resize (width: 1280px)',
  },
  {
    id: 'anom-02',
    type: 'uncaught_exception',
    severity: 'critical',
    message: 'Uncaught TypeError: Cannot read properties of undefined (reading "cardBrand")',
    url: 'https://demo.proofix.dev/checkout',
    action: 'fill_random_payload: "><svg/onload=alert(1)> in input[name="cardNumber"]',
  },
];

export default function ChaosMonkeyVisualizer() {
  const [nodes, setNodes] = useState<MockGraphNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<MockGraphEdge[]>(INITIAL_EDGES);
  const [anomalies, setAnomalies] = useState<MockAnomaly[]>(INITIAL_ANOMALIES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-checkout');
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlLog, setCrawlLog] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const startChaosCrawl = () => {
    setIsCrawling(true);
    setCrawlLog('Autonomous Vision-Language crawler spawning Playwright Chromium instance...');

    setTimeout(() => {
      const newNodeId = `node-portal-${Date.now().toString().slice(-4)}`;
      const newNode: MockGraphNode = {
        id: newNodeId,
        url: `https://demo.proofix.dev/portal/settings`,
        title: 'Account Settings Drawer',
        depth: 2,
        anomaliesCount: 0,
      };

      const newEdge: MockGraphEdge = {
        from: 'node-home',
        to: newNodeId,
        action: 'click button#user-menu-toggle',
      };

      setNodes([...nodes, newNode]);
      setEdges([...edges, newEdge]);
      setSelectedNodeId(newNodeId);
      setIsCrawling(false);
      setCrawlLog('✅ Explored new UI state graph branch. Zero unhandled exceptions detected in newly found state.');
      setTimeout(() => setCrawlLog(null), 5000);
    }, 1200);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐒</span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Autonomous Exploratory "Chaos Monkey" AI Crawler
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950 text-rose-400 border border-rose-800/80">
                Adversarial Fuzzing Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Autonomous vision-language agent exploring arbitrary menus, injecting edge-case fuzzing payloads, and trapping zero-day errors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startChaosCrawl}
              disabled={isCrawling}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition flex items-center gap-2"
            >
              <span>{isCrawling ? '⏳' : '⚡'}</span> Launch Autonomous Chaos Sweep
            </button>
          </div>
        </div>

        {crawlLog && (
          <div className="p-4 rounded-xl bg-slate-900 border border-rose-800/60 text-xs font-mono text-rose-300">
            {crawlLog}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">State Graph Nodes</div>
            <div className="text-2xl font-bold text-white mt-1">{nodes.length} States</div>
            <div className="text-xs text-indigo-400 mt-1">Deterministic state hashes</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Action Transitions</div>
            <div className="text-2xl font-bold text-white mt-1">{edges.length} Edges</div>
            <div className="text-xs text-slate-400 mt-1">Shortest-path reproduction ready</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Anomalies Trapped</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{anomalies.length} Zero-Days</div>
            <div className="text-xs text-rose-400 mt-1">1 Critical JS error, 1 Layout shift</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Fuzzing Diversity</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">6 Vectors</div>
            <div className="text-xs text-slate-400 mt-1">XSS, SQLi, RTLO, Emojis, Overflows</div>
          </div>
        </div>

        {/* State Graph Visualizer */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Application UI State Graph G = (V, E)
            </h2>
            <span className="text-xs text-slate-500">Click node to inspect exploratory steps</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Depth #{node.depth}</span>
                    {node.anomaliesCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950 text-rose-400 border border-rose-800">
                        {node.anomaliesCount} Anomaly
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-white text-sm mt-2">{node.title}</div>
                  <div className="text-xs font-mono text-indigo-400 truncate mt-1">{node.url}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomalies Sentinel Feed */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            🚨 Autonomous Zero-Day & Exception Detections
          </h3>

          <div className="space-y-3">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-rose-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-950 text-rose-300 border border-rose-800">
                      {anom.type}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{anom.url}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-200">{anom.message}</div>
                  <div className="text-xs text-slate-500">
                    Triggered by: <span className="font-mono text-slate-400">{anom.action}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700">
                    Replay Sequence
                  </button>
                  <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-700">
                    Generate PR Patch
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
