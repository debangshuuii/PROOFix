/**
 * Framework Execution & Multi-Runtime Launcher Test Suite
 * Validates framework inference, port collision resolution, adaptive readiness,
 * and process tree watchdog termination.
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  detectFramework,
  detectPackageManager,
  resolveSpawnConfig,
  FRAMEWORK_PROFILES,
} from '../src/lib/execution/framework-resolver.ts';
import {
  isPortInUse,
  allocatePort,
} from '../src/lib/execution/port-allocator.ts';
import {
  awaitServerReadiness,
} from '../src/lib/execution/readiness-probe.ts';
import {
  globalProcessWatchdog,
} from '../src/lib/execution/process-watchdog.ts';

console.log('===========================================================');
console.log('PROOFix Multi-Runtime Execution & Process Launcher Suite');
console.log('===========================================================\n');

async function runTestSuite() {
  let passed = 0;

  // 1. Framework & Package Manager Detection
  console.log('[TEST 1] Framework & Package Manager Detection on Sample Fixture');
  const sampleDir = path.resolve('src/fixtures/sample-app');
  const detectedFw = detectFramework(sampleDir);
  const detectedPm = detectPackageManager(sampleDir);

  assert.strictEqual(detectedFw, 'nextjs', 'Sample fixture must be detected as Next.js');
  assert.strictEqual(detectedPm, 'npm', 'Sample fixture must use npm package manager');
  console.log(`  ✓ Detected Framework: ${detectedFw} | Package Manager: ${detectedPm}`);
  passed++;

  // 2. Framework Profiles Configuration
  console.log('[TEST 2] Framework Profiles Configuration Coverage');
  const frameworks = ['nextjs', 'vite', 'remix', 'astro', 'sveltekit', 'express', 'static'];
  for (const fw of frameworks) {
    const profile = FRAMEWORK_PROFILES[fw];
    assert.ok(profile, `Profile for ${fw} must exist`);
    assert.ok(profile.defaultPort > 0, `${fw} must define valid default port`);
    assert.ok(profile.readinessPath.startsWith('/'), `${fw} readinessPath must start with /`);
  }
  console.log(`  ✓ All ${frameworks.length} framework runtime profiles validated.`);
  passed++;

  // 3. Spawn Configuration Resolution with Custom Commands
  console.log('[TEST 3] Spawn Config Resolution for Vite and Custom Command');
  const viteConfig = resolveSpawnConfig({
    workspaceDir: sampleDir,
    framework: 'vite',
    packageManager: 'npm',
    targetPort: 5173,
    readinessPath: '/',
    readinessTimeoutMs: 10000,
    maxRetries: 1,
  });

  assert.ok(viteConfig.args.includes('--port'), 'Vite spawn config must include --port');
  assert.ok(viteConfig.args.includes('5173'), 'Vite spawn config must bind to target port 5173');
  assert.strictEqual(viteConfig.port, 5173);

  const customConfig = resolveSpawnConfig({
    workspaceDir: sampleDir,
    framework: 'custom',
    packageManager: 'npm',
    customStartupCommand: 'node custom-server.js --custom-flag',
    targetPort: 8000,
    readinessPath: '/healthz',
    readinessTimeoutMs: 10000,
    maxRetries: 1,
  });

  assert.ok(customConfig.executable.includes('node'), 'Custom config must use specified executable');
  assert.ok(customConfig.args.includes('--custom-flag'), 'Custom flag must be preserved');
  assert.strictEqual(customConfig.readinessPath, '/healthz');
  console.log('  ✓ Spawn config correctly adapts for both predefined and custom frameworks.');
  passed++;

  // 4. Port Collision Detection and Allocation
  console.log('[TEST 4] Dynamic Port Collision Detection & Reassignment');
  const portResult = await allocatePort(4173, 20);
  assert.ok(portResult.allocatedPort >= 4173, 'Allocated port must be within valid range');
  assert.ok(Array.isArray(portResult.attemptedPorts));
  console.log(`  ✓ Successfully allocated clean port: ${portResult.allocatedPort}`);
  passed++;

  // 5. Readiness Probe with Simulated Server
  console.log('[TEST 5] Adaptive Readiness Probe Engine');
  const probeFailure = await awaitServerReadiness({
    host: '127.0.0.1',
    port: 59999, // Unbound port
    path: '/readiness-test',
    timeoutMs: 1200,
    pollIntervalMs: 200,
  });

  assert.strictEqual(probeFailure.ready, false, 'Unbound port probe must return ready: false');
  assert.ok(probeFailure.attempts >= 1, 'Probe must perform at least 1 attempt');
  assert.ok(probeFailure.errorMessage, 'Error diagnostic must be provided');
  console.log('  ✓ Adaptive readiness probe properly handles timeouts with diagnostic context.');
  passed++;

  // 6. Process Tree Watchdog Lifecycle
  console.log('[TEST 6] Process Watchdog Registration and Termination');
  const dummyProc = { pid: 999999, kill: () => true };
  const managed = globalProcessWatchdog.register(
    'test_run_mock',
    dummyProc,
    'nextjs',
    4173,
    'npx next dev',
    10000
  );

  assert.strictEqual(managed.runId, 'test_run_mock');
  assert.strictEqual(managed.pid, 999999);
  assert.strictEqual(managed.active, true);

  const killResult = await globalProcessWatchdog.terminateTree('test_run_mock');
  assert.strictEqual(killResult.success, true);
  console.log('  ✓ Process watchdog correctly tracks and clears process trees.');
  passed++;

  console.log('===========================================================');
  console.log(`ALL ${passed} LAUNCHER TESTS COMPLETED SUCCESSFULLY!`);
  console.log('===========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
