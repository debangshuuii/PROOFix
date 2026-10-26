'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Eye,
  Activity,
  Layers,
  MousePointerClick,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { globalSoundSynthesizer } from '@/lib/sound/sound-synthesizer';

interface ClickRipple {
  id: string;
  x: number;
  y: number;
  label: string;
  timestamp: number;
}

export function LiveInteractiveCanvas() {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isStreaming, setIsStreaming] = useState(true);
  const [fps, setFps] = useState(60);
  const [latencyMs, setLatencyMs] = useState(18);
  const [activeRoute, setActiveRoute] = useState('/checkout');
  const [activeSelector, setActiveSelector] = useState('button#checkout');
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set initial mute state from synthesizer
  useEffect(() => {
    setIsMuted(globalSoundSynthesizer.getMuted());
  }, []);

  const toggleMute = () => {
    const muted = globalSoundSynthesizer.toggleMute();
    setIsMuted(muted);
  };

  // Automated simulated Chromium click ripples during verification
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const simulatedTargets = [
        { x: 380, y: 190, label: 'input[name="email"]', route: '/checkout' },
        { x: 420, y: 260, label: 'input[name="cardNumber"]', route: '/checkout' },
        { x: 480, y: 340, label: 'button#checkout', route: '/checkout' },
        { x: 512, y: 410, label: 'a[href="/order/confirm"]', route: '/order/confirm' },
      ];

      const target = simulatedTargets[Math.floor(Math.random() * simulatedTargets.length)];
      triggerRipple(target.x, target.y, target.label);
      setActiveSelector(target.label);
      setActiveRoute(target.route);
      globalSoundSynthesizer.playClickTick();
    }, 2800);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const triggerRipple = (x: number, y: number, label: string) => {
    const newRipple: ClickRipple = {
      id: `ripple_${Date.now()}_${Math.random()}`,
      x,
      y,
      label,
      timestamp: Date.now(),
    };
    setRipples((prev) => [...prev.slice(-4), newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1800);
  };

  const handleManualCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    triggerRipple(x, y, `manual_click @ (${x}, ${y})`);
    globalSoundSynthesizer.playClickTick();
  };

  // Viewport dimensions
  const dimensions =
    viewport === 'desktop'
      ? { width: '100%', maxWidth: '840px', height: '420px', label: '1280x720' }
      : viewport === 'tablet'
      ? { width: '100%', maxWidth: '580px', height: '440px', label: '768x1024' }
      : { width: '100%', maxWidth: '340px', height: '480px', label: '375x667' };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Top Bar / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-inner">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Live Chromium Canvas Stream</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                STREAMING 60 FPS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive WebRTC/Canvas mirror capturing real-time Playwright Chromium execution.
            </p>
          </div>
        </div>

        {/* Viewport & Audio Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Mute Toggle */}
          <button
            onClick={toggleMute}
            type="button"
            title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes (M)'}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Viewport Switcher */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/70 p-0.5">
            <button
              onClick={() => setViewport('desktop')}
              type="button"
              className={`p-1.5 rounded-md text-xs font-semibold transition ${
                viewport === 'desktop' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Desktop (1280x720)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              type="button"
              className={`p-1.5 rounded-md text-xs font-semibold transition ${
                viewport === 'tablet' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tablet (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              type="button"
              className={`p-1.5 rounded-md text-xs font-semibold transition ${
                viewport === 'mobile' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mobile (375x667)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsStreaming(!isStreaming)}
            type="button"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white transition"
            title={isStreaming ? 'Pause Stream' : 'Resume Stream'}
          >
            {isStreaming ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Canvas Stream Window */}
      <div className="py-5 flex justify-center items-center bg-slate-950/40 rounded-xl my-4 border border-slate-800/60 overflow-hidden">
        <div
          onClick={handleManualCanvasClick}
          style={{ width: dimensions.width, maxWidth: dimensions.maxWidth, height: dimensions.height }}
          className="relative bg-slate-950 rounded-lg border border-slate-700/80 shadow-2xl overflow-hidden cursor-crosshair select-none transition-all duration-300 flex flex-col"
        >
          {/* Simulated Browser Top Bar */}
          <div className="h-8 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="px-3 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-sky-300 truncate max-w-[280px]">
              http://localhost:3000{activeRoute}
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <span>{latencyMs}ms</span>
              <span>&bull;</span>
              <span>{dimensions.label}</span>
            </div>
          </div>

          {/* Canvas Render Area */}
          <div className="flex-1 relative flex flex-col justify-center items-center p-6 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950">
            {/* Mock Application UI Wireframe */}
            <div className="w-full max-w-sm space-y-3 pointer-events-none opacity-85">
              <div className="h-4 bg-slate-800/80 rounded w-1/3" />
              <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 shadow space-y-2.5">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-8 bg-slate-950 rounded border border-slate-800 flex items-center px-3 text-slate-500 text-xs font-mono">
                  alex.dev@example.com
                </div>
                <div className="h-8 bg-slate-950 rounded border border-slate-800 flex items-center px-3 text-slate-500 text-xs font-mono">
                  •••• •••• •••• 4242
                </div>
                <div
                  className={`h-9 rounded-md flex items-center justify-center font-semibold text-xs transition duration-200 ${
                    activeSelector === 'button#checkout'
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-102 ring-2 ring-sky-300'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  Confirm & Pay $49.00
                </div>
              </div>
            </div>

            {/* Click Ripple Pulses */}
            {ripples.map((ripple) => (
              <div
                key={ripple.id}
                style={{ left: ripple.x, top: ripple.y }}
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
              >
                {/* Concentric expanding ripples */}
                <span className="w-10 h-10 rounded-full border-2 border-sky-400 bg-sky-400/25 animate-ping absolute" />
                <span className="w-4 h-4 rounded-full bg-sky-400 shadow-lg shadow-sky-400/80 relative" />

                {/* Tag label */}
                <span className="mt-2 px-2 py-0.5 rounded bg-slate-950/90 border border-sky-500 text-sky-300 text-[10px] font-mono whitespace-nowrap shadow-xl">
                  {ripple.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom Stream Telemetry Bar */}
          <div className="h-7 bg-slate-950 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
              <span>Target:</span>
              <code className="text-sky-300 font-mono text-[10px]">{activeSelector}</code>
            </div>

            <div className="text-slate-500 font-mono text-[10px]">
              Click canvas to inject coordinates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
