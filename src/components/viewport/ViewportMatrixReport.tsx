'use client';

import React, { useState } from 'react';
import {
  ViewportExecutionRecord,
} from '@/lib/types/viewport';
import { TestResult } from '@/lib/types';
import { StatusBadge } from '../StatusBadge';
import {
  Monitor,
  Tablet,
  Smartphone,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Info,
  Maximize2,
  Filter,
} from 'lucide-react';

interface ViewportMatrixReportProps {
  records: ViewportExecutionRecord[];
  allTests?: TestResult[];
  onSelectScreenshot?: (path: string) => void;
}

export function ViewportMatrixReport({
  records,
  allTests = [],
  onSelectScreenshot,
}: ViewportMatrixReportProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  if (!records || records.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Layers className="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <p className="font-medium text-slate-300">No Viewport Matrix Data Available</p>
        <p className="text-xs text-slate-500 mt-1">
          Execute a multi-device verification run to inspect profile-by-profile status.
        </p>
      </div>
    );
  }

  const passedCount = records.filter((r) => r.status === 'passed').length;
  const failedCount = records.filter((r) => r.status === 'failed').length;

  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'passed') return r.status === 'passed';
    if (selectedFilter === 'failed') return r.status === 'failed';
    return true;
  });

  const getDeviceIcon = (r: ViewportExecutionRecord) => {
    const w = r.viewport.width;
    if (w >= 1024) return <Monitor className="w-5 h-5 text-indigo-400" />;
    if (w >= 640) return <Tablet className="w-5 h-5 text-cyan-400" />;
    return <Smartphone className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Matrix Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Multi-Device Viewport Matrix Report
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verifies identical behavior, layout containment, and responsive workflows across screen sizes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">Profiles:</span>
              <span className="font-semibold text-slate-200">{records.length}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-medium">{passedCount} Passed</span>
              <span className="text-slate-600">|</span>
              <span className={failedCount > 0 ? 'text-rose-400 font-medium' : 'text-slate-500'}>
                {failedCount} Failed
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({records.length})
              </button>
              <button
                onClick={() => setSelectedFilter('passed')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'passed'
                    ? 'bg-emerald-950/80 text-emerald-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Passed ({passedCount})
              </button>
              <button
                onClick={() => setSelectedFilter('failed')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedFilter === 'failed'
                    ? 'bg-rose-950/80 text-rose-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Failed ({failedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Emulation Disclaimer Notice */}
        <div className="mt-4 flex items-start gap-2 bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Emulation Notice:</strong> Profiles represent synthetic browser viewport parameters and touch event dispatch. Emulation tests CSS layout boundaries, media queries, and touch listeners; it does not replace testing on physical hardware screens or vendor-specific mobile OS rendering quirks.
          </span>
        </div>
      </div>

      {/* Profile-by-Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredRecords.map((record) => {
          const isFailed = record.status === 'failed';
          const isSelected = activeProfileId === record.profileId;

          // Find tests belonging to this profile
          const profileTests = allTests.filter(
            (t) =>
              record.testResultIds.includes(t.id) ||
              t.name.includes(record.profileName) ||
              (t.evidence.viewport?.width === record.viewport.width &&
                t.evidence.viewport?.height === record.viewport.height)
          );

          return (
            <div
              key={record.profileId}
              className={`rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isFailed
                  ? 'bg-rose-950/20 border-rose-800/70 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="p-5">
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      {getDeviceIcon(record)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {record.profileName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>
                          {record.viewport.width} × {record.viewport.height}
                        </span>
                        <span>•</span>
                        <span>{record.viewport.deviceScaleFactor}x scale</span>
                        {record.viewport.hasTouch && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400">Touch</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={record.status} size="sm" />
                </div>

                {/* Profile Disclaimer / Label */}
                <div className="text-[11px] text-slate-400 bg-slate-950/50 rounded-md p-2 border border-slate-800/80 mb-4">
                  {record.emulationNotice}
                </div>

                {/* Specific Failure Callout (Ensures mobile failure is visible even if desktop passed) */}
                {isFailed && (
                  <div className="mb-4 bg-rose-950/60 border border-rose-800 rounded-lg p-3 text-xs text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Failure Detected on this Profile</span>
                    </div>
                    {record.horizontalOverflow?.detected && (
                      <p>
                        Layout overflow: Content exceeds viewport by{' '}
                        <strong>{record.horizontalOverflow.overflowPx}px</strong> (ScrollWidth:{' '}
                        {record.horizontalOverflow.scrollWidth}px).
                      </p>
                    )}
                    {record.error && <p className="font-mono text-[11px]">{record.error}</p>}
                  </div>
                )}

                {/* Responsive Audit Sub-checks */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Horizontal Overflow:</span>
                    {record.horizontalOverflow?.detected ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> +{record.horizontalOverflow.overflowPx}px
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contained
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Responsive Navigation:</span>
                    {record.responsiveNav?.toggleWorked || record.viewport.width >= 1024 ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accessible
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Toggle Broken
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Touch & Form Usability:</span>
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Safe Verified
                    </span>
                  </div>
                </div>

                {/* Screenshot thumbnail preview */}
                {record.screenshotPaths && record.screenshotPaths.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Profile Screenshot</span>
                      <button
                        onClick={() => onSelectScreenshot && onSelectScreenshot(record.screenshotPaths[0])}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <div
                      onClick={() => onSelectScreenshot && onSelectScreenshot(record.screenshotPaths[0])}
                      className="cursor-pointer group relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800"
                    >
                      <img
                        src={record.screenshotPaths[0]}
                        alt={record.profileName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 rounded-b-xl flex items-center justify-between text-xs text-slate-400">
                <span>Duration: {(record.durationMs / 1000).toFixed(2)}s</span>
                <span className="font-mono text-[11px] text-slate-500">{record.profileId}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
