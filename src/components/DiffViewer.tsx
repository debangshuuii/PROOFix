import React from 'react';

interface DiffViewerProps {
  diff: string;
  fileName?: string;
}

export function DiffViewer({ diff, fileName }: DiffViewerProps) {
  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
      {fileName && (
        <div className="bg-slate-900/90 px-3.5 py-1.5 border-b border-slate-800 text-slate-400 font-semibold flex items-center justify-between">
          <span>{fileName}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Unified Patch</span>
        </div>
      )}
      <div className="p-3 overflow-x-auto leading-relaxed">
        {lines.map((line, idx) => {
          let lineClass = 'text-slate-300';
          let bgClass = '';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineClass = 'text-emerald-400 font-medium';
            bgClass = 'bg-emerald-950/40 -mx-3 px-3 block';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineClass = 'text-rose-400 line-through opacity-80';
            bgClass = 'bg-rose-950/40 -mx-3 px-3 block';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-sky-400 italic';
            bgClass = 'bg-sky-950/20 -mx-3 px-3 block py-0.5';
          } else if (line.startsWith('---') || line.startsWith('+++')) {
            lineClass = 'text-slate-500 font-semibold';
          }

          return (
            <div key={idx} className={`${lineClass} ${bgClass} whitespace-pre`}>
              {line || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
}
