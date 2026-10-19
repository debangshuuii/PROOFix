'use client';

import React, { useState } from 'react';
import type { SecurityPreflightReport } from '@/lib/types/security';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  KeyRound,
  Package,
} from 'lucide-react';

export interface SecurityPreflightCardProps {
  report: SecurityPreflightReport;
  className?: string;
}

export function SecurityPreflightCard({ report, className = '' }: SecurityPreflightCardProps) {
  const [showUncheckable, setShowUncheckable] = useState(false);
  const [showSecrets, setShowSecrets] = useState(true);

  const isBlocked = report.gateEvaluation.blocked;
  const isPassed = report.gateEvaluation.passed;
  const vulns = report.vulnerabilities || [];
  const uncheckable = report.uncheckablePackages || [];
  const secrets = report.secrets || [];

  return (
    <div
      data-testid="security-preflight-card"
      className={`rounded-xl border ${
        isBlocked
          ? 'border-rose-900/60 bg-rose-950/20'
          : vulns.length > 0 || uncheckable.length > 0
          ? 'border-amber-900/60 bg-amber-950/15'
          : 'border-emerald-900/60 bg-emerald-950/15'
      } p-6 space-y-6 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {isBlocked ? (
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Dependency & Security Preflight
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  isBlocked
                    ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60'
                    : vulns.length > 0
                    ? 'bg-amber-900/60 text-amber-200 border border-amber-700/60'
                    : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/60'
                }`}
              >
                {report.gateEvaluation.action.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audited {report.inventory?.totalDependencies || 0} packages across{' '}
              {report.inventory?.ecosystems?.join(', ') || 'npm'}.
            </p>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <span className="font-bold text-white">{vulns.length}</span> Vulnerabilities
          </div>
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
            <span className="font-bold">{uncheckable.length}</span> Uncheckable
          </div>
          {secrets.length > 0 && (
            <div className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300">
              <span className="font-bold">{secrets.length}</span> Secrets
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: KNOWN VULNERABILITIES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-sky-400" />
            Known Vulnerabilities Detected ({vulns.length})
          </span>
        </div>

        {vulns.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
            No known security vulnerabilities identified among verifiable dependencies.
          </div>
        ) : (
          <div className="space-y-2">
            {vulns.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        v.severity === 'critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : v.severity === 'high'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {v.severity}
                    </span>
                    <strong className="text-white font-mono">{v.packageName}</strong>
                    <span className="text-slate-500 font-mono">@{v.packageVersion}</span>
                    <span className="text-slate-600 text-[11px]">({v.dependencyType})</span>
                  </div>

                  <a
                    href={`https://osv.dev/vulnerability/${v.advisoryId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                  >
                    <span>{v.advisoryId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-slate-300">{v.summary}</p>

                <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span><strong>Fix:</strong> {v.remediationGuidance}</span>
                  {v.fixedIn && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-[10px]">
                      &gt;= {v.fixedIn}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: PACKAGES THAT COULD NOT BE CHECKED (CLEARLY DISTINGUISHED) */}
      <div className="space-y-2 border-t border-slate-800/80 pt-4">
        <button
          onClick={() => setShowUncheckable(!showUncheckable)}
          className="w-full flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Packages That Could Not Be Checked ({uncheckable.length})
          </span>
          {showUncheckable ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Distinguished packages that lacked exact resolved versions or encountered lookup limits. These dependencies were NOT verified as clean.
        </p>

        {showUncheckable && (
          <div className="space-y-2 pt-2">
            {uncheckable.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                All packages were verified against the advisory database.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Package</th>
                      <th className="py-2 px-3">Version</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] bg-slate-950">
                    {uncheckable.map((u, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-slate-200">{u.name}</td>
                        <td className="py-2 px-3 text-slate-400">{u.version || '*'}</td>
                        <td className="py-2 px-3 text-amber-400 font-sans text-[11px]">{u.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: EXPOSED SECRETS (IF PRESENT) */}
      {secrets.length > 0 && (
        <div className="space-y-2 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Accidental Secrets & Tokens Detected ({secrets.length})
            </span>
          </div>

          <div className="space-y-2">
            {secrets.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-200">{s.detectorType}</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {s.filePath}:{s.lineNumber}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-rose-300/90 bg-slate-950 p-1.5 rounded border border-rose-900/40">
                  {s.redactedExcerpt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
