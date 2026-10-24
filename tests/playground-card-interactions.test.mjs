import test from 'node:test';
import assert from 'node:assert/strict';
import { ECOMMERCE_CHECKOUT_SCENARIO } from '../src/lib/playground/scenarios/ecommerce-checkout.ts';
import { HYDRATION_MISMATCH_SCENARIO } from '../src/lib/playground/scenarios/hydration-mismatch.ts';
import { SQL_INJECTION_PREFLIGHT_SCENARIO } from '../src/lib/playground/scenarios/sql-injection-preflight.ts';

test('Scenario contracts supply complete display metadata for ScenarioCard', () => {
  const scenarios = [
    ECOMMERCE_CHECKOUT_SCENARIO,
    HYDRATION_MISMATCH_SCENARIO,
    SQL_INJECTION_PREFLIGHT_SCENARIO,
  ];

  for (const s of scenarios) {
    assert.ok(s.id);
    assert.ok(s.title);
    assert.ok(s.subtitle);
    assert.ok(s.category);
    assert.ok(s.fault.headline);
    assert.ok(s.benchmark.detectionTimeMs > 0);
    assert.ok(s.benchmark.aiDiagnosisConfidence > 0);
    assert.equal(s.benchmark.verificationPassRate, 1.0);
    assert.ok(s.tags.length > 0);
  }
});
