'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Layers,
  ShieldCheck,
  Terminal,
  RotateCcw,
  Eye,
  Radio,
  Wrench,
  ArrowRight,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export interface EnterprisePortalItem {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  metricLabel: string;
  metricValue: string;
}

export const ENTERPRISE_PORTALS: EnterprisePortalItem[] = [
  {
    id: 'portal-sandbox',
    title: 'Sandbox & MicroVM Isolation',
    description: 'Zero-trust process jails, Linux cgroups v2, and cloud metadata defense',
    href: '/sandbox',
    badge: 'Cgroups v2',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: Shield,
    metricLabel: 'Warm Pool',
    metricValue: '<200ms Spinup',
  },
  {
    id: 'portal-queue',
    title: 'Distributed Queue & Sharding',
    description: 'Priority FIFO queuing, visibility timeouts, and Dead-Letter Queue redrive',
    href: '/queue',
    badge: 'At-Least-Once',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    icon: Layers,
    metricLabel: 'Throughput',
    metricValue: '45.0 ops/sec',
  },
  {
    id: 'portal-governance',
    title: 'Enterprise Governance & SOC2',
    description: 'Cryptographic SHA-256 Merkle audit trail and Trust Criteria compliance',
    href: '/governance',
    badge: 'SOC2 Type II',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    icon: ShieldCheck,
    metricLabel: 'Readiness',
    metricValue: '98% Compliant',
  },
  {
    id: 'portal-fuzzing',
    title: 'Autonomous Chaos Crawler & Fuzzing',
    description: 'Autonomous state-graph exploration, horizontal layout overflow, and boundary fuzzer',
    href: '/crawler',
    badge: 'Chaos Monkey',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: Terminal,
    metricLabel: 'Coverage',
    metricValue: '100% Spec Endpoints',
  },
  {
    id: 'portal-replay',
    title: 'Pluggable Database Adapters',
    description: 'Postgres & SQLite multi-tenant engine, connection pooling, and SQL migrations',
    href: '/database',
    badge: 'SQL & DDL',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    icon: RotateCcw,
    metricLabel: 'Migrations',
    metricValue: 'Dual-Engine Ready',
  },
  {
    id: 'portal-vision',
    title: 'OpenTelemetry Distributed Tracing',
    description: 'End-to-end W3C trace context, 5-hop span waterfall, and OTLP exporter',
    href: '/telemetry',
    badge: 'OTel Waterfall',
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    icon: Eye,
    metricLabel: 'Trace Duration',
    metricValue: 'Sub-millisecond Precision',
  },
  {
    id: 'portal-companion',
    title: 'Real-Time Interactive Companion',
    description: 'Live browser viewport canvas mirroring, execution steppers, and breakpoints',
    href: '/companion/mirror',
    badge: 'Live Stream',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    icon: Radio,
    metricLabel: 'Latency',
    metricValue: '<50ms Streaming',
  },
  {
    id: 'portal-healing',
    title: 'Native Git Webhooks & PRs',
    description: 'GitHub/GitLab webhook ingestion, rich Check Runs, and 1-click self-healing review',
    href: '/integrations/git',
    badge: 'GitHub / GitLab',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: Wrench,
    metricLabel: 'Check Runs',
    metricValue: 'Self-Healing Sync',
  },
];

export function EnterprisePortalHub() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Activity className="w-3.5 h-3.5" />
            <span>PROOFix Global Operations Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Enterprise Verification Launchpad
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Unified mission control connecting zero-trust sandboxes, distributed queues,
            tamper-evident governance, and multi-modal AI verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            All 8 Systems Operational
          </span>
        </div>
      </div>

      {/* Grid of 8 Enterprise Systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ENTERPRISE_PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link
              key={portal.id}
              href={portal.href}
              className="group p-5 bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-sky-500/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-slate-800 group-hover:bg-sky-500/20 text-slate-300 group-hover:text-sky-400 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${portal.badgeColor}`}>
                    {portal.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {portal.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{portal.metricLabel}</span>
                  <span className="font-bold text-slate-200">{portal.metricValue}</span>
                </div>

                <div className="p-1 rounded bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-sky-600 transition">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
