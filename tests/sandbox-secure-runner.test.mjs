import assert from 'node:assert/strict';
import { SecureCommandRunner } from '../src/lib/sandbox/secure-runner.ts';

console.log('--- Testing Secure Command Runner with Privilege Dropping (Contribution 157) ---');

const runner = new SecureCommandRunner();

const policy = {
  isolationMode: 'unprivileged_process',
  quotas: {
    memoryLimitMb: 256,
    memorySwapLimitMb: 0,
    cpuQuotaPercentage: 100,
    maxProcesses: 32,
    maxOpenFiles: 1024,
    diskQuotaMb: 500,
    executionTimeoutSecs: 5,
  },
  network: {
    allowEgress: false,
    blockCloudMetadata: true,
    allowedDomains: [],
    allowedPorts: [],
    isolatedBridgeNetwork: true,
  },
  filesystem: {
    readOnlyRoot: true,
    tmpfsMounts: ['/tmp'],
    maskedPaths: [],
    copyOnWriteWorkspace: false,
    cleanupOnExit: true,
  },
  capabilities: {
    dropAllCapabilities: true,
    addCapabilities: [],
    noNewPrivileges: true,
    runAsUserUid: 10001,
    runAsUserGid: 10001,
  },
};

// 1. Test Environment Sanitization
const dirtyEnv = {
  PATH: '/bin:/usr/bin',
  AWS_SECRET_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
  GITHUB_TOKEN: 'ghp_secret_token_123',
  STRIPE_SECRET_KEY: 'sk_mock_test_key',
  SAFE_APP_VAR: 'hello-world',
};

const cleanEnv = runner.sanitizeEnvironment(dirtyEnv);
assert.equal(cleanEnv['AWS_SECRET_ACCESS_KEY'], undefined, 'AWS secret key must be scrubbed');
assert.equal(cleanEnv['GITHUB_TOKEN'], undefined, 'GitHub token must be scrubbed');
assert.equal(cleanEnv['STRIPE_SECRET_KEY'], undefined, 'Stripe key must be scrubbed');
assert.equal(cleanEnv['SAFE_APP_VAR'], 'hello-world', 'Safe app var should be retained');
assert.equal(cleanEnv['PROOF_SANDBOX'], 'true', 'PROOF_SANDBOX marker must be injected');
console.log('✅ Dangerous host secrets scrubbed from sandboxed environment');

// 2. Test Safe Execution of Command
const runResult = await runner.execute({
  sandboxId: 'sbx-exec-001',
  command: 'node',
  args: ['-e', 'console.log("SANDBOX_OK"); process.exit(0);'],
  cwd: process.cwd(),
  policy,
});

assert.equal(runResult.exitCode, 0);
assert.ok(runResult.stdout.includes('SANDBOX_OK'));
assert.equal(runResult.terminatedCleanly, true);
assert.equal(runResult.killedByTimeout, false);
console.log('✅ Isolated node command executed cleanly with stdout captured');

// 3. Test Timeout Termination
const timeoutPolicy = {
  ...policy,
  quotas: {
    ...policy.quotas,
    executionTimeoutSecs: 0.1, // 100ms timeout
  },
};

const timeoutResult = await runner.execute({
  sandboxId: 'sbx-exec-timeout',
  command: 'node',
  args: ['-e', 'setInterval(() => {}, 1000);'], // Hang indefinitely
  cwd: process.cwd(),
  policy: timeoutPolicy,
});

assert.equal(timeoutResult.killedByTimeout, true);
assert.equal(timeoutResult.terminatedCleanly, false);
console.log('✅ Runaway sandboxed process killed by timeout watchdog');

// 4. Test Log Buffer Capping (Protection against stdout memory explosion)
const logCapResult = await runner.execute({
  sandboxId: 'sbx-exec-logcap',
  command: 'node',
  args: ['-e', 'console.log("X".repeat(2000));'],
  cwd: process.cwd(),
  policy,
  maxLogSizeBytes: 50, // strict 50-byte cap
});

assert.ok(logCapResult.stdout.length <= 100, 'Stdout buffer should respect size cap');
console.log('✅ Log output buffering capped to prevent memory exhaustion');

console.log('✅ Contribution 157 tests passed cleanly!');
