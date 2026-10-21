'use client';

import React, { useState, useEffect } from 'react';
import { TransportProtocol } from '@/lib/types/live-transport';

export default function RealtimeCompanionMirror() {
  const [protocol, setProtocol] = useState<TransportProtocol>('webrtc');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(3);
  const [fps, setFps] = useState<number>(60);
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number } | null>(null);
  const [lastAction, setLastAction] = useState<string>('await page.click("button#checkout")');

  useEffect(() => {
    // Dynamically adjust simulated latency based on protocol selection
    if (protocol === 'webrtc') {
      setLatencyMs(22 + Math.floor(Math.random() * 6));
      setFps(60);
    } else if (protocol === 'websocket') {
      setLatencyMs(45 + Math.floor(Math.random() * 12));
      setFps(55);
    } else {
      setLatencyMs(135 + Math.floor(Math.random() * 30));
      setFps(30);
    }
  }, [protocol]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setClickCoord({ x, y });
    setLastAction(`Injected mouse click @ (${x}, ${y}) via ${protocol.toUpperCase()}`);
    setTimeout(() => setClickCoord(null), 1500);
  };

  const handleStepOver = () => {
    setStepIndex((prev) => prev + 1);
    setLastAction(`Step Over executed -> Step #${stepIndex + 1}`);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
    setLastAction(isPaused ? 'Resumed test execution' : 'Paused execution at breakpoint');
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪞</span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Ultra-Low Latency Live Companion Mirroring
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {latencyMs}ms Roundtrip
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              60 FPS canvas viewport streaming with WebRTC DataChannel & WebSocket bidirectional interactive step-debugging.
            </p>
          </div>

          {/* Transport Protocol Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['webrtc', 'websocket', 'sse'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  protocol === p
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'webrtc'
                  ? 'WebRTC (<30ms)'
                  : p === 'websocket'
                  ? 'WebSocket (<60ms)'
                  : 'SSE Fallback'}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Quality Telemetry HUD */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Transport Layer:</span>
            <div className="text-sm font-bold text-white uppercase">{protocol}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Frame Rate:</span>
            <div className="text-sm font-bold text-emerald-400">{fps} FPS</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">RTT Latency:</span>
            <div className="text-sm font-bold text-emerald-400">{latencyMs} ms</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Packet Loss:</span>
            <div className="text-sm font-bold text-white">0.00%</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Interactive Status:</span>
            <div className={`text-sm font-bold ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isPaused ? 'PAUSED (Breakpoint)' : 'STREAMING 60 FPS'}
            </div>
          </div>
        </div>

        {/* Viewport Mirror Canvas & Interactive Frame */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-slate-400 font-mono">
                Playwright Isolated Chromium (1280x800) • Step #{stepIndex}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isPaused ? '▶ Resume (F8)' : '⏸ Pause (F8)'}
              </button>
              <button
                onClick={handleStepOver}
                className="px-3 py-1 rounded-md text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                ↷ Step Over (F10)
              </button>
            </div>
          </div>

          {/* Interactive Mirrored Viewport Canvas */}
          <div
            onClick={handleCanvasClick}
            className="relative w-full h-[480px] bg-slate-950 flex flex-col items-center justify-center cursor-crosshair overflow-hidden select-none"
          >
            {/* Visual Viewport Simulation */}
            <div className="w-[85%] h-[80%] rounded-xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                    P
                  </div>
                  <span className="font-bold text-white text-base">PROOFix Checkout Experience</span>
                </div>
                <span className="text-xs font-mono text-emerald-400">200 OK • DOM Ready</span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Order Summary</div>
                  <div className="text-sm font-bold text-white">Enterprise Tier ($299/mo)</div>
                  <div className="text-xs text-slate-500">Includes live companion step debugging</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Payment Authorization</div>
                  <div className="text-xs font-mono text-indigo-300">•••• •••• •••• 4242</div>
                  <button className="w-full py-1.5 text-xs font-bold rounded bg-indigo-600 text-white">
                    Confirm & Complete
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Click anywhere on this canvas to inject live mouse events</span>
                <span className="font-mono text-slate-400">Target: #checkout-form</span>
              </div>
            </div>

            {/* Injected Click Pulse Indicator */}
            {clickCoord && (
              <div
                style={{ left: clickCoord.x - 12, top: clickCoord.y - 12 }}
                className="absolute w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-400/30 animate-ping pointer-events-none"
              />
            )}
          </div>

          {/* Action Log Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">Debugger Action:</span>
              <span className="text-slate-200">{lastAction}</span>
            </div>
            <span className="text-slate-500">Bidirectional channel active (&lt;50ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
