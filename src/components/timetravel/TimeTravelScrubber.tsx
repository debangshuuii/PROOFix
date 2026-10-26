'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Layers,
  Terminal,
  Globe,
  Code2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { globalTimeTravelEngine, TimeTravelFrame } from '@/lib/timetravel/timetravel-engine';
import { globalSoundSynthesizer } from '@/lib/sound/sound-synthesizer';
import { globalKeyboardShortcuts } from '@/lib/shortcuts/keyboard-shortcuts';

export function TimeTravelScrubber() {
  const [currentMs, setCurrentMs] = useState<number>(1850);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'dom' | 'logs' | 'network'>('dom');

  const totalDuration = globalTimeTravelEngine.getTotalDurationMs();
  const { currentFrame, activeLogs, activeNetwork, progress } =
    globalTimeTravelEngine.getStateAtOffset(currentMs);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const increment = intervalMs * playbackSpeed;

    const timer = setInterval(() => {
      setCurrentMs((prev) => {
        if (prev + increment >= totalDuration) {
          setIsPlaying(false);
          globalSoundSynthesizer.playSuccessChime();
          return totalDuration;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Hook into global keyboard shortcuts
  useEffect(() => {
    const unregister = globalKeyboardShortcuts.register((action) => {
      if (action === 'toggle_playback') {
        setIsPlaying((prev) => !prev);
      } else if (action === 'step_backward') {
        handleStepBack();
      } else if (action === 'step_forward') {
        handleStepForward();
      }
    });

    return () => unregister();
  }, [totalDuration]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMs = Number(e.target.value);
    setCurrentMs(newMs);
    globalSoundSynthesizer.playClickTick();
  };

  const handleStepBack = () => {
    setCurrentMs((prev) => Math.max(0, prev - 250));
    globalSoundSynthesizer.playClickTick();
  };

  const handleStepForward = () => {
    setCurrentMs((prev) => Math.min(totalDuration, prev + 250));
    globalSoundSynthesizer.playClickTick();
  };

  const jumpToKeyframe = (offsetMs: number) => {
    setCurrentMs(offsetMs);
    globalSoundSynthesizer.playClickTick();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Time-Travel Execution Scrubber</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                FRAME-SYNCHRONIZED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Scrub backward and forward to inspect DOM, network, and console state at any millisecond.
            </p>
          </div>
        </div>

        {/* Current Timestamp & Hotkey hints */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-sky-400 font-bold">
            {currentMs}ms
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{totalDuration}ms</span>
        </div>
      </div>

      {/* Scrubber Timeline Bar */}
      <div className="space-y-2 pt-2">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="10"
            value={currentMs}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-sky-500 transition-all focus:outline-none"
          />
        </div>

        {/* Keyframe Markers */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
          <button onClick={() => jumpToKeyframe(0)} className="hover:text-sky-400 transition">
            0ms (Init)
          </button>
          <button onClick={() => jumpToKeyframe(950)} className="hover:text-sky-400 transition">
            950ms (Hydrate)
          </button>
          <button onClick={() => jumpToKeyframe(1850)} className="hover:text-sky-400 transition">
            1850ms (Click)
          </button>
          <button onClick={() => jumpToKeyframe(2750)} className="hover:text-rose-400 transition">
            2750ms (Error 404)
          </button>
          <button onClick={() => jumpToKeyframe(3850)} className="hover:text-emerald-400 transition">
            3850ms (Healed)
          </button>
        </div>
      </div>

      {/* Scrubber Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentMs(0)}
            type="button"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
            title="Reset to 0ms"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleStepBack}
            type="button"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
            title="Step Back 250ms (ArrowLeft)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            type="button"
            className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
          </button>
          <button
            onClick={handleStepForward}
            type="button"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
            title="Step Forward 250ms (ArrowRight)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Speed:</span>
          <div className="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-xs">
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                type="button"
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  playbackSpeed === spd ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Frame Details & Synchronized Inspector */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        {/* Step Banner */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            {currentFrame.status === 'passed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-slate-200">{currentFrame.stepTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Keyframe offset: {currentFrame.offsetMs}ms &bull; Target:{' '}
                {currentFrame.activeSelector || 'N/A'}
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              currentFrame.status === 'passed'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}
          >
            {currentFrame.status}
          </span>
        </div>

        {/* Synchronized Inspector Tabs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1 text-xs">
            <button
              onClick={() => setActiveTab('dom')}
              className={`pb-1 flex items-center gap-1.5 transition ${
                activeTab === 'dom'
                  ? 'border-b-2 border-sky-400 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>DOM Snapshot</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-1 flex items-center gap-1.5 transition ${
                activeTab === 'logs'
                  ? 'border-b-2 border-sky-400 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console Logs ({activeLogs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`pb-1 flex items-center gap-1.5 transition ${
                activeTab === 'network'
                  ? 'border-b-2 border-sky-400 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Network Waterfall ({activeNetwork.length})</span>
            </button>
          </div>

          {/* Inspector Content */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs max-h-40 overflow-y-auto">
            {activeTab === 'dom' && (
              <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">
                {currentFrame.domSnapshot}
              </pre>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-1.5">
                {activeLogs.length === 0 ? (
                  <span className="text-slate-600 italic">No logs emitted prior to {currentMs}ms.</span>
                ) : (
                  activeLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`text-[11px] flex items-start gap-2 ${
                        log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-600">[{log.timestampMs}ms]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-1.5">
                {activeNetwork.length === 0 ? (
                  <span className="text-slate-600 italic">No requests initiated prior to {currentMs}ms.</span>
                ) : (
                  activeNetwork.map((net) => (
                    <div
                      key={net.id}
                      className="text-[11px] flex items-center justify-between py-0.5 border-b border-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            net.status >= 400 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {net.method} {net.status}
                        </span>
                        <span className="text-slate-300 truncate max-w-[280px]">{net.url}</span>
                      </div>
                      <span className="text-slate-500">{net.durationMs}ms</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
