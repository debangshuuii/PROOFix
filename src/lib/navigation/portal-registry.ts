/**
 * Enterprise Portal Registry (Contribution 189)
 */

export interface PortalMetadata {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  metricLabel: string;
  metricValue: string;
}

export const ENTERPRISE_PORTAL_METADATA: PortalMetadata[] = [
  {
    id: 'portal-sandbox',
    title: 'Sandbox & MicroVM Isolation',
    description: 'Zero-trust process jails, Linux cgroups v2, and cloud metadata defense',
    href: '/sandbox',
    badge: 'Cgroups v2',
    metricLabel: 'Warm Pool',
    metricValue: '<200ms Spinup',
  },
  {
    id: 'portal-queue',
    title: 'Distributed Queue & Sharding',
    description: 'Priority FIFO queuing, visibility timeouts, and Dead-Letter Queue redrive',
    href: '/queue',
    badge: 'At-Least-Once',
    metricLabel: 'Throughput',
    metricValue: '45.0 ops/sec',
  },
  {
    id: 'portal-governance',
    title: 'Enterprise Governance & SOC2',
    description: 'Cryptographic SHA-256 Merkle audit trail and Trust Criteria compliance',
    href: '/governance',
    badge: 'SOC2 Type II',
    metricLabel: 'Readiness',
    metricValue: '98% Compliant',
  },
  {
    id: 'portal-fuzzing',
    title: 'Autonomous Chaos Crawler & Fuzzing',
    description: 'Autonomous state-graph exploration, horizontal layout overflow, and boundary fuzzer',
    href: '/crawler',
    badge: 'Chaos Monkey',
    metricLabel: 'Coverage',
    metricValue: '100% Spec Endpoints',
  },
  {
    id: 'portal-replay',
    title: 'Pluggable Database Adapters',
    description: 'Postgres & SQLite multi-tenant engine, connection pooling, and SQL migrations',
    href: '/database',
    badge: 'SQL & DDL',
    metricLabel: 'Migrations',
    metricValue: 'Dual-Engine Ready',
  },
  {
    id: 'portal-vision',
    title: 'OpenTelemetry Distributed Tracing',
    description: 'End-to-end W3C trace context, 5-hop span waterfall, and OTLP exporter',
    href: '/telemetry',
    badge: 'OTel Waterfall',
    metricLabel: 'Trace Duration',
    metricValue: 'Sub-millisecond Precision',
  },
  {
    id: 'portal-companion',
    title: 'Real-Time Interactive Companion',
    description: 'Live browser viewport canvas mirroring, execution steppers, and breakpoints',
    href: '/companion/mirror',
    badge: 'WebRTC 60 FPS',
    metricLabel: 'Latency',
    metricValue: '<50ms Streaming',
  },
  {
    id: 'portal-healing',
    title: 'Native Git Webhooks & PRs',
    description: 'GitHub/GitLab webhook ingestion, rich Check Runs, and 1-click self-healing review',
    href: '/integrations/git',
    badge: 'GitHub / GitLab',
    metricLabel: 'Check Runs',
    metricValue: 'Self-Healing Sync',
  },
];
