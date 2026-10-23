'use client';

/**
 * Terminal Header Component
 *
 * Displays terminal title, live execution pulse indicator, log line metrics,
 * and quick action buttons for copying or exporting log streams.
 */

import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, Radio } from 'lucide-react';

interface TerminalHeaderProps {
  runId: string;
  totalLines: number;
  filteredCount: number;
  isRunning?: boolean;
  onCopyLogs: () => void;
  onDownloadLogs: () => void;
}

export function TerminalHeader({
  runId,
  totalLines,
  filteredCount,
  isRunning = false,
  onCopyLogs,
  onDownloadLogs,
}: TerminalHeaderProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    onCopyLogs();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortRunId = runId.length > 8 ? runId.slice(0, 8) : runId;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
      {/* Title & Live Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono font-semibold text-slate-100">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span>Execution Console</span>
          <span className="text-[10px] text-slate-500 font-normal">#{shortRunId}</span>
        </div>

        {/* Live Streaming Indicator */}
        {isRunning ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-mono animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>LIVE STREAM</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono">
            <Radio className="w-3 h-3 text-slate-400" />
            <span>RECORDED</span>
          </div>
        )}
      </div>

      {/* Right Controls: Metrics, Copy, Download */}
      <div className="flex items-center gap-2.5">
        <div className="font-mono text-[11px] text-slate-400">
          {filteredCount !== totalLines ? (
            <span>
              <strong className="text-sky-400">{filteredCount}</strong> of {totalLines} lines
            </span>
          ) : (
            <span>{totalLines} lines</span>
          )}
        </div>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy logs to clipboard"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 text-slate-300 transition text-[11px]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          onClick={onDownloadLogs}
          aria-label="Download logs as text file"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700 text-slate-300 transition text-[11px]"
        >
          <Download className="w-3 h-3" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
