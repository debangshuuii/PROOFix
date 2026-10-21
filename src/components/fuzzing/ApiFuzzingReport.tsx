'use client';

import React, { useState, useEffect } from 'react';
import type {
  ApiFuzzingReport,
  ContractAnomaly,
  EndpointContract,
  AnomalySeverity,
} from '@/lib/types/api-fuzzing';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Code,
  Activity,
  Layers,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ApiFuzzingReportProps {
  runId?: string;
  initialReport?: ApiFuzzingReport;
}

export function ApiFuzzingReportView({
  runId = 'run_sample_fuzz',
  initialReport,
}: ApiFuzzingReportProps) {
  const [report, setReport] = useState<ApiFuzzingReport | null>(initialReport || null);
  const [loading, setLoading] = useState<boolean>(!initialReport);
  const [activeTab, setActiveTab] = useState<'anomalies' | 'endpoints' | 'spec'>('anomalies');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [expandedAnomalies, setExpandedAnomalies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialReport) return;

    fetch(`/api/v1/fuzzing?runId=${encodeURIComponent(runId)}`)
      .then((res) => res.json())
      .then((data: ApiFuzzingReport) => {
        setReport(data);
        setLoading(false);
        // Expand first 2 anomalies by default
        if (data.anomalies && data.anomalies.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          data.anomalies.slice(0, 2).forEach((a) => {
            initialExpanded[a.id] = true;
          });
          setExpandedAnomalies(initialExpanded);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [runId, initialReport]);

  const handleCopyCurl = (id: string, curl: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(curl);
      setCopiedCurlId(id);
      setTimeout(() => setCopiedCurlId(null), 2000);
    }
  };

  const toggleAnomaly = (id: string) => {
    setExpandedAnomalies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-4">
        <Activity className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">Auditing API endpoints with contract mutation fuzzing...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400">
        No API fuzzing audit data available for this run.
      </div>
    );
  }

  const { summary, anomalies, endpoints } = report;
  const filteredAnomalies = anomalies.filter((a) => {
    if (selectedSeverity === 'all') return true;
    return a.severity === selectedSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Health Score */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Circular Score Badge */}
          <div
            className={`w-18 h-18 rounded-2xl border-2 flex flex-col items-center justify-center ${
              summary.contractHealthScore >= 90
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : summary.contractHealthScore >= 70
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                : summary.contractHealthScore >= 50
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
          >
            <span className="text-2xl font-black">{summary.contractHealthScore}%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                API Fuzzing & Contract Boundary Security Audit
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {report.specTitle}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Probed {summary.totalEndpointsFuzzed} endpoints across {summary.totalRequestsExecuted} requests with boundary mutations, type confusion, SQLi probes, null bytes, and authentication tampering vectors.
            </p>
          </div>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span>{summary.criticalCount} Critical</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{summary.highCount} High</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>{summary.mediumCount} Medium</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
            <span>{summary.durationMs}ms</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'anomalies'
                ? 'bg-slate-800 text-rose-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomalies & Vulnerabilities ({anomalies.length})
          </button>
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'endpoints'
                ? 'bg-slate-800 text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audited Endpoints ({endpoints.length})
          </button>
          <button
            onClick={() => setActiveTab('spec')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'spec'
                ? 'bg-slate-800 text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fuzzing Configuration
          </button>
        </div>

        {/* Filter on Anomalies tab */}
        {activeTab === 'anomalies' && (
          <div className="flex items-center gap-1 text-xs">
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition ${
                  selectedSeverity === sev
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: ANOMALIES FEED */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          {filteredAnomalies.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <span className="font-semibold text-slate-200">No anomalies detected in selected severity.</span>
              <span className="text-xs text-slate-500">All fuzzed requests met contract boundaries.</span>
            </div>
          ) : (
            filteredAnomalies.map((anom) => {
              const isExpanded = !!expandedAnomalies[anom.id];

              return (
                <div
                  key={anom.id}
                  className={`rounded-2xl border transition-all ${
                    anom.severity === 'critical'
                      ? 'border-rose-900/60 bg-rose-950/10'
                      : anom.severity === 'high'
                      ? 'border-amber-900/60 bg-amber-950/10'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  {/* Header Row */}
                  <div
                    onClick={() => toggleAnomaly(anom.id)}
                    className="p-5 flex items-start justify-between cursor-pointer select-none hover:bg-slate-800/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="pt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              anom.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : anom.severity === 'high'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {anom.severity}
                          </span>

                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                            {anom.method} {anom.endpointPath}
                          </span>

                          {anom.cweId && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                              {anom.cweId}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-medium">
                            HTTP {anom.observedResponse.statusCode}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white pt-1">{anom.title}</h3>
                        <p className="text-xs text-slate-400">{anom.description}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-500 font-mono">
                      {anom.observedResponse.responseTimeMs}ms
                    </div>
                  </div>

                  {/* Expanded Body Details */}
                  {isExpanded && (
                    <div className="p-5 pt-0 border-t border-slate-800/60 mt-2 space-y-4">
                      {/* Curl Command Reproducer */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-sky-400" />
                            Reproduce with cURL:
                          </span>
                          <button
                            onClick={() => handleCopyCurl(anom.id, anom.reproducingRequest.curlCommand)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            {copiedCurlId === anom.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" /> Copy cURL
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto whitespace-pre-wrap">
                          {anom.reproducingRequest.curlCommand}
                        </pre>
                      </div>

                      {/* Response Snippet & Strategy */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Fuzz Strategy & Payload</span>
                          <div className="text-xs text-indigo-300 font-semibold">{anom.fuzzStrategy}</div>
                          <pre className="text-[10px] text-slate-400 font-mono truncate">{anom.fuzzPayloadSnippet}</pre>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Observed Response Snippet</span>
                          <div className="text-xs text-rose-300 font-semibold">HTTP {anom.observedResponse.statusCode}</div>
                          <pre className="text-[10px] text-slate-400 font-mono truncate">{anom.observedResponse.bodySnippet || '(empty)'}</pre>
                        </div>
                      </div>

                      {/* Remediation Guidance */}
                      <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3">
                        <ShieldAlert className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-indigo-200">
                          <span className="font-semibold block text-indigo-300 mb-0.5">Recommended Remediation:</span>
                          {anom.remediationRecommendation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: AUDITED ENDPOINTS MATRIX */}
      {activeTab === 'endpoints' && (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      ep.method === 'GET'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : ep.method === 'POST'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : ep.method === 'PUT'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-100">{ep.path}</span>
                </div>
                <span className="text-xs text-slate-500">{ep.parameters.length} params</span>
              </div>

              {ep.parameters.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {ep.parameters.map((p) => (
                    <span
                      key={`${p.in}_${p.name}`}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                    >
                      {p.in}:{p.name} ({p.type}) {p.required && <span className="text-rose-400">*</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: FUZZING CONFIGURATION */}
      {activeTab === 'spec' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Active Fuzzing Policies & Security Probes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-semibold">Target Base URL</span>
              <span className="text-sky-300 font-mono">{report.config.targetBaseUrl}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-semibold">Max Requests / Endpoint</span>
              <span className="text-indigo-300 font-mono">{report.config.maxRequestsPerEndpoint} mutations</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-semibold">Concurrency Limit</span>
              <span className="text-indigo-300 font-mono">{report.config.concurrencyLimit} concurrent workers</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-semibold">Timeout Threshold</span>
              <span className="text-indigo-300 font-mono">{report.config.timeoutMs}ms</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-300">Enabled Fuzz Strategies:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {report.config.enabledStrategies.map((strat) => (
                <span
                  key={strat}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {strat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
