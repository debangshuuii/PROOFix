'use client';

/**
 * Documentation Header Component
 *
 * Displays API version badge, specification download buttons (.json and .yaml),
 * and global API Key input for authenticating Try-It-Out executions.
 */

import React, { useState } from 'react';
import { BookOpen, Download, Key, ShieldCheck, ExternalLink } from 'lucide-react';

interface DocsHeaderProps {
  apiKey: string;
  onChangeApiKey: (k: string) => void;
}

export function DocsHeader({ apiKey, onChangeApiKey }: DocsHeaderProps) {
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 py-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title & Badges */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">PROOFix Developer API</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80">
              OpenAPI 3.1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Autonomous verification, streaming execution logs, AST remediation diffs,
            and microVM isolation endpoints for third-party automation, CLI tooling, and CI pipelines.
          </p>
        </div>

        {/* Action Buttons: Spec Download & Auth Key */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Spec Downloads */}
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>openapi.json</span>
          </a>

          <a
            href="/api/v1/openapi.yaml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>openapi.yaml</span>
          </a>

          {/* Auth Key Button */}
          <button
            type="button"
            onClick={() => setShowKeyInput((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              apiKey
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'Authenticated' : 'Authorize API'}</span>
          </button>
        </div>
      </div>

      {/* Expandable API Key Input Panel */}
      {showKeyInput && (
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 shrink-0">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-semibold">Global API Key:</span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onChangeApiKey(e.target.value)}
            placeholder="Paste your X-PROOFix-Api-Key (e.g. prfx_live_...)"
            className="flex-1 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
          />
          {apiKey && (
            <button
              type="button"
              onClick={() => onChangeApiKey('')}
              className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300"
            >
              Clear Key
            </button>
          )}
        </div>
      )}
    </header>
  );
}
