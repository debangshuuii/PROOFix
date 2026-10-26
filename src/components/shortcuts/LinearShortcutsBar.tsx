'use client';

import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Command,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react';
import { globalSoundSynthesizer } from '@/lib/sound/sound-synthesizer';
import { globalKeyboardShortcuts, ShortcutAction } from '@/lib/shortcuts/keyboard-shortcuts';

export function LinearShortcutsBar() {
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(globalSoundSynthesizer.getMuted());

    const unregister = globalKeyboardShortcuts.register((action: ShortcutAction) => {
      setActiveShortcut(action);
      setTimeout(() => setActiveShortcut(null), 1200);

      if (action === 'toggle_audio') {
        const muted = globalSoundSynthesizer.toggleMute();
        setIsMuted(muted);
      }
    });

    return () => unregister();
  }, []);

  const playChimeSample = (type: 'success' | 'failure' | 'heal') => {
    if (type === 'success') globalSoundSynthesizer.playSuccessChime();
    else if (type === 'failure') globalSoundSynthesizer.playFailureChime();
    else if (type === 'heal') globalSoundSynthesizer.playSelfHealChime();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300 backdrop-blur-md">
      {/* Shortcuts List */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
          <Keyboard className="w-4 h-4 text-sky-400" />
          <span>Shortcuts:</span>
        </div>

        {/* Cmd+Enter */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border text-[11px] font-mono transition ${
            activeShortcut === 'rerun_verification'
              ? 'border-sky-400 text-sky-300 ring-2 ring-sky-500/50 scale-105'
              : 'border-slate-800 text-slate-300'
          }`}
        >
          <kbd className="font-semibold">⌘↵</kbd>
          <span className="text-slate-500">Rerun</span>
        </div>

        {/* Cmd+K */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <kbd className="font-semibold">⌘K</kbd>
          <span className="text-slate-500">Palette</span>
        </div>

        {/* Cmd+D */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border text-[11px] font-mono transition ${
            activeShortcut === 'toggle_diff'
              ? 'border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/50 scale-105'
              : 'border-slate-800 text-slate-300'
          }`}
        >
          <kbd className="font-semibold">⌘D</kbd>
          <span className="text-slate-500">Diff</span>
        </div>

        {/* Space */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border text-[11px] font-mono transition ${
            activeShortcut === 'toggle_playback'
              ? 'border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50 scale-105'
              : 'border-slate-800 text-slate-300'
          }`}
        >
          <kbd className="font-semibold">Space</kbd>
          <span className="text-slate-500">Scrubber</span>
        </div>

        {/* Arrow Keys */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <kbd className="font-semibold">&larr; &rarr;</kbd>
          <span className="text-slate-500">Step</span>
        </div>
      </div>

      {/* Audio Chime Previews */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-[11px] hidden sm:inline">Chimes:</span>
        <button
          onClick={() => playChimeSample('success')}
          type="button"
          className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-900/60 transition"
          title="Play Linear-grade success chime"
        >
          Success ♫
        </button>
        <button
          onClick={() => playChimeSample('heal')}
          type="button"
          className="px-2 py-0.5 rounded bg-sky-950/70 border border-sky-800/80 text-sky-400 text-[10px] font-semibold hover:bg-sky-900/60 transition"
          title="Play self-heal magic arpeggio"
        >
          Heal ♫
        </button>
        <button
          onClick={() => playChimeSample('failure')}
          type="button"
          className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-400 text-[10px] font-semibold hover:bg-rose-900/60 transition"
          title="Play warning chime"
        >
          Warning ♫
        </button>

        <button
          onClick={() => {
            const muted = globalSoundSynthesizer.toggleMute();
            setIsMuted(muted);
          }}
          type="button"
          className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
        </button>
      </div>
    </div>
  );
}
