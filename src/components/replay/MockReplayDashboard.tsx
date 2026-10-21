'use client';

import React, { useState, useEffect } from 'react';
import type {
  TrafficCassette,
  MockReplaySession,
  ReplayMode,
  FaultInjectionRule,
  CassetteInteraction,
} from '@/lib/types/mock-replay';
import {
  RotateCcw,
  Play,
  CircleDot,
  Radio,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Database,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface MockReplayDashboardProps {
  runId?: string;
  initialSession?: MockReplaySession;
}

export function MockReplayDashboard({
  runId = 'run_sample_replay',
  initialSession,
}: MockReplayDashboardProps) {
  const [session, setSession] = useState<MockReplaySession | null>(initialSession || null);
  const [loading, setLoading] = useState<boolean>(!initialSession);
  const [activeMode, setActiveMode] = useState<ReplayMode>(initialSession?.mode || 'replay');
  const [cassette, setCassette] = useState<TrafficCassette | null>(initialSession?.cassette || null);
  const [expandedInteractions, setExpandedInteractions] = useState<Record<string, boolean>>({});
  const [faultRules, setFaultRules] = useState<FaultInjectionRule[]>([
    {
      id: 'fault_stripe_429',
      name: 'Stripe 429 Rate Limit (Retry-After: 60s)',
      enabled: false,
      targetProvider: 'stripe',
      faultType: 'rate_limit_429',
      params: { retryAfterSecs: 60 },
    },
    {
      id: 'fault_stripe_503',
      name: 'Stripe 503 Gateway Outage',
      enabled: false,
      targetProvider: 'stripe',
      faultType: 'http_status_override',
      params: { statusCode: 503, statusText: 'Service Unavailable' },
    },
    {
      id: 'fault_delay_500',
      name: 'Simulate 500ms Network Jitter',
      enabled: true,
      faultType: 'delay_latency',
      params: { delayMs: 500 },
    },
  ]);

  useEffect(() => {
    if (initialSession) return;

    fetch(`/api/v1/replay?runId=${encodeURIComponent(runId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSession(data.session);
          setActiveMode(data.session.mode);
          if (data.session.cassette) setCassette(data.session.cassette);
        } else if (data.cassettes && data.cassettes.length > 0) {
          setCassette(data.cassettes[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [runId, initialSession]);

  const toggleInteraction = (id: string) => {
    setExpandedInteractions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleFaultRule = (ruleId: string) => {
    setFaultRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const changeMode = async (mode: ReplayMode) => {
    setActiveMode(mode);
    try {
      await fetch('/api/v1/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          action: 'start',
          options: { mode, cassetteId: cassette?.name || 'stripe' },
        }),
      });
    } catch {}
  };

  // Sample fallback cassette if none loaded
  const displayCassette: TrafficCassette = cassette || {
    id: 'cas_demo_01',
    name: 'stripe-checkout-verification',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scope: 'verification_run',
    interactions: [
      {
        id: 'int_1',
        order: 1,
        provider: 'stripe',
        request: {
          method: 'POST',
          url: 'https://api.stripe.com/v1/payment_intents',
          path: '/v1/payment_intents',
          queryParams: {},
          headers: {
            authorization: 'Bearer [SCRUBBED_STRIPE_KEY]',
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: 'amount=4999&currency=usd&payment_method=pm_card_visa',
          timestamp: new Date().toISOString(),
        },
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
            object: 'payment_intent',
            amount: 4999,
            currency: 'usd',
            status: 'succeeded',
            client_secret: 'pi_3MtwBw_secret_test',
          }),
          durationMs: 78,
        },
        timesReplayed: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'int_2',
        order: 2,
        provider: 'github',
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/owner/repo/pulls/42',
          path: '/repos/owner/repo/pulls/42',
          queryParams: {},
          headers: { accept: 'application/vnd.github.v3+json' },
          timestamp: new Date().toISOString(),
        },
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '4950' },
          body: JSON.stringify({ number: 42, state: 'open', title: 'fix: validation guard' }),
          durationMs: 42,
        },
        timesReplayed: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    metadata: {
      recordedBy: 'PROOFix Replay Engine',
      totalInteractions: 2,
      providers: ['stripe', 'github'],
      scrubbedSecretsCount: 2,
    },
  };

  const totalHits = session?.stats?.cassetteHits ?? 2;
  const totalMisses = session?.stats?.cassetteMisses ?? 0;
  const totalCalls = totalHits + totalMisses;
  const hitRate = totalCalls > 0 ? Math.round((totalHits / totalCalls) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Database className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                Deterministic Mock Service & Third-Party Replay
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero Network Flakiness
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Eliminate external API dependency failures (Stripe, GitHub, OpenAI, Twilio) by replaying recorded traffic cassettes deterministically with zero network calls and chaos fault injection.
            </p>
          </div>
        </div>

        {/* Mode Selector Pill Buttons */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
          {(['replay', 'record', 'auto', 'passthrough'] as ReplayMode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeMode === m
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Replay Hit Rate</span>
          <div className="text-2xl font-bold text-emerald-400">{hitRate}%</div>
          <span className="text-[11px] text-slate-500">{totalHits} hits / {totalMisses} misses</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Cassette</span>
          <div className="text-sm font-bold text-slate-200 truncate">{displayCassette.name}</div>
          <span className="text-[11px] text-slate-500">{displayCassette.interactions.length} interactions saved</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Scrubbed Credentials</span>
          <div className="text-2xl font-bold text-indigo-400">{displayCassette.metadata?.scrubbedSecretsCount || 0}</div>
          <span className="text-[11px] text-slate-500">API keys & bearer tokens masked</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Chaos Rules</span>
          <div className="text-2xl font-bold text-amber-400">{faultRules.filter((r) => r.enabled).length}</div>
          <span className="text-[11px] text-slate-500">Simulating third-party failures</span>
        </div>
      </div>

      {/* Main Grid: Left Interactions List, Right Chaos Injections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recorded Interactions Cassette Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Cassette Interactions ({displayCassette.interactions.length})
              </span>
              <div className="flex items-center gap-1.5">
                {displayCassette.metadata?.providers.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Interaction Cards Accordion */}
            <div className="space-y-3 pt-1">
              {displayCassette.interactions.map((int) => {
                const isExpanded = !!expandedInteractions[int.id];

                return (
                  <div
                    key={int.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden"
                  >
                    {/* Header */}
                    <div
                      onClick={() => toggleInteraction(int.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            int.request.method === 'GET'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {int.request.method}
                        </span>

                        <span className="font-mono text-xs text-slate-200 font-semibold truncate max-w-md">
                          {int.request.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-500">{int.response.durationMs}ms</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            int.response.statusCode >= 200 && int.response.statusCode < 300
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          HTTP {int.response.statusCode}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Request/Response Details */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-slate-800/60 mt-2 space-y-3 text-xs">
                        {/* Request Headers & Body */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Recorded Request (Scrubbed)</span>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                            {Object.entries(int.request.headers).map(([k, v]) => (
                              <div key={k} className="text-slate-400 truncate">
                                <span className="text-indigo-400">{k}:</span> {v}
                              </div>
                            ))}
                            {int.request.body && (
                              <div className="pt-2 text-sky-300 border-t border-slate-800 overflow-x-auto whitespace-pre-wrap">
                                {int.request.body}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Response Body */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Deterministic Replay Response</span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {int.response.body}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Chaos & Fault Injection Controller */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Chaos & Fault Injector
              </span>
              <span className="text-[11px] text-slate-500">Live Resilience Simulation</span>
            </div>

            <p className="text-xs text-slate-400">
              Toggle simulated third-party outages and rate limits to verify your application handles upstream failures gracefully:
            </p>

            <div className="space-y-2.5 pt-1">
              {faultRules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => toggleFaultRule(rule.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    rule.enabled
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-200">{rule.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {rule.targetProvider ? `Provider: ${rule.targetProvider}` : rule.faultType}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.enabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {rule.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
