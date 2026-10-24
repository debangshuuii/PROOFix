import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);
const binPath = path.resolve(process.cwd(), 'bin', 'proofix.js');

test('e2e-binary: executes --version displaying 0.1.0', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, '--version']);
  assert.ok(stdout.includes('0.1.0'));
});

test('e2e-binary: executes --help displaying all subcommands', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, '--help']);
  assert.ok(stdout.includes('doctor'));
  assert.ok(stdout.includes('run'));
  assert.ok(stdout.includes('fix'));
  assert.ok(stdout.includes('watch'));
  assert.ok(stdout.includes('analyze'));
  assert.ok(stdout.includes('status'));
});

test('e2e-binary: executes doctor --json returning valid JSON report', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, 'doctor', '--json']);
  const parsed = JSON.parse(stdout.trim().split('\n').filter(l => !l.startsWith('(')).join('\n'));
  assert.ok(parsed);
  assert.equal(parsed.checks.length, 4);
  assert.ok(parsed.hostInfo);
});

test('e2e-binary: executes analyze --json returning route discovery payload', async () => {
  const { stdout } = await execFileAsync(process.execPath, [binPath, 'analyze', '.', '--json']);
  const parsed = JSON.parse(stdout.trim().split('\n').filter(l => !l.startsWith('(')).join('\n'));
  assert.ok(parsed);
  assert.ok(parsed.framework.includes('Next.js'));
  assert.ok(parsed.routes.length > 0);
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
