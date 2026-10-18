'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SystemSettings } from '@/lib/types';
import {
  Settings as SettingsIcon,
  Sparkles,
  FolderGit2,
  Cpu,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    aiProvider: 'offline',
    sandboxMemoryLimitMb: 1024,
    sandboxTimeoutSecs: 45,
    allowOutboundNetwork: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form keys
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [githubToken, setGithubToken] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/settings');
        const json = await res.json();
        if (res.ok && json.settings) {
          setSettings(json.settings);
          setGeminiKey(json.settings.geminiApiKey || '');
          setOpenaiKey(json.settings.openaiApiKey || '');
          setAnthropicKey(json.settings.anthropicApiKey || '');
          setGithubToken(json.settings.githubToken || '');
        }
      } catch (err) {
        console.error('Failed loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          geminiApiKey: geminiKey,
          openaiApiKey: openaiKey,
          anthropicApiKey: anthropicKey,
          githubToken,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed saving settings');

      setSettings(json.settings);
      setGeminiKey(json.settings.geminiApiKey || '');
      setOpenaiKey(json.settings.openaiApiKey || '');
      setAnthropicKey(json.settings.anthropicApiKey || '');
      setGithubToken(json.settings.githubToken || '');

      setMessage({ type: 'success', text: 'System settings & security configuration saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="pb-6 border-b border-slate-800 mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-sky-400" />
            PROOFix System Configuration & Integrations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure AI reasoning models, GitHub credentials, and sandbox execution resource boundaries.
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-lg border text-xs mb-6 flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: AI Provider Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">AI Reasoning & Diagnosis Provider</h2>
            </div>
            <p className="text-xs text-slate-400">
              Select which engine formulates root-cause hypotheses and produces patch diffs from test failure evidence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              {[
                { id: 'offline', name: 'Deterministic Rule Engine', note: 'No API key needed (Offline)' },
                { id: 'gemini', name: 'Google Gemini 2.0', note: 'Fast & accurate' },
                { id: 'openai', name: 'OpenAI (GPT-4o)', note: 'Industry standard' },
                { id: 'anthropic', name: 'Anthropic Claude', note: 'Detailed analysis' },
              ].map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => setSettings({ ...settings, aiProvider: provider.id as any })}
                  className={`p-3.5 rounded-lg border cursor-pointer text-xs transition-all ${
                    settings.aiProvider === provider.id
                      ? 'bg-sky-950/60 border-sky-600 text-white shadow-sm ring-1 ring-sky-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">{provider.name}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{provider.note}</div>
                </div>
              ))}
            </div>

            {/* API Keys based on provider */}
            <div className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: GitHub Integration */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-slate-300" />
              <h2 className="text-base font-bold text-white">GitHub Integration</h2>
            </div>
            <p className="text-xs text-slate-400">
              Provide a Personal Access Token to import private repositories and create issue workflows. Tokens are encrypted and never exposed to the client.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GitHub Personal Access Token (classic or fine-grained)
              </label>
              <input
                type="password"
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Section 3: Sandbox Policies */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Execution Sandbox & Resource Limits</h2>
            </div>
            <p className="text-xs text-slate-400">
              Boundaries enforced on tested applications during Playwright verification.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Execution Timeout (Seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={settings.sandboxTimeoutSecs}
                  onChange={(e) =>
                    setSettings({ ...settings, sandboxTimeoutSecs: parseInt(e.target.value, 10) || 45 })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Memory Quota Limit (MB)
                </label>
                <input
                  type="number"
                  min={256}
                  max={4096}
                  value={settings.sandboxMemoryLimitMb}
                  onChange={(e) =>
                    setSettings({ ...settings, sandboxMemoryLimitMb: parseInt(e.target.value, 10) || 1024 })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
