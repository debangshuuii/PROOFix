'use client';

/**
 * Code Snippet Tabs Component
 *
 * Displays multi-language code snippets (cURL, JavaScript, Python, Node.js)
 * with syntax styling and one-click clipboard copying.
 */

import React, { useState } from 'react';
import type { ApiDocEndpoint, CodeLanguage } from '@/lib/types/docs';
import { CodeSnippetGenerator } from '@/lib/docs/snippet-generator';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeSnippetTabsProps {
  endpoint: ApiDocEndpoint;
  apiKey?: string;
}

export function CodeSnippetTabs({ endpoint, apiKey = 'prfx_live_abc123' }: CodeSnippetTabsProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('curl');
  const [copied, setCopied] = useState<boolean>(false);

  const snippet = CodeSnippetGenerator.generate(endpoint, selectedLanguage, 'https://api.proofix.dev', apiKey);

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages: Array<{ id: CodeLanguage; label: string }> = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python', label: 'Python' },
    { id: 'node', label: 'Node.js' },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
      {/* Tab Header */}
      <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <div className="flex items-center gap-1">
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code snippet to clipboard"
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Block */}
      <div className="p-3.5 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950/80">
        <pre className="whitespace-pre">{snippet}</pre>
      </div>
    </div>
  );
}
