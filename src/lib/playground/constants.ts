/**
 * Interactive Demo Playground Constants & Display Configurations
 */

import type { DemoScenarioCategory, FaultSeverity } from './types.ts';

export const PLAYGROUND_CATEGORIES: Record<
  DemoScenarioCategory,
  { label: string; description: string; badgeColor: string; iconName: string }
> = {
  functional_e2e: {
    label: 'End-to-End Functional',
    description: 'Broken buttons, missing API routes, and 404 dead links',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconName: 'ShoppingCart',
  },
  framework_react: {
    label: 'React & Next.js Runtime',
    description: 'SSR hydration mismatches, client drift, and unhandled exceptions',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    iconName: 'Sparkles',
  },
  security_preflight: {
    label: 'DevSecOps & Preflight',
    description: 'SQL injection, secret leaks, and AST security policy violations',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    iconName: 'ShieldAlert',
  },
};

export const SEVERITY_BADGES: Record<FaultSeverity, { label: string; className: string }> = {
  critical: {
    label: 'Critical Gate Blocker',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  high: {
    label: 'High Severity',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  medium: {
    label: 'Medium Severity',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  low: {
    label: 'Low Severity',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
};

export const PLAYGROUND_SIMULATION_STAGES = [
  'Repository Analysis & Route Discovery',
  'Process Tree & Dynamic Port Allocation',
  'Root URL Health Check',
  'Navigation & Route Traversal',
  'Interactive State Hydration & Click Auditing',
  '404 Dead Link & Network Interception',
  'Unhandled Console Exception Auditing',
  'Security Preflight Gate Validation',
  'Multimodal AI Diagnosis Generation',
  'AST-Backed Unified Patch Formulation',
  'Post-Patch Verification & Green Provenance',
];

export const DEFAULT_TELEMETRY_STEP_DELAY_MS = 600;
