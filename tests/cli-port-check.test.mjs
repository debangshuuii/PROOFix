import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEphemeralPortAllocation } from '../src/lib/cli/doctor/port-check.ts';

test('port-check: live loopback ephemeral allocation passes', async () => {
  const res = await checkEphemeralPortAllocation();
  assert.equal(res.id, 'ephemeral_ports');
  assert.equal(res.category, 'network');
  assert.equal(res.status, 'passed');
  assert.ok(res.message.includes('allocated port'));
});

test('port-check: handles mocked socket bind failure', async () => {
  const res = await checkEphemeralPortAllocation('EACCES permission denied');
  assert.equal(res.status, 'failed');
  assert.ok(res.message.includes('EACCES'));
  assert.ok(res.recommendation?.includes('firewall'));
});
