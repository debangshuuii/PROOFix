import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getScenarios } from '../src/app/api/v1/playground/scenarios/route.ts';
import { GET as getScenarioById } from '../src/app/api/v1/playground/scenarios/[id]/route.ts';
import { POST as launchDemo } from '../src/app/api/v1/playground/launch/route.ts';
import { POST as applyFix } from '../src/app/api/v1/playground/apply-fix/route.ts';
import { POST as resetScenario } from '../src/app/api/v1/playground/reset/route.ts';

test('GET /api/v1/playground/scenarios returns all 3 scenarios', async () => {
  const req = new Request('http://localhost:3000/api/v1/playground/scenarios');
  const res = await getScenarios(req);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.count, 3);
});

test('GET /api/v1/playground/scenarios/[id] returns 404 for unknown scenario', async () => {
  const req = new Request('http://localhost:3000/api/v1/playground/scenarios/unknown');
  const res = await getScenarioById(req, { params: Promise.resolve({ id: 'unknown_id' }) });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test('POST /api/v1/playground/launch launches ecommerce_checkout scenario', async () => {
  const req = new Request('http://localhost:3000/api/v1/playground/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'ecommerce_checkout' }),
  });
  const res = await launchDemo(req);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.scenarioId, 'ecommerce_checkout');
  assert.ok(data.runId);
  assert.ok(data.runUrl);
});

test('POST /api/v1/playground/apply-fix applies patch and verifies green state', async () => {
  // Launch run first
  const launchReq = new Request('http://localhost:3000/api/v1/playground/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'hydration_mismatch' }),
  });
  const launchRes = await launchDemo(launchReq);
  const launchData = await launchRes.json();

  // Apply fix
  const fixReq = new Request('http://localhost:3000/api/v1/playground/apply-fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 'hydration_mismatch',
      runId: launchData.runId,
    }),
  });
  const fixRes = await applyFix(fixReq);
  const fixData = await fixRes.json();

  assert.equal(fixRes.status, 200);
  assert.equal(fixData.success, true);
  assert.equal(fixData.patchApplied, true);
  assert.equal(fixData.testsFailed, 0);
  assert.equal(fixData.status, 'passed');
});

test('POST /api/v1/playground/reset resets scenario', async () => {
  const req = new Request('http://localhost:3000/api/v1/playground/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'sql_injection_preflight' }),
  });
  const res = await resetScenario(req);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
});
