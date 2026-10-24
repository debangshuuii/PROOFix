import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAnalyzeCommand } from '../src/lib/cli/commands/analyze.ts';
import { executeStatusCommand, probePort } from '../src/lib/cli/commands/status.ts';

test('analyze-command: detects Next.js framework in current workspace', () => {
  const result = executeAnalyzeCommand('.', true);
  assert.ok(result);
  assert.ok(result.framework.includes('Next.js'));
  assert.ok(result.routes.length > 0);
  assert.ok(result.scripts.includes('test'));
});

test('status-command: probePort returns null for unused port without error', async () => {
  const result = await probePort(59999, 100);
  assert.equal(result, null);
});

test('status-command: executeStatusCommand returns offline status when server is stopped', async () => {
  const result = await executeStatusCommand(59999, true);
  assert.equal(result.active, false);
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
