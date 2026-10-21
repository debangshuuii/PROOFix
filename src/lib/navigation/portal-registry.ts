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
    title: 'API Fuzzing & Contract Testing',
    description: 'OpenAPI boundary mutation, SQLi/SSRF payloads, and anomaly classification',
    href: '/projects',
    badge: 'Boundary AI',
    metricLabel: 'Coverage',
    metricValue: '100% Spec Endpoints',
  },
  {
    id: 'portal-replay',
    title: 'Mock Service & Third-Party Replay',
    description: 'Deterministic HTTP cassettes, volatile secret scrubbing, and fault injection',
    href: '/projects',
    badge: 'Deterministic',
    metricLabel: 'Cassettes',
    metricValue: 'Offline Replay Active',
  },
  {
    id: 'portal-vision',
    title: 'Semantic Vision-AI Regression',
    description: 'Visual layout shift detection, pixel tolerance diffs, and perceptual matching',
    href: '/projects',
    badge: 'Vision AI',
    metricLabel: 'Diff Precision',
    metricValue: 'Sub-Pixel Accurate',
  },
  {
    id: 'portal-companion',
    title: 'Real-Time Interactive Companion',
    description: 'Live browser viewport canvas mirroring, execution steppers, and breakpoints',
    href: '/companion/mirror',
    badge: 'WebRTC 60 FPS',
    metricLabel: 'Latency',
    metricValue: '<50ms Interactive',
  },
  {
    id: 'portal-healing',
    title: 'Autonomous Self-Healing Loop',
    description: 'Automatic reproduction in sandboxes, code patch synthesis, and verified PRs',
    href: '/projects',
    badge: 'Verified Fixes',
    metricLabel: 'Zero Hallucination',
    metricValue: 'Verified in Green Run',
  },
];
