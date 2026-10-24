import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYGROUND_CATEGORIES, SEVERITY_BADGES, PLAYGROUND_SIMULATION_STAGES } from '../src/lib/playground/constants.ts';
import { generateDemoProjectId, generateDemoRunId, formatDurationMs, calculateConfidencePercentage } from '../src/lib/playground/utils.ts';

test('PLAYGROUND_CATEGORIES covers functional, react, and security categories', () => {
  assert.ok(PLAYGROUND_CATEGORIES.functional_e2e);
  assert.ok(PLAYGROUND_CATEGORIES.framework_react);
  assert.ok(PLAYGROUND_CATEGORIES.security_preflight);
  assert.equal(PLAYGROUND_CATEGORIES.functional_e2e.label, 'End-to-End Functional');
});

test('SEVERITY_BADGES defines valid color tokens for all 4 severities', () => {
  assert.ok(SEVERITY_BADGES.critical.className.includes('rose'));
  assert.ok(SEVERITY_BADGES.high.className.includes('orange'));
  assert.ok(SEVERITY_BADGES.medium.className.includes('amber'));
  assert.ok(SEVERITY_BADGES.low.className.includes('blue'));
});

test('PLAYGROUND_SIMULATION_STAGES contains 11 realistic stages', () => {
  assert.equal(PLAYGROUND_SIMULATION_STAGES.length, 11);
  assert.equal(PLAYGROUND_SIMULATION_STAGES[0], 'Repository Analysis & Route Discovery');
  assert.equal(PLAYGROUND_SIMULATION_STAGES[10], 'Post-Patch Verification & Green Provenance');
});

test('generateDemoProjectId generates deterministic prefixes', () => {
  const prjId = generateDemoProjectId('ecommerce_checkout');
  assert.equal(prjId, 'prj-demo-ecommerce-checkout');
});

test('generateDemoRunId produces unique run ids containing scenario slug', () => {
  const runId = generateDemoRunId('hydration_mismatch', 'test');
  assert.ok(runId.startsWith('run-demo-hydration-mismatch-test-'));
});

test('formatting utilities handle time and confidence calculations', () => {
  assert.equal(formatDurationMs(450), '450ms');
  assert.equal(formatDurationMs(2500), '2.50s');
  assert.equal(calculateConfidencePercentage(0.965), '97%');
});
