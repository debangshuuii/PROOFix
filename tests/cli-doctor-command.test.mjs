import test from 'node:test';
import assert from 'node:assert/strict';
import { executeDoctorCommand } from '../src/lib/cli/commands/doctor.ts';
import { runDoctorSuite } from '../src/lib/cli/doctor/suite.ts';

test('doctor-command: runs all 4 diagnostic checks in live environment', async () => {
  const report = await runDoctorSuite();
  assert.equal(report.checks.length, 4);

  const checkIds = report.checks.map((c) => c.id);
  assert.ok(checkIds.includes('node_version'));
  assert.ok(checkIds.includes('playwright_chromium'));
  assert.ok(checkIds.includes('ephemeral_ports'));
  assert.ok(checkIds.includes('ai_provider_keys'));

  assert.ok(['healthy', 'degraded', 'unhealthy'].includes(report.overallStatus));
});

test('doctor-command: json mode returns valid structured report without throwing', async () => {
  const report = await executeDoctorCommand({ json: true });
  assert.ok(report);
  assert.ok(report.timestamp);
  assert.ok(report.hostInfo.nodeVersion);
  assert.equal(report.checks.length, 4);
});

test('doctor-command: auto-heals mock playwright missing error when heal: true is set', async () => {
  const report = await runDoctorSuite({
    mockPlaywrightError: 'Browser executable not found',
    heal: true
  });

  const pwCheck = report.checks.find((c) => c.id === 'playwright_chromium');
  assert.equal(pwCheck?.status, 'healed');
  assert.equal(report.autoHealed, true);
});

test('doctor-command: marks overall status as unhealthy if a critical check fails', async () => {
  const report = await runDoctorSuite({
    mockNodeVersion: 'v16.20.0'
  });
  assert.equal(report.overallStatus, 'unhealthy');
});
