import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SandboxPoolOrchestrator } from '../src/lib/sandbox/sandbox-pool.ts';

console.log('--- Testing Sandbox Pool & Multi-Tenant Lifecycle Orchestrator (Contribution 158) ---');

const testBase = path.join(process.cwd(), '.test-pool-temp');
if (fs.existsSync(testBase)) fs.rmSync(testBase, { recursive: true, force: true });

const orchestrator = new SandboxPoolOrchestrator(testBase);

// 1. Test Pre-warming
await orchestrator.preWarmPool(2, 'unprivileged_process');
const statsInitial = orchestrator.getPoolStats();
assert.equal(statsInitial.totalWarmInstances, 2, 'Should have 2 warm instances');
console.log('✅ Sandbox pool pre-warmed with 2 warm instances');

// 2. Test Fast Acquisition from Warm Pool
const startTime = Date.now();
const sandbox = await orchestrator.acquireSandbox('tenant-alpha', 'run-test-01', 'unprivileged_process');
const acquisitionDuration = Date.now() - startTime;
assert.ok(acquisitionDuration < 500, `Warm acquisition should be fast (<500ms), got ${acquisitionDuration}ms`);
assert.equal(sandbox.runId, 'run-test-01');
const statsAfterAcquire = orchestrator.getPoolStats();
assert.equal(statsAfterAcquire.totalWarmInstances, 2); // 1 remaining warm + 1 acquired warm_idle
console.log(`✅ Sandbox acquired in ${acquisitionDuration}ms from warm pool`);

// 3. Test Execution within Acquired Sandbox
const execResult = await orchestrator.executeInSandbox(
  sandbox.id,
  'node',
  ['-e', 'console.log("POOL_EXECUTION_SUCCESS");']
);
assert.equal(execResult.exitCode, 0);
assert.ok(execResult.stdout.includes('POOL_EXECUTION_SUCCESS'));
assert.equal(execResult.terminatedCleanly, true);
console.log('✅ Command executed cleanly inside sandboxed workspace');

// 4. Test Destroy / Teardown
const destroyOk = await orchestrator.destroySandbox(sandbox.id);
assert.equal(destroyOk, true);
const statsAfterDestroy = orchestrator.getPoolStats();
assert.equal(statsAfterDestroy.totalTerminatedInstances, 1);
assert.equal(orchestrator.listSandboxes().some((s) => s.id === sandbox.id), false);
console.log('✅ Sandbox destroyed and cleaned up safely');

// Clean temp directory
if (fs.existsSync(testBase)) fs.rmSync(testBase, { recursive: true, force: true });

console.log('✅ Contribution 158 tests passed cleanly!');
