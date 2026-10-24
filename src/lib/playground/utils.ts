/**
 * Playground Identifier & Formatting Utilities
 */

import type { DemoScenarioId } from './types.ts';

export function generateDemoProjectId(scenarioId: DemoScenarioId): string {
  const prefix = scenarioId.replace(/_/g, '-');
  return `prj-demo-${prefix}`;
}

export function generateDemoRunId(scenarioId: DemoScenarioId, suffix = 'baseline'): string {
  const prefix = scenarioId.replace(/_/g, '-');
  const timestamp = Date.now().toString(36);
  return `run-demo-${prefix}-${suffix}-${timestamp}`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function calculateConfidencePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}
