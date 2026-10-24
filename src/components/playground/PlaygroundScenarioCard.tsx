'use client';

import React from 'react';
import { ShoppingCart, Sparkles, ShieldAlert, ArrowRight, Clock, Zap, CheckCircle2 } from 'lucide-react';
import type { DemoScenarioContract } from '@/lib/playground/types';
import { PLAYGROUND_CATEGORIES, SEVERITY_BADGES } from '@/lib/playground/constants';
import { formatDurationMs, calculateConfidencePercentage } from '@/lib/playground/utils';

interface PlaygroundScenarioCardProps {
  scenario: DemoScenarioContract;
  onLaunch: (scenario: DemoScenarioContract) => void;
  onInspectDiff: (scenario: DemoScenarioContract) => void;
  isLaunching?: boolean;
}

export function PlaygroundScenarioCard({
  scenario,
  onLaunch,
  onInspectDiff,
  isLaunching = false,
}: PlaygroundScenarioCardProps) {
  const categoryConfig = PLAYGROUND_CATEGORIES[scenario.category];
  const severityConfig = SEVERITY_BADGES[scenario.fault.severity];

  const renderIcon = () => {
    switch (scenario.category) {
      case 'functional_e2e':
        return <ShoppingCart className="w-5 h-5 text-emerald-400" />;
      case 'framework_react':
        return <Sparkles className="w-5 h-5 text-sky-400" />;
      case 'security_preflight':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      default:
        return <Zap className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 flex flex-col justify-between hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300">
      <div>
        {/* Top Badges & Meta */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${categoryConfig.badgeColor}`}
          >
            {renderIcon()}
            <span>{categoryConfig.label}</span>
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${severityConfig.className}`}
          >
            {severityConfig.label}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors mb-1.5 flex items-center gap-2">
          {scenario.title}
        </h3>
        <p className="text-xs font-medium text-slate-400 mb-3">{scenario.subtitle}</p>
        <p className="text-xs text-slate-400/90 leading-relaxed mb-4 line-clamp-2">
          {scenario.description}
        </p>

        {/* Fault Highlight Box */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4">
          <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Target Defect:</span>
          </div>
          <p className="text-xs text-slate-300 font-mono line-clamp-2">
            {scenario.fault.headline}
          </p>
        </div>

        {/* Benchmark Pill Row */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/50 text-center">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Detection
            </div>
            <div className="text-xs font-bold text-white font-mono flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              {formatDurationMs(scenario.benchmark.detectionTimeMs)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              AI Confidence
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {calculateConfidencePercentage(scenario.benchmark.aiDiagnosisConfidence)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Pass Rate
            </div>
            <div className="text-xs font-bold text-sky-400 font-mono flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              100%
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {scenario.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onInspectDiff(scenario)}
          className="flex-1 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-all text-center"
        >
          Inspect Flaw & Diff
        </button>
        <button
          type="button"
          disabled={isLaunching}
          onClick={() => onLaunch(scenario)}
          className="flex-1 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
        >
          {isLaunching ? (
            <span>Simulating...</span>
          ) : (
            <>
              <span>Launch 10s Demo</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
