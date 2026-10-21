'use client';

import React, { useState, useEffect, useRef } from 'react';
import type {
  CompanionExecutionState,
  CompanionSession,
  CompanionTelemetryEvent,
  ViewportFramePayload,
  DomMutationRecord,
} from '@/lib/types/live-companion';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  CircleDot,
  Radio,
  Layers,
  Terminal,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sliders,
  Tv,
} from 'lucide-react';

interface LiveCompanionDashboardProps {
  runId?: string;
  session?: CompanionSession;
}

export function LiveCompanionDashboard({
  runId = 'run_sample_101',
  session,
}: LiveCompanionDashboardProps) {
  const [executionState, setExecutionState] = useState<CompanionExecutionState>('paused');
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [totalSteps, setTotalSteps] = useState<number>(7);
  const [currentFrameUrl, setCurrentFrameUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<CompanionTelemetryEvent[]>([
    {
      id: 'e1',
      runId,
      type: 'step_start',
      timestamp: new Date().toISOString(),
      payload: { stepIndex: 1, actionType: 'navigate', url: 'https://app.proofix.dev' },
    },
    {
      id: 'e2',
      runId,
      type: 'console_log',
      timestamp: new Date().toISOString(),
      payload: { text: '[INFO] Hydrated Root React component in 142ms' },
    },
    {
      id: 'e3',
      runId: runId,
      type: 'dom_mutation',
      timestamp: new Date().toISOString(),
      payload: { stepIndex: 2, mutation: { type: 'childList', targetSelector: 'div.product-grid', addedNodesCount: 6 } },
    },
    {
      id: 'e4',
      runId,
      type: 'state_change',
      timestamp: new Date().toISOString(),
      payload: { state: 'breakpoint_hit', stepIndex: 3, reason: 'Hit breakpoint before click button#add-to-cart' },
    },
  ]);
  const [breakpoints, setBreakpoints] = useState([
    { id: 'bp_1', stepIndex: 3, actionType: 'click', condition: 'always', enabled: true },
    { id: 'bp_fail', condition: 'on_failure', enabled: true },
    { id: 'bp_route', condition: 'url_match', targetPattern: '/checkout', enabled: false },
  ]);
  const [activeTab, setActiveTab] = useState<'stream' | 'mutations' | 'breakpoints'>('stream');

  // Connect to SSE stream if in browser
  useEffect(() => {
    if (!runId) return;

    try {
      const eventSource = new EventSource(`/api/v1/runs/${runId}/live`);

      eventSource.onmessage = (e) => {
        try {
          const data: CompanionTelemetryEvent = JSON.parse(e.data);
          setEvents((prev) => [...prev.slice(-100), data]);

          if (data.type === 'state_change') {
            if (data.payload.state) setExecutionState(data.payload.state);
            if (data.payload.stepIndex) setCurrentStep(data.payload.stepIndex);
          } else if (data.type === 'viewport_frame') {
            const frame: ViewportFramePayload = data.payload as any;
            if (frame?.dataUrl) {
              setCurrentFrameUrl(frame.dataUrl);
            }
          }
        } catch {}
      };

      return () => {
        eventSource.close();
      };
    } catch {}
  }, [runId]);

  const dispatchAction = async (action: string, params: Record<string, any> = {}) => {
    try {
      const res = await fetch(`/api/v1/runs/${runId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
      const data = await res.json();
      if (data.state) {
        setExecutionState(data.state);
      }
    } catch {
      // Local preview fallback
      if (action === 'pause') setExecutionState('paused');
      if (action === 'resume') setExecutionState('running');
      if (action === 'step_next') {
        setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
        setExecutionState('paused');
      }
    }
  };

  const toggleBreakpoint = (id: string) => {
    setBreakpoints((prev) =>
      prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-bold text-2xl ${
              executionState === 'running'
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : executionState === 'breakpoint_hit'
                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
            }`}
          >
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Real-Time Interactive Companion & Live Browser Mirror
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                  executionState === 'running'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : executionState === 'breakpoint_hit'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {executionState.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Inspect Playwright execution in real time: stream screencast frames, pause on failure, step forward through browser journey actions, and monitor live DOM mutations.
            </p>
          </div>
        </div>

        {/* Stepper Control Button Toolbar */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
          {executionState === 'running' ? (
            <button
              onClick={() => dispatchAction('pause')}
              className="px-4 py-2 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-2 transition"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button
              onClick={() => dispatchAction('resume')}
              className="px-4 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          )}

          <button
            onClick={() => dispatchAction('step_next')}
            disabled={executionState === 'running'}
            className="px-4 py-2 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-2 transition"
          >
            <StepForward className="w-4 h-4" /> Step Next
          </button>
        </div>
      </div>

      {/* Main Companion Layout: Left Screen Mirror, Right Telemetry Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Canvas Browser Mirror */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                Live Screencast Mirror (Step {currentStep} of {totalSteps})
              </span>
              <span className="text-slate-400 font-mono text-[11px]">1280x800 @ 15 FPS</span>
            </div>

            {/* Screen Canvas Container */}
            <div className="relative w-full h-88 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {currentFrameUrl ? (
                <img
                  src={currentFrameUrl}
                  alt="Live Browser Screencast"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Activity className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Live Browser Mirroring Connected</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Streaming viewport frames via Server-Sent Events. Headless Chromium session active at step #{currentStep}.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Screencast Channel Active
                  </div>
                </div>
              )}

              {/* Step HUD Overlay */}
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-slate-950/85 backdrop-blur border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-400 font-bold">Step #{currentStep}</span>
                  <span className="text-slate-300">Click &quot;button#add-to-cart&quot;</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {executionState === 'paused' || executionState === 'breakpoint_hit' ? 'Execution Paused' : 'Running'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Telemetry Stream, Mutations, and Breakpoints */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('stream')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  activeTab === 'stream' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telemetry ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('mutations')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  activeTab === 'mutations' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DOM
              </button>
              <button
                onClick={() => setActiveTab('breakpoints')}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  activeTab === 'breakpoints' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Breakpoints ({breakpoints.filter((b) => b.enabled).length})
              </button>
            </div>

            {/* TAB 1: Real-Time Telemetry Log Stream */}
            {activeTab === 'stream' && (
              <div className="space-y-1.5 font-mono text-[11px] max-h-80 overflow-y-auto text-slate-300">
                {events.map((evt) => (
                  <div key={evt.id} className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-start gap-2">
                    <span
                      className={`px-1 rounded text-[9px] font-bold uppercase ${
                        evt.type === 'state_change'
                          ? 'bg-amber-500/10 text-amber-400'
                          : evt.type === 'step_start'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {evt.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-300 truncate">
                      {evt.payload.reason || evt.payload.text || evt.payload.actionType || JSON.stringify(evt.payload)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: DOM Mutation Records */}
            {activeTab === 'mutations' && (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-indigo-300">div.product-grid</div>
                  <div className="text-[11px] text-slate-400">+6 elements added to cart grid</div>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-indigo-300">button#checkout</div>
                  <div className="text-[11px] text-slate-400">Attribute disabled set to &quot;false&quot;</div>
                </div>
              </div>
            )}

            {/* TAB 3: Breakpoints */}
            {activeTab === 'breakpoints' && (
              <div className="space-y-2 text-xs">
                {breakpoints.map((bp) => (
                  <div
                    key={bp.id}
                    onClick={() => toggleBreakpoint(bp.id)}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {bp.stepIndex ? `Step #${bp.stepIndex} (${bp.actionType || 'any'})` : bp.condition}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {bp.targetPattern ? `Pattern: ${bp.targetPattern}` : 'Unconditional'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        bp.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {bp.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
