'use client';

import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';

interface PlaygroundDiffPreviewProps {
  patchDiff: string;
  targetFile: string;
  summary?: string;
  className?: string;
}

export function PlaygroundDiffPreview({
  patchDiff,
  targetFile,
  summary,
  className = '',
}: PlaygroundDiffPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(patchDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = patchDiff.split('\n');

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden text-xs font-mono ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 text-slate-300">
          <FileCode className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200">{targetFile}</span>
          {summary && (
            <span className="text-slate-500 hidden sm:inline text-[11px] font-sans">
              — {summary}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded border border-slate-700/60 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="font-sans">Copy Diff</span>
            </>
          )}
        </button>
      </div>

      {/* Diff Code Container */}
      <div className="p-3 overflow-x-auto space-y-0.5 leading-relaxed max-h-64 scrollbar-thin">
        {lines.map((line, idx) => {
          let lineClass = 'text-slate-400';
          let prefixBg = '';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineClass = 'text-emerald-300 bg-emerald-950/30';
            prefixBg = 'text-emerald-400 font-bold';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineClass = 'text-rose-300 bg-rose-950/30';
            prefixBg = 'text-rose-400 font-bold';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-sky-400 bg-sky-950/20 font-semibold';
          }

          return (
            <div key={idx} className={`flex items-start px-1.5 rounded ${lineClass}`}>
              <span className="w-6 select-none text-slate-600 text-[10px] shrink-0 text-right pr-2">
                {idx + 1}
              </span>
              <span className={`w-3 select-none shrink-0 ${prefixBg}`}>
                {line.startsWith('+') && !line.startsWith('+++')
                  ? '+'
                  : line.startsWith('-') && !line.startsWith('---')
                  ? '-'
                  : ' '}
              </span>
              <span className="whitespace-pre flex-1">
                {line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
