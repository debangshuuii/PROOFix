'use client';

import React from 'react';
import { PlaygroundBadge } from './PlaygroundBadge';
import { PlaygroundScenarioSelector } from './PlaygroundScenarioSelector';
import { Zap, ShieldCheck, Terminal, Sparkles } from 'lucide-react';

interface PlaygroundSectionProps {
  className?: string;
  id?: string;
}

export function PlaygroundSection({ className = '', id = 'playground' }: PlaygroundSectionProps) {
  return (
    <section id={id} className={`relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}>
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-sky-500/10 via-indigo-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Header Container */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <PlaygroundBadge label="Zero-Setup Interactive Sandbox" />
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Don&apos;t take our word for it.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
            Prove it in 10 seconds.
          </span>
        </h2>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Select any real-world defect scenario below to simulate PROOFix&apos;s full 11-stage
          verification pipeline, AST-grounded AI diagnosis, and post-patch self-healing loop.
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant In-Browser Execution</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Docker or API Keys Needed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Playwright Chromium Telemetry</span>
          </div>
        </div>
      </div>

      {/* Interactive Scenario Selector & Grid */}
      <PlaygroundScenarioSelector />
    </section>
  );
}
