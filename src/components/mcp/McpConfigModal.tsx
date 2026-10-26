'use client';

import React, { useState } from 'react';
import { Bot, X, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpConfigModal({ isOpen, onClose }: McpConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor'>('claude');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const claudeSnippet = JSON.stringify({
    mcpServers: {
      proofix: {
        command: 'npx',
        args: ['-y', 'proofix', 'mcp'],
        env: { NODE_ENV: 'production' }
      }
    }
  }, null, 2);

  const cursorSnippet = JSON.stringify({
    proofix: {
      command: 'npx',
      args: ['-y', 'proofix', 'mcp']
    }
  }, null, 2);

  const snippet = activeTab === 'claude' ? claudeSnippet : cursorSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Model Context Protocol (MCP) Integration</h3>
              <p className="text-[11px] text-slate-400">Connect Cursor, Claude Code, & Antigravity to PROOFix</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('claude')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'claude' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Claude Desktop / Claude Code
            </button>
            <button
              onClick={() => setActiveTab('cursor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'cursor' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cursor AI / Windsurf
            </button>
          </div>

          <p className="text-slate-300">
            {activeTab === 'claude'
              ? 'Add this configuration to your claude_desktop_config.json file to expose PROOFix verification tools directly to Claude:'
              : 'Add this snippet to your Cursor MCP settings or .cursorrules to enable autonomous verification loops:'}
          </p>

          <div className="relative">
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto">
              {snippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
            <div><strong className="text-slate-200">Exposed Tools:</strong> proofix_run_route, proofix_diagnose_failure, proofix_prove_patch, proofix_doctor</div>
            <div><strong className="text-slate-200">Protocol:</strong> JSON-RPC 2.0 stdio (2024-11-05)</div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">Run: npx proofix mcp</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
