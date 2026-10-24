import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNodeVersion } from '../src/lib/cli/doctor/node-check.ts';

test('node-check: current environment meets requirement >= 20.0.0', () => {
  const result = checkNodeVersion();
  assert.equal(result.id, 'node_version');
  assert.equal(result.category, 'runtime');
  assert.equal(result.status, 'passed');
});

test('node-check: passes for v20, v22, and v24', () => {
  assert.equal(checkNodeVersion('v20.0.0').status, 'passed');
  assert.equal(checkNodeVersion('v20.12.2').status, 'passed');
  assert.equal(checkNodeVersion('v22.5.0').status, 'passed');
  assert.equal(checkNodeVersion('v24.19.0').status, 'passed');
});

test('node-check: fails for Node versions below 20', () => {
  const res18 = checkNodeVersion('v18.19.0');
  assert.equal(res18.status, 'failed');
  assert.ok(res18.message.includes('unsupported'));
  assert.ok(res18.recommendation?.includes('Upgrade'));

  const res16 = checkNodeVersion('v16.14.0');
  assert.equal(res16.status, 'failed');
});

test('node-check: fails gracefully for malformed version strings', () => {
  const resInvalid = checkNodeVersion('invalid-version');
  assert.equal(resInvalid.status, 'failed');
  assert.ok(resInvalid.message.includes('Unable to parse'));
});
