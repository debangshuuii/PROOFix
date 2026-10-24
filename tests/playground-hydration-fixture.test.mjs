import test from 'node:test';
import assert from 'node:assert/strict';
import { HYDRATION_MISMATCH_SCENARIO } from '../src/lib/playground/scenarios/hydration-mismatch.ts';

test('HYDRATION_MISMATCH_SCENARIO has valid id and framework category', () => {
  assert.equal(HYDRATION_MISMATCH_SCENARIO.id, 'hydration_mismatch');
  assert.equal(HYDRATION_MISMATCH_SCENARIO.category, 'framework_react');
  assert.equal(HYDRATION_MISMATCH_SCENARIO.fault.severity, 'high');
});

test('HYDRATION_MISMATCH_SCENARIO captures unhandled console error signature', () => {
  const failure = HYDRATION_MISMATCH_SCENARIO.fault.expectedFailure;
  assert.equal(failure.category, 'smoke');
  assert.ok(failure.errorMessage.includes('Hydration failed'));
  assert.equal(failure.domSelector, '#live-server-clock');
});

test('HYDRATION_MISMATCH_SCENARIO patch diff introduces mounted state lifecycle guard', () => {
  const patch = HYDRATION_MISMATCH_SCENARIO.fixProposal.patchDiff;
  assert.ok(patch.includes('useState'));
  assert.ok(patch.includes('useEffect'));
  assert.ok(patch.includes('setMounted(true)'));
});

test('HYDRATION_MISMATCH_SCENARIO benchmark reflects high confidence detection', () => {
  assert.equal(HYDRATION_MISMATCH_SCENARIO.benchmark.aiDiagnosisConfidence, 0.98);
  assert.equal(HYDRATION_MISMATCH_SCENARIO.benchmark.verificationPassRate, 1.0);
});
