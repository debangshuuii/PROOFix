'use client';

import React, { useState } from 'react';
import type {
  SemanticVisionAuditResult,
  SemanticVisualDefect,
  LayoutShiftExplanation,
} from '@/lib/types/semantic-vision';
import {
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Maximize2,
  Layers,
  Sparkles,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Info,
} from 'lucide-react';

interface SemanticVisionReportProps {
  result?: SemanticVisionAuditResult;
  onDismissDefect?: (defectId: string) => void;
}

export function SemanticVisionReport({
  result,
  onDismissDefect,
}: SemanticVisionReportProps) {
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'annotated' | 'candidate' | 'baseline'>('annotated');
  const [dismissedDefectIds, setDismissedDefectIds] = useState<Set<string>>(new Set());
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Default benchmark fallback data
  const currentResult: SemanticVisionAuditResult = result || {
    id: 'vis_audit_demo_01',
    runId: 'run_sample_101',
    testId: 'test_checkout_responsive',
    baselineImageUrl: '/assets/sample-baseline.png',
    candidateImageUrl: '/assets/sample-candidate.png',
    defects: [
      {
        id: 'def_overlap_01',
        category: 'element_overlap',
        severity: 'critical',
        title: 'Mobile Navigation Overlay Obscures Checkout CTA',
        explanation: 'The fixed navigation drawer obscures 64px of the primary "Place Order" button, rendering it unclickable on mobile viewports.',
        boundingBox: { x: 80, y: 380, width: 280, height: 75, unit: 'px' },
        confidenceScore: 96,
        suggestedRemediation: 'Apply z-index: 50 with an explicit click-away backdrop on the drawer container.',
      },
      {
        id: 'def_clip_02',
        category: 'text_clipping',
        severity: 'medium',
        title: 'Price Subtotal Truncated',
        explanation: 'Currency string "$1,299.00 USD" overflows table cell container and is cut off after "$1,299".',
        boundingBox: { x: 380, y: 190, width: 90, height: 28, unit: 'px' },
        confidenceScore: 92,
        suggestedRemediation: 'Increase column flex-basis or change whitespace to nowrap with tooltip.',
      },
      {
        id: 'def_image_03',
        category: 'broken_image_placeholder',
        severity: 'high',
        title: 'Product Thumbnail Failed to Render',
        explanation: 'Image element displays default broken image icon and gray rectangle instead of product asset.',
        boundingBox: { x: 40, y: 160, width: 64, height: 64, unit: 'px' },
        confidenceScore: 98,
        suggestedRemediation: 'Provide fallback onError image handler with standard placeholder graphic.',
      },
    ],
    layoutShifts: [
      {
        culpritElement: 'img.hero-banner',
        displacementPx: 120,
        direction: 'down',
        explanation: 'Hero image uploaded at 2000px without explicit width/height dimensions, pushing down main navigation 120px. Fix: Specify explicit width and height or CSS aspect-ratio: 16/9.',
      },
    ],
    overallScore: 68,
    hasVisualRegressions: true,
    evaluatedAt: new Date().toISOString(),
  };

  const handleDismiss = (id: string) => {
    setDismissedDefectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (onDismissDefect) onDismissDefect(id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippet(text);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const activeDefects = currentResult.defects.filter((d) => !dismissedDefectIds.has(d.id));
  const activeDefect = currentResult.defects.find((d) => d.id === selectedDefectId) || currentResult.defects[0];

  return (
    <div className="space-y-6">
      {/* Top Health Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-bold text-2xl ${
              currentResult.overallScore >= 90
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : currentResult.overallScore >= 70
                ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                : 'text-rose-400 border-rose-500/30 bg-rose-500/10'
            }`}
          >
            {currentResult.overallScore}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Semantic Vision-AI Visual Regression
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                  currentResult.hasVisualRegressions && activeDefects.length > 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {currentResult.hasVisualRegressions && activeDefects.length > 0 ? 'Regressions Detected' : 'Visually Pristine'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Multimodal vision models inspect candidate screenshots for human-perceivable UI defects (clipping, overlap, broken media, and layout shifts) while filtering subpixel anti-aliasing noise.
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveViewMode('annotated')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeViewMode === 'annotated'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Annotated Defect Map
          </button>
          <button
            onClick={() => setActiveViewMode('candidate')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeViewMode === 'candidate'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Candidate Run
          </button>
          <button
            onClick={() => setActiveViewMode('baseline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeViewMode === 'baseline'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Golden Master
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Defect Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Defect List & Layout Shift Cards */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Detected UI Flaws ({activeDefects.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                {dismissedDefectIds.size} dismissed
              </span>
            </div>

            <div className="space-y-2">
              {currentResult.defects.map((defect) => {
                const isSelected = (activeDefect?.id === defect.id);
                const isDismissed = dismissedDefectIds.has(defect.id);

                return (
                  <div
                    key={defect.id}
                    onClick={() => setSelectedDefectId(defect.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-xs relative ${
                      isDismissed
                        ? 'opacity-40 border-slate-800 bg-slate-950/20'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-md'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          defect.severity === 'critical'
                            ? 'bg-rose-500/10 text-rose-400'
                            : defect.severity === 'high'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-sky-500/10 text-sky-400'
                        }`}
                      >
                        {defect.severity}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {defect.confidenceScore}% confidence
                      </span>
                    </div>

                    <div className="font-semibold text-slate-200 mb-1">{defect.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{defect.explanation}</p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400">
                        {defect.category.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(defect.id);
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        {isDismissed ? 'Restore' : 'Dismiss (Acceptable)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Layout Shift Diagnostics Drawer */}
          {currentResult.layoutShifts.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Layout Shift Root Causes ({currentResult.layoutShifts.length})
              </h3>
              <div className="space-y-2">
                {currentResult.layoutShifts.map((shift, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-amber-300">
                      <span>{shift.culpritElement || 'Culprit Element'}</span>
                      <span>+{shift.displacementPx}px {shift.direction}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{shift.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 2 Cols: Annotated Screen Canvas & Remediation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                Visual Inspection Canvas ({activeViewMode})
              </span>
              <span>Click any defect on the left to highlight its bounding box</span>
            </div>

            {/* Simulated Visual Frame */}
            <div className="relative w-full h-80 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-4">
              <div className="w-full h-full rounded-lg bg-slate-900/50 border border-dashed border-slate-800 relative flex flex-col justify-between p-4">
                {/* Header mock */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="w-24 h-4 rounded bg-slate-800" />
                  <div className="flex gap-2">
                    <div className="w-12 h-3 rounded bg-slate-800" />
                    <div className="w-12 h-3 rounded bg-slate-800" />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 py-4 flex items-center justify-around gap-4">
                  <div className="w-32 h-24 rounded-lg bg-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
                    Product Hero
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 rounded bg-slate-700" />
                    <div className="w-1/2 h-3 rounded bg-slate-800" />
                    <div className="w-1/3 h-3 rounded bg-slate-800" />
                  </div>
                </div>

                {/* Bounding Box Highlights (Annotated Mode) */}
                {activeViewMode === 'annotated' && activeDefect?.boundingBox && (
                  <div
                    className="absolute border-2 border-rose-500 bg-rose-500/10 rounded pointer-events-none transition-all duration-300"
                    style={{
                      left: '20%',
                      top: '35%',
                      width: '55%',
                      height: '35%',
                    }}
                  >
                    <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-bold shadow-lg">
                      {activeDefect.category}: {activeDefect.confidenceScore}%
                    </div>
                  </div>
                )}

                {/* Footer mock */}
                <div className="w-full pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>PROOFix Vision Viewport: 1280x800</span>
                  <span>Anti-aliasing noise: Filtered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remediation Guide */}
          {activeDefect?.suggestedRemediation && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  AI Suggested Remediation ({activeDefect.title})
                </span>
                <button
                  onClick={() => copyToClipboard(activeDefect.suggestedRemediation || '')}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSnippet ? 'Copied' : 'Copy Fix'}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-800">
                {activeDefect.suggestedRemediation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
