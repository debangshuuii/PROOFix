import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_DEMO_SCENARIOS } from '../src/lib/playground/registry.ts';

test('Benchmark metrics for all scenarios meet < 2000ms detection thresholds', () => {
  for (const scenario of ALL_DEMO_SCENARIOS) {
    assert.ok(
      scenario.benchmark.detectionTimeMs < 2000,
      `Scenario ${scenario.id} detectionTimeMs must be under 2000ms, got ${scenario.benchmark.detectionTimeMs}`
    );
  }
});

test('Benchmark metrics for all scenarios have >= 95% AI diagnosis confidence', () => {
  for (const scenario of ALL_DEMO_SCENARIOS) {
    assert.ok(
      scenario.benchmark.aiDiagnosisConfidence >= 0.95,
      `Scenario ${scenario.id} aiDiagnosisConfidence must be >= 0.95, got ${scenario.benchmark.aiDiagnosisConfidence}`
    );
  }
});

test('Benchmark metrics for all scenarios have 100% post-patch verification pass rate', () => {
  for (const scenario of ALL_DEMO_SCENARIOS) {
    assert.equal(
      scenario.benchmark.verificationPassRate,
      1.0,
      `Scenario ${scenario.id} verificationPassRate must be 1.0`
    );
  }
});

test('Benchmark metrics for all scenarios define "10/10 Instant" zero config rating', () => {
  for (const scenario of ALL_DEMO_SCENARIOS) {
    assert.equal(
      scenario.benchmark.zeroConfigRating,
      '10/10 Instant',
      `Scenario ${scenario.id} zeroConfigRating must be "10/10 Instant"`
    );
  }
});
